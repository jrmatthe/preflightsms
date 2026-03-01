import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const BLACK = "#000000";
const DARK = "#111111";
const CARD = "#161616";
const BORDER = "#232323";
const LIGHT_BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

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

const DEFAULT_RISK_LEVELS = {
  LOW: { label: "LOW RISK", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", min: 0, max: 15, action: "Flight authorized — standard procedures", approval_mode: "none" },
  MODERATE: { label: "MODERATE RISK", color: YELLOW, bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", min: 16, max: 30, action: "Enhanced awareness — brief crew on elevated risk factors", approval_mode: "none" },
  HIGH: { label: "HIGH RISK", color: AMBER, bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", min: 31, max: 45, action: "Requires management approval before departure", approval_mode: "required" },
  CRITICAL: { label: "CRITICAL RISK", color: RED, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", min: 46, max: 100, action: "Flight should not depart without risk mitigation and executive approval", approval_mode: "required" },
};

function buildRiskLevels(thresholds) {
  if (!thresholds || !Array.isArray(thresholds)) return DEFAULT_RISK_LEVELS;
  const colorMap = { green: GREEN, yellow: YELLOW, amber: AMBER, red: RED };
  const bgMap = { green: "rgba(74,222,128,0.08)", yellow: "rgba(250,204,21,0.08)", amber: "rgba(245,158,11,0.08)", red: "rgba(239,68,68,0.08)" };
  const borderMap = { green: "rgba(74,222,128,0.25)", yellow: "rgba(250,204,21,0.25)", amber: "rgba(245,158,11,0.25)", red: "rgba(239,68,68,0.25)" };
  const result = {};
  thresholds.forEach(t => {
    result[t.level] = { label: t.label, color: colorMap[t.color] || GREEN, bg: bgMap[t.color] || bgMap.green, border: borderMap[t.color] || borderMap.green, min: t.min, max: t.max, action: t.action, approval_mode: t.approval_mode || "none" };
  });
  return result;
}

function getRiskLevel(score, riskLevels) {
  const rl = riskLevels || DEFAULT_RISK_LEVELS;
  const sorted = Object.values(rl).sort((a, b) => a.min - b.min);
  for (const l of sorted) { if (score >= l.min && score <= l.max) return l; }
  return sorted[sorted.length - 1] || Object.values(DEFAULT_RISK_LEVELS)[3];
}

function generateId() { return `FRAT-${Date.now().toString(36).toUpperCase()}`; }

function getCeiling(clouds) {
  if (!clouds || !Array.isArray(clouds)) return 99999;
  for (const c of clouds) {
    if ((c.cover === "BKN" || c.cover === "OVC") && c.base != null) return c.base;
  }
  return 99999;
}

function parseCruiseAlt(val) {
  if (!val) return 0;
  const s = val.toString().trim().toUpperCase();
  if (s.startsWith("FL")) return parseInt(s.slice(2), 10) * 100;
  return parseInt(s, 10) || 0;
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

// ── Weather analysis ──
function analyzeWeather(wx) {
  if (!wx) return { flags: {}, reasons: {}, briefing: [], stationSummaries: [] };
  const flags = {};
  const reasons = {};
  const briefItems = [];
  const stationSummaries = [];

  function analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, label) {
    if (ceiling < 1000) { flags.wx_ceiling = true; reasons.wx_ceiling = (reasons.wx_ceiling || "") + `${station} ${label} ceiling ${ceiling}' AGL. `; }
    if (vis < 3) { flags.wx_vis = true; reasons.wx_vis = (reasons.wx_vis || "") + `${station} ${label} vis ${vis} SM. `; }
    if (wspd > 15 || wgst > 15) { flags.wx_xwind = true; reasons.wx_xwind = (reasons.wx_xwind || "") + `${station} ${label} wind ${wdir || "VRB"}°/${wspd}${wgst ? "G" + wgst : ""}kt. `; }
    if (wxStr.includes("TS")) { flags.wx_ts = true; reasons.wx_ts = (reasons.wx_ts || "") + `${station} ${label} thunderstorm. `; }
  }

  for (const m of (Array.isArray(wx.metars) ? wx.metars : [])) {
    const station = m.icaoId || "??";
    const ceiling = getCeiling(m.clouds);
    const vis = m.visib === "10+" ? 10 : parseFloat(m.visib) || 99;
    const wspd = m.wspd || 0;
    const wgst = m.wgst || 0;
    const wdir = m.wdir || 0;
    const wxStr = (m.wxString || "").toUpperCase();
    const raw = m.rawOb || "";
    const temp = m.temp != null ? `${Math.round(m.temp)}°C` : "";
    const dewp = m.dewp != null ? `${Math.round(m.dewp)}°C` : "";
    const altim = m.altim != null ? `${(m.altim * 0.02953).toFixed(2)}"` : "";
    briefItems.push({ station, type: "METAR", raw });
    const ceilStr = ceiling >= 99999 ? "CLR" : `${ceiling}'`;
    const visStr = vis >= 10 ? "10+ SM" : `${vis} SM`;
    const windStr = wspd === 0 ? "Calm" : `${wdir}°/${wspd}${wgst ? "G" + wgst : ""}kt`;
    const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
    stationSummaries.push({
      station, type: "METAR (current)",
      ceiling: ceilStr, visibility: visStr, wind: windStr, temp, dewp, altimeter: altim,
      wxString: wxStr, flight_rules: fr, raw,
      hazards: [],
    });
    analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, "METAR");
    if (raw.includes("WS") || raw.toUpperCase().includes("WIND SHEAR")) {
      flags.wx_wind_shear = true;
      reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} wind shear. `;
    }
  }

  for (const t of (Array.isArray(wx.tafs) ? wx.tafs : [])) {
    const station = t.icaoId || "??";
    briefItems.push({ station, type: "TAF", raw: t.rawTAF || "" });
    if (t.fcsts && t.fcsts.length > 0) {
      const f = t.fcsts[0];
      const vis = f.visib === "6+" ? 10 : parseFloat(f.visib) || 99;
      const ceiling = getCeiling(f.clouds);
      const wxStr = (f.wxString || "").toUpperCase();
      const wspd = f.wspd || 0;
      const wgst = f.wgst || 0;
      analyzePeriod(station, ceiling, vis, wspd, wgst, f.wdir, wxStr, "TAF");
    }
  }

  // Build hazards list for each station summary
  stationSummaries.forEach(s => {
    const hazards = [];
    if (flags.wx_ts) hazards.push({ label: "Thunderstorms", color: RED });
    if (flags.wx_ice) hazards.push({ label: "Icing", color: AMBER });
    if (flags.wx_turb) hazards.push({ label: "Turbulence", color: AMBER });
    if (flags.wx_ceiling && s.ceiling !== "CLR") hazards.push({ label: "Low Ceiling", color: YELLOW });
    if (flags.wx_vis && !s.visibility.includes("10+")) hazards.push({ label: "Low Visibility", color: YELLOW });
    if (flags.wx_xwind) hazards.push({ label: "Crosswind", color: YELLOW });
    s.hazards = hazards;
  });

  return { flags, reasons, briefing: briefItems, stationSummaries };
}

// ── Progress dots ──
function StepIndicator({ current, total }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 24 : 8, height: 8, borderRadius: 4,
          background: i === current ? CYAN : i < current ? WHITE : BORDER,
          transition: "all 0.2s",
        }} />
      ))}
      <span style={{ color: MUTED, fontSize: 14, marginLeft: 8 }}>Step {current + 1} of {total}</span>
    </div>
  );
}

// ── Skeleton for weather loading ──
function WeatherSkeleton() {
  return (
    <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
      <div style={{ width: 100, height: 18, background: BORDER, borderRadius: 4, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
      {[1,2,3,4].map(i => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ width: 70, height: 14, background: BORDER, borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: 90, height: 14, background: BORDER, borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  );
}

// ── Step 1: Flight Info ──
function StepFlightInfo({ fi, setFi, fuelUnit, setFuelUnit, fleetAircraft, errors, allTemplates, activeTemplateId, onTemplateChange, onAircraftChange }) {
  const fleetList = fleetAircraft || [];
  const fleetMap = useMemo(() => {
    const map = {};
    fleetList.forEach(a => { if (!map[a.type]) map[a.type] = []; map[a.type].push(a); });
    return map;
  }, [fleetList]);
  const aircraftTypes = [...new Set(fleetList.map(a => a.type))];
  const tailOptions = fleetMap[fi.aircraft] || [];

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Flight Information</div>
      <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Enter your flight details</div>

      <Field label="Pilot in Command" error={errors.pilot}>
        <input value={fi.pilot} onChange={e => setFi(p => ({ ...p, pilot: e.target.value }))} style={inputStyle} placeholder="PIC Name" />
      </Field>

      <Field label="Aircraft Type" error={errors.aircraft}>
        {aircraftTypes.length > 0 ? (
          <select value={fi.aircraft} onChange={e => {
            const type = e.target.value;
            const tails = fleetMap[type] || [];
            setFi(p => ({ ...p, aircraft: type, tailNumber: tails.length === 1 ? tails[0].registration : "" }));
            if (onAircraftChange) onAircraftChange(type);
          }} style={inputStyle}>
            <option value="">Select aircraft</option>
            {aircraftTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <input value={fi.aircraft} onChange={e => setFi(p => ({ ...p, aircraft: e.target.value }))} style={inputStyle} placeholder="Aircraft type" />
        )}
      </Field>

      <Field label="Tail Number" error={errors.tailNumber}>
        {tailOptions.length > 1 ? (
          <select value={fi.tailNumber} onChange={e => setFi(p => ({ ...p, tailNumber: e.target.value }))} style={inputStyle}>
            <option value="">Select tail</option>
            {tailOptions.map(a => <option key={a.registration} value={a.registration}>{a.registration}</option>)}
          </select>
        ) : (
          <input value={fi.tailNumber} onChange={e => setFi(p => ({ ...p, tailNumber: e.target.value }))} style={inputStyle} placeholder="N-number" />
        )}
      </Field>

      {allTemplates && allTemplates.length > 1 && (
        <Field label="FRAT Template">
          <select value={activeTemplateId || ""} onChange={e => { if (onTemplateChange) onTemplateChange(e.target.value); }} style={inputStyle}>
            {allTemplates.filter(t => t.categories && t.categories.length > 0).map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.is_active ? " (default)" : ""}</option>
            ))}
          </select>
        </Field>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Departure" error={errors.departure}>
          <input value={fi.departure} onChange={e => setFi(p => ({ ...p, departure: e.target.value.toUpperCase() }))} style={inputStyle} placeholder="ICAO" maxLength={4} autoCapitalize="characters" />
        </Field>
        <Field label="Destination" error={errors.destination}>
          <input value={fi.destination} onChange={e => setFi(p => ({ ...p, destination: e.target.value.toUpperCase() }))} style={inputStyle} placeholder="ICAO" maxLength={4} autoCapitalize="characters" />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}>
        <Field label="Date" error={errors.date}>
          <input type="date" value={fi.date} onChange={e => setFi(p => ({ ...p, date: e.target.value }))} style={{ ...inputStyle, minWidth: 0 }} />
        </Field>
        <Field label="ETD (local)" error={errors.etd}>
          {(() => {
            const raw = fi.etd || "";
            const parts = raw.includes(":") ? raw.split(":") : [raw.slice(0, 2), raw.slice(2)];
            const hh = parts[0] || "";
            const mm = parts[1] || "";
            const setEtd = (h, m) => { const v = h + ":" + m; setFi(p => ({ ...p, etd: v })); };
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <input type="text" inputMode="numeric" maxLength={2} placeholder="HH" value={hh}
                  onChange={e => { const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2); setEtd(v, mm); if (v.length === 2) { const next = e.target.parentElement.querySelector("[data-mm]"); if (next) next.focus(); } }}
                  style={{ ...inputStyle, minWidth: 0, width: "3.5em", textAlign: "center", borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", flex: "none" }} />
                <span style={{ color: MUTED, fontSize: 18, fontWeight: 700, padding: "0 2px", userSelect: "none" }}>:</span>
                <input data-mm type="text" inputMode="numeric" maxLength={2} placeholder="MM" value={mm}
                  onChange={e => { const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2); setEtd(hh, v); }}
                  onKeyDown={e => { if (e.key === "Backspace" && mm === "") { const prev = e.target.parentElement.querySelector("input"); if (prev) prev.focus(); } }}
                  style={{ ...inputStyle, minWidth: 0, width: "3.5em", textAlign: "center", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none", flex: "none" }} />
              </div>);
          })()}
        </Field>
      </div>

      <Field label="ETE (hours:minutes)" error={errors.ete}>
        <input value={fi.ete} onChange={e => setFi(p => ({ ...p, ete: e.target.value }))} style={inputStyle} placeholder="e.g. 1:30 or 0130" inputMode="numeric" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Crew" error={errors.numCrew}>
          <NumberStepper value={fi.numCrew} onChange={v => setFi(p => ({ ...p, numCrew: v }))} min={1} max={10} />
        </Field>
        <Field label="Passengers" error={errors.numPax}>
          <NumberStepper value={fi.numPax} onChange={v => setFi(p => ({ ...p, numPax: v }))} min={0} max={50} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <Field label={`Fuel (${fuelUnit.toUpperCase()})`} error={errors.fuelLbs}>
          <input value={fi.fuelLbs} onChange={e => setFi(p => ({ ...p, fuelLbs: e.target.value }))} style={inputStyle} placeholder={`Enter fuel in ${fuelUnit}`} inputMode="decimal" />
        </Field>
        <Field label=" ">
          <button onClick={() => setFuelUnit(u => u === "lbs" ? "gal" : u === "gal" ? "hrs" : "lbs")} style={{
            ...inputStyle, width: 70, textAlign: "center", cursor: "pointer", fontWeight: 600,
          }}>
            {fuelUnit.toUpperCase()}
          </button>
        </Field>
      </div>

      <Field label="Cruise Altitude" error={errors.cruiseAlt}>
        <input value={fi.cruiseAlt} onChange={e => setFi(p => ({ ...p, cruiseAlt: e.target.value }))} style={inputStyle} placeholder="e.g. FL250 or 10500" />
      </Field>
    </div>
  );
}

// ── Step 2: Weather ──
function StepWeather({ wxData, wxAnalysis, wxLoading, wxError }) {
  const [showRaw, setShowRaw] = useState({});

  if (wxLoading) {
    return (
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Weather Briefing</div>
        <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Fetching current conditions...</div>
        <WeatherSkeleton />
        <WeatherSkeleton />
      </div>
    );
  }

  if (wxError) {
    return (
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Weather Briefing</div>
        <div style={{ ...cardStyle, padding: 16, borderColor: `${AMBER}44` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ color: AMBER, fontSize: 14, fontWeight: 600 }}>Weather Unavailable</span>
          </div>
          <div style={{ color: MUTED, fontSize: 14 }}>Could not fetch weather data. You can still continue with your FRAT.</div>
        </div>
      </div>
    );
  }

  const summaries = wxAnalysis?.stationSummaries || [];

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Weather Briefing</div>
      <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Current conditions at your airports</div>

      {summaries.length === 0 && (
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ color: MUTED, fontSize: 14 }}>No weather data available. Enter valid ICAO codes to fetch weather.</div>
        </div>
      )}

      {summaries.map((s, i) => {
        const frColor = s.flight_rules === "VFR" ? GREEN : s.flight_rules === "MVFR" ? YELLOW : s.flight_rules === "IFR" ? RED : RED;
        const isRawOpen = showRaw[s.station + i];
        return (
          <div key={s.station + i} style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ color: WHITE, fontSize: 16, fontWeight: 700 }}>{s.station}</div>
              <span style={{
                padding: "3px 10px", borderRadius: 10, background: `${frColor}18`,
                color: frColor, fontSize: 14, fontWeight: 700, border: `1px solid ${frColor}33`,
              }}>
                {s.flight_rules}
              </span>
            </div>

            <WxRow label="Ceiling" value={s.ceiling} />
            <WxRow label="Visibility" value={s.visibility} />
            <WxRow label="Wind" value={s.wind} />
            {s.temp && <WxRow label="Temperature" value={s.temp} />}
            {s.altimeter && <WxRow label="Altimeter" value={s.altimeter} />}
            {s.wxString && <WxRow label="Weather" value={s.wxString} />}

            {/* Hazard badges */}
            {s.hazards && s.hazards.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {s.hazards.map((h, hi) => (
                  <span key={hi} style={{
                    padding: "3px 10px", borderRadius: 10, background: `${h.color}18`,
                    color: h.color, fontSize: 14, fontWeight: 600, border: `1px solid ${h.color}33`,
                  }}>
                    {h.label}
                  </span>
                ))}
              </div>
            )}

            {/* Raw METAR toggle */}
            {s.raw && (
              <div style={{ marginTop: 10 }}>
                <button onClick={() => setShowRaw(p => ({ ...p, [s.station + i]: !isRawOpen }))} style={{
                  background: "none", border: "none", color: CYAN, fontSize: 14, cursor: "pointer", padding: "4px 0", minHeight: 44,
                }}>
                  {isRawOpen ? "Hide" : "View"} Raw METAR
                </button>
                {isRawOpen && (
                  <div style={{
                    marginTop: 6, padding: 10, background: BLACK, borderRadius: 6,
                    fontSize: 14, color: MUTED, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.5,
                  }}>
                    {s.raw}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WxRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${LIGHT_BORDER}` }}>
      <span style={{ color: MUTED, fontSize: 14 }}>{label}</span>
      <span style={{ color: OFF_WHITE, fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ── Step 3: Risk Assessment ──
function StepRiskAssessment({ categories, checked, setChecked, autoFlags, riskLevels }) {
  const [expanded, setExpanded] = useState({});

  // Auto-expand weather if it has auto-flagged items
  useEffect(() => {
    if (autoFlags && Object.keys(autoFlags).length > 0) {
      setExpanded(prev => ({ ...prev, weather: true }));
    }
  }, [autoFlags]);

  const score = useMemo(() => {
    let total = 0;
    categories.forEach(cat => {
      cat.factors.forEach(f => {
        if (checked[f.id]) total += f.score;
      });
    });
    return total;
  }, [checked, categories]);

  const rl = getRiskLevel(score, riskLevels);
  const categoryIcons = {
    weather: <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>,
    pilot: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    aircraft: <path d="M17.8 19.2L16 11l3.5-3.5C20.3 6.7 21 5.1 21 4.5c0-1-.5-1.5-1.5-1.5-.6 0-2.2.7-3 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.3 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>,
    environment: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>,
    operational: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>,
  };

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Risk Assessment</div>
      <div style={{ color: MUTED, fontSize: 14, marginBottom: 16 }}>Check applicable risk factors</div>

      {categories.map(cat => {
        const isOpen = expanded[cat.id] !== false; // default open
        const catScore = cat.factors.reduce((sum, f) => sum + (checked[f.id] ? f.score : 0), 0);
        const checkedCount = cat.factors.filter(f => checked[f.id]).length;

        return (
          <div key={cat.id} style={{ ...cardStyle, marginBottom: 10, overflow: "hidden" }}>
            <button
              onClick={() => setExpanded(p => ({ ...p, [cat.id]: !isOpen }))}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", background: "none", border: "none", cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {categoryIcons[cat.id] || <circle cx="12" cy="12" r="10"/>}
                </svg>
                <span style={{ color: WHITE, fontSize: 15, fontWeight: 600 }}>{cat.name}</span>
                {checkedCount > 0 && (
                  <span style={{
                    background: `${rl.color}22`, color: rl.color, fontSize: 14, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 8,
                  }}>
                    +{catScore}
                  </span>
                )}
              </div>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {isOpen && (
              <div style={{ padding: "0 16px 12px" }}>
                {cat.factors.map(f => {
                  const isAuto = autoFlags && autoFlags[f.id];
                  return (
                    <label key={f.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0",
                      borderTop: `1px solid ${LIGHT_BORDER}`, cursor: "pointer",
                      minHeight: 44,
                    }}>
                      <input
                        type="checkbox"
                        checked={!!checked[f.id]}
                        onChange={() => setChecked(p => ({ ...p, [f.id]: !p[f.id] }))}
                        style={{ width: 20, height: 20, marginTop: 2, accentColor: CYAN, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: OFF_WHITE, fontSize: 14, lineHeight: 1.4 }}>
                          {f.label}
                          {isAuto && (
                            <span style={{
                              marginLeft: 6, padding: "1px 6px", borderRadius: 4,
                              background: `${CYAN}22`, color: CYAN, fontSize: 14, fontWeight: 700,
                            }}>
                              AUTO
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ color: MUTED, fontSize: 14, fontWeight: 600, flexShrink: 0 }}>+{f.score}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Sticky score footer */}
      <div style={{
        position: "fixed", bottom: "calc(48px + max(env(safe-area-inset-bottom, 0px), 20px))", left: 0, right: 0, zIndex: 900,
        background: rl.bg, borderTop: `1px solid ${rl.border}`,
        padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <span style={{ color: rl.color, fontSize: 16, fontWeight: 700 }}>Risk Score: {score}</span>
          <span style={{ color: rl.color, fontSize: 14, marginLeft: 8, opacity: 0.8 }}>— {rl.label}</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Review & Submit ──
function StepReview({ fi, fuelUnit, checked, categories, riskLevels, wxAnalysis, submitting }) {
  const score = useMemo(() => {
    let total = 0;
    categories.forEach(cat => {
      cat.factors.forEach(f => { if (checked[f.id]) total += f.score; });
    });
    return total;
  }, [checked, categories]);

  const rl = getRiskLevel(score, riskLevels);
  const needsApproval = rl.approval_mode === "required";
  const checkedFactors = categories.flatMap(cat =>
    cat.factors.filter(f => checked[f.id]).map(f => ({ ...f, category: cat.name }))
  );

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Review & Submit</div>
      <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Confirm your FRAT details</div>

      {/* Risk score card */}
      <div style={{ ...cardStyle, padding: 16, marginBottom: 12, borderColor: rl.border, background: rl.bg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: rl.color, fontSize: 28, fontWeight: 800 }}>{score}</div>
            <div style={{ color: rl.color, fontSize: 14, fontWeight: 600, marginTop: 2 }}>{rl.label}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: rl.color, fontSize: 14, opacity: 0.8 }}>{rl.action}</div>
          </div>
        </div>
      </div>

      {/* Approval warning */}
      {needsApproval && (
        <div style={{
          ...cardStyle, padding: 14, marginBottom: 12,
          borderColor: score >= 46 ? `${RED}44` : `${AMBER}44`,
          background: score >= 46 ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={score >= 46 ? RED : AMBER} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Management Approval Required</div>
              <div style={{ color: MUTED, fontSize: 13 }}>This FRAT will be sent to your safety manager for approval before the flight can depart.</div>
            </div>
          </div>
        </div>
      )}

      {/* Flight details */}
      <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
        <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Flight Details</div>
        <ReviewRow label="PIC" value={fi.pilot} />
        <ReviewRow label="Aircraft" value={`${fi.aircraft}${fi.tailNumber ? ` (${fi.tailNumber})` : ""}`} />
        <ReviewRow label="Route" value={`${fi.departure} → ${fi.destination}`} />
        <ReviewRow label="Date" value={fi.date} />
        {fi.etd && <ReviewRow label="ETD" value={fi.etd} />}
        {fi.ete && <ReviewRow label="ETE" value={formatETE(fi.ete)} />}
        {fi.numCrew && <ReviewRow label="Crew" value={fi.numCrew} />}
        {fi.numPax && <ReviewRow label="Passengers" value={fi.numPax} />}
        {fi.fuelLbs && <ReviewRow label="Fuel" value={`${fi.fuelLbs} ${fuelUnit.toUpperCase()}`} />}
        {fi.cruiseAlt && <ReviewRow label="Altitude" value={fi.cruiseAlt} />}
      </div>

      {/* Risk factors */}
      {checkedFactors.length > 0 && (
        <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
          <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Risk Factors ({checkedFactors.length})</div>
          {checkedFactors.map(f => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${LIGHT_BORDER}` }}>
              <span style={{ color: OFF_WHITE, fontSize: 14 }}>{f.label}</span>
              <span style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>+{f.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${LIGHT_BORDER}` }}>
      <span style={{ color: MUTED, fontSize: 14 }}>{label}</span>
      <span style={{ color: OFF_WHITE, fontSize: 14, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ── Shared components ──
function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: OFF_WHITE, fontSize: 14, marginBottom: 6 }}>{label}</label>
      {children}
      {error && <div role="alert" style={{ color: RED, fontSize: 14, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function NumberStepper({ value, onChange, min = 0, max = 99 }) {
  const num = parseInt(value) || min;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
      <button onClick={() => onChange(String(Math.max(min, num - 1)))} style={{
        width: 44, height: 44, background: BLACK, border: "none", color: WHITE, fontSize: 20,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      }}>−</button>
      <div style={{
        flex: 1, textAlign: "center", background: BLACK, color: OFF_WHITE,
        fontSize: 16, fontWeight: 600, padding: "10px 0",
      }}>
        {num}
      </div>
      <button onClick={() => onChange(String(Math.min(max, num + 1)))} style={{
        width: 44, height: 44, background: BLACK, border: "none", color: WHITE, fontSize: 20,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      }}>+</button>
    </div>
  );
}

// ── Discard confirmation ──
function DiscardConfirm({ onDiscard, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div style={{ ...cardStyle, padding: 24, maxWidth: 320, width: "90%", position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Discard this FRAT?</div>
        <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Your progress will be lost.</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "12px", background: "transparent", color: OFF_WHITE,
            border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 15, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onDiscard} style={{
            flex: 1, padding: "12px", background: RED, color: WHITE,
            border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Discard</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Wizard ──
export default function MobileFRATWizard({
  profile, fleetAircraft, fratTemplate, allTemplates, riskLevels: parentRiskLevels,
  onSubmit, onCancel, onNavigateToFlights,
}) {
  const [step, setStep] = useState(0);
  const [showDiscard, setShowDiscard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Form state
  const [fi, setFi] = useState({
    pilot: profile?.full_name || "",
    aircraft: "", tailNumber: "",
    departure: "", destination: "",
    cruiseAlt: "", date: getLocalDate(),
    etd: "", ete: "", fuelLbs: "",
    numCrew: "1", numPax: "0", remarks: "",
  });
  const [fuelUnit, setFuelUnit] = useState("hrs");
  const [checked, setChecked] = useState({});
  const [errors, setErrors] = useState({});
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  // Weather state
  const [wxData, setWxData] = useState(null);
  const [wxAnalysis, setWxAnalysis] = useState({ flags: {}, reasons: {}, briefing: [], stationSummaries: [] });
  const [wxLoading, setWxLoading] = useState(false);
  const [wxError, setWxError] = useState(null);
  const wxFetched = useRef(false);

  // Template resolution
  const resolveTemplate = useCallback((aircraft) => {
    if (!allTemplates || allTemplates.length <= 1) return null;
    return allTemplates.find(t => (t.assigned_aircraft || []).includes(aircraft)) || allTemplates.find(t => t.is_active) || null;
  }, [allTemplates]);

  const currentTemplate = useMemo(() => {
    if (activeTemplateId && allTemplates) {
      const found = allTemplates.find(t => t.id === activeTemplateId);
      if (found) return found;
    }
    return resolveTemplate(fi.aircraft) || fratTemplate;
  }, [activeTemplateId, allTemplates, resolveTemplate, fi.aircraft, fratTemplate]);
  const categories = currentTemplate?.categories || DEFAULT_RISK_CATEGORIES;
  const riskLevels = currentTemplate?.risk_thresholds ? buildRiskLevels(currentTemplate.risk_thresholds) : (parentRiskLevels || DEFAULT_RISK_LEVELS);

  // Set initial aircraft from fleet
  useEffect(() => {
    const fleetList = fleetAircraft || [];
    if (fleetList.length > 0 && !fi.aircraft) {
      const firstType = fleetList[0].type;
      const matching = fleetList.filter(a => a.type === firstType);
      setFi(p => ({ ...p, aircraft: firstType, tailNumber: matching.length === 1 ? matching[0].registration : "" }));
      if (allTemplates && allTemplates.length > 1) {
        const matched = resolveTemplate(firstType);
        if (matched) setActiveTemplateId(matched.id);
      }
    }
  }, [fleetAircraft]);

  // When aircraft changes, auto-switch template and clear risk factors
  const handleAircraftTemplateSwitch = useCallback((aircraftType) => {
    if (allTemplates && allTemplates.length > 1) {
      const matched = resolveTemplate(aircraftType);
      if (matched) setActiveTemplateId(matched.id);
      setChecked({});
    }
  }, [allTemplates, resolveTemplate]);

  // Manual template override from selector
  const handleManualTemplateChange = useCallback((templateId) => {
    setActiveTemplateId(templateId || null);
    setChecked({});
  }, []);

  // Fetch weather when entering step 2
  useEffect(() => {
    if (step !== 1 || wxFetched.current) return;
    const dep = fi.departure.trim();
    const dest = fi.destination.trim();
    if (!dep && !dest) return;

    wxFetched.current = true;
    setWxLoading(true);
    setWxError(null);

    const ids = [dep, dest].filter(Boolean).join(",");
    fetch(`/api/weather?ids=${encodeURIComponent(ids)}&cruiseAlt=${encodeURIComponent(fi.cruiseAlt || "")}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setWxData(data);
        const analysis = analyzeWeather(data);
        setWxAnalysis(analysis);
        // Auto-check flagged weather factors
        if (analysis.flags) {
          setChecked(prev => {
            const next = { ...prev };
            Object.keys(analysis.flags).forEach(fid => {
              if (analysis.flags[fid]) next[fid] = true;
            });
            return next;
          });
        }
      })
      .catch(err => {
        setWxError(err.message);
      })
      .finally(() => setWxLoading(false));
  }, [step, fi.departure, fi.destination, fi.cruiseAlt]);

  // Validation — matches desktop required fields
  const validateStep = (stepNum) => {
    if (stepNum === 0) {
      const errs = {};
      if (!fi.pilot.trim()) errs.pilot = "Select a pilot";
      if (!fi.aircraft.trim()) errs.aircraft = "Select an aircraft";
      if (!fi.tailNumber.trim()) errs.tailNumber = "Select a tail number";
      if (!fi.departure.trim()) errs.departure = "Enter departure airport (e.g. KSFF)";
      else if (fi.departure.trim().length < 3) errs.departure = "Use ICAO or IATA code";
      if (!fi.destination.trim()) errs.destination = "Enter destination airport (e.g. KBOI)";
      else if (fi.destination.trim().length < 3) errs.destination = "Use ICAO or IATA code";
      if (!fi.cruiseAlt.trim()) errs.cruiseAlt = "Enter cruise altitude (e.g. FL180)";
      if (!fi.date) errs.date = "Select a flight date";
      if (!fi.etd) errs.etd = "Enter departure time";
      if (!fi.ete.trim()) errs.ete = "Enter time enroute (e.g. 1:30)";
      if (!fi.fuelLbs.trim()) errs.fuelLbs = `Enter fuel onboard in ${fuelUnit}`;
      if (!fi.numCrew || fi.numCrew === "0") errs.numCrew = "Enter number of crew";
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep(s => Math.min(s + 1, 3));
  };
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const score = categories.reduce((total, cat) =>
      total + cat.factors.reduce((sum, f) => sum + (checked[f.id] ? f.score : 0), 0), 0);
    const rl = getRiskLevel(score, riskLevels);
    const factorIds = [];
    categories.forEach(cat => cat.factors.forEach(f => { if (checked[f.id]) factorIds.push(f.id); }));

    const eteMins = parseETE(fi.ete);
    let eta = null;
    if (fi.date && fi.etd && eteMins > 0) {
      try {
        const [hh, mm] = fi.etd.split(":").map(Number);
        const dep = new Date(`${fi.date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
        eta = new Date(dep.getTime() + eteMins * 60000).toISOString();
      } catch {}
    }

    const entry = {
      id: generateId(),
      pilot: fi.pilot,
      aircraft: fi.aircraft,
      tailNumber: fi.tailNumber,
      departure: fi.departure.toUpperCase(),
      destination: fi.destination.toUpperCase(),
      cruiseAlt: fi.cruiseAlt,
      date: fi.date,
      etd: fi.etd ? fi.etd.replace(":", "") : "",
      ete: fi.ete,
      eta,
      fuelLbs: fi.fuelLbs,
      fuelUnit,
      numCrew: fi.numCrew,
      numPax: fi.numPax,
      score,
      riskLevel: rl.label,
      factors: factorIds,
      wxBriefing: wxAnalysis?.briefing?.map(b => `${b.station} ${b.type}: ${b.raw}`).join("\n") || "",
      remarks: fi.remarks,
      attachments: [],
      timestamp: new Date().toISOString(),
      approvalMode: rl.approval_mode,
    };

    try {
      await onSubmit(entry);
      setSubmitted(true);
      setTimeout(() => {
        if (onNavigateToFlights) onNavigateToFlights();
      }, 1200);
    } catch (err) {
      console.error("FRAT submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setShowDiscard(false);
    if (onCancel) onCancel();
  };

  const attemptCancel = () => {
    // Only show discard if they've entered data
    const hasData = fi.departure || fi.destination || fi.aircraft !== (fleetAircraft?.[0]?.type || "");
    if (hasData) setShowDiscard(true);
    else if (onCancel) onCancel();
  };

  // Success screen
  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 120px)", padding: 24, textAlign: "center" }}>
        <style>{`
          @keyframes successPop { 0% { transform: scale(0.3); opacity: 0 } 60% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
          @keyframes successFade { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes checkDraw { from { stroke-dashoffset: 24 } to { stroke-dashoffset: 0 } }
        `}</style>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: `${GREEN}18`,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
          border: `2px solid ${GREEN}44`,
          animation: "successPop 0.4s ease-out",
        }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 24, animation: "checkDraw 0.4s ease-out 0.2s both" }}/>
          </svg>
        </div>
        <div style={{ color: WHITE, fontSize: 20, fontWeight: 700, marginBottom: 6, animation: "successFade 0.3s ease-out 0.3s both" }}>FRAT Submitted</div>
        <div style={{ color: MUTED, fontSize: 14, animation: "successFade 0.3s ease-out 0.4s both" }}>Your flight plan has been created</div>
      </div>
    );
  }

  const score = categories.reduce((total, cat) =>
    total + cat.factors.reduce((sum, f) => sum + (checked[f.id] ? f.score : 0), 0), 0);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <StepIndicator current={step} total={4} />

      {/* Step content — extra bottom padding to clear fixed nav buttons */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: step === 2 ? 120 : 80 }}>
        {step === 0 && (
          <StepFlightInfo fi={fi} setFi={setFi} fuelUnit={fuelUnit} setFuelUnit={setFuelUnit}
            fleetAircraft={fleetAircraft} errors={errors}
            allTemplates={allTemplates} activeTemplateId={activeTemplateId}
            onTemplateChange={handleManualTemplateChange} onAircraftChange={handleAircraftTemplateSwitch} />
        )}
        {step === 1 && (
          <StepWeather wxData={wxData} wxAnalysis={wxAnalysis} wxLoading={wxLoading} wxError={wxError} />
        )}
        {step === 2 && (
          <StepRiskAssessment categories={categories} checked={checked} setChecked={setChecked}
            autoFlags={wxAnalysis?.flags} riskLevels={riskLevels} />
        )}
        {step === 3 && (
          <StepReview fi={fi} fuelUnit={fuelUnit} checked={checked} categories={categories}
            riskLevels={riskLevels} wxAnalysis={wxAnalysis} submitting={submitting} />
        )}
      </div>

      {/* Bottom nav buttons */}
      {step !== 2 && ( /* Step 2 has its own sticky footer */
        <div style={{
          position: "fixed", bottom: "calc(48px + max(env(safe-area-inset-bottom, 0px), 20px))", left: 0, right: 0, zIndex: 900,
          background: DARK, borderTop: `1px solid ${BORDER}`,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
        }}>
          {step === 0 ? (
            <button onClick={attemptCancel} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
          ) : (
            <button onClick={handleBack} style={{ ...btnSecondary, flex: 1 }}>Back</button>
          )}
          {step < 3 ? (
            <button onClick={handleNext} style={{ ...btnPrimary, flex: 2 }}>Next</button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} style={{
              ...btnPrimary, flex: 2,
              opacity: submitting ? 0.6 : 1,
            }}>
              {submitting ? "Submitting..." : "Submit FRAT"}
            </button>
          )}
        </div>
      )}

      {/* Step 2 bottom nav (beside the score footer) */}
      {step === 2 && (
        <div style={{
          position: "fixed", bottom: "calc(84px + max(env(safe-area-inset-bottom, 0px), 20px))", left: 0, right: 0, zIndex: 901,
          background: DARK, borderTop: `1px solid ${BORDER}`,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <button onClick={handleBack} style={{ ...btnSecondary, flex: 1 }}>Back</button>
          <button onClick={handleNext} style={{ ...btnPrimary, flex: 2 }}>
            Review (Score: {score})
          </button>
        </div>
      )}

      {/* Discard confirmation */}
      {showDiscard && <DiscardConfirm onDiscard={handleDiscard} onCancel={() => setShowDiscard(false)} />}

      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  );
}

const cardStyle = {
  background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`,
};

const inputStyle = {
  width: "100%", padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 8,
  fontSize: 16, background: BLACK, color: OFF_WHITE, boxSizing: "border-box",
  fontFamily: "inherit",
};

const btnPrimary = {
  padding: "14px", background: CYAN, color: BLACK, border: "none",
  borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer",
};

const btnSecondary = {
  padding: "14px", background: "transparent", color: OFF_WHITE,
  border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 16, cursor: "pointer",
};
