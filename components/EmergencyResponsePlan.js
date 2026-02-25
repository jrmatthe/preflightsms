import { useState, useMemo, useEffect, useCallback } from "react";

const BLACK = "#000000", DARK = "#0A0A0A", NEAR_BLACK = "#111111", CARD = "#141414";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", AMBER = "#F59E0B", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };

const ERP_CATEGORIES = [
  { id: "accident", label: "Aircraft Accident/Incident", icon: "🛩️", color: RED },
  { id: "medical", label: "Medical Emergency", icon: "🏥", color: "#F97316" },
  { id: "security", label: "Security Threat", icon: "🔒", color: AMBER },
  { id: "natural_disaster", label: "Natural Disaster", icon: "🌪️", color: YELLOW },
  { id: "hazmat", label: "Fuel Spill / HAZMAT", icon: "☢️", color: "#A78BFA" },
  { id: "overdue", label: "Missing/Overdue Aircraft", icon: "📡", color: CYAN },
  { id: "general", label: "General", icon: "📋", color: MUTED },
];

const DRILL_TYPES = [
  { id: "tabletop", label: "Tabletop", color: CYAN },
  { id: "functional", label: "Functional", color: AMBER },
  { id: "full_scale", label: "Full Scale", color: RED },
];

const DRILL_STATUSES = [
  { id: "scheduled", label: "Scheduled", color: CYAN },
  { id: "completed", label: "Completed", color: GREEN },
  { id: "cancelled", label: "Cancelled", color: MUTED },
];

const DEFAULT_CALL_TREE = [
  { contact_name: "NTSB", contact_role: "Aviation Safety", phone_primary: "844-373-9922", is_external: true, notes: "24-hour hotline" },
  { contact_name: "FAA FSDO", contact_role: "Flight Standards", phone_primary: "[Your FSDO number]", is_external: true, notes: "Local FSDO" },
  { contact_name: "Local EMS", contact_role: "Emergency Services", phone_primary: "911", is_external: true },
  { contact_name: "[Insurance Provider]", contact_role: "Insurance", phone_primary: "[Phone]", is_external: true },
  { contact_name: "[Accountable Executive]", contact_role: "Accountable Executive", phone_primary: "[Phone]", is_external: false },
  { contact_name: "[Safety Manager]", contact_role: "Safety Manager", phone_primary: "[Phone]", is_external: false },
  { contact_name: "[Legal Counsel]", contact_role: "Legal", phone_primary: "[Phone]", is_external: true },
];

const ERP_TEMPLATES = [
  {
    name: "Aircraft Accident/Incident",
    category: "accident",
    description: "Response procedures for aircraft accidents, incidents, and serious events per NTSB 830 / FAA Part 5 §5.27. Covers initial response through post-event investigation.",
    checklist: [
      { action_text: "Ensure safety of all personnel at scene — account for crew and passengers", responsible_role: "Pilot-in-Command", time_target: "Immediate", is_critical: true },
      { action_text: "Call 911 for emergency medical services if injuries present", responsible_role: "First on Scene", time_target: "Immediate", is_critical: true },
      { action_text: "Notify company operations / dispatch center", responsible_role: "Pilot-in-Command", time_target: "Within 15 min", is_critical: true },
      { action_text: "Preserve wreckage and accident scene — do not disturb", responsible_role: "First on Scene", time_target: "Immediate", is_critical: true },
      { action_text: "Notify NTSB (844-373-9922) for accidents / serious incidents", responsible_role: "Safety Manager", time_target: "Within 1 hour", is_critical: true },
      { action_text: "Notify FAA FSDO of the event", responsible_role: "Safety Manager", time_target: "Within 2 hours", is_critical: true },
      { action_text: "Notify insurance carrier", responsible_role: "Accountable Executive", time_target: "Within 4 hours", is_critical: false },
      { action_text: "Secure all flight records, maintenance logs, and pilot records", responsible_role: "Safety Manager", time_target: "Within 2 hours", is_critical: true },
      { action_text: "Engage legal counsel", responsible_role: "Accountable Executive", time_target: "Within 4 hours", is_critical: false },
      { action_text: "Notify next of kin (if fatalities/injuries)", responsible_role: "Accountable Executive", time_target: "ASAP", is_critical: true },
      { action_text: "Designate single point of contact for media inquiries — no unauthorized statements", responsible_role: "Accountable Executive", time_target: "Within 1 hour", is_critical: false },
      { action_text: "Provide employee assistance / CISM for affected personnel", responsible_role: "Safety Manager", time_target: "Within 24 hours", is_critical: false },
      { action_text: "Conduct initial crew/witness debrief (do not record without legal guidance)", responsible_role: "Safety Manager", time_target: "Within 24 hours", is_critical: false },
      { action_text: "Begin internal investigation parallel to NTSB (do not interfere)", responsible_role: "Safety Manager", time_target: "Within 48 hours", is_critical: false },
      { action_text: "File NASA ASRS report if applicable", responsible_role: "Pilot-in-Command", time_target: "Within 10 days", is_critical: false },
      { action_text: "Document corrective actions and update SMS hazard register", responsible_role: "Safety Manager", time_target: "Within 30 days", is_critical: false },
      { action_text: "Conduct post-event review meeting with management team", responsible_role: "Accountable Executive", time_target: "Within 30 days", is_critical: false },
    ],
  },
  {
    name: "Medical Emergency",
    category: "medical",
    description: "Response procedures for medical emergencies involving crew, passengers, or ground personnel. Covers both in-flight and ground-based medical events.",
    checklist: [
      { action_text: "Assess patient condition — check airway, breathing, circulation", responsible_role: "First on Scene", time_target: "Immediate", is_critical: true },
      { action_text: "Call 911 / request emergency medical services", responsible_role: "First on Scene", time_target: "Immediate", is_critical: true },
      { action_text: "Administer first aid per training level — use onboard medical kit", responsible_role: "First on Scene", time_target: "Immediate", is_critical: true },
      { action_text: "If airborne: declare emergency and divert to nearest suitable airport", responsible_role: "Pilot-in-Command", time_target: "Immediate", is_critical: true },
      { action_text: "Coordinate with ATC — request priority handling and EMR on standby", responsible_role: "Pilot-in-Command", time_target: "Immediate", is_critical: true },
      { action_text: "Notify company operations / dispatch", responsible_role: "Pilot-in-Command", time_target: "Within 15 min", is_critical: true },
      { action_text: "Meet EMS at aircraft and provide patient information", responsible_role: "First on Scene", time_target: "On arrival", is_critical: false },
      { action_text: "Secure patient medical information (HIPAA compliance)", responsible_role: "Safety Manager", time_target: "Same day", is_critical: false },
      { action_text: "Notify patient emergency contact / next of kin", responsible_role: "Accountable Executive", time_target: "ASAP", is_critical: true },
      { action_text: "Document event details for safety reporting", responsible_role: "Safety Manager", time_target: "Same day", is_critical: false },
      { action_text: "Assess if aircraft can continue service", responsible_role: "Maintenance", time_target: "Before next flight", is_critical: false },
      { action_text: "Arrange replacement crew if PIC/SIC affected", responsible_role: "Operations", time_target: "As needed", is_critical: false },
      { action_text: "File safety report in SMS", responsible_role: "Safety Manager", time_target: "Within 24 hours", is_critical: false },
      { action_text: "Conduct debrief with involved personnel", responsible_role: "Safety Manager", time_target: "Within 48 hours", is_critical: false },
      { action_text: "Review and update medical kit inventory", responsible_role: "Maintenance", time_target: "Within 24 hours", is_critical: false },
    ],
  },
  {
    name: "Security Threat / Bomb Threat",
    category: "security",
    description: "Response procedures for security threats including bomb threats, hijacking threats, suspicious packages, and unauthorized access. Coordinates with TSA and law enforcement.",
    checklist: [
      { action_text: "If phone threat: DO NOT hang up — keep caller talking, note exact words", responsible_role: "Person Receiving", time_target: "Immediate", is_critical: true },
      { action_text: "Record all details: caller voice, background noise, exact threat, time of call", responsible_role: "Person Receiving", time_target: "During call", is_critical: true },
      { action_text: "Call 911 / notify law enforcement immediately", responsible_role: "Senior Person", time_target: "Immediate", is_critical: true },
      { action_text: "Notify company management / accountable executive", responsible_role: "Senior Person", time_target: "Immediate", is_critical: true },
      { action_text: "Evacuate immediate area per evacuation plan — do not use radios near suspicious objects", responsible_role: "All Personnel", time_target: "Immediate", is_critical: true },
      { action_text: "Notify TSA (866-289-9673) for aviation security threats", responsible_role: "Safety Manager", time_target: "Immediate", is_critical: true },
      { action_text: "Secure perimeter — prevent unauthorized access", responsible_role: "Operations", time_target: "Immediate", is_critical: false },
      { action_text: "Account for all personnel at muster point", responsible_role: "All Supervisors", time_target: "Within 15 min", is_critical: true },
      { action_text: "Do NOT touch or move suspicious objects — wait for bomb squad / EOD", responsible_role: "All Personnel", time_target: "Immediate", is_critical: true },
      { action_text: "Notify airport operations / ARFF if at airport", responsible_role: "Operations", time_target: "Immediate", is_critical: false },
      { action_text: "Cooperate fully with law enforcement investigation", responsible_role: "All Personnel", time_target: "Ongoing", is_critical: false },
      { action_text: "Engage legal counsel", responsible_role: "Accountable Executive", time_target: "Same day", is_critical: false },
      { action_text: "Resume operations only when cleared by law enforcement", responsible_role: "Accountable Executive", time_target: "When cleared", is_critical: true },
      { action_text: "Document event for safety reporting and file SMS report", responsible_role: "Safety Manager", time_target: "Within 24 hours", is_critical: false },
      { action_text: "Conduct post-event debrief and review security procedures", responsible_role: "Safety Manager", time_target: "Within 48 hours", is_critical: false },
    ],
  },
  {
    name: "Natural Disaster Response",
    category: "natural_disaster",
    description: "Response procedures for natural disasters including severe weather, earthquakes, flooding, and other natural events affecting operations.",
    checklist: [
      { action_text: "Monitor weather/event advisories — activate plan when warning issued", responsible_role: "Operations", time_target: "Ongoing", is_critical: true },
      { action_text: "Execute shelter-in-place or evacuation plan per event type", responsible_role: "All Personnel", time_target: "Immediate", is_critical: true },
      { action_text: "Secure all aircraft — tie down, hangar, or relocate to safe area", responsible_role: "Maintenance", time_target: "Before impact", is_critical: true },
      { action_text: "Account for all personnel — confirm safety of all employees", responsible_role: "All Supervisors", time_target: "Within 1 hour", is_critical: true },
      { action_text: "Assess facility and aircraft damage after event passes", responsible_role: "Maintenance", time_target: "When safe", is_critical: false },
      { action_text: "Establish alternate operations location if primary facility damaged", responsible_role: "Accountable Executive", time_target: "As needed", is_critical: false },
      { action_text: "Notify customers and stakeholders of operational status", responsible_role: "Operations", time_target: "Same day", is_critical: false },
      { action_text: "Document all damage for insurance claims with photos", responsible_role: "Safety Manager", time_target: "Same day", is_critical: false },
      { action_text: "File insurance claims for damage", responsible_role: "Accountable Executive", time_target: "Within 48 hours", is_critical: false },
      { action_text: "Conduct post-event review and update disaster plan", responsible_role: "Safety Manager", time_target: "Within 30 days", is_critical: false },
    ],
  },
  {
    name: "Fuel Spill / HAZMAT Incident",
    category: "hazmat",
    description: "Response procedures for fuel spills, hazardous material releases, and environmental emergencies per EPA and local regulations.",
    checklist: [
      { action_text: "Evacuate immediate area — move upwind and uphill from spill", responsible_role: "All Personnel", time_target: "Immediate", is_critical: true },
      { action_text: "Eliminate all ignition sources in area (engines, electronics, smoking)", responsible_role: "All Personnel", time_target: "Immediate", is_critical: true },
      { action_text: "Contain spill if safe to do so — deploy absorbent booms/pads", responsible_role: "Trained Personnel", time_target: "Immediate", is_critical: true },
      { action_text: "Call fire department (911) for large spills or if fire hazard exists", responsible_role: "Senior Person", time_target: "Immediate", is_critical: true },
      { action_text: "Notify airport operations / ARFF", responsible_role: "Operations", time_target: "Immediate", is_critical: false },
      { action_text: "Deploy spill kit materials — prevent spread to drains and waterways", responsible_role: "Trained Personnel", time_target: "Immediate", is_critical: true },
      { action_text: "Report to EPA National Response Center (800-424-8802) if >25 gallons", responsible_role: "Safety Manager", time_target: "Within 1 hour", is_critical: true },
      { action_text: "Notify state environmental agency per local requirements", responsible_role: "Safety Manager", time_target: "Same day", is_critical: false },
      { action_text: "Arrange professional cleanup if needed — document disposal", responsible_role: "Safety Manager", time_target: "Same day", is_critical: false },
      { action_text: "Complete cleanup documentation and file SMS safety report", responsible_role: "Safety Manager", time_target: "Within 48 hours", is_critical: false },
    ],
  },
  {
    name: "Missing / Overdue Aircraft",
    category: "overdue",
    description: "Response procedures for missing or overdue aircraft including search coordination with ATC, AFRCC, and SAR resources.",
    checklist: [
      { action_text: "Confirm aircraft is overdue — check ETA, fuel endurance, alternate destinations", responsible_role: "Operations", time_target: "Immediate", is_critical: true },
      { action_text: "Attempt radio contact on all frequencies (CTAF, company, 121.5)", responsible_role: "Operations", time_target: "Immediate", is_critical: true },
      { action_text: "Contact destination airport for arrival confirmation", responsible_role: "Operations", time_target: "Within 15 min", is_critical: true },
      { action_text: "Contact alternate airports along route of flight", responsible_role: "Operations", time_target: "Within 30 min", is_critical: false },
      { action_text: "Notify company leadership / accountable executive", responsible_role: "Operations", time_target: "Within 15 min", is_critical: true },
      { action_text: "Contact ATC / FSS to check flight plan status and radar contact", responsible_role: "Operations", time_target: "Within 30 min", is_critical: true },
      { action_text: "If not located: request ALNOT (Alert Notice) through FSS", responsible_role: "Safety Manager", time_target: "Within 1 hour", is_critical: true },
      { action_text: "Contact Air Force Rescue Coordination Center (AFRCC) at 800-851-3051", responsible_role: "Safety Manager", time_target: "Within 1 hour", is_critical: true },
      { action_text: "Notify next of kin that aircraft is overdue (handle sensitively)", responsible_role: "Accountable Executive", time_target: "When SAR activated", is_critical: true },
      { action_text: "Gather pilot, passenger, and aircraft information for SAR", responsible_role: "Operations", time_target: "Within 1 hour", is_critical: false },
      { action_text: "Coordinate with SAR — provide flight plan, fuel load, souls on board", responsible_role: "Safety Manager", time_target: "Ongoing", is_critical: false },
      { action_text: "Designate media spokesperson — no unauthorized statements", responsible_role: "Accountable Executive", time_target: "When needed", is_critical: false },
      { action_text: "Notify insurance carrier", responsible_role: "Accountable Executive", time_target: "Same day", is_critical: false },
      { action_text: "Maintain communication log of all contacts and actions taken", responsible_role: "Operations", time_target: "Ongoing", is_critical: false },
      { action_text: "If located: coordinate with local emergency services and NTSB as needed", responsible_role: "Safety Manager", time_target: "Immediate", is_critical: true },
    ],
  },
];

function getCat(id) {
  return ERP_CATEGORIES.find(c => c.id === id) || ERP_CATEGORIES[6];
}
function getDrillType(id) {
  return DRILL_TYPES.find(t => t.id === id) || DRILL_TYPES[0];
}
function getDrillStatus(id) {
  return DRILL_STATUSES.find(s => s.id === id) || DRILL_STATUSES[0];
}

function needsReview(plan) {
  if (!plan.last_reviewed_at) return true;
  return (Date.now() - new Date(plan.last_reviewed_at).getTime()) > 365 * 86400000;
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

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function EmergencyResponsePlan({
  profile, session, org, erpPlans, erpDrills,
  onCreatePlan, onUpdatePlan, onDeletePlan,
  onLoadChecklist, onSaveChecklist, onLoadCallTree, onSaveCallTree,
  onCreateDrill, onUpdateDrill, onDeleteDrill,
  onInitTemplates, onCreateActionFromDrill,
}) {
  const [view, setView] = useState("list");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", category: "general", description: "" });

  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const tier = org?.subscription_tier || org?.tier || "starter";
  const isFree = tier === "free";
  const isStarter = tier === "starter";
  const atLimit = isFree ? (erpPlans || []).length >= 1 : isStarter && (erpPlans || []).length >= 2;

  const plans = useMemo(() => {
    let list = erpPlans || [];
    if (filterCat !== "all") list = list.filter(p => p.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }
    return list;
  }, [erpPlans, filterCat, search]);

  // ── LIST VIEW ────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>Emergency Response Plans</div>
            <div style={{ fontSize: 11, color: MUTED }}>Part 5 §5.27 — maintain and drill your ERPs</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setView("drills")}>Drills</Btn>
            {isAdmin && <Btn primary disabled={atLimit} onClick={() => setView("new")}>+ New Plan</Btn>}
          </div>
        </div>

        {/* Tier limit message */}
        {isFree && atLimit && (
          <div style={{ ...card, padding: 12, marginBottom: 12, borderLeft: `3px solid ${AMBER}` }}>
            <span style={{ fontSize: 11, color: AMBER }}>Free plan: 1 read-only ERP plan. Upgrade to Starter for more.</span>
          </div>
        )}
        {isStarter && atLimit && (
          <div style={{ ...card, padding: 12, marginBottom: 12, borderLeft: `3px solid ${AMBER}` }}>
            <span style={{ fontSize: 11, color: AMBER }}>Starter plan: max 2 ERP plans. Upgrade for unlimited.</span>
          </div>
        )}

        {/* Load Templates card */}
        {(erpPlans || []).length === 0 && isAdmin && (
          <div style={{ ...card, padding: 24, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 4 }}>No Emergency Response Plans Yet</div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Load 6 industry-standard ERP templates with checklists and call trees to get started.</div>
            <Btn primary onClick={onInitTemplates}>Load Templates</Btn>
          </div>
        )}

        {/* Filters */}
        {(erpPlans || []).length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => setFilterCat("all")} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${filterCat === "all" ? WHITE : BORDER}`, background: filterCat === "all" ? WHITE : "transparent", color: filterCat === "all" ? BLACK : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
            {ERP_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${filterCat === c.id ? c.color : BORDER}`, background: filterCat === c.id ? `${c.color}20` : "transparent", color: filterCat === c.id ? c.color : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {c.icon} {c.label}
              </button>
            ))}
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plans..." style={{ ...inp, maxWidth: 200, padding: "4px 10px", fontSize: 12 }} />
          </div>
        )}

        {/* Plan cards */}
        {plans.map(plan => {
          const cat = getCat(plan.category);
          const nr = needsReview(plan);
          return (
            <div key={plan.id} onClick={() => { setSelectedPlan(plan); setView("detail"); }} style={{ ...card, padding: 16, marginBottom: 8, cursor: "pointer", borderLeft: `3px solid ${cat.color}`, transition: "border-color 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>{plan.name}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{cat.label} · v{plan.version}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {nr && <Badge label="Needs Review" color={AMBER} />}
                  <Badge label={plan.is_active ? "Active" : "Inactive"} color={plan.is_active ? GREEN : MUTED} />
                  {plan.last_reviewed_at && (
                    <span style={{ fontSize: 10, color: MUTED }}>Reviewed {new Date(plan.last_reviewed_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              {plan.description && <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>{plan.description.slice(0, 150)}{plan.description.length > 150 ? "..." : ""}</div>}
            </div>
          );
        })}
        {plans.length === 0 && (erpPlans || []).length > 0 && (
          <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 13 }}>No plans match your filter.</div>
        )}
      </div>
    );
  }

  // ── NEW PLAN FORM ────────────────────────────────────────────
  if (view === "new") {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>← Back to Plans</button>
        <div style={{ ...card, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Create New ERP</div>
          <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Plan Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bird Strike Response" style={{ ...inp, marginBottom: 12 }} />
          <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, marginBottom: 12 }}>
            {ERP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
          <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Describe the emergency scenario and scope of this plan..." style={{ ...inp, marginBottom: 16, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn primary disabled={!form.name.trim()} onClick={async () => {
              await onCreatePlan({ name: form.name.trim(), category: form.category, description: form.description.trim() });
              setForm({ name: "", category: "general", description: "" });
              setView("list");
            }}>Create Plan</Btn>
            <Btn onClick={() => { setView("list"); setForm({ name: "", category: "general", description: "" }); }}>Cancel</Btn>
          </div>
        </div>
      </div>
    );
  }

  // ── DETAIL VIEW ──────────────────────────────────────────────
  if (view === "detail" && selectedPlan) {
    return <PlanDetail
      plan={selectedPlan}
      isAdmin={isAdmin && !isFree}
      onBack={() => { setSelectedPlan(null); setView("list"); }}
      onUpdatePlan={isFree ? null : onUpdatePlan}
      onDeletePlan={isFree ? null : onDeletePlan}
      onLoadChecklist={onLoadChecklist}
      onSaveChecklist={onSaveChecklist}
      onLoadCallTree={onLoadCallTree}
      onSaveCallTree={onSaveCallTree}
      session={session}
      erpPlans={erpPlans}
    />;
  }

  // ── DRILLS VIEW ──────────────────────────────────────────────
  if (view === "drills") {
    return <DrillsView
      erpDrills={erpDrills}
      erpPlans={erpPlans}
      isAdmin={isAdmin}
      onBack={() => setView("list")}
      onCreateDrill={onCreateDrill}
      onUpdateDrill={onUpdateDrill}
      onDeleteDrill={onDeleteDrill}
      onCreateActionFromDrill={onCreateActionFromDrill}
      session={session}
    />;
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// PLAN DETAIL (checklist / call tree / quick ref)
// ════════════════════════════════════════════════════════════════
function PlanDetail({ plan, isAdmin, onBack, onUpdatePlan, onDeletePlan, onLoadChecklist, onSaveChecklist, onLoadCallTree, onSaveCallTree, session, erpPlans }) {
  const [tab, setTab] = useState("checklist");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);

  // Sync if upstream plan changes
  useEffect(() => {
    const fresh = (erpPlans || []).find(p => p.id === plan.id);
    if (fresh) setLocalPlan(fresh);
  }, [erpPlans, plan.id]);

  const cat = getCat(localPlan.category);
  const nr = needsReview(localPlan);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>← Back to Plans</button>

      {/* Header */}
      <div style={{ ...card, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{cat.icon}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>{localPlan.name}</div>
              <div style={{ fontSize: 11, color: MUTED }}>{cat.label} · v{localPlan.version}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {nr && <Badge label="Needs Review" color={AMBER} />}
            {isAdmin && (
              <Btn small onClick={async () => {
                await onUpdatePlan(localPlan.id, {
                  is_active: !localPlan.is_active,
                });
              }}>
                {localPlan.is_active ? "Deactivate" : "Activate"}
              </Btn>
            )}
            {isAdmin && (
              <Btn small primary onClick={async () => {
                await onUpdatePlan(localPlan.id, {
                  last_reviewed_at: new Date().toISOString(),
                  reviewed_by: session?.user?.id,
                  version: (localPlan.version || 1) + 1,
                });
              }}>
                Mark as Reviewed
              </Btn>
            )}
            {isAdmin && !confirmDelete && (
              <Btn small danger onClick={() => setConfirmDelete(true)}>Delete</Btn>
            )}
            {isAdmin && confirmDelete && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: RED }}>Confirm?</span>
                <Btn small danger onClick={async () => { await onDeletePlan(localPlan.id); onBack(); }}>Yes, Delete</Btn>
                <Btn small onClick={() => setConfirmDelete(false)}>Cancel</Btn>
              </div>
            )}
          </div>
        </div>
        {localPlan.description && <div style={{ fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>{localPlan.description}</div>}
        {localPlan.last_reviewed_at && (
          <div style={{ fontSize: 10, color: MUTED, marginTop: 8 }}>Last reviewed: {new Date(localPlan.last_reviewed_at).toLocaleDateString()}</div>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[["checklist", "Checklist"], ["calltree", "Call Tree"], ["quickref", "Quick Reference"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 16px", borderRadius: 6,
            border: `1px solid ${tab === id ? WHITE : BORDER}`,
            background: tab === id ? WHITE : "transparent",
            color: tab === id ? BLACK : MUTED,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {tab === "checklist" && <ChecklistTab planId={localPlan.id} isAdmin={isAdmin} onLoad={onLoadChecklist} onSave={onSaveChecklist} />}
      {tab === "calltree" && <CallTreeTab planId={localPlan.id} isAdmin={isAdmin} onLoad={onLoadCallTree} onSave={onSaveCallTree} />}
      {tab === "quickref" && <QuickRefTab plan={localPlan} onLoadChecklist={onLoadChecklist} onLoadCallTree={onLoadCallTree} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CHECKLIST TAB
// ════════════════════════════════════════════════════════════════
function ChecklistTab({ planId, isAdmin, onLoad, onSave }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const data = await onLoad(planId);
    setItems(data || []);
    setLoading(false);
  }, [planId, onLoad]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const startEdit = () => {
    setEditItems(items.map(it => ({ ...it })));
    setEditing(true);
  };

  const moveItem = (idx, dir) => {
    const arr = [...editItems];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setEditItems(arr);
  };

  const save = async () => {
    setSaving(true);
    await onSave(planId, editItems);
    await loadItems();
    setEditing(false);
    setSaving(false);
  };

  if (loading) return <div style={{ color: MUTED, fontSize: 12, padding: 20 }}>Loading checklist...</div>;

  if (editing) {
    return (
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Edit Checklist</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn small primary disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</Btn>
          </div>
        </div>
        {editItems.map((item, i) => (
          <div key={i} style={{ background: item.is_critical ? "rgba(239,68,68,0.05)" : "transparent", border: `1px solid ${item.is_critical ? `${RED}30` : BORDER}`, borderRadius: 6, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", color: i === 0 ? BORDER : MUTED, cursor: i === 0 ? "default" : "pointer", fontSize: 14, padding: 0 }}>▲</button>
                <button onClick={() => moveItem(i, 1)} disabled={i === editItems.length - 1} style={{ background: "none", border: "none", color: i === editItems.length - 1 ? BORDER : MUTED, cursor: i === editItems.length - 1 ? "default" : "pointer", fontSize: 14, padding: 0 }}>▼</button>
              </div>
              <div style={{ flex: 1 }}>
                <input value={item.action_text} onChange={e => { const arr = [...editItems]; arr[i] = { ...arr[i], action_text: e.target.value }; setEditItems(arr); }} style={{ ...inp, marginBottom: 6 }} placeholder="Action text..." />
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={item.responsible_role || ""} onChange={e => { const arr = [...editItems]; arr[i] = { ...arr[i], responsible_role: e.target.value }; setEditItems(arr); }} style={{ ...inp, maxWidth: 180 }} placeholder="Role..." />
                  <input value={item.time_target || ""} onChange={e => { const arr = [...editItems]; arr[i] = { ...arr[i], time_target: e.target.value }; setEditItems(arr); }} style={{ ...inp, maxWidth: 140 }} placeholder="Time target..." />
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: RED, whiteSpace: "nowrap", cursor: "pointer" }}>
                    <input type="checkbox" checked={item.is_critical || false} onChange={e => { const arr = [...editItems]; arr[i] = { ...arr[i], is_critical: e.target.checked }; setEditItems(arr); }} /> Critical
                  </label>
                </div>
              </div>
              <button onClick={() => setEditItems(editItems.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
            </div>
          </div>
        ))}
        <Btn small onClick={() => setEditItems([...editItems, { action_text: "", responsible_role: "", time_target: "", is_critical: false }])}>+ Add Item</Btn>
      </div>
    );
  }

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Response Checklist ({items.length} items)</span>
        {isAdmin && <Btn small onClick={startEdit}>Edit</Btn>}
      </div>
      {items.length === 0 && <div style={{ color: MUTED, fontSize: 12 }}>No checklist items yet. {isAdmin ? "Click Edit to add items." : ""}</div>}
      {items.map((item, i) => (
        <div key={item.id || i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < items.length - 1 ? `1px solid ${BORDER}` : "none", background: item.is_critical ? "rgba(239,68,68,0.04)" : "transparent" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: item.is_critical ? RED : MUTED, minWidth: 24 }}>{i + 1}.</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: WHITE, lineHeight: 1.5 }}>{item.action_text}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              {item.responsible_role && <Badge label={item.responsible_role} color={CYAN} />}
              {item.time_target && <Badge label={item.time_target} color={MUTED} />}
              {item.is_critical && <Badge label="CRITICAL" color={RED} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CALL TREE TAB
// ════════════════════════════════════════════════════════════════
function CallTreeTab({ planId, isAdmin, onLoad, onSave }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContacts, setEditContacts] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const data = await onLoad(planId);
    setContacts(data || []);
    setLoading(false);
  }, [planId, onLoad]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const startEdit = () => {
    setEditContacts(contacts.map(c => ({ ...c })));
    setEditing(true);
  };

  const moveContact = (idx, dir) => {
    const arr = [...editContacts];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setEditContacts(arr);
  };

  const save = async () => {
    setSaving(true);
    await onSave(planId, editContacts);
    await loadContacts();
    setEditing(false);
    setSaving(false);
  };

  if (loading) return <div style={{ color: MUTED, fontSize: 12, padding: 20 }}>Loading call tree...</div>;

  if (editing) {
    return (
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Edit Call Tree</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn small primary disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</Btn>
          </div>
        </div>
        {editContacts.map((c, i) => (
          <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button onClick={() => moveContact(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", color: i === 0 ? BORDER : MUTED, cursor: i === 0 ? "default" : "pointer", fontSize: 14, padding: 0 }}>▲</button>
                <button onClick={() => moveContact(i, 1)} disabled={i === editContacts.length - 1} style={{ background: "none", border: "none", color: i === editContacts.length - 1 ? BORDER : MUTED, cursor: i === editContacts.length - 1 ? "default" : "pointer", fontSize: 14, padding: 0 }}>▼</button>
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <input value={c.contact_name} onChange={e => { const arr = [...editContacts]; arr[i] = { ...arr[i], contact_name: e.target.value }; setEditContacts(arr); }} style={inp} placeholder="Contact name..." />
                <input value={c.contact_role || ""} onChange={e => { const arr = [...editContacts]; arr[i] = { ...arr[i], contact_role: e.target.value }; setEditContacts(arr); }} style={inp} placeholder="Role..." />
                <input value={c.phone_primary || ""} onChange={e => { const arr = [...editContacts]; arr[i] = { ...arr[i], phone_primary: e.target.value }; setEditContacts(arr); }} style={inp} placeholder="Primary phone..." />
                <input value={c.phone_secondary || ""} onChange={e => { const arr = [...editContacts]; arr[i] = { ...arr[i], phone_secondary: e.target.value }; setEditContacts(arr); }} style={inp} placeholder="Secondary phone..." />
                <input value={c.email || ""} onChange={e => { const arr = [...editContacts]; arr[i] = { ...arr[i], email: e.target.value }; setEditContacts(arr); }} style={inp} placeholder="Email..." />
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MUTED, cursor: "pointer" }}>
                  <input type="checkbox" checked={c.is_external || false} onChange={e => { const arr = [...editContacts]; arr[i] = { ...arr[i], is_external: e.target.checked }; setEditContacts(arr); }} /> External
                </label>
              </div>
              <button onClick={() => setEditContacts(editContacts.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
            </div>
          </div>
        ))}
        <Btn small onClick={() => setEditContacts([...editContacts, { contact_name: "", contact_role: "", phone_primary: "", phone_secondary: "", email: "", is_external: false }])}>+ Add Contact</Btn>
      </div>
    );
  }

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Call Tree ({contacts.length} contacts)</span>
        {isAdmin && <Btn small onClick={startEdit}>Edit</Btn>}
      </div>
      {contacts.length === 0 && <div style={{ color: MUTED, fontSize: 12 }}>No call tree entries yet. {isAdmin ? "Click Edit to add contacts." : ""}</div>}
      {contacts.map((c, i) => (
        <div key={c.id || i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < contacts.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: MUTED, minWidth: 24 }}>{i + 1}.</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{c.contact_name}</span>
              {c.contact_role && <Badge label={c.contact_role} color={CYAN} />}
              <Badge label={c.is_external ? "External" : "Internal"} color={c.is_external ? AMBER : GREEN} />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              {c.phone_primary && <span style={{ fontSize: 12, color: OFF_WHITE }}>📞 {c.phone_primary}</span>}
              {c.phone_secondary && <span style={{ fontSize: 12, color: MUTED }}>📞 {c.phone_secondary}</span>}
              {c.email && <span style={{ fontSize: 12, color: MUTED }}>✉ {c.email}</span>}
            </div>
            {c.notes && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{c.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// QUICK REFERENCE TAB
// ════════════════════════════════════════════════════════════════
function QuickRefTab({ plan, onLoadChecklist, onLoadCallTree }) {
  const [criticalItems, setCriticalItems] = useState([]);
  const [callTree, setCallTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [cl, ct] = await Promise.all([
        onLoadChecklist(plan.id),
        onLoadCallTree(plan.id),
      ]);
      if (mounted) {
        setCriticalItems((cl || []).filter(it => it.is_critical));
        setCallTree(ct || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [plan.id, onLoadChecklist, onLoadCallTree]);

  if (loading) return <div style={{ color: MUTED, fontSize: 12, padding: 20 }}>Loading...</div>;

  const cat = getCat(plan.category);

  return (
    <div>
      <div style={{ ...card, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Quick Reference Card</span>
          <Btn small onClick={() => window.print()}>Print</Btn>
        </div>

        {/* Plan info */}
        <div className="erp-print-section" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: cat.color, marginBottom: 4 }}>{cat.icon} {plan.name}</div>
          {plan.description && <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{plan.description}</div>}
        </div>

        {/* Critical actions */}
        {criticalItems.length > 0 && (
          <div className="erp-print-section" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: RED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Critical Actions</div>
            {criticalItems.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontWeight: 700, color: RED, minWidth: 20, fontSize: 12 }}>{i + 1}.</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: WHITE }}>{item.action_text}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                    {item.responsible_role && <span style={{ fontSize: 10, color: CYAN }}>{item.responsible_role}</span>}
                    {item.time_target && <span style={{ fontSize: 10, color: MUTED }}>{item.time_target}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call tree */}
        {callTree.length > 0 && (
          <div className="erp-print-section">
            <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Emergency Contacts</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
              {callTree.map((c, i) => (
                <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{c.contact_name}</div>
                  {c.contact_role && <div style={{ fontSize: 10, color: MUTED }}>{c.contact_role}</div>}
                  {c.phone_primary && <div style={{ fontSize: 12, color: GREEN, marginTop: 4 }}>📞 {c.phone_primary}</div>}
                  {c.phone_secondary && <div style={{ fontSize: 11, color: MUTED }}>📞 {c.phone_secondary}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .erp-print-section, .erp-print-section * { visibility: visible; }
          .erp-print-section { position: relative; color: #000 !important; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DRILLS VIEW
// ════════════════════════════════════════════════════════════════
function DrillsView({ erpDrills, erpPlans, isAdmin, onBack, onCreateDrill, onUpdateDrill, onDeleteDrill, onCreateActionFromDrill, session }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [expandedDrill, setExpandedDrill] = useState(null);
  const [editingDrill, setEditingDrill] = useState(null);
  const [form, setForm] = useState({ erp_plan_id: "", drill_type: "tabletop", scheduled_date: "", participants: "" });
  const [editForm, setEditForm] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  const drills = useMemo(() => {
    let list = erpDrills || [];
    if (filterStatus !== "all") list = list.filter(d => d.status === filterStatus);
    return list;
  }, [erpDrills, filterStatus]);

  const getPlanName = (planId) => {
    const p = (erpPlans || []).find(p => p.id === planId);
    return p ? p.name : "Unknown Plan";
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>← Back to Plans</button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>ERP Drills & Exercises</div>
          <div style={{ fontSize: 11, color: MUTED }}>Track tabletop, functional, and full-scale drills</div>
        </div>
        {isAdmin && <Btn primary onClick={() => setShowNew(!showNew)}>+ Schedule Drill</Btn>}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button onClick={() => setFilterStatus("all")} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${filterStatus === "all" ? WHITE : BORDER}`, background: filterStatus === "all" ? WHITE : "transparent", color: filterStatus === "all" ? BLACK : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
        {DRILL_STATUSES.map(s => (
          <button key={s.id} onClick={() => setFilterStatus(s.id)} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${filterStatus === s.id ? s.color : BORDER}`, background: filterStatus === s.id ? `${s.color}20` : "transparent", color: filterStatus === s.id ? s.color : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* New drill form */}
      {showNew && (
        <div style={{ ...card, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 12 }}>Schedule New Drill</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>ERP Plan</label>
              <select value={form.erp_plan_id} onChange={e => setForm(f => ({ ...f, erp_plan_id: e.target.value }))} style={inp}>
                <option value="">Select a plan...</option>
                {(erpPlans || []).filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Drill Type</label>
              <select value={form.drill_type} onChange={e => setForm(f => ({ ...f, drill_type: e.target.value }))} style={inp}>
                {DRILL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Scheduled Date</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Participants (comma-separated)</label>
              <input value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} placeholder="e.g. John, Jane, Bob" style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn primary disabled={!form.erp_plan_id || !form.scheduled_date} onClick={async () => {
              const participants = form.participants.split(",").map(p => p.trim()).filter(Boolean);
              await onCreateDrill({
                erp_plan_id: form.erp_plan_id,
                drill_type: form.drill_type,
                scheduled_date: form.scheduled_date,
                participants,
                status: "scheduled",
                conducted_by: session?.user?.id,
              });
              setForm({ erp_plan_id: "", drill_type: "tabletop", scheduled_date: "", participants: "" });
              setShowNew(false);
            }}>Schedule</Btn>
            <Btn onClick={() => setShowNew(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Drills list */}
      {drills.length === 0 && <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 13 }}>No drills {filterStatus !== "all" ? "with this status" : "scheduled yet"}.</div>}
      {drills.map(drill => {
        const dt = getDrillType(drill.drill_type);
        const ds = getDrillStatus(drill.status);
        const expanded = expandedDrill === drill.id;
        const isEditing = editingDrill === drill.id;

        return (
          <div key={drill.id} style={{ ...card, padding: 16, marginBottom: 8 }}>
            <div onClick={() => setExpandedDrill(expanded ? null : drill.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{getPlanName(drill.erp_plan_id)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <Badge label={dt.label} color={dt.color} />
                  <Badge label={ds.label} color={ds.color} />
                  {drill.scheduled_date && <span style={{ fontSize: 11, color: MUTED }}>Scheduled: {new Date(drill.scheduled_date).toLocaleDateString()}</span>}
                  {drill.completed_date && <span style={{ fontSize: 11, color: GREEN }}>Completed: {new Date(drill.completed_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <span style={{ fontSize: 14, color: MUTED }}>{expanded ? "▲" : "▼"}</span>
            </div>

            {expanded && !isEditing && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                {drill.participants && drill.participants.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>Participants: </span>
                    <span style={{ fontSize: 12, color: OFF_WHITE }}>{drill.participants.join(", ")}</span>
                  </div>
                )}
                {drill.lessons_learned && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>Lessons Learned:</span>
                    <div style={{ fontSize: 12, color: OFF_WHITE, marginTop: 2, lineHeight: 1.5 }}>{drill.lessons_learned}</div>
                  </div>
                )}
                {drill.findings && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>Findings:</span>
                    <div style={{ fontSize: 12, color: OFF_WHITE, marginTop: 2, lineHeight: 1.5 }}>{drill.findings}</div>
                  </div>
                )}
                {isAdmin && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {drill.status === "scheduled" && (
                      <Btn small onClick={() => {
                        setEditingDrill(drill.id);
                        setEditForm({ completed_date: new Date().toISOString().split("T")[0], lessons_learned: drill.lessons_learned || "", findings: drill.findings || "" });
                      }}>Complete Drill</Btn>
                    )}
                    {drill.status === "scheduled" && (
                      <Btn small onClick={() => onUpdateDrill(drill.id, { status: "cancelled" })}>Cancel Drill</Btn>
                    )}
                    {drill.status === "completed" && onCreateActionFromDrill && (
                      <Btn small primary onClick={() => onCreateActionFromDrill(drill)}>Create Corrective Action</Btn>
                    )}
                    {confirmDel === drill.id ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: RED }}>Confirm?</span>
                        <Btn small danger onClick={async () => { await onDeleteDrill(drill.id); setConfirmDel(null); }}>Yes</Btn>
                        <Btn small onClick={() => setConfirmDel(null)}>No</Btn>
                      </div>
                    ) : (
                      <Btn small danger onClick={() => setConfirmDel(drill.id)}>Delete</Btn>
                    )}
                  </div>
                )}
              </div>
            )}

            {expanded && isEditing && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: WHITE, marginBottom: 8 }}>Complete Drill</div>
                <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Completion Date</label>
                <input type="date" value={editForm.completed_date || ""} onChange={e => setEditForm(f => ({ ...f, completed_date: e.target.value }))} style={{ ...inp, maxWidth: 200, marginBottom: 8 }} />
                <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Lessons Learned</label>
                <textarea value={editForm.lessons_learned || ""} onChange={e => setEditForm(f => ({ ...f, lessons_learned: e.target.value }))} rows={3} style={{ ...inp, marginBottom: 8, resize: "vertical" }} placeholder="Key takeaways from the drill..." />
                <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>Findings</label>
                <textarea value={editForm.findings || ""} onChange={e => setEditForm(f => ({ ...f, findings: e.target.value }))} rows={3} style={{ ...inp, marginBottom: 12, resize: "vertical" }} placeholder="Issues identified, areas for improvement..." />
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn primary onClick={async () => {
                    await onUpdateDrill(drill.id, { status: "completed", completed_date: editForm.completed_date, lessons_learned: editForm.lessons_learned, findings: editForm.findings });
                    setEditingDrill(null);
                    setEditForm({});
                  }}>Save & Complete</Btn>
                  <Btn onClick={() => { setEditingDrill(null); setEditForm({}); }}>Cancel</Btn>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Export templates for use in index.js init handler
export { ERP_TEMPLATES, DEFAULT_CALL_TREE };
