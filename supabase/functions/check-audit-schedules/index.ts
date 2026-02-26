// supabase/functions/check-audit-schedules/index.ts
//
// Supabase Edge Function — runs daily via cron
// Checks audit schedules for upcoming audits (within 7 days)
// Creates audit_due notification for assigned auditor.
//
// SETUP:
// 1. Deploy: supabase functions deploy check-audit-schedules
// 2. Schedule via pg_cron (daily at 06:30 UTC)

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
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    // Get all active audit schedules with upcoming due dates
    const { data: schedules } = await supabase
      .from("audit_schedules")
      .select("*")
      .eq("is_active", true)
      .not("next_due_date", "is", null);

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ message: "No active audit schedules" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsCreated = 0;

    for (const sched of schedules) {
      const dueDate = new Date(sched.next_due_date + "T00:00:00Z");
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

      if (daysUntil < 0 || daysUntil > 7) continue;

      const orgId = sched.org_id;
      const linkId = `audit_schedule_${sched.id}`;

      // Check if notification already exists
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("org_id", orgId)
        .eq("link_id", linkId)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const notifType = daysUntil < 0 ? "audit_overdue" : "audit_due";
      const title = daysUntil < 0 ? "Audit Overdue" : "Audit Due Soon";
      const body = daysUntil < 0
        ? `Scheduled audit is ${Math.abs(daysUntil)} day(s) overdue`
        : `Scheduled audit due in ${daysUntil} day(s)`;

      await supabase.from("notifications").insert({
        org_id: orgId,
        type: notifType,
        title,
        body,
        link_tab: "audits",
        link_id: linkId,
        target_user_id: sched.assigned_to || null,
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
