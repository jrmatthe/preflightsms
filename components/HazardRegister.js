import { useState, useMemo, useEffect } from "react";
import { hasFeature } from "../lib/tiers";

const BLACK = "#000000", DARK = "#0A0A0A", NEAR_BLACK = "#111111", CARD = "#141414";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };

const LIKELIHOOD_LABELS = ["", "Improbable", "Remote", "Occasional", "Probable", "Frequent"];
const SEVERITY_LABELS = ["", "Negligible", "Minor", "Major", "Hazardous", "Catastrophic"];

function riskColor(score) {
  if (score >= 15) return RED;
  if (score >= 8) return YELLOW;
  if (score >= 4) return "#F97316";
  return GREEN;
}

function riskLabel(score) {
  if (score >= 15) return "High";
  if (score >= 8) return "Medium";
  if (score >= 4) return "Low";
  return "Low";
}

const HAZARD_STATUSES = [
  { id: "identified", label: "Identified", color: CYAN },
  { id: "active", label: "Active", color: "#F97316" },
  { id: "mitigated", label: "Mitigated", color: YELLOW },
  { id: "monitoring", label: "Monitoring", color: CYAN },
  { id: "accepted", label: "Accepted", color: GREEN },
  { id: "closed", label: "Closed", color: MUTED },
];

function RiskMatrix({ likelihood, severity, onChange, label }) {
  const score = likelihood && severity ? likelihood * severity : null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
        {score && <span style={{ fontSize: 14, fontWeight: 800, color: riskColor(score) }}>{riskLabel(score)} Risk ({score})</span>}
        {score && <span style={{ fontSize: 10, color: MUTED }}>
          — {LIKELIHOOD_LABELS[likelihood]} likelihood, {SEVERITY_LABELS[severity]} severity
        </span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto repeat(5, 1fr)", gap: 2, fontSize: 9 }}>
        <div />
        {SEVERITY_LABELS.slice(1).map((s, i) => <div key={i} style={{ textAlign: "center", color: MUTED, padding: "2px 0" }}>{s}</div>)}
        {[5, 4, 3, 2, 1].map(l => (
          [<div key={`l${l}`} style={{ color: MUTED, paddingRight: 6, display: "flex", alignItems: "center" }}>{LIKELIHOOD_LABELS[l]}</div>,
          ...[1, 2, 3, 4, 5].map(s => {
            const sc = l * s;
            const isSelected = likelihood === l && severity === s;
            return (
              <button key={`${l}-${s}`} onClick={() => onChange(l, s)}
                style={{ width: "100%", height: 28, border: isSelected ? `2px solid ${WHITE}` : `1px solid ${BORDER}`, borderRadius: 3,
                  background: `${riskColor(sc)}${isSelected ? "44" : "18"}`, color: riskColor(sc), fontWeight: 700, fontSize: 10,
                  cursor: "pointer", fontFamily: "inherit" }}>
                {sc}
              </button>
            );
          })]
        ))}
      </div>
    </div>
  );
}

// ── Create Form (simplified — just initial assessment) ──────────────
function HazardForm({ onSubmit, onCancel, existingCount, fromReport, onAiRiskAssess, org }) {
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSubmit = () => {
    if (!form.title.trim() || !form.initialLikelihood || !form.initialSeverity) return;
    onSubmit({ ...form, hazardCode: `HAZ-${String(existingCount + 1).padStart(3, "0")}` });
  };

  return (
    <div data-onboarding="inv-form" style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>New Investigation</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.51 — Safety investigation and risk analysis</div>
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
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Investigation Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Icing conditions on KSFF-KBOI route during winter" style={inp} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Description *</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)}
          placeholder="Describe the issue, contributing factors, and potential consequences"
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
          label="Initial Risk Assessment"
        />
      </div>

      {/* AI Suggest Risk Scores */}
      {onAiRiskAssess && hasFeature(org, "safety_trend_alerts") && (
        <div data-onboarding="inv-ai-suggest" style={{ marginBottom: 12 }}>
          <button onClick={async () => {
            setAiLoading(true);
            setAiResult(null);
            try {
              const result = await onAiRiskAssess({ title: form.title, description: form.description, category: form.category, source: form.source });
              if (result) {
                setAiResult(result);
                if (result.initial_likelihood) set("initialLikelihood", result.initial_likelihood);
                if (result.initial_severity) {
                  setForm(f => ({ ...f, initialLikelihood: result.initial_likelihood || f.initialLikelihood, initialSeverity: result.initial_severity || f.initialSeverity }));
                }
              }
            } catch { /* handled by parent */ }
            setAiLoading(false);
          }} disabled={aiLoading || !form.title.trim() || !form.description.trim()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: (aiLoading || !form.title.trim() || !form.description.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (aiLoading || !form.title.trim() || !form.description.trim()) ? 0.4 : 1 }}>
            <span style={{ fontSize: 14 }}>🤖</span> {aiLoading ? "Analyzing..." : "AI Suggest Risk Scores"}
          </button>
          {!form.title.trim() || !form.description.trim() ? (
            <div style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>Fill in title and description first</div>
          ) : null}
          {aiResult && (
            <div style={{ marginTop: 8, padding: "12px 14px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: CYAN }}>🤖 AI Risk Assessment</div>
                <button onClick={() => setAiResult(null)} style={{ background: "none", border: "none", color: MUTED, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>Dismiss</button>
              </div>
              {aiResult.reasoning && (
                <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>{aiResult.reasoning}</div>
              )}
            </div>
          )}
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
        Register Investigation
      </button>
    </div>
  );
}

// ── Hazard Card (expanded view with investigation workflow) ──────────
function HazardCard({ hazard, linkedReport, linkedActions, onCreateAction, onUpdateHazard, canManage, org, onAiInvestigate, onGenerateLessonsLearned, onPublishBulletin, onCreateTrainingModule, onAiRiskAssess }) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [llLoading, setLlLoading] = useState(false);
  const [bulletinPreview, setBulletinPreview] = useState(false);
  const [editingMitigations, setEditingMitigations] = useState(false);
  const [mitigationsText, setMitigationsText] = useState(hazard.mitigations || "");
  const [editingResidual, setEditingResidual] = useState(false);
  const [residualL, setResidualL] = useState(hazard.residual_likelihood || 0);
  const [residualS, setResidualS] = useState(hazard.residual_severity || 0);
  const [aiResidualLoading, setAiResidualLoading] = useState(false);
  const [aiResidualResult, setAiResidualResult] = useState(null);
  const status = HAZARD_STATUSES.find(s => s.id === hazard.status) || HAZARD_STATUSES[0];
  const initScore = hazard.initial_risk_score || (hazard.initial_likelihood * hazard.initial_severity);
  const resScore = hazard.residual_risk_score || (hazard.residual_likelihood && hazard.residual_severity ? hazard.residual_likelihood * hazard.residual_severity : null);
  const [expanded, setExpanded] = useState(false);

  // Sync mitigations text when hazard prop changes
  useEffect(() => { setMitigationsText(hazard.mitigations || ""); }, [hazard.mitigations]);
  useEffect(() => { setResidualL(hazard.residual_likelihood || 0); setResidualS(hazard.residual_severity || 0); }, [hazard.residual_likelihood, hazard.residual_severity]);

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
          {/* 1. Description */}
          <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>{hazard.description}</div>

          {/* 2. Linked Report */}
          {linkedReport && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 8, background: `${CYAN}11`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
              <span style={{ fontSize: 10, color: CYAN, fontWeight: 700 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>From report {linkedReport.report_code}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{linkedReport.title}</div>
              </div>
            </div>
          )}

          {hazard.source && <div style={{ fontSize: 10, color: MUTED }}>Source: {hazard.source.replace(/_/g, " ")}</div>}
          {hazard.review_date && <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>Next review: {hazard.review_date}</div>}

          {/* 3. AI Investigation Analysis — first action, informs everything below */}
          {onAiInvestigate && canManage && hasFeature(org, "safety_trend_alerts") && !aiAnalysis && (
            <button onClick={async () => {
              setAiLoading(true);
              try {
                const result = await onAiInvestigate(hazard.id);
                if (result) setAiAnalysis(result);
              } catch { /* handled by parent */ }
              setAiLoading(false);
            }} disabled={aiLoading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", marginBottom: 8, background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: aiLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: aiLoading ? 0.6 : 1 }}>
              <span style={{ fontSize: 14 }}>🤖</span> {aiLoading ? "Analyzing..." : "AI Investigation Analysis"}
            </button>
          )}
          {aiAnalysis && (
            <div style={{ marginBottom: 10, padding: "14px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: CYAN }}>🤖 AI Investigation Analysis</div>
                <button onClick={() => setAiAnalysis(null)} style={{ background: "none", border: "none", color: MUTED, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Dismiss</button>
              </div>
              {aiAnalysis.root_causes?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Root Causes</div>
                  {aiAnalysis.root_causes.map((rc, i) => (
                    <div key={i} style={{ fontSize: 11, color: OFF_WHITE, padding: "4px 0", paddingLeft: 8, borderLeft: `2px solid ${CYAN}44`, marginBottom: 4 }}>
                      {rc.cause} <span style={{ fontSize: 9, color: MUTED }}>({Math.round((rc.confidence || 0) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              )}
              {aiAnalysis.suggested_mitigations?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Suggested Mitigations (click to add)</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {aiAnalysis.suggested_mitigations.map((m, i) => (
                      <button key={i} onClick={() => {
                        const text = typeof m === "string" ? m : m.text;
                        const current = mitigationsText.trim();
                        const newText = current ? `${current}\n- ${text}` : `- ${text}`;
                        setMitigationsText(newText);
                        if (onUpdateHazard) onUpdateHazard(hazard.id, { mitigations: newText });
                        setAiAnalysis(prev => ({ ...prev, suggested_mitigations: prev.suggested_mitigations.filter((_, j) => j !== i) }));
                      }}
                        title={typeof m === "string" ? m : m.rationale}
                        style={{ padding: "5px 10px", borderRadius: 12, background: `${CYAN}15`, border: `1px solid ${CYAN}33`, color: CYAN, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", maxWidth: "100%" }}>
                        + {typeof m === "string" ? m : m.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {aiAnalysis.recommended_actions?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Recommended Corrective Actions</div>
                  {aiAnalysis.recommended_actions.map((ra, i) => {
                    const pColor = ra.priority === "high" ? RED : ra.priority === "medium" ? YELLOW : GREEN;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>{ra.title}</div>
                          <div style={{ fontSize: 10, color: MUTED }}>{ra.description}</div>
                        </div>
                        <span style={{ fontSize: 9, color: pColor, background: `${pColor}22`, padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{ra.priority}</span>
                        {onCreateAction && (
                          <button onClick={() => onCreateAction({ ...hazard, _prefill: { title: ra.title, description: ra.description, priority: ra.priority } })}
                            style={{ background: "none", border: `1px solid ${GREEN}44`, borderRadius: 4, color: GREEN, fontSize: 9, fontWeight: 600, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                            Accept
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {aiAnalysis.similar_patterns?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Similar Patterns</div>
                  {aiAnalysis.similar_patterns.map((sp, i) => (
                    <div key={i} style={{ fontSize: 10, color: MUTED, padding: "2px 0" }}>
                      <span style={{ color: OFF_WHITE, fontWeight: 600 }}>{sp.hazard_code}</span> — {sp.similarity}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Mitigations — editable inline */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase" }}>Mitigations / Controls</div>
              {canManage && onUpdateHazard && !editingMitigations && (
                <button onClick={() => setEditingMitigations(true)} style={{ background: "none", border: "none", color: CYAN, fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
              )}
            </div>
            {editingMitigations ? (
              <div>
                <textarea value={mitigationsText} onChange={e => setMitigationsText(e.target.value)}
                  rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit", marginBottom: 6 }}
                  placeholder="Describe controls or actions in place to reduce this risk" />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { onUpdateHazard(hazard.id, { mitigations: mitigationsText }); setEditingMitigations(false); }}
                    style={{ padding: "4px 12px", background: WHITE, color: BLACK, border: "none", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                  <button onClick={() => { setMitigationsText(hazard.mitigations || ""); setEditingMitigations(false); }}
                    style={{ padding: "4px 12px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                </div>
              </div>
            ) : hazard.mitigations ? (
              <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{hazard.mitigations}</div>
            ) : (
              <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic" }}>No mitigations recorded yet{canManage ? " — run AI analysis above or click Edit" : ""}</div>
            )}
          </div>

          {/* 5. Residual Risk — editable inline */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase" }}>Residual Risk (after mitigations)</div>
              {canManage && onUpdateHazard && hazard.mitigations && !editingResidual && (
                <button onClick={() => setEditingResidual(true)} style={{ background: "none", border: "none", color: CYAN, fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {resScore ? "Edit" : "Set Score"}
                </button>
              )}
            </div>
            {editingResidual ? (
              <div>
                <div style={{ ...card, padding: "12px 14px", marginBottom: 8 }}>
                  <RiskMatrix likelihood={residualL} severity={residualS}
                    onChange={(l, s) => { setResidualL(l); setResidualS(s); }}
                    label="Residual Risk" />
                </div>
                {/* AI Suggest Residual */}
                {onAiRiskAssess && hasFeature(org, "safety_trend_alerts") && (
                  <div style={{ marginBottom: 8 }}>
                    <button onClick={async () => {
                      setAiResidualLoading(true);
                      setAiResidualResult(null);
                      try {
                        const result = await onAiRiskAssess({ title: hazard.title, description: hazard.description, category: hazard.category, source: hazard.source, mitigations: mitigationsText || hazard.mitigations });
                        if (result) {
                          setAiResidualResult(result);
                          if (result.residual_likelihood && result.residual_severity) {
                            setResidualL(result.residual_likelihood);
                            setResidualS(result.residual_severity);
                          }
                        }
                      } catch { /* handled by parent */ }
                      setAiResidualLoading(false);
                    }} disabled={aiResidualLoading}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 10, fontWeight: 600, cursor: aiResidualLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: aiResidualLoading ? 0.6 : 1 }}>
                      <span style={{ fontSize: 12 }}>🤖</span> {aiResidualLoading ? "Analyzing..." : "AI Suggest Residual Risk"}
                    </button>
                    {aiResidualResult?.reasoning && (
                      <div style={{ marginTop: 6, padding: "10px 12px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: CYAN, marginBottom: 4 }}>🤖 Residual Risk Assessment</div>
                        <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>{aiResidualResult.reasoning}</div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { onUpdateHazard(hazard.id, { residual_likelihood: residualL, residual_severity: residualS }); setEditingResidual(false); setAiResidualResult(null); }}
                    style={{ padding: "4px 12px", background: WHITE, color: BLACK, border: "none", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                  <button onClick={() => { setResidualL(hazard.residual_likelihood || 0); setResidualS(hazard.residual_severity || 0); setEditingResidual(false); setAiResidualResult(null); }}
                    style={{ padding: "4px 12px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                </div>
              </div>
            ) : resScore ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: riskColor(initScore) }}>{initScore}</span>
                <span style={{ color: MUTED }}>{"\u2192"}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: riskColor(resScore) }}>{resScore}</span>
                <span style={{ fontSize: 10, color: MUTED }}>({riskLabel(resScore)})</span>
              </div>
            ) : hazard.mitigations ? (
              <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic" }}>Not yet scored — click "Set Score" to assess residual risk</div>
            ) : (
              <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic" }}>Add mitigations first</div>
            )}
          </div>

          {/* 6. Corrective Actions + Create button */}
          <div style={{ marginBottom: 8 }}>
            {linkedActions && linkedActions.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Corrective Actions ({linkedActions.length})</div>
                {linkedActions.map(a => {
                  const sColor = a.status === "completed" ? GREEN : a.status === "in_progress" ? YELLOW : a.status === "overdue" ? RED : CYAN;
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", marginBottom: 4, background: `${sColor}11`, border: `1px solid ${sColor}33`, borderRadius: 6 }}>
                      <span style={{ fontSize: 10, color: sColor, fontWeight: 700 }}>✓</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>{a.action_code} — {a.title}</div>
                      </div>
                      <span style={{ fontSize: 9, color: sColor, background: `${sColor}22`, padding: "2px 8px", borderRadius: 8 }}>{a.status?.replace(/_/g, " ")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {onCreateAction && canManage && (
              <button onClick={() => onCreateAction(hazard)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", marginTop: 4, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: GREEN, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 14 }}>✓</span> Create Corrective Action
              </button>
            )}
          </div>

          {/* 7. Status Update */}
          {onUpdateHazard && canManage && (
            <div style={{ marginTop: 4, marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 6, letterSpacing: 1 }}>Update Status</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {HAZARD_STATUSES.map(s => (
                  <button key={s.id} onClick={() => {
                    if (s.id === hazard.status) return;
                    if (s.id === "closed" && hazard.related_report_id) {
                      if (!confirm("This will close the linked report and notify the report submitter. Continue?")) return;
                    }
                    onUpdateHazard(hazard.id, { status: s.id });
                  }}
                    style={{ padding: "4px 10px", borderRadius: 12, border: `1px solid ${s.id === hazard.status ? s.color : BORDER}`,
                      background: s.id === hazard.status ? `${s.color}22` : "transparent",
                      color: s.id === hazard.status ? s.color : MUTED,
                      fontSize: 10, fontWeight: 600, cursor: s.id === hazard.status ? "default" : "pointer", fontFamily: "inherit",
                      opacity: s.id === hazard.status ? 1 : 0.7 }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8. Lessons Learned (closed/accepted only) */}
          {(hazard.status === "closed" || hazard.status === "accepted") && onGenerateLessonsLearned && canManage && hasFeature(org, "safety_trend_alerts") && (!hazard.lessons_learned || !hazard.lessons_learned.summary) && (
            <button onClick={async () => {
              setLlLoading(true);
              try { await onGenerateLessonsLearned(hazard.id); } catch { /* handled by parent */ }
              setLlLoading(false);
            }} disabled={llLoading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", marginTop: 8, background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: llLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: llLoading ? 0.6 : 1 }}>
              <span style={{ fontSize: 14 }}>🤖</span> {llLoading ? "Generating..." : "Generate Lessons Learned"}
            </button>
          )}
          {hazard.lessons_learned && hazard.lessons_learned.summary && (
            <div style={{ marginTop: 8, padding: "14px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: CYAN, marginBottom: 10 }}>Lessons Learned</div>
              {hazard.lessons_learned.summary && (
                <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.6, marginBottom: 10, whiteSpace: "pre-wrap" }}>{hazard.lessons_learned.summary}</div>
              )}
              {hazard.lessons_learned.takeaways?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Key Takeaways</div>
                  {hazard.lessons_learned.takeaways.map((t, i) => (
                    <div key={i} style={{ fontSize: 11, color: OFF_WHITE, padding: "4px 0", paddingLeft: 8, borderLeft: `2px solid ${CYAN}44`, marginBottom: 4 }}>{t}</div>
                  ))}
                </div>
              )}
              {hazard.lessons_learned.training_topics?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Training Topics</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {hazard.lessons_learned.training_topics.map((t, i) => (
                      <span key={i} style={{ fontSize: 9, padding: "3px 10px", borderRadius: 8, background: `${CYAN}15`, color: CYAN, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {hazard.lessons_learned.prevention_tips?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Prevention Tips</div>
                  {hazard.lessons_learned.prevention_tips.map((t, i) => (
                    <div key={i} style={{ fontSize: 11, color: OFF_WHITE, padding: "4px 0", paddingLeft: 8, borderLeft: `2px solid ${GREEN}44`, marginBottom: 4 }}>{t}</div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {onPublishBulletin && (
                  <button onClick={() => setBulletinPreview(true)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "transparent", border: `1px solid ${YELLOW}44`, borderRadius: 4, color: YELLOW, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Publish as Safety Bulletin
                  </button>
                )}
                {onCreateTrainingModule && (
                  <button onClick={() => onCreateTrainingModule(hazard)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "transparent", border: `1px solid ${GREEN}44`, borderRadius: 4, color: GREEN, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Create Training Module
                  </button>
                )}
              </div>
              {/* Bulletin Preview Modal */}
              {bulletinPreview && onPublishBulletin && (() => {
                const ll = hazard.lessons_learned;
                const bulletinTitle = `Safety Bulletin: ${hazard.title}`;
                const bulletinBody = ll.summary || `Lessons learned from investigation ${hazard.hazard_code}`;
                return (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => setBulletinPreview(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 28, width: "90vw", maxWidth: 600, maxHeight: "80vh", overflowY: "auto" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: YELLOW, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Safety Bulletin Preview</div>
                      <div style={{ fontSize: 9, color: MUTED, marginBottom: 16 }}>This will be sent as a notification to all organization members.</div>
                      <div style={{ padding: "16px 18px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 10 }}>{bulletinTitle}</div>
                        <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: ll.takeaways?.length ? 12 : 0 }}>{bulletinBody}</div>
                        {ll.takeaways?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Key Takeaways</div>
                            {ll.takeaways.map((t, i) => (
                              <div key={i} style={{ fontSize: 11, color: OFF_WHITE, padding: "4px 0 4px 8px", borderLeft: `2px solid ${CYAN}44`, marginBottom: 4 }}>{t}</div>
                            ))}
                          </div>
                        )}
                        {ll.prevention_tips?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Prevention Tips</div>
                            {ll.prevention_tips.map((t, i) => (
                              <div key={i} style={{ fontSize: 11, color: OFF_WHITE, padding: "4px 0 4px 8px", borderLeft: `2px solid ${GREEN}44`, marginBottom: 4 }}>{t}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={() => setBulletinPreview(false)}
                          style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          Cancel
                        </button>
                        <button onClick={() => { onPublishBulletin(hazard); setBulletinPreview(false); }}
                          style={{ padding: "8px 16px", background: YELLOW, border: "none", borderRadius: 6, color: BLACK, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          Publish to All Members
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HazardRegister({ profile, session, onCreateHazard, onUpdateHazard, hazards, fromReport, onClearFromReport, reports, actions, onCreateAction, org, onAiInvestigate, onGenerateLessonsLearned, onPublishBulletin, onCreateTrainingModule, onAiRiskAssess }) {
  const [showForm, setShowForm] = useState(!!fromReport);
  const [sortBy, setSortBy] = useState("newest");
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { if (fromReport) setShowForm(true); }, [fromReport]);

  const canManage = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);

  const linkedReports = useMemo(() => {
    const map = {};
    (reports || []).forEach(r => { map[r.id] = r; });
    return map;
  }, [reports]);

  const linkedActionsMap = useMemo(() => {
    const map = {};
    (actions || []).forEach(a => {
      if (a.hazard_id) {
        if (!map[a.hazard_id]) map[a.hazard_id] = [];
        map[a.hazard_id].push(a);
      }
    });
    return map;
  }, [actions]);

  const filteredHazards = useMemo(() => {
    let list = [...(hazards || [])];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(h => h.title.toLowerCase().includes(q) || h.hazard_code?.toLowerCase().includes(q) || h.category?.toLowerCase().includes(q));
    }
    if (filterStatus !== "all") list = list.filter(h => h.status === filterStatus);
    if (sortBy === "newest") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === "risk_high") list.sort((a, b) => (b.initial_likelihood * b.initial_severity) - (a.initial_likelihood * a.initial_severity));
    else if (sortBy === "risk_low") list.sort((a, b) => (a.initial_likelihood * a.initial_severity) - (b.initial_likelihood * b.initial_severity));
    return list;
  }, [hazards, searchQ, filterStatus, sortBy]);

  const statusCounts = useMemo(() => {
    const counts = { all: 0 };
    HAZARD_STATUSES.forEach(s => { counts[s.id] = 0; });
    (hazards || []).forEach(h => {
      counts.all++;
      if (counts[h.status] !== undefined) counts[h.status]++;
    });
    return counts;
  }, [hazards]);

  // Risk summary
  const riskSummary = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    (hazards || []).filter(h => h.status !== "closed").forEach(h => {
      const score = h.initial_likelihood * h.initial_severity;
      if (score >= 20) counts.critical++;
      else if (score >= 15) counts.high++;
      else if (score >= 8) counts.medium++;
      else counts.low++;
    });
    return counts;
  }, [hazards]);

  if (showForm) {
    return <HazardForm
      onSubmit={(data) => { onCreateHazard(data); setShowForm(false); if (fromReport) onClearFromReport?.(); }}
      onCancel={() => { setShowForm(false); if (fromReport) onClearFromReport?.(); }}
      existingCount={hazards?.length || 0}
      fromReport={fromReport}
      onAiRiskAssess={onAiRiskAssess}
      org={org}
    />;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Investigations & Hazard Register</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.53 — Hazard identification, risk assessment, and mitigation</div>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)}
            style={{ padding: "8px 18px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            + New Investigation
          </button>
        )}
      </div>

      {/* Risk Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }} className="report-grid">
        {[
          { label: "CRITICAL RISK", count: riskSummary.critical, color: RED },
          { label: "HIGH RISK", count: riskSummary.high, color: "#F97316" },
          { label: "MEDIUM RISK", count: riskSummary.medium, color: YELLOW },
          { label: "LOW RISK", count: riskSummary.low, color: GREEN },
        ].map(r => (
          <div key={r.label} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: r.color, fontFamily: "Georgia,serif" }}>{r.count}</div>
            <div style={{ fontSize: 9, color: MUTED, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: r.color, display: "inline-block" }} />{r.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search + Sort */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search investigations..." style={{ ...inp, maxWidth: 250, fontSize: 11, padding: "6px 10px" }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, maxWidth: 140, fontSize: 11, padding: "6px 10px" }}>
          <option value="newest">Newest first</option>
          <option value="risk_high">Risk: high → low</option>
          <option value="risk_low">Risk: low → high</option>
        </select>
      </div>

      {/* Status Filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => setFilterStatus("all")}
          style={{ padding: "4px 12px", borderRadius: 12, border: `1px solid ${filterStatus === "all" ? WHITE : BORDER}`, background: filterStatus === "all" ? `${WHITE}15` : "transparent", color: filterStatus === "all" ? WHITE : MUTED, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          All ({statusCounts.all})
        </button>
        {HAZARD_STATUSES.map(s => (
          <button key={s.id} onClick={() => setFilterStatus(s.id)}
            style={{ padding: "4px 12px", borderRadius: 12, border: `1px solid ${filterStatus === s.id ? s.color : BORDER}`, background: filterStatus === s.id ? `${s.color}22` : "transparent", color: filterStatus === s.id ? s.color : MUTED, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {s.label} ({statusCounts[s.id] || 0})
          </button>
        ))}
      </div>

      {/* Hazard List */}
      {filteredHazards.length === 0 ? (
        <div style={{ ...card, padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: MUTED }}>No investigations found</div>
          {canManage && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Click "+ New Investigation" to create one</div>}
        </div>
      ) : (
        filteredHazards.map(h => {
          const lr = h.related_report_id ? linkedReports[h.related_report_id] : null;
          return <HazardCard key={h.id} hazard={h} linkedReport={lr} linkedActions={linkedActionsMap[h.id]} onCreateAction={onCreateAction} onUpdateHazard={onUpdateHazard} canManage={canManage} org={org} onAiInvestigate={onAiInvestigate} onGenerateLessonsLearned={onGenerateLessonsLearned} onPublishBulletin={onPublishBulletin} onCreateTrainingModule={onCreateTrainingModule} onAiRiskAssess={onAiRiskAssess} />;
        })
      )}
    </div>
  );
}
