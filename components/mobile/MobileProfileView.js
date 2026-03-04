import { useState } from "react";

const BLACK = "#000000";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const cardStyle = { background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` };

const ROLE_LABELS = {
  admin: "Administrator",
  safety_manager: "Safety Manager",
  accountable_exec: "Accountable Executive",
  chief_pilot: "Chief Pilot",
  pilot: "Pilot",
};

export default function MobileProfileView({ profile, orgData, onSignOut }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const initials = (profile?.full_name || "")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = ROLE_LABELS[profile?.role] || profile?.role || "Pilot";
  const orgName = orgData?.name || profile?.organizations?.name || "Organization";

  const handleSignOut = async () => {
    setSigningOut(true);
    if (onSignOut) await onSignOut();
    setSigningOut(false);
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Profile card */}
      <div style={{ ...cardStyle, padding: 20, marginBottom: 16, textAlign: "center" }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: 36, margin: "0 auto 12px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${CYAN}22`, border: `2px solid ${CYAN}44`,
        }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: CYAN }}>{initials || "?"}</span>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: WHITE, marginBottom: 4 }}>
          {profile?.full_name || "User"}
        </div>
        <div style={{ fontSize: 14, color: MUTED, marginBottom: 8 }}>
          {profile?.email || ""}
        </div>
        <span style={{
          display: "inline-block", padding: "4px 12px", borderRadius: 8,
          fontSize: 14, fontWeight: 600, background: `${CYAN}16`, color: CYAN,
          border: `1px solid ${CYAN}30`,
        }}>{roleLabel}</span>
      </div>

      {/* Organization */}
      <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Organization</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {orgData?.logo_url ? (
            <img src={orgData.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain", background: BLACK }} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: BLACK,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${BORDER}`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: MUTED }}>{orgName[0]}</span>
            </div>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: WHITE }}>{orgName}</div>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div style={{ ...cardStyle, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, padding: "12px 16px 6px" }}>Account</div>
        {[
          { label: "Full Name", value: profile?.full_name },
          { label: "Email", value: profile?.email },
          { label: "Role", value: roleLabel },
          { label: "User ID", value: profile?.id?.slice(0, 8) + "..." },
        ].filter(r => r.value).map((row, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none",
          }}>
            <span style={{ fontSize: 14, color: MUTED }}>{row.label}</span>
            <span style={{ fontSize: 14, color: OFF_WHITE, fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Sign out */}
      {!showConfirm ? (
        <button onClick={() => setShowConfirm(true)} style={{
          width: "100%", padding: "16px 0", borderRadius: 12,
          background: "transparent", border: `1px solid ${RED}44`,
          color: RED, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          Sign Out
        </button>
      ) : (
        <div style={{ ...cardStyle, padding: 20, textAlign: "center", borderColor: `${RED}44` }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: WHITE, marginBottom: 6 }}>Sign out?</div>
          <div style={{ fontSize: 14, color: MUTED, marginBottom: 16 }}>You will need to sign in again to access your account.</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowConfirm(false)} style={{
              flex: 1, padding: "14px 0", borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: "transparent", border: `1px solid ${BORDER}`, color: MUTED,
              cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={handleSignOut} disabled={signingOut} style={{
              flex: 1, padding: "14px 0", borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: RED, color: WHITE, border: "none",
              cursor: signingOut ? "default" : "pointer", fontFamily: "inherit",
              opacity: signingOut ? 0.7 : 1,
            }}>{signingOut ? "Signing out..." : "Sign Out"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
