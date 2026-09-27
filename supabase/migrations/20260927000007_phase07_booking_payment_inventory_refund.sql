-- ============================================================================
-- PHASE 07 — BOOKING, PAYMENT, SUPPLIER INVENTORY & REFUND OPERATIONS
-- Migration: 20260927000007_phase07_booking_payment_inventory_refund.sql
-- ============================================================================

-- 1. ENUMS & DOMAIN TYPES
DO $$ BEGIN
    CREATE TYPE public.booking_state_enum AS ENUM (
        'DRAFT',
        'PENDING_INVENTORY',
        'INVENTORY_RESERVED',
        'PAYMENT_PENDING',
        'PAYMENT_PROCESSING',
        'PAYMENT_VERIFIED',
        'CONFIRMATION_PENDING',
        'CONFIRMED',
        'PAYMENT_FAILED',
        'INVENTORY_UNAVAILABLE',
        'SUPPLIER_REJECTED',
        'BOOKING_FAILED',
        'CANCEL_REQUESTED',
        'CANCELLED',
        'REFUND_PENDING',
        'PARTIALLY_REFUNDED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_state_enum AS ENUM (
        'CREATED',
        'PENDING',
        'PROCESSING',
        'SUCCEEDED',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'PARTIALLY_REFUNDED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.refund_state_enum AS ENUM (
        'NOT_ELIGIBLE',
        'ELIGIBLE',
        'REQUESTED',
        'PROCESSING',
        'PARTIALLY_REFUNDED',
        'REFUNDED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inventory_type_enum AS ENUM (
        'HOTEL',
        'TRANSPORT',
        'ACTIVITY',
        'TRANSFER',
        'GUIDE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inventory_status_enum AS ENUM (
        'AVAILABLE',
        'LIMITED',
        'RESERVED',
        'SOLD_OUT',
        'UNAVAILABLE',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CANCELLATION POLICIES
CREATE TABLE IF NOT EXISTS public.cancellation_policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    free_cancellation_hours INTEGER NOT NULL DEFAULT 48,
    late_cancellation_penalty_pct NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    non_refundable_buffer_hours INTEGER NOT NULL DEFAULT 12,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. SUPPLIER REGISTRY & INVENTORY
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    service_type public.inventory_type_enum NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    integration_type TEXT NOT NULL DEFAULT 'MOCK',
    operational_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    cancellation_policy_id TEXT REFERENCES public.cancellation_policies(id),
    capabilities JSONB NOT NULL DEFAULT '{"supportsReservation": true, "supportsCancellation": true, "supportsRefund": true, "supportsLiveAvailability": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.supplier_inventories (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    item_type public.inventory_type_enum NOT NULL,
    title TEXT NOT NULL,
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    total_capacity INTEGER NOT NULL CHECK (total_capacity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    confirmed_quantity INTEGER NOT NULL DEFAULT 0 CHECK (confirmed_quantity >= 0),
    unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status public.inventory_status_enum NOT NULL DEFAULT 'AVAILABLE',
    version INTEGER NOT NULL DEFAULT 1,
    operating_window_start TIMESTAMPTZ,
    operating_window_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_inventory_bounds CHECK (reserved_quantity + confirmed_quantity <= total_capacity)
);

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL REFERENCES public.supplier_inventories(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'RELEASED', 'EXPIRED')),
    idempotency_key TEXT UNIQUE NOT NULL,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1
);

-- 4. BOOKINGS (V2 DOMAIN AGGREGATE)
CREATE TABLE IF NOT EXISTS public.journey_bookings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    journey_id TEXT NOT NULL,
    journey_version INTEGER NOT NULL DEFAULT 1,
    traveler_id TEXT NOT NULL,
    booking_reference TEXT UNIQUE NOT NULL,
    supplier_reference TEXT,
    state public.booking_state_enum NOT NULL DEFAULT 'DRAFT',
    total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    idempotency_key TEXT UNIQUE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    disruption_detected BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.booking_price_snapshots (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES public.journey_bookings(id) ON DELETE CASCADE,
    base_amount_minor BIGINT NOT NULL CHECK (base_amount_minor >= 0),
    tax_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount_minor >= 0),
    fees_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (fees_amount_minor >= 0),
    discount_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_minor >= 0),
    total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    pricing_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    pricing_version INTEGER NOT NULL DEFAULT 1,
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT chk_price_equality CHECK (total_amount_minor = (base_amount_minor + tax_amount_minor + fees_amount_minor - discount_amount_minor))
);

CREATE TABLE IF NOT EXISTS public.booking_items (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES public.journey_bookings(id) ON DELETE CASCADE,
    itinerary_item_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL REFERENCES public.suppliers(id),
    inventory_id TEXT NOT NULL REFERENCES public.supplier_inventories(id),
    title TEXT NOT NULL,
    service_type public.inventory_type_enum NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
    total_price_minor BIGINT NOT NULL CHECK (total_price_minor >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS public.booking_status_history (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES public.journey_bookings(id) ON DELETE CASCADE,
    from_state public.booking_state_enum NOT NULL,
    to_state public.booking_state_enum NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    reason TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. PAYMENT SYSTEM
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES public.journey_bookings(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    traveler_id TEXT NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    state public.payment_state_enum NOT NULL DEFAULT 'CREATED',
    provider TEXT NOT NULL DEFAULT 'MOCK',
    provider_intent_id TEXT,
    client_secret_hash TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payment_records (
    id TEXT PRIMARY KEY,
    payment_intent_id TEXT NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL REFERENCES public.journey_bookings(id) ON DELETE CASCADE,
    traveler_id TEXT NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_method TEXT NOT NULL DEFAULT 'UPI',
    gateway_reference TEXT,
    status public.payment_state_enum NOT NULL DEFAULT 'SUCCEEDED',
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_webhook_provider_event UNIQUE (provider, provider_event_id)
);

-- 6. REFUNDS
CREATE TABLE IF NOT EXISTS public.booking_refunds (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES public.journey_bookings(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL REFERENCES public.payment_records(id) ON DELETE CASCADE,
    traveler_id TEXT NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    fee_deducted_minor BIGINT NOT NULL DEFAULT 0 CHECK (fee_deducted_minor >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    state public.refund_state_enum NOT NULL DEFAULT 'REQUESTED',
    reason TEXT NOT NULL,
    policy_reference TEXT,
    gateway_refund_id TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    version INTEGER NOT NULL DEFAULT 1
);

-- 7. IDEMPOTENCY REGISTRY
CREATE TABLE IF NOT EXISTS public.booking_idempotency_records (
    idempotency_key TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL DEFAULT 'org_goa_ops_01',
    request_fingerprint TEXT NOT NULL,
    response_payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 8. INDEXES FOR PERFORMANCE & INTEGRITY
CREATE INDEX IF NOT EXISTS idx_journey_bookings_traveler ON public.journey_bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_journey_bookings_journey ON public.journey_bookings(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_bookings_state ON public.journey_bookings(state);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_booking ON public.inventory_reservations(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_booking ON public.payment_intents(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_refunds_booking ON public.booking_refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_supplier_inventories_supplier ON public.supplier_inventories(supplier_id);

-- 9. ROW-LEVEL SECURITY POLICIES
ALTER TABLE public.journey_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Traveler Policy: View own bookings and payments only
CREATE POLICY traveler_view_own_bookings ON public.journey_bookings
    FOR SELECT TO authenticated
    USING (traveler_id = auth.uid()::text);

CREATE POLICY traveler_view_own_payments ON public.payment_intents
    FOR SELECT TO authenticated
    USING (traveler_id = auth.uid()::text);

CREATE POLICY traveler_view_own_refunds ON public.booking_refunds
    FOR SELECT TO authenticated
    USING (traveler_id = auth.uid()::text);

-- Operator Policy: Manage bookings within tenant
CREATE POLICY operator_manage_tenant_bookings ON public.journey_bookings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('operator', 'coordinator', 'admin')
        )
    );

CREATE POLICY operator_view_tenant_payments ON public.payment_intents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('operator', 'coordinator', 'admin')
        )
    );
