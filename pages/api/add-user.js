// /api/add-user
// Admin creates a pending INVITATION only. No Supabase auth user and no profile
// are created here — those are created at ACCEPT time (/api/accept-invite) once
// the invitee clicks the emailed link and signs up. This keeps invited users OUT
// of the active-member list until they actually join.
//
// The invite email is sent here, server-side, gated behind the admin authorization
// below (it is no longer invokable from the browser).

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";
import { sendInviteEmail } from "../../lib/inviteEmail";
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

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
    const targetEmail = email.toLowerCase().trim();

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

    // Already an active member of this org?
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("org_id", orgId)
      .eq("email", targetEmail)
      .single();

    if (existingProfile) return res.status(400).json({ error: "This user is already a member of your organization" });

    // Already has a pending invitation?
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id")
      .eq("org_id", orgId)
      .eq("email", targetEmail)
      .eq("status", "pending")
      .single();

    if (existingInvite) return res.status(400).json({ error: "An invitation is already pending for this email" });

    // Org name for the email (derived server-side; never trusted from the client)
    const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();
    const orgName = org?.name || "your organization";

    // Create the invitation record ONLY. No auth user, no profile yet.
    // role / permissions / full_name are carried here so /api/accept-invite can
    // build the profile with the admin's intended values at accept time.
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const { data: invitation, error: invErr } = await supabase
      .from("invitations")
      .insert({
        org_id: orgId,
        email: targetEmail,
        role: role || "pilot",
        permissions: Array.isArray(permissions) ? permissions : [],
        full_name: fullName.trim(),
        token,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (invErr) {
      // Unique violation on (org_id, email, status) — a pending invite already exists
      if (invErr.code === "23505") return res.status(400).json({ error: "An invitation is already pending for this email" });
      return res.status(500).json({ error: "Failed to create invitation: " + invErr.message });
    }

    // Send the invite email server-side (admin already verified above).
    const emailRes = await sendInviteEmail({ email: targetEmail, orgName, role: role || "pilot", token });

    return res.status(200).json({
      success: true,
      token: invitation?.token || token,
      emailFailed: !emailRes.ok,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
