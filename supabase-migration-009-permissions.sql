-- Migration 009: Permissions system + org timezone
-- Run in Supabase SQL Editor

-- Add permissions array to profiles (keeps existing role for backward compat)
alter table public.profiles
  add column if not exists permissions jsonb default '[]'::jsonb;

-- Add timezone to organizations
alter table public.organizations
  add column if not exists timezone text default 'America/Los_Angeles';

-- Drop the CHECK constraint on role so we can add flight_follower and custom roles
-- First find and drop the existing constraint
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
