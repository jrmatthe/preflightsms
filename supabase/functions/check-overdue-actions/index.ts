// supabase/functions/check-overdue-actions/index.ts
//
// Supabase Edge Function — runs daily via cron
// Checks corrective actions: marks overdue, creates notifications
// for action_overdue and action_due_soon.
//
// SETUP:
// 1. Deploy: supabase functions deploy check-overdue-actions
// 2. Schedule via pg_cron (daily at 07:00 UTC)

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
    const in3Days = new Date(now.getTime() + 3 * 86400000);

    // Get all open corrective actions with due dates
    const { data: actions } = await supabase
      .from("corrective_actions")
      .select("*")
      .not("status", "in", '("completed","closed")')
      .not("due_date", "is", null);

    if (!actions || actions.length === 0) {
      return new Response(JSON.stringify({ message: "No open actions with due dates" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let overdueCount = 0;
    let dueSoonCount = 0;

    for (const action of actions) {
      const dueDate = new Date(action.due_date + "T23:59:59Z");
      const orgId = action.org_id;
      const linkId = `action_${action.id}`;

      if (dueDate < now) {
        // Mark as overdue
        if (!action.is_overdue) {
          await supabase
            .from("corrective_actions")
            .update({ is_overdue: true, updated_at: now.toISOString() })
            .eq("id", action.id);
        }

        // Check if notification already exists
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("org_id", orgId)
          .eq("link_id", `${linkId}_overdue`)
          .limit(1);

        if (!existing || existing.length === 0) {
          const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / 86400000);
          await supabase.from("notifications").insert({
            org_id: orgId,
            type: "action_overdue",
            title: "Corrective Action Overdue",
            body: `"${action.title}" is ${daysOverdue} day(s) overdue`,
            link_tab: "actions",
            link_id: `${linkId}_overdue`,
            target_user_id: action.assigned_to || null,
            target_roles: ["admin", "safety_manager"],
          });
          overdueCount++;
        }
      } else if (dueDate <= in3Days) {
        // Due soon — check if notification exists
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("org_id", orgId)
          .eq("link_id", `${linkId}_due_soon`)
          .limit(1);

        if (!existing || existing.length === 0) {
          const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
          await supabase.from("notifications").insert({
            org_id: orgId,
            type: "action_due_soon",
            title: "Action Due Soon",
            body: `"${action.title}" is due in ${daysUntil} day(s)`,
            link_tab: "actions",
            link_id: `${linkId}_due_soon`,
            target_user_id: action.assigned_to || null,
            target_roles: ["admin", "safety_manager"],
          });
          dueSoonCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ overdueCount, dueSoonCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
