-- ============================================================================
-- PHASE 06 — REAL-TIME EXTERNAL EVENT & WEATHER INTELLIGENCE MIGRATION
-- ============================================================================
-- Establishes:
-- 1. Normalized global external events (weather, marine, travel alerts)
-- 2. Weather observations & forecasts with freshness & TTL
-- 3. Tenant-isolated external event journey impacts
-- 4. Provider health & sync telemetry
-- 5. Strict Row-Level Security (RLS) separating global events from private journey impacts
-- ============================================================================

-- 1. EXTERNAL EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.external_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  category TEXT NOT NULL, -- WEATHER, SEVERE_WEATHER, HIGH_WIND, RAIN, etc.
  severity TEXT NOT NULL, -- INFO, LOW, MEDIUM, HIGH, CRITICAL
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- DETECTED, VALIDATED, ACTIVE, UPDATED, RESOLVED, EXPIRED
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters DOUBLE PRECISION NOT NULL DEFAULT 25000,
  affected_area_description TEXT,
  source_url TEXT,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  raw_reference JSONB DEFAULT '{}'::jsonb,
  normalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_external_events_provider_event UNIQUE (provider, provider_event_id),
  CONSTRAINT ck_external_events_severity CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CONSTRAINT ck_external_events_coords CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),
  CONSTRAINT ck_external_events_effective CHECK (effective_until >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_external_events_effective ON public.external_events (effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_external_events_status ON public.external_events (status);
CREATE INDEX IF NOT EXISTS idx_external_events_category ON public.external_events (category);
CREATE INDEX IF NOT EXISTS idx_external_events_coords ON public.external_events (latitude, longitude);

-- 2. WEATHER OBSERVATIONS TABLE
CREATE TABLE IF NOT EXISTS public.weather_observations (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  temperature_c DOUBLE PRECISION NOT NULL,
  temperature_f DOUBLE PRECISION NOT NULL,
  feels_like_c DOUBLE PRECISION NOT NULL,
  feels_like_f DOUBLE PRECISION NOT NULL,
  precipitation_probability DOUBLE PRECISION NOT NULL DEFAULT 0,
  precipitation_amount_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  wind_speed_kmh DOUBLE PRECISION NOT NULL DEFAULT 0,
  wind_gust_kmh DOUBLE PRECISION NOT NULL DEFAULT 0,
  visibility_meters DOUBLE PRECISION NOT NULL DEFAULT 10000,
  weather_condition TEXT NOT NULL,
  weather_code INTEGER NOT NULL DEFAULT 0,
  humidity_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  pressure_hpa DOUBLE PRECISION NOT NULL DEFAULT 1013,
  uv_index DOUBLE PRECISION NOT NULL DEFAULT 0,
  sunrise_iso TIMESTAMPTZ,
  sunset_iso TIMESTAMPTZ,
  freshness TEXT NOT NULL DEFAULT 'FRESH',
  expires_at TIMESTAMPTZ NOT NULL,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_weather_obs_coords CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),
  CONSTRAINT ck_weather_obs_precip CHECK (precipitation_probability BETWEEN 0 AND 100),
  CONSTRAINT ck_weather_obs_humidity CHECK (humidity_percent BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_weather_observations_coords ON public.weather_observations (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_observations_expires ON public.weather_observations (expires_at);

-- 3. EXTERNAL EVENT JOURNEY IMPACTS TABLE (Tenant & Journey Isolated)
CREATE TABLE IF NOT EXISTS public.external_event_journey_impacts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.external_events(id) ON DELETE CASCADE,
  journey_id TEXT NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  journey_version INTEGER NOT NULL,
  affected_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity TEXT NOT NULL,
  spatial_overlap BOOLEAN NOT NULL DEFAULT true,
  temporal_overlap BOOLEAN NOT NULL DEFAULT true,
  distance_meters DOUBLE PRECISION NOT NULL DEFAULT 0,
  activity_sensitivity TEXT NOT NULL,
  disruption_risk TEXT NOT NULL, -- INFORMATIONAL, LOW, MEDIUM, HIGH, CRITICAL
  recommended_trigger TEXT NOT NULL DEFAULT 'ITEM_CANCELLED',
  requires_human_approval BOOLEAN NOT NULL DEFAULT true,
  proposal_generated BOOLEAN NOT NULL DEFAULT false,
  proposal_id TEXT,
  change_request_id TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_event_journey_impact_severity CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CONSTRAINT ck_event_journey_impact_risk CHECK (disruption_risk IN ('INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_event_journey_impacts_journey ON public.external_event_journey_impacts (journey_id);
CREATE INDEX IF NOT EXISTS idx_event_journey_impacts_event ON public.external_event_journey_impacts (event_id);
CREATE INDEX IF NOT EXISTS idx_event_journey_impacts_risk ON public.external_event_journey_impacts (disruption_risk);

-- 4. PROVIDER HEALTH TELEMETRY TABLE
CREATE TABLE IF NOT EXISTS public.provider_health_telemetry (
  provider_name TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, DEGRADED, UNAVAILABLE
  last_successful_sync TIMESTAMPTZ,
  last_failed_sync TIMESTAMPTZ,
  latest_latency_ms INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  rate_limit_hits INTEGER NOT NULL DEFAULT 0,
  latest_error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_event_journey_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_health_telemetry ENABLE ROW LEVEL SECURITY;

-- 1. External Events: Publicly readable for all authenticated & anonymous users (public weather/alerts)
-- Writes strictly restricted to service role / background processor
CREATE POLICY "external_events_read_all"
  ON public.external_events
  FOR SELECT
  USING (true);

-- 2. Weather Observations: Publicly readable for authenticated & anonymous users
CREATE POLICY "weather_observations_read_all"
  ON public.weather_observations
  FOR SELECT
  USING (true);

-- 3. External Event Journey Impacts: Strictly isolated by Journey Ownership & Operator Organization
CREATE POLICY "journey_impacts_traveler_read_own"
  ON public.external_event_journey_impacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = external_event_journey_impacts.journey_id
        AND j.traveler_id = auth.uid()
    )
  );

CREATE POLICY "journey_impacts_operator_read_org"
  ON public.external_event_journey_impacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE j.id = external_event_journey_impacts.journey_id
        AND p.role IN ('operator', 'admin')
        AND (p.organization_id IS NULL OR j.organization_id = p.organization_id)
    )
  );

-- 4. Provider Health Telemetry: Operators and Admins only
CREATE POLICY "provider_health_operator_admin_read"
  ON public.provider_health_telemetry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('operator', 'admin')
    )
  );
