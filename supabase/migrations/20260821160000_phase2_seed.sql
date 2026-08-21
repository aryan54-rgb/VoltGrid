-- ============================================================================
-- Phase 2 (part 2 of 2): seed data
--
-- GENERATED from src/data/*.js -- do not hand-edit. Regenerate with the script
-- described in SUPABASE_HANDOVER.md if the demo dataset ever changes.
--
-- Every insert is idempotent, so this file can be replayed safely.
--
-- The 14 profiles below have no rows in auth.users: they are the demo cast the
-- UI was designed around. One per role is flagged is_demo_persona, and
-- public.demo_persona_id() hands a signed-in user that persona's data on top of
-- their own -- which is why a brand-new account still sees a populated app.
-- ============================================================================

INSERT INTO public.profiles (id, name, email, role, status, sessions, joined, spend, company, vehicle, plan, points, handle, avatar_color, is_demo, is_demo_persona) VALUES
  ('00000000-0000-4000-8000-000000001001', 'Jordan Lee', 'jordan.lee@example.com', 'driver', 'active', 142, '2024-03-12', 1240, NULL, 'Tesla Model 3 LR', 'VoltGrid Plus', 4210, NULL, NULL, true, true),
  ('00000000-0000-4000-8000-000000001002', 'Maya Chen', 'maya.chen@example.com', 'driver', 'active', 238, '2023-11-04', 2105, NULL, NULL, NULL, 4515, '@mayaev', 'bg-emerald-500', true, false),
  ('00000000-0000-4000-8000-000000001003', 'Sofia Marino', 'sofia@swiftlogistics.com', 'fleet', 'active', 342, '2023-08-02', 12480, 'Swift Logistics', NULL, NULL, 0, NULL, NULL, true, true),
  ('00000000-0000-4000-8000-000000001004', 'Marcus Webb', 'marcus@voltgrid.network', 'operator', 'active', 0, '2022-11-20', 0, 'VoltGrid Network', NULL, NULL, 0, NULL, NULL, true, true),
  ('00000000-0000-4000-8000-000000001006', 'Diego Ramírez', 'diego.r@example.com', 'driver', 'active', 96, '2024-06-19', 890, NULL, NULL, NULL, 3720, '@dgo_drives', 'bg-blue-500', true, false),
  ('00000000-0000-4000-8000-000000001007', 'Priya Nair', 'priya.n@example.com', 'driver', 'active', 64, '2025-01-08', 512, NULL, NULL, NULL, 870, '@priya.n', 'bg-violet-500', true, false),
  ('00000000-0000-4000-8000-000000001008', 'Sam Okafor', 'sam.o@example.com', 'driver', 'active', 187, '2023-05-30', 1730, NULL, NULL, NULL, 4820, '@samo_k', 'bg-orange-500', true, false),
  ('00000000-0000-4000-8000-000000001009', 'Lena Fischer', 'lena.f@example.com', 'driver', 'suspended', 51, '2024-09-22', 402, NULL, NULL, NULL, 3980, '@lenaf', 'bg-pink-500', true, false),
  ('00000000-0000-4000-8000-000000001010', 'Chen Wei', 'chen.wei@metrofleet.io', 'fleet', 'active', 210, '2024-02-11', 8320, 'Swift Logistics', NULL, NULL, 0, NULL, NULL, true, false),
  ('00000000-0000-4000-8000-000000001011', 'Amara Diallo', 'amara@citycharge.co', 'operator', 'active', 0, '2023-09-15', 0, NULL, NULL, NULL, 0, NULL, NULL, true, false),
  ('00000000-0000-4000-8000-000000001012', 'Tom Becker', 'tom.b@example.com', 'driver', 'pending', 0, '2026-07-28', 0, NULL, NULL, NULL, 0, NULL, NULL, true, false),
  ('00000000-0000-4000-8000-000000001013', 'Nina Rossi', 'nina.r@example.com', 'driver', 'active', 78, '2024-12-03', 640, NULL, NULL, NULL, 1088, NULL, NULL, true, false),
  ('00000000-0000-4000-8000-000000001015', 'Grace Kim', 'grace.k@example.com', 'driver', 'active', 119, '2023-12-17', 1015, NULL, NULL, NULL, 1726, NULL, NULL, true, false),
  ('00000000-0000-4000-8000-000000001000', 'Ravi Patel', 'ravi@voltgrid.com', 'admin', 'active', 0, '2021-06-01', 0, NULL, NULL, NULL, 0, NULL, NULL, true, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role,
    status = EXCLUDED.status, sessions = EXCLUDED.sessions, joined = EXCLUDED.joined,
    spend = EXCLUDED.spend, company = EXCLUDED.company, vehicle = EXCLUDED.vehicle,
    plan = EXCLUDED.plan, points = EXCLUDED.points, handle = EXCLUDED.handle,
    avatar_color = EXCLUDED.avatar_color, is_demo = true, is_demo_persona = EXCLUDED.is_demo_persona;

INSERT INTO public.stations (id, name, address, city, distance, rating, reviews, price_per_kwh, status, x, y, amenities, hours, operator, utilization) VALUES
  ('st-01', 'Volta Plaza Supercharge', '1201 Market Street', 'San Francisco, CA', 0.8, 4.8, 214, 0.42, 'online', 24, 28, ARRAY['Cafe','WiFi','Restrooms','Lounge','24/7'], 'Open 24 hours', 'VoltGrid Network', 72),
  ('st-02', 'Harborview Charging Hub', '88 Embarcadero Blvd', 'San Francisco, CA', 1.4, 4.6, 158, 0.38, 'online', 63, 22, ARRAY['Restrooms','Shopping','WiFi'], '6:00 AM – 11:00 PM', 'ChargeWest', 64),
  ('st-03', 'Greenline Depot', '450 Mission Rock St', 'San Francisco, CA', 2.1, 4.4, 96, 0.35, 'in-use', 44, 47, ARRAY['Cafe','24/7','Covered'], 'Open 24 hours', 'VoltGrid Network', 91),
  ('st-04', 'Sunset Park & Charge', '2210 Judah Street', 'San Francisco, CA', 3.5, 4.2, 61, 0.31, 'online', 14, 58, ARRAY['Park','Restrooms'], '5:00 AM – midnight', 'CityCharge', 43),
  ('st-05', 'Mission Bay Fast Lane', '700 Terry A Francois Blvd', 'San Francisco, CA', 2.7, 4.7, 183, 0.45, 'maintenance', 76, 42, ARRAY['Lounge','WiFi','24/7'], 'Open 24 hours', 'VoltGrid Network', 0),
  ('st-06', 'Presidio Gateway', '210 Lincoln Blvd', 'San Francisco, CA', 4.2, 4.5, 74, 0.4, 'online', 33, 12, ARRAY['Park','Cafe'], '6:00 AM – 10:00 PM', 'ChargeWest', 38),
  ('st-07', 'Dogpatch Power Yard', '990 22nd Street', 'San Francisco, CA', 3.1, 4.1, 42, 0.33, 'offline', 58, 60, ARRAY['Covered'], 'Open 24 hours', 'CityCharge', 0),
  ('st-08', 'Twin Peaks Vista Chargers', '74 Christmas Tree Point Rd', 'San Francisco, CA', 5.6, 4.9, 129, 0.44, 'online', 27, 44, ARRAY['Vista','WiFi','24/7'], 'Open 24 hours', 'VoltGrid Network', 57)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
    distance = EXCLUDED.distance, rating = EXCLUDED.rating, reviews = EXCLUDED.reviews,
    price_per_kwh = EXCLUDED.price_per_kwh, status = EXCLUDED.status, x = EXCLUDED.x,
    y = EXCLUDED.y, amenities = EXCLUDED.amenities, hours = EXCLUDED.hours,
    operator = EXCLUDED.operator, utilization = EXCLUDED.utilization;

INSERT INTO public.connectors (id, station_id, label, type, power_kw, status, energy_today_kwh, uptime_pct, last_serviced) VALUES
  ('st-01-c11', 'st-01', 'A1', 'CCS2', 250, 'AVAILABLE', 0, 95, '2026-01-11'),
  ('st-01-c12', 'st-01', 'A2', 'CCS2', 250, 'AVAILABLE', 111, 96, '2026-01-12'),
  ('st-01-c13', 'st-01', 'A3', 'CCS2', 250, 'AVAILABLE', 221, 97, '2026-01-13'),
  ('st-01-c14', 'st-01', 'A4', 'CCS2', 250, 'RESERVED', 332, 98, '2026-01-11'),
  ('st-01-c15', 'st-01', 'A5', 'CCS2', 250, 'AVAILABLE', 102, 99, '2026-01-12'),
  ('st-01-c16', 'st-01', 'A6', 'CCS2', 250, 'OCCUPIED', 213, 95, '2026-01-13'),
  ('st-01-c17', 'st-01', 'A7', 'CCS2', 250, 'OCCUPIED', 323, 96, '2026-01-11'),
  ('st-01-c18', 'st-01', 'A8', 'CCS2', 250, 'OCCUPIED', 94, 97, '2026-01-12'),
  ('st-01-c21', 'st-01', 'B1', 'CHAdeMO', 100, 'AVAILABLE', 0, 95, '2026-01-11'),
  ('st-01-c22', 'st-01', 'B2', 'CHAdeMO', 100, 'OCCUPIED', 111, 96, '2026-01-12'),
  ('st-02-c11', 'st-02', 'A1', 'CCS2', 150, 'AVAILABLE', 60, 96, '2026-02-11'),
  ('st-02-c12', 'st-02', 'A2', 'CCS2', 150, 'AVAILABLE', 170, 97, '2026-02-12'),
  ('st-02-c13', 'st-02', 'A3', 'CCS2', 150, 'OCCUPIED', 281, 98, '2026-02-13'),
  ('st-02-c14', 'st-02', 'A4', 'CCS2', 150, 'FAULTED', 51, 99, '2026-02-11'),
  ('st-02-c15', 'st-02', 'A5', 'CCS2', 150, 'OCCUPIED', 162, 95, '2026-02-12'),
  ('st-02-c16', 'st-02', 'A6', 'CCS2', 150, 'OCCUPIED', 272, 96, '2026-02-13'),
  ('st-02-c21', 'st-02', 'B1', 'Type 2', 22, 'AVAILABLE', 60, 96, '2026-02-11'),
  ('st-02-c22', 'st-02', 'B2', 'Type 2', 22, 'AVAILABLE', 170, 97, '2026-02-12'),
  ('st-02-c23', 'st-02', 'B3', 'Type 2', 22, 'RESERVED', 281, 98, '2026-02-13'),
  ('st-02-c24', 'st-02', 'B4', 'Type 2', 22, 'AVAILABLE', 51, 99, '2026-02-11'),
  ('st-03-c11', 'st-03', 'A1', 'CCS2', 350, 'OCCUPIED', 119, 97, '2026-03-11'),
  ('st-03-c12', 'st-03', 'A2', 'CCS2', 350, 'OCCUPIED', 230, 98, '2026-03-12'),
  ('st-03-c13', 'st-03', 'A3', 'CCS2', 350, 'FAULTED', 0, 99, '2026-03-13'),
  ('st-03-c14', 'st-03', 'A4', 'CCS2', 350, 'OCCUPIED', 111, 95, '2026-03-11'),
  ('st-03-c21', 'st-03', 'B1', 'Type 2', 11, 'AVAILABLE', 119, 97, '2026-03-11'),
  ('st-03-c22', 'st-03', 'B2', 'Type 2', 11, 'RESERVED', 230, 98, '2026-03-12'),
  ('st-03-c23', 'st-03', 'B3', 'Type 2', 11, 'AVAILABLE', 0, 99, '2026-03-13'),
  ('st-03-c24', 'st-03', 'B4', 'Type 2', 11, 'OCCUPIED', 111, 95, '2026-03-11'),
  ('st-03-c25', 'st-03', 'B5', 'Type 2', 11, 'OCCUPIED', 221, 96, '2026-03-12'),
  ('st-03-c26', 'st-03', 'B6', 'Type 2', 11, 'OCCUPIED', 332, 97, '2026-03-13'),
  ('st-04-c11', 'st-04', 'A1', 'Type 2', 22, 'RESERVED', 179, 98, '2026-04-11'),
  ('st-04-c12', 'st-04', 'A2', 'Type 2', 22, 'AVAILABLE', 289, 99, '2026-04-12'),
  ('st-04-c13', 'st-04', 'A3', 'Type 2', 22, 'AVAILABLE', 60, 95, '2026-04-13'),
  ('st-04-c14', 'st-04', 'A4', 'Type 2', 22, 'AVAILABLE', 170, 96, '2026-04-11'),
  ('st-04-c15', 'st-04', 'A5', 'Type 2', 22, 'RESERVED', 281, 97, '2026-04-12'),
  ('st-04-c16', 'st-04', 'A6', 'Type 2', 22, 'AVAILABLE', 51, 98, '2026-04-13'),
  ('st-04-c17', 'st-04', 'A7', 'Type 2', 22, 'AVAILABLE', 162, 99, '2026-04-11'),
  ('st-04-c18', 'st-04', 'A8', 'Type 2', 22, 'OCCUPIED', 272, 95, '2026-04-12'),
  ('st-04-c19', 'st-04', 'A9', 'Type 2', 22, 'OCCUPIED', 43, 96, '2026-04-13'),
  ('st-04-c110', 'st-04', 'A10', 'Type 2', 22, 'OCCUPIED', 153, 97, '2026-04-11'),
  ('st-05-c11', 'st-05', 'A1', 'CCS2', 250, 'FAULTED', 238, 99, '2026-05-11'),
  ('st-05-c12', 'st-05', 'A2', 'CCS2', 250, 'FAULTED', 9, 95, '2026-05-12'),
  ('st-05-c13', 'st-05', 'A3', 'CCS2', 250, 'FAULTED', 119, 96, '2026-05-13'),
  ('st-05-c14', 'st-05', 'A4', 'CCS2', 250, 'FAULTED', 230, 97, '2026-05-11'),
  ('st-05-c15', 'st-05', 'A5', 'CCS2', 250, 'FAULTED', 0, 98, '2026-05-12'),
  ('st-05-c16', 'st-05', 'A6', 'CCS2', 250, 'FAULTED', 111, 99, '2026-05-13'),
  ('st-06-c11', 'st-06', 'A1', 'CCS2', 150, 'AVAILABLE', 298, 95, '2026-06-11'),
  ('st-06-c12', 'st-06', 'A2', 'CCS2', 150, 'AVAILABLE', 68, 96, '2026-06-12'),
  ('st-06-c13', 'st-06', 'A3', 'CCS2', 150, 'RESERVED', 179, 97, '2026-06-13'),
  ('st-06-c14', 'st-06', 'A4', 'CCS2', 150, 'OCCUPIED', 289, 98, '2026-06-11'),
  ('st-06-c21', 'st-06', 'B1', 'CHAdeMO', 62, 'AVAILABLE', 298, 95, '2026-06-11'),
  ('st-06-c22', 'st-06', 'B2', 'CHAdeMO', 62, 'AVAILABLE', 68, 96, '2026-06-12'),
  ('st-07-c11', 'st-07', 'A1', 'CCS2', 100, 'FAULTED', 17, 62.4, '2026-01-11'),
  ('st-07-c12', 'st-07', 'A2', 'CCS2', 100, 'FAULTED', 128, 62.4, '2026-01-12'),
  ('st-07-c13', 'st-07', 'A3', 'CCS2', 100, 'FAULTED', 238, 62.4, '2026-01-13'),
  ('st-07-c14', 'st-07', 'A4', 'CCS2', 100, 'FAULTED', 9, 62.4, '2026-01-11'),
  ('st-08-c11', 'st-08', 'A1', 'CCS2', 250, 'RESERVED', 77, 97, '2026-02-11'),
  ('st-08-c12', 'st-08', 'A2', 'CCS2', 250, 'AVAILABLE', 187, 98, '2026-02-12'),
  ('st-08-c13', 'st-08', 'A3', 'CCS2', 250, 'AVAILABLE', 298, 99, '2026-02-13'),
  ('st-08-c14', 'st-08', 'A4', 'CCS2', 250, 'AVAILABLE', 68, 95, '2026-02-11'),
  ('st-08-c15', 'st-08', 'A5', 'CCS2', 250, 'OCCUPIED', 179, 96, '2026-02-12'),
  ('st-08-c16', 'st-08', 'A6', 'CCS2', 250, 'OCCUPIED', 289, 97, '2026-02-13'),
  ('st-08-c21', 'st-08', 'B1', 'Type 2', 22, 'RESERVED', 77, 97, '2026-02-11'),
  ('st-08-c22', 'st-08', 'B2', 'Type 2', 22, 'OCCUPIED', 187, 98, '2026-02-12')
ON CONFLICT (id) DO UPDATE SET
    station_id = EXCLUDED.station_id, label = EXCLUDED.label, type = EXCLUDED.type,
    power_kw = EXCLUDED.power_kw, status = EXCLUDED.status,
    energy_today_kwh = EXCLUDED.energy_today_kwh, uptime_pct = EXCLUDED.uptime_pct,
    last_serviced = EXCLUDED.last_serviced;

-- Availability is not stored: booking_slots is the grid, and a slot counts as
-- taken when a reservation covers it. Only the grid is seeded.
INSERT INTO public.booking_slots (id, label, start_time, end_time, sort_order) VALUES
  ('ts-1', '09:00 AM', '09:00', '09:30', 0),
  ('ts-2', '09:30 AM', '09:30', '10:00', 1),
  ('ts-3', '10:00 AM', '10:00', '10:30', 2),
  ('ts-4', '10:30 AM', '10:30', '11:00', 3),
  ('ts-5', '11:00 AM', '11:00', '11:30', 4),
  ('ts-6', '11:30 AM', '11:30', '12:00', 5),
  ('ts-7', '12:00 PM', '12:00', '12:30', 6),
  ('ts-8', '12:30 PM', '12:30', '13:00', 7),
  ('ts-9', '01:00 PM', '13:00', '13:30', 8),
  ('ts-10', '01:30 PM', '13:30', '14:00', 9),
  ('ts-11', '02:00 PM', '14:00', '14:30', 10),
  ('ts-12', '02:30 PM', '14:30', '15:00', 11)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, sort_order = EXCLUDED.sort_order;

INSERT INTO public.sessions (id, user_id, station_id, connector_id, status, started_at, ended_at, duration, energy_kwh, cost, start_soc, target_soc, current_soc, power_kw, vehicle, power_curve) VALUES
  ('cs-2041', '00000000-0000-4000-8000-000000001001', 'st-01', 'st-01-c13', 'active', '2026-07-30T18:42:00', NULL, NULL, 28.4, 11.93, 24, 90, 61, 187, 'Tesla Model 3 LR', '[{"t":"18:42","kw":62,"soc":24},{"t":"18:47","kw":148,"soc":29},{"t":"18:52","kw":201,"soc":35},{"t":"18:57","kw":224,"soc":42},{"t":"19:02","kw":218,"soc":48},{"t":"19:07","kw":205,"soc":53},{"t":"19:12","kw":193,"soc":57},{"t":"19:17","kw":187,"soc":61}]'::jsonb),
  ('cs-2040', '00000000-0000-4000-8000-000000001001', 'st-02', 'st-02-c11', 'completed', '2026-07-28T09:15:00', '2026-07-28T09:57:00', '0 hours 42 minutes', 38.2, 14.52, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-2036', '00000000-0000-4000-8000-000000001001', 'st-01', 'st-01-c11', 'completed', '2026-07-25T19:05:00', '2026-07-25T19:36:00', '0 hours 31 minutes', 41.7, 17.51, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-2029', '00000000-0000-4000-8000-000000001001', 'st-08', 'st-08-c11', 'completed', '2026-07-22T14:30:00', '2026-07-22T15:25:00', '0 hours 55 minutes', 46, 20.24, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-2025', '00000000-0000-4000-8000-000000001001', 'st-03', 'st-03-c11', 'completed', '2026-07-19T08:00:00', '2026-07-19T08:18:00', '0 hours 18 minutes', 22.5, 7.88, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-2021', '00000000-0000-4000-8000-000000001001', 'st-04', 'st-04-c11', 'completed', '2026-07-16T17:45:00', '2026-07-16T19:55:00', '2 hours 10 minutes', 29.4, 9.11, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-2017', '00000000-0000-4000-8000-000000001001', 'st-01', 'st-01-c11', 'cancelled', '2026-07-13T12:20:00', '2026-07-13T12:28:00', '0 hours 8 minutes', 6.1, 2.56, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-2012', '00000000-0000-4000-8000-000000001001', 'st-06', 'st-06-c11', 'completed', '2026-07-10T10:05:00', '2026-07-10T10:52:00', '0 hours 47 minutes', 39.8, 15.92, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-2008', '00000000-0000-4000-8000-000000001001', 'st-02', 'st-02-c11', 'completed', '2026-07-07T16:40:00', '2026-07-07T17:16:00', '0 hours 36 minutes', 33.5, 12.73, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-2003', '00000000-0000-4000-8000-000000001001', 'st-05', 'st-05-c11', 'completed', '2026-07-03T20:15:00', '2026-07-03T20:40:00', '0 hours 25 minutes', 30.9, 13.91, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-1998', '00000000-0000-4000-8000-000000001001', 'st-01', 'st-01-c21', 'failed', '2026-06-29T11:00:00', '2026-06-29T11:03:00', '0 hours 3 minutes', 0.8, 0.34, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-1994', '00000000-0000-4000-8000-000000001001', 'st-08', 'st-08-c11', 'completed', '2026-06-26T15:30:00', '2026-06-26T16:28:00', '0 hours 58 minutes', 48.2, 21.21, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL),
  ('cs-1990', '00000000-0000-4000-8000-000000001001', 'st-03', 'st-03-c11', 'completed', '2026-06-22T07:50:00', '2026-06-22T08:11:00', '0 hours 21 minutes', 26.7, 9.35, NULL, NULL, NULL, NULL, 'Tesla Model 3 LR', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reservations (id, user_id, station_id, connector_id, date, start_time, end_time, status) VALUES
  ('RS-2041', '00000000-0000-4000-8000-000000001001', 'st-01', 'st-01-c11', '2026-07-31', '09:00', '09:30', 'RESERVED'),
  ('RS-2043', '00000000-0000-4000-8000-000000001001', 'st-02', 'st-02-c13', '2026-08-01', '14:00', '14:30', 'RESERVED'),
  ('RS-2044', '00000000-0000-4000-8000-000000001001', 'st-06', 'st-06-c12', '2026-08-02', '11:30', '12:00', 'RESERVED'),
  ('RS-2038', '00000000-0000-4000-8000-000000001001', 'st-03', 'st-03-c21', '2026-07-30', '10:00', '10:30', 'ACTIVE'),
  ('RS-2029', '00000000-0000-4000-8000-000000001001', 'st-04', 'st-04-c15', '2026-07-26', '13:00', '13:30', 'EXPIRED'),
  ('RS-2022', '00000000-0000-4000-8000-000000001001', 'st-08', 'st-08-c12', '2026-07-22', '09:30', '10:00', 'CANCELLED'),
  ('RS-2018', '00000000-0000-4000-8000-000000001001', 'st-01', 'st-01-c14', '2026-07-18', '12:00', '12:30', 'EXPIRED'),
  ('RS-2045', '00000000-0000-4000-8000-000000001002', 'st-01', 'st-01-c12', '2026-07-31', '09:30', '10:00', 'RESERVED'),
  ('RS-2046', '00000000-0000-4000-8000-000000001006', 'st-03', 'st-03-c11', '2026-07-31', '10:30', '11:00', 'RESERVED'),
  ('rs-701', '00000000-0000-4000-8000-000000001002', 'st-01', 'st-01-c15', '2026-07-31', '08:30', '09:00', 'RESERVED'),
  ('rs-702', '00000000-0000-4000-8000-000000001001', 'st-01', 'st-01-c13', '2026-07-31', '09:30', '10:00', 'RESERVED'),
  ('rs-703', '00000000-0000-4000-8000-000000001003', 'st-03', 'st-03-c11', '2026-07-31', '22:00', '22:30', 'RESERVED'),
  ('rs-704', '00000000-0000-4000-8000-000000001015', 'st-02', 'st-02-c12', '2026-07-31', '11:00', '11:30', 'PENDING'),
  ('rs-705', '00000000-0000-4000-8000-000000001006', 'st-08', 'st-08-c11', '2026-08-01', '07:30', '08:00', 'RESERVED'),
  ('rs-706', '00000000-0000-4000-8000-000000001013', 'st-01', 'st-01-c16', '2026-08-01', '13:00', '13:30', 'PENDING'),
  ('rs-707', '00000000-0000-4000-8000-000000001008', 'st-06', 'st-06-c21', '2026-08-01', '15:30', '16:00', 'RESERVED'),
  ('rs-708', '00000000-0000-4000-8000-000000001012', 'st-02', 'st-02-c14', '2026-08-02', '09:00', '09:30', 'CANCELLED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.waitlists (id, user_id, station_id, date, time_window, position, ahead_of, notify_on_free) VALUES
  ('WL-118', '00000000-0000-4000-8000-000000001001', 'st-03', '2026-08-01', '05:00 PM – 05:30 PM', 2, 1, true),
  ('WL-121', '00000000-0000-4000-8000-000000001001', 'st-05', '2026-08-03', '08:30 AM – 09:00 AM', 1, 0, false),
  ('WL-124', '00000000-0000-4000-8000-000000001002', 'st-03', '2026-08-01', '05:00 PM – 05:30 PM', 1, 0, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reviews (id, station_id, author_id, author_name, rating, reviewed_on, title, body, seed_helpful, verified_session) VALUES
  ('RV-701', 'st-01', '00000000-0000-4000-8000-000000001001', 'Jordan Lee', 5, '2026-07-29', 'Fastest charge in the city', 'Pulled 250 kW almost the whole way to 80%. Bays are well lit and the lounge upstairs makes the wait painless.', 24, true),
  ('RV-702', 'st-02', '00000000-0000-4000-8000-000000001002', 'Maya Chen', 4, '2026-07-28', 'Solid, but busy at peak', 'Two of the six CCS bays were taken every time I stopped by after 6pm. Charge speed itself was exactly as advertised.', 17, true),
  ('RV-703', 'st-03', '00000000-0000-4000-8000-000000001006', 'Diego Ramírez', 3, '2026-07-27', 'Great hardware, awkward access', '350 kW is superb when you get a bay, but the depot entrance is shared with delivery vans and it gets congested.', 9, true),
  ('RV-704', 'st-01', '00000000-0000-4000-8000-000000001007', 'Priya Nair', 5, '2026-07-26', 'Reliable every single time', 'Ten or so sessions here and not one failed start. The app handoff to the kiosk is instant.', 31, true),
  ('RV-705', 'st-04', '00000000-0000-4000-8000-000000001008', 'Sam Okafor', 4, '2026-07-25', 'Perfect for a slow top-up', 'Only 22 kW so plan for a long stop, but there are ten bays and I have never seen it full.', 12, true),
  ('RV-706', 'st-05', '00000000-0000-4000-8000-000000001001', 'Jordan Lee', 2, '2026-07-24', 'Was down when I arrived', 'Whole site was in maintenance with no warning in the app until I was already parked. Reported it and the ticket was picked up quickly, so credit for that.', 22, true),
  ('RV-707', 'st-06', '00000000-0000-4000-8000-000000001013', 'Nina Rossi', 5, '2026-07-23', 'Best views while you charge', 'Quiet site, never a queue, and the CHAdeMO bay actually works which is rare these days.', 15, true),
  ('RV-708', 'st-08', '00000000-0000-4000-8000-000000001015', 'Grace Kim', 4, '2026-07-22', 'Good stop on the way home', 'Consistent 240 kW on an empty battery. Card reader was slow but paying from the wallet worked first time.', 8, true),
  ('RV-709', 'st-02', '00000000-0000-4000-8000-000000001008', 'Sam Okafor', 5, '2026-07-21', 'Waitlist actually works', 'Joined the waitlist at 40% capacity and got promoted within eleven minutes. Nice touch.', 19, true),
  ('RV-710', 'st-07', '00000000-0000-4000-8000-000000001002', 'Maya Chen', 1, '2026-07-20', 'Offline for a second week', 'Site has been dark since the isolation fault. The app now shows it correctly, at least, so I did not waste a trip this time.', 27, false),
  ('RV-711', 'st-03', '00000000-0000-4000-8000-000000001001', 'Jordan Lee', 4, '2026-07-19', 'Fast when a bay is free', 'Reserved ahead this time which made all the difference. Straight in, plugged, charging in under a minute.', 14, true),
  ('RV-712', 'st-08', '00000000-0000-4000-8000-000000001006', 'Diego Ramírez', 3, '2026-07-18', 'Pricey for the speed', 'Works fine but the per-kWh rate is the highest of the sites I use regularly. Invoice was accurate to the kWh though.', 6, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.posts (id, author_id, author_name, handle, avatar_color, created_at, tag, title, body, seed_likes, comments, shares) VALUES
  ('po-1', '00000000-0000-4000-8000-000000001002', 'Maya Chen', '@mayaev', 'bg-emerald-500', '2026-07-30T15:10:00', 'Tips', 'Charging curve cheat sheet for Model 3 owners', 'After 200+ sessions: charge 10→60% on 250kW stalls, then switch to a slower stall if you need more. You will save money and free up fast stalls. Full data in the thread.', 128, 34, 12),
  ('po-2', '00000000-0000-4000-8000-000000001006', 'Diego Ramírez', '@dgo_drives', 'bg-blue-500', '2026-07-30T09:45:00', 'Station report', 'Mission Bay Fast Lane down for upgrades until Friday', 'Talked to the crew on site — they are swapping in 350kW cabinets. Greenline Depot is the closest alternative, was quiet this morning.', 86, 21, 30),
  ('po-3', '00000000-0000-4000-8000-000000001007', 'Priya Nair', '@priya.n', 'bg-violet-500', '2026-07-29T18:30:00', 'Question', 'Best off-peak window for the Harborview hub?', 'My building has no charging so I rely on public. When is Harborview actually empty? The app says "moderate" basically all day.', 23, 41, 2),
  ('po-4', '00000000-0000-4000-8000-000000001008', 'Sam Okafor', '@samo_k', 'bg-orange-500', '2026-07-29T08:12:00', 'Road trip', 'SF → Portland in an Ioniq 6, 3 stops, zero drama', 'Route + stations list attached. VoltGrid stations were flawless; one non-network stop needed 3 app installs. Plan around the network if you can.', 245, 58, 74),
  ('po-5', '00000000-0000-4000-8000-000000001009', 'Lena Fischer', '@lenaf', 'bg-pink-500', '2026-07-28T14:20:00', 'Tips', 'Wallet auto top-up saved my road trip', 'PSA: turn on auto top-up before long trips. A payment decline at 2% battery in the middle of nowhere is not the adventure you want.', 67, 9, 8),
  ('po-6', NULL, 'VoltGrid Team', '@voltgrid', 'bg-emerald-600', '2026-07-27T10:00:00', 'Announcement', 'Community challenge: 100% renewable July', 'Charge during solar-peak hours (10am–3pm) this month and earn 2× reward points. Leaderboard live on your dashboard.', 412, 96, 120)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sla_policies (priority, response_hours) VALUES
  ('CRITICAL', 4),
  ('HIGH', 8),
  ('MEDIUM', 24),
  ('LOW', 72)
ON CONFLICT (priority) DO UPDATE SET response_hours = EXCLUDED.response_hours;

INSERT INTO public.fault_categories (name, sort_order) VALUES
  ('Connector will not unlock', 0),
  ('Charging never starts', 1),
  ('Session stopped unexpectedly', 2),
  ('Screen or kiosk unresponsive', 3),
  ('Payment or card reader problem', 4),
  ('Physical damage to cable or bay', 5),
  ('Bay blocked or inaccessible', 6),
  ('Other', 7)
ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order;

INSERT INTO public.tickets (id, title, station_id, connector_id, connector_label, fault_code, priority, status, source, reporter, reporter_id, assigned_to, reported_at, sla_due_at, resolved_at, description, parts) VALUES
  ('TK-1042', 'Connector lock failure on bay A1', 'st-02', 'st-02-c11', 'A1', 'E-231', 'HIGH', 'ASSIGNED', 'KIOSK_EMULATOR', 'Kiosk telemetry', NULL, 'Alex Turner', '2026-07-30T14:50:00', '2026-07-30T22:50:00', NULL, 'Connector latch does not release after session end. Two customer complaints in the last 6 hours. Remote unlock command times out.', ARRAY['Latch actuator (CCS2-LA-04)','Wiring harness']),
  ('TK-1041', 'Isolation fault — bay A2 offline', 'st-07', 'st-07-c12', 'A2', 'E-402', 'CRITICAL', 'IN_PROGRESS', 'KIOSK_EMULATOR', 'Kiosk telemetry', NULL, 'Alex Turner', '2026-07-30T18:20:00', '2026-07-30T22:20:00', NULL, 'DC isolation monitor tripped (fault E-402). Cabinet locked out. Site is fully offline as A2 shares the power cabinet with A1.', ARRAY['Isolation monitor module (IMD-9)']),
  ('TK-1039', 'Screen unresponsive at bay A2', 'st-01', 'st-01-c12', 'A2', NULL, 'MEDIUM', 'IN_PROGRESS', 'DRIVER_REPORT', 'Jordan Lee (driver)', '00000000-0000-4000-8000-000000001001', 'Alex Turner', '2026-07-29T10:12:00', '2026-07-30T10:12:00', NULL, 'Touchscreen frozen on boot logo. Charging still works via app start. Likely HMI board or SD corruption.', ARRAY['HMI controller board']),
  ('TK-1038', 'Session stopped after two minutes', 'st-03', 'st-03-c21', 'B1', NULL, 'MEDIUM', 'OPEN', 'DRIVER_REPORT', 'Jordan Lee (driver)', '00000000-0000-4000-8000-000000001001', 'Awaiting dispatch', '2026-07-30T08:05:00', '2026-07-31T08:05:00', NULL, 'Charge started normally then cut out at roughly 2 kWh. Retried twice with the same result; the bay then showed as available again.', '{}'),
  ('TK-1036', 'Preventive maintenance — quarterly inspection', 'st-08', NULL, 'All bays', NULL, 'LOW', 'OPEN', 'PM_SCHEDULE', 'Maintenance schedule', NULL, 'Omar Haddad', '2026-07-28T08:00:00', '2026-07-31T08:00:00', NULL, 'Q3 preventive maintenance: torque checks, filter swap, coolant level, cable abrasion inspection, ground continuity test on all 8 bays.', ARRAY['Air filter kit ×6','Coolant (5L)']),
  ('TK-1033', 'Cable abrasion beyond tolerance', 'st-03', 'st-03-c14', 'A4', NULL, 'MEDIUM', 'OPEN', 'FIELD_INSPECTION', 'Alex Turner', NULL, 'Awaiting dispatch', '2026-07-27T16:40:00', '2026-07-28T16:40:00', NULL, 'Outer jacket abrasion 40cm from connector head. No conductor exposure yet. Replace cable assembly within 7 days.', ARRAY['350kW liquid-cooled cable assembly']),
  ('TK-1029', 'Payment terminal offline', 'st-04', NULL, 'Kiosk', 'E-660', 'HIGH', 'RESOLVED', 'KIOSK_EMULATOR', 'Kiosk telemetry', NULL, 'Alex Turner', '2026-07-24T09:30:00', '2026-07-24T17:30:00', '2026-07-24T15:45:00', 'Card reader NFC module not responding. Replaced terminal modem and re-provisioned SIM.', ARRAY['LTE modem'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ticket_events (ticket_id, at, who, what) VALUES
  ('TK-1042', '2026-07-30T14:50:00', 'System', 'Ticket created from fault code E-231'),
  ('TK-1042', '2026-07-30T14:55:00', 'Dispatch', 'Assigned to Alex Turner'),
  ('TK-1042', '2026-07-30T15:20:00', 'Alex Turner', 'Acknowledged, ETA tomorrow 8:00 AM'),
  ('TK-1041', '2026-07-30T18:20:00', 'System', 'Ticket created from fault code E-402'),
  ('TK-1041', '2026-07-30T18:31:00', 'Dispatch', 'Escalated to critical — full site outage'),
  ('TK-1041', '2026-07-30T19:05:00', 'Alex Turner', 'On site. Confirmed IMD failure, sourcing module.'),
  ('TK-1039', '2026-07-29T10:12:00', 'Support', 'Ticket created from driver report'),
  ('TK-1039', '2026-07-29T11:00:00', 'Dispatch', 'Assigned to Alex Turner'),
  ('TK-1039', '2026-07-30T09:15:00', 'Alex Turner', 'Remote reboot failed, HMI board ordered'),
  ('TK-1038', '2026-07-30T08:05:00', 'Jordan Lee', 'Fault reported from the driver app'),
  ('TK-1036', '2026-07-28T08:00:00', 'System', 'Auto-generated from PM schedule'),
  ('TK-1033', '2026-07-27T16:40:00', 'Alex Turner', 'Logged during PM visit'),
  ('TK-1029', '2026-07-24T09:30:00', 'System', 'Ticket created from fault code E-660'),
  ('TK-1029', '2026-07-24T13:10:00', 'Alex Turner', 'On site, diagnosed dead modem'),
  ('TK-1029', '2026-07-24T15:45:00', 'Alex Turner', 'Replaced modem, terminal back online. Resolved.')
ON CONFLICT DO NOTHING;

-- Broadcasts: user_id stays null and `roles` decides who sees the row. A
-- reader marks one read by inserting into notification_reads.
INSERT INTO public.notifications (id, user_id, roles, type, title, body, created_at, seed_read) VALUES
  ('nt-1', NULL, ARRAY['driver']::user_role[], 'charging', 'Charging 61% complete', 'Your Model 3 at Volta Plaza will reach 90% in ~18 min.', '2026-07-30T19:15:00', false),
  ('nt-2', NULL, ARRAY['driver']::user_role[], 'booking', 'Booking confirmed', 'Stall A3 at Volta Plaza reserved for Jul 31, 9:30 AM.', '2026-07-30T16:02:00', false),
  ('nt-3', NULL, ARRAY['driver']::user_role[], 'wallet', 'Low wallet balance', 'Balance dropped below $90. Auto top-up will trigger at $20.', '2026-07-30T12:40:00', false),
  ('nt-4', NULL, ARRAY['driver']::user_role[], 'community', 'Maya Chen replied to your comment', '"Totally agree — the 60% cutoff is the sweet spot…"', '2026-07-29T21:15:00', true),
  ('nt-5', NULL, ARRAY['driver']::user_role[], 'promo', '2× points weekend', 'Charge on VoltGrid Network stations this weekend and earn double.', '2026-07-29T09:00:00', true),
  ('nt-6', NULL, ARRAY['operator','admin']::user_role[], 'alert', 'Charger DP-04 faulted', 'Dogpatch Power Yard stall B2 reported an isolation fault.', '2026-07-30T18:20:00', false),
  ('nt-8', NULL, ARRAY['operator','admin']::user_role[], 'revenue', 'Daily revenue report ready', 'Yesterday: $4,812 across 9 stations (+6.2% DoD).', '2026-07-30T07:00:00', true),
  ('nt-9', NULL, ARRAY['fleet']::user_role[], 'fleet', 'Vehicle VN-114 low battery', 'Delivery van VN-114 is at 12% and 18 mi from depot.', '2026-07-30T17:35:00', false),
  ('nt-10', NULL, ARRAY['fleet','admin']::user_role[], 'billing', 'July invoice available', 'Fleet invoice INV-2026-07 ($12,480.20) is ready for review.', '2026-07-29T08:00:00', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.wallet_accounts (user_id, balance, currency, auto_top_up, auto_top_up_threshold, auto_top_up_amount) VALUES
  ('00000000-0000-4000-8000-000000001001', 86.4, 'USD', true, 20, 50)
ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, auto_top_up = EXCLUDED.auto_top_up,
    auto_top_up_threshold = EXCLUDED.auto_top_up_threshold, auto_top_up_amount = EXCLUDED.auto_top_up_amount;

INSERT INTO public.payment_cards (id, user_id, brand, last4, expiry, is_primary) VALUES
  ('card-1', '00000000-0000-4000-8000-000000001001', 'Visa', '4242', '09/28', true),
  ('card-2', '00000000-0000-4000-8000-000000001001', 'Mastercard', '8810', '01/27', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, user_id, type, description, occurred_at, amount, status, method) VALUES
  ('tx-9012', '00000000-0000-4000-8000-000000001001', 'charge', 'Charging session · Volta Plaza', '2026-07-30T19:20:00', -11.93, 'pending', 'Wallet'),
  ('tx-9008', '00000000-0000-4000-8000-000000001001', 'topup', 'Wallet top-up', '2026-07-29T08:12:00', 50, 'completed', 'Visa •••• 4242'),
  ('tx-9004', '00000000-0000-4000-8000-000000001001', 'charge', 'Charging session · Harborview Hub', '2026-07-28T09:58:00', -14.52, 'completed', 'Wallet'),
  ('tx-8998', '00000000-0000-4000-8000-000000001001', 'charge', 'Charging session · Volta Plaza', '2026-07-25T19:38:00', -17.51, 'completed', 'Wallet'),
  ('tx-8990', '00000000-0000-4000-8000-000000001001', 'purchase', 'Marketplace · Portable Type 2 cable', '2026-07-24T13:05:00', -129, 'completed', 'Mastercard •••• 8810'),
  ('tx-8985', '00000000-0000-4000-8000-000000001001', 'charge', 'Charging session · Twin Peaks Vista', '2026-07-22T15:26:00', -20.24, 'completed', 'Wallet'),
  ('tx-8979', '00000000-0000-4000-8000-000000001001', 'refund', 'Refund · failed session cs-1998', '2026-07-20T10:00:00', 0.34, 'refunded', 'Wallet'),
  ('tx-8974', '00000000-0000-4000-8000-000000001001', 'charge', 'Charging session · Greenline Depot', '2026-07-19T08:19:00', -7.88, 'completed', 'Wallet'),
  ('tx-8969', '00000000-0000-4000-8000-000000001001', 'topup', 'Auto top-up', '2026-07-18T06:00:00', 50, 'completed', 'Visa •••• 4242'),
  ('tx-8961', '00000000-0000-4000-8000-000000001001', 'charge', 'Charging session · Sunset Park', '2026-07-16T19:56:00', -9.11, 'completed', 'Wallet'),
  ('tx-8952', '00000000-0000-4000-8000-000000001001', 'charge', 'Charging session · Presidio Gateway', '2026-07-10T10:53:00', -15.92, 'completed', 'Wallet'),
  ('tx-8944', '00000000-0000-4000-8000-000000001001', 'subscription', 'VoltGrid Plus · monthly', '2026-07-01T00:00:00', -9.99, 'completed', 'Visa •••• 4242')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_categories (name, sort_order) VALUES
  ('Cables', 0),
  ('Home charging', 1),
  ('Adapters', 2),
  ('Accessories', 3),
  ('Memberships', 4),
  ('Services', 5)
ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order;

INSERT INTO public.products (id, name, category, price, per, rating, reviews, badge, seller, stock, gradient, description, listing_status, submitted_on) VALUES
  ('mp-1', 'Portable Type 2 Charging Cable', 'Cables', 129, NULL, 4.7, 320, 'Best seller', 'VoltGear', 42, 'from-emerald-400 to-teal-600', '7.5m 32A Type 2 to Type 2 cable with carry case. IP54 rated, tangle-free jacket.', 'live', NULL),
  ('mp-2', 'HomeFlex 11kW Wallbox', 'Home charging', 649, NULL, 4.8, 512, 'Popular', 'GridHome', 18, 'from-blue-400 to-indigo-600', 'Smart 11kW home wallbox with app scheduling, load balancing and RFID.', 'live', NULL),
  ('mp-3', 'CCS2 Adapter Pro', 'Adapters', 189, NULL, 4.4, 141, NULL, 'VoltGear', 64, 'from-orange-400 to-red-500', 'CCS2 to Tesla adapter, up to 250kW DC fast charging. Thermal monitoring built-in.', 'live', NULL),
  ('mp-4', 'EV Tire & Trim Care Kit', 'Accessories', 39, NULL, 4.2, 87, NULL, 'AutoNiche', 120, 'from-violet-400 to-purple-600', 'Low-rolling-resistance safe tire shine, interior wipes and microfiber set.', 'live', NULL),
  ('mp-5', 'VoltGrid Plus Membership', 'Memberships', 9.99, '/mo', 4.9, 1043, 'Save 12%', 'VoltGrid', NULL, 'from-emerald-500 to-green-700', '12% off every session on VoltGrid Network stations, priority booking and free idle grace.', 'live', NULL),
  ('mp-6', 'Cable Organizer Bag', 'Accessories', 24, NULL, 4.5, 210, NULL, 'VoltGear', 200, 'from-slate-400 to-slate-600', 'Weather-resistant trunk bag with dividers for cables, adapters and gloves.', 'live', NULL),
  ('mp-7', 'Solar Canopy Consultation', 'Services', 0, NULL, 4.6, 33, 'Free', 'SunPort', NULL, 'from-amber-400 to-yellow-600', 'Free site assessment for residential solar carport + storage installation.', 'live', NULL),
  ('mp-8', 'Winter Charging Gloves', 'Accessories', 19, NULL, 4.1, 56, NULL, 'AutoNiche', 75, 'from-cyan-400 to-sky-600', 'Touchscreen-friendly insulated gloves with grip palms for cold-weather plug-ins.', 'live', NULL),
  ('mp-pending-1', 'DualPort 22kW Wallbox', 'Home charging', 899, NULL, 0, 0, NULL, 'NordVolt', NULL, 'from-slate-400 to-slate-600', 'Two-socket 22kW wallbox with dynamic load balancing across both ports and a built-in energy meter.', 'pending', '2026-07-29'),
  ('mp-pending-2', 'Coiled Type 2 Cable · 5m', 'Cables', 89, NULL, 0, 0, NULL, 'AutoNiche', NULL, 'from-slate-400 to-slate-600', 'Coiled 5m 16A Type 2 cable that retracts off the ground, with a moulded grip and storage strap.', 'pending', '2026-07-27')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fleet_settings (company, depot_power_limit_kw) VALUES
  ('Swift Logistics', 300)
ON CONFLICT (company) DO UPDATE SET depot_power_limit_kw = EXCLUDED.depot_power_limit_kw;

INSERT INTO public.fleet_drivers (id, company, name, email, licence, assigned_vehicle, shift, status, sessions_this_month, energy_kwh, safety_score) VALUES
  ('fd-01', 'Swift Logistics', 'Alice Brooks', 'a.brooks@swiftlogistics.com', 'DL-448210', 'VN-101', 'Morning', 'ON_DUTY', 38, 1420, 96),
  ('fd-02', 'Swift Logistics', 'Karim Silva', 'k.silva@swiftlogistics.com', 'DL-517903', 'VN-102', 'Morning', 'ON_DUTY', 41, 1585, 92),
  ('fd-03', 'Swift Logistics', 'Jesse Malone', 'j.malone@swiftlogistics.com', 'DL-301256', 'VN-104', 'Evening', 'ON_DUTY', 34, 1288, 88),
  ('fd-04', 'Swift Logistics', 'Thanh Nguyen', 't.nguyen@swiftlogistics.com', 'DL-614702', 'VN-109', 'Evening', 'ON_DUTY', 29, 1104, 94),
  ('fd-05', 'Swift Logistics', 'Rachel Adeyemi', 'r.adeyemi@swiftlogistics.com', 'DL-448915', 'VN-112', 'Night', 'ON_DUTY', 45, 1712, 97),
  ('fd-06', 'Swift Logistics', 'Mikhail Petrov', 'm.petrov@swiftlogistics.com', 'DL-385604', 'VN-114', 'Night', 'ON_DUTY', 31, 1190, 85),
  ('fd-07', 'Swift Logistics', 'Camille Dubois', 'c.dubois@swiftlogistics.com', 'DL-412208', 'VN-120', 'Morning', 'ON_DUTY', 27, 998, 91),
  ('fd-08', 'Swift Logistics', 'Owen Hartley', 'o.hartley@swiftlogistics.com', 'DL-229471', NULL, 'Relief', 'OFF_DUTY', 12, 430, 89),
  ('fd-09', 'Swift Logistics', 'Bianca Rossi', 'b.rossi@swiftlogistics.com', 'DL-706133', NULL, 'Relief', 'OFF_DUTY', 9, 318, 93),
  ('fd-10', 'Swift Logistics', 'Dmitri Vasquez', 'd.vasquez@swiftlogistics.com', 'DL-560019', NULL, 'Morning', 'ON_LEAVE', 0, 0, 90),
  ('fd-11', 'Swift Logistics', 'Hana Yoshida', 'h.yoshida@swiftlogistics.com', 'DL-883740', NULL, 'Evening', 'OFF_DUTY', 18, 654, 95)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fleet_vehicles (id, company, driver_id, model, driver_name, soc, range_km, status, location, odometer, health, next_service) VALUES
  ('VN-101', 'Swift Logistics', 'fd-01', 'Ford E-Transit', 'A. Brooks', 84, 212, 'active', 'Route 12 · Downtown', 48210, 96, '2026-09-04'),
  ('VN-102', 'Swift Logistics', 'fd-02', 'Ford E-Transit', 'K. Silva', 66, 168, 'active', 'Route 4 · SoMa', 51930, 93, '2026-08-21'),
  ('VN-104', 'Swift Logistics', 'fd-03', 'Rivian EDV 700', 'J. Malone', 41, 130, 'active', 'Route 9 · Richmond', 30125, 98, '2026-10-11'),
  ('VN-107', 'Swift Logistics', NULL, 'Rivian EDV 700', '—', 100, 322, 'charging', 'Depot · Bay 2', 27840, 97, '2026-10-02'),
  ('VN-109', 'Swift Logistics', 'fd-04', 'Mercedes eSprinter', 'T. Nguyen', 58, 150, 'active', 'Route 2 · Mission', 61470, 89, '2026-08-08'),
  ('VN-110', 'Swift Logistics', NULL, 'Mercedes eSprinter', '—', 34, 86, 'charging', 'Depot · Bay 5', 59210, 91, '2026-08-30'),
  ('VN-112', 'Swift Logistics', 'fd-05', 'Ford E-Transit', 'R. Adeyemi', 73, 184, 'active', 'Route 7 · Sunset', 44890, 95, '2026-09-15'),
  ('VN-114', 'Swift Logistics', 'fd-06', 'Rivian EDV 500', 'M. Petrov', 12, 38, 'active', 'Route 5 · Bayview', 38560, 94, '2026-09-27'),
  ('VN-115', 'Swift Logistics', NULL, 'Rivian EDV 500', '—', 91, 288, 'idle', 'Depot · Lot A', 25110, 99, '2026-11-05'),
  ('VN-118', 'Swift Logistics', NULL, 'BrightDrop Zevo 600', '—', 0, 0, 'maintenance', 'Service center', 66890, 71, 'In service'),
  ('VN-120', 'Swift Logistics', 'fd-07', 'BrightDrop Zevo 600', 'C. Dubois', 47, 128, 'active', 'Route 1 · Marina', 41220, 92, '2026-09-09'),
  ('VN-121', 'Swift Logistics', NULL, 'Ford E-Transit', '—', 88, 224, 'idle', 'Depot · Lot A', 19450, 98, '2026-12-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.invoices (id, company, period, amount, sessions, energy, status, due) VALUES
  ('INV-2026-07', 'Swift Logistics', 'July 2026', 12480.2, 342, 9860, 'pending', '2026-08-15'),
  ('INV-2026-06', 'Swift Logistics', 'June 2026', 11216.75, 315, 8940, 'paid', '2026-07-15'),
  ('INV-2026-05', 'Swift Logistics', 'May 2026', 11987.4, 330, 9420, 'paid', '2026-06-15'),
  ('INV-2026-04', 'Swift Logistics', 'April 2026', 10432.1, 298, 8310, 'paid', '2026-05-15'),
  ('INV-2026-03', 'Swift Logistics', 'March 2026', 11020, 305, 8720, 'paid', '2026-04-15'),
  ('INV-2026-02', 'Swift Logistics', 'February 2026', 9865.3, 276, 7810, 'overdue', '2026-03-15')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.charging_schedule (id, company, vehicle_id, connector_label, start_time, end_time, target_soc_pct, status, night) VALUES
  ('SCH-401', 'Swift Logistics', 'VN-107', 'A1', '20:00', '22:00', 90, 'COMPLETED', '2026-07-30'),
  ('SCH-402', 'Swift Logistics', 'VN-110', 'A2', '20:30', '23:00', 90, 'COMPLETED', '2026-07-30'),
  ('SCH-403', 'Swift Logistics', 'VN-115', 'A3', '21:15', '23:15', 80, 'CHARGING', '2026-07-30'),
  ('SCH-404', 'Swift Logistics', 'VN-121', 'A4', '22:00', '00:00', 90, 'SCHEDULED', '2026-07-30'),
  ('SCH-405', 'Swift Logistics', 'VN-114', 'A1', '23:00', '01:30', 100, 'SCHEDULED', '2026-07-30'),
  ('SCH-406', 'Swift Logistics', 'VN-102', 'A2', '00:00', '02:00', 90, 'SCHEDULED', '2026-07-30'),
  ('SCH-407', 'Swift Logistics', 'VN-118', 'A3', '01:00', '03:00', 80, 'CANCELLED', '2026-07-30'),
  ('SCH-411', 'Swift Logistics', 'VN-101', 'A1', '20:00', '22:00', 90, 'SCHEDULED', '2026-07-31'),
  ('SCH-412', 'Swift Logistics', 'VN-104', 'A2', '20:45', '23:00', 90, 'SCHEDULED', '2026-07-31'),
  ('SCH-413', 'Swift Logistics', 'VN-109', 'A3', '21:30', '23:30', 80, 'SCHEDULED', '2026-07-31'),
  ('SCH-414', 'Swift Logistics', 'VN-120', 'A4', '22:15', '00:15', 90, 'SCHEDULED', '2026-07-31'),
  ('SCH-415', 'Swift Logistics', 'VN-112', 'A1', '23:30', '01:30', 100, 'SCHEDULED', '2026-07-31')
ON CONFLICT (id) DO NOTHING;

-- Reporting snapshots. Each row is one point on one chart. These are the
-- figures whose source events the platform does not record yet; swap a series
-- for a view over `sessions` once there is real volume behind it.
INSERT INTO public.analytics_series (series, bucket, ord, metrics) VALUES
  ('revenue_by_day', 'Jul 16', 0, '{"revenue":4120,"energy":9820,"sessions":296}'::jsonb),
  ('revenue_by_day', 'Jul 17', 1, '{"revenue":4380,"energy":10430,"sessions":312}'::jsonb),
  ('revenue_by_day', 'Jul 18', 2, '{"revenue":4910,"energy":11690,"sessions":348}'::jsonb),
  ('revenue_by_day', 'Jul 19', 3, '{"revenue":5240,"energy":12480,"sessions":371}'::jsonb),
  ('revenue_by_day', 'Jul 20', 4, '{"revenue":4720,"energy":11240,"sessions":334}'::jsonb),
  ('revenue_by_day', 'Jul 21', 5, '{"revenue":4180,"energy":9950,"sessions":301}'::jsonb),
  ('revenue_by_day', 'Jul 22', 6, '{"revenue":4450,"energy":10600,"sessions":318}'::jsonb),
  ('revenue_by_day', 'Jul 23', 7, '{"revenue":4610,"energy":10980,"sessions":327}'::jsonb),
  ('revenue_by_day', 'Jul 24', 8, '{"revenue":4890,"energy":11640,"sessions":342}'::jsonb),
  ('revenue_by_day', 'Jul 25', 9, '{"revenue":5310,"energy":12640,"sessions":379}'::jsonb),
  ('revenue_by_day', 'Jul 26', 10, '{"revenue":5480,"energy":13050,"sessions":388}'::jsonb),
  ('revenue_by_day', 'Jul 27', 11, '{"revenue":4960,"energy":11810,"sessions":351}'::jsonb),
  ('revenue_by_day', 'Jul 28', 12, '{"revenue":4530,"energy":10790,"sessions":322}'::jsonb),
  ('revenue_by_day', 'Jul 29', 13, '{"revenue":4812,"energy":11460,"sessions":339}'::jsonb),
  ('revenue_by_station', 'Volta Plaza', 0, '{"revenue":38200}'::jsonb),
  ('revenue_by_station', 'Greenline Depot', 1, '{"revenue":29400}'::jsonb),
  ('revenue_by_station', 'Harborview Hub', 2, '{"revenue":26800}'::jsonb),
  ('revenue_by_station', 'Twin Peaks Vista', 3, '{"revenue":21500}'::jsonb),
  ('revenue_by_station', 'Mission Bay', 4, '{"revenue":14200}'::jsonb),
  ('revenue_by_station', 'Presidio Gateway', 5, '{"revenue":11900}'::jsonb),
  ('revenue_by_station', 'Sunset Park', 6, '{"revenue":8400}'::jsonb),
  ('revenue_by_station', 'Dogpatch Yard', 7, '{"revenue":5100}'::jsonb),
  ('sessions_by_hour', '12a', 0, '{"sessions":14}'::jsonb),
  ('sessions_by_hour', '2a', 1, '{"sessions":8}'::jsonb),
  ('sessions_by_hour', '4a', 2, '{"sessions":6}'::jsonb),
  ('sessions_by_hour', '6a', 3, '{"sessions":24}'::jsonb),
  ('sessions_by_hour', '8a', 4, '{"sessions":62}'::jsonb),
  ('sessions_by_hour', '10a', 5, '{"sessions":48}'::jsonb),
  ('sessions_by_hour', '12p', 6, '{"sessions":55}'::jsonb),
  ('sessions_by_hour', '2p', 7, '{"sessions":51}'::jsonb),
  ('sessions_by_hour', '4p', 8, '{"sessions":68}'::jsonb),
  ('sessions_by_hour', '6p', 9, '{"sessions":81}'::jsonb),
  ('sessions_by_hour', '8p', 10, '{"sessions":47}'::jsonb),
  ('sessions_by_hour', '10p', 11, '{"sessions":26}'::jsonb),
  ('platform_growth', 'Feb', 0, '{"users":8200,"sessions":24100}'::jsonb),
  ('platform_growth', 'Mar', 1, '{"users":9100,"sessions":26800}'::jsonb),
  ('platform_growth', 'Apr', 2, '{"users":10050,"sessions":29900}'::jsonb),
  ('platform_growth', 'May', 3, '{"users":11400,"sessions":33400}'::jsonb),
  ('platform_growth', 'Jun', 4, '{"users":12900,"sessions":37800}'::jsonb),
  ('platform_growth', 'Jul', 5, '{"users":14600,"sessions":42600}'::jsonb),
  ('revenue_by_segment', 'Feb', 0, '{"drivers":84,"fleet":46,"marketplace":12}'::jsonb),
  ('revenue_by_segment', 'Mar', 1, '{"drivers":92,"fleet":51,"marketplace":14}'::jsonb),
  ('revenue_by_segment', 'Apr', 2, '{"drivers":101,"fleet":55,"marketplace":15}'::jsonb),
  ('revenue_by_segment', 'May', 3, '{"drivers":116,"fleet":61,"marketplace":19}'::jsonb),
  ('revenue_by_segment', 'Jun', 4, '{"drivers":128,"fleet":68,"marketplace":22}'::jsonb),
  ('revenue_by_segment', 'Jul', 5, '{"drivers":143,"fleet":74,"marketplace":26}'::jsonb),
  ('energy_mix', 'Solar PPA', 0, '{"value":38}'::jsonb),
  ('energy_mix', 'Wind PPA', 1, '{"value":27}'::jsonb),
  ('energy_mix', 'Grid (renewable)', 2, '{"value":21}'::jsonb),
  ('energy_mix', 'Grid (standard)', 3, '{"value":14}'::jsonb),
  ('region_performance', 'SF Bay Area', 0, '{"stations":9,"uptime":98.2,"revenue":155500,"growth":8.4}'::jsonb),
  ('region_performance', 'Los Angeles', 1, '{"stations":14,"uptime":97.6,"revenue":214800,"growth":11.2}'::jsonb),
  ('region_performance', 'Seattle', 2, '{"stations":6,"uptime":99.1,"revenue":98400,"growth":6.8}'::jsonb),
  ('region_performance', 'Austin', 3, '{"stations":5,"uptime":96.9,"revenue":76200,"growth":14.6}'::jsonb),
  ('region_performance', 'Denver', 4, '{"stations":4,"uptime":98.8,"revenue":61800,"growth":9.3}'::jsonb),
  ('fleet_energy_by_week', 'Jun 8', 0, '{"depot":2140,"public":620}'::jsonb),
  ('fleet_energy_by_week', 'Jun 15', 1, '{"depot":2260,"public":540}'::jsonb),
  ('fleet_energy_by_week', 'Jun 22', 2, '{"depot":2080,"public":710}'::jsonb),
  ('fleet_energy_by_week', 'Jun 29', 3, '{"depot":2390,"public":660}'::jsonb),
  ('fleet_energy_by_week', 'Jul 6', 4, '{"depot":2310,"public":590}'::jsonb),
  ('fleet_energy_by_week', 'Jul 13', 5, '{"depot":2450,"public":720}'::jsonb),
  ('fleet_energy_by_week', 'Jul 20', 6, '{"depot":2520,"public":680}'::jsonb),
  ('fleet_energy_by_week', 'Jul 27', 7, '{"depot":2610,"public":750}'::jsonb),
  ('fleet_cost_per_vehicle', 'VN-109', 0, '{"cost":412}'::jsonb),
  ('fleet_cost_per_vehicle', 'VN-102', 1, '{"cost":388}'::jsonb),
  ('fleet_cost_per_vehicle', 'VN-120', 2, '{"cost":356}'::jsonb),
  ('fleet_cost_per_vehicle', 'VN-101', 3, '{"cost":331}'::jsonb),
  ('fleet_cost_per_vehicle', 'VN-112', 4, '{"cost":305}'::jsonb),
  ('fleet_cost_per_vehicle', 'VN-114', 5, '{"cost":288}'::jsonb),
  ('fleet_cost_per_vehicle', 'VN-104', 6, '{"cost":262}'::jsonb),
  ('fleet_cost_per_vehicle', 'VN-110', 7, '{"cost":231}'::jsonb),
  ('fleet_utilization', 'Feb', 0, '{"utilization":68,"downtime":6.2}'::jsonb),
  ('fleet_utilization', 'Mar', 1, '{"utilization":71,"downtime":5.1}'::jsonb),
  ('fleet_utilization', 'Apr', 2, '{"utilization":74,"downtime":4.4}'::jsonb),
  ('fleet_utilization', 'May', 3, '{"utilization":72,"downtime":4.9}'::jsonb),
  ('fleet_utilization', 'Jun', 4, '{"utilization":78,"downtime":3.6}'::jsonb),
  ('fleet_utilization', 'Jul', 5, '{"utilization":81,"downtime":2.9}'::jsonb),
  ('fleet_cost_breakdown', 'Depot charging', 0, '{"value":7420}'::jsonb),
  ('fleet_cost_breakdown', 'Public fast charging', 1, '{"value":3180}'::jsonb),
  ('fleet_cost_breakdown', 'Memberships', 2, '{"value":940}'::jsonb),
  ('fleet_cost_breakdown', 'Idle fees', 3, '{"value":540}'::jsonb),
  ('fleet_cost_breakdown', 'Other', 4, '{"value":400}'::jsonb),
  ('driver_monthly_usage', 'Feb', 0, '{"energy":182,"cost":71}'::jsonb),
  ('driver_monthly_usage', 'Mar', 1, '{"energy":224,"cost":88}'::jsonb),
  ('driver_monthly_usage', 'Apr', 2, '{"energy":198,"cost":79}'::jsonb),
  ('driver_monthly_usage', 'May', 3, '{"energy":261,"cost":104}'::jsonb),
  ('driver_monthly_usage', 'Jun', 4, '{"energy":243,"cost":96}'::jsonb),
  ('driver_monthly_usage', 'Jul', 5, '{"energy":287,"cost":114}'::jsonb)
ON CONFLICT (series, bucket) DO UPDATE SET ord = EXCLUDED.ord, metrics = EXCLUDED.metrics;
