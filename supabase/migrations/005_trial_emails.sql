-- Trial email tracking — prevents duplicate sends
CREATE TABLE IF NOT EXISTS trial_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'getting_started', 'mid_trial', 'expiring_soon', 'trial_expired'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_email TEXT NOT NULL,
  UNIQUE(org_id, email_type)
);

ALTER TABLE trial_emails_sent ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (edge function)
CREATE POLICY "trial_emails_service_only" ON trial_emails_sent
  FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS idx_trial_emails_org ON trial_emails_sent(org_id);
