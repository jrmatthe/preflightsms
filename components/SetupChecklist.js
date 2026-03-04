import { useState, useEffect, useRef, useMemo } from "react";

// Colors (match existing dark theme)
const DARK = "#111111";
const CARD = "#161616";
const CARD_ELEVATED = "#1A1A1A";
const BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const CYAN = "#22D3EE";
const AMBER = "#F59E0B";

const card = { background: CARD, borderRadius: 10 };

// Feature ship date — orgs created before this won't see the checklist
export const SETUP_CHECKLIST_SHIP_DATE = "2026-03-04T00:00:00Z";

// Checklist item definitions
export const SETUP_CHECKLIST_ITEMS = [
  {
    id: "org_profile",
    title: "Complete organization profile",
    description: "Set your organization name and upload a logo.",
    category: "Essentials",
    xp: 10,
    deferrable: false,
    action: { tab: "admin", adminTab: "general", label: "Go to Settings" },
    autoDetect: (data) => !!(data.org?.name && data.org?.logo_url),
  },
  {
    id: "first_aircraft",
    title: "Add your first aircraft",
    description: "Register an aircraft in your fleet to start tracking operations.",
    category: "Essentials",
    xp: 15,
    deferrable: false,
    action: { tab: "fleet", label: "Go to Fleet" },
    autoDetect: (data) => (data.fleetAircraft || []).length > 0,
  },
  {
    id: "invite_member",
    title: "Invite a team member",
    description: "Add a pilot, dispatcher, or safety manager to your organization.",
    category: "Getting Started",
    xp: 15,
    deferrable: true,
    action: { tab: "admin", adminTab: "members", label: "Go to Members" },
    autoDetect: (data) => (data.orgProfiles || []).length > 1,
  },
  {
    id: "first_frat",
    title: "Submit your first FRAT",
    description: "Complete a Flight Risk Assessment to see how risk scoring works.",
    category: "Getting Started",
    xp: 20,
    deferrable: false,
    action: { tab: "submit", label: "Submit FRAT" },
    autoDetect: (data) => (data.records || []).length > 0,
  },
  {
    id: "first_report",
    title: "File a safety report",
    description: "Submit a hazard, incident, or near-miss report.",
    category: "Safety Foundation",
    xp: 15,
    deferrable: true,
    action: { tab: "reports", label: "Go to Reports" },
    autoDetect: (data) => (data.reports || []).length > 0,
  },
  {
    id: "erp_setup",
    title: "Set up Emergency Response Plans",
    description: "Create your first ERP with checklists and call trees.",
    category: "Safety Foundation",
    xp: 15,
    deferrable: true,
    action: { tab: "erp", label: "Go to ERP" },
    autoDetect: (data) => (data.erpPlans || []).length > 0,
    featureGate: "emergency_response",
  },
  {
    id: "policy_upload",
    title: "Upload a policy or manual",
    description: "Add a safety policy or operations manual for your team.",
    category: "Safety Foundation",
    xp: 15,
    deferrable: true,
    action: { tab: "policy", label: "Go to Documents" },
    autoDetect: (data) => (data.policies || []).length > 0,
  },
  {
    id: "risk_levels",
    title: "Review risk thresholds",
    description: "Confirm or customize your FRAT risk level boundaries.",
    category: "Configuration",
    xp: 10,
    deferrable: true,
    action: { tab: "admin", adminTab: "frat", label: "Go to FRAT Settings" },
    autoDetect: null, // Manual check-off only
  },
  {
    id: "notif_prefs",
    title: "Configure notification preferences",
    description: "Choose which alerts you receive and how.",
    category: "Configuration",
    xp: 10,
    deferrable: true,
    action: { tab: "admin", adminTab: "general", label: "Go to Settings" },
    autoDetect: null, // Manual check-off only
  },
];

const CATEGORIES = ["Essentials", "Getting Started", "Safety Foundation", "Configuration"];

const CATEGORY_MILESTONES = {
  "Essentials": "Your organization is registered and ready.",
  "Getting Started": "Real data flowing — the system is working for you.",
  "Safety Foundation": "Your safety framework is taking shape.",
  "Configuration": "Preferences dialed in — you're all set!",
};

const MAX_XP = SETUP_CHECKLIST_ITEMS.reduce((sum, item) => sum + item.xp, 0);

// Status icons
function StatusIcon({ status }) {
  if (status === "completed") {
    return (
      <div style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(74,222,128,0.15)", border: `1.5px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    );
  }
  if (status === "deferred") {
    return (
      <div style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(102,102,102,0.1)", border: `1.5px dashed ${MUTED}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(102,102,102,0.08)", border: `1.5px solid #444`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
    );
  }
  // pending
  return (
    <div style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(34,211,238,0.08)", border: `1.5px solid rgba(34,211,238,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ width: 8, height: 8, borderRadius: 4, background: CYAN }} />
    </div>
  );
}

// Confetti animation (CSS-only)
function ConfettiCelebration() {
  const colors = [GREEN, CYAN, AMBER, "#A78BFA", "#F472B6", WHITE];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1.5,
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 10 }}>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: 0, left: `${p.left}%`,
          width: p.size, height: p.size * 0.6, borderRadius: 1,
          background: p.color, opacity: 0,
          animation: `confettiFall ${p.duration}s ease-out ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

// XP counter with animation
function XpCounter({ xp, maxXp }) {
  const [displayXp, setDisplayXp] = useState(xp);
  const prevXp = useRef(xp);

  useEffect(() => {
    if (xp === prevXp.current) return;
    const start = prevXp.current;
    const diff = xp - start;
    const steps = Math.min(Math.abs(diff), 20);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setDisplayXp(Math.round(start + (diff * step) / steps));
      if (step >= steps) clearInterval(interval);
    }, 30);
    prevXp.current = xp;
    return () => clearInterval(interval);
  }, [xp]);

  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: CYAN, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)", padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
      {displayXp} / {maxXp} XP
    </span>
  );
}

export default function SetupChecklist({
  checklistState,
  onSave,
  onDismiss,
  onNavigate,
  // Data for auto-detection
  org,
  fleetAircraft,
  orgProfiles,
  records,
  reports,
  erpPlans,
  policies,
  // Feature gating
  hasFeature: hasFeatureFn,
}) {
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationShownRef = useRef(false);

  const items = checklistState?.items || {};

  // Determine which items are applicable (skip feature-gated ones the org doesn't have)
  const applicableItems = useMemo(() => {
    return SETUP_CHECKLIST_ITEMS.filter(item => {
      if (item.featureGate && hasFeatureFn && !hasFeatureFn(org, item.featureGate)) return false;
      return true;
    });
  }, [org, hasFeatureFn]);

  const applicableMaxXp = useMemo(() => applicableItems.reduce((sum, item) => sum + item.xp, 0), [applicableItems]);

  // Auto-detection effect
  useEffect(() => {
    if (!checklistState) return;
    const data = { org, fleetAircraft, orgProfiles, records, reports, erpPlans, policies };
    let changed = false;
    const newItems = { ...items };

    for (const item of applicableItems) {
      if (!item.autoDetect) continue;
      const currentStatus = newItems[item.id]?.status;
      if (currentStatus === "completed" || currentStatus === "skipped") continue;
      if (item.autoDetect(data)) {
        newItems[item.id] = { status: "completed", completed_at: new Date().toISOString() };
        changed = true;
      }
    }

    if (changed) {
      onSave({ ...checklistState, items: newItems });
    }
  }, [org, fleetAircraft, orgProfiles, records, reports, erpPlans, policies]);

  // Computed stats
  const completedCount = applicableItems.filter(i => {
    const s = items[i.id]?.status;
    return s === "completed" || s === "skipped";
  }).length;
  const totalCount = applicableItems.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const xpEarned = applicableItems.reduce((sum, item) => {
    const s = items[item.id]?.status;
    return s === "completed" ? sum + item.xp : sum;
  }, 0);

  const isAllComplete = completedCount === totalCount && totalCount > 0;

  // Show celebration when all complete
  useEffect(() => {
    if (isAllComplete && !celebrationShownRef.current && !checklistState?.completed_at) {
      celebrationShownRef.current = true;
      setShowCelebration(true);
      // Auto-mark as completed
      onSave({ ...checklistState, completed_at: new Date().toISOString(), xp_earned: xpEarned });
    }
  }, [isAllComplete]);

  const deferredItems = applicableItems.filter(i => items[i.id]?.status === "deferred");
  const isMinimized = checklistState?.minimized;

  const handleToggleMinimize = () => {
    onSave({ ...checklistState, minimized: !isMinimized });
  };

  const handleComplete = (itemId) => {
    const newItems = { ...items, [itemId]: { status: "completed", completed_at: new Date().toISOString() } };
    onSave({ ...checklistState, items: newItems });
  };

  const handleDefer = (itemId) => {
    const newItems = { ...items, [itemId]: { status: "deferred" } };
    onSave({ ...checklistState, items: newItems });
  };

  const handleUndefer = (itemId) => {
    const newItems = { ...items, [itemId]: { status: "pending" } };
    onSave({ ...checklistState, items: newItems });
  };

  const handleGo = (item) => {
    if (item.action) {
      onNavigate(item.action.tab, item.action.adminTab);
    }
  };

  // Celebration modal
  if (showCelebration) {
    return (
      <div style={{ ...card, border: `1px solid ${BORDER}`, padding: 32, marginBottom: 16, position: "relative", overflow: "hidden", textAlign: "center" }}>
        <ConfettiCelebration />
        <div style={{ position: "relative", zIndex: 11 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83C\uDF89"}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: WHITE, marginBottom: 6 }}>You're all set!</div>
          <div style={{ fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Your organization is fully configured and ready to go.</div>
          <div style={{ fontSize: 12, color: CYAN, fontWeight: 600, marginBottom: 20 }}>{xpEarned} XP earned</div>
          <button
            onClick={() => setShowCelebration(false)}
            style={{ padding: "8px 24px", borderRadius: 8, background: "rgba(74,222,128,0.12)", border: `1px solid rgba(74,222,128,0.3)`, color: GREEN, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Minimized banner
  if (isMinimized) {
    return (
      <div
        onClick={handleToggleMinimize}
        style={{ ...card, border: `1px solid ${BORDER}`, padding: "10px 16px", marginBottom: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: OFF_WHITE }}>Setup: {completedCount}/{totalCount} complete</span>
          {/* Mini progress bar */}
          <div style={{ flex: 1, maxWidth: 200, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 2, background: GREEN, transition: "width 0.4s ease" }} />
          </div>
          <XpCounter xp={xpEarned} maxXp={applicableMaxXp} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: CYAN, whiteSpace: "nowrap" }}>Continue setup →</span>
      </div>
    );
  }

  // Group items by category (non-deferred)
  const categorizedItems = CATEGORIES.map(cat => {
    const catItems = applicableItems.filter(i => i.category === cat && items[i.id]?.status !== "deferred");
    return { category: cat, items: catItems };
  }).filter(g => g.items.length > 0);

  // Check if a category is fully complete
  const isCategoryComplete = (cat) => {
    const catItems = applicableItems.filter(i => i.category === cat);
    return catItems.length > 0 && catItems.every(i => {
      const s = items[i.id]?.status;
      return s === "completed" || s === "skipped";
    });
  };

  return (
    <div style={{ ...card, border: `1px solid ${BORDER}`, padding: 0, marginBottom: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 2 }}>Setup Checklist</div>
          <div style={{ fontSize: 11, color: MUTED }}>Complete these steps to get the most out of PreflightSMS</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <XpCounter xp={xpEarned} maxXp={applicableMaxXp} />
          <button onClick={handleToggleMinimize} title="Minimize" style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex", alignItems: "center" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button onClick={onDismiss} title="Dismiss checklist" style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex", alignItems: "center" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Segmented progress bar */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 3 }}>
        {applicableItems.map((item, idx) => {
          const s = items[item.id]?.status;
          const filled = s === "completed" || s === "skipped";
          return (
            <div key={item.id} style={{
              flex: 1, height: 5, borderRadius: 3,
              background: filled ? GREEN : "rgba(255,255,255,0.06)",
              transition: "background 0.4s ease",
            }} />
          );
        })}
      </div>

      {/* Category groups */}
      {categorizedItems.map(({ category, items: catItems }) => (
        <div key={category}>
          <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 }}>{category}</span>
            {isCategoryComplete(category) && (
              <span style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>{CATEGORY_MILESTONES[category]}</span>
            )}
          </div>
          {catItems.map(item => {
            const status = items[item.id]?.status || "pending";
            const isCompleted = status === "completed" || status === "skipped";
            return (
              <div key={item.id} style={{
                padding: "10px 20px", display: "flex", alignItems: "center", gap: 12,
                borderTop: `1px solid rgba(255,255,255,0.03)`,
                opacity: isCompleted ? 0.6 : 1,
              }}>
                <StatusIcon status={status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isCompleted ? MUTED : WHITE, textDecoration: isCompleted ? "line-through" : "none" }}>{item.title}</div>
                  {!isCompleted && <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{item.description}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {isCompleted && <span style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>+{item.xp} XP</span>}
                  {!isCompleted && status !== "deferred" && (
                    <>
                      <button onClick={() => handleGo(item)} style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(34,211,238,0.1)", border: `1px solid rgba(34,211,238,0.25)`, color: CYAN, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {item.action?.label || "Go"}
                      </button>
                      {!item.autoDetect && (
                        <button onClick={() => handleComplete(item.id)} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(74,222,128,0.08)", border: `1px solid rgba(74,222,128,0.2)`, color: GREEN, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                          Mark Done
                        </button>
                      )}
                      {item.deferrable && (
                        <button onClick={() => handleDefer(item.id)} style={{ padding: "4px 8px", borderRadius: 6, background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                          Later
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Deferred items section */}
      {deferredItems.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 4 }}>
          <div style={{ padding: "10px 20px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 }}>Saved for later</span>
            <span style={{ fontSize: 10, color: MUTED }}>{deferredItems.length} item{deferredItems.length !== 1 ? "s" : ""}</span>
          </div>
          {deferredItems.map(item => (
            <div key={item.id} style={{
              padding: "8px 20px", display: "flex", alignItems: "center", gap: 12,
              borderTop: `1px dashed rgba(255,255,255,0.05)`,
              opacity: 0.7,
            }}>
              <StatusIcon status="deferred" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>{item.title}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleUndefer(item.id)} style={{ padding: "4px 10px", borderRadius: 6, background: "none", border: `1px solid ${BORDER}`, color: OFF_WHITE, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Do Now
                </button>
                <button onClick={() => handleGo(item)} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(34,211,238,0.08)", border: `1px solid rgba(34,211,238,0.2)`, color: CYAN, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Go
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer with dismiss link */}
      <div style={{ padding: "10px 20px", borderTop: `1px solid rgba(255,255,255,0.03)`, display: "flex", justifyContent: "center" }}>
        <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 10, fontWeight: 600 }}>
          Don't show this again
        </button>
      </div>
    </div>
  );
}
