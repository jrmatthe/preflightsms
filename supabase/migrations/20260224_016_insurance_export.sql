-- Insurance Data Export & Safety Scorecard
CREATE TABLE IF NOT EXISTS insurance_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,          -- 'scorecard' or 'full_report'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  scorecard_data JSONB NOT NULL,
  overall_sms_maturity_score NUMERIC,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_exports ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member can view
CREATE POLICY "insurance_exports_select" ON insurance_exports
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- INSERT: admin roles only
CREATE POLICY "insurance_exports_insert" ON insurance_exports
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','safety_manager','accountable_exec','chief_pilot')
  );

-- UPDATE: admin roles only
CREATE POLICY "insurance_exports_update" ON insurance_exports
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','safety_manager','accountable_exec','chief_pilot')
  );

-- DELETE: admin roles only
CREATE POLICY "insurance_exports_delete" ON insurance_exports
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','safety_manager','accountable_exec','chief_pilot')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_exports_org ON insurance_exports(org_id);
CREATE INDEX IF NOT EXISTS idx_insurance_exports_org_date ON insurance_exports(org_id, generated_at DESC);
