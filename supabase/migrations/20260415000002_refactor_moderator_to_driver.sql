-- Migration: Refactor 'moderator' role to 'driver' for semantic clarity
-- Date: 2026-04-15

-- 1. Rename the enum value in app_role
-- Note: ALTER TYPE ... RENAME VALUE is available since Postgres 10
ALTER TYPE public.app_role RENAME VALUE 'moderator' TO 'driver';

-- 2. Update the handle_new_user function to use the new 'driver' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_driver BOOLEAN;
  v_full_name TEXT;
  v_phone TEXT;
  v_license TEXT;
  v_role TEXT;
BEGIN
  -- Extract metadata
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_license := NEW.raw_user_meta_data->>'license_number';
  v_is_driver := COALESCE(
    (NEW.raw_user_meta_data->>'is_driver')::boolean,
    (NEW.raw_user_meta_data->>'isDriver')::boolean,
    false
  );

  -- 1. Create Profile
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, v_full_name, v_phone)
  ON CONFLICT (user_id) DO UPDATE 
  SET 
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = now();

  -- 2. Handle Roles and Driver Records
  IF v_is_driver THEN
    v_role := 'driver'; -- Driver role in this app (refactored from moderator)
    
    INSERT INTO public.drivers (user_id, full_name, phone, license_number, email, status, is_verified)
    VALUES (NEW.id, v_full_name, COALESCE(v_phone, ''), COALESCE(v_license, ''), NEW.email, 'offline', false)
    ON CONFLICT (user_id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      phone = COALESCE(EXCLUDED.phone, drivers.phone),
      email = COALESCE(EXCLUDED.email, drivers.email),
      license_number = COALESCE(EXCLUDED.license_number, drivers.license_number),
      updated_at = now();
  ELSE
    v_role := 'user';
  END IF;

  -- Assign Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Create Wallet (SECURITY DEFINER bypasses RLS)
  INSERT INTO public.wallets (user_id, wallet_type, balance)
  VALUES (
    NEW.id, 
    CASE WHEN v_is_driver THEN 'driver'::public.wallet_type ELSE 'user'::public.wallet_type END, 
    0
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    wallet_type = EXCLUDED.wallet_type,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 3. Update existing documentation or logs if necessary
-- Note: Documentation files (.md) should be updated separately to reflect this change.
