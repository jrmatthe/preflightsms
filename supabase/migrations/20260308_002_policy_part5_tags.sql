-- Add part5_tags column to policy_documents for Part 5 compliance tracking
alter table public.policy_documents
  add column if not exists part5_tags text[] default '{}';
