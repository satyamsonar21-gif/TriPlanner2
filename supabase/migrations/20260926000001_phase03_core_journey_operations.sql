-- ==============================================================================
-- TRIPLANNER — PHASE 03: CORE JOURNEY OPERATIONS, GRAPH DEPENDENCIES & RLS
-- Migration: 20260926000001_phase03_core_journey_operations.sql
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journey_status') THEN
    CREATE TYPE journey_status AS ENUM (
      'draft', 'planning', 'booked', 'disrupted', 'modifying', 'completed', 'cancelled'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'itinerary_item_type') THEN
    CREATE TYPE itinerary_item_type AS ENUM (
      'accommodation', 'activity', 'flight', 'transfer', 'meal', 'custom'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'itinerary_item_status') THEN
    CREATE TYPE itinerary_item_status AS ENUM (
      'planned', 'confirmed', 'at_risk', 'cancelled', 'modified'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dependency_edge_type') THEN
    CREATE TYPE dependency_edge_type AS ENUM (
      'precedes', 'transfers_to', 'requires_checkin_at', 'requires_meal_after', 'buffer_transit'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM (
      'confirmed', 'pending', 'at_risk', 'cancelled', 'refunded'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'paid', 'pending', 'refunded', 'partial', 'failed'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'disruption_severity') THEN
    CREATE TYPE disruption_severity AS ENUM (
      'low', 'medium', 'high', 'critical'
    );
  END IF;
END $$;

-- 2. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('operator', 'agency', 'dmc', 'vendor', 'enterprise')),
  license_number TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. DESTINATIONS, ACCOMMODATIONS & ACTIVITIES
CREATE TABLE IF NOT EXISTS public.destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  short_description TEXT NOT NULL,
  hero_image TEXT NOT NULL,
  best_season TEXT[] NOT NULL DEFAULT '{}',
  styles TEXT[] NOT NULL DEFAULT '{}',
  base_budget_estimate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.accommodations (
  id TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hotel', 'resort', 'villa', 'boutique', 'apartment')),
  star_rating NUMERIC(2, 1) NOT NULL DEFAULT 4.0,
  address TEXT NOT NULL,
  price_per_night NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  hero_image TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.activities (
  id TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_hours NUMERIC(4, 2) NOT NULL DEFAULT 2.0,
  price NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  hero_image TEXT NOT NULL,
  min_notice_hours INT NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. JOURNEYS & JOURNEY MEMBERS
CREATE TABLE IF NOT EXISTS public.journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  destination_ids TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status journey_status NOT NULL DEFAULT 'draft',
  current_location TEXT,
  travel_styles TEXT[] NOT NULL DEFAULT '{}',
  travelers_count INT NOT NULL DEFAULT 1,
  progress_percentage INT NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_journey_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.journey_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'collaborator', 'viewer', 'coordinator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(journey_id, user_id)
);

-- 5. ITINERARY ITEMS & DEPENDENCY GRAPH EDGES
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1),
  sequence_order INT NOT NULL DEFAULT 1,
  type itinerary_item_type NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  booking_reference_id TEXT,
  status itinerary_item_status NOT NULL DEFAULT 'planned',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_item_timing CHECK (end_time >= start_time)
);

CREATE TABLE IF NOT EXISTS public.itinerary_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  predecessor_id UUID NOT NULL REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  dependency_type dependency_edge_type NOT NULL DEFAULT 'precedes',
  min_buffer_minutes INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT no_self_dependency CHECK (predecessor_id <> successor_id),
  UNIQUE(predecessor_id, successor_id)
);

-- 6. BOOKINGS, PAYMENTS & REFUNDS
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  traveler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_reference TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('accommodation', 'flight', 'activity', 'transport', 'meal', 'package')),
  title TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  location TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  voucher_details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  traveler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  gateway_reference TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  invoice_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  traveler_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processed', 'pending', 'declined')),
  gateway_reference TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. DISRUPTIONS & PROPOSALS
CREATE TABLE IF NOT EXISTS public.disruptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  affected_item_id UUID NOT NULL REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  cause TEXT NOT NULL,
  severity disruption_severity NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  status TEXT NOT NULL CHECK (status IN ('detected', 'analyzed', 'alternative_proposed', 'resolved', 'dismissed')) DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.alternative_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disruption_id UUID NOT NULL REFERENCES public.disruptions(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  replacement_items JSONB NOT NULL DEFAULT '[]',
  cost_difference NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  preference_match_score INT NOT NULL CHECK (preference_match_score BETWEEN 0 AND 100),
  distance_km NUMERIC(6, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'accepted', 'declined', 'expired')) DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. NOTIFICATIONS & AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('disruption', 'booking', 'payment', 'recommendation', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  priority TEXT NOT NULL CHECK (priority IN ('normal', 'high', 'urgent')) DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_journeys_traveler_id ON public.journeys(traveler_id);
CREATE INDEX IF NOT EXISTS idx_journeys_status ON public.journeys(status);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_journey_day ON public.itinerary_items(journey_id, day_number);
CREATE INDEX IF NOT EXISTS idx_itinerary_dependencies_journey ON public.itinerary_dependencies(journey_id);
CREATE INDEX IF NOT EXISTS idx_bookings_journey ON public.bookings(journey_id);
CREATE INDEX IF NOT EXISTS idx_bookings_traveler ON public.bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_disruptions_journey ON public.disruptions(journey_id);

-- 10. SECURITY: HARDEN PROFILES SELECT (FIX FOR ISSUE 15)
-- Replace broad role-based SELECT policy with privacy-preserving policy
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = id
    OR EXISTS (
      -- Only authorized coordinators or journey operators can view assigned traveler profiles
      SELECT 1 FROM public.journeys j
      WHERE j.traveler_id = public.profiles.id
        AND (j.operator_id = (select auth.uid()) OR j.coordinator_id = (select auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

-- Create sanitized public directory view for operators & vendors (NO private phone or email)
CREATE OR REPLACE VIEW public.public_directory AS
SELECT
  id,
  full_name,
  display_name,
  avatar_url,
  role,
  organization_id,
  status
FROM public.profiles
WHERE role IN ('operator', 'vendor', 'coordinator')
  AND status = 'active';

-- 11. ROW LEVEL SECURITY POLICIES FOR NEW ENTITIES
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alternative_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Catalog tables: Public read
CREATE POLICY "destinations_public_read" ON public.destinations FOR SELECT USING (true);
CREATE POLICY "accommodations_public_read" ON public.accommodations FOR SELECT USING (true);
CREATE POLICY "activities_public_read" ON public.activities FOR SELECT USING (true);

-- Journeys: Owner traveler, assigned operator/coordinator, or journey members
CREATE POLICY "journeys_owner_select" ON public.journeys
  FOR SELECT TO authenticated
  USING (
    traveler_id = (select auth.uid())
    OR operator_id = (select auth.uid())
    OR coordinator_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.journey_members jm
      WHERE jm.journey_id = public.journeys.id AND jm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "journeys_owner_insert" ON public.journeys
  FOR INSERT TO authenticated
  WITH CHECK (traveler_id = (select auth.uid()));

CREATE POLICY "journeys_owner_update" ON public.journeys
  FOR UPDATE TO authenticated
  USING (
    traveler_id = (select auth.uid())
    OR operator_id = (select auth.uid())
    OR coordinator_id = (select auth.uid())
  )
  WITH CHECK (
    traveler_id = (select auth.uid())
    OR operator_id = (select auth.uid())
    OR coordinator_id = (select auth.uid())
  );

CREATE POLICY "journeys_owner_delete" ON public.journeys
  FOR DELETE TO authenticated
  USING (traveler_id = (select auth.uid()));

-- Itinerary Items: Read & update authorized by parent journey
CREATE POLICY "itinerary_items_select" ON public.itinerary_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.itinerary_items.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );

CREATE POLICY "itinerary_items_modify" ON public.itinerary_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.itinerary_items.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );

-- Itinerary Dependencies: Read & write authorized by parent journey
CREATE POLICY "itinerary_dependencies_access" ON public.itinerary_dependencies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.itinerary_dependencies.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
        )
    )
  );

-- Bookings: Traveler or assigned vendor
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    traveler_id = (select auth.uid())
    OR vendor_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.bookings.journey_id
        AND (j.operator_id = (select auth.uid()) OR j.coordinator_id = (select auth.uid()))
    )
  );

CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (traveler_id = (select auth.uid()));

-- Payments & Refunds: Traveler only
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT TO authenticated
  USING (traveler_id = (select auth.uid()));

CREATE POLICY "refunds_select_own" ON public.refunds
  FOR SELECT TO authenticated
  USING (traveler_id = (select auth.uid()));

-- Notifications: Target user only
CREATE POLICY "notifications_user_own" ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Disruptions & Proposals: Authorized on parent journey
CREATE POLICY "disruptions_access" ON public.disruptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.disruptions.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );

CREATE POLICY "alternative_proposals_access" ON public.alternative_proposals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.alternative_proposals.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );
