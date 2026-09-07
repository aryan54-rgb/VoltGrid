-- ============================================================================
-- VOLTGRID: Add Vehicle Name & License Plate Support to Profiles & Onboarding
-- ============================================================================

BEGIN;

-- 1. Ensure public.profiles has license_plate column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_plate TEXT;

-- 2. Grant permissions for user profile updates
GRANT UPDATE (name, full_name, company, vehicle, license_plate, plan) ON public.profiles TO authenticated;

-- 3. Enhance handle_new_user_profile() Trigger Function
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
  user_vehicle TEXT;
  user_license_plate TEXT;
  user_company TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- 1. Safely resolve and sanitize email
  user_email := LOWER(COALESCE(NULLIF(TRIM(NEW.email), ''), NEW.id::text || '@no-email.invalid'));
  is_admin_email := (user_email = 'aryansuryawanshi834@gmail.com');

  -- 2. Safely resolve display name
  user_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  -- 3. Extract vehicle and license plate metadata
  user_vehicle := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'vehicle'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'vehicle_name'), '')
  );

  user_license_plate := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'license_plate'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'plate'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'number_plate'), '')
  );

  user_company := NULLIF(TRIM(NEW.raw_user_meta_data->>'company'), '');

  -- 4. Safely resolve role
  IF is_admin_email THEN
    requested_role := 'admin'::user_role;
  ELSE
    BEGIN
      requested_role := NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '')::user_role;
    EXCEPTION WHEN others THEN
      requested_role := NULL;
    END;

    IF requested_role IS NULL OR requested_role = 'admin'::user_role THEN
      requested_role := 'driver'::user_role;
    END IF;
  END IF;

  -- 5. Upsert into public.profiles
  INSERT INTO public.profiles (
    id,
    email,
    name,
    full_name,
    role,
    status,
    vehicle,
    license_plate,
    company,
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
    user_vehicle,
    user_license_plate,
    user_company,
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
      vehicle = COALESCE(EXCLUDED.vehicle, public.profiles.vehicle),
      license_plate = COALESCE(EXCLUDED.license_plate, public.profiles.license_plate),
      company = COALESCE(EXCLUDED.company, public.profiles.company),
      updated_at = NOW();

  -- 6. For fleet registrations with license plate, insert initial fleet vehicle
  IF requested_role = 'fleet' AND user_license_plate IS NOT NULL THEN
    INSERT INTO public.fleet_vehicles (
      id,
      company,
      model,
      driver_name,
      soc,
      range_km,
      status,
      location,
      odometer,
      health
    )
    VALUES (
      user_license_plate,
      COALESCE(user_company, 'Fleet Services'),
      COALESCE(user_vehicle, 'Commercial EV'),
      user_display_name,
      100,
      320,
      'idle',
      'Depot · Lot A',
      0,
      100
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Complete Onboarding with Vehicle and Number Plate Support
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  new_role          user_role,
  display_name      text DEFAULT NULL,
  vehicle_name      text DEFAULT NULL,
  license_plate_val text DEFAULT NULL,
  company_name      text DEFAULT NULL
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

  UPDATE public.profiles
     SET role          = new_role,
         name          = COALESCE(NULLIF(TRIM(display_name), ''), name),
         full_name     = COALESCE(NULLIF(TRIM(display_name), ''), full_name, name),
         vehicle       = COALESCE(NULLIF(TRIM(vehicle_name), ''), vehicle),
         license_plate = COALESCE(NULLIF(TRIM(license_plate_val), ''), license_plate),
         company       = COALESCE(NULLIF(TRIM(company_name), ''), company),
         onboarded     = true,
         updated_at    = NOW()
   WHERE id = uid
  RETURNING * INTO rec;

  IF new_role = 'fleet' AND NULLIF(TRIM(license_plate_val), '') IS NOT NULL THEN
    INSERT INTO public.fleet_vehicles (
      id,
      company,
      model,
      driver_name,
      soc,
      range_km,
      status,
      location,
      odometer,
      health
    )
    VALUES (
      TRIM(license_plate_val),
      COALESCE(NULLIF(TRIM(company_name), ''), rec.company, 'Fleet Services'),
      COALESCE(NULLIF(TRIM(vehicle_name), ''), 'Commercial EV'),
      COALESCE(NULLIF(TRIM(display_name), ''), rec.name),
      100,
      320,
      'idle',
      'Depot · Lot A',
      0,
      100
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.complete_onboarding(user_role, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(user_role, text, text, text, text) TO authenticated;

COMMIT;
