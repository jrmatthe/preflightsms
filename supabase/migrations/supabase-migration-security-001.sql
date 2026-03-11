-- Security migration: Fix RLS policies
-- 1. Scope organizations SELECT to user's own org
-- 2. Tighten attachments storage policy
-- 3. Enable RLS on adsb_provider_health

-- ── 1. Fix organizations RLS: users can only SELECT their own org ──
DROP POLICY IF EXISTS "Authenticated users can view orgs" ON public.organizations;

CREATE POLICY "Users can view their own org"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Keep existing INSERT policy (needed during signup flow)

-- ── 2. Tighten attachments storage policy ──
-- Note: Upload paths use random UUIDs without org_id prefix, so we cannot
-- scope by storage path. Attachment URLs are only exposed to users who can
-- read the parent FRAT record (which IS org-scoped via RLS). This policy
-- adds defense-in-depth by requiring the user to belong to an org.
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;

CREATE POLICY "Org members can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND auth.uid() IN (SELECT id FROM profiles WHERE org_id IS NOT NULL)
  );

-- ── 3. Enable RLS on adsb_provider_health ──
-- System monitoring table written by service role only.
-- Service role bypasses RLS, so cron inserts still work.
-- No user-facing SELECT policy needed.
ALTER TABLE public.adsb_provider_health ENABLE ROW LEVEL SECURITY;
