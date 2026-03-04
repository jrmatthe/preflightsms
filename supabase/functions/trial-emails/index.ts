// supabase/functions/trial-emails/index.ts
//
// Supabase Edge Function — runs daily via pg_cron
// Checks trial orgs and sends lifecycle emails:
//   Day 2:  Getting Started
//   Day 7:  Mid-trial check-in
//   Day 11: Trial expiring soon (3 days left)
//   Day 14: Trial expired
//
// SETUP:
// 1. Deploy: supabase functions deploy trial-emails
// 2. Set secrets:
//    supabase secrets set RESEND_API_KEY=re_your_key
//    supabase secrets set FROM_EMAIL=noreply@preflightsms.com
// 3. Set up daily cron in Supabase Dashboard → SQL Editor:
//    select cron.schedule(
//      'trial-emails-daily',
//      '0 14 * * *',  -- 2pm UTC (7am PST / 10am EST)
//      $$select net.http_post(
//        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/trial-emails',
//        headers := jsonb_build_object(
//          'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
//          'Content-Type', 'application/json'
//        ),
//        body := '{}'::jsonb
//      );$$
//    );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── EMAIL TEMPLATES ──────────────────────────────────────────

const LOGO_URL = "https://login.preflightsms.com/logo.png";
const APP_URL = "https://login.preflightsms.com";

function emailWrapper(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <img src="${LOGO_URL}" alt="PreflightSMS" width="160" style="display:block;" />
</td></tr>
<tr><td style="background:#161616;border:1px solid #232323;border-radius:12px;padding:40px 36px;">
${content}
</td></tr>
<tr><td align="center" style="padding-top:24px;">
  <p style="margin:0;font-size:10px;color:#444444;">PreflightSMS · Part 5 SMS Compliance for Part 135 Operators</p>
  <p style="margin:4px 0 0;font-size:10px;color:#333333;">© 2026 PreflightSMS. All rights reserved.</p>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:4px 0 28px;">
    <a href="${url}" target="_blank" style="display:inline-block;padding:14px 40px;background:#FFFFFF;color:#000000;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">${text}</a>
  </td></tr></table>`;
}

function featureRow(icon: string, text: string): string {
  return `<tr><td style="padding:6px 0;font-size:13px;color:#D4D4D4;line-height:1.5;">${icon} &nbsp;${text}</td></tr>`;
}

const templates = {
  getting_started: {
    subject: "Your next FSDO visit just got easier",
    html: (orgName: string) => emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Submit your first FRAT — it takes 2 minutes</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">Open PreflightSMS, tap <strong style="color:#FFFFFF;">FRAT</strong>, and fill one out. Risk categories are pre-configured for Part 135. When you're done, you have your first auditable, timestamped risk assessment.</p>

      ${ctaButton("Submit Your First FRAT", APP_URL)}

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        ${featureRow("", "<strong style='color:#FFFFFF;'>Your FRAT, your way.</strong> Add categories, adjust weights, build templates per aircraft or mission type.")}
        ${featureRow("", "<strong style='color:#FFFFFF;'>Pilots will actually use it.</strong> Clean mobile UI, no app download, 90 seconds from the ramp.")}
        ${featureRow("", "<strong style='color:#FFFFFF;'>Audit-ready from day one.</strong> Every record is timestamped, attributed, and exportable.")}
      </table>

      <div style="border-top:1px solid #232323;margin:4px 0 20px;"></div>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">Full access for 14 days. No credit card. Reply anytime — a real person answers.</p>
    `),
  },

  mid_trial: {
    subject: "The difference between an SMS and a filing cabinet",
    html: (orgName: string) => emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">What happens after a pilot flags a risk?</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">Collecting FRATs is easy. What separates a real SMS from a checkbox exercise is the closed loop:</p>

      <div style="background:#0A0A0A;border-left:3px solid #22D3EE;padding:14px 20px;margin-bottom:8px;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:13px;color:#AAAAAA;"><strong style="color:#22D3EE;">1. Report</strong> — Pilot submits a FRAT or safety report from their phone</p>
      </div>
      <div style="background:#0A0A0A;border-left:3px solid #F59E0B;padding:14px 20px;margin-bottom:8px;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:13px;color:#AAAAAA;"><strong style="color:#F59E0B;">2. Investigate</strong> — Open a hazard, score it on the risk matrix</p>
      </div>
      <div style="background:#0A0A0A;border-left:3px solid #4ADE80;padding:14px 20px;margin-bottom:8px;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:13px;color:#AAAAAA;"><strong style="color:#4ADE80;">3. Mitigate</strong> — Assign a corrective action with a name and a deadline</p>
      </div>
      <div style="background:#0A0A0A;border-left:3px solid #FFFFFF;padding:14px 20px;margin-bottom:24px;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:13px;color:#AAAAAA;"><strong style="color:#FFFFFF;">4. Measure</strong> — Dashboard shows the trend. Your FSDO sees a system that works.</p>
      </div>

      ${ctaButton("Try the Full Workflow", APP_URL)}

      <div style="border-top:1px solid #232323;margin:4px 0 20px;"></div>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">7 days left in your trial. Reply anytime.</p>
    `),
  },

  expiring_soon: {
    subject: "What happens at your next audit without this?",
    html: (orgName: string) => emailWrapper(`
      <div style="background:#F59E0B22;border:1px solid #F59E0B44;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#F59E0B;font-weight:700;">3 days left in your trial</p>
      </div>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Your POI asks for your hazard register. What do you hand them?</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">Subscribe and everything stays live — your FRAT templates, hazard register, corrective actions, crew accounts. Your pilots keep submitting. Your data keeps building.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background:#0A0A0A;border:1px solid #232323;border-radius:8px;padding:20px;width:48%;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:800;color:#FFFFFF;">Starter</p>
            <p style="margin:0 0 2px;font-size:24px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">$149<span style="font-size:13px;color:#666666;font-weight:400;">/mo</span></p>
            <p style="margin:0;font-size:11px;color:#666666;">Up to 5 aircraft, unlimited pilots</p>
          </td>
          <td style="width:4%;"></td>
          <td style="background:#0A0A0A;border:1px solid #22D3EE44;border-radius:8px;padding:20px;width:48%;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:800;color:#FFFFFF;">Professional</p>
            <p style="margin:0 0 2px;font-size:24px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">$349<span style="font-size:13px;color:#666666;font-weight:400;">/mo</span></p>
            <p style="margin:0;font-size:11px;color:#666666;">Up to 15 aircraft + analytics</p>
          </td>
        </tr>
      </table>

      ${ctaButton("Subscribe Now", APP_URL + "?tab=subscription")}

      <div style="border-top:1px solid #232323;margin:4px 0 20px;"></div>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">Need more than 15 aircraft? Reply to this email.</p>
    `),
  },

  trial_expired: {
    subject: "Your SMS is offline",
    html: (orgName: string) => emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Your trial has ended</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#AAAAAA;line-height:1.7;">Your pilots can no longer submit FRATs or safety reports. But nothing has been deleted — subscribe and it all comes back online immediately.</p>

      ${ctaButton("Reactivate — $149/mo", APP_URL + "?tab=subscription")}

      <div style="border-top:1px solid #232323;margin:4px 0 20px;"></div>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">Not the right fit? Reply and tell us why — it helps us build better software for operators like you.</p>
    `),
  },
};

// ── EMAIL SENDING ────────────────────────────────────────────

async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend API error: ${resp.status} ${err}`);
  }
  return resp.json();
}

// ── MAIN ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "PreflightSMS <noreply@preflightsms.com>";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const results: string[] = [];

    // Find all trial orgs
    const { data: trialOrgs, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, created_at")
      .eq("subscription_status", "trial");

    if (orgErr) throw orgErr;
    if (!trialOrgs || trialOrgs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trial orgs found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get already-sent emails
    const orgIds = trialOrgs.map(o => o.id);
    const { data: sentEmails } = await supabase
      .from("trial_emails_sent")
      .select("org_id, email_type")
      .in("org_id", orgIds);

    const sentSet = new Set((sentEmails || []).map(s => `${s.org_id}:${s.email_type}`));

    for (const org of trialOrgs) {
      const created = new Date(org.created_at);
      const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      // Determine which email to send
      let emailType: string | null = null;
      if (daysSinceCreation >= 14) emailType = "trial_expired";
      else if (daysSinceCreation >= 11) emailType = "expiring_soon";
      else if (daysSinceCreation >= 7) emailType = "mid_trial";
      else if (daysSinceCreation >= 2) emailType = "getting_started";

      if (!emailType) continue;
      if (sentSet.has(`${org.id}:${emailType}`)) continue;

      // Get the admin user's email for this org
      const { data: admin } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("org_id", org.id)
        .eq("role", "admin")
        .limit(1)
        .single();

      if (!admin?.email) continue;

      const template = templates[emailType as keyof typeof templates];
      if (!template) continue;

      try {
        await sendEmail(
          resendApiKey,
          fromEmail,
          admin.email,
          template.subject,
          template.html(org.name)
        );

        // Record that we sent it
        await supabase.from("trial_emails_sent").insert({
          org_id: org.id,
          email_type: emailType,
          recipient_email: admin.email,
        });

        results.push(`Sent ${emailType} to ${admin.email} (${org.name})`);
      } catch (emailErr: any) {
        results.push(`Failed ${emailType} for ${org.name}: ${emailErr.message}`);
      }
    }

    return new Response(
      JSON.stringify({ message: "Trial emails processed", sent: results.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
