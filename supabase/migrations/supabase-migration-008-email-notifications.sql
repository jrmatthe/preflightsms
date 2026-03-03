-- Migration 008: Add email to notification contacts
alter table public.notification_contacts
  add column if not exists email text default '';
