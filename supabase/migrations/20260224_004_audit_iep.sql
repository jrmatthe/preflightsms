-- Internal Evaluation Program (IEP) / Audit Tool
-- Part 5 §5.73 — Internal Evaluation
-- Run this in the Supabase SQL editor

-- ── audit_templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  sections JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_templates_select" ON audit_templates
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "audit_templates_insert" ON audit_templates
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "audit_templates_update" ON audit_templates
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "audit_templates_delete" ON audit_templates
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_templates_org ON audit_templates(org_id);

-- ── audits ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES audit_templates(id) ON DELETE SET NULL,
  audit_code TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  auditor_id UUID REFERENCES auth.users(id),
  scope TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  overall_score NUMERIC(5,2),
  template_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits_select" ON audits
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "audits_insert" ON audits
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "audits_update" ON audits
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- No DELETE on audits — compliance: use cancelled status instead

CREATE INDEX IF NOT EXISTS idx_audits_org ON audits(org_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(org_id, status);
CREATE INDEX IF NOT EXISTS idx_audits_template ON audits(template_id);

-- ── audit_responses ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  section_title TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response TEXT,
  finding_text TEXT DEFAULT '',
  evidence TEXT DEFAULT '',
  severity TEXT,
  corrective_action_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_responses_select" ON audit_responses
  FOR SELECT USING (
    audit_id IN (
      SELECT a.id FROM audits a
      JOIN profiles p ON p.org_id = a.org_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "audit_responses_insert" ON audit_responses
  FOR INSERT WITH CHECK (
    audit_id IN (
      SELECT a.id FROM audits a
      JOIN profiles p ON p.org_id = a.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "audit_responses_update" ON audit_responses
  FOR UPDATE USING (
    audit_id IN (
      SELECT a.id FROM audits a
      JOIN profiles p ON p.org_id = a.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_responses_audit ON audit_responses(audit_id);

-- ── audit_schedules ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'quarterly',
  next_due_date DATE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_schedules_select" ON audit_schedules
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "audit_schedules_insert" ON audit_schedules
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "audit_schedules_update" ON audit_schedules
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "audit_schedules_delete" ON audit_schedules
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_schedules_org ON audit_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_schedules_due ON audit_schedules(next_due_date);
