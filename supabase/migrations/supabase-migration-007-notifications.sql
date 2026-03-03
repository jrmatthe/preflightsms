-- ═══════════════════════════════════════════════════════════════
-- Migration 007: Overdue Flight Notifications
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════════

-- Notification contacts — configurable per org
create table if not exists public.notification_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text not null,              -- E.164 format: +15095551234
  role text default '',             -- descriptive: "Chief Pilot", "DO", "Safety Manager"
  notify_overdue boolean default true,
  notify_hazard boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);

-- RLS
alter table public.notification_contacts enable row level security;

create policy "Users can view their org contacts"
  on public.notification_contacts for select
  to authenticated
  using (org_id in (select org_id from profiles where id = auth.uid()));

create policy "Admins can manage contacts"
  on public.notification_contacts for insert
  to authenticated
  with check (org_id in (select org_id from profiles where id = auth.uid()));

create policy "Admins can update contacts"
  on public.notification_contacts for update
  to authenticated
  using (org_id in (select org_id from profiles where id = auth.uid()));

create policy "Admins can delete contacts"
  on public.notification_contacts for delete
  to authenticated
  using (org_id in (select org_id from profiles where id = auth.uid()));

-- Track whether we've already notified for an overdue flight
alter table public.flights 
  add column if not exists overdue_notified_at timestamptz default null;
