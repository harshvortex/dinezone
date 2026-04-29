-- Run once on first DB initialization
-- Enable PostGIS for spatial queries (nearby restaurant search)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Enable trigram index for fast full-text search on restaurant names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable btree_gist for range type indexes (booking time overlap detection)
CREATE EXTENSION IF NOT EXISTS btree_gist;

SELECT PostGIS_Version();
