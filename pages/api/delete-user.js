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

    // 1. Delete profile row
    const { error: profileDeleteErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    if (profileDeleteErr) {
      return res.status(500).json({ error: "Failed to delete profile: " + profileDeleteErr.message });
    }

    // 2. Delete auth user
    const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(targetUserId);

    if (authDeleteErr) {
      // Profile is already deleted, log the auth error but still return partial success
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
