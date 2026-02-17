import { useState, useCallback } from "react";

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

const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, background: BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };
const sectionLabel = { fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 };
const btnPrimary = { padding: "10px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 };
const btnSecondary = { padding: "8px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: "pointer" };

function generateFactorId(catId) {
  return `${catId}_${Date.now().toString(36)}`;
}

export default function FRATTemplateEditor({ template, onSave, saving }) {
  // Initialize from template or defaults
  const [name, setName] = useState(template?.name || "Default FRAT");
  const [categories, setCategories] = useState(template?.categories || []);
  const [aircraftTypes, setAircraftTypes] = useState(template?.aircraft_types || ["PC-12", "King Air"]);
  const [thresholds, setThresholds] = useState(template?.risk_thresholds || [
    { level: "LOW", label: "LOW RISK", min: 0, max: 15, color: "green", action: "Flight authorized — standard procedures" },
    { level: "MODERATE", label: "MODERATE RISK", min: 16, max: 30, color: "yellow", action: "Enhanced awareness — brief crew on elevated risk factors" },
    { level: "HIGH", label: "HIGH RISK", min: 31, max: 45, color: "amber", action: "Requires management approval before departure" },
    { level: "CRITICAL", label: "CRITICAL RISK", min: 46, max: 100, color: "red", action: "Flight should not depart without risk mitigation and executive approval" },
  ]);
  const [newAircraft, setNewAircraft] = useState("");
  const [expandedCat, setExpandedCat] = useState(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  // ── Category Operations ──
  const addCategory = () => {
    const id = `cat_${Date.now().toString(36)}`;
    setCategories([...categories, { id, name: "New Category", factors: [] }]);
    setExpandedCat(id);
    markDirty();
  };

  const updateCategory = (catId, field, value) => {
    setCategories(categories.map(c => c.id === catId ? { ...c, [field]: value } : c));
    markDirty();
  };

  const removeCategory = (catId) => {
    if (!confirm(`Delete this category and all its factors?`)) return;
    setCategories(categories.filter(c => c.id !== catId));
    markDirty();
  };

  const moveCat = (idx, dir) => {
    const arr = [...categories];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setCategories(arr);
    markDirty();
  };

  // ── Factor Operations ──
  const addFactor = (catId) => {
    setCategories(categories.map(c => c.id === catId ? {
      ...c, factors: [...c.factors, { id: generateFactorId(catId), label: "New risk factor", score: 3 }]
    } : c));
    markDirty();
  };

  const updateFactor = (catId, factorId, field, value) => {
    setCategories(categories.map(c => c.id === catId ? {
      ...c, factors: c.factors.map(f => f.id === factorId ? { ...f, [field]: field === "score" ? parseInt(value) || 0 : value } : f)
    } : c));
    markDirty();
  };

  const removeFactor = (catId, factorId) => {
    setCategories(categories.map(c => c.id === catId ? {
      ...c, factors: c.factors.filter(f => f.id !== factorId)
    } : c));
    markDirty();
  };

  const moveFactor = (catId, idx, dir) => {
    setCategories(categories.map(c => {
      if (c.id !== catId) return c;
      const arr = [...c.factors];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return c;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...c, factors: arr };
    }));
    markDirty();
  };

  // ── Aircraft Types ──
  const addAircraftType = () => {
    if (!newAircraft.trim()) return;
    setAircraftTypes([...aircraftTypes, newAircraft.trim()]);
    setNewAircraft("");
    markDirty();
  };

  const removeAircraftType = (idx) => {
    setAircraftTypes(aircraftTypes.filter((_, i) => i !== idx));
    markDirty();
  };

  // ── Thresholds ──
  const updateThreshold = (idx, field, value) => {
    setThresholds(thresholds.map((t, i) => i === idx ? { ...t, [field]: field === "min" || field === "max" ? parseInt(value) || 0 : value } : t));
    markDirty();
  };

  // ── Save ──
  const handleSave = () => {
    onSave({
      name,
      categories,
      aircraft_types: aircraftTypes,
      risk_thresholds: thresholds,
    });
    setDirty(false);
  };

  const totalFactors = categories.reduce((sum, c) => sum + c.factors.length, 0);
  const maxPossibleScore = categories.reduce((sum, c) => sum + c.factors.reduce((s, f) => s + f.score, 0), 0);
  const colorMap = { green: GREEN, yellow: YELLOW, amber: AMBER, red: RED };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={sectionLabel}>FRAT Template Editor</div>
          <div style={{ color: MUTED, fontSize: 11 }}>{categories.length} categories &middot; {totalFactors} factors &middot; Max score: {maxPossibleScore}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <span style={{ fontSize: 10, color: YELLOW, fontWeight: 600 }}>Unsaved changes</span>}
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }}>
            {saving ? "Saving..." : "Save Template"}</button>
        </div>
      </div>

      {/* Template Name */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Template Name</label>
        <input value={name} onChange={e => { setName(e.target.value); markDirty(); }} style={{ ...inp, maxWidth: 300 }} />
      </div>

      {/* Aircraft Types */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={sectionLabel}>Aircraft Types</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {aircraftTypes.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: NEAR_BLACK, borderRadius: 6, border: `1px solid ${BORDER}` }}>
              <span style={{ color: OFF_WHITE, fontSize: 12 }}>{a}</span>
              <button onClick={() => removeAircraftType(i)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 14, padding: 0 }}>&times;</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newAircraft} onChange={e => setNewAircraft(e.target.value)} onKeyDown={e => e.key === "Enter" && addAircraftType()}
            placeholder="Add aircraft type..." style={{ ...inp, flex: 1, maxWidth: 200 }} />
          <button onClick={addAircraftType} style={btnSecondary}>Add</button>
        </div>
      </div>

      {/* Risk Thresholds */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={sectionLabel}>Risk Thresholds</div>
        {thresholds.map((t, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "12px 120px 60px 60px 1fr", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorMap[t.color] || GREEN }} />
            <input value={t.label} onChange={e => updateThreshold(i, "label", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px" }} />
            <input type="number" value={t.min} onChange={e => updateThreshold(i, "min", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px", textAlign: "center" }} />
            <input type="number" value={t.max} onChange={e => updateThreshold(i, "max", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px", textAlign: "center" }} />
            <input value={t.action} onChange={e => updateThreshold(i, "action", e.target.value)} style={{ ...inp, fontSize: 11, padding: "6px 8px" }} placeholder="Action required..." />
          </div>
        ))}
        <div style={{ color: SUBTLE, fontSize: 10, marginTop: 4 }}>Columns: Color &middot; Label &middot; Min Score &middot; Max Score &middot; Required Action</div>
      </div>

      {/* Risk Categories */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={sectionLabel}>Risk Categories &amp; Factors</div>
          <button onClick={addCategory} style={btnSecondary}>+ Add Category</button>
        </div>

        {categories.map((cat, catIdx) => {
          const isExpanded = expandedCat === cat.id;
          const catScore = cat.factors.reduce((s, f) => s + f.score, 0);
          return (
            <div key={cat.id} style={{ ...card, marginBottom: 10, border: `1px solid ${isExpanded ? LIGHT_BORDER : BORDER}` }}>
              {/* Category header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" }}
                onClick={() => setExpandedCat(isExpanded ? null : cat.id)}>
                <span style={{ color: SUBTLE, fontSize: 12 }}>{isExpanded ? "▼" : "▶"}</span>
                <div style={{ flex: 1 }}>
                  {isExpanded ? (
                    <input value={cat.name} onChange={e => updateCategory(cat.id, "name", e.target.value)}
                      onClick={e => e.stopPropagation()} style={{ ...inp, fontSize: 14, fontWeight: 700, padding: "4px 8px", background: "transparent", border: `1px solid ${LIGHT_BORDER}` }} />
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{cat.name}</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: MUTED }}>{cat.factors.length} factors &middot; max {catScore} pts</span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={e => { e.stopPropagation(); moveCat(catIdx, -1); }} style={{ ...btnSecondary, padding: "2px 6px", fontSize: 10 }} disabled={catIdx === 0}>↑</button>
                  <button onClick={e => { e.stopPropagation(); moveCat(catIdx, 1); }} style={{ ...btnSecondary, padding: "2px 6px", fontSize: 10 }} disabled={catIdx === categories.length - 1}>↓</button>
                  <button onClick={e => { e.stopPropagation(); removeCategory(cat.id); }} style={{ ...btnSecondary, padding: "2px 6px", fontSize: 10, color: RED }}>×</button>
                </div>
              </div>

              {/* Expanded: factors list */}
              {isExpanded && (
                <div style={{ padding: "0 16px 14px" }}>
                  {cat.factors.length === 0 && (
                    <div style={{ color: SUBTLE, fontSize: 11, padding: "12px 0", textAlign: "center" }}>No factors yet. Add one below.</div>
                  )}
                  {cat.factors.map((f, fIdx) => (
                    <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, padding: "8px 10px", background: NEAR_BLACK, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <button onClick={() => moveFactor(cat.id, fIdx, -1)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 9, padding: 0 }} disabled={fIdx === 0}>▲</button>
                        <button onClick={() => moveFactor(cat.id, fIdx, 1)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 9, padding: 0 }} disabled={fIdx === cat.factors.length - 1}>▼</button>
                      </div>
                      <input value={f.label} onChange={e => updateFactor(cat.id, f.id, "label", e.target.value)}
                        style={{ ...inp, flex: 1, fontSize: 12, padding: "6px 8px", background: "transparent" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <span style={{ color: MUTED, fontSize: 10 }}>pts:</span>
                        <input type="number" min="1" max="10" value={f.score} onChange={e => updateFactor(cat.id, f.id, "score", e.target.value)}
                          style={{ ...inp, width: 50, fontSize: 12, padding: "6px 8px", textAlign: "center", background: "transparent" }} />
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
