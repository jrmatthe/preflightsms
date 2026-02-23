-- Post-flight safety report nudge responses
create table if not exists nudge_responses (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references flights(id),
  user_id uuid not null references auth.users(id),
  org_id uuid not null references organizations(id),
  response text not null check (response in ('submitted_report', 'nothing_to_report', 'remind_later', 'dismissed')),
  report_id uuid references safety_reports(id),
  remind_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_nudge_responses_flight_id on nudge_responses(flight_id);
create index idx_nudge_responses_user_id on nudge_responses(user_id);
create index idx_nudge_responses_org_id on nudge_responses(org_id);
create index idx_nudge_responses_remind_later on nudge_responses(user_id, remind_at) where response = 'remind_later';

-- RLS
alter table nudge_responses enable row level security;

-- Users can select their own rows
create policy "nudge_select_own" on nudge_responses for select
  using (auth.uid() = user_id);

-- Users can insert their own rows
create policy "nudge_insert_own" on nudge_responses for insert
  with check (auth.uid() = user_id);

-- Users can update their own rows
create policy "nudge_update_own" on nudge_responses for update
  using (auth.uid() = user_id);

-- Admins can select all org rows
create policy "nudge_select_admin" on nudge_responses for select
  using (
    org_id in (
      select p.org_id from profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'safety_manager')
    )
  );
