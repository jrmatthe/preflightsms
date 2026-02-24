-- Safety Performance Indicators (SPIs) & Targets (SPTs)
-- 14 CFR Part 5 §5.71–5.75
-- Run this in the Supabase SQL editor

-- ── safety_performance_indicators ─────────────────────────────
CREATE TABLE IF NOT EXISTS safety_performance_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- reactive, proactive, predictive
  data_source TEXT NOT NULL, -- frats, safety_reports, corrective_actions, training, investigations, custom
  calculation_method TEXT NOT NULL, -- count, rate, percentage, average, custom_formula
  formula_config JSONB, -- { numerator: "...", denominator: "...", multiplier: 100 }
  unit TEXT, -- "per 100 hrs", "%", "count", "days"
  measurement_period TEXT DEFAULT 'monthly', -- weekly, monthly, quarterly, annually
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE safety_performance_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spi_select" ON safety_performance_indicators
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "spi_insert" ON safety_performance_indicators
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "spi_update" ON safety_performance_indicators
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "spi_delete" ON safety_performance_indicators
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_spi_org ON safety_performance_indicators(org_id);

-- ── safety_performance_targets ────────────────────────────────
CREATE TABLE IF NOT EXISTS safety_performance_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spi_id UUID NOT NULL REFERENCES safety_performance_indicators(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- minimum, maximum, range
  target_value NUMERIC,
  alert_threshold NUMERIC,
  effective_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE safety_performance_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spt_select" ON safety_performance_targets
  FOR SELECT USING (
    spi_id IN (
      SELECT spi.id FROM safety_performance_indicators spi
      JOIN profiles p ON p.org_id = spi.org_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "spt_insert" ON safety_performance_targets
  FOR INSERT WITH CHECK (
    spi_id IN (
      SELECT spi.id FROM safety_performance_indicators spi
      JOIN profiles p ON p.org_id = spi.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "spt_update" ON safety_performance_targets
  FOR UPDATE USING (
    spi_id IN (
      SELECT spi.id FROM safety_performance_indicators spi
      JOIN profiles p ON p.org_id = spi.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "spt_delete" ON safety_performance_targets
  FOR DELETE USING (
    spi_id IN (
      SELECT spi.id FROM safety_performance_indicators spi
      JOIN profiles p ON p.org_id = spi.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_spt_spi ON safety_performance_targets(spi_id);

-- ── spi_measurements ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spi_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spi_id UUID NOT NULL REFERENCES safety_performance_indicators(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  measured_value NUMERIC NOT NULL,
  target_value NUMERIC,
  status TEXT, -- on_target, approaching_threshold, breached
  auto_calculated BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE spi_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spim_select" ON spi_measurements
  FOR SELECT USING (
    spi_id IN (
      SELECT spi.id FROM safety_performance_indicators spi
      JOIN profiles p ON p.org_id = spi.org_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "spim_insert" ON spi_measurements
  FOR INSERT WITH CHECK (
    spi_id IN (
      SELECT spi.id FROM safety_performance_indicators spi
      JOIN profiles p ON p.org_id = spi.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "spim_update" ON spi_measurements
  FOR UPDATE USING (
    spi_id IN (
      SELECT spi.id FROM safety_performance_indicators spi
      JOIN profiles p ON p.org_id = spi.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "spim_delete" ON spi_measurements
  FOR DELETE USING (
    spi_id IN (
      SELECT spi.id FROM safety_performance_indicators spi
      JOIN profiles p ON p.org_id = spi.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_spim_spi ON spi_measurements(spi_id);
CREATE INDEX IF NOT EXISTS idx_spim_period ON spi_measurements(spi_id, period_start);
