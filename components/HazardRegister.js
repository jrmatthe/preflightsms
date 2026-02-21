import { useState, useMemo } from "react";

const BLACK = "#000000", DARK = "#0A0A0A", NEAR_BLACK = "#111111", CARD = "#141414";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };

const LIKELIHOOD_LABELS = ["", "Improbable", "Remote", "Occasional", "Probable", "Frequent"];
const SEVERITY_LABELS = ["", "Negligible", "Minor", "Major", "Hazardous", "Catastrophic"];

function riskColor(score) {
  if (score <= 4) return GREEN;
  if (score <= 9) return YELLOW;
  if (score <= 16) return "#F97316";
  return RED;
}

function riskLabel(score) {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

const HAZARD_STATUSES = [
  { id: "identified", label: "Identified", color: CYAN },
  { id: "active", label: "Active", color: "#F97316" },
  { id: "mitigated", label: "Mitigated", color: YELLOW },
  { id: "monitoring", label: "Monitoring", color: "#A78BFA" },
  { id: "accepted", label: "Accepted", color: GREEN },
  { id: "closed", label: "Closed", color: MUTED },
];

function RiskMatrix({ likelihood, severity, onChange, label }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "80px repeat(5, 1fr)", gap: 2 }}>
        {/* Header row */}
        <div />
        {[1,2,3,4,5].map(s => (
          <div key={s} style={{ textAlign: "center", fontSize: 8, color: MUTED, padding: "4px 0" }}>
            {SEVERITY_LABELS[s]}
          </div>
        ))}
        {/* Matrix rows */}
        {[5,4,3,2,1].map(l => (
          [
            <div key={`l${l}`} style={{ fontSize: 8, color: MUTED, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
              {LIKELIHOOD_LABELS[l]}
            </div>,
            ...[1,2,3,4,5].map(s => {
              const score = l * s;
              const selected = likelihood === l && severity === s;
              return (
                <button key={`${l}-${s}`} onClick={() => onChange(l, s)}
                  style={{
                    width: "100%", aspectRatio: "1", border: selected ? `2px solid ${WHITE}` : `1px solid ${BORDER}`,
                    borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700,
                    background: `${riskColor(score)}${selected ? "88" : "22"}`,
                    color: selected ? WHITE : `${riskColor(score)}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {score}
                </button>
              );
            })
          ]
        )).flat()}
      </div>
      {likelihood && severity && (
        <div style={{ marginTop: 6, textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: riskColor(likelihood * severity) }}>
            {riskLabel(likelihood * severity)} Risk ({likelihood * severity})
          </span>
          <span style={{ fontSize: 10, color: MUTED }}> — {LIKELIHOOD_LABELS[likelihood]} likelihood, {SEVERITY_LABELS[severity]} severity</span>
        </div>
      )}
    </div>
  );
}

function HazardForm({ onSubmit, onCancel, existingCount, fromReport }) {
  const [form, setForm] = useState({
    title: fromReport ? fromReport.title : "",
    description: fromReport ? `Source report: ${fromReport.report_code}\n\n${fromReport.description}` : "",
    source: fromReport ? "safety_report" : "",
    category: fromReport ? fromReport.category : "other",
    initialLikelihood: 0, initialSeverity: 0,
    mitigations: "",
    residualLikelihood: 0, residualSeverity: 0,
    responsiblePerson: "", reviewDate: "", status: "identified",
    relatedReportId: fromReport?.id || null,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.title.trim() || !form.initialLikelihood || !form.initialSeverity) return;
    onSubmit({ ...form, hazardCode: `HAZ-${String(existingCount + 1).padStart(3, "0")}` });
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Register New Hazard</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.51 — Hazard identification and risk analysis</div>
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
      </div>

      {fromReport && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 16, background: `${CYAN}11`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
          <span style={{ color: CYAN, fontSize: 12 }}>⚠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>Creating from report {fromReport.report_code}</div>
            <div style={{ fontSize: 10, color: MUTED }}>{fromReport.title}</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Hazard Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Icing conditions on KSFF-KBOI route during winter" style={inp} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Description *</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)}
          placeholder="Describe the hazard, contributing factors, and potential consequences"
          rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Source</label>
          <select value={form.source} onChange={e => set("source", e.target.value)} style={inp}>
            <option value="">Select...</option>
            <option value="safety_report">Safety Report</option>
            <option value="frat_trend">FRAT Trend</option>
            <option value="audit">Audit Finding</option>
            <option value="pilot_debrief">Pilot Debrief</option>
            <option value="faa_notification">FAA Notification</option>
            <option value="industry_alert">Industry Alert</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
            {["weather", "mechanical", "human_factors", "procedures", "training", "fatigue", "communication", "ground_ops", "airspace", "maintenance", "other"].map(c =>
              <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
            )}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Responsible Person</label>
          <input value={form.responsiblePerson} onChange={e => set("responsiblePerson", e.target.value)} placeholder="Name" style={inp} />
        </div>
      </div>

      {/* Initial Risk Assessment */}
      <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
        <RiskMatrix
          likelihood={form.initialLikelihood} severity={form.initialSeverity}
          onChange={(l, s) => { set("initialLikelihood", l); set("initialSeverity", s); }}
          label="Initial Risk Assessment (before mitigations)"
        />
      </div>

      {/* Mitigations */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Mitigations / Controls</label>
        <textarea value={form.mitigations} onChange={e => set("mitigations", e.target.value)}
          placeholder="What controls are in place or planned to reduce this risk?"
          rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
      </div>

      {/* Residual Risk Assessment */}
      {form.mitigations.trim() && (
        <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
          <RiskMatrix
            likelihood={form.residualLikelihood} severity={form.residualSeverity}
            onChange={(l, s) => { set("residualLikelihood", l); set("residualSeverity", s); }}
            label="Residual Risk (after mitigations)"
          />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Next Review Date</label>
          <input type="date" value={form.reviewDate} onChange={e => set("reviewDate", e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Status</label>
          <select value={form.status} onChange={e => set("status", e.target.value)} style={inp}>
            {HAZARD_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <button onClick={handleSubmit} disabled={!form.title.trim() || !form.initialLikelihood || !form.initialSeverity}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: (!form.title.trim() || !form.initialLikelihood || !form.initialSeverity) ? 0.4 : 1 }}>
        Register Hazard
      </button>
    </div>
  );
}

function HazardCard({ hazard, linkedReport }) {
  const status = HAZARD_STATUSES.find(s => s.id === hazard.status) || HAZARD_STATUSES[0];
  const initScore = hazard.initial_risk_score || (hazard.initial_likelihood * hazard.initial_severity);
  const resScore = hazard.residual_risk_score || (hazard.residual_likelihood && hazard.residual_severity ? hazard.residual_likelihood * hazard.residual_severity : null);
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ ...card, padding: "14px 18px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width: 44, height: 44, borderRadius: 8, background: `${riskColor(initScore)}18`, border: `1px solid ${riskColor(initScore)}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 800, color: riskColor(initScore), fontSize: 16, fontFamily: "Georgia,serif" }}>{initScore}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{hazard.title}</span>
            <span style={{ background: `${status.color}22`, color: status.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${status.color}44` }}>{status.label}</span>
            <span style={{ background: `${riskColor(initScore)}22`, color: riskColor(initScore), padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${riskColor(initScore)}44` }}>{riskLabel(initScore)}</span>
          </div>
          <div style={{ color: MUTED, fontSize: 10 }}>
            {hazard.hazard_code} · {hazard.category.replace(/_/g, " ")}
            {hazard.responsible_person && ` · ${hazard.responsible_person}`}
            {resScore && ` · Residual: ${resScore} (${riskLabel(resScore)})`}
          </div>
        </div>
        {resScore && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: riskColor(initScore), fontWeight: 700 }}>{initScore}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{"\u2192"}</span>
            <span style={{ fontSize: 11, color: riskColor(resScore), fontWeight: 700 }}>{resScore}</span>
          </div>
        )}
        <span style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>{expanded ? "\u25B2" : "\u25BC"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>{hazard.description}</div>
          {hazard.mitigations && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 2 }}>Mitigations</div>
              <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{hazard.mitigations}</div>
            </div>
          )}
          {hazard.source && <div style={{ fontSize: 10, color: MUTED }}>Source: {hazard.source.replace(/_/g, " ")}</div>}
          {hazard.review_date && <div style={{ fontSize: 10, color: MUTED }}>Next review: {hazard.review_date}</div>}
          {linkedReport && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginTop: 8, background: `${CYAN}11`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
              <span style={{ fontSize: 10, color: CYAN, fontWeight: 700 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>From report {linkedReport.report_code}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{linkedReport.title}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HazardRegister({ profile, session, onCreateHazard, hazards, fromReport, onClearFromReport, reports }) {
  const [view, setView] = useState(fromReport ? "new" : "list");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // If fromReport changes (user clicked Create Hazard from a report), switch to new form
  const [lastFromReport, setLastFromReport] = useState(fromReport?.id);
  if (fromReport?.id && fromReport.id !== lastFromReport) {
    setLastFromReport(fromReport.id);
    setView("new");
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return hazards.filter(h => {
      if (filter !== "all" && h.status !== filter) return false;
      if (q) {
        const hay = `${h.title} ${h.description} ${h.hazard_code} ${h.category} ${h.responsible_person || ""} ${h.source || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [hazards, filter, search]);

  const riskSummary = useMemo(() => {
    const s = { critical: 0, high: 0, medium: 0, low: 0 };
    hazards.filter(h => h.status !== "closed").forEach(h => {
      const score = h.initial_risk_score || (h.initial_likelihood * h.initial_severity);
      if (score > 16) s.critical++;
      else if (score > 9) s.high++;
      else if (score > 4) s.medium++;
      else s.low++;
    });
    return s;
  }, [hazards]);

  if (view === "new") {
    return <HazardForm existingCount={hazards.length} fromReport={fromReport}
      onSubmit={(h) => { onCreateHazard(h); setView("list"); if (onClearFromReport) onClearFromReport(); }}
      onCancel={() => { setView("list"); if (onClearFromReport) onClearFromReport(); }} />;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Hazard Register</div>
          <div style={{ fontSize: 11, color: MUTED }}>14 CFR §5.53 — System analysis and hazard identification</div>
        </div>
        <button onClick={() => setView("new")}
          style={{ padding: "8px 16px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          + New Hazard
        </button>
      </div>

      {/* Risk summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
        {[
          { label: "Critical", value: riskSummary.critical, dot: RED },
          { label: "High", value: riskSummary.high, dot: "#F97316" },
          { label: "Medium", value: riskSummary.medium, dot: YELLOW },
          { label: "Low", value: riskSummary.low, dot: GREEN },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
              {s.label} Risk
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hazards..." style={{ ...inp, width: 200, maxWidth: 200, padding: "5px 10px", fontSize: 12 }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", ...HAZARD_STATUSES.map(s => s.id)].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${filter === f ? WHITE : BORDER}`,
              background: filter === f ? WHITE : CARD, color: filter === f ? BLACK : MUTED,
              fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
            {f === "all" ? `All (${hazards.length})` : HAZARD_STATUSES.find(s => s.id === f)?.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14 }}>No hazards registered</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Register identified hazards with risk assessments and mitigations.</div>
        </div>
      ) : filtered.map(h => {
        const lr = h.related_report_id && reports ? reports.find(r => r.id === h.related_report_id) : null;
        return <HazardCard key={h.id} hazard={h} linkedReport={lr} />;
      })}
    </div>
  );
}
