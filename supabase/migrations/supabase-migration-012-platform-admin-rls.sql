-- Migration 012: Platform Admin RLS Policies
-- Run in Supabase SQL Editor
-- Allows admin-role users to view all organizations and profiles (for platform admin panel)

-- Allow admins to view ALL organizations (not just their own)
CREATE POLICY "Admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update ALL organizations
CREATE POLICY "Admins can update all organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to view ALL profiles (for user lists in platform admin)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS admin_check
      WHERE admin_check.id = auth.uid()
      AND admin_check.role = 'admin'
    )
  );

-- Allow admins to read counts from all org tables
-- (Only needed if existing RLS is org_id-scoped; these let admins count across orgs)
CREATE POLICY "Admins can view all frat_submissions"
  ON public.frat_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all flights"
  ON public.flights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all safety_reports"
  ON public.safety_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all hazard_register"
  ON public.hazard_register FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all corrective_actions"
  ON public.corrective_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- NOTE: These policies only grant access to users with role='admin'.
-- For extra security, you can further restrict by checking a specific user ID:
--
-- CREATE POLICY "Platform admin only"
--   ON public.organizations FOR SELECT
--   USING (auth.uid() = 'your-specific-user-uuid-here');
--
-- Run this to find your UUID:
-- SELECT id, full_name, role FROM profiles WHERE role = 'admin';
