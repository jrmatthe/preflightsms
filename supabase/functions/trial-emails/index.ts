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
  <img src="${LOGO_URL}" alt="PreflightSMS" width="60" style="display:block;" />
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
    subject: "Get the most out of your PreflightSMS trial",
    html: (orgName: string) => emailWrapper(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Welcome Aboard, ${orgName}</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">You signed up two days ago — here are the fastest ways to get value from PreflightSMS:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        ${featureRow("1️⃣", "<strong style='color:#FFFFFF;'>Submit your first FRAT</strong> — takes under 2 minutes. Your risk categories are pre-configured for Part 135.")}
        ${featureRow("2️⃣", "<strong style='color:#FFFFFF;'>Add your crew</strong> — share your org join code so pilots can self-enroll.")}
        ${featureRow("3️⃣", "<strong style='color:#FFFFFF;'>Upload a policy</strong> — start building your SMS document library with acknowledgment tracking.")}
        ${featureRow("4️⃣", "<strong style='color:#FFFFFF;'>Create a flight</strong> — test flight following with real-time status and overdue alerts.")}
      </table>
      ${ctaButton("Open PreflightSMS", APP_URL)}
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">Your trial includes full access to every feature for 14 days. No credit card needed.</p>
    `),
  },

  mid_trial: {
    subject: "You're halfway through your trial",
    html: (orgName: string) => emailWrapper(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Day 7 — Halfway There</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">You have 7 days left in your PreflightSMS trial. Here are some features you might not have tried yet:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        ${featureRow("📊", "<strong style='color:#FFFFFF;'>Dashboard Analytics</strong> — risk trends, safety metrics, and crew compliance at a glance.")}
        ${featureRow("🛡", "<strong style='color:#FFFFFF;'>FAA Audit Log</strong> — auto-generated Part 5 compliance evidence for your next FSDO visit.")}
        ${featureRow("🎓", "<strong style='color:#FFFFFF;'>CBT Modules</strong> — build training courses with quizzes and track completion.")}
        ${featureRow("⚠️", "<strong style='color:#FFFFFF;'>Hazard Register</strong> — log hazards, assign risk scores, and track corrective actions.")}
      </table>
      ${ctaButton("Explore Features", APP_URL)}
      <div style="border-top:1px solid #232323;margin:20px 0;"></div>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">Questions? Reply to this email — we read every message.</p>
    `),
  },

  expiring_soon: {
    subject: "Your PreflightSMS trial ends in 3 days",
    html: (orgName: string) => emailWrapper(`
      <div style="background:#F59E0B22;border:1px solid #F59E0B44;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#F59E0B;font-weight:700;">⏳ 3 days remaining in your trial</p>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Don't Lose Your Setup</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">Your PreflightSMS trial for ${orgName} expires in 3 days. Subscribe now to keep everything you've built — your FRATs, crew data, policies, and training records are all saved and waiting.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background:#0A0A0A;border:1px solid #232323;border-radius:8px;padding:16px;width:48%;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:800;color:#FFFFFF;">Starter</p>
            <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">$149<span style="font-size:12px;color:#888888;font-weight:400;">/mo</span></p>
            <p style="margin:0 0 8px;font-size:12px;color:#4ADE80;">or $1,490/year (save 17%)</p>
            <p style="margin:0;font-size:11px;color:#888888;">Up to 5 aircraft</p>
          </td>
          <td style="width:4%;"></td>
          <td style="background:#0A0A0A;border:1px solid #22D3EE44;border-radius:8px;padding:16px;width:48%;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:800;color:#FFFFFF;">Professional</p>
            <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">$299<span style="font-size:12px;color:#888888;font-weight:400;">/mo</span></p>
            <p style="margin:0 0 8px;font-size:12px;color:#4ADE80;">or $2,990/year (save 17%)</p>
            <p style="margin:0;font-size:11px;color:#888888;">Up to 15 aircraft + analytics</p>
          </td>
        </tr>
      </table>
      ${ctaButton("Subscribe Now", APP_URL + "?tab=admin")}
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">All your data will be preserved when you subscribe. No re-setup required.</p>
    `),
  },

  trial_expired: {
    subject: "Your PreflightSMS trial has ended",
    html: (orgName: string) => emailWrapper(`
      <div style="background:#EF444422;border:1px solid #EF444444;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#EF4444;font-weight:700;">Your 14-day trial has ended</p>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Your Data Is Safe</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">The trial for ${orgName} has expired, but nothing has been deleted. Your FRATs, crew records, policies, training data, and safety reports are all preserved. Subscribe anytime to pick up right where you left off.</p>
      ${ctaButton("Reactivate Account", APP_URL + "?tab=admin")}
      <div style="border-top:1px solid #232323;margin:20px 0;"></div>
      <p style="margin:0 0 8px;font-size:12px;color:#555555;line-height:1.5;">Part 5 compliance deadline: <strong style="color:#F59E0B;">May 28, 2027</strong></p>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">If you have questions or need a custom plan for your operation, reply to this email.</p>
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
