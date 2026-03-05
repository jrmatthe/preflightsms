export default function PostFlightNudge({ flight, onSubmitReport, onNothingToReport, onRemindLater, onDismiss }) {
  const route = [flight.departure, flight.destination].filter(Boolean).join(" → ");

  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div data-onboarding="ff-nudge" onClick={e => e.stopPropagation()} style={{ background: "#161616", border: "1px solid #232323", borderRadius: 12, padding: "32px 28px", maxWidth: 420, width: "100%", textAlign: "center" }}>
        {/* Header */}
        <div style={{ fontSize: 28, marginBottom: 4 }}>✈️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", marginBottom: 4 }}>Flight Complete</div>
        <div style={{ fontSize: 12, color: "#888888", marginBottom: 20, lineHeight: 1.5 }}>
          Nice work! Before you move on — anything worth noting for safety?
        </div>

        {/* Flight details card */}
        <div style={{ background: "#0A0A0A", border: "1px solid #2E2E2E", borderRadius: 8, padding: "12px 16px", marginBottom: 24, textAlign: "left" }}>
          {route && <div style={{ fontSize: 13, fontWeight: 600, color: "#D4D4D4", marginBottom: 4 }}>{route}</div>}
          <div style={{ fontSize: 11, color: "#888888" }}>
            {[flight.aircraft, flight.tailNumber].filter(Boolean).join(" · ") || flight.id}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onSubmitReport} style={{ width: "100%", padding: "13px 0", background: "#FFFFFF", color: "#000000", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Submit a Safety Report
          </button>
          <button onClick={onNothingToReport} style={{ width: "100%", padding: "12px 0", background: "transparent", color: "#4ADE80", border: "1px solid #4ADE8044", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Nothing to Report — All Good
          </button>
          <button onClick={onRemindLater} style={{ width: "100%", padding: "10px 0", background: "transparent", color: "#888888", border: "none", fontSize: 11, cursor: "pointer" }}>
            Remind Me Later
          </button>
        </div>

        {/* Hint */}
        <div style={{ marginTop: 16, fontSize: 10, color: "#555555" }}>Click outside to skip</div>
      </div>
    </div>
  );
}
