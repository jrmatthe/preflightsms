import SunCalc from "suncalc";

const AWC = "https://aviationweather.gov/api/data";

const headers = { "User-Agent": "PreflightSMS/1.0" };

async function parseBody(r) {
  if (r.status === 204) return [];
  // Guard against non-JSON responses (e.g. HTML error pages from AWC)
  const contentType = r.headers.get("content-type") || "";
  const text = await r.text();
  if (!text || text.trim().length === 0) return [];
  if (!contentType.includes("application/json") && text.trim().startsWith("<")) {
    console.warn("[weather] AWC returned non-JSON response (content-type:", contentType, ")");
    return [];
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function safeFetch(url) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    return parseBody(r);
  } catch { return []; }
}

/**
 * Determine if any portion of the flight occurs during nighttime (civil twilight).
 * Returns { isNight, reason } or null if not enough data.
 */
function computeNightInfo(metars, depTimeZ, arrTimeZ) {
  if (!depTimeZ && !arrTimeZ) return null;
  if (metars.length === 0) return null;

  const depMetar = metars[0];
  const destMetar = metars.length > 1 ? metars[1] : metars[0];
  if (!depMetar.lat || !depMetar.lon) return null;

  const checkTimes = [];
  if (depTimeZ) checkTimes.push({ time: new Date(depTimeZ), lat: depMetar.lat, lon: depMetar.lon, label: "departure" });
  if (arrTimeZ && destMetar.lat && destMetar.lon) checkTimes.push({ time: new Date(arrTimeZ), lat: destMetar.lat, lon: destMetar.lon, label: "arrival" });

  for (const { time, lat, lon, label } of checkTimes) {
    if (isNaN(time.getTime())) continue;
    const times = SunCalc.getTimes(time, lat, lon);
    // Civil twilight: dawn to dusk
    const dawn = times.dawn;
    const dusk = times.dusk;
    if (!dawn || !dusk || isNaN(dawn.getTime()) || isNaN(dusk.getTime())) continue;
    if (time < dawn || time > dusk) {
      return { isNight: true, reason: `${label === "departure" ? "Departure" : "Arrival"} occurs during nighttime (before dawn or after dusk). ` };
    }
  }

  // Also check if flight spans dusk (departs before dusk, arrives after dusk)
  if (depTimeZ && arrTimeZ && depMetar.lat && depMetar.lon) {
    const depTime = new Date(depTimeZ);
    const arrTime = new Date(arrTimeZ);
    if (!isNaN(depTime.getTime()) && !isNaN(arrTime.getTime())) {
      const depSun = SunCalc.getTimes(depTime, depMetar.lat, depMetar.lon);
      if (depSun.dusk && !isNaN(depSun.dusk.getTime())) {
        if (depTime <= depSun.dusk && arrTime >= depSun.dusk) {
          return { isNight: true, reason: "Flight spans civil twilight (dusk occurs during flight). " };
        }
      }
    }
  }

  return { isNight: false };
}

export default async function handler(req, res) {
  const { ids, cruiseAlt, depTimeZ: depTimeParam, arrTimeZ: arrTimeParam } = req.query;
  if (!ids) return res.status(400).json({ error: "Missing ids parameter" });

  const stationIds = ids.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
  const idsParam = stationIds.join(",");

  try {
    // Core: METAR + TAF (always fetch)
    // Extended: station info (runways/elevation), PIREPs, AIRMETs (fetch in parallel, fail gracefully)
    const [metars, tafs, stationInfoArr, pireps, airsigmets] = await Promise.all([
      safeFetch(`${AWC}/metar?ids=${idsParam}&format=json`),
      safeFetch(`${AWC}/taf?ids=${idsParam}&format=json`),
      safeFetch(`${AWC}/stationinfo?ids=${idsParam}&format=json`),
      safeFetch(`${AWC}/pirep?ids=${idsParam}&format=json&distance=100&age=2`),
      safeFetch(`${AWC}/airsigmet?format=json`),
    ]);

    // Build runway and station info maps from stationinfo response
    const runways = {};
    const stationInfo = {};
    for (const s of stationInfoArr) {
      const id = s.icaoId || s.id;
      if (!id) continue;
      stationInfo[id] = { elev: s.elev || s.elevation || 0, lat: s.lat, lon: s.lon };
      if (s.runways && Array.isArray(s.runways)) {
        runways[id] = s.runways.map(r => ({
          id: r.id || "",
          heading: r.alignment != null ? r.alignment : null,
          length_ft: r.length || r.lengthFt || 0,
        }));
      }
    }

    // Compute night info if departure/arrival times provided
    let nightInfo = null;
    if (depTimeParam || arrTimeParam) {
      try {
        nightInfo = computeNightInfo(
          metars,
          depTimeParam ? depTimeParam : null,
          arrTimeParam ? arrTimeParam : null,
        );
      } catch { /* night calc optional */ }
    }

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=60");
    return res.status(200).json({ metars, tafs, pireps, airsigmets, runways, stationInfo, nightInfo });
  } catch (err) {
    console.error("Weather fetch error:", err);
    return res.status(502).json({ error: "Failed to fetch weather data", detail: err.message });
  }
}
