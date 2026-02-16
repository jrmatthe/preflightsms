-- ═══════════════════════════════════════════════════════════════
-- PreflightSMS — Migration 003: Policy Library & Training Records
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. POLICY DOCUMENTS (Safety Policy Library)
create table public.policy_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text default '',
  category text not null default 'safety_policy' check (category in (
    'safety_policy', 'sop', 'emergency_procedures', 'training_manual',
    'org_chart', 'sms_manual', 'maintenance', 'operations_specs', 'other'
  )),
  version text default '1.0',
  file_url text default '',                -- Supabase Storage URL (future)
  content text default '',                 -- For text-based policies entered directly
  effective_date date,
  review_date date,
  status text default 'active' check (status in ('draft', 'active', 'archived', 'under_review')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. POLICY ACKNOWLEDGMENTS (track who has read/signed)
create table public.policy_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.policy_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz default now(),
  unique(policy_id, user_id)
);

-- 3. TRAINING REQUIREMENTS (what training is needed per role)
create table public.training_requirements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text default '',
  category text default 'sms' check (category in (
    'sms', 'initial', 'recurrent', 'aircraft_specific', 'emergency',
    'hazmat', 'security', 'crew_resource', 'company', 'other'
  )),
  required_for text[] default '{"pilot"}',   -- roles: pilot, safety_manager, etc.
  frequency_months integer default 12,        -- how often (0 = one-time)
  created_at timestamptz default now()
);

-- 4. TRAINING RECORDS (who completed what)
create table public.training_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requirement_id uuid references public.training_requirements(id) on delete set null,
  title text not null,                       -- copied from requirement or custom
  completed_date date not null,
  expiry_date date,                          -- computed: completed + frequency
  instructor text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- 5. INDEXES
create index idx_policies_org on public.policy_documents(org_id);
create index idx_acks_policy on public.policy_acknowledgments(policy_id);
create index idx_acks_user on public.policy_acknowledgments(user_id);
create index idx_training_req_org on public.training_requirements(org_id);
create index idx_training_rec_org on public.training_records(org_id);
create index idx_training_rec_user on public.training_records(user_id);
create index idx_training_rec_expiry on public.training_records(expiry_date);

-- 6. ROW LEVEL SECURITY

alter table public.policy_documents enable row level security;
create policy "Users can view org policies"
  on public.policy_documents for select using (org_id = public.get_user_org_id());
create policy "Users can create policies"
  on public.policy_documents for insert with check (org_id = public.get_user_org_id());
create policy "Users can update org policies"
  on public.policy_documents for update using (org_id = public.get_user_org_id());

alter table public.policy_acknowledgments enable row level security;
create policy "Users can view org acks"
  on public.policy_acknowledgments for select using (org_id = public.get_user_org_id());
create policy "Users can insert own acks"
  on public.policy_acknowledgments for insert with check (org_id = public.get_user_org_id() and user_id = auth.uid());

alter table public.training_requirements enable row level security;
create policy "Users can view org requirements"
  on public.training_requirements for select using (org_id = public.get_user_org_id());
create policy "Users can create requirements"
  on public.training_requirements for insert with check (org_id = public.get_user_org_id());
create policy "Users can update org requirements"
  on public.training_requirements for update using (org_id = public.get_user_org_id());

alter table public.training_records enable row level security;
create policy "Users can view org training"
  on public.training_records for select using (org_id = public.get_user_org_id());
create policy "Users can create training records"
  on public.training_records for insert with check (org_id = public.get_user_org_id());
create policy "Users can update org training"
  on public.training_records for update using (org_id = public.get_user_org_id());

-- 7. Allow admins/safety managers to update profiles (for role assignment)
create policy "Admins can update org profiles"
  on public.profiles for update
  using (
    org_id = public.get_user_org_id() 
    and exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role in ('admin', 'safety_manager', 'accountable_exec')
    )
  );
