-- Phase 1: Authentication & Roles
--
-- Two fixes on top of 20260821120000_init.sql:
--   1. handle_new_user() hard-coded role 'driver', so the role picked on the
--      registration form was thrown away. It now reads the role the client
--      passes in auth metadata.
--   2. The "Users can update own profile" policy allowed a user to UPDATE any
--      column of their own row -- including `role` and `status`. Any driver
--      could promote themselves to admin. Column-level grants fix that.

-- 1. Seed the profile from sign-up metadata -------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role user_role;
BEGIN
  -- Unknown/absent values fall back to 'driver' rather than failing the signup.
  BEGIN
    requested_role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN others THEN
    requested_role := 'driver';
  END;

  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),   -- what most OAuth providers send
      SPLIT_PART(new.email, '@', 1)
    ),
    new.email,
    COALESCE(requested_role, 'driver')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- NOTE (demo vs production): the registration form offers all four roles, so
-- this trusts the requested role. In production, privileged roles must not be
-- self-assignable -- swap the COALESCE above for the line below and grant
-- operator/admin from the Supabase dashboard or an admin-only RPC:
--
--   CASE WHEN requested_role IN ('driver', 'fleet') THEN requested_role
--        ELSE 'driver' END

-- 2. Stop users editing their own role / status ---------------------------
-- RLS policies act on whole rows; column privileges are what restrict which
-- columns an UPDATE may touch. The RLS policy from the init migration still
-- limits users to their *own* row.

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, company, vehicle, plan) ON public.profiles TO authenticated;

-- 3. Let admins read every profile ----------------------------------------
-- Needed by the admin user-management screen. SECURITY DEFINER so the lookup
-- does not re-enter the profiles policy it is being evaluated for.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.current_user_role() = 'admin');
