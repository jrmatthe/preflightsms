// Airport coordinate lookup using aviationweather.gov station info
const AWC = "https://aviationweather.gov/api/data";

// Cache for airport coordinates (persists for server lifetime)
const cache = {};

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
              const coord = { lat: m.lat, lon: m.lon, name: m.name || m.icaoId };
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
