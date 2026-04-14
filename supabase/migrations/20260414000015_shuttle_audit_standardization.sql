-- Migration: Standardize Shuttle Schema and Audit Fields
-- Description: Adds created_at, updated_at, and consistency constraints to shuttle tables.

-- 1. Ensure all shuttle tables have standardized audit fields
DO $$ 
BEGIN 
    -- shuttle_routes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shuttle_routes' AND column_name='updated_at') THEN
        ALTER TABLE public.shuttle_routes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- shuttle_rayons
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shuttle_rayons' AND column_name='updated_at') THEN
        ALTER TABLE public.shuttle_rayons ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- shuttle_pickup_points
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shuttle_pickup_points' AND column_name='updated_at') THEN
        ALTER TABLE public.shuttle_pickup_points ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 2. Add useful constraints for data integrity
-- Ensure base_fare is never negative
ALTER TABLE public.shuttle_routes DROP CONSTRAINT IF EXISTS shuttle_routes_base_fare_check;
ALTER TABLE public.shuttle_routes ADD CONSTRAINT shuttle_routes_base_fare_check CHECK (base_fare >= 0);

-- Ensure distance_km is positive
ALTER TABLE public.shuttle_routes DROP CONSTRAINT IF EXISTS shuttle_routes_distance_check;
ALTER TABLE public.shuttle_routes ADD CONSTRAINT shuttle_routes_distance_check CHECK (distance_km > 0);

-- 3. Create or Update indexes for performance
CREATE INDEX IF NOT EXISTS idx_shuttle_bookings_user_id ON public.shuttle_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_schedules_departure_time ON public.shuttle_schedules(departure_time);
CREATE INDEX IF NOT EXISTS idx_shuttle_seats_schedule_id ON public.shuttle_seats(schedule_id);

-- 4. Documentation for API Endpoints (Comment-based for Supabase)
COMMENT ON TABLE public.shuttle_routes IS 'Core shuttle route configuration for both User and Admin flows.';
COMMENT ON TABLE public.shuttle_bookings IS 'Stores all validated bookings with atomic seat reservation logic.';
COMMENT ON FUNCTION public.create_shuttle_booking_atomic_v2 IS 'Primary atomic transaction for creating bookings, verifying prices, and locking seats.';
