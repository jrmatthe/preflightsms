-- ═══════════════════════════════════════════════════════════════
-- PreflightSMS — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════════════

-- 1. ORGANIZATIONS
-- Each Part 135 operator is an organization
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,           -- URL-friendly: "pvtair", "acme-aviation"
  certificate_number text,             -- FAA Part 135 certificate #
  created_at timestamptz default now(),
  settings jsonb default '{}'::jsonb   -- org-level config (risk thresholds, FRAT template overrides, etc.)
);

-- 2. PROFILES
-- Every user belongs to one organization with a role
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  role text not null default 'pilot' check (role in ('pilot', 'safety_manager', 'chief_pilot', 'accountable_exec', 'admin')),
  email text,
  created_at timestamptz default now()
);

-- 3. FRAT SUBMISSIONS
create table public.frat_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  frat_code text not null,             -- human-readable: "FRAT-ABC123"
  pilot text not null,
  aircraft text not null,
  tail_number text default '',
  departure text not null,
  destination text not null,
  cruise_alt text default '',
  flight_date date,
  etd text default '',                 -- local time string as entered: "1430"
  ete text default '',                 -- "1:30"
  eta timestamptz,                     -- computed arrival time (UTC)
  fuel_lbs text default '',
  num_crew text default '',
  num_pax text default '',
  score integer not null,
  risk_level text not null,
  factors text[] not null default '{}', -- array of factor IDs: {"wx_ceiling","plt_fatigue"}
  wx_briefing text default '',
  remarks text default '',
  created_at timestamptz default now()
);

-- 4. FLIGHTS (Flight Following)
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  frat_id uuid references public.frat_submissions(id) on delete set null,
  frat_code text not null,             -- matches frat_submissions.frat_code
  pilot text not null,
  aircraft text not null,
  tail_number text default '',
  departure text not null,
  destination text not null,
  cruise_alt text default '',
  etd text default '',
  ete text default '',
  eta timestamptz,
  fuel_lbs text default '',
  num_crew text default '',
  num_pax text default '',
  score integer not null default 0,
  risk_level text not null default 'LOW RISK',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARRIVED', 'CANCELLED')),
  created_at timestamptz default now(),
  arrived_at timestamptz
);

-- 5. INDEXES for performance
create index idx_frat_org on public.frat_submissions(org_id);
create index idx_frat_created on public.frat_submissions(created_at desc);
create index idx_flights_org on public.flights(org_id);
create index idx_flights_status on public.flights(org_id, status);
create index idx_profiles_org on public.profiles(org_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- Users can only see/modify data belonging to their organization
-- ═══════════════════════════════════════════════════════════════

-- Helper function: get current user's org_id
create or replace function public.get_user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- ORGANIZATIONS: users can read their own org, create during signup
alter table public.organizations enable row level security;
create policy "Authenticated users can view orgs"
  on public.organizations for select
  using (auth.uid() is not null);
create policy "Authenticated users can create orgs"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- PROFILES: users can read profiles in their org, update their own
alter table public.profiles enable row level security;
create policy "Users can view org profiles"
  on public.profiles for select
  using (org_id = public.get_user_org_id());
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());
-- Allow insert during signup (before profile exists)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- FRAT SUBMISSIONS: org-scoped CRUD
alter table public.frat_submissions enable row level security;
create policy "Users can view org FRATs"
  on public.frat_submissions for select
  using (org_id = public.get_user_org_id());
create policy "Users can insert org FRATs"
  on public.frat_submissions for insert
  with check (org_id = public.get_user_org_id());
create policy "Users can delete own FRATs"
  on public.frat_submissions for delete
  using (org_id = public.get_user_org_id() and user_id = auth.uid());
-- Admins/safety managers can delete any org FRAT (handled in app logic for now)

-- FLIGHTS: org-scoped CRUD
alter table public.flights enable row level security;
create policy "Users can view org flights"
  on public.flights for select
  using (org_id = public.get_user_org_id());
create policy "Users can insert org flights"
  on public.flights for insert
  with check (org_id = public.get_user_org_id());
create policy "Users can update org flights"
  on public.flights for update
  using (org_id = public.get_user_org_id());

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA: Create PVTAIR as the first organization
-- ═══════════════════════════════════════════════════════════════
insert into public.organizations (name, slug, certificate_number)
values ('PVTAIR', 'pvtair', null);

-- Enable realtime for flights (live flight board across devices)
alter publication supabase_realtime add table public.flights;
