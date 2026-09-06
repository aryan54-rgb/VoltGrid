-- ============================================================================
-- VOLTGRID: Full Database Reset & Super Admin Trigger Repair
-- Retains ONLY Super Admin: aryansuryawanshi834@gmail.com
-- ============================================================================

BEGIN;

-- 1. Ensure public.profiles Schema Has All Required Columns & Defaults
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT false;

-- If full_name had a NOT NULL constraint without default, make it safe
ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT NOW();

-- 2. Clean Operational Tables (CASCADE clears dependent children)
TRUNCATE TABLE 
  public.reservations,
  public.notifications,
  public.admin_invitations,
  public.tickets,
  public.ticket_events,
  public.sessions,
  public.waitlists,
  public.reviews,
  public.review_votes,
  public.posts,
  public.post_likes,
  public.transactions,
  public.payment_cards,
  public.charging_schedule,
  public.invoices,
  public.fleet_drivers,
  public.fleet_vehicles,
  public.fleet_settings,
  public.analytics_series,
  public.connectors,
  public.stations
RESTART IDENTITY CASCADE;

-- 3. Delete Non-Admin Profiles and Auth Users
-- First remove any foreign records referencing profiles to be deleted
DELETE FROM public.wallet_accounts 
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
);

-- Delete all profiles EXCEPT Super Admin
DELETE FROM public.profiles 
WHERE LOWER(email) != 'aryansuryawanshi834@gmail.com';

-- Delete all auth.users EXCEPT Super Admin
DELETE FROM auth.users 
WHERE LOWER(email) != 'aryansuryawanshi834@gmail.com';

-- 4. Ensure Super Admin Account Profile Exists and is Elevated
INSERT INTO public.profiles (
  id,
  email,
  name,
  full_name,
  role,
  status,
  onboarded,
  updated_at
)
SELECT 
  id,
  email,
  COALESCE(NULLIF(TRIM(raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(raw_user_meta_data->>'name'), ''), 'Aryan Suryawanshi'),
  COALESCE(NULLIF(TRIM(raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(raw_user_meta_data->>'name'), ''), 'Aryan Suryawanshi'),
  'admin'::user_role,
  'active'::user_status,
  true,
  NOW()
FROM auth.users
WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'::user_role,
    status = 'active'::user_status,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    onboarded = true,
    updated_at = NOW();

-- Ensure Super Admin has a wallet account
INSERT INTO public.wallet_accounts (user_id, balance)
SELECT id, 100.00
FROM auth.users
WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET balance = GREATEST(public.wallet_accounts.balance, 100.00);

-- 5. Robust handle_new_user_profile() Function
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role user_role;
  user_display_name TEXT;
  user_email TEXT;
  is_admin_email BOOLEAN;
BEGIN
  -- Defensive: If triggered by a DELETE operation, immediately exit cleanly
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- 1. Safely resolve and sanitize email
  user_email := LOWER(COALESCE(NULLIF(TRIM(NEW.email), ''), NEW.id::text || '@no-email.invalid'));
  is_admin_email := (user_email = 'aryansuryawanshi834@gmail.com');

  -- 2. Safely resolve display name (guaranteed non-null, non-empty)
  user_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  -- 3. Safely resolve role (Google OAuth does NOT send raw_user_meta_data->>'role')
  IF is_admin_email THEN
    requested_role := 'admin'::user_role;
  ELSE
    BEGIN
      requested_role := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '')::user_role;
    EXCEPTION WHEN others THEN
      requested_role := NULL;
    END;

    -- Default missing/invalid/Google OAuth signups to 'driver'
    -- Prevent self-promotion to 'admin'
    IF requested_role IS NULL OR requested_role = 'admin'::user_role THEN
      requested_role := 'driver'::user_role;
    END IF;
  END IF;

  -- 4. Upsert into public.profiles with ALL required NOT NULL columns populated
  INSERT INTO public.profiles (
    id,
    email,
    name,
    full_name,
    role,
    status,
    onboarded,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, user_email),
    user_display_name,
    user_display_name,
    requested_role,
    'active'::user_status,
    CASE 
      WHEN is_admin_email THEN true
      WHEN NEW.raw_user_meta_data->>'role' IS NOT NULL AND NEW.raw_user_meta_data->>'role' != '' THEN true
      ELSE false
    END,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
      role = CASE 
        WHEN is_admin_email THEN 'admin'::user_role 
        ELSE public.profiles.role 
      END,
      status = COALESCE(public.profiles.status, EXCLUDED.status),
      updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Alias handle_new_user() to handle_new_user_profile() for backward-compatibility
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.handle_new_user_profile();
END;
$$;

-- 6. Attach Trigger Strictly AFTER INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_profile_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 7. Ensure complete_onboarding() handles full_name and updated_at
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  new_role     user_role,
  display_name text DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.profiles;
  cleaned_name text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  IF new_role IS NULL THEN
    RAISE EXCEPTION 'A role is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO rec FROM public.profiles WHERE id = uid FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile exists for this account' USING ERRCODE = 'P0002';
  END IF;

  IF rec.is_demo_persona THEN
    RAISE EXCEPTION 'Demo personas cannot be re-roled' USING ERRCODE = '42501';
  END IF;

  IF rec.onboarded THEN
    RAISE EXCEPTION 'Onboarding has already been completed for this account'
      USING ERRCODE = '42501';
  END IF;

  cleaned_name := NULLIF(TRIM(display_name), '');

  UPDATE public.profiles
     SET role       = new_role,
         name       = COALESCE(cleaned_name, name),
         full_name  = COALESCE(cleaned_name, full_name, name),
         updated_at = NOW(),
         onboarded  = true
   WHERE id = uid
  RETURNING * INTO rec;

  RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
