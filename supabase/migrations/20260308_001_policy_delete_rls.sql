-- Add missing RLS policy for deleting policy documents
create policy "Users can delete policies in their org"
  on public.policy_documents for delete using (org_id = public.get_user_org_id());
