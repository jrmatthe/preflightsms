-- Allow admin/safety_manager to delete audits
CREATE POLICY "audits_delete" ON audits
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );
