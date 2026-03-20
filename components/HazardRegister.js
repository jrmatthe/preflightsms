import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  if (!score) return MUTED;
  if (score >= 15) return RED;
  if (score >= 8) return YELLOW;
  if (score >= 4) return "#F97316";
  return GREEN;
}

function riskLabel(score) {
  if (!score) return "--";
  if (score >= 15) return "High";
  if (score >= 8) return "Medium";
  if (score >= 4) return "Low";
  return "Low";
}

const HAZARD_STATUSES = [
  { id: "identified", label: "Identified", color: CYAN },
  { id: "assessed", label: "Assessed", color: "#A78BFA" },
  { id: "acceptable", label: "Acceptable", color: GREEN },
  { id: "unacceptable", label: "Unacceptable", color: RED },
  { id: "mitigated", label: "Mitigated", color: YELLOW },
  { id: "monitoring", label: "Monitoring", color: CYAN },
  { id: "closed", label: "Closed", color: MUTED },
];

// Valid status transitions
const VALID_TRANSITIONS = {
  identified: ["assessed"],
  assessed: ["acceptable", "unacceptable"],
  acceptable: ["monitoring", "closed"],
  unacceptable: ["mitigated"],
  mitigated: ["monitoring", "closed"],
  monitoring: ["closed", "unacceptable"],
  closed: [],
};

const STEP_LABELS = [
  "Identification",
  "Initial Risk Assessment",
  "Risk Decision",
  "Analysis & Mitigation",
  "Residual Risk",
  "Monitoring & Closure",
  "Lessons Learned",
];

const STEP_KEYS = ["identification", "assessment", "decision", "analysis", "residual", "monitoring", "lessons"];

function RiskMatrix({ likelihood, severity, onChange, label }) {
  const score = likelihood != null && severity != null ? likelihood * severity : null;
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

// ── Duplicate Detection Helpers ──────────────────────────────
function normalizeTitle(title) {
  return (title || "").toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2);
}

function calcOverlap(wordsA, wordsB, categoryA, categoryB) {
  if (!wordsA.length || !wordsB.length) return 0;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const shared = [...setA].filter(w => setB.has(w)).length;
  const total = new Set([...setA, ...setB]).size;
  let ratio = total > 0 ? shared / total : 0;
  if (categoryA && categoryB && categoryA === categoryB) ratio = Math.min(1, ratio + 0.15);
  return ratio;
}

// ── Step Modal Wrapper ──────────────────────────────────────
function StepModal({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 28, maxWidth: 640, width: "90vw", maxHeight: "85vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", color: MUTED, fontSize: 18, cursor: "pointer", fontFamily: "inherit" }}>{"\u00D7"}</button>
        {children}
      </div>
    </div>
  );
}

// ── Horizontal Stepper ──────────────────────────────────────
function HorizontalStepper({ stepStatuses, onStepClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0" }}>
      {STEP_LABELS.map((label, i) => {
        const status = stepStatuses[i];
        const isCompleted = status === "completed";
        const isActive = status === "active";
        const isSkipped = status === "skipped";
        const isClickable = isCompleted || isActive;

        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEP_LABELS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: isClickable ? "pointer" : "default", minWidth: 36 }}
              onClick={() => isClickable && onStepClick(i)}>
              {/* Circle */}
              <div style={{
                width: 36, height: 36, borderRadius: 18, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isCompleted ? GREEN : "transparent",
                border: `2px solid ${isCompleted ? GREEN : isActive ? WHITE : isSkipped ? `${MUTED}33` : BORDER}`,
                animation: isActive ? "pulse 2s infinite" : "none",
                transition: "all 0.2s",
              }}>
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? WHITE : isSkipped ? `${MUTED}44` : MUTED }}>{i + 1}</span>
                )}
              </div>
              {/* Label */}
              <span style={{
                fontSize: 9, fontWeight: isActive ? 700 : 500, marginTop: 6, textAlign: "center",
                color: isCompleted ? GREEN : isActive ? WHITE : isSkipped ? `${MUTED}44` : MUTED,
                maxWidth: 80, lineHeight: 1.2,
              }}>{label}</span>
            </div>
            {/* Connector line */}
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: stepStatuses[i + 1] === "completed" || isCompleted ? `${GREEN}66` : BORDER, margin: "0 4px", marginBottom: 20 }} />
            )}
          </div>
        );
      })}
      <style>{`@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); } 50% { box-shadow: 0 0 0 6px rgba(255,255,255,0); } }`}</style>
    </div>
  );
}

// ── Step Status Calculator ──────────────────────────────────
function getStepStatus(hazard, step, initScore, resScore, linkedActions) {
  const s = hazard.status;
  switch (step) {
    case "identification":
      return "completed";
    case "assessment":
      if (s === "identified") return "active";
      if (initScore) return "completed";
      return "upcoming";
    case "decision":
      if (s === "assessed") return "active";
      if (["acceptable", "unacceptable", "mitigated", "monitoring", "closed"].includes(s)) return "completed";
      return "upcoming";
    case "analysis":
      if (s === "unacceptable" && (!linkedActions || linkedActions.length === 0) && !hazard.mitigations) return "active";
      if (s === "unacceptable" && (linkedActions?.length > 0 || hazard.mitigations)) return "completed";
      if (["acceptable"].includes(s)) return "skipped";
      if (["mitigated", "monitoring", "closed"].includes(s) && (hazard.mitigations || linkedActions?.length > 0)) return "completed";
      if (["mitigated", "monitoring", "closed"].includes(s)) return "skipped";
      return "upcoming";
    case "residual":
      if (["acceptable"].includes(s)) return "skipped";
      if (resScore) return "completed";
      if (s === "unacceptable" && (linkedActions?.length > 0 || hazard.mitigations)) return "active";
      if (["mitigated", "monitoring", "closed"].includes(s)) return "completed";
      return "upcoming";
    case "monitoring":
      if (["acceptable", "mitigated"].includes(s)) return "active";
      if (s === "monitoring") return "active";
      if (s === "closed") return "completed";
      return "upcoming";
    case "lessons":
      if (s === "closed") return "active";
      return "upcoming";
    default:
      return "upcoming";
  }
}

// ── Hazard Card (list-row only) ─────────────────────────────
function HazardCard({ hazard, linkedReport, linkedActions, onSelect }) {
  const initScore = hazard.initial_risk_score || (hazard.initial_likelihood != null && hazard.initial_severity != null ? hazard.initial_likelihood * hazard.initial_severity : null);
  const resScore = hazard.residual_risk_score || (hazard.residual_likelihood != null && hazard.residual_severity != null ? hazard.residual_likelihood * hazard.residual_severity : null);
  const status = HAZARD_STATUSES.find(s => s.id === hazard.status) || HAZARD_STATUSES[0];

  return (
    <div style={{ ...card, padding: "14px 18px", marginBottom: 8, cursor: "pointer" }} onClick={() => onSelect(hazard.id)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Risk score box */}
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          background: initScore ? `${riskColor(initScore)}18` : `${MUTED}12`,
          border: `1px solid ${initScore ? `${riskColor(initScore)}44` : `${MUTED}33`}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontWeight: 800, color: initScore ? riskColor(initScore) : MUTED, fontSize: 16, fontFamily: "Georgia,serif" }}>
            {initScore || "--"}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{hazard.title}</span>
            <span style={{ background: `${status.color}22`, color: status.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${status.color}44` }}>{status.label}</span>
            {initScore && <span style={{ background: `${riskColor(initScore)}22`, color: riskColor(initScore), padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${riskColor(initScore)}44` }}>{riskLabel(initScore)}</span>}
          </div>
          <div style={{ color: MUTED, fontSize: 10 }}>
            {hazard.hazard_code} · {(hazard.category || "").replace(/_/g, " ")}
            {hazard.responsible_person && ` · ${hazard.responsible_person}`}
            {resScore && ` · Residual: ${resScore} (${riskLabel(resScore)})`}
          </div>
        </div>
        {resScore && initScore && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: riskColor(initScore), fontWeight: 700 }}>{initScore}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{"\u2192"}</span>
            <span style={{ fontSize: 11, color: riskColor(resScore), fontWeight: 700 }}>{resScore}</span>
          </div>
        )}
        <span style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>{"\u203A"}</span>
      </div>
    </div>
  );
}

// ── Detail View ─────────────────────────────────────────────
function HazardDetailView({ hazard, linkedReport, linkedActions, onCreateAction, onCreateActionInline, onUpdateActionStatus, onUpdateHazard, canManage, org, onAiInvestigate, onGenerateLessonsLearned, onPublishBulletin, onCreateTrainingModule, onAiRiskAssess, orgProfiles, onBack, allActions }) {
  const [aiAnalysis, setAiAnalysis] = useState(hazard.ai_analysis || null);
  const [aiAnalysisCollapsed, setAiAnalysisCollapsed] = useState(!!hazard.ai_analysis);
  const [aiLoading, setAiLoading] = useState(false);
  const [llLoading, setLlLoading] = useState(false);
  const [bulletinPreview, setBulletinPreview] = useState(false);
  const [showInlineActionForm, setShowInlineActionForm] = useState(false);
  const [inlineActionForm, setInlineActionForm] = useState({ title: "", description: "", priority: "medium", dueDate: "", assignedTo: "" });
  const [actionSaving, setActionSaving] = useState(false);
  const [initialL, setInitialL] = useState(hazard.initial_likelihood || 0);
  const [initialS, setInitialS] = useState(hazard.initial_severity || 0);
  const [residualL, setResidualL] = useState(hazard.residual_likelihood || 0);
  const [residualS, setResidualS] = useState(hazard.residual_severity || 0);
  const [aiRiskLoading, setAiRiskLoading] = useState(false);
  const [aiRiskResult, setAiRiskResult] = useState(null);
  const [aiResidualLoading, setAiResidualLoading] = useState(false);
  const [aiResidualResult, setAiResidualResult] = useState(null);
  const [reviewDate, setReviewDate] = useState(hazard.review_date || "");
  const [activeStepModal, setActiveStepModal] = useState(null);
  const [llEditing, setLlEditing] = useState(false);
  const [llDraft, setLlDraft] = useState(null);

  const status = HAZARD_STATUSES.find(s => s.id === hazard.status) || HAZARD_STATUSES[0];
  const initScore = hazard.initial_risk_score || (hazard.initial_likelihood != null && hazard.initial_severity != null ? hazard.initial_likelihood * hazard.initial_severity : null);
  const resScore = hazard.residual_risk_score || (hazard.residual_likelihood != null && hazard.residual_severity != null ? hazard.residual_likelihood * hazard.residual_severity : null);

  useEffect(() => { setResidualL(hazard.residual_likelihood || 0); setResidualS(hazard.residual_severity || 0); }, [hazard.residual_likelihood, hazard.residual_severity]);
  useEffect(() => { setInitialL(hazard.initial_likelihood || 0); setInitialS(hazard.initial_severity || 0); }, [hazard.initial_likelihood, hazard.initial_severity]);
  useEffect(() => { setReviewDate(hazard.review_date || ""); }, [hazard.review_date]);

  const stepStatuses = STEP_KEYS.map(k => getStepStatus(hazard, k, initScore, resScore, linkedActions));

  const closeModalAndUpdate = (id, data) => {
    onUpdateHazard(id, data);
    setActiveStepModal(null);
  };

  // Count open corrective actions across org
  const openActionCount = (allActions || []).filter(a => a.status === "open" || a.status === "in_progress").length;

  // Monitoring duration
  const monitoringDays = hazard.status === "monitoring" && hazard.updated_at
    ? Math.floor((Date.now() - new Date(hazard.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = hazard.review_date && new Date(hazard.review_date) < new Date();

  // ── Summary area: key completed info ──
  const summaryItems = [];
  if (initScore) summaryItems.push({ label: "Initial Risk", value: `${riskLabel(initScore)} (${initScore})`, color: riskColor(initScore) });
  if (resScore) summaryItems.push({ label: "Residual Risk", value: `${riskLabel(resScore)} (${resScore})`, color: riskColor(resScore) });
  if (linkedActions?.length) {
    const openCount = linkedActions.filter(a => a.status === "open" || a.status === "in_progress").length;
    const completedCount = linkedActions.filter(a => a.status === "completed").length;
    summaryItems.push({ label: "Actions", value: `${openCount} open · ${completedCount} completed`, color: openCount > 0 ? YELLOW : GREEN });
  }
  if (hazard.review_date) summaryItems.push({ label: "Review Date", value: hazard.review_date, color: isOverdue ? RED : MUTED });

  // ── Step Modal Content Renderers ──
  const renderStepContent = (stepIndex) => {
    switch (stepIndex) {
      case 0: // Identification
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Step 1: Identification</div>
            <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 12 }}>{hazard.description}</div>
            {linkedReport && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 8, background: `${CYAN}11`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
                <span style={{ fontSize: 10, color: CYAN, fontWeight: 700 }}>{"\u26A0"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>From report {linkedReport.report_code}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{linkedReport.title}</div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 16, fontSize: 10, color: MUTED, marginTop: 8 }}>
              {hazard.source && <span>Source: {hazard.source.replace(/_/g, " ")}</span>}
              {hazard.category && <span>Category: {hazard.category.replace(/_/g, " ")}</span>}
            </div>
          </div>
        );

      case 1: // Initial Risk Assessment
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Step 2: Initial Risk Assessment</div>
            {canManage && onUpdateHazard ? (
              <div>
                <div style={{ ...card, padding: "12px 14px", marginBottom: 8 }}>
                  <RiskMatrix likelihood={initialL} severity={initialS}
                    onChange={(l, s) => { setInitialL(l); setInitialS(s); }}
                    label="Initial Risk Assessment" />
                </div>
                {onAiRiskAssess && hasFeature(org, "safety_trend_alerts") && (
                  <div data-onboarding="inv-ai-suggest" style={{ marginBottom: 8 }}>
                    <button onClick={async () => {
                      setAiRiskLoading(true); setAiRiskResult(null);
                      try {
                        const result = await onAiRiskAssess({ title: hazard.title, description: hazard.description, category: hazard.category, source: hazard.source });
                        if (result) {
                          setAiRiskResult(result);
                          if (result.initial_likelihood) setInitialL(result.initial_likelihood);
                          if (result.initial_severity) setInitialS(result.initial_severity);
                        }
                      } catch { /* handled by parent */ }
                      setAiRiskLoading(false);
                    }} disabled={aiRiskLoading}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: aiRiskLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: aiRiskLoading ? 0.6 : 1 }}>
                      <span style={{ fontSize: 14 }}>{"\uD83E\uDD16"}</span> {aiRiskLoading ? "Analyzing..." : "AI Suggest Risk Scores"}
                    </button>
                    {aiRiskResult?.reasoning && (
                      <div style={{ marginTop: 6, padding: "10px 12px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: CYAN, marginBottom: 4 }}>{"\uD83E\uDD16"} AI Risk Assessment</div>
                        <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>{aiRiskResult.reasoning}</div>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => {
                  if (!initialL || !initialS) return;
                  closeModalAndUpdate(hazard.id, { initial_likelihood: initialL, initial_severity: initialS, status: "assessed" });
                  setAiRiskResult(null);
                }} disabled={!initialL || !initialS}
                  style={{ padding: "8px 18px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: (!initialL || !initialS) ? "not-allowed" : "pointer", opacity: (!initialL || !initialS) ? 0.4 : 1, fontFamily: "inherit" }}>
                  Complete Assessment
                </button>
              </div>
            ) : (
              initScore && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: riskColor(initScore) }}>{riskLabel(initScore)} Risk ({initScore})</span>
                  <span style={{ fontSize: 10, color: MUTED }}>L{hazard.initial_likelihood} × S{hazard.initial_severity}</span>
                </div>
              )
            )}
          </div>
        );

      case 2: // Risk Decision
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Step 3: Risk Decision</div>
            {canManage && onUpdateHazard && stepStatuses[2] === "active" ? (
              <div>
                <div style={{ marginBottom: 12, padding: "12px 14px", background: `${riskColor(initScore)}11`, border: `1px solid ${riskColor(initScore)}33`, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Initial Risk Score</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: riskColor(initScore), fontFamily: "Georgia,serif" }}>{initScore}</div>
                  <div style={{ fontSize: 11, color: riskColor(initScore), fontWeight: 600 }}>{riskLabel(initScore)} Risk</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => closeModalAndUpdate(hazard.id, { status: "acceptable" })}
                    style={{ flex: 1, padding: "10px 0", background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}44`, borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    Accept Risk
                  </button>
                  <button onClick={() => closeModalAndUpdate(hazard.id, { status: "unacceptable" })}
                    style={{ flex: 1, padding: "10px 0", background: `${RED}22`, color: RED, border: `1px solid ${RED}44`, borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    Requires Mitigation
                  </button>
                </div>
              </div>
            ) : (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 8,
                background: hazard.status === "acceptable" || (["monitoring", "closed"].includes(hazard.status) && !hazard.mitigations) ? `${GREEN}22` : `${RED}22`,
                color: hazard.status === "acceptable" || (["monitoring", "closed"].includes(hazard.status) && !hazard.mitigations) ? GREEN : RED,
              }}>
                {hazard.status === "acceptable" || (["monitoring", "closed"].includes(hazard.status) && !hazard.mitigations) ? "Risk Accepted" : "Requires Mitigation"}
              </span>
            )}
          </div>
        );

      case 3: // Analysis & Mitigation
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Step 4: Analysis & Mitigation</div>

            {/* Action consolidation warning */}
            {openActionCount > 15 && (
              <div style={{ padding: "10px 14px", marginBottom: 12, background: `${YELLOW}11`, border: `1px solid ${YELLOW}33`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: YELLOW, fontSize: 14 }}>{"\u26A0"}</span>
                <div style={{ fontSize: 11, color: YELLOW }}>Your organization has {openActionCount} open corrective actions — consider consolidating or closing completed ones</div>
              </div>
            )}

            {/* AI Investigation Analysis */}
            {onAiInvestigate && canManage && hasFeature(org, "safety_trend_alerts") && !aiAnalysis && (
              <button onClick={async () => {
                setAiLoading(true);
                try {
                  const result = await onAiInvestigate(hazard.id);
                  if (result) {
                    setAiAnalysis(result); setAiAnalysisCollapsed(false);
                    if (onUpdateHazard) onUpdateHazard(hazard.id, { ai_analysis: result });
                  }
                } catch { /* handled by parent */ }
                setAiLoading(false);
              }} disabled={aiLoading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", marginBottom: 8, background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: aiLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: aiLoading ? 0.6 : 1 }}>
                <span style={{ fontSize: 14 }}>{"\uD83E\uDD16"}</span> {aiLoading ? "Analyzing..." : "AI Investigation Analysis"}
              </button>
            )}
            {aiAnalysis && (
              <div style={{ marginBottom: 10, padding: "14px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: aiAnalysisCollapsed ? 0 : 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: CYAN, cursor: "pointer" }} onClick={() => setAiAnalysisCollapsed(!aiAnalysisCollapsed)}>
                    {"\uD83E\uDD16"} AI Investigation Analysis <span style={{ fontSize: 9, color: MUTED, marginLeft: 4 }}>{aiAnalysisCollapsed ? "\u25B8 Show" : "\u25BE"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!aiAnalysisCollapsed && <button onClick={() => setAiAnalysisCollapsed(true)} style={{ background: "none", border: "none", color: MUTED, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Collapse</button>}
                    <button onClick={() => { setAiAnalysis(null); if (onUpdateHazard) onUpdateHazard(hazard.id, { ai_analysis: null }); }} style={{ background: "none", border: "none", color: MUTED, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
                  </div>
                </div>
                {!aiAnalysisCollapsed && <>
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
                      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Suggested Mitigations (click to create action)</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {aiAnalysis.suggested_mitigations.map((m, i) => {
                          const text = typeof m === "string" ? m : m.text;
                          return (
                            <button key={i} onClick={async () => {
                              if (!onCreateActionInline) return;
                              setActionSaving(true);
                              try {
                                await onCreateActionInline({ title: text, description: typeof m === "string" ? "" : (m.rationale || ""), priority: "medium", hazardId: hazard.id, reportId: hazard.related_report_id || null });
                                setAiAnalysis(prev => {
                                  const updated = { ...prev, suggested_mitigations: prev.suggested_mitigations.filter((_, j) => j !== i) };
                                  if (onUpdateHazard) onUpdateHazard(hazard.id, { ai_analysis: updated });
                                  return updated;
                                });
                              } catch { /* parent handles */ }
                              setActionSaving(false);
                            }} disabled={actionSaving}
                              title={typeof m === "string" ? m : m.rationale}
                              style={{ padding: "5px 10px", borderRadius: 12, background: `${CYAN}15`, border: `1px solid ${CYAN}33`, color: CYAN, fontSize: 10, fontWeight: 600, cursor: actionSaving ? "wait" : "pointer", fontFamily: "inherit", textAlign: "left", maxWidth: "100%" }}>
                              + {text}
                            </button>
                          );
                        })}
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
                            {onCreateActionInline && (
                              <button onClick={async () => {
                                setActionSaving(true);
                                try {
                                  await onCreateActionInline({ title: ra.title, description: ra.description, priority: ra.priority, hazardId: hazard.id, reportId: hazard.related_report_id || null });
                                  setAiAnalysis(prev => {
                                    const updated = { ...prev, recommended_actions: prev.recommended_actions.filter((_, j) => j !== i) };
                                    if (onUpdateHazard) onUpdateHazard(hazard.id, { ai_analysis: updated });
                                    return updated;
                                  });
                                } catch { /* parent handles toast */ }
                                setActionSaving(false);
                              }} disabled={actionSaving}
                                style={{ background: "none", border: `1px solid ${GREEN}44`, borderRadius: 4, color: GREEN, fontSize: 9, fontWeight: 600, padding: "2px 8px", cursor: actionSaving ? "wait" : "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
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
                </>}
              </div>
            )}

            {/* Corrective Actions — grouped display */}
            <div style={{ marginBottom: 8 }}>
              {linkedActions && linkedActions.length > 0 && (() => {
                const openActions = linkedActions.filter(a => a.status === "open" || a.status === "in_progress" || a.status === "overdue");
                const completedActions = linkedActions.filter(a => a.status === "completed");
                return (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>
                      Corrective Actions — <span style={{ color: openActions.length > 0 ? YELLOW : GREEN }}>{openActions.length} open</span> · <span style={{ color: MUTED }}>{completedActions.length} completed</span>
                    </div>
                    {/* Open/In Progress section */}
                    {openActions.map(a => {
                      const sColor = a.status === "in_progress" ? YELLOW : a.status === "overdue" ? RED : CYAN;
                      return (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", marginBottom: 4, background: `${sColor}11`, border: `1px solid ${sColor}33`, borderRadius: 6 }}>
                          <span style={{ fontSize: 10, color: sColor, fontWeight: 700 }}>{"\u2713"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>{a.action_code} — {a.title}</div>
                            {a.assigned_to_name && <div style={{ fontSize: 9, color: MUTED }}>{a.assigned_to_name}{a.due_date ? ` · Due ${a.due_date}` : ""}</div>}
                          </div>
                          {onUpdateActionStatus && canManage ? (
                            <button onClick={(e) => {
                              e.stopPropagation();
                              const cycle = { open: "in_progress", in_progress: "completed", completed: "open" };
                              onUpdateActionStatus(a.id, cycle[a.status] || "in_progress");
                            }}
                              title={`Click to change status (${a.status?.replace(/_/g, " ")} \u2192 ${({ open: "in progress", in_progress: "completed", completed: "open" })[a.status] || "in progress"})`}
                              style={{ fontSize: 9, color: sColor, background: `${sColor}22`, padding: "2px 8px", borderRadius: 8, border: `1px solid ${sColor}44`, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {a.status?.replace(/_/g, " ")}
                            </button>
                          ) : (
                            <span style={{ fontSize: 9, color: sColor, background: `${sColor}22`, padding: "2px 8px", borderRadius: 8 }}>{a.status?.replace(/_/g, " ")}</span>
                          )}
                        </div>
                      );
                    })}
                    {/* Completed section — dimmed */}
                    {completedActions.length > 0 && (
                      <div style={{ opacity: 0.5, marginTop: 4 }}>
                        {completedActions.map(a => (
                          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", marginBottom: 4, background: `${GREEN}08`, border: `1px solid ${GREEN}22`, borderRadius: 6 }}>
                            <span style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>{"\u2713"}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>{a.action_code} — {a.title}</div>
                            </div>
                            {onUpdateActionStatus && canManage ? (
                              <button onClick={(e) => {
                                e.stopPropagation();
                                onUpdateActionStatus(a.id, "open");
                              }}
                                style={{ fontSize: 9, color: GREEN, background: `${GREEN}22`, padding: "2px 8px", borderRadius: 8, border: `1px solid ${GREEN}44`, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>
                                completed
                              </button>
                            ) : (
                              <span style={{ fontSize: 9, color: GREEN, background: `${GREEN}22`, padding: "2px 8px", borderRadius: 8 }}>completed</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {canManage && (showInlineActionForm ? (
                <div style={{ ...card, padding: 12, marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: WHITE, marginBottom: 8 }}>New Corrective Action</div>
                  <input value={inlineActionForm.title} onChange={e => setInlineActionForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Action title" style={{ ...inp, marginBottom: 6 }} />
                  <textarea value={inlineActionForm.description} onChange={e => setInlineActionForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description (optional)" maxLength={10000} rows={2} style={{ ...inp, resize: "vertical", fontFamily: "inherit", marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                    <select value={inlineActionForm.priority} onChange={e => setInlineActionForm(f => ({ ...f, priority: e.target.value }))}
                      style={{ ...inp, flex: "1 1 100px" }}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <input type="date" value={inlineActionForm.dueDate} onChange={e => setInlineActionForm(f => ({ ...f, dueDate: e.target.value }))}
                      style={{ ...inp, flex: "1 1 120px" }} />
                    {orgProfiles && orgProfiles.length > 0 && (
                      <select value={inlineActionForm.assignedTo} onChange={e => setInlineActionForm(f => ({ ...f, assignedTo: e.target.value }))}
                        style={{ ...inp, flex: "1 1 120px" }}>
                        <option value="">Unassigned</option>
                        {orgProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                      </select>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => {
                      if (!inlineActionForm.title.trim() || !onCreateActionInline) return;
                      setActionSaving(true);
                      try {
                        await onCreateActionInline({
                          title: inlineActionForm.title, description: inlineActionForm.description,
                          priority: inlineActionForm.priority, dueDate: inlineActionForm.dueDate || null,
                          assignedTo: inlineActionForm.assignedTo || null,
                          hazardId: hazard.id, reportId: hazard.related_report_id || null,
                        });
                        setInlineActionForm({ title: "", description: "", priority: "medium", dueDate: "", assignedTo: "" });
                        setShowInlineActionForm(false);
                      } catch { /* parent handles */ }
                      setActionSaving(false);
                    }} disabled={!inlineActionForm.title.trim() || actionSaving}
                      style={{ padding: "6px 14px", background: GREEN, color: BLACK, border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!inlineActionForm.title.trim() || actionSaving) ? 0.5 : 1 }}>
                      {actionSaving ? "Creating..." : "Create"}
                    </button>
                    <button onClick={() => { setShowInlineActionForm(false); setInlineActionForm({ title: "", description: "", priority: "medium", dueDate: "", assignedTo: "" }); }}
                      style={{ padding: "6px 14px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowInlineActionForm(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", marginTop: 4, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: GREEN, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 14 }}>{"\u2713"}</span> Create Corrective Action
                </button>
              ))}
            </div>
          </div>
        );

      case 4: // Residual Risk
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Step 5: Residual Risk Assessment</div>
            {canManage && onUpdateHazard ? (
              <div>
                <div style={{ ...card, padding: "12px 14px", marginBottom: 8 }}>
                  <RiskMatrix likelihood={residualL} severity={residualS}
                    onChange={(l, s) => { setResidualL(l); setResidualS(s); }}
                    label="Residual Risk" />
                </div>
                {onAiRiskAssess && hasFeature(org, "safety_trend_alerts") && (
                  <div style={{ marginBottom: 8 }}>
                    <button onClick={async () => {
                      setAiResidualLoading(true); setAiResidualResult(null);
                      try {
                        const actionSummary = (linkedActions || []).map(a => a.title).join("; ");
                        const result = await onAiRiskAssess({ title: hazard.title, description: hazard.description, category: hazard.category, source: hazard.source, mitigations: actionSummary || hazard.mitigations });
                        if (result) {
                          setAiResidualResult(result);
                          if (result.residual_likelihood != null && result.residual_severity != null) {
                            setResidualL(result.residual_likelihood); setResidualS(result.residual_severity);
                          }
                        }
                      } catch { /* handled by parent */ }
                      setAiResidualLoading(false);
                    }} disabled={aiResidualLoading}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 10, fontWeight: 600, cursor: aiResidualLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: aiResidualLoading ? 0.6 : 1 }}>
                      <span style={{ fontSize: 12 }}>{"\uD83E\uDD16"}</span> {aiResidualLoading ? "Analyzing..." : "AI Suggest Residual Risk"}
                    </button>
                    {aiResidualResult?.reasoning && (
                      <div style={{ marginTop: 6, padding: "10px 12px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: CYAN, marginBottom: 4 }}>{"\uD83E\uDD16"} Residual Risk Assessment</div>
                        <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>{aiResidualResult.reasoning}</div>
                      </div>
                    )}
                  </div>
                )}
                {/* Initial → Residual comparison */}
                {initScore && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", background: NEAR_BLACK, borderRadius: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: riskColor(initScore) }}>{initScore}</span>
                    <span style={{ color: MUTED, fontSize: 16 }}>{"\u2192"}</span>
                    {residualL && residualS ? (
                      <span style={{ fontSize: 13, fontWeight: 700, color: riskColor(residualL * residualS) }}>{residualL * residualS} <span style={{ fontWeight: 600, fontSize: 11 }}>{riskLabel(residualL * residualS).toLowerCase()}</span></span>
                    ) : (
                      <span style={{ fontSize: 13, color: MUTED }}>—</span>
                    )}
                  </div>
                )}
                <button onClick={() => {
                  if (!residualL || !residualS) return;
                  closeModalAndUpdate(hazard.id, { residual_likelihood: residualL, residual_severity: residualS, status: "mitigated" });
                  setAiResidualResult(null);
                }} disabled={!residualL || !residualS}
                  style={{ padding: "8px 18px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: (!residualL || !residualS) ? "not-allowed" : "pointer", opacity: (!residualL || !residualS) ? 0.4 : 1, fontFamily: "inherit" }}>
                  Complete Mitigation Review
                </button>
              </div>
            ) : (
              resScore && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: riskColor(initScore) }}>{initScore}</span>
                  <span style={{ color: MUTED }}>{"\u2192"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: riskColor(resScore) }}>{resScore}</span>
                  <span style={{ fontSize: 10, color: MUTED }}>L{hazard.residual_likelihood} × S{hazard.residual_severity}</span>
                </div>
              )
            )}
          </div>
        );

      case 5: // Monitoring & Closure
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Step 6: Monitoring & Closure</div>

            {/* Overdue badge */}
            {isOverdue && (
              <div style={{ padding: "8px 14px", marginBottom: 12, background: `${RED}15`, border: `1px solid ${RED}44`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: 1 }}>OVERDUE FOR REVIEW</span>
                <span style={{ fontSize: 10, color: MUTED }}>Review was due {hazard.review_date}</span>
              </div>
            )}

            {/* Duration in monitoring */}
            {monitoringDays !== null && (
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>In monitoring for {monitoringDays} day{monitoringDays !== 1 ? "s" : ""}</div>
            )}

            {canManage && onUpdateHazard ? (
              <div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Review Date</label>
                  <input type="date" value={reviewDate} onChange={e => { setReviewDate(e.target.value); onUpdateHazard(hazard.id, { review_date: e.target.value }); }} style={{ ...inp, maxWidth: 200 }} />
                </div>

                {/* Extend Monitoring buttons */}
                {hazard.status === "monitoring" && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase" }}>Extend Monitoring</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[30, 60, 90].map(days => (
                        <button key={days} onClick={() => {
                          const base = reviewDate ? new Date(reviewDate) : new Date();
                          base.setDate(base.getDate() + days);
                          const newDate = base.toISOString().split("T")[0];
                          setReviewDate(newDate);
                          onUpdateHazard(hazard.id, { review_date: newDate });
                        }}
                          style={{ padding: "6px 12px", background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}33`, borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          +{days} days
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {hazard.status !== "monitoring" && (
                    <button onClick={() => {
                      // Auto-set review_date to 90 days out when entering monitoring
                      const updates = { status: "monitoring" };
                      if (!reviewDate) {
                        const rd = new Date();
                        rd.setDate(rd.getDate() + 90);
                        updates.review_date = rd.toISOString().split("T")[0];
                        setReviewDate(updates.review_date);
                      }
                      closeModalAndUpdate(hazard.id, updates);
                    }}
                      style={{ padding: "8px 16px", background: `${CYAN}22`, color: CYAN, border: `1px solid ${CYAN}44`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                      Move to Monitoring
                    </button>
                  )}
                  <button onClick={() => {
                    if (hazard.related_report_id) {
                      if (!confirm("This will close the linked report and notify the report submitter. Continue?")) return;
                    }
                    closeModalAndUpdate(hazard.id, { status: "closed" });
                  }}
                    style={{ padding: "8px 16px", background: `${MUTED}22`, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    {hazard.status === "monitoring" ? "Close \u2014 No Longer a Concern" : "Close Investigation"}
                  </button>
                  {hazard.status === "monitoring" && (
                    <button onClick={() => closeModalAndUpdate(hazard.id, { status: "unacceptable" })}
                      style={{ padding: "8px 16px", background: `${RED}22`, color: RED, border: `1px solid ${RED}44`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                      Reopen as Unacceptable
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        );

      case 6: // Lessons Learned
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Step 7: Lessons Learned</div>
            {/* Generate button */}
            {onGenerateLessonsLearned && canManage && hasFeature(org, "safety_trend_alerts") && (!hazard.lessons_learned || !hazard.lessons_learned.summary) && (
              <button onClick={async () => {
                setLlLoading(true);
                try { await onGenerateLessonsLearned(hazard.id); } catch { /* handled by parent */ }
                setLlLoading(false);
              }} disabled={llLoading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", marginBottom: 8, background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: llLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: llLoading ? 0.6 : 1 }}>
                <span style={{ fontSize: 14 }}>{"\uD83E\uDD16"}</span> {llLoading ? "Generating..." : "Generate Lessons Learned"}
              </button>
            )}
            {hazard.lessons_learned && hazard.lessons_learned.summary && (() => {
              const ll = hazard.lessons_learned;
              if (llEditing) {
                return (
                  <div style={{ padding: "14px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: CYAN, marginBottom: 12 }}>Edit Lessons Learned</div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Summary</div>
                      <textarea value={llDraft.summary || ""} onChange={e => setLlDraft(d => ({ ...d, summary: e.target.value }))}
                        maxLength={10000} rows={5} style={{ ...inp, resize: "vertical", fontFamily: "inherit", fontSize: 12, lineHeight: 1.6 }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Key Takeaways <span style={{ fontWeight: 400, textTransform: "none" }}>(one per line)</span></div>
                      <textarea value={(llDraft.takeaways || []).join("\n")} onChange={e => setLlDraft(d => ({ ...d, takeaways: e.target.value.split("\n") }))}
                        maxLength={10000} rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit", fontSize: 11, lineHeight: 1.6 }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Training Topics <span style={{ fontWeight: 400, textTransform: "none" }}>(one per line)</span></div>
                      <textarea value={(llDraft.training_topics || []).join("\n")} onChange={e => setLlDraft(d => ({ ...d, training_topics: e.target.value.split("\n") }))}
                        maxLength={10000} rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit", fontSize: 11, lineHeight: 1.6 }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>Prevention Tips <span style={{ fontWeight: 400, textTransform: "none" }}>(one per line)</span></div>
                      <textarea value={(llDraft.prevention_tips || []).join("\n")} onChange={e => setLlDraft(d => ({ ...d, prevention_tips: e.target.value.split("\n") }))}
                        maxLength={10000} rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit", fontSize: 11, lineHeight: 1.6 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => {
                        const cleaned = { ...llDraft, takeaways: (llDraft.takeaways || []).filter(t => t.trim()), training_topics: (llDraft.training_topics || []).filter(t => t.trim()), prevention_tips: (llDraft.prevention_tips || []).filter(t => t.trim()) };
                        onUpdateHazard(hazard.id, { lessons_learned: cleaned });
                        setLlEditing(false); setLlDraft(null);
                      }}
                        style={{ padding: "6px 14px", background: GREEN, color: BLACK, border: "none", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        Save Changes
                      </button>
                      <button onClick={() => { setLlEditing(false); setLlDraft(null); }}
                        style={{ padding: "6px 14px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }
              return (
              <div style={{ padding: "14px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: CYAN }}>Lessons Learned</div>
                  {canManage && (
                    <button onClick={() => { setLlDraft({ ...ll }); setLlEditing(true); }}
                      style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, color: MUTED, fontSize: 9, fontWeight: 600, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                      Edit
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.6, marginBottom: 12, whiteSpace: "pre-wrap" }}>{ll.summary}</div>
                {ll.takeaways?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Key Takeaways</div>
                    {ll.takeaways.map((t, i) => (
                      <div key={i} style={{ fontSize: 11, color: OFF_WHITE, padding: "4px 0 4px 10px", borderLeft: `2px solid ${CYAN}44`, marginBottom: 4, lineHeight: 1.5 }}>{t}</div>
                    ))}
                  </div>
                )}
                {ll.training_topics?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Training Topics</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ll.training_topics.map((t, i) => (
                        <span key={i} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, background: `${CYAN}15`, color: CYAN, fontWeight: 600 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {ll.prevention_tips?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", marginBottom: 6 }}>Prevention Tips</div>
                    {ll.prevention_tips.map((t, i) => (
                      <div key={i} style={{ fontSize: 11, color: OFF_WHITE, padding: "4px 0 4px 10px", borderLeft: `2px solid ${GREEN}44`, marginBottom: 4, lineHeight: 1.5 }}>{t}</div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
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
              </div>
              );
            })()}
            {/* Bulletin Preview Modal */}
            {bulletinPreview && onPublishBulletin && (() => {
              const ll = hazard.lessons_learned;
              const bulletinTitle = `Safety Bulletin: ${hazard.title}`;
              const bulletinBody = ll.summary || `Lessons learned from investigation ${hazard.hazard_code}`;
              return (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}
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
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Back button */}
      <button onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 16 }}>
        {"\u2190"} Back to Investigations
      </button>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{hazard.hazard_code}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{hazard.title}</span>
          <span style={{ background: `${status.color}22`, color: status.color, padding: "2px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, border: `1px solid ${status.color}44` }}>{status.label}</span>
          {initScore && <span style={{ background: `${riskColor(initScore)}22`, color: riskColor(initScore), padding: "2px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, border: `1px solid ${riskColor(initScore)}44` }}>{riskLabel(initScore)} ({initScore})</span>}
          {isOverdue && <span style={{ background: `${RED}22`, color: RED, padding: "2px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, border: `1px solid ${RED}44` }}>OVERDUE</span>}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: MUTED }}>
          {hazard.category && <span>{hazard.category.replace(/_/g, " ")}</span>}
          {hazard.responsible_person && <span>{hazard.responsible_person}</span>}
          {hazard.source && <span>Source: {hazard.source.replace(/_/g, " ")}</span>}
        </div>
      </div>

      {/* Horizontal Stepper */}
      <div style={{ ...card, padding: "8px 20px", marginBottom: 16 }}>
        <HorizontalStepper stepStatuses={stepStatuses} onStepClick={setActiveStepModal} />
      </div>

      {/* Summary area */}
      {summaryItems.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(summaryItems.length, 4)}, 1fr)`, gap: 8, marginBottom: 16 }} className="report-grid">
          {summaryItems.map((item, i) => (
            <div key={i} style={{ ...card, padding: "10px 14px" }}>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Step Modal */}
      {activeStepModal !== null && (
        <StepModal onClose={() => setActiveStepModal(null)}>
          {renderStepContent(activeStepModal)}
        </StepModal>
      )}
    </div>
  );
}

// ── Create Form with Duplicate Detection ────────────────────
function HazardForm({ onSubmit, onCancel, existingCount, fromReport, onAiIdentifyHazard, existingHazards, onSelectHazard, onUpdateHazard }) {
  const [form, setForm] = useState({
    title: "",
    description: fromReport ? `Source report ${fromReport.report_code}: ${fromReport.title}\n\n${fromReport.description}` : "",
    source: fromReport ? "safety_report" : "",
    category: fromReport ? fromReport.category : "other",
    responsiblePerson: "",
    relatedReportId: fromReport?.id || null,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const debounceRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    if (fromReport) return; // Don't restore draft if created from report
    try {
      const saved = localStorage.getItem("preflight_draft_hazard");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.title || parsed.description)) {
          setForm(f => ({ ...f, ...parsed }));
          setDraftSaved(true);
        }
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // Autosave draft when form changes
  useEffect(() => {
    if (fromReport) return; // Don't save drafts for report-linked forms
    if (form.title || form.description) {
      localStorage.setItem("preflight_draft_hazard", JSON.stringify(form));
      setDraftSaved(true);
    } else {
      localStorage.removeItem("preflight_draft_hazard");
      setDraftSaved(false);
    }
  }, [form, fromReport]);

  // Duplicate detection — debounced title comparison
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!form.title.trim() || !existingHazards?.length) {
        setDuplicateMatches([]);
        return;
      }
      const titleWords = normalizeTitle(form.title);
      if (titleWords.length === 0) { setDuplicateMatches([]); return; }

      const matches = existingHazards
        .map(h => {
          const hWords = normalizeTitle(h.title);
          const overlap = calcOverlap(titleWords, hWords, form.category, h.category);
          return { ...h, overlap };
        })
        .filter(h => h.overlap >= 0.4)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 3);

      setDuplicateMatches(matches);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.title, form.category, existingHazards]);

  const handleLinkExisting = (existingHazard) => {
    const newOccurrence = `\n\n--- New Occurrence ---\n${form.description || form.title}`;
    if (existingHazard.status === "closed") {
      // Reopen to identified, append description
      onUpdateHazard(existingHazard.id, {
        status: "identified",
        description: (existingHazard.description || "") + newOccurrence,
      });
    } else {
      // Just append
      onUpdateHazard(existingHazard.id, {
        description: (existingHazard.description || "") + newOccurrence,
      });
    }
    onCancel?.();
    onSelectHazard?.(existingHazard.id);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      localStorage.removeItem("preflight_draft_hazard");
      setDraftSaved(false);
      await onSubmit({ ...form, hazardCode: `HAZ-${String(existingCount + 1).padStart(3, "0")}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-onboarding="inv-form" style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>New Investigation</div>
          <div style={{ fontSize: 11, color: MUTED }}>{"\u00A7"}5.51 — Safety investigation and risk analysis</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {draftSaved && <span style={{ fontSize: 10, color: MUTED, fontStyle: "italic" }}>Draft saved</span>}
          {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
        </div>
      </div>

      {fromReport && (
        <div style={{ padding: "12px 14px", marginBottom: 16, background: `${CYAN}08`, border: `1px solid ${CYAN}33`, borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: onAiIdentifyHazard ? 10 : 0 }}>
            <span style={{ color: CYAN, fontSize: 12 }}>{"\u26A0"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>Creating from report {fromReport.report_code}</div>
              <div style={{ fontSize: 10, color: MUTED }}>{fromReport.title}</div>
            </div>
          </div>
          {onAiIdentifyHazard && (
            <div>
              <button onClick={async () => {
                setAiLoading(true); setAiResult(null);
                try {
                  const result = await onAiIdentifyHazard({
                    reportTitle: fromReport.title, reportDescription: fromReport.description,
                    reportCategory: fromReport.category, reportSeverity: fromReport.severity,
                  });
                  if (result) {
                    setAiResult(result);
                    if (result.title) set("title", result.title);
                    if (result.description) set("description", `Source report ${fromReport.report_code}: ${fromReport.title}\n\n${result.description}`);
                    if (result.category) set("category", result.category);
                  }
                } catch { /* handled by parent */ }
                setAiLoading(false);
              }} disabled={aiLoading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", border: `1px solid ${CYAN}44`, borderRadius: 6, color: CYAN, fontSize: 11, fontWeight: 600, cursor: aiLoading ? "wait" : "pointer", fontFamily: "inherit", opacity: aiLoading ? 0.6 : 1, width: "100%" }}>
                <span style={{ fontSize: 14 }}>{"\uD83E\uDD16"}</span> {aiLoading ? "Identifying underlying hazard..." : "AI Identify Underlying Hazard"}
              </button>
              {aiResult?.reasoning && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: `${CYAN}12`, border: `1px solid ${CYAN}33`, borderRadius: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: CYAN, marginBottom: 4 }}>{"\uD83E\uDD16"} AI Analysis</div>
                  <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>{aiResult.reasoning}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Investigation Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder={fromReport ? "e.g. Inadequate VFR traffic separation in practice areas" : "e.g. Icing conditions on KSFF-KBOI route during winter"} style={inp} />
      </div>

      {/* Duplicate Detection Matches */}
      {duplicateMatches.length > 0 && (
        <div style={{ padding: "12px 14px", marginBottom: 12, background: `${YELLOW}11`, border: `1px solid ${YELLOW}44`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: YELLOW, marginBottom: 8 }}>{"\u26A0"} Similar investigations found:</div>
          {duplicateMatches.map(match => {
            const matchStatus = HAZARD_STATUSES.find(s => s.id === match.status) || HAZARD_STATUSES[0];
            return (
              <div key={match.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, background: `${YELLOW}08`, borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>{match.hazard_code}: "{match.title}"</div>
                  <div style={{ fontSize: 10, color: MUTED }}>
                    <span style={{ color: matchStatus.color }}>{matchStatus.label.toLowerCase()}</span> · {Math.round(match.overlap * 100)}% match
                  </div>
                </div>
                <button onClick={() => handleLinkExisting(match)}
                  style={{ padding: "4px 10px", background: `${YELLOW}22`, color: YELLOW, border: `1px solid ${YELLOW}44`, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Link to Existing
                </button>
              </div>
            );
          })}
          <div style={{ marginTop: 4, fontSize: 10, color: MUTED, fontStyle: "italic" }}>
            <span style={{ cursor: "pointer", color: OFF_WHITE }} onClick={() => setDuplicateMatches([])}>This is a New Hazard — Continue</span>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Description *</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)}
          placeholder="Describe the hazard, contributing factors, and potential consequences"
          maxLength={10000} rows={4} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }} className="report-grid">
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

      <button onClick={handleSubmit} disabled={!form.title.trim() || !form.description.trim() || submitting}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: submitting ? "wait" : "pointer", opacity: (!form.title.trim() || !form.description.trim() || submitting) ? 0.4 : 1 }}>
        {submitting ? "Submitting..." : "Register Investigation"}
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function HazardRegister({ profile, session, onCreateHazard, onUpdateHazard, hazards, fromReport, onClearFromReport, reports, actions, onCreateAction, onCreateActionInline, onUpdateActionStatus, org, onAiInvestigate, onGenerateLessonsLearned, onPublishBulletin, onCreateTrainingModule, onAiRiskAssess, onAiIdentifyHazard, orgProfiles }) {
  const [showForm, setShowForm] = useState(!!fromReport);
  const [sortBy, setSortBy] = useState("newest");
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedHazardId, setSelectedHazardId] = useState(null);

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
    if (filterStatus === "all") list = list.filter(h => h.status !== "closed");
    else if (filterStatus !== "all_including_closed") list = list.filter(h => h.status === filterStatus);
    if (sortBy === "newest") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === "risk_high") list.sort((a, b) => {
      const scoreA = (a.initial_likelihood != null && a.initial_severity != null) ? a.initial_likelihood * a.initial_severity : 0;
      const scoreB = (b.initial_likelihood != null && b.initial_severity != null) ? b.initial_likelihood * b.initial_severity : 0;
      return scoreB - scoreA;
    });
    else if (sortBy === "risk_low") list.sort((a, b) => {
      const scoreA = (a.initial_likelihood != null && a.initial_severity != null) ? a.initial_likelihood * a.initial_severity : Infinity;
      const scoreB = (b.initial_likelihood != null && b.initial_severity != null) ? b.initial_likelihood * b.initial_severity : Infinity;
      return scoreA - scoreB;
    });
    return list;
  }, [hazards, searchQ, filterStatus, sortBy]);

  const statusCounts = useMemo(() => {
    const counts = { all: 0 };
    HAZARD_STATUSES.forEach(s => { counts[s.id] = 0; });
    (hazards || []).forEach(h => {
      if (h.status !== "closed") counts.all++;
      if (counts[h.status] !== undefined) counts[h.status]++;
    });
    return counts;
  }, [hazards]);

  // Risk summary
  const riskSummary = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    (hazards || []).filter(h => h.status !== "closed" && h.initial_likelihood != null && h.initial_severity != null).forEach(h => {
      const score = h.initial_likelihood * h.initial_severity;
      if (score >= 20) counts.critical++;
      else if (score >= 15) counts.high++;
      else if (score >= 8) counts.medium++;
      else counts.low++;
    });
    return counts;
  }, [hazards]);

  // Overdue monitoring hazards
  const overdueHazards = useMemo(() => {
    const now = new Date();
    return (hazards || []).filter(h => h.status === "monitoring" && h.review_date && new Date(h.review_date) < now);
  }, [hazards]);

  // Open action count for consolidation warning
  const openActionCount = useMemo(() => {
    return (actions || []).filter(a => a.status === "open" || a.status === "in_progress").length;
  }, [actions]);

  // Has overdue monitoring — for red dot on filter tab
  const hasOverdueMonitoring = overdueHazards.length > 0;

  // ── Detail View ──
  if (selectedHazardId) {
    const hazard = (hazards || []).find(h => h.id === selectedHazardId);
    if (!hazard) {
      setSelectedHazardId(null);
      return null;
    }
    const lr = hazard.related_report_id ? linkedReports[hazard.related_report_id] : null;
    return (
      <HazardDetailView
        hazard={hazard}
        linkedReport={lr}
        linkedActions={linkedActionsMap[hazard.id]}
        onCreateAction={onCreateAction}
        onCreateActionInline={onCreateActionInline}
        onUpdateActionStatus={onUpdateActionStatus}
        onUpdateHazard={onUpdateHazard}
        canManage={canManage}
        org={org}
        onAiInvestigate={onAiInvestigate}
        onGenerateLessonsLearned={onGenerateLessonsLearned}
        onPublishBulletin={onPublishBulletin}
        onCreateTrainingModule={onCreateTrainingModule}
        onAiRiskAssess={onAiRiskAssess}
        orgProfiles={orgProfiles}
        onBack={() => setSelectedHazardId(null)}
        allActions={actions}
      />
    );
  }

  // ── Create Form ──
  if (showForm) {
    return <HazardForm
      onSubmit={(data) => { onCreateHazard(data); setShowForm(false); if (fromReport) onClearFromReport?.(); }}
      onCancel={() => { setShowForm(false); if (fromReport) onClearFromReport?.(); }}
      existingCount={hazards?.length || 0}
      fromReport={fromReport}
      onAiIdentifyHazard={onAiIdentifyHazard}
      existingHazards={hazards}
      onSelectHazard={setSelectedHazardId}
      onUpdateHazard={onUpdateHazard}
    />;
  }

  // ── List View ──
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Investigations & Hazard Register</div>
          <div style={{ fontSize: 11, color: MUTED }}>{"\u00A7"}5.53 — Hazard identification, risk assessment, and mitigation</div>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)}
            style={{ padding: "8px 18px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            + New Investigation
          </button>
        )}
      </div>

      {/* Overdue Monitoring Banner */}
      {overdueHazards.length > 0 && (
        <div style={{ padding: "12px 16px", marginBottom: 12, background: `${RED}11`, border: `1px solid ${RED}44`, borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, color: RED }}>{"\u26A0"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: RED }}>{overdueHazards.length} hazard{overdueHazards.length !== 1 ? "s" : ""} overdue for monitoring review</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {overdueHazards.slice(0, 3).map(h => (
              <button key={h.id} onClick={() => setSelectedHazardId(h.id)}
                style={{ padding: "4px 10px", background: `${RED}22`, color: RED, border: `1px solid ${RED}44`, borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {h.hazard_code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Consolidation Warning */}
      {openActionCount > 15 && (
        <div style={{ padding: "12px 16px", marginBottom: 12, background: `${YELLOW}11`, border: `1px solid ${YELLOW}44`, borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, color: YELLOW }}>{"\u26A0"}</span>
          <div style={{ fontSize: 11, color: YELLOW }}>Your organization has {openActionCount} open corrective actions — consider consolidating or closing completed ones</div>
        </div>
      )}

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
          <option value="risk_high">Risk: high {"\u2192"} low</option>
          <option value="risk_low">Risk: low {"\u2192"} high</option>
        </select>
      </div>

      {/* Status Filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => setFilterStatus("all")}
          style={{ padding: "4px 12px", borderRadius: 12, border: `1px solid ${filterStatus === "all" ? WHITE : BORDER}`, background: filterStatus === "all" ? `${WHITE}15` : "transparent", color: filterStatus === "all" ? WHITE : MUTED, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          All Open ({statusCounts.all})
        </button>
        {HAZARD_STATUSES.map(s => (
          <button key={s.id} onClick={() => setFilterStatus(s.id)}
            style={{ padding: "4px 12px", borderRadius: 12, border: `1px solid ${filterStatus === s.id ? s.color : BORDER}`, background: filterStatus === s.id ? `${s.color}22` : "transparent", color: filterStatus === s.id ? s.color : MUTED, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", position: "relative" }}>
            {s.label} ({statusCounts[s.id] || 0})
            {/* Red dot for overdue monitoring */}
            {s.id === "monitoring" && hasOverdueMonitoring && (
              <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 4, background: RED, display: "inline-block" }} />
            )}
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
        filteredHazards.map(h => (
          <HazardCard key={h.id} hazard={h}
            linkedReport={h.related_report_id ? linkedReports[h.related_report_id] : null}
            linkedActions={linkedActionsMap[h.id]}
            onSelect={setSelectedHazardId} />
        ))
      )}
    </div>
  );
}
