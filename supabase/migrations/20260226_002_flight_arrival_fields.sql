-- Add parking spot and fuel remaining columns to flights table
-- These are entered when a pilot marks a flight as ARRIVED

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS parking_spot TEXT DEFAULT '';

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS fuel_remaining TEXT DEFAULT '';

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS fuel_unit TEXT DEFAULT '';
