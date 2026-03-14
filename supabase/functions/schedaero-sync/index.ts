// supabase/functions/schedaero-sync/index.ts
//
// Syncs scheduled trips from Schedaero into schedaero_trips
// Runs on pg_cron every 5 minutes, or manually triggered from Admin UI
//
// SETUP:
// 1. Deploy: supabase functions deploy schedaero-sync --no-verify-jwt
// 2. pg_cron (run in Supabase SQL editor):
//    SELECT cron.schedule('schedaero-sync', '*/5 * * * *', $$
//      SELECT net.http_post(
//        url:='https://YOUR_PROJECT.supabase.co/functions/v1/schedaero-sync',
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
    let query = supabase.from("schedaero_config").select("*").eq("enabled", true);
    if (body.orgId) {
      query = supabase.from("schedaero_config").select("*").eq("org_id", body.orgId);
    }
    const { data: configs } = await query;

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No enabled Schedaero configs found" }),
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
            .from("schedaero_config")
            .update({ last_sync_error: "Missing API key" })
            .eq("id", config.id);
          continue;
        }

        // Fetch scheduled trips from Schedaero using sync window
        const windowHours = config.sync_window_hours || 24;
        const fromDate = now.toISOString();
        const toDate = new Date(now.getTime() + windowHours * 3600000).toISOString();

        const res = await fetch(
          `https://api.schedaero.com/v1/trips?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${config.api_key}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          await supabase
            .from("schedaero_config")
            .update({
              last_sync_error: `API error ${res.status}: ${errText.slice(0, 200)}`,
              last_synced_at: now.toISOString(),
            })
            .eq("id", config.id);
          continue;
        }

        const data = await res.json();
        const trips = data.trips || data.data || data || [];

        if (!Array.isArray(trips)) {
          await supabase
            .from("schedaero_config")
            .update({
              last_sync_error: "Unexpected API response format",
              last_synced_at: now.toISOString(),
            })
            .eq("id", config.id);
          continue;
        }

        // Get existing Schedaero trips to skip already-processed ones
        const { data: existing } = await supabase
          .from("schedaero_trips")
          .select("schedaero_trip_id, status")
          .eq("org_id", config.org_id);
        const existingMap = new Map(
          (existing || []).map((e: any) => [e.schedaero_trip_id, e.status])
        );

        // Get org profiles for pilot matching (by full_name, case-insensitive)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("org_id", config.org_id);

        // Get existing ForeFlight flights for conflict detection
        const { data: ffFlights } = await supabase
          .from("foreflight_flights")
          .select("tail_number, departure_icao, destination_icao, etd, status")
          .eq("org_id", config.org_id)
          .in("status", ["pending", "frat_created"]);

        let syncedCount = 0;
        let updatedCount = 0;
        let duplicateCount = 0;

        for (const trip of trips) {
          const tripId = String(trip.tripId || trip.trip_id || trip.id || "");
          if (!tripId) continue;

          // Only sync trips that have been released in SchedAero
          // SchedAero status values: draft, tentative, confirmed/released, cancelled
          const tripStatus = (trip.status || trip.tripStatus || trip.legStatus || "").toLowerCase();
          if (tripStatus && tripStatus !== "released" && tripStatus !== "confirmed" && tripStatus !== "active" && tripStatus !== "dispatched") {
            continue;
          }

          // Skip trips already linked to a FRAT
          const existingStatus = existingMap.get(tripId);
          if (existingStatus === "frat_created" || existingStatus === "completed") {
            continue;
          }

          // Extract leg data (use first leg if multiple)
          const leg = trip.legs?.[0] || trip;
          const departureIcao = leg.departureAirport || leg.departure_icao || leg.origin || "";
          const destinationIcao = leg.arrivalAirport || leg.destination_icao || leg.destination || "";
          const tailNumber = trip.tailNumber || trip.tail_number || trip.aircraft_registration || "";
          const pilotName = trip.pilotName || trip.pilot_name || trip.pilot || "";
          const aircraftType = trip.aircraftType || trip.aircraft_type || "";
          const passengerCount = trip.passengerCount || trip.passenger_count || trip.pax || 0;
          const tripNumber = trip.tripNumber || trip.trip_number || "";
          const etd = leg.departureTime || leg.etd || trip.etd || null;
          const eta = leg.arrivalTime || leg.eta || trip.eta || null;

          // Match pilot by full_name (case-insensitive)
          const pilotNameLower = pilotName.toLowerCase();
          const matchedPilot = pilotNameLower
            ? (profiles || []).find(
                (p: any) => (p.full_name || "").toLowerCase() === pilotNameLower
              )
            : null;

          // Conflict detection: check ForeFlight flights for duplicate
          let status = existingStatus || "pending";
          if (status === "pending" && ffFlights && ffFlights.length > 0) {
            const isDuplicate = ffFlights.some((ff: any) => {
              if (ff.tail_number !== tailNumber) return false;
              if (ff.departure_icao !== departureIcao) return false;
              if (ff.destination_icao !== destinationIcao) return false;
              if (!ff.etd || !etd) return false;
              const ffEtd = new Date(ff.etd).getTime();
              const scEtd = new Date(etd).getTime();
              return Math.abs(ffEtd - scEtd) < 30 * 60000; // within 30 minutes
            });
            if (isDuplicate) {
              status = "duplicate";
              duplicateCount++;
            }
          }

          const record: any = {
            org_id: config.org_id,
            schedaero_trip_id: tripId,
            trip_number: tripNumber,
            departure_icao: departureIcao,
            destination_icao: destinationIcao,
            tail_number: tailNumber,
            pilot_name: pilotName,
            aircraft_type: aircraftType,
            passenger_count: passengerCount,
            etd: etd || null,
            eta: eta || null,
            status,
            matched_pilot_id: matchedPilot?.id || null,
            raw_data: trip,
            updated_at: now.toISOString(),
          };

          await supabase
            .from("schedaero_trips")
            .upsert(record, { onConflict: "org_id,schedaero_trip_id" });

          if (existingMap.has(tripId)) {
            updatedCount++;
          } else {
            syncedCount++;
          }

          // Notify matched pilot if configured and trip is new (deduplicate via link_id)
          if (
            config.notify_pilots_on_sync &&
            matchedPilot &&
            !existingMap.has(tripId) &&
            status === "pending"
          ) {
            const notifLinkId = `sc_assigned_${tripId}`;
            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("org_id", config.org_id)
              .eq("link_id", notifLinkId)
              .limit(1);
            if (!existingNotif || existingNotif.length === 0) {
              await supabase.from("notifications").insert({
                org_id: config.org_id,
                type: "schedaero_sync",
                title: "Schedaero Trip Assigned",
                body: `${record.departure_icao} → ${record.destination_icao} ready for FRAT`,
                link_tab: "submit",
                link_id: notifLinkId,
                target_user_id: matchedPilot.id,
              });
            }
          }
        }

        totalSynced += syncedCount;
        orgsProcessed++;

        // Update sync log (keep last 10 entries)
        const syncLog = Array.isArray(config.sync_log) ? config.sync_log : [];
        const logEntry = {
          timestamp: now.toISOString(),
          synced: syncedCount,
          updated: updatedCount,
          duplicates: duplicateCount,
        };
        const updatedLog = [logEntry, ...syncLog].slice(0, 10);

        // Update last synced
        await supabase
          .from("schedaero_config")
          .update({
            last_synced_at: now.toISOString(),
            last_sync_error: null,
            sync_log: updatedLog,
          })
          .eq("id", config.id);
      } catch (orgErr: any) {
        console.error(`Sync error for org ${config.org_id}:`, orgErr);
        await supabase
          .from("schedaero_config")
          .update({ last_sync_error: orgErr.message })
          .eq("id", config.id);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Synced ${totalSynced} trips across ${orgsProcessed} org(s)`,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Schedaero sync error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
