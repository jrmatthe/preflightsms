import { useState, useEffect, useRef, useMemo } from "react";

const BLACK = "#000000";
const DARK = "#111111";
const CARD = "#161616";
const BORDER = "#232323";
const LIGHT_BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const REPORT_TYPES = [
  { id: "hazard", label: "Hazard", color: YELLOW, desc: "A condition that could cause harm", icon: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
  { id: "incident", label: "Incident", color: RED, desc: "Damage, injury, or unsafe event", icon: <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></> },
  { id: "near_miss", label: "Near Miss", color: "#F97316", desc: "Almost resulted in an incident", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></> },
  { id: "concern", label: "Concern", color: CYAN, desc: "Safety observation or suggestion", icon: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></> },
];

const SEVERITIES = [
  { id: "negligible", label: "Minimal", color: "#6B7280", num: 1 },
  { id: "low", label: "Minor", color: GREEN, num: 2 },
  { id: "medium", label: "Moderate", color: YELLOW, num: 3 },
  { id: "high", label: "Serious", color: "#F97316", num: 4 },
  { id: "critical", label: "Critical", color: RED, num: 5 },
];

const STATUSES = [
  { id: "open", label: "Open", color: CYAN },
  { id: "under_review", label: "Under Review", color: YELLOW },
  { id: "investigation", label: "Investigation", color: "#F97316" },
  { id: "corrective_action", label: "Corrective Action", color: "#A78BFA" },
  { id: "closed", label: "Closed", color: MUTED },
];

const CATEGORIES = [
  "weather", "mechanical", "human_factors", "procedures", "training",
  "fatigue", "communication", "ground_ops", "airspace", "wildlife",
  "maintenance", "cabin_safety", "security", "other",
];

const FLIGHT_PHASES = [
  { id: "", label: "N/A" },
  { id: "preflight", label: "Preflight" },
  { id: "taxi", label: "Taxi" },
  { id: "takeoff", label: "Takeoff" },
  { id: "climb", label: "Climb" },
  { id: "cruise", label: "Cruise" },
  { id: "descent", label: "Descent" },
  { id: "approach", label: "Approach" },
  { id: "landing", label: "Landing" },
  { id: "post_flight", label: "Post Flight" },
  { id: "ground_ops", label: "Ground Ops" },
  { id: "maintenance", label: "Maintenance" },
];

function generateReportCode() {
  return `RPT-${Date.now().toString(36).toUpperCase()}`;
}

function titleCase(s) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Skeleton ──
function SkeletonCard() {
  return (
    <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 4, height: 40, background: BORDER, borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: "70%", height: 16, background: BORDER, borderRadius: 4, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: "50%", height: 12, background: BORDER, borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

// ── Empty state ──
function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", textAlign: "center" }}>
      <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No reports yet</div>
      <div style={{ color: MUTED, fontSize: 14 }}>Your reports help everyone fly safer</div>
    </div>
  );
}

// ── Report submission form ──
function ReportForm({ onSubmit, fleetAircraft, prefill, onClearPrefill }) {
  const [form, setForm] = useState({
    reportType: "",
    title: "",
    description: "",
    dateOccurred: prefill?.dateOccurred || "",
    location: prefill?.location || "",
    category: "",
    severity: "low",
    flightPhase: prefill?.flightPhase || "",
    tailNumber: prefill?.tailNumber || "",
    aircraftType: prefill?.aircraftType || "",
    confidential: false,
    anonymous: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fleetList = fleetAircraft || [];
  const tailOptions = [...new Set(fleetList.map(a => a.registration))];

  const validate = () => {
    const e = {};
    if (!form.reportType) e.reportType = "Select a report type";
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.dateOccurred) e.dateOccurred = "Date is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.flightPhase) e.flightPhase = "Flight phase is required";
    if (!form.category) e.category = "Category is required";
    if (!form.tailNumber) e.tailNumber = "Aircraft tail is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    const tailNumber = form.tailNumber;
    try {
      await onSubmit({
        ...form,
        tailNumber,
        reportCode: generateReportCode(),
        aiSuggestedCategory: null,
        aiSuggestedSeverity: null,
      });
      // Reset form
      setForm({
        reportType: "", title: "", description: "",
        dateOccurred: "", location: "", category: "", severity: "low",
        flightPhase: "", tailNumber: "", aircraftType: "",
        confidential: false, anonymous: false,
      });
      setErrors({});
      if (onClearPrefill) onClearPrefill();
    } catch (err) {
      console.error("Report submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "0 16px 24px" }}>
      {/* Report Type — 2x2 grid */}
      <label style={{ display: "block", color: OFF_WHITE, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>What are you reporting?</label>
      {errors.reportType && <div style={{ color: RED, fontSize: 14, marginBottom: 6 }}>{errors.reportType}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {REPORT_TYPES.map(rt => {
          const selected = form.reportType === rt.id;
          return (
            <button
              key={rt.id}
              onClick={() => set("reportType", rt.id)}
              style={{
                padding: 14, borderRadius: 10,
                background: selected ? `${rt.color}14` : CARD,
                border: `1.5px solid ${selected ? rt.color : BORDER}`,
                cursor: "pointer", textAlign: "center",
                minHeight: 80, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none"
                stroke={selected ? rt.color : MUTED} strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                {rt.icon}
              </svg>
              <span style={{ color: selected ? rt.color : OFF_WHITE, fontSize: 14, fontWeight: 600 }}>{rt.label}</span>
              <span style={{ color: MUTED, fontSize: 14, lineHeight: 1.3 }}>{rt.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Title */}
      <Field label="Title" error={errors.title}>
        <input
          value={form.title}
          onChange={e => set("title", e.target.value)}
          placeholder="Brief summary of the event"
          style={inputStyle}
        />
      </Field>

      {/* Description */}
      <Field label="Description" error={errors.description}>
        <textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe what happened, what you observed, or what concerns you..."
          rows={5}
          style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
        />
      </Field>

      {/* Severity — 5-step scale */}
      <Field label="Severity">
        <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {SEVERITIES.map(s => {
            const selected = form.severity === s.id;
            return (
              <button
                key={s.id}
                onClick={() => set("severity", s.id)}
                style={{
                  flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                  background: selected ? `${s.color}22` : BLACK,
                  borderRight: s.num < 5 ? `1px solid ${BORDER}` : "none",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  minHeight: 54,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: selected ? s.color : "transparent",
                  border: `2px solid ${selected ? s.color : MUTED}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {selected && (
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 14, color: selected ? s.color : MUTED, fontWeight: selected ? 700 : 500 }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Anonymous toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 0", borderTop: `1px solid ${LIGHT_BORDER}`, marginTop: 4, marginBottom: 4,
      }}>
        <div>
          <div style={{ color: OFF_WHITE, fontSize: 15, fontWeight: 500 }}>Submit anonymously</div>
          <div style={{ color: MUTED, fontSize: 14, marginTop: 2, lineHeight: 1.4 }}>
            Your identity will be hidden from everyone except the Safety Manager
          </div>
        </div>
        <ToggleSwitch
          checked={form.anonymous}
          onChange={v => { set("anonymous", v); if (v) set("confidential", false); }}
        />
      </div>

      {/* Date & Location */}
      <Field label="Date Occurred" error={errors.dateOccurred}>
        <input type="date" value={form.dateOccurred} onChange={e => set("dateOccurred", e.target.value)} style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none", maxWidth: "100%", minHeight: 48 }} />
      </Field>
      <Field label="Location" error={errors.location}>
        <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Airport, ramp, etc." style={inputStyle} />
      </Field>

      {/* Flight Phase */}
      <Field label="Flight Phase" error={errors.flightPhase}>
        <select value={form.flightPhase} onChange={e => set("flightPhase", e.target.value)} style={inputStyle}>
          <option value="">Select phase...</option>
          {FLIGHT_PHASES.filter(fp => fp.id).map(fp => (
            <option key={fp.id} value={fp.id}>{fp.label}</option>
          ))}
        </select>
      </Field>

      {/* Category */}
      <Field label="Category" error={errors.category}>
        <select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>
          <option value="">Select category...</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{titleCase(c)}</option>
          ))}
        </select>
      </Field>

      {/* Aircraft Tail */}
      <Field label="Aircraft Tail" error={errors.tailNumber}>
        {tailOptions.length > 0 ? (
          <select value={form.tailNumber} onChange={e => set("tailNumber", e.target.value)} style={inputStyle}>
            <option value="">Select aircraft</option>
            {tailOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <input value={form.tailNumber} onChange={e => set("tailNumber", e.target.value)} placeholder="N-number" style={inputStyle} />
        )}
      </Field>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: "100%", padding: 14, marginTop: 12,
          background: CYAN, color: BLACK, border: "none", borderRadius: 10,
          fontSize: 16, fontWeight: 700, cursor: "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Submitting..." : "Submit Report"}
      </button>
    </div>
  );
}

// ── Toggle switch ──
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 28, borderRadius: 14, padding: 2,
        background: checked ? CYAN : BORDER,
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 12,
        background: WHITE,
        transform: checked ? "translateX(20px)" : "translateX(0)",
        transition: "transform 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

// ── Report card for list ──
function ReportListCard({ report, expanded, onToggle }) {
  const type = REPORT_TYPES.find(t => t.id === report.report_type) || REPORT_TYPES[0];
  const severity = SEVERITIES.find(s => s.id === report.severity) || SEVERITIES[1];
  const status = STATUSES.find(s => s.id === report.status) || STATUSES[0];
  const dateStr = report.created_at ? new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

  return (
    <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
      <div onClick={onToggle} style={{ cursor: "pointer" }}>
        {/* Top row: title + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
            {/* Severity bar */}
            <div style={{ width: 4, height: 36, borderRadius: 2, background: severity.color, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: WHITE, fontSize: 15, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                {report.title}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: MUTED, fontSize: 12, fontWeight: 600 }}>Type:</span>
                <Badge label={type.label} color={type.color} />
                <span style={{ color: MUTED, fontSize: 12, fontWeight: 600, marginLeft: 4 }}>Status:</span>
                <Badge label={status.label} color={status.color} />
              </div>
            </div>
          </div>
          <span style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>{dateStr}</span>
        </div>

        {/* Meta line */}
        <div style={{ color: MUTED, fontSize: 14, marginTop: 4, marginLeft: 14 }}>
          {report.category ? titleCase(report.category) : ""}
          {report.location ? ` · ${report.location}` : ""}
          {report.anonymous ? " · Anonymous" : ""}
          {report.confidential ? " · Confidential" : ""}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${LIGHT_BORDER}` }}>
          <div style={{ color: OFF_WHITE, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 12 }}>
            {report.description}
          </div>

          {report.tail_number && (
            <DetailRow label="Aircraft" value={`${report.tail_number}${report.aircraft_type ? ` · ${report.aircraft_type}` : ""}`} />
          )}
          {report.flight_phase && (
            <DetailRow label="Flight Phase" value={titleCase(report.flight_phase)} />
          )}
          {report.date_occurred && (
            <DetailRow label="Date Occurred" value={report.date_occurred} />
          )}
          {report.investigation_notes && (
            <div style={{
              padding: 12, borderRadius: 8, marginTop: 8,
              background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#A78BFA", marginBottom: 4 }}>Action Being Taken</div>
              <div style={{ fontSize: 14, color: OFF_WHITE, lineHeight: 1.5 }}>{report.investigation_notes}</div>
            </div>
          )}
          {report.root_cause && (
            <div style={{ marginTop: 8 }}>
              <DetailRow label="Root Cause" value={report.root_cause} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 8,
      background: `${color}16`, color, fontSize: 14, fontWeight: 600,
      border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: MUTED, fontSize: 14 }}>{label}</span>
      <span style={{ color: OFF_WHITE, fontSize: 14, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: OFF_WHITE, fontSize: 14, marginBottom: 6 }}>{label}</label>
      {children}
      {error && <div role="alert" style={{ color: RED, fontSize: 14, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ── Main component ──
export default function MobileReportsView({
  reports, profile, session, onSubmitReport, fleetAircraft,
  reportPrefill, onClearPrefill, loading,
}) {
  const [view, setView] = useState("list"); // "list" or "new"
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

  // Pull-to-refresh
  const touchStartY = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);

  const handlePullStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0 && view === "list") {
      touchStartY.current = e.touches[0].clientY;
    }
  };
  const handlePullMove = (e) => {
    if (touchStartY.current == null) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) { setPullDistance(Math.min(diff * 0.4, 60)); if (diff > 20) e.preventDefault(); }
  };
  const handlePullEnd = () => {
    setPullDistance(0);
    touchStartY.current = null;
  };

  // Auto-switch to form when prefill arrives
  useEffect(() => {
    if (reportPrefill) setView("new");
  }, [reportPrefill]);

  // Filter: users see only their own reports
  const myReports = useMemo(() => {
    if (!reports) return [];
    const canManage = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
    const filtered = canManage ? reports : reports.filter(r => r.reporter_id === session?.user?.id);
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reports, profile, session]);

  const handleFormSubmit = async (report) => {
    await onSubmitReport(report);
    setView("list");
  };

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      </div>
    );
  }

  // Form view
  if (view === "new") {
    return (
      <div ref={scrollRef} style={{ minHeight: "100%" }}>
        {/* Back header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <button
            onClick={() => { setView("list"); if (onClearPrefill) onClearPrefill(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: WHITE, padding: 4, display: "flex", alignItems: "center" }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <span style={{ color: WHITE, fontSize: 16, fontWeight: 600 }}>New Safety Report</span>
        </div>

        <div style={{ paddingTop: 12 }}>
          <ReportForm
            onSubmit={handleFormSubmit}
            fleetAircraft={fleetAircraft}
            prefill={reportPrefill}
            onClearPrefill={onClearPrefill}
          />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      ref={scrollRef}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      style={{ minHeight: "100%", position: "relative" }}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: pullDistance, overflow: "hidden" }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"
            style={{ transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)` }}>
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
        </div>
      )}

      {/* New Report button */}
      <div style={{ padding: "12px 16px 8px" }}>
        <button
          onClick={() => setView("new")}
          style={{
            width: "100%", padding: 14,
            background: CYAN, color: BLACK, border: "none", borderRadius: 10,
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Report
        </button>
      </div>

      {/* Report list */}
      <div style={{ padding: "8px 16px 16px" }}>
        {myReports.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div style={{ color: MUTED, fontSize: 14, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              My Reports ({myReports.length})
            </div>
            {myReports.map(r => (
              <ReportListCard
                key={r.id}
                report={r}
                expanded={expandedId === r.id}
                onToggle={() => setExpandedId(prev => prev === r.id ? null : r.id)}
              />
            ))}
          </>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  );
}

const cardStyle = {
  background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`,
};

const inputStyle = {
  width: "100%", padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 8,
  fontSize: 16, background: BLACK, color: OFF_WHITE, boxSizing: "border-box",
  fontFamily: "inherit",
};
