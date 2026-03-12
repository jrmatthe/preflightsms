import { useState, useMemo } from "react";
import { getActiveMelItems, getMelExpirationStatus, generateMelId, calculateExpiration, CATEGORY_LIMITS } from "../../lib/melHelpers";

const BLACK = "#000000";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const CYAN = "#22D3EE";
const AMBER = "#F59E0B";
const RED = "#EF4444";

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

function getLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill={CYAN} stroke="none">
          <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>
        </svg>
      </div>
      <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No Aircraft</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>Your fleet will appear here once aircraft are added from the desktop app.</div>
    </div>
  );
}

function AircraftCard({ aircraft, onUpdateStatus, onUpdateMel }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLocation, setEditLocation] = useState(aircraft.last_location || "");
  const [editParking, setEditParking] = useState(aircraft.parking_spot || "");
  const [editFuel, setEditFuel] = useState(aircraft.fuel_remaining || "");
  const [editFuelUnit, setEditFuelUnit] = useState(aircraft.fuel_unit || "lbs");
  const [editCustomFields, setEditCustomFields] = useState(aircraft.status_field_values || {});
  const [saving, setSaving] = useState(false);
  const [melFormOpen, setMelFormOpen] = useState(false);
  const [showClosedMel, setShowClosedMel] = useState(false);

  const hasStatus = aircraft.last_location || aircraft.parking_spot || aircraft.fuel_remaining;
  const customDefs = aircraft.status_field_defs || [];
  const activeMel = useMemo(() => getActiveMelItems(aircraft.mel_items), [aircraft.mel_items]);
  const closedMel = useMemo(() => (aircraft.mel_items || []).filter(m => m.status !== "open"), [aircraft.mel_items]);
  const hasExpiredMel = activeMel.some(m => getMelExpirationStatus(m) === "expired");
  const hasWarningMel = activeMel.some(m => getMelExpirationStatus(m) === "warning");
  const melBadgeColor = hasExpiredMel ? RED : hasWarningMel ? AMBER : CYAN;

  const handleSave = async () => {
    if (!onUpdateStatus) return;
    setSaving(true);
    const update = {
      last_location: editLocation.trim(),
      parking_spot: editParking.trim(),
      fuel_remaining: editFuel.trim(),
      fuel_unit: editFuelUnit,
    };
    const filled = Object.entries(editCustomFields).filter(([,v]) => v?.trim());
    if (filled.length > 0) update.status_field_values = Object.fromEntries(filled);
    else if (customDefs.length > 0) update.status_field_values = {};
    await onUpdateStatus(aircraft.id, update);
    setSaving(false);
    setEditing(false);
  };

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setEditLocation(aircraft.last_location || "");
    setEditParking(aircraft.parking_spot || "");
    setEditFuel(aircraft.fuel_remaining || "");
    setEditFuelUnit(aircraft.fuel_unit || "lbs");
    setEditCustomFields(aircraft.status_field_values || {});
    setEditing(true);
    if (!expanded) setExpanded(true);
  };

  const handleAddMel = async (formData) => {
    if (!onUpdateMel) return;
    const items = [...(aircraft.mel_items || []), {
      id: generateMelId(),
      ...formData,
      status: "open",
      closed_date: null,
    }];
    await onUpdateMel(aircraft.id, items);
    setMelFormOpen(false);
  };

  const handleCloseMel = async (item) => {
    if (!onUpdateMel) return;
    const items = (aircraft.mel_items || []).map(m =>
      m.id === item.id ? { ...m, status: "closed", closed_date: getLocalDate() } : m
    );
    await onUpdateMel(aircraft.id, items);
  };

  return (
    <div style={{ ...cardStyle, marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => { if (!editing && !melFormOpen) setExpanded(!expanded); }}
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {activeMel.length > 0 && (
              <div style={{
                padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: `${melBadgeColor}16`, color: melBadgeColor, border: `1px solid ${melBadgeColor}30`,
              }}>{activeMel.length} MEL</div>
            )}
            <div style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: `${GREEN}16`, color: GREEN, border: `1px solid ${GREEN}30`,
            }}>Active</div>
          </div>
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
            {customDefs.map(fd => { const v = aircraft.status_field_values?.[fd.name]; return v ? (
              <div key={fd.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, color: MUTED }}>{fd.name}:</span>
                <span style={{ fontSize: 13, color: OFF_WHITE }}>{v}</span>
              </div>
            ) : null; })}
            {aircraft.status_updated_at && (
              <span style={{ fontSize: 12, color: MUTED }}>{timeAgo(aircraft.status_updated_at)}</span>
            )}
          </div>
        )}
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BORDER}` }}>
          {/* MEL Deferrals section */}
          {(activeMel.length > 0 || onUpdateMel) && (
            <div style={{ paddingTop: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>MEL Deferrals</span>
                  {activeMel.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${AMBER}18`, color: AMBER }}>{activeMel.length}</span>
                  )}
                </div>
                {onUpdateMel && !melFormOpen && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMelFormOpen(true); }}
                    style={{
                      padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}30`,
                      cursor: "pointer", fontFamily: "inherit", minHeight: 44, minWidth: 44,
                    }}
                  >+ MEL</button>
                )}
              </div>

              {activeMel.length === 0 && !melFormOpen && (
                <div style={{ fontSize: 13, color: MUTED, fontStyle: "italic" }}>No active MEL deferrals</div>
              )}

              {activeMel.map(item => {
                const expStatus = getMelExpirationStatus(item);
                const expColor = expStatus === "expired" ? RED : expStatus === "warning" ? AMBER : GREEN;
                return (
                  <div key={item.id} style={{ padding: "10px 12px", marginBottom: 6, background: BLACK, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: `${CYAN}18`, color: CYAN }}>Cat {item.category}</span>
                      {item.mel_reference && <span style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 600 }}>Ref {item.mel_reference}</span>}
                      {item.expiration_date && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: `${expColor}18`, color: expColor }}>
                          {expStatus === "expired" ? "EXPIRED" : expStatus === "warning" ? "EXPIRING" : `Exp ${item.expiration_date}`}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: WHITE, marginBottom: 2 }}>{item.description}</div>
                    {item.notes && <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>{item.notes}</div>}
                    {onUpdateMel && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCloseMel(item); }}
                        style={{
                          marginTop: 6, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: `${GREEN}12`, color: GREEN, border: `1px solid ${GREEN}30`,
                          cursor: "pointer", fontFamily: "inherit", minHeight: 44,
                        }}
                      >Close MEL</button>
                    )}
                  </div>
                );
              })}

              {melFormOpen && (
                <MobileMelForm onSave={handleAddMel} onCancel={() => setMelFormOpen(false)} />
              )}

              {closedMel.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowClosedMel(!showClosedMel); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: MUTED, fontWeight: 600, padding: "8px 0", fontFamily: "inherit", minHeight: 44 }}
                  >
                    {showClosedMel ? "\u25BC" : "\u25B6"} {closedMel.length} closed
                  </button>
                  {showClosedMel && closedMel.map(item => (
                    <div key={item.id} style={{ padding: "8px 12px", marginBottom: 4, background: `${BLACK}88`, borderRadius: 8, border: `1px solid ${BORDER}`, opacity: 0.7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: `${CYAN}18`, color: CYAN }}>Cat {item.category}</span>
                        <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>CLOSED {item.closed_date || ""}</span>
                      </div>
                      <div style={{ fontSize: 13, color: MUTED }}>{item.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current status section */}
          <div style={{ paddingTop: activeMel.length > 0 || onUpdateMel ? 0 : 14, marginBottom: 14, borderTop: activeMel.length > 0 || onUpdateMel ? `1px solid ${BORDER}` : "none", paddingTop: 14 }}>
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

                {customDefs.map(fd => (
                  <div key={fd.name} style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>{fd.name}</label>
                    <input
                      value={editCustomFields[fd.name] || ""}
                      onChange={e => setEditCustomFields(prev => ({ ...prev, [fd.name]: e.target.value }))}
                      placeholder={`e.g. ${fd.name}`}
                      style={{ ...inputStyle }}
                    />
                  </div>
                ))}

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
                {customDefs.map(fd => (
                  <div key={fd.name}>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{fd.name}</div>
                    <div style={{ fontSize: 14, color: aircraft.status_field_values?.[fd.name] ? OFF_WHITE : MUTED, fontStyle: aircraft.status_field_values?.[fd.name] ? "normal" : "italic" }}>
                      {aircraft.status_field_values?.[fd.name] || "\u2014"}
                    </div>
                  </div>
                ))}
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

function MobileMelForm({ onSave, onCancel }) {
  const [description, setDescription] = useState("");
  const [melRef, setMelRef] = useState("");
  const [category, setCategory] = useState("C");
  const [deferredDate, setDeferredDate] = useState(getLocalDate());
  const [notes, setNotes] = useState("");

  const expiration = calculateExpiration(category, deferredDate);
  const canSave = description.trim().length > 0;

  return (
    <div onClick={e => e.stopPropagation()} style={{ padding: 14, background: BLACK, borderRadius: 10, border: `1px solid ${CYAN}30`, marginBottom: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 10 }}>Add MEL Deferral</div>

      <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Description *</label>
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Weather radar inoperative" style={{ ...inputStyle, marginBottom: 10 }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>MEL Ref</label>
          <input value={melRef} onChange={e => setMelRef(e.target.value)} placeholder="e.g. 34-1" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            {Object.keys(CATEGORY_LIMITS).map(c => <option key={c} value={c}>{c} — {CATEGORY_LIMITS[c].days ? `${CATEGORY_LIMITS[c].days}d` : "Specified"}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Deferred Date</label>
          <input type="date" value={deferredDate} onChange={e => setDeferredDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Expires</label>
          <div style={{ ...inputStyle, display: "flex", alignItems: "center", color: expiration ? OFF_WHITE : MUTED }}>
            {expiration || "N/A"}
          </div>
        </div>
      </div>

      <label style={{ display: "block", fontSize: 13, color: OFF_WHITE, marginBottom: 4 }}>Notes</label>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" style={{ ...inputStyle, marginBottom: 12 }} />

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>Cancel</button>
        <button onClick={() => { if (canSave) onSave({ description: description.trim(), mel_reference: melRef.trim(), category, deferred_date: deferredDate, expiration_date: expiration || "", notes: notes.trim() }); }} disabled={!canSave} style={{ flex: 1, padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: canSave ? GREEN : `${GREEN}44`, color: BLACK, border: "none", cursor: canSave ? "pointer" : "not-allowed", fontFamily: "inherit", minHeight: 44 }}>Add MEL</button>
      </div>
    </div>
  );
}

export default function MobileFleetView({ fleetAircraft, onUpdateAircraftStatus, onUpdateMel }) {
  if (fleetAircraft === undefined || fleetAircraft === null) return <SkeletonLoader />;

  const aircraft = fleetAircraft || [];
  if (aircraft.length === 0) return <EmptyState />;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 14, color: MUTED, marginBottom: 12 }}>
        {aircraft.length} aircraft in fleet
      </div>
      {aircraft.map(a => <AircraftCard key={a.id} aircraft={a} onUpdateStatus={onUpdateAircraftStatus} onUpdateMel={onUpdateMel} />)}
    </div>
  );
}
