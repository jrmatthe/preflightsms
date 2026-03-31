// supabase/functions/analyze-trends/index.ts
//
// Supabase Edge Function — runs daily via pg_cron (7am UTC)
// Computes trend anomalies for Professional/Enterprise orgs.
// After statistical computation, generates AI narrative via Claude API.
//
// SETUP:
// 1. Deploy: supabase functions deploy analyze-trends
// 2. Set up cron in Supabase Dashboard → Database → Extensions → pg_cron:
//    select cron.schedule(
//      'analyze-trends-daily',
//      '0 7 * * *',
//      $$select net.http_post(
//        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/analyze-trends',
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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d60 = new Date(now.getTime() - 60 * 86400000);
    const currentStart = toDateStr(d30);
    const currentEnd = toDateStr(now);
    const baselineStart = toDateStr(d60);
    const baselineEnd = toDateStr(d30);

    let alertsCreated = 0;
    let notificationsCreated = 0;

    // Get all orgs with professional or enterprise tier
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

    for (const org of orgs) {
      const orgId = org.id;

      // ── Metric 1: Average FRAT score ──
      const { data: currentFrats } = await supabase
        .from("frat_submissions")
        .select("score")
        .eq("org_id", orgId)
        .gte("created_at", currentStart)
        .lte("created_at", currentEnd);

      const { data: baselineFrats } = await supabase
        .from("frat_submissions")
        .select("score")
        .eq("org_id", orgId)
        .gte("created_at", baselineStart)
        .lte("created_at", baselineEnd);

      // ── Metric 2: Safety report count ──
      const { count: currentReports } = await supabase
        .from("safety_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", currentStart)
        .lte("created_at", currentEnd);

      const { count: baselineReports } = await supabase
        .from("safety_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", baselineStart)
        .lte("created_at", baselineEnd);

      // ── Metric 3: Overdue corrective actions ──
      const { count: currentOverdue } = await supabase
        .from("corrective_actions")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("status", "in", '("completed","closed")')
        .lt("due_date", currentEnd);

      const { count: baselineOverdue } = await supabase
        .from("corrective_actions")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("status", "in", '("completed","closed")')
        .lt("due_date", baselineEnd);

      // ── Metric 4: Avg days to close corrective actions ──
      const { data: currentClosed } = await supabase
        .from("corrective_actions")
        .select("created_at, updated_at")
        .eq("org_id", orgId)
        .in("status", ["completed", "closed"])
        .gte("updated_at", currentStart)
        .lte("updated_at", currentEnd);

      const { data: baselineClosed } = await supabase
        .from("corrective_actions")
        .select("created_at, updated_at")
        .eq("org_id", orgId)
        .in("status", ["completed", "closed"])
        .gte("updated_at", baselineStart)
        .lte("updated_at", baselineEnd);

      function avgDaysToClose(actions: { created_at: string; updated_at: string }[] | null): number {
        if (!actions || actions.length === 0) return 0;
        const total = actions.reduce((sum, a) => {
          return sum + (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 86400000;
        }, 0);
        return total / actions.length;
      }

      // Compute metrics
      const currentAvgFrat = currentFrats && currentFrats.length > 0
        ? currentFrats.reduce((s, r) => s + (r.score || 0), 0) / currentFrats.length : 0;
      const baselineAvgFrat = baselineFrats && baselineFrats.length > 0
        ? baselineFrats.reduce((s, r) => s + (r.score || 0), 0) / baselineFrats.length : 0;
      const currentCloseTime = avgDaysToClose(currentClosed);
      const baselineCloseTime = avgDaysToClose(baselineClosed);

      const metrics = [
        { name: "Average FRAT Score", current: currentAvgFrat, baseline: baselineAvgFrat },
        { name: "Safety Report Count", current: currentReports || 0, baseline: baselineReports || 0 },
        { name: "Overdue Corrective Actions", current: currentOverdue || 0, baseline: baselineOverdue || 0 },
        { name: "Avg Days to Close Actions", current: currentCloseTime, baseline: baselineCloseTime },
      ];

      for (const metric of metrics) {
        if (metric.baseline === 0) continue; // Skip if no baseline data

        const changePct = ((metric.current - metric.baseline) / metric.baseline) * 100;

        if (Math.abs(changePct) > 25) {
          const severity = Math.abs(changePct) > 75 ? "critical" : Math.abs(changePct) > 50 ? "warning" : "info";

          // Generate AI narrative for this alert
          let narrative = null;
          const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
          if (anthropicKey) {
            try {
              // Fetch additional context for narrative
              const { data: topFactors } = await supabase
                .from("frat_submissions")
                .select("factors")
                .eq("org_id", orgId)
                .gte("created_at", currentStart)
                .lte("created_at", currentEnd)
                .limit(50);

              const factorCounts: Record<string, number> = {};
              (topFactors || []).forEach(f => {
                (f.factors || []).forEach((fac: string | { id?: string; label?: string }) => {
                  const label = typeof fac === "string" ? fac : (fac.label || fac.id || "unknown");
                  factorCounts[label] = (factorCounts[label] || 0) + 1;
                });
              });
              const top5Factors = Object.entries(factorCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([label, count]) => `${label} (${count}x)`);

              const { data: recentReportTitles } = await supabase
                .from("safety_reports")
                .select("title, category")
                .eq("org_id", orgId)
                .order("created_at", { ascending: false })
                .limit(10);

              const { count: openHazards } = await supabase
                .from("hazard_register")
                .select("id", { count: "exact", head: true })
                .eq("org_id", orgId)
                .not("status", "in", '("closed","accepted")');

              const narrativePrompt = `You are a safety trend analyst for a Part 135 flight operation (${org.name}). Analyze the following metric change and provide a narrative summary.

METRIC: ${metric.name}
CHANGE: ${Math.round(changePct)}% over 30 days (${Math.round(metric.baseline * 10) / 10} → ${Math.round(metric.current * 10) / 10})
SEVERITY: ${severity}

ALL METRICS THIS PERIOD:
${metrics.map(m => `- ${m.name}: ${Math.round(m.current * 10) / 10} (baseline: ${Math.round(m.baseline * 10) / 10})`).join("\n")}

TOP FRAT RISK FACTORS: ${top5Factors.join(", ") || "None"}
RECENT REPORTS: ${(recentReportTitles || []).map(r => `${r.title} [${r.category}]`).join("; ") || "None"}
OPEN HAZARDS: ${openHazards || 0}

Respond ONLY with a JSON object:
{"summary": "2-3 sentence narrative of what this trend means", "focus_areas": ["area 1", "area 2", "area 3"], "risk_outlook": "improving|stable|declining"}`;

              const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": anthropicKey,
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-6",
                  max_tokens: 1024,
                  messages: [{ role: "user", content: narrativePrompt }],
                }),
              });

              const claudeData = await claudeRes.json();
              const responseText = claudeData.content?.[0]?.text || "{}";
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                narrative = JSON.parse(jsonMatch[0]);
              }

              // Log AI usage
              const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
              await supabase.from("ai_usage_log").insert({
                org_id: orgId,
                user_id: null,
                feature: "trend_narrative",
                tokens_used: tokensUsed,
                cost_estimate: tokensUsed * 0.000003,
              });
            } catch (narrativeErr) {
              console.error("Failed to generate narrative:", narrativeErr);
            }
          }

          await supabase.from("trend_alerts").insert({
            org_id: orgId,
            alert_type: "trend",
            metric_name: metric.name,
            current_value: Math.round(metric.current * 100) / 100,
            baseline_value: Math.round(metric.baseline * 100) / 100,
            change_percentage: Math.round(changePct * 10) / 10,
            period_start: currentStart,
            period_end: currentEnd,
            severity,
            narrative,
          });
          alertsCreated++;

          // Create notification for admins/safety managers
          const direction = changePct > 0 ? "increased" : "decreased";
          await supabase.from("notifications").insert({
            org_id: orgId,
            type: "trend_alert",
            title: `Trend Alert: ${metric.name}`,
            body: `${metric.name} has ${direction} by ${Math.abs(Math.round(changePct))}% over the last 30 days (${Math.round(metric.baseline * 10) / 10} → ${Math.round(metric.current * 10) / 10}).`,
            link_tab: "dashboard",
            target_roles: ["admin", "safety_manager"],
          });
          notificationsCreated++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Analyzed ${orgs.length} orgs. Created ${alertsCreated} alerts, ${notificationsCreated} notifications.`,
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
