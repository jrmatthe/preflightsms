import { useMemo } from "react";

const BLACK = "#000000";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const MUTED = "#666666";
const OFF_WHITE = "#D4D4D4";
const RED = "#EF4444";
const CARD = "#161616";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MobileHeader({ profile, orgData, notifications, notifReads, onBellTap, onInitialsTap }) {
  const unreadCount = useMemo(() => {
    if (!notifications) return 0;
    const userRole = profile?.role || "pilot";
    const userId = profile?.id;
    const readSet = new Set(notifReads || []);
    return notifications.filter(n => {
      if (readSet.has(n.id)) return false;
      if (n.target_user_id && n.target_user_id !== userId) return false;
      if (n.target_roles && n.target_roles.length > 0 && !n.target_roles.includes(userRole)) {
        if (n.target_user_id === userId) return true;
        return false;
      }
      return true;
    }).length;
  }, [notifications, notifReads, profile]);

  const initials = getInitials(profile?.full_name);
  const logoUrl = orgData?.logo_url;

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      height: 56, background: BLACK, borderBottom: `1px solid ${BORDER}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px",
    }}>
      {/* Left: Logo or app name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ height: 28, width: "auto", borderRadius: 4 }} />
        ) : (
          <span style={{ color: WHITE, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>PreflightSMS</span>
        )}
      </div>

      {/* Right: Bell + Initials */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Notification bell */}
        <button
          onClick={onBellTap}
          style={{
            position: "relative", background: "none", border: "none",
            cursor: "pointer", color: MUTED, padding: 6,
            display: "flex", alignItems: "center",
          }}
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2,
              minWidth: 16, height: 16, borderRadius: 8,
              background: RED, color: WHITE,
              fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px", lineHeight: 1,
            }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* User initials */}
        <button
          onClick={onInitialsTap}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: CARD, border: `1px solid ${BORDER}`,
            color: OFF_WHITE, fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
