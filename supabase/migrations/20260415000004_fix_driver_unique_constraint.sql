-- Fix missing unique constraint on drivers(user_id) to support ON CONFLICT in triggers
-- Date: 2026-04-15

-- 0. Ensure app_role enum is consistent and robust
DO $$ 
BEGIN
  -- Check if 'driver' exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'driver') THEN
    -- If 'moderator' exists, rename it to 'driver'
    IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'moderator') THEN
      ALTER TYPE public.app_role RENAME VALUE 'moderator' TO 'driver';
    ELSE
      -- Otherwise just add 'driver'
      ALTER TYPE public.app_role ADD VALUE 'driver';
    END IF;
  END IF;
END $$;

-- 1. Ensure user_id is unique in drivers table and fix phone/license/gender NOT NULL constraints
DO $$ 
BEGIN
  -- Drop NOT NULL constraints to allow NULLs during signup
  ALTER TABLE public.drivers ALTER COLUMN phone DROP NOT NULL;
  ALTER TABLE public.drivers ALTER COLUMN license_number DROP NOT NULL;
  ALTER TABLE public.drivers ALTER COLUMN gender DROP NOT NULL;
  ALTER TABLE public.drivers ALTER COLUMN full_name DROP NOT NULL;
  
  -- Clean up empty strings to NULL to allow unique constraints to work
  UPDATE public.drivers SET phone = NULL WHERE phone = '';
  UPDATE public.drivers SET license_number = NULL WHERE license_number = '';
  
  -- Remove duplicate user_id entries before adding constraint (safe-guard)
  DELETE FROM public.drivers a USING public.drivers b
  WHERE a.id < b.id AND a.user_id = b.user_id;

  -- Add unique constraint on user_id if missing
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_user_id_key') THEN
    ALTER TABLE public.drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2. Ensure user_id is unique in profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2.5 Robust sync_profile_to_driver (Never fail profile sync)
CREATE OR REPLACE FUNCTION public.sync_profile_to_driver()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.drivers
  SET 
    full_name = NEW.full_name,
    phone = NEW.phone,
    avatar_url = NEW.avatar_url,
    gender = CASE 
      WHEN NEW.gender = 'male' THEN 'male'::public.gender_type
      WHEN NEW.gender = 'female' THEN 'female'::public.gender_type
      ELSE gender -- Keep existing or NULL
    END,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Extremely robust handle_new_user with individual step error isolation
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
  v_driver_id UUID;
BEGIN
  -- 1. Extract metadata safely
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', 'User');
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');
  v_license := NULLIF(NEW.raw_user_meta_data->>'license_number', '');
  v_is_driver := COALESCE((NEW.raw_user_meta_data->>'is_driver')::boolean, (NEW.raw_user_meta_data->>'isDriver')::boolean, false);

  -- 2. Create Profile
  BEGIN
    INSERT INTO public.profiles (user_id, full_name, phone)
    VALUES (NEW.id, v_full_name, v_phone)
    ON CONFLICT (user_id) DO UPDATE 
    SET full_name = EXCLUDED.full_name, phone = COALESCE(EXCLUDED.phone, profiles.phone), updated_at = now();
  EXCEPTION WHEN OTHERS THEN 
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  END;

  -- 3. Handle Driver Record
  IF v_is_driver THEN
    v_role := 'driver';
    BEGIN
      INSERT INTO public.drivers (user_id, full_name, phone, license_number, email, status, is_verified)
      VALUES (NEW.id, v_full_name, v_phone, v_license, NEW.email, 'offline', false)
      ON CONFLICT (user_id) DO UPDATE
      SET full_name = EXCLUDED.full_name, phone = COALESCE(EXCLUDED.phone, drivers.phone), 
          email = COALESCE(EXCLUDED.email, drivers.email), license_number = COALESCE(EXCLUDED.license_number, drivers.license_number), 
          updated_at = now()
      RETURNING id INTO v_driver_id;
      
      IF v_driver_id IS NOT NULL THEN
        INSERT INTO public.driver_settings (driver_id) VALUES (v_driver_id) ON CONFLICT (driver_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Driver record creation failed for user %: %', NEW.id, SQLERRM;
    END;
  ELSE
    v_role := 'user';
  END IF;

  -- 4. Assign Role
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Role assignment failed for user %: %', NEW.id, SQLERRM;
  END;

  -- 5. Initialize Settings
  BEGIN
    INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Settings initialization failed for user %: %', NEW.id, SQLERRM;
  END;

  -- 6. Create Wallet
  BEGIN
    INSERT INTO public.wallets (user_id, wallet_type, balance)
    VALUES (NEW.id, CASE WHEN v_is_driver THEN 'driver'::public.wallet_type ELSE 'user'::public.wallet_type END, 0)
    ON CONFLICT (user_id) DO UPDATE SET wallet_type = EXCLUDED.wallet_type, updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Wallet creation failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
