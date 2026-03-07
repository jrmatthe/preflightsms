// supabase/functions/foreflight-sync/index.ts
//
// Syncs flights from ForeFlight Dispatch into foreflight_flights
// Runs on pg_cron every 5 minutes, or manually triggered from Admin UI
//
// SETUP:
// 1. Deploy: supabase functions deploy foreflight-sync --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FF_BASE = "https://public-api.foreflight.com";
const FF_VENDOR_ID = "1b600c49-584c-4f60-b40c-10aa8bd34ecd";

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

        if (!config.api_key) {
          await supabase
            .from("foreflight_config")
            .update({ last_sync_error: "Missing API key" })
            .eq("id", config.id);
          continue;
        }

        const ffHeaders = {
          "x-api-key": config.api_key,
          "x-vendorId": FF_VENDOR_ID,
          Accept: "application/json",
        };

        // Fetch flights from ForeFlight
        const res = await fetch(`${FF_BASE}/public/api/Flights/flights`, {
          method: "GET",
          headers: ffHeaders,
        });

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
        // Response may be an array or { flights: [...] }
        const flights = Array.isArray(data) ? data : (data.flights || data.data || []);

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
          (existing || []).map((e: any) => [e.foreflight_id, e.status])
        );

        // Get org profiles for pilot matching
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("org_id", config.org_id);

        // Fetch crew from ForeFlight for email matching
        let crewMap = new Map<string, string>();
        try {
          const crewRes = await fetch(`${FF_BASE}/public/api/crew`, {
            method: "GET",
            headers: ffHeaders,
          });
          if (crewRes.ok) {
            const crewData = await crewRes.json();
            const crewList = Array.isArray(crewData) ? crewData : (crewData.crew || []);
            for (const c of crewList) {
              if (c.username) crewMap.set(c.fullname || c.crewCode || "", c.username);
            }
          }
        } catch { /* crew fetch optional */ }

        let syncedCount = 0;

        for (const ff of flights) {
          const ffId = String(ff.flightId || ff.id || "");
          if (!ffId) continue;

          // Skip flights already linked to a FRAT
          const existingStatus = existingMap.get(ffId);
          if (existingStatus === "frat_created" || existingStatus === "completed") {
            continue;
          }

          // Extract flight data — ForeFlight uses nested flightData object
          const fd = ff.flightData || ff;

          // Try to match pilot by crew name → email → org profile
          const crewList = fd.crew || [];
          const pic = crewList.find((c: any) => c.position === "PIC" || c.role === "PIC");
          const pilotName = pic?.name || pic?.fullname || fd.pilot || "";
          const pilotEmail = (pic?.email || crewMap.get(pilotName) || "").toLowerCase();

          const matchedPilot = pilotEmail
            ? (profiles || []).find(
                (p: any) => (p.email || "").toLowerCase() === pilotEmail
              )
            : pilotName
            ? (profiles || []).find(
                (p: any) => (p.full_name || "").toLowerCase() === pilotName.toLowerCase()
              )
            : null;

          const record = {
            org_id: config.org_id,
            foreflight_id: ffId,
            departure_icao: fd.departure || fd.departureIcao || fd.origin || "",
            destination_icao: fd.destination || fd.destinationIcao || "",
            tail_number: fd.aircraftRegistration || fd.tailNumber || "",
            pilot_name: pilotName,
            pilot_email: pilotEmail || null,
            aircraft_type: fd.aircraftType || fd.callsign || "",
            etd: fd.scheduledTimeOfDeparture || fd.etd || null,
            eta: fd.scheduledTimeOfArrival || fd.eta || null,
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
      } catch (orgErr: any) {
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
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
