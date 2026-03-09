// ADS-B provider — ADS-B Exchange (paid, requires ADSBX_API_KEY)
// Docs: https://www.adsbexchange.com/version-2-api-wip/
// Auth: api-auth header with UUID API key
// Response uses readsb JSON format (same field names as adsb.lol)

const ADSBX_BASE = "https://adsbexchange.com/api/aircraft/icao";

function parseAircraft(ac) {
  if (!ac || ac.lat == null || ac.lon == null) return null;
  return {
    lat: ac.lat,
    lon: ac.lon,
    altBaro: ac.alt_baro != null && ac.alt_baro !== "ground" ? Number(ac.alt_baro) : null,
    altGeo: ac.alt_geom != null ? Number(ac.alt_geom) : null,
    groundSpeed: ac.gs != null ? Number(ac.gs) : null,
    track: ac.track != null ? Number(ac.track) : null,
    verticalRate: ac.baro_rate != null ? Number(ac.baro_rate) : null,
    onGround: ac.alt_baro === "ground" || !!ac.on_ground,
    squawk: ac.squawk || null,
    raw: ac,
  };
}

/**
 * Fetch positions for a list of ICAO24 hex addresses from ADS-B Exchange.
 * Returns { positions: Map<icao24, positionData>, provider: string, healthEntry: object }
 */
export async function fetchFromProviders(icao24List) {
  if (!icao24List || icao24List.length === 0) {
    return { positions: new Map(), provider: null, healthEntry: null };
  }

  const apiKey = process.env.ADSBX_API_KEY;
  if (!apiKey) {
    console.error("[adsb] ADSBX_API_KEY not configured");
    return {
      positions: new Map(),
      provider: "adsbexchange",
      healthEntry: {
        provider: "adsbexchange",
        success: false,
        response_time_ms: 0,
        error_message: "ADSBX_API_KEY not configured",
        icao24s_queried: icao24List.length,
        icao24s_found: 0,
      },
    };
  }

  const startMs = Date.now();
  const results = new Map();

  try {
    const fetches = icao24List.map(async (icao) => {
      const url = `${ADSBX_BASE}/${icao}/`;
      const res = await fetch(url, {
        headers: { "api-auth": apiKey },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return;
      const data = await res.json();
      // Response has 'ac' array (readsb format)
      const ac = data?.ac?.[0];
      const parsed = parseAircraft(ac);
      if (parsed) results.set(icao, parsed);
    });
    await Promise.allSettled(fetches);

    const elapsed = Date.now() - startMs;
    return {
      positions: results,
      provider: "adsbexchange",
      healthEntry: {
        provider: "adsbexchange",
        success: true,
        response_time_ms: elapsed,
        error_message: null,
        icao24s_queried: icao24List.length,
        icao24s_found: results.size,
      },
    };
  } catch (err) {
    const elapsed = Date.now() - startMs;
    console.error("[adsb] ADS-B Exchange error:", err.message);
    return {
      positions: new Map(),
      provider: "adsbexchange",
      healthEntry: {
        provider: "adsbexchange",
        success: false,
        response_time_ms: elapsed,
        error_message: err.message || "Unknown error",
        icao24s_queried: icao24List.length,
        icao24s_found: 0,
      },
    };
  }
}
