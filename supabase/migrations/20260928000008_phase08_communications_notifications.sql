-- ============================================================================
-- PHASE 08 — COMMUNICATIONS, NOTIFICATIONS & OPERATIONAL COLLABORATION
-- Migration: 20260928000008_phase08_communications_notifications.sql
-- ============================================================================

-- 1. ENUMS & DOMAIN TYPES
DO $$ BEGIN
    CREATE TYPE public.communication_channel_enum AS ENUM (
        'IN_APP',
        'EMAIL',
        'SMS',
        'WHATSAPP',
        'PUSH'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_priority_enum AS ENUM (
        'LOW',
        'NORMAL',
        'HIGH',
        'CRITICAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_lifecycle_state_enum AS ENUM (
        'CREATED',
        'QUEUED',
        'PROCESSING',
        'DELIVERED',
        'READ',
        'ACKNOWLEDGED',
        'RESOLVED',
        'FAILED',
        'RETRYING',
        'DEAD_LETTERED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.operational_action_state_enum AS ENUM (
        'OPEN',
        'ACKNOWLEDGED',
        'IN_PROGRESS',
        'RESOLVED',
        'ESCALATED',
        'DISMISSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_category_enum AS ENUM (
        'DISRUPTION',
        'BOOKING',
        'PAYMENT',
        'REFUND',
        'SAFETY',
        'SUPPLIER',
        'ITINERARY',
        'COLLABORATION',
        'SYSTEM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. COMMUNICATION EVENTS TABLE (Ingested from Domain Outbox)
CREATE TABLE IF NOT EXISTS public.communication_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    journey_id TEXT,
    booking_id TEXT,
    actor_id TEXT,
    source_domain TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    causation_id TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    operational_priority public.notification_priority_enum NOT NULL DEFAULT 'NORMAL',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT UNIQUE NOT NULL,
    required_action TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. NOTIFICATIONS TABLE (Durable Role-Aware Entity)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    recipient_id TEXT NOT NULL,
    recipient_role TEXT NOT NULL,
    event_id TEXT REFERENCES public.communication_events(id) ON DELETE SET NULL,
    journey_id TEXT,
    booking_id TEXT,
    category public.notification_category_enum NOT NULL DEFAULT 'SYSTEM',
    priority public.notification_priority_enum NOT NULL DEFAULT 'NORMAL',
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    context_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_required BOOLEAN NOT NULL DEFAULT false,
    action_type TEXT,
    action_url TEXT,
    lifecycle_state public.notification_lifecycle_state_enum NOT NULL DEFAULT 'CREATED',
    read_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    correlation_id TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_notif_read_timestamp CHECK (read_at IS NULL OR read_at >= created_at),
    CONSTRAINT chk_notif_ack_timestamp CHECK (acknowledged_at IS NULL OR acknowledged_at >= created_at)
);

-- 4. NOTIFICATION DELIVERIES TABLE (Channel Dispatches)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    channel public.communication_channel_enum NOT NULL,
    recipient_address TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'mock',
    provider_message_id TEXT,
    status public.notification_lifecycle_state_enum NOT NULL DEFAULT 'QUEUED',
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    delivered_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_notification_channel UNIQUE (notification_id, channel)
);

-- 5. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    user_id TEXT UNIQUE NOT NULL,
    category_preferences JSONB NOT NULL DEFAULT '{"DISRUPTION": true, "BOOKING": true, "PAYMENT": true, "SAFETY": true, "MARKETING": false}'::jsonb,
    channel_preferences JSONB NOT NULL DEFAULT '{"IN_APP": true, "EMAIL": true, "SMS": false, "WHATSAPP": false, "PUSH": true}'::jsonb,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TEXT DEFAULT '22:00',
    quiet_hours_end TEXT DEFAULT '07:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. NOTIFICATION ACKNOWLEDGEMENTS & COLLABORATION TABLE
CREATE TABLE IF NOT EXISTS public.notification_acknowledgements (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    action_state public.operational_action_state_enum NOT NULL DEFAULT 'ACKNOWLEDGED',
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    notes TEXT,
    domain_action_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. COMMUNICATION DEAD LETTERS TABLE (DLQ for Observability)
CREATE TABLE IF NOT EXISTS public.communication_dead_letters (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL REFERENCES public.notification_deliveries(id) ON DELETE CASCADE,
    event_id TEXT,
    failure_reason TEXT NOT NULL,
    retry_count INTEGER NOT NULL,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. COMMUNICATION AUDIT LOGS (Immutable History)
CREATE TABLE IF NOT EXISTS public.communication_audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    event_id TEXT,
    notification_id TEXT,
    action TEXT NOT NULL,
    actor_id TEXT,
    actor_role TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_state 
    ON public.notifications (recipient_id, lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created 
    ON public.notifications (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_journey_created 
    ON public.notifications (journey_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_event_id 
    ON public.notifications (event_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_notif_channel 
    ON public.notification_deliveries (notification_id, channel);

CREATE INDEX IF NOT EXISTS idx_deliveries_retry_queue 
    ON public.notification_deliveries (status, next_retry_at) 
    WHERE status = 'RETRYING';

CREATE INDEX IF NOT EXISTS idx_comm_events_correlation 
    ON public.communication_events (correlation_id);

CREATE INDEX IF NOT EXISTS idx_comm_events_idempotency 
    ON public.communication_events (idempotency_key);

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.communication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_dead_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_audit_logs ENABLE ROW LEVEL SECURITY;

-- Notifications RLS: Traveler can only read/update their own notifications
DROP POLICY IF EXISTS "notifications_traveler_read_own" ON public.notifications;
CREATE POLICY "notifications_traveler_read_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid()::text);

DROP POLICY IF EXISTS "notifications_traveler_update_own" ON public.notifications;
CREATE POLICY "notifications_traveler_update_own" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid()::text)
    WITH CHECK (recipient_id = auth.uid()::text);

-- Notifications RLS: Operators and Admins can view/manage tenant notifications
DROP POLICY IF EXISTS "notifications_operator_tenant_all" ON public.notifications;
CREATE POLICY "notifications_operator_tenant_all" ON public.notifications
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('operator', 'admin', 'coordinator')
            AND p.organization_id::text = public.notifications.tenant_id
        )
    );

-- Notifications RLS: Vendor can view notifications addressed to their vendor profile
DROP POLICY IF EXISTS "notifications_vendor_read_own" ON public.notifications;
CREATE POLICY "notifications_vendor_read_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        recipient_id = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'vendor'
        )
    );

-- Preferences RLS: User can read and update their own preferences
DROP POLICY IF EXISTS "preferences_read_own" ON public.notification_preferences;
CREATE POLICY "preferences_read_own" ON public.notification_preferences
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "preferences_update_own" ON public.notification_preferences;
CREATE POLICY "preferences_update_own" ON public.notification_preferences
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- Communication Events & Audit: Operators and Admins only
DROP POLICY IF EXISTS "comm_events_operator_tenant" ON public.communication_events;
CREATE POLICY "comm_events_operator_tenant" ON public.communication_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('operator', 'admin', 'coordinator')
            AND p.organization_id::text = public.communication_events.tenant_id
        )
    );

DROP POLICY IF EXISTS "comm_audit_operator_tenant" ON public.communication_audit_logs;
CREATE POLICY "comm_audit_operator_tenant" ON public.communication_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('operator', 'admin', 'coordinator')
            AND p.organization_id::text = public.communication_audit_logs.tenant_id
        )
    );
