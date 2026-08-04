// /api/create-org
// Creates organization during signup using service role (bypasses RLS)
// Accepts either a valid JWT or a userId (for email-confirmation-pending signups)

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Notifies the platform owner that a new org signed up. Fail-safe: any error here
// is swallowed so it can never block or fail the signup itself.
async function notifyNewSignup({ org, subscriptionStatus, tier, signupEmail }) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) { console.warn("[create-org] RESEND_API_KEY not set; skipping signup notification"); return; }
    const from = process.env.FROM_EMAIL || "PreflightSMS <noreply@preflightsms.com>";
    const to = process.env.SIGNUP_NOTIFY_EMAIL || "jrmatthe@gmail.com";

    const isFree = subscriptionStatus === "free";
    const planLabel = isFree ? "Free account" : "30-Day Trial";
    const tierLabel = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : "—";
    const when = new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) + " ET";

    const row = (label, value) =>
      `<tr><td style="padding:6px 0;font-size:13px;color:#888888;width:140px;">${escapeHtml(label)}</td>` +
      `<td style="padding:6px 0;font-size:13px;color:#FFFFFF;font-weight:600;">${escapeHtml(value)}</td></tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
<tr><td style="background:#161616;border:1px solid #232323;border-radius:12px;padding:32px 36px;">
  <p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${isFree ? "#22D3EE" : "#F59E0B"};font-weight:700;">${escapeHtml(planLabel)}</p>
  <h1 style="margin:0 0 24px;font-size:22px;font-weight:800;color:#FFFFFF;">New signup 🎉</h1>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${row("Organization", org.name)}
    ${row("Plan", planLabel)}
    ${row("Tier", tierLabel)}
    ${row("Max aircraft", String(org.max_aircraft ?? "—"))}
    ${row("Signed up by", signupEmail || "—")}
    ${row("Org ID", org.id)}
    ${row("When", when)}
  </table>
</td></tr>
<tr><td align="center" style="padding-top:20px;">
  <p style="margin:0;font-size:10px;color:#444444;">PreflightSMS · new organization notification</p>
</td></tr>
</table></td></tr></table></body></html>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New PreflightSMS signup: ${org.name} (${planLabel})`,
        html,
      }),
    });
    if (!resp.ok) console.error("[create-org] signup notification failed:", resp.status, await resp.text());
  } catch (e) {
    console.error("[create-org] signup notification error:", e.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Try JWT auth first; fall back to userId in body (for pre-confirmation signups)
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && !authHeader.endsWith("undefined")) {
    const { user, error: authError } = await verifyAuth(req);
    if (user) userId = user.id;
  }
  if (!userId && req.body.userId) {
    console.warn("[create-org] JWT auth failed, falling back to userId body param:", req.body.userId);
    // Verify the user actually exists via service role
    const { data: userData } = await supabase.auth.admin.getUserById(req.body.userId);
    if (userData?.user) userId = userData.user.id;
  }
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // Handle profile creation for pre-confirmation signups
  if (req.body.action === "create-profile") {
    const { orgId, fullName, email: profileEmail } = req.body;
    if (!orgId) return res.status(400).json({ error: "orgId required" });
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId, org_id: orgId, full_name: fullName || "", email: profileEmail || "", role: "admin",
    });
    if (profileErr) return res.status(400).json({ error: profileErr.message });
    return res.status(200).json({ success: true });
  }

  const { name, slug, tier, feature_flags, subscription_status, max_aircraft } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });

  const { data, error } = await supabase.from("organizations").insert({
    name, slug, tier: tier || "starter", feature_flags: feature_flags || {},
    subscription_status: subscription_status || "trial",
    max_aircraft: max_aircraft || 5,
  }).select().single();

  if (error) return res.status(400).json({ error: error.message });

  // Notify the platform owner of the new signup (free or trial). Non-blocking:
  // never let notification failure affect the signup response.
  let signupEmail = null;
  try {
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    signupEmail = userData?.user?.email || null;
  } catch (_) { /* ignore lookup failure */ }
  await notifyNewSignup({
    org: data,
    subscriptionStatus: subscription_status || "trial",
    tier: tier || "starter",
    signupEmail,
  });

  return res.status(200).json({ data });
}
