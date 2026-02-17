// Server-side proxy to aviationweather.gov — avoids CORS restrictions
const AWC = "https://aviationweather.gov/api/data";

export default async function handler(req, res) {
  const { ids, cruiseAlt } = req.query;
  if (!ids) return res.status(400).json({ error: "Missing ids parameter" });

  const headers = { "User-Agent": "PVTAIR-FRAT/1.0" };

  try {
    const [metarRes, tafRes, sigmetRes, gairmetRes] = await Promise.all([
      fetch(`${AWC}/metar?ids=${ids}&format=json`, { headers }),
      fetch(`${AWC}/taf?ids=${ids}&format=json`, { headers }),
      fetch(`${AWC}/airsigmet?format=json&hazard=conv,turb,ice,ifr,mt_obsc`, { headers }),
      fetch(`${AWC}/gairmet?format=json`, { headers }),
    ]);

    const parseBody = async (r) => {
      if (r.status === 204) return [];
      const text = await r.text();
      if (!text || text.trim().length === 0) return [];
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    };

    const metars = await parseBody(metarRes);
    const tafs = await parseBody(tafRes);
    const sigmets = await parseBody(sigmetRes);
    const gairmets = await parseBody(gairmetRes);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=60");
    return res.status(200).json({ metars, tafs, sigmets, gairmets });
  } catch (err) {
    console.error("Weather fetch error:", err);
    return res.status(502).json({ error: "Failed to fetch weather data", detail: err.message });
  }
}
