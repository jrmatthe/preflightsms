import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getActiveMelItems, getMelExpirationStatus } from "../../lib/melHelpers";
import { analyzeWeather, getCeiling, parseCruiseAlt, parseETE, formatETE } from "../../lib/analyzeWeather";

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

      <Field label="Date" error={errors.date}>
        <input type="date" value={fi.date} onChange={e => setFi(p => ({ ...p, date: e.target.value }))} style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none", maxWidth: "100%", minHeight: 48 }} />
      </Field>

      <Field label="ETD (local)" error={errors.etd}>
        <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:MM"
          value={(() => { const d = (fi.etd || "").replace(/[^0-9]/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d; })()}
          onFocus={e => e.target.select()}
          onChange={e => { const d = e.target.value.replace(/[^0-9]/g, "").slice(0, 4); setFi(p => ({ ...p, etd: d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d })); }}
          style={inputStyle} />
      </Field>

      <Field label="ETE (hours:minutes)" error={errors.ete}>
        <input type="text" inputMode="numeric" maxLength={5} placeholder="HH:MM"
          value={(() => { const d = (fi.ete || "").replace(/[^0-9]/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d; })()}
          onFocus={e => e.target.select()}
          onChange={e => { const d = e.target.value.replace(/[^0-9]/g, "").slice(0, 4); setFi(p => ({ ...p, ete: d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d })); }}
          style={inputStyle} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Crew" error={errors.numCrew}>
          <NumberStepper value={fi.numCrew} onChange={v => setFi(p => ({ ...p, numCrew: v }))} min={1} max={10} />
        </Field>
        <Field label="Passengers" error={errors.numPax}>
          <NumberStepper value={fi.numPax} onChange={v => setFi(p => ({ ...p, numPax: v }))} min={0} max={50} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start" }}>
        <Field label={`Fuel (${fuelUnit.toUpperCase()})`} error={errors.fuelLbs}>
          <input value={fi.fuelLbs} onChange={e => setFi(p => ({ ...p, fuelLbs: e.target.value }))} style={inputStyle} placeholder={`Enter fuel in ${fuelUnit}`} inputMode="decimal" />
        </Field>
        <div style={{ marginBottom: 14, paddingTop: 23 }}>
          <button onClick={() => setFuelUnit(u => u === "lbs" ? "gal" : u === "gal" ? "hrs" : "lbs")} style={{
            ...inputStyle, width: 70, textAlign: "center", cursor: "pointer", fontWeight: 600,
          }}>
            {fuelUnit.toUpperCase()}
          </button>
        </div>
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
  const [expandedHazard, setExpandedHazard] = useState(null);

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
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.hazards.map((h, hi) => {
                    const key = `${i}-${hi}`;
                    const isOpen = expandedHazard === key;
                    return (
                      <button key={hi} onClick={() => setExpandedHazard(isOpen ? null : key)} style={{
                        padding: "4px 10px", borderRadius: 10, background: `${h.color}18`,
                        color: h.color, fontSize: 14, fontWeight: 600, border: `1px solid ${isOpen ? h.color : h.color + "33"}`,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {h.label}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    );
                  })}
                </div>
                {s.hazards.map((h, hi) => {
                  const key = `${i}-${hi}`;
                  if (expandedHazard !== key) return null;
                  return (
                    <div key={`detail-${hi}`} style={{
                      marginTop: 8, padding: "10px 12px", borderRadius: 8,
                      background: `${h.color}0A`, border: `1px solid ${h.color}22`,
                      fontSize: 13, color: OFF_WHITE, lineHeight: 1.5,
                    }}>
                      {h.reason || `${h.label} conditions detected`}
                    </div>
                  );
                })}
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
function StepRiskAssessment({ categories, checked, setChecked, autoFlags, onClearAutoFlag, riskLevels }) {
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
                        onChange={() => {
                          setChecked(p => ({ ...p, [f.id]: !p[f.id] }));
                          if (autoFlags && autoFlags[f.id] && onClearAutoFlag) onClearAutoFlag(f.id);
                        }}
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
        position: "fixed", bottom: "calc(56px + max(env(safe-area-inset-bottom, 0px), 20px))", left: 0, right: 0, zIndex: 900,
        background: DARK, borderTop: `1px solid ${rl.border}`,
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
    <div style={{ marginBottom: 14, minWidth: 0 }}>
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
  pendingFfFlights, selectedFfFlight, onSelectFfFlight, onClearFfFlight,
  pendingScTrips, selectedScTrip, onSelectScTrip, onClearScTrip,
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
  const [autoSuggested, setAutoSuggested] = useState({});
  const wxFetchTimer = useRef(null);

  // Template resolution
  const resolveTemplate = useCallback((aircraft) => {
    if (!allTemplates || allTemplates.length <= 1) return null;
    const ac = (aircraft || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!ac) return allTemplates.find(t => t.is_active) || null;
    // Exact match first
    const exact = allTemplates.find(t => (t.assigned_aircraft || []).includes(aircraft));
    if (exact) return exact;
    // Fuzzy: normalize both sides, match if one contains the other
    const fuzzy = allTemplates.find(t => (t.assigned_aircraft || []).some(a => {
      const norm = a.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return norm && (ac.includes(norm) || norm.includes(ac));
    }));
    return fuzzy || allTemplates.find(t => t.is_active) || null;
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

  // ForeFlight pre-population
  useEffect(() => {
    if (!selectedFfFlight) return;
    const ff = selectedFfFlight;
    const etdStr = ff.etd ? new Date(ff.etd).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }) : "";
    const dateStr = ff.etd ? new Date(ff.etd).toISOString().split("T")[0] : getLocalDate();
    let eteStr = "";
    if (ff.ete_minutes != null) {
      const h = Math.floor(ff.ete_minutes / 60);
      const m = ff.ete_minutes % 60;
      eteStr = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    } else if (ff.etd && ff.eta) {
      const diffMs = new Date(ff.eta).getTime() - new Date(ff.etd).getTime();
      if (diffMs > 0) {
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        eteStr = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
      }
    }
    let cruiseAltStr = "";
    if (ff.cruise_alt != null) {
      const altNum = parseInt(ff.cruise_alt);
      cruiseAltStr = !isNaN(altNum) && altNum >= 18000 ? "FL" + Math.round(altNum / 100) : String(ff.cruise_alt);
    }
    let remarksStr = "";
    if (ff.route) remarksStr += "Route: " + ff.route;
    if (ff.dispatcher_notes) remarksStr += (remarksStr ? " | " : "") + "Dispatch: " + ff.dispatcher_notes;
    // Resolve aircraft type: try tail number lookup first, then fuzzy-match aircraft_type
    const fleet = fleetAircraft || [];
    const fleetTypes = [...new Set(fleet.map(a => a.type))];
    let resolvedAircraft = "";
    const tailNum = ff.tail_number || "";
    if (tailNum && fleet.length > 0) {
      const fleetMatch = fleet.find(a => a.registration === tailNum);
      if (fleetMatch) resolvedAircraft = fleetMatch.type;
    }
    if (!resolvedAircraft && ff.aircraft_type && fleetTypes.length > 0) {
      const norm = ff.aircraft_type.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const match = fleetTypes.find(t => {
        const tn = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
        return tn && (norm.includes(tn) || tn.includes(norm));
      });
      resolvedAircraft = match || ff.aircraft_type;
    }
    setFi(p => ({
      ...p,
      departure: ff.departure_icao || p.departure,
      destination: ff.destination_icao || p.destination,
      tailNumber: ff.tail_number || p.tailNumber,
      aircraft: resolvedAircraft || p.aircraft,
      pilot: ff.pilot_name || p.pilot,
      date: dateStr,
      etd: etdStr || p.etd,
      ete: eteStr || p.ete,
      cruiseAlt: cruiseAltStr || p.cruiseAlt,
      fuelLbs: ff.fuel_lbs != null ? String(ff.fuel_lbs) : p.fuelLbs,
      numPax: ff.passenger_count != null ? String(ff.passenger_count) : p.numPax,
      numCrew: ff.crew_count != null ? String(ff.crew_count) : p.numCrew,
      remarks: remarksStr || p.remarks,
    }));
    if (ff.fuel_lbs != null) setFuelUnit("lbs");
    if (resolvedAircraft && allTemplates && allTemplates.length > 1) {
      const matched = resolveTemplate(resolvedAircraft);
      if (matched) { setActiveTemplateId(matched.id); setChecked({}); setAutoSuggested({}); }
    }
  }, [selectedFfFlight]);

  // Schedaero pre-population
  useEffect(() => {
    if (!selectedScTrip) return;
    const sc = selectedScTrip;
    const etdStr = sc.etd ? new Date(sc.etd).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }) : "";
    const dateStr = sc.etd ? new Date(sc.etd).toISOString().split("T")[0] : getLocalDate();
    let eteStr = "";
    if (sc.etd && sc.eta) {
      const diffMs = new Date(sc.eta).getTime() - new Date(sc.etd).getTime();
      if (diffMs > 0) {
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        eteStr = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
      }
    }
    // Resolve aircraft type: try tail number lookup first, then fuzzy-match aircraft_type
    const fleet = fleetAircraft || [];
    const fleetTypes = [...new Set(fleet.map(a => a.type))];
    let resolvedAircraft = "";
    const tailNum = sc.tail_number || "";
    if (tailNum && fleet.length > 0) {
      const fleetMatch = fleet.find(a => a.registration === tailNum);
      if (fleetMatch) resolvedAircraft = fleetMatch.type;
    }
    if (!resolvedAircraft && sc.aircraft_type && fleetTypes.length > 0) {
      const norm = sc.aircraft_type.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const match = fleetTypes.find(t => {
        const tn = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
        return tn && (norm.includes(tn) || tn.includes(norm));
      });
      resolvedAircraft = match || sc.aircraft_type;
    }
    setFi(p => ({
      ...p,
      departure: sc.departure_icao || p.departure,
      destination: sc.destination_icao || p.destination,
      tailNumber: sc.tail_number || p.tailNumber,
      aircraft: resolvedAircraft || p.aircraft,
      pilot: sc.pilot_name || p.pilot,
      date: dateStr,
      etd: etdStr || p.etd,
      ete: eteStr || p.ete,
      numPax: sc.passenger_count != null ? String(sc.passenger_count) : p.numPax,
      numCrew: sc.crew_count != null ? String(sc.crew_count) : p.numCrew,
      remarks: sc.trip_number ? `Trip: ${sc.trip_number}` : p.remarks,
    }));
    if (resolvedAircraft && allTemplates && allTemplates.length > 1) {
      const matched = resolveTemplate(resolvedAircraft);
      if (matched) { setActiveTemplateId(matched.id); setChecked({}); setAutoSuggested({}); }
    }
  }, [selectedScTrip]);

  // Auto-fetch weather when airports change (debounced, same as desktop)
  useEffect(() => {
    if (wxFetchTimer.current) clearTimeout(wxFetchTimer.current);
    const dep = fi.departure.trim().toUpperCase();
    const dest = fi.destination.trim().toUpperCase();
    if (dep.length < 3 && dest.length < 3) {
      setWxData(null);
      setWxAnalysis({ flags: {}, reasons: {}, briefing: [], stationSummaries: [] });
      setWxError(null);
      setChecked(p => { const n = { ...p }; Object.keys(autoSuggested).forEach(k => { delete n[k]; }); return n; });
      setAutoSuggested({});
      return;
    }
    wxFetchTimer.current = setTimeout(async () => {
      setWxLoading(true); setWxError(null);
      try {
        const ids = [dep, dest].filter(Boolean).join(",");
        const params = new URLSearchParams({ ids, cruiseAlt: fi.cruiseAlt || "" });
        // Pass ETD/ETA for night detection (approximate using date + local time)
        if (fi.date && fi.etd) {
          const t = fi.etd.replace(/[^0-9]/g, "").padStart(4, "0");
          const hh = parseInt(t.slice(0, 2), 10);
          const mm = parseInt(t.slice(2, 4), 10);
          if (!isNaN(hh) && hh <= 23 && !isNaN(mm) && mm <= 59) {
            const depDate = new Date(`${fi.date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
            if (!isNaN(depDate.getTime())) {
              params.set("depTimeZ", depDate.toISOString());
              const eteMins = parseETE(fi.ete);
              if (eteMins > 0) params.set("arrTimeZ", new Date(depDate.getTime() + eteMins * 60000).toISOString());
            }
          }
        }
        const r = await fetch(`/api/weather?${params.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!data || ((data.metars || []).length === 0 && (data.tafs || []).length === 0)) {
          setWxError("No data returned — verify ICAO codes");
          setWxData(null);
          setWxAnalysis({ flags: {}, reasons: {}, briefing: [], stationSummaries: [] });
        } else {
          setWxData(data);
          data.stationOrder = [dep, dest].filter(Boolean);
          // Pass ForeFlight leg count for ops_multi_leg detection
          if (selectedFfFlight?.raw_data) {
            const rd = selectedFfFlight.raw_data;
            const legs = rd.legs || rd.flightData?.legs;
            if (Array.isArray(legs)) data.legCount = legs.length;
            else if (rd.legCount != null) data.legCount = rd.legCount;
            else if (rd.numberOfLegs != null) data.legCount = rd.numberOfLegs;
          }
          const analysis = analyzeWeather(data);
          setWxAnalysis(analysis);
          // Auto-check flagged items, track which were auto-suggested
          setChecked(prev => {
            const next = { ...prev };
            Object.keys(autoSuggested).forEach(k => { if (!analysis.flags[k]) delete next[k]; });
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
    return () => { if (wxFetchTimer.current) clearTimeout(wxFetchTimer.current); };
  }, [fi.departure, fi.destination, fi.cruiseAlt]);

  // MEL auto-check: detect active MEL items on selected aircraft
  const selectedAircraftObj = useMemo(() => {
    if (!fi.tailNumber) return null;
    return (fleetAircraft || []).find(a => a.registration === fi.tailNumber) || null;
  }, [fi.tailNumber, fleetAircraft]);
  const activeMelItems = useMemo(() => getActiveMelItems(selectedAircraftObj?.mel_items), [selectedAircraftObj]);
  useEffect(() => {
    if (activeMelItems.length > 0) {
      setChecked(p => p.ac_mel ? p : ({ ...p, ac_mel: true }));
      setAutoSuggested(p => p.ac_mel ? p : ({ ...p, ac_mel: true }));
    } else {
      if (autoSuggested.ac_mel) {
        setChecked(p => { const n = { ...p }; delete n.ac_mel; return n; });
        setAutoSuggested(p => { const n = { ...p }; delete n.ac_mel; return n; });
      }
    }
  }, [activeMelItems, fi.tailNumber]);

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
      // 12-hour advance submission limit
      if (fi.date && fi.etd && !errs.date && !errs.etd) {
        const t = (fi.etd || "").replace(/[^0-9]/g, "").padStart(4, "0");
        const hh = parseInt(t.slice(0, 2), 10), mm = parseInt(t.slice(2, 4), 10);
        if (!isNaN(hh) && !isNaN(mm)) {
          const etdDate = new Date(`${fi.date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
          if (!isNaN(etdDate.getTime()) && etdDate.getTime() - Date.now() > 12 * 60 * 60 * 1000) {
            errs.etd = "FRATs can only be submitted within 12 hours of departure";
          }
        }
      }
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
        const t = fi.etd.replace(/[^0-9]/g, "").padStart(4, "0");
        const hh = parseInt(t.slice(0, 2), 10);
        const mm = parseInt(t.slice(2, 4), 10);
        if (!isNaN(hh) && !isNaN(mm) && hh <= 23 && mm <= 59) {
          const dep = new Date(`${fi.date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);
          eta = new Date(dep.getTime() + eteMins * 60000).toISOString();
        }
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
      foreflightFlightId: selectedFfFlight?.id || null,
      schedaeroTripId: selectedScTrip?.id || null,
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

  if (!fleetAircraft || fleetAircraft.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: 16 }}><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.7 7.3c.3.4.7.5 1.1.3l.5-.3c.4-.2.6-.7.5-1.1z"/></svg>
        <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 8 }}>No Aircraft Registered</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>Add your fleet in the Admin panel under Fleet Management before submitting a FRAT.</div>
        <button onClick={onCancel} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <StepIndicator current={step} total={4} />

      {/* Step content — extra bottom padding to clear fixed nav buttons */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: step === 2 ? 150 : 100 }}>
        {step === 0 && (
          <>
            {/* ForeFlight suggested flights */}
            {pendingFfFlights && pendingFfFlights.length > 0 && !selectedFfFlight && !selectedScTrip && (
              <div style={{ margin: "0 16px 12px", padding: 14, background: "rgba(34,211,238,0.06)", border: `1px solid ${CYAN}44`, borderRadius: 10, borderLeft: `3px solid ${CYAN}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>ForeFlight Dispatch Flights</div>
                {pendingFfFlights.map(ff => (
                  <div key={ff.id} onClick={() => onSelectFfFlight(ff)}
                    style={{ padding: "10px 12px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", minHeight: 44 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{ff.departure_icao} → {ff.destination_icao}</span>
                        {ff.tail_number && <span style={{ fontSize: 11, color: MUTED }}>| {ff.tail_number}</span>}
                      </div>
                      <span style={{ fontSize: 10, color: MUTED }}>{ff.etd ? new Date(ff.etd).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No ETD"}</span>
                    </div>
                    {(ff.passenger_count != null || ff.crew_count != null || ff.route) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {ff.passenger_count != null && <span style={{ fontSize: 9, fontWeight: 700, color: CYAN, background: "rgba(34,211,238,0.1)", padding: "2px 6px", borderRadius: 3 }}>{ff.passenger_count} pax</span>}
                        {ff.crew_count != null && <span style={{ fontSize: 9, fontWeight: 700, color: CYAN, background: "rgba(34,211,238,0.1)", padding: "2px 6px", borderRadius: 3 }}>{ff.crew_count} crew</span>}
                        {ff.route && <span style={{ fontSize: 9, color: MUTED, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ff.route}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* ForeFlight selected banner */}
            {selectedFfFlight && (
              <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: 10, background: "rgba(34,211,238,0.08)", border: `1px solid rgba(34,211,238,0.25)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: CYAN }}>ForeFlight</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: BLACK, background: CYAN, padding: "2px 8px", borderRadius: 3 }}>{selectedFfFlight.departure_icao} → {selectedFfFlight.destination_icao}</span>
                  {selectedFfFlight.passenger_count != null && <span style={{ fontSize: 9, fontWeight: 700, color: CYAN, background: "rgba(34,211,238,0.12)", padding: "2px 6px", borderRadius: 3 }}>{selectedFfFlight.passenger_count} pax</span>}
                </div>
                <button onClick={onClearFfFlight} style={{ background: "none", border: "none", color: MUTED, fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u00D7"}</button>
              </div>
            )}
            {/* Schedaero suggested trips */}
            {pendingScTrips && pendingScTrips.length > 0 && !selectedScTrip && !selectedFfFlight && (
              <div style={{ margin: "0 16px 12px", padding: 14, background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 10, borderLeft: "3px solid #60A5FA" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Schedaero Trips</div>
                {pendingScTrips.map(sc => (
                  <div key={sc.id} onClick={() => onSelectScTrip(sc)}
                    style={{ padding: "10px 12px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{sc.departure_icao} → {sc.destination_icao}</span>
                      {sc.tail_number && <span style={{ fontSize: 11, color: MUTED }}>| {sc.tail_number}</span>}
                      {sc.trip_number && <span style={{ fontSize: 9, fontWeight: 700, color: "#60A5FA", background: "rgba(96,165,250,0.12)", padding: "2px 6px", borderRadius: 3 }}>{sc.trip_number}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: MUTED }}>{sc.etd ? new Date(sc.etd).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No ETD"}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Schedaero selected banner */}
            {selectedScTrip && (
              <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: 10, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#60A5FA" }}>Schedaero</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: BLACK, background: "#60A5FA", padding: "2px 8px", borderRadius: 3 }}>{selectedScTrip.trip_number || `${selectedScTrip.departure_icao} → ${selectedScTrip.destination_icao}`}</span>
                </div>
                <button onClick={onClearScTrip} style={{ background: "none", border: "none", color: MUTED, fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u00D7"}</button>
              </div>
            )}
            <StepFlightInfo fi={fi} setFi={setFi} fuelUnit={fuelUnit} setFuelUnit={setFuelUnit}
              fleetAircraft={fleetAircraft} errors={errors}
              allTemplates={allTemplates} activeTemplateId={activeTemplateId}
              onTemplateChange={handleManualTemplateChange} onAircraftChange={handleAircraftTemplateSwitch} />
          </>
        )}
        {step === 1 && (
          <StepWeather wxData={wxData} wxAnalysis={wxAnalysis} wxLoading={wxLoading} wxError={wxError} />
        )}
        {step === 2 && (
          <>
            {activeMelItems.length > 0 && (
              <div style={{ margin: "0 16px 12px", padding: 12, background: "rgba(245,158,11,0.06)", border: `1px solid ${AMBER}44`, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: AMBER }}>&#9888;</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Active MEL Deferrals</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${AMBER}18`, color: AMBER }}>{activeMelItems.length}</span>
                </div>
                {activeMelItems.map(item => {
                  const expStatus = getMelExpirationStatus(item);
                  const expColor = expStatus === "expired" ? RED : expStatus === "warning" ? AMBER : GREEN;
                  return (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", marginBottom: 3, background: CARD, borderRadius: 6, border: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: `${CYAN}18`, color: CYAN }}>Cat {item.category}</span>
                      {item.mel_reference && <span style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Ref {item.mel_reference}</span>}
                      <span style={{ flex: 1, fontSize: 13, color: OFF_WHITE }}>{item.description}</span>
                      {item.expiration_date && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: `${expColor}18`, color: expColor }}>
                          {expStatus === "expired" ? "EXPIRED" : expStatus === "warning" ? "EXPIRING" : `Exp ${item.expiration_date}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <StepRiskAssessment categories={categories} checked={checked} setChecked={setChecked}
              autoFlags={autoSuggested} onClearAutoFlag={id => setAutoSuggested(p => { const n = { ...p }; delete n[id]; return n; })} riskLevels={riskLevels} />
          </>
        )}
        {step === 3 && (
          <StepReview fi={fi} fuelUnit={fuelUnit} checked={checked} categories={categories}
            riskLevels={riskLevels} wxAnalysis={wxAnalysis} submitting={submitting} />
        )}
      </div>

      {/* Bottom nav buttons */}
      {step !== 2 && ( /* Step 2 has its own sticky footer */
        <div style={{
          position: "fixed", bottom: "calc(56px + max(env(safe-area-inset-bottom, 0px), 20px))", left: 0, right: 0, zIndex: 900,
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
          position: "fixed", bottom: "calc(96px + max(env(safe-area-inset-bottom, 0px), 20px))", left: 0, right: 0, zIndex: 901,
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
