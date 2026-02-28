import { useState, useEffect, useRef, useMemo } from "react";
import MobileHeader from "./MobileHeader";
import MobileTabBar from "./MobileTabBar";
import MobileMoreMenu from "./MobileMoreMenu";
import MobileFlightsView from "./MobileFlightsView";
import MobileFRATWizard from "./MobileFRATWizard";
import MobileReportsView from "./MobileReportsView";
import MobileTrainingView from "./MobileTrainingView";
import { getQueueCount } from "../../lib/offlineQueue";

const DARK = "#111111";
const MUTED = "#666666";
const WHITE = "#FFFFFF";
const BORDER = "#232323";
const AMBER = "#F59E0B";

function PlaceholderScreen({ title }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "calc(100vh - 56px - 64px)", padding: 24, textAlign: "center",
    }}>
      <div>
        <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ color: MUTED, fontSize: 14 }}>Coming soon in the mobile experience</div>
      </div>
    </div>
  );
}

export default function MobileLayout({
  session, profile, orgData, notifications, notifReads,
  onMarkNotifRead, onMarkAllNotifsRead, onSignOut,
  // Phase 2 props
  flights, onUpdateFlight, onSubmitFRAT,
  fleetAircraft, fratTemplate, allFratTemplates, riskLevels,
  nudgeFlight, onNudgeSubmitReport, onNudgeDismiss,
  reportPrefill, setReportPrefill,
  // Phase 3 props
  reports, onSubmitReport,
  // Phase 4 props
  cbtCourses, cbtLessonsMap, cbtProgress, cbtEnrollments,
  trainingReqs, trainingRecs,
  onUpdateCbtProgress, onUpdateCbtEnrollment, onLogTraining, refreshCbt,
  // Phase 5 props
  hazards, actions, onUpdateAction,
  erpPlans, onLoadErpChecklist, onLoadErpCallTree,
  policies, onAcknowledgePolicy,
}) {
  const [activeTab, setActiveTab] = useState("flights");
  const [moreSubView, setMoreSubView] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [tabOpacity, setTabOpacity] = useState(1);
  const prevTabRef = useRef("flights");

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Poll offline queue count
  useEffect(() => {
    const check = () => setPendingCount(getQueueCount());
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

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
    if (tabId === activeTab) return;
    prevTabRef.current = activeTab;
    setTabOpacity(0);
    setTimeout(() => {
      setActiveTab(tabId);
      if (tabId !== "more") setMoreSubView(null);
      setTabOpacity(1);
    }, 100);
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
        return (
          <MobileFlightsView
            flights={flights}
            profile={profile}
            onUpdateFlight={onUpdateFlight}
            onNewFrat={() => setActiveTab("newFrat")}
            onNavigateToReports={() => setActiveTab("reports")}
            onNudgeSubmitReport={() => {
              if (onNudgeSubmitReport) onNudgeSubmitReport();
              setActiveTab("reports");
            }}
            onNudgeDismiss={onNudgeDismiss}
            nudgeFlight={nudgeFlight}
          />
        );
      case "newFrat":
        return (
          <MobileFRATWizard
            profile={profile}
            fleetAircraft={fleetAircraft}
            fratTemplate={fratTemplate}
            allTemplates={allFratTemplates}
            riskLevels={riskLevels}
            onSubmit={onSubmitFRAT}
            onCancel={() => setActiveTab("flights")}
            onNavigateToFlights={() => setActiveTab("flights")}
          />
        );
      case "reports":
        return (
          <MobileReportsView
            reports={reports}
            profile={profile}
            session={session}
            onSubmitReport={onSubmitReport}
            fleetAircraft={fleetAircraft}
            reportPrefill={reportPrefill}
            onClearPrefill={() => { if (setReportPrefill) setReportPrefill(null); }}
          />
        );
      case "training":
        return (
          <MobileTrainingView
            courses={cbtCourses}
            lessonsMap={cbtLessonsMap}
            progress={cbtProgress}
            enrollments={cbtEnrollments}
            trainingRequirements={trainingReqs}
            trainingRecords={trainingRecs}
            profile={profile}
            session={session}
            onUpdateProgress={onUpdateCbtProgress}
            onUpdateEnrollment={onUpdateCbtEnrollment}
            onLogTraining={onLogTraining}
            onRefresh={refreshCbt}
          />
        );
      case "more":
        return (
          <MobileMoreMenu
            subView={moreSubView}
            onNavigate={(id) => setMoreSubView(id)}
            onBack={() => setMoreSubView(null)}
            unreadCount={unreadCount}
            fleetAircraft={fleetAircraft}
            erpPlans={erpPlans}
            onLoadErpChecklist={onLoadErpChecklist}
            onLoadErpCallTree={onLoadErpCallTree}
            hazards={hazards}
            actions={actions}
            profile={profile}
            session={session}
            orgData={orgData}
            onUpdateAction={onUpdateAction}
            policies={policies}
            onAcknowledgePolicy={onAcknowledgePolicy}
            notifications={notifications}
            notifReads={notifReads}
            onMarkNotifRead={onMarkNotifRead}
            onMarkAllNotifsRead={onMarkAllNotifsRead}
            onSignOut={onSignOut}
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

      {/* Offline banner */}
      {(!isOnline || pendingCount > 0) && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", top: 56, left: 0, right: 0, zIndex: 999,
          background: `${AMBER}18`, borderBottom: `1px solid ${AMBER}40`,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {!isOnline ? (
              <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>
            ) : (
              <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
            )}
          </svg>
          <span style={{ fontSize: 14, color: AMBER, fontWeight: 500 }}>
            {!isOnline
              ? "You're offline — changes will sync when reconnected"
              : `${pendingCount} pending change${pendingCount !== 1 ? "s" : ""} syncing...`}
          </span>
        </div>
      )}

      {/* Content area — scrollable, between header and tab bar */}
      <div style={{
        paddingTop: (!isOnline || pendingCount > 0) ? 56 + 36 : 56,
        paddingBottom: 64,
        minHeight: "100vh", overflowY: "auto",
        opacity: tabOpacity,
        transition: "opacity 0.15s ease-in-out",
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
