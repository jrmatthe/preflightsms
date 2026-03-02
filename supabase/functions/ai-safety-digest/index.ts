// supabase/functions/ai-safety-digest/index.ts
//
// AI Weekly Safety Digest — generates and emails a weekly AI-powered
// safety digest to admins/safety managers of Professional/Enterprise orgs.
//
// Deploy: supabase functions deploy ai-safety-digest
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-... RESEND_API_KEY=re_... FROM_EMAIL=noreply@preflightsms.com
//
// CRON SETUP (Monday 8am UTC):
//   select cron.schedule(
//     'ai-safety-digest-weekly',
//     '0 8 * * 1',
//     $$select net.http_post(
//       url := 'https://YOUR_PROJECT.supabase.co/functions/v1/ai-safety-digest',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
//         'Content-Type', 'application/json'
//       ),
//       body := '{}'::jsonb
//     );$$
//   );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL = "https://login.preflightsms.com/logo.png";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function buildDigestHtml(orgName: string, dateRange: string, digest: Record<string, unknown>): string {
  const overview = (digest.overview as string) || "No overview available.";
  const keyMetrics = (digest.key_metrics as Record<string, unknown>) || {};
  const notableEvents = (digest.notable_events as string[]) || [];
  const riskTrends = (digest.risk_trends as string) || "No trend data available.";
  const recommendedActions = (digest.recommended_actions as string[]) || [];
  const safetyScoreTrend = (digest.safety_score_trend as string) || "stable";

  const trendColor = safetyScoreTrend === "improving" ? "#4ADE80" : safetyScoreTrend === "declining" ? "#EF4444" : "#FACC15";
  const trendLabel = safetyScoreTrend === "improving" ? "IMPROVING" : safetyScoreTrend === "declining" ? "NEEDS ATTENTION" : "STABLE";

  const metricsRows = Object.entries(keyMetrics).map(([key, val]) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #232323;font-size:13px;color:#D4D4D4;">${key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</td><td style="padding:8px 12px;border-bottom:1px solid #232323;font-size:13px;color:#FFFFFF;font-weight:700;text-align:right;">${val}</td></tr>`
  ).join("");

  const eventItems = notableEvents.map(e =>
    `<li style="margin-bottom:6px;font-size:13px;color:#D4D4D4;line-height:1.5;">${e}</li>`
  ).join("");

  const actionItems = recommendedActions.map(a =>
    `<li style="margin-bottom:6px;font-size:13px;color:#D4D4D4;line-height:1.5;">${a}</li>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
  <img src="${LOGO_URL}" alt="PreflightSMS" width="60" style="display:block;" />
</td></tr>
<tr><td style="background:#161616;border:1px solid #232323;border-radius:12px;padding:40px 36px;">

<h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#FFFFFF;font-family:Georgia,serif;">Weekly Safety Digest</h1>
<p style="margin:0 0 6px;font-size:13px;color:#888888;">${orgName}</p>
<p style="margin:0 0 24px;font-size:12px;color:#555555;">${dateRange}</p>

<div style="display:inline-block;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;color:${trendColor};background:${trendColor}15;border:1px solid ${trendColor}33;margin-bottom:24px;">${trendLabel}</div>

<h2 style="margin:24px 0 8px;font-size:14px;font-weight:700;color:#22D3EE;text-transform:uppercase;letter-spacing:0.5px;">Overview</h2>
<p style="margin:0 0 20px;font-size:13px;color:#D4D4D4;line-height:1.6;">${overview}</p>

${metricsRows ? `
<h2 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#22D3EE;text-transform:uppercase;letter-spacing:0.5px;">Key Metrics</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#111111;border-radius:8px;border:1px solid #232323;overflow:hidden;">
${metricsRows}
</table>` : ""}

${eventItems ? `
<h2 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#22D3EE;text-transform:uppercase;letter-spacing:0.5px;">Notable Events</h2>
<ul style="margin:0 0 20px;padding-left:20px;">${eventItems}</ul>` : ""}

<h2 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#22D3EE;text-transform:uppercase;letter-spacing:0.5px;">Risk Trends</h2>
<p style="margin:0 0 20px;font-size:13px;color:#D4D4D4;line-height:1.6;">${riskTrends}</p>

${actionItems ? `
<h2 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#22D3EE;text-transform:uppercase;letter-spacing:0.5px;">Recommended Actions</h2>
<ul style="margin:0 0 20px;padding-left:20px;">${actionItems}</ul>` : ""}

<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:12px 0 0;">
  <a href="https://login.preflightsms.com" target="_blank" style="display:inline-block;padding:14px 40px;background:#FFFFFF;color:#000000;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">View Dashboard</a>
</td></tr></table>

</td></tr>
<tr><td align="center" style="padding-top:24px;">
  <p style="margin:0;font-size:10px;color:#444444;">PreflightSMS · Part 5 SMS Compliance for Part 135 Operators</p>
  <p style="margin:4px 0 0;font-size:10px;color:#333333;">This digest was generated by AI. Review all data in PreflightSMS for full accuracy.</p>
</td></tr>
</table>
</td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@preflightsms.com";

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const periodStart = toDateStr(weekAgo);
    const periodEnd = toDateStr(now);

    // Get all Professional/Enterprise orgs
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, tier")
      .in("tier", ["professional", "enterprise"]);

    if (!orgs || orgs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No eligible orgs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let digestsSent = 0;

    for (const org of orgs) {
      const orgId = org.id;

      // Gather 7 days of data
      const { data: frats } = await supabase
        .from("frat_submissions")
        .select("score, factors, risk_level, created_at")
        .eq("org_id", orgId)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);

      const { data: reports } = await supabase
        .from("safety_reports")
        .select("title, category, severity, status, created_at")
        .eq("org_id", orgId)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);

      const { data: hazards } = await supabase
        .from("hazard_register")
        .select("title, category, status, initial_likelihood, initial_severity, created_at")
        .eq("org_id", orgId)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);

      const { data: actions } = await supabase
        .from("corrective_actions")
        .select("title, status, priority, created_at")
        .eq("org_id", orgId)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);

      const { count: flightCount } = await supabase
        .from("flights")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);

      // Skip orgs with zero activity
      const totalActivity = (frats?.length || 0) + (reports?.length || 0) + (hazards?.length || 0) + (actions?.length || 0) + (flightCount || 0);
      if (totalActivity === 0) continue;

      // Build summary for Claude
      const fratSummary = (frats || []).length > 0
        ? `FRATs: ${frats!.length} submitted, avg score ${(frats!.reduce((s, f) => s + (f.score || 0), 0) / frats!.length).toFixed(1)}, risk levels: ${JSON.stringify(frats!.reduce((acc: Record<string, number>, f) => { acc[f.risk_level || "unknown"] = (acc[f.risk_level || "unknown"] || 0) + 1; return acc; }, {}))}`
        : "FRATs: 0 submitted";

      const reportSummary = (reports || []).length > 0
        ? `Safety Reports: ${reports!.length} filed. Categories: ${[...new Set(reports!.map(r => r.category))].join(", ")}. Severities: ${JSON.stringify(reports!.reduce((acc: Record<string, number>, r) => { acc[r.severity] = (acc[r.severity] || 0) + 1; return acc; }, {}))}`
        : "Safety Reports: 0 filed";

      const hazardSummary = (hazards || []).length > 0
        ? `Hazards: ${hazards!.length} new. Categories: ${[...new Set(hazards!.map(h => h.category))].join(", ")}`
        : "Hazards: 0 new";

      const actionSummary = (actions || []).length > 0
        ? `Corrective Actions: ${actions!.length} created. Statuses: ${JSON.stringify(actions!.reduce((acc: Record<string, number>, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}))}`
        : "Corrective Actions: 0 created";

      const prompt = `You are a safety management analyst for a Part 135 flight operation (${org.name}). Generate a weekly safety digest for the period ${periodStart} to ${periodEnd}.

WEEKLY DATA:
- Flights: ${flightCount || 0}
- ${fratSummary}
- ${reportSummary}
- ${hazardSummary}
- ${actionSummary}

Produce a concise, actionable weekly safety digest. Focus on patterns, trends, and actionable recommendations.

Respond ONLY with a JSON object:
{"overview": "2-3 sentence executive summary", "key_metrics": {"flights": ${flightCount || 0}, "frats_submitted": ${frats?.length || 0}, "safety_reports": ${reports?.length || 0}, "new_hazards": ${hazards?.length || 0}, "corrective_actions": ${actions?.length || 0}}, "notable_events": ["event 1", "event 2"], "risk_trends": "1-2 sentence trend description", "recommended_actions": ["action 1", "action 2"], "safety_score_trend": "improving|stable|declining"}`;

      // Call Claude API
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const claudeData = await claudeRes.json();
      const responseText = claudeData.content?.[0]?.text || "{}";

      let digestData: Record<string, unknown> = {};
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          digestData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error(`Failed to parse digest for org ${orgId}:`, responseText);
        continue;
      }

      // Get admin/safety_manager emails
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("org_id", orgId)
        .in("role", ["admin", "safety_manager"]);

      const recipientEmails = (adminProfiles || []).filter(p => p.email).map(p => p.email);

      // Store digest
      await supabase.from("safety_digests").insert({
        org_id: orgId,
        period_start: periodStart,
        period_end: periodEnd,
        digest_data: digestData,
        recipients: recipientEmails,
      });

      // Send email via Resend
      if (resendApiKey && recipientEmails.length > 0) {
        const dateRange = `${new Date(periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${new Date(periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        const html = buildDigestHtml(org.name, dateRange, digestData);

        for (const email of recipientEmails) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: fromEmail,
                to: email,
                subject: `Weekly Safety Digest — ${org.name} (${dateRange})`,
                html,
              }),
            });
          } catch (emailErr) {
            console.error(`Failed to send digest email to ${email}:`, emailErr);
          }
        }
      }

      // Create notification
      await supabase.from("notifications").insert({
        org_id: orgId,
        type: "safety_digest",
        title: "Weekly Safety Digest",
        body: `Your AI-generated safety digest for ${periodStart} to ${periodEnd} is ready.`,
        link_tab: "dashboard",
        target_roles: ["admin", "safety_manager"],
      });

      // Log AI usage
      const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
      await supabase.from("ai_usage_log").insert({
        org_id: orgId,
        user_id: null,
        feature: "safety_digest",
        tokens_used: tokensUsed,
        cost_estimate: tokensUsed * 0.000003,
      });

      digestsSent++;
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${orgs.length} orgs. Sent ${digestsSent} digests.`,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
