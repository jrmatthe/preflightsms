-- Push notification subscriptions
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);
create index idx_push_subs_user on push_subscriptions(user_id);
alter table push_subscriptions enable row level security;
create policy "push_sub_insert" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_sub_select" on push_subscriptions for select using (auth.uid() = user_id);
create policy "push_sub_delete" on push_subscriptions for delete using (auth.uid() = user_id);

-- Track which nudges have had push sent
alter table nudge_responses add column if not exists push_sent_at timestamptz;
