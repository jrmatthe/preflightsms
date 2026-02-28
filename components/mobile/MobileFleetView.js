import { useState } from "react";

const BLACK = "#000000";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const CYAN = "#22D3EE";
const AMBER = "#F59E0B";

const cardStyle = { background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` };
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14, color: WHITE,
  background: BLACK, border: `1px solid ${BORDER}`, fontFamily: "inherit", boxSizing: "border-box",
};

function timeAgo(ts) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function SkeletonLoader() {
  return (
    <div style={{ padding: 16 }} aria-label="Loading fleet data">
      <style>{`@keyframes fleetPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ ...cardStyle, padding: 16, marginBottom: 10, animation: "fleetPulse 1.5s ease-in-out infinite" }}>
          <div style={{ height: 20, width: "40%", background: BORDER, borderRadius: 6, marginBottom: 8 }} />
          <div style={{ height: 14, width: "60%", background: BORDER, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

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

function AircraftCard({ aircraft, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLocation, setEditLocation] = useState(aircraft.last_location || "");
  const [editParking, setEditParking] = useState(aircraft.parking_spot || "");
  const [editFuel, setEditFuel] = useState(aircraft.fuel_remaining || "");
  const [editFuelUnit, setEditFuelUnit] = useState(aircraft.fuel_unit || "lbs");
  const [saving, setSaving] = useState(false);

  const hasStatus = aircraft.last_location || aircraft.parking_spot || aircraft.fuel_remaining;

  const handleSave = async () => {
    if (!onUpdateStatus) return;
    setSaving(true);
    await onUpdateStatus(aircraft.id, {
      last_location: editLocation.trim(),
      parking_spot: editParking.trim(),
      fuel_remaining: editFuel.trim(),
      fuel_unit: editFuelUnit,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setEditLocation(aircraft.last_location || "");
    setEditParking(aircraft.parking_spot || "");
    setEditFuel(aircraft.fuel_remaining || "");
    setEditFuelUnit(aircraft.fuel_unit || "lbs");
    setEditing(true);
    if (!expanded) setExpanded(true);
  };

  return (
    <div style={{ ...cardStyle, marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => { if (!editing) setExpanded(!expanded); }}
        aria-expanded={expanded}
        aria-label={`${aircraft.registration || "N/A"}, ${aircraft.type || "Unknown Type"}`}
        style={{
          padding: 16, width: "100%", textAlign: "left", cursor: "pointer",
          fontFamily: "inherit", display: "block", background: "none", border: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: WHITE, letterSpacing: 0.5 }}>
              {aircraft.registration || "N/A"}
            </div>
            <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>
              {aircraft.type || "Unknown Type"}
              {aircraft.base_location ? ` \u00B7 ${aircraft.base_location}` : ""}
            </div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: `${GREEN}16`, color: GREEN, border: `1px solid ${GREEN}30`,
          }}>Active</div>
        </div>

        {/* Status summary row - always visible */}
        {hasStatus && !expanded && (
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {aircraft.last_location && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontSize: 13, color: OFF_WHITE }}>{aircraft.last_location}{aircraft.parking_spot ? ` / ${aircraft.parking_spot}` : ""}</span>
              </div>
            )}
            {aircraft.fuel_remaining && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V8l4-4 4 4v14"/><path d="M15 22V13l3-2 3 2v9"/><line x1="3" y1="14" x2="11" y2="14"/></svg>
                <span style={{ fontSize: 13, color: OFF_WHITE }}>{aircraft.fuel_remaining} {(aircraft.fuel_unit || "lbs").toUpperCase()}</span>
              </div>
            )}
            {aircraft.status_updated_at && (
              <span style={{ fontSize: 12, color: MUTED }}>{timeAgo(aircraft.status_updated_at)}</span>
            )}
          </div>
        )}
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BORDER}` }}>
          {/* Current status section */}
          <div style={{ paddingTop: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Current Status</div>
              {!editing && onUpdateStatus && (
                <button
                  onClick={handleStartEdit}
                  style={{
                    padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}30`,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >Edit</button>
              )}
            </div>

            {editing ? (
              <div onClick={e => e.stopPropagation()}>
                <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Location (Airport)</label>
                <input
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value.toUpperCase())}
                  placeholder="e.g. KSFF, KBOI"
                  style={{ ...inputStyle, marginBottom: 10 }}
                />

                <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Parking Spot</label>
                <input
                  value={editParking}
                  onChange={e => setEditParking(e.target.value)}
                  placeholder="e.g. A3, Ramp 2"
                  style={{ ...inputStyle, marginBottom: 10 }}
                />

                <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Fuel Remaining</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input
                    value={editFuel}
                    onChange={e => setEditFuel(e.target.value)}
                    placeholder="e.g. 150"
                    inputMode="decimal"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => setEditFuelUnit(u => u === "lbs" ? "gal" : u === "gal" ? "hrs" : "lbs")}
                    style={{
                      padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}30`,
                      cursor: "pointer", fontFamily: "inherit", minWidth: 50,
                    }}
                  >{editFuelUnit.toUpperCase()}</button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setEditing(false)}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                      background: "transparent", color: MUTED, border: `1px solid ${BORDER}`,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >Cancel</button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                      background: CYAN, color: BLACK, border: "none",
                      cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
                      opacity: saving ? 0.6 : 1,
                    }}
                  >{saving ? "Saving..." : "Save"}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Location</div>
                  <div style={{ fontSize: 14, color: aircraft.last_location ? OFF_WHITE : MUTED, fontStyle: aircraft.last_location ? "normal" : "italic" }}>
                    {aircraft.last_location || "No data"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Parking</div>
                  <div style={{ fontSize: 14, color: aircraft.parking_spot ? OFF_WHITE : MUTED, fontStyle: aircraft.parking_spot ? "normal" : "italic" }}>
                    {aircraft.parking_spot || "\u2014"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Fuel</div>
                  <div style={{ fontSize: 14, color: aircraft.fuel_remaining ? OFF_WHITE : MUTED, fontStyle: aircraft.fuel_remaining ? "normal" : "italic" }}>
                    {aircraft.fuel_remaining ? `${aircraft.fuel_remaining} ${(aircraft.fuel_unit || "lbs").toUpperCase()}` : "\u2014"}
                  </div>
                </div>
                {aircraft.status_updated_at && (
                  <div>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Updated</div>
                    <div style={{ fontSize: 14, color: MUTED }}>{timeAgo(aircraft.status_updated_at)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Aircraft details */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 10 }}>Aircraft Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {aircraft.serial_number && (
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Serial Number</div>
                  <div style={{ fontSize: 14, color: OFF_WHITE }}>{aircraft.serial_number}</div>
                </div>
              )}
              {aircraft.year && (
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Year</div>
                  <div style={{ fontSize: 14, color: OFF_WHITE }}>{aircraft.year}</div>
                </div>
              )}
              {aircraft.max_passengers != null && (
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Max Passengers</div>
                  <div style={{ fontSize: 14, color: OFF_WHITE }}>{aircraft.max_passengers}</div>
                </div>
              )}
              {aircraft.base_location && (
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Base</div>
                  <div style={{ fontSize: 14, color: OFF_WHITE }}>{aircraft.base_location}</div>
                </div>
              )}
            </div>
            {aircraft.notes && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Notes</div>
                <div style={{ fontSize: 14, color: OFF_WHITE, lineHeight: 1.5 }}>{aircraft.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobileFleetView({ fleetAircraft, onUpdateAircraftStatus }) {
  if (fleetAircraft === undefined || fleetAircraft === null) return <SkeletonLoader />;

  const aircraft = fleetAircraft || [];
  if (aircraft.length === 0) return <EmptyState />;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 14, color: MUTED, marginBottom: 12 }}>
        {aircraft.length} aircraft in fleet
      </div>
      {aircraft.map(a => <AircraftCard key={a.id} aircraft={a} onUpdateStatus={onUpdateAircraftStatus} />)}
    </div>
  );
}
