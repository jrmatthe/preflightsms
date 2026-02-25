-- ═══════════════════════════════════════════════════════════════
-- Migration 010: Pilot Engagement & Gamification
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════════

-- ── pilot_engagement ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pilot_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  best_value INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, metric_type)
);

ALTER TABLE public.pilot_engagement ENABLE ROW LEVEL SECURITY;

-- Pilots can read their own engagement data
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pilot_engagement' AND policyname = 'Users can view own engagement') THEN
    CREATE POLICY "Users can view own engagement"
      ON public.pilot_engagement FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Admins/safety managers can read all org engagement data
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pilot_engagement' AND policyname = 'Admins can view org engagement') THEN
    CREATE POLICY "Admins can view org engagement"
      ON public.pilot_engagement FOR SELECT TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager', 'accountable_exec', 'chief_pilot')
        )
      );
  END IF;
END $$;

-- Authenticated users can insert/update their own engagement
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pilot_engagement' AND policyname = 'Users can upsert own engagement') THEN
    CREATE POLICY "Users can upsert own engagement"
      ON public.pilot_engagement FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pilot_engagement' AND policyname = 'Users can update own engagement') THEN
    CREATE POLICY "Users can update own engagement"
      ON public.pilot_engagement FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pilot_engagement_user ON public.pilot_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_pilot_engagement_org ON public.pilot_engagement(org_id);

-- ── safety_recognitions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.safety_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  recognition_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false
);

ALTER TABLE public.safety_recognitions ENABLE ROW LEVEL SECURITY;

-- Users can view their own recognitions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'safety_recognitions' AND policyname = 'Users can view own recognitions') THEN
    CREATE POLICY "Users can view own recognitions"
      ON public.safety_recognitions FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Admins can view all org recognitions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'safety_recognitions' AND policyname = 'Admins can view org recognitions') THEN
    CREATE POLICY "Admins can view org recognitions"
      ON public.safety_recognitions FOR SELECT TO authenticated
      USING (
        org_id IN (
          SELECT org_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'safety_manager', 'accountable_exec', 'chief_pilot')
        )
      );
  END IF;
END $$;

-- Users can insert recognitions (for self-triggered awards)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'safety_recognitions' AND policyname = 'Users can insert recognitions') THEN
    CREATE POLICY "Users can insert recognitions"
      ON public.safety_recognitions FOR INSERT TO authenticated
      WITH CHECK (
        org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

-- Users can update their own recognitions (acknowledge)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'safety_recognitions' AND policyname = 'Users can update own recognitions') THEN
    CREATE POLICY "Users can update own recognitions"
      ON public.safety_recognitions FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_safety_recognitions_user ON public.safety_recognitions(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_recognitions_org ON public.safety_recognitions(org_id);

-- ── Add gamification_enabled to organizations ───────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS gamification_enabled BOOLEAN DEFAULT true;

-- ── Add monthly_engagement_email to organizations ───────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS monthly_engagement_email BOOLEAN DEFAULT false;
