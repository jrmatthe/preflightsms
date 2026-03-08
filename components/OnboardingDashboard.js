import { useState } from "react";
import { ONBOARDING_FLOWS, FLOW_ORDER } from "../lib/onboardingFlows";

const CARD = "#222222", BORDER = "#2E2E2E", LIGHT_BORDER = "#3A3A3A";
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
          padding: "12px 18px",
          background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(74,222,128,0.06) 100%)",
          border: "1px solid rgba(34,211,238,0.15)",
          borderRadius: 10,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(34,211,238,0.3)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(34,211,238,0.15)"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>
            Continue setting up your SMS — {pct}% complete
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(34,211,238,0.04) 0%, rgba(74,222,128,0.04) 100%)",
      border: "1px solid rgba(34,211,238,0.15)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(74,222,128,0.15) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: WHITE, letterSpacing: "-0.02em" }}>
              Getting Started: set up your SMS
            </div>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: "4px", marginTop: 2 }}
          onMouseEnter={e => e.currentTarget.style.color = OFF_WHITE}
          onMouseLeave={e => e.currentTarget.style.color = MUTED}
          title="Minimize"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "10px 18px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Progress</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: completedCount > 0 ? GREEN : MUTED }}>{completedCount} / {totalCount}</span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            width: `${Math.max(pct, 2)}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${CYAN}, ${GREEN})`,
            borderRadius: 3,
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* Flow list */}
      <div style={{ padding: "8px 18px 6px" }}>
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
              padding: "8px 12px",
              marginBottom: 5,
              background: isComplete ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${isComplete ? "rgba(74,222,128,0.12)" : BORDER}`,
              borderRadius: 10,
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Step number / status icon */}
                {isComplete ? (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "rgba(74,222,128,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: isInProgress ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.05)",
                    border: isInProgress ? "none" : `1px solid ${BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    color: isInProgress ? CYAN : MUTED,
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {index + 1}
                  </div>
                )}
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: isComplete ? MUTED : WHITE,
                    textDecoration: isComplete ? "line-through" : "none",
                    textDecorationColor: "rgba(119,119,119,0.4)",
                  }}>
                    Step {index + 1}: {flow.title}
                  </div>
                </div>
              </div>
              <div style={{ flexShrink: 0, marginLeft: 16 }}>
                {isComplete ? (
                  <span style={{ fontSize: 10, color: GREEN, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Done</span>
                ) : (
                  <button
                    onClick={() => onStartFlow(id)}
                    style={{
                      padding: "8px 20px",
                      background: isInProgress ? "transparent" : `linear-gradient(135deg, ${CYAN}, ${GREEN})`,
                      color: isInProgress ? CYAN : "#000000",
                      border: isInProgress ? `1px solid rgba(34,211,238,0.3)` : "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
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
          margin: "4px 18px 10px",
          padding: "16px 20px",
          background: "rgba(245,158,11,0.04)",
          border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: AMBER }}>Sandbox Mode</span>
          </div>
          <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.5, marginBottom: 12 }}>
            Go ahead — fill your system with dummy data to explore every feature.
            When you're ready to go live, one-click delete everything and start fresh while you're still in trial.
          </div>
          <button
            onClick={onStartFresh}
            style={{
              padding: "8px 20px",
              background: "transparent",
              color: AMBER,
              border: `1px solid rgba(245,158,11,0.3)`,
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"; }}
          >
            Start Fresh — Delete All Data
          </button>
        </div>
      )}

      {/* Dismiss link */}
      <div style={{ padding: "4px 18px 12px", textAlign: "center" }}>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            color: MUTED,
            fontSize: 10,
            cursor: "pointer",
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
