import { useState, useMemo, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const BLACK = "#000000", DARK = "#0A0A0A", NEAR_BLACK = "#111111", CARD = "#141414";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", AMBER = "#F59E0B", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };

const SPI_CATEGORIES = [
  { id: "reactive", label: "Reactive", color: RED, description: "Lagging indicators — measure outcomes after events occur" },
  { id: "proactive", label: "Proactive", color: CYAN, description: "Leading indicators — measure active safety management" },
  { id: "predictive", label: "Predictive", color: GREEN, description: "Forward-looking indicators — identify trends before events" },
];

const DATA_SOURCES = [
  { id: "frats", label: "FRAT Submissions" },
  { id: "safety_reports", label: "Safety Reports" },
  { id: "corrective_actions", label: "Corrective Actions" },
  { id: "training", label: "Training Records" },
  { id: "investigations", label: "Investigations" },
  { id: "policies", label: "Policy Acknowledgments" },
  { id: "custom", label: "Custom / Manual Entry" },
];

const CALC_METHODS = [
  { id: "count", label: "Count" },
  { id: "rate", label: "Rate (per multiplier)" },
  { id: "percentage", label: "Percentage" },
  { id: "average", label: "Average" },
];

const PERIODS = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "annually", label: "Annually" },
];

const TARGET_TYPES = [
  { id: "minimum", label: "Minimum (value should stay above)" },
  { id: "maximum", label: "Maximum (value should stay below)" },
  { id: "range", label: "Range (value should stay near target)" },
];

const DEFAULT_SPIS = [
  { name: "FRAT Completion Rate", description: "Percentage of flights with completed Flight Risk Assessments", category: "proactive", data_source: "frats", calculation_method: "percentage", formula_config: { numerator: "frat_submissions", denominator: "flights" }, unit: "%", measurement_period: "monthly", sort_order: 0, default_target: { target_type: "minimum", target_value: 90, alert_threshold: 80 } },
  { name: "Safety Reports per 100 Flight Hours", description: "Rate of voluntary safety reports normalized to flight hours", category: "proactive", data_source: "safety_reports", calculation_method: "rate", formula_config: { numerator: "safety_reports", denominator: "flight_hours", multiplier: 100 }, unit: "per 100 hrs", measurement_period: "monthly", sort_order: 1, default_target: { target_type: "minimum", target_value: 5, alert_threshold: 3 } },
  { name: "Avg Time to Close Corrective Actions", description: "Average number of days from creation to completion of corrective actions", category: "reactive", data_source: "corrective_actions", calculation_method: "average", formula_config: { numerator: "close_time" }, unit: "days", measurement_period: "monthly", sort_order: 2, default_target: { target_type: "maximum", target_value: 30, alert_threshold: 21 } },
  { name: "Training Compliance Rate", description: "Percentage of personnel current on all required training", category: "proactive", data_source: "training", calculation_method: "percentage", formula_config: { numerator: "compliant_records", denominator: "total_required" }, unit: "%", measurement_period: "monthly", sort_order: 3, default_target: { target_type: "minimum", target_value: 95, alert_threshold: 85 } },
  { name: "High/Critical FRAT Rate", description: "Percentage of FRATs scoring High or Critical risk level", category: "predictive", data_source: "frats", calculation_method: "percentage", formula_config: { numerator: "high_critical" }, unit: "%", measurement_period: "monthly", sort_order: 4, default_target: { target_type: "maximum", target_value: 10, alert_threshold: 15 } },
  { name: "Investigation Rate", description: "Percentage of safety reports that progress to investigation stage", category: "reactive", data_source: "investigations", calculation_method: "percentage", formula_config: { numerator: "investigated", denominator: "total_reports" }, unit: "%", measurement_period: "monthly", sort_order: 5, default_target: { target_type: "minimum", target_value: 80, alert_threshold: 60 } },
  { name: "Overdue Corrective Actions", description: "Count of corrective actions past their due date", category: "reactive", data_source: "corrective_actions", calculation_method: "count", formula_config: { numerator: "overdue" }, unit: "count", measurement_period: "monthly", sort_order: 6, default_target: { target_type: "maximum", target_value: 0, alert_threshold: 2 } },
  { name: "Policy Acknowledgment Rate", description: "Percentage of active policies acknowledged by all personnel", category: "proactive", data_source: "policies", calculation_method: "percentage", formula_config: { numerator: "acknowledged", denominator: "total_required" }, unit: "%", measurement_period: "monthly", sort_order: 7, default_target: { target_type: "minimum", target_value: 100, alert_threshold: 90 } },
];

function statusColor(status) {
  if (status === "on_target") return GREEN;
  if (status === "approaching_threshold") return AMBER;
  if (status === "breached") return RED;
  return MUTED;
}

function statusLabel(status) {
  if (status === "on_target") return "On Target";
  if (status === "approaching_threshold") return "Approaching";
  if (status === "breached") return "Breached";
  return "No Data";
}

function Badge({ label, color, bg }) {
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: bg || `${color}15`, color, border: `1px solid ${color}30`, letterSpacing: 0.3 }}>
      {label}
    </span>
  );
}

function Btn({ children, onClick, primary, danger, small, disabled, style: sx }) {
  const bg = danger ? RED : primary ? WHITE : "transparent";
  const fg = danger ? WHITE : primary ? BLACK : OFF_WHITE;
  const brd = danger ? RED : primary ? WHITE : BORDER;
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      padding: small ? "5px 10px" : "8px 16px", borderRadius: 6,
      border: `1px solid ${brd}`, background: bg, color: fg,
      fontSize: small ? 11 : 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1, transition: "all 0.15s", ...sx,
    }}>
      {children}
    </button>
  );
}

// Simple sparkline rendered as inline SVG
function Sparkline({ data, color, width = 80, height = 24 }) {
  if (!data || data.length < 2) return <span style={{ color: MUTED, fontSize: 10 }}>—</span>;
  const values = data.map(d => Number(d.measured_value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function SafetyPerformanceIndicators({
  profile, org, spis, spiMeasurements,
  onCreateSpi, onUpdateSpi, onDeleteSpi,
  onCreateTarget, onUpdateTarget, onDeleteTarget,
  onLoadTargets, onLoadMeasurements, onCreateMeasurement,
  onInitDefaults,
}) {
  const [view, setView] = useState("list"); // list, detail, editor
  const [selectedSpi, setSelectedSpi] = useState(null);
  const [editingSpi, setEditingSpi] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [showHelp, setShowHelp] = useState(false);

  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);

  // Auto-populate default indicators if none exist
  const didAutoInit = useState(false);
  useEffect(() => {
    if (isAdmin && (spis || []).length === 0 && onInitDefaults && !didAutoInit[0]) {
      didAutoInit[1](true);
      onInitDefaults();
    }
  }, [isAdmin, spis, onInitDefaults]);

  // Get latest measurement for each SPI
  const spiWithLatest = useMemo(() => {
    const measurements = spiMeasurements || [];
    return (spis || []).map(spi => {
      const m = measurements.filter(m => m.spi_id === spi.id).sort((a, b) => new Date(b.period_end) - new Date(a.period_end));
      const latest = m[0] || null;
      const last6 = m.slice(0, 6).reverse();
      return { ...spi, latest, last6, latestValue: latest ? Number(latest.measured_value) : null, latestStatus: latest?.status || null };
    });
  }, [spis, spiMeasurements]);

  const filteredSpis = useMemo(() => {
    if (filterCat === "all") return spiWithLatest;
    return spiWithLatest.filter(s => s.category === filterCat);
  }, [spiWithLatest, filterCat]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    for (const cat of SPI_CATEGORIES) {
      const items = filteredSpis.filter(s => s.category === cat.id);
      if (items.length > 0) groups[cat.id] = items;
    }
    return groups;
  }, [filteredSpis]);

  // SPI Health summary
  const healthSummary = useMemo(() => {
    const active = spiWithLatest.filter(s => s.is_active);
    return {
      green: active.filter(s => s.latestStatus === "on_target").length,
      yellow: active.filter(s => s.latestStatus === "approaching_threshold").length,
      red: active.filter(s => s.latestStatus === "breached").length,
      noData: active.filter(s => !s.latestStatus).length,
    };
  }, [spiWithLatest]);

  // ── LIST VIEW ────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>Safety Performance Indicators (SPIs)<button onClick={() => setShowHelp(!showHelp)} title="What's this?" style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MUTED, fontSize: 10, fontWeight: 700, marginLeft: 8, verticalAlign: "middle" }}>?</button></div>
            <div style={{ fontSize: 11, color: MUTED }}>Part 5 §5.71–5.75 — configurable indicators with targets</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={() => exportSpiCsv(spiWithLatest)}>Export CSV</Btn>
            {isAdmin && <Btn primary onClick={() => { setEditingSpi(null); setView("editor"); }}>+ Add Indicator</Btn>}
          </div>
        </div>
        {showHelp && <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.6, padding: "10px 14px", marginBottom: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 6 }}>Safety Performance Indicators track measurable safety metrics over time. Set targets, record measurements, and monitor trends to ensure your safety program is continuously improving.</div>}

        {/* Empty state while defaults are loading */}
        {(spis || []).length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>Loading default indicators...</div>
        )}

        {/* Health summary bar */}
        {(spis || []).length > 0 && (
          <div style={{ ...card, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>Indicator Health:</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: GREEN, display: "inline-block" }} /><span style={{ fontSize: 12, color: OFF_WHITE }}>{healthSummary.green} On Target</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: AMBER, display: "inline-block" }} /><span style={{ fontSize: 12, color: OFF_WHITE }}>{healthSummary.yellow} Approaching</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: RED, display: "inline-block" }} /><span style={{ fontSize: 12, color: OFF_WHITE }}>{healthSummary.red} Breached</span></span>
              {healthSummary.noData > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: MUTED, display: "inline-block" }} /><span style={{ fontSize: 12, color: MUTED }}>{healthSummary.noData} No Data</span></span>}
            </div>
          </div>
        )}

        {/* Category filters */}
        {(spis || []).length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button onClick={() => setFilterCat("all")} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${filterCat === "all" ? WHITE : BORDER}`, background: filterCat === "all" ? WHITE : "transparent", color: filterCat === "all" ? BLACK : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
            {SPI_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${filterCat === c.id ? c.color : BORDER}`, background: filterCat === c.id ? `${c.color}20` : "transparent", color: filterCat === c.id ? c.color : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* SPI cards grouped by category */}
        {Object.entries(grouped).map(([catId, items]) => {
          const cat = SPI_CATEGORIES.find(c => c.id === catId);
          return (
            <div key={catId} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: cat.color, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{cat.label} Indicators</div>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>{cat.description}</div>
              {items.map(spi => (
                <div key={spi.id} onClick={() => { setSelectedSpi(spi); setView("detail"); }} style={{ ...card, padding: 16, marginBottom: 8, cursor: "pointer", borderLeft: `3px solid ${statusColor(spi.latestStatus)}`, transition: "border-color 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor(spi.latestStatus), display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{spi.name}</span>
                      </div>
                      {spi.description && <div style={{ fontSize: 11, color: MUTED, marginTop: 4, marginLeft: 18 }}>{spi.description}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <Sparkline data={spi.last6} color={statusColor(spi.latestStatus)} />
                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: statusColor(spi.latestStatus) }}>
                          {spi.latestValue !== null ? spi.latestValue.toFixed(1) : "—"}
                        </div>
                        <div style={{ fontSize: 10, color: MUTED }}>{spi.unit || ""}</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 60 }}>
                        <Badge label={statusLabel(spi.latestStatus)} color={statusColor(spi.latestStatus)} />
                        {spi.latest?.target_value != null && (
                          <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Target: {Number(spi.latest.target_value).toFixed(1)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {(spis || []).length > 0 && Object.keys(grouped).length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 13 }}>No indicators match your filter.</div>
        )}
      </div>
    );
  }

  // ── DETAIL VIEW ──────────────────────────────────────────────
  if (view === "detail" && selectedSpi) {
    return <SpiDetail
      spi={selectedSpi}
      spis={spis}
      isAdmin={isAdmin}
      onBack={() => { setSelectedSpi(null); setView("list"); }}
      onEdit={() => { setEditingSpi(selectedSpi); setView("editor"); }}
      onUpdateSpi={onUpdateSpi}
      onDeleteSpi={onDeleteSpi}
      onLoadTargets={onLoadTargets}
      onCreateTarget={onCreateTarget}
      onUpdateTarget={onUpdateTarget}
      onDeleteTarget={onDeleteTarget}
      onLoadMeasurements={onLoadMeasurements}
      onCreateMeasurement={onCreateMeasurement}
      spiMeasurements={spiMeasurements}
    />;
  }

  // ── EDITOR VIEW ──────────────────────────────────────────────
  if (view === "editor") {
    return <SpiEditor
      existing={editingSpi}
      isAdmin={isAdmin}
      onBack={() => { setEditingSpi(null); setView(editingSpi ? "detail" : "list"); }}
      onSave={async (data) => {
        if (editingSpi) {
          await onUpdateSpi(editingSpi.id, data);
        } else {
          await onCreateSpi(data);
        }
        setEditingSpi(null);
        setView("list");
      }}
    />;
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// SPI DETAIL VIEW
// ════════════════════════════════════════════════════════════════
function SpiDetail({ spi, spis, isAdmin, onBack, onEdit, onUpdateSpi, onDeleteSpi, onLoadTargets, onCreateTarget, onUpdateTarget, onDeleteTarget, onLoadMeasurements, onCreateMeasurement, spiMeasurements }) {
  const [measurements, setMeasurements] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetForm, setTargetForm] = useState({ target_type: "maximum", target_value: "", alert_threshold: "", effective_date: new Date().toISOString().split("T")[0], notes: "" });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ period_start: "", period_end: "", measured_value: "", notes: "" });

  const localSpi = useMemo(() => (spis || []).find(s => s.id === spi.id) || spi, [spis, spi.id]);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, t] = await Promise.all([
      onLoadMeasurements(spi.id),
      onLoadTargets(spi.id),
    ]);
    setMeasurements(m || []);
    setTargets(t || []);
    setLoading(false);
  }, [spi.id, onLoadMeasurements, onLoadTargets]);

  useEffect(() => { load(); }, [load]);

  const cat = SPI_CATEGORIES.find(c => c.id === localSpi.category) || SPI_CATEGORIES[0];
  const activeTarget = targets.find(t => !t.end_date || new Date(t.end_date) >= new Date()) || null;

  // Chart data
  const chartData = useMemo(() => {
    return measurements.map(m => ({
      period: new Date(m.period_end).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      value: Number(m.measured_value),
      target: m.target_value != null ? Number(m.target_value) : null,
      status: m.status,
    }));
  }, [measurements]);

  const ttStyle = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11 };

  if (loading) return <div style={{ color: MUTED, fontSize: 12, padding: 20 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>← Back to Indicators</button>

      {/* Header */}
      <div style={{ ...card, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>{localSpi.name}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
              <Badge label={cat.label} color={cat.color} />
              <Badge label={localSpi.measurement_period} color={MUTED} />
              {localSpi.unit && <span style={{ fontSize: 11, color: MUTED }}>{localSpi.unit}</span>}
              <Badge label={localSpi.is_active ? "Active" : "Inactive"} color={localSpi.is_active ? GREEN : MUTED} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin && <Btn small onClick={onEdit}>Edit Indicator</Btn>}
            {isAdmin && !confirmDelete && <Btn small danger onClick={() => setConfirmDelete(true)}>Delete</Btn>}
            {isAdmin && confirmDelete && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: RED }}>Confirm?</span>
                <Btn small danger onClick={async () => { await onDeleteSpi(localSpi.id); onBack(); }}>Yes</Btn>
                <Btn small onClick={() => setConfirmDelete(false)}>No</Btn>
              </div>
            )}
          </div>
        </div>
        {localSpi.description && <div style={{ fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>{localSpi.description}</div>}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ ...card, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 12 }}>Trend</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} />
              <Tooltip contentStyle={ttStyle} />
              <Line type="monotone" dataKey="value" stroke={WHITE} strokeWidth={2} dot={{ r: 3, fill: WHITE }} name="Measured" />
              {activeTarget && activeTarget.target_value != null && (
                <ReferenceLine y={Number(activeTarget.target_value)} stroke={GREEN} strokeDasharray="5 5" label={{ value: "Target", fill: GREEN, fontSize: 10, position: "right" }} />
              )}
              {activeTarget && activeTarget.alert_threshold != null && (
                <ReferenceLine y={Number(activeTarget.alert_threshold)} stroke={AMBER} strokeDasharray="3 3" label={{ value: "Threshold", fill: AMBER, fontSize: 10, position: "right" }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Current Target & Manual Entry */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Target */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Target</span>
            {isAdmin && <Btn small onClick={() => setShowTargetForm(!showTargetForm)}>{showTargetForm ? "Cancel" : activeTarget ? "Update" : "+ Set Target"}</Btn>}
          </div>
          {activeTarget && !showTargetForm && (
            <div>
              <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                <div><div style={{ fontSize: 10, color: MUTED }}>Type</div><div style={{ fontSize: 13, color: WHITE }}>{activeTarget.target_type}</div></div>
                <div><div style={{ fontSize: 10, color: MUTED }}>Value</div><div style={{ fontSize: 13, color: GREEN }}>{Number(activeTarget.target_value).toFixed(1)}</div></div>
                {activeTarget.alert_threshold != null && <div><div style={{ fontSize: 10, color: MUTED }}>Alert At</div><div style={{ fontSize: 13, color: AMBER }}>{Number(activeTarget.alert_threshold).toFixed(1)}</div></div>}
              </div>
              <div style={{ fontSize: 10, color: MUTED }}>Effective: {new Date(activeTarget.effective_date).toLocaleDateString()}{activeTarget.end_date ? ` — ${new Date(activeTarget.end_date).toLocaleDateString()}` : ""}</div>
              {activeTarget.notes && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{activeTarget.notes}</div>}
            </div>
          )}
          {!activeTarget && !showTargetForm && <div style={{ fontSize: 12, color: MUTED }}>No target set.</div>}
          {showTargetForm && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Target Type</label>
              <select value={targetForm.target_type} onChange={e => setTargetForm(f => ({ ...f, target_type: e.target.value }))} style={{ ...inp, marginBottom: 8 }}>
                {TARGET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Target Value</label>
                  <input type="number" value={targetForm.target_value} onChange={e => setTargetForm(f => ({ ...f, target_value: e.target.value }))} style={inp} placeholder="e.g. 90" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Alert Threshold</label>
                  <input type="number" value={targetForm.alert_threshold} onChange={e => setTargetForm(f => ({ ...f, alert_threshold: e.target.value }))} style={inp} placeholder="e.g. 80" />
                </div>
              </div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Effective Date</label>
              <input type="date" value={targetForm.effective_date} onChange={e => setTargetForm(f => ({ ...f, effective_date: e.target.value }))} style={{ ...inp, marginBottom: 8 }} />
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Notes</label>
              <input value={targetForm.notes} onChange={e => setTargetForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, marginBottom: 8 }} placeholder="Optional notes..." />
              <Btn small primary disabled={!targetForm.target_value} onClick={async () => {
                if (activeTarget) {
                  await onUpdateTarget(activeTarget.id, { end_date: new Date().toISOString().split("T")[0] });
                }
                await onCreateTarget({
                  spi_id: spi.id,
                  target_type: targetForm.target_type,
                  target_value: Number(targetForm.target_value),
                  alert_threshold: targetForm.alert_threshold ? Number(targetForm.alert_threshold) : null,
                  effective_date: targetForm.effective_date,
                  notes: targetForm.notes || null,
                });
                setShowTargetForm(false);
                setTargetForm({ target_type: "maximum", target_value: "", alert_threshold: "", effective_date: new Date().toISOString().split("T")[0], notes: "" });
                await load();
              }}>Save Target</Btn>
            </div>
          )}
        </div>

        {/* Manual entry */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Manual Entry</span>
            {isAdmin && <Btn small onClick={() => setShowManualEntry(!showManualEntry)}>{showManualEntry ? "Cancel" : "+ Add"}</Btn>}
          </div>
          {!showManualEntry && <div style={{ fontSize: 12, color: MUTED }}>Add manual measurements for custom indicators or override auto-calculated values.</div>}
          {showManualEntry && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Period Start</label>
                  <input type="date" value={manualForm.period_start} onChange={e => setManualForm(f => ({ ...f, period_start: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Period End</label>
                  <input type="date" value={manualForm.period_end} onChange={e => setManualForm(f => ({ ...f, period_end: e.target.value }))} style={inp} />
                </div>
              </div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Measured Value</label>
              <input type="number" value={manualForm.measured_value} onChange={e => setManualForm(f => ({ ...f, measured_value: e.target.value }))} style={{ ...inp, marginBottom: 8 }} placeholder="e.g. 87.5" />
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Notes</label>
              <input value={manualForm.notes} onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, marginBottom: 8 }} placeholder="Optional notes..." />
              <Btn small primary disabled={!manualForm.period_start || !manualForm.period_end || !manualForm.measured_value} onClick={async () => {
                await onCreateMeasurement({
                  spi_id: spi.id,
                  period_start: manualForm.period_start,
                  period_end: manualForm.period_end,
                  measured_value: Number(manualForm.measured_value),
                  target_value: activeTarget?.target_value ?? null,
                  auto_calculated: false,
                  notes: manualForm.notes || null,
                });
                setShowManualEntry(false);
                setManualForm({ period_start: "", period_end: "", measured_value: "", notes: "" });
                await load();
              }}>Save Measurement</Btn>
            </div>
          )}
        </div>
      </div>

      {/* Measurement history table */}
      <div style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 12 }}>Measurement History</div>
        {measurements.length === 0 && <div style={{ fontSize: 12, color: MUTED }}>No measurements yet. Run the daily calculation or add a manual entry.</div>}
        {measurements.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Period</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Value</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Target</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Status</th>
                  <th style={{ textAlign: "center", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Source</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().map(m => (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "8px 10px", color: OFF_WHITE }}>{new Date(m.period_start).toLocaleDateString()} – {new Date(m.period_end).toLocaleDateString()}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: WHITE, fontWeight: 600 }}>{Number(m.measured_value).toFixed(1)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: MUTED }}>{m.target_value != null ? Number(m.target_value).toFixed(1) : "—"}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}><Badge label={statusLabel(m.status)} color={statusColor(m.status)} /></td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: MUTED }}>{m.auto_calculated ? "Auto" : "Manual"}</td>
                    <td style={{ padding: "8px 10px", color: MUTED }}>{m.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SPI EDITOR
// ════════════════════════════════════════════════════════════════
function SpiEditor({ existing, isAdmin, onBack, onSave }) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    description: existing?.description || "",
    category: existing?.category || "reactive",
    data_source: existing?.data_source || "frats",
    calculation_method: existing?.calculation_method || "count",
    formula_config: existing?.formula_config || {},
    unit: existing?.unit || "",
    measurement_period: existing?.measurement_period || "monthly",
    is_active: existing?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>← Back</button>
      <div style={{ ...card, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 16 }}>{existing ? "Edit Indicator" : "Create New Indicator"}</div>

        <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Name</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. FRAT Completion Rate" style={{ ...inp, marginBottom: 12 }} />

        <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Description</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What does this indicator measure?" maxLength={10000} style={{ ...inp, marginBottom: 12, resize: "vertical" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
              {SPI_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Data Source</label>
            <select value={form.data_source} onChange={e => setForm(f => ({ ...f, data_source: e.target.value }))} style={inp}>
              {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Calculation Method</label>
            <select value={form.calculation_method} onChange={e => setForm(f => ({ ...f, calculation_method: e.target.value }))} style={inp}>
              {CALC_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Measurement Period</label>
            <select value={form.measurement_period} onChange={e => setForm(f => ({ ...f, measurement_period: e.target.value }))} style={inp}>
              {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Unit</label>
            <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder='e.g. %, count, days, per 100 hrs' style={inp} />
          </div>
          <div style={{ display: "flex", alignItems: "center", paddingTop: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: OFF_WHITE, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active
            </label>
          </div>
        </div>

        {/* Formula config */}
        {form.calculation_method === "rate" && (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Rate Formula Config</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: MUTED }}>Numerator</label>
                <input value={form.formula_config.numerator || ""} onChange={e => setForm(f => ({ ...f, formula_config: { ...f.formula_config, numerator: e.target.value } }))} style={inp} placeholder="e.g. safety_reports" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: MUTED }}>Denominator</label>
                <input value={form.formula_config.denominator || ""} onChange={e => setForm(f => ({ ...f, formula_config: { ...f.formula_config, denominator: e.target.value } }))} style={inp} placeholder="e.g. flight_hours" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: MUTED }}>Multiplier</label>
                <input type="number" value={form.formula_config.multiplier || ""} onChange={e => setForm(f => ({ ...f, formula_config: { ...f.formula_config, multiplier: Number(e.target.value) } }))} style={inp} placeholder="e.g. 100" />
              </div>
            </div>
          </div>
        )}

        {(form.calculation_method === "percentage" || form.calculation_method === "count") && form.data_source === "frats" && (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Formula Config</div>
            <label style={{ fontSize: 10, color: MUTED }}>Numerator filter</label>
            <select value={form.formula_config.numerator || ""} onChange={e => setForm(f => ({ ...f, formula_config: { ...f.formula_config, numerator: e.target.value } }))} style={inp}>
              <option value="">All FRATs</option>
              <option value="frat_submissions">FRAT submissions count</option>
              <option value="high_critical">High/Critical scoring FRATs</option>
            </select>
          </div>
        )}

        {form.calculation_method === "count" && form.data_source === "corrective_actions" && (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Formula Config</div>
            <label style={{ fontSize: 10, color: MUTED }}>Count filter</label>
            <select value={form.formula_config.numerator || ""} onChange={e => setForm(f => ({ ...f, formula_config: { ...f.formula_config, numerator: e.target.value } }))} style={inp}>
              <option value="">All corrective actions in period</option>
              <option value="overdue">Currently overdue only</option>
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn primary disabled={!form.name.trim() || saving} onClick={async () => {
            setSaving(true);
            await onSave(form);
            setSaving(false);
          }}>{saving ? "Saving..." : existing ? "Update Indicator" : "Create Indicator"}</Btn>
          <Btn onClick={onBack}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CSV EXPORT
// ════════════════════════════════════════════════════════════════
function exportSpiCsv(spis) {
  if (!spis || spis.length === 0) return;
  const lines = [
    ["Name", "Category", "Current Value", "Unit", "Target", "Status", "Last Period", "Measurement Period"].join(","),
  ];
  for (const spi of spis) {
    const val = spi.latestValue !== null ? spi.latestValue.toFixed(2) : "";
    const target = spi.latest?.target_value != null ? Number(spi.latest.target_value).toFixed(2) : "";
    const status = statusLabel(spi.latestStatus);
    const period = spi.latest ? `${spi.latest.period_start} to ${spi.latest.period_end}` : "";
    lines.push([
      `"${spi.name}"`,
      spi.category,
      val,
      spi.unit || "",
      target,
      status,
      period,
      spi.measurement_period,
    ].join(","));
  }
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SPI_Report_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export defaults for init handler
export { DEFAULT_SPIS };
