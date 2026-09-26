/**
 * Phase 03 — Typed Location & Routing Domain Errors
 *
 * Translates external provider failures, configuration issues, and validation
 * violations into sanitized, human-readable domain errors.
 * Never exposes API keys, raw provider stack traces, or internal URLs.
 */

export type GeoErrorCode =
  | 'LOCATION_PROVIDER_UNAVAILABLE'
  | 'LOCATION_NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'ROUTE_UNAVAILABLE'
  | 'UNSUPPORTED_TRAVEL_MODE'
  | 'MAPS_CONFIGURATION_MISSING'
  | 'MAPS_API_UNAUTHORIZED'
  | 'MAPS_API_QUOTA_EXCEEDED'
  | 'MAPS_NETWORK_ERROR'
  | 'INVALID_COORDINATES';

const USER_ERROR_MESSAGES: Record<GeoErrorCode, string> = {
  LOCATION_PROVIDER_UNAVAILABLE:
    "We couldn't reach the location service right now. Please try again in a moment.",
  LOCATION_NOT_FOUND:
    "We couldn't find a matching place for that search. Try a broader city or landmark name.",
  ROUTE_NOT_FOUND:
    'No direct route could be found between these stops for the selected travel mode.',
  ROUTE_UNAVAILABLE:
    "We couldn't calculate this route right now. Your itinerary has not been changed.",
  UNSUPPORTED_TRAVEL_MODE:
    'The selected travel mode is not supported for this route segment.',
  MAPS_CONFIGURATION_MISSING:
    'Live map services are not configured in this environment.',
  MAPS_API_UNAUTHORIZED:
    'Map provider credentials could not be authorized. Please verify domain restrictions.',
  MAPS_API_QUOTA_EXCEEDED:
    'Map service request limit reached temporarily. Please wait a moment and retry.',
  MAPS_NETWORK_ERROR:
    'A network issue interrupted the route calculation. Your itinerary has not been changed.',
  INVALID_COORDINATES:
    'One or more location coordinates are missing or outside valid geographic bounds.',
};

const RETRYABLE_CODES: ReadonlySet<GeoErrorCode> = new Set([
  'LOCATION_PROVIDER_UNAVAILABLE',
  'ROUTE_UNAVAILABLE',
  'MAPS_API_QUOTA_EXCEEDED',
  'MAPS_NETWORK_ERROR',
]);

export class GeoDomainError extends Error {
  public readonly code: GeoErrorCode;
  public readonly userMessage: string;
  public readonly isRetryable: boolean;

  constructor(code: GeoErrorCode, technicalReason?: string, customUserMessage?: string) {
    const safeTechnical = sanitizeLogString(technicalReason || USER_ERROR_MESSAGES[code]);
    super(safeTechnical);
    this.name = 'GeoDomainError';
    this.code = code;
    this.userMessage = customUserMessage || USER_ERROR_MESSAGES[code];
    this.isRetryable = RETRYABLE_CODES.has(code);
  }
}

/**
 * Scrubs any potential API key (`key=...`, `AIza...`) from strings before logging or throwing.
 */
export function sanitizeLogString(input: string): string {
  if (!input) return '';
  return input
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]');
}

/**
 * Maps provider status strings or unknown exceptions into a strict GeoDomainError.
 */
export function mapProviderErrorToDomainError(
  errorOrStatus: unknown,
  context: 'location' | 'routing' = 'routing'
): GeoDomainError {
  if (errorOrStatus instanceof GeoDomainError) {
    return errorOrStatus;
  }

  const rawText =
    typeof errorOrStatus === 'string'
      ? errorOrStatus
      : errorOrStatus instanceof Error
      ? errorOrStatus.message
      : String(errorOrStatus ?? '');

  const normalized = rawText.toUpperCase();

  if (normalized.includes('INVALID_COORDINATE')) {
    return new GeoDomainError('INVALID_COORDINATES', rawText);
  }
  if (normalized.includes('UNSUPPORTED_TRAVEL_MODE')) {
    return new GeoDomainError('UNSUPPORTED_TRAVEL_MODE', rawText);
  }
  if (
    normalized.includes('MAPS_CONFIGURATION_MISSING') ||
    normalized.includes('KEY IS MISSING')
  ) {
    return new GeoDomainError('MAPS_CONFIGURATION_MISSING', rawText);
  }
  if (
    normalized.includes('REQUEST_DENIED') ||
    normalized.includes('UNAUTHORIZED') ||
    normalized.includes('INVALID_KEY') ||
    normalized.includes('401') ||
    normalized.includes('403')
  ) {
    return new GeoDomainError('MAPS_API_UNAUTHORIZED', rawText);
  }
  if (
    normalized.includes('OVER_QUERY_LIMIT') ||
    normalized.includes('QUOTA') ||
    normalized.includes('RATE_LIMIT') ||
    normalized.includes('429')
  ) {
    return new GeoDomainError('MAPS_API_QUOTA_EXCEEDED', rawText);
  }
  if (normalized.includes('ZERO_RESULTS') || normalized.includes('NOT_FOUND')) {
    return new GeoDomainError(
      context === 'location' ? 'LOCATION_NOT_FOUND' : 'ROUTE_NOT_FOUND',
      rawText
    );
  }
  if (
    normalized.includes('TIMEOUT') ||
    normalized.includes('NETWORK') ||
    normalized.includes('FETCH') ||
    normalized.includes('OFFLINE')
  ) {
    return new GeoDomainError('MAPS_NETWORK_ERROR', rawText);
  }

  return new GeoDomainError(
    context === 'location' ? 'LOCATION_PROVIDER_UNAVAILABLE' : 'ROUTE_UNAVAILABLE',
    rawText
  );
}
