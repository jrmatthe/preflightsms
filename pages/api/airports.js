// Airport coordinate lookup using aviationweather.gov station info
import { find } from "geo-tz";

const AWC = "https://aviationweather.gov/api/data";

// Cache for airport coordinates (persists for server lifetime)
const cache = {};

function getTimezoneAbbr(tz) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" });
    const parts = fmt.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === "timeZoneName");
    if (!tzPart) return "";
    const s = tzPart.value;
    // Normalize to generic abbreviations: PST/PDT→PT, MST/MDT→MT, CST/CDT→CT, EST/EDT→ET
    if (/^P[SD]T$/.test(s)) return "PT";
    if (/^M[SD]T$/.test(s)) return "MT";
    if (/^C[SD]T$/.test(s)) return "CT";
    if (/^E[SD]T$/.test(s)) return "ET";
    if (/^AK[SD]T$/.test(s)) return "AKT";
    if (/^H[SD]T$/.test(s)) return "HT";
    return s;
  } catch { return ""; }
}

export default async function handler(req, res) {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ error: "Missing ids" });

  const icaos = ids.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
  const results = {};
  const uncached = [];

  for (const id of icaos) {
    if (cache[id]) results[id] = cache[id];
    else uncached.push(id);
  }

  if (uncached.length > 0) {
    try {
      // Fetch METAR for uncached airports - includes lat/lon
      const r = await fetch(`${AWC}/metar?ids=${uncached.join(",")}&format=json`, {
        headers: { "User-Agent": "PreflightSMS/1.0" }
      });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) {
          for (const m of data) {
            if (m.icaoId && m.lat && m.lon) {
              const tzResult = find(m.lat, m.lon);
              const tz = tzResult && tzResult.length > 0 ? tzResult[0] : "America/Los_Angeles";
              const coord = { lat: m.lat, lon: m.lon, name: m.name || m.icaoId, tz, tzAbbr: getTimezoneAbbr(tz) };
              cache[m.icaoId.toUpperCase()] = coord;
              results[m.icaoId.toUpperCase()] = coord;
            }
          }
        }
      }
    } catch (e) {
      console.error("Airport lookup error:", e);
    }
  }

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=3600");
  return res.status(200).json(results);
}
