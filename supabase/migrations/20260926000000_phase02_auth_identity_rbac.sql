-- ==============================================================================
-- TRIPLANNER — PHASE 02: AUTHENTICATION, IDENTITY, RBAC & RLS FOUNDATION
-- Migration: 20260926000000_phase02_auth_identity_rbac.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('traveler', 'operator', 'coordinator', 'vendor', 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('active', 'pending_verification', 'suspended', 'deactivated');
  END IF;
END $$;

-- 3. PROFILES TABLE (Application Profile separated from Auth Identity)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'traveler',
  status account_status NOT NULL DEFAULT 'active',
  organization_id UUID,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_full_name CHECK (char_length(trim(full_name)) >= 1),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 4. TRAVELER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.traveler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  travel_style TEXT[] NOT NULL DEFAULT '{}',
  dietary_requirements TEXT[] NOT NULL DEFAULT '{}',
  accessibility_needs TEXT[] NOT NULL DEFAULT '{}',
  passport_nationality TEXT,
  emergency_contact JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. INDEXES FOR PERFORMANCE & LOOKUPS (Supabase Postgres best practices)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_traveler_profiles_user_id ON public.traveler_profiles(user_id);

-- 6. SECURITY: PREVENT UNAUTHORIZED PRIVILEGE ELEVATION TRIGGER
-- Ensures an ordinary client cannot update their own 'role' or 'status'
CREATE OR REPLACE FUNCTION public.check_profile_permission_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- If role is changing
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Check if current authenticated user has 'admin' role in profiles
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: You cannot modify your own role or assign privileged roles directly.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- If status is changing
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: Only system administrators can alter account status.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_profile_permission_changes ON public.profiles;
CREATE TRIGGER tr_check_profile_permission_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_permission_changes();

-- 7. AUTOMATED PROFILE CREATION ON USER SIGNUP (TRIGGER ON auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );

  -- Always assign 'traveler' by default for security, never trust client-provided role metadata
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    full_name,
    display_name,
    avatar_url,
    role,
    status,
    onboarding_completed
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    v_full_name,
    v_full_name,
    v_avatar_url,
    'traveler',
    'active',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  -- Initialize traveler profile record
  INSERT INTO public.traveler_profiles (
    user_id,
    preferred_currency
  ) VALUES (
    NEW.id,
    'USD'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger execution on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_profiles ENABLE ROW LEVEL SECURITY;

-- 8.1 PROFILES POLICIES
-- SELECT: Users can read their own profile, or public profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = id
    OR role IN ('operator', 'vendor', 'coordinator') -- Public operator/vendor listings
  );

-- UPDATE: Users can only update their own profile fields
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 8.2 TRAVELER PROFILES POLICIES
-- SELECT: Only the traveler can read their private traveler profile
CREATE POLICY "traveler_profiles_select_own"
  ON public.traveler_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- INSERT: Only the traveler can insert their own profile
CREATE POLICY "traveler_profiles_insert_own"
  ON public.traveler_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE: Only the traveler can update their own profile
CREATE POLICY "traveler_profiles_update_own"
  ON public.traveler_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- DELETE: Only the traveler can delete their own profile
CREATE POLICY "traveler_profiles_delete_own"
  ON public.traveler_profiles
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- 9. AUDIT & SAMPLE HELPER FUNCTIONS
-- Secure RPC to safely update user profile without exposing role elevation
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_full_name TEXT,
  p_display_name TEXT,
  p_phone TEXT,
  p_avatar_url TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_updated public.profiles;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET full_name = COALESCE(p_full_name, full_name),
      display_name = COALESCE(p_display_name, display_name),
      phone = COALESCE(p_phone, phone),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      updated_at = timezone('utc'::text, now())
  WHERE id = (select auth.uid())
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;
