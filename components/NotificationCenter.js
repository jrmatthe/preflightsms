import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { isNotificationEnabled, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, CATEGORY_ORDER } from "../lib/notificationCategories";

const DARK = "#0a0d14";
const CARD = "#0e1118";
const BORDER = "rgba(255,255,255,0.04)";
const WHITE = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.35)";
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
  frat_rejected: RED,
  frat_self_dispatched: AMBER,
  investigation_created: YELLOW,
  action_created: GREEN,
  action_assigned: CYAN,
  action_overdue: RED,
  action_due_soon: AMBER,
  policy_published: CYAN,
  training_expiring: AMBER,
  report_status_update: GREEN,
  audit_due: AMBER,
  audit_overdue: RED,
  audit_finding: RED,
  trend_alert: CYAN,
  moc_assigned: CYAN,
  moc_review_due: AMBER,
  culture_survey_available: GREEN,
  engagement_milestone: GREEN,
  foreflight_frat_created: CYAN,
  schedaero_frat_created: CYAN,
  schedaero_sync_error: RED,
  erp_drill_due: AMBER,
  erp_plan_review_due: AMBER,
  spi_threshold_approaching: AMBER,
  spi_target_breached: RED,
  asap_report_submitted: CYAN,
  asap_erc_decision: GREEN,
  asap_corrective_action_due: AMBER,
  compliance_item_expiring: AMBER,
  api_webhook_failed: RED,
  safety_digest: CYAN,
  safety_bulletin: YELLOW,
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

function NotificationPreferencesPanel({ preferences, onSave }) {
  const [draft, setDraft] = useState(() => {
    const initial = {};
    for (const cat of CATEGORY_ORDER) {
      initial[cat] = preferences?.[cat] !== false;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const toggle = (cat) => {
    setDraft(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  };

  const hasChanges = CATEGORY_ORDER.some(cat => draft[cat] !== (preferences?.[cat] !== false));

  return (
    <div style={{ padding: "12px 16px", overflowY: "auto", maxHeight: 392, flex: 1 }}>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
        Choose which notification categories to show. Overdue flight alerts are always on.
      </div>
      {CATEGORY_ORDER.map(cat => (
        <div key={cat} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 0", borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{CATEGORY_LABELS[cat]}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{CATEGORY_DESCRIPTIONS[cat]}</div>
          </div>
          <button
            onClick={() => toggle(cat)}
            style={{
              width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
              background: draft[cat] ? CYAN : "#333", position: "relative",
              transition: "background 0.2s", flexShrink: 0, marginLeft: 12,
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 8, background: WHITE,
              position: "absolute", top: 2, left: draft[cat] ? 18 : 2,
              transition: "left 0.2s",
            }} />
          </button>
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        style={{
          width: "100%", marginTop: 12, padding: "8px 0", borderRadius: 6,
          border: "none", cursor: hasChanges ? "pointer" : "default",
          background: hasChanges ? CYAN : "#333", color: hasChanges ? "#000" : MUTED,
          fontSize: 12, fontWeight: 700, fontFamily: "inherit",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}

export default function NotificationCenter({ notifications, reads, onMarkRead, onMarkAllRead, profile, onNavigate, onUpdatePreferences }) {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
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
  const prefs = profile?.notification_preferences || null;

  // Filter notifications visible to this user
  const visible = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter(n => {
      if (n.target_user_id && n.target_user_id !== userId) return false;
      if (n.target_roles && n.target_roles.length > 0 && !n.target_roles.includes(userRole)) {
        if (n.target_user_id === userId) return true;
        return false;
      }
      if (!isNotificationEnabled(n.type, prefs)) return false;
      return true;
    });
  }, [notifications, userRole, userId, prefs]);

  const readSet = useMemo(() => new Set(reads || []), [reads]);
  const unreadCount = visible.filter(n => !readSet.has(n.id)).length;

  const [bulletinModal, setBulletinModal] = useState(null);

  const handleClick = (n) => {
    if (!readSet.has(n.id)) onMarkRead(n.id);
    if (n.type === "safety_bulletin") {
      setBulletinModal(n);
      setOpen(false);
      return;
    }
    if (n.link_tab) onNavigate(n.link_tab, n.link_id || null);
    setOpen(false);
  };

  const handleSavePrefs = useCallback(async (newPrefs) => {
    if (onUpdatePreferences) await onUpdatePreferences(newPrefs);
    setShowPrefs(false);
  }, [onUpdatePreferences]);

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
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>Alerts</span>
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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>
                {showPrefs ? "Preferences" : "Notifications"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!showPrefs && unreadCount > 0 && (
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
              <button
                onClick={() => setShowPrefs(!showPrefs)}
                title={showPrefs ? "Back to notifications" : "Notification preferences"}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: showPrefs ? CYAN : MUTED,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600 }}>{showPrefs ? "Back" : "Settings"}</span>
              </button>
            </div>
          </div>

          {/* Content */}
          {showPrefs ? (
            <NotificationPreferencesPanel preferences={prefs} onSave={handleSavePrefs} />
          ) : (
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
          )}
        </div>
      )}
      {/* Safety Bulletin Modal */}
      {bulletinModal && (
        <div onClick={() => setBulletinModal(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: 28, width: "90vw", maxWidth: 560, maxHeight: "80vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: YELLOW, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Safety Bulletin</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, lineHeight: 1.4 }}>{bulletinModal.title?.replace("Safety Bulletin: ", "")}</div>
              </div>
              <button onClick={() => setBulletinModal(null)} style={{
                background: "none", border: "none", color: MUTED, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1,
              }}>{"\u00D7"}</button>
            </div>
            <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{bulletinModal.body}</div>
            <div style={{ marginTop: 16, fontSize: 10, color: MUTED }}>{new Date(bulletinModal.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>
      )}
    </div>
  );
}
