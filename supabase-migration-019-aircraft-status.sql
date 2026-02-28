-- Migration 019: Add current status fields to aircraft table
-- Allows tracking last known location, parking spot, and fuel
-- independently of flight records (e.g., maintenance moves aircraft)

ALTER TABLE public.aircraft
  ADD COLUMN IF NOT EXISTS last_location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS parking_spot TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fuel_remaining TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fuel_unit TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
