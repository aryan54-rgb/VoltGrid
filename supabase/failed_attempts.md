History of SQL Queries Executed

Below is the complete chronological set of SQL scripts used during the user deletion and trigger repair process:
Attempt 1: Initial Data Wipe and Admin Promotion
SQL

-- 1. Wipe existing non-essential test data
TRUNCATE TABLE public.reservations CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.admin_invitations CASCADE;
TRUNCATE TABLE public.connectors CASCADE;
TRUNCATE TABLE public.stations CASCADE;

-- 2. Restructure Profiles to enforce Super Admin
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Hardcode Super Admin role for main account
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
);

-- Demote any other unauthorized existing users to driver
UPDATE public.profiles
SET role = 'driver'
WHERE id NOT IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
);

Attempt 2: Deleting from auth.users (Failed: missing updated_at column)
SQL

-- Target auth.users directly to remove users from Supabase Auth
DELETE FROM auth.users 
WHERE LOWER(email) != 'aryansuryawanshi834@gmail.com';

TRUNCATE TABLE public.reservations CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.admin_invitations CASCADE;
TRUNCATE TABLE public.connectors CASCADE;
TRUNCATE TABLE public.stations CASCADE;

INSERT INTO public.profiles (id, full_name, role, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Aryan Suryawanshi'),
  'admin',
  NOW()
FROM auth.users
WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', updated_at = NOW();

Error: ERROR: 42703: column "updated_at" of relation "profiles" does not exist
Attempt 3: Adding Schema Columns (Failed: missing name NOT NULL)
SQL

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DELETE FROM auth.users 
WHERE LOWER(email) != 'aryansuryawanshi834@gmail.com';

TRUNCATE TABLE public.reservations CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.admin_invitations CASCADE;
TRUNCATE TABLE public.connectors CASCADE;
TRUNCATE TABLE public.stations CASCADE;

INSERT INTO public.profiles (id, full_name, role, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Aryan Suryawanshi'),
  'admin',
  NOW()
FROM auth.users
WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', updated_at = NOW();

Error: ERROR: 23502: null value in column "name" of relation "profiles" violates not-null constraint
Attempt 4: Including name and full_name (Failed: missing email NOT NULL)
SQL

INSERT INTO public.profiles (id, name, full_name, role, updated_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Aryan Suryawanshi'),
  COALESCE(raw_user_meta_data->>'full_name', 'Aryan Suryawanshi'),
  'admin',
  NOW()
FROM auth.users
WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', 
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

Error: ERROR: 23502: null value in column "email" of relation "profiles" violates not-null constraint
Attempt 5: Final Schema Resolution and Google OAuth Safe Trigger
SQL

-- 1. Ensure required columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Delete all users EXCEPT Super Admin
DELETE FROM auth.users 
WHERE LOWER(email) != 'aryansuryawanshi834@gmail.com';

-- 3. TRUNCATE operational tables
TRUNCATE TABLE public.reservations CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.admin_invitations CASCADE;
TRUNCATE TABLE public.connectors CASCADE;
TRUNCATE TABLE public.stations CASCADE;

-- 4. Upsert Super Admin profile with all required non-null fields
INSERT INTO public.profiles (id, email, name, full_name, role, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Aryan Suryawanshi'),
  COALESCE(raw_user_meta_data->>'full_name', 'Aryan Suryawanshi'),
  'admin',
  NOW()
FROM auth.users
WHERE LOWER(email) = 'aryansuryawanshi834@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- 5. Updated trigger with Google OAuth fallback
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requested_role TEXT;
  user_display_name TEXT;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'driver');
  
  IF requested_role IS NULL OR requested_role = '' THEN
    requested_role := 'driver';
  END IF;

  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'name', 
    SPLIT_PART(NEW.email, '@', 1)
  );

  IF LOWER(NEW.email) = 'aryansuryawanshi834@gmail.com' THEN
    requested_role := 'admin';
  ELSIF requested_role = 'admin' THEN
    requested_role := 'driver';
  END IF;

  INSERT INTO public.profiles (id, email, name, full_name, role, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
    user_display_name,
    requested_role,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email,
      name = COALESCE(public.profiles.name, EXCLUDED.name),
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

---

### Attempt 6: Comprehensive Final Solution (Resolved)

#### Why Previous Attempts Failed:
1. **`auth.users` isolation:** `TRUNCATE` only acts on `public` schema tables. It does not touch Supabase's internal `auth.users` schema.
2. **`DELETE` trigger mismatch:** If a trigger fired during `DELETE`, `NEW` was `NULL`, causing constraint violations when referencing `NEW.id`, `NEW.email`, and `NEW.raw_user_meta_data`. Adding `IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;` guards against this.
3. **Google OAuth missing `role` & `name`:** Google OAuth providers pass profile information in `name` / `full_name` but omit `role` entirely. Casting an absent or invalid string directly into `user_role` caused database transactions to abort. A defensive `EXCEPTION WHEN others THEN requested_role := 'driver'::user_role;` block guarantees that unassigned roles default safely.
4. **NOT NULL constraints on `name`, `email`, and `full_name`:** All profile insertions now use strict fallback chains (`user_display_name` and `user_email`) ensuring non-null, non-empty values.
5. **Super Admin elevation:** `aryansuryawanshi834@gmail.com` is guaranteed to receive `'admin'` role with `onboarded = true` whether through initial seeding or subsequent Google OAuth logins.

#### Executed Migration:
See `supabase/migrations/20260907020000_super_admin_reset_and_trigger_fix.sql`.