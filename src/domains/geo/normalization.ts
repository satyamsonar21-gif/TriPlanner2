/**
 * Phase 03 — Geographic Validation, Normalization & Conversion Utilities
 */

import type {
  GeoCoordinate,
  GeoCoordinateInput,
  GeoLocation,
  GeoProviderId,
  LocationType,
  TravelMode,
} from './types';
import { VALID_LOCATION_TYPES } from './types';
import { GeoDomainError } from './geo-error';

/**
 * Validates and normalizes any coordinate input into a strict `GeoCoordinate`.
 * Throws `GeoDomainError('INVALID_COORDINATES')` if missing, NaN, Infinite, or out of range.
 */
export function validateCoordinate(
  input: GeoCoordinateInput | GeoLocation | null | undefined
): GeoCoordinate {
  if (!input || typeof input !== 'object') {
    throw new GeoDomainError('INVALID_COORDINATES', 'Coordinate input is missing.');
  }

  let rawLat: number | undefined;
  let rawLng: number | undefined;

  if ('coordinate' in input && input.coordinate) {
    rawLat =
      typeof input.latitude === 'number' ? input.latitude : input.coordinate.lat;
    rawLng =
      typeof input.longitude === 'number' ? input.longitude : input.coordinate.lng;
  } else {
    const coord = input as GeoCoordinateInput;
    rawLat = typeof coord.latitude === 'number' ? coord.latitude : coord.lat;
    rawLng = typeof coord.longitude === 'number' ? coord.longitude : coord.lng;
  }

  if (
    typeof rawLat !== 'number' ||
    typeof rawLng !== 'number' ||
    !Number.isFinite(rawLat) ||
    !Number.isFinite(rawLng)
  ) {
    throw new GeoDomainError(
      'INVALID_COORDINATES',
      'Latitude and longitude must be finite numbers.'
    );
  }

  if (rawLat < -90 || rawLat > 90 || rawLng < -180 || rawLng > 180) {
    throw new GeoDomainError(
      'INVALID_COORDINATES',
      `Coordinates (${rawLat}, ${rawLng}) are out of valid bounds [-90..90, -180..180].`
    );
  }

  const lat = Number(rawLat.toFixed(6));
  const lng = Number(rawLng.toFixed(6));

  return {
    latitude: lat,
    longitude: lng,
    lat,
    lng,
  };
}

/**
 * Safe boolean check for whether a coordinate is valid.
 */
export function isValidCoordinate(
  input: GeoCoordinateInput | GeoLocation | null | undefined
): boolean {
  try {
    validateCoordinate(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a travel mode string to the canonical lowercase `TravelMode`.
 * Throws `GeoDomainError('UNSUPPORTED_TRAVEL_MODE')` if unsupported.
 */
export function normalizeTravelMode(mode: unknown): TravelMode {
  if (typeof mode !== 'string' || !mode.trim()) {
    throw new GeoDomainError('UNSUPPORTED_TRAVEL_MODE', 'Travel mode is empty.');
  }

  const cleaned = mode.trim().toLowerCase();

  switch (cleaned) {
    case 'driving':
    case 'car':
    case 'drive':
      return 'driving';
    case 'walking':
    case 'walk':
    case 'pedestrian':
      return 'walking';
    case 'bicycling':
    case 'bicycle':
    case 'bike':
    case 'cycling':
      return 'bicycling';
    case 'transit':
    case 'public_transit':
    case 'bus':
    case 'train':
      return 'transit';
    default:
      throw new GeoDomainError(
        'UNSUPPORTED_TRAVEL_MODE',
        `Unsupported travel mode: ${mode}`
      );
  }
}

/**
 * Normalizes location type to the controlled union.
 */
export function normalizeLocationType(input: unknown): LocationType {
  if (typeof input !== 'string' || !input.trim()) {
    return 'custom';
  }
  const cleaned = input.trim().toLowerCase() as LocationType;
  if (VALID_LOCATION_TYPES.includes(cleaned)) {
    return cleaned;
  }
  if (cleaned.includes('hotel') || cleaned.includes('lodging') || cleaned.includes('resort')) {
    return 'accommodation';
  }
  if (cleaned.includes('airport')) {
    return 'airport';
  }
  if (cleaned.includes('train') || cleaned.includes('railway')) {
    return 'railway_station';
  }
  if (cleaned.includes('bus')) {
    return 'bus_station';
  }
  if (cleaned.includes('food') || cleaned.includes('restaurant') || cleaned.includes('cafe')) {
    return 'restaurant';
  }
  if (cleaned.includes('locality') || cleaned.includes('administrative')) {
    return 'destination';
  }
  if (cleaned.includes('tourist_attraction') || cleaned.includes('museum') || cleaned.includes('park')) {
    return 'attraction';
  }
  return 'custom';
}

/**
 * Normalizes a partial place object into a complete, strictly typed `GeoLocation`.
 */
export function normalizeGeoLocation(input: {
  id?: string;
  name: string;
  latitude?: number;
  longitude?: number;
  coordinate?: { lat: number; lng: number };
  address?: string | null;
  formattedAddress?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
  provider?: GeoProviderId;
  providerPlaceId?: string | null;
  placeId?: string | null;
  timezone?: string | null;
  locationType?: unknown;
  isDemoFixture?: boolean;
  metadata?: Record<string, unknown>;
}): GeoLocation {
  const coord = validateCoordinate(
    input.coordinate ?? {
      latitude: input.latitude,
      longitude: input.longitude,
    }
  );

  const name = (input.name || '').trim() || 'Unnamed Location';
  const provider = input.provider || 'internal';
  const providerPlaceId = input.providerPlaceId ?? input.placeId ?? null;
  const formattedAddress =
    (input.formattedAddress || input.address || '').trim() ||
    [name, input.city, input.region, input.country].filter(Boolean).join(', ') ||
    name;

  return {
    id: input.id || providerPlaceId || `loc_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name,
    latitude: coord.latitude,
    longitude: coord.longitude,
    coordinate: { lat: coord.lat, lng: coord.lng },
    address: input.address ?? formattedAddress,
    formattedAddress,
    city: input.city ?? null,
    region: input.region ?? null,
    country: input.country ?? null,
    countryCode: input.countryCode ? input.countryCode.toUpperCase() : null,
    postalCode: input.postalCode ?? null,
    provider,
    providerPlaceId,
    placeId: providerPlaceId ?? undefined,
    timezone: input.timezone ?? null,
    locationType: normalizeLocationType(input.locationType),
    isDemoFixture: Boolean(input.isDemoFixture),
    metadata: input.metadata,
  };
}

/**
 * Calculates great-circle distance in meters between two coordinates using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  a: GeoCoordinateInput | GeoLocation,
  b: GeoCoordinateInput | GeoLocation
): number {
  const c1 = validateCoordinate(a);
  const c2 = validateCoordinate(b);

  if (c1.latitude === c2.latitude && c1.longitude === c2.longitude) {
    return 0;
  }

  const R = 6371000; // Earth mean radius in meters
  const phi1 = (c1.latitude * Math.PI) / 180;
  const phi2 = (c2.latitude * Math.PI) / 180;
  const deltaPhi = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const deltaLambda = ((c2.longitude - c1.longitude) * Math.PI) / 180;

  const sinHalfPhi = Math.sin(deltaPhi / 2);
  const sinHalfLambda = Math.sin(deltaLambda / 2);

  const h =
    sinHalfPhi * sinHalfPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfLambda * sinHalfLambda;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));

  return Math.round(R * c);
}

/**
 * Formats distance in meters into human-readable display string (e.g., "450 m" or "2.4 km").
 */
export function formatDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return '0 m';
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  const km = distanceMeters / 1000;
  return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

/**
 * Formats duration in seconds into human-readable display string (e.g., "12 min" or "1 hr 25 min").
 */
export function formatDuration(durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return '0 min';
  }
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}
