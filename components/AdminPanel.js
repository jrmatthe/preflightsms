import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { hasFeature } from "../lib/tiers";
const FRATTemplateEditor = dynamic(() => import("./FRATTemplateEditor"), { ssr: false });
const FleetManagement = dynamic(() => import("./FleetManagement"), { ssr: false });

const CARD = "#161616", NEAR_BLACK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", BLACK = "#000000";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", CYAN = "#22D3EE", YELLOW = "#FACC15", AMBER = "#F59E0B";

const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };
const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, background: BLACK, color: OFF_WHITE, boxSizing: "border-box" };

const ROLES = [
  { id: "pilot", label: "Pilot", desc: "Submit FRATs, file flight plans, submit safety reports" },
  { id: "dispatcher", label: "Dispatcher", desc: "Create and monitor flights, view FRATs and reports" },
  { id: "maintenance", label: "Maintenance", desc: "Submit safety reports, view hazards, complete SMS training" },
  { id: "safety_manager", label: "Safety Manager", desc: "Full SMS access — investigate reports, manage hazards, approve FRATs, manage users" },
  { id: "chief_pilot", label: "Chief Pilot", desc: "Approve FRATs, view all data, assign corrective actions, manage users" },
  { id: "accountable_exec", label: "Accountable Executive", desc: "Approve FRATs, view dashboards and audit logs, manage users" },
  { id: "admin", label: "Admin", desc: "Full access — all features, user management, billing, and org settings" },
];

const PERMISSIONS = [
  { id: "flight_follower", label: "Flight Follower", desc: "Receives email alerts when a flight becomes overdue" },
  { id: "approver", label: "FRAT Approver", desc: "Can approve or reject high/critical risk FRATs (for non-admin roles like Pilot or Dispatcher)" },
];

const TIER_DEFS = {
  free: { name: "Free", price: "Free", aircraft: "1", color: CYAN },
  starter: { name: "Starter", price: "$149/mo", aircraft: "5", color: MUTED },
  professional: { name: "Professional", price: "$349/mo", aircraft: "15", color: GREEN },
  enterprise: { name: "Enterprise", price: "Custom", aircraft: "Unlimited", color: CYAN },
};

const FEATURE_LABELS_MAP = {
  frat: "Flight Risk Assessment (FRAT)",
  flight_following: "Flight Following",
  safety_reporting: "Safety Reporting",
  hazard_register: "Investigation Register",
  corrective_actions: "Corrective Actions",
  policy_library: "Policy Library",
  training_records: "Training Records",
  dashboard_analytics: "Dashboard Analytics",
  safety_trend_alerts: "Safety Trend Alerts",
  scheduled_reports: "Scheduled PDF Reports",
  faa_audit_log: "FAA Part 5 Audit Log",
  custom_frat_template: "Custom FRAT Templates",
  cbt_modules: "Training & CBT Modules",
  role_permissions: "Role-Based Permissions",
  approval_workflow: "FRAT Approval Workflow",
  document_library: "Document Library",
  sms_manuals: "SMS Manual Templates",
  foreflight_integration: "ForeFlight Integration",
  schedaero_integration: "Schedaero Integration",
  internal_evaluation: "Internal Evaluation Program (IEP)",
  management_of_change: "Management of Change",
  safety_culture_survey: "Safety Culture Survey",
  fatigue_assessment: "Fatigue Risk Assessment",
  insurance_export: "Insurance Data Export & Scorecard",
  asap_program: "ASAP Program",
  international_compliance: "International Compliance",
  api_access: "API Access",
  multi_base: "Multi-Base Support",
  priority_support: "Priority Support",
};

function ForeflightIntegration({ config, onSave, onTestConnection, onSyncNow }) {
  const [apiKey, setApiKey] = useState(config?.api_key || "");
  const [enabled, setEnabled] = useState(config?.enabled || false);
  const [syncInterval, setSyncInterval] = useState(config?.sync_interval_minutes || 5);
  const [autoCreateFrats, setAutoCreateFrats] = useState(config?.auto_create_frats || false);
  const [notifyPilots, setNotifyPilots] = useState(config?.notify_pilots_on_sync ?? true);
  const [pushFrat, setPushFrat] = useState(config?.push_frat_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (config) {
      setApiKey(config.api_key || "");
      setEnabled(config.enabled || false);
      setSyncInterval(config.sync_interval_minutes || 5);
      setAutoCreateFrats(config.auto_create_frats || false);
      setNotifyPilots(config.notify_pilots_on_sync ?? true);
      setPushFrat(config.push_frat_enabled ?? true);
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      api_key: apiKey,
      enabled,
      sync_interval_minutes: syncInterval,
      auto_create_frats: autoCreateFrats,
      notify_pilots_on_sync: notifyPilots,
      push_frat_enabled: pushFrat,
    });
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await onTestConnection(apiKey);
    setTestResult(result);
    setTesting(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    await onSyncNow();
    setSyncing(false);
  };

  const lastSynced = config?.last_synced_at;
  const syncError = config?.last_sync_error;
  const hasCredentials = !!apiKey;

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div>
      {/* Configuration Card */}
      <div data-onboarding="int-ff-card" style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <img src="/foreflight-logo.png" alt="ForeFlight" style={{ height: 22, filter: "invert(1)" }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Dispatch Configuration</div>
        </div>

        <div data-onboarding="int-ff-instructions" style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Setup Instructions</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: OFF_WHITE, lineHeight: 1.8 }}>
            <li>Open the <a href="https://dispatch.foreflight.com/tools/console/keys" target="_blank" rel="noopener noreferrer" style={{ color: CYAN, textDecoration: "none", fontWeight: 600 }}>ForeFlight API Console</a> and generate a new API token</li>
            <li>Copy the token and paste it into the API Key field below</li>
            <li>Turn on <strong style={{ color: WHITE }}>Enable Integration</strong> and <strong style={{ color: WHITE }}>Auto-create FRATs</strong></li>
            <li>Click <strong style={{ color: WHITE }}>Test Connection</strong> to verify your token is working</li>
            <li>Once the test passes, click <strong style={{ color: WHITE }}>Save</strong> to store your configuration</li>
          </ol>
        </div>

        <div data-onboarding="int-ff-apikey" style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>API Key</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your ForeFlight API token"
            style={{ ...inp }} />
        </div>

        {/* Toggles */}
        <div data-onboarding="int-ff-toggles" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Enable Integration", val: enabled, set: setEnabled },
            { label: "Notify Pilots on Sync", val: notifyPilots, set: setNotifyPilots },
            { label: "Auto-create FRATs", val: autoCreateFrats, set: setAutoCreateFrats },
            { label: "Push FRAT PDF to ForeFlight", val: pushFrat, set: setPushFrat },
          ].map(t => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <button onClick={() => t.set(!t.val)}
                style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
                  background: t.val ? GREEN : BORDER, transition: "background 0.2s" }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: WHITE, position: "absolute", top: 2,
                  left: t.val ? 18 : 2, transition: "left 0.2s" }} />
              </button>
              <span style={{ fontSize: 11, color: OFF_WHITE }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Sync Interval */}
        <div data-onboarding="int-ff-interval" style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Sync Interval</label>
          <select value={syncInterval} onChange={e => setSyncInterval(Number(e.target.value))}
            style={{ ...inp, width: 200 }}>
            {[5, 10, 15, 30, 60].map(m => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div data-onboarding="int-ff-buttons" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleTest} disabled={testing || !hasCredentials}
            style={{ padding: "8px 16px", background: "transparent", color: CYAN, border: `1px solid ${CYAN}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: testing || !hasCredentials ? "default" : "pointer", opacity: testing || !hasCredentials ? 0.5 : 1 }}>
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </button>
          {testResult && (
            <span style={{ fontSize: 11, fontWeight: 600, color: testResult.success ? GREEN : RED }}>
              {testResult.success ? "\u2713 Connected" : `\u2717 ${testResult.error || "Failed"}`}
            </span>
          )}
        </div>
      </div>

      {/* Sync Status Card */}
      <div data-onboarding="int-ff-sync" style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 14 }}>Sync Status</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5,
            background: syncError ? RED : lastSynced ? GREEN : MUTED }} />
          <div>
            <div style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>
              {syncError ? "Error" : lastSynced ? "Connected" : "Never synced"}
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>
              Last synced: {getRelativeTime(lastSynced)}
              {syncError && <span style={{ color: RED }}> — {syncError}</span>}
            </div>
          </div>
        </div>

        <button onClick={handleSync} disabled={syncing || !enabled || !hasCredentials}
          style={{ padding: "8px 16px", background: "transparent", color: CYAN, border: `1px solid ${CYAN}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: syncing || !enabled || !hasCredentials ? "default" : "pointer", opacity: syncing || !enabled || !hasCredentials ? 0.5 : 1 }}>
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
    </div>
  );
}

function SchedaeroIntegration({ config, onSave, onTestConnection, onSyncNow }) {
  const BLUE = "#60A5FA";
  const [apiKey, setApiKey] = useState(config?.api_key || "");
  const [enabled, setEnabled] = useState(config?.enabled || false);
  const [syncInterval, setSyncInterval] = useState(config?.sync_interval_minutes || 5);
  const [syncWindow, setSyncWindow] = useState(config?.sync_window_hours || 24);
  const [autoCreateFrats, setAutoCreateFrats] = useState(config?.auto_create_frats || false);
  const [notifyPilots, setNotifyPilots] = useState(config?.notify_pilots_on_sync ?? true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (config) {
      setApiKey(config.api_key || "");
      setEnabled(config.enabled || false);
      setSyncInterval(config.sync_interval_minutes || 5);
      setSyncWindow(config.sync_window_hours || 24);
      setAutoCreateFrats(config.auto_create_frats || false);
      setNotifyPilots(config.notify_pilots_on_sync ?? true);
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      api_key: apiKey,
      enabled,
      sync_interval_minutes: syncInterval,
      sync_window_hours: syncWindow,
      auto_create_frats: autoCreateFrats,
      notify_pilots_on_sync: notifyPilots,
    });
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await onTestConnection(apiKey);
    setTestResult(result);
    setTesting(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    await onSyncNow();
    setSyncing(false);
  };

  const lastSynced = config?.last_synced_at;
  const syncError = config?.last_sync_error;
  const syncLog = Array.isArray(config?.sync_log) ? config.sync_log : [];
  const hasCredentials = !!apiKey;

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div>
      {/* Configuration Card */}
      <div data-onboarding="int-sc-card" style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <img src="/schedaero-logo.svg" alt="Schedaero" style={{ height: 18 }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Configuration</div>
        </div>

        <div data-onboarding="int-sc-instructions" style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Setup Instructions</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: OFF_WHITE, lineHeight: 1.8 }}>
            <li>Contact the Schedaero support team to request an Authentication Token for your account</li>
            <li>Once granted, go to your Company API page in Schedaero</li>
            <li>Click <strong style={{ color: WHITE }}>View</strong> in the connections list, then <strong style={{ color: WHITE }}>View Credentials</strong> in the Authentication Tokens section</li>
            <li>In the popup, copy the <strong style={{ color: WHITE }}>Authentication Token</strong> (not the API Token)</li>
            <li>Paste it into the Authentication Token field below</li>
            <li>Turn on <strong style={{ color: WHITE }}>Enable Integration</strong> and <strong style={{ color: WHITE }}>Auto-create FRATs</strong></li>
            <li>Click <strong style={{ color: WHITE }}>Test Connection</strong> to verify your token is working</li>
            <li>Once the test passes, click <strong style={{ color: WHITE }}>Save</strong> to store your configuration</li>
          </ol>
        </div>

        <div data-onboarding="int-sc-apikey" style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Authentication Token</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your Schedaero authentication token"
            style={{ ...inp, maxWidth: 400 }} />
        </div>

        {/* Toggles */}
        <div data-onboarding="int-sc-toggles" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Enable Integration", val: enabled, set: setEnabled },
            { label: "Notify Pilots on Sync", val: notifyPilots, set: setNotifyPilots },
            { label: "Auto-create FRATs", val: autoCreateFrats, set: setAutoCreateFrats },
          ].map(t => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
              <button onClick={() => t.set(!t.val)}
                style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
                  background: t.val ? GREEN : BORDER, transition: "background 0.2s" }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: WHITE, position: "absolute", top: 2,
                  left: t.val ? 18 : 2, transition: "left 0.2s" }} />
              </button>
              <span style={{ fontSize: 11, color: OFF_WHITE }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Sync Interval + Sync Window */}
        <div data-onboarding="int-sc-interval" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Sync Interval</label>
            <select value={syncInterval} onChange={e => setSyncInterval(Number(e.target.value))}
              style={{ ...inp }}>
              {[5, 10, 15, 30, 60].map(m => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Sync Window</label>
            <select value={syncWindow} onChange={e => setSyncWindow(Number(e.target.value))}
              style={{ ...inp }}>
              {[12, 24, 48, 72].map(h => (
                <option key={h} value={h}>{h} hours</option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div data-onboarding="int-sc-buttons" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleTest} disabled={testing || !hasCredentials}
            style={{ padding: "8px 16px", background: "transparent", color: BLUE, border: `1px solid ${BLUE}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: testing || !hasCredentials ? "default" : "pointer", opacity: testing || !hasCredentials ? 0.5 : 1 }}>
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </button>
          {testResult && (
            <span style={{ fontSize: 11, fontWeight: 600, color: testResult.success ? GREEN : RED }}>
              {testResult.success ? "\u2713 Connected" : `\u2717 ${testResult.error || "Failed"}`}
            </span>
          )}
        </div>
      </div>

      {/* Sync Status Card */}
      <div data-onboarding="int-sc-sync" style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 14 }}>Sync Status</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5,
            background: syncError ? RED : lastSynced ? GREEN : MUTED }} />
          <div>
            <div style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>
              {syncError ? "Error" : lastSynced ? "Connected" : "Never synced"}
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>
              Last synced: {getRelativeTime(lastSynced)}
              {syncError && <span style={{ color: RED }}> — {syncError}</span>}
            </div>
          </div>
        </div>

        <button onClick={handleSync} disabled={syncing || !enabled || !hasCredentials}
          style={{ padding: "8px 16px", background: "transparent", color: BLUE, border: `1px solid ${BLUE}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: syncing || !enabled || !hasCredentials ? "default" : "pointer", opacity: syncing || !enabled || !hasCredentials ? 0.5 : 1 }}>
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {/* Sync Log Card */}
      {syncLog.length > 0 && (
        <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 14 }}>Sync Log</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {syncLog.map((entry, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: NEAR_BLACK, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 10, color: MUTED }}>{getRelativeTime(entry.timestamp)}</span>
                <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
                  <span style={{ color: GREEN }}>{entry.synced} new</span>
                  <span style={{ color: OFF_WHITE }}>{entry.updated} updated</span>
                  {entry.duplicates > 0 && <span style={{ color: AMBER }}>{entry.duplicates} duplicates</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionTab({ orgData, onUpdateOrg, canManage, onCheckout, onBillingPortal, onStartFresh, onRequestDeletion, onCancelDeletion }) {
  const tier = orgData?.tier || "starter";
  const tierDef = TIER_DEFS[tier] || TIER_DEFS.starter;
  const flags = orgData?.feature_flags || {};
  const status = orgData?.subscription_status || "trial";
  const trialEnds = orgData?.trial_ends_at;
  const [billingInterval, setBillingInterval] = useState("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);

  const handleCheckout = async (plan) => {
    // Existing subscribers: route to billing portal for plan changes (handles proration)
    if (hasStripe && onBillingPortal) {
      setPortalLoading(true);
      try { await onBillingPortal(); } catch (e) { console.error(e); alert("Could not open billing portal: " + (e.message || "Please try again.")); }
      setPortalLoading(false);
      return;
    }
    setCheckoutLoading(true);
    try {
      await onCheckout(plan, billingInterval);
    } catch (e) { console.error(e); alert("Checkout failed: " + (e.message || "Please try again.")); }
    setCheckoutLoading(false);
  };

  const isActive = status === "active";
  const isTrial = status === "trial";
  const isFree = status === "free" || tier === "free";
  const hasStripe = !!orgData?.stripe_subscription_id;

  return (
    <div>
      {/* Current plan */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 16, borderLeft: `4px solid ${tierDef.color}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{tierDef.name}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{tierDef.price} · Up to {tierDef.aircraft} aircraft</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ padding: "4px 12px", borderRadius: 12, fontSize: 10, fontWeight: 700,
              background: status === "active" ? `${GREEN}22` : status === "trial" ? `${YELLOW}22` : isFree ? `${CYAN}22` : `${RED}22`,
              color: status === "active" ? GREEN : status === "trial" ? YELLOW : isFree ? CYAN : RED,
              border: `1px solid ${status === "active" ? GREEN + "44" : status === "trial" ? YELLOW + "44" : isFree ? CYAN + "44" : RED + "44"}`,
              textTransform: "uppercase" }}>{isFree ? "FREE" : status}</span>
            {status === "trial" && trialEnds && (
              <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>Trial ends {new Date(trialEnds).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Start Fresh */}
      {isTrial && canManage && onStartFresh && (
        <div style={{ ...card, padding: "20px 24px", marginBottom: 16, borderLeft: `4px solid ${AMBER}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Start Fresh</div>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 14 }}>
            Delete all organization data and start over. User accounts will be preserved.
          </div>
          <button
            onClick={onStartFresh}
            style={{
              padding: "8px 20px",
              background: "transparent",
              color: AMBER,
              border: `1px solid ${AMBER}44`,
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${AMBER}11`; e.currentTarget.style.borderColor = `${AMBER}88`; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${AMBER}44`; }}
          >
            Start Fresh
          </button>
        </div>
      )}

      {/* Subscribe / Change Plan */}
      {canManage && (isFree || isTrial || !hasStripe) && (
        <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 14 }}>
            {isFree ? "Upgrade Your Plan" : isTrial ? "Subscribe to Continue After Trial" : "Subscribe"}
          </div>

          {/* Billing toggle */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, background: NEAR_BLACK, borderRadius: 8, padding: 3, width: "fit-content" }}>
            {[["monthly", "Monthly"], ["annual", "Annual (save 17%)"]].map(([id, label]) => (
              <button key={id} onClick={() => setBillingInterval(id)}
                style={{ padding: "7px 16px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: billingInterval === id ? WHITE : "transparent",
                  color: billingInterval === id ? BLACK : MUTED,
                  border: "none" }}>{label}</button>
            ))}
          </div>

          {/* Plan cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }} className="plan-grid">
            {[
              { id: "free", name: "Free", monthly: 0, annual: 0, desc: "1 aircraft, 1 user", noBilling: true,
                features: ["FRAT Submissions", "Safety Reporting", "ERP (1 read-only plan)", "Investigations (view-only)", "5 Corrective Actions", "3 Policies", "SMS Manual (read-only)", "Basic Dashboard"] },
              { id: "starter", name: "Starter", monthly: 149, annual: 1490, desc: "Up to 5 aircraft",
                features: ["Everything in Free, plus:", "Flight Following", "Training & CBT", "ERP (2 plans)", "Full Investigations", "Unlimited CAs & Policies", "SMS Manual (editable)", "Pilot Engagement", "Data Export (CSV/PDF)"] },
              { id: "professional", name: "Professional", monthly: 349, annual: 3490, desc: "Up to 15 aircraft", badge: true,
                features: ["Everything in Starter, plus:", "ForeFlight & Schedaero Integration", "AI Risk Intelligence", "FRAT Analytics & Safety Metrics", "SPIs/SPTs", "Audits/IEP & Change Management", "Safety Culture Surveys", "Fatigue Risk Assessment", "Declaration of Compliance Wizard", "Insurance Scorecard & Export", "Custom FRAT Templates", "Approval Workflows", "FAA Audit Log", "API (read-only)"] },
              { id: "enterprise", name: "Enterprise", monthly: 0, annual: 0, desc: "Unlimited aircraft", isEnterprise: true,
                features: ["Everything in Professional, plus:", "ASAP Program", "International Compliance (ICAO/IS-BAO/EASA)", "API (read-write) & Webhooks", "Multi-base Support", "Dedicated Support"] },
            ].map(p => {
              const price = billingInterval === "annual" ? p.annual : p.monthly;
              const perMonth = billingInterval === "annual" ? Math.round(p.annual / 12) : p.monthly;
              const isCurrent = (p.id === "free" && isFree) || (isActive && tier === p.id);
              return (
                <div key={p.id} style={{ ...card, padding: "16px 14px", position: "relative", border: `1px solid ${isCurrent ? GREEN + "44" : p.badge ? GREEN + "33" : BORDER}` }}>
                  {p.badge && <div style={{ position: "absolute", top: -8, right: 10, fontSize: 8, fontWeight: 700, color: BLACK, background: GREEN, padding: "2px 8px", borderRadius: 3 }}>MOST POPULAR</div>}
                  <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>{p.desc}</div>
                  <div style={{ marginBottom: 10 }}>
                    {p.noBilling ? (
                      <span style={{ fontSize: 24, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>$0</span>
                    ) : p.isEnterprise ? (
                      <span style={{ fontSize: 18, fontWeight: 800, color: WHITE }}>Custom</span>
                    ) : (<>
                      <span style={{ fontSize: 24, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>${perMonth}</span>
                      <span style={{ fontSize: 10, color: MUTED }}>/mo</span>
                      {billingInterval === "annual" && <div style={{ fontSize: 9, color: GREEN, marginTop: 2 }}>Billed ${price}/year</div>}
                    </>)}
                  </div>
                  <div style={{ minHeight: 120 }}>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ fontSize: 9, color: f.includes("Everything") || f.includes("plus:") ? CYAN : OFF_WHITE, padding: "2px 0", display: "flex", gap: 4 }}>
                        <span style={{ color: GREEN, flexShrink: 0 }}>{f.includes("Everything") || f.includes("plus:") ? "\u2605" : "\u2713"}</span>{f}
                      </div>
                    ))}
                  </div>
                  {p.noBilling ? (
                    <div style={{ width: "100%", marginTop: 10, padding: "9px 0", borderRadius: 6, fontWeight: 700, fontSize: 11, textAlign: "center",
                      background: isCurrent ? `${GREEN}22` : "transparent", color: isCurrent ? GREEN : MUTED,
                      border: `1px solid ${isCurrent ? GREEN + "44" : BORDER}` }}>
                      {isCurrent ? "\u2713 Current Plan" : "Free Forever"}
                    </div>
                  ) : p.isEnterprise ? (
                    <a href="mailto:sales@preflightsms.com" style={{ display: "block", width: "100%", marginTop: 10, padding: "9px 0", borderRadius: 6, fontWeight: 700, fontSize: 11, textAlign: "center", textDecoration: "none",
                      background: isCurrent ? `${GREEN}22` : "transparent", color: isCurrent ? GREEN : CYAN,
                      border: `1px solid ${isCurrent ? GREEN + "44" : CYAN + "44"}` }}>
                      {isCurrent ? "\u2713 Current Plan" : "Contact Sales"}
                    </a>
                  ) : (
                    <button onClick={() => handleCheckout(p.id)} disabled={checkoutLoading || portalLoading || isCurrent}
                      style={{ width: "100%", marginTop: 10, padding: "9px 0", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: isCurrent ? "default" : (checkoutLoading || portalLoading) ? "wait" : "pointer",
                        background: isCurrent ? `${GREEN}22` : WHITE, color: isCurrent ? GREEN : BLACK,
                        border: isCurrent ? `1px solid ${GREEN}44` : "none",
                        opacity: (checkoutLoading || portalLoading) ? 0.6 : 1 }}>
                      {isCurrent ? "\u2713 Current Plan" : (checkoutLoading || portalLoading) ? "Redirecting..." : hasStripe ? "Change Plan" : "Subscribe"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manage subscription (active/past_due/canceled with Stripe) */}
      {canManage && hasStripe && (status === "active" || status === "past_due" || status === "canceled") && (
        <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>Manage Subscription</div>
          {status === "past_due" && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.25)", color: YELLOW, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>
              {"\u26A0\uFE0F"} Your payment is past due. Update your payment method to restore full access.
            </div>
          )}
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>
            Use the Stripe portal to update your payment method, change plans, view invoices, or cancel.
          </div>
          <button onClick={async () => { setPortalLoading(true); try { await onBillingPortal?.(); } finally { setPortalLoading(false); } }} disabled={portalLoading}
            style={{ padding: "10px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: portalLoading ? "wait" : "pointer", opacity: portalLoading ? 0.6 : 1 }}>
            {portalLoading ? "Opening..." : status === "past_due" ? "Update Payment Method" : "Manage Subscription"}
          </button>
        </div>
      )}

      {/* Plan features */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 14 }}>Plan Features</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(FEATURE_LABELS_MAP).map(([key, label]) => {
            const enabled = hasFeature(orgData, key);
            return (
              <div key={key}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6,
                  background: enabled ? "rgba(74,222,128,0.06)" : "transparent",
                  border: `1px solid ${enabled ? "rgba(74,222,128,0.15)" : BORDER}`,
                  opacity: enabled ? 1 : 0.4 }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                  border: `2px solid ${enabled ? GREEN : BORDER}`,
                  background: enabled ? GREEN : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {enabled && <span style={{ color: BLACK, fontSize: 10, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 10, color: enabled ? OFF_WHITE : MUTED }}>{label}</span>
                {!enabled && <span style={{ fontSize: 8, color: MUTED, marginLeft: "auto" }}>Upgrade</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Account */}
      {canManage && (
        <div style={{ ...card, padding: "20px 24px", marginBottom: 16, borderLeft: `4px solid ${RED}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Delete Account</div>
          {orgData?.scheduled_deletion_at ? (() => {
            const delDate = new Date(orgData.scheduled_deletion_at);
            const daysLeft = Math.max(0, Math.ceil((delDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            return (<>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: RED, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>
                Deletion scheduled for {delDate.toLocaleDateString()} ({daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining). Your organization is in read-only mode.
              </div>
              <button
                onClick={async () => {
                  setCancellingDeletion(true);
                  try { await onCancelDeletion(); } finally { setCancellingDeletion(false); }
                }}
                disabled={cancellingDeletion}
                style={{
                  padding: "8px 20px", background: "transparent", color: CYAN,
                  border: `1px solid ${CYAN}44`, borderRadius: 6, fontWeight: 700, fontSize: 12,
                  cursor: cancellingDeletion ? "wait" : "pointer", opacity: cancellingDeletion ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${CYAN}11`; e.currentTarget.style.borderColor = `${CYAN}88`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${CYAN}44`; }}
              >
                {cancellingDeletion ? "Cancelling..." : "Cancel Deletion"}
              </button>
            </>);
          })() : orgData?.deletion_reason && !orgData?.scheduled_deletion_at ? (<>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.25)", color: YELLOW, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>
              Your subscription is being canceled. The 14-day deletion countdown will begin when your current billing cycle ends. You have full access until then.
            </div>
            <button
              onClick={async () => {
                setCancellingDeletion(true);
                try { await onCancelDeletion(); } finally { setCancellingDeletion(false); }
              }}
              disabled={cancellingDeletion}
              style={{
                padding: "8px 20px", background: "transparent", color: CYAN,
                border: `1px solid ${CYAN}44`, borderRadius: 6, fontWeight: 700, fontSize: 12,
                cursor: cancellingDeletion ? "wait" : "pointer", opacity: cancellingDeletion ? 0.6 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${CYAN}11`; e.currentTarget.style.borderColor = `${CYAN}88`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${CYAN}44`; }}
            >
              {cancellingDeletion ? "Cancelling..." : "Cancel Deletion"}
            </button>
          </>) : (<>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 14 }}>
              Permanently delete your organization and all associated data. {(status === "active" || status === "past_due") ? "Your subscription will be canceled and you\u2019ll keep access until your billing cycle ends. After that, a 14-day read-only grace period begins before permanent deletion." : "This action cannot be undone after the 14-day grace period."}
            </div>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteReason(""); setDeleteConfirmName(""); }}
              style={{
                padding: "8px 20px", background: "transparent", color: RED,
                border: `1px solid ${RED}44`, borderRadius: 6, fontWeight: 700, fontSize: 12,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${RED}11`; e.currentTarget.style.borderColor = `${RED}88`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${RED}44`; }}
            >
              Delete Account
            </button>
          </>)}
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => !deletionLoading && setShowDeleteModal(false)}>
          <div style={{ background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 32, maxWidth: 480, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: WHITE, marginBottom: 8 }}>Delete {orgData?.name || "this organization"}?</div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 20, textAlign: "left" }}>
              {(status === "active" || status === "past_due") ? (<>
                Your subscription will be canceled and you&apos;ll keep <strong style={{ color: OFF_WHITE }}>full access until your billing cycle ends</strong>. After that, your organization enters read-only mode for <strong style={{ color: OFF_WHITE }}>14 days</strong>, then all data — FRATs, flights, safety reports, training, aircraft, users — will be <strong style={{ color: RED }}>permanently deleted</strong>. You can cancel anytime before deletion.
              </>) : (<>
                Your organization will enter <strong style={{ color: OFF_WHITE }}>read-only mode immediately</strong>. All data — FRATs, flights, safety reports, training, aircraft, users — will be <strong style={{ color: RED }}>permanently deleted after 14 days</strong>. You can cancel anytime during this period.
              </>)}
            </div>

            <div style={{ textAlign: "left", marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, display: "block", marginBottom: 6 }}>Reason for leaving</label>
              <select
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                style={{ ...inp, cursor: "pointer" }}
              >
                <option value="">Select a reason...</option>
                <option value="Too expensive">Too expensive</option>
                <option value="Missing features">Missing features</option>
                <option value="Switching to another tool">Switching to another tool</option>
                <option value="No longer needed">No longer needed</option>
                <option value="Too complex">Too complex</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ textAlign: "left", marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, display: "block", marginBottom: 6 }}>
                Type <strong style={{ color: WHITE }}>{orgData?.name}</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                placeholder={orgData?.name || "Organization name"}
                style={inp}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setShowDeleteModal(false)} disabled={deletionLoading}
                style={{ padding: "10px 24px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeletionLoading(true);
                  try {
                    await onRequestDeletion(deleteReason);
                    setShowDeleteModal(false);
                  } catch (err) {
                    console.error("Deletion request failed:", err);
                  } finally {
                    setDeletionLoading(false);
                  }
                }}
                disabled={deletionLoading || !deleteReason || deleteConfirmName !== orgData?.name}
                style={{
                  padding: "10px 24px",
                  background: (deletionLoading || !deleteReason || deleteConfirmName !== orgData?.name) ? "rgba(239,68,68,0.3)" : RED,
                  color: WHITE, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: (deletionLoading || !deleteReason || deleteConfirmName !== orgData?.name) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {deletionLoading && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: WHITE, borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />}
                {deletionLoading ? "Scheduling..." : "Schedule Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({ user, profile, canManage, onUpdateRole, onUpdatePermissions, onUpdateEmail, onRemoveUser }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editEmail, setEditEmail] = useState(user.email || "");
  const [savingEmail, setSavingEmail] = useState(false);
  const role = ROLES.find(r => r.id === user.role) || ROLES[0];
  const isMe = user.id === profile?.id;
  const userPerms = user.permissions || [];

  const togglePerm = (permId) => {
    const updated = userPerms.includes(permId) ? userPerms.filter(p => p !== permId) : [...userPerms, permId];
    onUpdatePermissions(user.id, updated);
  };

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: canManage ? "pointer" : "default" }} onClick={() => canManage && setExpanded(!expanded)}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: NEAR_BLACK, border: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: MUTED }}>{(user.full_name || "?")[0].toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: WHITE }}>{user.full_name}</span>
            {isMe && <span style={{ fontSize: 9, color: CYAN, background: `${CYAN}22`, padding: "1px 6px", borderRadius: 8 }}>You</span>}
          </div>
          <div style={{ fontSize: 10, color: MUTED }}>
            {user.email || "No email"} · Joined {new Date(user.created_at).toLocaleDateString()}
            {userPerms.length > 0 && ` · ${userPerms.length} extra permission${userPerms.length > 1 ? "s" : ""}`}
          </div>
        </div>
        {canManage && !isMe ? (
          <select value={user.role} onChange={e => { e.stopPropagation(); onUpdateRole(user.id, e.target.value); }}
            onClick={e => e.stopPropagation()}
            style={{ padding: "4px 8px", borderRadius: 4, fontSize: 11, background: NEAR_BLACK, color: OFF_WHITE,
              border: `1px solid ${BORDER}`, cursor: "pointer" }}>
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 11, color: role.id === "admin" ? CYAN : role.id === "safety_manager" ? GREEN : MUTED, fontWeight: 600 }}>
            {role.label}
          </span>
        )}
        {canManage && <span style={{ color: MUTED, fontSize: 12, flexShrink: 0 }}>{expanded ? "\u25B2" : "\u25BC"}</span>}
      </div>
      {expanded && canManage && (
        <div style={{ padding: "8px 0 14px 48px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Additional Permissions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PERMISSIONS.map(p => {
              const has = userPerms.includes(p.id);
              return (
                <button key={p.id} onClick={() => togglePerm(p.id)} title={p.desc}
                  style={{ padding: "5px 12px", borderRadius: 16, fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: has ? `${GREEN}22` : "transparent", color: has ? GREEN : MUTED,
                    border: `1px solid ${has ? GREEN + "44" : BORDER}` }}>
                  {has ? "✓ " : ""}{p.label}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Email</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="user@example.com"
                style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, background: BLACK, color: OFF_WHITE, border: `1px solid ${BORDER}`, width: 240, boxSizing: "border-box" }} />
              <button disabled={savingEmail || editEmail === (user.email || "")} onClick={async () => { setSavingEmail(true); await onUpdateEmail(user.id, editEmail); setSavingEmail(false); }}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: savingEmail || editEmail === (user.email || "") ? "default" : "pointer",
                  background: savingEmail || editEmail === (user.email || "") ? "transparent" : `${GREEN}22`, color: savingEmail || editEmail === (user.email || "") ? MUTED : GREEN,
                  border: `1px solid ${savingEmail || editEmail === (user.email || "") ? BORDER : GREEN + "44"}` }}>{savingEmail ? "Saving…" : "Save"}</button>
            </div>
          </div>
          {!isMe && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
              {!confirmRemove ? (
                <button onClick={() => setConfirmRemove(true)}
                  style={{ fontSize: 10, color: RED, background: "none", border: `1px solid ${RED}44`, borderRadius: 4, padding: "5px 12px", cursor: "pointer" }}>Remove User</button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: RED, fontWeight: 600 }}>Remove {user.full_name}?</span>
                  <button onClick={() => { onRemoveUser(user.id); setConfirmRemove(false); }}
                    style={{ fontSize: 10, color: WHITE, background: RED, border: "none", borderRadius: 4, padding: "5px 12px", cursor: "pointer", fontWeight: 700 }}>Yes, Remove</button>
                  <button onClick={() => setConfirmRemove(false)}
                    style={{ fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "5px 12px", cursor: "pointer" }}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── INVITE SECTION ─────────────────────────────────────────
function InviteSection({ canManage, onInvite, invitations, onRevoke, onResend }) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("pilot");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInvite = async () => {
    if (!email.trim()) { setError("Enter an email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Invalid email address"); return; }
    setError(""); setSending(true);
    try {
      const result = await onInvite(email.trim(), role);
      if (result?.error) { setError(result.error); setSending(false); return; }
      setSuccess(`Invitation sent to ${email.trim()}`);
      setEmail(""); setRole("pilot");
      setTimeout(() => { setSuccess(""); setShowForm(false); }, 3000);
    } catch (e) { setError(e.message); }
    setSending(false);
  };

  const pending = invitations.filter(i => i.status === "pending");
  const expired = invitations.filter(i => i.status === "expired" || (i.status === "pending" && new Date(i.expires_at) < new Date()));

  if (!canManage) return null;

  return (
    <div data-tour="tour-admin-invite" style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Invite Team Members</div>
        {!showForm && <button onClick={() => setShowForm(true)} style={{ padding: "6px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Invite User</button>}
      </div>

      {showForm && (
        <div style={{ background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
          <div className="invite-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Email Address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="pilot@company.com" style={{ ...inp, padding: "10px 12px" }}
                onKeyDown={e => { if (e.key === "Enter") handleInvite(); }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inp, padding: "10px 12px" }}>
                <option value="pilot">Pilot</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="maintenance">Maintenance</option>
                <option value="safety_manager">Safety Manager</option>
                <option value="chief_pilot">Chief Pilot</option>
                <option value="accountable_exec">Accountable Exec</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {error && <div style={{ fontSize: 11, color: RED, marginBottom: 8 }}>{error}</div>}
          {success && <div style={{ fontSize: 11, color: GREEN, marginBottom: 8 }}>{success}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleInvite} disabled={sending}
              style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.6 : 1 }}>
              {sending ? "Sending..." : "Send Invitation"}</button>
            <button onClick={() => { setShowForm(false); setError(""); setSuccess(""); }}
              style={{ padding: "8px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Pending ({pending.length})</div>
          {pending.map(inv => {
            const isExpired = new Date(inv.expires_at) < new Date();
            return (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: isExpired ? MUTED : OFF_WHITE, fontWeight: 600 }}>{inv.email}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>
                    {ROLES.find(r => r.id === inv.role)?.label || inv.role} · Sent {new Date(inv.created_at).toLocaleDateString()}
                    {isExpired && <span style={{ color: AMBER }}> · Expired</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => onResend(inv.id)} style={{ fontSize: 10, color: CYAN, background: "none", border: `1px solid ${CYAN}44`, borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Resend</button>
                  <button onClick={() => onRevoke(inv.id)} style={{ fontSize: 10, color: RED, background: "none", border: `1px solid ${RED}44`, borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Revoke</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending.length === 0 && !showForm && (
        <div style={{ fontSize: 11, color: MUTED, textAlign: "center", padding: 12 }}>No pending invitations. Click &quot;+ Invite User&quot; to add team members.</div>
      )}
    </div>
  );
}

// ── API & WEBHOOK MANAGEMENT ─────────────────────────────────
function ApiWebhookManagement({ apiKeys, webhooks, onCreateApiKey, onRevokeApiKey, onCreateWebhook, onUpdateWebhook, onDeleteWebhook, onTestWebhook, orgData }) {
  const tier = orgData?.tier || "starter";
  const ff = orgData?.feature_flags || {};
  const apiAccessLevel = ff.api_access !== undefined ? ff.api_access : (tier === "enterprise" ? true : tier === "professional" ? "read_only" : false);
  const isReadOnly = apiAccessLevel === "read_only";

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyPerms, setKeyPerms] = useState(["frats:read", "reports:read", "fleet:read", "users:read", "training:read"]);
  const [keyExpiry, setKeyExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [showCreateWh, setShowCreateWh] = useState(false);
  const [whUrl, setWhUrl] = useState("");
  const [whEvents, setWhEvents] = useState([]);
  const [whDesc, setWhDesc] = useState("");
  const [createdSecret, setCreatedSecret] = useState(null);
  const [creatingWh, setCreatingWh] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [confirmDeleteWh, setConfirmDeleteWh] = useState(null);

  const API_PERMS = [
    { id: "frats:read", label: "FRATs (Read)" },
    { id: "frats:write", label: "FRATs (Write)", writeOnly: true },
    { id: "reports:read", label: "Reports (Read)" },
    { id: "reports:write", label: "Reports (Write)", writeOnly: true },
    { id: "fleet:read", label: "Fleet (Read)" },
    { id: "users:read", label: "Users (Read)" },
    { id: "training:read", label: "Training (Read)" },
  ];

  const EVENTS = [
    { id: "frat.completed", label: "FRAT Completed" },
    { id: "report.submitted", label: "Report Submitted" },
    { id: "flight.overdue", label: "Flight Overdue" },
    { id: "action.overdue", label: "Action Overdue" },
  ];

  const handleCreateKey = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const rawKey = "pflt_" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    const keyData = { name: keyName.trim(), key_hash: keyHash, key_prefix: rawKey.substring(0, 8), permissions: keyPerms };
    if (keyExpiry) keyData.expires_at = new Date(keyExpiry).toISOString();
    await onCreateApiKey(keyData);
    setCreatedKey(rawKey);
    setCreating(false);
  };

  const dismissKeyModal = () => {
    setCreatedKey(null);
    setCopiedKey(false);
    setShowCreateKey(false);
    setKeyName("");
    setKeyPerms(["frats:read", "reports:read", "fleet:read", "users:read", "training:read"]);
    setKeyExpiry("");
  };

  const handleCreateWebhook = async () => {
    if (!whUrl.trim() || whEvents.length === 0) return;
    setCreatingWh(true);
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    await onCreateWebhook({ url: whUrl.trim(), events: whEvents, secret, description: whDesc.trim() || null });
    setCreatedSecret(secret);
    setCreatingWh(false);
  };

  const dismissSecretModal = () => {
    setCreatedSecret(null);
    setCopiedSecret(false);
    setShowCreateWh(false);
    setWhUrl("");
    setWhEvents([]);
    setWhDesc("");
  };

  const handleTest = async (whId) => {
    setTesting(whId);
    setTestResults(prev => ({ ...prev, [whId]: null }));
    const result = await onTestWebhook(whId);
    setTestResults(prev => ({ ...prev, [whId]: result }));
    setTesting(null);
  };

  const togglePerm = (permId) => {
    setKeyPerms(prev => prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]);
  };

  const toggleEvent = (eventId) => {
    setWhEvents(prev => prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]);
  };

  const copyText = (text, setCopiedFn) => {
    navigator.clipboard.writeText(text);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 3000);
  };

  const relTime = (dateStr) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div>
      {isReadOnly && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.25)", color: YELLOW, fontSize: 11, fontWeight: 600, marginBottom: 16 }}>
          Professional plan — read-only API access. Upgrade to Enterprise for write permissions.
        </div>
      )}

      {/* ── API Keys ── */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>API Keys</div>
          {!showCreateKey && !createdKey && (
            <button onClick={() => setShowCreateKey(true)} style={{ padding: "6px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Create API Key</button>
          )}
        </div>

        {showCreateKey && !createdKey && (
          <div style={{ background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Key Name</label>
              <input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="e.g., Production Integration" style={{ ...inp }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Permissions</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {API_PERMS.map(p => {
                  const disabled = isReadOnly && p.writeOnly;
                  const checked = keyPerms.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => !disabled && togglePerm(p.id)} disabled={disabled} title={disabled ? "Write permissions require Enterprise plan" : ""}
                      style={{ padding: "5px 12px", borderRadius: 16, fontSize: 10, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
                        background: checked ? `${GREEN}22` : "transparent", color: checked ? GREEN : disabled ? BORDER : MUTED,
                        border: `1px solid ${checked ? GREEN + "44" : BORDER}`, opacity: disabled ? 0.4 : 1 }}>
                      {checked ? "\u2713 " : ""}{p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Expiration (Optional)</label>
              <input type="date" value={keyExpiry} onChange={e => setKeyExpiry(e.target.value)} style={{ ...inp, width: 200 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleCreateKey} disabled={creating || !keyName.trim()}
                style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: creating ? "wait" : "pointer", opacity: creating || !keyName.trim() ? 0.6 : 1 }}>
                {creating ? "Creating..." : "Create Key"}</button>
              <button onClick={() => { setShowCreateKey(false); setKeyName(""); setKeyExpiry(""); }}
                style={{ padding: "8px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {createdKey && (
          <div style={{ background: "rgba(74,222,128,0.06)", border: `1px solid ${GREEN}44`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, marginBottom: 8 }}>API Key Created</div>
            <div style={{ fontSize: 11, color: OFF_WHITE, marginBottom: 10 }}>Copy this key now. It will not be shown again.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <code style={{ flex: 1, padding: "10px 12px", background: BLACK, borderRadius: 6, fontSize: 12, color: CYAN, fontFamily: "monospace", wordBreak: "break-all", border: `1px solid ${BORDER}` }}>{createdKey}</code>
              <button onClick={() => copyText(createdKey, setCopiedKey)}
                style={{ padding: "8px 14px", background: copiedKey ? GREEN : "transparent", color: copiedKey ? BLACK : CYAN, border: `1px solid ${copiedKey ? GREEN : CYAN}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                {copiedKey ? "Copied!" : "Copy"}</button>
            </div>
            <button onClick={dismissKeyModal}
              style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Done</button>
          </div>
        )}

        {apiKeys.length === 0 && !showCreateKey && !createdKey && (
          <div style={{ fontSize: 11, color: MUTED, textAlign: "center", padding: 16 }}>No API keys yet. Create one to start using the API.</div>
        )}
        {apiKeys.map(k => (
          <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: k.is_active ? WHITE : MUTED }}>{k.name}</span>
                <code style={{ fontSize: 10, color: MUTED, fontFamily: "monospace" }}>{k.key_prefix}...</code>
                {!k.is_active && <span style={{ fontSize: 8, color: RED, background: `${RED}22`, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>REVOKED</span>}
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                {(k.permissions || []).join(", ")} · Created {new Date(k.created_at).toLocaleDateString()} · Last used {relTime(k.last_used_at)}
                {k.expires_at && ` · Expires ${new Date(k.expires_at).toLocaleDateString()}`}
              </div>
            </div>
            {k.is_active && (
              confirmRevoke === k.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { onRevokeApiKey(k.id); setConfirmRevoke(null); }}
                    style={{ fontSize: 10, color: WHITE, background: RED, border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>Revoke</button>
                  <button onClick={() => setConfirmRevoke(null)}
                    style={{ fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmRevoke(k.id)}
                  style={{ fontSize: 10, color: RED, background: "none", border: `1px solid ${RED}44`, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Revoke</button>
              )
            )}
          </div>
        ))}
      </div>

      {/* ── Webhooks ── */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Webhooks</div>
          {!showCreateWh && !createdSecret && (
            <button onClick={() => setShowCreateWh(true)} style={{ padding: "6px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Add Webhook</button>
          )}
        </div>

        {showCreateWh && !createdSecret && (
          <div style={{ background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Endpoint URL</label>
              <input value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://your-app.com/webhooks/preflight" style={{ ...inp }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Events</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EVENTS.map(e => {
                  const checked = whEvents.includes(e.id);
                  return (
                    <button key={e.id} onClick={() => toggleEvent(e.id)}
                      style={{ padding: "5px 12px", borderRadius: 16, fontSize: 10, fontWeight: 600, cursor: "pointer",
                        background: checked ? `${CYAN}22` : "transparent", color: checked ? CYAN : MUTED,
                        border: `1px solid ${checked ? CYAN + "44" : BORDER}` }}>
                      {checked ? "\u2713 " : ""}{e.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Description (Optional)</label>
              <input value={whDesc} onChange={e => setWhDesc(e.target.value)} placeholder="e.g., Production alerting" style={{ ...inp }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleCreateWebhook} disabled={creatingWh || !whUrl.trim() || whEvents.length === 0}
                style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: creatingWh ? "wait" : "pointer", opacity: creatingWh || !whUrl.trim() || whEvents.length === 0 ? 0.6 : 1 }}>
                {creatingWh ? "Creating..." : "Create Webhook"}</button>
              <button onClick={() => { setShowCreateWh(false); setWhUrl(""); setWhEvents([]); setWhDesc(""); }}
                style={{ padding: "8px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {createdSecret && (
          <div style={{ background: "rgba(74,222,128,0.06)", border: `1px solid ${GREEN}44`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, marginBottom: 8 }}>Webhook Created</div>
            <div style={{ fontSize: 11, color: OFF_WHITE, marginBottom: 10 }}>Copy this signing secret now. It will not be shown again. Use it to verify webhook signatures.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <code style={{ flex: 1, padding: "10px 12px", background: BLACK, borderRadius: 6, fontSize: 12, color: CYAN, fontFamily: "monospace", wordBreak: "break-all", border: `1px solid ${BORDER}` }}>{createdSecret}</code>
              <button onClick={() => copyText(createdSecret, setCopiedSecret)}
                style={{ padding: "8px 14px", background: copiedSecret ? GREEN : "transparent", color: copiedSecret ? BLACK : CYAN, border: `1px solid ${copiedSecret ? GREEN : CYAN}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                {copiedSecret ? "Copied!" : "Copy"}</button>
            </div>
            <button onClick={dismissSecretModal}
              style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Done</button>
          </div>
        )}

        {webhooks.length === 0 && !showCreateWh && !createdSecret && (
          <div style={{ fontSize: 11, color: MUTED, textAlign: "center", padding: 16 }}>No webhooks configured. Add one to receive event notifications.</div>
        )}
        {webhooks.map(wh => (
          <div key={wh.id} style={{ padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: wh.is_active ? (wh.failure_count > 0 ? AMBER : GREEN) : RED, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: wh.is_active ? WHITE : MUTED, wordBreak: "break-all" }}>{wh.url}</div>
                {wh.description && <div style={{ fontSize: 10, color: MUTED }}>{wh.description}</div>}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {wh.is_active ? (
                  <>
                    <button onClick={() => handleTest(wh.id)} disabled={testing === wh.id}
                      style={{ fontSize: 10, color: CYAN, background: "none", border: `1px solid ${CYAN}44`, borderRadius: 4, padding: "4px 10px", cursor: testing === wh.id ? "wait" : "pointer" }}>
                      {testing === wh.id ? "Testing..." : "Test"}</button>
                    {confirmDeleteWh === wh.id ? (
                      <>
                        <button onClick={() => { onDeleteWebhook(wh.id); setConfirmDeleteWh(null); }}
                          style={{ fontSize: 10, color: WHITE, background: RED, border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>Delete</button>
                        <button onClick={() => setConfirmDeleteWh(null)}
                          style={{ fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDeleteWh(wh.id)}
                        style={{ fontSize: 10, color: RED, background: "none", border: `1px solid ${RED}44`, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Delete</button>
                    )}
                  </>
                ) : (
                  <button onClick={() => onUpdateWebhook(wh.id, { is_active: true, failure_count: 0 })}
                    style={{ fontSize: 10, color: GREEN, background: "none", border: `1px solid ${GREEN}44`, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>Reactivate</button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", marginLeft: 18 }}>
              {(wh.events || []).map(ev => (
                <span key={ev} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: `${CYAN}15`, color: CYAN, fontFamily: "monospace" }}>{ev}</span>
              ))}
              <span style={{ fontSize: 9, color: MUTED, marginLeft: 8 }}>
                Last triggered: {relTime(wh.last_triggered_at)}
                {wh.last_status_code > 0 && ` \u00B7 ${wh.last_status_code}`}
                {wh.failure_count > 0 && <span style={{ color: wh.failure_count >= 5 ? RED : AMBER }}> · {wh.failure_count} failure{wh.failure_count !== 1 ? "s" : ""}</span>}
                {!wh.is_active && <span style={{ color: RED }}> · Disabled (10+ failures)</span>}
              </span>
            </div>
            {testResults[wh.id] !== undefined && testResults[wh.id] !== null && (
              <div style={{ marginLeft: 18, marginTop: 6, fontSize: 10, color: testResults[wh.id]?.success ? GREEN : RED, fontWeight: 600 }}>
                {testResults[wh.id]?.success ? `\u2713 Test successful (${testResults[wh.id]?.statusCode})` : `\u2717 Test failed: ${testResults[wh.id]?.error || "Non-2xx response"}`}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── API Documentation Link ── */}
      <div style={{ ...card, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>Documentation</div>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>
          Full API documentation with endpoint references, authentication details, and webhook payload schemas.
        </div>
        <a href="/api-docs" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", padding: "8px 16px", background: "transparent", color: CYAN, border: `1px solid ${CYAN}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, textDecoration: "none", cursor: "pointer" }}>
          View API Documentation \u2192
        </a>
      </div>
    </div>
  );
}

export default function AdminPanel({ profile, session, orgProfiles, onUpdateRole, onUpdatePermissions, onUpdateEmail, onRemoveUser, orgName, orgSlug, orgLogo, onUploadLogo, fratTemplate, fratTemplates, onSaveTemplate, onCreateTemplate, onDeleteTemplate, onSetActiveTemplate, orgData, onUpdateOrg, onCheckout, onBillingPortal, invitations, onInviteUser, onRevokeInvitation, onResendInvitation, initialTab, tourTab, fleetAircraft, maxAircraft, onAddAircraft, onUpdateAircraft, onDeleteAircraft, onUpdateAircraftMel, foreflightConfig, onSaveForeflightConfig, onTestForeflightConnection, onForeflightSyncNow, schedaeroConfig, onSaveSchedaeroConfig, onTestSchedaeroConnection, onSchedaeroSyncNow, apiKeys, webhooks, onCreateApiKey, onRevokeApiKey, onCreateWebhook, onUpdateWebhook, onDeleteWebhook, onTestWebhook, onStartFresh, onRequestDeletion, onCancelDeletion }) {
  const myRole = profile?.role;
  const canManage = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(myRole);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || "org");
  useEffect(() => { if (tourTab) setActiveTab(tourTab); }, [tourTab]);
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  const handleSaveTemplate = async (templateData) => {
    setSavingTemplate(true);
    try {
      await onSaveTemplate(templateData);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadMsg("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { setUploadMsg("File must be under 2MB"); return; }
    setUploading(true);
    setUploadMsg("");
    const result = await onUploadLogo(file);
    setUploading(false);
    if (result?.error) { setUploadMsg("Upload failed: " + (result.error.message || result.error)); }
    else { setUploadMsg("Logo updated"); setTimeout(() => setUploadMsg(""), 3000); }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Admin tabs */}
      <div className="admin-tabs" data-tour="tour-admin-tabs" style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ id: "org", label: "Organization" }, { id: "fleet", label: "Fleet" }, { id: "frat", label: "FRAT Template", feat: "custom_frat_template" }, { id: "integrations", label: "Integrations", feat: ["foreflight_integration", "schedaero_integration"] }, { id: "api", label: "API & Webhooks", feat: "api_access" }, { id: "users", label: "Users & Roles" }, { id: "subscription", label: "Subscription" }].filter(t => {
          if (!t.feat) return true;
          const flags = orgData?.feature_flags || {};
          if (Array.isArray(t.feat)) return t.feat.some(f => flags[f] !== false);
          return flags[t.feat] !== false; // Show if true or undefined
        }).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} {...(t.id === "frat" ? {"data-onboarding": "admin-frat-tab"} : {})} style={{
            padding: "6px 16px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3,
            background: activeTab === t.id ? WHITE : "transparent", color: activeTab === t.id ? BLACK : MUTED,
            border: `1px solid ${activeTab === t.id ? WHITE : BORDER}`,
          }}>{t.label}</button>
        ))}
      </div>

      {/* FRAT Template Editor */}
      {activeTab === "frat" && canManage && (
        <FRATTemplateEditor template={fratTemplate} templates={fratTemplates} onSave={handleSaveTemplate} onCreateTemplate={onCreateTemplate} onDeleteTemplate={onDeleteTemplate} onSetActive={onSetActiveTemplate} saving={savingTemplate} fleetAircraftTypes={[...new Set((fleetAircraft || []).map(a => a.type))]} />
      )}

      {activeTab === "fleet" && canManage && (
        <FleetManagement aircraft={fleetAircraft || []} canManage={canManage} maxAircraft={maxAircraft || 5} onAdd={onAddAircraft} onUpdate={onUpdateAircraft} onDelete={onDeleteAircraft} onUpdateMel={onUpdateAircraftMel} session={session} profile={profile} orgId={profile?.org_id} />
      )}

      {activeTab === "integrations" && canManage && (
        <div data-onboarding="int-section">
          <div data-onboarding="int-warning" style={{ ...card, padding: "14px 20px", marginBottom: 20, borderLeft: `3px solid ${AMBER}`, background: "rgba(245,158,11,0.04)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: AMBER, marginBottom: 4 }}>Use One Integration Only</div>
            <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>Configure either ForeFlight or Schedaero — not both. Running two dispatch integrations simultaneously will cause duplicate flights and data mismatches.</div>
          </div>
          {(orgData?.feature_flags?.foreflight_integration !== false) && (
            <ForeflightIntegration config={foreflightConfig} onSave={onSaveForeflightConfig} onTestConnection={onTestForeflightConnection} onSyncNow={onForeflightSyncNow} />
          )}
          {(orgData?.feature_flags?.schedaero_integration !== false) && (
            <SchedaeroIntegration config={schedaeroConfig} onSave={onSaveSchedaeroConfig} onTestConnection={onTestSchedaeroConnection} onSyncNow={onSchedaeroSyncNow} />
          )}
        </div>
      )}

      {activeTab === "api" && canManage && (
        <ApiWebhookManagement apiKeys={apiKeys || []} webhooks={webhooks || []} onCreateApiKey={onCreateApiKey} onRevokeApiKey={onRevokeApiKey} onCreateWebhook={onCreateWebhook} onUpdateWebhook={onUpdateWebhook} onDeleteWebhook={onDeleteWebhook} onTestWebhook={onTestWebhook} orgData={orgData} />
      )}

      {activeTab === "org" && (<>
      {/* Org Info */}
      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>Organization</div>
        <div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Name</div>
          <div style={{ fontSize: 14, color: WHITE, fontWeight: 600 }}>{orgName}</div>
        </div>
        
        {/* Logo Upload */}
        {canManage && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Organization Logo</div>
            {["professional", "enterprise"].includes(orgData?.tier) ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {orgLogo && <img src={orgLogo} alt="Org logo" style={{ height: 40, objectFit: "contain", borderRadius: 4, background: BLACK, padding: 4 }} />}
                  <label style={{ fontSize: 11, color: CYAN, cursor: "pointer", padding: "6px 14px", borderRadius: 6, border: `1px solid ${CYAN}44`, background: "rgba(34,211,238,0.08)" }}>
                    {uploading ? "Uploading..." : orgLogo ? "Change Logo" : "Upload Logo"}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} disabled={uploading} />
                  </label>
                  {uploadMsg && <span style={{ fontSize: 10, color: uploadMsg.includes("failed") ? RED : GREEN }}>{uploadMsg}</span>}
                </div>
                <div style={{ fontSize: 9, color: MUTED, marginTop: 6 }}>PNG or JPG, max 2MB. This logo appears in the header for all team members.</div>
              </>
            ) : (
              <div style={{ fontSize: 10, color: MUTED }}>Custom logo is available on the Professional plan and above.</div>
            )}
          </div>
        )}
      </div>

      {/* Pilot Engagement Settings */}
      {canManage && (
        <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 12 }}>Pilot Engagement</div>
          {[
            { label: "Enable Pilot Engagement", desc: "Show FRAT streaks, recognitions, and team engagement metrics on the dashboard", key: "gamification_enabled", val: orgData?.gamification_enabled !== false },
            { label: "Monthly Engagement Email", desc: "Send each pilot a monthly safety summary with their stats, streak, and recognitions", key: "monthly_engagement_email", val: orgData?.monthly_engagement_email === true },
          ].map(t => (
            <div key={t.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>{t.label}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{t.desc}</div>
              </div>
              <button className="admin-toggle" onClick={() => onUpdateOrg({ [t.key]: !t.val })}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", background: t.val ? GREEN : BORDER, transition: "background 0.2s", flexShrink: 0, marginLeft: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: WHITE, position: "absolute", top: 3, left: t.val ? 21 : 3, transition: "left 0.2s" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fleet Status Settings */}
      {canManage && (() => {
        const fsEnabled = orgData?.fleet_status_enabled !== false;
        const fsFields = orgData?.fleet_status_fields || { tailNumber: true, type: true, location: true, fuel: true, updated: true };
        const fieldDefs = [
          { key: "tailNumber", label: "Tail Number", desc: "Aircraft registration / tail number" },
          { key: "type", label: "Aircraft Type", desc: "Aircraft type designation" },
          { key: "location", label: "Location & Parking", desc: "Last arrived airport and parking spot" },
          { key: "fuel", label: "Fuel Remaining", desc: "Fuel on board at last arrival" },
          { key: "updated", label: "Last Updated", desc: "Relative time since last arrival" },
        ];
        return (
          <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 12 }}>Fleet Status</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>Enable Fleet Status Tab</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Show the Fleet Status tab on the dashboard with aircraft locations and status</div>
              </div>
              <button className="admin-toggle" onClick={() => onUpdateOrg({ fleet_status_enabled: !fsEnabled })}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", background: fsEnabled ? GREEN : BORDER, transition: "background 0.2s", flexShrink: 0, marginLeft: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: WHITE, position: "absolute", top: 3, left: fsEnabled ? 21 : 3, transition: "left 0.2s" }} />
              </button>
            </div>
            {fsEnabled && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 6 }}>Choose which columns appear in Fleet Status:</div>
                {fieldDefs.map(f => {
                  const on = fsFields[f.key] !== false;
                  return (
                    <div key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0 6px 12px", borderBottom: `1px solid ${BORDER}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: OFF_WHITE }}>{f.label}</div>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{f.desc}</div>
                      </div>
                      <button className="admin-toggle-sm" onClick={() => onUpdateOrg({ fleet_status_fields: { ...fsFields, [f.key]: !on } })}
                        style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative", background: on ? GREEN : BORDER, transition: "background 0.2s", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: WHITE, position: "absolute", top: 3, left: on ? 19 : 3, transition: "left 0.2s" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
      </>)}

      {/* Users & Invitations */}
      {activeTab === "users" && (<>
      {(orgData?.tier || "starter") !== "free" && <InviteSection canManage={canManage} onInvite={onInviteUser} invitations={invitations || []} onRevoke={onRevokeInvitation} onResend={onResendInvitation} />}
      {(orgData?.tier || "starter") === "free" && canManage && (
        <div style={{ ...card, padding: "14px 18px", marginBottom: 16, background: "rgba(34,211,238,0.04)", border: `1px solid rgba(34,211,238,0.15)` }}>
          <div style={{ fontSize: 11, color: CYAN }}>Free plan is limited to 1 user. Upgrade to Starter to invite team members.</div>
        </div>
      )}

      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Team Members ({orgProfiles.length})</div>
        </div>

        {orgProfiles.map(user => (
          <UserRow key={user.id} user={user} profile={profile} canManage={canManage} onUpdateRole={onUpdateRole} onUpdatePermissions={onUpdatePermissions} onUpdateEmail={onUpdateEmail} onRemoveUser={onRemoveUser} />
        ))}
      </div>

      {/* Role & permission descriptions */}
      <div style={{ ...card, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Roles</div>
        {ROLES.map(r => (
          <div key={r.id} style={{ display: "flex", gap: 12, padding: "6px 0" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, width: 140, flexShrink: 0 }}>{r.label}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{r.desc}</span>
          </div>
        ))}
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>Additional Permissions</div>
        {PERMISSIONS.map(p => (
          <div key={p.id} style={{ display: "flex", gap: 12, padding: "6px 0" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, width: 140, flexShrink: 0 }}>{p.label}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{p.desc}</span>
          </div>
        ))}
      </div>
      </>)}

      {/* Subscription */}
      {activeTab === "subscription" && (<>
        <SubscriptionTab orgData={orgData} onUpdateOrg={onUpdateOrg} canManage={canManage} onCheckout={onCheckout} onBillingPortal={onBillingPortal} onStartFresh={onStartFresh} onRequestDeletion={onRequestDeletion} onCancelDeletion={onCancelDeletion} />
      </>)}
    </div>
  );
}
