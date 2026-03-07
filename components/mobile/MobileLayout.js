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
const OFF_WHITE = "#D4D4D4";
const BORDER = "#232323";
const GREEN = "#4ADE80";
const AMBER = "#F59E0B";
const CYAN = "#22D3EE";

const ADMIN_ROLES = ["admin", "safety_manager", "accountable_exec", "chief_pilot"];

function MobileAddAircraftPrompt({ onAdd }) {
  const [type, setType] = useState("");
  const [reg, setReg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSave = type.trim().length > 0 && reg.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    const registration = reg.trim().toUpperCase().startsWith("N") ? reg.trim().toUpperCase() : "N" + reg.trim().toUpperCase();
    const result = await onAdd({ type: type.trim().toUpperCase(), registration });
    if (result?.error) {
      setError(result.error.message || "Failed to add aircraft");
      setSaving(false);
    }
  };

  const inp = { width: "100%", padding: "14px 16px", background: "#1A1A1A", border: `1px solid ${BORDER}`, borderRadius: 10, color: WHITE, fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: DARK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="PreflightSMS" style={{ height: 80, width: "auto", objectFit: "contain", marginBottom: 16 }} onError={e => { e.target.style.display = "none"; }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Add Your First Aircraft</div>
          <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>Register an aircraft to start submitting FRATs and tracking flights.</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Aircraft Type</label>
          <input type="text" placeholder="e.g. C172, R44, PC-12" value={type} onChange={e => setType(e.target.value)} style={inp} autoFocus />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Tail Number</label>
          <input type="text" placeholder="e.g. 123AB" value={reg} onChange={e => setReg(e.target.value)} style={inp} />
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>N prefix added automatically</div>
        </div>

        {error && <div style={{ fontSize: 13, color: "#EF4444", marginBottom: 16, textAlign: "center" }}>{error}</div>}

        <button onClick={handleSave} disabled={!canSave || saving} style={{
          width: "100%", padding: "16px 0", background: canSave ? WHITE : `${WHITE}18`,
          color: canSave ? "#000" : MUTED, border: "none", borderRadius: 10,
          fontWeight: 700, fontSize: 15, cursor: canSave ? "pointer" : "not-allowed",
          fontFamily: "inherit", transition: "all 0.15s",
        }}>
          {saving ? "Adding..." : "Add Aircraft"}
        </button>
      </div>
    </div>
  );
}

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
  nudgeFlight, onNudgeSubmitReport, onNudgeNothingToReport, onNudgeRemindLater, onNudgeDismiss,
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
  org, orgProfiles, records,
  onCreateAircraft,
  onUpdateMel,
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
            onNudgeNothingToReport={onNudgeNothingToReport}
            onNudgeRemindLater={onNudgeRemindLater}
            onNudgeDismiss={onNudgeDismiss}
            nudgeFlight={nudgeFlight}
            fleetAircraft={fleetAircraft}
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
      case "more":
        return (
          <MobileMoreMenu
            subView={moreSubView}
            onNavigate={(id) => setMoreSubView(id)}
            onBack={() => setMoreSubView(null)}
            unreadCount={unreadCount}
            fleetAircraft={fleetAircraft}
            onUpdateAircraftStatus={onUpdateAircraftStatus}
            onUpdateMel={onUpdateMel}
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

      {/* First-time aircraft prompt for admin users with no fleet */}
      {fleetAircraft.length === 0 && ADMIN_ROLES.includes(profile?.role) && onCreateAircraft && (
        <MobileAddAircraftPrompt onAdd={onCreateAircraft} />
      )}

      {/* Content area — scrollable, between header and tab bar */}
      <div style={{
        paddingTop: ((!isOnline || pendingCount > 0) ? 56 + 36 : 56),
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
