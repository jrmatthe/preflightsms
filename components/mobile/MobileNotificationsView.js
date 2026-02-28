import { useState, useMemo, useRef } from "react";

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

const TYPE_COLORS = {
  report_submitted: CYAN, frat_submitted: YELLOW, frat_needs_approval: AMBER,
  frat_rejected: RED, frat_self_dispatched: AMBER, investigation_created: YELLOW,
  action_created: GREEN, action_assigned: CYAN, action_overdue: RED,
  action_due_soon: AMBER, policy_published: CYAN, training_expiring: AMBER,
  report_status_update: GREEN, audit_due: AMBER, audit_overdue: RED,
  audit_finding: RED, trend_alert: CYAN, moc_assigned: CYAN,
  moc_review_due: AMBER, culture_survey_available: GREEN,
  engagement_milestone: GREEN, safety_bulletin: YELLOW,
  erp_drill_due: AMBER, erp_plan_review_due: AMBER,
  spi_threshold_approaching: AMBER, spi_target_breached: RED,
  asap_report_submitted: CYAN, asap_erc_decision: GREEN,
  asap_corrective_action_due: AMBER, compliance_item_expiring: AMBER,
  safety_digest: CYAN,
};

function typeIcon(type) {
  const color = TYPE_COLORS[type] || MUTED;
  if (type?.includes("frat")) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
    </svg>
  );
  if (type?.includes("report")) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
  if (type?.includes("action")) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  );
  if (type?.includes("policy")) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  );
  if (type?.includes("training") || type?.includes("engagement")) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  );
  if (type?.includes("investigation") || type?.includes("hazard")) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
  if (type?.includes("erp") || type?.includes("safety_bulletin")) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
  // Default bell
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayGroup(dateStr) {
  if (!dateStr) return "Unknown";
  const now = new Date();
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const notifDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (notifDay.getTime() === today.getTime()) return "Today";
  if (notifDay.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: `${CYAN}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
      </div>
      <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>All Caught Up</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>No notifications to show. Check back later.</div>
    </div>
  );
}

// ── NOTIFICATION ITEM ────────────────────────────────────────
function NotificationItem({ notif, isRead, onMarkRead }) {
  const touchStartX = useRef(0);
  const color = TYPE_COLORS[notif.type] || MUTED;

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60 && !isRead && onMarkRead) {
      onMarkRead(notif.id);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
        background: isRead ? "transparent" : `${WHITE}03`,
        borderBottom: `1px solid ${BORDER}`,
        borderLeft: isRead ? "3px solid transparent" : `3px solid ${color}`,
      }}
    >
      {/* Type icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 18, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${color}12`,
      }}>
        {typeIcon(notif.type)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: isRead ? 400 : 600,
          color: isRead ? MUTED : WHITE, lineHeight: 1.4, marginBottom: 2,
        }}>{notif.title}</div>
        {notif.body && (
          <div style={{
            fontSize: 14, color: MUTED, lineHeight: 1.4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{notif.body}</div>
        )}
        <div style={{ fontSize: 14, color: MUTED, marginTop: 4, opacity: 0.7 }}>{timeAgo(notif.created_at)}</div>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div style={{
          width: 8, height: 8, borderRadius: 4, background: color,
          flexShrink: 0, marginTop: 6,
        }} />
      )}
    </div>
  );
}

// ── MAIN VIEW ────────────────────────────────────────────────
export default function MobileNotificationsView({
  notifications, notifReads, profile, onMarkNotifRead, onMarkAllNotifsRead,
}) {
  const readSet = useMemo(() => new Set(notifReads || []), [notifReads]);

  // Filter to visible notifications for this user
  const visible = useMemo(() => {
    const userRole = profile?.role || "pilot";
    const userId = profile?.id;
    return (notifications || []).filter(n => {
      if (n.target_user_id && n.target_user_id !== userId) return false;
      if (n.target_roles && n.target_roles.length > 0 && !n.target_roles.includes(userRole)) {
        if (n.target_user_id === userId) return true;
        return false;
      }
      return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [notifications, profile]);

  const unreadCount = visible.filter(n => !readSet.has(n.id)).length;

  // Group by day
  const grouped = useMemo(() => {
    const groups = [];
    let currentDay = null;
    let currentItems = [];
    for (const n of visible) {
      const day = dayGroup(n.created_at);
      if (day !== currentDay) {
        if (currentItems.length > 0) groups.push({ day: currentDay, items: currentItems });
        currentDay = day;
        currentItems = [n];
      } else {
        currentItems.push(n);
      }
    }
    if (currentItems.length > 0) groups.push({ day: currentDay, items: currentItems });
    return groups;
  }, [visible]);

  if (visible.length === 0) return <EmptyState />;

  return (
    <div>
      {/* Mark all read */}
      {unreadCount > 0 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 16px", borderBottom: `1px solid ${BORDER}`,
        }}>
          <span style={{ fontSize: 14, color: MUTED }}>{unreadCount} unread</span>
          <button onClick={onMarkAllNotifsRead} aria-label="Mark all notifications as read" style={{
            background: "none", border: "none", color: CYAN, fontSize: 14, fontWeight: 600,
            cursor: "pointer", padding: "8px 12px", fontFamily: "inherit", minHeight: 44,
          }}>Mark All Read</button>
        </div>
      )}

      {grouped.map(group => (
        <div key={group.day}>
          <div style={{
            padding: "12px 16px 6px", fontSize: 14, fontWeight: 600,
            color: MUTED, textTransform: "uppercase", letterSpacing: 0.5,
          }}>{group.day}</div>
          {group.items.map(n => (
            <NotificationItem
              key={n.id}
              notif={n}
              isRead={readSet.has(n.id)}
              onMarkRead={onMarkNotifRead}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
