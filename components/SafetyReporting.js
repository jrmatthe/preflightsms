import { useState, useEffect, useCallback, useMemo } from "react";

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

function ReportForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    reportType: "hazard", title: "", description: "", dateOccurred: "",
    location: "", category: "other", severity: "low", flightPhase: "",
    tailNumber: "", aircraftType: "", confidential: false, anonymous: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    if (!form.description.trim()) return;
    onSubmit({ ...form, reportCode: generateReportCode() });
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
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
        </div>
      </div>

      {/* Severity + Flight Phase + Aircraft */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Severity</label>
          <select value={form.severity} onChange={e => set("severity", e.target.value)} style={inp}>
            {SEVERITIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Flight Phase</label>
          <select value={form.flightPhase} onChange={e => set("flightPhase", e.target.value)} style={inp}>
            <option value="">N/A</option>
            {FLIGHT_PHASES.filter(p => p).map(p => <option key={p} value={p}>{p.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Aircraft / Tail #</label>
          <input value={form.tailNumber} onChange={e => set("tailNumber", e.target.value)} placeholder="N12345" style={inp} />
        </div>
      </div>

      {/* Confidentiality options */}
      <div style={{ ...card, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>Reporting Options</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
          <input type="checkbox" checked={form.confidential} onChange={e => { set("confidential", e.target.checked); if (e.target.checked) set("anonymous", false); }} />
          <div>
            <div style={{ fontSize: 12, color: OFF_WHITE }}>Confidential</div>
            <div style={{ fontSize: 10, color: MUTED }}>Your name is visible only to the safety manager</div>
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

function ReportCard({ report, onStatusChange }) {
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
            {report.report_code} · {report.category.replace(/_/g, " ")} · {new Date(report.created_at).toLocaleDateString()}
            {report.location && ` · ${report.location}`}
            {report.anonymous && " · Anonymous"}
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
          {report.investigation_notes && <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Investigation notes: {report.investigation_notes}</div>}
          {report.root_cause && <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Root cause: {report.root_cause}</div>}

          {onStatusChange && (
            <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
              {STATUSES.map(s => (
                <button key={s.id} onClick={() => onStatusChange(report.id, s.id)}
                  style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: report.status === s.id ? `${s.color}33` : "transparent",
                    color: report.status === s.id ? s.color : MUTED,
                    border: `1px solid ${report.status === s.id ? s.color : BORDER}` }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SafetyReporting({ profile, session, onSubmitReport, reports, onStatusChange }) {
  const [view, setView] = useState("list"); // list | new
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (filter !== "all" && filter !== r.status && filter !== r.report_type) return false;
      if (search && !`${r.title} ${r.description} ${r.report_code} ${r.location} ${r.category}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [reports, filter, search]);

  const counts = useMemo(() => {
    const c = { total: reports.length, open: 0, under_review: 0, investigation: 0, closed: 0 };
    reports.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [reports]);

  if (view === "new") {
    return <ReportForm onSubmit={(report) => { onSubmitReport(report); setView("list"); }} onCancel={() => setView("list")} />;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Safety Reports</div>
          <div style={{ fontSize: 11, color: MUTED }}>14 CFR §5.71 — Safety Assurance: Internal reporting of hazards and incidents</div>
        </div>
        <button onClick={() => setView("new")}
          style={{ padding: "8px 16px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          + New Report
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
        {[
          { label: "Total Reports", value: counts.total, color: WHITE },
          { label: "Open", value: counts.open, color: CYAN },
          { label: "Under Review", value: counts.under_review + counts.investigation, color: YELLOW },
          { label: "Closed", value: counts.closed, color: GREEN },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "Georgia,serif" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, flex: 1, minWidth: 180, fontSize: 13 }} />
        {["all", "open", "under_review", "investigation", "closed", "hazard", "incident", "near_miss"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${filter === f ? WHITE : BORDER}`,
              background: filter === f ? WHITE : CARD, color: filter === f ? BLACK : MUTED,
              fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
            {f === "all" ? "All" : f.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Report list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14 }}>No safety reports yet</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Submit a report to start building your safety data.</div>
        </div>
      ) : filtered.map(r => (
        <ReportCard key={r.id} report={r} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}
