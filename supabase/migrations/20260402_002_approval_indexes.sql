-- Add indexes for approval_status queries — prevents full table scans on approval workflows
CREATE INDEX IF NOT EXISTS idx_flights_org_approval ON flights(org_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_frat_submissions_org_approval ON frat_submissions(org_id, approval_status);
