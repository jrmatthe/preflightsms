import { describe, it, expect } from 'vitest';

// ── COPIED UTILITY FUNCTIONS (not exported from pages/index.js) ──────────

function parseETE(ete) {
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

function formatETE(raw) {
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

function parseCruiseAlt(val) {
  if (!val) return 0;
  const s = val.toString().trim().toUpperCase();
  if (s.startsWith("FL")) return parseInt(s.slice(2), 10) * 100;
  return parseInt(s, 10) || 0;
}

function getCeiling(clouds) {
  if (!clouds || !Array.isArray(clouds)) return 99999;
  for (const c of clouds) {
    if ((c.cover === "BKN" || c.cover === "OVC") && c.base != null) return c.base;
  }
  return 99999;
}

function formatZulu(d) {
  if (!d) return "";
  return `${String(d.getUTCHours()).padStart(2,"0")}${String(d.getUTCMinutes()).padStart(2,"0")}Z`;
}

function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const R = 3440.065;
  const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function flattenCoords(arr) {
  if (!Array.isArray(arr)) return [];
  if (arr.length >= 2 && typeof arr[0] === "number") return [arr];
  return arr.flatMap(item => flattenCoords(item));
}

function analyzeWeather(wx) {
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

  function isMetarCurrent(metar, targetTime) {
    if (!targetTime || !metar.obsTime) return true;
    const obsTs = metar.obsTime * 1000;
    const targetTs = targetTime.getTime();
    return Math.abs(targetTs - obsTs) < 90 * 60000;
  }

  function analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, label) {
    if (ceiling < 1000) { flags.wx_ceiling = true; reasons.wx_ceiling = (reasons.wx_ceiling || "") + `${station} ${label} ceiling ${ceiling}' AGL. `; }
    if (vis < 3) { flags.wx_vis = true; reasons.wx_vis = (reasons.wx_vis || "") + `${station} ${label} vis ${vis} SM. `; }
    if (wspd > 15 || wgst > 15) { flags.wx_xwind = true; reasons.wx_xwind = (reasons.wx_xwind || "") + `${station} ${label} wind ${wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt. `; }
    if (wxStr.includes("TS")) { flags.wx_ts = true; reasons.wx_ts = (reasons.wx_ts || "") + `${station} ${label} thunderstorm. `; }
  }

  for (const m of (Array.isArray(wx.metars) ? wx.metars : [])) {
    const station = m.icaoId || "??";
    const ceiling = getCeiling(m.clouds);
    const vis = m.visib === "10+" ? 10 : parseFloat(m.visib) || 99;
    const wspd = m.wspd || 0; const wgst = m.wgst || 0; const wdir = m.wdir || 0;
    const wxStr = (m.wxString || "").toUpperCase();
    const raw = m.rawOb || "";
    const temp = m.temp != null ? `${Math.round(m.temp)}\u00B0C` : "";
    const dewp = m.dewp != null ? `${Math.round(m.dewp)}\u00B0C` : "";
    if (m.lat && m.lon) aptCoords.push({ lat: m.lat, lon: m.lon });
    briefItems.push({ station, type: "METAR", raw });
    const ceilStr = ceiling >= 99999 ? "CLR" : `${ceiling}'`;
    const visStr = vis >= 10 ? "10+ SM" : `${vis} SM`;
    const windStr = wspd === 0 ? "Calm" : `${wdir}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt`;
    const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
    stationSummaries.push({ station, type: "METAR (current)", summary: `Ceil ${ceilStr} | Vis ${visStr} | Wind ${windStr}${temp ? ` | ${temp}/${dewp}` : ""}${wxStr ? ` | ${wxStr}` : ""}`, flight_rules: fr });

    const targetTime = (station === depId) ? depTimeZ : (station === destId) ? arrTimeZ : null;
    if (!targetTime || isMetarCurrent(m, targetTime)) {
      analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, "METAR");
    }
    if (raw.includes("WS") || raw.toUpperCase().includes("WIND SHEAR")) { flags.wx_wind_shear = true; reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} wind shear. `; }
  }

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
      const wspd = matched.wspd || 0; const wgst = matched.wgst || 0;
      const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
      const ceilStr = ceiling >= 99999 ? "CLR" : `${ceiling}'`;
      stationSummaries.push({ station, type: `TAF ${timeLabel}`, summary: `Ceil ${ceilStr} | Vis ${vis >= 10 ? "6+" : vis} SM | Wind ${matched.wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt${wxStr ? ` | ${wxStr}` : ""}`, flight_rules: fr });
      analyzePeriod(station, ceiling, vis, wspd, wgst, matched.wdir, wxStr, `TAF ${timeLabel}`);
      if (matched.wshearHgt != null) { flags.wx_wind_shear = true; reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} TAF wind shear ${matched.wshearHgt}ft. `; }
    } else {
      let worstFR = "VFR"; let worstSum = "";
      const rank = { LIFR: 4, IFR: 3, MVFR: 2, VFR: 1 };
      for (const f of (t.fcsts || [])) {
        const vis = f.visib === "6+" ? 10 : parseFloat(f.visib) || 99;
        const ceiling = getCeiling(f.clouds); const wxStr = (f.wxString || "").toUpperCase();
        const wspd = f.wspd || 0; const wgst = f.wgst || 0;
        const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
        if (rank[fr] > rank[worstFR]) { worstFR = fr; worstSum = `Ceil ${ceiling >= 99999 ? "CLR" : ceiling + "'"} | Vis ${vis >= 10 ? "6+" : vis} SM | Wind ${f.wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt${wxStr ? ` | ${wxStr}` : ""}`; }
        analyzePeriod(station, ceiling, vis, wspd, wgst, f.wdir, wxStr, "TAF fcst");
        if (f.wshearHgt != null && !flags.wx_wind_shear) { flags.wx_wind_shear = true; reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} TAF wind shear ${f.wshearHgt}ft. `; }
      }
      if (worstSum) stationSummaries.push({ station, type: "TAF worst", summary: worstSum, flight_rules: worstFR });
    }
  }

  const altFt = wx.altFt || 0;

  return { flags, reasons, briefing: briefItems, stationSummaries };
}

// Color constants used in DEFAULT_RISK_LEVELS
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";

const DEFAULT_RISK_LEVELS = {
  LOW: { label: "LOW RISK", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", min: 0, max: 15, action: "Flight authorized \u2014 standard procedures", approval_mode: "none" },
  MODERATE: { label: "MODERATE RISK", color: YELLOW, bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", min: 16, max: 30, action: "Enhanced awareness \u2014 brief crew on elevated risk factors", approval_mode: "none" },
  HIGH: { label: "HIGH RISK", color: AMBER, bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", min: 31, max: 45, action: "Requires management approval before departure", approval_mode: "required" },
  CRITICAL: { label: "CRITICAL RISK", color: RED, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", min: 46, max: 100, action: "Flight should not depart without risk mitigation and executive approval", approval_mode: "required" },
};

// ── TESTS ────────────────────────────────────────────────────────────────

// ── parseETE ─────────────────────────────────────────────────────────────

describe('parseETE', () => {
  it('returns 0 for null', () => {
    expect(parseETE(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseETE(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseETE("")).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseETE("abc")).toBe(0);
  });

  it('parses colon format "1:30" as 90 minutes', () => {
    expect(parseETE("1:30")).toBe(90);
  });

  it('parses colon format "2:00" as 120 minutes', () => {
    expect(parseETE("2:00")).toBe(120);
  });

  it('parses colon format "0:45" as 45 minutes', () => {
    expect(parseETE("0:45")).toBe(45);
  });

  it('parses plus format "2+15" as 135 minutes', () => {
    expect(parseETE("2+15")).toBe(135);
  });

  it('parses plus format "0+30" as 30 minutes', () => {
    expect(parseETE("0+30")).toBe(30);
  });

  it('treats small decimals as hours: "1.5" = 90 min', () => {
    expect(parseETE("1.5")).toBe(90);
  });

  it('treats small integers as hours: "2" = 120 min', () => {
    expect(parseETE("2")).toBe(120);
  });

  it('treats small integers as hours: "3" = 180 min', () => {
    expect(parseETE("3")).toBe(180);
  });

  it('treats values 10-99 as minutes: "45" = 45 min', () => {
    expect(parseETE("45")).toBe(45);
  });

  it('treats values 10-99 as minutes: "90" = 90 min', () => {
    expect(parseETE("90")).toBe(90);
  });

  it('treats large values as HHMM: "130" = 90 min', () => {
    expect(parseETE("130")).toBe(90);
  });

  it('treats HHMM: "200" = 120 min', () => {
    expect(parseETE("200")).toBe(120);
  });

  it('treats HHMM: "245" = 165 min', () => {
    expect(parseETE("245")).toBe(165);
  });

  it('handles whitespace padding', () => {
    expect(parseETE("  1:30  ")).toBe(90);
  });
});

// ── formatETE ────────────────────────────────────────────────────────────

describe('formatETE', () => {
  it('returns null for null', () => {
    expect(formatETE(null)).toBeNull();
  });

  it('returns undefined for undefined', () => {
    expect(formatETE(undefined)).toBeUndefined();
  });

  it('returns "" for empty string (falsy passthrough)', () => {
    expect(formatETE("")).toBe("");
  });

  it('passes through colon format "1:30"', () => {
    expect(formatETE("1:30")).toBe("1:30");
  });

  it('passes through colon format "0:45"', () => {
    expect(formatETE("0:45")).toBe("0:45");
  });

  it('formats single digit as hours: "2" -> "2:00"', () => {
    expect(formatETE("2")).toBe("2:00");
  });

  it('formats single digit as hours: "5" -> "5:00"', () => {
    expect(formatETE("5")).toBe("5:00");
  });

  it('formats two-digit < 60 as minutes: "45" -> "0:45"', () => {
    expect(formatETE("45")).toBe("0:45");
  });

  it('formats two-digit < 60 with padding: "5" -> "5:00"', () => {
    expect(formatETE("9")).toBe("9:00");
  });

  it('formats HHMM: "130" -> "1:30"', () => {
    expect(formatETE("130")).toBe("1:30");
  });

  it('formats HHMM: "200" -> "2:00"', () => {
    expect(formatETE("200")).toBe("2:00");
  });

  it('formats HHMM: "115" -> "1:15"', () => {
    expect(formatETE("115")).toBe("1:15");
  });

  it('returns non-numeric strings as-is: "abc" -> "abc"', () => {
    expect(formatETE("abc")).toBe("abc");
  });

  it('returns values 60-99 as-is (ambiguous range)', () => {
    // 60-99 are >= 60 and < 100 but not < 60, so falls through to return s
    expect(formatETE("75")).toBe("75");
  });
});

// ── parseCruiseAlt ───────────────────────────────────────────────────────

describe('parseCruiseAlt', () => {
  it('returns 0 for null', () => {
    expect(parseCruiseAlt(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseCruiseAlt(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseCruiseAlt("")).toBe(0);
  });

  it('parses flight level FL350 as 35000', () => {
    expect(parseCruiseAlt("FL350")).toBe(35000);
  });

  it('parses flight level FL180 as 18000', () => {
    expect(parseCruiseAlt("FL180")).toBe(18000);
  });

  it('parses lowercase flight level fl250 as 25000', () => {
    expect(parseCruiseAlt("fl250")).toBe(25000);
  });

  it('parses numeric string "5500" as 5500', () => {
    expect(parseCruiseAlt("5500")).toBe(5500);
  });

  it('parses numeric value 8500 as 8500', () => {
    expect(parseCruiseAlt(8500)).toBe(8500);
  });

  it('returns 0 for non-numeric string "abc"', () => {
    expect(parseCruiseAlt("abc")).toBe(0);
  });

  it('handles whitespace around value', () => {
    expect(parseCruiseAlt("  FL180  ")).toBe(18000);
  });
});

// ── getCeiling ───────────────────────────────────────────────────────────

describe('getCeiling', () => {
  it('returns 99999 for null', () => {
    expect(getCeiling(null)).toBe(99999);
  });

  it('returns 99999 for undefined', () => {
    expect(getCeiling(undefined)).toBe(99999);
  });

  it('returns 99999 for non-array', () => {
    expect(getCeiling("not an array")).toBe(99999);
  });

  it('returns 99999 for empty array', () => {
    expect(getCeiling([])).toBe(99999);
  });

  it('returns 99999 when no BKN or OVC layers', () => {
    expect(getCeiling([{ cover: "SCT", base: 5000 }])).toBe(99999);
  });

  it('returns 99999 for FEW layers only', () => {
    expect(getCeiling([{ cover: "FEW", base: 3000 }, { cover: "FEW", base: 6000 }])).toBe(99999);
  });

  it('returns base of first BKN layer', () => {
    expect(getCeiling([{ cover: "BKN", base: 2500 }])).toBe(2500);
  });

  it('returns base of first OVC layer', () => {
    expect(getCeiling([{ cover: "OVC", base: 1200 }])).toBe(1200);
  });

  it('skips non-ceiling layers and finds BKN', () => {
    expect(getCeiling([
      { cover: "FEW", base: 10000 },
      { cover: "OVC", base: 3000 },
    ])).toBe(3000);
  });

  it('returns first BKN/OVC even if lower layers exist', () => {
    expect(getCeiling([
      { cover: "SCT", base: 1500 },
      { cover: "BKN", base: 4000 },
      { cover: "OVC", base: 8000 },
    ])).toBe(4000);
  });

  it('handles base of 0 (ground fog)', () => {
    expect(getCeiling([{ cover: "OVC", base: 0 }])).toBe(0);
  });

  it('ignores BKN/OVC with null base', () => {
    expect(getCeiling([{ cover: "BKN", base: null }, { cover: "OVC", base: 2000 }])).toBe(2000);
  });
});

// ── formatZulu ───────────────────────────────────────────────────────────

describe('formatZulu', () => {
  it('returns empty string for null', () => {
    expect(formatZulu(null)).toBe("");
  });

  it('returns empty string for undefined', () => {
    expect(formatZulu(undefined)).toBe("");
  });

  it('formats afternoon time correctly', () => {
    expect(formatZulu(new Date("2025-01-15T14:30:00Z"))).toBe("1430Z");
  });

  it('pads hours and minutes with leading zeros', () => {
    expect(formatZulu(new Date("2025-01-15T01:05:00Z"))).toBe("0105Z");
  });

  it('formats midnight as 0000Z', () => {
    expect(formatZulu(new Date("2025-06-01T00:00:00Z"))).toBe("0000Z");
  });

  it('formats 23:59 as 2359Z', () => {
    expect(formatZulu(new Date("2025-12-31T23:59:00Z"))).toBe("2359Z");
  });

  it('formats noon as 1200Z', () => {
    expect(formatZulu(new Date("2025-07-04T12:00:00Z"))).toBe("1200Z");
  });
});

// ── haversineNm ──────────────────────────────────────────────────────────

describe('haversineNm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineNm(34.0, -118.0, 34.0, -118.0)).toBe(0);
  });

  it('calculates LAX to SFO as roughly 300 nm', () => {
    // LAX: 33.9425, -118.4081   SFO: 37.6213, -122.3790
    const dist = haversineNm(33.9425, -118.4081, 37.6213, -122.3790);
    expect(dist).toBeGreaterThan(280);
    expect(dist).toBeLessThan(320);
  });

  it('calculates JFK to LHR as roughly 3000 nm', () => {
    // JFK: 40.6413, -73.7781   LHR: 51.4700, -0.4543
    const dist = haversineNm(40.6413, -73.7781, 51.4700, -0.4543);
    expect(dist).toBeGreaterThan(2950);
    expect(dist).toBeLessThan(3100);
  });

  it('is symmetric (A->B equals B->A)', () => {
    const ab = haversineNm(34.0, -118.0, 40.0, -74.0);
    const ba = haversineNm(40.0, -74.0, 34.0, -118.0);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it('handles crossing the equator', () => {
    const dist = haversineNm(10.0, 0.0, -10.0, 0.0);
    expect(dist).toBeGreaterThan(1190);
    expect(dist).toBeLessThan(1210);
  });

  it('handles crossing the date line', () => {
    const dist = haversineNm(0.0, 179.0, 0.0, -179.0);
    // 2 degrees at equator ~ 120 nm
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(130);
  });
});

// ── flattenCoords ────────────────────────────────────────────────────────

describe('flattenCoords', () => {
  it('returns empty array for non-array input', () => {
    expect(flattenCoords(null)).toEqual([]);
    expect(flattenCoords(undefined)).toEqual([]);
    expect(flattenCoords("string")).toEqual([]);
    expect(flattenCoords(42)).toEqual([]);
  });

  it('wraps a single coordinate pair in an array', () => {
    expect(flattenCoords([1, 2])).toEqual([[1, 2]]);
  });

  it('wraps a coordinate with 3 values (lon, lat, alt)', () => {
    expect(flattenCoords([1, 2, 3])).toEqual([[1, 2, 3]]);
  });

  it('handles flat array of coordinate pairs', () => {
    expect(flattenCoords([[1, 2], [3, 4]])).toEqual([[1, 2], [3, 4]]);
  });

  it('flattens one level of nesting', () => {
    expect(flattenCoords([[[1, 2], [3, 4]]])).toEqual([[1, 2], [3, 4]]);
  });

  it('flattens deeply nested coordinates', () => {
    expect(flattenCoords([[[[1, 2], [3, 4]]]])).toEqual([[1, 2], [3, 4]]);
  });

  it('returns empty array for empty array input', () => {
    expect(flattenCoords([])).toEqual([]);
  });

  it('handles mixed nesting depths', () => {
    expect(flattenCoords([[[1, 2]], [3, 4]])).toEqual([[1, 2], [3, 4]]);
  });
});

// ── analyzeWeather ───────────────────────────────────────────────────────

describe('analyzeWeather', () => {
  it('returns empty result for null input', () => {
    const result = analyzeWeather(null);
    expect(result.flags).toEqual({});
    expect(result.reasons).toEqual({});
    expect(result.briefing).toBeNull();
    expect(result.stationSummaries).toEqual([]);
  });

  it('returns empty result for undefined input', () => {
    const result = analyzeWeather(undefined);
    expect(result.flags).toEqual({});
    expect(result.briefing).toBeNull();
  });

  it('handles empty metars array with no flags', () => {
    const result = analyzeWeather({ metars: [], tafs: [] });
    expect(result.flags).toEqual({});
    expect(result.briefing).toEqual([]);
    expect(result.stationSummaries).toEqual([]);
  });

  it('flags low ceiling (below 1000 AGL)', () => {
    const wx = {
      metars: [{
        icaoId: "KJFK",
        clouds: [{ cover: "OVC", base: 500 }],
        visib: "10+",
        wspd: 5,
        wgst: 0,
        wdir: 180,
        rawOb: "KJFK OVC005",
      }],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.flags.wx_ceiling).toBe(true);
    expect(result.reasons.wx_ceiling).toContain("KJFK");
    expect(result.reasons.wx_ceiling).toContain("500");
  });

  it('flags low visibility (below 3 SM)', () => {
    const wx = {
      metars: [{
        icaoId: "KSFO",
        clouds: [{ cover: "SCT", base: 5000 }],
        visib: "1",
        wspd: 5,
        wgst: 0,
        wdir: 270,
        rawOb: "KSFO 1SM",
      }],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.flags.wx_vis).toBe(true);
    expect(result.reasons.wx_vis).toContain("KSFO");
  });

  it('flags high wind (wspd > 15 kt)', () => {
    const wx = {
      metars: [{
        icaoId: "KORD",
        clouds: [],
        visib: "10+",
        wspd: 25,
        wgst: 0,
        wdir: 320,
        rawOb: "KORD 32025KT",
      }],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.flags.wx_xwind).toBe(true);
    expect(result.reasons.wx_xwind).toContain("KORD");
    expect(result.reasons.wx_xwind).toContain("25");
  });

  it('flags high gusts (wgst > 15 kt)', () => {
    const wx = {
      metars: [{
        icaoId: "KDEN",
        clouds: [],
        visib: "10+",
        wspd: 10,
        wgst: 25,
        wdir: 200,
        rawOb: "KDEN 20010G25KT",
      }],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.flags.wx_xwind).toBe(true);
    expect(result.reasons.wx_xwind).toContain("G25");
  });

  it('flags thunderstorms in wxString', () => {
    const wx = {
      metars: [{
        icaoId: "KATL",
        clouds: [{ cover: "BKN", base: 3000 }],
        visib: "5",
        wspd: 10,
        wgst: 0,
        wdir: 180,
        wxString: "+TSRA",
        rawOb: "KATL +TSRA",
      }],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.flags.wx_ts).toBe(true);
    expect(result.reasons.wx_ts).toContain("KATL");
    expect(result.reasons.wx_ts).toContain("thunderstorm");
  });

  it('flags wind shear from raw METAR', () => {
    const wx = {
      metars: [{
        icaoId: "KLAX",
        clouds: [],
        visib: "10+",
        wspd: 8,
        wgst: 0,
        wdir: 250,
        rawOb: "KLAX 25008KT WS020/18040KT",
      }],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.flags.wx_wind_shear).toBe(true);
  });

  it('does not flag VFR conditions', () => {
    const wx = {
      metars: [{
        icaoId: "KLAX",
        clouds: [{ cover: "FEW", base: 10000 }],
        visib: "10+",
        wspd: 5,
        wgst: 0,
        wdir: 250,
        rawOb: "KLAX FEW100 10SM",
      }],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.flags.wx_ceiling).toBeUndefined();
    expect(result.flags.wx_vis).toBeUndefined();
    expect(result.flags.wx_xwind).toBeUndefined();
    expect(result.flags.wx_ts).toBeUndefined();
  });

  it('generates station summaries for each METAR', () => {
    const wx = {
      metars: [
        { icaoId: "KJFK", clouds: [], visib: "10+", wspd: 5, wgst: 0, wdir: 180, rawOb: "", temp: 15, dewp: 10 },
        { icaoId: "KLAX", clouds: [], visib: "10+", wspd: 3, wgst: 0, wdir: 270, rawOb: "", temp: 22, dewp: 14 },
      ],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.stationSummaries).toHaveLength(2);
    expect(result.stationSummaries[0].station).toBe("KJFK");
    expect(result.stationSummaries[1].station).toBe("KLAX");
  });

  it('assigns correct flight rules categories', () => {
    // LIFR: ceiling < 200 or vis < 0.5
    const lifr = analyzeWeather({
      metars: [{ icaoId: "X", clouds: [{ cover: "OVC", base: 100 }], visib: "10+", wspd: 0, rawOb: "" }],
      tafs: [],
    });
    expect(lifr.stationSummaries[0].flight_rules).toBe("LIFR");

    // IFR: ceiling < 500 or vis < 1
    const ifr = analyzeWeather({
      metars: [{ icaoId: "X", clouds: [{ cover: "OVC", base: 400 }], visib: "10+", wspd: 0, rawOb: "" }],
      tafs: [],
    });
    expect(ifr.stationSummaries[0].flight_rules).toBe("IFR");

    // MVFR: ceiling < 1000 or vis < 3
    const mvfr = analyzeWeather({
      metars: [{ icaoId: "X", clouds: [{ cover: "BKN", base: 800 }], visib: "10+", wspd: 0, rawOb: "" }],
      tafs: [],
    });
    expect(mvfr.stationSummaries[0].flight_rules).toBe("MVFR");

    // VFR: everything above thresholds
    const vfr = analyzeWeather({
      metars: [{ icaoId: "X", clouds: [{ cover: "SCT", base: 5000 }], visib: "10+", wspd: 0, rawOb: "" }],
      tafs: [],
    });
    expect(vfr.stationSummaries[0].flight_rules).toBe("VFR");
  });

  it('includes briefing items for each METAR and TAF', () => {
    const wx = {
      metars: [{ icaoId: "KJFK", clouds: [], visib: "10+", wspd: 0, rawOb: "KJFK RAW" }],
      tafs: [{ icaoId: "KJFK", rawTAF: "TAF KJFK RAW", fcsts: [] }],
    };
    const result = analyzeWeather(wx);
    expect(result.briefing).toHaveLength(2);
    expect(result.briefing[0].type).toBe("METAR");
    expect(result.briefing[1].type).toBe("TAF");
  });

  it('defaults station to "??" when icaoId is missing', () => {
    const wx = {
      metars: [{ clouds: [], visib: "10+", wspd: 0, rawOb: "" }],
      tafs: [],
    };
    const result = analyzeWeather(wx);
    expect(result.stationSummaries[0].station).toBe("??");
  });
});

// ── DEFAULT_RISK_LEVELS ──────────────────────────────────────────────────

describe('DEFAULT_RISK_LEVELS', () => {
  it('has exactly four risk levels', () => {
    expect(Object.keys(DEFAULT_RISK_LEVELS)).toEqual(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']);
  });

  it('LOW covers scores 0-15', () => {
    expect(DEFAULT_RISK_LEVELS.LOW.min).toBe(0);
    expect(DEFAULT_RISK_LEVELS.LOW.max).toBe(15);
  });

  it('MODERATE covers scores 16-30', () => {
    expect(DEFAULT_RISK_LEVELS.MODERATE.min).toBe(16);
    expect(DEFAULT_RISK_LEVELS.MODERATE.max).toBe(30);
  });

  it('HIGH covers scores 31-45', () => {
    expect(DEFAULT_RISK_LEVELS.HIGH.min).toBe(31);
    expect(DEFAULT_RISK_LEVELS.HIGH.max).toBe(45);
  });

  it('CRITICAL covers scores 46-100', () => {
    expect(DEFAULT_RISK_LEVELS.CRITICAL.min).toBe(46);
    expect(DEFAULT_RISK_LEVELS.CRITICAL.max).toBe(100);
  });

  it('risk ranges are contiguous with no gaps', () => {
    expect(DEFAULT_RISK_LEVELS.MODERATE.min).toBe(DEFAULT_RISK_LEVELS.LOW.max + 1);
    expect(DEFAULT_RISK_LEVELS.HIGH.min).toBe(DEFAULT_RISK_LEVELS.MODERATE.max + 1);
    expect(DEFAULT_RISK_LEVELS.CRITICAL.min).toBe(DEFAULT_RISK_LEVELS.HIGH.max + 1);
  });

  it('LOW and MODERATE do not require approval', () => {
    expect(DEFAULT_RISK_LEVELS.LOW.approval_mode).toBe("none");
    expect(DEFAULT_RISK_LEVELS.MODERATE.approval_mode).toBe("none");
  });

  it('HIGH and CRITICAL require approval', () => {
    expect(DEFAULT_RISK_LEVELS.HIGH.approval_mode).toBe("required");
    expect(DEFAULT_RISK_LEVELS.CRITICAL.approval_mode).toBe("required");
  });

  it('each level has a label, color, bg, border, and action', () => {
    for (const [key, level] of Object.entries(DEFAULT_RISK_LEVELS)) {
      expect(level).toHaveProperty('label');
      expect(level).toHaveProperty('color');
      expect(level).toHaveProperty('bg');
      expect(level).toHaveProperty('border');
      expect(level).toHaveProperty('action');
      expect(typeof level.label).toBe('string');
      expect(typeof level.color).toBe('string');
      expect(typeof level.action).toBe('string');
    }
  });
});
