import { useState } from "react";
import { ONBOARDING_FLOWS, FLOW_ORDER } from "../lib/onboardingFlows";

const BORDER = "#2E2E2E";
const WHITE = "#FFFFFF", OFF_WHITE = "#E0E0E0", MUTED = "#777777";
const GREEN = "#4ADE80", AMBER = "#F59E0B", CYAN = "#22D3EE";

export default function OnboardingDashboard({ onboardingState, onStartFlow, onDismiss, isTrial, onStartFresh }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!onboardingState) return null;
  const flows = onboardingState.flows || {};
  const completedCount = FLOW_ORDER.filter(id => flows[id]?.status === "completed").length;
  const totalCount = FLOW_ORDER.length;
  const allComplete = completedCount === totalCount;
  if (allComplete) return null;

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        style={{
          padding: "10px 16px",
          background: "rgba(34,211,238,0.04)",
          border: `1px solid rgba(34,211,238,0.12)`,
          borderRadius: 8,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>
          Setup — {pct}% complete
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Setup Guide</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: completedCount > 0 ? GREEN : MUTED }}>{completedCount}/{totalCount}</span>
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 2 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "8px 16px 4px" }}>
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${Math.max(pct, 2)}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${CYAN}, ${GREEN})`,
            borderRadius: 2,
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* Flow list */}
      <div style={{ padding: "6px 10px 4px" }}>
        {FLOW_ORDER.map((id, index) => {
          const flow = ONBOARDING_FLOWS[id];
          if (!flow) return null;
          const state = flows[id] || { status: "not_started", current_step: 0 };
          const isComplete = state.status === "completed";
          const isInProgress = state.status === "in_progress";

          return (
            <div key={id} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 10px",
              marginBottom: 3,
              background: isComplete ? "rgba(74,222,128,0.04)" : "transparent",
              borderBottom: `1px solid ${BORDER}`,
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isComplete ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span style={{
                    width: 18, height: 18, borderRadius: 5,
                    background: isInProgress ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)",
                    border: isInProgress ? "none" : `1px solid ${BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isInProgress ? CYAN : MUTED,
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {index + 1}
                  </span>
                )}
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: isComplete ? MUTED : OFF_WHITE,
                  textDecoration: isComplete ? "line-through" : "none",
                  textDecorationColor: "rgba(119,119,119,0.4)",
                }}>
                  {flow.title}
                </span>
              </div>
              <div style={{ flexShrink: 0, marginLeft: 8 }}>
                {isComplete ? (
                  <span style={{ fontSize: 9, color: GREEN, fontWeight: 700, textTransform: "uppercase" }}>Done</span>
                ) : (
                  <button
                    onClick={() => onStartFlow(id)}
                    style={{
                      padding: "4px 12px",
                      background: isInProgress ? "transparent" : CYAN,
                      color: isInProgress ? CYAN : "#000",
                      border: isInProgress ? `1px solid rgba(34,211,238,0.3)` : "none",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isInProgress ? "Continue" : "Start"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sandbox callout */}
      {isTrial && (
        <div style={{
          margin: "4px 10px 6px",
          padding: "10px 12px",
          background: "rgba(245,158,11,0.04)",
          border: `1px solid rgba(245,158,11,0.12)`,
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: AMBER, marginBottom: 2 }}>Sandbox Mode</div>
            <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4 }}>Use dummy data to explore, then wipe clean before going live.</div>
          </div>
          <button
            onClick={onStartFresh}
            style={{
              padding: "5px 12px",
              background: "transparent",
              color: AMBER,
              border: `1px solid rgba(245,158,11,0.25)`,
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 10,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Reset Data
          </button>
        </div>
      )}

      {/* Dismiss */}
      <div style={{ padding: "2px 16px 8px", textAlign: "center" }}>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", color: MUTED, fontSize: 9, cursor: "pointer" }}
        >
          Dismiss guide
        </button>
      </div>
    </div>
  );
}
