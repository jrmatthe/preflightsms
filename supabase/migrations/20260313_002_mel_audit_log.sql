-- MEL Audit Log: compliance audit trail for MEL deferrals and rectifications
CREATE TABLE IF NOT EXISTS mel_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  aircraft_id UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
  mel_item_id TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'deferred', 'rectified'
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_by_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  mel_reference TEXT,
  work_performed TEXT,  -- rectification only
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by aircraft
CREATE INDEX IF NOT EXISTS idx_mel_audit_log_aircraft ON mel_audit_log(org_id, aircraft_id, created_at DESC);

-- RLS
ALTER TABLE mel_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mel_audit_log_select" ON mel_audit_log
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "mel_audit_log_insert" ON mel_audit_log
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
