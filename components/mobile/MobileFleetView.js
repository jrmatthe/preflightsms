import { useState } from "react";

const BLACK = "#000000";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const CYAN = "#22D3EE";

const cardStyle = { background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` };

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: `${CYAN}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2L16 11l3.5-3.5C20.3 6.7 21 5.1 21 4.5c0-1-.5-1.5-1.5-1.5-.6 0-2.2.7-3 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.3 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
        </svg>
      </div>
      <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No Aircraft</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>Your fleet will appear here once aircraft are added from the desktop app.</div>
    </div>
  );
}

function AircraftCard({ aircraft }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button onClick={() => setExpanded(!expanded)} style={{
      ...cardStyle, padding: 16, width: "100%", textAlign: "left", cursor: "pointer",
      fontFamily: "inherit", display: "block", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: WHITE, letterSpacing: 0.5 }}>
            {aircraft.registration || "N/A"}
          </div>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>
            {aircraft.type || "Unknown Type"}
            {aircraft.base_location ? ` \u00B7 ${aircraft.base_location}` : ""}
          </div>
        </div>
        <div style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: `${GREEN}16`, color: GREEN, border: `1px solid ${GREEN}30`,
        }}>Active</div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {aircraft.serial_number && (
              <div>
                <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Serial Number</div>
                <div style={{ fontSize: 14, color: OFF_WHITE }}>{aircraft.serial_number}</div>
              </div>
            )}
            {aircraft.year && (
              <div>
                <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Year</div>
                <div style={{ fontSize: 14, color: OFF_WHITE }}>{aircraft.year}</div>
              </div>
            )}
            {aircraft.max_passengers != null && (
              <div>
                <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Max Passengers</div>
                <div style={{ fontSize: 14, color: OFF_WHITE }}>{aircraft.max_passengers}</div>
              </div>
            )}
            {aircraft.base_location && (
              <div>
                <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Base</div>
                <div style={{ fontSize: 14, color: OFF_WHITE }}>{aircraft.base_location}</div>
              </div>
            )}
          </div>
          {aircraft.notes && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Notes</div>
              <div style={{ fontSize: 14, color: OFF_WHITE, lineHeight: 1.5 }}>{aircraft.notes}</div>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export default function MobileFleetView({ fleetAircraft }) {
  const aircraft = fleetAircraft || [];

  if (aircraft.length === 0) return <EmptyState />;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>
        {aircraft.length} aircraft in fleet
      </div>
      {aircraft.map(a => <AircraftCard key={a.id} aircraft={a} />)}
    </div>
  );
}
