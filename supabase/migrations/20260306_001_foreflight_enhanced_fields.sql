-- Enhanced ForeFlight sync fields
-- Adds FRAT pre-population, OOOI times, and operational metadata

-- FRAT pre-population fields
ALTER TABLE foreflight_flights
  ADD COLUMN IF NOT EXISTS passenger_count INTEGER,
  ADD COLUMN IF NOT EXISTS crew_count INTEGER,
  ADD COLUMN IF NOT EXISTS fuel_lbs NUMERIC,
  ADD COLUMN IF NOT EXISTS cruise_alt TEXT,
  ADD COLUMN IF NOT EXISTS route TEXT,
  ADD COLUMN IF NOT EXISTS ete_minutes INTEGER;

-- OOOI times for fatigue/duty tracking
ALTER TABLE foreflight_flights
  ADD COLUMN IF NOT EXISTS out_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS off_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS on_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS in_time TIMESTAMPTZ;

-- Dispatcher/operational metadata
ALTER TABLE foreflight_flights
  ADD COLUMN IF NOT EXISTS dispatcher_notes TEXT,
  ADD COLUMN IF NOT EXISTS wb_data JSONB;

-- Index OOOI times for fatigue queries
CREATE INDEX IF NOT EXISTS idx_ff_flights_out_time
  ON foreflight_flights (org_id, out_time) WHERE out_time IS NOT NULL;
