import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import dynamic from "next/dynamic";
const FaaAuditLog = dynamic(() => import("./FaaAuditLog"), { ssr: false });
const InternationalCompliance = dynamic(() => import("./InternationalCompliance"), { ssr: false });

const DARK = "#0A0A0A", NEAR_BLACK = "#111111", CARD = "#141414";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", AMBER = "#F59E0B", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };
const btn = (bg, color) => ({ padding: "8px 16px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", background: bg, color });
const badge = (bg, color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color, letterSpacing: 0.3 });

const STATUS_COLORS = {
  draft: { bg: "rgba(136,136,136,0.15)", color: MUTED },
  in_progress: { bg: "rgba(34,211,238,0.15)", color: CYAN },
  completed: { bg: "rgba(74,222,128,0.15)", color: GREEN },
  cancelled: { bg: "rgba(239,68,68,0.15)", color: RED },
};

const SEVERITY_COLORS = {
  observation: { bg: "rgba(136,136,136,0.15)", color: MUTED, label: "Observation" },
  minor_finding: { bg: "rgba(245,158,11,0.15)", color: AMBER, label: "Minor Finding" },
  major_finding: { bg: "rgba(239,68,68,0.15)", color: RED, label: "Major Finding" },
};

const FREQUENCY_OPTIONS = [
  { id: "monthly", label: "Monthly", months: 1 },
  { id: "quarterly", label: "Quarterly", months: 3 },
  { id: "semi_annual", label: "Semi-Annual", months: 6 },
  { id: "annual", label: "Annual", months: 12 },
];

const RESPONSE_TYPES = [
  { id: "yes_no_na", label: "Yes / No / N/A" },
  { id: "yes_no_partial_na", label: "Yes / No / Partial / N/A" },
  { id: "text", label: "Free Text" },
  { id: "numeric_1_5", label: "Numeric (1–5)" },
];

const TEMPLATE_CATEGORIES = [
  { id: "sms_evaluation", label: "SMS Evaluation" },
  { id: "flight_operations", label: "Flight Operations" },
  { id: "training", label: "Training" },
  { id: "vendor", label: "Vendor/Contractor" },
  { id: "management_review", label: "Management Review" },
  { id: "general", label: "General" },
];

// ── Pre-seeded templates ──────────────────────────────────────
export const SEED_TEMPLATES = [
  {
    name: "SMS Internal Evaluation",
    description: "Comprehensive internal evaluation of your Safety Management System per FAA Part 5 subparts A through E. Covers policy, risk management, assurance, and promotion.",
    category: "sms_evaluation",
    sections: [
      { title: "Subpart A — General", questions: [
        { text: "Does the organization have a current, documented SMS?", guidance: "14 CFR §5.21", response_type: "yes_no_na" },
        { text: "Is the SMS acceptable to the Administrator?", guidance: "Verify FAA acceptance letter on file", response_type: "yes_no_na" },
        { text: "Does the SMS address all applicable elements of Part 5?", guidance: "Review SMS manual completeness", response_type: "yes_no_na" },
      ]},
      { title: "Subpart B — Safety Policy", questions: [
        { text: "Has the accountable executive signed a safety policy statement?", guidance: "§5.23 — Must be signed and communicated", response_type: "yes_no_na" },
        { text: "Does the safety policy include a commitment to continuous improvement?", guidance: "Review policy statement content", response_type: "yes_no_na" },
        { text: "Are safety objectives documented and measurable?", guidance: "§5.23(b) — Check for defined safety objectives", response_type: "yes_no_na" },
        { text: "Is the safety policy communicated to all employees?", guidance: "Evidence of distribution and acknowledgment", response_type: "yes_no_na" },
        { text: "Are employee reporting responsibilities defined?", guidance: "§5.25 — Non-punitive reporting system", response_type: "yes_no_na" },
        { text: "Is there a process for employees to report hazards without reprisal?", guidance: "Review confidential/anonymous reporting capability", response_type: "yes_no_na" },
      ]},
      { title: "Subpart C — Safety Risk Management", questions: [
        { text: "Does the organization have a process to identify hazards?", guidance: "§5.51 — System description and hazard identification", response_type: "yes_no_na" },
        { text: "Are safety risk assessments conducted for identified hazards?", guidance: "§5.53 — Risk assessment using severity × likelihood", response_type: "yes_no_na" },
        { text: "Is there a risk matrix or equivalent tool in use?", guidance: "Check for documented risk criteria", response_type: "yes_no_na" },
        { text: "Are risk controls implemented and tracked to completion?", guidance: "§5.55 — Verify corrective actions are closed", response_type: "yes_no_na" },
      ]},
      { title: "Subpart D — Safety Assurance", questions: [
        { text: "Does the organization monitor safety performance indicators?", guidance: "§5.71 — SPIs with targets and alert levels", response_type: "yes_no_na" },
        { text: "Is there a process for internal evaluation of the SMS?", guidance: "§5.73 — This audit itself satisfies this requirement", response_type: "yes_no_na" },
        { text: "Are audit findings tracked through corrective action?", guidance: "Verify closed-loop process", response_type: "yes_no_na" },
        { text: "Does management review safety performance data regularly?", guidance: "§5.75 — Evidence of management reviews", response_type: "yes_no_na" },
      ]},
      { title: "Subpart E — Safety Promotion", questions: [
        { text: "Is initial SMS training provided to all new employees?", guidance: "§5.91 — Competencies and training", response_type: "yes_no_na" },
        { text: "Is recurrent safety training conducted?", guidance: "Check training records for currency", response_type: "yes_no_na" },
        { text: "Are safety communications distributed regularly?", guidance: "§5.93 — Safety bulletins, meetings, newsletters", response_type: "yes_no_na" },
        { text: "Do employees demonstrate awareness of the SMS and their role in it?", guidance: "Interview or survey evidence", response_type: "yes_no_na" },
      ]},
    ],
  },
  {
    name: "Flight Operations Safety Audit",
    description: "Comprehensive audit of flight operations safety covering crew compliance, dispatch procedures, MEL management, weight and balance, and fuel planning.",
    category: "flight_operations",
    sections: [
      { title: "Crew Compliance", questions: [
        { text: "Are all flight crew members current with required certificates and ratings?", guidance: "Check certificate expiry dates", response_type: "yes_no_na" },
        { text: "Are crew medical certificates current?", guidance: "Verify medical class and expiry", response_type: "yes_no_na" },
        { text: "Are flight and duty time limitations being tracked and enforced?", guidance: "Review flight time records for 30/60/90 day and calendar year limits", response_type: "yes_no_na" },
        { text: "Are crew rest requirements being met?", guidance: "14 CFR 91.1059 or applicable ops spec", response_type: "yes_no_na" },
        { text: "Are pilot proficiency checks and line checks current?", guidance: "Review check airman records", response_type: "yes_no_na" },
      ]},
      { title: "Dispatch & Flight Planning", questions: [
        { text: "Are FRATs being completed before all flights?", guidance: "Review FRAT submission rates", response_type: "yes_no_na" },
        { text: "Are weather briefings documented for each flight?", guidance: "Check for weather data in FRAT records", response_type: "yes_no_na" },
        { text: "Are NOTAMs reviewed and documented?", guidance: "Evidence of NOTAM review process", response_type: "yes_no_na" },
        { text: "Are alternate airport requirements being met?", guidance: "Review flight plans for alternate planning", response_type: "yes_no_na" },
        { text: "Is the dispatch/release process compliant with ops specs?", guidance: "Verify authorization procedures", response_type: "yes_no_na" },
      ]},
      { title: "MEL & Aircraft Status", questions: [
        { text: "Is the MEL current and FAA-approved?", guidance: "Check MEL revision date and LOA", response_type: "yes_no_na" },
        { text: "Are MEL deferrals being tracked with rectification intervals?", guidance: "Review open MEL items", response_type: "yes_no_na" },
        { text: "Are required aircraft documents on board? (ARROW)", guidance: "Airworthiness cert, Registration, Radio license, Operating limits, Weight & Balance", response_type: "yes_no_na" },
        { text: "Are aircraft inspection requirements current?", guidance: "Annual, 100-hour, progressive as applicable", response_type: "yes_no_na" },
      ]},
      { title: "Weight & Balance", questions: [
        { text: "Are weight and balance calculations performed for each flight?", guidance: "Review W&B records", response_type: "yes_no_na" },
        { text: "Are current W&B data sheets available for each aircraft?", guidance: "Check revision dates", response_type: "yes_no_na" },
        { text: "Are passenger and baggage weight estimates appropriate?", guidance: "Verify standard weights or actual weights used", response_type: "yes_no_na" },
        { text: "Are CG limits being verified within envelope?", guidance: "Review calculated CG positions", response_type: "yes_no_na" },
      ]},
      { title: "Fuel Management", questions: [
        { text: "Are fuel calculations performed and documented?", guidance: "Check fuel planning records", response_type: "yes_no_na" },
        { text: "Are adequate fuel reserves being planned?", guidance: "Verify reserve fuel meets regulatory minimums", response_type: "yes_no_na" },
        { text: "Is fuel quality being verified (sumping, contamination checks)?", guidance: "Review preflight fuel check procedures", response_type: "yes_no_na" },
        { text: "Are fuel receipts and consumption records maintained?", guidance: "Audit fuel records for accuracy", response_type: "yes_no_na" },
      ]},
    ],
  },
  {
    name: "Training Program Review",
    description: "Review of the organization's training program including initial and recurrent training, instruction quality, records management, and regulatory compliance.",
    category: "training",
    sections: [
      { title: "Training Program Structure", questions: [
        { text: "Is a formal training program documented and approved?", guidance: "Review training program manual", response_type: "yes_no_na" },
        { text: "Are training syllabi current and comprehensive?", guidance: "Check revision dates and content coverage", response_type: "yes_no_na" },
        { text: "Are training requirements defined for each position/role?", guidance: "Review role-specific training matrices", response_type: "yes_no_na" },
      ]},
      { title: "Initial Training", questions: [
        { text: "Do new employees receive SMS orientation training?", guidance: "Check onboarding records", response_type: "yes_no_na" },
        { text: "Are initial proficiency standards defined and assessed?", guidance: "Review proficiency check standards", response_type: "yes_no_na" },
        { text: "Are ground and flight training hours meeting minimums?", guidance: "Verify training time records", response_type: "yes_no_na" },
      ]},
      { title: "Recurrent Training", questions: [
        { text: "Is recurrent training conducted at required intervals?", guidance: "Review recurrent training schedule compliance", response_type: "yes_no_na" },
        { text: "Does recurrent training address recent safety issues and trends?", guidance: "Check training content for relevance", response_type: "yes_no_na" },
        { text: "Are emergency procedure reviews included in recurrent training?", guidance: "Verify emergency training content", response_type: "yes_no_na" },
      ]},
      { title: "Instruction Quality", questions: [
        { text: "Are instructors qualified and current?", guidance: "Review instructor certificates and currency", response_type: "yes_no_na" },
        { text: "Are training materials current and accurate?", guidance: "Check for outdated references", response_type: "yes_no_na" },
        { text: "Is training effectiveness evaluated?", guidance: "Review assessments, exam scores, completion rates", response_type: "yes_no_na" },
      ]},
      { title: "Records Management", questions: [
        { text: "Are individual training records maintained for all personnel?", guidance: "Verify record completeness", response_type: "yes_no_na" },
        { text: "Are training records retained for the required period?", guidance: "Check retention policy compliance", response_type: "yes_no_na" },
        { text: "Are expiring requirements tracked with advance notice?", guidance: "Review notification/alerting system", response_type: "yes_no_na" },
      ]},
    ],
  },
  {
    name: "Vendor/Contractor Assessment",
    description: "Safety assessment for third-party vendors and contractors including safety records, insurance verification, procedural compliance, and ongoing monitoring.",
    category: "vendor",
    sections: [
      { title: "Safety Record", questions: [
        { text: "Does the vendor have a documented safety program?", guidance: "Request vendor safety manual", response_type: "yes_no_na" },
        { text: "What is the vendor's accident/incident history (past 5 years)?", guidance: "Review vendor safety record", response_type: "numeric_1_5" },
        { text: "Are vendor employees appropriately trained and certified?", guidance: "Verify training and certification records", response_type: "yes_no_na" },
        { text: "Rate the vendor's overall safety culture", guidance: "Based on observations and documentation review", response_type: "numeric_1_5" },
      ]},
      { title: "Insurance & Compliance", questions: [
        { text: "Does the vendor maintain adequate insurance coverage?", guidance: "Verify certificate of insurance amounts and coverage", response_type: "yes_no_na" },
        { text: "Is insurance current and naming our organization as additional insured?", guidance: "Check certificate dates and endorsements", response_type: "yes_no_na" },
        { text: "Is the vendor compliant with applicable regulations?", guidance: "Verify FAA, DOT, OSHA compliance as applicable", response_type: "yes_no_na" },
        { text: "Are required licenses and permits current?", guidance: "Review license/permit expiry dates", response_type: "yes_no_na" },
      ]},
      { title: "Procedures & Equipment", questions: [
        { text: "Are vendor operating procedures documented?", guidance: "Review SOPs for contracted services", response_type: "yes_no_na" },
        { text: "Is vendor equipment maintained and in serviceable condition?", guidance: "Review maintenance records", response_type: "yes_no_na" },
        { text: "Rate the condition of vendor equipment and facilities", guidance: "Based on physical inspection", response_type: "numeric_1_5" },
        { text: "Does the vendor have emergency procedures?", guidance: "Review vendor ERP", response_type: "yes_no_na" },
      ]},
      { title: "Ongoing Monitoring", questions: [
        { text: "Are periodic vendor safety reviews conducted?", guidance: "Check review schedule and records", response_type: "yes_no_na" },
        { text: "Is vendor performance tracked against safety metrics?", guidance: "Review KPIs and trend data", response_type: "yes_no_na" },
        { text: "Rate overall confidence in this vendor's safety management", guidance: "Holistic assessment", response_type: "numeric_1_5" },
      ]},
    ],
  },
  {
    name: "Management Review",
    description: "Periodic management review of SMS effectiveness covering the four SMS pillars, SPI review, corrective action status, and safety culture assessment.",
    category: "management_review",
    sections: [
      { title: "Safety Policy Review", questions: [
        { text: "Is the safety policy still current and appropriate?", guidance: "Review policy statement for needed updates", response_type: "yes_no_partial_na" },
        { text: "Are safety objectives being met?", guidance: "Compare objectives against actual performance", response_type: "yes_no_partial_na" },
        { text: "Describe any needed updates to safety policy", guidance: "Document recommended changes", response_type: "text" },
      ]},
      { title: "Safety Performance Review", questions: [
        { text: "Are SPIs trending within acceptable limits?", guidance: "Review SPI dashboard data", response_type: "yes_no_partial_na" },
        { text: "Are safety targets being met?", guidance: "Compare targets against actuals", response_type: "yes_no_partial_na" },
        { text: "Summarize key safety performance trends", guidance: "Highlight positive and negative trends", response_type: "text" },
      ]},
      { title: "Corrective Action Status", questions: [
        { text: "Are corrective actions being completed on time?", guidance: "Review overdue and completion rates", response_type: "yes_no_partial_na" },
        { text: "Are corrective actions effective in mitigating identified risks?", guidance: "Review effectiveness of closed actions", response_type: "yes_no_partial_na" },
        { text: "Document any systemic corrective action issues", guidance: "Recurring themes, resource constraints", response_type: "text" },
      ]},
      { title: "Safety Culture", questions: [
        { text: "Is the safety reporting rate adequate?", guidance: "Compare reporting volume to fleet size and activity", response_type: "yes_no_partial_na" },
        { text: "Do employees feel comfortable reporting safety concerns?", guidance: "Survey results, reporting trends", response_type: "yes_no_partial_na" },
        { text: "Rate the overall safety culture maturity", guidance: "Reactive (1) → Generative (5)", response_type: "numeric_1_5" },
      ]},
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────
function generateAuditCode(existingAudits) {
  const num = (existingAudits || []).length + 1;
  return `AUDIT-${String(num).padStart(3, "0")}`;
}

function calcScore(responses, templateSnapshot) {
  let compliant = 0, nonCompliant = 0, partial = 0, total = 0;
  for (const r of responses) {
    if (!r.response || r.response === "na" || r.response === "N/A") continue;
    total++;
    if (r.response === "yes" || r.response === "Yes") compliant++;
    else if (r.response === "partial" || r.response === "Partial") { partial++; }
    else if (r.response === "no" || r.response === "No") nonCompliant++;
    else if (typeof r.response === "string" && !isNaN(Number(r.response))) {
      const v = Number(r.response);
      compliant += v / 5;
      total--; total += 1;
    } else {
      // text responses — count as neutral
      total--;
    }
  }
  if (total === 0) return 0;
  return Math.round(((compliant + partial * 0.5) / total) * 100);
}

function advanceDate(dateStr, frequency) {
  const d = new Date(dateStr);
  const f = FREQUENCY_OPTIONS.find(o => o.id === frequency);
  if (f) d.setMonth(d.getMonth() + f.months);
  return d.toISOString().split("T")[0];
}

function countQuestions(sections) {
  return (sections || []).reduce((sum, s) => sum + (s.questions || []).length, 0);
}

// ── Main Component ────────────────────────────────────────────
export default function InternalEvaluation({
  profile, session, org, orgProfiles,
  auditTemplates, iepAudits, auditSchedules,
  onCreateTemplate, onUpdateTemplate, onDeleteTemplate,
  onCreateAudit, onUpdateAudit,
  onLoadResponses, onSaveResponse, onSaveResponses,
  onCreateSchedule, onUpdateSchedule, onDeleteSchedule,
  onInitTemplates, onCreateAction, onRefreshAudits,
  // FaaAuditLog pass-through props
  frats, flights, reports, hazards, actions, policies, profiles,
  trainingRecords, smsManuals, declarations,
  onSaveDeclaration, onUpdateDeclaration, onUploadPdf,
  hasIntlCompliance, complianceFrameworks, checklistItems,
  complianceStatus, crosswalkData, onUpsertFramework,
  onDeleteFramework, onUpsertStatus, onRefreshCompliance,
  onAiGenerateChecklist, onNavigate, part5ReqStatuses,
}) {
  const [tab, setTab] = useState("part5");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [executingAudit, setExecutingAudit] = useState(null);
  const [viewingAudit, setViewingAudit] = useState(null);
  const [auditResponses, setAuditResponses] = useState([]);
  const [activeSection, setActiveSection] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ template_id: "", frequency: "quarterly", assigned_to: "", next_due_date: "" });
  const [dragIdx, setDragIdx] = useState(null);

  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const templates = auditTemplates || [];
  const audits = iepAudits || [];
  const schedules = auditSchedules || [];

  // Stats
  const completedAudits = useMemo(() => audits.filter(a => a.status === "completed"), [audits]);
  const avgScore = useMemo(() => {
    const scored = completedAudits.filter(a => a.overall_score != null);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((s, a) => s + Number(a.overall_score), 0) / scored.length);
  }, [completedAudits]);

  const openFindings = useMemo(() => {
    // Count responses with severity set across in_progress audits
    return audits.filter(a => a.status === "in_progress" || a.status === "completed")
      .reduce((ct, a) => ct, 0);
  }, [audits]);

  const dueThisMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    return schedules.filter(s => {
      if (!s.is_active || !s.next_due_date) return false;
      const d = new Date(s.next_due_date);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  }, [schedules]);

  // Trend chart data
  const trendData = useMemo(() => {
    return completedAudits
      .filter(a => a.overall_score != null && a.completed_at)
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
      .map(a => ({
        date: new Date(a.completed_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        score: Number(a.overall_score),
        name: a.title,
      }));
  }, [completedAudits]);

  // Filtered audits
  const filteredAudits = useMemo(() => {
    let list = audits;
    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    if (templateFilter !== "all") list = list.filter(a => a.template_id === templateFilter);
    return list;
  }, [audits, statusFilter, templateFilter]);

  // ── Start new audit from template ──
  const startAudit = useCallback(async (template) => {
    const snap = { name: template.name, sections: template.sections, category: template.category };
    const code = generateAuditCode(audits);
    const audit = {
      template_id: template.id,
      audit_code: code,
      title: template.name,
      status: "in_progress",
      started_at: new Date().toISOString(),
      auditor_id: session?.user?.id,
      template_snapshot: snap,
    };
    await onCreateAudit(audit);
    if (onRefreshAudits) await onRefreshAudits();
    setTab("audits");
  }, [audits, session, onCreateAudit, onRefreshAudits]);

  // ── Open audit execution ──
  const openExecution = useCallback(async (audit) => {
    const snap = audit.template_snapshot || {};
    setExecutingAudit(audit);
    setActiveSection(0);
    const { data } = await onLoadResponses(audit.id);
    if (data && data.length > 0) {
      setAuditResponses(data);
    } else {
      // Initialize responses from snapshot
      const initial = [];
      let order = 0;
      for (const sec of snap.sections || []) {
        for (const q of sec.questions || []) {
          initial.push({
            audit_id: audit.id,
            section_title: sec.title,
            question_text: q.text,
            response: null,
            finding_text: "",
            evidence: "",
            severity: null,
            corrective_action_id: null,
            sort_order: order++,
            _guidance: q.guidance,
            _response_type: q.response_type,
          });
        }
      }
      setAuditResponses(initial);
    }
  }, [onLoadResponses]);

  // ── Open completed audit detail ──
  const openDetail = useCallback(async (audit) => {
    setViewingAudit(audit);
    const { data } = await onLoadResponses(audit.id);
    setAuditResponses(data || []);
  }, [onLoadResponses]);

  // ── Save single response ──
  const saveResponse = useCallback(async (idx, updates) => {
    const updated = [...auditResponses];
    updated[idx] = { ...updated[idx], ...updates };
    setAuditResponses(updated);
    if (updated[idx].id) {
      await onSaveResponse({ id: updated[idx].id, ...updates });
    } else {
      const { data } = await onSaveResponse({
        audit_id: executingAudit.id,
        section_title: updated[idx].section_title,
        question_text: updated[idx].question_text,
        response: updated[idx].response,
        finding_text: updated[idx].finding_text || "",
        evidence: updated[idx].evidence || "",
        severity: updated[idx].severity || null,
        corrective_action_id: updated[idx].corrective_action_id || null,
        sort_order: updated[idx].sort_order,
      });
      if (data?.id) {
        updated[idx] = { ...updated[idx], id: data.id };
        setAuditResponses([...updated]);
      }
    }
  }, [auditResponses, executingAudit, onSaveResponse]);

  // ── Complete audit ──
  const completeAudit = useCallback(async () => {
    const snap = executingAudit.template_snapshot || {};
    // Enrich responses with response_type from snapshot for scoring
    const enriched = auditResponses.map(r => {
      let rType = r._response_type;
      if (!rType) {
        for (const sec of snap.sections || []) {
          const q = (sec.questions || []).find(qq => qq.text === r.question_text);
          if (q) { rType = q.response_type; break; }
        }
      }
      return { ...r, _response_type: rType };
    });
    const score = calcScore(enriched, snap);
    await onUpdateAudit(executingAudit.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      overall_score: score,
    });
    if (onRefreshAudits) await onRefreshAudits();
    setExecutingAudit(null);
    setAuditResponses([]);
  }, [executingAudit, auditResponses, onUpdateAudit, onRefreshAudits]);

  // ── PDF Export ──
  const exportPdf = useCallback((audit, responses) => {
    const snap = audit.template_snapshot || {};
    const sections = snap.sections || [];
    let html = `<html><head><title>${audit.audit_code} — ${audit.title}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#222;max-width:900px;margin:0 auto}
      h1{font-size:20px;margin-bottom:4px}h2{font-size:16px;margin-top:24px;border-bottom:1px solid #ccc;padding-bottom:4px}
      .meta{color:#666;font-size:12px;margin-bottom:16px}.q{margin:8px 0;padding:8px;border:1px solid #e0e0e0;border-radius:4px}
      .q-text{font-weight:600;font-size:13px}.q-resp{margin-top:4px;font-size:12px}.finding{color:#d32f2f;font-size:11px;margin-top:2px}
      .score{font-size:24px;font-weight:700;margin:8px 0}@media print{body{padding:0}}</style></head><body>
      <h1>${audit.audit_code}: ${audit.title}</h1>
      <div class="meta">Status: ${audit.status} | Auditor: ${(orgProfiles || []).find(p => p.id === audit.auditor_id)?.full_name || "—"} | Completed: ${audit.completed_at ? new Date(audit.completed_at).toLocaleDateString() : "—"}</div>
      ${audit.overall_score != null ? `<div class="score">Score: ${audit.overall_score}%</div>` : ""}
      ${audit.summary ? `<p>${audit.summary}</p>` : ""}`;
    for (const sec of sections) {
      html += `<h2>${sec.title}</h2>`;
      const secResponses = responses.filter(r => r.section_title === sec.title);
      for (const r of secResponses) {
        html += `<div class="q"><div class="q-text">${r.question_text}</div>`;
        html += `<div class="q-resp">Response: <strong>${r.response || "—"}</strong></div>`;
        if (r.finding_text) html += `<div class="finding">Finding: ${r.finding_text} (${r.severity || ""})</div>`;
        if (r.evidence) html += `<div class="q-resp" style="color:#555">Evidence: ${r.evidence}</div>`;
        html += `</div>`;
      }
    }
    html += `</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }, [orgProfiles]);

  // ── TEMPLATE EDITOR ─────────────────────────────────────────
  const TemplateEditor = useCallback(({ template, onSave, onCancel }) => {
    const [name, setName] = useState(template?.name || "");
    const [desc, setDesc] = useState(template?.description || "");
    const [category, setCategory] = useState(template?.category || "general");
    const [sections, setSections] = useState(template?.sections || [{ title: "Section 1", questions: [{ text: "", guidance: "", response_type: "yes_no_na" }] }]);
    const [expandedSec, setExpandedSec] = useState(0);
    const [aiChecklistLoading, setAiChecklistLoading] = useState(false);

    const addSection = () => setSections([...sections, { title: `Section ${sections.length + 1}`, questions: [{ text: "", guidance: "", response_type: "yes_no_na" }] }]);
    const removeSection = (i) => setSections(sections.filter((_, j) => j !== i));
    const updateSection = (i, key, val) => { const s = [...sections]; s[i] = { ...s[i], [key]: val }; setSections(s); };
    const addQuestion = (si) => { const s = [...sections]; s[si].questions = [...s[si].questions, { text: "", guidance: "", response_type: "yes_no_na" }]; setSections(s); };
    const removeQuestion = (si, qi) => { const s = [...sections]; s[si].questions = s[si].questions.filter((_, j) => j !== qi); setSections(s); };
    const updateQuestion = (si, qi, key, val) => { const s = [...sections]; s[si].questions = [...s[si].questions]; s[si].questions[qi] = { ...s[si].questions[qi], [key]: val }; setSections(s); };

    // DnD for sections
    const onSecDragStart = (e, i) => { e.dataTransfer.effectAllowed = "move"; setDragIdx(i); };
    const onSecDragOver = (e, i) => { e.preventDefault(); };
    const onSecDrop = (e, i) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === i) return;
      const s = [...sections];
      const [moved] = s.splice(dragIdx, 1);
      s.splice(i, 0, moved);
      setSections(s);
      setDragIdx(null);
    };

    const handleSave = () => {
      if (!name.trim()) return;
      const cleaned = sections.filter(s => s.title.trim() && s.questions.some(q => q.text.trim()));
      onSave({ name: name.trim(), description: desc.trim(), category, sections: cleaned });
    };

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: WHITE, fontSize: 16, fontWeight: 700 }}>{template?.id ? "Edit Template" : "New Template"}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancel} style={btn("transparent", MUTED)}>Cancel</button>
            <button onClick={handleSave} style={btn(WHITE, "#000")}>Save Template</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="Template name" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
              {TEMPLATE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} style={{ ...inp, minHeight: 60, resize: "vertical" }} placeholder="Template description" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: OFF_WHITE, fontWeight: 700 }}>Sections</span>
          <div style={{ display: "flex", gap: 6 }}>
            {onAiGenerateChecklist && (
              <button onClick={async () => {
                setAiChecklistLoading(true);
                try {
                  const result = await onAiGenerateChecklist({ auditScope: desc || name, auditCategory: category });
                  if (result?.sections) {
                    setSections(result.sections);
                    if (result.name && !name) setName(result.name);
                    if (result.description && !desc) setDesc(result.description);
                  }
                } catch { /* handled by parent */ }
                setAiChecklistLoading(false);
              }} disabled={aiChecklistLoading}
                style={{ ...btn("rgba(34,211,238,0.08)", CYAN), border: `1px solid ${CYAN}44`, opacity: aiChecklistLoading ? 0.6 : 1, cursor: aiChecklistLoading ? "wait" : "pointer" }}>
                {aiChecklistLoading ? "Generating..." : "🤖 AI Generate Checklist"}
              </button>
            )}
            <button onClick={addSection} style={btn("rgba(34,211,238,0.15)", CYAN)}>+ Add Section</button>
          </div>
        </div>
        {sections.map((sec, si) => (
          <div key={si} draggable onDragStart={e => onSecDragStart(e, si)} onDragOver={e => onSecDragOver(e, si)} onDrop={e => onSecDrop(e, si)}
            style={{ ...card, padding: 16, marginBottom: 12, cursor: "grab" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ color: MUTED, cursor: "grab", fontSize: 14 }}>⠿</span>
                <input value={sec.title} onChange={e => updateSection(si, "title", e.target.value)} style={{ ...inp, fontWeight: 700 }} placeholder="Section title" />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setExpandedSec(expandedSec === si ? -1 : si)} style={{ ...btn("transparent", MUTED), fontSize: 16, padding: "4px 8px" }}>{expandedSec === si ? "▾" : "▸"}</button>
                {sections.length > 1 && <button onClick={() => removeSection(si)} style={{ ...btn("transparent", RED), fontSize: 14, padding: "4px 8px" }}>✕</button>}
              </div>
            </div>
            {expandedSec === si && (
              <div style={{ marginTop: 8 }}>
                {sec.questions.map((q, qi) => (
                  <div key={qi} style={{ padding: 12, marginBottom: 8, background: DARK, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block", marginBottom: 2 }}>Question</label>
                        <textarea value={q.text} onChange={e => updateQuestion(si, qi, "text", e.target.value)} style={{ ...inp, minHeight: 36, resize: "vertical", fontSize: 12 }} placeholder="Question text" />
                      </div>
                      <div style={{ width: 160 }}>
                        <label style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block", marginBottom: 2 }}>Response Type</label>
                        <select value={q.response_type} onChange={e => updateQuestion(si, qi, "response_type", e.target.value)} style={{ ...inp, fontSize: 12 }}>
                          {RESPONSE_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
                        </select>
                      </div>
                      <button onClick={() => removeQuestion(si, qi)} style={{ ...btn("transparent", RED), fontSize: 12, padding: "4px 6px", alignSelf: "flex-end" }}>✕</button>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block", marginBottom: 2 }}>Guidance</label>
                      <input value={q.guidance || ""} onChange={e => updateQuestion(si, qi, "guidance", e.target.value)} style={{ ...inp, fontSize: 12 }} placeholder="Guidance or reference" />
                    </div>
                  </div>
                ))}
                <button onClick={() => addQuestion(si)} style={{ ...btn("rgba(255,255,255,0.06)", OFF_WHITE), width: "100%", fontSize: 11 }}>+ Add Question</button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [dragIdx]);

  // ── AUDIT EXECUTION VIEW ────────────────────────────────────
  if (executingAudit) {
    const snap = executingAudit.template_snapshot || {};
    const sections = snap.sections || [];
    const currentSec = sections[activeSection];
    const secResponses = auditResponses.filter(r => r.section_title === currentSec?.title);
    const answeredCount = auditResponses.filter(r => r.response != null && r.response !== "").length;
    const totalCount = auditResponses.length;
    const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setExecutingAudit(null); setAuditResponses([]); }} style={{ ...btn("transparent", MUTED), fontSize: 11 }}>← Back</button>
            <span style={{ color: WHITE, fontSize: 16, fontWeight: 700 }}>{executingAudit.audit_code}: {executingAudit.title}</span>
          </div>
          <button onClick={completeAudit} style={btn(GREEN, "#000")}>Complete Audit</button>
        </div>
        {/* Progress bar */}
        <div style={{ ...card, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 600 }}>{answeredCount}/{totalCount} answered</span>
            <span style={{ fontSize: 12, color: CYAN, fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: CYAN, borderRadius: 3, transition: "width 0.3s" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {/* Section sidebar */}
          <div style={{ width: 220, flexShrink: 0 }}>
            {sections.map((sec, i) => {
              const sResp = auditResponses.filter(r => r.section_title === sec.title);
              const sAnswered = sResp.filter(r => r.response != null && r.response !== "").length;
              const sTotal = sResp.length;
              const complete = sTotal > 0 && sAnswered === sTotal;
              return (
                <button key={i} onClick={() => setActiveSection(i)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", marginBottom: 4, borderRadius: 6,
                    background: i === activeSection ? "rgba(34,211,238,0.1)" : "transparent",
                    border: i === activeSection ? `1px solid rgba(34,211,238,0.3)` : `1px solid transparent`,
                    color: i === activeSection ? CYAN : OFF_WHITE, cursor: "pointer", textAlign: "left", fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: complete ? GREEN : MUTED, fontSize: 14 }}>{complete ? "✓" : "○"}</span>
                  <span style={{ flex: 1 }}>{sec.title}</span>
                  <span style={{ fontSize: 10, color: MUTED }}>{sAnswered}/{sTotal}</span>
                </button>
              );
            })}
          </div>
          {/* Questions */}
          <div style={{ flex: 1 }}>
            {currentSec && (
              <>
                <h3 style={{ margin: "0 0 12px", color: WHITE, fontSize: 15, fontWeight: 700 }}>{currentSec.title}</h3>
                {secResponses.map((r, ri) => {
                  const idx = auditResponses.findIndex(ar => ar.section_title === r.section_title && ar.question_text === r.question_text);
                  const q = (currentSec.questions || []).find(qq => qq.text === r.question_text) || {};
                  const rType = r._response_type || q.response_type || "yes_no_na";
                  const hasNegative = r.response === "no" || r.response === "No" || r.response === "partial" || r.response === "Partial";

                  const ResponseButton = ({ value, label, color }) => (
                    <button onClick={() => saveResponse(idx, { response: value })}
                      style={{ padding: "6px 14px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer",
                        background: r.response === value ? `${color}22` : "transparent",
                        border: r.response === value ? `1px solid ${color}` : `1px solid ${BORDER}`,
                        color: r.response === value ? color : MUTED }}>
                      {label}
                    </button>
                  );

                  return (
                    <div key={ri} style={{ ...card, padding: 16, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, color: WHITE, fontWeight: 600, marginBottom: 4 }}>{r.question_text}</div>
                      {q.guidance && <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>{q.guidance}</div>}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: hasNegative ? 10 : 0 }}>
                        {rType === "yes_no_na" && <>
                          <ResponseButton value="yes" label="Yes" color={GREEN} />
                          <ResponseButton value="no" label="No" color={RED} />
                          <ResponseButton value="na" label="N/A" color={MUTED} />
                        </>}
                        {rType === "yes_no_partial_na" && <>
                          <ResponseButton value="yes" label="Yes" color={GREEN} />
                          <ResponseButton value="no" label="No" color={RED} />
                          <ResponseButton value="partial" label="Partial" color={AMBER} />
                          <ResponseButton value="na" label="N/A" color={MUTED} />
                        </>}
                        {rType === "text" && (
                          <textarea value={r.response || ""} onChange={e => saveResponse(idx, { response: e.target.value })}
                            style={{ ...inp, minHeight: 60, resize: "vertical", fontSize: 12 }} placeholder="Enter response..." />
                        )}
                        {rType === "numeric_1_5" && [1, 2, 3, 4, 5].map(n => (
                          <ResponseButton key={n} value={String(n)} label={String(n)} color={n >= 4 ? GREEN : n >= 3 ? AMBER : RED} />
                        ))}
                      </div>
                      {hasNegative && (
                        <div style={{ padding: 12, background: DARK, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 10, color: AMBER, fontWeight: 700, display: "block", marginBottom: 4 }}>Finding Description</label>
                            <textarea value={r.finding_text || ""} onChange={e => saveResponse(idx, { finding_text: e.target.value })}
                              style={{ ...inp, minHeight: 48, resize: "vertical", fontSize: 12 }} placeholder="Describe the finding..." />
                          </div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Severity</label>
                              <select value={r.severity || ""} onChange={e => saveResponse(idx, { severity: e.target.value })} style={{ ...inp, fontSize: 12 }}>
                                <option value="">Select severity</option>
                                <option value="observation">Observation</option>
                                <option value="minor_finding">Minor Finding</option>
                                <option value="major_finding">Major Finding</option>
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Evidence</label>
                              <input value={r.evidence || ""} onChange={e => saveResponse(idx, { evidence: e.target.value })}
                                style={{ ...inp, fontSize: 12 }} placeholder="Supporting evidence..." />
                            </div>
                          </div>
                          {onCreateAction && (
                            <button onClick={() => {
                              onCreateAction({
                                title: `[${executingAudit.audit_code}] ${r.question_text}`,
                                description: `Finding: ${r.finding_text || "N/A"}\nSeverity: ${r.severity || "N/A"}\nEvidence: ${r.evidence || "N/A"}\nAudit: ${executingAudit.title}`,
                                source: "iep_audit",
                                source_id: executingAudit.id,
                              });
                            }} style={btn("rgba(245,158,11,0.15)", AMBER)}>
                              Create Corrective Action
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Next / Prev section navigation */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                  {activeSection > 0 && <button onClick={() => setActiveSection(activeSection - 1)} style={btn("rgba(255,255,255,0.06)", OFF_WHITE)}>← Previous Section</button>}
                  <div style={{ flex: 1 }} />
                  {activeSection < sections.length - 1 && <button onClick={() => setActiveSection(activeSection + 1)} style={btn("rgba(34,211,238,0.15)", CYAN)}>Next Section →</button>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── COMPLETED AUDIT DETAIL VIEW ─────────────────────────────
  if (viewingAudit) {
    const snap = viewingAudit.template_snapshot || {};
    const sections = snap.sections || [];
    const auditorName = (orgProfiles || []).find(p => p.id === viewingAudit.auditor_id)?.full_name || "—";
    const findings = auditResponses.filter(r => r.severity);

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setViewingAudit(null); setAuditResponses([]); }} style={{ ...btn("transparent", MUTED), fontSize: 11 }}>← Back</button>
            <span style={{ color: WHITE, fontSize: 16, fontWeight: 700 }}>{viewingAudit.audit_code}: {viewingAudit.title}</span>
          </div>
          <button onClick={() => exportPdf(viewingAudit, auditResponses)} style={btn("rgba(34,211,238,0.15)", CYAN)}>Export PDF</button>
        </div>
        {/* Summary card */}
        <div style={{ ...card, padding: 20, marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div><span style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block" }}>Score</span><span style={{ fontSize: 28, fontWeight: 800, color: (viewingAudit.overall_score || 0) >= 80 ? GREEN : (viewingAudit.overall_score || 0) >= 60 ? AMBER : RED }}>{viewingAudit.overall_score || 0}%</span></div>
          <div><span style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block" }}>Auditor</span><span style={{ fontSize: 14, color: OFF_WHITE }}>{auditorName}</span></div>
          <div><span style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block" }}>Completed</span><span style={{ fontSize: 14, color: OFF_WHITE }}>{viewingAudit.completed_at ? new Date(viewingAudit.completed_at).toLocaleDateString() : "—"}</span></div>
          <div><span style={{ fontSize: 10, color: MUTED, fontWeight: 600, display: "block" }}>Findings</span><span style={{ fontSize: 14, color: findings.length > 0 ? AMBER : GREEN }}>{findings.length}</span></div>
        </div>
        {viewingAudit.summary && <div style={{ ...card, padding: 16, marginBottom: 16 }}><span style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Summary</span><span style={{ fontSize: 13, color: OFF_WHITE }}>{viewingAudit.summary}</span></div>}
        {/* Sections */}
        {sections.map((sec, si) => {
          const secResp = auditResponses.filter(r => r.section_title === sec.title);
          return (
            <div key={si} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, color: CYAN, fontWeight: 700, marginBottom: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 6 }}>{sec.title}</h3>
              {secResp.map((r, ri) => (
                <div key={ri} style={{ padding: "10px 14px", marginBottom: 4, borderRadius: 6, background: r.severity ? "rgba(245,158,11,0.05)" : "transparent", border: `1px solid ${r.severity ? "rgba(245,158,11,0.2)" : BORDER}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{r.question_text}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.response === "yes" ? GREEN : r.response === "no" ? RED : r.response === "partial" ? AMBER : MUTED }}>{r.response || "—"}</span>
                  </div>
                  {r.finding_text && <div style={{ fontSize: 11, color: AMBER, marginTop: 4 }}>Finding: {r.finding_text}</div>}
                  {r.severity && <span style={badge(SEVERITY_COLORS[r.severity]?.bg || "", SEVERITY_COLORS[r.severity]?.color || MUTED)}>{SEVERITY_COLORS[r.severity]?.label || r.severity}</span>}
                  {r.evidence && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Evidence: {r.evidence}</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // ── TEMPLATE EDITOR VIEW ────────────────────────────────────
  if (editingTemplate !== null) {
    return <TemplateEditor
      template={editingTemplate === "new" ? null : editingTemplate}
      onSave={async (data) => {
        if (editingTemplate === "new" || !editingTemplate?.id) {
          await onCreateTemplate(data);
        } else {
          // Auto-increment version if template has been used
          const usedInAudit = audits.some(a => a.template_id === editingTemplate.id && a.status === "completed");
          const version = usedInAudit ? (editingTemplate.version || 1) + 1 : editingTemplate.version || 1;
          await onUpdateTemplate(editingTemplate.id, { ...data, version });
        }
        setEditingTemplate(null);
      }}
      onCancel={() => setEditingTemplate(null)}
    />;
  }

  // ── MAIN VIEW (Tabs) ───────────────────────────────────────
  const tabBtn = (id, label, onboardingAttr) => (
    <button key={id} data-onboarding={onboardingAttr || undefined} onClick={() => setTab(id)}
      style={{ padding: "8px 20px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
        background: tab === id ? "rgba(255,255,255,0.1)" : "transparent",
        border: tab === id ? `1px solid rgba(255,255,255,0.2)` : "1px solid transparent",
        color: tab === id ? WHITE : MUTED }}>
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {tabBtn("part5", "Part 5 Compliance", "compliance-part5-tab")}
        {tabBtn("audits", "Internal Audits")}
        {tabBtn("templates", "Templates")}
        {tabBtn("schedules", "Schedules")}
        {hasIntlCompliance && tabBtn("international", "International")}
      </div>

      {/* ── PART 5 COMPLIANCE TAB ───────────────────────────── */}
      {tab === "part5" && (
        <FaaAuditLog
          frats={frats} flights={flights} reports={reports} hazards={hazards}
          actions={actions} policies={policies} profiles={profiles}
          trainingRecords={trainingRecords} org={org} smsManuals={smsManuals}
          declarations={declarations} session={session}
          onSaveDeclaration={onSaveDeclaration} onUpdateDeclaration={onUpdateDeclaration}
          onUploadPdf={onUploadPdf}
          profile={profile} orgProfiles={orgProfiles}
          onNavigate={onNavigate}
        />
      )}

      {/* ── INTERNATIONAL TAB ───────────────────────────────── */}
      {tab === "international" && hasIntlCompliance && (
        <InternationalCompliance
          profile={profile} session={session} org={org} orgProfiles={orgProfiles}
          complianceFrameworks={complianceFrameworks} checklistItems={checklistItems}
          complianceStatus={complianceStatus} crosswalkData={crosswalkData}
          onUpsertFramework={onUpsertFramework} onDeleteFramework={onDeleteFramework}
          onUpsertStatus={onUpsertStatus} onRefresh={onRefreshCompliance}
          part5ReqStatuses={part5ReqStatuses}
        />
      )}

      {/* ── AUDITS TAB ─────────────────────────────────────── */}
      {tab === "audits" && (
        <div>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Audits", value: audits.length, color: WHITE },
              { label: "Avg Score", value: `${avgScore}%`, color: avgScore >= 80 ? GREEN : avgScore >= 60 ? AMBER : RED },
              { label: "Completed", value: completedAudits.length, color: GREEN },
              { label: "Due This Month", value: dueThisMonth, color: dueThisMonth > 0 ? AMBER : GREEN },
            ].map((s, i) => (
              <div key={i} style={{ ...card, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          {trendData.length >= 2 && (
            <div style={{ ...card, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 700, marginBottom: 12 }}>Audit Score Trend</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData}>
                  <defs><linearGradient id="iepGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/><stop offset="95%" stopColor={CYAN} stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: OFF_WHITE }} />
                  <Area type="monotone" dataKey="score" stroke={CYAN} fill="url(#iepGrad)" strokeWidth={2} dot={{ r: 3, fill: CYAN }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Filters + New button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: "auto", fontSize: 11, padding: "6px 10px" }}>
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {templates.length > 0 && (
                <select value={templateFilter} onChange={e => setTemplateFilter(e.target.value)} style={{ ...inp, width: "auto", fontSize: 11, padding: "6px 10px" }}>
                  <option value="all">All Templates</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
            {isAdmin && templates.length > 0 && (
              <div style={{ position: "relative" }}>
                <StartAuditDropdown templates={templates} onStart={startAudit} />
              </div>
            )}
          </div>

          {/* Audit list */}
          {filteredAudits.length === 0 && (
            <div style={{ ...card, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: MUTED, fontWeight: 600 }}>No audits yet</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{templates.length === 0 ? "Create a template first, or load the default templates from the Templates tab." : "Start a new audit from a template."}</div>
            </div>
          )}
          {filteredAudits.map(a => {
            const sc = STATUS_COLORS[a.status] || STATUS_COLORS.draft;
            const auditorName = (orgProfiles || []).find(p => p.id === a.auditor_id)?.full_name || "—";
            return (
              <div key={a.id} style={{ ...card, padding: 16, marginBottom: 8, cursor: "pointer" }}
                onClick={() => {
                  if (a.status === "in_progress") openExecution(a);
                  else if (a.status === "completed") openDetail(a);
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: CYAN, fontWeight: 700, fontFamily: "monospace" }}>{a.audit_code}</span>
                    <span style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{a.title}</span>
                    <span style={badge(sc.bg, sc.color)}>{a.status.replace("_", " ")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {a.overall_score != null && <span style={{ fontSize: 14, fontWeight: 800, color: a.overall_score >= 80 ? GREEN : a.overall_score >= 60 ? AMBER : RED }}>{a.overall_score}%</span>}
                    <span style={{ fontSize: 11, color: MUTED }}>{auditorName}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{a.started_at ? new Date(a.started_at).toLocaleDateString() : "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TEMPLATES TAB ──────────────────────────────────── */}
      {tab === "templates" && (
        <div>
          <div style={{ padding: "12px 16px", marginBottom: 16, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: OFF_WHITE, lineHeight: 1.6 }}>
            Create your own internal audit templates or load from a set of premade templates.
            Internal evaluations are required under <strong style={{ color: WHITE }}>14 CFR Part 5 § 5.71–5.75</strong> (Safety Assurance) to monitor safety performance and drive continuous improvement.
          </div>
          {isAdmin && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: OFF_WHITE, fontWeight: 700 }}>{templates.length} Template{templates.length !== 1 ? "s" : ""}</span>
              <div style={{ display: "flex", gap: 8 }}>
                {templates.length === 0 && onInitTemplates && (
                  <button onClick={onInitTemplates} style={btn("rgba(74,222,128,0.15)", GREEN)}>Load Default Templates</button>
                )}
                <button onClick={() => setEditingTemplate("new")} style={btn(WHITE, "#000")}>+ New Template</button>
              </div>
            </div>
          )}
          {templates.length === 0 && (
            <div style={{ ...card, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: MUTED, fontWeight: 600 }}>No templates yet</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Load the default templates or create your own.</div>
            </div>
          )}
          {templates.map(t => {
            const catLabel = TEMPLATE_CATEGORIES.find(c => c.id === t.category)?.label || t.category;
            const qCount = countQuestions(t.sections);
            return (
              <div key={t.id} style={{ ...card, padding: 16, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, color: WHITE, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{catLabel} · {qCount} questions · v{t.version || 1}</div>
                    {t.description && <div style={{ fontSize: 11, color: MUTED, marginTop: 4, maxWidth: 600 }}>{t.description}</div>}
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditingTemplate(t)} style={btn("rgba(255,255,255,0.06)", OFF_WHITE)}>Edit</button>
                      <button onClick={() => { if (confirm("Delete this template?")) onDeleteTemplate(t.id); }} style={btn("rgba(239,68,68,0.1)", RED)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SCHEDULES TAB ──────────────────────────────────── */}
      {tab === "schedules" && (
        <div>
          {isAdmin && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: OFF_WHITE, fontWeight: 700 }}>{schedules.length} Schedule{schedules.length !== 1 ? "s" : ""}</span>
              <button onClick={() => setShowNewSchedule(true)} style={btn(WHITE, "#000")}>+ New Schedule</button>
            </div>
          )}
          {showNewSchedule && (
            <div style={{ ...card, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: WHITE, fontWeight: 700, marginBottom: 12 }}>New Recurring Schedule</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Template</label>
                  <select value={scheduleForm.template_id} onChange={e => setScheduleForm({ ...scheduleForm, template_id: e.target.value })} style={inp}>
                    <option value="">Select template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Frequency</label>
                  <select value={scheduleForm.frequency} onChange={e => setScheduleForm({ ...scheduleForm, frequency: e.target.value })} style={inp}>
                    {FREQUENCY_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Assigned Auditor</label>
                  <select value={scheduleForm.assigned_to} onChange={e => setScheduleForm({ ...scheduleForm, assigned_to: e.target.value })} style={inp}>
                    <option value="">Unassigned</option>
                    {(orgProfiles || []).filter(p => ["admin", "safety_manager"].includes(p.role)).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Next Due Date</label>
                  <input type="date" value={scheduleForm.next_due_date} onChange={e => setScheduleForm({ ...scheduleForm, next_due_date: e.target.value })} style={inp} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button onClick={() => { setShowNewSchedule(false); setScheduleForm({ template_id: "", frequency: "quarterly", assigned_to: "", next_due_date: "" }); }} style={btn("transparent", MUTED)}>Cancel</button>
                <button onClick={async () => {
                  if (!scheduleForm.template_id || !scheduleForm.next_due_date) return;
                  await onCreateSchedule({
                    template_id: scheduleForm.template_id,
                    frequency: scheduleForm.frequency,
                    next_due_date: scheduleForm.next_due_date,
                    assigned_to: scheduleForm.assigned_to || null,
                  });
                  setShowNewSchedule(false);
                  setScheduleForm({ template_id: "", frequency: "quarterly", assigned_to: "", next_due_date: "" });
                }} style={btn(WHITE, "#000")}>Create Schedule</button>
              </div>
            </div>
          )}
          {schedules.length === 0 && !showNewSchedule && (
            <div style={{ ...card, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: MUTED, fontWeight: 600 }}>No schedules yet</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Create a recurring audit schedule to stay on track.</div>
            </div>
          )}
          {schedules.map(s => {
            const tmpl = templates.find(t => t.id === s.template_id);
            const assignee = (orgProfiles || []).find(p => p.id === s.assigned_to);
            const freq = FREQUENCY_OPTIONS.find(f => f.id === s.frequency);
            const dueDate = s.next_due_date ? new Date(s.next_due_date + "T00:00:00") : null;
            const now = new Date();
            const daysUntil = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null;
            const dueColor = daysUntil === null ? MUTED : daysUntil < 0 ? RED : daysUntil <= 7 ? RED : daysUntil <= 30 ? AMBER : GREEN;

            return (
              <div key={s.id} style={{ ...card, padding: 16, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, color: WHITE, fontWeight: 700 }}>{tmpl?.name || "Unknown Template"}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                      {freq?.label || s.frequency} · {assignee?.full_name || "Unassigned"} · Next:
                      <span style={{ color: dueColor, fontWeight: 700, marginLeft: 4 }}>
                        {dueDate ? dueDate.toLocaleDateString() : "—"}
                        {daysUntil !== null && daysUntil < 0 && ` (${Math.abs(daysUntil)}d overdue)`}
                        {daysUntil !== null && daysUntil >= 0 && daysUntil <= 30 && ` (${daysUntil}d)`}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {tmpl && <button onClick={() => startAudit(tmpl)} style={btn("rgba(34,211,238,0.15)", CYAN)}>Start Now</button>}
                      <button onClick={async () => {
                        await onUpdateSchedule(s.id, { is_active: !s.is_active });
                      }} style={btn("rgba(255,255,255,0.06)", s.is_active ? AMBER : GREEN)}>
                        {s.is_active ? "Pause" : "Resume"}
                      </button>
                      <button onClick={() => { if (confirm("Delete this schedule?")) onDeleteSchedule(s.id); }} style={btn("rgba(239,68,68,0.1)", RED)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Start Audit Dropdown ──────────────────────────────────────
function StartAuditDropdown({ templates, onStart }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={btn(WHITE, "#000")}>Start New Audit ▾</button>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, minWidth: 280, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 10, overflow: "hidden" }}>
          {templates.filter(t => t.is_active).map(t => (
            <button key={t.id} onClick={() => { onStart(t); setOpen(false); }}
              style={{ display: "block", width: "100%", padding: "10px 14px", border: "none", background: "transparent", color: OFF_WHITE, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${BORDER}` }}
              onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.target.style.background = "transparent"}>
              <div>{t.name}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{countQuestions(t.sections)} questions · v{t.version || 1}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
