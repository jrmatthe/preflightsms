import { useState, useEffect, useCallback, useMemo } from "react";
import { hasFeature } from "../lib/tiers";

const BLACK = "#000000", DARK = "#0A0A0A", NEAR_BLACK = "#111111", CARD = "#141414";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", SUBTLE = "#555555";
const BORDER = "#232323", LIGHT_BORDER = "#333333";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };

const REPORT_TYPES = [
  { id: "hazard", label: "Hazard", color: YELLOW, desc: "A condition that could lead to an unsafe event" },
  { id: "incident", label: "Incident", color: RED, desc: "An event that resulted in damage or injury" },
  { id: "near_miss", label: "Near Miss", color: "#F97316", desc: "An event that almost resulted in an incident" },
  { id: "concern", label: "Safety Concern", color: CYAN, desc: "A general safety observation or suggestion" },
];

const CATEGORIES = [
  "weather", "mechanical", "human_factors", "procedures", "training",
  "fatigue", "communication", "ground_ops", "airspace", "wildlife",
  "maintenance", "cabin_safety", "security", "other"
];

const SEVERITIES = [
  { id: "negligible", label: "Negligible", color: "#6B7280" },
  { id: "low", label: "Low", color: GREEN },
  { id: "medium", label: "Medium", color: YELLOW },
  { id: "high", label: "High", color: "#F97316" },
  { id: "critical", label: "Critical", color: RED },
];

const FLIGHT_PHASES = [
  "", "preflight", "taxi", "takeoff", "climb", "cruise", "descent",
  "approach", "landing", "post_flight", "ground_ops", "maintenance"
];

const STATUSES = [
  { id: "open", label: "Open", color: CYAN },
  { id: "under_review", label: "Under Review", color: YELLOW },
  { id: "investigation", label: "Investigation", color: "#F97316" },
  { id: "corrective_action", label: "Corrective Action", color: "#A78BFA" },
  { id: "closed", label: "Closed", color: MUTED },
];

function generateReportCode() {
  return `RPT-${Date.now().toString(36).toUpperCase()}`;
}

function ReportForm({ onSubmit, onCancel, fleetAircraft, initialData, onAiCategorize }) {
  const [form, setForm] = useState({
    reportType: "hazard", title: "", description: "",
    dateOccurred: initialData?.dateOccurred || "",
    location: initialData?.location || "",
    category: "other", severity: "low",
    flightPhase: initialData?.flightPhase || "",
    tailNumber: initialData?.tailNumber || "",
    aircraftType: initialData?.aircraftType || "",
    confidential: false, anonymous: false,
  });
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (!form.description.trim()) return;
    const tailNumber = form.tailNumber === "__other" ? (form.tailNumberCustom || "") : form.tailNumber;
    onSubmit({
      ...form, tailNumber, reportCode: generateReportCode(),
      aiSuggestedCategory: aiSuggestion?.category || null,
      aiSuggestedSeverity: aiSuggestion?.severity || null,
    });
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Submit Safety Report</div>
          <div style={{ fontSize: 11, color: MUTED }}>All reports contribute to organizational safety. Be specific and factual.</div>
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
      </div>

      {/* Report Type */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Report Type</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {REPORT_TYPES.map(t => (
            <button key={t.id} onClick={() => set("reportType", t.id)}
              style={{ ...card, padding: "10px 14px", cursor: "pointer", textAlign: "left",
                border: `1px solid ${form.reportType === t.id ? t.color : BORDER}`,
                background: form.reportType === t.id ? `${t.color}11` : CARD }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: form.reportType === t.id ? t.color : OFF_WHITE }}>{t.label}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Brief summary of the hazard or event" style={inp} />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Description *</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)}
          placeholder="What happened? What were the conditions? What was the outcome or potential outcome?"
          rows={5} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
      </div>

      {/* AI Suggest Button */}
      {onAiCategorize && form.title.trim() && form.description.trim() && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={async () => {
            setAiLoading(true);
            try {
              const result = await onAiCategorize({ title: form.title, description: form.description, location: form.location, tailNumber: form.tailNumber });
              if (result) {
                setAiSuggestion(result);
                if (result.category && CATEGORIES.includes(result.category)) set("category", result.category);
                if (result.severity && SEVERITIES.find(s => s.id === result.severity)) set("severity", result.severity);
                if (result.flight_phase && FLIGHT_PHASES.includes(result.flight_phase)) set("flightPhase", result.flight_phase);
              }
            } catch { /* handled by parent */ }
            setAiLoading(false);
          }} disabled={aiLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: aiLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: aiLoading ? 0.6 : 1 }}>
            <span style={{ fontSize: 14 }}>🤖</span> {aiLoading ? "Analyzing..." : "AI Suggest Category & Severity"}
          </button>
          {aiSuggestion?.triage_summary && (
            <div style={{ marginTop: 8, padding: "10px 14px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: CYAN, marginBottom: 4 }}>AI Triage Summary</div>
              <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>{aiSuggestion.triage_summary}</div>
            </div>
          )}
        </div>
      )}

      {/* 3-column grid: Date, Location, Category */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Date Occurred</label>
          <input type="date" value={form.dateOccurred} onChange={e => set("dateOccurred", e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Location</label>
          <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="KSFF ramp, enroute, etc." style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Category {aiSuggestion?.category === form.category && <span style={{ color: CYAN, fontSize: 9, fontWeight: 600 }}>AI suggested</span>}</label>
          <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
        </div>
      </div>

      {/* Severity + Flight Phase + Aircraft */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Severity {aiSuggestion?.severity === form.severity && <span style={{ color: CYAN, fontSize: 9, fontWeight: 600 }}>AI suggested</span>}</label>
          <select value={form.severity} onChange={e => set("severity", e.target.value)} style={inp}>
            {SEVERITIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Flight Phase {aiSuggestion?.flight_phase === form.flightPhase && form.flightPhase && <span style={{ color: CYAN, fontSize: 9, fontWeight: 600 }}>AI suggested</span>}</label>
          <select value={form.flightPhase} onChange={e => set("flightPhase", e.target.value)} style={inp}>
            <option value="">N/A</option>
            {FLIGHT_PHASES.filter(p => p).map(p => <option key={p} value={p}>{p.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Aircraft / Tail #</label>
          {fleetAircraft?.length ? (
            <select value={form.tailNumber} onChange={e => set("tailNumber", e.target.value)} style={inp}>
              <option value="">Select aircraft</option>
              {fleetAircraft.map(a => <option key={a.id} value={a.registration}>{a.registration}{a.type ? ` — ${a.type}` : ""}</option>)}
              <option value="__other">Other</option>
            </select>
          ) : (
            <input value={form.tailNumber} onChange={e => set("tailNumber", e.target.value)} placeholder="N12345" style={inp} />
          )}
          {form.tailNumber === "__other" && (
            <input value={form.tailNumberCustom || ""} onChange={e => set("tailNumberCustom", e.target.value)} placeholder="N12345" style={{ ...inp, marginTop: 6 }} />
          )}
        </div>
      </div>

      {/* Confidentiality options */}
      <div style={{ ...card, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>Reporting Options</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
          <input type="checkbox" checked={form.confidential} onChange={e => { set("confidential", e.target.checked); if (e.target.checked) set("anonymous", false); }} />
          <div>
            <div style={{ fontSize: 12, color: OFF_WHITE }}>Confidential</div>
            <div style={{ fontSize: 10, color: MUTED }}>Your name is visible only to administrators</div>
          </div>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={form.anonymous} onChange={e => { set("anonymous", e.target.checked); if (e.target.checked) set("confidential", false); }} />
          <div>
            <div style={{ fontSize: 12, color: OFF_WHITE }}>Anonymous</div>
            <div style={{ fontSize: 10, color: MUTED }}>Your name is not recorded with this report</div>
          </div>
        </label>
      </div>

      <button onClick={handleSubmit} disabled={!form.title.trim() || !form.description.trim()}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: (!form.title.trim() || !form.description.trim()) ? 0.4 : 1 }}>
        Submit Report
      </button>
    </div>
  );
}

function ReportCard({ report, onStatusChange, onCreateHazard, linkedHazard, orgProfiles }) {
  const type = REPORT_TYPES.find(t => t.id === report.report_type) || REPORT_TYPES[0];
  const severity = SEVERITIES.find(s => s.id === report.severity) || SEVERITIES[1];
  const status = STATUSES.find(s => s.id === report.status) || STATUSES[0];
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ ...card, padding: "14px 18px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width: 4, height: 40, borderRadius: 2, background: type.color, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{report.title}</span>
            <span style={{ background: `${type.color}22`, color: type.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${type.color}44` }}>{type.label}</span>
            <span style={{ background: `${severity.color}22`, color: severity.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${severity.color}44` }}>{severity.label}</span>
            <span style={{ background: `${status.color}22`, color: status.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${status.color}44` }}>{status.label}</span>
          </div>
          <div style={{ color: MUTED, fontSize: 10 }}>
            {report.category.replace(/_/g, " ")} · {new Date(report.created_at).toLocaleDateString()}
            {report.location && ` · ${report.location}`}
            {report.anonymous ? " · Anonymous" : (() => { const rp = orgProfiles?.find(p => p.id === report.reporter_id); return rp?.full_name ? ` · ${rp.full_name}` : ""; })()}
            {report.confidential && " · Confidential"}
          </div>
        </div>
        <span style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>{expanded ? "\u25B2" : "\u25BC"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 12 }}>{report.description}</div>
          
          {report.tail_number && <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Aircraft: {report.tail_number} {report.aircraft_type}</div>}
          {report.flight_phase && <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Phase: {report.flight_phase.replace(/_/g, " ")}</div>}
          {report.date_occurred && <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Date occurred: {report.date_occurred}</div>}
          {report.investigation_notes && (
            <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)", marginBottom: 8, marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#A78BFA", marginBottom: 2 }}>Action Being Taken</div>
              <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.5 }}>{report.investigation_notes}</div>
            </div>
          )}
          {report.root_cause && <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Root cause: {report.root_cause}</div>}

          {onStatusChange && (
            <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
              {STATUSES.map(s => (
                <button key={s.id} onClick={() => {
                  if (s.id === report.status) return;
                  if (!confirm("This will notify the report submitter of the status change. Continue?")) return;
                  onStatusChange(report.id, s.id);
                }}
                  style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: report.status === s.id ? `${s.color}33` : "transparent",
                    color: report.status === s.id ? s.color : MUTED,
                    border: `1px solid ${report.status === s.id ? s.color : BORDER}` }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Linked hazard or create button */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            {linkedHazard ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: `${CYAN}11`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
                <span style={{ fontSize: 10, color: CYAN, fontWeight: 700 }}>△</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>Linked to {linkedHazard.hazard_code}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{linkedHazard.title}</div>
                </div>
                <span style={{ fontSize: 9, color: CYAN, background: `${CYAN}22`, padding: "2px 8px", borderRadius: 8 }}>{linkedHazard.status}</span>
              </div>
            ) : onCreateHazard && (
              <button onClick={() => {
                if (!confirm("This will open an investigation and notify the report submitter. Continue?")) return;
                onCreateHazard(report);
              }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 14 }}>△</span> Open Investigation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SafetyReporting({ profile, session, onSubmitReport, reports, onStatusChange, hazards, onCreateHazardFromReport, fleetAircraft, orgProfiles, reportPrefill, onClearPrefill, org, onAiSearch, onAiCategorize }) {
  const [view, setView] = useState("list"); // list | new
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showCount, setShowCount] = useState(25);

  const [aiQuery, setAiQuery] = useState("");
  const [aiFilters, setAiFilters] = useState(null);
  const [aiInterpretation, setAiInterpretation] = useState("");
  const [aiSearchLoading, setAiSearchLoading] = useState(false);

  useEffect(() => { setShowCount(25); }, [filter, search, sortBy]);
  useEffect(() => { if (reportPrefill) setView("new"); }, [reportPrefill]);

  const canManage = ["admin","safety_manager","accountable_exec","chief_pilot"].includes(profile?.role);

  // Build map of report_id -> linked hazard
  const linkedHazards = useMemo(() => {
    const map = {};
    if (hazards) hazards.forEach(h => { if (h.related_report_id) map[h.related_report_id] = h; });
    return map;
  }, [hazards]);

  const filtered = useMemo(() => {
    let list = reports.filter(r => {
      if (filter !== "all" && filter !== r.status) return false;
      if (search && !`${r.title} ${r.description} ${r.location} ${r.category}`.toLowerCase().includes(search.toLowerCase())) return false;
      // Apply AI filters
      if (aiFilters) {
        if (aiFilters.category && r.category !== aiFilters.category) return false;
        if (aiFilters.severity && r.severity !== aiFilters.severity) return false;
        if (aiFilters.status && r.status !== aiFilters.status) return false;
        if (aiFilters.keyword && !`${r.title} ${r.description} ${r.location}`.toLowerCase().includes(aiFilters.keyword.toLowerCase())) return false;
        if (aiFilters.airport && !`${r.location} ${r.description}`.toLowerCase().includes(aiFilters.airport.toLowerCase())) return false;
        if (aiFilters.flight_phase && r.flight_phase !== aiFilters.flight_phase) return false;
        if (aiFilters.date_range) {
          const created = new Date(r.created_at);
          if (aiFilters.date_range.start && created < new Date(aiFilters.date_range.start)) return false;
          if (aiFilters.date_range.end && created > new Date(aiFilters.date_range.end)) return false;
        }
      }
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return list;
  }, [reports, filter, search, sortBy, aiFilters]);

  const counts = useMemo(() => {
    const c = { all: reports.length, open: 0, under_review: 0, investigation: 0, corrective_action: 0, closed: 0 };
    reports.forEach(r => {
      if (c[r.status] !== undefined) c[r.status]++;
    });
    return c;
  }, [reports]);

  if (view === "new") {
    return <ReportForm onSubmit={(report) => { onSubmitReport(report); setView("list"); if (onClearPrefill) onClearPrefill(); }} onCancel={() => { setView("list"); if (onClearPrefill) onClearPrefill(); }} fleetAircraft={fleetAircraft} initialData={reportPrefill} onAiCategorize={onAiCategorize} />;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Safety Reports</div>
          <div style={{ fontSize: 11, color: MUTED }}>14 CFR §5.71 — Safety Assurance: Internal reporting of hazards and incidents</div>
        </div>
        <button data-tour="tour-reports-new-btn" onClick={() => setView("new")}
          style={{ padding: "8px 16px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          + New Report
        </button>
      </div>

      {/* Stats */}
      <div data-tour="tour-reports-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
        {[
          { label: "Total Reports", value: counts.all },
          { label: "Open", value: counts.open },
          { label: "Under Review", value: counts.under_review + counts.investigation },
          { label: "Closed", value: counts.closed },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Search */}
      {onAiSearch && hasFeature(org, "safety_trend_alerts") && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: CYAN, fontSize: 16 }}>🤖</span>
            <input
              placeholder="Search with AI — e.g. 'bird strikes during takeoff last 6 months'"
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && aiQuery.trim() && !aiSearchLoading) {
                  setAiSearchLoading(true);
                  try {
                    const result = await onAiSearch(aiQuery.trim());
                    if (result?.filters) { setAiFilters(result.filters); setAiInterpretation(result.interpreted_as || ""); }
                  } catch { /* handled by parent */ }
                  setAiSearchLoading(false);
                }
              }}
              disabled={aiSearchLoading}
              style={{ ...inp, flex: 1, fontSize: 13, borderColor: `${CYAN}44`, background: `${CYAN}06` }}
            />
          </div>
          {aiSearchLoading && <div style={{ fontSize: 10, color: CYAN, marginTop: 4 }}>Searching...</div>}
          {aiFilters && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              {aiInterpretation && <span style={{ fontSize: 10, color: MUTED, marginRight: 4 }}>Searched for:</span>}
              {Object.entries(aiFilters).filter(([, v]) => v && (typeof v !== "object" || Object.keys(v).length > 0)).map(([key, val]) => (
                <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: `${CYAN}15`, border: `1px solid ${CYAN}33`, borderRadius: 12, fontSize: 10, color: CYAN }}>
                  <span style={{ color: MUTED }}>{key}:</span> {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  <button onClick={() => { const next = { ...aiFilters }; delete next[key]; setAiFilters(Object.keys(next).length > 0 ? next : null); }}
                    style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 10, padding: 0, fontFamily: "inherit" }}>×</button>
                </span>
              ))}
              <button onClick={() => { setAiFilters(null); setAiInterpretation(""); setAiQuery(""); }}
                style={{ background: "none", border: "none", color: MUTED, fontSize: 10, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, flex: 1, minWidth: 180, fontSize: 13 }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, width: "auto", maxWidth: 180, padding: "5px 10px", fontSize: 12 }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "open", "under_review", "investigation", "closed"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${filter === f ? WHITE : BORDER}`,
              background: filter === f ? WHITE : CARD, color: filter === f ? BLACK : MUTED,
              fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
            {(f === "all" ? "All" : f.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())) + ` (${counts[f] || 0})`}
          </button>
        ))}
      </div>

      {/* Report list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: MUTED }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 16, opacity: 0.5 }}>
            <rect x="10" y="4" width="28" height="40" rx="3" stroke={MUTED} strokeWidth="2" fill="none" />
            <path d="M18 8h12v4H18z" fill={MUTED} opacity="0.3" />
            <line x1="16" y1="18" x2="32" y2="18" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="24" x2="28" y2="24" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="30" x2="30" y2="30" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="36" x2="24" y2="36" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: OFF_WHITE, marginBottom: 6 }}>No safety reports yet</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 420, margin: "0 auto", marginBottom: 20 }}>
            Filing reports helps your organization identify and address hazards before they become incidents. Every report strengthens your safety culture.
          </div>
          <button onClick={() => setView("new")}
            style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            File Your First Report
          </button>
        </div>
      ) : (<>
        {filtered.slice(0, showCount).map(r => (
          <ReportCard key={r.id} report={r} onStatusChange={canManage ? onStatusChange : null}
            linkedHazard={canManage ? linkedHazards[r.id] : null}
            onCreateHazard={canManage && onCreateHazardFromReport ? (report) => onCreateHazardFromReport(report) : null}
            orgProfiles={orgProfiles} />
        ))}
        {filtered.length > showCount && (
          <button onClick={() => setShowCount(c => c + 25)}
            style={{ width: "100%", padding: "12px 0", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>
            Showing {showCount} of {filtered.length} — Show 25 more
          </button>
        )}
      </>)}
    </div>
  );
}
