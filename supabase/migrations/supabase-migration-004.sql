-- Migration 004: Add org logo support
-- Run this in Supabase SQL Editor

-- Add logo_url column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for org logos (run in Supabase Dashboard > Storage > New Bucket)
-- Name: org-logos
-- Public: true
-- Or run this:
INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone authenticated can upload to their org's folder
CREATE POLICY "Authenticated users can upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org-logos');

-- Anyone can view org logos (they're public)
CREATE POLICY "Public can view org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');

-- Authenticated users can update/delete their uploads
CREATE POLICY "Authenticated users can update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'org-logos');

CREATE POLICY "Authenticated users can delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'org-logos');
