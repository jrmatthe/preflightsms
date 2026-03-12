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

/** Try multiple field name variants, return first non-empty value */
function pick<T>(obj: any, ...keys: string[]): T | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== null && v !== undefined && v !== "") return v as T;
  }
  return null;
}

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
        let crewMap = new Map<string, string>(); // name → email
        let crewEmailSet = new Set<string>(); // direct email index
        try {
          const crewRes = await fetch(`${FF_BASE}/public/api/crew`, {
            method: "GET",
            headers: ffHeaders,
          });
          if (crewRes.ok) {
            const crewData = await crewRes.json();
            const crewList = Array.isArray(crewData) ? crewData : (crewData.crew || []);
            for (const c of crewList) {
              if (c.username) {
                crewMap.set(c.fullname || c.crewCode || "", c.username);
                crewEmailSet.add(c.username.toLowerCase());
              }
            }
          }
        } catch { /* crew fetch optional */ }

        // Sync aircraft from ForeFlight
        try {
          const acRes = await fetch(`${FF_BASE}/public/api/aircraft`, {
            method: "GET",
            headers: ffHeaders,
          });
          if (acRes.ok) {
            const acData = await acRes.json();
            const acList = Array.isArray(acData) ? acData : (acData.aircraft || []);
            for (const ac of acList) {
              const reg = ac.registration || ac.tailNumber || "";
              if (!reg) continue;
              await supabase
                .from("aircraft")
                .upsert({
                  org_id: config.org_id,
                  registration: reg,
                  type: ac.type || ac.aircraftType || "",
                  updated_at: now.toISOString(),
                }, { onConflict: "org_id,registration" });
            }
          }
        } catch { /* aircraft sync optional */ }

        let syncedCount = 0;

        for (const ff of flights) {
         try {
          const ffId = String(ff.flightId || ff.id || "");
          if (!ffId) continue;

          // Skip flights already linked to a FRAT
          const existingStatus = existingMap.get(ffId);
          if (existingStatus === "frat_created" || existingStatus === "completed") {
            continue;
          }

          // Fetch individual flight details for altitude/fuel data
          let flightDetail: any = null;
          try {
            const detailRes = await fetch(`${FF_BASE}/public/api/Flights/${ffId}`, {
              method: "GET",
              headers: ffHeaders,
            });
            if (detailRes.ok) flightDetail = await detailRes.json();
          } catch { /* detail fetch optional */ }

          // Extract flight data — ForeFlight uses nested flightData object
          const fd = ff.flightData || ff;

          // Try to match pilot by crew name → email → org profile
          const crewList = fd.crew || [];
          const pic = crewList.find((c: any) => c.position === "PIC" || c.role === "PIC");
          // crewId can be a name OR email — only treat as email if it contains @
          const rawCrewId = pic?.crewId || "";
          const crewIdIsEmail = rawCrewId.includes("@");
          const pilotName = pic?.name || pic?.fullname || (!crewIdIsEmail && rawCrewId ? rawCrewId : "") || fd.pilot || "";
          let pilotEmail = (pic?.email || (crewIdIsEmail ? rawCrewId : "") || pic?.username || crewMap.get(pilotName) || "").toLowerCase();

          const matchedPilot = pilotEmail
            ? (profiles || []).find(
                (p: any) => (p.email || "").toLowerCase() === pilotEmail
              )
            : pilotName
            ? (profiles || []).find(
                (p: any) => (p.full_name || "").toLowerCase() === pilotName.toLowerCase()
              )
            : null;

          // If no match yet, try matching any crew email against org profiles
          if (!matchedPilot && crewEmailSet.size > 0) {
            const emailMatch = (profiles || []).find(
              (p: any) => crewEmailSet.has((p.email || "").toLowerCase())
            );
            // Only use if no other pilot was identified
            if (emailMatch && !pilotName) {
              pilotEmail = (emailMatch as any).email || "";
            }
          }

          // Extract enhanced fields using actual ForeFlight field names
          // Passengers: fd.load.passengers is an array, fd.load.people is total headcount
          const loadObj = fd.load || {};
          const paxArray = Array.isArray(loadObj.passengers) ? loadObj.passengers : [];
          const passengerCount = paxArray.length > 0 ? paxArray.length
            : (loadObj.people != null && Array.isArray(fd.crew) ? loadObj.people - fd.crew.length : null);
          const crewCount = Array.isArray(fd.crew) ? fd.crew.length : pick<number>(fd, "crewCount", "numberOfCrew");
          // Fuel: check detail endpoint performance data, then fallback to list data
          const perf = flightDetail?.performance || {};
          const fuelObj = flightDetail?.fuel || {};
          const fuelLbs = perf.totalFuel ?? perf.fuelToDestination ?? fuelObj.taxi
            ?? pick<number>(fd, "fuelLoad", "fuelLbs", "plannedFuel", "fuel");
          // Altitude: detail endpoint puts it in routeToDestination.altitude
          const routeAlt = flightDetail?.routeToDestination?.altitude;
          let cruiseAltRaw: string | number | null = null;
          if (routeAlt?.altitude != null) {
            cruiseAltRaw = routeAlt.unit === "FL" ? `FL${routeAlt.altitude}` : routeAlt.altitude;
          }
          if (cruiseAltRaw == null) {
            cruiseAltRaw = pick<string | number>(fd, "cruisingAltitude", "cruiseAltitude", "altitude");
          }
          const routeRaw = pick<string | string[]>(fd, "route", "routeOfFlight", "plannedRoute");
          const route = Array.isArray(routeRaw) ? routeRaw.join(" ") : routeRaw;
          // ForeFlight uses tripTime (seconds)
          let eteRaw = pick<number>(fd, "tripTime", "estimatedTimeEnroute", "ete", "flightTime");
          // Convert seconds to minutes if value is suspiciously large (>600 = likely seconds)
          const eteMinutes = eteRaw != null ? (eteRaw > 600 ? Math.round(eteRaw / 60) : eteRaw) : null;

          // OOOI times
          const outTime = pick<string>(fd, "outTime", "departureActual", "gateOut");
          const offTime = pick<string>(fd, "offTime", "takeoffTime", "wheelsOff");
          const onTime = pick<string>(fd, "onTime", "landingTime", "wheelsOn");
          const inTime = pick<string>(fd, "inTime", "arrivalActual", "gateIn");

          // Dispatcher/operational metadata
          const dispatcherNotes = pick<string>(fd, "dispatcherNotes", "notes", "comments");
          // Store load/weight data as wb_data (ForeFlight puts W&B info in load object)
          const wbData = loadObj.cargo !== undefined ? loadObj : pick<any>(fd, "weightAndBalance", "wb");

          // Extract departure/arrival times — try many ForeFlight field name variants
          const rawEtd = pick<string>(fd, "departureTime", "scheduledTimeOfDeparture",
            "scheduledDepartureTime", "etd", "departureDate", "departure_time",
            "std", "off_time_scheduled", "depTime");
          const rawEta = pick<string>(fd, "arrivalTime", "scheduledTimeOfArrival",
            "scheduledArrivalTime", "eta", "arrivalDate", "arrival_time",
            "sta", "on_time_scheduled", "arrTime");
          // Also check top-level flight object (outside flightData)
          const etd = rawEtd || pick<string>(ff, "departureTime", "scheduledDepartureTime", "etd") || null;
          const eta = rawEta || pick<string>(ff, "arrivalTime", "scheduledArrivalTime", "eta") || null;

          const record = {
            org_id: config.org_id,
            foreflight_id: ffId,
            departure_icao: fd.departure || fd.departureIcao || fd.origin || pick<string>(ff, "departure", "origin") || "",
            destination_icao: fd.destination || fd.destinationIcao || pick<string>(ff, "destination") || "",
            tail_number: fd.aircraftRegistration || fd.tailNumber || pick<string>(ff, "aircraftRegistration", "tailNumber") || "",
            pilot_name: pilotName,
            pilot_email: pilotEmail || null,
            aircraft_type: fd.aircraftType || fd.callsign || pick<string>(ff, "aircraftType") || "",
            etd,
            eta,
            status: existingStatus || "pending",
            matched_pilot_id: matchedPilot?.id || null,
            raw_data: flightDetail || ff,
            updated_at: now.toISOString(),
            // Enhanced fields
            passenger_count: passengerCount,
            crew_count: crewCount != null ? crewCount : null,
            fuel_lbs: fuelLbs,
            cruise_alt: cruiseAltRaw != null ? String(cruiseAltRaw) : null,
            route: route || null,
            ete_minutes: eteMinutes,
            out_time: outTime || null,
            off_time: offTime || null,
            on_time: onTime || null,
            in_time: inTime || null,
            dispatcher_notes: dispatcherNotes || null,
            wb_data: wbData || null,
          };

          const { error: upsertErr } = await supabase
            .from("foreflight_flights")
            .upsert(record, { onConflict: "org_id,foreflight_id" });

          if (upsertErr) {
            console.log(`[foreflight-sync] Upsert failed: ${upsertErr.message}, retrying with base columns only`);
            // Retry with only the base columns (enhanced columns may not exist)
            const baseRecord = {
              org_id: record.org_id,
              foreflight_id: record.foreflight_id,
              departure_icao: record.departure_icao,
              destination_icao: record.destination_icao,
              tail_number: record.tail_number,
              pilot_name: record.pilot_name,
              pilot_email: record.pilot_email,
              aircraft_type: record.aircraft_type,
              etd: record.etd,
              eta: record.eta,
              status: record.status,
              matched_pilot_id: record.matched_pilot_id,
              raw_data: record.raw_data,
              updated_at: record.updated_at,
            };
            const { error: retryErr } = await supabase
              .from("foreflight_flights")
              .upsert(baseRecord, { onConflict: "org_id,foreflight_id" });
            if (retryErr) {
              console.log(`[foreflight-sync] Base upsert also failed: ${retryErr.message}`);
              continue;
            }
          }

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
         } catch (flightErr: any) {
          console.log(`[foreflight-sync] Error processing flight: ${flightErr.message}`);
         }
        }

        // Remove stale pending flights no longer in ForeFlight
        const activeFfIds = new Set(
          flights.map((ff: any) => String(ff.flightId || ff.id || "")).filter(Boolean)
        );
        const stalePending = (existing || []).filter(
          (e: any) => e.status === "pending" && !activeFfIds.has(e.foreflight_id)
        );
        if (stalePending.length > 0) {
          const staleIds = stalePending.map((e: any) => e.foreflight_id);
          await supabase
            .from("foreflight_flights")
            .delete()
            .eq("org_id", config.org_id)
            .in("foreflight_id", staleIds);
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
