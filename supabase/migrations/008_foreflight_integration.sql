-- ForeFlight Dispatch Integration
-- Run this in the Supabase SQL editor

-- ── foreflight_config ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foreflight_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL DEFAULT '',
  api_secret TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 5,
  auto_create_frats BOOLEAN NOT NULL DEFAULT false,
  notify_pilots_on_sync BOOLEAN NOT NULL DEFAULT true,
  push_frat_enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

-- RLS
ALTER TABLE foreflight_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foreflight_config_select" ON foreflight_config
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "foreflight_config_insert" ON foreflight_config
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "foreflight_config_update" ON foreflight_config
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "foreflight_config_delete" ON foreflight_config
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- ── foreflight_flights ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foreflight_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  foreflight_id TEXT NOT NULL,
  departure_icao TEXT NOT NULL DEFAULT '',
  destination_icao TEXT NOT NULL DEFAULT '',
  tail_number TEXT NOT NULL DEFAULT '',
  pilot_name TEXT NOT NULL DEFAULT '',
  pilot_email TEXT,
  aircraft_type TEXT NOT NULL DEFAULT '',
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  frat_id UUID REFERENCES frat_submissions(id),
  flight_id UUID REFERENCES flights(id),
  frat_push_status TEXT DEFAULT 'none',
  frat_pushed_at TIMESTAMPTZ,
  matched_pilot_id UUID REFERENCES profiles(id),
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, foreflight_id)
);

-- RLS
ALTER TABLE foreflight_flights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foreflight_flights_select" ON foreflight_flights
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "foreflight_flights_insert" ON foreflight_flights
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "foreflight_flights_update" ON foreflight_flights
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "foreflight_flights_delete" ON foreflight_flights
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ff_flights_org ON foreflight_flights(org_id);
CREATE INDEX IF NOT EXISTS idx_ff_flights_status ON foreflight_flights(org_id, status);
CREATE INDEX IF NOT EXISTS idx_ff_config_org ON foreflight_config(org_id);
