import { useMemo } from "react";

const BLACK = "#050508";
const CARD = "#0e1118";
const BORDER = "rgba(255,255,255,0.04)";
const WHITE = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.35)";
const GREEN = "#4ADE80";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const CATEGORY_ICONS = {
  policy: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  training: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>
    </svg>
  ),
  action: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  survey: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
    </svg>
  ),
  approval: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  report: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  ),
  audit: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  erp: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  moc: (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
};

function getIcon(type, color) {
  return (CATEGORY_ICONS[type] || CATEGORY_ICONS.action)(color);
}

export default function MobileComplianceView({
  profile, session,
  policies, trainingRequirements, trainingRecords,
  actions, frats, reports, auditSchedules,
  erpPlans, mocItems, cultureSurveys, mySurveyResponseIds,
  asapCorrActions,
  onNavigate,
}) {
  const userId = session?.user?.id || profile?.id;
  const userRole = profile?.role || "pilot";
  const now = new Date();
  const isAdmin = ["admin", "safety_manager"].includes(userRole);
  const isApprover = isAdmin || (profile?.permissions || []).includes("approver");

  const pilotName = (uid) => profile?.full_name || "Unknown";

  const items = useMemo(() => {
    const list = [];

    // — Unacknowledged policies —
    const activePolicies = (policies || []).filter(p => p && p.status === "active");
    activePolicies.filter(p => !(p.acknowledgments || []).some(a => a.user_id === userId)).forEach(p => {
      list.push({ id: `policy-${p.id}`, label: p.title || "Untitled Policy", category: "Acknowledge Policy", nav: "policies", priority: 0, color: AMBER, icon: "policy" });
    });

    // — Training —
    const myReqs = (trainingRequirements || []).filter(r => r && (!r.required_for || r.required_for.length === 0 || r.required_for.includes(userRole)));
    const myRecs = (trainingRecords || []).filter(r => r && r.user_id === userId);
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    myReqs.forEach(req => {
      const rec = myRecs.filter(r => r.requirement_id === req.id).sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0];
      if (!rec) {
        list.push({ id: `train-${req.id}`, label: req.title, category: "Complete Training", nav: "training", priority: 2, color: CYAN, icon: "training" });
      } else {
        const exp = rec.expiry_date ? new Date(rec.expiry_date) : null;
        if (exp && exp < now) {
          list.push({ id: `train-${req.id}`, label: req.title, category: "Overdue Training", detail: `Expired ${exp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, nav: "training", priority: 0, color: RED, icon: "training" });
        } else if (exp && exp < soon) {
          list.push({ id: `train-${req.id}`, label: req.title, category: "Training Due Soon", detail: `Expires ${exp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, nav: "training", priority: 1, color: AMBER, icon: "training" });
        }
      }
    });

    // — Assigned corrective actions —
    const myActions = (actions || []).filter(a => a && a.assigned_to === userId && a.status !== "completed" && a.status !== "closed");
    myActions.forEach(a => {
      const overdue = a.due_date && new Date(a.due_date) < now;
      list.push({ id: `action-${a.id}`, label: a.title || "Corrective Action", category: overdue ? "Overdue Action" : "Corrective Action", detail: a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : null, nav: "actions", priority: overdue ? 0 : 2, color: overdue ? RED : AMBER, icon: "action" });
    });

    // — Culture surveys —
    const respondedSet = new Set(mySurveyResponseIds || []);
    (cultureSurveys || []).filter(s => s && s.status === "active" && !respondedSet.has(s.id)).forEach(s => {
      list.push({ id: `survey-${s.id}`, label: s.title || "Safety Culture Survey", category: "Complete Survey", nav: null, priority: 2, color: CYAN, icon: "survey" });
    });

    // — Approvers: Pending FRAT approvals —
    if (isApprover) {
      const pending = (frats || []).filter(f => f && (f.approvalStatus === "pending" || f.approvalStatus === "review"));
      pending.forEach(f => {
        list.push({ id: `approval-${f.dbId || f.id}`, label: `${f.pilot || "Pilot"} — ${f.departure || "?"} to ${f.destination || "?"}`, category: "FRAT Approval", detail: `Score ${f.score}`, nav: "flights", priority: 1, color: AMBER, icon: "approval" });
      });
    }

    // — Admin/Safety Mgr —
    if (isAdmin) {
      // Reports needing review
      (reports || []).filter(r => r && (r.status === "open" || r.status === "under_review")).forEach(r => {
        list.push({ id: `report-${r.id}`, label: r.title || r.report_code || "Safety Report", category: "Review Report", nav: "reports", priority: 2, color: CYAN, icon: "report" });
      });

      // Org-wide overdue corrective actions (not already listed)
      (actions || []).filter(a => a && a.assigned_to !== userId && a.status !== "completed" && a.status !== "closed" && a.due_date && new Date(a.due_date) < now).forEach(a => {
        list.push({ id: `orgaction-${a.id}`, label: a.title || "Corrective Action", category: "Overdue Action (Org)", detail: a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : null, nav: "actions", priority: 0, color: RED, icon: "action" });
      });

      // Audits due within 30 days
      const auditSoon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      (auditSchedules || []).filter(a => a && a.next_due_date && new Date(a.next_due_date) <= auditSoon).forEach(a => {
        const due = new Date(a.next_due_date);
        const overdue = due < now;
        list.push({ id: `audit-${a.id}`, label: a.name || a.template_name || "Audit", category: overdue ? "Overdue Audit" : "Audit Due Soon", detail: `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, nav: null, priority: overdue ? 0 : 1, color: overdue ? RED : AMBER, icon: "audit" });
      });

      // ERP plans needing review (30-day advance)
      (erpPlans || []).filter(p => p && p.is_active).forEach(p => {
        const lastReview = p.last_reviewed_at ? new Date(p.last_reviewed_at) : null;
        const reviewDue = lastReview ? new Date(lastReview.getTime() + 365 * 86400000) : null;
        const dueWithin30 = reviewDue ? reviewDue.getTime() <= now.getTime() + 30 * 86400000 : true;
        if (!dueWithin30) return;
        const overdue = !lastReview || reviewDue.getTime() <= now.getTime();
        list.push({ id: `erp-${p.id}`, label: p.name || "ERP Plan", category: overdue ? "ERP Review Overdue" : "ERP Review Due Soon", detail: lastReview ? `Last reviewed ${lastReview.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Never reviewed", nav: "erp", priority: overdue ? 0 : 1, color: overdue ? RED : AMBER, icon: "erp" });
      });

      // Open MOC items
      (mocItems || []).filter(m => m && m.status !== "completed" && m.status !== "cancelled").forEach(m => {
        list.push({ id: `moc-${m.id}`, label: m.title || "Change Request", category: "Review MOC", nav: null, priority: 2, color: CYAN, icon: "moc" });
      });

      // ASAP corrective actions
      (asapCorrActions || []).filter(a => a && a.status !== "completed" && a.status !== "closed").forEach(a => {
        list.push({ id: `asap-${a.id}`, label: a.title || "ASAP Action", category: "ASAP Action Due", nav: null, priority: 1, color: AMBER, icon: "action" });
      });
    }

    list.sort((a, b) => a.priority - b.priority);
    return list;
  }, [policies, trainingRequirements, trainingRecords, actions, frats, reports, auditSchedules, erpPlans, mocItems, cultureSurveys, mySurveyResponseIds, asapCorrActions, profile, userId]);

  const overdueCount = items.filter(i => i.priority === 0).length;
  const warningCount = items.filter(i => i.priority === 1).length;

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* Summary bar */}
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            <span style={{ fontSize: 15, fontWeight: 600, color: GREEN }}>All caught up</span>
          </div>
        ) : (
          <>
            <span style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
            {overdueCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: RED, background: `${RED}15`, padding: "2px 8px", borderRadius: 10 }}>{overdueCount} overdue</span>
            )}
            {warningCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: AMBER, background: `${AMBER}15`, padding: "2px 8px", borderRadius: 10 }}>{warningCount} due soon</span>
            )}
          </>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: `${GREEN}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>You're compliant</div>
          <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>No policies, training, or actions need your attention right now.</div>
        </div>
      ) : (
        <div>
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => item.nav && onNavigate(item.nav)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px", background: "none", border: "none",
                borderBottom: `1px solid ${BORDER}`, cursor: item.nav ? "pointer" : "default",
                textAlign: "left",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 16, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${item.color}12`,
              }}>
                {getIcon(item.icon, item.color)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: WHITE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{item.category}</span>
                  {item.detail && <span style={{ color: item.color }}>{item.detail}</span>}
                </div>
              </div>
              {item.nav && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.4 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
