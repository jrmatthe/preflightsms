import { useState, useMemo } from "react";

const BLACK = "#000000";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const cardStyle = { background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` };

const PRIORITY_COLORS = { low: GREEN, medium: YELLOW, high: "#F97316", critical: RED };
const STATUS_COLORS = { open: CYAN, in_progress: YELLOW, completed: GREEN, overdue: RED, cancelled: MUTED };
const STATUS_LABELS = { open: "Open", in_progress: "In Progress", completed: "Completed", overdue: "Overdue", cancelled: "Cancelled" };
const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: `${GREEN}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      </div>
      <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No Actions Assigned</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>You have no corrective actions assigned to you.</div>
    </div>
  );
}

// ── STATUS BOTTOM SHEET ──────────────────────────────────────
function StatusSheet({ action, onUpdate, onClose }) {
  const statuses = ["open", "in_progress", "completed"];

  const handleSelect = (status) => {
    const updates = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();
    onUpdate(action.id, updates);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999,
      }} />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: CARD, borderTop: `1px solid ${BORDER}`,
        borderRadius: "16px 16px 0 0", padding: "20px 16px",
        paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: BORDER, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: WHITE, marginBottom: 16, textAlign: "center" }}>Update Status</div>

        {statuses.map(s => {
          const color = STATUS_COLORS[s];
          const isCurrent = action.status === s;
          return (
            <button key={s} onClick={() => handleSelect(s)} style={{
              width: "100%", padding: "14px 16px", borderRadius: 10, marginBottom: 8,
              display: "flex", alignItems: "center", gap: 12,
              background: isCurrent ? `${color}12` : "transparent",
              border: `1px solid ${isCurrent ? color : BORDER}`,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: 6, background: color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: isCurrent ? color : OFF_WHITE, flex: 1, textAlign: "left" }}>
                {STATUS_LABELS[s]}
              </span>
              {isCurrent && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
            </button>
          );
        })}

        <button onClick={onClose} style={{
          width: "100%", padding: "14px 0", borderRadius: 10, marginTop: 4,
          background: "transparent", border: `1px solid ${BORDER}`,
          color: MUTED, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
      </div>
    </>
  );
}

// ── ACTION CARD ──────────────────────────────────────────────
function ActionCard({ action, hazards, onUpdateAction }) {
  const [expanded, setExpanded] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  const priorityColor = PRIORITY_COLORS[action.priority] || MUTED;
  const statusColor = STATUS_COLORS[action.status] || MUTED;
  const statusLabel = STATUS_LABELS[action.status] || action.status;
  const priorityLabel = PRIORITY_LABELS[action.priority] || action.priority;

  const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== "completed" && action.status !== "cancelled";
  const linkedHazard = action.hazard_id ? (hazards || []).find(h => h.id === action.hazard_id) : null;

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <>
      <button onClick={() => setExpanded(!expanded)} style={{
        ...cardStyle, padding: 0, width: "100%", textAlign: "left", cursor: "pointer",
        fontFamily: "inherit", display: "block", marginBottom: 10, overflow: "hidden",
        borderLeft: `3px solid ${isOverdue ? RED : priorityColor}`,
      }}>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 8, lineHeight: 1.3 }}>{action.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: `${priorityColor}16`, color: priorityColor, border: `1px solid ${priorityColor}30`,
            }}>{priorityLabel}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: `${isOverdue ? RED : statusColor}16`, color: isOverdue ? RED : statusColor,
              border: `1px solid ${isOverdue ? RED : statusColor}30`,
            }}>{isOverdue ? "Overdue" : statusLabel}</span>
            {action.due_date && (
              <span style={{ fontSize: 12, color: isOverdue ? RED : MUTED, fontWeight: isOverdue ? 600 : 400 }}>
                Due {formatDate(action.due_date)}
              </span>
            )}
          </div>
        </div>

        {expanded && (
          <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${BORDER}` }}>
            {action.description && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 14, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{action.description}</div>
              </div>
            )}

            {linkedHazard && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Linked Investigation</div>
                <div style={{
                  padding: "8px 10px", borderRadius: 8, background: BLACK, border: `1px solid ${BORDER}`,
                  fontSize: 13, color: OFF_WHITE,
                }}>
                  {linkedHazard.hazard_code ? `${linkedHazard.hazard_code} — ` : ""}{linkedHazard.title}
                </div>
              </div>
            )}

            {action.action_code && (
              <div style={{ marginTop: 10, fontSize: 12, color: MUTED }}>Code: {action.action_code}</div>
            )}

            {/* Update Status button */}
            {onUpdateAction && action.status !== "completed" && action.status !== "cancelled" && (
              <button onClick={(e) => { e.stopPropagation(); setShowSheet(true); }} style={{
                width: "100%", padding: "14px 0", borderRadius: 10, marginTop: 14,
                background: WHITE, color: BLACK, fontSize: 15, fontWeight: 600,
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>
                Update Status
              </button>
            )}
          </div>
        )}
      </button>

      {showSheet && (
        <StatusSheet
          action={action}
          onUpdate={onUpdateAction}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  );
}

// ── MAIN VIEW ────────────────────────────────────────────────
export default function MobileCorrActionsView({ actions, hazards, profile, onUpdateAction }) {
  // Only show actions assigned to current user
  const myActions = useMemo(() => {
    return (actions || []).filter(a => a.assigned_to === profile?.id);
  }, [actions, profile]);

  // Sort: overdue first, then open, then in_progress, then completed
  const sorted = useMemo(() => {
    const now = new Date();
    return [...myActions].sort((a, b) => {
      const urgency = (act) => {
        if (act.status === "completed" || act.status === "cancelled") return 4;
        if (act.due_date && new Date(act.due_date) < now) return 0;
        if (act.status === "open") return 1;
        if (act.status === "in_progress") return 2;
        return 3;
      };
      return urgency(a) - urgency(b);
    });
  }, [myActions]);

  if (sorted.length === 0) return <EmptyState />;

  const overdueCount = sorted.filter(a => a.due_date && new Date(a.due_date) < new Date() && a.status !== "completed" && a.status !== "cancelled").length;

  return (
    <div style={{ padding: 16 }}>
      {overdueCount > 0 && (
        <div style={{
          ...cardStyle, padding: 12, marginBottom: 14,
          borderColor: `${RED}44`, background: `${RED}06`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: RED }}>{overdueCount} overdue action{overdueCount !== 1 ? "s" : ""}</span>
        </div>
      )}

      <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>
        {sorted.length} action{sorted.length !== 1 ? "s" : ""} assigned to you
      </div>

      {sorted.map(a => (
        <ActionCard key={a.id} action={a} hazards={hazards} onUpdateAction={onUpdateAction} />
      ))}
    </div>
  );
}
