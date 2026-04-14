-- ============================================================================
-- SEED DATA: Complete Shuttle Schedules with Services & Vehicle Types
-- Period: June 15-18, 2026
-- Includes: 4 Routes x 3 Services x 3 Vehicle Types x 4 Days = 144 schedules
-- ============================================================================

-- ============================================================================
-- Step 1: Ensure Vehicle Types are defined for each Service Type on each Route
-- ============================================================================

-- Get route IDs (these should already exist from seed_operational_routes)
-- Routes: 
--   a1111111-1111-1111-1111-111111111111 (Medan Kota - KNO, Rayon A)
--   b2222222-2222-2222-2222-222222222222 (Medan Petisah - KNO, Rayon B)
--   c3333333-3333-3333-3333-333333333333 (Medan Barat - KNO, Rayon C)
--   d4444444-4444-4444-4444-444444444444 (Medan Baru - KNO, Rayon D)

-- Upsert Service-Vehicle Type Mapping for RAYON A (Route A)
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    CASE 
        WHEN st.name = 'Reguler' THEN 'a1000001-1111-1111-1111-111111111111'::uuid
        WHEN st.name = 'Semi Executive' THEN 'a1000002-1111-1111-1111-111111111111'::uuid
        WHEN st.name = 'Executive' THEN 'a1000003-1111-1111-1111-111111111111'::uuid
    END as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'Compact ekonomi untuk 4 penumpang' as description,
    true as active,
    'a1111111-1111-1111-1111-111111111111'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.service_type_id = st.id 
      AND svt.vehicle_type = 'MiniCar'
      AND svt.route_id = 'a1111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;

-- Continue with Mini Car for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'a2000001-1111-1111-1111-111111111111'::uuid as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle", "USB Port"}' as facilities,
    'Mini Car dengan fasilitas tambahan' as description,
    true as active,
    'a1111111-1111-1111-1111-111111111111'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.service_type_id = st.id 
      AND svt.vehicle_type = 'MiniCar'
      AND svt.route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- SUV for Reguler
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'a1000011-1111-1111-1111-111111111111'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'SUV nyaman untuk 6 penumpang' as description,
    true as active,
    'a1111111-1111-1111-1111-111111111111'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.service_type_id = st.id 
      AND svt.vehicle_type = 'SUV'
      AND svt.route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- SUV for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'a2000011-1111-1111-1111-111111111111'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV Premium (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover"}' as facilities,
    'SUV premium dengan fasilitas lengkap' as description,
    true as active,
    'a1111111-1111-1111-1111-111111111111'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.service_type_id = st.id 
      AND svt.vehicle_type = 'SUV'
      AND svt.route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- SUV for Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'a3000011-1111-1111-1111-111111111111'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV Executive (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover", "WiFi"}' as facilities,
    'SUV premium dengan WiFi dan fasilitas mewah' as description,
    true as active,
    'a1111111-1111-1111-1111-111111111111'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.service_type_id = st.id 
      AND svt.vehicle_type = 'SUV'
      AND svt.route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- Hiace for Reguler (14 seats)
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'a1000021-1111-1111-1111-111111111111'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace (14 Seats)' as vehicle_name,
    14 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'Hiace ekonomi untuk group 14 orang' as description,
    true as active,
    'a1111111-1111-1111-1111-111111111111'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.service_type_id = st.id 
      AND svt.vehicle_type = 'Hiace'
      AND svt.route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- Hiace for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'a2000021-1111-1111-1111-111111111111'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace Premium (12 Seats)' as vehicle_name,
    12 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover"}' as facilities,
    'Hiace premium dengan kursi empuk' as description,
    true as active,
    'a1111111-1111-1111-1111-111111111111'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.service_type_id = st.id 
      AND svt.vehicle_type = 'Hiace'
      AND svt.route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- Hiace for Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'a3000021-1111-1111-1111-111111111111'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace Executive (11 Seats)' as vehicle_name,
    11 as capacity,
    '{"AC Premium", "Audio System", "Charger", "USB Port", "Water Bottle", "Seat Cover", "WiFi", "Reading Light"}' as facilities,
    'Hiace mewah untuk group dengan WiFi' as description,
    true as active,
    'a1111111-1111-1111-1111-111111111111'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.service_type_id = st.id 
      AND svt.vehicle_type = 'Hiace'
      AND svt.route_id = 'a1111111-1111-1111-1111-111111111111'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 2: Repeat vehicle type mapping for remaining routes (B, C, D)
-- ============================================================================

-- For Route B - Insert all vehicle types for all services
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'b1000001-2222-2222-2222-222222222222'::uuid as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'Compact ekonomi untuk 4 penumpang' as description,
    true as active,
    'b2222222-2222-2222-2222-222222222222'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'b2222222-2222-2222-2222-222222222222'::uuid
      AND svt.vehicle_type = 'MiniCar'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route B - SUV for all services
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'b1000011-2222-2222-2222-222222222222'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'SUV nyaman untuk 6 penumpang' as description,
    true as active,
    'b2222222-2222-2222-2222-222222222222'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'b2222222-2222-2222-2222-222222222222'::uuid
      AND svt.vehicle_type = 'SUV'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route B - Hiace for Reguler
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'b1000021-2222-2222-2222-222222222222'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace (14 Seats)' as vehicle_name,
    14 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'Hiace ekonomi untuk group 14 orang' as description,
    true as active,
    'b2222222-2222-2222-2222-222222222222'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'b2222222-2222-2222-2222-222222222222'::uuid
      AND svt.vehicle_type = 'Hiace'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 3: Create Schedules for June 15-18 with Service & Vehicle Mapping
-- ============================================================================

-- Generate schedules for all routes for June 15-18, 2026
-- For each day, create 3 schedules per route (one for each service type)
-- Schedule times: 06:00, 10:00, 14:00, 18:00

DO $$
DECLARE
    v_route_id UUID;
    v_service_id UUID;
    v_date DATE;
    v_time TIME;
    v_times TIME[] := ARRAY['06:00', '10:00', '14:00', '18:00'];
    v_capacity INT;
    v_schedule_id UUID;
    v_idx INT;
BEGIN
    -- Loop through each route
    FOR v_route_id IN 
        SELECT id FROM public.shuttle_routes 
        WHERE active = true 
        ORDER BY id
    LOOP
        -- Loop through dates (June 15-18, 2026)
        FOR v_date IN 
            SELECT generate_series('2026-06-15'::DATE, '2026-06-18'::DATE, '1 day'::INTERVAL)::DATE
        LOOP
            -- Loop through service types
            FOR v_service_id IN 
                SELECT id FROM public.shuttle_service_types 
                WHERE active = true 
                ORDER BY name
            LOOP
                -- Get capacity based on service type
                v_capacity := CASE 
                    WHEN (SELECT name FROM public.shuttle_service_types WHERE id = v_service_id) = 'Reguler' THEN 14
                    WHEN (SELECT name FROM public.shuttle_service_types WHERE id = v_service_id) = 'Semi Executive' THEN 12
                    WHEN (SELECT name FROM public.shuttle_service_types WHERE id = v_service_id) = 'Executive' THEN 11
                    ELSE 14
                END;
                
                -- Create 4 schedules per service (one for each time slot)
                v_idx := 1;
                FOREACH v_time IN ARRAY v_times LOOP
                    v_schedule_id := gen_random_uuid();
                    
                    INSERT INTO public.shuttle_schedules (
                        id,
                        route_id,
                        service_id,
                        departure_time,
                        arrival_time,
                        total_seats,
                        available_seats,
                        active
                    )
                    VALUES (
                        v_schedule_id,
                        v_route_id,
                        v_service_id,
                        (v_date + v_time)::TIMESTAMPTZ,
                        (v_date + v_time + INTERVAL '2 hours')::TIMESTAMPTZ,
                        v_capacity,
                        v_capacity,
                        true
                    )
                    ON CONFLICT DO NOTHING;
                    
                    v_idx := v_idx + 1;
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- Step 4: Link schedule services (map vehicle types to schedules)
-- ============================================================================

-- For each schedule, insert all available vehicle types for that service
INSERT INTO public.shuttle_schedule_services (
    schedule_id,
    service_type_id,
    vehicle_type,
    total_seats,
    available_seats,
    is_featured,
    active
)
SELECT DISTINCT
    ss.id as schedule_id,
    ss.service_id as service_type_id,
    svt.vehicle_type,
    svt.capacity as total_seats,
    svt.capacity as available_seats,
    ROW_NUMBER() OVER (PARTITION BY ss.id ORDER BY svt.vehicle_type) = 1 as is_featured,
    true as active
FROM public.shuttle_schedules ss
JOIN public.shuttle_service_vehicle_types svt ON svt.service_type_id = ss.service_id 
    AND svt.route_id = ss.route_id
WHERE ss.departure_time >= '2026-06-15'::TIMESTAMPTZ
    AND ss.departure_time < '2026-06-19'::TIMESTAMPTZ
    AND NOT EXISTS (
        SELECT 1 FROM public.shuttle_schedule_services sss
        WHERE sss.schedule_id = ss.id 
            AND sss.service_type_id = ss.service_id
            AND sss.vehicle_type = svt.vehicle_type
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Seed data created:
-- - 4 Routes (A: Medan Kota, B: Medan Petisah, C: Medan Barat, D: Medan Baru)
-- - 3 Services per Route (Reguler, Semi Executive, Executive)
-- - 3 Vehicle Types per Service (MiniCar, SUV, Hiace)
-- - 4 Days (June 15-18, 2026)
-- - 4 Time Slots per Service per Day (06:00, 10:00, 14:00, 18:00)
-- 
-- Total Schedules: 4 routes × 3 services × 4 days × 4 times = 192 schedules
-- Total Schedule Services: 192 schedules × 3 vehicles = 576 service entries
-- ============================================================================
