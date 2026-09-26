-- ============================================================
-- Migration: Phase 03 — Location, Maps & Routing Foundation
-- File: 20260926000002_phase03_geographic_normalization.sql
-- Purpose:
--   1. Establish canonical `public.locations` table for normalized,
--      provider-neutral geographic entities (no raw Google JSON blobs).
--   2. Link `destinations`, `accommodations`, `activities`, and
--      `itinerary_items` to `public.locations` and provide normalized
--      coordinate columns with strict range constraints.
--   3. Configure indexes and Row-Level Security (RLS) policies.
-- ============================================================

-- 1. CANONICAL NORMALIZED LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  formatted_address TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  city TEXT,
  region TEXT,
  country TEXT,
  country_code CHAR(2),
  postal_code TEXT,
  timezone TEXT,
  location_type TEXT NOT NULL DEFAULT 'custom' CHECK (
    location_type IN (
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
      'custom'
    )
  ),
  provider TEXT NOT NULL DEFAULT 'google' CHECK (
    provider IN ('google', 'mock', 'demo', 'internal')
  ),
  provider_place_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique provider reference index (prevents duplicate place records per provider)
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_provider_place_unique
  ON public.locations (provider, provider_place_id)
  WHERE provider_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_coordinates
  ON public.locations (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_locations_type_country
  ON public.locations (location_type, country_code);

-- 2. NORMALIZED GEOGRAPHIC REFERENCES ON DOMAIN TABLES

-- 2a. Destinations
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS geo_lat NUMERIC(10, 7) CHECK (geo_lat IS NULL OR (geo_lat >= -90 AND geo_lat <= 90)),
  ADD COLUMN IF NOT EXISTS geo_lng NUMERIC(10, 7) CHECK (geo_lng IS NULL OR (geo_lng >= -180 AND geo_lng <= 180)),
  ADD COLUMN IF NOT EXISTS geo_place_id TEXT,
  ADD COLUMN IF NOT EXISTS geo_provider TEXT DEFAULT 'google';

-- 2b. Accommodations
ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS geo_lat NUMERIC(10, 7) CHECK (geo_lat IS NULL OR (geo_lat >= -90 AND geo_lat <= 90)),
  ADD COLUMN IF NOT EXISTS geo_lng NUMERIC(10, 7) CHECK (geo_lng IS NULL OR (geo_lng >= -180 AND geo_lng <= 180)),
  ADD COLUMN IF NOT EXISTS geo_place_id TEXT,
  ADD COLUMN IF NOT EXISTS geo_provider TEXT DEFAULT 'google';

-- 2c. Activities
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS geo_lat NUMERIC(10, 7) CHECK (geo_lat IS NULL OR (geo_lat >= -90 AND geo_lat <= 90)),
  ADD COLUMN IF NOT EXISTS geo_lng NUMERIC(10, 7) CHECK (geo_lng IS NULL OR (geo_lng >= -180 AND geo_lng <= 180)),
  ADD COLUMN IF NOT EXISTS geo_place_id TEXT,
  ADD COLUMN IF NOT EXISTS geo_provider TEXT DEFAULT 'google';

-- 2d. Itinerary Items
ALTER TABLE public.itinerary_items
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS geo_lat NUMERIC(10, 7) CHECK (geo_lat IS NULL OR (geo_lat >= -90 AND geo_lat <= 90)),
  ADD COLUMN IF NOT EXISTS geo_lng NUMERIC(10, 7) CHECK (geo_lng IS NULL OR (geo_lng >= -180 AND geo_lng <= 180)),
  ADD COLUMN IF NOT EXISTS geo_place_id TEXT,
  ADD COLUMN IF NOT EXISTS geo_provider TEXT DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS travel_mode_to_next TEXT DEFAULT 'driving' CHECK (
    travel_mode_to_next IS NULL OR travel_mode_to_next IN ('driving', 'walking', 'bicycling', 'transit')
  ),
  ADD COLUMN IF NOT EXISTS safety_buffer_minutes INT DEFAULT 15 CHECK (
    safety_buffer_minutes IS NULL OR safety_buffer_minutes >= 0
  );

-- 3. INDEXES FOR DOMAIN GEOGRAPHIC COLUMNS
CREATE INDEX IF NOT EXISTS idx_destinations_geo ON public.destinations (geo_lat, geo_lng);
CREATE INDEX IF NOT EXISTS idx_accommodations_geo ON public.accommodations (geo_lat, geo_lng);
CREATE INDEX IF NOT EXISTS idx_activities_geo ON public.activities (geo_lat, geo_lng);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_geo ON public.itinerary_items (geo_lat, geo_lng);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_location_id ON public.itinerary_items (location_id);

-- 4. ROW-LEVEL SECURITY (RLS) FOR LOCATIONS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Locations are readable by everyone" ON public.locations;
CREATE POLICY "Locations are readable by everyone"
  ON public.locations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert normalized locations" ON public.locations;
CREATE POLICY "Authenticated users can insert normalized locations"
  ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
  );

DROP POLICY IF EXISTS "Operators and admins can update normalized locations" ON public.locations;
CREATE POLICY "Operators and admins can update normalized locations"
  ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('operator', 'coordinator', 'admin')
    )
  );
