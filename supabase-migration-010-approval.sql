-- Migration 010: FRAT Approval Workflow
-- Run in Supabase SQL Editor

-- Add approval fields to frat_submissions
alter table public.frat_submissions
  add column if not exists approval_status text default 'auto_approved',
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists approval_notes text default '';

-- Add approval threshold to frat_templates (score at which approval is required)
alter table public.frat_templates
  add column if not exists approval_threshold integer default 31;

-- Add approval fields to flights
alter table public.flights
  add column if not exists approval_status text default 'approved';
