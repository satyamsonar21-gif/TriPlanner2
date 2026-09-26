import { AuditService } from '@/domains/audit/audit.service';
import { DEFAULT_AI_CONFIG, type AiConfiguration } from './config';
import { redactPiiAndSecrets } from './security-guard';
import type {
  AiErrorCategory,
  AiObservabilityRecord,
  AiOperationType,
} from './types';

/**
 * PHASE 05 — AI OBSERVABILITY, CORRELATION IDS, COST CONTROL & RATE LIMITING
 *
 * Enforces Sections 39, 40, 41, 59, 60, 61, 81, and 82:
 * - Generates traceable requestId (`AI-REQ-...`) and correlationId (`CORR-...`)
 * - Tracks latency, estimated input/output tokens, tool calls, and validation status
 * - Never logs API keys, JWTs, passwords, or raw sensitive PII
 * - Enforces sliding-window per-actor, per-operation rate limits
 * - Enforces bounded retry policy (max 1 retry for retryable transient/schema errors; 0 for auth/business errors)
 */

let requestSequenceCounter = 1000;

export function generateAiRequestId(): string {
  requestSequenceCounter += 1;
  const hex = Date.now().toString(16).toUpperCase().slice(-6);
  return `AI-REQ-${hex}-${requestSequenceCounter}`;
}

export function generateCorrelationId(prefix = 'CORR'): string {
  requestSequenceCounter += 1;
  const hex = Date.now().toString(16).toUpperCase().slice(-6);
  return `${prefix}-${hex}-${requestSequenceCounter}`;
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Standard ~4 chars per token approximation
  return Math.max(1, Math.ceil(text.length / 4));
}

export class AiRateLimiter {
  private windowsByBucket: Map<string, number[]> = new Map();
  private config: AiConfiguration;

  constructor(config: AiConfiguration = DEFAULT_AI_CONFIG) {
    this.config = config;
  }

  public checkAndConsume(params: {
    actorId: string;
    operationType: AiOperationType;
    nowMs?: number;
  }): {
    allowed: boolean;
    remainingInWindow: number;
    retryAfterMs: number;
  } {
    const now = params.nowMs ?? Date.now();
    const policy = this.config.rateLimits[params.operationType] || {
      windowMs: 60_000,
      maxRequestsPerWindow: 15,
    };

    const bucketKey = `${params.actorId || 'anon'}:${params.operationType}`;
    const existing = this.windowsByBucket.get(bucketKey) || [];
    const windowStart = now - policy.windowMs;
    const activeTimestamps = existing.filter((ts) => ts > windowStart);

    if (activeTimestamps.length >= policy.maxRequestsPerWindow) {
      const oldestInWindow = activeTimestamps[0] || now;
      const retryAfterMs = Math.max(100, oldestInWindow + policy.windowMs - now);
      this.windowsByBucket.set(bucketKey, activeTimestamps);
      return {
        allowed: false,
        remainingInWindow: 0,
        retryAfterMs,
      };
    }

    activeTimestamps.push(now);
    this.windowsByBucket.set(bucketKey, activeTimestamps);

    return {
      allowed: true,
      remainingInWindow: Math.max(
        0,
        policy.maxRequestsPerWindow - activeTimestamps.length
      ),
      retryAfterMs: 0,
    };
  }

  public resetAll(): void {
    this.windowsByBucket.clear();
  }
}

export const NON_RETRYABLE_AI_ERRORS: ReadonlySet<AiErrorCategory> = new Set([
  'PROMPT_INJECTION_BLOCKED',
  'TOOL_INJECTION_BLOCKED',
  'UNAUTHORIZED_ACCESS',
  'CROSS_TENANT_DENIED',
  'UNKNOWN_TOOL_REJECTED',
  'MUTATION_APPROVAL_REQUIRED',
  'TOOL_LOOP_LIMIT_EXCEEDED',
  'RATE_LIMIT_EXCEEDED',
  'JOURNEY_VERSION_CONFLICT',
  'DETERMINISTIC_VALIDATION_FAILED',
  'FEATURE_DISABLED',
]);

export function isRetryableAiError(category: AiErrorCategory): boolean {
  if (NON_RETRYABLE_AI_ERRORS.has(category)) {
    return false;
  }
  return (
    category === 'SCHEMA_VALIDATION_FAILED' ||
    category === 'PROVIDER_TIMEOUT'
  );
}

/**
 * Executes an async AI provider operation with a strict timeout and bounded retries.
 */
export async function executeWithBoundedRetry<T>(params: {
  operation: (attempt: number) => Promise<T>;
  maxRetries: number;
  timeoutMs: number;
  shouldRetryError: (err: unknown) => boolean;
}): Promise<{ result: T; attemptsCount: number }> {
  const maxAttempts = Math.max(1, 1 + Math.min(params.maxRetries, 2));
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await Promise.race<T>([
        params.operation(attempt),
        new Promise<T>((_, reject) => {
          setTimeout(() => {
            const timeoutErr = new Error(
              `PROVIDER_TIMEOUT: AI provider exceeded ${params.timeoutMs}ms timeout.`
            );
            (timeoutErr as Error & { category?: AiErrorCategory }).category =
              'PROVIDER_TIMEOUT';
            reject(timeoutErr);
          }, params.timeoutMs);
        }),
      ]);
      return { result, attemptsCount: attempt };
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts || !params.shouldRetryError(err)) {
        throw err;
      }
    }
  }

  throw lastError;
}

export class AiObservabilityService {
  private records: AiObservabilityRecord[] = [];
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  /**
   * Records a sanitized, immutable AI observability record and optionally
   * writes an operational AI audit entry without exposing secrets or PII.
   */
  public recordTelemetry(
    rawRecord: AiObservabilityRecord,
    metadataForAudit?: Record<string, unknown>
  ): AiObservabilityRecord {
    // Ensure actorId and organizationId never accidentally contain secrets
    const safeActorId = redactPiiAndSecrets(rawRecord.actorId).sanitizedText;
    const safeOrgId = rawRecord.organizationId
      ? redactPiiAndSecrets(rawRecord.organizationId).sanitizedText
      : undefined;

    const frozenRecord: AiObservabilityRecord = Object.freeze({
      ...rawRecord,
      actorId: safeActorId,
      organizationId: safeOrgId,
      toolNames: [...rawRecord.toolNames],
    });

    this.records.unshift(frozenRecord);
    if (this.records.length > 500) {
      this.records.length = 500;
    }

    this.totalInputTokens += frozenRecord.estimatedInputTokens;
    this.totalOutputTokens += frozenRecord.estimatedOutputTokens;

    if (frozenRecord.journeyId && frozenRecord.actorRole !== 'unauthenticated') {
      const sanitizedMeta: Record<string, unknown> = {
        requestId: frozenRecord.requestId,
        correlationId: frozenRecord.correlationId,
        operationType: frozenRecord.operationType,
        provider: frozenRecord.provider,
        model: frozenRecord.model,
        promptId: frozenRecord.promptId,
        promptVersion: frozenRecord.promptVersion,
        intent: frozenRecord.intent,
        responseType: frozenRecord.responseType,
        journeyVersion: frozenRecord.journeyVersion,
        changeRequestId: frozenRecord.changeRequestId,
        proposalId: frozenRecord.proposalId,
        toolCallsCount: frozenRecord.toolCallsCount,
        schemaValidationPassed: frozenRecord.schemaValidationPassed,
        deterministicValidationPassed:
          frozenRecord.deterministicValidationPassed,
        errorCategory: frozenRecord.errorCategory,
      };

      if (metadataForAudit) {
        for (const [k, v] of Object.entries(metadataForAudit)) {
          if (typeof v === 'string') {
            sanitizedMeta[k] = redactPiiAndSecrets(v).sanitizedText;
          } else {
            sanitizedMeta[k] = v;
          }
        }
      }

      void AuditService.recordEvent(
        'journey',
        frozenRecord.journeyId,
        `AI_${frozenRecord.operationType.toUpperCase()}_${frozenRecord.responseType}`,
        safeActorId,
        frozenRecord.actorRole,
        sanitizedMeta
      );
    }

    return frozenRecord;
  }

  public getRecords(filter?: {
    journeyId?: string;
    actorId?: string;
    operationType?: AiOperationType;
  }): AiObservabilityRecord[] {
    return this.records
      .filter((r) => {
        if (filter?.journeyId && r.journeyId !== filter.journeyId) return false;
        if (filter?.actorId && r.actorId !== filter.actorId) return false;
        if (filter?.operationType && r.operationType !== filter.operationType) {
          return false;
        }
        return true;
      })
      .map((r) => ({ ...r, toolNames: [...r.toolNames] }));
  }

  public getCostAndUsageSummary(): {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    averageLatencyMs: number;
    blockedInjectionCount: number;
    versionConflictCount: number;
  } {
    const totalRequests = this.records.length;
    const totalLatency = this.records.reduce((acc, r) => acc + r.latencyMs, 0);
    const blockedInjectionCount = this.records.filter(
      (r) => r.injectionDetected
    ).length;
    const versionConflictCount = this.records.filter(
      (r) => r.errorCategory === 'JOURNEY_VERSION_CONFLICT'
    ).length;

    return {
      totalRequests,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      averageLatencyMs:
        totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
      blockedInjectionCount,
      versionConflictCount,
    };
  }

  public clearRecords(): void {
    this.records = [];
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }
}

export const sharedAiObservability = new AiObservabilityService();
export const sharedAiRateLimiter = new AiRateLimiter();
