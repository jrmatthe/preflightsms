// /api/rejoin-org
// Handles re-invitation of previously removed users.
// Uses service role to update their auth password and upsert their profile.
// Requires a valid invitation token for authorization.

import { createClient } from "@supabase/supabase-js";

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
  if (checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const { email, password, fullName, orgId, role, invitationToken } = req.body;
  if (!email || !password || !orgId) return res.status(400).json({ error: "Missing required fields" });
  if (!invitationToken) return res.status(401).json({ error: "Missing invitation token" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the invitation token is valid, pending, and matches the email/org
  const { data: invitation, error: invErr } = await supabase
    .from("invitations")
    .select("id, email, org_id, status")
    .eq("token", invitationToken)
    .single();

  if (invErr || !invitation) return res.status(401).json({ error: "Invalid invitation token" });
  if (invitation.status !== "pending") return res.status(401).json({ error: "Invitation is no longer pending" });
  if (invitation.email.toLowerCase() !== email.toLowerCase().trim()) return res.status(401).json({ error: "Email does not match invitation" });
  if (invitation.org_id !== orgId) return res.status(401).json({ error: "Organization does not match invitation" });

  // Find the existing auth user by email via GoTrue admin API (listUsers filter is unreliable in JS client)
  const targetEmail = email.toLowerCase().trim();
  let user = null;
  const goTrueRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(targetEmail)}`, {
    headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey },
  });
  if (goTrueRes.ok) {
    const body = await goTrueRes.json();
    const users = body.users || body;
    user = (Array.isArray(users) ? users : []).find(u => u.email === targetEmail);
  }
  if (!user) return res.status(404).json({ error: "User not found" });

  // Update their password and auto-confirm email (handles unconfirmed re-signups)
  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Upsert their profile
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: user.id,
    org_id: orgId,
    full_name: fullName || email,
    email: email.toLowerCase().trim(),
    role: role || "pilot",
  }, { onConflict: "id" });
  if (profileErr) return res.status(500).json({ error: profileErr.message });

  return res.status(200).json({ success: true, userId: user.id });
}
