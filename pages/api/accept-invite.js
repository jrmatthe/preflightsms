// /api/accept-invite
//
// The single, server-side (service-role) endpoint for accepting an invitation.
// It bypasses the invitations-table RLS (which only allows existing org members
// to read), so a brand-new invitee can actually read + accept their invite.
//
//   GET  ?token=...   -> non-sensitive info to render the accept screen
//   POST { token, password?, fullName? }
//                     -> materializes the account + profile and consumes the invite
//
// Security:
//   - role / org / email are ALWAYS derived from the invitation row, never the client
//   - expiry + single-use are enforced server-side
//   - an existing, already-active account is NEVER password-reset via a token
//     (account-takeover guard); such users must sign in to join

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";

// In-memory rate limiter (per-process; resets on cold start)
const rateLimits = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

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

// Find an existing auth user by email via the GoTrue admin REST endpoint.
async function findAuthUserByEmail(supabaseUrl, serviceKey, email) {
  const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  if (!resp.ok) return null;
  const body = await resp.json();
  const users = body.users || body;
  return (Array.isArray(users) ? users : []).find((u) => (u.email || "").toLowerCase() === email) || null;
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ── GET: invitation info for the accept screen ──────────────────────────
  if (req.method === "GET") {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: "token is required" });
    const { data: inv } = await supabase
      .from("invitations")
      .select("email, role, status, expires_at, organizations(name)")
      .eq("token", token)
      .maybeSingle();
    if (!inv) return res.status(200).json({ valid: false, reason: "not_found" });
    const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
    const valid = inv.status === "pending" && !expired;
    return res.status(200).json({
      valid,
      reason: valid ? null : inv.status !== "pending" ? "used" : "expired",
      email: inv.email,
      role: inv.role,
      orgName: inv.organizations?.name || "Organization",
      expires_at: inv.expires_at,
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "GET or POST only" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (checkRateLimit(ip)) return res.status(429).json({ error: "Too many attempts. Try again later." });

  try {
    const { token, password, fullName } = req.body || {};
    if (!token) return res.status(400).json({ error: "token is required" });

    // 1. Load the invitation (service role bypasses RLS).
    const { data: inv } = await supabase
      .from("invitations")
      .select("id, org_id, email, role, permissions, full_name, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!inv) return res.status(404).json({ error: "Invalid invitation link." });
    if (inv.status !== "pending") return res.status(410).json({ error: "This invitation has already been used or was revoked." });
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return res.status(410).json({ error: "This invitation has expired. Ask your admin to resend it." });
    }

    const inviteEmail = (inv.email || "").toLowerCase().trim();
    const displayName = (fullName && fullName.trim()) || inv.full_name || inviteEmail;

    // 2. Determine the actor. If the caller already has a valid session whose
    //    email matches the invite, attach them (no password change). Otherwise
    //    this is the password (new-user) path.
    const { user: sessionUser } = await verifyAuth(req);
    let authUserId = null;

    if (sessionUser) {
      if ((sessionUser.email || "").toLowerCase().trim() !== inviteEmail) {
        return res.status(403).json({ error: "This invitation is for a different email address." });
      }
      authUserId = sessionUser.id; // authenticated attach (e.g. SSO / existing login)
    } else {
      // New-user / password path
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
      }
      const existing = await findAuthUserByEmail(supabaseUrl, supabaseServiceKey, inviteEmail);

      if (!existing) {
        // Brand-new user — create a confirmed account with their chosen password.
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: inviteEmail,
          password,
          email_confirm: true,
          user_metadata: { full_name: displayName },
        });
        if (createErr) {
          // Race: someone created it between the lookup and now — re-fetch and treat as existing.
          const retry = await findAuthUserByEmail(supabaseUrl, supabaseServiceKey, inviteEmail);
          if (!retry) return res.status(500).json({ error: "Failed to create account: " + createErr.message });
          authUserId = retry.id;
        } else {
          authUserId = created.user.id;
        }
      } else if (!existing.last_sign_in_at) {
        // Pre-provisioned shell that has NEVER signed in (e.g. legacy pre-created
        // invite, or platform-provisioned-but-unused) — safe to set the chosen password.
        const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: { full_name: displayName },
        });
        if (updErr) return res.status(500).json({ error: updErr.message });
        authUserId = existing.id;
      } else {
        // Existing, already-active account — DO NOT reset its password via a token.
        return res.status(409).json({
          error: "account_exists",
          message: "You already have a PreflightSMS account. Please sign in to join this organization.",
        });
      }
    }

    // 3. Create/attach the profile with server-derived values.
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: authUserId,
      org_id: inv.org_id,
      full_name: displayName,
      email: inviteEmail,
      role: inv.role || "pilot",
      permissions: Array.isArray(inv.permissions) ? inv.permissions : [],
    }, { onConflict: "id" });
    if (profileErr) return res.status(500).json({ error: "Failed to create profile: " + profileErr.message });

    // 4. Consume the invitation (single-use). Guarded so a concurrent accept can't
    //    double-consume; if it's already been consumed the profile upsert above is
    //    idempotent, so we still report success.
    await supabase
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", inv.id)
      .eq("status", "pending");

    return res.status(200).json({ success: true, userId: authUserId, email: inviteEmail });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
