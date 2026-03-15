-- Add dual fuel tank support for twin-engine aircraft
ALTER TABLE public.aircraft
  ADD COLUMN IF NOT EXISTS dual_fuel_tanks BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fuel_remaining_left TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fuel_remaining_right TEXT DEFAULT '';

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS fuel_remaining_left TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fuel_remaining_right TEXT DEFAULT '';
