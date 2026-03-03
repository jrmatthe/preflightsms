-- ═══════════════════════════════════════════════════════════════
-- PreflightSMS — Migration 016: Link SMS Manuals to Policy Library
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add source_manual_key to policy_documents
-- Links a policy to its source SMS manual (e.g., 'safety_policy', 'erp')
-- NULL for user-created policies (SOPs, checklists, etc.)
ALTER TABLE public.policy_documents
  ADD COLUMN IF NOT EXISTS source_manual_key text DEFAULT NULL;

-- 2. Index for fast lookup: find the policy for a given manual_key in an org
CREATE INDEX IF NOT EXISTS idx_policies_source_manual
  ON public.policy_documents(org_id, source_manual_key)
  WHERE source_manual_key IS NOT NULL;

-- 3. Allow deletion of acknowledgments (needed to reset acks when a manual is updated)
CREATE POLICY "Users can delete org acks"
  ON public.policy_acknowledgments FOR DELETE
  USING (org_id = public.get_user_org_id());
