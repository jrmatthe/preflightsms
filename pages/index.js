import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { supabase, signIn, signUp, signOut, getSession, getProfile, submitFRAT, fetchFRATs, deleteFRAT, createFlight, fetchFlights, updateFlightStatus, subscribeToFlights, submitReport, fetchReports, updateReport, createHazard, fetchHazards, updateHazard, createAction, fetchActions, updateAction, fetchOrgProfiles, updateProfileRole, createPolicy, fetchPolicies, acknowledgePolicy, createTrainingRequirement, fetchTrainingRequirements, createTrainingRecord, fetchTrainingRecords, uploadOrgLogo } from "../lib/supabase";
import { initOfflineQueue, enqueue, getQueueCount, flushQueue } from "../lib/offlineQueue";
const DashboardCharts = dynamic(() => import("../components/DashboardCharts"), { ssr: false });
const SafetyReporting = dynamic(() => import("../components/SafetyReporting"), { ssr: false });
const HazardRegister = dynamic(() => import("../components/HazardRegister"), { ssr: false });
const CorrectiveActions = dynamic(() => import("../components/CorrectiveActions"), { ssr: false });
const AdminPanel = dynamic(() => import("../components/AdminPanel"), { ssr: false });
const PolicyTraining = dynamic(() => import("../components/PolicyTraining"), { ssr: false });

const COMPANY_NAME = "PVTAIR";
const ADMIN_PASSWORD = "pvtair2026";
const LOGO_URL = "/logo.png";

const BLACK = "#000000";
const NEAR_BLACK = "#0A0A0A";
const DARK = "#111111";
const CARD = "#161616";
const BORDER = "#232323";
const LIGHT_BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const SUBTLE = "#444444";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const RISK_LEVELS = {
  LOW: { label: "LOW RISK", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", min: 0, max: 15, action: "Flight authorized — standard procedures" },
  MODERATE: { label: "MODERATE RISK", color: YELLOW, bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", min: 16, max: 30, action: "Enhanced awareness — brief crew on elevated risk factors" },
  HIGH: { label: "HIGH RISK", color: AMBER, bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", min: 31, max: 45, action: "Requires management approval before departure" },
  CRITICAL: { label: "CRITICAL RISK", color: RED, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", min: 46, max: 100, action: "Flight should not depart without risk mitigation and executive approval" },
};
const AIRCRAFT_TYPES = ["PC-12", "King Air"];
const RISK_CATEGORIES = [
  { id: "weather", name: "Weather", icon: "", factors: [
    { id: "wx_ceiling", label: "Ceiling < 1000' AGL at departure or destination", score: 4 },
    { id: "wx_vis", label: "Visibility < 3 SM at departure or destination", score: 4 },
    { id: "wx_xwind", label: "Crosswind > 15 kts (or > 50% of max demonstrated)", score: 3 },
    { id: "wx_ts", label: "Thunderstorms forecast along route or at terminals", score: 5 },
    { id: "wx_ice", label: "Known or forecast icing conditions", score: 4 },
    { id: "wx_turb", label: "Moderate or greater turbulence forecast", score: 3 },
    { id: "wx_wind_shear", label: "Wind shear advisories or PIREPs", score: 5 },
    { id: "wx_mountain", label: "Mountain obscuration or high DA affecting performance", score: 4 },
  ]},
  { id: "pilot", name: "Pilot / Crew", icon: "", factors: [
    { id: "plt_fatigue", label: "Crew rest < 10 hours or significant fatigue factors", score: 5 },
    { id: "plt_recency", label: "PIC < 3 flights in aircraft type in last 30 days", score: 3 },
    { id: "plt_new_crew", label: "First time flying together as a crew pairing", score: 2 },
    { id: "plt_stress", label: "Significant personal stressors affecting crew", score: 4 },
    { id: "plt_duty", label: "Approaching max duty time limitations", score: 3 },
    { id: "plt_unfam_apt", label: "PIC unfamiliar with departure or destination airport", score: 3 },
  ]},
  { id: "aircraft", name: "Aircraft", icon: "", factors: [
    { id: "ac_mel", label: "Operating with MEL items", score: 3 },
    { id: "ac_mx_defer", label: "Deferred maintenance items", score: 3 },
    { id: "ac_recent_mx", label: "Aircraft recently out of major maintenance", score: 2 },
    { id: "ac_perf_limit", label: "Operating near weight/performance limits", score: 4 },
    { id: "ac_known_issue", label: "Known recurring squawk or system anomaly", score: 3 },
  ]},
  { id: "environment", name: "Environment", icon: "🌍", factors: [
    { id: "env_night", label: "Night operations", score: 2 },
    { id: "env_terrain", label: "Mountainous terrain along route", score: 3 },
    { id: "env_unfam_airspace", label: "Complex or unfamiliar airspace", score: 2 },
    { id: "env_short_runway", label: "Runway length < 4000' or contaminated surface", score: 4 },
    { id: "env_remote", label: "Limited alternate airports available", score: 3 },
    { id: "env_notams", label: "Significant NOTAMs affecting operation", score: 2 },
  ]},
  { id: "operational", name: "Operational", icon: "", factors: [
    { id: "ops_pax_pressure", label: "Significant schedule pressure from passengers/client", score: 3 },
    { id: "ops_time_pressure", label: "Tight schedule with minimal buffer", score: 3 },
    { id: "ops_vip", label: "High-profile passengers or sensitive mission", score: 2 },
    { id: "ops_multi_leg", label: "3+ legs in a single duty period", score: 3 },
    { id: "ops_unfam_mission", label: "Unusual mission profile or first-time operation type", score: 3 },
    { id: "ops_hazmat", label: "Hazardous materials on board", score: 2 },
  ]},
];

function getRiskLevel(s) { if (s <= 15) return RISK_LEVELS.LOW; if (s <= 30) return RISK_LEVELS.MODERATE; if (s <= 45) return RISK_LEVELS.HIGH; return RISK_LEVELS.CRITICAL; }
function formatDateTime(d) { return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function generateId() { return `FRAT-${Date.now().toString(36).toUpperCase()}`; }
function downloadBlob(c, t, f) { const b = new Blob([c], { type: t }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = f; a.click(); URL.revokeObjectURL(u); }

const inp = { width: "100%", maxWidth: "100%", padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, background: BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };

// ── TIME UTILITIES ──────────────────────────────────────────────
// Pilots enter times in Spokane local (Pacific Time). App converts to UTC for TAF matching.
function parseLocalTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const t = timeStr.replace(/[^0-9]/g, "").padStart(4, "0");
  const hh = parseInt(t.slice(0, 2), 10);
  const mm = parseInt(t.slice(2, 4), 10);
  if (isNaN(hh) || isNaN(mm) || hh > 23 || mm > 59) return null;
  // Build a date string in Pacific time and let the browser convert to UTC
  const localStr = `${dateStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00`;
  // Use Intl to get the UTC offset for America/Los_Angeles on this date
  try {
    const opts = { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false, timeZoneName: "shortOffset" };
    const fmt = new Intl.DateTimeFormat("en-US", opts);
    // Create a temp date at noon to determine offset for this date
    const tempDate = new Date(`${dateStr}T12:00:00Z`);
    const parts = fmt.formatToParts(tempDate);
    const tzPart = parts.find(p => p.type === "timeZoneName");
    // Parse offset like "GMT-8" or "GMT-7"
    let offsetHours = -8; // default PST
    if (tzPart && tzPart.value) {
      const match = tzPart.value.match(/GMT([+-]?\d+)/);
      if (match) offsetHours = parseInt(match[1], 10);
    }
    // Convert local time to UTC
    const localDate = new Date(`${dateStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00Z`);
    return new Date(localDate.getTime() - offsetHours * 3600000);
  } catch {
    // Fallback: assume PST (UTC-8)
    const localDate = new Date(`${dateStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00Z`);
    return new Date(localDate.getTime() + 8 * 3600000);
  }
}

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

function calcArrivalTime(dateStr, etdStr, eteStr) {
  const dep = parseLocalTime(dateStr, etdStr);
  if (!dep) return null;
  const mins = parseETE(eteStr);
  if (!mins) return null;
  return new Date(dep.getTime() + mins * 60000);
}

function formatZulu(d) {
  if (!d) return "";
  return `${String(d.getUTCHours()).padStart(2,"0")}${String(d.getUTCMinutes()).padStart(2,"0")}Z`;
}

function formatLocal(d) {
  if (!d) return "";
  try {
    return d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", "");
  } catch { return ""; }
}

// ── WEATHER ENGINE ──────────────────────────────────────────────
async function fetchWeather(dep, dest, cruiseAlt) {
  const ids = [dep, dest].filter(Boolean).join(",");
  if (!ids) return null;
  const altFt = parseCruiseAlt(cruiseAlt);
  const r = await fetch(`/api/weather?ids=${encodeURIComponent(ids)}&cruiseAlt=${encodeURIComponent(cruiseAlt || "")}`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  const data = await r.json();
  data.altFt = altFt;
  return data;
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

function analyzeWeather(wx) {
  if (!wx) return { flags: {}, reasons: {}, briefing: null, stationSummaries: [] };
  const flags = {};
  const reasons = {};
  const briefItems = [];
  const stationSummaries = [];
  const aptCoords = [];

  const depTimeZ = wx.depTimeZ; // Date object or null
  const arrTimeZ = wx.arrTimeZ; // Date object or null
  const ids = (wx.metars || []).map(m => m.icaoId).filter(Boolean);
  const depId = ids[0] || null;
  const destId = ids[1] || ids[0] || null;

  // Helper: find TAF period covering a target time for a station
  function findTafPeriod(tafs, stationId, targetTime) {
    if (!targetTime) return null;
    const taf = tafs.find(t => (t.icaoId || "").toUpperCase() === stationId.toUpperCase());
    if (!taf || !taf.fcsts) return null;
    const ts = targetTime.getTime() / 1000;
    // Find the period that covers the target time
    for (let i = taf.fcsts.length - 1; i >= 0; i--) {
      const f = taf.fcsts[i];
      const from = f.timeFrom || 0;
      const to = f.timeTo || 0;
      if (ts >= from && ts <= to) return { ...f, station: stationId, periodLabel: "TAF" };
    }
    // Fallback: return last period
    return taf.fcsts.length > 0 ? { ...taf.fcsts[taf.fcsts.length - 1], station: stationId, periodLabel: "TAF" } : null;
  }

  // Helper: check if METAR is current for a target time (within 90 min)
  function isMetarCurrent(metar, targetTime) {
    if (!targetTime || !metar.obsTime) return true; // no time info = assume current
    const obsTs = metar.obsTime * 1000;
    const targetTs = targetTime.getTime();
    return Math.abs(targetTs - obsTs) < 90 * 60000;
  }

  // Analyze a weather period (METAR or TAF) and flag risks
  function analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, label) {
    if (ceiling < 1000) { flags.wx_ceiling = true; reasons.wx_ceiling = (reasons.wx_ceiling || "") + `${station} ${label} ceiling ${ceiling}' AGL. `; }
    if (vis < 3) { flags.wx_vis = true; reasons.wx_vis = (reasons.wx_vis || "") + `${station} ${label} vis ${vis} SM. `; }
    if (wspd > 15 || wgst > 15) { flags.wx_xwind = true; reasons.wx_xwind = (reasons.wx_xwind || "") + `${station} ${label} wind ${wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt. `; }
    if (wxStr.includes("TS")) { flags.wx_ts = true; reasons.wx_ts = (reasons.wx_ts || "") + `${station} ${label} thunderstorm. `; }
  }

  // Process METARs — always show current conditions
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

    // Determine relevant time for this station
    const targetTime = (station === depId) ? depTimeZ : (station === destId) ? arrTimeZ : null;
    if (!targetTime || isMetarCurrent(m, targetTime)) {
      analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, "METAR");
    }
    if (raw.includes("WS") || raw.toUpperCase().includes("WIND SHEAR")) { flags.wx_wind_shear = true; reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} wind shear. `; }
  }

  // Process TAFs — find period covering ETD (departure) or ETA (destination)
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
      // No target time or no match — analyze worst period (original behavior)
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

  const isNearRoute = (item) => {
    if (aptCoords.length === 0) return true;
    // Check direct lat/lon
    if (item.lat && item.lon) return aptCoords.some(a => haversineNm(a.lat, a.lon, item.lat, item.lon) < 200);
    // Check various coordinate field names used by AWC
    const coords = item.coords || (item.geometry && item.geometry.coordinates) || item.geom?.coordinates;
    if (coords && Array.isArray(coords)) { const flat = flattenCoords(coords); if (flat.length > 0) return flat.some(([lon, lat]) => aptCoords.some(a => haversineNm(a.lat, a.lon, lat, lon) < 200)); }
    // If no coordinates found at all, include it (better to show extra than miss something)
    return true;
  };

  const altFt = wx.altFt || 0;
  console.log("[WX] SIGMETs received:", (wx.sigmets || []).length, "G-AIRMETs received:", (wx.gairmets || []).length);
  for (const s of (Array.isArray(wx.sigmets) ? wx.sigmets : [])) {
    if (!isNearRoute(s)) continue;
    const haz = (s.hazard || "").toUpperCase(); const raw = s.rawAirSigmet || s.rawText || "";
    const hazLabel = haz.includes("CONV") ? "Convective SIGMET" : "SIGMET";
    if (raw) briefItems.push({ station: "AREA", type: hazLabel, raw });
    stationSummaries.push({ station: hazLabel.toUpperCase(), type: hazLabel, summary: raw.slice(0, 120) + (raw.length > 120 ? "..." : ""), flight_rules: haz.includes("CONV") ? "IFR" : "MVFR" });
    if ((haz.includes("TURB") || raw.includes("TURB")) && !flags.wx_turb) { const lo = (s.altitudeLow1||0)*100; const hi = (s.altitudeHi1||999)*100; if (!altFt||(altFt>=lo&&altFt<=hi)) { flags.wx_turb = true; reasons.wx_turb = `SIGMET turbulence FL${lo/100}-FL${hi/100}.`; } }
    if ((haz.includes("ICE")||raw.includes("ICING")) && !flags.wx_ice) { const lo = (s.altitudeLow1||0)*100; const hi = (s.altitudeHi1||999)*100; if (!altFt||(altFt>=lo&&altFt<=hi)) { flags.wx_ice = true; reasons.wx_ice = `SIGMET icing FL${lo/100}-FL${hi/100}.`; } }
    if (haz.includes("CONV") && !flags.wx_ts) { flags.wx_ts = true; reasons.wx_ts = (reasons.wx_ts||"") + " Convective SIGMET."; }
    if (haz.includes("MT_OBSC") && !flags.wx_mountain) { flags.wx_mountain = true; reasons.wx_mountain = "SIGMET mountain obscuration."; }
    if (haz.includes("IFR") && !flags.wx_ceiling) { flags.wx_ceiling = true; reasons.wx_ceiling = (reasons.wx_ceiling||"") + " IFR SIGMET."; }
  }

  for (const g of (Array.isArray(wx.gairmets) ? wx.gairmets : [])) {
    if (!isNearRoute(g)) continue;
    const haz = (g.hazard || "").toUpperCase();
    const hazType = haz.includes("TURB") ? "Turbulence" : haz.includes("ICE") ? "Icing" : haz.includes("IFR") ? "IFR" : haz.includes("MT_OBSC") ? "Mtn Obscur" : haz;
    stationSummaries.push({ station: "G-AIRMET", type: `G-AIRMET ${hazType}`, summary: `${hazType} FL${(g.altitudeLow||0)}-FL${(g.altitudeHi||999)}`, flight_rules: "MVFR" });
    briefItems.push({ station: "AREA", type: `G-AIRMET (${hazType})`, raw: `${hazType} from FL${(g.altitudeLow||0)*100} to FL${(g.altitudeHi||999)*100}` });
    if (haz.includes("TURB") && !flags.wx_turb) { const lo = (g.altitudeLow||0)*100; const hi = (g.altitudeHi||999)*100; if (!altFt||(altFt>=lo&&altFt<=hi)) { flags.wx_turb = true; reasons.wx_turb = `G-AIRMET turbulence FL${lo/100}-FL${hi/100}.`; } }
    if (haz.includes("ICE") && !flags.wx_ice) { const lo = (g.altitudeLow||0)*100; const hi = (g.altitudeHi||999)*100; if (!altFt||(altFt>=lo&&altFt<=hi)) { flags.wx_ice = true; reasons.wx_ice = `G-AIRMET icing FL${lo/100}-FL${hi/100}.`; } }
    if (haz.includes("MT_OBSC") && !flags.wx_mountain) { flags.wx_mountain = true; reasons.wx_mountain = "G-AIRMET mountain obscuration."; }
    if (haz.includes("IFR") && !flags.wx_ceiling) { flags.wx_ceiling = true; reasons.wx_ceiling = (reasons.wx_ceiling||"") + " G-AIRMET IFR."; }
  }

  return { flags, reasons, briefing: briefItems, stationSummaries };
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

// ── WEATHER BRIEFING PANEL ──────────────────────────────────────
function WeatherBriefing({ briefing, reasons, flags, stationSummaries, wxLoading, wxError }) {
  const flagCount = Object.keys(flags).length;
  const sums = stationSummaries || [];
  const frColors = { VFR: GREEN, MVFR: CYAN, IFR: RED, LIFR: "#C026D3" };

  if (wxLoading) return (
    <div style={{ ...card, padding: 16, marginBottom: 14, border: `1px solid ${CYAN}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: CYAN }}>
        <span style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>&#10227;</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Fetching weather from AviationWeather.gov...</span>
      </div></div>);
  if (wxError) return (
    <div style={{ ...card, padding: 16, marginBottom: 14, border: `1px solid ${RED}33` }}>
      <div style={{ color: RED, fontSize: 12 }}>&#9888; Weather fetch failed: {wxError}</div></div>);
  if (!briefing || briefing.length === 0) return null;

  return (
    <div style={{ ...card, padding: 16, marginBottom: 14, border: `1px solid ${flagCount > 0 ? `${AMBER}44` : `${GREEN}33`}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>
          <span style={{ marginRight: 8 }}>&#127760;</span>Weather Briefing</h3>
        <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 12, fontWeight: 700,
          background: flagCount > 0 ? "rgba(245,158,11,0.15)" : "rgba(74,222,128,0.15)",
          color: flagCount > 0 ? AMBER : GREEN, border: `1px solid ${flagCount > 0 ? AMBER : GREEN}44` }}>
          {flagCount > 0 ? `${flagCount} FACTOR${flagCount > 1 ? "S" : ""} DETECTED` : "NO FACTORS DETECTED"}</span></div>

      {sums.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {sums.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 3,
              background: NEAR_BLACK, borderRadius: 5, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 90 }}>
                <span style={{ fontWeight: 800, fontSize: 11, color: WHITE }}>{s.station}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                  background: `${frColors[s.flight_rules] || MUTED}22`,
                  color: frColors[s.flight_rules] || MUTED,
                  border: `1px solid ${frColors[s.flight_rules] || MUTED}44` }}>{s.flight_rules}</span>
                <span style={{ fontSize: 8, color: SUBTLE }}>{s.type}</span>
              </div>
              <span style={{ fontSize: 11, color: OFF_WHITE, fontFamily: "monospace", lineHeight: 1.3 }}>{s.summary}</span>
            </div>))}
        </div>)}

      {flagCount > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Flagged Risk Factors</div>
          {Object.entries(reasons).map(([fid, reason]) => (
            <div key={fid} style={{ display: "flex", gap: 8, padding: "5px 8px", marginBottom: 3, borderRadius: 5,
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span style={{ color: AMBER, fontSize: 11, flexShrink: 0 }}>&#9888;</span>
              <span style={{ color: OFF_WHITE, fontSize: 11, lineHeight: 1.4 }}>{reason.trim()}</span></div>))}
        </div>)}

      <details style={{ marginTop: 6 }}>
        <summary style={{ color: MUTED, fontSize: 10, cursor: "pointer", letterSpacing: 0.5, fontWeight: 600 }}>RAW REPORTS ({briefing.length})</summary>
        <div style={{ marginTop: 6 }}>
          {briefing.map((b, i) => (
            <div key={i} style={{ padding: "6px 8px", marginBottom: 3, background: NEAR_BLACK, borderRadius: 4, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 9, color: CYAN, fontWeight: 700, marginBottom: 2 }}>{b.station} &#8212; {b.type}</div>
              <div style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.4 }}>{b.raw}</div></div>))}</div></details>
      <div style={{ marginTop: 8, fontSize: 9, color: SUBTLE }}>Source: AviationWeather.gov &#183; Auto-suggested factors shown with &#127760; &#8212; pilot review required.</div></div>);
}

// ── COMPONENTS ──────────────────────────────────────────────────
function AdminGate({ children, isAuthed, onAuth }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(false);
  if (isAuthed) return children;
  const go = () => { if (pw === ADMIN_PASSWORD) { onAuth(true); setErr(false); } else setErr(true); };
  return (
    <div style={{ maxWidth: 380, margin: "80px auto", textAlign: "center" }}>
      <div style={{ ...card, padding: 36 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 22 }}>🔒</span></div>
        <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", marginBottom: 6, fontSize: 20 }}>Admin Access</h2>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 24 }}>Enter password to continue.</p>
        <input type="password" placeholder="Password" value={pw} onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && go()}
          style={{ ...inp, border: `1px solid ${err ? RED : BORDER}`, marginBottom: 12 }} />
        {err && <p style={{ color: RED, fontSize: 12, marginBottom: 12 }}>Incorrect password</p>}
        <button onClick={go} style={{ width: "100%", padding: "11px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.5 }}>UNLOCK</button>
      </div></div>);
}

function NavBar({ currentView, setCurrentView, isAuthed, orgLogo, orgName }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = [
    { id: "submit", label: "FRAT", icon: "✓", p: false },
    { id: "flights", label: "Flights", icon: "◎", p: false },
    { id: "reports", label: "Reports", icon: "⚠", p: false },
    { id: "hazards", label: "Hazards", icon: "△", p: false },
    { id: "actions", label: "Actions", icon: "⊘", p: false },
    { id: "policy", label: "Policy", icon: "◈", p: false },
    { id: "dashboard", label: "Dashboard", icon: "▣", p: true },
    { id: "admin", label: "Admin", icon: "⚙", p: true },
  ];
  const sideTab = (t) => (
    <button key={t.id} onClick={() => { setCurrentView(t.id); setMenuOpen(false); }}
      title={t.label}
      style={{
        width: "100%", height: 40, display: "flex", alignItems: "center", gap: 8, paddingLeft: 14,
        background: currentView === t.id ? "rgba(255,255,255,0.08)" : "transparent",
        color: currentView === t.id ? WHITE : MUTED,
        border: "none", borderLeft: currentView === t.id ? `2px solid ${WHITE}` : "2px solid transparent",
        cursor: "pointer", fontSize: 15, transition: "all 0.15s", borderRadius: 0,
        fontFamily: "inherit",
      }}>
      <span style={{ width: 20, textAlign: "center" }}>{t.icon}</span>
      <span style={{ fontSize: 11, fontWeight: currentView === t.id ? 700 : 500, letterSpacing: 0.3 }}>{t.label}</span>
    </button>);
  return (<>
    {/* Desktop sidebar */}
    <aside className="nav-sidebar" style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: 140, zIndex: 100,
      background: NEAR_BLACK, borderRight: `1px solid ${BORDER}`,
      display: "flex", flexDirection: "column", paddingTop: 12,
    }}>
      <div style={{ marginBottom: 16, padding: "0 12px", display: "flex", justifyContent: "center" }}>
        <img src={orgLogo || LOGO_URL} alt={orgName || "P"} style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 50, border: `1px solid ${BORDER}` }} onError={e => { e.target.src = LOGO_URL; }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {tabs.map(t => sideTab(t))}
      </div>
    </aside>
    {/* Mobile top bar */}
    <header className="nav-mobile-header" style={{ display: "none", background: BLACK, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100, padding: "0 16px", alignItems: "center", justifyContent: "space-between" }}>
      <img src={orgLogo || LOGO_URL} alt={orgName || "P"} style={{ height: 28, objectFit: "contain" }} onError={e => { e.target.src = LOGO_URL; }} />
      <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}
        style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: WHITE, fontSize: 18 }}>
        {menuOpen ? "\u2715" : "\u2630"}</button>
    </header>
    {menuOpen && (<div className="nav-mobile-menu" style={{ display: "none", flexDirection: "column", padding: "8px 16px", gap: 2, background: NEAR_BLACK, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 48, zIndex: 99 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => { setCurrentView(t.id); setMenuOpen(false); }}
          style={{ background: currentView === t.id ? "rgba(255,255,255,0.08)" : "transparent", color: currentView === t.id ? WHITE : MUTED, border: "none", padding: "10px 12px", cursor: "pointer", fontWeight: currentView === t.id ? 700 : 500, fontSize: 13, textAlign: "left", borderRadius: 6, fontFamily: "inherit" }}>
          {t.icon} {t.label}
        </button>))}
    </div>)}
  </>);
}

function RiskScoreGauge({ score }) {
  const l = getRiskLevel(score); const pct = Math.min((score / 75) * 100, 100);
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ position: "relative", width: 160, height: 90, margin: "0 auto" }}>
        <svg viewBox="0 0 200 110" width="160" height="90">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={BORDER} strokeWidth="14" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={l.color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${pct * 2.51} 251`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: l.color, fontFamily: "Georgia,serif" }}>{score}</div></div></div>
      <div style={{ display: "inline-block", padding: "4px 16px", borderRadius: 20, background: l.bg, border: `1px solid ${l.border}`, marginTop: 4 }}>
        <span style={{ fontWeight: 700, color: l.color, fontSize: 11, letterSpacing: 1.5 }}>{l.label}</span></div>
      <div style={{ marginTop: 6, color: MUTED, fontSize: 11, maxWidth: 260, margin: "6px auto 0", lineHeight: 1.4 }}>{l.action}</div></div>);
}

function FRATForm({ onSubmit, onNavigate }) {
  const [fi, setFi] = useState({ pilot: "", aircraft: "PC-12", tailNumber: "", departure: "", destination: "", cruiseAlt: "", date: new Date().toISOString().slice(0, 10), etd: "", ete: "", fuelLbs: "", numCrew: "1", numPax: "", remarks: "" });
  const [checked, setChecked] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [wxData, setWxData] = useState(null);
  const [wxAnalysis, setWxAnalysis] = useState({ flags: {}, reasons: {}, briefing: null });
  const [wxLoading, setWxLoading] = useState(false);
  const [wxError, setWxError] = useState(null);
  const [autoSuggested, setAutoSuggested] = useState({});
  const fetchTimer = useRef(null);

  const score = useMemo(() => { let s = 0; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { if (checked[f.id]) s += f.score; })); return s; }, [checked]);
  const toggle = id => {
    setChecked(p => ({ ...p, [id]: !p[id] }));
    if (autoSuggested[id]) setAutoSuggested(p => { const n = { ...p }; delete n[id]; return n; });
  };

  // Auto-fetch weather when airports or altitude change
  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    const dep = fi.departure.trim().toUpperCase();
    const dest = fi.destination.trim().toUpperCase();
    if (dep.length < 3 && dest.length < 3) {
      setWxData(null);
      setWxAnalysis({ flags: {}, reasons: {}, briefing: null });
      setWxError(null);
      // Clear auto-suggested items
      setChecked(p => { const n = { ...p }; Object.keys(autoSuggested).forEach(k => { delete n[k]; }); return n; });
      setAutoSuggested({});
      return;
    }
    fetchTimer.current = setTimeout(async () => {
      setWxLoading(true); setWxError(null);
      try {
        const data = await fetchWeather(dep, dest, fi.cruiseAlt, fi.date, fi.etd, fi.ete);
        if (!data || (data.metars.length === 0 && data.tafs.length === 0)) {
          setWxError("No data returned — verify ICAO codes");
          setWxData(null);
          setWxAnalysis({ flags: {}, reasons: {}, briefing: null });
        } else {
          setWxData(data);
          data.depTimeZ = parseLocalTime(fi.date, fi.etd);
          data.arrTimeZ = calcArrivalTime(fi.date, fi.etd, fi.ete);
          const analysis = analyzeWeather(data);
          setWxAnalysis(analysis);
          // Auto-check flagged items, track which were auto-suggested
          setChecked(prev => {
            const next = { ...prev };
            // Remove previously auto-suggested that are no longer flagged
            Object.keys(autoSuggested).forEach(k => { if (!analysis.flags[k]) delete next[k]; });
            // Add newly flagged
            Object.keys(analysis.flags).forEach(k => { next[k] = true; });
            return next;
          });
          setAutoSuggested(analysis.flags);
        }
      } catch (e) {
        setWxError(e.message || "Network error");
      }
      setWxLoading(false);
    }, 1200);
    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, [fi.departure, fi.destination, fi.cruiseAlt, fi.etd, fi.ete, fi.date]);

  const handleSubmit = () => {
    if (!fi.pilot || !fi.departure || !fi.destination) { alert("Please fill in pilot name, departure, and destination."); return; }
    const eta = calcArrivalTime(fi.date, fi.etd, fi.ete);
    onSubmit({ id: generateId(), ...fi, eta: eta ? eta.toISOString() : "", score, riskLevel: getRiskLevel(score).label, factors: Object.keys(checked).filter(k => checked[k]), timestamp: new Date().toISOString(),
      wxBriefing: wxAnalysis.briefing ? wxAnalysis.briefing.map(b => b.raw).join(" | ") : "" });
    if (onNavigate) onNavigate("flights");
  };
  const reset = () => { setFi({ pilot: "", aircraft: "PC-12", tailNumber: "", departure: "", destination: "", cruiseAlt: "", date: new Date().toISOString().slice(0, 10), etd: "", ete: "", fuelLbs: "", numCrew: "1", numPax: "", remarks: "" }); setChecked({}); setSubmitted(false); setWxData(null); setWxAnalysis({ flags: {}, reasons: {}, briefing: null }); setAutoSuggested({}); };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ ...card, padding: "24px 28px 28px", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Flight Information</div>
        <div className="flight-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, minWidth: 0 }}>
          {[{ key: "pilot", label: "Pilot in Command", placeholder: "Full name", type: "text" },
            { key: "aircraft", label: "Aircraft Type", type: "select" },
            { key: "tailNumber", label: "Tail Number", placeholder: "e.g. N123AB", type: "text", upper: true },
            { key: "departure", label: "Departure (ICAO)", placeholder: "e.g. KSFF", type: "text", upper: true },
            { key: "destination", label: "Destination (ICAO)", placeholder: "e.g. KBOI", type: "text", upper: true },
            { key: "cruiseAlt", label: "Cruise Altitude", placeholder: "e.g. FL180 or 12000", type: "text" },
            { key: "date", label: "Flight Date", type: "date" },
            { key: "etd", label: "Est. Departure (Local)", placeholder: "e.g. 1430", type: "text" },
            { key: "ete", label: "Est. Time Enroute", placeholder: "e.g. 1:30, 45, or 0:30", type: "text" },
            { key: "fuelLbs", label: "Fuel Onboard (lbs)", placeholder: "e.g. 2400", type: "text" },
            { key: "numCrew", label: "Number of Crew", placeholder: "e.g. 2", type: "text" },
            { key: "numPax", label: "Number of Passengers", placeholder: "e.g. 4", type: "text" },
          ].map(f => (
            <div key={f.key} style={{ minWidth: 0, overflow: "hidden" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</label>
              {f.type === "select" ? (
                <select value={fi[f.key]} onChange={e => setFi(p => ({ ...p, [f.key]: e.target.value }))} style={inp}>
                  {AIRCRAFT_TYPES.map(a => <option key={a}>{a}</option>)}</select>
              ) : (<input type={f.type === "date" ? "date" : "text"} placeholder={f.placeholder} value={fi[f.key]}
                onChange={e => { let v = f.upper ? e.target.value.toUpperCase() : e.target.value; setFi(p => ({ ...p, [f.key]: v })); }}
                onBlur={e => { if (f.key === "tailNumber" && fi.tailNumber && !fi.tailNumber.startsWith("N")) { setFi(p => ({ ...p, tailNumber: "N" + p.tailNumber })); } }} style={inp} />)}
            </div>))}
        </div>
      </div>

      <WeatherBriefing briefing={wxAnalysis.briefing} reasons={wxAnalysis.reasons} flags={wxAnalysis.flags} stationSummaries={wxAnalysis.stationSummaries} wxLoading={wxLoading} wxError={wxError} />

      <div className="frat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>Risk Categories</div>
          {RISK_CATEGORIES.map(cat => { const catScore = cat.factors.reduce((s, f) => s + (checked[f.id] ? f.score : 0), 0); return (
            <div key={cat.id} style={{ ...card, padding: "18px 22px", marginBottom: 14, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, color: WHITE, fontSize: 15, fontWeight: 700 }}>{cat.name}</h3>
                {catScore > 0 && <span style={{ fontWeight: 700, fontSize: 14, color: GREEN }}>+{catScore}</span>}
              </div>
              {cat.factors.map(f => { const ic = !!checked[f.id]; const isAuto = !!autoSuggested[f.id]; const rl = getRiskLevel(f.score > 4 ? 46 : f.score > 3 ? 31 : 16); return (
                <div key={f.id} onClick={() => toggle(f.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4, borderRadius: 6, cursor: "pointer",
                  background: ic ? (isAuto ? "rgba(34,211,238,0.06)" : rl.bg) : "rgba(255,255,255,0.02)",
                  border: `1px solid ${ic ? (isAuto ? "rgba(34,211,238,0.3)" : rl.border) : BORDER}`, transition: "all 0.15s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${ic ? (isAuto ? CYAN : WHITE) : LIGHT_BORDER}`, background: ic ? (isAuto ? CYAN : WHITE) : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {ic && <span style={{ color: BLACK, fontSize: 12, fontWeight: 700 }}>✓</span>}</div>
                  <span style={{ flex: 1, fontSize: 12, color: OFF_WHITE, lineHeight: 1.3 }}>
                    {isAuto && <span title="Auto-detected from weather data" style={{ marginRight: 4, color: CYAN, fontSize: 10 }}>AUTO</span>}
                    {f.label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 10, color: ic ? (isAuto ? CYAN : rl.color) : SUBTLE, minWidth: 22, textAlign: "right" }}>+{f.score}</span>
                </div>); })}</div>); })}
          <div style={{ ...card, padding: "18px 22px", marginBottom: 14, borderRadius: 10 }}>
            <h3 style={{ margin: "0 0 10px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>Remarks / Mitigations</h3>
            <textarea placeholder="Note any mitigations applied..." value={fi.remarks} onChange={e => setFi(p => ({ ...p, remarks: e.target.value }))}
              style={{ width: "100%", minHeight: 60, padding: 10, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", color: OFF_WHITE, background: NEAR_BLACK }} /></div>
        </div>

        <div className="score-panel-desktop" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
          <div style={{ ...card, padding: 24, border: `1px solid ${getRiskLevel(score).border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "center", marginBottom: 8 }}>Risk Score</div>
            <div style={{ fontSize: 56, fontWeight: 800, color: getRiskLevel(score).color, textAlign: "center", lineHeight: 1, marginBottom: 12 }}>{score}</div>
            {/* Progress bar */}
            <div style={{ position: "relative", height: 6, background: BORDER, borderRadius: 3, marginBottom: 4 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min((score / 40) * 100, 100)}%`, background: getRiskLevel(score).color, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: SUBTLE, marginBottom: 14 }}>
              <span>0</span><span>15</span><span>25</span><span>40</span>
            </div>
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: getRiskLevel(score).color, marginBottom: 16 }}>✓ {getRiskLevel(score).label.replace(" RISK", "")} — {getRiskLevel(score).label.includes("LOW") ? "Low Risk" : getRiskLevel(score).label.includes("MODERATE") ? "Moderate Risk" : getRiskLevel(score).label.includes("HIGH") ? "High Risk" : "Critical Risk"}</div>
            {/* Category breakdown */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 16 }}>
              {RISK_CATEGORIES.map(cat => { const catScore = cat.factors.reduce((s, f) => s + (checked[f.id] ? f.score : 0), 0); return (
                <div key={cat.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                  <span style={{ fontSize: 12, color: OFF_WHITE }}>{cat.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: catScore > 0 ? GREEN : SUBTLE }}>+{catScore}</span>
                </div>); })}
            </div>
            <button onClick={handleSubmit} style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.5, textTransform: "uppercase" }}>Submit FRAT</button>
          </div>
        </div></div>

      <div className="score-panel-mobile" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: BLACK, borderTop: `1px solid ${getRiskLevel(score).border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: getRiskLevel(score).bg, border: `1px solid ${getRiskLevel(score).border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 800, color: getRiskLevel(score).color, fontSize: 16, fontFamily: "Georgia,serif" }}>{score}</span></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: getRiskLevel(score).color, fontSize: 11 }}>{getRiskLevel(score).label}</div>
              <div style={{ color: MUTED, fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getRiskLevel(score).action}</div></div></div>
          <button onClick={handleSubmit} style={{ padding: "10px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>SUBMIT</button></div></div>
    </div>);
}

function HistoryView({ records, onDelete }) {
  const [filter, setFilter] = useState("ALL"); const [search, setSearch] = useState("");
  const filtered = useMemo(() => records.filter(r => { if (filter !== "ALL" && r.riskLevel !== filter) return false; if (search && !`${r.pilot} ${r.departure} ${r.destination} ${r.aircraft} ${r.id}`.toLowerCase().includes(search.toLowerCase())) return false; return true; }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [records, filter, search]);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search pilot, airport, ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, flex: 1, minWidth: 180, fontSize: 13 }} />
        {["ALL", ...Object.values(RISK_LEVELS).map(l => l.label)].map(l => (
          <button key={l} onClick={() => setFilter(l)} style={{ padding: "6px 11px", borderRadius: 16, border: `1px solid ${filter === l ? WHITE : BORDER}`, background: filter === l ? WHITE : CARD, color: filter === l ? BLACK : MUTED, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
            {l === "ALL" ? "All" : l.split(" ")[0]}</button>))}</div>
      {filtered.length === 0 ? (<div style={{ textAlign: "center", padding: 60, color: MUTED }}><div style={{ fontSize: 14 }}>No FRAT records found</div></div>)
        : filtered.map(r => { const l = getRiskLevel(r.score); return (
          <div key={r.id} style={{ ...card, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: l.bg, border: `1px solid ${l.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 800, color: l.color, fontSize: 16, fontFamily: "Georgia,serif" }}>{r.score}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{r.departure} → {r.destination}</span>
                <span style={{ background: l.bg, color: l.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${l.border}` }}>{l.label}</span>
                <span style={{ background: NEAR_BLACK, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 600 }}>{r.aircraft}</span>
                {r.cruiseAlt && <span style={{ background: NEAR_BLACK, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 600 }}>{r.cruiseAlt}</span>}</div>
              <div style={{ color: MUTED, fontSize: 10 }}>{r.pilot} · {formatDateTime(r.timestamp)} · {r.id} · {r.factors.length} factor{r.factors.length !== 1 ? "s" : ""}</div>
              {r.remarks && <div style={{ color: SUBTLE, fontSize: 10, marginTop: 2, fontStyle: "italic" }}>"{r.remarks}"</div>}</div>
            <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", color: LIGHT_BORDER, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button></div>); })}</div>);
}

function FlightBoard({ flights, onUpdateFlight }) {
  const STATUSES = {
    ACTIVE: { label: "ENROUTE", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)" },
    ARRIVED: { label: "ARRIVED", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)" },
  };
  const [filter, setFilter] = useState("ACTIVE");
  const [tick, setTick] = useState(0);
  const [airportCoords, setAirportCoords] = useState({});
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Tick every 30s to update estimated positions
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(iv); }, []);

  // Fetch airport coordinates for all flights
  useEffect(() => {
    const ids = new Set();
    flights.forEach(f => { if (f.departure) ids.add(f.departure); if (f.destination) ids.add(f.destination); });
    if (ids.size === 0) return;
    const toFetch = [...ids].filter(id => !airportCoords[id]);
    if (toFetch.length === 0) return;
    fetch(`/api/airports?ids=${toFetch.join(",")}`).then(r => r.json()).then(data => {
      setAirportCoords(prev => ({ ...prev, ...data }));
    }).catch(() => {});
  }, [flights]);

  const now = Date.now();
  const recent = flights.filter(f => f.status !== "ARRIVED" || (now - new Date(f.arrivedAt || f.timestamp).getTime()) < 24 * 3600000);
  const displayed = filter === "ACTIVE" ? recent.filter(f => f.status === "ACTIVE") : filter === "ARRIVED" ? recent.filter(f => f.status === "ARRIVED") : recent;
  const activeFlights = flights.filter(f => f.status === "ACTIVE");

  const isOverdue = (f) => { if (!f.eta || f.status !== "ACTIVE") return false; return now > new Date(f.eta).getTime() + 30 * 60000; };

  // Calculate progress percentage for a flight
  const getProgress = (f) => {
    if (f.status === "ARRIVED") return 100;
    if (!f.eta || !f.timestamp) return 0;
    const start = new Date(f.timestamp).getTime();
    const end = new Date(f.eta).getTime();
    if (end <= start) return 0;
    const pct = ((now - start) / (end - start)) * 100;
    return Math.max(0, Math.min(pct, 95));
  };

  // Estimate current position along great circle route
  const getEstimatedPos = (f) => {
    const dep = airportCoords[f.departure];
    const dest = airportCoords[f.destination];
    if (!dep || !dest) return null;
    const pct = getProgress(f) / 100;
    return {
      lat: dep.lat + (dest.lat - dep.lat) * pct,
      lon: dep.lon + (dest.lon - dep.lon) * pct,
    };
  };

  // Simple SVG map of active flights
  const MapView = () => {
    if (activeFlights.length === 0) return null;
    // Gather all coordinates
    const allCoords = [];
    activeFlights.forEach(f => {
      const dep = airportCoords[f.departure]; const dest = airportCoords[f.destination];
      if (dep) allCoords.push(dep); if (dest) allCoords.push(dest);
    });
    if (allCoords.length === 0) return <div style={{ ...card, height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>Loading map...</div>;

    // Calculate bounds with padding
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    allCoords.forEach(c => { minLat = Math.min(minLat, c.lat); maxLat = Math.max(maxLat, c.lat); minLon = Math.min(minLon, c.lon); maxLon = Math.max(maxLon, c.lon); });
    const padLat = Math.max((maxLat - minLat) * 0.3, 1); const padLon = Math.max((maxLon - minLon) * 0.3, 1.5);
    minLat -= padLat; maxLat += padLat; minLon -= padLon; maxLon += padLon;
    const W = 800, H = 400;
    const toX = (lon) => ((lon - minLon) / (maxLon - minLon)) * W;
    const toY = (lat) => H - ((lat - minLat) / (maxLat - minLat)) * H;

    return (
      <div style={{ ...card, padding: 0, marginBottom: 18, overflow: "hidden", borderRadius: 10 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", background: BLACK }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(f => (<g key={f}>
            <line x1={0} y1={H * f} x2={W} y2={H * f} stroke={BORDER} strokeWidth="0.5" />
            <line x1={W * f} y1={0} x2={W * f} y2={H} stroke={BORDER} strokeWidth="0.5" />
          </g>))}
          <rect x={0} y={0} width={W} height={H} fill="none" stroke={BORDER} strokeWidth="1" />

          {activeFlights.map(f => {
            const dep = airportCoords[f.departure]; const dest = airportCoords[f.destination];
            if (!dep || !dest) return null;
            const pos = getEstimatedPos(f);
            const dx = toX(dep.lon), dy = toY(dep.lat);
            const ex = toX(dest.lon), ey = toY(dest.lat);
            // Flight direction angle for plane rotation
            const angle = Math.atan2(ex - dx, -(ey - dy)) * (180 / Math.PI);
            return (
              <g key={f.id}>
                {/* Route line */}
                <line x1={dx} y1={dy} x2={ex} y2={ey} stroke={BORDER} strokeWidth="1" strokeDasharray="4,4" />
                {/* Departure label */}
                <text x={dx} y={dy + 16} textAnchor="middle" fill={MUTED} fontSize="11" fontFamily="monospace">{f.departure}</text>
                {/* Destination label */}
                <text x={ex} y={ey + 16} textAnchor="middle" fill={MUTED} fontSize="11" fontFamily="monospace">{f.destination}</text>
                {/* Airport dots */}
                <circle cx={dx} cy={dy} r="3" fill={MUTED} />
                <circle cx={ex} cy={ey} r="3" fill={MUTED} />
                {/* Estimated position - plane icon */}
                {pos && (
                  <g transform={`translate(${toX(pos.lon)},${toY(pos.lat)}) rotate(${angle})`}>
                    <text textAnchor="middle" dominantBaseline="central" fill={WHITE} fontSize="16" fontFamily="sans-serif">&#9992;</text>
                  </g>
                )}
              </g>);
          })}
        </svg>
      </div>);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: GREEN, fontWeight: 600 }}>&#x25CF; {activeFlights.length} Active</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: activeFlights.length > 0 ? "1fr 1fr" : "1fr", gap: 20 }}>
        {/* Map */}
        {activeFlights.length > 0 && <MapView />}

        {/* Flight cards */}
        <div>
          {displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
              <div style={{ fontSize: 14, marginBottom: 6 }}>No {filter === "ACTIVE" ? "active" : ""} flights</div>
              <div style={{ fontSize: 11 }}>Submit a FRAT to create a flight</div></div>
          ) : displayed.sort((a, b) => {
            if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
          }).map(f => {
            const st = STATUSES[f.status] || STATUSES.ACTIVE;
            const overdue = isOverdue(f);
            const progress = getProgress(f);
            const statusLabel = overdue ? "OVERDUE" : f.status === "ACTIVE" ? "ENROUTE" : "ARRIVED";
            const statusColor = overdue ? RED : st.color;
            return (
              <div key={f.id} style={{ ...card, padding: "18px 22px", marginBottom: 12, borderRadius: 10, border: `1px solid ${overdue ? RED + "44" : BORDER}`, cursor: "pointer" }}
                onClick={() => setSelectedFlight(selectedFlight === f.id ? null : f.id)}>
                {/* Header: tail number + status badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: WHITE }}>{f.tailNumber || f.aircraft}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 4, color: BLACK, background: statusColor, letterSpacing: 0.5 }}>{statusLabel}</span>
                </div>
                {/* Route progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: WHITE, minWidth: 42 }}>{f.departure}</span>
                  <div style={{ flex: 1, position: "relative", height: 4, background: BORDER, borderRadius: 2 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: GREEN, borderRadius: 2, transition: "width 1s ease" }} />
                    {f.status === "ACTIVE" && <div style={{ position: "absolute", top: -4, left: `${progress}%`, width: 12, height: 12, borderRadius: "50%", background: WHITE, border: `2px solid ${GREEN}`, transform: "translateX(-6px)", transition: "left 1s ease" }} />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: WHITE, minWidth: 42, textAlign: "right" }}>{f.destination}</span>
                </div>
                {/* Flight details */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ color: MUTED, fontSize: 11 }}>
                    <span>PIC</span>{" "}<span style={{ color: OFF_WHITE }}>{f.pilot}</span>
                    {f.cruiseAlt && <><span style={{ margin: "0 6px" }}>Alt</span><span style={{ color: OFF_WHITE }}>{f.cruiseAlt}</span></>}
                  </div>
                  <div style={{ color: MUTED, fontSize: 11 }}>
                    <span>ETD/ETA</span>{" "}
                    <span style={{ color: OFF_WHITE }}>{f.etd || "—"} / {f.eta ? formatLocal(new Date(f.eta)) : "—"}</span>
                  </div>
                </div>
                {/* Expanded details */}
                {selectedFlight === f.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ color: MUTED, fontSize: 10, lineHeight: 1.8 }}>
                      {f.numCrew && <span>Crew: {f.numCrew} </span>}{f.numPax && <span>Pax: {f.numPax} </span>}{f.fuelLbs && <span>Fuel: {f.fuelLbs} lbs </span>}
                      <br />ID: {f.id} &middot; Filed {formatDateTime(f.timestamp)}
                      {f.arrivedAt && <span> &middot; Arrived {formatDateTime(f.arrivedAt)}</span>}
                    </div>
                    {f.status === "ACTIVE" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateFlight(f.id, "ARRIVED"); }}
                          style={{ flex: 1, padding: "10px 0", background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>VIEW FRAT</button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateFlight(f.id, "ARRIVED"); }}
                          style={{ flex: 1, padding: "10px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>MARK ARRIVED</button>
                      </div>)}
                  </div>
                )}
              </div>); })}
        </div>
      </div>
    </div>);
}

function ExportView({ records }) {
  const genCSV = useCallback(() => { if (!records.length) return; const h = ["FRAT_ID", "Date", "Pilot", "Aircraft", "Departure", "Destination", "CruiseAlt", "Score", "Risk_Level", "Factors_Count", "Remarks"]; const rows = records.map(r => [r.id, new Date(r.timestamp).toISOString(), r.pilot, r.aircraft, r.departure, r.destination, r.cruiseAlt || "", r.score, r.riskLevel, r.factors.length, `"${(r.remarks || "").replace(/"/g, '""')}"`]); downloadBlob([h.join(","), ...rows.map(r => r.join(","))].join("\n"), "text/csv", `PVTAIR_FRAT_Export_${new Date().toISOString().slice(0, 10)}.csv`); }, [records]);
  const genDetailed = useCallback(() => { if (!records.length) return; const ids = []; const labels = []; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { ids.push(f.id); labels.push(`${c.name}: ${f.label}`); })); const h = ["FRAT_ID", "Date", "Pilot", "Aircraft", "Departure", "Destination", "CruiseAlt", "Score", "Risk_Level", ...labels]; const rows = records.map(r => [r.id, new Date(r.timestamp).toISOString(), r.pilot, r.aircraft, r.departure, r.destination, r.cruiseAlt || "", r.score, r.riskLevel, ...ids.map(fid => r.factors.includes(fid) ? "YES" : "")]); downloadBlob([h.join(","), ...rows.map(r => r.join(","))].join("\n"), "text/csv", `PVTAIR_FRAT_Detailed_${new Date().toISOString().slice(0, 10)}.csv`); }, [records]);
  const genSummary = useCallback(() => { if (!records.length) return; const scores = records.map(r => r.score); const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1); const lc = { "LOW RISK": 0, "MODERATE RISK": 0, "HIGH RISK": 0, "CRITICAL RISK": 0 }; records.forEach(r => { lc[r.riskLevel] = (lc[r.riskLevel] || 0) + 1; }); const ff = {}; records.forEach(r => r.factors.forEach(f => { ff[f] = (ff[f] || 0) + 1; })); const tf = Object.entries(ff).sort((a, b) => b[1] - a[1]).slice(0, 10); let t = `PVTAIR FRAT SUMMARY REPORT\nGenerated: ${new Date().toLocaleString()}\n${"=".repeat(60)}\n\nTotal: ${records.length}\nAvg Score: ${avg}\nHighest: ${Math.max(...scores)}\n\nRISK DISTRIBUTION\n`; Object.entries(lc).forEach(([k, v]) => { t += `  ${k}: ${v} (${((v / records.length) * 100).toFixed(1)}%)\n`; }); t += `\nTOP RISK FACTORS\n`; tf.forEach(([id, count], i) => { let label = id; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { if (f.id === id) label = f.label; })); t += `  ${i + 1}. ${label} — ${count}x\n`; }); downloadBlob(t, "text/plain", `PVTAIR_FRAT_Summary_${new Date().toISOString().slice(0, 10)}.txt`); }, [records]);
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ ...card, padding: 26 }}>
        <h2 style={{ margin: "0 0 6px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 18 }}>Export Reports</h2>
        <p style={{ color: MUTED, fontSize: 12, margin: "0 0 22px" }}>Generate reports for SMS recordkeeping per §5.97.</p>
        {[{ title: "Summary Report", desc: "Overview with risk distribution and top hazard factors.", action: genSummary, btn: "Download .txt", icon: "📄" },
          { title: "Standard Export", desc: "All FRAT records with scores and metadata for Excel.", action: genCSV, btn: "Download CSV", icon: "📊" },
          { title: "Detailed Factor Export", desc: "Every record with individual risk factor columns.", action: genDetailed, btn: "Download CSV", icon: "🔬" }].map((r, i) => (
          <div key={i} style={{ padding: 16, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</div>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: WHITE, fontSize: 13, marginBottom: 2 }}>{r.title}</div>
              <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.3 }}>{r.desc}</div></div>
            <button onClick={r.action} disabled={!records.length} style={{ padding: "8px 14px", background: !records.length ? BORDER : WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: !records.length ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{r.btn}</button></div>))}
        <div style={{ background: NEAR_BLACK, borderRadius: 6, padding: 12, border: `1px solid ${BORDER}`, marginTop: 6 }}>
          <div style={{ fontSize: 11, color: MUTED }}><strong style={{ color: OFF_WHITE }}>§5.97 Recordkeeping:</strong> SRM records must be retained as long as controls remain relevant. Current records: <strong style={{ color: WHITE }}>{records.length}</strong></div></div></div></div>);
}

function DashboardWrapper({ records, onDelete }) {
  const [sub, setSub] = useState("analytics");
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Dashboard</div>
          <div style={{ fontSize: 11, color: MUTED }}>FRAT analytics, history, and export</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[["analytics", "Analytics"], ["history", "FRAT History"], ["export", "Export"]].map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${sub === id ? WHITE : BORDER}`,
              background: sub === id ? WHITE : "transparent", color: sub === id ? BLACK : MUTED,
              fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      {sub === "analytics" && <DashboardCharts records={records} />}
      {sub === "history" && <HistoryView records={records} onDelete={onDelete} />}
      {sub === "export" && <ExportView records={records} />}
    </div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup | join
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    const { data, error: err } = await signIn(email, password);
    if (err) { setError(err.message); setLoading(false); return; }
    onAuth(data.session);
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!orgName.trim() && mode === "signup") { setError("Organization name is required"); return; }
    setError(""); setLoading(true);
    try {
      let orgId;
      if (mode === "signup") {
        // Create new org
        const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const { data: orgData, error: orgErr } = await supabase.from("organizations").insert({ name: orgName.trim(), slug }).select().single();
        if (orgErr) { setError(orgErr.message); setLoading(false); return; }
        orgId = orgData.id;
      } else {
        // Join existing org by slug
        const { data: orgData, error: orgErr } = await supabase.from("organizations").select("id").eq("slug", joinCode.trim().toLowerCase()).single();
        if (orgErr || !orgData) { setError("Organization not found. Check your join code."); setLoading(false); return; }
        orgId = orgData.id;
      }
      const { error: signupErr } = await signUp(email, password, name.trim(), orgId);
      if (signupErr) { setError(signupErr.message); setLoading(false); return; }
      setError("Check your email to confirm your account, then log in.");
      setMode("login");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...card, padding: "32px 28px", maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 100, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} /></div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[["login", "Log In"], ["signup", "New Org"], ["join", "Join Org"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `1px solid ${mode === m ? WHITE : BORDER}`,
                background: mode === m ? WHITE : "transparent", color: mode === m ? BLACK : MUTED,
                fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{label}</button>))}</div>

        {mode !== "login" && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} /></div>)}

        {mode === "signup" && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Organization Name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. PVTAIR" style={inp} /></div>)}

        {mode === "join" && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Organization Code</label>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. pvtair" style={inp} /></div>)}

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pilot@company.com" style={inp} /></div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
            style={inp} onKeyDown={e => { if (e.key === "Enter") { mode === "login" ? handleLogin() : handleSignup(); } }} /></div>

        {error && <div style={{ color: error.includes("Check your email") ? GREEN : RED, fontSize: 11, marginBottom: 12, padding: "8px 10px", borderRadius: 6, background: error.includes("Check your email") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)" }}>{error}</div>}

        <button onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading}
          style={{ width: "100%", padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Organization" : "Join Organization"}</button>
      </div></div>);
}

export default function PVTAIRFrat() {
  const [cv, setCv] = useState("submit");
  const [records, setRecords] = useState([]);
  const [flights, setFlights] = useState([]);
  const [reports, setReports] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [actions, setActions] = useState([]);
  const [orgProfiles, setOrgProfiles] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [trainingReqs, setTrainingReqs] = useState([]);
  const [trainingRecs, setTrainingRecs] = useState([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingSync, setPendingSync] = useState(0);
  // Supabase auth state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const isOnline = !!supabase;

  // Init offline queue
  useEffect(() => {
    const refreshData = async () => {
      if (!profile) return;
      const orgId = profile.org_id;
      const { data: fl } = await fetchFlights(orgId);
      if (fl) setFlights(fl.map(f => ({
        id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
        departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
        etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs,
        numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
        status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at, cancelled: f.status === "CANCELLED",
      })));
      const { data: frats } = await fetchFRATs(orgId);
      if (frats) setRecords(frats.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs,
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, timestamp: r.created_at,
      })));
      setPendingSync(getQueueCount());
    };
    initOfflineQueue(refreshData);
    setPendingSync(getQueueCount());
    // Update pending count periodically
    const interval = setInterval(() => setPendingSync(getQueueCount()), 5000);
    return () => clearInterval(interval);
  }, [profile]);

  // ── Initialize: check session or fall back to localStorage ──
  useEffect(() => {
    if (isOnline) {
      getSession().then(({ data }) => {
        if (data.session) {
          setSession(data.session);
          getProfile().then(p => { setProfile(p); setAuthLoading(false); });
        } else {
          setAuthLoading(false);
        }
      });
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
        setSession(sess);
        if (sess) getProfile().then(p => setProfile(p));
        else { setProfile(null); setRecords([]); setFlights([]); }
      });
      return () => subscription.unsubscribe();
    } else {
      // localStorage fallback
      try { const d = localStorage.getItem("pvtair_frat_records"); if (d) setRecords(JSON.parse(d)); } catch (e) {}
      try { const f = localStorage.getItem("pvtair_flights"); if (f) setFlights(JSON.parse(f)); } catch (e) {}
    }
  }, []);

  // ── Load data from Supabase when profile is available ──
  useEffect(() => {
    if (!profile) return;
    const orgId = profile.org_id;
    fetchFRATs(orgId).then(({ data }) => {
      setRecords(data.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs,
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks,
        timestamp: r.created_at,
      })));
    });
    fetchFlights(orgId).then(({ data }) => {
      setFlights(data.map(f => ({
        id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
        departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
        etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs,
        numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
        status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at,
        cancelled: f.status === "CANCELLED",
      })));
    });
    // Subscribe to real-time flight updates
    const channel = subscribeToFlights(orgId, (payload) => {
      fetchFlights(orgId).then(({ data }) => {
        setFlights(data.map(f => ({
          id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
          departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
          etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs,
          numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
          status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at,
          cancelled: f.status === "CANCELLED",
        })));
      });
    });
    // Load reports, hazards, actions, policies, training
    fetchReports(orgId).then(({ data }) => setReports(data || []));
    fetchHazards(orgId).then(({ data }) => setHazards(data || []));
    fetchActions(orgId).then(({ data }) => setActions(data || []));
    fetchOrgProfiles(orgId).then(({ data }) => setOrgProfiles(data || []));
    fetchPolicies(orgId).then(({ data }) => setPolicies(data || []));
    fetchTrainingRequirements(orgId).then(({ data }) => setTrainingReqs(data || []));
    fetchTrainingRecords(orgId).then(({ data }) => setTrainingRecs(data || []));
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [profile]);

  // ── localStorage helpers (offline mode only) ──
  const saveLocal = useCallback(nr => { setRecords(nr); try { localStorage.setItem("pvtair_frat_records", JSON.stringify(nr)); } catch (e) {} }, []);
  const saveFlightsLocal = useCallback(nf => { setFlights(nf); try { localStorage.setItem("pvtair_flights", JSON.stringify(nf)); } catch (e) {} }, []);

  // ── Submit FRAT ──
  const onSubmit = useCallback(async entry => {
    if (isOnline && profile) {
      const { data: fratData, error: fratErr } = await submitFRAT(profile.org_id, session.user.id, entry).catch(e => ({ data: null, error: e }));
      if (fratErr) {
        // Queue for offline sync
        enqueue({ type: "frat_submit", payload: { orgId: profile.org_id, userId: session.user.id, entry } });
        setPendingSync(getQueueCount());
        // Add to local state so pilot sees it immediately
        const localFlight = { id: entry.id, pilot: entry.pilot, aircraft: entry.aircraft, tailNumber: entry.tailNumber || "", departure: entry.departure, destination: entry.destination, cruiseAlt: entry.cruiseAlt || "", etd: entry.etd || "", ete: entry.ete || "", eta: entry.eta || "", fuelLbs: entry.fuelLbs || "", numCrew: entry.numCrew || "", numPax: entry.numPax || "", score: entry.score, riskLevel: entry.riskLevel, status: "ACTIVE", timestamp: entry.timestamp, arrivedAt: null, pendingSync: true };
        setFlights(prev => [localFlight, ...prev]);
        setRecords(prev => [entry, ...prev]);
        setToast({ message: `${entry.id} saved offline — will sync when connected`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 5000);
        return;
      }
      const { error: flightErr } = await createFlight(profile.org_id, fratData.id, entry);
      if (flightErr) console.error("Flight create error:", flightErr);
      // Refresh data from server
      const { data: frats } = await fetchFRATs(profile.org_id);
      setRecords(frats.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs,
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, timestamp: r.created_at,
      })));
      const { data: fl } = await fetchFlights(profile.org_id);
      setFlights(fl.map(f => ({
        id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
        departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
        etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs,
        numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
        status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at, cancelled: f.status === "CANCELLED",
      })));
    } else {
      const nr = [entry, ...records]; saveLocal(nr);
      const flight = { id: entry.id, pilot: entry.pilot, aircraft: entry.aircraft, tailNumber: entry.tailNumber || "", departure: entry.departure, destination: entry.destination, cruiseAlt: entry.cruiseAlt || "", etd: entry.etd || "", ete: entry.ete || "", eta: entry.eta || "", fuelLbs: entry.fuelLbs || "", numCrew: entry.numCrew || "", numPax: entry.numPax || "", score: entry.score, riskLevel: entry.riskLevel, status: "ACTIVE", timestamp: entry.timestamp, arrivedAt: null };
      const nf = [flight, ...flights]; saveFlightsLocal(nf);
    }
    setToast({ message: `${entry.id} submitted — flight plan created`, level: getRiskLevel(entry.score) }); setTimeout(() => setToast(null), 4000);
  }, [records, flights, saveLocal, saveFlightsLocal, profile, session, isOnline]);

  // ── Update flight status ──
  const onUpdateFlight = useCallback(async (id, action) => {
    if (isOnline && profile) {
      const flight = flights.find(f => f.id === id);
      if (flight && flight.dbId) {
        const status = action === "CANCEL" ? "CANCELLED" : action;
        try {
          const { error } = await updateFlightStatus(flight.dbId, status);
          if (error) throw error;
          const { data: fl } = await fetchFlights(profile.org_id);
          setFlights(fl.map(f => ({
            id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
            departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
            etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs,
            numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
            status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at, cancelled: f.status === "CANCELLED",
          })));
        } catch (e) {
          // Queue for offline sync
          enqueue({ type: "flight_status", payload: { flightDbId: flight.dbId, status } });
          setPendingSync(getQueueCount());
          // Update local state immediately so pilot sees the change
          setFlights(prev => prev.map(f => {
            if (f.id !== id) return f;
            return { ...f, status, arrivedAt: (status === "ARRIVED" || status === "CANCELLED") ? new Date().toISOString() : f.arrivedAt, pendingSync: true };
          }));
          setToast({ message: `Status saved offline — will sync when connected`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 5000);
        }
      } else if (flight && !flight.dbId) {
        // Flight was created offline, queue the status update
        enqueue({ type: "flight_status", payload: { flightDbId: null, fratCode: flight.id, status: action === "CANCEL" ? "CANCELLED" : action } });
        setPendingSync(getQueueCount());
        setFlights(prev => prev.map(f => {
          if (f.id !== id) return f;
          const newStatus = action === "CANCEL" ? "CANCELLED" : action;
          return { ...f, status: newStatus, arrivedAt: new Date().toISOString(), pendingSync: true };
        }));
        setToast({ message: `Status saved offline — will sync when connected`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 5000);
      }
    } else {
      const nf = flights.map(f => {
        if (f.id !== id) return f;
        if (action === "ARRIVED") return { ...f, status: "ARRIVED", arrivedAt: new Date().toISOString() };
        if (action === "CANCEL") return { ...f, status: "ARRIVED", arrivedAt: new Date().toISOString(), cancelled: true };
        return f;
      });
      saveFlightsLocal(nf);
    }
    if (action === "ARRIVED") { setToast({ message: `${id} arrived safely`, level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: GREEN } }); }
    setTimeout(() => setToast(null), 3000);
  }, [flights, saveFlightsLocal, profile, isOnline]);

  // ── Delete FRAT ──
  const onDelete = useCallback(async id => {
    if (isOnline && profile) {
      const rec = records.find(r => r.id === id);
      if (rec && rec.dbId) await deleteFRAT(rec.dbId);
      const { data: frats } = await fetchFRATs(profile.org_id);
      setRecords(frats.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs,
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, timestamp: r.created_at,
      })));
    } else {
      saveLocal(records.filter(r => r.id !== id));
    }
  }, [records, saveLocal, profile, isOnline]);

  // ── Submit Safety Report ──
  const onSubmitReport = useCallback(async (report) => {
    if (isOnline && profile) {
      const { error } = await submitReport(profile.org_id, session.user.id, report);
      if (error) { setToast({ message: `Error: ${error.message}`, level: RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchReports(profile.org_id);
      setReports(data || []);
      setToast({ message: `${report.reportCode} submitted`, level: { bg: "rgba(34,211,238,0.15)", border: "rgba(34,211,238,0.4)", color: "#22D3EE" } }); setTimeout(() => setToast(null), 4000);
    }
  }, [profile, session, isOnline]);

  // ── Update Report Status ──
  const onReportStatusChange = useCallback(async (reportId, newStatus) => {
    if (isOnline && profile) {
      await updateReport(reportId, { status: newStatus, closed_at: newStatus === "closed" ? new Date().toISOString() : null });
      const { data } = await fetchReports(profile.org_id);
      setReports(data || []);
    }
  }, [profile, isOnline]);

  // ── Create Hazard ──
  const onCreateHazard = useCallback(async (hazard) => {
    if (isOnline && profile) {
      const { error } = await createHazard(profile.org_id, session.user.id, hazard);
      if (error) { setToast({ message: `Error: ${error.message}`, level: RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchHazards(profile.org_id);
      setHazards(data || []);
      setToast({ message: `${hazard.hazardCode} registered`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 4000);
    }
  }, [profile, session, isOnline]);

  // ── Corrective Actions ──
  const onCreateAction = useCallback(async (action) => {
    if (isOnline && profile) {
      const { error } = await createAction(profile.org_id, action);
      if (error) { setToast({ message: `Error: ${error.message}`, level: RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchActions(profile.org_id);
      setActions(data || []);
      setToast({ message: `${action.actionCode} created`, level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ADE80" } }); setTimeout(() => setToast(null), 4000);
    }
  }, [profile, isOnline]);

  const onUpdateAction = useCallback(async (actionId, updates) => {
    if (isOnline && profile) {
      await updateAction(actionId, updates);
      const { data } = await fetchActions(profile.org_id);
      setActions(data || []);
    }
  }, [profile, isOnline]);

  // ── Admin: Update Role ──
  const onUpdateRole = useCallback(async (profileId, role) => {
    if (isOnline && profile) {
      await updateProfileRole(profileId, role);
      const { data } = await fetchOrgProfiles(profile.org_id);
      setOrgProfiles(data || []);
    }
  }, [profile, isOnline]);

  // ── Policy Library ──
  const onCreatePolicy = useCallback(async (policy) => {
    if (isOnline && profile) {
      const { error } = await createPolicy(profile.org_id, session.user.id, policy);
      if (error) { setToast({ message: `Error: ${error.message}`, level: RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchPolicies(profile.org_id);
      setPolicies(data || []);
      setToast({ message: "Document added", level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ADE80" } }); setTimeout(() => setToast(null), 3000);
    }
  }, [profile, session, isOnline]);

  const onAcknowledgePolicy = useCallback(async (policyId) => {
    if (isOnline && profile) {
      await acknowledgePolicy(profile.org_id, policyId, session.user.id);
      const { data } = await fetchPolicies(profile.org_id);
      setPolicies(data || []);
    }
  }, [profile, session, isOnline]);

  // ── Training ──
  const onCreateRequirement = useCallback(async (req) => {
    if (isOnline && profile) {
      const { error } = await createTrainingRequirement(profile.org_id, req);
      if (error) { setToast({ message: `Error: ${error.message}`, level: RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchTrainingRequirements(profile.org_id);
      setTrainingReqs(data || []);
    }
  }, [profile, isOnline]);

  const onLogTraining = useCallback(async (record) => {
    if (isOnline && profile) {
      const { error } = await createTrainingRecord(profile.org_id, session.user.id, record);
      if (error) { setToast({ message: `Error: ${error.message}`, level: RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchTrainingRecords(profile.org_id);
      setTrainingRecs(data || []);
      setToast({ message: "Training logged", level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ADE80" } }); setTimeout(() => setToast(null), 3000);
    }
  }, [profile, session, isOnline]);

  // ── Auth gate ──
  if (authLoading) return <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: MUTED, fontSize: 14 }}>Loading...</div></div>;
  if (isOnline && !session) return <AuthScreen onAuth={setSession} />;

  const orgName = profile?.organizations?.name || COMPANY_NAME;
  const orgLogo = profile?.organizations?.logo_url || LOGO_URL;
  const userName = profile?.full_name || "";
  const needsAuth = !isOnline && ["history", "dashboard", "export"].includes(cv) && !isAuthed;
  return (
    <><Head><title>{orgName} SMS - PreflightSMS</title><meta name="theme-color" content="#000000" /><link rel="icon" type="image/png" href="/favicon.png" /><link rel="icon" href="/favicon.ico" /><link rel="manifest" href="/manifest.json" /><link rel="apple-touch-icon" href="/icon-192.png" /></Head>
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <NavBar currentView={cv} setCurrentView={setCv} isAuthed={isAuthed || isOnline} orgLogo={orgLogo} orgName={orgName} />
      <div className="main-content" style={{ marginLeft: 140 }}>
        {/* Top bar with user info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px 0" }}>
          <div>
            <h1 style={{ margin: 0, color: WHITE, fontSize: 22, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
              {cv === "submit" ? "NEW FLIGHT RISK ASSESSMENT" : cv === "flights" ? "ACTIVE FLIGHTS" : cv === "reports" ? "SUBMIT HAZARD REPORT" : cv === "hazards" ? "HAZARD REGISTER" : cv === "actions" ? "CORRECTIVE ACTIONS" : cv === "policy" ? "POLICY & TRAINING" : cv === "dashboard" ? "SAFETY DASHBOARD" : cv === "admin" ? "ADMIN" : ""}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {pendingSync > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: YELLOW, background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)", padding: "2px 8px", borderRadius: 10, cursor: "pointer" }} onClick={() => flushQueue()} title="Click to retry sync">{pendingSync} pending</span>}
            {isOnline && session && (<>
              <span style={{ fontSize: 11, color: MUTED }}>{userName}</span>
              <div style={{ width: 32, height: 32, borderRadius: 50, background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 12, fontWeight: 700 }}>{(userName || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <button onClick={async () => { await signOut(); setSession(null); setProfile(null); setRecords([]); setFlights([]); setReports([]); setHazards([]); setActions([]); setOrgProfiles([]); setPolicies([]); setTrainingReqs([]); setTrainingRecs([]); }}
                style={{ fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Log out</button>
            </>)}
          </div>
        </div>
        {toast && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, padding: "10px 18px", borderRadius: 8, background: toast.level.bg, border: `1px solid ${toast.level.border}`, color: toast.level.color, fontWeight: 700, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>{toast.message}</div>}
        <main style={{ padding: "20px 32px 50px" }}>
        {cv === "submit" && <FRATForm onSubmit={onSubmit} onNavigate={(view) => setCv(view)} />}
        {cv === "flights" && <FlightBoard flights={flights} onUpdateFlight={onUpdateFlight} />}
        {cv === "reports" && <SafetyReporting profile={profile} session={session} onSubmitReport={onSubmitReport} reports={reports} onStatusChange={onReportStatusChange} />}
        {cv === "hazards" && <HazardRegister profile={profile} session={session} onCreateHazard={onCreateHazard} hazards={hazards} />}
        {cv === "actions" && <CorrectiveActions actions={actions} onCreateAction={onCreateAction} onUpdateAction={onUpdateAction} />}
        {cv === "policy" && <PolicyTraining profile={profile} session={session} policies={policies} onCreatePolicy={onCreatePolicy} onAcknowledgePolicy={onAcknowledgePolicy} trainingRequirements={trainingReqs} trainingRecords={trainingRecs} onCreateRequirement={onCreateRequirement} onLogTraining={onLogTraining} orgProfiles={orgProfiles} />}
        {needsAuth && <AdminGate isAuthed={isAuthed} onAuth={setIsAuthed}>{null}</AdminGate>}
        {cv === "dashboard" && (isAuthed || isOnline) && <DashboardWrapper records={records} onDelete={onDelete} />}
        {cv === "admin" && (isAuthed || isOnline) && <AdminPanel profile={profile} orgProfiles={orgProfiles} onUpdateRole={onUpdateRole} orgName={orgName} orgSlug={profile?.organizations?.slug || ""} orgLogo={orgLogo} onUploadLogo={async (file) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { url, error } = await uploadOrgLogo(orgId, file);
          if (!error && url) {
            // Refresh profile to pick up new logo
            const { data: prof } = await getProfile();
            if (prof) setProfile(prof);
          }
          return { url, error };
        }} />}
      </main>
      <footer style={{ textAlign: "center", padding: "16px", color: SUBTLE, fontSize: 10, borderTop: `1px solid ${BORDER}` }}>
        {orgName} Safety Management System · PreflightSMS · 14 CFR Part 5 SMS · {new Date().getFullYear()}</footer>
      </div>{/* end main-content */}
      <style>{`*{box-sizing:border-box}input:focus,select:focus,textarea:focus{outline:none;border-color:${WHITE} !important;box-shadow:0 0 0 2px rgba(255,255,255,0.15) !important}select option{background:${NEAR_BLACK};color:${OFF_WHITE}}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${DARK}}::-webkit-scrollbar-thumb{background:${BORDER};border-radius:3px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@media(max-width:768px){
.frat-grid{grid-template-columns:1fr !important}
.flight-info-grid{grid-template-columns:1fr 1fr !important}
.score-panel-desktop{display:none !important}
.score-panel-mobile{display:flex !important}
.nav-sidebar{display:none !important}
.nav-mobile-header{display:flex !important}
.nav-mobile-menu{display:flex !important}
.main-content{margin-left:0 !important}
.stat-grid{grid-template-columns:repeat(2,1fr) !important}
.chart-grid-2{grid-template-columns:1fr !important}
}
@media(max-width:480px){.flight-info-grid{grid-template-columns:1fr !important}}`}</style>
    </div></>);
}
