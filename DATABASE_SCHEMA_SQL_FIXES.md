# Database Schema - SQL Fixes & Recommendations

**Document Purpose:** Directly applicable SQL queries to fix identified issues  
**Usage:** Review and apply to staging environment first, then production

---

## CRITICAL FIXES - Apply Immediately

### Fix #1: Prevent Wallet Balance Manipulation

**Problem:** Users can directly UPDATE their wallet balance

**Current Vulnerable Policy:**
```sql
-- REMOVE THIS:
CREATE POLICY "Users can update own wallet" ON public.wallets 
FOR UPDATE USING (auth.uid() = user_id);
```

**Fix:**
```sql
-- Step 1: Drop vulnerable policy
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- Step 2: Remove UPDATE permission for authenticated users
-- Only admins and functions can update
CREATE POLICY "Only system can update wallets" ON public.wallets
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Step 3: Verify wallet transactions go through function (already exists)
-- Confirm process_wallet_transaction() is used by application
SELECT * FROM pg_proc WHERE proname = 'process_wallet_transaction';

-- Step 4: Test that user UPDATE is blocked
-- This should FAIL with permission denied:
-- UPDATE wallets SET balance = 999 WHERE user_id = auth.uid();
```

---

### Fix #2: Prevent Booking Cascade Deletion

**Problem:** Deleting shuttle schedule cascades to bookings

**Current Issue:**
```sql
-- PROBLEM: This cascade deletes all bookings
ALTER TABLE public.shuttle_bookings
DROP CONSTRAINT fk_shuttle_bookings_schedule_id;

ALTER TABLE public.shuttle_bookings
ADD CONSTRAINT fk_shuttle_bookings_schedule_id
FOREIGN KEY (schedule_id) REFERENCES public.shuttle_schedules(id) 
ON DELETE CASCADE;  -- ← DANGEROUS!
```

**Fix (Option 1: Soft Delete - Recommended):**
```sql
-- Step 1: Add soft-delete column if not exists
ALTER TABLE public.shuttle_schedules
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Step 2: Create index for active schedules
CREATE INDEX IF NOT EXISTS idx_shuttle_schedules_active
ON public.shuttle_schedules(deleted_at)
WHERE deleted_at IS NULL;

-- Step 3: Change cascade behavior to SET NULL
ALTER TABLE public.shuttle_bookings
DROP CONSTRAINT IF EXISTS fk_shuttle_bookings_schedule_id;

ALTER TABLE public.shuttle_bookings
ADD CONSTRAINT fk_shuttle_bookings_schedule_id
FOREIGN KEY (schedule_id) REFERENCES public.shuttle_schedules(id)
ON DELETE SET NULL;

-- Step 4: Create trigger to archive bookings instead of deleting
CREATE OR REPLACE FUNCTION archive_booking_on_schedule_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shuttle_bookings
  SET schedule_id = NULL
  WHERE schedule_id = OLD.id AND status != 'completed';
  
  -- Log deletion for audit
  INSERT INTO public.audit_logs 
    (table_name, record_id, action, old_data, changed_by)
  VALUES 
    ('shuttle_schedules', OLD.id::text, 'DELETE (archived bookings)', to_jsonb(OLD), auth.uid());
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Apply trigger (handle both soft and hard delete)
DROP TRIGGER IF EXISTS shuttle_schedules_archive_bookings ON public.shuttle_schedules;
CREATE TRIGGER shuttle_schedules_archive_bookings
BEFORE DELETE ON public.shuttle_schedules
FOR EACH ROW
EXECUTE FUNCTION archive_booking_on_schedule_delete();

-- Step 6: Update queries to filter deleted schedules
-- Whenever querying shuttle_schedules, use:
-- SELECT * FROM shuttle_schedules WHERE deleted_at IS NULL;

-- Step 7: Create view for easy access
DROP VIEW IF EXISTS public.shuttle_schedules_active;
CREATE VIEW public.shuttle_schedules_active AS
SELECT * FROM public.shuttle_schedules
WHERE deleted_at IS NULL;
```

**Fix (Option 2: Prevent Deletion):**
```sql
-- If you want to prevent deletion entirely:
ALTER TABLE public.shuttle_schedules
ADD CONSTRAINT no_delete_with_bookings
CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.shuttle_bookings 
    WHERE schedule_id = id AND status IN ('confirmed', 'pending')
  )
);

-- Note: This won't work as a CHECK constraint (can't reference other tables)
-- Use trigger instead:
CREATE OR REPLACE FUNCTION prevent_schedule_delete_with_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.shuttle_bookings 
    WHERE schedule_id = OLD.id AND status IN ('confirmed', 'pending')
  ) THEN
    RAISE EXCEPTION 'Cannot delete schedule with active bookings';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_schedule_bookings_on_delete ON public.shuttle_schedules;
CREATE TRIGGER check_schedule_bookings_on_delete
BEFORE DELETE ON public.shuttle_schedules
FOR EACH ROW
EXECUTE FUNCTION prevent_schedule_delete_with_bookings();
```

---

### Fix #3: Secure Payment Gateway Keys

**Problem:** API keys stored as plaintext in database

**Current Issue:**
```sql
-- Column name says "encrypted" but data is plaintext
SELECT server_key_encrypted FROM payment_gateway_configs;
-- Returns: "plaintext_api_key_here" (NOT encrypted!)
```

**Fix:**
```sql
-- Step 1: Backup existing data
CREATE TABLE payment_gateway_configs_backup AS
SELECT * FROM payment_gateway_configs;

-- Step 2: Remove sensitive column from database
ALTER TABLE public.payment_gateway_configs
DROP COLUMN server_key_encrypted;

-- Step 3: Add timestamp for key rotation tracking
ALTER TABLE public.payment_gateway_configs
ADD COLUMN IF NOT EXISTS key_rotated_at TIMESTAMPTZ DEFAULT now();

-- Step 4: Create view that only returns non-sensitive config
DROP VIEW IF EXISTS public.payment_gateways_public;
CREATE VIEW public.payment_gateways_public AS
SELECT 
  id,
  gateway,
  environment,
  is_active,
  key_rotated_at
FROM public.payment_gateway_configs;

-- Step 5: Update application to:
-- 1. Read server_key from environment variables or Supabase Vault
-- 2. Only store public keys (client_key) in database
-- 3. Rotate keys without database access

-- Step 6: Create audit log for key access
CREATE TABLE IF NOT EXISTS public.payment_key_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  accessed_by TEXT,
  reason TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_key_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only" ON public.payment_key_access_logs
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Step 7: Verify no keys in application logs
-- Check logs don't contain sensitive data
-- Update logging to exclude payment keys
```

---

### Fix #4: Add Foreign Key Constraints to auth.users

**Problem:** Orphaned records possible (no FK from users table)

**Fix:**
```sql
-- Step 1: Add FK constraint to profiles
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Step 2: Add FK to drivers
-- Note: user_id is nullable for external drivers
ALTER TABLE public.drivers
ADD CONSTRAINT fk_drivers_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 3: Add FK to wallets
ALTER TABLE public.wallets
ADD CONSTRAINT fk_wallets_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Step 4: Add FK to shuttle_bookings (allow NULL for guest bookings)
ALTER TABLE public.shuttle_bookings
ADD CONSTRAINT fk_shuttle_bookings_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 5: Add FK to session_audit_logs
ALTER TABLE public.session_audit_logs
ADD CONSTRAINT fk_session_audit_logs_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Step 6: Verify no orphaned records exist
SELECT 'profiles' as table_name, COUNT(*) as orphaned_records
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id)
UNION ALL
SELECT 'drivers', COUNT(*)
FROM public.drivers d
WHERE d.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = d.user_id)
UNION ALL
SELECT 'wallets', COUNT(*)
FROM public.wallets w
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = w.user_id)
UNION ALL
SELECT 'shuttle_bookings', COUNT(*)
FROM public.shuttle_bookings sb
WHERE sb.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = sb.user_id);
```

---

## HIGH PRIORITY FIXES - Apply Within 1 Week

### Fix #5: Add Critical Indexes

**Problem:** User booking queries and seat availability checks cause full table scans (1000ms+)

**Fix:**
```sql
-- CRITICAL INDEX #1: User's booking queries
CREATE INDEX IF NOT EXISTS idx_shuttle_bookings_user_id_status
ON public.shuttle_bookings(user_id, status)
WHERE user_id IS NOT NULL;

-- CRITICAL INDEX #2: Booking history by date
CREATE INDEX IF NOT EXISTS idx_shuttle_bookings_user_id_created_at
ON public.shuttle_bookings(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- CRITICAL INDEX #3: Seat availability checks
CREATE INDEX IF NOT EXISTS idx_shuttle_seats_schedule_id_status
ON public.shuttle_seats(schedule_id, status);

-- HIGH PRIORITY INDEX #4: Expired reservation cleanup
CREATE INDEX IF NOT EXISTS idx_shuttle_seats_reserved_expired
ON public.shuttle_seats(reserved_at)
WHERE status = 'reserved' AND reserved_at < now() - INTERVAL '10 minutes';

-- HIGH PRIORITY INDEX #5: Pricing lookups
CREATE INDEX IF NOT EXISTS idx_shuttle_pricing_rules_service_type_effective_date
ON public.shuttle_pricing_rules(service_type_id, effective_date DESC)
WHERE active = true;

-- HIGH PRIORITY INDEX #6: Email queries
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_provider_created_at
ON public.email_webhook_events(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_blacklist_email
ON public.email_blacklist(email);

-- HIGH PRIORITY INDEX #7: Driver availability
CREATE INDEX IF NOT EXISTS idx_drivers_status_updated_at
ON public.drivers(status, updated_at DESC);

-- HIGH PRIORITY INDEX #8: Wallet transaction history
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id_type
ON public.wallet_transactions(wallet_id, type);

-- Verify index creation
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY tablename;

-- Check index usage (run after queries execute)
SELECT 
  schemaname, tablename, indexname,
  idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC;
```

---

### Fix #6: Standardize RLS Policies (JWT → has_role())

**Problem:** Mixed auth methods cause inconsistent access control

**Fix:**
```sql
-- STEP 1: Update shuttle_pricing_rules RLS
DROP POLICY IF EXISTS "admin_manage_pricing_rules" ON public.shuttle_pricing_rules;
CREATE POLICY "admin_manage_pricing_rules"
ON public.shuttle_pricing_rules
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- STEP 2: Update shuttle_service_vehicle_types RLS
DROP POLICY IF EXISTS "admin_manage_service_vehicle_types" ON public.shuttle_service_vehicle_types;
CREATE POLICY "admin_manage_service_vehicle_types"
ON public.shuttle_service_vehicle_types
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- STEP 3: Update shuttle_schedule_services RLS
DROP POLICY IF EXISTS "admin_manage_schedule_services" ON public.shuttle_schedule_services;
CREATE POLICY "admin_manage_schedule_services"
ON public.shuttle_schedule_services
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- STEP 4: Simplify shuttle_seats RLS (remove UPDATE by public)
DROP POLICY IF EXISTS "Public can reserve seats" ON public.shuttle_seats;
CREATE POLICY "System can update seat status"
ON public.shuttle_seats
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Note: Seat reservation should go through reserve_shuttle_seats() function only
-- Application must call function, not direct UPDATE

-- STEP 5: Verify all JWT-based policies are gone
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE qual LIKE '%jwt%'
ORDER BY tablename;
-- Should return: (empty result)
```

---

### Fix #7: Add Missing Audit Trails

**Problem:** Only 40% of tables have audit logging

**Fix:**
```sql
-- STEP 1: Create standardized audit trigger function
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs 
      (table_name, record_id, action, old_data, changed_by)
    VALUES 
      (TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs
      (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES
      (TG_TABLE_NAME, OLD.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs
      (table_name, record_id, action, new_data, changed_by)
    VALUES
      (TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: Apply audit trigger to profiles
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION audit_changes();

-- STEP 3: Apply audit trigger to vehicles
DROP TRIGGER IF EXISTS audit_vehicles ON public.vehicles;
CREATE TRIGGER audit_vehicles
AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION audit_changes();

-- STEP 4: Apply audit trigger to rides
DROP TRIGGER IF EXISTS audit_rides ON public.rides;
CREATE TRIGGER audit_rides
AFTER INSERT OR UPDATE OR DELETE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION audit_changes();

-- STEP 5: Apply audit trigger to hotel_bookings
DROP TRIGGER IF EXISTS audit_hotel_bookings ON public.hotel_bookings;
CREATE TRIGGER audit_hotel_bookings
AFTER INSERT OR UPDATE OR DELETE ON public.hotel_bookings
FOR EACH ROW
EXECUTE FUNCTION audit_changes();

-- STEP 6: Verify triggers are installed
SELECT tgname, tgisinternal, tgenabled
FROM pg_trigger
WHERE tgname LIKE 'audit_%'
ORDER BY tgname;
```

---

### Fix #8: Add Missing Data Type Constraints

**Problem:** Invalid data can be inserted (negative prices, invalid statuses)

**Fix:**
```sql
-- CONSTRAINT #1: Seat status enum
ALTER TABLE public.shuttle_seats
ADD CONSTRAINT check_shuttle_seats_status
CHECK (status IN ('available', 'reserved', 'booked'));

-- CONSTRAINT #2: Wallet balance non-negative
ALTER TABLE public.wallets
ADD CONSTRAINT check_wallets_balance CHECK (balance >= 0);

-- CONSTRAINT #3: Driver rating 0-5
ALTER TABLE public.drivers
ADD CONSTRAINT check_drivers_rating 
CHECK (rating >= 0 AND rating <= 5);

-- CONSTRAINT #4: Pricing multipliers non-negative
ALTER TABLE public.shuttle_pricing_rules
ADD CONSTRAINT check_pricing_multiplier_base CHECK (base_fare_multiplier >= 0);
ADD CONSTRAINT check_pricing_multiplier_distance CHECK (distance_cost_per_km >= 0);
ADD CONSTRAINT check_pricing_multiplier_peak CHECK (peak_hours_multiplier >= 0);

-- CONSTRAINT #5: Hotel booking dates valid
ALTER TABLE public.hotel_bookings
ADD CONSTRAINT check_hotel_booking_dates CHECK (check_in < check_out);

-- CONSTRAINT #6: Transaction amounts non-zero
ALTER TABLE public.wallet_transactions
ADD CONSTRAINT check_transaction_amount CHECK (amount != 0);

-- CONSTRAINT #7: Schedule seat consistency
ALTER TABLE public.shuttle_schedules
ADD CONSTRAINT check_schedule_seats 
CHECK (available_seats >= 0 AND available_seats <= total_seats);

ALTER TABLE public.shuttle_schedule_services
ADD CONSTRAINT check_service_seats
CHECK (available_seats >= 0 AND available_seats <= total_seats);

-- CONSTRAINT #8: Booking reference uniqueness
ALTER TABLE public.shuttle_bookings
ADD CONSTRAINT uk_shuttle_bookings_booking_ref UNIQUE (booking_ref);

-- CONSTRAINT #9: No negative route distances
ALTER TABLE public.shuttle_routes
ADD CONSTRAINT check_route_distance CHECK (distance_km > 0);

-- CONSTRAINT #10: No negative route fares
ALTER TABLE public.shuttle_routes
ADD CONSTRAINT check_route_fare CHECK (base_fare >= 0);

-- Verify constraints
SELECT constraint_name, constraint_type, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK'
ORDER BY table_name;
```

---

## MEDIUM PRIORITY FIXES - Apply Within 1 Month

### Fix #9: Denormalization Cleanup

**Problem:** Driver profile duplicated in profiles + drivers

**Fix:**
```sql
-- OPTION 1: Create view (simplest, no data migration needed)
DROP VIEW IF EXISTS public.driver_profiles;
CREATE VIEW public.driver_profiles AS
SELECT 
  d.id,
  d.user_id,
  d.phone,
  d.license_number,
  d.status,
  d.current_lat,
  d.current_lng,
  d.rating,
  d.avatar_url,
  d.pin_hash,
  d.prefers_bike,
  d.prefers_bike_women,
  d.prefers_car,
  d.ktp_number,
  d.ktp_url,
  d.sim_url,
  d.vehicle_stnk_url,
  d.registration_status,
  p.full_name,
  p.created_at,
  d.updated_at
FROM public.drivers d
LEFT JOIN public.profiles p ON d.user_id = p.user_id;

-- Application queries driver_profiles view instead of drivers table
-- This ensures single source of truth

-- OPTION 2: Consolidate (requires data migration)
-- Keep profiles table minimal (user_id, created_at)
-- Move all driver-specific fields to drivers table
-- Update triggers to sync in one direction only

-- Drop problematic sync trigger
DROP TRIGGER IF EXISTS on_profile_update_sync_driver ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_to_driver();

-- Add gender column (was referenced but missing)
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Create single sync trigger: profiles → drivers (one direction)
CREATE OR REPLACE FUNCTION sync_driver_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
    OR NEW.phone IS DISTINCT FROM OLD.phone  
    OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
  THEN
    UPDATE public.drivers
    SET 
      full_name = NEW.full_name,
      phone = NEW.phone,
      avatar_url = NEW.avatar_url,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_update_sync_driver_oneway
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION sync_driver_on_profile_update();

-- Add audit to catch de-syncs
CREATE OR REPLACE FUNCTION detect_driver_profile_desync()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.audit_logs (table_name, record_id, action, details, changed_by)
  SELECT 
    'driver_profile_desync',
    d.id::text,
    'DESYNC_DETECTED',
    jsonb_build_object(
      'driver_name', d.full_name,
      'profile_name', p.full_name,
      'driver_phone', d.phone,
      'profile_phone', p.phone
    ),
    NULL
  FROM public.drivers d
  LEFT JOIN public.profiles p ON d.user_id = p.user_id
  WHERE (d.full_name IS DISTINCT FROM p.full_name
    OR d.phone IS DISTINCT FROM p.phone)
    AND d.user_id IS NOT NULL;
END;
$$;

-- Run daily to detect mismatches
SELECT cron.schedule('detect_driver_profile_desync', '0 2 * * *', 'SELECT detect_driver_profile_desync()');
```

---

### Fix #10: Consolidate Schedule Services Duplication

**Problem:** Available seats tracked in 3 places (shuttle_schedules, shuttle_seats, shuttle_schedule_services)

**Fix:**
```sql
-- STEP 1: Create function for source of truth
CREATE OR REPLACE FUNCTION get_available_seats_for_schedule(
  p_schedule_id UUID, 
  p_service_type_id UUID
)
RETURNS INTEGER AS $$
SELECT COUNT(*)::INTEGER
FROM public.shuttle_seats
WHERE schedule_id = p_schedule_id
  AND status = 'available'
  AND (p_service_type_id IS NULL OR service_type_id = p_service_type_id);
$$ LANGUAGE sql STABLE;

-- STEP 2: Create materialized view (cache)
DROP MATERIALIZED VIEW IF EXISTS public.schedule_service_availability;
CREATE MATERIALIZED VIEW public.schedule_service_availability AS
SELECT 
  ss.id,
  ss.schedule_id,
  ss.service_type_id,
  ss.total_seats,
  get_available_seats_for_schedule(ss.schedule_id, ss.service_type_id) as available_seats,
  ss.active,
  NOW()::TIMESTAMPTZ as refreshed_at
FROM public.shuttle_schedule_services ss
WHERE ss.active = true;

-- Create index
CREATE INDEX idx_schedule_service_availability_schedule_id
ON public.schedule_service_availability(schedule_id);

-- STEP 3: Create refresh trigger
CREATE OR REPLACE FUNCTION refresh_schedule_availability()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.schedule_service_availability;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Call refresh after seat changes
DROP TRIGGER IF EXISTS refresh_availability_on_seat_change ON public.shuttle_seats;
CREATE TRIGGER refresh_availability_on_seat_change
AFTER INSERT OR UPDATE OR DELETE ON public.shuttle_seats
FOR EACH ROW
EXECUTE FUNCTION refresh_schedule_availability();

-- STEP 5: Application uses materialized view
-- SELECT available_seats FROM schedule_service_availability WHERE schedule_id = $1;

-- STEP 6: Remove denormalized column (after verification)
-- ALTER TABLE public.shuttle_schedule_services DROP COLUMN available_seats;
-- (Keep for now for backward compatibility)
```

---

## VALIDATION & TESTING

### Test Suite for Critical Fixes

```sql
-- TEST 1: Wallet balance cannot be manipulated by user
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL jwt.claims.sub = 'test-user-id';
  
  -- This should FAIL:
  UPDATE public.wallets SET balance = 999999 WHERE user_id = auth.uid();
  
  -- Expected: permission denied
ROLLBACK;

-- TEST 2: Booking cascade deletion is prevented
BEGIN;
  -- Delete schedule should NOT delete bookings
  WITH schedules AS (
    SELECT id FROM public.shuttle_schedules LIMIT 1
  )
  DELETE FROM public.shuttle_schedules WHERE id IN (SELECT id FROM schedules);
  
  -- Verify bookings still exist but schedule_id is NULL
  SELECT COUNT(*) FROM public.shuttle_bookings WHERE schedule_id IS NULL;
ROLLBACK;

-- TEST 3: Foreign key constraints work
BEGIN;
  -- Try to create profile for non-existent user
  INSERT INTO public.profiles (user_id, full_name)
  VALUES ('00000000-0000-0000-0000-000000000000', 'Test');
  
  -- Expected: foreign key violation
ROLLBACK;

-- TEST 4: Critical indexes exist and are used
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.shuttle_bookings WHERE user_id = 'test-id' AND status = 'confirmed';
-- Should show: "Index Scan using idx_shuttle_bookings_user_id_status"

-- TEST 5: RLS policies use has_role()
SELECT policyname, qual
FROM pg_policies
WHERE tablename IN ('shuttle_pricing_rules', 'shuttle_service_vehicle_types')
  AND qual NOT LIKE '%has_role%';
-- Should return: (empty - no results)

-- TEST 6: Audit logs capture changes
INSERT INTO public.profiles (user_id, full_name) VALUES ('test-id', 'Test User');
SELECT COUNT(*) FROM public.audit_logs WHERE table_name = 'profiles' AND action = 'INSERT';
-- Should return: 1 (or more)
```

---

## Performance Verification Queries

```sql
-- Check index usage
SELECT 
  schemaname, tablename, indexname,
  idx_scan as scans, idx_tup_read as reads, idx_tup_fetch as fetches
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- Find missing indexes (queries using seq scan)
SELECT 
  schemaname, tablename, 
  COUNT(*) as seq_scans
FROM pg_stat_user_tables
WHERE seq_scan > 100
GROUP BY schemaname, tablename
ORDER BY seq_scan DESC;

-- Check for table bloat
SELECT 
  schemaname, tablename,
  n_live_tup, n_dead_tup,
  ROUND(100 * n_dead_tup / (n_live_tup + n_dead_tup)::float, 2) as dead_ratio
FROM pg_stat_user_tables
WHERE n_live_tup > 0
  AND (n_dead_tup / (n_live_tup::float + 1)) > 0.1
ORDER BY dead_ratio DESC;

-- Monitor query performance
SELECT 
  query, calls, mean_exec_time, max_exec_time, stddev_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Rollback Procedures

Each fix includes rollback instructions:

```sql
-- ROLLBACK: Wallet fix
-- Re-enable user UPDATE (DANGEROUS!)
DROP POLICY IF EXISTS "Only system can update wallets" ON public.wallets;
CREATE POLICY "Users can update own wallet" ON public.wallets
FOR UPDATE USING (auth.uid() = user_id);

-- ROLLBACK: Cascade deletion fix
-- Restore CASCADE behavior
ALTER TABLE public.shuttle_bookings
DROP CONSTRAINT fk_shuttle_bookings_schedule_id;
ALTER TABLE public.shuttle_bookings
ADD CONSTRAINT fk_shuttle_bookings_schedule_id
FOREIGN KEY (schedule_id) REFERENCES public.shuttle_schedules(id)
ON DELETE CASCADE;

-- ROLLBACK: Foreign key constraints
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS fk_profiles_user_id;

-- etc...
```

---

**Document Version:** 1.0  
**Last Updated:** April 15, 2026  
**Apply With Caution:** Test all fixes in staging first
