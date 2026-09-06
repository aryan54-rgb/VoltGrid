-- Admin invitations and signup-role hardening.
--
-- Privileged access is determined here, in Postgres. Browser metadata remains
-- untrusted: a forged `role: admin` payload is downgraded to `driver` unless
-- its email has a pending invitation (or is the named super-admin account).

-- Some deployments predate the OAuth onboarding migration. Keep this migration
-- self-contained so the signup trigger below never fails on a missing column.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED')),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  accepted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_invitations_email_key
  ON public.admin_invitations (lower(email));

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_invitations TO authenticated;

DROP POLICY IF EXISTS "Admins read admin invitations" ON public.admin_invitations;
CREATE POLICY "Admins read admin invitations" ON public.admin_invitations
  FOR SELECT USING (public.current_user_role() = 'admin');

-- A SECURITY DEFINER RPC gives the UI an insert operation without granting the
-- table to every authenticated user or allowing the inviter identity to be
-- forged in a request body.
CREATE OR REPLACE FUNCTION public.create_admin_invitation(invitee_email text)
RETURNS public.admin_invitations AS $$
DECLARE
  invitation public.admin_invitations;
  normalized_email text := lower(trim(invitee_email));
BEGIN
  IF public.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only administrators can invite an administrator' USING ERRCODE = '42501';
  END IF;

  IF normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'A valid email address is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.admin_invitations (email, status, invited_by, created_at, accepted_at)
  VALUES (normalized_email, 'PENDING', auth.uid(), timezone('utc', now()), NULL)
  ON CONFLICT (lower(email)) DO UPDATE
    SET email = EXCLUDED.email,
        status = 'PENDING',
        invited_by = EXCLUDED.invited_by,
        created_at = EXCLUDED.created_at,
        accepted_at = NULL
  RETURNING * INTO invitation;

  RETURN invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.create_admin_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_invitation(text) TO authenticated;

-- Called by the magic-link callback for an already-existing account. New
-- accounts are accepted directly by handle_new_user() below; this function is
-- intentionally idempotent so either path is safe.
CREATE OR REPLACE FUNCTION public.accept_admin_invitation()
RETURNS public.profiles AS $$
DECLARE
  uid uuid := auth.uid();
  normalized_email text := lower(trim(auth.jwt() ->> 'email'));
  invitation public.admin_invitations;
  profile_row public.profiles;
BEGIN
  IF uid IS NULL OR normalized_email IS NULL OR normalized_email = '' THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO invitation
    FROM public.admin_invitations
   WHERE lower(email) = normalized_email AND status = 'PENDING'
   FOR UPDATE;

  IF FOUND THEN
    UPDATE public.profiles
       SET role = 'admin', onboarded = true
     WHERE id = uid
     RETURNING * INTO profile_row;

    UPDATE public.admin_invitations
       SET status = 'ACCEPTED', accepted_at = timezone('utc', now())
     WHERE id = invitation.id;
  ELSE
    SELECT * INTO profile_row FROM public.profiles WHERE id = uid;
    IF NOT FOUND OR profile_row.role <> 'admin' THEN
      RAISE EXCEPTION 'No pending admin invitation for this account' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN profile_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.accept_admin_invitation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_admin_invitation() TO authenticated;

-- Covers an account that existed before this migration as well as future
-- signups handled by the trigger below.
UPDATE public.profiles
   SET role = 'admin', onboarded = true
 WHERE lower(email) = 'aryansuryawanshi834@gmail.com';

-- The auth trigger is the authoritative signup role gate. This replacement
-- supersedes the earlier permissive trigger implementation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role user_role;
  assigned_role user_role := 'driver';
  normalized_email text := lower(trim(COALESCE(new.email, '')));
  has_invitation boolean := false;
BEGIN
  BEGIN
    requested_role := NULLIF(TRIM(new.raw_user_meta_data->>'role'), '')::user_role;
  EXCEPTION WHEN others THEN
    requested_role := NULL;
  END;

  SELECT EXISTS (
    SELECT 1 FROM public.admin_invitations
     WHERE lower(email) = normalized_email AND status = 'PENDING'
  ) INTO has_invitation;

  IF normalized_email = 'aryansuryawanshi834@gmail.com' OR has_invitation THEN
    assigned_role := 'admin';
  ELSIF requested_role IN ('driver', 'fleet', 'operator') THEN
    assigned_role := requested_role;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, onboarded)
  VALUES (
    new.id,
    COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''), NULLIF(SPLIT_PART(COALESCE(new.email, ''), '@', 1), ''), 'New user'),
    COALESCE(new.email, new.id::text || '@no-email.invalid'),
    assigned_role,
    requested_role IS NOT NULL OR assigned_role = 'admin'
  )
  ON CONFLICT (id) DO NOTHING;

  IF has_invitation THEN
    UPDATE public.admin_invitations
       SET status = 'ACCEPTED', accepted_at = timezone('utc', now())
     WHERE lower(email) = normalized_email AND status = 'PENDING';
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Rebind the auth hook as well as replacing its function body. Older database
-- setups can retain a trigger pointing at a separate legacy handler that writes
-- `profiles.full_name`, while VoltGrid's profile column is `name`.
DO $$
DECLARE
  legacy_trigger text;
BEGIN
  FOR legacy_trigger IN
    SELECT t.tgname
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
     WHERE t.tgrelid = 'auth.users'::regclass
       AND NOT t.tgisinternal
       AND p.prosrc ILIKE '%profiles%'
       AND p.prosrc ILIKE '%full_name%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', legacy_trigger);
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- OAuth onboarding is another public role entry point, so it must enforce the
-- same allow-list instead of becoming a bypass around the registration form.
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  new_role user_role,
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
  IF new_role IS NULL OR new_role NOT IN ('driver', 'fleet', 'operator') THEN
    RAISE EXCEPTION 'Choose an available public role' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO rec FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile exists for this account' USING ERRCODE = 'P0002';
  END IF;
  IF rec.is_demo_persona THEN
    RAISE EXCEPTION 'Demo personas cannot be re-roled' USING ERRCODE = '42501';
  END IF;
  IF rec.onboarded THEN
    RAISE EXCEPTION 'Onboarding has already been completed for this account' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
     SET role = new_role,
         name = COALESCE(NULLIF(TRIM(display_name), ''), name),
         onboarded = true
   WHERE id = uid
  RETURNING * INTO rec;
  RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
