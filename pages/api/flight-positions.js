// /api/flight-positions — ADS-B live position fetcher
// Polls ADS-B providers for active flight positions, caches in DB.
// First request per 15s window triggers external fetch; subsequent requests return cache.

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";
import { hasFeature } from "../../lib/tiers";
import { nNumberToIcao24 } from "../../lib/icao24";
import { fetchFromProviders } from "../../lib/adsbProviders";

const CACHE_TTL_MS = 15000; // 15 seconds
const AUTO_ARRIVE_RADIUS_NM = 5;

// Haversine distance in nautical miles
function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Earth radius in nm
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get user's org
  const { data: profile } = await supabase
    .from("profiles").select("org_id").eq("id", user.id).single();
  if (!profile?.org_id) return res.status(403).json({ error: "No organization" });

  const orgId = profile.org_id;

  // Feature gate check
  const { data: org } = await supabase
    .from("organizations").select("id, tier, feature_flags").eq("id", orgId).single();
  if (!hasFeature(org, "adsb_tracking")) {
    return res.status(200).json({ feature_disabled: true, positions: [] });
  }

  // Check cache freshness — get most recent position for this org
  const { data: latestPos } = await supabase
    .from("flight_positions")
    .select("fetched_at")
    .eq("org_id", orgId)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  const cacheAge = latestPos?.fetched_at
    ? Date.now() - new Date(latestPos.fetched_at).getTime()
    : Infinity;

  if (cacheAge < CACHE_TTL_MS) {
    // Return cached positions for this org
    const { data: cached } = await supabase
      .from("flight_positions")
      .select("*")
      .eq("org_id", orgId);
    return res.status(200).json({ positions: cached || [], cached: true });
  }

  // Fetch ALL active flights across ALL orgs (batch efficiency)
  const { data: activeFlights, error: flightErr } = await supabase
    .from("flights")
    .select("id, org_id, tail_number, destination")
    .eq("status", "ACTIVE");

  if (flightErr) {
    console.error("[flight-positions] Flight query error:", flightErr.message);
    return res.status(500).json({ error: "Failed to fetch flights" });
  }

  if (!activeFlights || activeFlights.length === 0) {
    return res.status(200).json({ positions: [], cached: false });
  }

  // Resolve tail numbers → ICAO24 hex
  const tailNumbers = [...new Set(activeFlights.map(f => f.tail_number).filter(Boolean))];
  const orgIds = [...new Set(activeFlights.map(f => f.org_id))];

  // Check aircraft table for cached ICAO24 values
  const { data: aircraftRows } = await supabase
    .from("aircraft")
    .select("registration, icao24_hex, org_id")
    .in("org_id", orgIds)
    .in("registration", tailNumbers);

  const icaoCache = {};
  const toBackfill = [];
  for (const ac of (aircraftRows || [])) {
    if (ac.icao24_hex) {
      icaoCache[ac.registration] = ac.icao24_hex;
    } else {
      const hex = nNumberToIcao24(ac.registration);
      if (hex) {
        icaoCache[ac.registration] = hex;
        toBackfill.push({ registration: ac.registration, orgId: ac.org_id, hex });
      }
    }
  }

  // For tail numbers not in aircraft table, compute directly
  for (const tail of tailNumbers) {
    if (!icaoCache[tail]) {
      const hex = nNumberToIcao24(tail);
      if (hex) icaoCache[tail] = hex;
    }
  }

  // Backfill ICAO24 hex to aircraft table (fire and forget)
  if (toBackfill.length > 0) {
    for (const { registration, orgId: acOrgId, hex } of toBackfill) {
      supabase.from("aircraft")
        .update({ icao24_hex: hex })
        .eq("org_id", acOrgId)
        .eq("registration", registration)
        .then(() => {});
    }
  }

  // Build flight→ICAO24 mapping
  const flightIcaoMap = new Map();
  const uniqueIcaos = new Set();
  for (const flight of activeFlights) {
    const icao = icaoCache[flight.tail_number];
    if (icao) {
      flightIcaoMap.set(flight.id, { icao, flight });
      uniqueIcaos.add(icao);
    }
  }

  if (uniqueIcaos.size === 0) {
    return res.status(200).json({ positions: [], cached: false, reason: "no_icao24_resolved" });
  }

  // Fetch from ADS-B providers
  const { positions, provider, healthEntry } = await fetchFromProviders([...uniqueIcaos]);

  // Log health entry
  if (healthEntry) {
    supabase.from("adsb_provider_health").insert(healthEntry).then(() => {});
  }

  // Upsert positions and handle auto-arrival
  const now = new Date().toISOString();
  const upsertRows = [];
  const autoArriveIds = [];

  for (const [flightId, { icao, flight }] of flightIcaoMap) {
    const pos = positions.get(icao);
    if (!pos) continue;

    upsertRows.push({
      flight_id: flightId,
      org_id: flight.org_id,
      icao24: icao,
      latitude: pos.lat,
      longitude: pos.lon,
      altitude_baro: pos.altBaro,
      altitude_geo: pos.altGeo,
      ground_speed: pos.groundSpeed,
      track: pos.track,
      vertical_rate: pos.verticalRate,
      on_ground: pos.onGround || false,
      squawk: pos.squawk,
      source: provider,
      raw_data: pos.raw,
      fetched_at: now,
    });

    // Auto-arrival check: on_ground near destination
    if (pos.onGround && flight.destination) {
      // We'll check distance after fetching airport coords
      autoArriveIds.push({ flightId, flight, pos });
    }
  }

  // Upsert positions (conflict on flight_id unique constraint)
  if (upsertRows.length > 0) {
    const { error: upsertErr } = await supabase
      .from("flight_positions")
      .upsert(upsertRows, { onConflict: "flight_id" });
    if (upsertErr) {
      console.error("[flight-positions] Upsert error:", upsertErr.message);
    }
  }

  // Auto-arrival: check if on-ground aircraft are near destination
  if (autoArriveIds.length > 0) {
    const destIds = [...new Set(autoArriveIds.map(a => a.flight.destination).filter(Boolean))];
    if (destIds.length > 0) {
      try {
        // Fetch destination coordinates from our airports API
        const airportRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`}/api/airports?ids=${destIds.join(",")}`,
        );
        const airportData = airportRes.ok ? await airportRes.json() : {};

        for (const { flightId, flight, pos } of autoArriveIds) {
          const destCoord = airportData[flight.destination];
          if (!destCoord) continue;
          const dist = haversineNm(pos.lat, pos.lon, destCoord.lat, destCoord.lon);
          if (dist <= AUTO_ARRIVE_RADIUS_NM) {
            await supabase.from("flights").update({
              status: "ARRIVED",
              arrived_at: now,
            }).eq("id", flightId);
            console.log(`[flight-positions] Auto-arrived flight ${flightId} (${dist.toFixed(1)}nm from ${flight.destination})`);
          }
        }
      } catch (err) {
        console.error("[flight-positions] Auto-arrival check failed:", err.message);
      }
    }
  }

  // Return positions for requesting org only
  const { data: orgPositions } = await supabase
    .from("flight_positions")
    .select("*")
    .eq("org_id", orgId);

  return res.status(200).json({
    positions: orgPositions || [],
    cached: false,
    provider,
    tracked: uniqueIcaos.size,
    found: positions.size,
  });
}
