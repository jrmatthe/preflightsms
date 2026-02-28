import { useMemo } from "react";
import { setDesktopPreference } from "../../lib/useIsMobile";
import MobileFleetView from "./MobileFleetView";
import MobileERPView from "./MobileERPView";
import MobileHazardsView from "./MobileHazardsView";
import MobileCorrActionsView from "./MobileCorrActionsView";
import MobilePoliciesView from "./MobilePoliciesView";
import MobileNotificationsView from "./MobileNotificationsView";
import MobileProfileView from "./MobileProfileView";

const BLACK = "#000000";
const DARK = "#111111";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const I = (d, s = 20) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const menuIcons = {
  fleet: I(<><path d="M17.8 19.2L16 11l3.5-3.5C20.3 6.7 21 5.1 21 4.5c0-1-.5-1.5-1.5-1.5-.6 0-2.2.7-3 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.3 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></>),
  erp: I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>),
  hazards: I(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  actions: I(<><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>),
  policies: I(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>),
  profile: I(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>),
  notifications: I(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>),
  desktop: I(<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>),
};

const chevron = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const backArrow = (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const SECTIONS = [
  {
    label: "Operations",
    items: [
      { id: "fleet", label: "Fleet Status", icon: "fleet" },
      { id: "erp", label: "Emergency Response Plans", icon: "erp" },
    ],
  },
  {
    label: "Safety",
    items: [
      { id: "hazards", label: "Hazard Register", icon: "hazards" },
      { id: "actions", label: "Corrective Actions", icon: "actions" },
    ],
  },
  {
    label: "Policies",
    items: [
      { id: "policies", label: "Policy Library", icon: "policies" },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile & Settings", icon: "profile" },
      { id: "notifications", label: "Notifications", icon: "notifications", showBadge: true },
    ],
  },
];

const SUB_VIEW_TITLES = {
  fleet: "Fleet Status",
  erp: "Emergency Response",
  hazards: "Hazard Register",
  actions: "Corrective Actions",
  policies: "Policy Library",
  profile: "Profile & Settings",
  notifications: "Notifications",
};

export default function MobileMoreMenu({
  subView, onNavigate, onBack, unreadCount,
  // Sub-view data props
  fleetAircraft,
  erpPlans, onLoadErpChecklist, onLoadErpCallTree,
  hazards, actions, profile, session, orgData,
  onUpdateAction,
  policies, onAcknowledgePolicy,
  notifications, notifReads, onMarkNotifRead, onMarkAllNotifsRead,
  onSignOut,
}) {
  // Sub-view: render appropriate component
  if (subView) {
    const renderSubView = () => {
      switch (subView) {
        case "fleet":
          return <MobileFleetView fleetAircraft={fleetAircraft} />;
        case "erp":
          return <MobileERPView erpPlans={erpPlans} onLoadChecklist={onLoadErpChecklist} onLoadCallTree={onLoadErpCallTree} />;
        case "hazards":
          return <MobileHazardsView hazards={hazards} actions={actions} />;
        case "actions":
          return <MobileCorrActionsView actions={actions} hazards={hazards} profile={profile} onUpdateAction={onUpdateAction} />;
        case "policies":
          return <MobilePoliciesView policies={policies} profile={profile} onAcknowledgePolicy={onAcknowledgePolicy} />;
        case "notifications":
          return (
            <MobileNotificationsView
              notifications={notifications} notifReads={notifReads} profile={profile}
              onMarkNotifRead={onMarkNotifRead} onMarkAllNotifsRead={onMarkAllNotifsRead}
            />
          );
        case "profile":
          return <MobileProfileView profile={profile} orgData={orgData} onSignOut={onSignOut} />;
        default:
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
              <div>
                <div style={{ color: MUTED, fontSize: 14, marginBottom: 4 }}>{SUB_VIEW_TITLES[subView] || subView}</div>
                <div style={{ color: MUTED, fontSize: 14, opacity: 0.6 }}>Coming soon</div>
              </div>
            </div>
          );
      }
    };

    // ERP, policies, and profile handle their own back headers internally for drill-down
    const needsHeader = !["erp", "policies"].includes(subView) ||
      (subView === "erp" || subView === "policies");
    // Actually: all sub-views that don't have internal nav get the shared back header
    // ERP and policies have internal detail views with their own back buttons,
    // but their list views still need the outer back header
    // Simplest approach: always show the back header for the top-level sub-view

    return (
      <div style={{ minHeight: "100%" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <button onClick={onBack} aria-label="Back to menu" style={{
            background: "none", border: "none", cursor: "pointer", color: WHITE,
            padding: 4, display: "flex", alignItems: "center",
            minWidth: 44, minHeight: 44,
          }}>
            {backArrow}
          </button>
          <span style={{ color: WHITE, fontSize: 16, fontWeight: 600 }}>
            {SUB_VIEW_TITLES[subView] || subView}
          </span>
        </div>
        {renderSubView()}
      </div>
    );
  }

  // Main menu grid
  return (
    <div style={{ padding: "8px 0" }}>
      {SECTIONS.map(section => (
        <div key={section.label}>
          <div style={{
            padding: "16px 16px 6px", fontSize: 14, fontWeight: 600,
            color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {section.label}
          </div>
          {section.items.map(item => {
            const ariaLabel = item.showBadge && unreadCount > 0
              ? `${item.label}, ${unreadCount} unread`
              : item.label;
            return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={ariaLabel}
              style={{
                width: "100%", minHeight: 48, display: "flex", alignItems: "center",
                gap: 12, padding: "0 16px", background: "none", border: "none",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <span aria-hidden="true" style={{ color: MUTED, display: "flex", alignItems: "center" }}>
                {menuIcons[item.icon]}
              </span>
              <span style={{ flex: 1, color: OFF_WHITE, fontSize: 15 }}>
                {item.label}
              </span>
              {item.showBadge && unreadCount > 0 && (
                <span aria-hidden="true" style={{
                  minWidth: 20, height: 20, borderRadius: 10,
                  background: RED, color: WHITE,
                  fontSize: 14, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 6px",
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              <span aria-hidden="true" style={{ color: MUTED, opacity: 0.4, display: "flex", alignItems: "center" }}>
                {chevron}
              </span>
            </button>
            );
          })}
        </div>
      ))}

      {/* Switch to Desktop */}
      <div style={{ padding: "16px 0", borderTop: `1px solid ${BORDER}`, marginTop: 8 }}>
        <button
          onClick={() => setDesktopPreference(true)}
          style={{
            width: "100%", height: 48, display: "flex", alignItems: "center",
            gap: 12, padding: "0 16px", background: "none", border: "none",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <span style={{ color: MUTED, display: "flex", alignItems: "center" }}>
            {menuIcons.desktop}
          </span>
          <span style={{ flex: 1, color: OFF_WHITE, fontSize: 15 }}>
            Switch to Desktop View
          </span>
          <span style={{ color: MUTED, opacity: 0.4, display: "flex", alignItems: "center" }}>
            {chevron}
          </span>
        </button>
      </div>
    </div>
  );
}
