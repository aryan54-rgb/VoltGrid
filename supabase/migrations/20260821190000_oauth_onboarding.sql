-- ============================================================================
-- OAuth onboarding: let a social sign-in pick its own role
--
-- THE PROBLEM
--
-- `handle_new_user()` reads the role out of `raw_user_meta_data`, which the
-- registration form puts there. Google and GitHub put nothing there -- the user
-- never sees that form -- so every OAuth account silently landed on the
-- COALESCE fallback and became a driver.
--
-- THE SHAPE OF THE FIX
--
-- 1. `profiles.onboarded` records whether the role on the row was actually
--    chosen by the person or merely defaulted. The trigger sets it true only
--    when sign-up metadata carried a real role, which is exactly the
--    email/password path. OAuth rows land false and the client diverts them to
--    /welcome before any portal.
--
--    This is deliberately a stored fact rather than sniffing
--    `raw_app_meta_data->>'provider'`: it stays correct when an OAuth user
--    later links a password, and when an email user somehow arrives without a
--    role.
--
-- 2. `complete_onboarding()` is the only way a user may write their own role,
--    and it works exactly once. The Phase 1 migration revoked UPDATE on
--    `profiles` and re-granted only (name, company, vehicle, plan) precisely so
--    that `role` is not client-writable; widening that grant to let new users
--    self-assign would reopen the self-promotion hole for *every* user. A
--    SECURITY DEFINER function with its own precondition does not.
--
-- Idempotent.
-- ============================================================================

-- 1. The flag -----------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.onboarded IS
  'True once the account holder has actually chosen their role. False on a fresh OAuth signup, which never saw the registration form; the client diverts those to /welcome before letting them into a portal.';

-- Backfill: everyone who already exists keeps their portal, so nobody who has
-- been using the app gets bounced into a role picker.
UPDATE public.profiles
   SET onboarded = true
 WHERE NOT onboarded;

-- ...except the accounts this bug already caught. An account whose only login
-- identity is a social provider demonstrably never saw the registration form,
-- so whatever role it carries was defaulted, not chosen. Send those back
-- through onboarding on their next visit.
--
-- The first EXISTS matters: an account with no `auth.identities` rows at all
-- predates GoTrue creating an 'email' identity for password signups, and must
-- not be swept up by the NOT EXISTS on its own.
UPDATE public.profiles p
   SET onboarded = false
 WHERE p.onboarded
   AND EXISTS (
         SELECT 1 FROM auth.identities i WHERE i.user_id = p.id
       )
   AND NOT EXISTS (
         SELECT 1 FROM auth.identities i
          WHERE i.user_id = p.id AND i.provider = 'email'
       );

-- 2. Teach the signup trigger the difference -----------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role user_role;
BEGIN
  -- An absent or unrecognised role is not an error: OAuth signups have none,
  -- and failing here would fail the whole signup.
  BEGIN
    requested_role := NULLIF(TRIM(new.raw_user_meta_data->>'role'), '')::user_role;
  EXCEPTION WHEN others THEN
    requested_role := NULL;
  END;

  INSERT INTO public.profiles (id, name, email, role, onboarded)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),   -- what most OAuth providers send
      NULLIF(SPLIT_PART(COALESCE(new.email, ''), '@', 1), ''),
      'New user'
    ),
    -- profiles.email is NOT NULL; a provider that returns no email would
    -- otherwise abort the signup with a constraint violation.
    COALESCE(new.email, new.id::text || '@no-email.invalid'),
    -- A placeholder until they choose. `onboarded` below is what stops this
    -- value being treated as their answer.
    COALESCE(requested_role, 'driver'),
    requested_role IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- NOTE (demo vs production): both the registration form and the onboarding
-- screen offer all four roles, so this trusts the requested role. In production
-- operator/admin must not be self-assignable -- clamp it in both places:
--
--   requested_role := CASE WHEN requested_role IN ('driver', 'fleet')
--                          THEN requested_role ELSE NULL END;
--
-- and apply the same test inside complete_onboarding() below.

-- 3. The one-shot role write ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  new_role     user_role,
  display_name text DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.profiles;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  IF new_role IS NULL THEN
    RAISE EXCEPTION 'A role is required' USING ERRCODE = '22023';
  END IF;

  -- FOR UPDATE so two tabs submitting at once cannot both pass the check below.
  SELECT * INTO rec FROM public.profiles WHERE id = uid FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile exists for this account' USING ERRCODE = 'P0002';
  END IF;

  IF rec.is_demo_persona THEN
    RAISE EXCEPTION 'Demo personas cannot be re-roled' USING ERRCODE = '42501';
  END IF;

  -- The whole security argument. Without this the function is a role switcher
  -- any signed-in user could call to become an admin.
  IF rec.onboarded THEN
    RAISE EXCEPTION 'Onboarding has already been completed for this account'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
     SET role      = new_role,
         name      = COALESCE(NULLIF(TRIM(display_name), ''), name),
         onboarded = true
   WHERE id = uid
  RETURNING * INTO rec;

  RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.complete_onboarding(user_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(user_role, text) TO authenticated;

-- ============================================================================
-- Verify
-- ============================================================================
-- -- Should list your accounts, all onboarded = true, before any new OAuth login:
-- SELECT email, role, onboarded FROM public.profiles ORDER BY joined;
--
-- -- Should be exactly one row, granted to `authenticated` only:
-- SELECT proname, proacl FROM pg_proc WHERE proname = 'complete_onboarding';
--
-- -- Should refuse: the SQL editor has no auth.uid().
-- SELECT public.complete_onboarding('admin');
--
-- -- Which accounts will be asked to pick a role on their next visit:
-- SELECT p.email, p.role,
--        (SELECT string_agg(i.provider, ', ') FROM auth.identities i WHERE i.user_id = p.id) AS providers
--   FROM public.profiles p WHERE NOT p.onboarded;
--
-- -- Send one specific account back through the picker (e.g. to re-test):
-- UPDATE public.profiles SET onboarded = false WHERE email = 'you@example.com';
