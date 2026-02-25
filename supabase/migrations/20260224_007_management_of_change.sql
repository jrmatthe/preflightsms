-- Management of Change (MOC) Module
-- Part 5 §5.53 — Identifying changes and assessing associated hazards
-- Run this in the Supabase SQL editor

-- ── management_of_change ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS management_of_change (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  change_type TEXT NOT NULL,
  description TEXT NOT NULL,
  initiator_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'identified',
  priority TEXT DEFAULT 'medium',
  identified_hazards JSONB,
  mitigation_plan TEXT,
  residual_risk JSONB,
  implementation_date DATE,
  review_date DATE,
  responsible_id UUID REFERENCES profiles(id),
  effectiveness_review TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE management_of_change ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moc_select" ON management_of_change
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "moc_insert" ON management_of_change
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "moc_update" ON management_of_change
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "moc_delete" ON management_of_change
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_moc_org ON management_of_change(org_id);
CREATE INDEX IF NOT EXISTS idx_moc_status ON management_of_change(org_id, status);

-- ── moc_attachments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moc_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moc_id UUID REFERENCES management_of_change(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE moc_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moc_attachments_select" ON moc_attachments
  FOR SELECT USING (
    moc_id IN (
      SELECT m.id FROM management_of_change m
      JOIN profiles p ON p.org_id = m.org_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "moc_attachments_insert" ON moc_attachments
  FOR INSERT WITH CHECK (
    moc_id IN (
      SELECT m.id FROM management_of_change m
      JOIN profiles p ON p.org_id = m.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "moc_attachments_delete" ON moc_attachments
  FOR DELETE USING (
    moc_id IN (
      SELECT m.id FROM management_of_change m
      JOIN profiles p ON p.org_id = m.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_moc_attachments_moc ON moc_attachments(moc_id);

-- ── moc-attachments storage bucket ───────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('moc-attachments', 'moc-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "moc_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'moc-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "moc_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'moc-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "moc_storage_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'moc-attachments' AND auth.role() = 'authenticated');
