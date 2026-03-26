export default function PostFlightNudge({ flight, suggestion, onSubmitReport, onNothingToReport, onRemindLater, onDismiss }) {
  const route = [flight.departure, flight.destination].filter(Boolean).join(" → ");

  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div data-onboarding="ff-nudge" onClick={e => e.stopPropagation()} style={{ background: "#0e1118", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: "32px 28px", maxWidth: 420, width: "100%", textAlign: "center" }}>
        {/* Header */}
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 4 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", marginBottom: 4 }}>Flight Complete</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: suggestion ? 8 : 20, lineHeight: 1.5 }}>
          Nice work! Before you move on — anything worth noting for safety?
        </div>
        {suggestion && (
          <div style={{ fontSize: 12, color: "#22D3EE", marginBottom: 20, lineHeight: 1.5, fontStyle: "italic" }}>
            {suggestion}
          </div>
        )}

        {/* Flight details card */}
        <div style={{ background: "#050508", border: "1px solid #2E2E2E", borderRadius: 8, padding: "12px 16px", marginBottom: 24, textAlign: "left" }}>
          {route && <div style={{ fontSize: 13, fontWeight: 600, color: "#D4D4D4", marginBottom: 4 }}>{route}</div>}
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            {[flight.aircraft, flight.tailNumber].filter(Boolean).join(" · ") || flight.id}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onSubmitReport} style={{ width: "100%", padding: "13px 0", background: "#FFFFFF", color: "#050508", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Submit a Safety Report
          </button>
          <button onClick={onNothingToReport} style={{ width: "100%", padding: "12px 0", background: "transparent", color: "#4ADE80", border: "1px solid #4ADE8044", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Nothing to Report — All Good
          </button>
          <button onClick={onRemindLater} style={{ width: "100%", padding: "10px 0", background: "transparent", color: "rgba(255,255,255,0.35)", border: "none", fontSize: 11, cursor: "pointer" }}>
            Remind Me Later
          </button>
        </div>

        {/* Hint */}
        <div style={{ marginTop: 16, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Click outside to skip</div>
      </div>
    </div>
  );
}
