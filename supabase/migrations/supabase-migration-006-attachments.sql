-- ═══════════════════════════════════════════════════════════════
-- Migration 006: FRAT Photo Attachments
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════════

-- Add attachments column to frat_submissions
alter table public.frat_submissions 
  add column if not exists attachments jsonb default '[]'::jsonb;

-- Add attachments column to flights too (for reference)
alter table public.flights 
  add column if not exists attachments jsonb default '[]'::jsonb;

-- Create storage bucket for FRAT attachments
-- NOTE: After running this SQL, go to Storage in Supabase dashboard and:
-- 1. Create a new bucket called "frat-attachments" 
-- 2. Set it to Public (so images can be viewed by URL)
-- 3. Add a policy: allow authenticated users to upload (INSERT) 
--    with path matching their org_id prefix
-- 
-- Or run these storage policies via SQL:
insert into storage.buckets (id, name, public) 
  values ('frat-attachments', 'frat-attachments', true)
  on conflict (id) do nothing;

create policy "Authenticated users can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'frat-attachments');

create policy "Anyone can view attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'frat-attachments');

create policy "Users can delete their own attachments"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'frat-attachments');
