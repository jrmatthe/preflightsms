// /api/resend-invite
// Admin re-sends an existing invitation: resets it to a fresh 30-day PENDING window
// (recovering invites that were left stale or were falsely marked accepted under the
// old flow) and re-sends the email server-side. Authorization mirrors /api/add-user.

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";
import { sendInviteEmail } from "../../lib/inviteEmail";

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ADMIN_ROLES = ["admin", "safety_manager", "accountable_exec"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { invitationId } = req.body || {};
    if (!invitationId) return res.status(400).json({ error: "invitationId is required" });

    // Load the invitation
    const { data: inv, error: invErr } = await supabase
      .from("invitations")
      .select("id, org_id, email, role, status, organizations(name)")
      .eq("id", invitationId)
      .single();
    if (invErr || !inv) return res.status(404).json({ error: "Invitation not found" });

    // Caller must be admin-level in the invitation's org
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("org_id", inv.org_id)
      .single();
    if (!callerProfile || !ADMIN_ROLES.includes(callerProfile.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Refuse to "resend" to someone who is already an active member.
    const { data: member } = await supabase
      .from("profiles")
      .select("id")
      .eq("org_id", inv.org_id)
      .eq("email", inv.email)
      .maybeSingle();
    // (A pre-created legacy shell profile may exist; allow resend so they can finish
    //  signing up. We only block if they've actually signed in.)
    if (member) {
      const { data: u } = await supabase.auth.admin.getUserById(member.id);
      if (u?.user?.last_sign_in_at) {
        return res.status(400).json({ error: "This user has already joined your organization." });
      }
    }

    // Reset to a fresh pending 30-day window (recovers stale / falsely-accepted invites).
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const { data: updated, error: updErr } = await supabase
      .from("invitations")
      .update({ status: "pending", accepted_at: null, expires_at: expiresAt })
      .eq("id", inv.id)
      .select("token")
      .single();
    if (updErr) return res.status(500).json({ error: updErr.message });

    const orgName = inv.organizations?.name || "your organization";
    const emailRes = await sendInviteEmail({ email: inv.email, orgName, role: inv.role, token: updated.token });
    if (!emailRes.ok) return res.status(200).json({ success: true, emailFailed: true });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
