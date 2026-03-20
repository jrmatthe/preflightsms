// /api/delete-user
// Fully deletes a user: profile row + auth.users entry
// Supports two modes:
//   1. Admin removing another user from their org
//   2. User deleting their own account (self-delete)

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "targetUserId required" });

    // Get caller's profile
    const { data: callerProfile, error: callerErr } = await supabase
      .from("profiles")
      .select("id, org_id, role")
      .eq("id", user.id)
      .single();

    if (callerErr || !callerProfile) {
      return res.status(403).json({ error: "Caller profile not found" });
    }

    const isSelfDelete = targetUserId === user.id;

    if (!isSelfDelete) {
      // Admin removing another user — verify permissions
      const adminRoles = ["admin", "safety_manager", "accountable_exec"];
      if (!adminRoles.includes(callerProfile.role)) {
        return res.status(403).json({ error: "Insufficient permissions to remove users" });
      }

      // Verify target belongs to the same org
      const { data: targetProfile, error: targetErr } = await supabase
        .from("profiles")
        .select("id, org_id, role")
        .eq("id", targetUserId)
        .eq("org_id", callerProfile.org_id)
        .single();

      if (targetErr || !targetProfile) {
        return res.status(404).json({ error: "User not found in your organization" });
      }

      // Don't allow removing yourself via admin path (use self-delete)
      // Don't allow removing other admins unless you're an admin
      if (targetProfile.role === "admin" && callerProfile.role !== "admin") {
        return res.status(403).json({ error: "Only admins can remove other admins" });
      }
    }

    // If self-delete and user is the only admin, block it
    if (isSelfDelete && callerProfile.role === "admin") {
      const { data: otherAdmins } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", callerProfile.org_id)
        .eq("role", "admin")
        .neq("id", user.id);

      if (!otherAdmins || otherAdmins.length === 0) {
        return res.status(400).json({ error: "You are the only admin. Transfer admin role to another user before deleting your account." });
      }
    }

    // 1. Clean up all FK references (NULL out org data, delete user-specific data)
    const uid = targetUserId;

    // NULL out references — preserves org data (FRATs, reports, etc.)
    await supabase.from("invitations").update({ invited_by: null }).eq("invited_by", uid);
    await supabase.from("cbt_courses").update({ created_by: null }).eq("created_by", uid);
    await supabase.from("flights").update({ user_id: null }).eq("user_id", uid);
    await supabase.from("audits").update({ auditor_id: null }).eq("auditor_id", uid);
    await supabase.from("audit_schedules").update({ assigned_to: null }).eq("assigned_to", uid);
    await supabase.from("erp_plans").update({ reviewed_by: null }).eq("reviewed_by", uid);
    await supabase.from("erp_drills").update({ conducted_by: null }).eq("conducted_by", uid);
    await supabase.from("declarations").update({ created_by: null }).eq("created_by", uid);
    await supabase.from("ai_suggestions").update({ created_by: null }).eq("created_by", uid);
    await supabase.from("ai_usage_log").update({ user_id: null }).eq("user_id", uid);
    await supabase.from("trend_alerts").update({ acknowledged_by: null }).eq("acknowledged_by", uid);
    await supabase.from("mel_audit_log").update({ performed_by: null }).eq("performed_by", uid);
    await supabase.from("asap_reports").update({ reporter_id: null }).eq("reporter_id", uid);
    await supabase.from("asap_erc_reviews").update({ reviewer_id: null }).eq("reviewer_id", uid);
    await supabase.from("asap_corrective_actions").update({ assigned_to: null }).eq("assigned_to", uid);
    await supabase.from("management_of_change").update({ initiator_id: null }).eq("initiator_id", uid);
    await supabase.from("management_of_change").update({ responsible_id: null }).eq("responsible_id", uid);
    await supabase.from("management_of_change").update({ closed_by: null }).eq("closed_by", uid);
    await supabase.from("moc_attachments").update({ uploaded_by: null }).eq("uploaded_by", uid);
    await supabase.from("culture_surveys").update({ created_by: null }).eq("created_by", uid);
    await supabase.from("culture_survey_responses").update({ respondent_id: null }).eq("respondent_id", uid);
    await supabase.from("compliance_status").update({ reviewed_by: null }).eq("reviewed_by", uid);
    await supabase.from("insurance_exports").update({ generated_by: null }).eq("generated_by", uid);
    await supabase.from("foreflight_config").update({ matched_pilot_id: null }).eq("matched_pilot_id", uid);
    await supabase.from("schedaero_trips").update({ matched_pilot_id: null }).eq("matched_pilot_id", uid);
    await supabase.from("api_keys").update({ created_by: null }).eq("created_by", uid);
    await supabase.from("safety_recognitions").update({ user_id: null }).eq("user_id", uid);
    await supabase.from("fatigue_assessments").update({ pilot_id: null }).eq("pilot_id", uid);

    // Delete user-specific rows (no value without the user)
    await supabase.from("notification_reads").delete().eq("user_id", uid);
    await supabase.from("notifications").delete().eq("target_user_id", uid);
    await supabase.from("push_subscriptions").delete().eq("user_id", uid);

    // 2. Delete profile row
    const { error: profileDeleteErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", uid);

    if (profileDeleteErr) {
      return res.status(500).json({ error: "Failed to delete profile: " + profileDeleteErr.message });
    }

    // 3. Delete auth user
    const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(uid);

    if (authDeleteErr) {
      console.error("Failed to delete auth user:", authDeleteErr.message);
      return res.status(200).json({
        success: true,
        warning: "Profile removed but auth cleanup failed. User may need manual removal from Supabase Auth.",
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
