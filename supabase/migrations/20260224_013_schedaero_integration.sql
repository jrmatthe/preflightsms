-- Schedaero Scheduling Integration
-- Run this in the Supabase SQL editor

-- ── schedaero_config ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedaero_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT false,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 5,
  sync_window_hours INTEGER NOT NULL DEFAULT 24,
  auto_create_frats BOOLEAN NOT NULL DEFAULT false,
  notify_pilots_on_sync BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  sync_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

-- RLS
ALTER TABLE schedaero_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedaero_config_select" ON schedaero_config
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "schedaero_config_insert" ON schedaero_config
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "schedaero_config_update" ON schedaero_config
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "schedaero_config_delete" ON schedaero_config
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- ── schedaero_trips ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedaero_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schedaero_trip_id TEXT NOT NULL,
  trip_number TEXT NOT NULL DEFAULT '',
  departure_icao TEXT NOT NULL DEFAULT '',
  destination_icao TEXT NOT NULL DEFAULT '',
  tail_number TEXT NOT NULL DEFAULT '',
  pilot_name TEXT NOT NULL DEFAULT '',
  aircraft_type TEXT NOT NULL DEFAULT '',
  passenger_count INTEGER DEFAULT 0,
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  frat_id UUID REFERENCES frat_submissions(id),
  flight_id UUID REFERENCES flights(id),
  matched_pilot_id UUID REFERENCES profiles(id),
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, schedaero_trip_id)
);

-- RLS
ALTER TABLE schedaero_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedaero_trips_select" ON schedaero_trips
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "schedaero_trips_insert" ON schedaero_trips
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "schedaero_trips_update" ON schedaero_trips
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "schedaero_trips_delete" ON schedaero_trips
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sc_trips_org ON schedaero_trips(org_id);
CREATE INDEX IF NOT EXISTS idx_sc_trips_status ON schedaero_trips(org_id, status);
CREATE INDEX IF NOT EXISTS idx_sc_config_org ON schedaero_config(org_id);
