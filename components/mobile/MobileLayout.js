import { useState, useEffect, useRef, useMemo } from "react";
import MobileHeader from "./MobileHeader";
import MobileTabBar from "./MobileTabBar";
import MobileMoreMenu from "./MobileMoreMenu";
import MobileFlightsView from "./MobileFlightsView";
import MobileFRATWizard from "./MobileFRATWizard";
import MobileReportsView from "./MobileReportsView";
import MobileTrainingView from "./MobileTrainingView";
import { getQueueCount } from "../../lib/offlineQueue";
import SetupChecklist, { SETUP_CHECKLIST_ITEMS, SETUP_CHECKLIST_SHIP_DATE } from "../SetupChecklist";
import { hasFeature } from "../../lib/tiers";

const DARK = "#111111";
const MUTED = "#666666";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const BORDER = "#232323";
const GREEN = "#4ADE80";
const AMBER = "#F59E0B";
const CYAN = "#22D3EE";

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

function UpgradeScreen({ feature, description }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "calc(100vh - 56px - 64px)", padding: 24, textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: `${CYAN}12`, border: `1px solid ${CYAN}30`,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{feature}</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 300, marginBottom: 20 }}>{description}</div>
      <div style={{
        padding: "10px 24px", borderRadius: 10, background: `${CYAN}14`,
        border: `1px solid ${CYAN}30`, color: CYAN, fontSize: 14, fontWeight: 600,
      }}>
        Upgrade to unlock
      </div>
    </div>
  );
}

export default function MobileLayout({
  session, profile, orgData, notifications, notifReads,
  onMarkNotifRead, onMarkAllNotifsRead, onSignOut, onUpdatePreferences,
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
  hazards, actions, onUpdateAction, onUpdateAircraftStatus,
  erpPlans, onLoadErpChecklist, onLoadErpCallTree,
  policies, onAcknowledgePolicy,
  // Feature gating
  hasFlights, hasTraining,
  onUpdateEmail,
  // Setup checklist
  setupChecklistState, onSetupChecklistSave, onSetupChecklistDismiss, onSetupChecklistNavigate,
  org, orgProfiles, records,
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

  // Setup checklist banner visibility
  const isAdminRole = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const showSetupBanner = !!(setupChecklistState && !setupChecklistState.completed_at && !setupChecklistState.dismissed_at && isAdminRole && activeTab !== "setup");
  const setupCompletedCount = showSetupBanner ? SETUP_CHECKLIST_ITEMS.filter(item => {
    if (item.featureGate && !hasFeature(org, item.featureGate)) return false;
    const s = setupChecklistState?.items?.[item.id]?.status;
    return s === "completed" || s === "skipped";
  }).length : 0;
  const setupTotalCount = showSetupBanner ? SETUP_CHECKLIST_ITEMS.filter(item => !item.featureGate || hasFeature(org, item.featureGate)).length : 0;
  const setupProgress = setupTotalCount > 0 ? setupCompletedCount / setupTotalCount : 0;

  const renderContent = () => {
    switch (activeTab) {
      case "flights":
        if (hasFlights === false) return <UpgradeScreen feature="Flight Following" description="Track flights in real time, manage dispatch status, and monitor your fleet. Available on the Starter plan and above." />;
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
        if (hasTraining === false) return <UpgradeScreen feature="Training & CBT" description="Access computer-based training courses, track requirements, and log training records. Available on the Starter plan and above." />;
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
      case "setup":
        return (
          <div style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <button onClick={() => setActiveTab(prevTabRef.current || "flights")} style={{ background: "none", border: "none", cursor: "pointer", color: WHITE, padding: 4, display: "flex", alignItems: "center" }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <span style={{ color: WHITE, fontSize: 16, fontWeight: 600 }}>Setup Guide</span>
            </div>
            <SetupChecklist checklistState={setupChecklistState} onSave={onSetupChecklistSave} onDismiss={onSetupChecklistDismiss} onNavigate={onSetupChecklistNavigate} org={org} fleetAircraft={fleetAircraft} orgProfiles={orgProfiles} records={records} reports={reports} erpPlans={erpPlans} policies={policies} hasFeature={hasFeature} />
          </div>
        );
      case "more":
        return (
          <MobileMoreMenu
            subView={moreSubView}
            onNavigate={(id) => setMoreSubView(id)}
            onBack={() => setMoreSubView(null)}
            unreadCount={unreadCount}
            fleetAircraft={fleetAircraft}
            onUpdateAircraftStatus={onUpdateAircraftStatus}
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
            onUpdatePreferences={onUpdatePreferences}
            onUpdateEmail={onUpdateEmail}
            setupChecklistActive={showSetupBanner}
            onSetupGuide={() => handleTabChange("setup")}
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

      {/* Setup checklist banner */}
      {showSetupBanner && (
        <div
          onClick={() => handleTabChange("setup")}
          style={{
            position: "fixed", top: (!isOnline || pendingCount > 0) ? 56 + 36 : 56,
            left: 0, right: 0, zIndex: 998,
            background: DARK, borderBottom: `1px solid ${BORDER}`,
            padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: OFF_WHITE, whiteSpace: "nowrap" }}>
            Setup: {setupCompletedCount}/{setupTotalCount}
          </span>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ width: `${setupProgress * 100}%`, height: "100%", borderRadius: 2, background: GREEN, transition: "width 0.4s ease" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: CYAN, whiteSpace: "nowrap" }}>Continue →</span>
        </div>
      )}

      {/* Content area — scrollable, between header and tab bar */}
      <div style={{
        paddingTop: ((!isOnline || pendingCount > 0) ? 56 + 36 : 56) + (showSetupBanner ? 38 : 0),
        paddingBottom: 96,
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
