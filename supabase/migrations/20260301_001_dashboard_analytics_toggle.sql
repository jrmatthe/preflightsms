-- Add dashboard_analytics_enabled toggle to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS dashboard_analytics_enabled BOOLEAN DEFAULT true;
