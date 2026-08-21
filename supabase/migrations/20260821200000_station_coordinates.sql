-- ============================================================================
-- Real station coordinates
--
-- THE PROBLEM
--
-- `stations` carried three columns that only ever pretended to be geography:
--
--   distance  a hardcoded number of miles baked into the seed. It was the same
--             for every driver, because it was not measured from anybody.
--   x, y      0-100 percentages fed straight to `MapPlaceholder`. Not a
--             projection of anything -- `createStation()` placed new sites on a
--             coprime stride so the pins would not stack up.
--
-- THE SHAPE OF THE FIX
--
-- Store where the site actually is, once, and derive the rest per viewer:
--
--   latitude   DECIMAL(10, 8)   -90 .. 90,   ~1.1 mm of precision
--   longitude  DECIMAL(11, 8)  -180 .. 180,  same
--
-- The operator types the pair in on /operator/stations. The driver's browser
-- supplies its own pair from `navigator.geolocation`, and the client measures
-- the two against each other (haversine, in `src/lib/geo.js`). Nothing about
-- "how far away is this" is stored any more, because the answer depends on who
-- is asking.
--
-- The map pins are likewise derived: `toMarkers()` normalises the visible
-- stations' coordinates into the 0-100 space `MapPlaceholder` wants, so x and y
-- have no reason to exist as columns.
--
-- Both columns are nullable. A site commissioned before its survey has no
-- coordinates yet, and the UI treats that as "distance unknown" rather than
-- refusing to show the station.
--
-- Idempotent.
-- ============================================================================

BEGIN;

-- 1. Drop the placeholders ----------------------------------------------------
-- No view or policy reads these; `station_connector_groups` is built from
-- `connectors` alone, so this is a plain drop.

ALTER TABLE public.stations
  DROP COLUMN IF EXISTS distance,
  DROP COLUMN IF EXISTS x,
  DROP COLUMN IF EXISTS y;

-- 2. The real thing -----------------------------------------------------------

ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS latitude  DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

COMMENT ON COLUMN public.stations.latitude IS
  'WGS-84 latitude in decimal degrees, -90 to 90. NULL until the site has been surveyed; the UI shows such a station without a distance rather than hiding it.';
COMMENT ON COLUMN public.stations.longitude IS
  'WGS-84 longitude in decimal degrees, -180 to 180. NULL until the site has been surveyed.';

-- 3. Keep the pair plausible --------------------------------------------------
-- DECIMAL(10, 8) already caps latitude at +/-99.999..., and DECIMAL(11, 8)
-- longitude at +/-999.999...; neither is the real range, and a transposed pair
-- (lat and lng swapped) is the mistake a hand-typed coordinate actually makes.
-- Dropped first because ADD CONSTRAINT has no IF NOT EXISTS.

ALTER TABLE public.stations DROP CONSTRAINT IF EXISTS stations_latitude_range;
ALTER TABLE public.stations DROP CONSTRAINT IF EXISTS stations_longitude_range;

ALTER TABLE public.stations
  ADD CONSTRAINT stations_latitude_range
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT stations_longitude_range
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

COMMIT;

-- ============================================================================
-- Verify
-- ============================================================================
-- -- Should list latitude and longitude, and neither distance, x nor y:
-- SELECT column_name, data_type, numeric_precision, numeric_scale
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'stations'
--  ORDER BY ordinal_position;
--
-- -- Which sites still need surveying:
-- SELECT id, name FROM public.stations WHERE latitude IS NULL OR longitude IS NULL;
--
-- -- Put a test site roughly 1.5 km north of you (0.0135 degrees of latitude):
-- UPDATE public.stations SET latitude = 18.5204, longitude = 73.8567 WHERE id = 'st-01';
