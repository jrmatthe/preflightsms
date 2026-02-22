import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { supabase, signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword, getSession, getProfile, submitFRAT, fetchFRATs, deleteFRAT, createFlight, fetchFlights, updateFlightStatus, subscribeToFlights, submitReport, fetchReports, updateReport, createHazard, fetchHazards, updateHazard, createAction, fetchActions, updateAction, fetchOrgProfiles, updateProfileRole, updateProfilePermissions, createPolicy, fetchPolicies, acknowledgePolicy, createTrainingRequirement, fetchTrainingRequirements, createTrainingRecord, fetchTrainingRecords, deleteTrainingRecord, deleteTrainingRequirement, uploadOrgLogo, fetchFratTemplate, fetchAllFratTemplates, upsertFratTemplate, createFratTemplate, deleteFratTemplate, setActiveFratTemplate, uploadFratAttachment, fetchNotificationContacts, createNotificationContact, updateNotificationContact, deleteNotificationContact, approveFlight, rejectFlight, approveRejectFRAT, updateOrg, fetchCrewRecords, createCrewRecord, updateCrewRecord, deleteCrewRecord, fetchAircraft, createAircraft, updateAircraft, deleteAircraft, fetchCbtCourses, createCbtCourse, updateCbtCourse, deleteCbtCourse, fetchCbtLessons, upsertCbtLesson, deleteCbtLesson, fetchCbtProgress, upsertCbtProgress, fetchCbtEnrollments, upsertCbtEnrollment, fetchInvitations, createInvitation, revokeInvitation, resendInvitation, getInvitationByToken, acceptInvitation, removeUserFromOrg, fetchSmsManuals, upsertSmsManual, updateSmsManualSections, deleteSmsManual, saveSmsTemplateVariables, saveSmsSignatures, publishManualToPolicy, clearPolicyAcknowledgments } from "../lib/supabase";
import { hasFeature, NAV_FEATURE_MAP, TIERS, FEATURE_LABELS, getTierFeatures } from "../lib/tiers";
import { initOfflineQueue, enqueue, getQueueCount, flushQueue } from "../lib/offlineQueue";
const DashboardCharts = dynamic(() => import("../components/DashboardCharts"), { ssr: false });
const SafetyReporting = dynamic(() => import("../components/SafetyReporting"), { ssr: false });
const HazardRegister = dynamic(() => import("../components/HazardRegister"), { ssr: false });
const CorrectiveActions = dynamic(() => import("../components/CorrectiveActions"), { ssr: false });
const AdminPanel = dynamic(() => import("../components/AdminPanel"), { ssr: false });
const CrewRoster = dynamic(() => import("../components/CrewRoster"), { ssr: false });
const PolicyTraining = dynamic(() => import("../components/PolicyTraining"), { ssr: false });
const FaaAuditLog = dynamic(() => import("../components/FaaAuditLog"), { ssr: false });
const SmsManuals = dynamic(() => import("../components/SmsManuals"), { ssr: false });
const CbtModules = dynamic(() => import("../components/CbtModules"), { ssr: false });
const FleetManagement = dynamic(() => import("../components/FleetManagement"), { ssr: false });

const COMPANY_NAME = "PreflightSMS";
const ADMIN_PASSWORD = "admin2026";
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

const DEFAULT_RISK_LEVELS = {
  LOW: { label: "LOW RISK", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", min: 0, max: 15, action: "Flight authorized — standard procedures" },
  MODERATE: { label: "MODERATE RISK", color: YELLOW, bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", min: 16, max: 30, action: "Enhanced awareness — brief crew on elevated risk factors" },
  HIGH: { label: "HIGH RISK", color: AMBER, bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", min: 31, max: 45, action: "Requires management approval before departure" },
  CRITICAL: { label: "CRITICAL RISK", color: RED, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", min: 46, max: 100, action: "Flight should not depart without risk mitigation and executive approval" },
};
const DEFAULT_AIRCRAFT_TYPES = ["PC-12", "King Air"];
const DEFAULT_RISK_CATEGORIES = [
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
  { id: "environment", name: "Environment", icon: "", factors: [
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

// Convert DB template thresholds to runtime risk levels
function buildRiskLevels(thresholds) {
  if (!thresholds || !Array.isArray(thresholds)) return DEFAULT_RISK_LEVELS;
  const colorMap = { green: GREEN, yellow: YELLOW, amber: AMBER, red: RED };
  const bgMap = { green: "rgba(74,222,128,0.08)", yellow: "rgba(250,204,21,0.08)", amber: "rgba(245,158,11,0.08)", red: "rgba(239,68,68,0.08)" };
  const borderMap = { green: "rgba(74,222,128,0.25)", yellow: "rgba(250,204,21,0.25)", amber: "rgba(245,158,11,0.25)", red: "rgba(239,68,68,0.25)" };
  const result = {};
  thresholds.forEach(t => {
    result[t.level] = { label: t.label, color: colorMap[t.color] || GREEN, bg: bgMap[t.color] || bgMap.green, border: borderMap[t.color] || borderMap.green, min: t.min, max: t.max, action: t.action };
  });
  return result;
}

function getRiskLevel(s, riskLevels) { const rl = riskLevels || DEFAULT_RISK_LEVELS; const sorted = Object.values(rl).sort((a, b) => a.min - b.min); for (const l of sorted) { if (s >= l.min && s <= l.max) return l; } return sorted[sorted.length - 1] || Object.values(DEFAULT_RISK_LEVELS)[3]; }
function formatDateTime(d) { return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function generateId() { return `FRAT-${Date.now().toString(36).toUpperCase()}`; }
function downloadBlob(c, t, f) { const b = new Blob([c], { type: t }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = f; a.style.display = "none"; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 200); }

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

function NavBar({ currentView, setCurrentView, isAuthed, orgLogo, orgName, userName, onSignOut, org, userRole }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // SVG icons — monochrome, inherit color from parent
  const I = (d, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
  const icons = {
    submit: I(<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></>),
    flights: I(<><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="none"/><path d="M2 18h4l2-2 3 4 3-6 2 4h4" strokeDasharray="2 2" opacity="0.5"/></>),
    crew: I(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>),
    reports: I(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
    hazards: I(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
    actions: I(<><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>),
    policy: I(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>),
    cbt: I(<><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></>),
    audit: I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>),
    manuals: I(<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>),
    dashboard: I(<><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>),
    admin: I(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>),
    fleet: I(<><path d="M17.8 19.2L16 11l3.5-3.5C20.3 6.7 21 5.1 21 4.5c0-1-.5-1.5-1.5-1.5-.6 0-2.2.7-3 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.3 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></>),
  };
  const tabs = [
    { id: "submit", label: "FRAT", icon: icons.submit, p: false },
    { id: "flights", label: "Flight Following", icon: icons.flights, p: false },
    { id: "crew", label: "Crew", icon: icons.crew, p: false },
    { id: "fleet", label: "Fleet", icon: icons.fleet, p: false },
    { id: "reports", label: "Reports", icon: icons.reports, p: false },
    { id: "hazards", label: "Investigations", icon: icons.hazards, p: false },
    { id: "actions", label: "Actions", icon: icons.actions, p: false },
    { id: "policy", label: "Policies", icon: icons.policy, p: false },
    { id: "cbt", label: "Training", icon: icons.cbt, p: false },
    { id: "audit", label: "Audit", icon: icons.audit, p: false },
    { id: "dashboard", label: "Dashboard", icon: icons.dashboard, p: true },
    { id: "admin", label: "Admin", icon: icons.admin, p: true },
  ].filter(t => {
    const requiredFeature = NAV_FEATURE_MAP[t.id];
    if (requiredFeature && !hasFeature(org, requiredFeature)) return false;
    // Role-based visibility
    const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(userRole);
    if (t.id === "admin" && !isAdmin) return false;
    if (t.id === "dashboard" && !isAdmin) return false;
    if (t.id === "audit" && !isAdmin) return false;
    if (t.id === "actions" && !isAdmin) return false;
    if (t.id === "hazards" && !isAdmin) return false;
    return true;
  });
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
      <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.icon}</span>
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
        <img src={orgLogo || LOGO_URL} alt={orgName || "P"} style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 50, border: `1px solid ${BORDER}` }} onError={e => { e.target.src = LOGO_URL; }} />
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
          style={{ background: currentView === t.id ? "rgba(255,255,255,0.08)" : "transparent", color: currentView === t.id ? WHITE : MUTED, border: "none", padding: "10px 12px", cursor: "pointer", fontWeight: currentView === t.id ? 700 : 500, fontSize: 13, textAlign: "left", borderRadius: 6, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center" }}>{t.icon}</span> {t.label}
        </button>))}
      {userName && (<>
        <div style={{ borderTop: `1px solid ${BORDER}`, margin: "6px 0", paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 11, fontWeight: 700 }}>{(userName || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <span style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 600 }}>{userName}</span>
            </div>
            <button onClick={() => { setMenuOpen(false); if (onSignOut) onSignOut(); }}
              style={{ fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>Log out</button>
          </div>
        </div>
      </>)}
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

function FRATForm({ onSubmit, onNavigate, riskCategories, riskLevels, aircraftTypes, orgId, userName, allTemplates, fleetAircraft }) {
  // Template switching: find template assigned to selected aircraft
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const resolveTemplate = useCallback((aircraft) => {
    if (!allTemplates || allTemplates.length <= 1) return null;
    return allTemplates.find(t => (t.assigned_aircraft || []).includes(aircraft)) || allTemplates.find(t => t.is_active) || null;
  }, [allTemplates]);

  const currentTemplate = activeTemplateId ? allTemplates?.find(t => t.id === activeTemplateId) : null;
  const RISK_CATEGORIES = currentTemplate?.categories || riskCategories || DEFAULT_RISK_CATEGORIES;
  const fleetList = fleetAircraft || [];
  const FLEET_REG_MAP = useMemo(() => {
    const map = {};
    fleetList.forEach(a => { if (!map[a.type]) map[a.type] = []; map[a.type].push(a); });
    return map;
  }, [fleetList]);
  const AIRCRAFT_TYPES = [...new Set(fleetList.map(a => a.type))];
  const hasFleet = fleetList.length > 0;
  const currentRiskLevels = currentTemplate?.risk_thresholds ? buildRiskLevels(currentTemplate.risk_thresholds) : riskLevels;
  const getRL = (s) => getRiskLevel(s, currentRiskLevels);
  const getLocalDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const [fi, setFi] = useState({ pilot: userName || "", aircraft: "PC-12", tailNumber: "", departure: "", destination: "", cruiseAlt: "", date: getLocalDate(), etd: "", ete: "", fuelLbs: "", numCrew: "1", numPax: "", remarks: "" });
  const [attachments, setAttachments] = useState([]); // { file, preview, uploading, url }
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
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

  // Photo attachment handlers
  const handleAddPhoto = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) { alert("Photo must be under 10MB"); return; }
      const preview = URL.createObjectURL(file);
      setAttachments(prev => [...prev, { file, preview, uploading: false, url: null }]);
    });
    e.target.value = "";
  };

  const removePhoto = (idx) => {
    setAttachments(prev => { URL.revokeObjectURL(prev[idx]?.preview); return prev.filter((_, i) => i !== idx); });
  };

  const handleSubmit = async () => {
    if (!fi.pilot || !fi.departure || !fi.destination) { alert("Please fill in pilot name, departure, and destination."); return; }
    if (!fi.etd || !fi.ete) { alert("Please fill in estimated departure time (ETD) and estimated time enroute (ETE) for flight following."); return; }
    
    // Upload photos first
    const fratId = generateId();
    let uploadedUrls = [];
    if (attachments.length > 0 && orgId) {
      setUploadingPhotos(true);
      for (const att of attachments) {
        const { url, error } = await uploadFratAttachment(orgId, fratId, att.file);
        if (url) uploadedUrls.push({ url, name: att.file.name, type: att.file.type, size: att.file.size });
      }
      setUploadingPhotos(false);
    }

    const eta = calcArrivalTime(fi.date, fi.etd, fi.ete);
    onSubmit({ id: fratId, ...fi, eta: eta ? eta.toISOString() : "", score, riskLevel: getRL(score).label, factors: Object.keys(checked).filter(k => checked[k]), timestamp: new Date().toISOString(),
      wxBriefing: wxAnalysis.briefing ? wxAnalysis.briefing.map(b => b.raw).join(" | ") : "", attachments: uploadedUrls });
    if (onNavigate) onNavigate("flights");
  };
  const reset = () => { attachments.forEach(a => URL.revokeObjectURL(a.preview)); setAttachments([]); setUploadingPhotos(false); setFi({ pilot: "", aircraft: "PC-12", tailNumber: "", departure: "", destination: "", cruiseAlt: "", date: getLocalDate(), etd: "", ete: "", fuelLbs: "", numCrew: "1", numPax: "", remarks: "" }); setChecked({}); setSubmitted(false); setWxData(null); setWxAnalysis({ flags: {}, reasons: {}, briefing: null }); setAutoSuggested({}); };

  if (!hasFleet) return (
    <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center", ...card, padding: 36 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 8 }}>No Aircraft Registered</div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Add aircraft to your fleet registry before submitting a FRAT.</div>
      <button onClick={() => onNavigate("fleet")} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Go to Fleet Registry</button>
    </div>
  );

  // Build tail number options for current aircraft type
  const tailOptions = FLEET_REG_MAP[fi.aircraft] || [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ ...card, padding: "24px 28px 28px", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Flight Information</div>
        <div className="flight-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, minWidth: 0 }}>
          {[{ key: "pilot", label: "Pilot in Command", placeholder: "Full name", type: "text" },
            { key: "aircraft", label: "Aircraft Type", type: "fleet-type" },
            { key: "tailNumber", label: "Tail Number", type: "fleet-tail" },
            { key: "departure", label: "Departure (ICAO)", placeholder: "e.g. KSFF", type: "text", upper: true },
            { key: "destination", label: "Destination (ICAO)", placeholder: "e.g. KBOI", type: "text", upper: true },
            { key: "cruiseAlt", label: "Cruise Altitude", placeholder: "e.g. FL180 or 12000", type: "text" },
            { key: "date", label: "Flight Date", type: "date" },
            { key: "etd", label: "Est. Departure (Spokane)", placeholder: "e.g. 1430", type: "text" },
            { key: "ete", label: "Est. Time Enroute", placeholder: "e.g. 1:30, 45, or 0:30", type: "text" },
            { key: "fuelLbs", label: "Fuel Onboard (lbs)", placeholder: "e.g. 2400", type: "text" },
            { key: "numCrew", label: "Number of Crew", placeholder: "e.g. 2", type: "text" },
            { key: "numPax", label: "Number of Passengers", placeholder: "e.g. 4", type: "text" },
          ].map(f => (
            <div key={f.key} style={{ minWidth: 0, overflow: "hidden" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</label>
              {f.type === "fleet-type" ? (
                <select value={fi.aircraft} onChange={e => {
                  const val = e.target.value;
                  const matches = FLEET_REG_MAP[val] || [];
                  setFi(p => ({ ...p, aircraft: val, tailNumber: matches.length === 1 ? matches[0].registration : "" }));
                  if (allTemplates && allTemplates.length > 1) {
                    const matched = resolveTemplate(val);
                    if (matched) { setActiveTemplateId(matched.id); setChecked({}); setAutoSuggested({}); }
                  }
                }} style={inp}>
                  {AIRCRAFT_TYPES.map(a => <option key={a}>{a}</option>)}</select>
              ) : f.type === "fleet-tail" ? (
                tailOptions.length === 1
                  ? <input type="text" value={tailOptions[0].registration} readOnly style={{...inp, color: CYAN, cursor: "default"}} />
                  : <select value={fi.tailNumber} onChange={e => setFi(p => ({ ...p, tailNumber: e.target.value }))} style={inp}>
                      <option value="">Select tail number...</option>
                      {tailOptions.map(a => <option key={a.registration} value={a.registration}>{a.registration}</option>)}
                    </select>
              ) : (<input type={f.type === "date" ? "date" : "text"} placeholder={f.placeholder} value={fi[f.key]}
                onChange={e => { let v = f.upper ? e.target.value.toUpperCase() : e.target.value; setFi(p => ({ ...p, [f.key]: v })); }}
                style={inp} />)}
            </div>))}
        </div>
      </div>

      {/* Template indicator (multi-template mode) */}
      {allTemplates && allTemplates.length > 1 && (
        <div style={{ ...card, padding: "12px 18px", marginBottom: 18, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>Template:</span>
            <select value={activeTemplateId || ""} onChange={e => { setActiveTemplateId(e.target.value || null); setChecked({}); setAutoSuggested({}); }}
              style={{ ...inp, width: "auto", padding: "6px 10px", fontSize: 12, background: "transparent" }}>
              {allTemplates.filter(t => t.categories && t.categories.length > 0).map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.is_active ? " (default)" : ""}</option>
              ))}
            </select>
          </div>
          {currentTemplate?.assigned_aircraft?.length > 0 && (
            <span style={{ fontSize: 10, color: SUBTLE }}>Assigned: {currentTemplate.assigned_aircraft.join(", ")}</span>
          )}
        </div>
      )}

      {/* Photo Attachments */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 18, borderRadius: 10 }}>
        <div style={{ color: MUTED, fontSize: 11, marginBottom: 12 }}>Attach photos of HAZMAT PIC notifications or other documents</div>
        {attachments.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 12 }}>
            {attachments.map((att, idx) => (
              <div key={idx} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}`, background: BLACK, aspectRatio: "1" }}>
                <img src={att.preview} alt={att.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => removePhoto(idx)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: `1px solid ${BORDER}`, color: WHITE, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>&times;</button>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", background: "rgba(0,0,0,0.7)", fontSize: 9, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{att.file.name}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, color: OFF_WHITE, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Take Photo
            <input type="file" accept="image/*" capture="environment" onChange={handleAddPhoto} style={{ display: "none" }} />
          </label>
          <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, color: OFF_WHITE, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            Choose File
            <input type="file" accept="image/*" multiple onChange={handleAddPhoto} style={{ display: "none" }} />
          </label>
        </div>
        {uploadingPhotos && <div style={{ color: CYAN, fontSize: 11, marginTop: 8, textAlign: "center" }}>Uploading photos...</div>}
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
              {cat.factors.map(f => { const ic = !!checked[f.id]; const isAuto = !!autoSuggested[f.id]; const rl = getRL(f.score > 4 ? 46 : f.score > 3 ? 31 : 16); return (
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
          <div style={{ ...card, padding: 24, border: `1px solid ${getRL(score).border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "center", marginBottom: 8 }}>Risk Score</div>
            <div style={{ fontSize: 56, fontWeight: 800, color: getRL(score).color, textAlign: "center", lineHeight: 1, marginBottom: 12 }}>{score}</div>
            {/* Progress bar */}
            <div style={{ position: "relative", height: 6, background: BORDER, borderRadius: 3, marginBottom: 4 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min((score / 40) * 100, 100)}%`, background: getRL(score).color, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: SUBTLE, marginBottom: 14 }}>
              <span>0</span><span>15</span><span>25</span><span>40</span>
            </div>
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: getRL(score).color, marginBottom: 16 }}>✓ {getRL(score).label.replace(" RISK", "")} — {getRL(score).label.includes("LOW") ? "Low Risk" : getRL(score).label.includes("MODERATE") ? "Moderate Risk" : getRL(score).label.includes("HIGH") ? "High Risk" : "Critical Risk"}</div>
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

      <div className="score-panel-mobile" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, paddingBottom: "env(safe-area-inset-bottom, 6px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", margin: "0 8px 6px", background: BLACK, borderTop: `1px solid ${getRL(score).border}`, borderRadius: 10, border: `1px solid ${getRL(score).border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: getRL(score).bg, border: `1px solid ${getRL(score).border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 800, color: getRL(score).color, fontSize: 16, fontFamily: "Georgia,serif" }}>{score}</span></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, color: getRL(score).color, fontSize: 11 }}>{getRL(score).label}</div>
              <div style={{ color: MUTED, fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getRL(score).action}</div></div></div>
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
        {["ALL", ...Object.values(DEFAULT_RISK_LEVELS).map(l => l.label)].map(l => (
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
              {r.remarks && <div style={{ color: SUBTLE, fontSize: 10, marginTop: 2, fontStyle: "italic" }}>"{r.remarks}"</div>}
              {r.attachments && r.attachments.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {r.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: 48, height: 48, borderRadius: 6, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                      <img src={att.url} alt={att.name || "Attachment"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </a>
                  ))}
                </div>
              )}</div>
            <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", color: LIGHT_BORDER, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button></div>); })}</div>);
}

function FlightBoard({ flights, onUpdateFlight, onApproveFlight, onRejectFlight }) {
  const STATUSES = {
    ACTIVE: { label: "ENROUTE", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)" },
    ARRIVED: { label: "ARRIVED", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)" },
    PENDING_APPROVAL: { label: "AWAITING APPROVAL", color: YELLOW, bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)" },
    REJECTED: { label: "REJECTED", color: RED, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
  };
  const [filter, setFilter] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [airportCoords, setAirportCoords] = useState({});
  const [now, setNow] = useState(Date.now());

  // Update 'now' every 10 seconds so progress bar and map plane move
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(iv);
  }, []);

  // Fetch airport coordinates
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

  const recent = useMemo(() => flights.filter(f => f.status !== "ARRIVED" || (now - new Date(f.arrivedAt || f.timestamp).getTime()) < 24 * 3600000), [flights, now]);
  const flightCounts = useMemo(() => {
    let active = 0, arrived = 0;
    recent.forEach(f => { if (f.status === "ACTIVE") active++; else if (f.status === "ARRIVED") arrived++; });
    return { ACTIVE: active, ARRIVED: arrived, ALL: recent.length };
  }, [recent]);
  const displayed = (() => {
    let list = filter === "ACTIVE" ? recent.filter(f => f.status === "ACTIVE") : filter === "ARRIVED" ? recent.filter(f => f.status === "ARRIVED") : recent;
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(f => `${f.pilot || ""} ${f.departure || ""} ${f.destination || ""} ${f.aircraft || ""} ${f.id || ""}`.toLowerCase().includes(q));
    return list;
  })();
  const activeFlights = flights.filter(f => f.status === "ACTIVE" || f.status === "PENDING_APPROVAL");

  const isOverdue = (f) => {
    if (f.status !== "ACTIVE" || !f.eta) return false;
    const etaMs = new Date(f.eta).getTime();
    return !isNaN(etaMs) && now > etaMs;
  };

  const getProgress = (f) => {
    if (f.status === "ARRIVED") return 100;
    if (!f.eta) return -1;
    const end = new Date(f.eta).getTime();
    const start = new Date(f.timestamp).getTime();
    if (isNaN(end) || isNaN(start) || end <= start) return 0;
    const pct = ((now - start) / (end - start)) * 100;
    return Math.max(0, Math.min(pct, 95));
  };

  const getEstimatedPos = (f) => {
    const dep = airportCoords[f.departure];
    const dest = airportCoords[f.destination];
    if (!dep || !dest) return null;
    const pct = Math.max(getProgress(f), 0) / 100;
    return {
      lat: dep.lat + (dest.lat - dep.lat) * pct,
      lon: dep.lon + (dest.lon - dep.lon) * pct,
    };
  };

  // SVG Map
  const renderMap = () => {
    if (activeFlights.length === 0) return null;
    const allCoords = [];
    activeFlights.forEach(f => {
      const dep = airportCoords[f.departure]; const dest = airportCoords[f.destination];
      if (dep) allCoords.push(dep); if (dest) allCoords.push(dest);
    });
    if (allCoords.length === 0) return null;
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
          {[0.25, 0.5, 0.75].map(v => (<g key={v}>
            <line x1={0} y1={H * v} x2={W} y2={H * v} stroke={BORDER} strokeWidth="0.5" />
            <line x1={W * v} y1={0} x2={W * v} y2={H} stroke={BORDER} strokeWidth="0.5" />
          </g>))}
          <rect x={0} y={0} width={W} height={H} fill="none" stroke={BORDER} strokeWidth="1" />
          {activeFlights.map(f => {
            const dep = airportCoords[f.departure]; const dest = airportCoords[f.destination];
            if (!dep || !dest) return null;
            const pos = getEstimatedPos(f);
            const dx = toX(dep.lon), dy = toY(dep.lat);
            const ex = toX(dest.lon), ey = toY(dest.lat);
            const angle = Math.atan2(ex - dx, -(ey - dy)) * (180 / Math.PI);
            return (
              <g key={f.id}>
                <line x1={dx} y1={dy} x2={ex} y2={ey} stroke={BORDER} strokeWidth="1" strokeDasharray="4,4" />
                <text x={dx} y={dy + 16} textAnchor="middle" fill={MUTED} fontSize="11" fontFamily="monospace">{f.departure}</text>
                <text x={ex} y={ey + 16} textAnchor="middle" fill={MUTED} fontSize="11" fontFamily="monospace">{f.destination}</text>
                <circle cx={dx} cy={dy} r="3" fill={MUTED} />
                <circle cx={ex} cy={ey} r="3" fill={MUTED} />
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
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flights..." style={{ ...inp, width: 200, maxWidth: 200, padding: "5px 10px", fontSize: 12 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["ACTIVE", "ARRIVED", "ALL"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${filter === f ? WHITE : BORDER}`,
              background: filter === f ? WHITE : "transparent", color: filter === f ? BLACK : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>
              {(f === "ALL" ? "All (24h)" : f === "ACTIVE" ? "Active" : "Arrived") + ` (${flightCounts[f]})`}</button>))}
        </div>
        <span style={{ fontSize: 13, color: GREEN, fontWeight: 600 }}>&#x25CF; {activeFlights.length} Active</span>
      </div>

      <div className="flight-board-grid" style={{ display: "grid", gridTemplateColumns: activeFlights.length > 0 ? "1fr 1fr" : "1fr", gap: 20 }}>
        {/* Map */}
        {activeFlights.length > 0 && renderMap()}

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
            const statusLabel = overdue ? "OVERDUE" : f.status === "PENDING_APPROVAL" ? "AWAITING APPROVAL" : f.status === "REJECTED" ? "REJECTED" : f.status === "ACTIVE" ? "ENROUTE" : "ARRIVED";
            const statusColor = overdue ? RED : f.status === "PENDING_APPROVAL" ? YELLOW : f.status === "REJECTED" ? RED : st.color;
            return (
              <div key={f.id} style={{ ...card, padding: "18px 22px", marginBottom: 12, borderRadius: 10, border: `1px solid ${overdue ? RED + "44" : BORDER}`, cursor: "pointer" }}
                onClick={() => setSelectedFlight(selectedFlight === f.id ? null : f.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: WHITE }}>{f.tailNumber || f.aircraft}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 4, color: BLACK, background: statusColor, letterSpacing: 0.5 }}>{statusLabel}</span>
                </div>
                {/* Progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: WHITE, minWidth: 42 }}>{f.departure}</span>
                  <div style={{ flex: 1, position: "relative", height: 4, background: BORDER, borderRadius: 2 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.max(progress, 0)}%`, background: overdue ? RED : GREEN, borderRadius: 2, transition: "width 2s linear" }} />
                    {f.status === "ACTIVE" && progress >= 0 && (
                      <div style={{ position: "absolute", top: -4, left: `${Math.max(progress, 0)}%`, width: 12, height: 12, borderRadius: "50%", background: WHITE, border: `2px solid ${overdue ? RED : GREEN}`, transform: "translateX(-6px)", transition: "left 2s linear" }} />
                    )}
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
                      <br />ID: {f.id} &middot; Score: {f.score} {f.riskLevel} &middot; Filed {formatDateTime(f.timestamp)}
                      {f.arrivedAt && <span> &middot; Arrived {formatDateTime(f.arrivedAt)}</span>}
                    </div>
                    {f.status === "ACTIVE" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateFlight(f.id, "ARRIVED"); }}
                          style={{ flex: 1, padding: "10px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>MARK ARRIVED</button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateFlight(f.id, "CANCEL"); }}
                          style={{ padding: "10px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                      </div>)}
                    {f.status === "PENDING_APPROVAL" && onApproveFlight && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ padding: "10px 14px", background: "rgba(250,204,21,0.08)", border: `1px solid rgba(250,204,21,0.25)`, borderRadius: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: YELLOW, marginBottom: 4 }}>🔒 Supervisor Approval Required</div>
                          <div style={{ fontSize: 10, color: MUTED }}>This flight scored {f.score} ({f.riskLevel}) which requires management approval before departure.</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={(e) => { e.stopPropagation(); onApproveFlight(f.dbId, f.fratDbId); }}
                            style={{ flex: 1, padding: "10px 0", background: GREEN, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>APPROVE FLIGHT</button>
                          <button onClick={(e) => { e.stopPropagation(); onRejectFlight(f.dbId, f.fratDbId); }}
                            style={{ padding: "10px 16px", background: "transparent", color: RED, border: `1px solid ${RED}44`, borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Reject</button>
                        </div>
                      </div>)}
                  </div>
                )}
              </div>); })}
        </div>
      </div>
      {activeFlights.length > 0 && <div style={{ textAlign: "center", padding: "14px 0 4px", color: SUBTLE, fontSize: 10 }}>Flight positions on map and progress bars are estimates based on departure time and ETA — not live tracking.</div>}
    </div>);
}

function ExportView({ records, orgName }) {
  const prefix = (orgName || "FRAT").replace(/\s+/g, "_");
  const genCSV = useCallback(() => { if (!records.length) return; const h = ["FRAT_ID", "Date", "Pilot", "Aircraft", "Departure", "Destination", "CruiseAlt", "Score", "Risk_Level", "Factors_Count", "Remarks"]; const rows = records.map(r => [r.id, new Date(r.timestamp).toISOString(), r.pilot, r.aircraft, r.departure, r.destination, r.cruiseAlt || "", r.score, r.riskLevel, r.factors.length, `"${(r.remarks || "").replace(/"/g, '""')}"`]); downloadBlob([h.join(","), ...rows.map(r => r.join(","))].join("\n"), "text/csv", `${prefix}_FRAT_Export_${new Date().toISOString().slice(0, 10)}.csv`); }, [records, prefix]);
  const genDetailed = useCallback(() => { if (!records.length) return; const ids = []; const labels = []; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { ids.push(f.id); labels.push(`${c.name}: ${f.label}`); })); const h = ["FRAT_ID", "Date", "Pilot", "Aircraft", "Departure", "Destination", "CruiseAlt", "Score", "Risk_Level", ...labels]; const rows = records.map(r => [r.id, new Date(r.timestamp).toISOString(), r.pilot, r.aircraft, r.departure, r.destination, r.cruiseAlt || "", r.score, r.riskLevel, ...ids.map(fid => r.factors.includes(fid) ? "YES" : "")]); downloadBlob([h.join(","), ...rows.map(r => r.join(","))].join("\n"), "text/csv", `${prefix}_FRAT_Detailed_${new Date().toISOString().slice(0, 10)}.csv`); }, [records, prefix]);
  const genSummary = useCallback(() => { if (!records.length) return; const scores = records.map(r => r.score); const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1); const lc = { "LOW RISK": 0, "MODERATE RISK": 0, "HIGH RISK": 0, "CRITICAL RISK": 0 }; records.forEach(r => { lc[r.riskLevel] = (lc[r.riskLevel] || 0) + 1; }); const ff = {}; records.forEach(r => r.factors.forEach(f => { ff[f] = (ff[f] || 0) + 1; })); const tf = Object.entries(ff).sort((a, b) => b[1] - a[1]).slice(0, 10); let t = `${orgName || "FRAT"} SUMMARY REPORT\nGenerated: ${new Date().toLocaleString()}\n${"=".repeat(60)}\n\nTotal: ${records.length}\nAvg Score: ${avg}\nHighest: ${Math.max(...scores)}\n\nRISK DISTRIBUTION\n`; Object.entries(lc).forEach(([k, v]) => { t += `  ${k}: ${v} (${((v / records.length) * 100).toFixed(1)}%)\n`; }); t += `\nTOP RISK FACTORS\n`; tf.forEach(([id, count], i) => { let label = id; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { if (f.id === id) label = f.label; })); t += `  ${i + 1}. ${label} — ${count}x\n`; }); downloadBlob(t, "text/plain", `${prefix}_FRAT_Summary_${new Date().toISOString().slice(0, 10)}.txt`); }, [records, prefix, orgName]);
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

function DashboardWrapper({ records, flights, reports, hazards, actions, onDelete, riskLevels, org }) {
  const [sub, setSub] = useState("analytics");
  const hasAnalytics = hasFeature(org, "dashboard_analytics");
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Dashboard</div>
          <div style={{ fontSize: 11, color: MUTED }}>Safety analytics, trends, and compliance status</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[["analytics", "Overview"], ...(hasAnalytics ? [["frat", "FRAT Analytics"], ["safety", "Safety Metrics"]] : []), ["history", "FRAT History"], ["export", "Export"]].map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${sub === id ? WHITE : BORDER}`,
              background: sub === id ? WHITE : "transparent", color: sub === id ? BLACK : MUTED,
              fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
        ))}
        {!hasAnalytics && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <span style={{ fontSize: 10, color: "#F59E0B", padding: "4px 10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 4 }}>Upgrade to Professional for full analytics</span>
          </div>
        )}
      </div>
      {sub === "analytics" && <DashboardCharts records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} riskLevels={riskLevels} view="overview" />}
      {sub === "frat" && hasAnalytics && <DashboardCharts records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} riskLevels={riskLevels} view="frat" />}
      {sub === "safety" && hasAnalytics && <DashboardCharts records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} riskLevels={riskLevels} view="safety" />}
      {sub === "history" && <HistoryView records={records} onDelete={onDelete} />}
      {sub === "export" && <ExportView records={records} orgName={org?.name} />}
    </div>
  );
}

// ── LANDING PAGE ─────────────────────────────────────────────
function LandingPage() {
  const nav = (path) => { window.location.search = path; };
  const FEATURES = [
    { icon: "\u2713", title: "Flight Risk Assessment", desc: "Configurable FRAT with weighted scoring, risk thresholds, and approval workflows." },
    { icon: "\u25CE", title: "Flight Following", desc: "Real-time flight tracking with status updates, ETA monitoring, and arrival confirmation." },
    { icon: "\u26A0", title: "Safety Reporting", desc: "Confidential hazard, incident, and near-miss reporting with status tracking." },
    { icon: "\u25B3", title: "Investigation Register", desc: "Structured safety investigation with severity/likelihood risk matrix scoring." },
    { icon: "\u2298", title: "Corrective Actions", desc: "Track risk controls from identification through completion with due dates." },
    { icon: "\u25C9", title: "Crew Currency", desc: "Auto-calculated medical, flight review, IPC, and checkride expirations per FARs." },
    { icon: "\u25C7", title: "FAA Part 5 Audit Log", desc: "42-point compliance checklist mapped to every Part 5 requirement with evidence tracking." },
    { icon: "\u25C8", title: "Policy & Training", desc: "Document library with acknowledgment tracking and training record management." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: WHITE, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <Head><title>PreflightSMS — Safety Management System for Part 135 Operators</title><meta name="description" content="FAA Part 5 compliant SMS for Part 135 operators. FRAT, flight following, hazard reporting, crew currency tracking, and audit compliance." /></Head>

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: DARK, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 36, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>PreflightSMS</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => nav("login")} style={{ padding: "8px 20px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Log In</button>
          <button onClick={() => nav("signup")} style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Start Free Trial</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 32px 60px", textAlign: "center", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>FAA Part 5 Compliant SMS</div>
        <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, margin: "0 0 16px", fontFamily: "Georgia, serif" }}>Safety Management<br />Built for Part 135</h1>
        <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 32px" }}>
          FRAT submissions, flight following, hazard reporting, crew currency tracking, and full Part 5 audit compliance — in one platform your pilots will actually use.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => nav("signup")} style={{ padding: "14px 36px", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 }}>Start 14-Day Free Trial</button>
          <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{ padding: "14px 36px", background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>See Features</button>
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 12 }}>No credit card required</div>
      </section>

      {/* Compliance banner */}
      <section style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 24px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ fontSize: 11, color: AMBER, fontWeight: 700 }}>{"\u26A0"} Part 135 SMS Deadline</div>
          <div style={{ fontSize: 12, color: OFF_WHITE }}>All Part 135 operators must have a compliant SMS by <strong>May 28, 2027</strong> per 14 CFR Part 5.</div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" style={{ padding: "60px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", fontFamily: "Georgia, serif" }}>Everything You Need</h2>
          <p style={{ fontSize: 14, color: MUTED }}>All four SMS pillars — policy, risk management, assurance, and promotion — in one system.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 18px" }}>
              <div style={{ fontSize: 18, marginBottom: 8, color: CYAN }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "60px 32px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", fontFamily: "Georgia, serif" }}>Simple Pricing</h2>
          <p style={{ fontSize: 14, color: MUTED }}>14-day free trial on all plans. No credit card required.</p>
        </div>
        <div className="signup-plan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { name: "Starter", price: "$149", desc: "Core SMS for small operators", features: ["Flight Risk Assessment (FRAT)", "Flight Following", "Safety Reports & Investigations", "Corrective Actions", "Crew Roster & Currency", "Policy Library", "Basic Dashboard", "Up to 5 aircraft"] },
            { name: "Professional", price: "$299", desc: "Full SMS with analytics & compliance", badge: "MOST POPULAR", features: ["Everything in Starter, plus:", "Dashboard Analytics & Trends", "Safety Trend Alerts", "FAA Part 5 Audit Log", "Scheduled PDF Reports", "Document Library", "Custom FRAT Templates", "Approval Workflows", "Up to 15 aircraft"] },
          ].map(p => (
            <div key={p.name} style={{ background: CARD, border: `1px solid ${p.badge ? WHITE+"44" : BORDER}`, borderRadius: 12, padding: "28px 24px", position: "relative" }}>
              {p.badge && <div style={{ position: "absolute", top: -10, right: 16, fontSize: 9, fontWeight: 700, color: BLACK, background: GREEN, padding: "3px 10px", borderRadius: 4 }}>{p.badge}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
              <div style={{ marginBottom: 12 }}><span style={{ fontSize: 32, fontWeight: 800, fontFamily: "Georgia, serif" }}>{p.price}</span><span style={{ fontSize: 13, color: MUTED }}>/mo</span></div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>{p.desc}</div>
              {p.features.map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: f.startsWith("Everything") ? CYAN : OFF_WHITE, padding: "3px 0", display: "flex", gap: 6 }}>
                  <span style={{ color: GREEN, flexShrink: 0 }}>{f.startsWith("Everything") ? "\u2605" : "\u2713"}</span>{f}
                </div>
              ))}
              <button onClick={() => nav("signup")} style={{ width: "100%", marginTop: 16, padding: "12px 0", background: p.badge ? WHITE : "transparent", color: p.badge ? BLACK : WHITE, border: p.badge ? "none" : `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Start Free Trial</button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: MUTED }}>Need more than 15 aircraft or custom integrations? <button onClick={() => window.location.href = "mailto:support@preflightsms.com"} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Contact us for Enterprise pricing</button></div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 32px 80px", textAlign: "center" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "40px 32px", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", fontFamily: "Georgia, serif" }}>Ready to Get Compliant?</h2>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>Set up your SMS in minutes. Your team can be submitting FRATs today.</p>
          <button onClick={() => nav("signup")} style={{ padding: "14px 40px", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Start Free Trial</button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 11, color: MUTED }}>{"\u00A9"} {new Date().getFullYear()} PreflightSMS. Built for aviation safety.</div>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={() => nav("login")} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}>Log In</button>
          <button onClick={() => nav("signup")} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}>Sign Up</button>
        </div>
      </footer>
    </div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────
function SignupFlow({ onAuth }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [certType, setCertType] = useState("Part 135");
  const [fleetSize, setFleetSize] = useState("1-5");
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [agreedTos, setAgreedTos] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const daysLeft = useMemo(() => Math.floor((new Date("2027-05-28") - new Date()) / 864e5), []);

  const next = () => {
    setError("");
    if (step === 1) {
      if (!name.trim()) { setError("What\u2019s your name?"); return; }
      if (!email || !email.includes("@")) { setError("We need a valid email"); return; }
      const disposable = ["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com"];
      const domain = email.split("@")[1];
      if (domain && disposable.includes(domain.toLowerCase())) { setError("Please use a work email address"); return; }
      if (!password || password.length < 6) { setError("Password needs at least 6 characters"); return; }
      setStep(2); return;
    }
    if (step === 2) {
      if (!orgName.trim()) { setError("What\u2019s your organization called?"); return; }
      setStep(3); return;
    }
    submit();
  };

  const submit = async () => {
    if (!agreedTos) { setError("Please agree to the Terms of Service and Privacy Policy"); return; }
    setError(""); setLoading(true);
    try {
      // 1. Create org via API route (uses service role to bypass RLS)
      const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const tier = selectedPlan;
      const features = getTierFeatures(tier);
      const orgRes = await fetch("/api/create-org", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim(), slug, tier, feature_flags: features,
          subscription_status: "trial", max_aircraft: tier === "enterprise" ? 999 : tier === "professional" ? 15 : 5 }),
      });
      const orgJson = await orgRes.json();
      if (!orgRes.ok || !orgJson.data) { setError(orgJson.error || "Failed to create organization"); setLoading(false); return; }
      // 2. Sign up user with org
      const { error: signupErr } = await signUp(email, password, name.trim(), orgJson.data.id);
      if (signupErr) { setError(signupErr.message); setLoading(false); return; }
      // 3. Sign in and set as admin
      const { data: session } = await signIn(email, password);
      if (session?.session) {
        await supabase.from("profiles").update({ role: "admin" }).eq("id", session.session.user.id);
        onAuth(session.session);
      } else {
        setError("Account created! Check your email to confirm, then log in.");
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const proofIcon = { width: 32, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 };
  const proofCard = { display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6 };

  const slides = {
    1: { label: "Why PreflightSMS", headline: "SMS Compliance Without the Enterprise Price Tag.", body: "Most Part 135 operators are stuck between bloated airline platforms and cobbled-together spreadsheets. We built PreflightSMS to fill that gap.", proofs: [
      { icon: "\u2713", title: "14 CFR Part 5 Aligned", desc: "Every feature maps to a Part 5 requirement." },
      { icon: "\u29D7", title: "Live in Days, Not Months", desc: "Configure your fleet and start documenting immediately." },
      { icon: "\u2606", title: "No Credit Card Required", desc: "Full Professional access for 14 days." },
    ]},
    2: { label: "Built for Charter", headline: "Designed for Part 135. Not Retrofitted From Airlines.", body: "Every workflow and default is calibrated for how charter operators actually run \u2014 small crews, fast turnarounds, distributed bases.", proofs: [
      { icon: "\u25A3", title: "One Platform", desc: "FRAT, flight following, crew, training, hazards \u2014 all integrated." },
      { icon: "\u25C8", title: "Mobile-First", desc: "Pilots complete FRATs from any device. No app download." },
      { icon: "\u26A0", title: "Anonymous Reporting", desc: "Non-punitive hazard reporting \u2014 the foundation of just culture." },
    ]},
    3: { label: "The Deadline Is Real", headline: "Your FSDO Won\u2019t Wait.", body: "Every Part 135 operator needs a compliant SMS by May 28, 2027. Most implementations take 6\u201312 months.", proofs: [
      { icon: "\u2713", title: "Full Features During Trial", desc: "FRAT, flight following, crew management, CBT, analytics \u2014 everything." },
      { icon: "\u2691", title: "Your Data, Your Control", desc: "Export anytime. No lock-in. Cancel with one click." },
    ]},
  };
  const slide = slides[step];

  return (
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <style>{`@media(max-width:768px){
.signup-split{grid-template-columns:1fr !important;min-height:auto !important}
.signup-left-panel{display:none !important}
.signup-right-panel{padding:24px 20px !important}
.signup-plan-grid{grid-template-columns:1fr !important}
}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: DARK, zIndex: 100 }}>
        <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 32, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
        <button onClick={() => { window.location.search = "login"; }} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "6px 14px", cursor: "pointer" }}>Log in</button>
      </div>
      <div className="signup-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 53px)" }}>
        {/* LEFT: Marketing */}
        <div className="signup-left-panel" style={{ borderRight: `1px solid ${BORDER}`, background: NEAR_BLACK, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 40px", position: "relative", overflow: "hidden" }}>
            {[15, 38, 62, 85].map(top => (
              <div key={top} style={{ position: "absolute", top: `${top}%`, left: "-10%", width: "120%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)", transform: "rotate(-6deg)", pointerEvents: "none" }} />
            ))}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, boxShadow: "0 0 8px rgba(74,222,128,0.4)" }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: SUBTLE }}>{slide.label}</span>
              </div>
              {step === 3 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 4, marginBottom: 20 }}>
                  <span style={{ fontSize: 12, color: AMBER }}>{"\u23F1"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, letterSpacing: 0.5 }}>{daysLeft} days until deadline</span>
                </div>
              )}
              <h2 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1, color: WHITE, margin: "0 0 14px", fontFamily: "Georgia, serif" }}>{slide.headline}</h2>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: MUTED, marginBottom: 28, maxWidth: 380 }}>{slide.body}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {slide.proofs.map(p => (
                  <div key={p.title} style={proofCard}>
                    <div style={proofIcon}><span style={{ color: OFF_WHITE }}>{p.icon}</span></div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: WHITE, marginBottom: 2 }}>{p.title}</div>
                      <div style={{ fontSize: 11, lineHeight: 1.45, color: MUTED }}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: `1px solid ${BORDER}`, background: CARD }}>
            {[{ num: "\u00A75.1\u20135.97", label: "Part 5 Aligned" }, { num: "14-Day", label: "Free Trial" }, { num: "$0", label: "To Get Started" }].map((s, i) => (
              <div key={s.label} style={{ padding: "16px", textAlign: "center", borderRight: i < 2 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: WHITE, marginBottom: 2 }}>{s.num}</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: SUBTLE }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* RIGHT: Form */}
        <div className="signup-right-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 44px" }}>
          <div style={{ maxWidth: 440, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
              {["Account", "Operation", "Plan"].map((s, i) => (
                <div key={s} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: step > i+1 ? GREEN : step === i+1 ? WHITE : NEAR_BLACK, color: step > i+1 ? BLACK : step === i+1 ? BLACK : MUTED, border: `2px solid ${step > i+1 ? GREEN : step === i+1 ? WHITE : BORDER}`, transition: "all 0.3s" }}>
                      {step > i + 1 ? "\u2713" : i + 1}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: step >= i+1 ? WHITE : MUTED }}>{s}</span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: step > i+1 ? GREEN : BORDER, margin: "0 10px", transition: "all 0.3s" }} />}
                </div>
              ))}
            </div>
            {step === 1 && (<>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: WHITE, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>Create your account</h1>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 28px" }}>Full Professional access for 14 days. No credit card.</p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="James Mitchell" autoFocus style={{ ...inp, padding: "12px 14px", fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Work Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourcompany.com" style={{ ...inp, padding: "12px 14px", fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ ...inp, padding: "12px 14px", fontSize: 14 }} onKeyDown={e => { if (e.key === "Enter") next(); }} />
              </div>
            </>)}
            {step === 2 && (<>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: WHITE, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>Your operation</h1>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 28px" }}>We&apos;ll configure your workspace. Change anything later.</p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Company Name</label>
                <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="SkyCharter Aviation" autoFocus style={{ ...inp, padding: "12px 14px", fontSize: 14 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Certificate</label>
                  <select value={certType} onChange={e => setCertType(e.target.value)} style={{ ...inp, padding: "12px 14px", fontSize: 13, appearance: "auto" }}>
                    <option value="Part 135">Part 135</option><option value="Part 121">Part 121</option><option value="Part 91">Part 91</option><option value="Part 91K">Part 91K</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Fleet Size</label>
                  <select value={fleetSize} onChange={e => setFleetSize(e.target.value)} style={{ ...inp, padding: "12px 14px", fontSize: 13, appearance: "auto" }}>
                    <option value="1-5">1–5 aircraft</option><option value="6-15">6–15 aircraft</option><option value="16+">16+ aircraft</option>
                  </select>
                </div>
              </div>
              {orgName.trim() && (
                <div style={{ padding: "10px 14px", borderRadius: 6, background: NEAR_BLACK, border: `1px solid ${BORDER}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: MUTED }}>Team join code</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: CYAN, fontFamily: "monospace" }}>{orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}</div>
                </div>
              )}
            </>)}
            {step === 3 && (<>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: WHITE, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>Pick your plan — no credit card required.</h1>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 24px" }}>Both include a full 14-day trial. Upgrade or downgrade anytime.</p>
              <div className="signup-plan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { id: "starter", name: "Starter", price: "$149", desc: "Up to 5 aircraft", features: ["FRAT & Flight Following", "Crew Roster & Currency", "Safety Reporting", "Investigation Register", "Policy Library"] },
                  { id: "professional", name: "Professional", price: "$299", desc: "Up to 15 aircraft", badge: true, features: ["Everything in Starter", "Dashboard Analytics", "FAA Audit Log", "Custom FRAT Templates", "CBT Modules", "Approval Workflows"] },
                ].map(p => (
                  <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{ ...card, padding: "18px 16px", cursor: "pointer", position: "relative", transition: "all 0.2s", border: `2px solid ${selectedPlan === p.id ? (p.badge ? GREEN : WHITE) : BORDER}`, background: selectedPlan === p.id ? "rgba(255,255,255,0.03)" : CARD }}>
                    {p.badge && <div style={{ position: "absolute", top: -8, right: 10, fontSize: 8, fontWeight: 700, color: BLACK, background: GREEN, padding: "2px 8px", borderRadius: 3 }}>RECOMMENDED</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div><div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{p.name}</div><div style={{ fontSize: 10, color: MUTED }}>{p.desc}</div></div>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selectedPlan === p.id ? GREEN : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{selectedPlan === p.id && <div style={{ width: 10, height: 10, borderRadius: "50%", background: GREEN }} />}</div>
                    </div>
                    <div style={{ marginBottom: 10 }}><span style={{ fontSize: 24, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{p.price}</span><span style={{ fontSize: 11, color: MUTED }}>/mo after trial</span></div>
                    {p.features.map((f, i) => (<div key={i} style={{ fontSize: 10, color: f.startsWith("Everything") ? CYAN : OFF_WHITE, padding: "2px 0", display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: GREEN, flexShrink: 0 }}>{f.startsWith("Everything") ? "\u2605" : "\u2713"}</span>{f}</div>))}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: MUTED, textAlign: "center" }}>No charge during your trial. Cancel anytime.</div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, cursor: "pointer" }}>
                <input type="checkbox" checked={agreedTos} onChange={e => setAgreedTos(e.target.checked)} style={{ marginTop: 2, accentColor: CYAN }} />
                <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>I agree to the <a href="/terms" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Privacy Policy</a></span>
              </label>
            </>)}
            {error && <div style={{ color: error.includes("Check your email") || error.includes("created") ? GREEN : RED, fontSize: 12, padding: "10px 14px", borderRadius: 8, background: error.includes("created") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              {step > 1 && <button onClick={() => { setStep(step - 1); setError(""); }} style={{ padding: "13px 20px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{"\u2190"}</button>}
              <button onClick={next} disabled={loading} style={{ flex: 1, padding: "13px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, letterSpacing: 0.3 }}>
                {loading ? "Setting up..." : step === 3 ? "Start Free Trial \u2192" : "Continue \u2192"}</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: MUTED }}>
              {step === 1 && <>Already have an account? <button onClick={() => { window.location.search = "login"; }} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Log in</button></>}
              {step === 3 && <>16+ aircraft? <button onClick={() => window.location.href = "mailto:support@preflightsms.com"} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Contact us for Enterprise</button></>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── INVITE ACCEPT SCREEN ─────────────────────────────────────
function InviteAcceptScreen({ token, onAuth }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("loading"); // loading | form | expired | error
  const [agreedTos, setAgreedTos] = useState(false);

  useEffect(() => {
    if (!token) { setStep("error"); setError("No invitation token"); setLoading(false); return; }
    getInvitationByToken(token).then(({ data, error: err }) => {
      setLoading(false);
      if (err || !data) { setStep("expired"); return; }
      if (new Date(data.expires_at) < new Date()) { setStep("expired"); return; }
      setInvite(data);
      setEmail(data.email);
      setStep("form");
    });
  }, [token]);

  const handleAccept = async () => {
    if (!name.trim()) { setError("Enter your name"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (!agreedTos) { setError("Please agree to the Terms of Service and Privacy Policy"); return; }
    setError(""); setSubmitting(true);
    try {
      // Sign up with the invited email
      const { error: signupErr } = await signUp(email, password, name.trim(), invite.org_id);
      if (signupErr) { setError(signupErr.message); setSubmitting(false); return; }
      // Sign in
      const { data: session, error: loginErr } = await signIn(email, password);
      if (loginErr) { setError("Account created. Check your email to confirm, then log in."); setSubmitting(false); return; }
      // Set the invited role
      if (session?.session) {
        await supabase.from("profiles").update({ role: invite.role }).eq("id", session.session.user.id);
        // Mark invitation as accepted
        await acceptInvitation(token, session.session.user.id);
        // Clear URL and auth
        if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
        onAuth(session.session);
      }
    } catch (e) { setError(e.message); }
    setSubmitting(false);
  };

  const roleLabel = invite?.role === "admin" ? "Administrator" :
    invite?.role === "safety_manager" ? "Safety Manager" :
    invite?.role === "chief_pilot" ? "Chief Pilot" :
    invite?.role === "dispatcher" ? "Dispatcher" :
    invite?.role === "accountable_exec" ? "Accountable Executive" : "Pilot";

  return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...card, padding: "32px 28px", maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 100, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
        </div>

        {step === "loading" && <div style={{ textAlign: "center", padding: 24, color: MUTED, fontSize: 13 }}>Loading invitation...</div>}

        {step === "expired" && (
          <div style={{ textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏰</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Invitation Expired</div>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 20 }}>This invitation link has expired or is no longer valid. Ask your organization admin to send a new one.</div>
            <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }}
              style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Go to Login</button>
          </div>
        )}

        {step === "form" && invite && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Join {invite.organizations?.name || "Organization"}</div>
              <div style={{ fontSize: 12, color: MUTED }}>You've been invited as a <span style={{ color: CYAN, fontWeight: 600 }}>{roleLabel}</span></div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
              <input type="email" value={email} disabled style={{ ...inp, opacity: 0.6, cursor: "not-allowed" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
                style={inp} onKeyDown={e => { if (e.key === "Enter") handleAccept(); }} />
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={agreedTos} onChange={e => setAgreedTos(e.target.checked)} style={{ marginTop: 2, accentColor: CYAN }} />
              <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>I agree to the <a href="/terms" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Privacy Policy</a></span>
            </label>

            {error && <div style={{ color: error.includes("Check your email") ? GREEN : RED, fontSize: 11, marginBottom: 12, padding: "8px 10px", borderRadius: 6, background: error.includes("Check your email") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)" }}>{error}</div>}

            <button onClick={handleAccept} disabled={submitting}
              style={{ width: "100%", padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Creating account..." : "Accept & Join"}</button>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: MUTED }}>
              Already have an account? <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Log in</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onAuth, initialMode }) {
  const [mode, setMode] = useState(initialMode || "login"); // login | signup | join | forgot | reset_password
  const [step, setStep] = useState(1); // signup steps: 1=account, 2=org, 3=plan
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [certType, setCertType] = useState("Part 135");
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [agreedTos, setAgreedTos] = useState(false);

  // Check for recovery token in URL hash on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    // Supabase appends #access_token=...&type=recovery to the redirect URL
    if (hash.includes("type=recovery") || params.has("reset")) {
      setMode("reset_password");
    }
  }, []);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    const { data, error: err } = await signIn(email, password);
    if (err) { setError(err.message); setLoading(false); return; }
    onAuth(data.session);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError("Enter your email address"); return; }
    setError(""); setLoading(true);
    const { error: err } = await resetPasswordForEmail(email.trim());
    setLoading(false);
    if (err) { setError(err.message); return; }
    setResetSent(true);
  };

  const handleSetNewPassword = async () => {
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }
    setError(""); setLoading(true);
    const { error: err } = await updateUserPassword(password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setPasswordUpdated(true);
    // Clear hash from URL
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (mode === "signup" && step === 1) { if (!email || !password || password.length < 6) { setError("Email and password (min 6 chars) required"); return; } setError(""); setStep(2); return; }
    if (mode === "signup" && step === 2) { if (!orgName.trim()) { setError("Organization name is required"); return; } setError(""); setStep(3); return; }
    if (!agreedTos) { setError("Please agree to the Terms of Service and Privacy Policy"); return; }
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        // 1. Create org via API route (uses service role to bypass RLS)
        const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const tier = selectedPlan;
        const features = getTierFeatures(tier);
        const orgRes = await fetch("/api/create-org", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: orgName.trim(), slug, tier, feature_flags: features,
            subscription_status: "trial", max_aircraft: tier === "enterprise" ? 999 : tier === "professional" ? 15 : 5 }),
        });
        const orgJson = await orgRes.json();
        if (!orgRes.ok || !orgJson.data) { setError(orgJson.error || "Failed to create organization"); setLoading(false); return; }
        // 2. Sign up user with org
        const { error: signupErr } = await signUp(email, password, name.trim(), orgJson.data.id);
        if (signupErr) { setError(signupErr.message); setLoading(false); return; }
        // 3. Sign in and set as admin
        const { data: session } = await signIn(email, password);
        if (session?.session) {
          await supabase.from("profiles").update({ role: "admin" }).eq("id", session.session.user.id);
          onAuth(session.session);
          setLoading(false);
          return;
        }
      } else {
        const { data: orgData, error: orgErr } = await supabase.from("organizations").select("id").eq("slug", joinCode.trim().toLowerCase()).single();
        if (orgErr || !orgData) { setError("Organization not found. Check your join code."); setLoading(false); return; }
        const { error: signupErr } = await signUp(email, password, name.trim(), orgData.id);
        if (signupErr) { setError(signupErr.message); setLoading(false); return; }
      }
      setError("Check your email to confirm your account, then log in.");
      setMode("login");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const plans = [
    { id: "starter", name: "Starter", price: "$149", period: "/mo", desc: "Core SMS for small operators", features: ["Flight Risk Assessment (FRAT)", "Flight Following", "Safety Reports & Investigations", "Corrective Actions", "Crew Roster & Currency", "Policy Library", "Basic Dashboard", "Up to 5 aircraft"] },
    { id: "professional", name: "Professional", price: "$299", period: "/mo", desc: "Full SMS with analytics & compliance", features: ["Everything in Starter, plus:", "Dashboard Analytics & Trends", "Safety Trend Alerts", "FAA Part 5 Audit Log", "Scheduled PDF Reports", "Document Library", "Custom FRAT Templates", "Approval Workflows", "Up to 15 aircraft"] },
  ];

  return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`@media(max-width:768px){.auth-plan-grid{grid-template-columns:1fr !important}}`}</style>
      <div style={{ ...card, padding: "32px 28px", maxWidth: mode === "signup" && step === 3 ? 680 : 400, width: "100%", transition: "max-width 0.3s" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 100, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} /></div>

        {/* Mode tabs - only show on login/signup/join step 1 */}
        {(mode !== "signup" || step === 1) && mode !== "forgot" && mode !== "reset_password" && <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[["login", "Log In"], ["signup", "New Org"], ["join", "Join Org"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setStep(1); setError(""); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `1px solid ${mode === m ? WHITE : BORDER}`,
                background: mode === m ? WHITE : "transparent", color: mode === m ? BLACK : MUTED,
                fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{label}</button>))}</div>}

        {/* Signup step indicator */}
        {mode === "signup" && step > 1 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
            {["Account", "Organization", "Plan"].map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                  background: step > i + 1 ? GREEN : step === i + 1 ? WHITE : NEAR_BLACK,
                  color: step > i + 1 ? BLACK : step === i + 1 ? BLACK : MUTED,
                  border: `1px solid ${step >= i + 1 ? "transparent" : BORDER}` }}>{step > i + 1 ? "\u2713" : i + 1}</div>
                <span style={{ fontSize: 10, color: step === i + 1 ? WHITE : MUTED, fontWeight: 600 }}>{s}</span>
                {i < 2 && <span style={{ color: BORDER, fontSize: 10 }}>{"\u2014"}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Login form */}
        {mode === "login" && (<>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pilot@company.com" style={inp} /></div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"
              style={inp} onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} /></div>
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <button onClick={() => { setMode("forgot"); setError(""); setResetSent(false); }} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 11 }}>Forgot password?</button>
          </div>
        </>)}

        {/* Forgot password */}
        {mode === "forgot" && (<>
          {!resetSent ? (<>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Reset Password</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Enter your email and we'll send you a reset link.</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pilot@company.com"
                style={inp} onKeyDown={e => { if (e.key === "Enter") handleForgotPassword(); }} /></div>
          </>) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Check Your Email</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>We sent a password reset link to <strong style={{ color: OFF_WHITE }}>{email}</strong>. Click the link in the email to set a new password.</div>
            </div>
          )}
        </>)}

        {/* Set new password (after clicking reset link) */}
        {mode === "reset_password" && (<>
          {!passwordUpdated ? (<>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Set New Password</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Enter your new password below.</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={inp} /></div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password"
                style={inp} onKeyDown={e => { if (e.key === "Enter") handleSetNewPassword(); }} /></div>
          </>) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 4 }}>Password Updated</div>
              <div style={{ fontSize: 12, color: MUTED }}>You can now log in with your new password.</div>
            </div>
          )}
        </>)}

        {/* Signup Step 1: Account info */}
        {mode === "signup" && step === 1 && (<>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} /></div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pilot@company.com" style={inp} /></div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
              style={inp} onKeyDown={e => { if (e.key === "Enter") handleSignup(); }} /></div>
        </>)}

        {/* Signup Step 2: Organization info */}
        {mode === "signup" && step === 2 && (<>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Organization Name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. SkyCharter Aviation" style={inp} /></div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Certificate Type</label>
            <select value={certType} onChange={e => setCertType(e.target.value)} style={{ ...inp, appearance: "auto" }}>
              <option value="Part 135">Part 135 — Commuter & On-Demand</option>
              <option value="Part 121">Part 121 — Scheduled Carriers</option>
              <option value="Part 91">Part 91 — General Aviation</option>
              <option value="Part 91K">Part 91K — Fractional Ownership</option>
              <option value="Other">Other</option>
            </select></div>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 16, padding: "8px 10px", borderRadius: 6, background: NEAR_BLACK }}>
            Your join code will be: <strong style={{ color: CYAN }}>{orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "..."}</strong>
            <br />Share this with your team so they can join your organization.</div>
        </>)}

        {/* Signup Step 3: Plan selection */}
        {mode === "signup" && step === 3 && (<>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>Choose Your Plan</div>
            <div style={{ fontSize: 11, color: MUTED }}>All plans include a 14-day free trial. No credit card required.</div>
          </div>
          <div className="auth-plan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {plans.map(p => (
              <div key={p.id} onClick={() => setSelectedPlan(p.id)}
                style={{ ...card, padding: "20px 16px", cursor: "pointer", position: "relative",
                  border: `2px solid ${selectedPlan === p.id ? WHITE : BORDER}`,
                  background: selectedPlan === p.id ? "rgba(255,255,255,0.03)" : CARD }}>
                {p.id === "professional" && <div style={{ position: "absolute", top: -8, right: 12, fontSize: 9, fontWeight: 700, color: BLACK, background: GREEN, padding: "2px 8px", borderRadius: 3 }}>RECOMMENDED</div>}
                <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 2 }}>{p.name}</div>
                <div style={{ marginBottom: 8 }}><span style={{ fontSize: 24, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{p.price}</span><span style={{ fontSize: 11, color: MUTED }}>{p.period}</span></div>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 12 }}>{p.desc}</div>
                {p.features.map((f, i) => (
                  <div key={i} style={{ fontSize: 10, color: f.startsWith("Everything") ? CYAN : OFF_WHITE, padding: "2px 0", display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ color: GREEN, flexShrink: 0, marginTop: 1 }}>{f.startsWith("Everything") ? "\u2605" : "\u2713"}</span>{f}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={agreedTos} onChange={e => setAgreedTos(e.target.checked)} style={{ marginTop: 2, accentColor: CYAN }} />
            <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>I agree to the <a href="/terms" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Privacy Policy</a></span>
          </label>
        </>)}

        {/* Join Org form */}
        {mode === "join" && (<>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} /></div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Organization Code</label>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. pvtair" style={inp} /></div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pilot@company.com" style={inp} /></div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
              style={inp} onKeyDown={e => { if (e.key === "Enter") handleSignup(); }} /></div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 8 }}>
            <input type="checkbox" checked={agreedTos} onChange={e => setAgreedTos(e.target.checked)} style={{ marginTop: 2, accentColor: CYAN }} />
            <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>I agree to the <a href="/terms" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Privacy Policy</a></span>
          </label>
        </>)}

        {error && <div style={{ color: error.includes("Check your email") ? GREEN : RED, fontSize: 11, marginBottom: 12, padding: "8px 10px", borderRadius: 6, background: error.includes("Check your email") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          {mode === "signup" && step > 1 && (
            <button onClick={() => { setStep(step - 1); setError(""); }}
              style={{ padding: "12px 20px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Back</button>
          )}
          {mode === "forgot" && resetSent ? (
            <button onClick={() => { setMode("login"); setError(""); setResetSent(false); }}
              style={{ flex: 1, padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Back to Login</button>
          ) : mode === "reset_password" && passwordUpdated ? (
            <button onClick={() => { setMode("login"); setError(""); setPasswordUpdated(false); setPassword(""); setConfirmPassword(""); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); }}
              style={{ flex: 1, padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Log In</button>
          ) : (
            <button onClick={mode === "login" ? handleLogin : mode === "forgot" ? handleForgotPassword : mode === "reset_password" ? handleSetNewPassword : handleSignup} disabled={loading}
              style={{ flex: 1, padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "..." : mode === "login" ? "Log In" : mode === "forgot" ? "Send Reset Link" : mode === "reset_password" ? "Update Password" : mode === "signup" && step === 1 ? "Next \u2192" : mode === "signup" && step === 2 ? "Next \u2192" : mode === "signup" && step === 3 ? "Start Free Trial" : "Join Organization"}</button>
          )}
        </div>

        {mode === "forgot" && !resetSent && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 11 }}>← Back to login</button>
          </div>
        )}

        {mode === "login" && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: MUTED }}>
            New to PreflightSMS? <button onClick={() => { setMode("signup"); setStep(1); setError(""); }} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Create an account</button>
          </div>
        )}
      </div></div>);
}

export default function PVTAIRFrat() {
  const _initTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
  const [cv, setCv] = useState(() => {
    if (_initTab === "subscription") return "admin";
    if (_initTab) return _initTab;
    return "submit";
  });
  const [initialAdminTab] = useState(_initTab === "subscription" ? "subscription" : null);
  useEffect(() => { if (_initTab && typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); }, []);
  const [records, setRecords] = useState([]);
  const [flights, setFlights] = useState([]);
  const [reports, setReports] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [actions, setActions] = useState([]);
  const [crewRecords, setCrewRecords] = useState([]);
  const [fleetAircraft, setFleetAircraft] = useState([]);
  const [orgProfiles, setOrgProfiles] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [trainingReqs, setTrainingReqs] = useState([]);
  const [trainingRecs, setTrainingRecs] = useState([]);
  const [cbtCourses, setCbtCourses] = useState([]);
  const [cbtLessonsMap, setCbtLessonsMap] = useState({}); // { courseId: [lessons] }
  const [cbtProgress, setCbtProgress] = useState([]);
  const [cbtEnrollments, setCbtEnrollments] = useState([]);
  const [smsManuals, setSmsManuals] = useState([]);
  const [templateVariables, setTemplateVariables] = useState({});
  const [smsSignatures, setSmsSignatures] = useState({});
  const [isAuthed, setIsAuthed] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingSync, setPendingSync] = useState(0);
  // Supabase auth state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [fratTemplate, setFratTemplate] = useState(null);
  const [fratTemplates, setFratTemplates] = useState([]);
  const [hazardFromReport, setHazardFromReport] = useState(null);
  const [actionFromInvestigation, setActionFromInvestigation] = useState(null);
  const [notifContacts, setNotifContacts] = useState([]);
  const [invitations_list, setInvitationsList] = useState([]);
  const isOnline = !!supabase;
  const org = profile?.organizations || {};

  // Derived template config
  const riskCategories = fratTemplate?.categories || DEFAULT_RISK_CATEGORIES;
  const riskLevels = fratTemplate?.risk_thresholds ? buildRiskLevels(fratTemplate.risk_thresholds) : DEFAULT_RISK_LEVELS;
  const aircraftTypes = fratTemplate?.aircraft_types || DEFAULT_AIRCRAFT_TYPES;

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
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at,
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

  // Handle payment return from Stripe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("payment")) {
      const status = params.get("payment");
      if (status === "success") {
        setToast({ message: "Payment successful! Your subscription is now active.", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
        // Refresh profile to get updated subscription status
        setTimeout(() => { getProfile().then(p => { if (p) setProfile(p); }); }, 2000);
      } else if (status === "canceled") {
        setToast({ message: "Checkout canceled", level: { bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", color: YELLOW } });
      }
      setTimeout(() => setToast(null), 5000);
      window.history.replaceState(null, "", window.location.pathname);
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
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [],
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
    // Load FRAT template
    fetchFratTemplate(orgId).then(({ data }) => { if (data) setFratTemplate(data); });
    fetchAllFratTemplates(orgId).then(({ data }) => { setFratTemplates(data || []); });
    // Load reports, hazards, actions, policies, training
    fetchReports(orgId).then(({ data }) => setReports(data || []));
    fetchHazards(orgId).then(({ data }) => setHazards(data || []));
    fetchActions(orgId).then(({ data }) => setActions(data || []));
    fetchCrewRecords(orgId).then(({ data }) => setCrewRecords(data || []));
    fetchAircraft(orgId).then(({ data }) => setFleetAircraft(data || []));
    fetchOrgProfiles(orgId).then(({ data }) => setOrgProfiles(data || []));
    fetchPolicies(orgId).then(({ data }) => setPolicies(data || []));
    fetchTrainingRequirements(orgId).then(({ data }) => setTrainingReqs(data || []));
    fetchTrainingRecords(orgId).then(({ data }) => setTrainingRecs(data || []));
    // CBT
    fetchCbtCourses(orgId).then(({ data }) => {
      setCbtCourses(data || []);
      // Fetch lessons for each course
      (data || []).forEach(c => {
        fetchCbtLessons(c.id).then(({ data: lessons }) => {
          setCbtLessonsMap(prev => ({ ...prev, [c.id]: lessons || [] }));
        });
      });
    });
    fetchCbtProgress(orgId).then(({ data }) => setCbtProgress(data || []));
    fetchCbtEnrollments(orgId).then(({ data }) => setCbtEnrollments(data || []));
    fetchNotificationContacts(orgId).then(({ data }) => setNotifContacts(data || []));
    fetchInvitations(orgId).then(({ data }) => setInvitationsList(data || []));
    fetchSmsManuals(orgId).then(({ data }) => setSmsManuals(data || []));
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [profile]);

  // Load SMS template variables & signatures from org settings
  useEffect(() => {
    const orgSettings = profile?.organizations?.settings || {};
    setTemplateVariables(orgSettings.sms_template_variables || {});
    setSmsSignatures(orgSettings.sms_signatures || {});
  }, [profile]);

  // ── localStorage helpers (offline mode only) ──
  const saveLocal = useCallback(nr => { setRecords(nr); try { localStorage.setItem("pvtair_frat_records", JSON.stringify(nr)); } catch (e) {} }, []);
  const saveFlightsLocal = useCallback(nf => { setFlights(nf); try { localStorage.setItem("pvtair_flights", JSON.stringify(nf)); } catch (e) {} }, []);

  // ── Submit FRAT ──
  const onSubmit = useCallback(async entry => {
    // Determine if approval is required based on score threshold (only if feature enabled)
    const approvalThreshold = fratTemplate?.approval_threshold || 31;
    const needsApproval = hasFeature(org, "approval_workflow") && entry.score >= approvalThreshold;

    if (isOnline && profile) {
      const { data: fratData, error: fratErr } = await submitFRAT(profile.org_id, session.user.id, {
        ...entry,
        approvalStatus: needsApproval ? "pending" : "auto_approved",
      }).catch(e => ({ data: null, error: e }));
      if (fratErr) {
        // Queue for offline sync
        enqueue({ type: "frat_submit", payload: { orgId: profile.org_id, userId: session.user.id, entry } });
        setPendingSync(getQueueCount());
        const localFlight = { id: entry.id, pilot: entry.pilot, aircraft: entry.aircraft, tailNumber: entry.tailNumber || "", departure: entry.departure, destination: entry.destination, cruiseAlt: entry.cruiseAlt || "", etd: entry.etd || "", ete: entry.ete || "", eta: entry.eta || "", fuelLbs: entry.fuelLbs || "", numCrew: entry.numCrew || "", numPax: entry.numPax || "", score: entry.score, riskLevel: entry.riskLevel, status: needsApproval ? "PENDING_APPROVAL" : "ACTIVE", timestamp: entry.timestamp, arrivedAt: null, pendingSync: true };
        setFlights(prev => [localFlight, ...prev]);
        setRecords(prev => [entry, ...prev]);
        setToast({ message: `${entry.id} saved offline — will sync when connected`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 5000);
        return;
      }
      const { error: flightErr } = await createFlight(profile.org_id, fratData.id, entry, needsApproval);
      if (flightErr) console.error("Flight create error:", flightErr);

      // Send approval request email if needed
      if (needsApproval) {
        try {
          await fetch("/api/request-approval", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId: profile.org_id,
              fratCode: entry.id,
              pilot: entry.pilot,
              aircraft: entry.aircraft,
              tailNumber: entry.tailNumber,
              departure: entry.departure,
              destination: entry.destination,
              score: entry.score,
              riskLevel: entry.riskLevel,
              orgName: profile?.organizations?.name || "",
            }),
          });
        } catch (e) { console.error("Approval notification error:", e); }
      }

      // Refresh data from server
      const { data: frats } = await fetchFRATs(profile.org_id);
      setRecords(frats.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs,
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at,
        approvalStatus: r.approval_status,
      })));
      const { data: fl } = await fetchFlights(profile.org_id);
      setFlights(fl.map(f => ({
        id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
        departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
        etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs,
        numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
        status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at, cancelled: f.status === "CANCELLED",
        approvalStatus: f.approval_status, fratDbId: f.frat_id,
      })));
    } else {
      const nr = [entry, ...records]; saveLocal(nr);
      const flight = { id: entry.id, pilot: entry.pilot, aircraft: entry.aircraft, tailNumber: entry.tailNumber || "", departure: entry.departure, destination: entry.destination, cruiseAlt: entry.cruiseAlt || "", etd: entry.etd || "", ete: entry.ete || "", eta: entry.eta || "", fuelLbs: entry.fuelLbs || "", numCrew: entry.numCrew || "", numPax: entry.numPax || "", score: entry.score, riskLevel: entry.riskLevel, status: needsApproval ? "PENDING_APPROVAL" : "ACTIVE", timestamp: entry.timestamp, arrivedAt: null };
      const nf = [flight, ...flights]; saveFlightsLocal(nf);
    }
    const toastMsg = needsApproval ? `${entry.id} submitted — awaiting supervisor approval` : `${entry.id} submitted — flight plan created`;
    setToast({ message: toastMsg, level: getRiskLevel(entry.score, riskLevels) }); setTimeout(() => setToast(null), 4000);
  }, [records, flights, saveLocal, saveFlightsLocal, profile, session, isOnline, fratTemplate]);

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
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at,
      })));
    } else {
      saveLocal(records.filter(r => r.id !== id));
    }
  }, [records, saveLocal, profile, isOnline]);

  // ── Submit Safety Report ──
  const onSubmitReport = useCallback(async (report) => {
    if (isOnline && profile) {
      const { error } = await submitReport(profile.org_id, session.user.id, report);
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
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
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchHazards(profile.org_id);
      setHazards(data || []);
      // Auto-advance linked report to "investigation"
      if (hazard.relatedReportId) {
        await updateReport(hazard.relatedReportId, { status: "investigation" });
        const { data: rpts } = await fetchReports(profile.org_id);
        setReports(rpts || []);
      }
      setToast({ message: `${hazard.hazardCode} registered`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 4000);
    }
  }, [profile, session, isOnline]);

  // ── Corrective Actions ──
  const onCreateAction = useCallback(async (action) => {
    if (isOnline && profile) {
      const { error } = await createAction(profile.org_id, action);
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchActions(profile.org_id);
      setActions(data || []);
      // Auto-advance linked report to "corrective_action"
      if (action.reportId) {
        await updateReport(action.reportId, { status: "corrective_action" });
        const { data: rpts } = await fetchReports(profile.org_id);
        setReports(rpts || []);
      }
      setToast({ message: `${action.actionCode} created`, level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ADE80" } }); setTimeout(() => setToast(null), 4000);
    }
  }, [profile, isOnline]);

  const onUpdateAction = useCallback(async (actionId, updates) => {
    if (isOnline && profile) {
      // If completing/cancelling, find linked report to auto-close
      if (updates.status === "completed" || updates.status === "cancelled") {
        const action = actions.find(a => a.id === actionId);
        if (action?.hazard_id) {
          const hazard = hazards.find(h => h.id === action.hazard_id);
          if (hazard?.related_report_id) {
            await updateReport(hazard.related_report_id, { status: "closed", closed_at: new Date().toISOString() });
            const { data: rpts } = await fetchReports(profile.org_id);
            setReports(rpts || []);
          }
        }
      }
      await updateAction(actionId, updates);
      const { data } = await fetchActions(profile.org_id);
      setActions(data || []);
    }
  }, [profile, isOnline, actions, hazards]);

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
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
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
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchTrainingRequirements(profile.org_id);
      setTrainingReqs(data || []);
    }
  }, [profile, isOnline]);

  const onLogTraining = useCallback(async (record) => {
    if (isOnline && profile) {
      const { error } = await createTrainingRecord(profile.org_id, session.user.id, record);
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchTrainingRecords(profile.org_id);
      setTrainingRecs(data || []);
      setToast({ message: "Training logged", level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ADE80" } }); setTimeout(() => setToast(null), 3000);
    }
  }, [profile, session, isOnline]);

  const onDeleteTrainingRecord = useCallback(async (id) => {
    if (isOnline && profile) {
      await deleteTrainingRecord(id);
      const { data } = await fetchTrainingRecords(profile.org_id);
      setTrainingRecs(data || []);
    }
  }, [profile, isOnline]);

  const onDeleteRequirement = useCallback(async (id) => {
    if (isOnline && profile) {
      await deleteTrainingRequirement(id);
      const { data } = await fetchTrainingRequirements(profile.org_id);
      setTrainingReqs(data || []);
    }
  }, [profile, isOnline]);

  // ── CBT ──
  const refreshCbt = useCallback(async () => {
    if (!profile) return;
    const orgId = profile.org_id;
    const { data: courses } = await fetchCbtCourses(orgId);
    setCbtCourses(courses || []);
    (courses || []).forEach(c => {
      fetchCbtLessons(c.id).then(({ data: lessons }) => {
        setCbtLessonsMap(prev => ({ ...prev, [c.id]: lessons || [] }));
      });
    });
    const { data: prog } = await fetchCbtProgress(orgId);
    setCbtProgress(prog || []);
    const { data: enr } = await fetchCbtEnrollments(orgId);
    setCbtEnrollments(enr || []);
  }, [profile]);

  const onCreateCbtCourse = useCallback(async (course) => {
    if (!isOnline || !profile) return;
    const { error } = await createCbtCourse(profile.org_id, session.user.id, course);
    if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); }
  }, [profile, session, isOnline]);

  const onUpdateCbtCourse = useCallback(async (courseId, updates) => {
    if (!isOnline) return;
    const { error } = await updateCbtCourse(courseId, updates);
    if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); }
  }, [isOnline]);

  const onSaveCbtLesson = useCallback(async (courseId, lesson) => {
    if (!isOnline || !profile) return;
    const { error } = await upsertCbtLesson(profile.org_id, courseId, lesson);
    if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); }
  }, [profile, isOnline]);

  const onDeleteCbtLesson = useCallback(async (lessonId) => {
    if (!isOnline) return;
    await deleteCbtLesson(lessonId);
  }, [isOnline]);

  const onUpdateCbtProgress = useCallback(async (courseId, lessonId, prog) => {
    if (!isOnline || !profile) return;
    await upsertCbtProgress(profile.org_id, courseId, lessonId, session.user.id, prog);
  }, [profile, session, isOnline]);

  const onUpdateCbtEnrollment = useCallback(async (courseId, enrollment) => {
    if (!isOnline || !profile) return;
    await upsertCbtEnrollment(profile.org_id, courseId, session.user.id, enrollment);
  }, [profile, session, isOnline]);

  const onInitTraining = useCallback(async (requirements, courses) => {
    if (!isOnline || !profile) return;
    const orgId = profile.org_id;
    const userId = session.user.id;
    for (const req of requirements) {
      await createTrainingRequirement(orgId, req);
    }
    for (const tmpl of courses) {
      const { lessons: lessonTmpls, ...courseData } = tmpl;
      const { data: course, error } = await createCbtCourse(orgId, userId, { ...courseData, status: "draft" });
      if (error || !course) continue;
      for (const lesson of lessonTmpls) {
        await upsertCbtLesson(orgId, course.id, lesson);
      }
      await updateCbtCourse(course.id, { status: "published" });
    }
    const { data: reqs } = await fetchTrainingRequirements(orgId);
    setTrainingReqs(reqs || []);
    await refreshCbt();
    setToast({ message: "Part 5 training program initialized", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
    setTimeout(() => setToast(null), 3000);
  }, [profile, session, isOnline, refreshCbt]);

  // Detect password recovery redirect (Supabase sets session + hash contains type=recovery)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    if (hash.includes("type=recovery") || params.has("reset")) {
      setIsPasswordRecovery(true);
    }
  }, []);

  if (authLoading) return <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: MUTED, fontSize: 14 }}>Loading...</div></div>;

  // Show reset password form even if session exists (recovery flow)
  if (isPasswordRecovery) {
    return <AuthScreen onAuth={(s) => { setIsPasswordRecovery(false); setSession(s); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); }} initialMode="reset_password" />;
  }

  if (isOnline && !session) {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (params?.has("signup")) return <SignupFlow onAuth={setSession} />;
    if (params?.has("invite")) return <InviteAcceptScreen token={params.get("invite")} onAuth={setSession} />;
    const initialMode = params?.has("join") ? "join" : "login";
    return <AuthScreen onAuth={setSession} initialMode={initialMode} />;
  }

  // Session exists but no profile — user was removed from org
  if (isOnline && session && !authLoading && !profile) {
    return (
      <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...card, padding: 48, maxWidth: 440, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${AMBER}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 28 }}>{"\u26A0"}</span></div>
          <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 8px", fontSize: 20 }}>No Organization Found</h2>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "0 0 24px" }}>Your account is not associated with any organization. You may have been removed, or your organization no longer exists. Contact your administrator or join a new organization.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={async () => { await signOut(); setSession(null); setProfile(null); }} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  const subStatus = profile?.organizations?.subscription_status || "active";
  const isSuspended = subStatus === "suspended";
  const isCanceled = subStatus === "canceled";
  const isPastDue = subStatus === "past_due";
  const isTrial = subStatus === "trial";

  // Trial expiration check
  const trialCreatedAt = profile?.organizations?.created_at ? new Date(profile.organizations.created_at) : null;
  const trialDaysElapsed = trialCreatedAt ? Math.floor((Date.now() - trialCreatedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const trialDaysRemaining = Math.max(0, 14 - trialDaysElapsed);
  const isTrialExpired = isTrial && trialDaysElapsed >= 14;
  const isTrialActive = isTrial && !isTrialExpired;

  const isReadOnly = isCanceled || isSuspended || isTrialExpired;

  // Fully blocked — suspended
  if (isSuspended) return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, padding: 48, maxWidth: 440, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${RED}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 28 }}>{"\u26D4"}</span></div>
        <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 8px", fontSize: 20 }}>Account Suspended</h2>
        <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "0 0 24px" }}>This organization&apos;s subscription has been suspended. Please contact your administrator or support to restore access.</p>
        <button onClick={async () => { await signOut(); setSession(null); setProfile(null); }} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign Out</button>
      </div>
    </div>
  );

  // Trial expired — force admin users to subscription tab, block non-admins
  if (isTrialExpired) {
    const isAdmin = ["admin", "safety_manager", "accountable_exec"].includes(profile?.role);
    if (!isAdmin) return (
      <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...card, padding: 48, maxWidth: 440, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${AMBER}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 28 }}>{"\u23F0"}</span></div>
          <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 8px", fontSize: 20 }}>Trial Expired</h2>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "0 0 24px" }}>Your organization&apos;s free trial has ended. Contact your administrator to subscribe and restore access.</p>
          <button onClick={async () => { await signOut(); setSession(null); setProfile(null); }} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>
    );
    // Admin — force to subscription tab
    if (cv !== "admin") setCv("admin");
  }

  const orgName = profile?.organizations?.name || COMPANY_NAME;
  const orgLogo = profile?.organizations?.logo_url || LOGO_URL;
  const userName = profile?.full_name || "";
  const needsAuth = !isOnline && ["history", "dashboard", "export"].includes(cv) && !isAuthed;

  // Read-only guard for canceled subscriptions
  const roGuard = (fn) => isReadOnly ? (...args) => { setToast({ message: isTrialExpired ? "Your trial has expired — subscribe to continue" : "Read-only mode — subscription " + subStatus, level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 3000); } : fn;
  return (
    <><Head><title>{orgName} SMS - PreflightSMS</title><meta name="theme-color" content="#000000" /><link rel="icon" type="image/png" href="/favicon.png" /><link rel="icon" href="/favicon.ico" /><link rel="manifest" href="/manifest.json" /><link rel="apple-touch-icon" href="/icon-192.png" /></Head>
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <NavBar currentView={cv} setCurrentView={setCv} isAuthed={isAuthed || isOnline} orgLogo={orgLogo} orgName={orgName} userName={userName} org={profile?.organizations || {}} userRole={profile?.role} onSignOut={async () => { await signOut(); setSession(null); setProfile(null); setRecords([]); setFlights([]); setReports([]); setHazards([]); setActions([]); setOrgProfiles([]); setPolicies([]); setTrainingReqs([]); setTrainingRecs([]); setCbtCourses([]); setCbtLessonsMap({}); setCbtProgress([]); setCbtEnrollments([]); setSmsManuals([]); setTemplateVariables({}); setSmsSignatures({}); }} />
      <div className="main-content" style={{ marginLeft: 140 }}>
        {/* Top bar with user info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px 0" }}>
          <div>
            <h1 style={{ margin: 0, color: WHITE, fontSize: 22, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
              {cv === "submit" ? "NEW FLIGHT RISK ASSESSMENT" : cv === "flights" ? "FLIGHT FOLLOWING" : cv === "crew" ? "CREW ROSTER" : cv === "fleet" ? "FLEET MANAGEMENT" : cv === "reports" ? "SUBMIT HAZARD REPORT" : cv === "hazards" ? "INVESTIGATIONS" : cv === "actions" ? "CORRECTIVE ACTIONS" : cv === "policy" ? "POLICIES" : cv === "cbt" ? "TRAINING" : cv === "audit" ? "FAA PART 5 AUDIT" : cv === "dashboard" ? "SAFETY DASHBOARD" : cv === "admin" ? "ADMIN" : ""}
            </h1>
          </div>
          <div className="user-info-desktop" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {pendingSync > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: YELLOW, background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)", padding: "2px 8px", borderRadius: 10, cursor: "pointer" }} onClick={() => flushQueue()} title="Click to retry sync">{pendingSync} pending</span>}
            {isOnline && session && (<>
              <span style={{ fontSize: 11, color: MUTED }}>{userName}</span>
              <div style={{ width: 32, height: 32, borderRadius: 50, background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 12, fontWeight: 700 }}>{(userName || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <button onClick={async () => { await signOut(); setSession(null); setProfile(null); setRecords([]); setFlights([]); setReports([]); setHazards([]); setActions([]); setOrgProfiles([]); setPolicies([]); setTrainingReqs([]); setTrainingRecs([]); setCbtCourses([]); setCbtLessonsMap({}); setCbtProgress([]); setCbtEnrollments([]); setSmsManuals([]); setTemplateVariables({}); setSmsSignatures({}); }}
                style={{ fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Log out</button>
            </>)}
          </div>
        </div>
        {toast && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, padding: "10px 18px", borderRadius: 8, background: toast.level.bg, border: `1px solid ${toast.level.border}`, color: toast.level.color, fontWeight: 700, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>{toast.message}</div>}
        {isPastDue && <div style={{ margin: "12px 32px 0", padding: "10px 16px", borderRadius: 8, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.25)", color: YELLOW, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>{"\u26A0"} Your subscription payment is past due. Please update your billing information to avoid service interruption.</div>}
        {isCanceled && <div style={{ margin: "12px 32px 0", padding: "10px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: RED, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>{"\u26D4"} Subscription canceled — this account is in read-only mode. Contact your administrator to restore full access.</div>}
        {isTrialActive && <div className="trial-banner" style={{ margin: "12px 32px 0", padding: "10px 16px", borderRadius: 8, background: trialDaysRemaining <= 3 ? "rgba(245,158,11,0.08)" : "rgba(34,211,238,0.08)", border: `1px solid ${trialDaysRemaining <= 3 ? "rgba(245,158,11,0.25)" : "rgba(34,211,238,0.25)"}`, color: trialDaysRemaining <= 3 ? AMBER : CYAN, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>{trialDaysRemaining <= 3 ? "\u26A0" : "\u2139\uFE0F"} Free trial — {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining</span><button onClick={() => { setCv("admin"); }} style={{ background: "none", border: `1px solid currentColor`, borderRadius: 4, color: "inherit", fontSize: 10, fontWeight: 700, padding: "3px 10px", cursor: "pointer" }}>Subscribe</button></div>}
        <main style={{ padding: "20px 32px 50px" }}>
        {cv === "submit" && (isReadOnly
          ? <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center", ...card, padding: 36 }}><div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Read-Only Mode</div><div style={{ fontSize: 12, color: MUTED }}>{isTrialExpired ? "Your free trial has expired. Subscribe to resume submitting FRATs." : `New FRAT submissions are disabled while your subscription is ${subStatus}.`}</div></div>
          : <FRATForm onSubmit={onSubmit} onNavigate={(view) => setCv(view)} riskCategories={riskCategories} riskLevels={riskLevels} aircraftTypes={aircraftTypes} orgId={profile?.org_id} userName={userName} allTemplates={fratTemplates} fleetAircraft={fleetAircraft} />)}
        {cv === "flights" && <FlightBoard flights={flights} onUpdateFlight={onUpdateFlight} onApproveFlight={async (flightDbId, fratDbId) => {
          await approveFlight(flightDbId, session.user.id);
          if (fratDbId) await approveRejectFRAT(fratDbId, session.user.id, "approved", "");
          const { data: fl } = await fetchFlights(profile.org_id);
          setFlights(fl.map(f => ({ id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number, departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt, etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs, numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level, status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at, cancelled: f.status === "CANCELLED", approvalStatus: f.approval_status, fratDbId: f.frat_id })));
          setToast({ message: "Flight approved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000);
        }} onRejectFlight={async (flightDbId, fratDbId) => {
          await rejectFlight(flightDbId);
          if (fratDbId) await approveRejectFRAT(fratDbId, session.user.id, "rejected", "");
          const { data: fl } = await fetchFlights(profile.org_id);
          setFlights(fl.map(f => ({ id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number, departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt, etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs, numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level, status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at, cancelled: f.status === "CANCELLED", approvalStatus: f.approval_status, fratDbId: f.frat_id })));
          setToast({ message: "Flight rejected", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 3000);
        }} />}
        {cv === "crew" && <CrewRoster crewRecords={crewRecords} canManage={!isReadOnly && ["admin", "safety_manager", "accountable_exec"].includes(profile?.role)} onAdd={roGuard(async (record) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await createCrewRecord(orgId, record);
          const { data } = await fetchCrewRecords(orgId);
          setCrewRecords(data || []);
        })} onUpdate={roGuard(async (id, updates) => {
          await updateCrewRecord(id, updates);
          const { data } = await fetchCrewRecords(profile?.org_id);
          setCrewRecords(data || []);
        })} onDelete={roGuard(async (id) => {
          await deleteCrewRecord(id);
          const { data } = await fetchCrewRecords(profile?.org_id);
          setCrewRecords(data || []);
        })} />}
        {cv === "fleet" && <FleetManagement aircraft={fleetAircraft} canManage={!isReadOnly && ["admin", "safety_manager", "accountable_exec"].includes(profile?.role)} maxAircraft={org?.max_aircraft || 5} onAdd={roGuard(async (record) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await createAircraft(orgId, record);
          const { data } = await fetchAircraft(orgId);
          setFleetAircraft(data || []);
        })} onUpdate={roGuard(async (id, updates) => {
          await updateAircraft(id, updates);
          const { data } = await fetchAircraft(profile?.org_id);
          setFleetAircraft(data || []);
        })} onDelete={roGuard(async (id) => {
          await deleteAircraft(id);
          const { data } = await fetchAircraft(profile?.org_id);
          setFleetAircraft(data || []);
        })} />}
        {cv === "reports" && (() => { const canManageReports = ["admin","safety_manager","accountable_exec","chief_pilot"].includes(profile?.role); const visibleReports = canManageReports ? reports : reports.filter(r => r.reporter_id === session?.user?.id); return <SafetyReporting profile={profile} session={session} onSubmitReport={roGuard(onSubmitReport)} reports={visibleReports} onStatusChange={canManageReports ? roGuard(onReportStatusChange) : null} hazards={hazards} onCreateHazardFromReport={canManageReports ? (report) => { setHazardFromReport(report); setCv("hazards"); } : null} />; })()}
        {cv === "hazards" && <HazardRegister profile={profile} session={session} onCreateHazard={roGuard(onCreateHazard)} hazards={hazards} reports={reports} fromReport={hazardFromReport} onClearFromReport={() => setHazardFromReport(null)} actions={actions} onCreateAction={(hazard) => { setActionFromInvestigation(hazard); setCv("actions"); }} />}
        {cv === "actions" && <CorrectiveActions actions={actions} onCreateAction={roGuard(onCreateAction)} onUpdateAction={roGuard(onUpdateAction)} fromInvestigation={actionFromInvestigation} hazards={hazards} onClearFromInvestigation={() => setActionFromInvestigation(null)} />}
        {cv === "policy" && <PolicyTraining profile={profile} session={session} policies={policies} onCreatePolicy={roGuard(onCreatePolicy)} onAcknowledgePolicy={onAcknowledgePolicy} orgProfiles={orgProfiles} smsManuals={smsManuals} showManuals={hasFeature(org, "sms_manuals") && ["admin","safety_manager","accountable_exec","chief_pilot"].includes(profile?.role)} templateVariables={templateVariables} signatures={smsSignatures} fleetAircraft={fleetAircraft} onSaveManual={roGuard(async (manual) => { const orgId = profile?.org_id; if (!orgId) return; const { error } = await upsertSmsManual(orgId, { ...manual, lastEditedBy: session?.user?.id }); if (!error) { const { data: all } = await fetchSmsManuals(orgId); setSmsManuals(all || []); const { data: policyData, error: policyError, wasUpdate } = await publishManualToPolicy(orgId, session.user.id, manual); if (!policyError && policyData && wasUpdate) { await clearPolicyAcknowledgments(policyData.id); } const { data: refreshedPolicies } = await fetchPolicies(orgId); setPolicies(refreshedPolicies || []); setToast({ message: wasUpdate ? "Manual saved & policy updated — acknowledgments reset" : "Manual saved & published to Policy Library", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); } })} onInitManuals={roGuard(async (templates) => { const orgId = profile?.org_id; if (!orgId) return; for (const tmpl of templates) { await upsertSmsManual(orgId, { ...tmpl, lastEditedBy: session?.user?.id }); } const { data: all } = await fetchSmsManuals(orgId); setSmsManuals(all || []); setToast({ message: "SMS manuals initialized", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} onSaveVariables={roGuard(async (vars, mergedManuals) => { const orgId = profile?.org_id; if (!orgId) return; const oldVars = templateVariables || {}; await saveSmsTemplateVariables(orgId, vars); setTemplateVariables(vars); const acft = vars._aircraft || []; const fleetLines = acft.filter(a => a.type?.trim()).map(a => `- ${a.type || "TBD"} - ${a.reg || "N/A"} - ${a.pax || "N/A"} pax - ${a.range || "N/A"}`).join("\n"); const oldAcft = oldVars._aircraft || []; const oldFleetLines = oldAcft.filter(a => a.type?.trim()).map(a => `- ${a.type || "TBD"} - ${a.reg || "N/A"} - ${a.pax || "N/A"} pax - ${a.range || "N/A"}`).join("\n"); const manualsToProcess = mergedManuals || smsManuals; for (const manual of manualsToProcess) { const updatedSections = manual.sections.map(sec => { let c = sec.content || ""; for (const [key, value] of Object.entries(vars)) { if (key === "_aircraft" || !value) continue; const oldVal = oldVars[key]; if (oldVal && oldVal !== value && oldVal.length >= 2) c = c.replaceAll(oldVal, value); c = c.replaceAll(`[${key}]`, value); } if (fleetLines) { if (oldFleetLines && oldFleetLines !== fleetLines) c = c.replaceAll(oldFleetLines, fleetLines); c = c.replaceAll("[Aircraft Fleet List]", fleetLines); } return c !== sec.content ? { ...sec, content: c } : sec; }); const hasChanges = manual.sections.some((s, i) => s.content !== updatedSections[i].content); if (hasChanges) { await upsertSmsManual(orgId, { ...manual, sections: updatedSections, lastEditedBy: session?.user?.id }); } } const { data: all } = await fetchSmsManuals(orgId); setSmsManuals(all || []); setToast({ message: "Variables saved and applied to all manuals", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} onSaveSignature={roGuard(async (sectionId, sigData) => { const orgId = profile?.org_id; if (!orgId) return; const updated = { ...smsSignatures, [sectionId]: sigData }; await saveSmsSignatures(orgId, updated); setSmsSignatures(updated); setToast({ message: "Signature saved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} />}
        {cv === "cbt" && <CbtModules profile={profile} session={session} orgProfiles={orgProfiles} courses={cbtCourses} lessons={cbtLessonsMap} progress={cbtProgress} enrollments={cbtEnrollments} onCreateCourse={roGuard(onCreateCbtCourse)} onUpdateCourse={onUpdateCbtCourse} onDeleteCourse={async (id) => { await deleteCbtCourse(id); refreshCbt(); }} onSaveLesson={roGuard(onSaveCbtLesson)} onDeleteLesson={onDeleteCbtLesson} onUpdateProgress={onUpdateCbtProgress} onUpdateEnrollment={onUpdateCbtEnrollment} onPublishCourse={onUpdateCbtCourse} onRefresh={refreshCbt} trainingRequirements={trainingReqs} trainingRecords={trainingRecs} onCreateRequirement={roGuard(onCreateRequirement)} onLogTraining={roGuard(onLogTraining)} onDeleteTrainingRecord={roGuard(onDeleteTrainingRecord)} onDeleteRequirement={roGuard(onDeleteRequirement)} onInitTraining={roGuard(onInitTraining)} />}
        {cv === "audit" && <FaaAuditLog frats={records} flights={flights} reports={reports} hazards={hazards} actions={actions} policies={policies} profiles={orgProfiles} trainingRecords={trainingRecs} org={profile?.organizations} smsManuals={smsManuals} />}
        {needsAuth && <AdminGate isAuthed={isAuthed} onAuth={setIsAuthed}>{null}</AdminGate>}
        {cv === "dashboard" && (isAuthed || isOnline) && <DashboardWrapper records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} onDelete={onDelete} riskLevels={riskLevels} org={org} />}
        {cv === "admin" && (isAuthed || isOnline) && <AdminPanel profile={profile} orgProfiles={orgProfiles} initialTab={initialAdminTab} onUpdateRole={onUpdateRole} onUpdatePermissions={async (userId, perms) => { await updateProfilePermissions(userId, perms); const orgId = profile?.org_id; if (orgId) fetchOrgProfiles(orgId).then(({ data }) => setOrgProfiles(data || [])); }} onRemoveUser={async (userId) => { await removeUserFromOrg(userId); const orgId = profile?.org_id; if (orgId) fetchOrgProfiles(orgId).then(({ data }) => setOrgProfiles(data || [])); setToast({ message: "User removed", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 3000); }} orgName={orgName} orgSlug={profile?.organizations?.slug || ""} orgLogo={orgLogo} fratTemplate={fratTemplate} fratTemplates={fratTemplates} onSaveTemplate={async (templateData) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { data, error } = await upsertFratTemplate(orgId, templateData);
          if (!error && data) {
            setFratTemplate(data);
            fetchAllFratTemplates(orgId).then(({ data: all }) => setFratTemplates(all || []));
            setToast({ message: "FRAT template saved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
            setTimeout(() => setToast(null), 3000);
          } else {
            setToast({ message: "Failed to save template: " + (error?.message || "Unknown error"), level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } });
            setTimeout(() => setToast(null), 5000);
          }
        }} onCreateTemplate={async (templateData) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { data, error } = await createFratTemplate(orgId, templateData);
          if (!error) {
            fetchAllFratTemplates(orgId).then(({ data: all }) => setFratTemplates(all || []));
            setToast({ message: "Template created", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
            setTimeout(() => setToast(null), 3000);
          }
        }} onDeleteTemplate={async (templateId) => {
          const orgId = profile?.org_id;
          await deleteFratTemplate(templateId);
          if (orgId) fetchAllFratTemplates(orgId).then(({ data: all }) => setFratTemplates(all || []));
        }} onSetActiveTemplate={async (templateId) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await setActiveFratTemplate(orgId, templateId);
          fetchFratTemplate(orgId).then(({ data }) => { if (data) setFratTemplate(data); });
          fetchAllFratTemplates(orgId).then(({ data: all }) => setFratTemplates(all || []));
          setToast({ message: "Active template updated", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
          setTimeout(() => setToast(null), 3000);
        }} onUploadLogo={async (file) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { url, error } = await uploadOrgLogo(orgId, file);
          if (!error && url) {
            // Refresh profile to pick up new logo
            const { data: prof } = await getProfile();
            if (prof) setProfile(prof);
          }
          return { url, error };
        }} notificationContacts={notifContacts} onAddContact={async (contact) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { data, error } = await createNotificationContact(orgId, contact);
          if (!error) fetchNotificationContacts(orgId).then(({ data }) => setNotifContacts(data || []));
        }} onUpdateContact={async (id, updates) => {
          await updateNotificationContact(id, updates);
          const orgId = profile?.org_id;
          if (orgId) fetchNotificationContacts(orgId).then(({ data }) => setNotifContacts(data || []));
        }} onDeleteContact={async (id) => {
          await deleteNotificationContact(id);
          const orgId = profile?.org_id;
          if (orgId) fetchNotificationContacts(orgId).then(({ data }) => setNotifContacts(data || []));
        }} orgData={profile?.organizations || {}} onUpdateOrg={async (updates) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await updateOrg(orgId, updates);
          const { data: prof } = await getProfile();
          if (prof) setProfile(prof);
          setToast({ message: "Subscription updated", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
          setTimeout(() => setToast(null), 3000);
        }} onCheckout={async (plan, interval) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          try {
            const { data, error } = await supabase.functions.invoke('stripe-checkout', {
              body: {
                plan,
                interval,
                orgId,
                orgName,
                email: profile?.email || session?.user?.email,
                returnUrl: window.location.origin,
              },
            });
            if (error) { setToast({ message: "Checkout error: " + error.message, level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return; }
            if (data?.url) window.location.href = data.url;
          } catch (e) { console.error("Checkout error:", e); }
        }} invitations={invitations_list} onInviteUser={async (email, role) => {
          const orgId = profile?.org_id;
          if (!orgId) return { error: "No org" };
          const { data, error } = await createInvitation(orgId, email, role, session.user.id);
          if (error) return { error: error.message };
          // Send the email via edge function
          try {
            const { error: invokeErr } = await supabase.functions.invoke('send-invite', {
              body: { email, orgName, role, token: data.token },
            });
            if (invokeErr) console.error("Invite email error:", invokeErr);
          } catch (e) { console.error("Failed to send invite email:", e); }
          fetchInvitations(orgId).then(({ data }) => setInvitationsList(data || []));
          return { success: true };
        }} onRevokeInvitation={async (invId) => {
          await revokeInvitation(invId);
          const orgId = profile?.org_id;
          if (orgId) fetchInvitations(orgId).then(({ data }) => setInvitationsList(data || []));
        }} onResendInvitation={async (invId) => {
          const { data } = await resendInvitation(invId);
          if (data) {
            try {
              await supabase.functions.invoke('send-invite', {
                body: { email: data.email, orgName, role: data.role, token: data.token },
              });
            } catch (e) { console.error("Failed to resend invite:", e); }
          }
          const orgId = profile?.org_id;
          if (orgId) fetchInvitations(orgId).then(({ data: inv }) => setInvitationsList(inv || []));
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
.main-content{margin-left:0 !important;padding:0 !important}
.main-content main{padding:12px 16px 50px !important}
.main-content h1{font-size:16px !important}
.user-info-desktop{display:none !important}
.stat-grid{grid-template-columns:repeat(2,1fr) !important}
.crew-grid{grid-template-columns:1fr !important}
.chart-grid-2{grid-template-columns:1fr !important}
.signup-split{grid-template-columns:1fr !important;min-height:auto !important}
.signup-left-panel{display:none !important}
.signup-right-panel{padding:24px 20px !important}
.signup-plan-grid{grid-template-columns:1fr !important}
.admin-org-grid{grid-template-columns:1fr !important}
.admin-tabs{overflow-x:auto !important;flex-wrap:nowrap !important;-webkit-overflow-scrolling:touch}
.invite-form-grid{grid-template-columns:1fr !important}
.trial-expired-plans{flex-direction:column !important}
.trial-banner{flex-direction:column !important;gap:8px !important;text-align:center}
.flight-board-grid{grid-template-columns:1fr !important}
}
@media(max-width:480px){
.flight-info-grid{grid-template-columns:1fr !important}
.stat-grid{grid-template-columns:1fr !important}
.auth-plan-grid{grid-template-columns:1fr !important}
}`}</style>
    </div></>);
}
