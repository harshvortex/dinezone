-- ═══════════════════════════════════════════════════════════════
--  DineSpot — PostGIS Migration
--  Adds a native geography column to the restaurants table
--  for efficient spatial queries (ST_DWithin, ST_Distance)
--  
--  Run: psql $DATABASE_URL -f infra/migrations/add_postgis_location.sql
-- ═══════════════════════════════════════════════════════════════

-- Ensure PostGIS extension is enabled (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── Add geography column to restaurants ────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- ─── Populate location from existing lat/lng columns ────────────
UPDATE restaurants
SET location = ST_MakePoint(longitude, latitude)::geography
WHERE location IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- ─── Spatial index (GIST) for fast ST_DWithin queries ───────────
CREATE INDEX IF NOT EXISTS restaurants_location_gist
  ON restaurants USING GIST (location);

-- ─── Trigram index for full-text search on name / city ──────────
CREATE INDEX IF NOT EXISTS restaurants_name_trgm
  ON restaurants USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS restaurants_city_trgm
  ON restaurants USING GIN (city gin_trgm_ops);

-- ─── Composite indexes for common filter queries ─────────────────
CREATE INDEX IF NOT EXISTS restaurants_active_verified
  ON restaurants ("isActive", "isVerified");

CREATE INDEX IF NOT EXISTS restaurants_cuisine_price
  ON restaurants ("cuisineType", "priceRange");

CREATE INDEX IF NOT EXISTS restaurants_rating
  ON restaurants (rating DESC);

-- ─── Verify the column was added ────────────────────────────────
SELECT
  id,
  name,
  city,
  latitude,
  longitude,
  ST_AsText(location) AS location_wkt
FROM restaurants
LIMIT 5;
