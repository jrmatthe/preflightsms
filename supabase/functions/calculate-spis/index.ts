// supabase/functions/calculate-spis/index.ts
//
// Supabase Edge Function — runs daily via pg_cron
// Calculates SPI measurements for all active SPIs across all orgs.
// Compares measured values against targets and generates notifications.
//
// SETUP:
// 1. Deploy: supabase functions deploy calculate-spis
// 2. Set up cron in Supabase Dashboard → Database → Extensions → pg_cron:
//    select cron.schedule(
//      'calculate-spis-daily',
//      '0 6 * * *',
//      $$select net.http_post(
//        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/calculate-spis',
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

interface SPI {
  id: string;
  org_id: string;
  name: string;
  category: string;
  data_source: string;
  calculation_method: string;
  formula_config: Record<string, unknown> | null;
  unit: string | null;
  measurement_period: string;
  is_active: boolean;
}

interface SPT {
  id: string;
  spi_id: string;
  target_type: string;
  target_value: number | null;
  alert_threshold: number | null;
  effective_date: string;
  end_date: string | null;
}

function getPeriodDates(period: string, now: Date): { start: Date; end: Date } {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "weekly": {
      const dayOfWeek = now.getDay();
      const start = new Date(year, month, now.getDate() - dayOfWeek - 7);
      const end = new Date(year, month, now.getDate() - dayOfWeek - 1);
      return { start, end };
    }
    case "quarterly": {
      const qMonth = Math.floor(month / 3) * 3 - 3;
      const start = new Date(year, qMonth < 0 ? qMonth + 12 : qMonth, 1);
      const end = new Date(
        qMonth < 0 ? year - 1 : year,
        qMonth < 0 ? qMonth + 15 : qMonth + 3,
        0
      );
      return { start, end };
    }
    case "annually": {
      const start = new Date(year - 1, 0, 1);
      const end = new Date(year - 1, 11, 31);
      return { start, end };
    }
    case "monthly":
    default: {
      // Previous month
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { start, end };
    }
  }
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function evaluateStatus(
  value: number,
  target: SPT | null
): string {
  if (!target || target.target_value === null) return "on_target";

  const tv = Number(target.target_value);
  const threshold = target.alert_threshold !== null ? Number(target.alert_threshold) : null;

  if (target.target_type === "maximum") {
    // Value should stay below target
    if (value > tv) return "breached";
    if (threshold !== null && value > threshold) return "approaching_threshold";
    return "on_target";
  }

  if (target.target_type === "minimum") {
    // Value should stay above target
    if (value < tv) return "breached";
    if (threshold !== null && value < threshold) return "approaching_threshold";
    return "on_target";
  }

  // range: target_value is the ideal, threshold is how far off is acceptable
  if (threshold !== null) {
    if (Math.abs(value - tv) > threshold) return "breached";
    if (Math.abs(value - tv) > threshold * 0.7) return "approaching_threshold";
  }
  return "on_target";
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
    let processed = 0;
    let notifications = 0;

    // Get all active SPIs
    const { data: spis, error: spiErr } = await supabase
      .from("safety_performance_indicators")
      .select("*")
      .eq("is_active", true);

    if (spiErr || !spis || spis.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active SPIs found", error: spiErr }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group SPIs by org
    const orgSpis: Record<string, SPI[]> = {};
    for (const spi of spis as SPI[]) {
      if (!orgSpis[spi.org_id]) orgSpis[spi.org_id] = [];
      orgSpis[spi.org_id].push(spi);
    }

    for (const [orgId, orgSpiList] of Object.entries(orgSpis)) {
      for (const spi of orgSpiList) {
        const { start, end } = getPeriodDates(spi.measurement_period, now);
        const periodStart = toDateStr(start);
        const periodEnd = toDateStr(end);

        // Check if measurement already exists for this period
        const { data: existing } = await supabase
          .from("spi_measurements")
          .select("id")
          .eq("spi_id", spi.id)
          .eq("period_start", periodStart)
          .eq("period_end", periodEnd)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Calculate measurement value
        let value = 0;
        try {
          value = await calculateSpiValue(supabase, spi, orgId, start, end);
        } catch (e) {
          console.error(`Error calculating SPI ${spi.name} for org ${orgId}:`, e);
          continue;
        }

        // Get active target
        const { data: targets } = await supabase
          .from("safety_performance_targets")
          .select("*")
          .eq("spi_id", spi.id)
          .lte("effective_date", periodEnd)
          .or(`end_date.is.null,end_date.gte.${periodStart}`)
          .order("effective_date", { ascending: false })
          .limit(1);

        const activeTarget = (targets && targets.length > 0) ? targets[0] as SPT : null;
        const status = evaluateStatus(value, activeTarget);

        // Insert measurement
        await supabase.from("spi_measurements").insert({
          spi_id: spi.id,
          period_start: periodStart,
          period_end: periodEnd,
          measured_value: value,
          target_value: activeTarget?.target_value ?? null,
          status,
          auto_calculated: true,
        });

        processed++;

        // Notify if breached or approaching
        if (status === "breached" || status === "approaching_threshold") {
          const statusLabel =
            status === "breached" ? "BREACHED TARGET" : "Approaching Threshold";
          await supabase.from("notifications").insert({
            org_id: orgId,
            type: "spi_alert",
            title: `SPI Alert: ${spi.name}`,
            body: `${spi.name} — ${statusLabel}. Value: ${value.toFixed(1)}${spi.unit ? " " + spi.unit : ""}. Target: ${activeTarget?.target_value ?? "N/A"}.`,
            link_tab: "dashboard",
            target_roles: ["admin", "safety_manager"],
          });
          notifications++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processed} SPI measurements. Generated ${notifications} alerts.`,
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

// deno-lint-ignore no-explicit-any
async function calculateSpiValue(supabase: any, spi: SPI, orgId: string, periodStart: Date, periodEnd: Date): Promise<number> {
  const startStr = toDateStr(periodStart);
  const endStr = toDateStr(periodEnd);
  const config = spi.formula_config as Record<string, unknown> || {};

  switch (spi.data_source) {
    case "frats": {
      if (spi.calculation_method === "percentage") {
        // FRAT Completion Rate: flights with FRATs / total flights
        const { count: flightCount } = await supabase
          .from("flights")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .gte("created_at", startStr)
          .lte("created_at", endStr);

        const { count: fratCount } = await supabase
          .from("frat_submissions")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .gte("created_at", startStr)
          .lte("created_at", endStr);

        if (!flightCount || flightCount === 0) return 100;
        return ((fratCount || 0) / flightCount) * 100;
      }
      if (config.numerator === "high_critical") {
        // High/Critical FRAT Rate
        const { count: total } = await supabase
          .from("frat_submissions")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .gte("created_at", startStr)
          .lte("created_at", endStr);

        const { count: highCrit } = await supabase
          .from("frat_submissions")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .gte("created_at", startStr)
          .lte("created_at", endStr)
          .gt("score", 30);

        if (!total || total === 0) return 0;
        return ((highCrit || 0) / total) * 100;
      }
      // Default: count
      const { count } = await supabase
        .from("frat_submissions")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      return count || 0;
    }

    case "safety_reports": {
      if (spi.calculation_method === "rate") {
        // Reports per 100 flight hours — since we may not have hours data, use count
        const { count } = await supabase
          .from("safety_reports")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .gte("created_at", startStr)
          .lte("created_at", endStr);

        const multiplier = (config.multiplier as number) || 1;
        return (count || 0) * multiplier;
      }
      const { count } = await supabase
        .from("safety_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      return count || 0;
    }

    case "corrective_actions": {
      if (spi.calculation_method === "average") {
        // Average time to close
        const { data: closed } = await supabase
          .from("corrective_actions")
          .select("created_at, updated_at")
          .eq("org_id", orgId)
          .in("status", ["completed", "closed"])
          .gte("updated_at", startStr)
          .lte("updated_at", endStr);

        if (!closed || closed.length === 0) return 0;
        const totalDays = closed.reduce((sum: number, a: { created_at: string; updated_at: string }) => {
          const created = new Date(a.created_at).getTime();
          const updated = new Date(a.updated_at).getTime();
          return sum + (updated - created) / 86400000;
        }, 0);
        return totalDays / closed.length;
      }
      if (spi.calculation_method === "count" && config.numerator === "overdue") {
        // Overdue count
        const { count } = await supabase
          .from("corrective_actions")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .not("status", "in", '("completed","closed")')
          .lt("due_date", toDateStr(new Date()));
        return count || 0;
      }
      const { count } = await supabase
        .from("corrective_actions")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      return count || 0;
    }

    case "training": {
      // Training compliance: personnel with current training / total personnel
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", orgId);

      const { data: reqs } = await supabase
        .from("training_requirements")
        .select("id")
        .eq("org_id", orgId);

      if (!profiles || profiles.length === 0 || !reqs || reqs.length === 0) return 100;

      const { data: records } = await supabase
        .from("training_records")
        .select("user_id, requirement_id")
        .eq("org_id", orgId);

      const total = profiles.length * reqs.length;
      const completed = records?.length || 0;
      return total > 0 ? (completed / total) * 100 : 100;
    }

    case "investigations": {
      // Investigation rate: reports reaching investigation / total reports
      const { count: totalReports } = await supabase
        .from("safety_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", startStr)
        .lte("created_at", endStr);

      const { count: investigated } = await supabase
        .from("safety_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", startStr)
        .lte("created_at", endStr)
        .in("status", ["investigating", "resolved", "closed"]);

      if (!totalReports || totalReports === 0) return 100;
      return ((investigated || 0) / totalReports) * 100;
    }

    case "policies": {
      // Policy acknowledgment rate
      const { data: policies } = await supabase
        .from("policies")
        .select("id, acknowledged_by")
        .eq("org_id", orgId)
        .eq("status", "active");

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", orgId);

      if (!policies || policies.length === 0 || !profiles || profiles.length === 0) return 100;

      let totalRequired = 0;
      let totalAcked = 0;
      for (const pol of policies) {
        totalRequired += profiles.length;
        const acked = pol.acknowledged_by || [];
        totalAcked += Array.isArray(acked) ? acked.length : 0;
      }
      return totalRequired > 0 ? (totalAcked / totalRequired) * 100 : 100;
    }

    default:
      return 0;
  }
}
