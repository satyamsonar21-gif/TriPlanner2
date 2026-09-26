import { env, type AiFeatureFlags, type AiProviderMode } from '@/config/env';
import type { AiOperationType } from './types';

/**
 * PHASE 05 — CENTRALIZED AI MODEL, COST & SAFETY CONFIGURATION
 * Never hardcodes API keys or secrets.
 */

export interface RateLimitPolicy {
  windowMs: number;
  maxRequestsPerWindow: number;
}

export interface AiConfiguration {
  providerMode: AiProviderMode;
  defaultProviderName: 'gemini-edge' | 'deterministic-grounded';
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  maxToolIterations: number;
  maxContextChars: number;
  maxAssistantMessageChars: number;
  maxConversationTurnsPerJourney: number;
  edgeFunctionUrl: string;
  featureFlags: AiFeatureFlags;
  rateLimits: Record<AiOperationType, RateLimitPolicy>;
}

export const DEFAULT_AI_CONFIG: AiConfiguration = {
  providerMode: env.aiProviderMode,
  defaultProviderName:
    env.aiProviderMode === 'gemini' ||
    (env.aiProviderMode === 'auto' && Boolean(env.aiEdgeFunctionUrl))
      ? 'gemini-edge'
      : 'deterministic-grounded',
  model: 'gemini-2.5-flash',
  temperature: 0.1,
  maxOutputTokens: 1024,
  timeoutMs: 8000,
  maxRetries: 1,
  retryBackoffMs: 250,
  maxToolIterations: 5,
  maxContextChars: 6000,
  maxAssistantMessageChars: 2000,
  maxConversationTurnsPerJourney: 10,
  edgeFunctionUrl: env.aiEdgeFunctionUrl,
  featureFlags: { ...env.aiFeatures },
  rateLimits: {
    traveler_assistant: {
      windowMs: 60_000,
      maxRequestsPerWindow: 20,
    },
    operator_copilot: {
      windowMs: 60_000,
      maxRequestsPerWindow: 25,
    },
    trip_planning: {
      windowMs: 60_000,
      maxRequestsPerWindow: 10,
    },
    change_explanation: {
      windowMs: 60_000,
      maxRequestsPerWindow: 30,
    },
    mutation_assistance: {
      windowMs: 60_000,
      maxRequestsPerWindow: 8,
    },
  },
};

export function isAiOperationEnabled(
  operationType: AiOperationType,
  config: AiConfiguration = DEFAULT_AI_CONFIG
): boolean {
  if (config.providerMode === 'disabled') {
    return false;
  }

  switch (operationType) {
    case 'traveler_assistant':
      return config.featureFlags.assistantEnabled;
    case 'operator_copilot':
      return config.featureFlags.operatorCopilotEnabled;
    case 'trip_planning':
      return config.featureFlags.planningEnabled;
    case 'change_explanation':
      return config.featureFlags.explanationsEnabled;
    case 'mutation_assistance':
      return config.featureFlags.mutationAssistanceEnabled;
    default:
      return false;
  }
}
