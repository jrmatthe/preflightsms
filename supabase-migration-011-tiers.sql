-- Migration 011: Subscription Tiers & Feature Flags
-- Run in Supabase SQL Editor

-- Add tier and feature control to organizations
alter table public.organizations
  add column if not exists tier text default 'starter',
  add column if not exists max_aircraft integer default 5,
  add column if not exists feature_flags jsonb default '{
    "frat": true,
    "flight_following": true,
    "crew_roster": true,
    "safety_reporting": true,
    "hazard_register": true,
    "corrective_actions": true,
    "policy_library": true,
    "training_records": true,
    "dashboard_analytics": true,
    "custom_frat_template": false,
    "cbt_modules": false,
    "role_permissions": false,
    "approval_workflow": false,
    "document_library": false,
    "api_access": false,
    "multi_base": false,
    "custom_integrations": false,
    "priority_support": false
  }'::jsonb,
  add column if not exists subscription_status text default 'trial',
  add column if not exists trial_ends_at timestamptz default (now() + interval '30 days'),
  add column if not exists stripe_customer_id text default '',
  add column if not exists stripe_subscription_id text default '';

-- Update PVTAIR to enterprise (full access for your own company)
-- Replace 'your-org-id' with actual org ID or run separately
-- UPDATE public.organizations SET tier = 'enterprise', max_aircraft = 999, subscription_status = 'active',
--   feature_flags = '{"frat":true,"flight_following":true,"crew_roster":true,"safety_reporting":true,"hazard_register":true,"corrective_actions":true,"policy_library":true,"training_records":true,"dashboard_analytics":true,"custom_frat_template":true,"cbt_modules":true,"role_permissions":true,"approval_workflow":true,"document_library":true,"api_access":true,"multi_base":true,"custom_integrations":true,"priority_support":true}'::jsonb
-- WHERE slug = 'pvtair';
