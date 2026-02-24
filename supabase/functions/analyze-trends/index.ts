// supabase/functions/analyze-trends/index.ts
//
// Supabase Edge Function — runs daily via pg_cron (7am UTC)
// Computes trend anomalies for Professional/Enterprise orgs.
// Pure statistical — no Claude API call.
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
