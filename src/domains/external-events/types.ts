import type { GeoCoordinate } from '@/domains/geo/types';
import type { ChangeTriggerType } from '@/domains/journey-engine/types';
import type { AiChangeProposal } from '@/domains/ai/types';

/**
 * PHASE 06 — REAL-TIME EXTERNAL EVENT & WEATHER INTELLIGENCE
 * DOMAIN DATA CONTRACTS
 */

export type ExternalEventCategory =
  | 'WEATHER'
  | 'SEVERE_WEATHER'
  | 'RAIN'
  | 'THUNDERSTORM'
  | 'HIGH_WIND'
  | 'EXTREME_HEAT'
  | 'EXTREME_COLD'
  | 'FLOOD'
  | 'CYCLONE'
  | 'VISIBILITY'
  | 'MARINE_CONDITION'
  | 'ROAD_DISRUPTION'
  | 'TRANSPORT_DISRUPTION'
  | 'AIRPORT_DISRUPTION'
  | 'VENDOR_DISRUPTION'
  | 'ACTIVITY_CANCELLATION'
  | 'OTHER';

export type ExternalEventSeverity =
  | 'INFO'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'ADVISORY'
  | 'WATCH'
  | 'WARNING'
  | 'EMERGENCY';

export type ExternalEventStatus =
  | 'DETECTED'
  | 'VALIDATED'
  | 'ACTIVE'
  | 'UPDATED'
  | 'IMPACT_ASSESSED'
  | 'ACTION_RECOMMENDED'
  | 'RESOLVED'
  | 'EXPIRED'
  | 'FAILED';

export type DataFreshnessStatus =
  | 'FRESH'
  | 'AGING'
  | 'STALE'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface ExternalFactProvenance {
  provider: string;
  providerName?: string;
  providerEventId: string;
  observedAt: string; // ISO
  retrievedAt: string; // ISO
  sourceUrl?: string;
  sourceEndpoint?: string;
  location: GeoCoordinate;
  dataVersion: number;
  expiresAt: string; // ISO
  confidenceScore: number; // 0..1
  freshness?: DataFreshnessStatus;
  rawPayloadHash?: string;
}

export interface ExternalEvent {
  id: string;
  provider: string;
  providerEventId: string;
  category: ExternalEventCategory;
  severity: ExternalEventSeverity;
  status: ExternalEventStatus;
  title: string;
  description: string;
  observedAt: string; // ISO
  effectiveFrom: string; // ISO
  effectiveUntil: string; // ISO
  validFrom?: string;
  validTo?: string;
  latitude: number;
  longitude: number;
  coordinates?: GeoCoordinate;
  radiusMeters: number;
  affectedAreaDescription?: string;
  sourceUrl?: string;
  confidence: number;
  rawReference?: Record<string, unknown>;
  normalizedAt: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt: string;
  freshness: DataFreshnessStatus;
  version: number;
  provenance: ExternalFactProvenance;
  windSpeedKmH?: number;
  windGustKmH?: number;
}

export interface WeatherObservation {
  id: string;
  provider: string;
  coordinates: GeoCoordinate;
  locationName: string;
  observedAt: string; // ISO
  forecastForIso?: string;
  temperatureC: number;
  temperatureF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  precipitationProbability: number; // 0..100
  precipitationAmountMm: number;
  windSpeedKmH: number;
  windGustKmH: number;
  visibilityMeters: number;
  weatherCondition: string;
  weatherCode: number;
  humidityPercent: number;
  pressureHpa: number;
  uvIndex: number;
  sunriseIso?: string;
  sunsetIso?: string;
  freshness: DataFreshnessStatus;
  expiresAt: string;
  provenance: ExternalFactProvenance;
}

/**
 * Deterministic Activity Sensitivity Levels
 * Dictates how vulnerable an itinerary activity is to atmospheric/marine conditions
 */
export type ActivityWeatherSensitivity =
  | 'HIGH_WATER_OR_MARINE' // Scuba, kayaking, sailing, boat charters, open sea
  | 'HIGH_OUTDOOR_EXPOSURE' // Beach lounging, trekking, open-top safari, cycling
  | 'MEDIUM_OUTDOOR_HERITAGE' // Forts, architectural walks, spice plantations, open-air markets
  | 'LOW_INDOOR' // Museums, art galleries, cooking masterclasses, indoor dining, spas
  | 'TRANSPORT_SENSITIVE'; // Ferry crossings, highway transfers, airport connection buffers

export interface WeatherImpactClassification {
  disruptionRisk: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  operationalActionRecommended: boolean;
  requiresApproval: boolean;
  reason: string;
  recommendedTrigger: ChangeTriggerType;
}

export interface ExternalEventJourneyImpact {
  id: string;
  eventId: string;
  event: ExternalEvent;
  journeyId: string;
  journeyVersion: number;
  affectedItemIds: string[];
  affectedItemTitles: string[];
  severity: ExternalEventSeverity;
  spatialOverlap: boolean;
  temporalOverlap: boolean;
  distanceMeters: number;
  activitySensitivity: ActivityWeatherSensitivity;
  disruptionRisk: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedTrigger: ChangeTriggerType;
  requiresHumanApproval: boolean;
  proposalGenerated: boolean;
  proposalId?: string;
  changeRequestId?: string;
  assessedAt: string;
  activityId?: string;
  activityTitle?: string;
  eventTitle?: string;
  eventSeverity?: string;
  impactReason?: string;
  recommendedAction?: string;
  evaluatedAt?: string;
}

export type ProviderHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';

export interface ProviderHealthReport {
  providerName: string;
  status: ProviderHealthStatus;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  latestLatencyMs: number;
  consecutiveFailures: number;
  totalRequests: number;
  rateLimitHits: number;
  latestErrorMessage?: string;
  updatedAt: string;
}

export interface ExternalConditionSummary {
  activeEventsCount: number;
  affectedJourneysCount: number;
  highRiskCount: number;
  pendingAdaptationsCount: number;
  providerStatus: ProviderHealthStatus;
  lastSyncAgoMinutes: number;
  isStale: boolean;
  activeEvents: ExternalEvent[];
  impacts: ExternalEventJourneyImpact[];
}

export interface WeatherEventChangeProposal extends AiChangeProposal {
  sourceEventId: string;
  sourceProvider: string;
  sourceProviderEventId: string;
  eventSeverity: ExternalEventSeverity;
  eventTitle: string;
  activitySensitivity: ActivityWeatherSensitivity;
  downstreamShiftSummary: string;
}
