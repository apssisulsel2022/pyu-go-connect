-- ============================================================================
-- SEED DATA: Vehicle Type Mappings for Routes C & D
-- Routes: 
--   c3333333-3333-3333-3333-333333333333 (Medan Barat - KNO)
--   d4444444-4444-4444-4444-444444444444 (Medan Baru - KNO)
-- ============================================================================

-- ============================================================================
-- Route C (Medan Barat - KNO): MiniCar for all services
-- ============================================================================

INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c1000001-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'Compact ekonomi untuk 4 penumpang' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'MiniCar'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route C - MiniCar for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c2000001-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle", "USB Port"}' as facilities,
    'Mini Car dengan fasilitas tambahan' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'MiniCar'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route C - MiniCar for Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c3000001-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car Premium (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover"}' as facilities,
    'Mini Car premium dengan fasilitas lengkap' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'MiniCar'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Route C: SUV for all services
-- ============================================================================

INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c1000011-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'SUV nyaman untuk 6 penumpang' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'SUV'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route C - SUV for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c2000011-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV Premium (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover"}' as facilities,
    'SUV premium dengan fasilitas lengkap' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'SUV'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route C - SUV for Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c3000011-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV VIP (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover", "Mini Bar"}' as facilities,
    'SUV VIP dengan semua fasilitas premium' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'SUV'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Route C: Hiace for all services
-- ============================================================================

INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c1000021-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace (14 Seats)' as vehicle_name,
    14 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'Hiace ekonomi untuk group 14 orang' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'Hiace'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route C - Hiace for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c2000021-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace Premium (12 Seats)' as vehicle_name,
    12 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover"}' as facilities,
    'Hiace premium untuk 12 penumpang' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'Hiace'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route C - Hiace for Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'c3000021-3333-3333-3333-333333333333'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace VIP (11 Seats)' as vehicle_name,
    11 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover", "Mini Bar"}' as facilities,
    'Hiace VIP dengan semua fasilitas premium' as description,
    true as active,
    'c3333333-3333-3333-3333-333333333333'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'c3333333-3333-3333-3333-333333333333'::uuid
      AND svt.vehicle_type = 'Hiace'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Route D (Medan Baru - KNO): MiniCar for all services
-- ============================================================================

INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd1000001-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'Compact ekonomi untuk 4 penumpang' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'MiniCar'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route D - MiniCar for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd2000001-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle", "USB Port"}' as facilities,
    'Mini Car dengan fasilitas tambahan' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'MiniCar'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route D - MiniCar for Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd3000001-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'MiniCar' as vehicle_type,
    'Mini Car Premium (4 Seats)' as vehicle_name,
    4 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle", "USB Port", "Seat Cover"}' as facilities,
    'Mini Car premium dengan fasilitas lengkap' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'MiniCar'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Route D: SUV for all services
-- ============================================================================

INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd1000011-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'SUV nyaman untuk 6 penumpang' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'SUV'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route D - SUV for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd2000011-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV Premium (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover"}' as facilities,
    'SUV premium dengan fasilitas lengkap' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'SUV'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route D - SUV for Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd3000011-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'SUV' as vehicle_type,
    'SUV VIP (6 Seats)' as vehicle_name,
    6 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover", "Mini Bar"}' as facilities,
    'SUV VIP dengan semua fasilitas premium' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'SUV'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Route D: Hiace for all services
-- ============================================================================

INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd1000021-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace (14 Seats)' as vehicle_name,
    14 as capacity,
    '{"AC", "Audio", "Charger", "Water Bottle"}' as facilities,
    'Hiace ekonomi untuk group 14 orang' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Reguler'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'Hiace'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route D - Hiace for Semi Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd2000021-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace Premium (12 Seats)' as vehicle_name,
    12 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover"}' as facilities,
    'Hiace premium untuk 12 penumpang' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Semi Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'Hiace'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- Route D - Hiace for Executive
INSERT INTO public.shuttle_service_vehicle_types (id, service_type_id, vehicle_type, vehicle_name, capacity, facilities, description, active, route_id)
SELECT 
    'd3000021-4444-4444-4444-444444444444'::uuid as id,
    st.id as service_type_id,
    'Hiace' as vehicle_type,
    'Hiace VIP (11 Seats)' as vehicle_name,
    11 as capacity,
    '{"AC", "Audio", "Charger", "USB Port", "Water Bottle", "Seat Cover", "Mini Bar"}' as facilities,
    'Hiace VIP dengan semua fasilitas premium' as description,
    true as active,
    'd4444444-4444-4444-4444-444444444444'::uuid as route_id
FROM public.shuttle_service_types st
WHERE st.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM public.shuttle_service_vehicle_types svt 
    WHERE svt.route_id = 'd4444444-4444-4444-4444-444444444444'::uuid
      AND svt.vehicle_type = 'Hiace'
      AND svt.service_type_id = st.id
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Route C (Medan Barat - KNO) Vehicle Type Mappings:
-- - MiniCar: Reguler, Semi Executive, Executive (3 mappings)
-- - SUV: Reguler, Semi Executive, Executive (3 mappings)
-- - Hiace (14/12/11 seats): Reguler, Semi Executive, Executive (3 mappings)
-- Total: 9 mappings for Route C
--
-- Route D (Medan Baru - KNO) Vehicle Type Mappings:
-- - MiniCar: Reguler, Semi Executive, Executive (3 mappings)
-- - SUV: Reguler, Semi Executive, Executive (3 mappings)
-- - Hiace (14/12/11 seats): Reguler, Semi Executive, Executive (3 mappings)
-- Total: 9 mappings for Route D
--
-- Combined with existing Routes A & B:
-- Total Vehicle Type Mappings: 4 routes × 3 services × 3 vehicles = 36 mappings
-- These enable schedule generation for June 15-18: 192 schedules × 3 vehicles = 576 schedule services
-- ============================================================================
