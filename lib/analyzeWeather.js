// lib/analyzeWeather.js
// Shared weather analysis engine used by both desktop (pages/index.js)
// and mobile (MobileFRATWizard.js) FRAT forms.

// ── Helpers ──────────────────────────────────────────────────────

export function getCeiling(clouds) {
  if (!clouds || !Array.isArray(clouds)) return 99999;
  for (const c of clouds) {
    if ((c.cover === "BKN" || c.cover === "OVC") && c.base != null) return c.base;
  }
  return 99999;
}

export function parseCruiseAlt(val) {
  if (!val) return 0;
  const s = val.toString().trim().toUpperCase();
  if (s.startsWith("FL")) return parseInt(s.slice(2), 10) * 100;
  return parseInt(s, 10) || 0;
}

export function parseETE(ete) {
  if (!ete) return 0;
  const s = ete.trim();
  if (s.includes(":") || s.includes("+")) {
    const parts = s.split(/[:\+]/);
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (n < 10) return Math.round(n * 60);
  if (n < 100) return Math.round(n);
  return Math.floor(n / 100) * 60 + (n % 100);
}

export function formatETE(raw) {
  if (!raw) return raw;
  const s = raw.trim();
  if (s.includes(":")) return s;
  const n = parseInt(s, 10);
  if (isNaN(n)) return s;
  if (n < 10) return `${n}:00`;
  if (n < 60) return `0:${String(n).padStart(2, "0")}`;
  if (n >= 100) return `${Math.floor(n / 100)}:${String(n % 100).padStart(2, "0")}`;
  return s;
}

export function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const R = 3440.065;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function flattenCoords(arr) {
  if (!Array.isArray(arr)) return [];
  if (arr.length >= 2 && typeof arr[0] === "number") return [arr];
  return arr.flatMap(item => flattenCoords(item));
}

export function formatZulu(d) {
  if (!d) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}Z`;
}

// ── Crosswind calculator ─────────────────────────────────────────

/**
 * Calculate crosswind component given wind direction, speed, and runway heading.
 * Returns the max crosswind component across all runway headings for the station.
 * If no runway data, returns null (caller should fall back to total wind check).
 */
function calcCrosswind(wdir, wspd, wgst, runways) {
  if (!runways || runways.length === 0 || wdir === 0 || wdir === "VRB") return null;
  const windSpeed = wgst > wspd ? wgst : wspd;
  const toRad = d => d * Math.PI / 180;
  // Find the minimum crosswind component (best runway alignment)
  let minXwind = Infinity;
  for (const rwy of runways) {
    const heading = rwy.heading;
    if (heading == null) continue;
    const angle = Math.abs(wdir - heading);
    const normalizedAngle = angle > 180 ? 360 - angle : angle;
    const xwind = Math.abs(windSpeed * Math.sin(toRad(normalizedAngle)));
    if (xwind < minXwind) minXwind = xwind;
  }
  return minXwind === Infinity ? null : Math.round(minXwind);
}

// ── Icing detection helpers ──────────────────────────────────────

const ICING_WX_CODES = ["FZ", "FZRA", "FZDZ", "FZFG", "IC"];

function hasIcingWx(wxStr) {
  if (!wxStr) return false;
  const upper = wxStr.toUpperCase();
  return ICING_WX_CODES.some(code => upper.includes(code));
}

// ── Main analysis ────────────────────────────────────────────────

/**
 * Analyze weather data and return risk flags, reasons, and briefing items.
 *
 * @param {object} wx - Weather data from /api/weather endpoint
 *   wx.metars - array of METAR objects
 *   wx.tafs   - array of TAF objects
 *   wx.pireps - array of PIREP objects (optional)
 *   wx.airsigmets - array of AIRMET/SIGMET objects (optional)
 *   wx.runways - object mapping station ICAO to array of { heading, length_ft, id } (optional)
 *   wx.stationInfo - object mapping station ICAO to { elev, lat, lon } (optional)
 *   wx.altFt  - cruise altitude in feet (optional)
 *   wx.depTimeZ - departure time as Date (optional)
 *   wx.arrTimeZ - arrival time as Date (optional)
 *   wx.notams - array of NOTAM objects (optional)
 *   wx.depCoords - { lat, lon } for departure (optional, for suncalc)
 *   wx.destCoords - { lat, lon } for destination (optional, for suncalc)
 */
export function analyzeWeather(wx) {
  if (!wx) return { flags: {}, reasons: {}, briefing: null, stationSummaries: [] };
  const flags = {};
  const reasons = {};
  const briefItems = [];
  const stationSummaries = [];
  const aptCoords = [];

  const depTimeZ = wx.depTimeZ;
  const arrTimeZ = wx.arrTimeZ;
  const ids = (wx.metars || []).map(m => m.icaoId).filter(Boolean);
  const depId = ids[0] || null;
  const destId = ids[1] || ids[0] || null;
  const runwayData = wx.runways || {};
  const stationInfo = wx.stationInfo || {};

  // Helper: find TAF period covering a target time for a station
  function findTafPeriod(tafs, stationId, targetTime) {
    if (!targetTime) return null;
    const taf = tafs.find(t => (t.icaoId || "").toUpperCase() === stationId.toUpperCase());
    if (!taf || !taf.fcsts) return null;
    const ts = targetTime.getTime() / 1000;
    for (let i = taf.fcsts.length - 1; i >= 0; i--) {
      const f = taf.fcsts[i];
      const from = f.timeFrom || 0;
      const to = f.timeTo || 0;
      if (ts >= from && ts <= to) return { ...f, station: stationId, periodLabel: "TAF" };
    }
    return taf.fcsts.length > 0 ? { ...taf.fcsts[taf.fcsts.length - 1], station: stationId, periodLabel: "TAF" } : null;
  }

  // Analyze a weather period (METAR or TAF) and flag risks
  function analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, label, temp) {
    if (ceiling < 1000) {
      flags.wx_ceiling = true;
      reasons.wx_ceiling = (reasons.wx_ceiling || "") + `${station} ${label} ceiling ${ceiling}' AGL. `;
    }
    if (vis < 3) {
      flags.wx_vis = true;
      reasons.wx_vis = (reasons.wx_vis || "") + `${station} ${label} vis ${vis} SM. `;
    }

    // Crosswind: use actual crosswind component if runway data available
    const stationRunways = runwayData[station] || runwayData[station?.toUpperCase()];
    const xwind = calcCrosswind(wdir, wspd, wgst, stationRunways);
    const windSpeed = wgst > wspd ? wgst : wspd;
    if (xwind !== null) {
      // Have runway data — use actual crosswind component
      if (xwind > 15) {
        flags.wx_xwind = true;
        reasons.wx_xwind = (reasons.wx_xwind || "") + `${station} ${label} crosswind ${xwind}kt (wind ${wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt). `;
      }
    } else {
      // No runway data — fall back to total wind speed check
      if (windSpeed > 15) {
        flags.wx_xwind = true;
        reasons.wx_xwind = (reasons.wx_xwind || "") + `${station} ${label} wind ${wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt (no runway data — using total wind). `;
      }
    }

    if (wxStr.includes("TS")) {
      flags.wx_ts = true;
      reasons.wx_ts = (reasons.wx_ts || "") + `${station} ${label} thunderstorm. `;
    }

    // Icing detection from weather string
    if (hasIcingWx(wxStr)) {
      flags.wx_ice = true;
      reasons.wx_ice = (reasons.wx_ice || "") + `${station} ${label} ${wxStr.match(/FZ\w*|IC/g)?.join(", ") || "icing"}. `;
    }
  }

  // ── Process METARs ──
  for (const m of (Array.isArray(wx.metars) ? wx.metars : [])) {
    const station = m.icaoId || "??";
    const ceiling = getCeiling(m.clouds);
    const vis = m.visib === "10+" ? 10 : parseFloat(m.visib) || 99;
    const wspd = m.wspd || 0;
    const wgst = m.wgst || 0;
    const wdir = m.wdir || 0;
    const wxStr = (m.wxString || "").toUpperCase();
    const raw = m.rawOb || "";
    const temp = m.temp != null ? m.temp : null;
    const dewp = m.dewp != null ? m.dewp : null;
    const altim = m.altim != null ? m.altim : null;
    const tempStr = temp != null ? `${Math.round(temp)}\u00B0C` : "";
    const dewpStr = dewp != null ? `${Math.round(dewp)}\u00B0C` : "";
    const altimStr = altim != null ? `${(altim * 0.02953).toFixed(2)}"` : "";
    if (m.lat && m.lon) aptCoords.push({ lat: m.lat, lon: m.lon, station });
    briefItems.push({ station, type: "METAR", raw });
    const ceilStr = ceiling >= 99999 ? "CLR" : `${ceiling}'`;
    const visStr = vis >= 10 ? "10+ SM" : `${vis} SM`;
    const windStr = wspd === 0 ? "Calm" : `${wdir}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt`;
    const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
    stationSummaries.push({
      station, type: "METAR (current)",
      summary: `Ceil ${ceilStr} | Vis ${visStr} | Wind ${windStr}${tempStr ? ` | ${tempStr}/${dewpStr}` : ""}${wxStr ? ` | ${wxStr}` : ""}`,
      ceiling: ceilStr, visibility: visStr, wind: windStr, temp: tempStr, dewp: dewpStr, altimeter: altimStr,
      wxString: wxStr, flight_rules: fr, raw,
      hazards: [],
    });

    analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, "METAR", temp);

    // Wind shear from raw METAR
    if (raw.includes("WS") || raw.toUpperCase().includes("WIND SHEAR")) {
      flags.wx_wind_shear = true;
      reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} wind shear. `;
    }

    // Mountain / high density altitude check
    if (temp != null && altim != null) {
      const elev = stationInfo[station]?.elev || stationInfo[station?.toUpperCase()]?.elev || m.elev || 0;
      if (elev > 0 || temp > 30) {
        // Pressure altitude = (29.92 - altim_inHg) * 1000 + field_elev
        const altimInHg = altim * 0.02953;
        const pressureAlt = (29.92 - altimInHg) * 1000 + elev;
        // ISA temp at pressure altitude = 15 - (pressureAlt * 0.001981)°C * 2 → simplified: 15 - 1.98 * (pressureAlt/1000)
        const isaTemp = 15 - 1.98 * (pressureAlt / 1000);
        const densityAlt = Math.round(pressureAlt + 118.8 * (temp - isaTemp));
        if (densityAlt > 8000) {
          flags.wx_mountain = true;
          reasons.wx_mountain = (reasons.wx_mountain || "") + `${station} density altitude ${densityAlt}'. `;
        }
      }
    }
  }

  // ── Process TAFs ──
  const tafs = Array.isArray(wx.tafs) ? wx.tafs : [];
  for (const t of tafs) {
    const station = t.icaoId || "??";
    briefItems.push({ station, type: "TAF", raw: t.rawTAF || "" });

    const targetTime = (station === depId) ? depTimeZ : (station === destId) ? arrTimeZ : null;
    const matched = targetTime ? findTafPeriod(tafs, station, targetTime) : null;
    const timeLabel = targetTime ? `@ ${formatZulu(targetTime)}` : "";

    if (matched) {
      const vis = matched.visib === "6+" ? 10 : parseFloat(matched.visib) || 99;
      const ceiling = getCeiling(matched.clouds);
      const wxStr = (matched.wxString || "").toUpperCase();
      const wspd = matched.wspd || 0;
      const wgst = matched.wgst || 0;
      const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
      const ceilStr = ceiling >= 99999 ? "CLR" : `${ceiling}'`;
      stationSummaries.push({
        station, type: `TAF ${timeLabel}`,
        summary: `Ceil ${ceilStr} | Vis ${vis >= 10 ? "6+" : vis} SM | Wind ${matched.wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt${wxStr ? ` | ${wxStr}` : ""}`,
        flight_rules: fr, hazards: [],
      });
      analyzePeriod(station, ceiling, vis, wspd, wgst, matched.wdir, wxStr, `TAF ${timeLabel}`);
      if (matched.wshearHgt != null) {
        flags.wx_wind_shear = true;
        reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} TAF wind shear ${matched.wshearHgt}ft. `;
      }
    } else {
      let worstFR = "VFR";
      let worstSum = "";
      const rank = { LIFR: 4, IFR: 3, MVFR: 2, VFR: 1 };
      for (const f of (t.fcsts || [])) {
        const vis = f.visib === "6+" ? 10 : parseFloat(f.visib) || 99;
        const ceiling = getCeiling(f.clouds);
        const wxStr = (f.wxString || "").toUpperCase();
        const wspd = f.wspd || 0;
        const wgst = f.wgst || 0;
        const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
        if (rank[fr] > rank[worstFR]) {
          worstFR = fr;
          worstSum = `Ceil ${ceiling >= 99999 ? "CLR" : ceiling + "'"} | Vis ${vis >= 10 ? "6+" : vis} SM | Wind ${f.wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt${wxStr ? ` | ${wxStr}` : ""}`;
        }
        analyzePeriod(station, ceiling, vis, wspd, wgst, f.wdir, wxStr, "TAF fcst");
        if (f.wshearHgt != null && !flags.wx_wind_shear) {
          flags.wx_wind_shear = true;
          reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} TAF wind shear ${f.wshearHgt}ft. `;
        }
      }
      if (worstSum) stationSummaries.push({ station, type: "TAF worst", summary: worstSum, flight_rules: worstFR, hazards: [] });
    }
  }

  // ── Process PIREPs for turbulence ──
  const pireps = Array.isArray(wx.pireps) ? wx.pireps : [];
  for (const p of pireps) {
    // tbInt: turbulence intensity 0=none, 2=light, 4=moderate, 6=severe, 8=extreme
    if (p.tbInt != null && p.tbInt >= 4) {
      // Check proximity to route
      if (isNearRoute(p, aptCoords)) {
        const intLabel = p.tbInt >= 8 ? "extreme" : p.tbInt >= 6 ? "severe" : "moderate";
        flags.wx_turb = true;
        reasons.wx_turb = (reasons.wx_turb || "") + `PIREP ${intLabel} turbulence${p.fltlvl ? ` FL${p.fltlvl}` : ""}. `;
      }
    }
    // Also check icing from PIREPs
    if (p.icInt != null && p.icInt >= 2) {
      if (isNearRoute(p, aptCoords)) {
        flags.wx_ice = true;
        reasons.wx_ice = (reasons.wx_ice || "") + `PIREP icing${p.fltlvl ? ` FL${p.fltlvl}` : ""}. `;
      }
    }
  }

  // ── Process AIRMETs/SIGMETs ──
  const airsigmets = Array.isArray(wx.airsigmets) ? wx.airsigmets : [];
  for (const item of airsigmets) {
    if (!isNearRoute(item, aptCoords)) continue;
    const hazard = (item.hazard || "").toUpperCase();
    const rawText = (item.rawAirSigmet || item.rawText || "").toUpperCase();

    const airType = rawText.includes("SIGMET") ? "SIGMET" : "AIRMET";
    const series = (item.airSigmetId || item.series || "").trim();
    const tag = series ? `${airType} ${series}` : airType;

    // AIRMET Zulu / Sierra for icing
    if (hazard === "ICE" || hazard.includes("ICE") || rawText.includes("FRZLVL") || rawText.includes("ICING")) {
      if (!flags.wx_ice) {
        flags.wx_ice = true;
        reasons.wx_ice = `${tag} — icing conditions in area`;
      }
    }

    // AIRMET Tango for turbulence
    if (hazard === "TURB" || hazard.includes("TURB") || rawText.includes("TURB")) {
      if (!flags.wx_turb) {
        flags.wx_turb = true;
        reasons.wx_turb = `${tag} — turbulence in area`;
      }
    }

    // AIRMET Sierra for mountain obscuration
    if (rawText.includes("MTN OBSCN") || rawText.includes("OBSCG MTN") || rawText.includes("MTN OBSC")) {
      if (!flags.wx_mountain) {
        flags.wx_mountain = true;
        reasons.wx_mountain = `${tag} — mountain obscuration`;
      }
    }

    // IFR conditions from AIRMET Sierra
    if (hazard === "IFR" || rawText.includes("IFR")) {
      // Don't auto-flag — just informational, wx_ceiling/wx_vis cover this
    }
  }

  // ── Process NOTAMs ──
  const notams = Array.isArray(wx.notams) ? wx.notams : [];
  const notamKeywords = ["ILS", "GPS", "NAVAID", "U/S", "OTS", "RWY CLSD"];
  const runwayNotamKeywords = ["RWY", "CLSD", "FICON", "SNOWTAM"];

  for (const n of notams) {
    const text = (n.text || n.traditionalMessage || n.notamText || "").toUpperCase();
    const station = n.icaoId || n.location || "";

    // env_notams: significant NOTAMs
    for (const kw of notamKeywords) {
      if (text.includes(kw)) {
        flags.env_notams = true;
        reasons.env_notams = (reasons.env_notams || "") + `${station} NOTAM: ${kw}. `;
        break;
      }
    }

    // env_runway: runway closures or contamination
    const hasRunwayIssue = runwayNotamKeywords.filter(kw => text.includes(kw));
    if (hasRunwayIssue.length >= 2 || text.includes("FICON") || text.includes("SNOWTAM")) {
      flags.env_short_runway = true;
      reasons.env_short_runway = (reasons.env_short_runway || "") + `${station} NOTAM: ${hasRunwayIssue.join(", ") || "runway issue"}. `;
    }
  }

  // ── Runway length check ──
  for (const stationId of [depId, destId].filter(Boolean)) {
    const rwys = runwayData[stationId] || runwayData[stationId?.toUpperCase()];
    if (rwys && rwys.length > 0) {
      const longest = Math.max(...rwys.map(r => r.length_ft || 0));
      if (longest > 0 && longest < 4000) {
        flags.env_short_runway = true;
        reasons.env_short_runway = (reasons.env_short_runway || "") + `${stationId} longest runway ${longest}'. `;
      }
    }
  }

  // ── Night operations check ──
  if (wx.nightInfo) {
    const ni = wx.nightInfo;
    if (ni.isNight) {
      flags.env_night = true;
      reasons.env_night = (reasons.env_night || "") + (ni.reason || "Flight occurs during nighttime hours. ");
    }
  }

  // ── ForeFlight leg count ──
  if (wx.legCount != null && wx.legCount >= 3) {
    flags.ops_multi_leg = true;
    reasons.ops_multi_leg = (reasons.ops_multi_leg || "") + `${wx.legCount} legs in duty period. `;
  }

  // ── Build hazards for station summaries ──
  const H_RED = "#EF4444";
  const H_AMBER = "#F59E0B";
  const H_YELLOW = "#FACC15";
  stationSummaries.forEach(s => {
    const hazards = [];
    if (flags.wx_ts) hazards.push({ label: "Thunderstorms", color: H_RED, reason: reasons.wx_ts || "Thunderstorm activity reported in area" });
    if (flags.wx_ice) hazards.push({ label: "Icing", color: H_AMBER, reason: reasons.wx_ice || "Icing conditions reported" });
    if (flags.wx_turb) hazards.push({ label: "Turbulence", color: H_AMBER, reason: reasons.wx_turb || "Turbulence reported in area" });
    if (flags.wx_wind_shear) hazards.push({ label: "Wind Shear", color: H_RED, reason: reasons.wx_wind_shear || "Wind shear reported" });
    if (flags.wx_ceiling && s.ceiling !== "CLR") hazards.push({ label: "Low Ceiling", color: H_YELLOW, reason: `Ceiling at ${s.ceiling} AGL at ${s.station}` });
    if (flags.wx_vis && s.visibility && !s.visibility.includes("10+")) hazards.push({ label: "Low Visibility", color: H_YELLOW, reason: `Visibility ${s.visibility} at ${s.station}` });
    if (flags.wx_xwind) hazards.push({ label: "Crosswind", color: H_YELLOW, reason: reasons.wx_xwind || "Crosswind exceeds 15 knots" });
    if (flags.wx_mountain) hazards.push({ label: "High DA", color: H_AMBER, reason: reasons.wx_mountain || "High density altitude" });
    s.hazards = hazards;
  });

  return { flags, reasons, briefing: briefItems, stationSummaries };
}

// ── Route proximity check ────────────────────────────────────────

function isNearRoute(item, aptCoords) {
  if (aptCoords.length === 0) return true;
  // Check direct lat/lon
  if (item.lat && item.lon) return aptCoords.some(a => haversineNm(a.lat, a.lon, item.lat, item.lon) < 200);
  // Check various coordinate field names used by AWC
  const coords = item.coords || (item.geometry && item.geometry.coordinates) || item.geom?.coordinates;
  if (coords && Array.isArray(coords)) {
    const flat = flattenCoords(coords);
    if (flat.length > 0) return flat.some(([lon, lat]) => aptCoords.some(a => haversineNm(a.lat, a.lon, lat, lon) < 200));
  }
  return true;
}
