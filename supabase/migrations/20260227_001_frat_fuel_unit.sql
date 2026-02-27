-- Add fuel_unit column to frat_submissions table to support lbs/hrs toggle

ALTER TABLE public.frat_submissions
  ADD COLUMN IF NOT EXISTS fuel_unit TEXT DEFAULT 'hrs';
