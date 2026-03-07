import { useState, useEffect, useRef } from "react";

const BLACK = "#000000", NEAR_BLACK = "#0A0A0A", CARD = "#161616", BORDER = "#232323", LIGHT_BORDER = "#2E2E2E";
const WHITE = "#FFFFFF", OFF_WHITE = "#D4D4D4", MUTED = "#666666", SUBTLE = "#444444";
const GREEN = "#4ADE80", YELLOW = "#FACC15", AMBER = "#F59E0B", RED = "#EF4444", CYAN = "#22D3EE";

const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, background: BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };
const sectionLabel = { fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 };
const btnPrimary = { padding: "10px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 };
const btnSecondary = { padding: "8px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: "pointer" };
const colorMap = { green: GREEN, yellow: YELLOW, amber: AMBER, red: RED };

function genId(prefix) { return `${prefix}_${Date.now().toString(36)}`; }

// Factor IDs that are auto-detected from weather/flight data.
// These cannot be deleted from templates — labels and scores are still editable.
const AUTO_DETECT_IDS = new Set([
  "wx_ceiling", "wx_vis", "wx_xwind", "wx_ts", "wx_ice", "wx_turb", "wx_wind_shear", "wx_mountain",
  "ac_mel",
  "env_night", "env_short_runway", "env_notams",
  "ops_multi_leg",
]);

const DEFAULT_CATEGORIES = [
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

const DEFAULT_THRESHOLDS = [
  { level: "LOW", label: "LOW RISK", min: 0, max: 15, color: "green", action: "Flight authorized \u2014 standard procedures", approval_mode: "none" },
  { level: "MODERATE", label: "MODERATE RISK", min: 16, max: 30, color: "yellow", action: "Enhanced awareness \u2014 brief crew on elevated risk factors", approval_mode: "none" },
  { level: "HIGH", label: "HIGH RISK", min: 31, max: 45, color: "amber", action: "Requires management approval before departure", approval_mode: "required" },
  { level: "CRITICAL", label: "CRITICAL RISK", min: 46, max: 100, color: "red", action: "Flight should not depart without risk mitigation and executive approval", approval_mode: "required" },
];

// ── SINGLE TEMPLATE EDITOR ─────────────────────────────────────
function TemplateEditor({ template, onSave, saving, fleetAircraftTypes }) {
  const [name, setName] = useState(template?.name || "Default FRAT");
  const [categories, setCategories] = useState(template?.categories || []);
  const [assignedAircraft, setAssignedAircraft] = useState(template?.assigned_aircraft || []);
  const [thresholds, setThresholds] = useState(template?.risk_thresholds || DEFAULT_THRESHOLDS);
  const [includeFatigue, setIncludeFatigue] = useState(template?.include_fatigue || false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [dirty, setDirty] = useState(false);
  const markDirty = () => setDirty(true);

  const addCategory = () => { const id = genId("cat"); setCategories(c => [...c, { id, name: "New Category", factors: [] }]); setExpandedCat(id); markDirty(); };
  const updateCategory = (catId, field, value) => { setCategories(c => c.map(x => x.id === catId ? { ...x, [field]: value } : x)); markDirty(); };
  const removeCategory = (catId) => {
    const cat = categories.find(c => c.id === catId);
    if (cat && cat.factors.some(f => AUTO_DETECT_IDS.has(f.id))) {
      alert("This category contains auto-detected factors and cannot be deleted. You can remove non-auto factors individually.");
      return;
    }
    if (!confirm("Delete this category and all its factors?")) return;
    setCategories(c => c.filter(x => x.id !== catId));
    markDirty();
  };
  const moveCat = (idx, dir) => { setCategories(c => { const a = [...c]; const n = idx + dir; if (n < 0 || n >= a.length) return a; [a[idx], a[n]] = [a[n], a[idx]]; return a; }); markDirty(); };
  const addFactor = (catId) => { setCategories(c => c.map(x => x.id === catId ? { ...x, factors: [...x.factors, { id: genId(catId), label: "New risk factor", score: 3 }] } : x)); markDirty(); };
  const updateFactor = (catId, fId, field, val) => { setCategories(c => c.map(x => x.id === catId ? { ...x, factors: x.factors.map(f => f.id === fId ? { ...f, [field]: field === "score" ? parseInt(val) || 0 : val } : f) } : x)); markDirty(); };
  const removeFactor = (catId, fId) => { if (AUTO_DETECT_IDS.has(fId)) return; setCategories(c => c.map(x => x.id === catId ? { ...x, factors: x.factors.filter(f => f.id !== fId) } : x)); markDirty(); };
  const moveFactor = (catId, idx, dir) => { setCategories(c => c.map(x => { if (x.id !== catId) return x; const a = [...x.factors]; const n = idx + dir; if (n < 0 || n >= a.length) return x; [a[idx], a[n]] = [a[n], a[idx]]; return { ...x, factors: a }; })); markDirty(); };
  const toggleAssigned = (ac) => { setAssignedAircraft(p => p.includes(ac) ? p.filter(a => a !== ac) : [...p, ac]); markDirty(); };
  const updateThreshold = (idx, field, val) => { setThresholds(t => t.map((x, i) => i === idx ? { ...x, [field]: field === "min" || field === "max" ? parseInt(val) || 0 : val } : x)); markDirty(); };

  const handleSave = () => { onSave({ name, categories, risk_thresholds: thresholds, assigned_aircraft: assignedAircraft, include_fatigue: includeFatigue }); setDirty(false); };

  const totalFactors = categories.reduce((s, c) => s + c.factors.length, 0);
  const maxScore = categories.reduce((s, c) => s + c.factors.reduce((ss, f) => ss + f.score, 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: MUTED, fontSize: 11 }}>{categories.length} categories · {totalFactors} factors · Max score: {maxScore}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <span style={{ fontSize: 10, color: YELLOW, fontWeight: 600 }}>Unsaved changes</span>}
          <button data-onboarding="frat-save-btn" onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving..." : "Save Template"}</button>
        </div>
      </div>

      {/* Name */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Template Name</label>
        <input data-onboarding="frat-template-name" value={name} onChange={e => { setName(e.target.value); markDirty(); }} style={{ ...inp, maxWidth: 300 }} />
      </div>

      {/* Aircraft Assignment */}
      {fleetAircraftTypes.length > 0 && (
        <div data-onboarding="frat-aircraft-assign" style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
          <div style={sectionLabel}>Assign to Aircraft</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>When a pilot selects one of these aircraft, this template loads automatically.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {fleetAircraftTypes.map(ac => (
              <button key={ac} onClick={() => toggleAssigned(ac)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: assignedAircraft.includes(ac) ? `${CYAN}22` : "transparent", color: assignedAircraft.includes(ac) ? CYAN : MUTED, border: `1px solid ${assignedAircraft.includes(ac) ? CYAN : BORDER}` }}>{ac}</button>
            ))}
          </div>
          {assignedAircraft.length === 0 && <div style={{ fontSize: 10, color: SUBTLE, marginTop: 6 }}>No aircraft assigned — available as manual selection only.</div>}
        </div>
      )}

      {/* Fatigue Assessment Toggle */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={sectionLabel}>Fatigue Assessment</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: -8 }}>When enabled, pilots complete a fatigue risk assessment as part of this FRAT. Fatigue score contributes to the Pilot/Crew category.</div>
          </div>
          <button onClick={() => { setIncludeFatigue(p => !p); markDirty(); }}
            style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: includeFatigue ? GREEN : BORDER, transition: "background 0.2s", flexShrink: 0, marginLeft: 16 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: WHITE, position: "absolute", top: 3, left: includeFatigue ? 23 : 3, transition: "left 0.2s" }} />
          </button>
        </div>
      </div>

      {/* Risk Thresholds */}
      <div data-onboarding="frat-thresholds" style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={sectionLabel}>Risk Thresholds</div>
        {thresholds.map((t, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "12px 120px 60px 60px 1fr 150px", gap: 10, alignItems: "center", marginBottom: 10 }} className="frat-threshold-grid">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorMap[t.color] || GREEN }} />
            <input value={t.label} onChange={e => updateThreshold(i, "label", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px" }} />
            <input type="number" value={t.min} onChange={e => updateThreshold(i, "min", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px", textAlign: "center" }} />
            <input type="number" value={t.max} onChange={e => updateThreshold(i, "max", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px", textAlign: "center" }} />
            <input value={t.action} onChange={e => updateThreshold(i, "action", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px" }} placeholder="Action required..." />
            <select value={t.approval_mode || "none"} onChange={e => updateThreshold(i, "approval_mode", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px" }}>
              <option value="none">No Approval</option>
              <option value="review">Review After Flight</option>
              <option value="required">Require Approval</option>
            </select>
          </div>
        ))}
        <div style={{ color: SUBTLE, fontSize: 10, marginTop: 4 }}>Columns: Color · Label · Min · Max · Required Action · Approval Mode</div>
        <div style={{ marginTop: 12, padding: "12px 14px", background: NEAR_BLACK, borderRadius: 8, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Approval Mode Behaviors</div>
          <div style={{ fontSize: 10, color: OFF_WHITE, lineHeight: 1.7 }}>
            <div style={{ marginBottom: 6 }}><span style={{ fontWeight: 700, color: GREEN }}>No Approval</span> — Flight goes active immediately. No notifications sent.</div>
            <div style={{ marginBottom: 6 }}><span style={{ fontWeight: 700, color: CYAN }}>Review After Flight</span> — Flight goes active. All FRAT approvers are notified to review. If an approver submits, no notification is sent.</div>
            <div><span style={{ fontWeight: 700, color: YELLOW }}>Require Approval</span> — Flight is held on flight board until approved. All FRAT approvers are notified. If rejected, submitter is notified and flight is removed.</div>
          </div>
        </div>
      </div>

      {/* Risk Categories & Factors */}
      <div data-onboarding="frat-categories" style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={sectionLabel}>Risk Categories &amp; Factors</div>
          <button onClick={addCategory} style={btnSecondary}>+ Add Category</button>
        </div>
        {categories.map((cat, ci) => {
          const isExp = expandedCat === cat.id;
          const catScore = cat.factors.reduce((s, f) => s + f.score, 0);
          return (
            <div key={cat.id} style={{ ...card, marginBottom: 10, border: `1px solid ${isExp ? LIGHT_BORDER : BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" }} onClick={() => setExpandedCat(isExp ? null : cat.id)}>
                <span style={{ color: SUBTLE, fontSize: 12 }}>{isExp ? "▼" : "▶"}</span>
                <div style={{ flex: 1 }}>
                  {isExp ? <input value={cat.name} onChange={e => updateCategory(cat.id, "name", e.target.value)} onClick={e => e.stopPropagation()} style={{ ...inp, fontSize: 14, fontWeight: 700, padding: "4px 8px", background: "transparent", border: `1px solid ${LIGHT_BORDER}` }} />
                    : <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{cat.name}</span>}
                </div>
                <span style={{ fontSize: 11, color: MUTED }}>{cat.factors.length} factors · max {catScore} pts</span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={e => { e.stopPropagation(); moveCat(ci, -1); }} style={{ ...btnSecondary, padding: "2px 6px", fontSize: 10 }} disabled={ci === 0}>↑</button>
                  <button onClick={e => { e.stopPropagation(); moveCat(ci, 1); }} style={{ ...btnSecondary, padding: "2px 6px", fontSize: 10 }} disabled={ci === categories.length - 1}>↓</button>
                  <button onClick={e => { e.stopPropagation(); removeCategory(cat.id); }} style={{ ...btnSecondary, padding: "2px 6px", fontSize: 10, color: RED }}>×</button>
                </div>
              </div>
              {isExp && (
                <div style={{ padding: "0 16px 14px" }}>
                  {cat.factors.length === 0 && <div style={{ color: SUBTLE, fontSize: 11, padding: "12px 0", textAlign: "center" }}>No factors yet.</div>}
                  {cat.factors.map((f, fi) => {
                    const isAutoDetect = AUTO_DETECT_IDS.has(f.id);
                    return (
                    <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, padding: "8px 10px", background: NEAR_BLACK, borderRadius: 6, border: `1px solid ${isAutoDetect ? `${CYAN}33` : BORDER}` }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <button onClick={() => moveFactor(cat.id, fi, -1)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 9, padding: 0 }} disabled={fi === 0}>▲</button>
                        <button onClick={() => moveFactor(cat.id, fi, 1)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 9, padding: 0 }} disabled={fi === cat.factors.length - 1}>▼</button>
                      </div>
                      {isAutoDetect && <span title="Auto-detected from weather/flight data" style={{ fontSize: 8, fontWeight: 700, color: CYAN, background: `${CYAN}18`, padding: "1px 4px", borderRadius: 3, flexShrink: 0 }}>AUTO</span>}
                      <input value={f.label} onChange={e => updateFactor(cat.id, f.id, "label", e.target.value)} style={{ ...inp, flex: 1, fontSize: 12, padding: "6px 8px", background: "transparent" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <span style={{ color: MUTED, fontSize: 10 }}>pts:</span>
                        <input type="number" min="1" max="10" value={f.score} onChange={e => updateFactor(cat.id, f.id, "score", e.target.value)} style={{ ...inp, width: 50, fontSize: 12, padding: "6px 8px", textAlign: "center", background: "transparent" }} />
                      </div>
                      {isAutoDetect
                        ? <span title="Required for auto-detection" style={{ color: SUBTLE, fontSize: 14, padding: "0 4px", cursor: "default" }}>&#128274;</span>
                        : <button onClick={() => removeFactor(cat.id, f.id)} style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>&times;</button>}
                    </div>
                    );
                  })}
                  <button onClick={() => addFactor(cat.id)} style={{ ...btnSecondary, marginTop: 8, width: "100%" }}>+ Add Factor</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN: TEMPLATE LIST + EDITOR ───────────────────────────────
export default function FRATTemplateEditor({ template, templates, onSave, onCreateTemplate, onDeleteTemplate, onSetActive, saving, fleetAircraftTypes = [] }) {
  const allTemplates = templates || (template ? [template] : []);
  const [selectedId, setSelectedId] = useState(template?.id || allTemplates[0]?.id || null);
  const [showEditor, setShowEditor] = useState(!!template);

  const prevIdsRef = useRef(new Set(allTemplates.map(t => t.id)));
  useEffect(() => {
    const prevIds = prevIdsRef.current;
    const newTemplate = allTemplates.find(t => !prevIds.has(t.id));
    prevIdsRef.current = new Set(allTemplates.map(t => t.id));
    if (newTemplate) { setSelectedId(newTemplate.id); setShowEditor(true); }
  }, [allTemplates]);

  const selectedTemplate = allTemplates.find(t => t.id === selectedId);
  const activeTemplate = allTemplates.find(t => t.is_active);

  const handleCreate = async () => { if (onCreateTemplate) await onCreateTemplate({ name: "New Template", categories: DEFAULT_CATEGORIES.map(c => ({ ...c, factors: c.factors.map(f => ({ ...f })) })), risk_thresholds: [...DEFAULT_THRESHOLDS], assigned_aircraft: [] }); };
  const handleDuplicate = async (t) => { if (onCreateTemplate) await onCreateTemplate({ name: `${t.name} (Copy)`, categories: t.categories || [], risk_thresholds: t.risk_thresholds || [...DEFAULT_THRESHOLDS], assigned_aircraft: [] }); };
  const handleDelete = async (t) => {
    if (t.is_active) { alert("Cannot delete the default template. Set another as default first."); return; }
    if (!confirm(`Delete "${t.name}"?`)) return;
    if (onDeleteTemplate) await onDeleteTemplate(t.id);
    if (selectedId === t.id) { setSelectedId(null); setShowEditor(false); }
  };
  const handleSetActive = async (t) => { if (onSetActive) await onSetActive(t.id); };

  // Single-template fallback
  if (!templates) return <TemplateEditor template={template} onSave={onSave} saving={saving} fleetAircraftTypes={fleetAircraftTypes} />;

  return (
    <div data-onboarding="frat-template-list">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={sectionLabel}>FRAT Templates</div>
          <div style={{ color: MUTED, fontSize: 11 }}>{allTemplates.length} template{allTemplates.length !== 1 ? "s" : ""} · Default: {activeTemplate?.name || "None"}</div>
        </div>
        <button data-onboarding="frat-create-btn" onClick={handleCreate} style={btnPrimary}>+ New Template</button>
      </div>

      {allTemplates.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: MUTED, ...card }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13 }}>No templates yet. Create one to get started.</div>
        </div>
      ) : allTemplates.map(t => {
        const isSelected = selectedId === t.id;
        const factorCount = (t.categories || []).reduce((s, c) => s + (c.factors || []).length, 0);
        const assigned = t.assigned_aircraft || [];
        return (
          <div key={t.id} style={{ ...card, padding: "14px 18px", marginBottom: 6, border: `1px solid ${isSelected ? WHITE : t.is_active ? `${GREEN}44` : BORDER}`, cursor: "pointer", transition: "all 0.15s" }}
            onClick={() => { setSelectedId(t.id); setShowEditor(true); }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{t.name}</span>
                  {t.is_active && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: `${GREEN}22`, color: GREEN, textTransform: "uppercase" }}>Default</span>}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>
                  {(t.categories || []).length} categories · {factorCount} factors
                  {assigned.length > 0 && ` · Aircraft: ${assigned.join(", ")}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                {!t.is_active && <button onClick={() => handleSetActive(t)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 10, color: GREEN, borderColor: `${GREEN}44` }}>Set Default</button>}
                <button onClick={() => handleDuplicate(t)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 10 }}>Duplicate</button>
                {!t.is_active && <button onClick={() => handleDelete(t)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 10, color: RED, borderColor: `${RED}44` }}>Delete</button>}
              </div>
            </div>
          </div>
        );
      })}

      {showEditor && selectedTemplate && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Editing: {selectedTemplate.name}</div>
            <button onClick={() => setShowEditor(false)} style={btnSecondary}>Close Editor</button>
          </div>
          <TemplateEditor key={selectedTemplate.id} template={selectedTemplate} onSave={(data) => onSave({ ...data, id: selectedTemplate.id })} saving={saving} fleetAircraftTypes={fleetAircraftTypes} />
        </div>
      )}
    </div>
  );
}
