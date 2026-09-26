/**
 * Phase 03 — Provider-Neutral Location, Maps & Routing Domain Model
 *
 * Architectural Rule:
 * Domain logic and UI consumers must NEVER depend on Google Maps or any external
 * provider's raw response shapes. All external payloads are normalized into these
 * canonical contracts at the provider adapter boundary.
 */

export type GeoProviderId = 'google' | 'mock' | 'demo' | 'internal';

export type LocationType =
  | 'destination'
  | 'accommodation'
  | 'activity'
  | 'restaurant'
  | 'airport'
  | 'railway_station'
  | 'bus_station'
  | 'pickup_point'
  | 'dropoff_point'
  | 'attraction'
  | 'transfer'
  | 'custom';

export const VALID_LOCATION_TYPES: ReadonlyArray<LocationType> = [
  'destination',
  'accommodation',
  'activity',
  'restaurant',
  'airport',
  'railway_station',
  'bus_station',
  'pickup_point',
  'dropoff_point',
  'attraction',
  'transfer',
  'custom',
];

/**
 * Canonical geographic coordinate.
 * Supports both explicit `latitude`/`longitude` and short `lat`/`lng` convenience accessors.
 */
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  lat: number;
  lng: number;
}

export interface GeoCoordinateInput {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
}

/**
 * Normalized geographic location entity used across destinations, stays, activities,
 * transfers, and itinerary items.
 */
export interface GeoLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  coordinate: { lat: number; lng: number };
  address: string | null;
  formattedAddress: string;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  postalCode: string | null;
  provider: GeoProviderId;
  providerPlaceId: string | null;
  placeId?: string; // Convenience alias for providerPlaceId
  timezone: string | null;
  locationType: LocationType;
  isDemoFixture?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Lightweight normalized reference linking an internal domain record to a geographic location.
 */
export interface LocationReference {
  internalId: string;
  provider: GeoProviderId;
  providerId: string | null;
  coordinates: GeoCoordinate;
}

/**
 * Normalized travel modes.
 * Uppercase inputs ('DRIVING', 'WALKING', etc.) are normalized to lowercase via normalizeTravelMode().
 */
export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export type TravelModeInput =
  | TravelMode
  | 'DRIVING'
  | 'WALKING'
  | 'BICYCLING'
  | 'TRANSIT';

export interface RouteRequest {
  origin: GeoLocation | GeoCoordinateInput;
  destination: GeoLocation | GeoCoordinateInput;
  waypoints?: Array<GeoLocation | GeoCoordinateInput>;
  travelMode?: TravelModeInput;
  mode?: TravelModeInput; // Alias for backward compatibility
  departureTime?: string | Date;
  arrivalTime?: string | Date;
  routingPreference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  avoid?: Array<'tolls' | 'highways' | 'ferries'>;
}

export interface RouteLeg {
  origin: GeoCoordinate;
  destination: GeoCoordinate;
  originName?: string;
  destinationName?: string;
  distanceMeters: number;
  durationSeconds: number;
  travelMode: TravelMode;
}

export interface TravelTimeEstimate {
  durationSeconds: number;
  distanceMeters: number;
  trafficDelaySeconds?: number;
  provider: GeoProviderId;
  calculatedAt: string;
  trafficAware: boolean;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  travelMode: TravelMode;
  origin: GeoCoordinate;
  destination: GeoCoordinate;
  polyline: string | null;
  legs: RouteLeg[];
  provider: GeoProviderId;
  calculatedAt: string;
  isDemoData: boolean;
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'ERROR';
  estimate: TravelTimeEstimate;
  request?: RouteRequest;
  errorMessage?: string;
}

export interface RouteMatrixRequest {
  origins: Array<GeoLocation | GeoCoordinateInput>;
  destinations: Array<GeoLocation | GeoCoordinateInput>;
  travelMode: TravelModeInput;
}

export interface RouteMatrixCell {
  originIndex: number;
  destinationIndex: number;
  originName?: string;
  destinationName?: string;
  distanceMeters: number;
  durationSeconds: number;
  durationMinutes: number;
  travelMode: TravelMode;
  provider: GeoProviderId;
  calculatedAt: string;
  trafficAware: boolean;
  status: 'OK' | 'NOT_FOUND' | 'UNAVAILABLE';
}

export interface RouteMatrixResult {
  cells: RouteMatrixCell[][];
  travelMode: TravelMode;
  provider: GeoProviderId;
  calculatedAt: string;
  isDemoData: boolean;
}

export type FeasibilityReasonCode =
  | 'FEASIBLE'
  | 'INSUFFICIENT_TRANSFER_TIME'
  | 'TEMPORAL_OVERLAP'
  | 'INVALID_ITEM_TIME_WINDOW'
  | 'ROUTE_NOT_FOUND'
  | 'ROUTE_UNAVAILABLE'
  | 'INVALID_COORDINATES'
  | 'UNSUPPORTED_TRAVEL_MODE';

export interface FeasibilityConfig {
  safetyBufferMinutes?: number;
  minBufferMinutes?: number; // Alias
  travelMode?: TravelModeInput;
}

export interface FeasibilityEvaluation {
  feasible: boolean;
  isFeasible: boolean; // Convenience alias
  travelTimeMinutes: number;
  travelDurationMinutes: number; // Convenience alias
  distanceMeters: number;
  availableBufferMinutes: number;
  safetyBufferMinutes: number;
  requiredTotalMinutes: number;
  deficitMinutes: number;
  bufferDeficitMinutes: number; // Convenience alias
  reason: FeasibilityReasonCode;
  reasoning: string;
  travelMode: TravelMode;
  provider: GeoProviderId;
  isDemoData: boolean;
}

export interface CandidateInsertionEvaluation {
  feasible: boolean;
  previousTravelTimeMinutes: number;
  nextTravelTimeMinutes: number;
  availableWindowMinutes: number;
  candidateDurationMinutes: number;
  requiredBufferMinutes: number;
  totalRequiredMinutes: number;
  deficitMinutes: number;
  conflictReason: FeasibilityReasonCode | null;
  explanation: string;
  totalAdditionalTravelMinutes: number;
  geographicDistanceMeters: number;
  previousLegDistanceMeters: number;
  nextLegDistanceMeters: number;
  provider: GeoProviderId;
  isDemoData: boolean;
}

export interface ReplacementImpactEvaluation {
  originalItemTitle: string;
  candidateItemTitle: string;
  feasible: boolean;
  originalTotalTravelMinutes: number;
  replacementTotalTravelMinutes: number;
  travelTimeDeltaMinutes: number;
  originalTotalDistanceMeters: number;
  replacementTotalDistanceMeters: number;
  distanceDeltaMeters: number;
  conflictReason: FeasibilityReasonCode | null;
  explanation: string;
}

export interface PlaceSearchOptions {
  signal?: AbortSignal;
  limit?: number;
  countryCode?: string;
  locationType?: LocationType;
}

/**
 * Provider Adapters — Domain Contracts
 */
export interface LocationProvider {
  readonly providerId: GeoProviderId;
  searchPlaces(query: string, options?: PlaceSearchOptions): Promise<GeoLocation[]>;
  getPlaceDetails(placeId: string): Promise<GeoLocation>;
}

export interface GeocodingProvider {
  readonly providerId: GeoProviderId;
  geocode(address: string): Promise<GeoLocation[]>;
  reverseGeocode(coordinate: GeoCoordinateInput): Promise<GeoLocation[]>;
}

export interface RoutingProvider {
  readonly providerId: GeoProviderId;
  getRoute(request: RouteRequest): Promise<RouteResult>;
  getRouteMatrix(
    origins: Array<GeoLocation | GeoCoordinateInput>,
    destinations: Array<GeoLocation | GeoCoordinateInput>,
    mode: TravelModeInput
  ): Promise<TravelTimeEstimate[][]>;
  getTravelTimeMatrix(request: RouteMatrixRequest): Promise<RouteMatrixResult>;
}
