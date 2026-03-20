// /api/add-user
// Admin pre-creates a user: auth account + profile + invitation
// The user gets an invite email to set their password.
// They exist in the org immediately with name, role, and permissions.

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";
import crypto from "crypto";

// In-memory rate limiter (per-process; resets on cold start)
const rateLimits = new Map();
const MAX_ATTEMPTS = 10;
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
    const { email, fullName, role, permissions, orgId } = req.body;
    if (!email || !fullName || !orgId) return res.status(400).json({ error: "email, fullName, and orgId are required" });

    // Verify caller is admin-level in this org
    const { data: callerProfile, error: callerErr } = await supabase
      .from("profiles")
      .select("id, org_id, role")
      .eq("id", user.id)
      .eq("org_id", orgId)
      .single();

    if (callerErr || !callerProfile) return res.status(403).json({ error: "Not a member of this organization" });

    const adminRoles = ["admin", "safety_manager", "accountable_exec"];
    if (!adminRoles.includes(callerProfile.role)) {
      return res.status(403).json({ error: "Insufficient permissions to add users" });
    }

    // Check if user already exists in this org
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("org_id", orgId)
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existingProfile) return res.status(400).json({ error: "This user is already a member of your organization" });

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id")
      .eq("org_id", orgId)
      .eq("email", email.toLowerCase().trim())
      .eq("status", "pending")
      .single();

    if (existingInvite) return res.status(400).json({ error: "An invitation is already pending for this email" });

    // Check if auth user already exists
    let authUserId = null;
    const targetEmail = email.toLowerCase().trim();
    const goTrueRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(targetEmail)}`, {
      headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey },
    });
    if (goTrueRes.ok) {
      const body = await goTrueRes.json();
      const users = body.users || body;
      const existing = (Array.isArray(users) ? users : []).find(u => u.email === targetEmail);
      if (existing) authUserId = existing.id;
    }

    if (!authUserId) {
      // Create auth user with no usable password (random 64-char)
      const tempPassword = crypto.randomBytes(32).toString("hex");
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName.trim() },
      });
      if (authErr) return res.status(500).json({ error: "Failed to create auth user: " + authErr.message });
      authUserId = authUser.user.id;
    } else {
      // Update existing auth user metadata
      await supabase.auth.admin.updateUserById(authUserId, {
        email_confirm: true,
        user_metadata: { full_name: fullName.trim() },
      });
    }

    // Create profile
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: authUserId,
      org_id: orgId,
      full_name: fullName.trim(),
      email: targetEmail,
      role: role || "pilot",
      permissions: permissions || [],
    }, { onConflict: "id" });

    if (profileErr) return res.status(500).json({ error: "Failed to create profile: " + profileErr.message });

    // Create invitation record (for email + tracking)
    const token = crypto.randomBytes(32).toString("hex");
    const { data: invitation, error: invErr } = await supabase
      .from("invitations")
      .insert({
        org_id: orgId,
        email: targetEmail,
        role: role || "pilot",
        token,
        invited_by: user.id,
      })
      .select()
      .single();

    if (invErr) {
      // Non-fatal — user is created, just no invitation record
      console.error("Failed to create invitation record:", invErr.message);
    }

    return res.status(200).json({
      success: true,
      userId: authUserId,
      token: invitation?.token || token,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
