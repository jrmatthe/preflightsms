-- ERP Acknowledgments: track employee acknowledgment of Emergency Response Plans
-- Supports org-configurable reacknowledgment frequency and auto-reset on plan changes

-- Add acknowledgment frequency to erp_plans (null = no scheduled reacknowledgment, only on change)
ALTER TABLE erp_plans
  ADD COLUMN IF NOT EXISTS acknowledgment_frequency_months INTEGER DEFAULT NULL;

-- Acknowledgment tracking table
CREATE TABLE IF NOT EXISTS erp_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  erp_plan_id UUID NOT NULL REFERENCES erp_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(erp_plan_id, user_id)
);

-- RLS
ALTER TABLE erp_acknowledgments ENABLE ROW LEVEL SECURITY;

-- All org members can read acknowledgments
CREATE POLICY "erp_ack_select" ON erp_acknowledgments
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Users can insert their own acknowledgment
CREATE POLICY "erp_ack_insert" ON erp_acknowledgments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Admins/safety managers can delete acknowledgments (for reset on plan change)
CREATE POLICY "erp_ack_delete" ON erp_acknowledgments
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'safety_manager', 'accountable_exec', 'chief_pilot')
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_erp_ack_plan ON erp_acknowledgments(erp_plan_id);
CREATE INDEX IF NOT EXISTS idx_erp_ack_org ON erp_acknowledgments(org_id);
