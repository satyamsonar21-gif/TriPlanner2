-- ==============================================================================
-- TRIPLANNER — PHASE 04: LIVING JOURNEY ENGINE™ (ATOMIC STATE, VERSIONING & OUTBOX)
-- Migration: 20260926000003_phase04_living_journey_engine.sql
-- Purpose:
--   1. Add optimistic concurrency control (`version`) and budget constraint rules
--      to `public.journeys` and capacity/availability fields to `public.activities`
--      and `public.itinerary_items`.
--   2. Establish normalized tables for the Living Journey Engine lifecycle:
--      - `public.change_requests` (12-state deterministic state machine)
--      - `public.change_impacts` (10 impact dimensions + 6 severity levels)
--      - `public.alternative_options` (explainable multi-factor scoring breakdown)
--      - `public.change_plans` (validated atomic execution plans & ChangeSets)
--      - `public.domain_outbox_events` (transactional outbox for Phase 06)
--      - `public.idempotency_keys` (duplicate event & apply protection)
--   3. Create atomic PostgreSQL transaction function `public.apply_journey_change_atomic`
--      enforcing optimistic concurrency, RBAC, rollback safety, audit logging,
--      and outbox emission.
-- ==============================================================================

-- 1. EXTEND JOURNEYS WITH OPTIMISTIC CONCURRENCY VERSION & BUDGET CONSTRAINTS
ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  ADD COLUMN IF NOT EXISTS allocated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (allocated_cost >= 0),
  ADD COLUMN IF NOT EXISTS hard_budget_constraint BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS soft_budget_tolerance_pct INT NOT NULL DEFAULT 5 CHECK (
    soft_budget_tolerance_pct >= 0 AND soft_budget_tolerance_pct <= 100
  );

-- 2. EXTEND ACTIVITIES & ITINERARY ITEMS WITH AVAILABILITY, CAPACITY & OPENING WINDOWS
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    availability_status IN ('AVAILABLE', 'LIMITED', 'UNAVAILABLE', 'UNKNOWN')
  ),
  ADD COLUMN IF NOT EXISTS max_capacity INT NOT NULL DEFAULT 12 CHECK (max_capacity >= 1),
  ADD COLUMN IF NOT EXISTS remaining_capacity INT NOT NULL DEFAULT 8 CHECK (remaining_capacity >= 0),
  ADD COLUMN IF NOT EXISTS opening_time_local TEXT DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS closing_time_local TEXT DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.itinerary_items
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_state TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (
    booking_state IN ('NONE', 'PENDING', 'CONFIRMED', 'NON_REFUNDABLE', 'MODIFIABLE', 'CANCELLED')
  ),
  ADD COLUMN IF NOT EXISTS party_size INT NOT NULL DEFAULT 2 CHECK (party_size >= 1),
  ADD COLUMN IF NOT EXISTS category_tags TEXT[] NOT NULL DEFAULT '{}';

-- 3. CHANGE REQUESTS (12-STATE DETERMINISTIC WORKFLOW)
CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  expected_journey_version INT NOT NULL CHECK (expected_journey_version >= 1),
  applied_journey_version INT CHECK (applied_journey_version IS NULL OR applied_journey_version >= 1),
  idempotency_key TEXT UNIQUE NOT NULL,
  trigger_type TEXT NOT NULL CHECK (
    trigger_type IN (
      'ITEM_CANCELLED',
      'ITEM_DELAYED',
      'TIME_SHIFTED',
      'LOCATION_CHANGED',
      'DURATION_CHANGED',
      'TRAVEL_MODE_CHANGED',
      'BOOKING_UNAVAILABLE',
      'BUDGET_CHANGED',
      'PARTY_SIZE_CHANGED',
      'PREFERENCE_UPDATED',
      'ITEM_SWAPPED',
      'MANUAL_EDIT',
      'OPERATOR_OVERRIDE'
    )
  ),
  trigger_source_role TEXT NOT NULL CHECK (
    trigger_source_role IN ('traveler', 'operator', 'coordinator', 'vendor', 'admin', 'system')
  ),
  affected_item_id UUID REFERENCES public.itinerary_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (
    severity IN ('NONE', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
  ),
  state TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    state IN (
      'DRAFT',
      'ANALYZING',
      'ALTERNATIVES_READY',
      'AWAITING_APPROVAL',
      'APPROVED',
      'APPLYING',
      'APPLIED',
      'REJECTED',
      'EXPIRED',
      'FAILED',
      'CANCELLED',
      'SUPERSEDED'
    )
  ),
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  selected_alternative_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_reason TEXT,
  superseded_by_change_id UUID REFERENCES public.change_requests(id) ON DELETE SET NULL,
  impact_summary JSONB NOT NULL DEFAULT '{}',
  simulation_diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CHANGE IMPACTS (10 IMPACT DIMENSIONS)
CREATE TABLE IF NOT EXISTS public.change_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  affected_item_id UUID REFERENCES public.itinerary_items(id) ON DELETE SET NULL,
  dimension TEXT NOT NULL CHECK (
    dimension IN (
      'DIRECT',
      'DOWNSTREAM',
      'TEMPORAL',
      'SPATIAL',
      'BOOKING',
      'BUDGET',
      'CAPACITY',
      'TRAVELER',
      'OPERATIONAL',
      'NOTIFICATION'
    )
  ),
  severity TEXT NOT NULL CHECK (
    severity IN ('NONE', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
  ),
  conflict_code TEXT NOT NULL,
  explanation TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ALTERNATIVE OPTIONS (EXPLAINABLE MULTI-FACTOR SCORING)
CREATE TABLE IF NOT EXISTS public.alternative_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  candidate_activity_id TEXT NOT NULL,
  rank_order INT NOT NULL CHECK (rank_order >= 1),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  location_name TEXT NOT NULL,
  total_score INT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  preference_score INT NOT NULL CHECK (preference_score BETWEEN 0 AND 30),
  time_fit_score INT NOT NULL CHECK (time_fit_score BETWEEN 0 AND 20),
  location_proximity_score INT NOT NULL CHECK (location_proximity_score BETWEEN 0 AND 15),
  budget_fit_score INT NOT NULL CHECK (budget_fit_score BETWEEN 0 AND 15),
  dependency_compatibility_score INT NOT NULL CHECK (dependency_compatibility_score BETWEEN 0 AND 10),
  availability_confidence_score INT NOT NULL CHECK (availability_confidence_score BETWEEN 0 AND 10),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  price_delta NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  proposed_start_time TIMESTAMPTZ NOT NULL,
  proposed_end_time TIMESTAMPTZ NOT NULL,
  time_shift_minutes INT NOT NULL DEFAULT 0,
  distance_to_next_meters INT NOT NULL DEFAULT 0,
  travel_time_to_next_minutes INT NOT NULL DEFAULT 0,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  explanation_reasons JSONB NOT NULL DEFAULT '[]',
  proposed_changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. CHANGE PLANS (ATOMIC EXECUTION PLAN & PROPAGATED CHANGESET)
CREATE TABLE IF NOT EXISTS public.change_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID UNIQUE NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  expected_journey_version INT NOT NULL CHECK (expected_journey_version >= 1),
  selected_alternative_id UUID REFERENCES public.alternative_options(id) ON DELETE SET NULL,
  operations JSONB NOT NULL DEFAULT '[]',
  propagated_change_set JSONB NOT NULL DEFAULT '{}',
  financial_delta NUMERIC(12, 2) NOT NULL DEFAULT 0,
  budget_before NUMERIC(12, 2) NOT NULL DEFAULT 0,
  budget_after NUMERIC(12, 2) NOT NULL DEFAULT 0,
  validation_passed BOOLEAN NOT NULL DEFAULT FALSE,
  validation_errors JSONB NOT NULL DEFAULT '[]',
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TRANSACTIONAL OUTBOX EVENTS (PHASE 06 BOUNDARY)
CREATE TABLE IF NOT EXISTS public.domain_outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  change_request_id UUID REFERENCES public.change_requests(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'CHANGE_DETECTED',
      'IMPACT_ANALYZED',
      'ALTERNATIVES_GENERATED',
      'CHANGE_SIMULATED',
      'CHANGE_AWAITING_APPROVAL',
      'CHANGE_APPROVED',
      'CHANGE_APPLIED',
      'CHANGE_REJECTED',
      'CHANGE_FAILED',
      'BOOKING_REALLOCATED',
      'BUDGET_UPDATED'
    )
  ),
  recipient_roles TEXT[] NOT NULL DEFAULT '{traveler,operator}',
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PUBLISHED', 'PROCESSED', 'FAILED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMPTZ
);

-- 8. IDEMPOTENCY KEYS REGISTRY
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  change_request_id UUID REFERENCES public.change_requests(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  result_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. INDEXES FOR PHASE 04 TABLES
CREATE INDEX IF NOT EXISTS idx_change_requests_journey_state
  ON public.change_requests (journey_id, state);
CREATE INDEX IF NOT EXISTS idx_change_requests_affected_item
  ON public.change_requests (affected_item_id);
CREATE INDEX IF NOT EXISTS idx_change_impacts_request
  ON public.change_impacts (change_request_id);
CREATE INDEX IF NOT EXISTS idx_alternative_options_request_rank
  ON public.alternative_options (change_request_id, rank_order);
CREATE INDEX IF NOT EXISTS idx_change_plans_journey
  ON public.change_plans (journey_id);
CREATE INDEX IF NOT EXISTS idx_domain_outbox_pending
  ON public.domain_outbox_events (journey_id, status)
  WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_journey
  ON public.idempotency_keys (journey_id);

-- 10. ROW-LEVEL SECURITY (RLS) POLICIES FOR PHASE 04 TABLES
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alternative_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Change Requests: Accessible by journey owner, assigned operator/coordinator, or admin
DROP POLICY IF EXISTS "change_requests_journey_access" ON public.change_requests;
CREATE POLICY "change_requests_journey_access"
  ON public.change_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.change_requests.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.change_requests.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

-- Change Impacts: Accessible by journey stakeholders
DROP POLICY IF EXISTS "change_impacts_journey_access" ON public.change_impacts;
CREATE POLICY "change_impacts_journey_access"
  ON public.change_impacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.change_impacts.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );

-- Alternative Options: Accessible by journey stakeholders
DROP POLICY IF EXISTS "alternative_options_journey_access" ON public.alternative_options;
CREATE POLICY "alternative_options_journey_access"
  ON public.alternative_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.alternative_options.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );

-- Change Plans: Accessible by journey stakeholders
DROP POLICY IF EXISTS "change_plans_journey_access" ON public.change_plans;
CREATE POLICY "change_plans_journey_access"
  ON public.change_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.change_plans.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );

-- Domain Outbox Events: Read by journey stakeholders
DROP POLICY IF EXISTS "domain_outbox_events_journey_read" ON public.domain_outbox_events;
CREATE POLICY "domain_outbox_events_journey_read"
  ON public.domain_outbox_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.domain_outbox_events.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );

-- Idempotency Keys: Read by journey stakeholders
DROP POLICY IF EXISTS "idempotency_keys_journey_read" ON public.idempotency_keys;
CREATE POLICY "idempotency_keys_journey_read"
  ON public.idempotency_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.idempotency_keys.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.operator_id = (select auth.uid())
          OR j.coordinator_id = (select auth.uid())
        )
    )
  );

-- ==============================================================================
-- 11. ATOMIC POSTGRESQL TRANSACTION FUNCTION: apply_journey_change_atomic
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.apply_journey_change_atomic(
  p_change_request_id UUID,
  p_journey_id UUID,
  p_expected_version INT,
  p_actor_id UUID,
  p_idempotency_key TEXT,
  p_cost_delta NUMERIC(12, 2),
  p_item_updates JSONB DEFAULT '[]'::jsonb,
  p_audit_summary JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_result JSONB;
  v_journey RECORD;
  v_change_req RECORD;
  v_new_version INT;
  v_new_allocated_cost NUMERIC(12, 2);
  v_item JSONB;
  v_result JSONB;
BEGIN
  -- 1. Idempotency check: Return existing snapshot if this key was already applied
  SELECT result_snapshot INTO v_existing_result
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_result IS NOT NULL THEN
    RETURN v_existing_result || jsonb_build_object('idempotent_replay', true);
  END IF;

  -- 2. Lock the parent journey row FOR UPDATE to prevent race conditions
  SELECT * INTO v_journey
  FROM public.journeys
  WHERE id = p_journey_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOURNEY_NOT_FOUND: Journey % does not exist', p_journey_id;
  END IF;

  -- 3. Authorization check (traveler owner, assigned operator/coordinator, or admin)
  IF v_journey.traveler_id <> p_actor_id
     AND COALESCE(v_journey.operator_id, '00000000-0000-0000-0000-000000000000'::uuid) <> p_actor_id
     AND COALESCE(v_journey.coordinator_id, '00000000-0000-0000-0000-000000000000'::uuid) <> p_actor_id
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles pr WHERE pr.id = p_actor_id AND pr.role = 'admin'
     )
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED_JOURNEY_MUTATION: Actor % is not authorized to mutate journey %', p_actor_id, p_journey_id;
  END IF;

  -- 4. Optimistic Concurrency Check
  IF v_journey.version <> p_expected_version THEN
    RAISE EXCEPTION 'JOURNEY_VERSION_CONFLICT: Expected version %, but current journey version is %. CHANGE_REQUIRES_RECALCULATION.',
      p_expected_version, v_journey.version;
  END IF;

  -- 5. Lock & validate ChangeRequest state
  SELECT * INTO v_change_req
  FROM public.change_requests
  WHERE id = p_change_request_id AND journey_id = p_journey_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHANGE_REQUEST_NOT_FOUND: ChangeRequest % not found for journey %', p_change_request_id, p_journey_id;
  END IF;

  IF v_change_req.state NOT IN ('APPROVED', 'ALTERNATIVES_READY', 'AWAITING_APPROVAL') THEN
    RAISE EXCEPTION 'INVALID_CHANGE_STATE_TRANSITION: Cannot apply ChangeRequest in state %', v_change_req.state;
  END IF;

  -- 6. Check hard budget constraint before mutating
  v_new_allocated_cost := GREATEST(0, v_journey.allocated_cost + p_cost_delta);
  IF v_journey.hard_budget_constraint AND v_new_allocated_cost > v_journey.total_budget AND v_journey.total_budget > 0 THEN
    RAISE EXCEPTION 'HARD_BUDGET_EXCEEDED: New allocated cost % exceeds total budget %', v_new_allocated_cost, v_journey.total_budget;
  END IF;

  -- 7. Apply itinerary item mutations atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_item_updates)
  LOOP
    UPDATE public.itinerary_items
    SET
      title = COALESCE(v_item->>'title', title),
      location = COALESCE(v_item->>'location', location),
      start_time = COALESCE((v_item->>'start_time')::timestamptz, start_time),
      end_time = COALESCE((v_item->>'end_time')::timestamptz, end_time),
      cost = COALESCE((v_item->>'cost')::numeric, cost),
      status = COALESCE((v_item->>'status')::itinerary_item_status, status),
      updated_at = timezone('utc'::text, now())
    WHERE id = (v_item->>'id')::uuid
      AND journey_id = p_journey_id;
  END LOOP;

  -- 8. Increment journey version and update allocated cost & status
  v_new_version := v_journey.version + 1;

  UPDATE public.journeys
  SET
    version = v_new_version,
    allocated_cost = v_new_allocated_cost,
    status = 'booked',
    updated_at = timezone('utc'::text, now())
  WHERE id = p_journey_id;

  -- 9. Transition ChangeRequest to APPLIED
  UPDATE public.change_requests
  SET
    state = 'APPLIED',
    applied_journey_version = v_new_version,
    approved_by = COALESCE(approved_by, p_actor_id),
    approved_at = COALESCE(approved_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_change_request_id;

  -- 10. Mark any sibling pending ChangeRequests on the older version as SUPERSEDED
  UPDATE public.change_requests
  SET
    state = 'SUPERSEDED',
    superseded_by_change_id = p_change_request_id,
    updated_at = timezone('utc'::text, now())
  WHERE journey_id = p_journey_id
    AND id <> p_change_request_id
    AND state IN ('DRAFT', 'ANALYZING', 'ALTERNATIVES_READY', 'AWAITING_APPROVAL');

  -- 11. Emit Immutable Audit Log
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    actor_id,
    action,
    before_state,
    after_state
  ) VALUES (
    'journey',
    p_journey_id,
    p_actor_id,
    'LIVING_JOURNEY_CHANGE_APPLIED',
    jsonb_build_object(
      'version', v_journey.version,
      'allocated_cost', v_journey.allocated_cost
    ),
    jsonb_build_object(
      'version', v_new_version,
      'allocated_cost', v_new_allocated_cost,
      'change_request_id', p_change_request_id,
      'summary', p_audit_summary
    )
  );

  -- 12. Emit Transactional Outbox Event
  INSERT INTO public.domain_outbox_events (
    idempotency_key,
    journey_id,
    change_request_id,
    event_type,
    payload
  ) VALUES (
    'outbox_' || p_idempotency_key,
    p_journey_id,
    p_change_request_id,
    'CHANGE_APPLIED',
    jsonb_build_object(
      'journey_id', p_journey_id,
      'change_request_id', p_change_request_id,
      'previous_version', v_journey.version,
      'new_version', v_new_version,
      'allocated_cost', v_new_allocated_cost,
      'cost_delta', p_cost_delta
    )
  );

  -- 13. Build & store idempotency result
  v_result := jsonb_build_object(
    'success', true,
    'journey_id', p_journey_id,
    'change_request_id', p_change_request_id,
    'previous_version', v_journey.version,
    'new_version', v_new_version,
    'allocated_cost', v_new_allocated_cost,
    'idempotent_replay', false
  );

  INSERT INTO public.idempotency_keys (
    idempotency_key,
    journey_id,
    change_request_id,
    operation_type,
    result_snapshot
  ) VALUES (
    p_idempotency_key,
    p_journey_id,
    p_change_request_id,
    'APPLY_JOURNEY_CHANGE',
    v_result
  );

  RETURN v_result;
END;
$$;
