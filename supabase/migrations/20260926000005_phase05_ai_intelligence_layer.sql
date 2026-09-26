-- ============================================================================
-- PHASE 05 — AI INTELLIGENCE LAYER: AUDIT TELEMETRY & VERSIONED PROPOSALS
-- ============================================================================
-- Security & Architectural Guarantees:
-- 1. AI never mutates `journeys`, `itinerary_items`, or `bookings` directly.
-- 2. `public.ai_audit_logs` is append-only (protected by `public.prevent_audit_log_mutation()`)
--    and stores sanitized observability metadata (zero raw secrets or unnecessary PII).
-- 3. `public.ai_change_proposals` stores concurrency-aware proposals tied to
--    `expected_journey_version` and `change_request_id`, requiring human approval
--    before `public.apply_journey_change_atomic` is called.
-- 4. Strict Row-Level Security (`TO authenticated`, `(select auth.uid())`) and tenant isolation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  correlation_id TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role public.user_role NOT NULL,
  organization_id UUID REFERENCES public.operator_organizations(id) ON DELETE SET NULL,
  journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
  journey_version INTEGER,
  change_request_id UUID REFERENCES public.change_requests(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (
    operation_type IN (
      'traveler_assistant',
      'operator_copilot',
      'trip_planning',
      'change_explanation',
      'mutation_assistance'
    )
  ),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  intent TEXT NOT NULL,
  response_type TEXT NOT NULL,
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  estimated_input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (estimated_input_tokens >= 0),
  estimated_output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (estimated_output_tokens >= 0),
  tool_calls_count INTEGER NOT NULL DEFAULT 0 CHECK (tool_calls_count >= 0 AND tool_calls_count <= 5),
  tool_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  schema_validation_passed BOOLEAN NOT NULL DEFAULT true,
  deterministic_validation_passed BOOLEAN NOT NULL DEFAULT true,
  abstained BOOLEAN NOT NULL DEFAULT false,
  injection_detected BOOLEAN NOT NULL DEFAULT false,
  pii_redacted_count INTEGER NOT NULL DEFAULT 0 CHECK (pii_redacted_count >= 0),
  error_category TEXT NOT NULL DEFAULT 'NONE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_actor_id
  ON public.ai_audit_logs(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_journey_id
  ON public.ai_audit_logs(journey_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_organization_id
  ON public.ai_audit_logs(organization_id, created_at DESC);

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Enforce append-only immutability on ai_audit_logs (reusing Phase 04-A trigger function)
DROP TRIGGER IF EXISTS trg_ai_audit_logs_immutable ON public.ai_audit_logs;
CREATE TRIGGER trg_ai_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.ai_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP POLICY IF EXISTS "ai_audit_logs_select_authorized" ON public.ai_audit_logs;
CREATE POLICY "ai_audit_logs_select_authorized"
  ON public.ai_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    actor_id = (select auth.uid())
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = (select auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "ai_audit_logs_insert_own" ON public.ai_audit_logs;
CREATE POLICY "ai_audit_logs_insert_own"
  ON public.ai_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = (select auth.uid())
  );

-- ============================================================================
-- 2. AI CONCURRENCY-BOUND CHANGE PROPOSALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_change_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_code TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL REFERENCES public.ai_audit_logs(request_id) ON DELETE CASCADE,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  expected_journey_version INTEGER NOT NULL CHECK (expected_journey_version >= 1),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommended_alternative_id TEXT NOT NULL,
  recommended_alternative_title TEXT NOT NULL,
  recommended_score INTEGER NOT NULL CHECK (recommended_score >= 0 AND recommended_score <= 100),
  price_delta NUMERIC(12, 2) NOT NULL,
  budget_before NUMERIC(12, 2) NOT NULL CHECK (budget_before >= 0),
  budget_after NUMERIC(12, 2) NOT NULL CHECK (budget_after >= 0),
  preserved_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_human_approval BOOLEAN NOT NULL DEFAULT true,
  approval_state TEXT NOT NULL DEFAULT 'AWAITING_HUMAN_APPROVAL' CHECK (
    approval_state IN (
      'AWAITING_HUMAN_APPROVAL',
      'APPROVED',
      'APPLIED',
      'REJECTED',
      'STALE'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_change_proposals_journey_id
  ON public.ai_change_proposals(journey_id, expected_journey_version);

ALTER TABLE public.ai_change_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_change_proposals_select_authorized" ON public.ai_change_proposals;
CREATE POLICY "ai_change_proposals_select_authorized"
  ON public.ai_change_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = ai_change_proposals.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.assigned_operator_id = (select auth.uid())
          OR j.assigned_coordinator_id = (select auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "ai_change_proposals_insert_authorized" ON public.ai_change_proposals;
CREATE POLICY "ai_change_proposals_insert_authorized"
  ON public.ai_change_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = ai_change_proposals.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.assigned_operator_id = (select auth.uid())
          OR j.assigned_coordinator_id = (select auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "ai_change_proposals_update_authorized" ON public.ai_change_proposals;
CREATE POLICY "ai_change_proposals_update_authorized"
  ON public.ai_change_proposals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = ai_change_proposals.journey_id
        AND (
          j.traveler_id = (select auth.uid())
          OR j.assigned_operator_id = (select auth.uid())
          OR j.assigned_coordinator_id = (select auth.uid())
        )
    )
  )
  WITH CHECK (
    created_by = ai_change_proposals.created_by
  );

GRANT SELECT, INSERT ON public.ai_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_change_proposals TO authenticated;
