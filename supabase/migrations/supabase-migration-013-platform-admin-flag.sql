-- Migration 013: Platform Admin Flag
-- Run in Supabase SQL Editor

-- Add platform_admin flag to profiles
alter table public.profiles
  add column if not exists platform_admin boolean default false;

-- Set yourself as platform admin (update with your actual user ID or email lookup)
UPDATE public.profiles SET platform_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'jmatthews@pvtair.com' LIMIT 1);

-- Allow platform admins to read all organizations
-- (Drop old policy if it exists, then recreate)
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
CREATE POLICY "Platform admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all organizations" ON public.organizations;
CREATE POLICY "Platform admins can update all organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.platform_admin = true
    )
  );

-- Allow platform admins to read all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.platform_admin = true
    )
  );

-- Allow platform admins to update platform_admin flag on other users
CREATE POLICY "Platform admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.platform_admin = true
    )
  );

-- Cross-org read policies for platform admins
DROP POLICY IF EXISTS "Admins can view all frat_submissions" ON public.frat_submissions;
CREATE POLICY "Platform admins can view all frat_submissions"
  ON public.frat_submissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_admin = true)
  );

DROP POLICY IF EXISTS "Admins can view all flights" ON public.flights;
CREATE POLICY "Platform admins can view all flights"
  ON public.flights FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_admin = true)
  );

DROP POLICY IF EXISTS "Admins can view all safety_reports" ON public.safety_reports;
CREATE POLICY "Platform admins can view all safety_reports"
  ON public.safety_reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_admin = true)
  );

DROP POLICY IF EXISTS "Admins can view all hazard_register" ON public.hazard_register;
CREATE POLICY "Platform admins can view all hazard_register"
  ON public.hazard_register FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_admin = true)
  );

DROP POLICY IF EXISTS "Admins can view all corrective_actions" ON public.corrective_actions;
CREATE POLICY "Platform admins can view all corrective_actions"
  ON public.corrective_actions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.platform_admin = true)
  );
