/**
 * PHASE 06 — CONFIGURATION & CONSTANTS
 * Centralized, safe, server-friendly configuration for weather and external events.
 */

export interface ExternalEventsConfig {
  provider: 'open-meteo' | 'fixture' | 'mock';
  requestTimeoutMs: number;
  maxRetries: number;
  retryBaseBackoffMs: number;
  cacheTtlMs: number;
  freshnessThresholds: {
    freshMaxMinutes: number;
    agingMaxMinutes: number;
    staleMaxMinutes: number;
  };
  lookaheadHours: number;
  defaultEventRadiusMeters: number;
  marineEventRadiusMeters: number;
  maxConcurrentEventFanOut: number;
}

export const DEFAULT_EXTERNAL_EVENTS_CONFIG: ExternalEventsConfig = {
  provider: 'open-meteo',
  requestTimeoutMs: 8000,
  maxRetries: 2,
  retryBaseBackoffMs: 300,
  cacheTtlMs: 15 * 60 * 1000, // 15 mins
  freshnessThresholds: {
    freshMaxMinutes: 30,
    agingMaxMinutes: 120,
    staleMaxMinutes: 360, // 6 hours
  },
  lookaheadHours: 72,
  defaultEventRadiusMeters: 25000, // 25 km
  marineEventRadiusMeters: 10000, // 10 km
  maxConcurrentEventFanOut: 20,
};
