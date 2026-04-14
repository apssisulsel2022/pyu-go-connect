-- Seed Rayon and Pickup Point Data for PYU-GO routes
-- Based on provided flow chart images

-- 1. Ensure routes exist first
INSERT INTO public.shuttle_routes (id, name, origin, destination, distance_km, base_fare, active)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Medan Kota - Kualanamu', 'Hermes Palace', 'KNO', 58.25, 110000, true),
  ('b2222222-2222-2222-2222-222222222222', 'Medan Petisah - Kualanamu', 'Cambridge', 'KNO', 65.52, 125000, true),
  ('c3333333-3333-3333-3333-333333333333', 'Medan Barat - Kualanamu', 'Adi Mulia', 'KNO', 31.40, 60000, true),
  ('d4444444-4444-4444-4444-444444444444', 'Medan Baru - Kualanamu', 'Hotel TD Pardede', 'KNO', 63.80, 120000, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Rayons
INSERT INTO public.shuttle_rayons (id, route_id, name, description, active)
VALUES
  ('aa111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Rayon A', 'Area Medan Kota via Istana Maimun & Amplas', true),
  ('bb222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'Rayon B', 'Area Medan Petisah via Asrama Haji', true),
  ('cc333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Rayon C', 'Area Medan Barat via Tol Bandar Selamat', true),
  ('dd444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 'Rayon D', 'Area Medan Baru via RS USU & Simpang Amplas', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Pickup Points for Rayon A
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 1, 'Hermes Palace', '06:00', 0, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 1);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 2, 'Kama Hotel', '06:05', 700, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 2);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 3, 'Travel suite', '06:10', 950, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 3);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 4, 'RS Columbia Asia', '06:12', 190, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 4);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 5, 'Selecta', '06:14', 110, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 5);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 6, 'Danau Toba', '06:19', 400, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 6);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 7, 'LePolonia', '06:23', 950, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 7);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 8, 'Istana Maimun', '06:31', 2000, 105000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 8);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 9, 'Mesjid Raya', '06:34', 450, 105000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 9);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 10, 'Grand Antares', '06:46', 4100, 100000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 10);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 11, 'Antares', '06:53', 2100, 100000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 11);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 12, 'Simp Marendal Arom', '07:16', 7100, 95000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 12);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 13, 'RM Khas Mandailing', '07:26', 3400, 90000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 13);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'aa111111-1111-1111-1111-111111111111', 14, 'SimpAmplas', '07:39', 4800, 85000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'aa111111-1111-1111-1111-111111111111' AND stop_order = 14);

-- 4. Seed Pickup Points for Rayon B
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 1, 'Cambridge', '06:00', 0, 125000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 1);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 2, 'Swiss Bellin Gajah', '06:05', 1400, 125000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 2);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 3, 'Grand Darussalam', '06:08', 750, 125000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 3);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 4, 'Sulthan Hotel', '06:10', 160, 125000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 4);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 5, 'Grand Kanaya', '06:12', 160, 125000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 5);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 6, 'Four Point', '06:15', 450, 125000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 6);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 7, 'Manhattan', '06:25', 3600, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 7);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 8, 'Saka Hotel', '06:29', 750, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 8);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 9, 'Grand Jamee', '06:33', 950, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 9);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 10, 'Sky View Apart', '06:47', 5200, 115000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 10);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 11, 'The K-Hotel', '06:58', 3700, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 11);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 12, 'Simpang Pos', '07:04', 2000, 105000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 12);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 13, 'Asrama Haji Medan', '07:11', 2800, 100000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 13);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 14, 'RS Mitra Sejati', '07:16', 1600, 100000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 14);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 15, 'Simpang Marendal', '07:28', 4400, 95000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 15);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 16, 'Depan Bus ALS', '07:39', 3600, 90000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 16);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 17, 'RS Mitra Medika Amp', '07:48', 2800, 85000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 17);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'bb222222-2222-2222-2222-222222222222', 18, 'Tol Simpang Amplas', '07:52', 1200, 85000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'bb222222-2222-2222-2222-222222222222' AND stop_order = 18);

-- 5. Seed Pickup Points for Rayon C
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 1, 'Adi Mulia', '06:00', 0, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 1);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 2, 'Santika', '06:03', 450, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 2);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 3, 'Arya Duta', '06:05', 240, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 3);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 4, 'Aston Grand City Hall', '06:08', 230, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 4);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 5, 'Grand Inna', '06:10', 130, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 5);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 6, 'Reiz Suite Artotel', '06:13', 450, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 6);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 7, 'Podomoro', '06:18', 700, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 7);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 8, 'JW Marriot', '06:23', 750, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 8);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 9, 'Emerald Garden', '06:28', 750, 60000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 9);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 10, 'Grand Mercure', '06:38', 1600, 55000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 10);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 11, 'RS Columbia Asia Aks', '06:50', 4800, 50000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 11);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'cc333333-3333-3333-3333-333333333333', 12, 'Tol Bandar Selamat', '06:55', 1300, 45000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'cc333333-3333-3333-3333-333333333333' AND stop_order = 12);

-- 6. Seed Pickup Points for Rayon D
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 1, 'Hotel TD Pardede', '06:00', 0, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 1);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 2, 'Hermes Palace', '06:10', 2400, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 2);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 3, 'Ibis Styles', '06:21', 3500, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 3);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 4, 'Fave Hotel', '06:24', 850, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 4);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 5, 'Masjid Al Jihad', '06:29', 1300, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 5);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 6, 'Hotel Deli', '06:31', 550, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 6);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 7, 'Grand Central', '06:33', 350, 120000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 7);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 8, 'Grand Impression Hot', '06:38', 1600, 115000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 8);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 9, 'RAZ Hotel', '06:40', 550, 115000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 9);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 10, 'Rumah Sakit USU', '06:45', 1600, 110000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 10);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 11, 'Grand Dhika Hotel', '07:01', 2000, 105000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 11);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 12, 'Sky View Apart', '07:09', 2400, 100000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 12);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 13, 'Simpang Harmonika', '07:15', 1800, 95000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 13);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 14, 'Citra Garden', '07:23', 3700, 90000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 14);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 15, 'Simpang POS', '07:32', 2700, 85000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 15);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 16, 'Asrama Haji', '07:39', 2800, 80000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 16);
INSERT INTO public.shuttle_pickup_points (rayon_id, stop_order, name, departure_time, distance_meters, fare, active)
SELECT 'dd444444-4444-4444-4444-444444444444', 17, 'Simpang Amplas', '07:55', 5900, 75000, true
WHERE NOT EXISTS (SELECT 1 FROM public.shuttle_pickup_points WHERE rayon_id = 'dd444444-4444-4444-4444-444444444444' AND stop_order = 17);
