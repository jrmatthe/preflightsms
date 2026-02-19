import { useState } from "react";

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

const DEFAULT_THRESHOLDS = [
  { level: "LOW", label: "LOW RISK", min: 0, max: 15, color: "green", action: "Flight authorized \u2014 standard procedures" },
  { level: "MODERATE", label: "MODERATE RISK", min: 16, max: 30, color: "yellow", action: "Enhanced awareness \u2014 brief crew on elevated risk factors" },
  { level: "HIGH", label: "HIGH RISK", min: 31, max: 45, color: "amber", action: "Requires management approval before departure" },
  { level: "CRITICAL", label: "CRITICAL RISK", min: 46, max: 100, color: "red", action: "Flight should not depart without risk mitigation and executive approval" },
];

// ── SINGLE TEMPLATE EDITOR ─────────────────────────────────────
function TemplateEditor({ template, onSave, saving, allAircraftTypes }) {
  const [name, setName] = useState(template?.name || "Default FRAT");
  const [categories, setCategories] = useState(template?.categories || []);
  const [aircraftTypes, setAircraftTypes] = useState(template?.aircraft_types || []);
  const [assignedAircraft, setAssignedAircraft] = useState(template?.assigned_aircraft || []);
  const [thresholds, setThresholds] = useState(template?.risk_thresholds || DEFAULT_THRESHOLDS);
  const [newAircraft, setNewAircraft] = useState("");
  const [expandedCat, setExpandedCat] = useState(null);
  const [dirty, setDirty] = useState(false);
  const markDirty = () => setDirty(true);

  const addCategory = () => { const id = genId("cat"); setCategories(c => [...c, { id, name: "New Category", factors: [] }]); setExpandedCat(id); markDirty(); };
  const updateCategory = (catId, field, value) => { setCategories(c => c.map(x => x.id === catId ? { ...x, [field]: value } : x)); markDirty(); };
  const removeCategory = (catId) => { if (!confirm("Delete this category and all its factors?")) return; setCategories(c => c.filter(x => x.id !== catId)); markDirty(); };
  const moveCat = (idx, dir) => { setCategories(c => { const a = [...c]; const n = idx + dir; if (n < 0 || n >= a.length) return a; [a[idx], a[n]] = [a[n], a[idx]]; return a; }); markDirty(); };
  const addFactor = (catId) => { setCategories(c => c.map(x => x.id === catId ? { ...x, factors: [...x.factors, { id: genId(catId), label: "New risk factor", score: 3 }] } : x)); markDirty(); };
  const updateFactor = (catId, fId, field, val) => { setCategories(c => c.map(x => x.id === catId ? { ...x, factors: x.factors.map(f => f.id === fId ? { ...f, [field]: field === "score" ? parseInt(val) || 0 : val } : f) } : x)); markDirty(); };
  const removeFactor = (catId, fId) => { setCategories(c => c.map(x => x.id === catId ? { ...x, factors: x.factors.filter(f => f.id !== fId) } : x)); markDirty(); };
  const moveFactor = (catId, idx, dir) => { setCategories(c => c.map(x => { if (x.id !== catId) return x; const a = [...x.factors]; const n = idx + dir; if (n < 0 || n >= a.length) return x; [a[idx], a[n]] = [a[n], a[idx]]; return { ...x, factors: a }; })); markDirty(); };
  const addAircraftType = () => { if (!newAircraft.trim()) return; setAircraftTypes(a => [...a, newAircraft.trim()]); setNewAircraft(""); markDirty(); };
  const removeAircraftType = (idx) => { setAircraftTypes(a => a.filter((_, i) => i !== idx)); markDirty(); };
  const toggleAssigned = (ac) => { setAssignedAircraft(p => p.includes(ac) ? p.filter(a => a !== ac) : [...p, ac]); markDirty(); };
  const updateThreshold = (idx, field, val) => { setThresholds(t => t.map((x, i) => i === idx ? { ...x, [field]: field === "min" || field === "max" ? parseInt(val) || 0 : val } : x)); markDirty(); };

  const handleSave = () => { onSave({ name, categories, aircraft_types: aircraftTypes, risk_thresholds: thresholds, assigned_aircraft: assignedAircraft }); setDirty(false); };

  const totalFactors = categories.reduce((s, c) => s + c.factors.length, 0);
  const maxScore = categories.reduce((s, c) => s + c.factors.reduce((ss, f) => ss + f.score, 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: MUTED, fontSize: 11 }}>{categories.length} categories · {totalFactors} factors · Max score: {maxScore}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <span style={{ fontSize: 10, color: YELLOW, fontWeight: 600 }}>Unsaved changes</span>}
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving..." : "Save Template"}</button>
        </div>
      </div>

      {/* Name */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Template Name</label>
        <input value={name} onChange={e => { setName(e.target.value); markDirty(); }} style={{ ...inp, maxWidth: 300 }} />
      </div>

      {/* Aircraft Assignment */}
      {allAircraftTypes.length > 0 && (
        <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
          <div style={sectionLabel}>Assign to Aircraft</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>When a pilot selects one of these aircraft, this template loads automatically.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allAircraftTypes.map(ac => (
              <button key={ac} onClick={() => toggleAssigned(ac)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: assignedAircraft.includes(ac) ? `${CYAN}22` : "transparent", color: assignedAircraft.includes(ac) ? CYAN : MUTED, border: `1px solid ${assignedAircraft.includes(ac) ? CYAN : BORDER}` }}>{ac}</button>
            ))}
          </div>
          {assignedAircraft.length === 0 && <div style={{ fontSize: 10, color: SUBTLE, marginTop: 6 }}>No aircraft assigned — available as manual selection only.</div>}
        </div>
      )}

      {/* Aircraft Types */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={sectionLabel}>Aircraft Types (FRAT dropdown)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {aircraftTypes.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: NEAR_BLACK, borderRadius: 6, border: `1px solid ${BORDER}` }}>
              <span style={{ color: OFF_WHITE, fontSize: 12 }}>{a}</span>
              <button onClick={() => removeAircraftType(i)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 14, padding: 0 }}>&times;</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newAircraft} onChange={e => setNewAircraft(e.target.value)} onKeyDown={e => e.key === "Enter" && addAircraftType()} placeholder="Add aircraft type..." style={{ ...inp, flex: 1, maxWidth: 200 }} />
          <button onClick={addAircraftType} style={btnSecondary}>Add</button>
        </div>
      </div>

      {/* Risk Thresholds */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={sectionLabel}>Risk Thresholds</div>
        {thresholds.map((t, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "12px 120px 60px 60px 1fr", gap: 10, alignItems: "center", marginBottom: 10 }} className="frat-threshold-grid">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorMap[t.color] || GREEN }} />
            <input value={t.label} onChange={e => updateThreshold(i, "label", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px" }} />
            <input type="number" value={t.min} onChange={e => updateThreshold(i, "min", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px", textAlign: "center" }} />
            <input type="number" value={t.max} onChange={e => updateThreshold(i, "max", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px", textAlign: "center" }} />
            <input value={t.action} onChange={e => updateThreshold(i, "action", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px" }} placeholder="Action required..." />
          </div>
        ))}
        <div style={{ color: SUBTLE, fontSize: 10, marginTop: 4 }}>Columns: Color · Label · Min · Max · Required Action</div>
      </div>

      {/* Risk Categories & Factors */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
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
                  {cat.factors.map((f, fi) => (
                    <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, padding: "8px 10px", background: NEAR_BLACK, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <button onClick={() => moveFactor(cat.id, fi, -1)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 9, padding: 0 }} disabled={fi === 0}>▲</button>
                        <button onClick={() => moveFactor(cat.id, fi, 1)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 9, padding: 0 }} disabled={fi === cat.factors.length - 1}>▼</button>
                      </div>
                      <input value={f.label} onChange={e => updateFactor(cat.id, f.id, "label", e.target.value)} style={{ ...inp, flex: 1, fontSize: 12, padding: "6px 8px", background: "transparent" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <span style={{ color: MUTED, fontSize: 10 }}>pts:</span>
                        <input type="number" min="1" max="10" value={f.score} onChange={e => updateFactor(cat.id, f.id, "score", e.target.value)} style={{ ...inp, width: 50, fontSize: 12, padding: "6px 8px", textAlign: "center", background: "transparent" }} />
                      </div>
                      <button onClick={() => removeFactor(cat.id, f.id)} style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>&times;</button>
                    </div>
                  ))}
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
export default function FRATTemplateEditor({ template, templates, onSave, onCreateTemplate, onDeleteTemplate, onSetActive, saving }) {
  const allTemplates = templates || (template ? [template] : []);
  const [selectedId, setSelectedId] = useState(template?.id || allTemplates[0]?.id || null);
  const [showEditor, setShowEditor] = useState(!!template);

  const selectedTemplate = allTemplates.find(t => t.id === selectedId);
  const activeTemplate = allTemplates.find(t => t.is_active);
  const allAircraftTypes = [...new Set(allTemplates.flatMap(t => t.aircraft_types || []))];

  const handleCreate = async () => { if (onCreateTemplate) await onCreateTemplate({ name: "New Template", categories: [], aircraft_types: [], risk_thresholds: [...DEFAULT_THRESHOLDS], assigned_aircraft: [] }); };
  const handleDuplicate = async (t) => { if (onCreateTemplate) await onCreateTemplate({ name: `${t.name} (Copy)`, categories: t.categories || [], aircraft_types: t.aircraft_types || [], risk_thresholds: t.risk_thresholds || [...DEFAULT_THRESHOLDS], assigned_aircraft: [] }); };
  const handleDelete = async (t) => {
    if (t.is_active) { alert("Cannot delete the active template. Set another as active first."); return; }
    if (!confirm(`Delete "${t.name}"?`)) return;
    if (onDeleteTemplate) await onDeleteTemplate(t.id);
    if (selectedId === t.id) { setSelectedId(null); setShowEditor(false); }
  };
  const handleSetActive = async (t) => { if (onSetActive) await onSetActive(t.id); };

  // Single-template fallback
  if (!templates) return <TemplateEditor template={template} onSave={onSave} saving={saving} allAircraftTypes={allAircraftTypes} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={sectionLabel}>FRAT Templates</div>
          <div style={{ color: MUTED, fontSize: 11 }}>{allTemplates.length} template{allTemplates.length !== 1 ? "s" : ""} · Active: {activeTemplate?.name || "None"}</div>
        </div>
        <button onClick={handleCreate} style={btnPrimary}>+ New Template</button>
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
                  {t.is_active && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: `${GREEN}22`, color: GREEN, textTransform: "uppercase" }}>Active</span>}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>
                  {(t.categories || []).length} categories · {factorCount} factors
                  {assigned.length > 0 && ` · Aircraft: ${assigned.join(", ")}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                {!t.is_active && <button onClick={() => handleSetActive(t)} style={{ ...btnSecondary, padding: "4px 10px", fontSize: 10, color: GREEN, borderColor: `${GREEN}44` }}>Set Active</button>}
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
          <TemplateEditor template={selectedTemplate} onSave={(data) => onSave({ ...data, id: selectedTemplate.id })} saving={saving} allAircraftTypes={allAircraftTypes} />
        </div>
      )}
    </div>
  );
}
