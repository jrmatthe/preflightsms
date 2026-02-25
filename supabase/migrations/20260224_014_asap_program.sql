-- Aviation Safety Action Program (ASAP)
-- AC 120-66C voluntary confidential safety reporting
-- Run this in the Supabase SQL editor

-- ── asap_config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asap_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_name TEXT DEFAULT 'ASAP',
  mou_text TEXT,
  mou_effective_date DATE,
  mou_expiry_date DATE,
  acceptance_criteria JSONB DEFAULT '[]'::jsonb,
  exclusion_criteria JSONB DEFAULT '[]'::jsonb,
  erc_members JSONB DEFAULT '[]'::jsonb,
  reporting_window_hours INTEGER DEFAULT 24,
  auto_number_prefix TEXT DEFAULT 'ASAP',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE asap_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asap_config_select" ON asap_config
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "asap_config_insert" ON asap_config
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_config_update" ON asap_config
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_config_delete" ON asap_config
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- ── asap_reports ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asap_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_number TEXT NOT NULL,
  reporter_id UUID REFERENCES auth.users(id),
  reporter_name TEXT,
  event_date DATE NOT NULL,
  date_reported TIMESTAMPTZ DEFAULT now(),
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  flight_phase TEXT,
  aircraft_type TEXT,
  tail_number TEXT,
  airport TEXT,
  altitude TEXT,
  weather_conditions TEXT,
  contributing_factors JSONB DEFAULT '[]'::jsonb,
  immediate_actions_taken TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'submitted',
  is_sole_source BOOLEAN DEFAULT false,
  within_reporting_window BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE asap_reports ENABLE ROW LEVEL SECURITY;

-- Reporter sees own reports; admin/safety_manager sees all org reports
CREATE POLICY "asap_reports_select" ON asap_reports
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- Any org member can submit
CREATE POLICY "asap_reports_insert" ON asap_reports
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admin/safety_manager only
CREATE POLICY "asap_reports_update" ON asap_reports
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_reports_delete" ON asap_reports
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_asap_reports_org ON asap_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_asap_reports_status ON asap_reports(org_id, status);
CREATE INDEX IF NOT EXISTS idx_asap_reports_reporter ON asap_reports(reporter_id);

-- ── asap_erc_reviews ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS asap_erc_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES asap_reports(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_name TEXT,
  review_date TIMESTAMPTZ DEFAULT now(),
  meets_acceptance BOOLEAN,
  acceptance_notes TEXT,
  meets_exclusion BOOLEAN,
  exclusion_notes TEXT,
  sole_source_assessment TEXT,
  risk_severity TEXT,
  risk_likelihood TEXT,
  risk_level TEXT,
  recommendation TEXT,
  recommended_action TEXT,
  disposition TEXT,
  disposition_notes TEXT,
  vote TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE asap_erc_reviews ENABLE ROW LEVEL SECURITY;

-- Admin/safety_manager, OR reporter can see reviews on their own report
CREATE POLICY "asap_erc_reviews_select" ON asap_erc_reviews
  FOR SELECT USING (
    report_id IN (
      SELECT id FROM asap_reports WHERE reporter_id = auth.uid()
    )
    OR report_id IN (
      SELECT ar.id FROM asap_reports ar
      JOIN profiles p ON p.org_id = ar.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_erc_reviews_insert" ON asap_erc_reviews
  FOR INSERT WITH CHECK (
    report_id IN (
      SELECT ar.id FROM asap_reports ar
      JOIN profiles p ON p.org_id = ar.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_erc_reviews_update" ON asap_erc_reviews
  FOR UPDATE USING (
    report_id IN (
      SELECT ar.id FROM asap_reports ar
      JOIN profiles p ON p.org_id = ar.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_asap_erc_reviews_report ON asap_erc_reviews(report_id);

-- ── asap_corrective_actions ────────────────────────────────
CREATE TABLE IF NOT EXISTS asap_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES asap_reports(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  due_date DATE,
  status TEXT DEFAULT 'open',
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE asap_corrective_actions ENABLE ROW LEVEL SECURITY;

-- Admin/safety_manager, assigned user, or reporter of linked report
CREATE POLICY "asap_corrective_actions_select" ON asap_corrective_actions
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR report_id IN (
      SELECT id FROM asap_reports WHERE reporter_id = auth.uid()
    )
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_corrective_actions_insert" ON asap_corrective_actions
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_corrective_actions_update" ON asap_corrective_actions
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_corrective_actions_delete" ON asap_corrective_actions
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_asap_corrective_actions_report ON asap_corrective_actions(report_id);

-- ── asap_meetings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asap_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_date TIMESTAMPTZ NOT NULL,
  attendees JSONB DEFAULT '[]'::jsonb,
  report_ids JSONB DEFAULT '[]'::jsonb,
  minutes TEXT,
  decisions JSONB DEFAULT '[]'::jsonb,
  next_meeting_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE asap_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asap_meetings_select" ON asap_meetings
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "asap_meetings_insert" ON asap_meetings
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_meetings_update" ON asap_meetings
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "asap_meetings_delete" ON asap_meetings
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_asap_meetings_org ON asap_meetings(org_id);
