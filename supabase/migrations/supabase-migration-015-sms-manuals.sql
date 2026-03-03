-- Migration 015: SMS Manuals
-- Customizable Part 5 SMS manual templates per organization

create table if not exists public.sms_manuals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  manual_key text not null,
  title text not null,
  description text default '',
  cfr_references text[] default '{}',
  sections jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  version text default '1.0',
  last_edited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, manual_key)
);

create index if not exists idx_sms_manuals_org on public.sms_manuals(org_id);
create index if not exists idx_sms_manuals_key on public.sms_manuals(org_id, manual_key);

alter table public.sms_manuals enable row level security;

create policy "Users can view org manuals"
  on public.sms_manuals for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "Users can insert org manuals"
  on public.sms_manuals for insert
  with check (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "Users can update org manuals"
  on public.sms_manuals for update
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "Users can delete org manuals"
  on public.sms_manuals for delete
  using (org_id in (select org_id from public.profiles where id = auth.uid()));
