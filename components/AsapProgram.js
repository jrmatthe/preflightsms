import { useState, useMemo, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line } from "recharts";

const DARK = "#0A0A0A", NEAR_BLACK = "#111111", CARD_BG = "#141414";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", AMBER = "#F59E0B", CYAN = "#22D3EE";
const ASAP_BLUE = "#3B82F6";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8 };
const btn = (bg, color) => ({ padding: "8px 16px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", background: bg, color });
const badge = (bg, color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color, letterSpacing: 0.3 });

const STATUS_COLORS = {
  submitted: { bg: `${ASAP_BLUE}22`, color: ASAP_BLUE, label: "Submitted" },
  erc_review: { bg: `${AMBER}22`, color: AMBER, label: "ERC Review" },
  accepted: { bg: `${GREEN}22`, color: GREEN, label: "Accepted" },
  corrective_action: { bg: `${CYAN}22`, color: CYAN, label: "Corrective Action" },
  closed: { bg: `${MUTED}22`, color: MUTED, label: "Closed" },
  excluded: { bg: `${RED}22`, color: RED, label: "Excluded" },
};

const EVENT_TYPES = [
  { id: "deviation", label: "Deviation" },
  { id: "incident", label: "Incident" },
  { id: "hazard", label: "Hazard" },
  { id: "maintenance", label: "Maintenance" },
  { id: "airspace", label: "Airspace" },
  { id: "other", label: "Other" },
];

const FLIGHT_PHASES = [
  { id: "preflight", label: "Preflight" },
  { id: "taxi", label: "Taxi" },
  { id: "takeoff", label: "Takeoff" },
  { id: "climb", label: "Climb" },
  { id: "cruise", label: "Cruise" },
  { id: "descent", label: "Descent" },
  { id: "approach", label: "Approach" },
  { id: "landing", label: "Landing" },
  { id: "postflight", label: "Postflight" },
  { id: "ground", label: "Ground Operations" },
];

const CONTRIBUTING_FACTORS = ["Fatigue", "Training", "Communication", "Equipment", "Procedures", "Weather", "Other"];

const ERC_ROLES = [
  { id: "faa_representative", label: "FAA Representative", short: "FAA" },
  { id: "management", label: "Management Representative", short: "Mgmt" },
  { id: "employee", label: "Employee Group Representative", short: "Employee" },
];

const DISPOSITIONS = [
  { id: "accept_no_action", label: "Accept — No Action Needed" },
  { id: "accept_corrective_action", label: "Accept — Corrective Action Required" },
  { id: "exclude", label: "Exclude from ASAP" },
  { id: "refer_to_faa", label: "Refer to FAA" },
];

const RISK_SEVERITY = ["Minimal", "Minor", "Major", "Hazardous", "Catastrophic"];
const RISK_LIKELIHOOD = ["Extremely Improbable", "Improbable", "Remote", "Probable", "Frequent"];

const CA_STATUS_COLORS = {
  open: { bg: `${AMBER}22`, color: AMBER },
  in_progress: { bg: `${ASAP_BLUE}22`, color: ASAP_BLUE },
  completed: { bg: `${GREEN}22`, color: GREEN },
  overdue: { bg: `${RED}22`, color: RED },
};

function riskLevel(sev, lik) {
  const s = RISK_SEVERITY.indexOf(sev);
  const l = RISK_LIKELIHOOD.indexOf(lik);
  if (s < 0 || l < 0) return null;
  const score = (s + 1) * (l + 1);
  if (score <= 4) return { label: "Low", color: GREEN };
  if (score <= 9) return { label: "Medium", color: AMBER };
  if (score <= 16) return { label: "High", color: RED };
  return { label: "Critical", color: RED };
}

export const DEFAULT_MOU_TEXT = `MEMORANDUM OF UNDERSTANDING

AVIATION SAFETY ACTION PROGRAM (ASAP)

This Memorandum of Understanding (MOU) establishes the Aviation Safety Action Program (ASAP) in accordance with FAA Advisory Circular 120-66C. The purpose of this program is to encourage the voluntary reporting of safety issues and events that come to the attention of employees during the course of their duties.

PARTIES:
- The Certificate Holder (Operator)
- The Federal Aviation Administration (FAA)
- Employee Representative(s)

PURPOSE:
The ASAP is designed to enhance aviation safety through the prevention of accidents and incidents. The program provides a non-punitive environment that encourages employees to voluntarily report safety concerns and events.

EVENT REVIEW COMMITTEE (ERC):
The ERC shall consist of representatives from each party to this MOU. The ERC will review all ASAP reports to determine acceptance into the program and recommend appropriate corrective actions.

REPORTING PROCEDURES:
- Reports must be submitted within the designated reporting window
- Reports shall contain sufficient detail to identify the safety concern
- Reports are treated as confidential to the extent permitted by law

PROTECTION FROM DISCIPLINE:
Reports accepted into the ASAP will not be used as the basis for disciplinary action, provided the event does not involve intentional disregard for safety, criminal activity, substance abuse, or concealment.

This MOU shall remain in effect from the effective date until terminated by any party with 30 days written notice.`;

export const DEFAULT_ACCEPTANCE_CRITERIA = [
  "Report submitted within reporting window",
  "Event does not involve intentional disregard for safety",
  "Event does not involve criminal activity",
  "Event does not involve substance abuse",
  "Reporter demonstrates willingness to comply",
];

export const DEFAULT_EXCLUSION_CRITERIA = [
  "Intentional disregard for safety",
  "Criminal activity",
  "Substance abuse or impairment",
  "Concealment of an event",
  "Lack of qualification for duties performed",
];

export default function AsapProgram({
  profile, session, org, orgProfiles,
  asapConfig, asapReports, asapCorrActions, asapMeetings,
  onSaveConfig, onCreateReport, onUpdateReport, onDeleteReport,
  onFetchErcReviews, onCreateErcReview, onUpdateErcReview,
  onCreateCorrAction, onUpdateCorrAction, onDeleteCorrAction,
  onCreateMeeting, onUpdateMeeting, onDeleteMeeting,
  onRefresh, onCreateAction,
}) {
  const [view, setView] = useState("dashboard");
  const [selectedReport, setSelectedReport] = useState(null);
  const [ercReviews, setErcReviews] = useState([]);
  const [reportForm, setReportForm] = useState({});
  const [reviewForm, setReviewForm] = useState({});
  const [caForm, setCaForm] = useState({});
  const [meetingForm, setMeetingForm] = useState({});
  const [configForm, setConfigForm] = useState({});
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [dateRange, setDateRange] = useState(6);
  const [showCaForm, setShowCaForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [newAcceptance, setNewAcceptance] = useState("");
  const [newExclusion, setNewExclusion] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [deidentified, setDeidentified] = useState(false);

  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const userId = session?.user?.id;
  const reports = asapReports || [];
  const corrActions = asapCorrActions || [];
  const meetings = asapMeetings || [];
  const userName = profile?.full_name || session?.user?.email || "Unknown";

  // De-identification helpers
  const reporterMap = useMemo(() => {
    if (!deidentified) return null;
    const map = {};
    let counter = 1;
    reports.forEach(r => {
      if (r.reporter_id && !map[r.reporter_id]) { map[r.reporter_id] = `Reporter #${counter}`; counter++; }
    });
    return map;
  }, [deidentified, reports]);
  const deid = useCallback((text, field) => {
    if (!deidentified || !text) return text;
    if (field === "reporter") return reporterMap?.[text] || "Reporter #?";
    if (field === "reporter_name") return reporterMap ? (Object.values(reporterMap).find((_, i) => Object.keys(reporterMap)[i]) || "Reporter") : "Reporter";
    if (field === "tail") return "N•••••";
    if (field === "airport") return "••••";
    return text;
  }, [deidentified, reporterMap]);
  const deidReport = useCallback((r) => {
    if (!deidentified) return r;
    return { ...r, reporter_name: reporterMap?.[r.reporter_id] || "Reporter #?", tail_number: r.tail_number ? "N•••••" : null, airport: r.airport ? "••••" : null };
  }, [deidentified, reporterMap]);

  useEffect(() => {
    if (asapConfig) {
      setConfigForm({ ...asapConfig });
    } else {
      setConfigForm({
        program_name: "ASAP",
        mou_text: DEFAULT_MOU_TEXT,
        acceptance_criteria: DEFAULT_ACCEPTANCE_CRITERIA,
        exclusion_criteria: DEFAULT_EXCLUSION_CRITERIA,
        reporting_window_hours: 24,
        auto_number_prefix: "ASAP",
        erc_members: [],
      });
    }
  }, [asapConfig]);

  const loadReviews = useCallback(async (reportId) => {
    if (onFetchErcReviews) {
      const data = await onFetchErcReviews(reportId);
      setErcReviews(data || []);
    }
  }, [onFetchErcReviews]);

  const openReport = useCallback((report) => {
    setSelectedReport(report);
    setView("report_detail");
    loadReviews(report.id);
  }, [loadReviews]);

  // Stats
  const stats = useMemo(() => {
    const total = reports.length;
    const pendingErc = reports.filter(r => r.status === "submitted" || r.status === "erc_review").length;
    const openCAs = corrActions.filter(a => a.status === "open" || a.status === "in_progress").length;
    const accepted = reports.filter(r => ["accepted", "corrective_action", "closed"].includes(r.status)).length;
    const reviewed = reports.filter(r => r.status !== "submitted").length;
    const rate = reviewed > 0 ? Math.round((accepted / reviewed) * 100) : 0;
    return { total, pendingErc, openCAs, acceptanceRate: rate };
  }, [reports, corrActions]);

  const statusCounts = useMemo(() => {
    const counts = {};
    Object.keys(STATUS_COLORS).forEach(s => { counts[s] = 0; });
    reports.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    return counts;
  }, [reports]);

  // Annual review check
  const annualReviewStatus = useMemo(() => {
    const annualMeetings = meetings.filter(m => (m.decisions || []).some(d => d.type === "annual_review"));
    if (annualMeetings.length === 0) {
      const mouDate = asapConfig?.mou_effective_date;
      if (mouDate) {
        const start = new Date(mouDate);
        const now = new Date();
        const monthsSince = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (monthsSince >= 12) return { overdue: true, lastReview: null, message: "No annual program review has been conducted since the MOU effective date." };
      }
      return { overdue: false, lastReview: null, message: null };
    }
    const sorted = annualMeetings.sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date));
    const last = sorted[0];
    const lastDate = new Date(last.meeting_date);
    const now = new Date();
    const monthsSince = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());
    if (monthsSince >= 12) return { overdue: true, lastReview: lastDate, message: `Annual review overdue — last conducted ${lastDate.toLocaleDateString()}.` };
    if (monthsSince >= 10) return { overdue: false, upcoming: true, lastReview: lastDate, message: `Annual review due soon — last conducted ${lastDate.toLocaleDateString()}.` };
    return { overdue: false, lastReview: lastDate, message: null };
  }, [meetings, asapConfig]);

  // Overdue CAs check
  const overdueCAsCount = useMemo(() => {
    const now = new Date();
    return corrActions.filter(ca => ca.status !== "completed" && ca.due_date && new Date(ca.due_date) < now).length;
  }, [corrActions]);

  // ── Tab Button ──
  const tabBtn = (id, label) => (
    <button key={id} onClick={() => { setView(id); setSelectedReport(null); }}
      style={{ padding: "8px 20px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
        background: view === id ? "rgba(255,255,255,0.1)" : "transparent",
        border: view === id ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
        color: view === id ? WHITE : MUTED }}>
      {label}
    </button>
  );

  // ════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════════════
  const renderDashboard = () => (
    <div>
      {/* Annual review banner */}
      {annualReviewStatus.overdue && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, background: `${RED}12`, border: `1px solid ${RED}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: RED, marginBottom: 2 }}>Annual Program Review Required</div>
            <div style={{ fontSize: 11, color: MUTED }}>{annualReviewStatus.message} AC 120-66C requires an annual effectiveness review of the ASAP.</div>
          </div>
          {isAdmin && <button onClick={() => { setView("meetings"); setShowMeetingForm(true); setMeetingForm({ is_annual_review: true }); }} style={btn(RED, WHITE)}>Schedule Review</button>}
        </div>
      )}
      {annualReviewStatus.upcoming && !annualReviewStatus.overdue && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, background: `${AMBER}12`, border: `1px solid ${AMBER}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: AMBER, marginBottom: 2 }}>Annual Review Coming Due</div>
            <div style={{ fontSize: 11, color: MUTED }}>{annualReviewStatus.message}</div>
          </div>
          {isAdmin && <button onClick={() => { setView("meetings"); setShowMeetingForm(true); setMeetingForm({ is_annual_review: true }); }} style={btn(AMBER, "#000")}>Schedule Review</button>}
        </div>
      )}
      {/* Overdue CAs banner */}
      {overdueCAsCount > 0 && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, background: `${RED}12`, border: `1px solid ${RED}33` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RED, marginBottom: 2 }}>{overdueCAsCount} Overdue Corrective Action{overdueCAsCount > 1 ? "s" : ""}</div>
          <div style={{ fontSize: 11, color: MUTED }}>Reports with overdue corrective actions may be excluded from the program per AC 120-66C.</div>
        </div>
      )}
      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Reports", value: stats.total, color: WHITE },
          { label: "Pending ERC Review", value: stats.pendingErc, color: stats.pendingErc > 0 ? AMBER : GREEN },
          { label: "Open CAs", value: stats.openCAs, color: stats.openCAs > 0 ? AMBER : GREEN },
          { label: "Acceptance Rate", value: `${stats.acceptanceRate}%`, color: stats.acceptanceRate >= 80 ? GREEN : stats.acceptanceRate >= 50 ? AMBER : RED },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 20 }}>
        {Object.entries(STATUS_COLORS).map(([key, sc]) => (
          <div key={key} style={{ ...card, padding: 12, textAlign: "center", cursor: "pointer" }}
            onClick={() => {}}>
            <div style={{ fontSize: 18, fontWeight: 800, color: sc.color }}>{statusCounts[key]}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>{sc.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => { setView("new_report"); setReportForm({}); }} style={btn(ASAP_BLUE, WHITE)}>Submit Report</button>
        {isAdmin && <button onClick={() => setView("erc_review")} style={btn("rgba(255,255,255,0.1)", WHITE)}>ERC Review</button>}
        {isAdmin && <button onClick={() => setView("meetings")} style={btn("rgba(255,255,255,0.1)", WHITE)}>ERC Meetings</button>}
        {isAdmin && <button onClick={() => setView("setup")} style={btn("rgba(255,255,255,0.1)", WHITE)}>Setup</button>}
        {isAdmin && <button onClick={() => setView("trending")} style={btn("rgba(255,255,255,0.1)", WHITE)}>Trends</button>}
      </div>

      {/* Recent reports */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 12 }}>Recent Reports</div>
        {reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: MUTED }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>No reports yet</div>
            <div style={{ fontSize: 11 }}>Submit your first confidential safety report to get started.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Report #</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Status</th>
                  {isAdmin && <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Reporter</th>}
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 20).map(r => {
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.submitted;
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                      onClick={() => openReport(r)}>
                      <td style={{ padding: "10px", color: CYAN, fontWeight: 700, fontFamily: "monospace" }}>{r.report_number}</td>
                      <td style={{ padding: "10px", color: OFF_WHITE }}>{r.event_date ? new Date(r.event_date).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "10px", color: OFF_WHITE }}>{(EVENT_TYPES.find(e => e.id === r.event_type) || {}).label || r.event_type}</td>
                      <td style={{ padding: "10px" }}><span style={badge(sc.bg, sc.color)}>{sc.label}</span></td>
                      {isAdmin && <td style={{ padding: "10px", color: MUTED }}>{deidentified ? (reporterMap?.[r.reporter_id] || "Reporter") : (r.reporter_name || "—")}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // NEW REPORT
  // ════════════════════════════════════════════════════════════════
  const renderNewReport = () => {
    const set = (k, v) => setReportForm(f => ({ ...f, [k]: v }));
    const factors = reportForm.contributing_factors || [];
    const toggleFactor = (f) => {
      set("contributing_factors", factors.includes(f) ? factors.filter(x => x !== f) : [...factors, f]);
    };

    const handleSubmit = async () => {
      if (!reportForm.event_date || !reportForm.event_type || !reportForm.event_description) return;
      await onCreateReport({
        event_date: reportForm.event_date,
        event_type: reportForm.event_type,
        event_description: reportForm.event_description,
        flight_phase: reportForm.flight_phase || null,
        aircraft_type: reportForm.aircraft_type || null,
        tail_number: reportForm.tail_number || null,
        airport: reportForm.airport || null,
        altitude: reportForm.altitude || null,
        weather_conditions: reportForm.weather_conditions || null,
        contributing_factors: factors,
        immediate_actions_taken: reportForm.immediate_actions_taken || null,
        is_sole_source: !!reportForm.is_sole_source,
        within_reporting_window: reportForm.is_sole_source ? true : reportForm.within_reporting_window !== false,
      });
      setReportForm({});
      setView("dashboard");
    };

    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Submit ASAP Report</div>
            <div style={{ fontSize: 11, color: MUTED }}>Confidential safety report per AC 120-66C. Your identity is protected within MOU boundaries.</div>
          </div>
          <button onClick={() => setView("dashboard")} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Event Date *</label>
            <input type="date" value={reportForm.event_date || ""} onChange={e => set("event_date", e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Event Type *</label>
            <select value={reportForm.event_type || ""} onChange={e => set("event_type", e.target.value)} style={inp}>
              <option value="">Select type</option>
              {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Flight Phase</label>
            <select value={reportForm.flight_phase || ""} onChange={e => set("flight_phase", e.target.value)} style={inp}>
              <option value="">Select phase</option>
              {FLIGHT_PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Event Description *</label>
          <textarea value={reportForm.event_description || ""} onChange={e => set("event_description", e.target.value)}
            maxLength={10000} style={{ ...inp, minHeight: 100, resize: "vertical" }} placeholder="Describe the event in detail..." />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Aircraft Type</label>
            <input value={reportForm.aircraft_type || ""} onChange={e => set("aircraft_type", e.target.value)} style={inp} placeholder="e.g., Cessna 172" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Tail Number</label>
            <input value={reportForm.tail_number || ""} onChange={e => set("tail_number", e.target.value)} style={inp} placeholder="e.g., N12345" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Airport</label>
            <input value={reportForm.airport || ""} onChange={e => set("airport", e.target.value)} style={inp} placeholder="e.g., KJFK" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Altitude</label>
            <input value={reportForm.altitude || ""} onChange={e => set("altitude", e.target.value)} style={inp} placeholder="e.g., FL350" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Weather</label>
            <input value={reportForm.weather_conditions || ""} onChange={e => set("weather_conditions", e.target.value)} style={inp} placeholder="e.g., IMC, low vis" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Contributing Factors</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CONTRIBUTING_FACTORS.map(f => (
              <button key={f} onClick={() => toggleFactor(f)}
                style={{ padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: factors.includes(f) ? `${ASAP_BLUE}22` : "transparent",
                  border: factors.includes(f) ? `1px solid ${ASAP_BLUE}` : `1px solid ${BORDER}`,
                  color: factors.includes(f) ? ASAP_BLUE : MUTED }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Immediate Actions Taken</label>
          <textarea value={reportForm.immediate_actions_taken || ""} onChange={e => set("immediate_actions_taken", e.target.value)}
            maxLength={10000} style={{ ...inp, minHeight: 60, resize: "vertical" }} placeholder="Describe any immediate actions taken..." />
        </div>

        <div style={{ padding: 12, background: `${CYAN}08`, border: `1px solid ${CYAN}22`, borderRadius: 6, marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: CYAN, cursor: "pointer", fontWeight: 600, marginBottom: 4 }}>
            <input type="checkbox" checked={!!reportForm.is_sole_source}
              onChange={e => {
                set("is_sole_source", e.target.checked);
                if (e.target.checked) set("within_reporting_window", true);
              }} />
            This is a sole source report
          </label>
          <div style={{ fontSize: 10, color: MUTED, marginLeft: 22 }}>
            A sole source report is one where the FAA would have no knowledge of this event except through this ASAP report. Reporting window requirements do not apply to sole source reports.
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: OFF_WHITE, marginBottom: 20, cursor: "pointer", opacity: reportForm.is_sole_source ? 0.5 : 1 }}>
          <input type="checkbox" checked={reportForm.is_sole_source ? true : reportForm.within_reporting_window !== false}
            disabled={!!reportForm.is_sole_source}
            onChange={e => set("within_reporting_window", e.target.checked)} />
          I am reporting within the required reporting window ({asapConfig?.reporting_window_hours || 24} hours)
          {reportForm.is_sole_source && <span style={{ fontSize: 10, color: CYAN }}>(waived — sole source)</span>}
        </label>

        <button onClick={handleSubmit}
          disabled={!reportForm.event_date || !reportForm.event_type || !reportForm.event_description}
          style={{ ...btn(ASAP_BLUE, WHITE), opacity: (!reportForm.event_date || !reportForm.event_type || !reportForm.event_description) ? 0.5 : 1, width: "100%" }}>
          Submit ASAP Report
        </button>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // REPORT DETAIL
  // ════════════════════════════════════════════════════════════════
  const renderReportDetail = () => {
    if (!selectedReport) return null;
    const r = selectedReport;
    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.submitted;
    const reportCAs = corrActions.filter(ca => ca.report_id === r.id);
    const canReview = isAdmin;

    const handleStatusChange = async (newStatus) => {
      await onUpdateReport(r.id, { status: newStatus });
      setSelectedReport({ ...r, status: newStatus });
    };

    const handleSubmitReview = async () => {
      if (!reviewForm.disposition) return;
      await onCreateErcReview({
        report_id: r.id,
        reviewer_id: userId,
        reviewer_name: userName,
        meets_acceptance: reviewForm.meets_acceptance || false,
        acceptance_notes: reviewForm.acceptance_notes || "",
        meets_exclusion: reviewForm.meets_exclusion || false,
        exclusion_notes: reviewForm.exclusion_notes || "",
        sole_source_assessment: reviewForm.sole_source_assessment || "",
        risk_severity: reviewForm.risk_severity || "",
        risk_likelihood: reviewForm.risk_likelihood || "",
        risk_level: reviewForm.risk_level || "",
        recommendation: reviewForm.recommendation || "",
        recommended_action: reviewForm.recommended_action || "",
        disposition: reviewForm.disposition,
        disposition_notes: reviewForm.disposition_notes || "",
        vote: reviewForm.vote || "approve",
      });
      // Update report status based on disposition
      let newStatus = r.status;
      if (reviewForm.disposition === "exclude") newStatus = "excluded";
      else if (reviewForm.disposition === "accept_corrective_action") newStatus = "corrective_action";
      else if (reviewForm.disposition === "accept_no_action") newStatus = "accepted";
      else if (reviewForm.disposition === "refer_to_faa") newStatus = "excluded";
      if (newStatus !== r.status) {
        await onUpdateReport(r.id, { status: newStatus });
        setSelectedReport({ ...r, status: newStatus });
      }
      setReviewForm({});
      loadReviews(r.id);
    };

    const handleCreateCA = async () => {
      if (!caForm.title) return;
      const caCount = corrActions.filter(a => a.report_id === r.id).length;
      await onCreateCorrAction({
        report_id: r.id,
        action_number: `${r.report_number}-CA${String(caCount + 1).padStart(2, "0")}`,
        title: caForm.title,
        description: caForm.description || "",
        assigned_to_name: caForm.assigned_to_name || "",
        due_date: caForm.due_date || null,
      });
      setCaForm({});
      setShowCaForm(false);
    };

    const rl = reviewForm.risk_severity && reviewForm.risk_likelihood
      ? riskLevel(reviewForm.risk_severity, reviewForm.risk_likelihood)
      : null;

    return (
      <div>
        <button onClick={() => setView("dashboard")} style={{ fontSize: 11, color: MUTED, background: "none", border: "none", cursor: "pointer", marginBottom: 12 }}>
          &larr; Back to Dashboard
        </button>

        {r.is_sole_source && (
          <div style={{ padding: "8px 14px", marginBottom: 12, borderRadius: 6, background: `${CYAN}12`, border: `1px solid ${CYAN}33`, fontSize: 11, color: CYAN, fontWeight: 600 }}>
            Sole Source Report — FAA has no independent knowledge of this event. Reporting window waived.
          </div>
        )}

        <div style={{ ...card, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: CYAN, fontWeight: 700, fontFamily: "monospace", marginBottom: 4 }}>{r.report_number}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{(EVENT_TYPES.find(e => e.id === r.event_type) || {}).label || r.event_type} Report</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {r.is_sole_source && <span style={badge(`${CYAN}22`, CYAN)}>Sole Source</span>}
              <span style={badge(sc.bg, sc.color)}>{sc.label}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Event Date", value: r.event_date ? new Date(r.event_date).toLocaleDateString() : "—" },
              { label: "Date Reported", value: r.date_reported ? new Date(r.date_reported).toLocaleDateString() : "—" },
              { label: "Flight Phase", value: (FLIGHT_PHASES.find(p => p.id === r.flight_phase) || {}).label || r.flight_phase || "—" },
              { label: "Aircraft", value: r.aircraft_type || "—" },
              { label: "Tail Number", value: deidentified && r.tail_number ? "N•••••" : (r.tail_number || "—") },
              { label: "Airport", value: deidentified && r.airport ? "••••" : (r.airport || "—") },
              { label: "Altitude", value: r.altitude || "—" },
              { label: "Weather", value: r.weather_conditions || "—" },
              { label: "Sole Source", value: r.is_sole_source ? "Yes" : "No" },
              { label: "Reporting Window", value: r.is_sole_source ? "Waived (sole source)" : r.within_reporting_window ? "Yes" : "No" },
            ].map((f, i) => (
              <div key={i}>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 13, color: OFF_WHITE }}>{f.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Event Description</div>
            <div style={{ fontSize: 13, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.event_description}</div>
          </div>

          {r.contributing_factors && r.contributing_factors.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Contributing Factors</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {r.contributing_factors.map((f, i) => (
                  <span key={i} style={badge(`${ASAP_BLUE}22`, ASAP_BLUE)}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {r.immediate_actions_taken && (
            <div>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Immediate Actions Taken</div>
              <div style={{ fontSize: 13, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.immediate_actions_taken}</div>
            </div>
          )}

          {isAdmin && r.reporter_name && !deidentified && (
            <div style={{ marginTop: 12, padding: 8, background: DARK, borderRadius: 4 }}>
              <span style={{ fontSize: 10, color: MUTED }}>Reporter: </span>
              <span style={{ fontSize: 12, color: OFF_WHITE }}>{r.reporter_name}</span>
            </div>
          )}
          {isAdmin && deidentified && (
            <div style={{ marginTop: 12, padding: 8, background: DARK, borderRadius: 4 }}>
              <span style={{ fontSize: 10, color: MUTED }}>Reporter: </span>
              <span style={{ fontSize: 12, color: AMBER }}>{reporterMap?.[r.reporter_id] || "Reporter #?"}</span>
              <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>(de-identified)</span>
            </div>
          )}
        </div>

        {/* Status controls for admin */}
        {canReview && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {r.status === "submitted" && <button onClick={() => handleStatusChange("erc_review")} style={btn(AMBER, "#000")}>Move to ERC Review</button>}
            {isAdmin && <button onClick={() => { setShowCaForm(true); setCaForm({}); }} style={btn("rgba(255,255,255,0.1)", WHITE)}>Create Corrective Action</button>}
            {isAdmin && <button onClick={() => onCreateAction({ title: `ASAP ${r.report_number} corrective action`, description: r.event_description, source: "asap", source_id: r.id })} style={btn("rgba(255,255,255,0.1)", WHITE)}>Link to Org CA</button>}
          </div>
        )}

        {/* CA Form */}
        {showCaForm && (
          <div style={{ ...card, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>New Corrective Action</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Title *</label>
                <input value={caForm.title || ""} onChange={e => setCaForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="Action title" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Due Date</label>
                <input type="date" value={caForm.due_date || ""} onChange={e => setCaForm(f => ({ ...f, due_date: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Assigned To</label>
              <select value={caForm.assigned_to_name || ""} onChange={e => setCaForm(f => ({ ...f, assigned_to_name: e.target.value }))} style={inp}>
                <option value="">Select person</option>
                {(orgProfiles || []).map(p => <option key={p.id} value={p.full_name}>{p.full_name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Description</label>
              <textarea value={caForm.description || ""} onChange={e => setCaForm(f => ({ ...f, description: e.target.value }))} maxLength={10000} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleCreateCA} style={btn(GREEN, "#000")} disabled={!caForm.title}>Save</button>
              <button onClick={() => setShowCaForm(false)} style={btn("rgba(255,255,255,0.1)", MUTED)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Corrective Actions for this report */}
        {reportCAs.length > 0 && (() => {
          const now = new Date();
          const overdueCAs = reportCAs.filter(ca => ca.status !== "completed" && ca.due_date && new Date(ca.due_date) < now);
          const hasOverdue = overdueCAs.length > 0;
          return (
            <div style={{ ...card, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>Corrective Actions</div>

              {hasOverdue && r.status !== "excluded" && (
                <div style={{ padding: 12, marginBottom: 12, borderRadius: 6, background: `${RED}12`, border: `1px solid ${RED}33` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: RED, marginBottom: 4 }}>
                    {overdueCAs.length} Corrective Action{overdueCAs.length > 1 ? "s" : ""} Overdue
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
                    Per AC 120-66C, failure to complete corrective actions may result in this report being excluded from the ASAP program.
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleStatusChange("excluded")} style={btn(RED, WHITE)}>
                      Exclude Report — CA Non-Compliance
                    </button>
                  )}
                </div>
              )}

              {reportCAs.map(ca => {
                const isOverdue = ca.status !== "completed" && ca.due_date && new Date(ca.due_date) < now;
                const casc = isOverdue ? CA_STATUS_COLORS.overdue : (CA_STATUS_COLORS[ca.status] || CA_STATUS_COLORS.open);
                return (
                  <div key={ca.id} style={{ padding: 12, background: DARK, borderRadius: 6, border: `1px solid ${isOverdue ? `${RED}44` : BORDER}`, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: CYAN, fontWeight: 700, fontFamily: "monospace" }}>{ca.action_number}</span>
                        <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{ca.title}</span>
                      </div>
                      <span style={badge(casc.bg, casc.color)}>{isOverdue ? "Overdue" : ca.status}</span>
                    </div>
                    {ca.description && <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{ca.description}</div>}
                    <div style={{ display: "flex", gap: 12, fontSize: 10, color: MUTED }}>
                      {ca.assigned_to_name && <span>Assigned: {ca.assigned_to_name}</span>}
                      {ca.due_date && <span style={{ color: isOverdue ? RED : MUTED }}>Due: {new Date(ca.due_date).toLocaleDateString()}{isOverdue ? " (OVERDUE)" : ""}</span>}
                    </div>
                    {isAdmin && ca.status !== "completed" && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                        {ca.status === "open" && <button onClick={() => onUpdateCorrAction(ca.id, { status: "in_progress" })} style={btn(`${ASAP_BLUE}22`, ASAP_BLUE)}>Start</button>}
                        <button onClick={() => onUpdateCorrAction(ca.id, { status: "completed", completed_at: new Date().toISOString() })} style={btn(`${GREEN}22`, GREEN)}>Complete</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ERC Review Section — admin only */}
        {canReview && (r.status === "erc_review" || r.status === "submitted") && (
          <div style={{ ...card, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Event Review Committee (ERC) Review</div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Evaluate this report against acceptance and exclusion criteria, assess risk, and determine disposition.</div>

            {/* Acceptance criteria */}
            {asapConfig?.acceptance_criteria?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, marginBottom: 8 }}>Acceptance Criteria</div>
                {asapConfig.acceptance_criteria.map((c, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: OFF_WHITE, marginBottom: 4, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!reviewForm[`accept_${i}`]} onChange={e => setReviewForm(f => ({ ...f, [`accept_${i}`]: e.target.checked }))} />
                    {c}
                  </label>
                ))}
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: GREEN }}>
                    <input type="checkbox" checked={!!reviewForm.meets_acceptance} onChange={e => setReviewForm(f => ({ ...f, meets_acceptance: e.target.checked }))} />
                    Meets all acceptance criteria
                  </label>
                </div>
              </div>
            )}

            {/* Exclusion criteria */}
            {asapConfig?.exclusion_criteria?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: RED, marginBottom: 8 }}>Exclusion Criteria (check if applies)</div>
                {asapConfig.exclusion_criteria.map((c, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: OFF_WHITE, marginBottom: 4, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!reviewForm[`exclude_${i}`]} onChange={e => setReviewForm(f => ({ ...f, [`exclude_${i}`]: e.target.checked }))} />
                    {c}
                  </label>
                ))}
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: RED }}>
                    <input type="checkbox" checked={!!reviewForm.meets_exclusion} onChange={e => setReviewForm(f => ({ ...f, meets_exclusion: e.target.checked }))} />
                    Meets exclusion criteria (report should be excluded)
                  </label>
                </div>
              </div>
            )}

            {/* Risk matrix */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Risk Severity</label>
                <select value={reviewForm.risk_severity || ""} onChange={e => {
                  const sev = e.target.value;
                  const rl2 = sev && reviewForm.risk_likelihood ? riskLevel(sev, reviewForm.risk_likelihood) : null;
                  setReviewForm(f => ({ ...f, risk_severity: sev, risk_level: rl2?.label || "" }));
                }} style={inp}>
                  <option value="">Select</option>
                  {RISK_SEVERITY.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Risk Likelihood</label>
                <select value={reviewForm.risk_likelihood || ""} onChange={e => {
                  const lik = e.target.value;
                  const rl2 = reviewForm.risk_severity && lik ? riskLevel(reviewForm.risk_severity, lik) : null;
                  setReviewForm(f => ({ ...f, risk_likelihood: lik, risk_level: rl2?.label || "" }));
                }} style={inp}>
                  <option value="">Select</option>
                  {RISK_LIKELIHOOD.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Risk Level</label>
                <div style={{ padding: "10px 12px", fontSize: 14, fontWeight: 800, color: rl ? rl.color : MUTED }}>
                  {rl ? rl.label : "—"}
                </div>
              </div>
            </div>

            {/* Sole source */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Sole Source Check</label>
              <textarea value={reviewForm.sole_source_assessment || ""} onChange={e => setReviewForm(f => ({ ...f, sole_source_assessment: e.target.value }))}
                maxLength={10000} style={{ ...inp, minHeight: 48, resize: "vertical", fontSize: 12 }} placeholder="Is this ASAP report the only way we learned about this event? If not, note other sources." />
            </div>

            {/* Recommendation */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Recommendation</label>
              <textarea value={reviewForm.recommendation || ""} onChange={e => setReviewForm(f => ({ ...f, recommendation: e.target.value }))}
                maxLength={10000} style={{ ...inp, minHeight: 48, resize: "vertical", fontSize: 12 }} placeholder="What does the committee recommend? (e.g., additional training, procedure change, no action needed)" />
            </div>

            {/* Disposition */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Disposition *</label>
              <select value={reviewForm.disposition || ""} onChange={e => setReviewForm(f => ({ ...f, disposition: e.target.value }))} style={inp}>
                <option value="">Select disposition</option>
                {DISPOSITIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>

            <button onClick={handleSubmitReview} disabled={!reviewForm.disposition}
              style={{ ...btn(GREEN, "#000"), opacity: !reviewForm.disposition ? 0.5 : 1 }}>
              Submit ERC Review
            </button>
          </div>
        )}

        {/* Previous reviews */}
        {ercReviews.length > 0 && (
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>ERC Review History</div>
            {ercReviews.map(rev => (
              <div key={rev.id} style={{ padding: 12, background: DARK, borderRadius: 6, border: `1px solid ${BORDER}`, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 600 }}>{rev.reviewer_name || "Reviewer"}</span>
                  <span style={{ fontSize: 10, color: MUTED }}>{rev.review_date ? new Date(rev.review_date).toLocaleDateString() : "—"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8, fontSize: 11 }}>
                  <div><span style={{ color: MUTED }}>Disposition: </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{(DISPOSITIONS.find(d => d.id === rev.disposition) || {}).label || rev.disposition}</span></div>
                  <div><span style={{ color: MUTED }}>Risk: </span><span style={{ color: OFF_WHITE }}>{rev.risk_level || "—"}</span></div>
                  <div><span style={{ color: MUTED }}>Acceptance: </span><span style={{ color: rev.meets_acceptance ? GREEN : RED }}>{rev.meets_acceptance ? "Yes" : "No"}</span></div>
                </div>
                {rev.recommendation && <div style={{ fontSize: 11, color: MUTED }}>{rev.recommendation}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ERC REVIEW LIST
  // ════════════════════════════════════════════════════════════════
  const renderErcReview = () => {
    const pending = reports.filter(r => r.status === "submitted" || r.status === "erc_review");
    return (
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 16 }}>ERC Review Queue</div>
        {pending.length === 0 ? (
          <div style={{ ...card, padding: 40, textAlign: "center", color: MUTED }}>
            <div style={{ fontSize: 14 }}>No reports pending review</div>
          </div>
        ) : (
          pending.map(r => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.submitted;
            return (
              <div key={r.id} style={{ ...card, padding: 16, marginBottom: 8, cursor: "pointer" }}
                onClick={() => openReport(r)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: CYAN, fontWeight: 700, fontFamily: "monospace" }}>{r.report_number}</span>
                    <span style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{(EVENT_TYPES.find(e => e.id === r.event_type) || {}).label || r.event_type}</span>
                    <span style={badge(sc.bg, sc.color)}>{sc.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, color: MUTED }}>{deidentified ? (reporterMap?.[r.reporter_id] || "Reporter") : (r.reporter_name || "—")}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{r.event_date ? new Date(r.event_date).toLocaleDateString() : "—"}</span>
                  </div>
                </div>
                {r.event_description && (
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 600 }}>
                    {r.event_description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // MEETINGS
  // ════════════════════════════════════════════════════════════════
  const renderMeetings = () => {
    const handleSaveMeeting = async () => {
      if (!meetingForm.meeting_date) return;
      const payload = { ...meetingForm };
      const decisions = [...(payload.decisions || [])];
      if (payload.is_annual_review) decisions.push({ type: "annual_review", date: payload.meeting_date });
      payload.decisions = decisions;
      delete payload.is_annual_review;
      if (editingMeeting) {
        await onUpdateMeeting(editingMeeting.id, payload);
      } else {
        await onCreateMeeting(payload);
      }
      setMeetingForm({});
      setEditingMeeting(null);
      setShowMeetingForm(false);
    };

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>ERC Meetings</div>
          <button onClick={() => { setShowMeetingForm(true); setEditingMeeting(null); setMeetingForm({}); }} style={btn(ASAP_BLUE, WHITE)}>New Meeting</button>
        </div>

        {showMeetingForm && (
          <div style={{ ...card, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>{editingMeeting ? "Edit Meeting" : "New ERC Meeting"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Meeting Date *</label>
                <input type="datetime-local" value={meetingForm.meeting_date || ""} onChange={e => setMeetingForm(f => ({ ...f, meeting_date: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Next Meeting Date</label>
                <input type="datetime-local" value={meetingForm.next_meeting_date || ""} onChange={e => setMeetingForm(f => ({ ...f, next_meeting_date: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>ERC Attendees</label>
              {(() => {
                const ercMembers = (asapConfig?.erc_members || []).filter(m => typeof m === "object");
                const attendees = meetingForm.attendees || [];
                const getAtt = (att) => typeof att === "object" ? att : { name: att, role: "" };
                const hasRole = (roleId) => attendees.some(a => getAtt(a).role === roleId);
                const quorum = ERC_ROLES.every(r => hasRole(r.id));
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                      {ERC_ROLES.map(role => {
                        const roleMembers = ercMembers.filter(m => m.role === role.id);
                        const roleColor = role.id === "faa_representative" ? CYAN : role.id === "management" ? AMBER : GREEN;
                        const present = hasRole(role.id);
                        return (
                          <div key={role.id}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: roleColor, marginBottom: 4 }}>
                              {role.short} {present ? <span style={{ color: GREEN }}>Present</span> : <span style={{ color: RED }}>Absent</span>}
                            </div>
                            {roleMembers.length > 0 ? roleMembers.map(m => {
                              const sel = attendees.some(a => getAtt(a).id === m.id);
                              return (
                                <button key={m.id} onClick={() => {
                                  if (sel) {
                                    setMeetingForm(f => ({ ...f, attendees: attendees.filter(a => getAtt(a).id !== m.id) }));
                                  } else {
                                    setMeetingForm(f => ({ ...f, attendees: [...attendees, { id: m.id, name: m.name, role: m.role }] }));
                                  }
                                }} style={{ display: "block", width: "100%", padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", textAlign: "left", marginBottom: 2,
                                  background: sel ? `${roleColor}18` : "transparent",
                                  border: sel ? `1px solid ${roleColor}44` : `1px solid ${BORDER}`,
                                  color: sel ? roleColor : MUTED }}>
                                  {m.name}
                                </button>
                              );
                            }) : <div style={{ fontSize: 10, color: MUTED, fontStyle: "italic" }}>None configured</div>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: quorum ? `${GREEN}15` : `${RED}15`,
                      border: `1px solid ${quorum ? GREEN : RED}33`,
                      color: quorum ? GREEN : RED }}>
                      {quorum ? "Quorum met — all ERC roles represented" : "Quorum not met — at least 1 FAA, 1 Management, and 1 Employee rep required"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Other Attendees</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(orgProfiles || []).filter(p => !ercMembers.some(m => m.id === p.id)).map(p => {
                          const sel = attendees.some(a => getAtt(a).id === p.id || getAtt(a).name === p.full_name);
                          return (
                            <button key={p.id} onClick={() => {
                              if (sel) {
                                setMeetingForm(f => ({ ...f, attendees: attendees.filter(a => getAtt(a).id !== p.id && getAtt(a).name !== p.full_name) }));
                              } else {
                                setMeetingForm(f => ({ ...f, attendees: [...attendees, { id: p.id, name: p.full_name, role: "other" }] }));
                              }
                            }} style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, cursor: "pointer",
                              background: sel ? `${ASAP_BLUE}22` : "transparent",
                              border: sel ? `1px solid ${ASAP_BLUE}` : `1px solid ${BORDER}`,
                              color: sel ? ASAP_BLUE : MUTED }}>
                              {p.full_name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: AMBER, cursor: "pointer" }}>
                <input type="checkbox" checked={!!meetingForm.is_annual_review}
                  onChange={e => setMeetingForm(f => ({ ...f, is_annual_review: e.target.checked }))} />
                This is an Annual Program Effectiveness Review (required by AC 120-66C)
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Reports Reviewed</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {reports.map(r => {
                  const sel = (meetingForm.report_ids || []).includes(r.id);
                  return (
                    <button key={r.id} onClick={() => {
                      const rids = meetingForm.report_ids || [];
                      setMeetingForm(f => ({ ...f, report_ids: sel ? rids.filter(id => id !== r.id) : [...rids, r.id] }));
                    }} style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, cursor: "pointer", fontFamily: "monospace",
                      background: sel ? `${CYAN}22` : "transparent",
                      border: sel ? `1px solid ${CYAN}` : `1px solid ${BORDER}`,
                      color: sel ? CYAN : MUTED }}>
                      {r.report_number}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Minutes</label>
              <textarea value={meetingForm.minutes || ""} onChange={e => setMeetingForm(f => ({ ...f, minutes: e.target.value }))}
                maxLength={10000} style={{ ...inp, minHeight: 100, resize: "vertical" }} placeholder="Meeting minutes..." />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleSaveMeeting} style={btn(GREEN, "#000")} disabled={!meetingForm.meeting_date}>Save Meeting</button>
              <button onClick={() => { setShowMeetingForm(false); setEditingMeeting(null); }} style={btn("rgba(255,255,255,0.1)", MUTED)}>Cancel</button>
            </div>
          </div>
        )}

        {meetings.length === 0 ? (
          <div style={{ ...card, padding: 40, textAlign: "center", color: MUTED }}>
            <div style={{ fontSize: 14 }}>No ERC meetings recorded</div>
          </div>
        ) : (
          meetings.map(m => {
            const attendees = (m.attendees || []);
            const getAtt = (a) => typeof a === "object" ? a : { name: a, role: "" };
            const mQuorum = ERC_ROLES.every(r => attendees.some(a => getAtt(a).role === r.id));
            const isAnnual = (m.decisions || []).some(d => d.type === "annual_review");
            return (
              <div key={m.id} style={{ ...card, padding: 16, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>{m.meeting_date ? new Date(m.meeting_date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "—"}</div>
                    {isAnnual && <span style={badge(`${AMBER}22`, AMBER)}>Annual Review</span>}
                    <span style={badge(mQuorum ? `${GREEN}22` : `${RED}22`, mQuorum ? GREEN : RED)}>{mQuorum ? "Quorum" : "No Quorum"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setEditingMeeting(m); setMeetingForm({ ...m, meeting_date: m.meeting_date ? m.meeting_date.slice(0, 16) : "", next_meeting_date: m.next_meeting_date ? m.next_meeting_date.slice(0, 16) : "", is_annual_review: (m.decisions || []).some(d => d.type === "annual_review") }); setShowMeetingForm(true); }} style={btn("rgba(255,255,255,0.06)", MUTED)}>Edit</button>
                    <button onClick={() => onDeleteMeeting(m.id)} style={btn("rgba(239,68,68,0.1)", RED)}>Delete</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: MUTED, marginBottom: 8, flexWrap: "wrap" }}>
                  {ERC_ROLES.map(r => {
                    const present = attendees.filter(a => getAtt(a).role === r.id);
                    const roleColor = r.id === "faa_representative" ? CYAN : r.id === "management" ? AMBER : GREEN;
                    return <span key={r.id} style={{ color: present.length > 0 ? roleColor : RED }}>{r.short}: {present.length > 0 ? present.map(a => getAtt(a).name).join(", ") : "Absent"}</span>;
                  })}
                  <span>Reports: {(m.report_ids || []).length}</span>
                  {m.next_meeting_date && <span>Next: {new Date(m.next_meeting_date).toLocaleDateString()}</span>}
                </div>
                {m.minutes && (
                  <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 100, overflow: "hidden" }}>
                    {m.minutes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // SETUP
  // ════════════════════════════════════════════════════════════════
  const renderSetup = () => {
    const handleSave = async () => {
      await onSaveConfig({
        program_name: configForm.program_name || "ASAP",
        mou_text: configForm.mou_text || "",
        mou_effective_date: configForm.mou_effective_date || null,
        mou_expiry_date: configForm.mou_expiry_date || null,
        acceptance_criteria: configForm.acceptance_criteria || [],
        exclusion_criteria: configForm.exclusion_criteria || [],
        erc_members: configForm.erc_members || [],
        reporting_window_hours: configForm.reporting_window_hours || 24,
        auto_number_prefix: configForm.auto_number_prefix || "ASAP",
      });
    };

    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>Aviation Safety Action Program (ASAP) Setup</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} style={btn(GREEN, "#000")}>Save Configuration</button>
          </div>
        </div>

        <div style={{ ...card, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>General Settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Program Name</label>
              <input value={configForm.program_name || ""} onChange={e => setConfigForm(f => ({ ...f, program_name: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Auto-Number Prefix</label>
              <input value={configForm.auto_number_prefix || ""} onChange={e => setConfigForm(f => ({ ...f, auto_number_prefix: e.target.value }))} style={inp} placeholder="ASAP" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>MOU Effective Date</label>
              <input type="date" value={configForm.mou_effective_date || ""} onChange={e => setConfigForm(f => ({ ...f, mou_effective_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>MOU Expiry Date</label>
              <input type="date" value={configForm.mou_expiry_date || ""} onChange={e => setConfigForm(f => ({ ...f, mou_expiry_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Reporting Window (hours)</label>
              <select value={configForm.reporting_window_hours || 24} onChange={e => setConfigForm(f => ({ ...f, reporting_window_hours: parseInt(e.target.value) }))} style={inp}>
                {[12, 24, 48, 72].map(h => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>MOU Text</div>
          <textarea value={configForm.mou_text || ""} onChange={e => setConfigForm(f => ({ ...f, mou_text: e.target.value }))}
            maxLength={10000} style={{ ...inp, minHeight: 200, resize: "vertical", fontSize: 12, fontFamily: "monospace" }} placeholder="Enter MOU text..." />
        </div>

        <div style={{ ...card, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 12 }}>Acceptance Criteria</div>
          {(configForm.acceptance_criteria || []).map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: OFF_WHITE, flex: 1 }}>{c}</span>
              <button onClick={() => setConfigForm(f => ({ ...f, acceptance_criteria: f.acceptance_criteria.filter((_, j) => j !== i) }))}
                style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 14 }}>x</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={newAcceptance} onChange={e => setNewAcceptance(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Add acceptance criterion..." />
            <button onClick={() => { if (newAcceptance.trim()) { setConfigForm(f => ({ ...f, acceptance_criteria: [...(f.acceptance_criteria || []), newAcceptance.trim()] })); setNewAcceptance(""); } }}
              style={btn(GREEN, "#000")}>Add</button>
          </div>
        </div>

        <div style={{ ...card, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 12 }}>Exclusion Criteria</div>
          {(configForm.exclusion_criteria || []).map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: OFF_WHITE, flex: 1 }}>{c}</span>
              <button onClick={() => setConfigForm(f => ({ ...f, exclusion_criteria: f.exclusion_criteria.filter((_, j) => j !== i) }))}
                style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 14 }}>x</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={newExclusion} onChange={e => setNewExclusion(e.target.value)} style={{ ...inp, flex: 1 }} placeholder="Add exclusion criterion..." />
            <button onClick={() => { if (newExclusion.trim()) { setConfigForm(f => ({ ...f, exclusion_criteria: [...(f.exclusion_criteria || []), newExclusion.trim()] })); setNewExclusion(""); } }}
              style={btn(RED, WHITE)}>Add</button>
          </div>
        </div>

        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 4 }}>ERC Composition</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Per AC 120-66C, the ERC must include at least one representative from each party to the MOU.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {ERC_ROLES.map(role => {
              const members = (configForm.erc_members || []).filter(m => typeof m === "object" && m.role === role.id);
              const roleColor = role.id === "faa_representative" ? CYAN : role.id === "management" ? AMBER : GREEN;
              return (
                <div key={role.id}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: roleColor, marginBottom: 8 }}>
                    {role.label} {members.length === 0 && <span style={{ color: RED, fontSize: 9, marginLeft: 4 }}>REQUIRED</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(orgProfiles || []).map(p => {
                      const sel = members.some(m => m.id === p.id);
                      return (
                        <button key={p.id} onClick={() => {
                          const all = (configForm.erc_members || []).filter(m => typeof m === "object");
                          if (sel) {
                            setConfigForm(f => ({ ...f, erc_members: all.filter(m => !(m.id === p.id && m.role === role.id)) }));
                          } else {
                            setConfigForm(f => ({ ...f, erc_members: [...all, { id: p.id, name: p.full_name, role: role.id }] }));
                          }
                        }} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", textAlign: "left",
                          background: sel ? `${roleColor}18` : "transparent",
                          border: sel ? `1px solid ${roleColor}44` : `1px solid ${BORDER}`,
                          color: sel ? roleColor : MUTED }}>
                          {p.full_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // TRENDING
  // ════════════════════════════════════════════════════════════════
  const renderTrending = () => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - dateRange, 1);
    const filtered = reports.filter(r => new Date(r.created_at) >= cutoff);

    // Reports over time (monthly)
    const monthlyMonths = {};
    filtered.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMonths[key] = (monthlyMonths[key] || 0) + 1;
    });
    const monthlyData = Object.entries(monthlyMonths).sort().map(([k, v]) => ({ month: k, count: v }));

    // By event type
    const typeCounts = {};
    filtered.forEach(r => {
      const label = (EVENT_TYPES.find(e => e.id === r.event_type) || {}).label || r.event_type || "Other";
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    });
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

    // By status
    const statusData = Object.entries(STATUS_COLORS).map(([key, sc]) => ({
      name: sc.label,
      value: filtered.filter(r => r.status === key).length,
      fill: sc.color,
    })).filter(d => d.value > 0);

    const PIE_COLORS = [ASAP_BLUE, CYAN, GREEN, AMBER, RED, MUTED];

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>ASAP Report Trends</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => setDateRange(m)}
                style={{ padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: dateRange === m ? "rgba(255,255,255,0.1)" : "transparent",
                  border: dateRange === m ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                  color: dateRange === m ? WHITE : MUTED }}>
                {m}mo
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Reports over time */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 700, marginBottom: 12 }}>Reports Over Time</div>
            {monthlyData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData}>
                  <defs><linearGradient id="asapGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ASAP_BLUE} stopOpacity={0.3}/><stop offset="95%" stopColor={ASAP_BLUE} stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: OFF_WHITE }} />
                  <Area type="monotone" dataKey="count" stroke={ASAP_BLUE} fill="url(#asapGrad)" strokeWidth={2} dot={{ r: 3, fill: ASAP_BLUE }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>Not enough data</div>
            )}
          </div>

          {/* By event type */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 700, marginBottom: 12 }}>By Event Type</div>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: MUTED, strokeWidth: 1 }}>
                    {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: OFF_WHITE }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>No data</div>
            )}
          </div>

          {/* By status */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 700, marginBottom: 12 }}>By Status</div>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData} layout="vertical">
                  <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: OFF_WHITE }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>No data</div>
            )}
          </div>

          {/* Acceptance rate trend */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 700, marginBottom: 12 }}>Acceptance Rate Trend</div>
            {(() => {
              const months = {};
              filtered.forEach(r => {
                const d = new Date(r.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                if (!months[key]) months[key] = { total: 0, accepted: 0 };
                months[key].total++;
                if (["accepted", "corrective_action", "closed"].includes(r.status)) months[key].accepted++;
              });
              const rateData = Object.entries(months).sort().map(([k, v]) => ({
                month: k, rate: v.total > 0 ? Math.round((v.accepted / v.total) * 100) : 0,
              }));
              return rateData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={rateData}>
                    <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: OFF_WHITE }} formatter={(v) => `${v}%`} />
                    <Line type="monotone" dataKey="rate" stroke={GREEN} strokeWidth={2} dot={{ r: 3, fill: GREEN }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>Not enough data</div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: WHITE }}>{asapConfig?.program_name || "ASAP"}<button onClick={() => setShowHelp(!showHelp)} title="What's this?" style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MUTED, fontSize: 10, fontWeight: 700, marginLeft: 8, verticalAlign: "middle" }}>?</button></div>
          <div style={{ fontSize: 11, color: MUTED }}>Aviation Safety Action Program — AC 120-66C</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setDeidentified(d => !d)}
            style={{ fontSize: 11, color: deidentified ? AMBER : MUTED, background: deidentified ? `${AMBER}12` : "none", border: `1px solid ${deidentified ? `${AMBER}44` : BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontWeight: deidentified ? 700 : 400 }}>
            {deidentified ? "De-identified" : "De-identify"}
          </button>
          <button onClick={onRefresh} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Refresh</button>
        </div>
      </div>
      {showHelp && <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.6, padding: "10px 14px", marginBottom: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 6 }}>The Aviation Safety Action Program provides a voluntary, confidential reporting system. Reports are reviewed by an Event Review Committee (ERC) who determines corrective actions.</div>}

      {deidentified && (
        <div style={{ padding: "8px 14px", marginBottom: 12, borderRadius: 6, background: `${AMBER}12`, border: `1px solid ${AMBER}33`, fontSize: 11, color: AMBER }}>
          De-identified mode active — reporter names, tail numbers, and airports are masked. Safe for sharing data outside the ERC per AC 120-66C confidentiality requirements.
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {tabBtn("dashboard", "Dashboard")}
        {tabBtn("new_report", "Submit Report")}
        {isAdmin && tabBtn("erc_review", "ERC Review")}
        {isAdmin && tabBtn("meetings", "Meetings")}
        {isAdmin && tabBtn("setup", "Setup")}
        {isAdmin && tabBtn("trending", "Trends")}
      </div>

      {view === "dashboard" && renderDashboard()}
      {view === "new_report" && renderNewReport()}
      {view === "report_detail" && renderReportDetail()}
      {view === "erc_review" && renderErcReview()}
      {view === "meetings" && renderMeetings()}
      {view === "setup" && renderSetup()}
      {view === "trending" && renderTrending()}
    </div>
  );
}
