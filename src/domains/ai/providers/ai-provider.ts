import { env } from '@/config/env';
import {
  AI_SCHEMA_VERSION,
  type AiExplanationBundle,
  type AiIntentCategory,
  type AiOperationType,
  type AiResponseType,
  type ExtractedTravelerPreferences,
  type GroundedFactReference,
} from '../types';
import { extractIntentAndPreferences } from '../intent-extractor';

/**
 * PHASE 05 — AI PROVIDER ABSTRACTION & IMPLEMENTATIONS
 *
 * Implements Sections 3, 4, 5, 79, 83, 92, and 93:
 * - `AIProvider` interface decouples domain orchestration from Gemini SDK internals
 * - `GeminiServerEdgeProvider` calls the server-side Supabase Edge Function
 *   (`/functions/v1/ai-intelligence`) where `GEMINI_API_KEY` resides exclusively server-side
 * - `DeterministicGroundedAiProvider` synthesizes structured JSON outputs strictly from
 *   authoritative TripPlanner domain services when running in deterministic/demo/test mode
 * - `ConfigurableMockAiProvider` enables deterministic adversarial testing of timeouts,
 *   malformed schemas, rate limits, hallucinations, and tool loops without external API calls
 */

export interface ProviderStructuredRequest {
  requestId: string;
  correlationId: string;
  operationType: AiOperationType;
  promptId: string;
  promptVersion: string;
  systemInstruction: string;
  sanitizedUserMessage: string;
  boundedContextSummary: string;
  groundedFacts: GroundedFactReference[];
  maxOutputTokens: number;
  temperature: number;
}

export interface ProviderStructuredPayload {
  schemaVersion: typeof AI_SCHEMA_VERSION;
  intent: AiIntentCategory;
  responseType: AiResponseType;
  confidence: number;
  requiresDeterministicValidation: boolean;
  headline: string;
  message: string;
  extractedPreferences?: ExtractedTravelerPreferences;
  requestedTools?: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
  }>;
  explanation?: AiExplanationBundle;
  abstained?: boolean;
  abstentionReason?: string;
}

export interface ProviderExecutionResult {
  providerName: string;
  modelName: string;
  rawOutput: string | Record<string, unknown>;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  latencyMs: number;
}

export interface AIProvider {
  readonly providerName: string;
  readonly modelName: string;
  generateStructured(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult>;
  generateExplanation(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult>;
  generateAssistantResponse(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult>;
  healthCheck(): Promise<{
    available: boolean;
    provider: string;
    model: string;
    mode: string;
    reason?: string;
  }>;
}

/**
 * Server-Side Gemini Provider Adapter via Supabase Edge Function (`ai-intelligence`).
 * NEVER contains or exposes `GEMINI_API_KEY` in client/browser code.
 */
export class GeminiServerEdgeProvider implements AIProvider {
  public readonly providerName = 'gemini-edge';
  public readonly modelName: string;
  private readonly endpointUrl: string;

  constructor(options?: { endpointUrl?: string; modelName?: string }) {
    this.endpointUrl = options?.endpointUrl ?? env.aiEdgeFunctionUrl;
    this.modelName = options?.modelName ?? 'gemini-2.5-flash';
  }

  public async healthCheck() {
    if (!this.endpointUrl) {
      return {
        available: false,
        provider: this.providerName,
        model: this.modelName,
        mode: 'server-edge',
        reason:
          'Server-side AI Edge Function URL is not configured. Set VITE_SUPABASE_URL or VITE_AI_EDGE_FUNCTION_URL and configure GEMINI_API_KEY in Supabase Edge Function secrets.',
      };
    }
    return {
      available: true,
      provider: this.providerName,
      model: this.modelName,
      mode: 'server-edge',
    };
  }

  public async generateStructured(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    if (!this.endpointUrl) {
      throw new Error(
        'PROVIDER_UNAVAILABLE: Server-side Gemini Edge Function endpoint is not configured.'
      );
    }

    const startMs = Date.now();
    const response = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': request.correlationId,
        'X-Request-Id': request.requestId,
        ...(env.supabaseAnonKey
          ? { apikey: env.supabaseAnonKey }
          : {}),
      },
      body: JSON.stringify({
        requestId: request.requestId,
        correlationId: request.correlationId,
        operationType: request.operationType,
        promptId: request.promptId,
        promptVersion: request.promptVersion,
        systemInstruction: request.systemInstruction,
        userMessage: request.sanitizedUserMessage,
        boundedContextSummary: request.boundedContextSummary,
        groundedFacts: request.groundedFacts,
        maxOutputTokens: request.maxOutputTokens,
        temperature: request.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `PROVIDER_UNAVAILABLE: Gemini Edge Function returned HTTP ${response.status}.`
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const latencyMs = Date.now() - startMs;

    return {
      providerName: this.providerName,
      modelName: this.modelName,
      rawOutput: payload,
      estimatedInputTokens: Math.ceil(
        (request.sanitizedUserMessage.length +
          request.boundedContextSummary.length) /
          4
      ),
      estimatedOutputTokens: Math.ceil(JSON.stringify(payload).length / 4),
      latencyMs,
    };
  }

  public async generateExplanation(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    return this.generateStructured(request);
  }

  public async generateAssistantResponse(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    return this.generateStructured(request);
  }
}

/**
 * Deterministic Grounded AI Provider:
 * Parses natural-language user messages into structured intents, explicit vs inferred
 * preferences, and tool requests grounded strictly in authoritative TripPlanner facts.
 */
export class DeterministicGroundedAiProvider implements AIProvider {
  public readonly providerName = 'deterministic-grounded';
  public readonly modelName = 'gemini-2.5-flash-grounded-deterministic';

  public async healthCheck() {
    if (env.isProd && !env.enableMockData && !env.aiEdgeFunctionUrl) {
      return {
        available: false,
        provider: this.providerName,
        model: this.modelName,
        mode: 'production-unconfigured',
        reason:
          'AI provider credentials are not configured in production.',
      };
    }

    return {
      available: true,
      provider: this.providerName,
      model: this.modelName,
      mode: 'deterministic-grounded',
    };
  }

  public async generateStructured(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    const startMs = Date.now();
    const extracted = extractIntentAndPreferences({
      userMessage: request.sanitizedUserMessage,
    });

    const payload: ProviderStructuredPayload = {
      schemaVersion: AI_SCHEMA_VERSION,
      intent: extracted.intent,
      responseType: extracted.clarificationNeeded
        ? 'CLARIFICATION_REQUIRED'
        : 'ANSWER',
      confidence: extracted.confidence,
      requiresDeterministicValidation: true,
      headline:
        extracted.intent === 'PLAN_TRIP'
          ? 'Structured Trip Preferences Extracted'
          : extracted.intent === 'ADAPT_JOURNEY'
          ? 'Disruption Recovery & Constraint Evaluation Requested'
          : `Intent Classified: ${extracted.intent}`,
      message:
        extracted.clarificationQuestion ||
        `Processed "${request.sanitizedUserMessage}" under intent ${extracted.intent}.`,
      extractedPreferences: extracted.extractedPreferences,
    };

    const serialized = JSON.stringify(payload);
    return {
      providerName: this.providerName,
      modelName: this.modelName,
      rawOutput: payload,
      estimatedInputTokens: Math.max(
        1,
        Math.ceil(
          (request.sanitizedUserMessage.length +
            request.boundedContextSummary.length) /
            4
        )
      ),
      estimatedOutputTokens: Math.max(1, Math.ceil(serialized.length / 4)),
      latencyMs: Math.max(1, Date.now() - startMs),
    };
  }

  public async generateExplanation(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    return this.generateStructured(request);
  }

  public async generateAssistantResponse(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    return this.generateStructured(request);
  }
}

/**
 * Configurable Mock AI Provider for unit & adversarial tests (Section 79).
 */
export class ConfigurableMockAiProvider implements AIProvider {
  public readonly providerName = 'mock-test-provider';
  public readonly modelName = 'gemini-2.5-flash-mock';

  private behaviorQueue: Array<
    (
      req: ProviderStructuredRequest,
      attempt: number
    ) => Promise<ProviderExecutionResult>
  > = [];
  private available = true;
  private callCount = 0;

  public setAvailable(available: boolean): void {
    this.available = available;
  }

  public getCallCount(): number {
    return this.callCount;
  }

  public enqueueResponse(
    fn: (
      req: ProviderStructuredRequest,
      attempt: number
    ) => Promise<ProviderExecutionResult>
  ): void {
    this.behaviorQueue.push(fn);
  }

  public async healthCheck() {
    return {
      available: this.available,
      provider: this.providerName,
      model: this.modelName,
      mode: 'test-mock',
    };
  }

  public async generateStructured(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    this.callCount += 1;
    if (!this.available) {
      throw new Error('PROVIDER_UNAVAILABLE: Mock AI provider is offline.');
    }

    const nextHandler = this.behaviorQueue.shift();
    if (nextHandler) {
      return nextHandler(request, this.callCount);
    }

    const fallback = new DeterministicGroundedAiProvider();
    return fallback.generateStructured(request);
  }

  public async generateExplanation(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    return this.generateStructured(request);
  }

  public async generateAssistantResponse(
    request: ProviderStructuredRequest
  ): Promise<ProviderExecutionResult> {
    return this.generateStructured(request);
  }
}
