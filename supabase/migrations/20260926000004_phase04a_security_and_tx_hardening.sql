-- ==============================================================================
-- TRIPLANNER — PHASE 04-A: ADVERSARIAL SECURITY, CONCURRENCY & AUDIT HARDENING
-- Migration: 20260926000004_phase04a_security_and_tx_hardening.sql
-- Purpose:
--   1. Extend availability_status ('STALE', 'EXPIRED') and booking_state
--      ('IN_PROGRESS', 'COMPLETED') CHECK constraints.
--   2. Add payload_fingerprint to public.idempotency_keys to prevent key
--      reuse with mismatched request payloads.
--   3. Enforce append-only immutability on public.audit_logs via trigger
--      blocking UPDATE and DELETE.
--   4. Harden RLS policies on change_impacts, alternative_options, and
--      change_plans with explicit WITH CHECK clauses and tenant isolation.
--   5. Harden public.apply_journey_change_atomic against SECURITY DEFINER
--      caller spoofing (auth.uid() = p_actor_id), locked/completed booking
--      mutation, negative costs, idempotency payload collisions, and
--      synchronize public.bookings atomically.
-- ==============================================================================

-- 1. EXTEND AVAILABILITY & BOOKING STATE CONSTRAINTS
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_availability_status_check;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_availability_status_check CHECK (
    availability_status IN ('AVAILABLE', 'LIMITED', 'UNAVAILABLE', 'UNKNOWN', 'STALE', 'EXPIRED')
  );

ALTER TABLE public.itinerary_items
  DROP CONSTRAINT IF EXISTS itinerary_items_booking_state_check;

ALTER TABLE public.itinerary_items
  ADD CONSTRAINT itinerary_items_booking_state_check CHECK (
    booking_state IN (
      'NONE',
      'PENDING',
      'CONFIRMED',
      'IN_PROGRESS',
      'COMPLETED',
      'NON_REFUNDABLE',
      'MODIFIABLE',
      'CANCELLED'
    )
  );

-- 2. EXTEND IDEMPOTENCY KEYS WITH PAYLOAD FINGERPRINT
ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS payload_fingerprint TEXT;

-- 3. APPEND-ONLY IMMUTABILITY TRIGGER ON AUDIT LOGS
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: Audit records in public.audit_logs are append-only and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 4. HARDEN RLS POLICIES WITH EXPLICIT WITH CHECK & ADMIN/TENANT ISOLATION
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
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.change_impacts.journey_id
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
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.alternative_options.journey_id
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
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = public.change_plans.journey_id
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

-- 5. HARDENED ATOMIC RPC: public.apply_journey_change_atomic
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
  v_existing_idem RECORD;
  v_journey RECORD;
  v_change_req RECORD;
  v_existing_item RECORD;
  v_new_version INT;
  v_new_allocated_cost NUMERIC(12, 2);
  v_item JSONB;
  v_payload_fingerprint TEXT;
  v_result JSONB;
BEGIN
  -- 0. Anti-spoofing check: When called by an authenticated session, auth.uid() MUST equal p_actor_id
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_actor_id THEN
    RAISE EXCEPTION 'ACTOR_IDENTITY_SPOOFING_DETECTED: Authenticated session user (%) does not match p_actor_id (%)',
      auth.uid(), p_actor_id;
  END IF;

  v_payload_fingerprint := p_journey_id::text || ':' || p_change_request_id::text || ':' || p_expected_version::text || ':' || p_cost_delta::text;

  -- 1. Idempotency check with payload collision verification
  SELECT * INTO v_existing_idem
  FROM public.idempotency_keys
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_idem.journey_id <> p_journey_id
       OR COALESCE(v_existing_idem.change_request_id, '00000000-0000-0000-0000-000000000000'::uuid) <> p_change_request_id
       OR (v_existing_idem.payload_fingerprint IS NOT NULL AND v_existing_idem.payload_fingerprint <> v_payload_fingerprint)
    THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH: Idempotency key % was already used for a different request or payload', p_idempotency_key;
    END IF;
    RETURN v_existing_idem.result_snapshot || jsonb_build_object('idempotent_replay', true);
  END IF;

  -- 2. Lock the parent journey row FOR UPDATE to prevent race conditions
  SELECT * INTO v_journey
  FROM public.journeys
  WHERE id = p_journey_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOURNEY_NOT_FOUND: Journey % does not exist', p_journey_id;
  END IF;

  -- 3. Strict RBAC & Ownership Authorization check
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

  -- 5. Lock & validate ChangeRequest state and expiration
  SELECT * INTO v_change_req
  FROM public.change_requests
  WHERE id = p_change_request_id AND journey_id = p_journey_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHANGE_REQUEST_NOT_FOUND: ChangeRequest % not found for journey %', p_change_request_id, p_journey_id;
  END IF;

  IF v_change_req.expires_at IS NOT NULL AND v_change_req.expires_at < timezone('utc'::text, now()) THEN
    RAISE EXCEPTION 'CHANGE_EXPIRED: ChangeRequest % expired at %', p_change_request_id, v_change_req.expires_at;
  END IF;

  IF v_change_req.state NOT IN ('APPROVED', 'ALTERNATIVES_READY', 'AWAITING_APPROVAL') THEN
    RAISE EXCEPTION 'INVALID_CHANGE_STATE_TRANSITION: Cannot apply ChangeRequest in state %', v_change_req.state;
  END IF;

  -- 6. Check negative cost & hard budget constraint before mutating
  v_new_allocated_cost := v_journey.allocated_cost + p_cost_delta;
  IF v_new_allocated_cost < 0 THEN
    RAISE EXCEPTION 'INVALID_NEGATIVE_COST: Allocated journey cost (%) cannot be negative', v_new_allocated_cost;
  END IF;

  IF v_journey.hard_budget_constraint AND v_new_allocated_cost > v_journey.total_budget AND v_journey.total_budget > 0 THEN
    RAISE EXCEPTION 'HARD_BUDGET_EXCEEDED: New allocated cost % exceeds total budget %', v_new_allocated_cost, v_journey.total_budget;
  END IF;

  -- 7. Apply itinerary item mutations atomically with lock & booking state guards
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_item_updates)
  LOOP
    SELECT * INTO v_existing_item
    FROM public.itinerary_items
    WHERE id = (v_item->>'id')::uuid AND journey_id = p_journey_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ITINERARY_ITEM_NOT_FOUND: Item % does not belong to journey %', v_item->>'id', p_journey_id;
    END IF;

    IF v_existing_item.booking_state = 'COMPLETED' THEN
      RAISE EXCEPTION 'COMPLETED_BOOKING_IMMUTABLE: Cannot mutate completed itinerary item %', v_existing_item.id;
    END IF;

    IF v_existing_item.is_locked OR v_existing_item.booking_state = 'NON_REFUNDABLE' THEN
      RAISE EXCEPTION 'LOCKED_BOOKING_MUTATION: Cannot mutate locked or non-refundable itinerary item %', v_existing_item.id;
    END IF;

    IF v_item ? 'cost' AND (v_item->>'cost')::numeric < 0 THEN
      RAISE EXCEPTION 'INVALID_NEGATIVE_COST: Item cost cannot be negative';
    END IF;

    UPDATE public.itinerary_items
    SET
      title = COALESCE(v_item->>'title', title),
      location = COALESCE(v_item->>'location', location),
      start_time = COALESCE((v_item->>'start_time')::timestamptz, start_time),
      end_time = COALESCE((v_item->>'end_time')::timestamptz, end_time),
      cost = COALESCE((v_item->>'cost')::numeric, cost),
      status = COALESCE((v_item->>'status')::itinerary_item_status, status),
      updated_at = timezone('utc'::text, now())
    WHERE id = v_existing_item.id
      AND journey_id = p_journey_id;

    -- Synchronize associated bookings row if present
    IF v_item ? 'cost' THEN
      UPDATE public.bookings
      SET
        total_amount = (v_item->>'cost')::numeric,
        status = 'confirmed',
        updated_at = timezone('utc'::text, now())
      WHERE itinerary_item_id = v_existing_item.id
        AND journey_id = p_journey_id;
    END IF;
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

  -- 13. Build & store idempotency result with payload fingerprint
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
    payload_fingerprint,
    result_snapshot
  ) VALUES (
    p_idempotency_key,
    p_journey_id,
    p_change_request_id,
    'APPLY_JOURNEY_CHANGE',
    v_payload_fingerprint,
    v_result
  );

  RETURN v_result;
END;
$$;
