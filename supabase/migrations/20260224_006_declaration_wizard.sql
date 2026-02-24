-- Declaration of Compliance Wizard
-- Part 5 §5.9 — Declaration of Compliance for Part 135 operators
-- Run this in the Supabase SQL editor

-- ── declarations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  wizard_data JSONB DEFAULT '{}',
  pdf_url TEXT,
  submitted_to_faa_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "declarations_select" ON declarations
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "declarations_insert" ON declarations
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "declarations_update" ON declarations
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "declarations_delete" ON declarations
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_declarations_org ON declarations(org_id);

-- ── declarations storage bucket ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('declarations', 'declarations', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "declarations_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'declarations' AND auth.role() = 'authenticated');

CREATE POLICY "declarations_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'declarations' AND auth.role() = 'authenticated');

CREATE POLICY "declarations_storage_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'declarations' AND auth.role() = 'authenticated');
