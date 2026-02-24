// supabase/functions/foreflight-sync/index.ts
//
// Syncs scheduled flights from ForeFlight Dispatch into foreflight_flights
// Runs on pg_cron every 5 minutes, or manually triggered from Admin UI
//
// SETUP:
// 1. Deploy: supabase functions deploy foreflight-sync --no-verify-jwt
// 2. pg_cron (run in Supabase SQL editor):
//    SELECT cron.schedule('foreflight-sync', '*/5 * * * *', $$
//      SELECT net.http_post(
//        url:='https://YOUR_PROJECT.supabase.co/functions/v1/foreflight-sync',
//        headers:=jsonb_build_object('Authorization','Bearer YOUR_SERVICE_ROLE_KEY','Content-Type','application/json'),
//        body:='{}'::jsonb
//      );
//    $$);

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

    let body: { orgId?: string; manual?: boolean } = {};
    try { body = await req.json(); } catch { /* empty body from cron */ }

    const now = new Date();
    let totalSynced = 0;
    let orgsProcessed = 0;

    // Get all enabled configs (or just one if manual trigger)
    let query = supabase.from("foreflight_config").select("*").eq("enabled", true);
    if (body.orgId) {
      query = supabase.from("foreflight_config").select("*").eq("org_id", body.orgId);
    }
    const { data: configs } = await query;

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No enabled ForeFlight configs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const config of configs) {
      try {
        // Check sync interval (skip if not manual and synced too recently)
        if (!body.manual && config.last_synced_at) {
          const lastSync = new Date(config.last_synced_at);
          const minutesSince = (now.getTime() - lastSync.getTime()) / 60000;
          if (minutesSince < (config.sync_interval_minutes || 5)) {
            continue;
          }
        }

        if (!config.api_key || !config.api_secret) {
          await supabase
            .from("foreflight_config")
            .update({ last_sync_error: "Missing API credentials" })
            .eq("id", config.id);
          continue;
        }

        const credentials = btoa(`${config.api_key}:${config.api_secret}`);

        // Fetch scheduled flights from ForeFlight
        const res = await fetch(
          "https://dispatch.foreflight.com/api/v1/flights?status=scheduled",
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${credentials}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          await supabase
            .from("foreflight_config")
            .update({
              last_sync_error: `API error ${res.status}: ${errText.slice(0, 200)}`,
              last_synced_at: now.toISOString(),
            })
            .eq("id", config.id);
          continue;
        }

        const data = await res.json();
        const flights = data.flights || data.data || data || [];

        if (!Array.isArray(flights)) {
          await supabase
            .from("foreflight_config")
            .update({
              last_sync_error: "Unexpected API response format",
              last_synced_at: now.toISOString(),
            })
            .eq("id", config.id);
          continue;
        }

        // Get existing FF flights to skip already-processed ones
        const { data: existing } = await supabase
          .from("foreflight_flights")
          .select("foreflight_id, status")
          .eq("org_id", config.org_id);
        const existingMap = new Map(
          (existing || []).map((e) => [e.foreflight_id, e.status])
        );

        // Get org profiles for pilot matching
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("org_id", config.org_id);

        let syncedCount = 0;

        for (const ff of flights) {
          const ffId = String(ff.id || ff.flightId || ff.flight_id);
          if (!ffId) continue;

          // Skip flights already linked to a FRAT
          const existingStatus = existingMap.get(ffId);
          if (existingStatus === "frat_created" || existingStatus === "completed") {
            continue;
          }

          // Match pilot by email (case-insensitive)
          const pilotEmail = (ff.pilot_email || ff.pilotEmail || "").toLowerCase();
          const matchedPilot = pilotEmail
            ? (profiles || []).find(
                (p) => (p.email || "").toLowerCase() === pilotEmail
              )
            : null;

          const record = {
            org_id: config.org_id,
            foreflight_id: ffId,
            departure_icao: ff.departure_icao || ff.departureIcao || ff.origin || "",
            destination_icao: ff.destination_icao || ff.destinationIcao || ff.destination || "",
            tail_number: ff.tail_number || ff.tailNumber || ff.aircraft_registration || "",
            pilot_name: ff.pilot_name || ff.pilotName || ff.pilot || "",
            pilot_email: pilotEmail || null,
            aircraft_type: ff.aircraft_type || ff.aircraftType || "",
            etd: ff.etd || ff.departure_time || ff.departureTime || null,
            eta: ff.eta || ff.arrival_time || ff.arrivalTime || null,
            status: existingStatus || "pending",
            matched_pilot_id: matchedPilot?.id || null,
            raw_data: ff,
            updated_at: now.toISOString(),
          };

          await supabase
            .from("foreflight_flights")
            .upsert(record, { onConflict: "org_id,foreflight_id" });

          syncedCount++;

          // Notify matched pilot if configured
          if (
            config.notify_pilots_on_sync &&
            matchedPilot &&
            !existingMap.has(ffId)
          ) {
            await supabase.from("notifications").insert({
              org_id: config.org_id,
              type: "foreflight_sync",
              title: "ForeFlight Flight Assigned",
              body: `${record.departure_icao} → ${record.destination_icao} ready for FRAT`,
              link_tab: "submit",
              target_user_id: matchedPilot.id,
            });
          }
        }

        totalSynced += syncedCount;
        orgsProcessed++;

        // Update last synced
        await supabase
          .from("foreflight_config")
          .update({
            last_synced_at: now.toISOString(),
            last_sync_error: null,
          })
          .eq("id", config.id);
      } catch (orgErr) {
        console.error(`Sync error for org ${config.org_id}:`, orgErr);
        await supabase
          .from("foreflight_config")
          .update({ last_sync_error: orgErr.message })
          .eq("id", config.id);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Synced ${totalSynced} flights across ${orgsProcessed} org(s)`,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ForeFlight sync error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
