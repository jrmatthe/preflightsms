-- Add Stripe columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_org_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_org_stripe_subscription ON organizations(stripe_subscription_id);
