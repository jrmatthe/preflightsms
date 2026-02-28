import { useState, useMemo } from "react";

const BLACK = "#000000";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const CYAN = "#22D3EE";

const cardStyle = { background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` };

const CATEGORIES = {
  safety_policy: "Safety Policy", sop: "SOP", emergency_procedures: "Emergency",
  training_manual: "Training", org_chart: "Org Chart", sms_manual: "SMS Manual",
  maintenance: "Maintenance", operations_specs: "Ops Specs", other: "Other",
};

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: `${CYAN}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No Policies</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>Policies will appear here when published by your organization.</div>
    </div>
  );
}

function BackHeader({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: WHITE, fontSize: 20, padding: 4,
        cursor: "pointer", display: "flex", alignItems: "center", minWidth: 44, minHeight: 44,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: WHITE }}>{title}</div>
    </div>
  );
}

// ── POLICY DETAIL VIEW ───────────────────────────────────────
function PolicyDetail({ policy, profile, onAcknowledge, onBack }) {
  const [acknowledging, setAcknowledging] = useState(false);
  const [justAcked, setJustAcked] = useState(false);

  const isAcknowledged = justAcked || (policy.acknowledgments || []).some(a => a.user_id === profile?.id);
  const catLabel = CATEGORIES[policy.category] || policy.category;

  const handleAcknowledge = async () => {
    if (!onAcknowledge || isAcknowledged) return;
    setAcknowledging(true);
    await onAcknowledge(policy.id);
    setJustAcked(true);
    setAcknowledging(false);
  };

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <div>
      <BackHeader title="Policy" onBack={onBack} />

      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 700, textTransform: "uppercase",
              background: `${GREEN}22`, color: GREEN,
            }}>{policy.status || "active"}</span>
            <span style={{ fontSize: 14, color: MUTED }}>{catLabel}</span>
            {policy.version && <span style={{ fontSize: 14, color: MUTED }}>{"\u00B7"} v{policy.version}</span>}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: WHITE, lineHeight: 1.3, marginBottom: 6 }}>{policy.title}</div>
          {policy.effective_date && (
            <div style={{ fontSize: 14, color: MUTED }}>Effective: {formatDate(policy.effective_date)}</div>
          )}
        </div>

        {/* Acknowledgment status */}
        <div style={{
          ...cardStyle, padding: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
          borderColor: isAcknowledged ? `${GREEN}44` : `${YELLOW}44`,
          background: isAcknowledged ? `${GREEN}06` : `${YELLOW}06`,
        }}>
          {isAcknowledged ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: GREEN }}>You have acknowledged this policy</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: YELLOW }}>Action Required</span>
            </>
          )}
        </div>

        {/* Policy content */}
        {policy.content && (
          <div style={{
            fontSize: 15, color: OFF_WHITE, lineHeight: 1.8, whiteSpace: "pre-wrap",
            marginBottom: 24,
          }}>{policy.content}</div>
        )}

        {policy.description && !policy.content && (
          <div style={{
            fontSize: 15, color: OFF_WHITE, lineHeight: 1.8, whiteSpace: "pre-wrap",
            marginBottom: 24,
          }}>{policy.description}</div>
        )}

        {/* File attachment */}
        {policy.file_url && (
          <a href={policy.file_url} target="_blank" rel="noopener noreferrer" style={{
            ...cardStyle, padding: 14, display: "flex", alignItems: "center", gap: 12,
            textDecoration: "none", marginBottom: 24,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: CYAN }}>{policy.file_name || "Download Attachment"}</div>
              <div style={{ fontSize: 14, color: MUTED }}>Tap to open</div>
            </div>
          </a>
        )}

        {/* Acknowledge button */}
        {!isAcknowledged && onAcknowledge && (
          <button onClick={handleAcknowledge} disabled={acknowledging} style={{
            width: "100%", padding: "16px 0", borderRadius: 12, fontSize: 16, fontWeight: 600,
            background: acknowledging ? MUTED : GREEN, color: BLACK,
            border: "none", cursor: acknowledging ? "default" : "pointer", fontFamily: "inherit",
            opacity: acknowledging ? 0.7 : 1,
          }}>
            {acknowledging ? "Acknowledging..." : "I Acknowledge This Policy"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── MAIN VIEW ────────────────────────────────────────────────
export default function MobilePoliciesView({ policies, profile, onAcknowledgePolicy }) {
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const activePolicies = useMemo(() => {
    return (policies || []).filter(p => p.status === "active");
  }, [policies]);

  if (selectedPolicy) {
    return (
      <PolicyDetail
        policy={selectedPolicy}
        profile={profile}
        onAcknowledge={onAcknowledgePolicy}
        onBack={() => setSelectedPolicy(null)}
      />
    );
  }

  if (activePolicies.length === 0) return <EmptyState />;

  const unackedCount = activePolicies.filter(p =>
    !(p.acknowledgments || []).some(a => a.user_id === profile?.id)
  ).length;

  return (
    <div style={{ padding: 16 }}>
      {unackedCount > 0 && (
        <div style={{
          ...cardStyle, padding: 12, marginBottom: 14,
          borderColor: `${YELLOW}44`, background: `${YELLOW}06`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: YELLOW }}>{unackedCount} polic{unackedCount !== 1 ? "ies" : "y"} need acknowledgment</span>
        </div>
      )}

      <div style={{ fontSize: 14, color: MUTED, marginBottom: 10 }}>
        {activePolicies.length} active polic{activePolicies.length !== 1 ? "ies" : "y"}
      </div>

      {activePolicies.map(policy => {
        const isAcked = (policy.acknowledgments || []).some(a => a.user_id === profile?.id);
        const catLabel = CATEGORIES[policy.category] || policy.category;
        const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

        return (
          <button key={policy.id} onClick={() => setSelectedPolicy(policy)} aria-label={`${policy.title}${isAcked ? ", acknowledged" : ", action required"}`} style={{
            ...cardStyle, padding: 14, width: "100%", textAlign: "left", cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
            borderLeft: `3px solid ${isAcked ? GREEN : YELLOW}`,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 4, lineHeight: 1.3 }}>{policy.title}</div>
              <div style={{ fontSize: 14, color: MUTED }}>
                {catLabel}
                {policy.effective_date && ` \u00B7 ${formatDate(policy.effective_date)}`}
              </div>
            </div>
            {isAcked ? (
              <div style={{
                width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${GREEN}22`,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            ) : (
              <span style={{
                padding: "3px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600, flexShrink: 0,
                background: `${YELLOW}16`, color: YELLOW, border: `1px solid ${YELLOW}30`,
              }}>Action Required</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
