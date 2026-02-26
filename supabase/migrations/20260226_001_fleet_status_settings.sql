-- Fleet Status dashboard settings
-- Allows orgs to disable fleet status entirely or customize visible fields

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS fleet_status_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS fleet_status_fields JSONB DEFAULT '{
    "tailNumber": true,
    "type": true,
    "location": true,
    "fuel": true,
    "updated": true
  }'::jsonb;
