// Shared invite-email template + sender.
// Used by authenticated server routes (/api/add-user, /api/resend-invite) so the
// email send is gated behind the same admin authorization that creates the invite —
// it is NOT invokable from the browser. Mirrors the direct-Resend pattern already
// used in /api/request-approval.js.

const LOGO_URL = "https://login.preflightsms.com/logo.png";
const APP_URL = "https://login.preflightsms.com";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function roleLabelFor(role) {
  return role === "admin" ? "Administrator" :
    role === "safety_manager" ? "Safety Manager" :
    role === "chief_pilot" ? "Chief Pilot" :
    role === "dispatcher" ? "Dispatcher" :
    role === "accountable_exec" ? "Accountable Executive" : "Pilot";
}

export function inviteUrlFor(token) {
  return `${APP_URL}/?invite=${token}`;
}

export function inviteEmailHtml(orgName, role, inviteUrl) {
  const safeOrg = escapeHtml(orgName);
  const roleLabel = roleLabelFor(role);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <img src="${LOGO_URL}" alt="PreflightSMS" width="60" style="display:block;" />
</td></tr>
<tr><td style="background:#161616;border:1px solid #232323;border-radius:12px;padding:40px 36px;">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">You're Invited</h1>
  <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;"><strong style="color:#FFFFFF;">${safeOrg}</strong> has invited you to join their PreflightSMS safety management system as a <strong style="color:#22D3EE;">${roleLabel}</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:4px 0 28px;">
    <a href="${inviteUrl}" target="_blank" style="display:inline-block;padding:14px 40px;background:#FFFFFF;color:#000000;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">Accept Invitation</a>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr>
      <td style="padding:6px 0;font-size:12px;color:#888888;">✓ &nbsp;Flight Risk Assessments</td>
      <td style="padding:6px 0;font-size:12px;color:#888888;">✓ &nbsp;Flight Following</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-size:12px;color:#888888;">✓ &nbsp;Safety Reporting</td>
      <td style="padding:6px 0;font-size:12px;color:#888888;">✓ &nbsp;Training Records</td>
    </tr>
  </table>
  <div style="border-top:1px solid #232323;margin:20px 0;"></div>
  <p style="margin:0;font-size:11px;color:#444444;line-height:1.5;">This invitation expires in 30 days. If you weren't expecting this, you can safely ignore it.</p>
</td></tr>
<tr><td align="center" style="padding-top:24px;">
  <p style="margin:0;font-size:10px;color:#444444;">PreflightSMS · Part 5 SMS Compliance for Part 135 Operators</p>
  <p style="margin:4px 0 0;font-size:10px;color:#333333;">© 2026 PreflightSMS. All rights reserved.</p>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

// Sends the invite email via Resend. Returns { ok, error? }.
export async function sendInviteEmail({ email, orgName, role, token }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  const from = process.env.FROM_EMAIL || "PreflightSMS <noreply@preflightsms.com>";
  const html = inviteEmailHtml(orgName, role || "pilot", inviteUrlFor(token));
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `You're invited to join ${orgName} on PreflightSMS`,
        html,
      }),
    });
    if (!resp.ok) return { ok: false, error: await resp.text() };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
