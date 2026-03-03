-- ═══════════════════════════════════════════════════════════════
-- Migration 018: In-App Notification Center
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════════

-- Notifications — one row per notification event
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link_tab text,
  target_roles text[],
  target_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Notification reads — tracks which user has read which notification
create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  read_at timestamptz default now(),
  unique(notification_id, user_id)
);

-- ── RLS ─────────────────────────────────────────────────────────

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

-- notifications: SELECT for org members
create policy "Users can view their org notifications"
  on public.notifications for select
  to authenticated
  using (org_id in (select org_id from profiles where id = auth.uid()));

-- notifications: INSERT for org members
create policy "Org members can create notifications"
  on public.notifications for insert
  to authenticated
  with check (org_id in (select org_id from profiles where id = auth.uid()));

-- notification_reads: SELECT own reads
create policy "Users can view their own reads"
  on public.notification_reads for select
  to authenticated
  using (user_id = auth.uid());

-- notification_reads: INSERT own reads
create policy "Users can mark notifications read"
  on public.notification_reads for insert
  to authenticated
  with check (user_id = auth.uid());

-- ── Indexes ─────────────────────────────────────────────────────

create index if not exists idx_notifications_org_created
  on public.notifications(org_id, created_at desc);

create index if not exists idx_notification_reads_user
  on public.notification_reads(user_id);
