// supabase/functions/check-training/index.ts
//
// Supabase Edge Function — runs daily via cron
// Checks training requirements expiring within 30 days
// Creates training_expiring notifications for affected users.
//
// SETUP:
// 1. Deploy: supabase functions deploy check-training
// 2. Schedule via pg_cron (daily at 06:00 UTC)

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
    const in30Days = new Date(now.getTime() + 30 * 86400000);

    // Get all orgs
    const { data: orgs } = await supabase.from("organizations").select("id, name");
    if (!orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ message: "No orgs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsCreated = 0;

    for (const org of orgs) {
      // Get training requirements for this org
      const { data: requirements } = await supabase
        .from("training_requirements")
        .select("*")
        .eq("org_id", org.id);

      if (!requirements || requirements.length === 0) continue;

      // Get all training records for this org
      const { data: records } = await supabase
        .from("training_records")
        .select("*")
        .eq("org_id", org.id);

      // Get all profiles in this org
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("org_id", org.id);

      if (!profiles || profiles.length === 0) continue;

      for (const req of requirements) {
        const frequencyMs = (req.frequency_months || 12) * 30 * 86400000;
        const requiredRoles = req.required_for || ["pilot"];

        for (const profile of profiles) {
          if (!requiredRoles.includes(profile.role)) continue;

          // Find most recent record for this user + requirement
          const userRecords = (records || [])
            .filter(r => r.user_id === profile.id && r.requirement_id === req.id)
            .sort((a, b) => new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime());

          const latestRecord = userRecords[0];
          if (!latestRecord) continue; // No record = hasn't done it yet (handled separately)

          const expiresAt = new Date(new Date(latestRecord.completed_date).getTime() + frequencyMs);

          if (expiresAt > now && expiresAt <= in30Days) {
            const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
            const linkId = `training_${req.id}_${profile.id}`;

            // Check if notification already exists
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("org_id", org.id)
              .eq("link_id", linkId)
              .limit(1);

            if (existing && existing.length > 0) continue;

            await supabase.from("notifications").insert({
              org_id: org.id,
              type: "training_expiring",
              title: "Training Expiring Soon",
              body: `${profile.full_name || "A team member"}'s "${req.title}" training expires in ${daysUntil} day(s)`,
              link_tab: "cbt",
              link_id: linkId,
              target_user_id: profile.id,
              target_roles: ["admin", "safety_manager"],
            });
            notificationsCreated++;
          }
        }
      }
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
