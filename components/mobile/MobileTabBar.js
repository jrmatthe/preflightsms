import { useMemo } from "react";

const BLACK = "#000000";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const MUTED = "#666666";
const CYAN = "#22D3EE";
const RED = "#EF4444";

const I = (d, s = 24) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const icons = {
  flights: I(<><path d="M17.8 19.2L16 11l3.5-3.5C20.3 6.7 21 5.1 21 4.5c0-1-.5-1.5-1.5-1.5-.6 0-2.2.7-3 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.3 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></>),
  newFrat: I(<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></>),
  reports: I(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
  training: I(<><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></>),
  more: I(<><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/></>),
};

const TABS = [
  { id: "flights", label: "Flights", icon: "flights" },
  { id: "newFrat", label: "New FRAT", icon: "newFrat" },
  { id: "reports", label: "Reports", icon: "reports" },
  { id: "training", label: "Training", icon: "training" },
  { id: "more", label: "More", icon: "more" },
];

export default function MobileTabBar({ activeTab, onTabChange, unreadCount }) {
  return (
    <nav aria-label="Main navigation" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: BLACK, borderTop: `1px solid ${BORDER}`,
      paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)",
    }}>
      <div role="tablist" style={{ display: "flex", justifyContent: "space-evenly", alignItems: "center" }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const isFrat = tab.id === "newFrat";
          const isMore = tab.id === "more";

          let color;
          if (isActive) {
            color = WHITE;
          } else if (isFrat) {
            color = CYAN;
          } else {
            color = MUTED;
          }

          const ariaLabel = isMore && unreadCount > 0
            ? `${tab.label}, ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : tab.label;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={ariaLabel}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, padding: "10px 4px 8px", background: "none", border: "none",
                cursor: "pointer", color, opacity: isActive || isFrat ? 1 : 0.6,
                transition: "color 0.15s, opacity 0.15s", position: "relative",
                minHeight: 48,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", position: "relative" }}>
                {icons[tab.icon]}
                {isMore && unreadCount > 0 && (
                  <span aria-hidden="true" style={{
                    position: "absolute", top: -4, right: -8,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: RED, color: WHITE,
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px", lineHeight: 1,
                  }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span aria-hidden="true" style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
