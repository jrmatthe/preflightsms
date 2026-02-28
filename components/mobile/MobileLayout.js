import { useState, useMemo } from "react";
import MobileHeader from "./MobileHeader";
import MobileTabBar from "./MobileTabBar";
import MobileMoreMenu from "./MobileMoreMenu";

const DARK = "#111111";
const MUTED = "#666666";
const WHITE = "#FFFFFF";
const BORDER = "#232323";

const TAB_TITLES = {
  flights: "Flights",
  newFrat: "New FRAT",
  reports: "Safety Reports",
  training: "Training",
  more: "More",
};

function PlaceholderScreen({ title }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "calc(100vh - 56px - 64px)", padding: 24, textAlign: "center",
    }}>
      <div>
        <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ color: MUTED, fontSize: 13 }}>Coming soon in the mobile experience</div>
      </div>
    </div>
  );
}

export default function MobileLayout({
  session, profile, orgData, notifications, notifReads,
  onMarkNotifRead, onMarkAllNotifsRead, onSignOut,
}) {
  const [activeTab, setActiveTab] = useState("flights");
  const [moreSubView, setMoreSubView] = useState(null);

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

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== "more") setMoreSubView(null);
  };

  const handleBellTap = () => {
    setActiveTab("more");
    setMoreSubView("notifications");
  };

  const handleInitialsTap = () => {
    setActiveTab("more");
    setMoreSubView("profile");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "flights":
        return <PlaceholderScreen title="Flights" />;
      case "newFrat":
        return <PlaceholderScreen title="New FRAT" />;
      case "reports":
        return <PlaceholderScreen title="Safety Reports" />;
      case "training":
        return <PlaceholderScreen title="Training" />;
      case "more":
        return (
          <MobileMoreMenu
            subView={moreSubView}
            onNavigate={(id) => setMoreSubView(id)}
            onBack={() => setMoreSubView(null)}
            unreadCount={unreadCount}
          />
        );
      default:
        return <PlaceholderScreen title={activeTab} />;
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: DARK,
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <MobileHeader
        profile={profile}
        orgData={orgData}
        notifications={notifications}
        notifReads={notifReads}
        onBellTap={handleBellTap}
        onInitialsTap={handleInitialsTap}
      />

      {/* Content area — scrollable, between header and tab bar */}
      <div style={{
        paddingTop: 56, paddingBottom: 64,
        minHeight: "100vh", overflowY: "auto",
      }}>
        {renderContent()}
      </div>

      <MobileTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={unreadCount}
      />
    </div>
  );
}
