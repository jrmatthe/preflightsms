import { useState } from "react";
import { ONBOARDING_FLOWS, FLOW_ORDER } from "../lib/onboardingFlows";

const DARK = "#111111", CARD = "#222222", BORDER = "#2E2E2E", LIGHT_BORDER = "#3A3A3A";
const WHITE = "#FFFFFF", OFF_WHITE = "#E0E0E0", MUTED = "#777777";
const GREEN = "#4ADE80", AMBER = "#F59E0B";

export default function OnboardingDashboard({ onboardingState, onStartFlow, onDismiss }) {
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
          margin: "0 0 16px",
          padding: "10px 16px",
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = LIGHT_BORDER}
        onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>
            Continue setting up — {pct}% complete
          </span>
        </div>
        <div style={{ width: 100, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: GREEN, borderRadius: 2, transition: "width 0.3s ease" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      margin: "0 0 20px",
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, marginBottom: 2 }}>Getting Started</div>
          <div style={{ fontSize: 11, color: MUTED }}>
            {completedCount} of {totalCount} complete
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 11, padding: "4px 8px" }}
          onMouseEnter={e => e.currentTarget.style.color = OFF_WHITE}
          onMouseLeave={e => e.currentTarget.style.color = MUTED}
        >
          Minimize
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "0 20px 14px" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {FLOW_ORDER.map((id, i) => {
            const isComplete = flows[id]?.status === "completed";
            return (
              <div key={id} style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: isComplete ? GREEN : "rgba(255,255,255,0.08)",
                transition: "background 0.3s ease",
              }} />
            );
          })}
        </div>
      </div>

      {/* Flow list */}
      <div style={{ padding: "0 20px 8px" }}>
        {FLOW_ORDER.map(id => {
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
              padding: "10px 0",
              borderTop: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Status icon */}
                {isComplete ? (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(74,222,128,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : isInProgress ? (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(245,158,11,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: AMBER }} />
                  </div>
                ) : (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: `2px solid ${BORDER}`,
                    flexShrink: 0,
                  }} />
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isComplete ? MUTED : WHITE }}>
                    {flow.title}
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>
                    {flow.description}
                  </div>
                </div>
              </div>
              <div style={{ flexShrink: 0, marginLeft: 12 }}>
                {isComplete ? (
                  <span style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>Completed</span>
                ) : (
                  <button
                    onClick={() => onStartFlow(id)}
                    style={{
                      padding: "6px 16px",
                      background: isInProgress ? "transparent" : WHITE,
                      color: isInProgress ? WHITE : "#000000",
                      border: isInProgress ? `1px solid ${LIGHT_BORDER}` : "none",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    {isInProgress ? "Continue" : "Start"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dismiss link */}
      <div style={{ padding: "8px 20px 14px", textAlign: "center" }}>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            color: MUTED,
            fontSize: 10,
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
          onMouseEnter={e => e.currentTarget.style.color = OFF_WHITE}
          onMouseLeave={e => e.currentTarget.style.color = MUTED}
        >
          Dismiss setup guide
        </button>
      </div>
    </div>
  );
}
