// /api/delete-user
// Fully deletes a user: profile row + auth.users entry
// Supports two modes:
//   1. Admin removing another user from their org
//   2. User deleting their own account (self-delete)

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";

// In-memory rate limiter (per-process; resets on cold start)
const rateLimits = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimits.set(ip, entry);
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (checkRateLimit(ip)) return res.status(429).json({ error: "Too many attempts. Try again later." });

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

    // Snapshot target info before deletion (for audit log)
    const { data: targetSnapshot } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", targetUserId)
      .single();

    // 1. Clean up all FK references — resilient: track errors, don't bail on individual failures
    const uid = targetUserId;
    const warnings = [];

    async function safeUpdate(table, col, val, filterCol, filterVal) {
      const { error } = await supabase.from(table).update({ [col]: val }).eq(filterCol, filterVal);
      if (error) warnings.push(`${table}.${col}: ${error.message}`);
    }
    async function safeDelete(table, col, val) {
      const { error } = await supabase.from(table).delete().eq(col, val);
      if (error) warnings.push(`${table} delete: ${error.message}`);
    }

    // NULL out references — preserves org data (FRATs, reports, etc.)
    await safeUpdate("invitations", "invited_by", null, "invited_by", uid);
    await safeUpdate("cbt_courses", "created_by", null, "created_by", uid);
    await safeUpdate("flights", "user_id", null, "user_id", uid);
    await safeUpdate("audits", "auditor_id", null, "auditor_id", uid);
    await safeUpdate("audit_schedules", "assigned_to", null, "assigned_to", uid);
    await safeUpdate("erp_plans", "reviewed_by", null, "reviewed_by", uid);
    await safeUpdate("erp_drills", "conducted_by", null, "conducted_by", uid);
    await safeUpdate("declarations", "created_by", null, "created_by", uid);
    await safeUpdate("ai_suggestions", "created_by", null, "created_by", uid);
    await safeUpdate("ai_usage_log", "user_id", null, "user_id", uid);
    await safeUpdate("trend_alerts", "acknowledged_by", null, "acknowledged_by", uid);
    await safeUpdate("mel_audit_log", "performed_by", null, "performed_by", uid);
    await safeUpdate("asap_reports", "reporter_id", null, "reporter_id", uid);
    await safeUpdate("asap_erc_reviews", "reviewer_id", null, "reviewer_id", uid);
    await safeUpdate("asap_corrective_actions", "assigned_to", null, "assigned_to", uid);
    await safeUpdate("management_of_change", "initiator_id", null, "initiator_id", uid);
    await safeUpdate("management_of_change", "responsible_id", null, "responsible_id", uid);
    await safeUpdate("management_of_change", "closed_by", null, "closed_by", uid);
    await safeUpdate("moc_attachments", "uploaded_by", null, "uploaded_by", uid);
    await safeUpdate("culture_surveys", "created_by", null, "created_by", uid);
    await safeUpdate("culture_survey_responses", "respondent_id", null, "respondent_id", uid);
    await safeUpdate("compliance_status", "reviewed_by", null, "reviewed_by", uid);
    await safeUpdate("insurance_exports", "generated_by", null, "generated_by", uid);
    await safeUpdate("foreflight_config", "matched_pilot_id", null, "matched_pilot_id", uid);
    await safeUpdate("schedaero_trips", "matched_pilot_id", null, "matched_pilot_id", uid);
    await safeUpdate("api_keys", "created_by", null, "created_by", uid);
    await safeUpdate("safety_recognitions", "user_id", null, "user_id", uid);
    await safeUpdate("fatigue_assessments", "pilot_id", null, "pilot_id", uid);

    // Delete user-specific rows (no value without the user)
    await safeDelete("notification_reads", "user_id", uid);
    await safeDelete("notifications", "target_user_id", uid);
    await safeDelete("push_subscriptions", "user_id", uid);

    // 2. Delete profile row
    const { error: profileDeleteErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", uid);

    if (profileDeleteErr) {
      warnings.push(`profile delete: ${profileDeleteErr.message}`);
      // Profile deletion is critical — if it fails, FK cleanup wasn't sufficient
      return res.status(500).json({
        error: "Failed to delete profile: " + profileDeleteErr.message,
        warnings,
      });
    }

    // 3. Delete auth user
    const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(uid);
    if (authDeleteErr) {
      warnings.push(`auth delete: ${authDeleteErr.message}`);
    }

    // 4. Write audit log entry
    try {
      await supabase.from("user_deletion_log").insert({
        org_id: callerProfile.org_id,
        deleted_user_id: uid,
        deleted_user_email: targetSnapshot?.email || "unknown",
        deleted_user_name: targetSnapshot?.full_name || "unknown",
        deleted_user_role: targetSnapshot?.role || "unknown",
        deleted_by: user.id,
        is_self_delete: isSelfDelete,
        warnings: warnings.length > 0 ? warnings : null,
      });
    } catch (logErr) {
      // Audit log failure is non-fatal — user is already deleted
      console.error("Failed to write deletion audit log:", logErr.message);
    }

    const result = { success: true };
    if (warnings.length > 0) result.warnings = warnings;
    if (authDeleteErr) result.authWarning = "Profile removed but auth cleanup failed. User may need manual removal from Supabase Auth.";
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
