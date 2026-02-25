-- Free tier for single-pilot operators
-- No new tables needed — Free tier uses existing tables with strict limits enforced at application level.
-- Tier value 'free' is now valid for organizations.tier column.
-- Free tier orgs have: subscription_status = 'free' (never expires), max_aircraft = 1

-- If the tier column has a check constraint, update it to include 'free':
DO $$
BEGIN
  -- Drop existing constraint if it exists (safe — only attempts if present)
  BEGIN
    ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_tier_check;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  -- Add updated constraint including 'free'
  BEGIN
    ALTER TABLE organizations ADD CONSTRAINT organizations_tier_check
      CHECK (tier IN ('free', 'starter', 'professional', 'enterprise'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add index for quick lookups of free tier orgs (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(tier);
