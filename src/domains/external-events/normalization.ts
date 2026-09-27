import { validateCoordinate } from '@/domains/geo/normalization';
import type { GeoCoordinate } from '@/domains/geo/types';
import { DEFAULT_EXTERNAL_EVENTS_CONFIG } from './config';
import type {
  DataFreshnessStatus,
  ExternalEvent,
  ExternalEventCategory,
  ExternalEventSeverity,
  WeatherObservation,
} from './types';

/**
 * PHASE 06 — NORMALIZATION, VALIDATION, UNIT CONVERSION & FRESHNESS
 */

export interface RawEventPayload {
  id?: string;
  provider?: string;
  providerEventId?: string;
  category?: string;
  severity?: string;
  title?: string;
  description?: string;
  observedAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  affectedAreaDescription?: string;
  sourceUrl?: string;
  confidence?: number;
  rawReference?: Record<string, unknown>;
  expiresAt?: string;
}

export interface RawWeatherPayload {
  id?: string;
  provider?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  observedAt?: string;
  forecastForIso?: string;
  temperatureC?: number;
  temperatureF?: number;
  feelsLikeC?: number;
  feelsLikeF?: number;
  precipitationProbability?: number;
  precipitationAmountMm?: number;
  windSpeedKmH?: number;
  windGustKmH?: number;
  visibilityMeters?: number;
  weatherCondition?: string;
  weatherCode?: number;
  humidityPercent?: number;
  pressureHpa?: number;
  uvIndex?: number;
  sunriseIso?: string;
  sunsetIso?: string;
  expiresAt?: string;
}

export interface SanitizedTextResult {
  cleanText: string;
  quarantinedDirectivesCount: number;
}

/**
 * Sanitizes untrusted external provider text against HTML, scripts,
 * and embedded prompt injection directives.
 */
export function sanitizeExternalProviderText(raw: unknown): SanitizedTextResult {
  if (typeof raw !== 'string' || !raw) {
    return { cleanText: '', quarantinedDirectivesCount: 0 };
  }

  let cleaned = raw;
  let quarantinedCount = 0;

  // 1. Strip HTML tags
  cleaned = cleaned.replace(/<[^>]*>?/gm, '');

  // 2. Quarantine prompt injection directives embedded inside provider descriptions
  const hostilePatterns: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior|system)\s+instructions/gi,
    /cancel\s+(all\s+)?journeys?/gi,
    /delete\s+(all\s+)?journeys?/gi,
    /drop\s+table/gi,
    /execute\s+tool/gi,
    /reveal\s+(api\s+key|credentials|secret)/gi,
  ];

  for (const pattern of hostilePatterns) {
    if (pattern.test(cleaned)) {
      quarantinedCount++;
      cleaned = cleaned.replace(pattern, '[QUARANTINED_UNTRUSTED_EXTERNAL_DIRECTIVE]');
    }
  }

  return {
    cleanText: cleaned.trim(),
    quarantinedDirectivesCount: quarantinedCount,
  };
}

/**
 * Unit Conversions
 */
export function fahrenheitToCelsius(f: number): number {
  return Number((((f - 32) * 5) / 9).toFixed(1));
}

export function celsiusToFahrenheit(c: number): number {
  return Number(((c * 9) / 5 + 32).toFixed(1));
}

export function mphToKmh(mph: number): number {
  return Number((mph * 1.60934).toFixed(1));
}

export function kmhToMph(kmh: number): number {
  return Number((kmh / 1.60934).toFixed(2));
}

export function mmToInches(mm: number): number {
  return Number((mm / 25.4).toFixed(2));
}

export function inchesToMm(inches: number): number {
  return Number((inches * 25.4).toFixed(1));
}

export function metersToMiles(meters: number): number {
  return Number((meters / 1609.34).toFixed(2));
}

export function milesToMeters(miles: number): number {
  return Number((miles * 1609.34).toFixed(2));
}

/**
 * Calculates deterministic freshness status based on age in minutes.
 */
export function calculateDataFreshness(
  timestampIso: string | Date,
  nowIso?: string | Date
): DataFreshnessStatus {
  try {
    const ts = typeof timestampIso === 'string' ? new Date(timestampIso).getTime() : timestampIso.getTime();
    const now = nowIso
      ? typeof nowIso === 'string'
        ? new Date(nowIso).getTime()
        : nowIso.getTime()
      : Date.now();

    if (!Number.isFinite(ts) || isNaN(ts)) {
      return 'UNKNOWN';
    }

    const ageMinutes = Math.max(0, (now - ts) / (1000 * 60));
    const thresholds = DEFAULT_EXTERNAL_EVENTS_CONFIG.freshnessThresholds;

    if (ageMinutes <= thresholds.freshMaxMinutes) {
      return 'FRESH';
    }
    if (ageMinutes <= thresholds.agingMaxMinutes) {
      return 'AGING';
    }
    if (ageMinutes <= thresholds.staleMaxMinutes) {
      return 'STALE';
    }
    return 'EXPIRED';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Normalizes severity into strict ExternalEventSeverity union.
 */
export function normalizeEventSeverity(raw: unknown): ExternalEventSeverity {
  if (typeof raw !== 'string') return 'INFO';
  const upper = raw.trim().toUpperCase();
  if (upper === 'CRITICAL' || upper === 'EXTREME' || upper === 'EMERGENCY') return 'CRITICAL';
  if (upper === 'HIGH' || upper === 'SEVERE' || upper === 'WARNING') return 'HIGH';
  if (upper === 'MEDIUM' || upper === 'MODERATE' || upper === 'ADVISORY') return 'MEDIUM';
  if (upper === 'LOW' || upper === 'MINOR') return 'LOW';
  return 'INFO';
}

/**
 * Normalizes event category into strict ExternalEventCategory union.
 */
export function normalizeEventCategory(raw: unknown): ExternalEventCategory {
  if (typeof raw !== 'string') return 'OTHER';
  const upper = raw.trim().toUpperCase();
  const known: ExternalEventCategory[] = [
    'WEATHER',
    'SEVERE_WEATHER',
    'RAIN',
    'THUNDERSTORM',
    'HIGH_WIND',
    'EXTREME_HEAT',
    'EXTREME_COLD',
    'FLOOD',
    'CYCLONE',
    'VISIBILITY',
    'MARINE_CONDITION',
    'ROAD_DISRUPTION',
    'TRANSPORT_DISRUPTION',
    'AIRPORT_DISRUPTION',
    'VENDOR_DISRUPTION',
    'ACTIVITY_CANCELLATION',
  ];
  for (const cat of known) {
    if (upper === cat || upper.includes(cat)) {
      return cat;
    }
  }
  if (upper.includes('WIND') || upper.includes('GUST')) return 'HIGH_WIND';
  if (upper.includes('STORM') || upper.includes('LIGHTNING')) return 'THUNDERSTORM';
  if (upper.includes('RAIN') || upper.includes('DOWNPOUR')) return 'RAIN';
  if (upper.includes('SWELL') || upper.includes('TIDE') || upper.includes('WAVE') || upper.includes('MARINE')) return 'MARINE_CONDITION';
  if (upper.includes('ROAD') || upper.includes('TRAFFIC') || upper.includes('CLOSURE')) return 'ROAD_DISRUPTION';
  if (upper.includes('FLIGHT') || upper.includes('AIRPORT')) return 'AIRPORT_DISRUPTION';
  return 'WEATHER';
}

export interface EventNormalizationResult {
  valid: boolean;
  event: ExternalEvent | null;
  errors: string[];
  quarantineReason?: string;
}

export interface WeatherNormalizationResult {
  valid: boolean;
  observation: WeatherObservation | null;
  errors: string[];
  quarantineReason?: string;
}

/**
 * Computes deterministic fingerprint for an external event to detect exact duplicate polls.
 */
export function computeEventFingerprint(params: {
  provider?: string;
  providerEventId?: string;
  id?: string;
  category?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  latitude?: number;
  longitude?: number;
  provenance?: { provider?: string; providerEventId?: string };
}): string {
  const prov = (params.provider || params.provenance?.provider || 'unknown').toLowerCase();
  const provId = params.providerEventId || params.id || params.provenance?.providerEventId || 'unknown';
  const cat = (params.category || 'OTHER').toUpperCase();
  const efFrom = params.effectiveFrom || '';
  const efUntil = params.effectiveUntil || '';
  const lat = typeof params.latitude === 'number' && Number.isFinite(params.latitude) ? params.latitude.toFixed(4) : '0.0000';
  const lng = typeof params.longitude === 'number' && Number.isFinite(params.longitude) ? params.longitude.toFixed(4) : '0.0000';
  const parts = [
    prov,
    provId,
    cat,
    efFrom,
    efUntil,
    lat,
    lng,
  ];
  return `fp_${parts.join('::')}`;
}

/**
 * Validates and normalizes raw external event payload into domain model.
 * Returns null if payload is critically malformed (e.g. invalid coordinates or missing IDs).
 */
export function normalizeExternalEvent(
  raw: RawEventPayload,
  fallbackProvider = 'open-meteo'
): EventNormalizationResult {
  try {
    if (!raw || typeof raw !== 'object') {
      return { valid: false, event: null, errors: ['PAYLOAD_NOT_OBJECT'], quarantineReason: 'PAYLOAD_NOT_OBJECT' };
    }

    const provider = (raw.provider || fallbackProvider).trim();
    const providerEventId = (raw.providerEventId || raw.id || '').trim();
    if (!providerEventId) {
      return { valid: false, event: null, errors: ['MISSING_PROVIDER_EVENT_ID'], quarantineReason: 'MISSING_PROVIDER_EVENT_ID' };
    }

    // Coordinates validation
    let coords: GeoCoordinate;
    try {
      coords = validateCoordinate({
        latitude: raw.latitude,
        longitude: raw.longitude,
      });
    } catch (coordErr) {
      return {
        valid: false,
        event: null,
        errors: [`INVALID_COORDINATES: ${(coordErr as Error).message}`],
        quarantineReason: `INVALID_COORDINATES: ${(coordErr as Error).message}`,
      };
    }

    // Timestamps validation
    const now = new Date();
    const observedAt = raw.observedAt && !isNaN(Date.parse(raw.observedAt))
      ? new Date(raw.observedAt).toISOString()
      : now.toISOString();

    const effectiveFrom = raw.effectiveFrom && !isNaN(Date.parse(raw.effectiveFrom))
      ? new Date(raw.effectiveFrom).toISOString()
      : observedAt;

    let effectiveUntil = raw.effectiveUntil && !isNaN(Date.parse(raw.effectiveUntil))
      ? new Date(raw.effectiveUntil).toISOString()
      : new Date(Date.parse(effectiveFrom) + 6 * 3600 * 1000).toISOString();

    if (Date.parse(effectiveUntil) < Date.parse(effectiveFrom)) {
      effectiveUntil = new Date(Date.parse(effectiveFrom) + 3600 * 1000).toISOString();
    }

    const expiresAt = raw.expiresAt && !isNaN(Date.parse(raw.expiresAt))
      ? new Date(raw.expiresAt).toISOString()
      : effectiveUntil;

    // Sanitization of title and description
    const titleSanitized = sanitizeExternalProviderText(raw.title || 'External Advisory');
    const descSanitized = sanitizeExternalProviderText(raw.description || '');

    const category = normalizeEventCategory(raw.category);
    const severity = normalizeEventSeverity(raw.severity);
    const radiusMeters =
      typeof raw.radiusMeters === 'number' && Number.isFinite(raw.radiusMeters) && raw.radiusMeters > 0
        ? raw.radiusMeters
        : category === 'MARINE_CONDITION'
        ? DEFAULT_EXTERNAL_EVENTS_CONFIG.marineEventRadiusMeters
        : DEFAULT_EXTERNAL_EVENTS_CONFIG.defaultEventRadiusMeters;

    const freshness = calculateDataFreshness(observedAt);

    const eventId = `evt_${provider}_${providerEventId}`;

    const event: ExternalEvent = {
      id: eventId,
      provider,
      providerEventId,
      category,
      severity,
      status: 'ACTIVE',
      title: titleSanitized.cleanText,
      description: descSanitized.cleanText,
      observedAt,
      effectiveFrom,
      effectiveUntil,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radiusMeters,
      affectedAreaDescription: raw.affectedAreaDescription || undefined,
      sourceUrl: raw.sourceUrl || undefined,
      confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 1.0,
      rawReference: raw.rawReference || undefined,
      normalizedAt: now.toISOString(),
      expiresAt,
      freshness,
      version: 1,
      provenance: {
        provider,
        providerEventId,
        observedAt,
        retrievedAt: now.toISOString(),
        sourceUrl: raw.sourceUrl,
        location: coords,
        dataVersion: 1,
        expiresAt,
        confidenceScore: typeof raw.confidence === 'number' ? raw.confidence : 1.0,
      },
    };

    return { valid: true, event, errors: [] };
  } catch (err) {
    return {
      valid: false,
      event: null,
      errors: [`NORMALIZATION_EXCEPTION: ${(err as Error).message}`],
      quarantineReason: `NORMALIZATION_EXCEPTION: ${(err as Error).message}`,
    };
  }
}

/**
 * Normalizes raw weather observation into strict WeatherObservation domain model.
 */
export function normalizeWeatherObservation(
  raw: RawWeatherPayload,
  fallbackProvider = 'open-meteo'
): WeatherNormalizationResult {
  try {
    if (!raw || typeof raw !== 'object') {
      return { valid: false, observation: null, errors: ['PAYLOAD_NOT_OBJECT'], quarantineReason: 'PAYLOAD_NOT_OBJECT' };
    }

    if (
      raw.temperatureC !== undefined &&
      (typeof raw.temperatureC !== 'number' || !Number.isFinite(raw.temperatureC) || isNaN(raw.temperatureC))
    ) {
      return {
        valid: false,
        observation: null,
        errors: ['INVALID_TEMPERATURE: temperatureC must be a finite number'],
        quarantineReason: 'INVALID_TEMPERATURE',
      };
    }

    if (
      raw.temperatureF !== undefined &&
      (typeof raw.temperatureF !== 'number' || !Number.isFinite(raw.temperatureF) || isNaN(raw.temperatureF))
    ) {
      return {
        valid: false,
        observation: null,
        errors: ['INVALID_TEMPERATURE: temperatureF must be a finite number'],
        quarantineReason: 'INVALID_TEMPERATURE',
      };
    }

    let coords: GeoCoordinate;
    try {
      coords = validateCoordinate({
        latitude: raw.latitude,
        longitude: raw.longitude,
      });
    } catch (err) {
      return {
        valid: false,
        observation: null,
        errors: [`INVALID_COORDINATES: ${(err as Error).message}`],
        quarantineReason: `INVALID_COORDINATES: ${(err as Error).message}`,
      };
    }

    const provider = (raw.provider || fallbackProvider).trim();
    const now = new Date();
    const observedAt = raw.observedAt && !isNaN(Date.parse(raw.observedAt))
      ? new Date(raw.observedAt).toISOString()
      : now.toISOString();

    const tempC =
      typeof raw.temperatureC === 'number' && Number.isFinite(raw.temperatureC)
        ? Number(raw.temperatureC.toFixed(1))
        : typeof raw.temperatureF === 'number' && Number.isFinite(raw.temperatureF)
        ? fahrenheitToCelsius(raw.temperatureF)
        : 25.0;

    const tempF =
      typeof raw.temperatureF === 'number' && Number.isFinite(raw.temperatureF)
        ? Number(raw.temperatureF.toFixed(1))
        : celsiusToFahrenheit(tempC);

    const feelsLikeC =
      typeof raw.feelsLikeC === 'number' && Number.isFinite(raw.feelsLikeC)
        ? Number(raw.feelsLikeC.toFixed(1))
        : tempC;

    const feelsLikeF =
      typeof raw.feelsLikeF === 'number' && Number.isFinite(raw.feelsLikeF)
        ? Number(raw.feelsLikeF.toFixed(1))
        : celsiusToFahrenheit(feelsLikeC);

    const precipProb =
      typeof raw.precipitationProbability === 'number'
        ? Math.max(0, Math.min(100, Math.round(raw.precipitationProbability)))
        : 0;

    const precipAmount =
      typeof raw.precipitationAmountMm === 'number' && Number.isFinite(raw.precipitationAmountMm)
        ? Math.max(0, raw.precipitationAmountMm)
        : 0;

    const windSpeed =
      typeof raw.windSpeedKmH === 'number' && Number.isFinite(raw.windSpeedKmH)
        ? Math.max(0, raw.windSpeedKmH)
        : 0;

    const windGust =
      typeof raw.windGustKmH === 'number' && Number.isFinite(raw.windGustKmH)
        ? Math.max(0, raw.windGustKmH)
        : windSpeed * 1.2;

    const humidity =
      typeof raw.humidityPercent === 'number'
        ? Math.max(0, Math.min(100, Math.round(raw.humidityPercent)))
        : 50;

    const expiresAt = raw.expiresAt && !isNaN(Date.parse(raw.expiresAt))
      ? new Date(raw.expiresAt).toISOString()
      : new Date(Date.parse(observedAt) + DEFAULT_EXTERNAL_EVENTS_CONFIG.cacheTtlMs).toISOString();

    const freshness = calculateDataFreshness(observedAt);

    const obsId = `wobs_${provider}_${coords.latitude.toFixed(2)}_${coords.longitude.toFixed(2)}_${Date.parse(observedAt)}`;

    const observation: WeatherObservation = {
      id: obsId,
      provider,
      coordinates: coords,
      locationName: raw.locationName || 'Destination Location',
      observedAt,
      forecastForIso: raw.forecastForIso || undefined,
      temperatureC: tempC,
      temperatureF: tempF,
      feelsLikeC,
      feelsLikeF,
      precipitationProbability: precipProb,
      precipitationAmountMm: precipAmount,
      windSpeedKmH: windSpeed,
      windGustKmH: windGust,
      visibilityMeters: raw.visibilityMeters ?? 10000,
      weatherCondition: raw.weatherCondition || (precipProb > 50 ? 'Rainy' : 'Clear'),
      weatherCode: raw.weatherCode ?? 0,
      humidityPercent: humidity,
      pressureHpa: raw.pressureHpa ?? 1013,
      uvIndex: raw.uvIndex ?? 5,
      sunriseIso: raw.sunriseIso,
      sunsetIso: raw.sunsetIso,
      freshness,
      expiresAt,
      provenance: {
        provider,
        providerEventId: obsId,
        observedAt,
        retrievedAt: now.toISOString(),
        location: coords,
        dataVersion: 1,
        expiresAt,
        confidenceScore: 0.95,
      },
    };

    return { valid: true, observation, errors: [] };
  } catch (err) {
    return {
      valid: false,
      observation: null,
      errors: [`OBSERVATION_NORMALIZATION_EXCEPTION: ${(err as Error).message}`],
      quarantineReason: `OBSERVATION_NORMALIZATION_EXCEPTION: ${(err as Error).message}`,
    };
  }
}
