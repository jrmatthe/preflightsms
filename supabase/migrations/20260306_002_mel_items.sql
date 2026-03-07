-- Add MEL (Minimum Equipment List) deferral tracking to aircraft
ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS mel_items JSONB DEFAULT '[]'::jsonb;
