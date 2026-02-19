-- Add assigned_aircraft column to frat_templates for per-aircraft template mapping
ALTER TABLE frat_templates ADD COLUMN IF NOT EXISTS assigned_aircraft TEXT[] DEFAULT '{}';
