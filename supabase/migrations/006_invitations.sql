-- User invitations system
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pilot',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(org_id, email, status) -- prevent duplicate pending invites to same email
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org members can read invitations for their org
CREATE POLICY "invitations_read_org" ON invitations
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can create/update invitations
CREATE POLICY "invitations_write_admin" ON invitations
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'safety_manager', 'accountable_exec')
    )
  );

CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
