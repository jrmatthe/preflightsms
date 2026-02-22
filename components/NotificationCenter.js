import { useState, useEffect, useRef, useMemo } from "react";

const DARK = "#111111";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const MUTED = "#666666";
const OFF_WHITE = "#D4D4D4";
const RED = "#EF4444";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const CYAN = "#22D3EE";

const TYPE_COLORS = {
  report_submitted: CYAN,
  frat_submitted: YELLOW,
  frat_needs_approval: AMBER,
  investigation_created: YELLOW,
  action_created: GREEN,
  action_overdue: RED,
  action_due_soon: AMBER,
  policy_published: CYAN,
  training_expiring: AMBER,
};

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const seconds = Math.floor((now - d) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationCenter({ notifications, reads, onMarkRead, onMarkAllRead, profile, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const userRole = profile?.role || "pilot";
  const userId = profile?.id;

  // Filter notifications visible to this user
  const visible = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter(n => {
      if (n.target_user_id && n.target_user_id !== userId) return false;
      if (n.target_roles && n.target_roles.length > 0 && !n.target_roles.includes(userRole)) {
        if (n.target_user_id === userId) return true;
        return false;
      }
      return true;
    });
  }, [notifications, userRole, userId]);

  const readSet = useMemo(() => new Set(reads || []), [reads]);
  const unreadCount = visible.filter(n => !readSet.has(n.id)).length;

  const handleClick = (n) => {
    if (!readSet.has(n.id)) onMarkRead(n.id);
    if (n.link_tab) onNavigate(n.link_tab);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none", border: `1px solid ${BORDER}`, borderRadius: 6,
          padding: "5px 8px", cursor: "pointer", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: RED, color: WHITE, fontSize: 9, fontWeight: 800,
            minWidth: 16, height: 16, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", lineHeight: 1,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 340, maxHeight: 440, background: DARK, border: `1px solid ${BORDER}`,
          borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
          zIndex: 1000, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${BORDER}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => onMarkAllRead()}
                style={{
                  background: "none", border: "none", color: CYAN,
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  padding: 0, fontFamily: "inherit",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", maxHeight: 392, flex: 1 }}>
            {visible.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: MUTED, fontSize: 12 }}>
                No notifications yet
              </div>
            ) : (
              visible.map(n => {
                const isRead = readSet.has(n.id);
                const accentColor = TYPE_COLORS[n.type] || MUTED;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: "flex", width: "100%", textAlign: "left",
                      background: isRead ? "transparent" : "rgba(255,255,255,0.03)",
                      border: "none", borderBottom: `1px solid ${BORDER}`,
                      padding: "10px 16px", cursor: "pointer",
                      gap: 10, fontFamily: "inherit", alignItems: "flex-start",
                    }}
                  >
                    {/* Color accent bar */}
                    <div style={{
                      width: 3, minHeight: 32, borderRadius: 2,
                      background: accentColor, flexShrink: 0, marginTop: 2,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 12, fontWeight: isRead ? 500 : 700,
                          color: isRead ? OFF_WHITE : WHITE,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: 10, color: MUTED, flexShrink: 0 }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <div style={{
                          fontSize: 11, color: MUTED, marginTop: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {n.body}
                        </div>
                      )}
                    </div>
                    {/* Unread dot */}
                    {!isRead && (
                      <div style={{
                        width: 7, height: 7, borderRadius: 4,
                        background: accentColor, flexShrink: 0, marginTop: 6,
                      }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
