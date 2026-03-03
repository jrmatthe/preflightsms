-- Migration 014: Standalone Platform Admin Auth
-- Run in Supabase SQL Editor
-- Creates a separate platform_admins table independent of customer orgs

-- Platform admins table — completely separate from profiles/organizations
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null default '',
  created_at timestamptz default now(),
  last_login_at timestamptz,
  is_active boolean default true
);

-- No RLS on this table — it's accessed via API routes with server-side auth
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no client-side access)
-- This means we MUST use the service key in our API route, not the anon key

-- Create your initial platform admin account
-- Password will be set via the app's setup flow, but here's a default:
-- The password is hashed with pgcrypto — we'll handle this in the API route instead

-- For now, insert a record that the API route will use
-- The API route will handle password hashing with bcrypt
