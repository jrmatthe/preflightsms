-- ═══════════════════════════════════════════════════════════════
-- PreflightSMS — Migration 002: Safety Reporting & Hazard Register
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. SAFETY REPORTS (Hazard / Incident / Near-miss reporting)
create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  report_code text not null,                -- human-readable: "RPT-ABC123"
  report_type text not null default 'hazard' check (report_type in ('hazard', 'incident', 'near_miss', 'concern')),
  confidential boolean default false,       -- reporter name visible to safety mgr only
  anonymous boolean default false,          -- reporter name not stored at all

  -- What happened
  title text not null,
  description text not null,
  date_occurred date,
  location text default '',                 -- airport, ramp, hangar, route, etc.

  -- Classification
  category text default 'other' check (category in (
    'weather', 'mechanical', 'human_factors', 'procedures', 'training',
    'fatigue', 'communication', 'ground_ops', 'airspace', 'wildlife',
    'maintenance', 'cabin_safety', 'security', 'other'
  )),
  severity text default 'low' check (severity in ('negligible', 'low', 'medium', 'high', 'critical')),
  flight_phase text default '' check (flight_phase in (
    '', 'preflight', 'taxi', 'takeoff', 'climb', 'cruise', 'descent',
    'approach', 'landing', 'post_flight', 'ground_ops', 'maintenance'
  )),

  -- Related flight (optional)
  related_frat_id uuid references public.frat_submissions(id) on delete set null,
  tail_number text default '',
  aircraft_type text default '',

  -- Investigation
  status text not null default 'open' check (status in ('open', 'under_review', 'investigation', 'corrective_action', 'closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  investigation_notes text default '',
  root_cause text default '',
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);

-- 2. HAZARD REGISTER (Formal hazard tracking with risk matrix)
create table public.hazard_register (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  hazard_code text not null,                -- "HAZ-001"
  created_by uuid references auth.users(id) on delete set null,

  -- Hazard identification
  title text not null,
  description text not null,
  source text default '',                   -- where/how identified: report, audit, FRAT trend, etc.
  category text default 'other',
  
  -- Initial risk assessment (5x5 matrix)
  initial_likelihood integer not null check (initial_likelihood between 1 and 5),
  initial_severity integer not null check (initial_severity between 1 and 5),
  initial_risk_score integer generated always as (initial_likelihood * initial_severity) stored,
  
  -- Mitigations
  mitigations text default '',              -- what controls are in place
  
  -- Residual risk (after mitigations)
  residual_likelihood integer check (residual_likelihood between 1 and 5),
  residual_severity integer check (residual_severity between 1 and 5),
  residual_risk_score integer generated always as (residual_likelihood * residual_severity) stored,
  
  -- Status
  status text not null default 'active' check (status in ('identified', 'active', 'mitigated', 'accepted', 'closed', 'monitoring')),
  review_date date,                         -- next review
  responsible_person text default '',
  
  -- Links
  related_report_id uuid references public.safety_reports(id) on delete set null,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. CORRECTIVE ACTIONS
create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  action_code text not null,                -- "CA-001"
  
  -- What needs to be done
  title text not null,
  description text default '',
  
  -- Linked to
  report_id uuid references public.safety_reports(id) on delete set null,
  hazard_id uuid references public.hazard_register(id) on delete set null,
  
  -- Assignment
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_to_name text default '',
  due_date date,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  
  -- Status
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'overdue', 'cancelled')),
  completion_notes text default '',
  completed_at timestamptz,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. INDEXES
create index idx_reports_org on public.safety_reports(org_id);
create index idx_reports_status on public.safety_reports(org_id, status);
create index idx_reports_type on public.safety_reports(org_id, report_type);
create index idx_reports_created on public.safety_reports(created_at desc);
create index idx_hazards_org on public.hazard_register(org_id);
create index idx_hazards_status on public.hazard_register(org_id, status);
create index idx_actions_org on public.corrective_actions(org_id);
create index idx_actions_status on public.corrective_actions(org_id, status);
create index idx_actions_due on public.corrective_actions(due_date);

-- 5. ROW LEVEL SECURITY

-- SAFETY REPORTS
alter table public.safety_reports enable row level security;
create policy "Users can view org reports"
  on public.safety_reports for select
  using (org_id = public.get_user_org_id());
create policy "Users can submit reports"
  on public.safety_reports for insert
  with check (org_id = public.get_user_org_id());
create policy "Users can update org reports"
  on public.safety_reports for update
  using (org_id = public.get_user_org_id());

-- HAZARD REGISTER
alter table public.hazard_register enable row level security;
create policy "Users can view org hazards"
  on public.hazard_register for select
  using (org_id = public.get_user_org_id());
create policy "Users can create hazards"
  on public.hazard_register for insert
  with check (org_id = public.get_user_org_id());
create policy "Users can update org hazards"
  on public.hazard_register for update
  using (org_id = public.get_user_org_id());

-- CORRECTIVE ACTIONS
alter table public.corrective_actions enable row level security;
create policy "Users can view org actions"
  on public.corrective_actions for select
  using (org_id = public.get_user_org_id());
create policy "Users can create actions"
  on public.corrective_actions for insert
  with check (org_id = public.get_user_org_id());
create policy "Users can update org actions"
  on public.corrective_actions for update
  using (org_id = public.get_user_org_id());

-- Enable realtime for safety reports
alter publication supabase_realtime add table public.safety_reports;
