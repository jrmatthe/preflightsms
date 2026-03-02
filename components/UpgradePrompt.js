import { useState } from "react";

const CARD = "#161616", NEAR_BLACK = "#0A0A0A", DARK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#D4D4D4", MUTED = "#666666", BLACK = "#000000";
const BORDER = "#232323";
const GREEN = "#4ADE80", CYAN = "#22D3EE", YELLOW = "#FACC15", AMBER = "#F59E0B";

const PLAN_COMPARISON = [
  { feature: "Aircraft", free: "1", starter: "Up to 5", professional: "Up to 15" },
  { feature: "Users", free: "1", starter: "Unlimited", professional: "Unlimited" },
  { feature: "FRAT Submissions", free: "Unlimited", starter: "Unlimited", professional: "Unlimited" },
  { feature: "Safety Reports", free: "Unlimited", starter: "Unlimited", professional: "Unlimited" },
  { feature: "Flight Following", free: false, starter: true, professional: true },
  { feature: "Investigations", free: "View only", starter: "Full", professional: "Full" },
  { feature: "Corrective Actions", free: "5 open max", starter: "Unlimited", professional: "Unlimited" },
  { feature: "Policy Library", free: "3 max", starter: "Unlimited", professional: "Unlimited" },
  { feature: "SMS Manual", free: "Read-only", starter: false, professional: "Full editor" },
  { feature: "Training/CBT", free: false, starter: true, professional: true },
  { feature: "Dashboard Analytics", free: false, starter: false, professional: true },
  { feature: "FAA Audit Log", free: false, starter: false, professional: true },
  { feature: "ERP Plans", free: "1 (read-only)", starter: "2", professional: "Unlimited" },
  { feature: "Data Export", free: false, starter: true, professional: true },
  { feature: "Live ADS-B Tracking", free: false, starter: false, professional: true },
];

export default function UpgradePrompt({ feature, message, onNavigateToSubscription, onDismiss }) {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, maxWidth: showComparison ? 700 : 440, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "28px 24px 20px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${CYAN}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ fontSize: 22 }}>{"\u2B06"}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 6 }}>This Feature is Available on a Paid Plan</div>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 20 }}>
              {message || `${feature || "This feature"} is included with the Starter plan. Upgrading gives your team access to more tools for managing safety effectively.`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            <button onClick={onNavigateToSubscription} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>See Plan Options</button>
            <button onClick={onDismiss} style={{ padding: "10px 24px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Maybe Later</button>
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={() => setShowComparison(!showComparison)} style={{ background: "none", border: "none", color: CYAN, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              {showComparison ? "Hide comparison" : "Compare plans"}
            </button>
          </div>
        </div>

        {showComparison && (
          <div style={{ padding: "0 24px 24px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Feature</th>
                  <th style={{ textAlign: "center", padding: "8px 6px", color: CYAN, fontWeight: 600 }}>Free</th>
                  <th style={{ textAlign: "center", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Starter<br /><span style={{ fontWeight: 400, fontSize: 9 }}>$149/mo</span></th>
                  <th style={{ textAlign: "center", padding: "8px 6px", color: GREEN, fontWeight: 600 }}>Professional<br /><span style={{ fontWeight: 400, fontSize: 9 }}>$349/mo</span></th>
                </tr>
              </thead>
              <tbody>
                {PLAN_COMPARISON.map(row => (
                  <tr key={row.feature} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "6px", color: OFF_WHITE }}>{row.feature}</td>
                    {[row.free, row.starter, row.professional].map((val, i) => (
                      <td key={i} style={{ padding: "6px", textAlign: "center", color: val === true ? GREEN : val === false ? "#555" : MUTED }}>
                        {val === true ? "\u2713" : val === false ? "\u2014" : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
