import { useState, useMemo } from "react";
import MobileBottomSheet from "./MobileBottomSheet";

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

function SkeletonLoader() {
  return (
    <div style={{ padding: 16 }} aria-label="Loading corrective actions">
      <style>{`@keyframes actPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ ...cardStyle, padding: 14, marginBottom: 10, borderLeft: `3px solid ${BORDER}`, animation: "actPulse 1.5s ease-in-out infinite" }}>
          <div style={{ height: 16, width: "65%", background: BORDER, borderRadius: 6, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ height: 22, width: 60, background: BORDER, borderRadius: 6 }} />
            <div style={{ height: 22, width: 80, background: BORDER, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

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
    <MobileBottomSheet onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 600, color: WHITE, marginBottom: 16, textAlign: "center" }}>Update Status</div>

      {statuses.map(s => {
        const color = STATUS_COLORS[s];
        const isCurrent = action.status === s;
        return (
          <button key={s} onClick={() => handleSelect(s)} aria-label={`Set status to ${STATUS_LABELS[s]}${isCurrent ? ", current status" : ""}`} style={{
            width: "100%", padding: "14px 16px", borderRadius: 10, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 12,
            background: isCurrent ? `${color}12` : "transparent",
            border: `1px solid ${isCurrent ? color : BORDER}`,
            cursor: "pointer", fontFamily: "inherit", minHeight: 48,
          }}>
            <div aria-hidden="true" style={{
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
        minHeight: 48,
      }}>Cancel</button>
    </MobileBottomSheet>
  );
}

// ── ACTION CARD ──────────────────────────────────────────────
function ActionCard({ action, hazards, onUpdateAction, orgProfiles }) {
  const [expanded, setExpanded] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [showReassign, setShowReassign] = useState(false);

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
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`${action.title}, ${priorityLabel} priority, ${isOverdue ? "overdue" : statusLabel}`}
        style={{
          ...cardStyle, padding: 0, width: "100%", textAlign: "left", cursor: "pointer",
          fontFamily: "inherit", display: "block", marginBottom: 10, overflow: "hidden",
          borderLeft: `3px solid ${isOverdue ? RED : priorityColor}`,
        }}
      >
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 8, lineHeight: 1.3 }}>{action.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600,
              background: `${priorityColor}16`, color: priorityColor, border: `1px solid ${priorityColor}30`,
            }}>{priorityLabel}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600,
              background: `${isOverdue ? RED : statusColor}16`, color: isOverdue ? RED : statusColor,
              border: `1px solid ${isOverdue ? RED : statusColor}30`,
            }}>{isOverdue ? "Overdue" : statusLabel}</span>
            {action.due_date && (
              <span style={{ fontSize: 14, color: isOverdue ? RED : MUTED, fontWeight: isOverdue ? 600 : 400 }}>
                Due {formatDate(action.due_date)}
              </span>
            )}
          </div>
        </div>

        {expanded && (
          <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${BORDER}` }}>
            {action.description && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 14, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{action.description}</div>
              </div>
            )}

            {linkedHazard && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Linked Investigation</div>
                <div style={{
                  padding: "8px 10px", borderRadius: 8, background: BLACK, border: `1px solid ${BORDER}`,
                  fontSize: 14, color: OFF_WHITE,
                }}>
                  {linkedHazard.hazard_code ? `${linkedHazard.hazard_code} \u2014 ` : ""}{linkedHazard.title}
                </div>
              </div>
            )}

            {action.action_code && (
              <div style={{ marginTop: 10, fontSize: 14, color: MUTED }}>Code: {action.action_code}</div>
            )}

            {/* Update Status + Reassign buttons */}
            {onUpdateAction && action.status !== "completed" && action.status !== "cancelled" && (
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={(e) => { e.stopPropagation(); setShowSheet(true); }} style={{
                  flex: 1, padding: "14px 0", borderRadius: 10,
                  background: WHITE, color: BLACK, fontSize: 15, fontWeight: 600,
                  border: "none", cursor: "pointer", fontFamily: "inherit", minHeight: 48,
                }}>
                  Update Status
                </button>
                {orgProfiles && orgProfiles.length > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); setShowReassign(true); }} style={{
                    flex: 1, padding: "14px 0", borderRadius: 10,
                    background: "transparent", color: CYAN, fontSize: 15, fontWeight: 600,
                    border: `1px solid ${CYAN}44`, cursor: "pointer", fontFamily: "inherit", minHeight: 48,
                  }}>
                    Reassign
                  </button>
                )}
              </div>
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

      {showReassign && orgProfiles && (
        <MobileBottomSheet onClose={() => setShowReassign(false)} maxHeight="60vh">
          <div style={{ fontSize: 16, fontWeight: 600, color: WHITE, marginBottom: 16, textAlign: "center" }}>Reassign To</div>
          {orgProfiles.map(p => {
            const isCurrent = action.assigned_to === p.id;
            return (
              <button key={p.id} onClick={() => {
                if (!isCurrent) onUpdateAction(action.id, { assigned_to: p.id, assigned_to_name: p.full_name });
                setShowReassign(false);
              }} style={{
                width: "100%", padding: "14px 16px", borderRadius: 10, marginBottom: 8,
                display: "flex", alignItems: "center", gap: 12,
                background: isCurrent ? `${CYAN}12` : "transparent",
                border: `1px solid ${isCurrent ? CYAN : BORDER}`,
                cursor: "pointer", fontFamily: "inherit", minHeight: 48,
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: isCurrent ? CYAN : OFF_WHITE, flex: 1, textAlign: "left" }}>{p.full_name}</span>
                {isCurrent && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            );
          })}
          <button onClick={() => setShowReassign(false)} style={{
            width: "100%", padding: "14px 0", borderRadius: 10, marginTop: 4,
            background: "transparent", border: `1px solid ${BORDER}`,
            color: MUTED, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", minHeight: 48,
          }}>Cancel</button>
        </MobileBottomSheet>
      )}
    </>
  );
}

// ── MAIN VIEW ────────────────────────────────────────────────
export default function MobileCorrActionsView({ actions, hazards, profile, onUpdateAction, orgProfiles }) {
  if (actions === undefined || actions === null) return <SkeletonLoader />;

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
        <div role="alert" style={{
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

      <div style={{ fontSize: 14, color: MUTED, marginBottom: 10 }}>
        {sorted.length} action{sorted.length !== 1 ? "s" : ""} assigned to you
      </div>

      {sorted.map(a => (
        <ActionCard key={a.id} action={a} hazards={hazards} onUpdateAction={onUpdateAction} orgProfiles={orgProfiles} />
      ))}
    </div>
  );
}
