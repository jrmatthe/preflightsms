-- ═══════════════════════════════════════════════════════════════
-- Migration 009: Fatigue Risk Management
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════════

-- Fatigue assessments linked to FRAT submissions
CREATE TABLE IF NOT EXISTS public.fatigue_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frat_id UUID REFERENCES public.frat_submissions(id) ON DELETE CASCADE,
  pilot_id UUID REFERENCES public.profiles(id),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  sleep_hours_24 NUMERIC,
  hours_awake NUMERIC,
  duty_start_time TIME,
  timezone_crossings INTEGER DEFAULT 0,
  commute_minutes INTEGER,
  subjective_fatigue INTEGER,
  calculated_fatigue_score NUMERIC,
  fatigue_risk_level TEXT,
  mitigations TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fatigue_assessments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fatigue_assessments' AND policyname = 'Users can view their org fatigue assessments') THEN
    CREATE POLICY "Users can view their org fatigue assessments"
      ON public.fatigue_assessments FOR SELECT TO authenticated
      USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fatigue_assessments' AND policyname = 'Users can create fatigue assessments') THEN
    CREATE POLICY "Users can create fatigue assessments"
      ON public.fatigue_assessments FOR INSERT TO authenticated
      WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fatigue_assessments' AND policyname = 'Users can update their own fatigue assessments') THEN
    CREATE POLICY "Users can update their own fatigue assessments"
      ON public.fatigue_assessments FOR UPDATE TO authenticated
      USING (pilot_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fatigue_assessments' AND policyname = 'Admins can delete fatigue assessments') THEN
    CREATE POLICY "Admins can delete fatigue assessments"
      ON public.fatigue_assessments FOR DELETE TO authenticated
      USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fatigue_assessments_org_id ON public.fatigue_assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_assessments_frat_id ON public.fatigue_assessments(frat_id);

-- Add fatigue toggle to FRAT templates
ALTER TABLE public.frat_templates
  ADD COLUMN IF NOT EXISTS include_fatigue BOOLEAN DEFAULT false;

-- Add fatigue summary columns to frat_submissions for analytics
ALTER TABLE public.frat_submissions
  ADD COLUMN IF NOT EXISTS fatigue_score NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fatigue_risk_level TEXT DEFAULT NULL;
