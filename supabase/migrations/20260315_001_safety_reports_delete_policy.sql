-- Add missing DELETE RLS policy for safety_reports
-- Without this, client-side deleteReport() silently fails (RLS blocks it)
-- Only admins and safety managers should be able to delete reports

CREATE POLICY "Admins can delete org reports"
  ON public.safety_reports FOR DELETE
  USING (
    org_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'safety_manager', 'accountable_exec', 'chief_pilot')
    )
  );
