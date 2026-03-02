// ADS-B provider abstraction with auto-failover
// Primary: adsb.lol (free, no auth required)
// Fallback: OpenSky Network (free, no auth required for anonymous)

const PROVIDERS = {
  "adsb.lol": {
    name: "adsb.lol",
    async fetchPositions(icao24List) {
      const results = new Map();
      const fetches = icao24List.map(async (icao) => {
        const url = `https://api.adsb.lol/v2/hex/${icao}/`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = await res.json();
        const ac = data?.ac?.[0];
        if (!ac || ac.lat == null || ac.lon == null) return;
        results.set(icao, {
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
        });
      });
      await Promise.allSettled(fetches);
      return results;
    },
  },
  opensky: {
    name: "opensky",
    async fetchPositions(icao24List) {
      const results = new Map();
      // OpenSky supports batch queries with multiple icao24 params
      const params = icao24List.map((h) => `icao24=${h}`).join("&");
      const url = `https://opensky-network.org/api/states/all?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return results;
      const data = await res.json();
      if (!data?.states) return results;
      // OpenSky state vector indices:
      // 0=icao24, 1=callsign, 2=origin_country, 3=time_position, 4=last_contact
      // 5=longitude, 6=latitude, 7=baro_altitude(m), 8=on_ground, 9=velocity(m/s)
      // 10=true_track(deg), 11=vertical_rate(m/s), 12=sensors, 13=geo_altitude(m), 14=squawk
      for (const s of data.states) {
        const icao = s[0];
        if (s[6] == null || s[5] == null) continue;
        results.set(icao, {
          lat: s[6],
          lon: s[5],
          altBaro: s[7] != null ? Math.round(s[7] * 3.28084) : null, // meters → feet
          altGeo: s[13] != null ? Math.round(s[13] * 3.28084) : null,
          groundSpeed: s[9] != null ? Math.round(s[9] * 1.94384) : null, // m/s → knots
          track: s[10] != null ? Number(s[10]) : null,
          verticalRate: s[11] != null ? Math.round(s[11] * 196.85) : null, // m/s → fpm
          onGround: !!s[8],
          squawk: s[14] || null,
          raw: s,
        });
      }
      return results;
    },
  },
};

const PROVIDER_ORDER = ["adsb.lol", "opensky"];
const MAX_CONSECUTIVE_FAILURES = 3;

// Module-level state for failover tracking
let consecutiveFailures = {};
let activeProviderIndex = 0;

function resetFailures(providerName) {
  consecutiveFailures[providerName] = 0;
}

function recordFailure(providerName) {
  consecutiveFailures[providerName] = (consecutiveFailures[providerName] || 0) + 1;
}

/**
 * Fetch positions for a list of ICAO24 hex addresses.
 * Auto-fails over to fallback provider after MAX_CONSECUTIVE_FAILURES.
 * Returns { positions: Map<icao24, positionData>, provider: string, healthEntry: object }
 */
export async function fetchFromProviders(icao24List) {
  if (!icao24List || icao24List.length === 0) {
    return { positions: new Map(), provider: null, healthEntry: null };
  }

  // Determine which provider to try first
  const startIndex = activeProviderIndex;
  const providersToTry = [
    PROVIDER_ORDER[startIndex],
    PROVIDER_ORDER[(startIndex + 1) % PROVIDER_ORDER.length],
  ];

  for (const providerName of providersToTry) {
    const provider = PROVIDERS[providerName];
    if (!provider) continue;

    const startMs = Date.now();
    try {
      const positions = await provider.fetchPositions(icao24List);
      const elapsed = Date.now() - startMs;

      resetFailures(providerName);
      // If we had failed over, switch back on success
      if (providerName === PROVIDER_ORDER[0]) {
        activeProviderIndex = 0;
      }

      return {
        positions,
        provider: providerName,
        healthEntry: {
          provider: providerName,
          success: true,
          response_time_ms: elapsed,
          error_message: null,
          icao24s_queried: icao24List.length,
          icao24s_found: positions.size,
        },
      };
    } catch (err) {
      const elapsed = Date.now() - startMs;
      recordFailure(providerName);

      // If primary has too many failures, switch to fallback
      if (
        providerName === PROVIDER_ORDER[0] &&
        (consecutiveFailures[providerName] || 0) >= MAX_CONSECUTIVE_FAILURES
      ) {
        activeProviderIndex = 1;
        console.warn(`[adsb] Switching to fallback provider after ${MAX_CONSECUTIVE_FAILURES} failures on ${providerName}`);
      }

      // If this was the last provider, return the error
      if (providerName === providersToTry[providersToTry.length - 1]) {
        return {
          positions: new Map(),
          provider: providerName,
          healthEntry: {
            provider: providerName,
            success: false,
            response_time_ms: elapsed,
            error_message: err.message || "Unknown error",
            icao24s_queried: icao24List.length,
            icao24s_found: 0,
          },
        };
      }
      // Otherwise, try the next provider
      console.warn(`[adsb] ${providerName} failed: ${err.message}, trying fallback...`);
    }
  }

  return { positions: new Map(), provider: null, healthEntry: null };
}
