-- Invite-flow hardening
-- 1) Invitations last 30 days (was 7 days).
-- 2) Carry the admin's intended permissions + display name ON the invitation,
--    so the profile can be created at ACCEPT time (not invite time) with the
--    right role/permissions. Invited users no longer appear as active members
--    until they actually accept and sign up.
--
-- RUN THIS IN THE SUPABASE SQL EDITOR *BEFORE* DEPLOYING THE MATCHING APP CODE
-- (add-user.js writes invitations.permissions / invitations.full_name).

-- 1. New invites default to 30 days.
ALTER TABLE invitations ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- 2. Carry role-companion fields on the invitation.
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS full_name text;

-- 3. Extend any in-flight pending invites to the new 30-day window.
UPDATE invitations
   SET expires_at = created_at + interval '30 days'
 WHERE status = 'pending';
