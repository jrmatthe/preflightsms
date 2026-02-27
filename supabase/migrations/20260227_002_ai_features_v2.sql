-- 20260227_002_ai_features_v2.sql
-- AI Features V2: auto-categorize, trend narrative, lessons learned, draft assist, safety digest

-- Lessons learned on hazard_register
ALTER TABLE hazard_register ADD COLUMN IF NOT EXISTS lessons_learned JSONB;

-- AI suggestion tracking on safety_reports
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS ai_suggested_category TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS ai_suggested_severity TEXT;

-- Narrative field on trend_alerts
ALTER TABLE trend_alerts ADD COLUMN IF NOT EXISTS narrative JSONB;

-- Safety digests table
CREATE TABLE IF NOT EXISTS safety_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  digest_data JSONB NOT NULL DEFAULT '{}',
  recipients TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE safety_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safety_digests_select" ON safety_digests
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "safety_digests_service_insert" ON safety_digests
  FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_safety_digests_org ON safety_digests(org_id);

-- Expand ai_suggestions context_type CHECK
ALTER TABLE ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_context_type_check;
ALTER TABLE ai_suggestions ADD CONSTRAINT ai_suggestions_context_type_check
  CHECK (context_type IN ('frat', 'investigation', 'search', 'categorize', 'lessons_learned', 'draft_assist', 'digest'));
