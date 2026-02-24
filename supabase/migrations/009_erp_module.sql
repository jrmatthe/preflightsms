-- Emergency Response Plan (ERP) Module
-- Part 5 §5.27 — Emergency Response Plans
-- Run this in the Supabase SQL editor

-- ── erp_plans ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE erp_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_plans_select" ON erp_plans
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "erp_plans_insert" ON erp_plans
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "erp_plans_update" ON erp_plans
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "erp_plans_delete" ON erp_plans
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_erp_plans_org ON erp_plans(org_id);

-- ── erp_checklist_items ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_plan_id UUID NOT NULL REFERENCES erp_plans(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  action_text TEXT NOT NULL,
  responsible_role TEXT DEFAULT '',
  time_target TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_critical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE erp_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_checklist_select" ON erp_checklist_items
  FOR SELECT USING (
    erp_plan_id IN (
      SELECT ep.id FROM erp_plans ep
      JOIN profiles p ON p.org_id = ep.org_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "erp_checklist_insert" ON erp_checklist_items
  FOR INSERT WITH CHECK (
    erp_plan_id IN (
      SELECT ep.id FROM erp_plans ep
      JOIN profiles p ON p.org_id = ep.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "erp_checklist_update" ON erp_checklist_items
  FOR UPDATE USING (
    erp_plan_id IN (
      SELECT ep.id FROM erp_plans ep
      JOIN profiles p ON p.org_id = ep.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "erp_checklist_delete" ON erp_checklist_items
  FOR DELETE USING (
    erp_plan_id IN (
      SELECT ep.id FROM erp_plans ep
      JOIN profiles p ON p.org_id = ep.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_erp_checklist_plan ON erp_checklist_items(erp_plan_id);

-- ── erp_call_tree ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_call_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_plan_id UUID NOT NULL REFERENCES erp_plans(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  contact_name TEXT NOT NULL,
  contact_role TEXT DEFAULT '',
  phone_primary TEXT DEFAULT '',
  phone_secondary TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_external BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE erp_call_tree ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_call_tree_select" ON erp_call_tree
  FOR SELECT USING (
    erp_plan_id IN (
      SELECT ep.id FROM erp_plans ep
      JOIN profiles p ON p.org_id = ep.org_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "erp_call_tree_insert" ON erp_call_tree
  FOR INSERT WITH CHECK (
    erp_plan_id IN (
      SELECT ep.id FROM erp_plans ep
      JOIN profiles p ON p.org_id = ep.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "erp_call_tree_update" ON erp_call_tree
  FOR UPDATE USING (
    erp_plan_id IN (
      SELECT ep.id FROM erp_plans ep
      JOIN profiles p ON p.org_id = ep.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "erp_call_tree_delete" ON erp_call_tree
  FOR DELETE USING (
    erp_plan_id IN (
      SELECT ep.id FROM erp_plans ep
      JOIN profiles p ON p.org_id = ep.org_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_erp_call_tree_plan ON erp_call_tree(erp_plan_id);

-- ── erp_drills ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  erp_plan_id UUID NOT NULL REFERENCES erp_plans(id) ON DELETE CASCADE,
  drill_type TEXT NOT NULL DEFAULT 'tabletop',
  scheduled_date DATE,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  participants TEXT[] DEFAULT '{}',
  lessons_learned TEXT DEFAULT '',
  findings TEXT DEFAULT '',
  conducted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE erp_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_drills_select" ON erp_drills
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "erp_drills_insert" ON erp_drills
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "erp_drills_update" ON erp_drills
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "erp_drills_delete" ON erp_drills
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_erp_drills_org ON erp_drills(org_id);
CREATE INDEX IF NOT EXISTS idx_erp_drills_plan ON erp_drills(erp_plan_id);
CREATE INDEX IF NOT EXISTS idx_erp_drills_status ON erp_drills(org_id, status);
