-- ═══════════════════════════════════════════════════════════════
-- Migration 011: Public API & Webhook System
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════════

-- ── api_keys ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Admins can view org api keys') THEN
    CREATE POLICY "Admins can view org api keys"
      ON public.api_keys FOR SELECT TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Admins can create api keys') THEN
    CREATE POLICY "Admins can create api keys"
      ON public.api_keys FOR INSERT TO authenticated
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Admins can update api keys') THEN
    CREATE POLICY "Admins can update api keys"
      ON public.api_keys FOR UPDATE TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Admins can delete api keys') THEN
    CREATE POLICY "Admins can delete api keys"
      ON public.api_keys FOR DELETE TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);

-- ── webhooks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhooks' AND policyname = 'Admins can view org webhooks') THEN
    CREATE POLICY "Admins can view org webhooks"
      ON public.webhooks FOR SELECT TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhooks' AND policyname = 'Admins can create webhooks') THEN
    CREATE POLICY "Admins can create webhooks"
      ON public.webhooks FOR INSERT TO authenticated
      WITH CHECK (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhooks' AND policyname = 'Admins can update webhooks') THEN
    CREATE POLICY "Admins can update webhooks"
      ON public.webhooks FOR UPDATE TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhooks' AND policyname = 'Admins can delete webhooks') THEN
    CREATE POLICY "Admins can delete webhooks"
      ON public.webhooks FOR DELETE TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhooks(org_id);

-- ── api_request_log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id),
  org_id UUID REFERENCES public.organizations(id),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_request_log' AND policyname = 'Admins can view org api logs') THEN
    CREATE POLICY "Admins can view org api logs"
      ON public.api_request_log FOR SELECT TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_request_log' AND policyname = 'System can insert api logs') THEN
    CREATE POLICY "System can insert api logs"
      ON public.api_request_log FOR INSERT TO authenticated
      WITH CHECK (
        org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_api_request_log_org ON public.api_request_log(org_id);
CREATE INDEX IF NOT EXISTS idx_api_request_log_key ON public.api_request_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_log_created ON public.api_request_log(created_at DESC);
