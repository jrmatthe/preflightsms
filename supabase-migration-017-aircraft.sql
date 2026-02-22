-- Migration 017: Aircraft / Fleet Registry
-- Run in Supabase SQL Editor

-- 1. Create aircraft table
CREATE TABLE IF NOT EXISTS aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT '',
  registration TEXT NOT NULL DEFAULT '',
  serial_number TEXT DEFAULT '',
  year INTEGER,
  max_passengers INTEGER,
  base_location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Unique constraint: no duplicate tail numbers per org
ALTER TABLE aircraft ADD CONSTRAINT aircraft_org_registration_unique UNIQUE (org_id, registration);

-- 3. Index
CREATE INDEX idx_aircraft_org_id ON aircraft(org_id);

-- 4. Enable RLS
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies scoped by org_id
CREATE POLICY "aircraft_select" ON aircraft FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "aircraft_insert" ON aircraft FOR INSERT
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "aircraft_update" ON aircraft FOR UPDATE
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "aircraft_delete" ON aircraft FOR DELETE
  USING (org_id = get_user_org_id());
