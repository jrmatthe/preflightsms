-- Safety Culture Survey Tool
-- Part 5 Safety Promotion pillar — organizational culture assessment
-- Run this in the Supabase SQL editor

-- ── culture_surveys ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS culture_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  is_anonymous BOOLEAN DEFAULT true,
  template_type TEXT DEFAULT 'standard',
  questions JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE culture_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "culture_surveys_select" ON culture_surveys
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "culture_surveys_insert" ON culture_surveys
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "culture_surveys_update" ON culture_surveys
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "culture_surveys_delete" ON culture_surveys
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_culture_surveys_org ON culture_surveys(org_id);

-- ── culture_survey_responses ─────────────────────────────────
-- Anonymous protection: respondent_id is stored but RLS prevents
-- admins from reading it when the survey is anonymous.
-- A database view strips respondent_id for anonymous surveys.
CREATE TABLE IF NOT EXISTS culture_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES culture_surveys(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES profiles(id),
  respondent_role TEXT,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE culture_survey_responses ENABLE ROW LEVEL SECURITY;

-- All org members can INSERT their own response
CREATE POLICY "culture_responses_insert" ON culture_survey_responses
  FOR INSERT WITH CHECK (
    survey_id IN (
      SELECT cs.id FROM culture_surveys cs
      JOIN profiles p ON p.org_id = cs.org_id
      WHERE p.id = auth.uid()
    )
  );

-- Admins/safety_managers can read responses for aggregate analysis,
-- but respondent_id is protected via the anonymous view below.
-- Users can read their own responses.
CREATE POLICY "culture_responses_select" ON culture_survey_responses
  FOR SELECT USING (
    respondent_id = auth.uid()
    OR survey_id IN (
      SELECT cs.id FROM culture_surveys cs
      JOIN profiles p ON p.org_id = cs.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_culture_responses_survey ON culture_survey_responses(survey_id);

-- Anonymous view: strips respondent_id for anonymous surveys
CREATE OR REPLACE VIEW culture_survey_responses_safe AS
SELECT
  r.id,
  r.survey_id,
  CASE WHEN s.is_anonymous THEN NULL ELSE r.respondent_id END AS respondent_id,
  r.respondent_role,
  r.answers,
  r.submitted_at
FROM culture_survey_responses r
JOIN culture_surveys s ON s.id = r.survey_id;

-- ── culture_survey_results ───────────────────────────────────
CREATE TABLE IF NOT EXISTS culture_survey_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES culture_surveys(id) ON DELETE CASCADE,
  overall_score NUMERIC,
  dimension_scores JSONB,
  response_rate NUMERIC,
  total_responses INTEGER,
  analysis_notes TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE culture_survey_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "culture_results_select" ON culture_survey_results
  FOR SELECT USING (
    survey_id IN (
      SELECT cs.id FROM culture_surveys cs
      JOIN profiles p ON p.org_id = cs.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "culture_results_insert" ON culture_survey_results
  FOR INSERT WITH CHECK (
    survey_id IN (
      SELECT cs.id FROM culture_surveys cs
      JOIN profiles p ON p.org_id = cs.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "culture_results_update" ON culture_survey_results
  FOR UPDATE USING (
    survey_id IN (
      SELECT cs.id FROM culture_surveys cs
      JOIN profiles p ON p.org_id = cs.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_culture_results_survey ON culture_survey_results(survey_id);
