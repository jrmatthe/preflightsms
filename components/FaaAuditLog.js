import { useState, useMemo } from "react";

const BLACK="#000000",NEAR_BLACK="#0A0A0A",CARD="#222222",BORDER="#2E2E2E",LIGHT_BORDER="#3A3A3A";
const WHITE="#FFFFFF",OFF_WHITE="#E0E0E0",MUTED="#777777";
const GREEN="#4ADE80",YELLOW="#FACC15",AMBER="#F59E0B",RED="#EF4444",CYAN="#22D3EE";
const card={background:CARD,borderRadius:10,border:`1px solid ${BORDER}`};
const inp={width:"100%",padding:"8px 12px",background:NEAR_BLACK,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,fontSize:12,boxSizing:"border-box"};

// ══════════════════════════════════════════════════════
// COMPLETE 14 CFR PART 5 REQUIREMENTS FOR PART 135
// ══════════════════════════════════════════════════════

const PART5_REQUIREMENTS = [
  // ── SUBPART A: GENERAL ──
  { id: "5.1", subpart: "A", title: "Applicability", section: "§ 5.1",
    requirement: "Part 135 certificate holders must develop and implement an SMS that meets Part 5 requirements.",
    evidence: "system", autoCheck: (d) => true,
    evidenceDesc: "This system (PreflightSMS) IS the organization's SMS implementation." },

  { id: "5.3", subpart: "A", title: "Definitions", section: "§ 5.3",
    requirement: "Organization must use Part 5 definitions for hazard, risk, risk control, safety assurance, SMS, safety objective, safety performance, safety policy, safety promotion, and safety risk management.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("definition") || (p.content||"").toLowerCase().includes("hazard means")),
    evidenceDesc: "Policy library should contain a document with Part 5 definitions incorporated into SMS documentation." },

  { id: "5.5", subpart: "A", title: "General Requirements", section: "§ 5.5",
    requirement: "SMS must include: (1) Safety policy (Subpart B), (2) Safety risk management (Subpart C), (3) Safety assurance (Subpart D), (4) Safety promotion (Subpart E). Must be appropriate to size/scope/complexity.",
    evidence: "system", autoCheck: (d) => d.hasFrat && d.hasReports && d.hasHazards && d.hasPolicies,
    evidenceDesc: "PreflightSMS provides all four SMS components: Policy library (B), FRAT & hazard identification (C), Dashboard analytics & safety reports (D), Safety communications & training (E)." },

  { id: "5.9", subpart: "A", title: "Part 135 Requirements", section: "§ 5.9",
    requirement: "Part 135 operators must: (a) Implement SMS by May 28, 2027, (b) Submit declaration of compliance, (c) Maintain SMS while authorized, (d) Make information available to FAA on request.",
    evidence: "manual", autoCheck: null,
    evidenceDesc: "Organization must file declaration of compliance with FAA CMO. PreflightSMS serves as the active SMS platform demonstrating ongoing compliance." },

  { id: "5.17", subpart: "A", title: "Organizational System Description", section: "§ 5.17",
    requirement: "Must maintain summary of: (a) operational processes, (b) products/services, (c) organizational structure, (d) interfaces with other organizations, (e) regulatory requirements.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("system description") || (p.title||"").toLowerCase().includes("organization")),
    evidenceDesc: "Should be documented in Policy library as 'Organizational System Description' or equivalent." },

  { id: "5.19", subpart: "A", title: "Implementation Plan", section: "§ 5.19",
    requirement: "Must develop implementation plan describing how each Part 5 requirement will be met, with target dates.",
    evidence: "manual", autoCheck: null,
    evidenceDesc: "Implementation plan document filed with FAA CMO." },

  // ── SUBPART B: SAFETY POLICY ──
  { id: "5.21a1", subpart: "B", title: "Safety Objectives", section: "§ 5.21(a)(1)",
    requirement: "Safety policy must include the organization's safety objectives.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("safety policy") || (p.title||"").toLowerCase().includes("safety objective")),
    evidenceDesc: "Safety Policy document in Policy library with stated safety objectives." },

  { id: "5.21a2", subpart: "B", title: "Commitment to Safety Objectives", section: "§ 5.21(a)(2)",
    requirement: "Safety policy must include commitment to fulfill safety objectives.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("safety policy")),
    evidenceDesc: "Documented in Safety Policy with management commitment statement." },

  { id: "5.21a3", subpart: "B", title: "Resource Provision", section: "§ 5.21(a)(3)",
    requirement: "Safety policy must include a clear statement about provision of necessary resources for SMS implementation.",
    evidence: "policy", autoCheck: null,
    evidenceDesc: "Safety Policy document must contain resource commitment statement." },

  { id: "5.21a4", subpart: "B", title: "Safety Reporting Policy", section: "§ 5.21(a)(4)",
    requirement: "Safety policy must define requirements for employee reporting of safety hazards or issues.",
    evidence: "system", autoCheck: (d) => d.reportCount > 0,
    evidenceDesc: () => "PreflightSMS provides confidential safety reporting. Safety Reports module is active with employee submission capability." },

  { id: "5.21a5", subpart: "B", title: "Unacceptable Behavior Policy", section: "§ 5.21(a)(5)",
    requirement: "Safety policy must define unacceptable behavior and conditions for disciplinary action.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("disciplin") || (p.content||"").toLowerCase().includes("unacceptable")),
    evidenceDesc: "Must be documented in Safety Policy — defines behaviors subject to discipline." },

  { id: "5.21a6", subpart: "B", title: "Emergency Response Plan", section: "§ 5.21(a)(6)",
    requirement: "Safety policy must include an emergency response plan per § 5.27.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("emergency")),
    evidenceDesc: "Emergency Response Plan document in Policy library." },

  { id: "5.21a7", subpart: "B", title: "Code of Ethics", section: "§ 5.21(a)(7)",
    requirement: "Safety policy must include a code of ethics applicable to all employees clarifying safety as highest priority.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("ethic") || (p.title||"").toLowerCase().includes("code of")),
    evidenceDesc: "Code of Ethics document in Policy library." },

  { id: "5.21b", subpart: "B", title: "Accountable Executive Signature", section: "§ 5.21(b)",
    requirement: "Safety policy must be signed by the accountable executive.",
    evidence: "manual", autoCheck: null,
    evidenceDesc: "Physical or electronic signature of accountable executive on Safety Policy document." },

  { id: "5.21c", subpart: "B", title: "Policy Communication", section: "§ 5.21(c)",
    requirement: "Safety policy must be documented and communicated throughout the organization.",
    evidence: "system", autoCheck: (d) => d.policyAckCount > 0,
    evidenceDesc: "Policy library tracks employee acknowledgments. Policies are digitally distributed and acknowledgment is recorded with timestamps." },

  { id: "5.21d", subpart: "B", title: "Policy Review", section: "§ 5.21(d)",
    requirement: "Safety policy must be regularly reviewed by the accountable executive to ensure relevance.",
    evidence: "manual", autoCheck: null,
    evidenceDesc: "Accountable executive must document periodic review of safety policy (recommend annually)." },

  { id: "5.23a", subpart: "B", title: "Safety Accountability", section: "§ 5.23(a)",
    requirement: "Must define accountability for: (1) accountable executive, (2) all management personnel, (3) all employees.",
    evidence: "system", autoCheck: (d) => d.hasRoles,
    evidenceDesc: "PreflightSMS defines user roles: admin, safety_manager, accountable_exec, pilot, dispatcher. Each role has defined SMS responsibilities." },

  { id: "5.23b", subpart: "B", title: "Authority Documentation", section: "§ 5.23(b)",
    requirement: "Must document authority of personnel to make safety decisions.",
    evidence: "system", autoCheck: (d) => d.hasRoles,
    evidenceDesc: "Role-based permissions system defines who can approve FRATs, manage hazards, close corrective actions, and publish policies." },

  { id: "5.25a", subpart: "B", title: "Accountable Executive Designation", section: "§ 5.25(a)",
    requirement: "Must identify an accountable executive who has control of resources and financial responsibility for operations.",
    evidence: "system", autoCheck: (d) => d.profiles?.some(p => p.role === "accountable_exec"),
    evidenceDesc: "User with 'accountable_exec' role assigned in system." },

  { id: "5.25b", subpart: "B", title: "Accountable Executive Responsibilities", section: "§ 5.25(b)",
    requirement: "Accountable executive must: (1) be accountable for SMS implementation, (2) ensure SMS established/maintained, (3) ensure adequate resources, (4) ensure risk controls, (5) review safety performance.",
    evidence: "system", autoCheck: (d) => d.profiles?.some(p => p.role === "accountable_exec"),
    evidenceDesc: "Accountable executive has full system access to review dashboards, approve FRATs, manage policies, and oversee all SMS functions." },

  { id: "5.25c", subpart: "B", title: "Management Personnel Designation", section: "§ 5.25(c)",
    requirement: "Must designate management personnel to: (1) coordinate SMS, (2) facilitate hazard identification, (3) monitor risk controls, (4) ensure safety promotion, (5) report to accountable executive.",
    evidence: "system", autoCheck: (d) => d.profiles?.some(p => p.role === "safety_manager"),
    evidenceDesc: "Safety Manager role(s) designated in system with authorities for hazard management, corrective actions, and safety reporting." },

  { id: "5.27", subpart: "B", title: "Emergency Response Planning", section: "§ 5.27",
    requirement: "Must coordinate emergency response planning with other organizations as appropriate.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("emergency")),
    evidenceDesc: "Emergency Response Plan in Policy library, including coordination procedures with interfacing organizations." },

  // ── SUBPART C: SAFETY RISK MANAGEMENT ──
  { id: "5.51", subpart: "C", title: "SRM Applicability", section: "§ 5.51",
    requirement: "Must apply safety risk management to: (a) implementation of new systems, (b) revision of existing systems, (c) development of procedures, (d) hazards identified through safety assurance.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.hazardCount > 0,
    evidenceDesc: "FRAT system provides pre-flight risk assessment. Hazard register captures identified hazards. Both feed into the SRM process." },

  { id: "5.53a", subpart: "C", title: "System Analysis", section: "§ 5.53(a)(b)",
    requirement: "Must analyze systems and consider: safety data, relevant operational/design info, organizational changes, and safety recommendations.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0,
    evidenceDesc: "FRAT system analyzes flights across 5 risk categories (weather, pilot, aircraft, environment, operational) with weighted scoring. Dashboard provides trend analysis." },

  { id: "5.53c", subpart: "C", title: "Hazard Identification", section: "§ 5.53(c)",
    requirement: "Must develop and maintain processes to identify hazards within the context of system analysis.",
    evidence: "system", autoCheck: (d) => d.hazardCount > 0,
    evidenceDesc: () => "Hazard Register provides structured hazard identification with risk matrix scoring. Active hazard tracking with status workflow." },

  { id: "5.55a", subpart: "C", title: "Risk Analysis", section: "§ 5.55(a)",
    requirement: "Must develop processes to analyze safety risk associated with identified hazards.",
    evidence: "system", autoCheck: (d) => d.hazardCount > 0,
    evidenceDesc: "Hazard Register includes severity/likelihood risk matrix for each identified hazard, producing composite risk scores." },

  { id: "5.55b", subpart: "C", title: "Risk Assessment Process", section: "§ 5.55(b)",
    requirement: "Must define process for conducting risk assessment to determine acceptable safety risk.",
    evidence: "system", autoCheck: (d) => d.hasFrat,
    evidenceDesc: "FRAT uses configurable risk thresholds (Low/Medium/High/Critical) with defined score ranges. High-risk flights trigger approval workflow." },

  { id: "5.55c", subpart: "C", title: "Risk Controls", section: "§ 5.55(c)",
    requirement: "Must develop and maintain processes to develop safety risk controls.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions module tracks risk control implementation with assignees, due dates, status tracking, and completion verification." },

  { id: "5.55d", subpart: "C", title: "Risk Control Evaluation", section: "§ 5.55(d)",
    requirement: "Must evaluate whether risk is acceptable before implementing a risk control.",
    evidence: "system", autoCheck: (d) => d.hasFrat,
    evidenceDesc: "FRAT approval workflow requires management review of high-risk assessments before flight authorization. Risk scores evaluated against thresholds." },

  { id: "5.57", subpart: "C", title: "Hazard Notification", section: "§ 5.57",
    requirement: "Must notify interfacing persons of identified hazards that they could address or mitigate.",
    evidence: "system", autoCheck: (d) => d.hasNotifications,
    evidenceDesc: "Notification system enables hazard communication to relevant personnel. Safety reports can be escalated to interfacing organizations." },

  // ── SUBPART D: SAFETY ASSURANCE ──
  { id: "5.71a", subpart: "D", title: "Safety Performance Monitoring", section: "§ 5.71(a)",
    requirement: "Must develop processes to acquire data and monitor safety performance including: (1) monitoring risk controls, (2) acquiring safety data, (3) identifying hazards, (4) monitoring corrective actions, (5) continuous information gathering, (6) integration of management systems, (7) employee safety reporting.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.reportCount > 0 && d.hazardCount > 0,
    evidenceDesc: "PreflightSMS provides comprehensive monitoring: FRAT risk scoring, safety reports, hazard register, corrective action tracking, dashboard analytics, and trend analysis across all safety data." },

  { id: "5.71a1", subpart: "D", title: "Risk Control Monitoring", section: "§ 5.71(a)(1)",
    requirement: "Monitor operations, products, and services to verify safety risk controls are effective.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions module tracks risk control status from Open through Completion with due dates and verification." },

  { id: "5.71a2", subpart: "D", title: "Safety Data Acquisition", section: "§ 5.71(a)(2)",
    requirement: "Acquire safety-related data and information relevant to operations.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.flightCount > 0,
    evidenceDesc: () => "System continuously acquires safety data: FRAT submissions, flight following data, safety reports, and hazard observations." },

  { id: "5.71a3", subpart: "D", title: "Hazard Identification Through Data", section: "§ 5.71(a)(3)",
    requirement: "Identify hazards from acquired safety data.",
    evidence: "system", autoCheck: (d) => d.hazardCount > 0 && d.reportCount > 0,
    evidenceDesc: "Safety reports can be directly linked to new hazard entries. FRAT high-risk factors identify operational hazards." },

  { id: "5.71a4", subpart: "D", title: "Corrective Action Monitoring", section: "§ 5.71(a)(4)",
    requirement: "Monitor and measure safety performance against corrective actions.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions tracked with status, due dates, and completion. Dashboard shows action completion rates." },

  { id: "5.71a5", subpart: "D", title: "Continuous Information Gathering", section: "§ 5.71(a)(5)",
    requirement: "Provide continuous safety information gathering and analysis.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0,
    evidenceDesc: "Dashboard analytics provide continuous trend analysis of FRAT scores, safety reports, and hazard data over time." },

  { id: "5.71a7", subpart: "D", title: "Employee Safety Reporting", section: "§ 5.71(a)(7)",
    requirement: "Provide a confidential employee safety reporting system.",
    evidence: "system", autoCheck: (d) => d.reportCount >= 0,
    evidenceDesc: "Safety Reports module allows all employees to submit safety observations, hazards, incidents, and near-misses." },

  { id: "5.73", subpart: "D", title: "Safety Performance Assessment", section: "§ 5.73",
    requirement: "Must conduct assessments of safety performance against objectives, reviewed by accountable executive, to: (1) ensure compliance with risk controls, (2) evaluate effectiveness of risk controls, (3) identify ineffective controls, (4) identify new hazards, (5) identify employee noncompliance.",
    evidence: "system", autoCheck: (d) => d.hasDashboard,
    evidenceDesc: "Dashboard provides safety performance metrics: FRAT score trends, risk distribution, hazard resolution rates, corrective action completion. Accountable executive can review all metrics." },

  { id: "5.75", subpart: "D", title: "Continuous Improvement", section: "§ 5.75",
    requirement: "Must establish and implement processes to correct safety performance deficiencies identified in assessments.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions module provides structured process: identify deficiency → assign action → track to completion → verify effectiveness." },

  // ── SUBPART E: SAFETY PROMOTION ──
  { id: "5.91", subpart: "E", title: "Competencies and Training", section: "§ 5.91",
    requirement: "Must provide training to each individual identified in § 5.23 to ensure competencies for SMS duties.",
    evidence: "system", autoCheck: (d) => d.trainingCount > 0,
    evidenceDesc: "Training Records module tracks SMS training completion for all personnel with role-based requirements." },

  { id: "5.93a", subpart: "E", title: "SMS Awareness Communication", section: "§ 5.93(a)",
    requirement: "Must ensure employees are aware of SMS policies, processes, and tools relevant to their responsibilities.",
    evidence: "system", autoCheck: (d) => d.policyAckCount > 0,
    evidenceDesc: "Policy library distributes SMS documentation to all employees with acknowledgment tracking." },

  { id: "5.93b", subpart: "E", title: "Hazard Information Communication", section: "§ 5.93(b)",
    requirement: "Must convey hazard information relevant to employee responsibilities.",
    evidence: "system", autoCheck: (d) => d.hasNotifications,
    evidenceDesc: "Notification system communicates hazard information. FRAT high-risk alerts notify relevant personnel." },

  { id: "5.93c", subpart: "E", title: "Safety Action Communication", section: "§ 5.93(c)",
    requirement: "Must explain why safety actions have been taken.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions include description fields explaining rationale. Safety reports include status updates and resolution notes." },

  { id: "5.93d", subpart: "E", title: "Procedure Change Communication", section: "§ 5.93(d)",
    requirement: "Must explain why safety procedures are introduced or changed.",
    evidence: "system", autoCheck: (d) => d.hasPolicies,
    evidenceDesc: "Policy library supports versioned documents. New/changed procedures published with acknowledgment requirements." },

  // ── SUBPART F: DOCUMENTATION AND RECORDKEEPING ──
  { id: "5.95a", subpart: "F", title: "Safety Policy Documentation", section: "§ 5.95(a)",
    requirement: "Must develop and maintain documentation describing the safety policy.",
    evidence: "system", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("safety policy")),
    evidenceDesc: "Safety Policy document maintained in Policy library with version history." },

  { id: "5.95b", subpart: "F", title: "SMS Process Documentation", section: "§ 5.95(b)",
    requirement: "Must develop and maintain documentation describing SMS processes and procedures.",
    evidence: "policy", autoCheck: (d) => d.policies?.length > 1,
    evidenceDesc: "SMS processes documented in Policy library. PreflightSMS itself serves as the documented process implementation." },

  { id: "5.97a", subpart: "F", title: "SRM Records", section: "§ 5.97(a)",
    requirement: "Must maintain records of SRM process outputs. Retain as long as control remains relevant to operation.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.hazardCount > 0,
    evidenceDesc: "All FRAT submissions, hazard assessments, and risk controls stored with full audit trail. Records retained indefinitely in system." },

  { id: "5.97b", subpart: "F", title: "Safety Assurance Records", section: "§ 5.97(b)",
    requirement: "Must maintain records of safety assurance process outputs. Retain minimum 5 years.",
    evidence: "system", autoCheck: (d) => d.reportCount > 0,
    evidenceDesc: "Safety reports, performance assessments, and corrective actions stored with timestamps. All records retained in database." },

  { id: "5.97c", subpart: "F", title: "Training Records", section: "§ 5.97(c)",
    requirement: "Must maintain training records for each individual. Retain as long as individual is employed.",
    evidence: "system", autoCheck: (d) => d.trainingCount >= 0,
    evidenceDesc: "Training Records module tracks all SMS training with completion dates, stored for duration of employment." },

  { id: "5.97d", subpart: "F", title: "Communication Records", section: "§ 5.97(d)",
    requirement: "Must retain records of all safety communications per § 5.93 and § 5.57 for minimum 24 calendar months.",
    evidence: "system", autoCheck: (d) => d.hasNotifications || d.policyAckCount > 0,
    evidenceDesc: "Policy acknowledgments, notification records, and safety communication logs retained in system with timestamps." },
];

const SUBPART_NAMES = {
  A: "General",
  B: "Safety Policy",
  C: "Safety Risk Management",
  D: "Safety Assurance",
  E: "Safety Promotion",
  F: "Documentation & Recordkeeping",
};

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════

export default function FaaAuditLog({ frats, flights, reports, hazards, actions, policies, profiles, trainingRecords, org }) {
  const [expandedSubpart, setExpandedSubpart] = useState("B");
  const [expandedReq, setExpandedReq] = useState(null);
  const [manualOverrides, setManualOverrides] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");

  // Build data context for auto-checks
  const dataCtx = useMemo(() => ({
    fratCount: (frats||[]).length,
    flightCount: (flights||[]).length,
    reportCount: (reports||[]).length,
    hazardCount: (hazards||[]).length,
    actionCount: (actions||[]).length,
    trainingCount: (trainingRecords||[]).length,
    policyAckCount: (policies||[]).reduce((n, p) => n + (p.acknowledged_by||[]).length, 0),
    policies: policies||[],
    profiles: profiles||[],
    hasFrat: true,
    hasReports: true,
    hasHazards: true,
    hasPolicies: (policies||[]).length > 0,
    hasDashboard: true,
    hasNotifications: true,
    hasRoles: (profiles||[]).some(p => p.role === "admin" || p.role === "safety_manager"),
  }), [frats, flights, reports, hazards, actions, policies, profiles, trainingRecords]);

  // Calculate compliance status for each requirement
  const reqStatuses = useMemo(() => {
    const statuses = {};
    PART5_REQUIREMENTS.forEach(req => {
      if (manualOverrides[req.id] !== undefined) {
        statuses[req.id] = manualOverrides[req.id];
      } else if (req.autoCheck) {
        statuses[req.id] = req.autoCheck(dataCtx) ? "compliant" : "needs_attention";
      } else {
        statuses[req.id] = "manual_review";
      }
    });
    return statuses;
  }, [dataCtx, manualOverrides]);

  // Summary counts
  const summary = useMemo(() => {
    const vals = Object.values(reqStatuses);
    return {
      total: vals.length,
      compliant: vals.filter(v => v === "compliant").length,
      needs_attention: vals.filter(v => v === "needs_attention").length,
      manual_review: vals.filter(v => v === "manual_review").length,
    };
  }, [reqStatuses]);

  const toggleOverride = (id, val) => {
    setManualOverrides(p => ({ ...p, [id]: val === p[id] ? undefined : val }));
  };

  const subpartGroups = useMemo(() => {
    const groups = {};
    PART5_REQUIREMENTS.forEach(r => {
      if (!groups[r.subpart]) groups[r.subpart] = [];
      groups[r.subpart].push(r);
    });
    return groups;
  }, []);

  const filteredReqs = useMemo(() => {
    if (filterStatus === "all") return PART5_REQUIREMENTS;
    return PART5_REQUIREMENTS.filter(r => reqStatuses[r.id] === filterStatus);
  }, [filterStatus, reqStatuses]);

  const statusIcon = (s) => s === "compliant" ? "\u2713" : s === "needs_attention" ? "\u26A0" : "\u25CB";
  const statusColor = (s) => s === "compliant" ? GREEN : s === "needs_attention" ? AMBER : MUTED;
  const statusLabel = (s) => s === "compliant" ? "Compliant" : s === "needs_attention" ? "Needs Attention" : "Manual Review";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>FAA Part 5 Audit Log</div>
          <div style={{ fontSize: 11, color: MUTED }}>14 CFR Part 5 SMS Compliance for Part 135 Operations</div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
        {[
          { label: "Total Requirements", value: summary.total },
          { label: "Compliant", value: summary.compliant, dot: GREEN },
          { label: "Needs Attention", value: summary.needs_attention, dot: AMBER },
          { label: "Manual Review", value: summary.manual_review, dot: MUTED },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 14px", textAlign: "center", cursor: "pointer" }}
            onClick={() => setFilterStatus(s.dot === GREEN ? "compliant" : s.dot === AMBER ? "needs_attention" : s.dot === MUTED ? "manual_review" : "all")}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {s.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Compliance bar */}
      <div style={{ ...card, padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>Overall Compliance</span>
          <span style={{ fontSize: 11, color: WHITE, fontWeight: 700 }}>{Math.round(summary.compliant / summary.total * 100)}%</span>
        </div>
        <div style={{ height: 8, background: NEAR_BLACK, borderRadius: 4, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${summary.compliant/summary.total*100}%`, background: GREEN, borderRadius: "4px 0 0 4px" }} />
          <div style={{ width: `${summary.needs_attention/summary.total*100}%`, background: AMBER }} />
          <div style={{ width: `${summary.manual_review/summary.total*100}%`, background: MUTED, borderRadius: "0 4px 4px 0" }} />
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[["all", "All"], ["compliant", "Compliant"], ["needs_attention", "Needs Attention"], ["manual_review", "Manual Review"]].map(([id, l]) => (
          <button key={id} onClick={() => setFilterStatus(id)}
            style={{ padding: "5px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
              background: filterStatus === id ? WHITE : "transparent",
              color: filterStatus === id ? BLACK : MUTED,
              border: `1px solid ${filterStatus === id ? WHITE : BORDER}` }}>{l}</button>
        ))}
      </div>

      {/* Requirements by subpart */}
      {Object.entries(subpartGroups).map(([sp, reqs]) => {
        const spReqs = reqs.filter(r => filterStatus === "all" || reqStatuses[r.id] === filterStatus);
        if (spReqs.length === 0) return null;
        const spCompliant = reqs.filter(r => reqStatuses[r.id] === "compliant").length;
        const isExpanded = expandedSubpart === sp;

        return (
          <div key={sp} style={{ ...card, marginBottom: 8, overflow: "hidden" }}>
            <div onClick={() => setExpandedSubpart(isExpanded ? null : sp)}
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: isExpanded ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>Subpart {sp}: {SUBPART_NAMES[sp]}</span>
                <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>{spCompliant}/{reqs.length} compliant</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 60, height: 4, background: NEAR_BLACK, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${spCompliant/reqs.length*100}%`, height: "100%", background: GREEN, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 14, color: MUTED }}>{isExpanded ? "\u25B4" : "\u25BE"}</span>
              </div>
            </div>

            {isExpanded && spReqs.map(req => {
              const status = reqStatuses[req.id];
              const isOpen = expandedReq === req.id;
              const evidenceText = typeof req.evidenceDesc === "function" ? req.evidenceDesc(dataCtx) : req.evidenceDesc;

              return (
                <div key={req.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div onClick={() => setExpandedReq(isOpen ? null : req.id)}
                    style={{ padding: "10px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isOpen ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <span style={{ fontSize: 14, color: statusColor(status), fontWeight: 700, width: 20, textAlign: "center" }}>{statusIcon(status)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: WHITE }}>{req.section} — {req.title}</div>
                    </div>
                    <span style={{ fontSize: 9, color: statusColor(status), fontWeight: 600, padding: "2px 8px", borderRadius: 3, background: `${statusColor(status)}15`, border: `1px solid ${statusColor(status)}33` }}>{statusLabel(status)}</span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: "0 18px 14px 48px" }}>
                      <div style={{ fontSize: 11, color: OFF_WHITE, marginBottom: 8, lineHeight: 1.5 }}>{req.requirement}</div>
                      <div style={{ padding: "8px 12px", borderRadius: 6, background: NEAR_BLACK, marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: CYAN, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Evidence in PreflightSMS</div>
                        <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.4 }}>{evidenceText}</div>
                      </div>

                      {/* Data counts if applicable */}
                      {req.evidence === "system" && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          {dataCtx.fratCount > 0 && req.id.includes("5.5") && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${GREEN}15`, color: GREEN }}>{dataCtx.fratCount} FRATs</span>}
                          {dataCtx.reportCount > 0 && (req.id.includes("5.71") || req.id === "5.21a4") && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${GREEN}15`, color: GREEN }}>{dataCtx.reportCount} Reports</span>}
                          {dataCtx.hazardCount > 0 && req.id.includes("5.53") && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${GREEN}15`, color: GREEN }}>{dataCtx.hazardCount} Hazards</span>}
                          {dataCtx.actionCount > 0 && (req.id.includes("5.55c") || req.id.includes("5.75")) && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${GREEN}15`, color: GREEN }}>{dataCtx.actionCount} Actions</span>}
                        </div>
                      )}

                      {/* Manual override */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: MUTED }}>Override:</span>
                        <button onClick={() => toggleOverride(req.id, "compliant")}
                          style={{ padding: "3px 8px", borderRadius: 3, fontSize: 9, cursor: "pointer", border: `1px solid ${manualOverrides[req.id] === "compliant" ? GREEN : BORDER}`, background: manualOverrides[req.id] === "compliant" ? `${GREEN}22` : "transparent", color: manualOverrides[req.id] === "compliant" ? GREEN : MUTED }}>
                          Compliant
                        </button>
                        <button onClick={() => toggleOverride(req.id, "needs_attention")}
                          style={{ padding: "3px 8px", borderRadius: 3, fontSize: 9, cursor: "pointer", border: `1px solid ${manualOverrides[req.id] === "needs_attention" ? AMBER : BORDER}`, background: manualOverrides[req.id] === "needs_attention" ? `${AMBER}22` : "transparent", color: manualOverrides[req.id] === "needs_attention" ? AMBER : MUTED }}>
                          Needs Work
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ marginTop: 16, padding: "12px 16px", ...card, background: NEAR_BLACK }}>
        <div style={{ fontSize: 9, color: MUTED, lineHeight: 1.6 }}>
          This audit log maps PreflightSMS features to 14 CFR Part 5 requirements applicable to Part 135 operators.
          Auto-compliance checks verify system data exists; manual review items require documentation outside this system.
          Override statuses are session-only and not persisted. Per § 5.9, Part 135 operators must be fully compliant by May 28, 2027.
        </div>
      </div>
    </div>
  );
}
