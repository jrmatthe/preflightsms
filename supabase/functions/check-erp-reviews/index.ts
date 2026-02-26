// supabase/functions/check-erp-reviews/index.ts
//
// Supabase Edge Function — runs weekly via cron
// Checks ERP plans that haven't been reviewed in 365+ days
// and upcoming scheduled drills (within 7 days).
// Creates erp_plan_review_due and erp_drill_due notifications.
//
// SETUP:
// 1. Deploy: supabase functions deploy check-erp-reviews
// 2. Schedule via pg_cron (weekly, e.g. Monday at 07:00 UTC)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 86400000);
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    let notificationsCreated = 0;

    // Check ERP plans needing review (last_reviewed_at null or > 365 days ago)
    const { data: plans } = await supabase
      .from("erp_plans")
      .select("id, org_id, name, last_reviewed_at, is_active")
      .eq("is_active", true);

    for (const plan of (plans || [])) {
      const needsReview = !plan.last_reviewed_at ||
        new Date(plan.last_reviewed_at).getTime() < oneYearAgo.getTime();

      if (!needsReview) continue;

      const linkId = `erp_review_${plan.id}`;
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("org_id", plan.org_id)
        .eq("link_id", linkId)
        .limit(1);

      if (existing && existing.length > 0) continue;

      await supabase.from("notifications").insert({
        org_id: plan.org_id,
        type: "erp_plan_review_due",
        title: "ERP Review Due",
        body: `Emergency response plan "${plan.name}" needs annual review`,
        link_tab: "erp",
        link_id: linkId,
        target_roles: ["admin", "safety_manager"],
      });
      notificationsCreated++;
    }

    // Check upcoming ERP drills (within 7 days)
    const { data: drills } = await supabase
      .from("erp_drills")
      .select("id, org_id, erp_plan_id, scheduled_date, status")
      .eq("status", "scheduled");

    for (const drill of (drills || [])) {
      if (!drill.scheduled_date) continue;
      const drillDate = new Date(drill.scheduled_date + "T00:00:00Z");
      const daysUntil = Math.ceil((drillDate.getTime() - now.getTime()) / 86400000);

      if (daysUntil < 0 || daysUntil > 7) continue;

      const linkId = `erp_drill_${drill.id}`;
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("org_id", drill.org_id)
        .eq("link_id", linkId)
        .limit(1);

      if (existing && existing.length > 0) continue;

      await supabase.from("notifications").insert({
        org_id: drill.org_id,
        type: "erp_drill_due",
        title: "ERP Drill Scheduled",
        body: `Emergency drill scheduled in ${daysUntil} day(s)`,
        link_tab: "erp",
        link_id: linkId,
        target_roles: ["admin", "safety_manager"],
      });
      notificationsCreated++;
    }

    return new Response(
      JSON.stringify({ notificationsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
