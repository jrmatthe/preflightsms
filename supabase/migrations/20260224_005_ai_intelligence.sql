-- AI Risk Intelligence Module
-- AI-powered risk suggestions, trend analysis, and investigation assistance
-- Gated to Professional+ tier via safety_trend_alerts feature flag

-- ── ai_suggestions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('frat', 'investigation', 'search')),
  context_id UUID,
  suggestion_data JSONB NOT NULL DEFAULT '{}',
  model_used TEXT DEFAULT '',
  accepted BOOLEAN,
  feedback TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_suggestions_select" ON ai_suggestions
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "ai_suggestions_insert" ON ai_suggestions
  FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "ai_suggestions_update" ON ai_suggestions
  FOR UPDATE USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_org ON ai_suggestions(org_id);

-- ── trend_alerts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trend_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'trend',
  metric_name TEXT NOT NULL,
  current_value NUMERIC,
  baseline_value NUMERIC,
  change_percentage NUMERIC,
  period_start DATE,
  period_end DATE,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trend_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trend_alerts_select" ON trend_alerts
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "trend_alerts_update" ON trend_alerts
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- Service role inserts (edge function), no user-facing insert policy needed
CREATE POLICY "trend_alerts_service_insert" ON trend_alerts
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trend_alerts_org ON trend_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_org_created ON trend_alerts(org_id, created_at);

-- ── ai_usage_log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  feature TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_estimate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_log_select" ON ai_usage_log
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

-- Service role inserts (edge function)
CREATE POLICY "ai_usage_log_service_insert" ON ai_usage_log
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org ON ai_usage_log(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_created ON ai_usage_log(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_rate_limit ON ai_usage_log(user_id, feature, created_at);
