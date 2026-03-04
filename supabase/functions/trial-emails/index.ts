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
  // ── DAY 2: ACTIVATION ──────────────────────────────────────
  // Goal: Get the ONE action that predicts conversion — a submitted FRAT.
  // Psychology: They signed up for a reason. Something triggered it —
  // an upcoming audit, a new FSDO inspector, a safety event, or they're
  // just tired of paper. Remind them of that pain and show the fix is fast.
  getting_started: {
    subject: "Your next FSDO visit just got easier",
    html: (orgName: string) => emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">You're 2 Minutes Away From a Working SMS</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">Most Part 135 operators we talk to are running their SMS on spreadsheets, paper forms, or not at all. You signed up because you know that's not going to hold up — not with your FSDO, not with your insurance, and not when something goes wrong.</p>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">Here's the fastest way to see what PreflightSMS actually does:</p>

      <div style="background:#0A0A0A;border:1px solid #232323;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#FFFFFF;">Submit a FRAT right now.</p>
        <p style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.6;">Open PreflightSMS, tap <strong style="color:#FFFFFF;">FRAT</strong>, and fill one out for your next flight. It takes under 2 minutes. The risk categories are already configured for Part 135 — weather, MEL items, crew rest, unfamiliar airports, all of it. When you're done, you'll have your first auditable FRAT record with a timestamped risk score.</p>
      </div>

      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">That one FRAT is already more documentation than most operators produce in a month. Now imagine every pilot on your crew doing this before every flight — from their phone, in 90 seconds, without you chasing anyone.</p>

      ${ctaButton("Submit Your First FRAT", APP_URL)}

      <p style="margin:0 0 6px;font-size:13px;color:#AAAAAA;line-height:1.6;">Three things that make this different from what you've tried before:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        ${featureRow("", "<strong style='color:#FFFFFF;'>Your FRAT, your way.</strong> Add categories, adjust weights, build templates for different aircraft or mission types. This isn't a generic checklist — it's configurable for your operation.")}
        ${featureRow("", "<strong style='color:#FFFFFF;'>Pilots will actually use it.</strong> Clean mobile interface, no app download, loads instantly. The #1 reason SMS programs fail is pilot adoption. We solved that.")}
        ${featureRow("", "<strong style='color:#FFFFFF;'>Audit-ready from day one.</strong> Every FRAT, safety report, and hazard assessment is timestamped, attributed, and exportable. When your POI asks for evidence of a functioning SMS, you hand them a login.")}
      </table>

      <div style="border-top:1px solid #232323;margin:4px 0 20px;"></div>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">Full access for 14 days. No credit card. Reply to this email anytime — a real person answers.</p>
    `),
  },

  // ── DAY 7: DEPTH ───────────────────────────────────────────
  // Goal: Show the closed-loop SMS workflow that justifies the price.
  // Psychology: By day 7 they've either poked around or forgotten.
  // Either way, show them the SYSTEM — not a list of features, but how
  // the pieces connect to create a defensible safety program.
  mid_trial: {
    subject: "The difference between an SMS and a filing cabinet",
    html: (orgName: string) => emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">A FRAT Is Just the Beginning</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">Collecting FRATs is easy. What separates a real SMS from a checkbox exercise is what happens <em style="color:#FFFFFF;">after</em> someone identifies a risk.</p>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">Here's the workflow that Part 135 safety managers tell us saves them hours every week:</p>

      <div style="background:#0A0A0A;border-left:3px solid #22D3EE;padding:16px 20px;margin-bottom:12px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#22D3EE;">1. A pilot flags something</p>
        <p style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.5;">FRAT score comes back elevated, or they submit a safety report from the field. Takes 90 seconds on their phone.</p>
      </div>
      <div style="background:#0A0A0A;border-left:3px solid #F59E0B;padding:16px 20px;margin-bottom:12px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#F59E0B;">2. You open a hazard investigation</p>
        <p style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.5;">Link it to the original report. Score it on the risk matrix — probability vs. severity. The hazard register tracks every open item across your operation.</p>
      </div>
      <div style="background:#0A0A0A;border-left:3px solid #4ADE80;padding:16px 20px;margin-bottom:12px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#4ADE80;">3. You assign a corrective action</p>
        <p style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.5;">Specific person, specific deadline. They get notified. You track open vs. closed. Nothing falls through the cracks.</p>
      </div>
      <div style="background:#0A0A0A;border-left:3px solid #FFFFFF;padding:16px 20px;margin-bottom:24px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#FFFFFF;">4. Your dashboard shows the trend</p>
        <p style="margin:0;font-size:13px;color:#AAAAAA;line-height:1.5;">Risk scores over time, reporting frequency, open items, crew compliance. When your FSDO asks "how do you know your SMS is working?" — this is your answer.</p>
      </div>

      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">That closed loop — report, investigate, mitigate, measure — is exactly what Part 5 requires and exactly what most operators can't demonstrate. PreflightSMS makes it automatic.</p>

      ${ctaButton("Try the Full Workflow", APP_URL)}

      <div style="border-top:1px solid #232323;margin:4px 0 20px;"></div>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">7 days left in your trial. Reply anytime — we're here to help you get set up.</p>
    `),
  },

  // ── DAY 11: URGENCY ────────────────────────────────────────
  // Goal: Convert. Make the cost of inaction feel real.
  // Psychology: Loss aversion > feature lists. Frame it as risk —
  // they already know they need this, remind them what happens without it.
  expiring_soon: {
    subject: "What happens at your next FSDO audit without an SMS?",
    html: (orgName: string) => emailWrapper(`
      <div style="background:#F59E0B22;border:1px solid #F59E0B44;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#F59E0B;font-weight:700;">3 days remaining in your trial</p>
      </div>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">You Know What Happens Next</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#AAAAAA;line-height:1.7;">Your POI shows up. They ask for your safety policy. Your hazard register. Evidence of risk assessments. Corrective action follow-through. Training records.</p>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">You can scramble to pull together spreadsheets and email threads — or you can hand them a login to PreflightSMS and show them a system that's been running every day since you set it up.</p>

      <div style="background:#0A0A0A;border:1px solid #232323;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#FFFFFF;">What ${orgName} loses in 3 days:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${featureRow("", "<span style='color:#AAAAAA;'>FRAT templates configured for your operation</span>")}
          ${featureRow("", "<span style='color:#AAAAAA;'>Mobile reporting your pilots can use from anywhere</span>")}
          ${featureRow("", "<span style='color:#AAAAAA;'>Hazard register with risk matrix scoring</span>")}
          ${featureRow("", "<span style='color:#AAAAAA;'>Corrective action tracking with accountability</span>")}
          ${featureRow("", "<span style='color:#AAAAAA;'>A dashboard that proves your SMS is actually working</span>")}
        </table>
      </div>

      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">Subscribe now and everything stays exactly as you set it up. Your pilots keep submitting, your data keeps building, and your next audit is a non-event.</p>

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
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">Need more than 15 aircraft or want a custom setup? Reply to this email.</p>
    `),
  },

  // ── DAY 14: LAST CHANCE ────────────────────────────────────
  // Goal: Reactivate. Short, direct, no feature dump.
  // Psychology: They didn't convert yet. Don't repeat yourself.
  // Acknowledge the decision, reduce friction, leave the door open.
  trial_expired: {
    subject: "Your SMS is offline",
    html: (orgName: string) => emailWrapper(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Your Trial Has Ended</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#AAAAAA;line-height:1.7;">The PreflightSMS trial for ${orgName} expired today. Your pilots can no longer submit FRATs or safety reports, and your SMS data is no longer accumulating.</p>
      <p style="margin:0 0 24px;font-size:14px;color:#AAAAAA;line-height:1.7;">But nothing has been deleted. Your FRAT templates, hazard register, corrective actions, crew accounts, and every record submitted during your trial are preserved. Subscribe and it all comes back online immediately — no re-setup, no data loss.</p>

      ${ctaButton("Reactivate Now — $149/mo", APP_URL + "?tab=subscription")}

      <div style="border-top:1px solid #232323;margin:4px 0 20px;"></div>
      <p style="margin:0 0 12px;font-size:13px;color:#AAAAAA;line-height:1.6;">If PreflightSMS wasn't the right fit, we'd genuinely like to know why. Reply to this email and tell us — it helps us build a better product for operators like you.</p>
      <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">If you need a custom plan, a longer evaluation, or want to talk through your SMS requirements, just reply. We'll figure it out.</p>
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
