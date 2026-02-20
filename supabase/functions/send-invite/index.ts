// supabase/functions/send-invite/index.ts
//
// Sends invitation emails via Resend
// Called from the frontend when an admin invites a user
//
// SETUP:
// 1. Deploy: supabase functions deploy send-invite
// 2. Uses same RESEND_API_KEY and FROM_EMAIL secrets as trial-emails

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL = "https://login.preflightsms.com/logo.png";
const APP_URL = "https://login.preflightsms.com";

function inviteEmailHtml(orgName: string, role: string, inviteUrl: string): string {
  const roleLabel = role === "admin" ? "Administrator" :
    role === "safety_manager" ? "Safety Manager" :
    role === "chief_pilot" ? "Chief Pilot" :
    role === "dispatcher" ? "Dispatcher" :
    role === "accountable_exec" ? "Accountable Executive" : "Pilot";

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
  <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;"><strong style="color:#FFFFFF;">${orgName}</strong> has invited you to join their PreflightSMS safety management system as a <strong style="color:#22D3EE;">${roleLabel}</strong>.</p>
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
  <p style="margin:0;font-size:11px;color:#444444;line-height:1.5;">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
</td></tr>
<tr><td align="center" style="padding-top:24px;">
  <p style="margin:0;font-size:10px;color:#444444;">PreflightSMS · Part 5 SMS Compliance for Part 135 Operators</p>
  <p style="margin:4px 0 0;font-size:10px;color:#333333;">© 2026 PreflightSMS. All rights reserved.</p>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "PreflightSMS <noreply@send.preflightsms.com>";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, orgName, role, token } = await req.json();

    if (!email || !orgName || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, orgName, token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inviteUrl = `${APP_URL}/?invite=${token}`;
    const html = inviteEmailHtml(orgName, role || "pilot", inviteUrl);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `You're invited to join ${orgName} on PreflightSMS`,
        html,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(
        JSON.stringify({ error: `Email send failed: ${err}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await resp.json();
    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
