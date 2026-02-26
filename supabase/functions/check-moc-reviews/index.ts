// supabase/functions/check-moc-reviews/index.ts
//
// Supabase Edge Function — runs daily via cron
// Checks MOC items with review_date within 3 days
// Creates moc_review_due notification.
// Ensures notifications fire even if no one is in the app.
//
// SETUP:
// 1. Deploy: supabase functions deploy check-moc-reviews
// 2. Schedule via pg_cron (daily at 07:30 UTC)

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

    // Get MOC items with review dates coming up
    const { data: mocItems } = await supabase
      .from("moc_items")
      .select("id, org_id, title, review_date, status, responsible_id")
      .not("status", "eq", "closed")
      .not("review_date", "is", null);

    if (!mocItems || mocItems.length === 0) {
      return new Response(JSON.stringify({ message: "No MOC items with review dates" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsCreated = 0;

    for (const item of mocItems) {
      const reviewDate = new Date(item.review_date + "T00:00:00Z");
      const daysUntil = Math.ceil((reviewDate.getTime() - now.getTime()) / 86400000);

      // Only notify for reviews within 3 days (including overdue by up to 3 days)
      if (daysUntil > 3 || daysUntil < -3) continue;

      const linkId = `moc_review_${item.id}`;
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("org_id", item.org_id)
        .eq("link_id", linkId)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const body = daysUntil < 0
        ? `Change "${item.title}" review is ${Math.abs(daysUntil)} day(s) overdue`
        : daysUntil === 0
        ? `Change "${item.title}" review is due today`
        : `Change "${item.title}" review due in ${daysUntil} day(s)`;

      await supabase.from("notifications").insert({
        org_id: item.org_id,
        type: "moc_review_due",
        title: "MOC Review Due",
        body,
        link_tab: "moc",
        link_id: linkId,
        target_user_id: item.responsible_id || null,
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
