import {
  AI_SCHEMA_VERSION,
  type AiIntentCategory,
  type AiResponseType,
  type AiToolName,
  type ExtractedTravelerPreferences,
  type StructuredAiResponse,
} from './types';

/**
 * PHASE 05 — STRICT RUNTIME SCHEMA VALIDATORS FOR AI INPUTS & OUTPUTS
 *
 * Enforces Section 5, Section 35, Section 78, and Section 80:
 * - Rejects malformed JSON
 * - Rejects missing required fields
 * - Rejects invalid enums or wrong types
 * - Rejects negative budgets, invalid dates, invalid currencies
 * - Rejects unknown tools
 * - Rejects extra malicious keys (sql, rawQuery, bypassApproval, overrideRole, __proto__)
 * - Rejects oversized outputs
 */

export const VALID_AI_INTENTS: ReadonlySet<AiIntentCategory> = new Set([
  'PLAN_TRIP',
  'UPDATE_PREFERENCES',
  'CHANGE_BUDGET',
  'CHANGE_TRAVEL_STYLE',
  'ADD_INTEREST',
  'REMOVE_INTEREST',
  'FIND_DESTINATION',
  'FIND_ACTIVITY',
  'ADAPT_JOURNEY',
  'EXPLAIN_CHANGE',
  'EXPLAIN_ALTERNATIVE',
  'SHOW_IMPACT',
  'SUMMARIZE_JOURNEY',
  'ASK_BOOKING_STATUS',
  'ASK_PAYMENT_STATUS',
  'ASK_OPERATION_STATUS',
  'ASK_ITINERARY',
  'ASK_SUPPORT',
  'UNKNOWN',
]);

export const VALID_AI_RESPONSE_TYPES: ReadonlySet<AiResponseType> = new Set([
  'ANSWER',
  'CLARIFICATION_REQUIRED',
  'RECOMMENDATION',
  'IMPACT_EXPLANATION',
  'CHANGE_PROPOSAL',
  'ACTION_REQUIRES_APPROVAL',
  'ACTION_COMPLETED',
  'ACTION_FAILED',
  'UNAVAILABLE',
  'UNAUTHORIZED',
  'ERROR',
]);

export const ALLOWLISTED_AI_TOOLS: ReadonlySet<AiToolName> = new Set([
  'get_current_journey',
  'get_journey_summary',
  'get_itinerary',
  'get_booking_status',
  'get_budget_status',
  'get_active_change_request',
  'analyze_journey_impact',
  'find_valid_alternatives',
  'simulate_journey_change',
  'explain_alternative',
  'get_notifications',
  'get_destination_context',
  'get_travel_route',
  'get_operator_tour_status',
  'get_operational_conflicts',
  'plan_deterministic_trip',
  'apply_journey_change',
  'get_current_weather',
  'get_weather_forecast',
  'get_active_external_alerts',
  'get_journey_external_impacts',
  'get_event_details',
  'get_provider_freshness',
  'explain_weather_impact',
]);

export const SUPPORTED_CURRENCIES: ReadonlySet<string> = new Set([
  'INR',
  'USD',
  'EUR',
  'AED',
  'GBP',
]);

const FORBIDDEN_MALICIOUS_KEYS: ReadonlySet<string> = new Set([
  'sql',
  'rawSql',
  'rawQuery',
  'executeSql',
  'bypassApproval',
  'skipValidation',
  'overrideRole',
  'overrideActorId',
  'overrideOrganizationId',
  'serviceRoleKey',
  '__proto__',
  'constructor',
  'prototype',
]);

export interface SchemaValidationResult<T> {
  valid: boolean;
  value?: T;
  errors: string[];
}

function hasForbiddenKeys(obj: unknown, path = 'root'): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const errors: string[] = [];

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (FORBIDDEN_MALICIOUS_KEYS.has(key)) {
      errors.push(`FORBIDDEN_MALICIOUS_FIELD: "${path}.${key}" is not allowed.`);
    }
    const val = (obj as Record<string, unknown>)[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      errors.push(...hasForbiddenKeys(val, `${path}.${key}`));
    }
  }
  return errors;
}

export function isValidIsoOrHumanDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parsed = Date.parse(dateStr);
  return Number.isFinite(parsed);
}

/**
 * Validates extracted traveler preferences (Section 8, Section 9, Section 78).
 */
export function validateExtractedPreferencesSchema(
  prefs: unknown
): SchemaValidationResult<ExtractedTravelerPreferences> {
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
    return {
      valid: false,
      errors: ['INVALID_PREFERENCES_OBJECT: Expected a structured object.'],
    };
  }

  const errors = hasForbiddenKeys(prefs, 'preferences');
  const record = prefs as Record<string, unknown>;

  if (record.budget !== undefined) {
    const budgetField = record.budget as { value?: unknown; source?: unknown };
    if (
      typeof budgetField !== 'object' ||
      budgetField === null ||
      typeof budgetField.value !== 'number' ||
      !Number.isFinite(budgetField.value) ||
      budgetField.value <= 0
    ) {
      errors.push(
        'INVALID_BUDGET_VALUE: Budget must be a positive finite number.'
      );
    }
  }

  if (record.durationDays !== undefined) {
    const durField = record.durationDays as { value?: unknown };
    if (
      typeof durField !== 'object' ||
      durField === null ||
      typeof durField.value !== 'number' ||
      !Number.isInteger(durField.value) ||
      durField.value < 1 ||
      durField.value > 60
    ) {
      errors.push(
        'INVALID_DURATION_DAYS: Duration must be an integer between 1 and 60 days.'
      );
    }
  }

  if (record.travelerCount !== undefined) {
    const countField = record.travelerCount as { value?: unknown };
    if (
      typeof countField !== 'object' ||
      countField === null ||
      typeof countField.value !== 'number' ||
      !Number.isInteger(countField.value) ||
      countField.value < 1 ||
      countField.value > 50
    ) {
      errors.push(
        'INVALID_TRAVELER_COUNT: Traveler count must be an integer between 1 and 50.'
      );
    }
  }

  if (record.currency !== undefined) {
    const currField = record.currency as { value?: unknown };
    if (
      typeof currField !== 'object' ||
      currField === null ||
      typeof currField.value !== 'string' ||
      !SUPPORTED_CURRENCIES.has(currField.value.toUpperCase())
    ) {
      errors.push(
        `INVALID_CURRENCY: Currency must be one of ${Array.from(SUPPORTED_CURRENCIES).join(', ')}.`
      );
    }
  }

  if (record.startDate !== undefined) {
    const startField = record.startDate as { value?: unknown };
    if (
      typeof startField !== 'object' ||
      startField === null ||
      typeof startField.value !== 'string' ||
      !isValidIsoOrHumanDate(startField.value)
    ) {
      errors.push('INVALID_START_DATE: startDate is not a valid date string.');
    }
  }

  if (record.endDate !== undefined) {
    const endField = record.endDate as { value?: unknown };
    if (
      typeof endField !== 'object' ||
      endField === null ||
      typeof endField.value !== 'string' ||
      !isValidIsoOrHumanDate(endField.value)
    ) {
      errors.push('INVALID_END_DATE: endDate is not a valid date string.');
    }
  }

  if (Array.isArray(record.interests)) {
    for (const item of record.interests) {
      const entry = item as {
        value?: unknown;
        source?: unknown;
        requiresUserConfirmation?: unknown;
      };
      if (
        !entry ||
        typeof entry.value !== 'string' ||
        (entry.source !== 'EXPLICIT' && entry.source !== 'INFERRED')
      ) {
        errors.push(
          'INVALID_INTEREST_ENTRY: Each interest must specify value and source (EXPLICIT | INFERRED).'
        );
      }
      if (
        entry?.source === 'INFERRED' &&
        entry.requiresUserConfirmation !== true
      ) {
        errors.push(
          'INFERRED_PREFERENCE_MUST_REQUIRE_CONFIRMATION: Inferred preferences cannot be marked confirmed without user confirmation.'
        );
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: prefs as ExtractedTravelerPreferences,
    errors: [],
  };
}

/**
 * Validates a tool-call request against the explicit allowlist and argument schema.
 */
export function validateToolCallRequestSchema(rawCall: unknown): SchemaValidationResult<{
  toolName: AiToolName;
  arguments: Record<string, unknown>;
}> {
  if (!rawCall || typeof rawCall !== 'object' || Array.isArray(rawCall)) {
    return {
      valid: false,
      errors: ['INVALID_TOOL_CALL_OBJECT: Tool call must be an object.'],
    };
  }

  const errors = hasForbiddenKeys(rawCall, 'toolCall');
  const callObj = rawCall as Record<string, unknown>;

  if (typeof callObj.toolName !== 'string' || !callObj.toolName.trim()) {
    errors.push('MISSING_TOOL_NAME: toolName is required.');
  } else if (!ALLOWLISTED_AI_TOOLS.has(callObj.toolName as AiToolName)) {
    errors.push(
      `UNKNOWN_TOOL_NAME: Tool "${callObj.toolName}" is not in the allowlisted tool registry.`
    );
  }

  if (
    callObj.arguments !== undefined &&
    (typeof callObj.arguments !== 'object' ||
      callObj.arguments === null ||
      Array.isArray(callObj.arguments))
  ) {
    errors.push('INVALID_TOOL_ARGUMENTS: arguments must be a JSON object.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      toolName: callObj.toolName as AiToolName,
      arguments: (callObj.arguments as Record<string, unknown>) || {},
    },
    errors: [],
  };
}

/**
 * Parses and validates raw JSON text or structured objects from an AI provider.
 */
export function parseAndValidateProviderJson(
  rawInput: string | Record<string, unknown>,
  maxOutputChars: number = 6000
): SchemaValidationResult<Record<string, unknown>> {
  let parsed: unknown;

  if (typeof rawInput === 'string') {
    if (rawInput.length > maxOutputChars) {
      return {
        valid: false,
        errors: [
          `OVERSIZED_AI_OUTPUT: Output length (${rawInput.length}) exceeds maximum limit (${maxOutputChars}).`,
        ],
      };
    }
    try {
      parsed = JSON.parse(rawInput);
    } catch {
      return {
        valid: false,
        errors: ['MALFORMED_JSON_OUTPUT: Provider output is not valid JSON.'],
      };
    }
  } else {
    const serialized = JSON.stringify(rawInput);
    if (serialized.length > maxOutputChars) {
      return {
        valid: false,
        errors: [
          `OVERSIZED_AI_OUTPUT: Serialized output length (${serialized.length}) exceeds maximum limit (${maxOutputChars}).`,
        ],
      };
    }
    parsed = rawInput;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: ['INVALID_ROOT_TYPE: Expected a top-level JSON object.'],
    };
  }

  const errors = hasForbiddenKeys(parsed, 'providerOutput');
  const obj = parsed as Record<string, unknown>;

  if (obj.schemaVersion !== AI_SCHEMA_VERSION) {
    errors.push(
      `INVALID_SCHEMA_VERSION: Expected "${AI_SCHEMA_VERSION}", received "${String(obj.schemaVersion)}".`
    );
  }

  if (
    typeof obj.intent !== 'string' ||
    !VALID_AI_INTENTS.has(obj.intent as AiIntentCategory)
  ) {
    errors.push(
      `INVALID_INTENT_ENUM: "${String(obj.intent)}" is not a supported AiIntentCategory.`
    );
  }

  if (
    typeof obj.confidence !== 'number' ||
    !Number.isFinite(obj.confidence) ||
    obj.confidence < 0 ||
    obj.confidence > 1
  ) {
    errors.push(
      'INVALID_CONFIDENCE_RANGE: confidence must be a finite number between 0 and 1.'
    );
  }

  if (typeof obj.requiresDeterministicValidation !== 'boolean') {
    errors.push(
      'MISSING_DETERMINISTIC_VALIDATION_FLAG: requiresDeterministicValidation (boolean) is required.'
    );
  }

  if (obj.extractedPreferences !== undefined) {
    const prefCheck = validateExtractedPreferencesSchema(
      obj.extractedPreferences
    );
    if (!prefCheck.valid) {
      errors.push(...prefCheck.errors);
    }
  }

  // Reject any embedded SQL instructions inside message or headline
  const textFields = [obj.headline, obj.message, obj.shortExplanation, obj.detailedExplanation]
    .filter((f): f is string => typeof f === 'string')
    .join(' ');

  if (/\b(UPDATE\s+\w+\s+SET|DELETE\s+FROM\s+\w+|DROP\s+TABLE\s+\w+)\b/i.test(textFields)) {
    errors.push('FORBIDDEN_SQL_IN_AI_OUTPUT: AI output must never contain SQL statements.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: obj,
    errors: [],
  };
}

/**
 * Validates the final StructuredAiResponse before returning it to any caller or UI component.
 */
export function validateStructuredAiResponseSchema(
  response: unknown,
  maxMessageChars: number = 2400
): SchemaValidationResult<StructuredAiResponse> {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return {
      valid: false,
      errors: ['INVALID_RESPONSE_OBJECT: Expected StructuredAiResponse object.'],
    };
  }

  const errors = hasForbiddenKeys(response, 'response');
  const res = response as Record<string, unknown>;

  if (res.schemaVersion !== AI_SCHEMA_VERSION) {
    errors.push(`INVALID_SCHEMA_VERSION: Expected "${AI_SCHEMA_VERSION}".`);
  }
  if (typeof res.requestId !== 'string' || !res.requestId.startsWith('AI-REQ-')) {
    errors.push('INVALID_REQUEST_ID: requestId must start with "AI-REQ-".');
  }
  if (typeof res.correlationId !== 'string' || !res.correlationId.trim()) {
    errors.push('INVALID_CORRELATION_ID: correlationId is required.');
  }
  if (
    typeof res.intent !== 'string' ||
    !VALID_AI_INTENTS.has(res.intent as AiIntentCategory)
  ) {
    errors.push(`INVALID_INTENT: "${String(res.intent)}" is not valid.`);
  }
  if (
    typeof res.responseType !== 'string' ||
    !VALID_AI_RESPONSE_TYPES.has(res.responseType as AiResponseType)
  ) {
    errors.push(
      `INVALID_RESPONSE_TYPE: "${String(res.responseType)}" is not valid.`
    );
  }
  if (
    typeof res.confidence !== 'number' ||
    !Number.isFinite(res.confidence) ||
    res.confidence < 0 ||
    res.confidence > 1
  ) {
    errors.push('INVALID_CONFIDENCE: Must be in [0, 1].');
  }
  if (typeof res.headline !== 'string' || !res.headline.trim()) {
    errors.push('MISSING_HEADLINE: headline is required.');
  }
  if (typeof res.message !== 'string' || !res.message.trim()) {
    errors.push('MISSING_MESSAGE: message is required.');
  } else if (res.message.length > maxMessageChars) {
    errors.push(
      `MESSAGE_TOO_LONG: message length (${res.message.length}) exceeds max (${maxMessageChars}).`
    );
  }
  if (!Array.isArray(res.groundedFacts)) {
    errors.push('MISSING_GROUNDED_FACTS: groundedFacts array is required.');
  }
  if (!Array.isArray(res.warnings)) {
    errors.push('MISSING_WARNINGS: warnings array is required.');
  }
  if (!Array.isArray(res.toolTrace)) {
    errors.push('MISSING_TOOL_TRACE: toolTrace array is required.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: response as StructuredAiResponse,
    errors: [],
  };
}
