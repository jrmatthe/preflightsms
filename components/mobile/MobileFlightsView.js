import { useState, useMemo, useCallback, useRef, useEffect } from "react";

const BLACK = "#000000";
const DARK = "#111111";
const CARD = "#161616";
const BORDER = "#232323";
const LIGHT_BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

function parseETE(ete) {
  if (!ete) return 0;
  const s = ete.trim();
  if (s.includes(":") || s.includes("+")) {
    const parts = s.split(/[:\+]/);
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (n < 10) return Math.round(n * 60);
  if (n < 100) return Math.round(n);
  return Math.floor(n / 100) * 60 + (n % 100);
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

const STATUS_COLORS = {
  OVERDUE: RED,
  ACTIVE: GREEN,
  DEPARTED: CYAN,
  PENDING_APPROVAL: YELLOW,
  ARRIVED: MUTED,
  CANCELLED: MUTED,
};

const STATUS_LABELS = {
  OVERDUE: "OVERDUE",
  ACTIVE: "ENROUTE",
  DEPARTED: "DEPARTED",
  PENDING_APPROVAL: "AWAITING APPROVAL",
  ARRIVED: "ARRIVED",
  CANCELLED: "CANCELLED",
};

// ── Skeleton loader ──
function SkeletonCard() {
  return (
    <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 140, height: 22, background: BORDER, borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: 70, height: 22, background: BORDER, borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ width: 80, height: 16, background: BORDER, borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: 60, height: 16, background: BORDER, borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

// ── Empty state ──
function EmptyState({ onNewFrat }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
      <svg width={56} height={56} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16, opacity: 0.4 }}>
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill={MUTED}/>
      </svg>
      <div style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No active flights</div>
      <div style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>Start a FRAT to create one</div>
      <button onClick={onNewFrat} style={{
        padding: "12px 28px", background: CYAN, color: BLACK, border: "none", borderRadius: 8,
        fontSize: 15, fontWeight: 700, cursor: "pointer",
      }}>
        New FRAT
      </button>
    </div>
  );
}

// ── Arrival bottom sheet ──
function ArrivalSheet({ flight, onConfirm, onCancel, aircraftDefs }) {
  const [parkingSpot, setParkingSpot] = useState("");
  const [fuelRemaining, setFuelRemaining] = useState("");
  const [fuelUnit, setFuelUnit] = useState("lbs");
  const [customFieldValues, setCustomFieldValues] = useState({});
  const sheetRef = useRef(null);
  const touchStartY = useRef(null);
  const translateY = useRef(0);

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      translateY.current = dy;
      if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const onTouchEnd = () => {
    if (translateY.current > 100) { onCancel(); }
    else if (sheetRef.current) { sheetRef.current.style.transform = "translateY(0)"; sheetRef.current.style.transition = "transform 0.2s ease-out"; setTimeout(() => { if (sheetRef.current) sheetRef.current.style.transition = ""; }, 200); }
    touchStartY.current = null;
    translateY.current = 0;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <style>{`
        @keyframes arrBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes arrSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
      <div onClick={onCancel} aria-hidden="true" style={{ flex: 1, background: "rgba(0,0,0,0.6)", animation: "arrBackdropIn 0.2s ease-out" }} />
      <div ref={sheetRef} role="dialog" aria-label="Mark flight arrived" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ background: CARD, borderTop: `1px solid ${BORDER}`, borderRadius: "16px 16px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))", animation: "arrSlideUp 0.25s ease-out" }}>
        <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Mark Arrived
        </div>
        <div style={{ color: MUTED, fontSize: 14, marginBottom: 16 }}>
          {flight.departure} → {flight.destination} · {flight.tailNumber || flight.aircraft}
        </div>

        <label style={{ display: "block", color: OFF_WHITE, fontSize: 14, marginBottom: 6 }}>Parking Spot</label>
        <input
          value={parkingSpot}
          onChange={e => setParkingSpot(e.target.value)}
          placeholder="e.g. A3, Ramp 2"
          style={{ ...inputStyle, marginBottom: 14 }}
        />

        <label style={{ display: "block", color: OFF_WHITE, fontSize: 14, marginBottom: 6 }}>Fuel Remaining</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={fuelRemaining}
            onChange={e => setFuelRemaining(e.target.value)}
            placeholder="Optional"
            inputMode="decimal"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => setFuelUnit(u => u === "lbs" ? "hrs" : "lbs")}
            style={{
              padding: "0 14px", background: BLACK, border: `1px solid ${BORDER}`, borderRadius: 8,
              color: OFF_WHITE, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {fuelUnit.toUpperCase()}
          </button>
        </div>

        {aircraftDefs?.length > 0 && aircraftDefs.map(fd => (
          <div key={fd.name} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: OFF_WHITE, fontSize: 14, marginBottom: 6 }}>{fd.name}</label>
            <input
              value={customFieldValues[fd.name] || ""}
              onChange={e => setCustomFieldValues(prev => ({ ...prev, [fd.name]: e.target.value }))}
              placeholder="Optional"
              style={{ ...inputStyle }}
            />
          </div>
        ))}

        <button
          onClick={() => {
            const result = {
              parkingSpot: parkingSpot.trim() || undefined,
              fuelRemaining: fuelRemaining.trim() || undefined,
              fuelUnit,
            };
            const filled = Object.entries(customFieldValues).filter(([,v]) => v?.trim());
            if (filled.length > 0) result.customFieldValues = Object.fromEntries(filled);
            onConfirm(result);
          }}
          style={{
            width: "100%", padding: "14px", background: CYAN, color: BLACK, border: "none",
            borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer",
          }}
        >
          Confirm Arrival
        </button>
      </div>
    </div>
  );
}

// ── Cancel confirmation sheet ──
function CancelSheet({ flight, onConfirm, onDismiss }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onDismiss} aria-hidden="true" style={{ flex: 1, background: "rgba(0,0,0,0.6)", animation: "arrBackdropIn 0.2s ease-out" }} />
      <div role="dialog" aria-label="Cancel flight" style={{ background: CARD, borderTop: `1px solid ${BORDER}`, borderRadius: "16px 16px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))", animation: "arrSlideUp 0.25s ease-out" }}>
        <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Cancel Flight
        </div>
        <div style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>
          {flight.departure} → {flight.destination} · {flight.tailNumber || flight.aircraft}
        </div>
        <div style={{ color: OFF_WHITE, fontSize: 14, marginBottom: 20 }}>
          This will cancel the flight and remove it from active tracking. This cannot be undone.
        </div>
        <button
          onClick={onConfirm}
          style={{
            width: "100%", padding: "14px", background: RED, color: WHITE, border: "none",
            borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 10,
          }}
        >
          Cancel Flight
        </button>
        <button
          onClick={onDismiss}
          style={{
            width: "100%", padding: "14px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`,
            borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

// ── Post-flight nudge toast ──
function PostFlightNudge({ flight, suggestion, onFileReport, onNothingToReport, onRemindLater, onDismiss }) {
  const route = flight ? [flight.departure, flight.destination].filter(Boolean).join(" → ") : "";
  return (
    <div style={{
      position: "fixed", bottom: "calc(68px + max(env(safe-area-inset-bottom, 0px), 20px))", left: 16, right: 16, zIndex: 1500,
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      animation: "nudgeSlideIn 0.3s ease-out",
    }}>
      <style>{`@keyframes nudgeSlideIn { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ color: WHITE, fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Flight Complete</div>
          {route && <div style={{ color: MUTED, fontSize: 13 }}>{route}</div>}
          <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Anything worth noting for safety?</div>
          {suggestion && (
            <div style={{ color: "#22D3EE", fontSize: 12, marginTop: 6, lineHeight: 1.4, fontStyle: "italic" }}>
              {suggestion}
            </div>
          )}
        </div>
        <button onClick={onDismiss} aria-label="Dismiss" style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 4, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -4, marginRight: -4 }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={onFileReport} style={{
          flex: 1, padding: "11px 0", background: WHITE, color: BLACK, border: "none",
          borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44,
        }}>
          File Report
        </button>
        <button onClick={onNothingToReport} style={{
          flex: 1, padding: "11px 0", background: "transparent", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.27)",
          borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 44,
        }}>
          All Good
        </button>
      </div>
      <button onClick={onRemindLater} style={{
        width: "100%", padding: "8px 0", background: "transparent", color: MUTED, border: "none",
        fontSize: 12, cursor: "pointer", minHeight: 40,
      }}>
        Remind Me Later
      </button>
    </div>
  );
}

// ── Flight Card ──
function FlightCard({ flight, isOverdue, expanded, onToggle, onSwipeArrive, onSwipeCancel, onDelete, isLive }) {
  const isPending = flight.approvalStatus === "pending" || flight.approvalStatus === "review";
  const isActive = flight.status === "ACTIVE" && !isPending;
  const isArrived = flight.status === "ARRIVED";

  let displayStatus, statusColor;
  if (isOverdue) {
    displayStatus = "OVERDUE";
    statusColor = RED;
  } else if (isPending) {
    displayStatus = "AWAITING APPROVAL";
    statusColor = YELLOW;
  } else if (isActive) {
    displayStatus = "ENROUTE";
    statusColor = GREEN;
  } else if (isArrived) {
    displayStatus = "ARRIVED";
    statusColor = GREEN;
  } else if (flight.status === "CANCELLED") {
    displayStatus = "CANCELLED";
    statusColor = MUTED;
  } else {
    displayStatus = flight.status;
    statusColor = MUTED;
  }

  // Swipe state: positive = swiped left (arrive), negative = swiped right (cancel)
  const touchStartX = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const canArrive = isActive && !isPending;
  const canCancel = flight.status === "ACTIVE";

  const handleTouchStart = (e) => {
    if (!canArrive && !canCancel) return;
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    if (touchStartX.current == null) return;
    const diff = touchStartX.current - e.touches[0].clientX;
    if (diff > 0 && canArrive) setSwipeOffset(Math.min(diff, 100));
    else if (diff < 0 && canCancel) setSwipeOffset(Math.max(diff, -100));
    else setSwipeOffset(0);
  };
  const handleTouchEnd = () => {
    if (swipeOffset > 60) onSwipeArrive(flight);
    else if (swipeOffset < -60) onSwipeCancel(flight);
    setSwipeOffset(0);
    touchStartX.current = null;
  };

  // Progress for active flights — always based on ETD, not submission/approval time
  const progress = useMemo(() => {
    if (isArrived) return 100;
    if (isPending || !flight.eta) return -1;
    const now = Date.now();
    const end = new Date(flight.eta).getTime();
    const eteMins = parseETE(flight.ete);
    // Derive ETD from date + etd fields (preferred), or fall back to ETA - ETE
    let start = null;
    if (flight.date && flight.etd) {
      const t = (flight.etd || "").replace(/[^0-9]/g, "").padStart(4, "0");
      const d = new Date(`${flight.date}T${t.slice(0, 2)}:${t.slice(2, 4)}:00`);
      if (!isNaN(d.getTime())) start = d.getTime();
    }
    if (start == null && eteMins > 0) start = end - eteMins * 60000;
    if (start == null || isNaN(start) || end <= start) return 0;
    return Math.max(0, Math.min(((now - start) / (end - start)) * 100, 95));
  }, [flight, isArrived, isPending]);

  const borderColor = isOverdue ? `${RED}66` : isPending ? `${YELLOW}44` : BORDER;

  return (
    <div
      style={{ position: "relative", overflow: "hidden", marginBottom: 12, borderRadius: 12 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe reveal: arrive action (swipe left) */}
      {canArrive && swipeOffset > 0 && (
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 100,
          background: CYAN, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "0 12px 12px 0",
        }}>
          <div style={{ color: BLACK, fontSize: 14, fontWeight: 700, textAlign: "center" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div>Arrive</div>
          </div>
        </div>
      )}

      {/* Swipe reveal: cancel action (swipe right) */}
      {canCancel && swipeOffset < 0 && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 100,
          background: RED, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "12px 0 0 12px",
        }}>
          <div style={{ color: WHITE, fontSize: 14, fontWeight: 700, textAlign: "center" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <div>Cancel</div>
          </div>
        </div>
      )}

      <div
        onClick={onToggle}
        role="button"
        aria-expanded={expanded}
        aria-label={`Flight ${flight.departure || "????"} to ${flight.destination || "????"}, ${displayStatus}`}
        style={{
          ...cardStyle,
          padding: 16, border: `1px solid ${borderColor}`, cursor: "pointer",
          transform: `translateX(${-swipeOffset}px)`,
          transition: swipeOffset === 0 ? "transform 0.2s ease" : "none",
          position: "relative", zIndex: 1,
        }}
      >
        {/* Top: Tail + Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: WHITE, fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}>{flight.tailNumber || flight.aircraft}</span>
              {isLive && <span style={{ fontSize: 9, fontWeight: 700, color: GREEN, background: "rgba(74,222,128,0.09)", padding: "2px 6px", borderRadius: 3, border: `1px solid ${GREEN}33` }}>LIVE ADS-B</span>}
              {(isActive || isPending) && flight.tailNumber && (
                <a href={`https://flightaware.com/live/flight/${flight.tailNumber}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 9, fontWeight: 700, color: "#00AAFF", background: "rgba(0,170,255,0.09)", padding: "2px 6px", borderRadius: 3, border: "1px solid rgba(0,170,255,0.2)", textDecoration: "none" }}>Track on FlightAware</a>
              )}
            </div>
            <div style={{ color: MUTED, fontSize: 14, marginTop: 2 }}>
              {flight.departure || "????"} → {flight.destination || "????"}{flight.tailNumber && flight.aircraft ? ` · ${flight.aircraft}` : ""}{flight.pilot ? ` · ${flight.pilot}` : ""}
            </div>
          </div>
          <span style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 10,
            background: `${statusColor}18`, color: statusColor,
            fontSize: 14, fontWeight: 700, letterSpacing: "0.03em", whiteSpace: "nowrap",
            border: `1px solid ${statusColor}33`,
          }}>
            {displayStatus}
          </span>
        </div>

        {/* Progress bar for active flights */}
        {isActive && progress >= 0 && (
          <div style={{ height: 3, background: BORDER, borderRadius: 2, marginBottom: 8, position: "relative" }}>
            <div style={{ height: "100%", width: `${Math.max(progress, 2)}%`, background: isOverdue ? RED : GREEN, borderRadius: 2, transition: "width 2s linear" }} />
          </div>
        )}

        {/* Time info */}
        <div style={{ display: "flex", gap: 16, color: MUTED, fontSize: 14 }}>
          {flight.etd && <span>ETD {flight.etd}</span>}
          {flight.eta && <span>ETA {formatTime(flight.eta)}</span>}
          {isArrived && flight.arrivedAt && <span>Arrived {formatTime(flight.arrivedAt)}</span>}
        </div>

        {/* Swipe hint for active flights */}
        {(canArrive || canCancel) && !expanded && (
          <div style={{ color: MUTED, fontSize: 14, marginTop: 6, opacity: 0.5 }}>
            {canArrive ? "\u2190 Arrive" : ""}{canArrive && canCancel ? "  \u00B7  " : ""}{canCancel ? "Cancel \u2192" : ""}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${LIGHT_BORDER}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {flight.numCrew && <DetailRow label="Crew" value={flight.numCrew} />}
              {flight.numPax && <DetailRow label="Passengers" value={flight.numPax} />}
              {flight.fuelLbs && <DetailRow label="Fuel" value={`${flight.fuelLbs} ${(flight.fuelUnit || "lbs").toUpperCase()}`} />}
              {flight.cruiseAlt && <DetailRow label="Altitude" value={flight.cruiseAlt} />}
              {flight.score != null && <DetailRow label="Risk Score" value={flight.score} />}
              {flight.riskLevel && <DetailRow label="Risk Level" value={flight.riskLevel} />}
            </div>
            {flight.parkingSpot && (
              <div style={{ marginTop: 8 }}>
                <DetailRow label="Parking" value={flight.parkingSpot} />
              </div>
            )}
            {flight.fuelRemaining && (
              <div style={{ marginTop: 4 }}>
                <DetailRow label="Fuel Remaining" value={`${flight.fuelRemaining} ${(flight.fuelUnit || "lbs").toUpperCase()}`} />
              </div>
            )}
            {canArrive && (
              <button
                onClick={(e) => { e.stopPropagation(); onSwipeArrive(flight); }}
                style={{
                  width: "100%", marginTop: 12, padding: "12px", background: CYAN, color: BLACK,
                  border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}
              >
                Mark Arrived
              </button>
            )}
            {canCancel && (
              <button
                onClick={(e) => { e.stopPropagation(); onSwipeCancel(flight); }}
                style={{
                  width: "100%", marginTop: 8, padding: "12px", background: "transparent", color: RED,
                  border: `1px solid ${RED}44`, borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}
              >
                Cancel Flight
              </button>
            )}
            {flight.status === "CANCELLED" && onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete flight ${flight.id}? This cannot be undone.`)) onDelete(flight); }}
                style={{
                  width: "100%", marginTop: 8, padding: "12px", background: "transparent", color: RED,
                  border: `1px solid ${RED}44`, borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}
              >
                Delete Flight
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div style={{ color: MUTED, fontSize: 14, marginBottom: 1 }}>{label}</div>
      <div style={{ color: OFF_WHITE, fontSize: 14 }}>{value}</div>
    </div>
  );
}

// ── Main component ──
export default function MobileFlightsView({
  flights, profile, onUpdateFlight, onDeleteFlight, onNewFrat, onNavigateToReports,
  onNudgeSubmitReport, onNudgeNothingToReport, onNudgeRemindLater, onNudgeDismiss, nudgeFlight, nudgeSuggestion, loading, fleetAircraft,
  adsbEnabled, session,
  myTodayFlights, onSelectTodayFlight,
  canSeeAllFlights, myScheduledFlights,
}) {
  const [flightsMode, setFlightsMode] = useState("my");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [arrivalFlight, setArrivalFlight] = useState(null);
  const [cancelFlight, setCancelFlight] = useState(null);
  const [showNudge, setShowNudge] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

  // Live ADS-B positions
  const [livePositions, setLivePositions] = useState({});
  useEffect(() => {
    if (!adsbEnabled || !session?.access_token) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/flight-positions", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok || cancelled || data.feature_disabled || !data.positions) return;
        const map = {};
        for (const p of data.positions) map[p.flight_id] = { ...p, receivedAt: Date.now() };
        if (!cancelled) setLivePositions(map);
      } catch (err) { /* silent */ }
    };
    poll();
    const iv = setInterval(poll, 12000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [adsbEnabled, session?.access_token]);

  // Pull-to-refresh
  const touchStartY = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const onRefreshStart = useRef(null);

  const handlePullStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };
  const handlePullMove = (e) => {
    if (touchStartY.current == null) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.4, 60));
      if (diff > 20) e.preventDefault();
    }
  };
  const handlePullEnd = async () => {
    if (pullDistance > 40 && onRefreshStart.current) {
      setRefreshing(true);
      try { await onRefreshStart.current(); } catch {}
      setRefreshing(false);
    }
    setPullDistance(0);
    touchStartY.current = null;
  };

  // Show nudge when nudgeFlight is set
  useEffect(() => {
    if (nudgeFlight) setShowNudge(true);
  }, [nudgeFlight]);

  const now = Date.now();

  const isOverdue = useCallback((f) => {
    if (f.status !== "ACTIVE" || f.approvalStatus === "pending" || f.approvalStatus === "review" || !f.eta) return false;
    if (f.approvedAt) {
      const eteMins = parseETE(f.ete);
      if (eteMins > 0) {
        const adjustedEta = new Date(f.approvedAt).getTime() + eteMins * 60000;
        return !isNaN(adjustedEta) && now > adjustedEta;
      }
    }
    const etaMs = new Date(f.eta).getTime();
    return !isNaN(etaMs) && now > etaMs;
  }, [now]);

  const isPending = (f) => f.approvalStatus === "pending" || f.approvalStatus === "review";
  const isActive = (f) => f.status === "ACTIVE" && !isPending(f);

  // Filter & sort flights
  const displayedFlights = useMemo(() => {
    let list = flights || [];

    // Only show flights from last 24 hours + all active
    const cutoff = now - 24 * 60 * 60 * 1000;
    list = list.filter(f => {
      if (f.status === "ACTIVE") return true;
      const ts = new Date(f.arrivedAt || f.timestamp).getTime();
      return ts > cutoff;
    });

    // Apply filter
    if (filter === "active") {
      list = list.filter(f => f.status === "ACTIVE");
    }

    // Sort: Overdue first, then Active, then Departed/Pending, then Arrived
    list.sort((a, b) => {
      const aOverdue = isOverdue(a) ? 0 : 1;
      const bOverdue = isOverdue(b) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      const statusOrder = (f) => {
        if (f.status === "ACTIVE" && isPending(f)) return 2;
        if (f.status === "ACTIVE") return 1;
        if (f.status === "ARRIVED") return 3;
        return 4;
      };
      const aOrder = statusOrder(a);
      const bOrder = statusOrder(b);
      if (aOrder !== bOrder) return aOrder - bOrder;

      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return list;
  }, [flights, filter, profile, now, isOverdue]);

  // Mobile always defaults to "my" flights regardless of role

  const handleArrivalConfirm = (extra) => {
    if (arrivalFlight) {
      onUpdateFlight(arrivalFlight.id, "ARRIVED", extra);
      setArrivalFlight(null);
    }
  };

  const handleCancelConfirm = () => {
    if (cancelFlight) {
      onUpdateFlight(cancelFlight.id, "CANCEL");
      setCancelFlight(null);
    }
  };

  const handleNudgeReport = () => {
    setShowNudge(false);
    if (onNudgeSubmitReport) onNudgeSubmitReport();
    else if (onNavigateToReports) onNavigateToReports();
  };

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
  ];

  const activeCount = (flights || []).filter(f => f.status === "ACTIVE").length;

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      style={{ minHeight: "100%", position: "relative" }}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: pullDistance, overflow: "hidden", transition: "height 0.15s",
        }}>
          <svg
            width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"
            style={{ transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)`, transition: "transform 0.1s" }}
          >
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
          </svg>
        </div>
      )}
      {refreshing && (
        <div style={{ display: "flex", justifyContent: "center", padding: 8 }}>
          <div style={{ color: MUTED, fontSize: 14 }}>Refreshing...</div>
        </div>
      )}

      {/* My Flights / All Flights toggle or title */}
      {canSeeAllFlights ? (
        <div style={{ padding: "12px 16px 0", display: "flex", gap: 0 }}>
          <div style={{ display: "flex", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 3 }}>
            {["my", "all"].map(m => (
              <button key={m} onClick={() => setFlightsMode(m)} style={{
                padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer",
                background: flightsMode === m ? WHITE : "transparent",
                color: flightsMode === m ? BLACK : MUTED,
                fontSize: 13, fontWeight: 700, minHeight: 36,
              }}>{m === "my" ? "My Flights" : "All Flights"}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "14px 16px 0" }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: WHITE }}>My Flights</span>
        </div>
      )}

      {/* ── MY FLIGHTS MODE ── */}
      {(flightsMode === "my" || !canSeeAllFlights) ? (<>
        {/* Scheduled flights from FF/SchedAero */}
        {(myScheduledFlights || []).length > 0 && (
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={CYAN} stroke="none"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>Scheduled</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: CYAN, background: "rgba(34,211,238,0.1)", padding: "2px 8px", borderRadius: 10 }}>{(myScheduledFlights || []).length}</span>
            </div>
            {(myScheduledFlights || []).map((fl, i) => {
              const etdTime = fl.etd ? new Date(fl.etd).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
              const isFf = fl._source === "foreflight";
              return (
                <button key={fl.id || i} onClick={() => onSelectTodayFlight(fl)} style={{
                  width: "100%", background: "rgba(34,211,238,0.04)", border: `1px solid rgba(34,211,238,0.15)`, borderRadius: 12,
                  padding: "14px 16px", marginBottom: 8, cursor: "pointer", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 8, minHeight: 44,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: WHITE, letterSpacing: 0.5 }}>
                      {fl.departure_icao || "—"} → {fl.destination_icao || "—"}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 8,
                      background: isFf ? "rgba(34,211,238,0.12)" : "rgba(59,130,246,0.12)",
                      color: isFf ? CYAN : "#3B82F6",
                    }}>{isFf ? "ForeFlight" : "SchedAero"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {fl.tail_number && <span style={{ fontSize: 13 }}><span style={{ color: MUTED }}>Tail </span><span style={{ color: WHITE, fontWeight: 600 }}>{fl.tail_number}</span></span>}
                    <span style={{ fontSize: 13 }}><span style={{ color: MUTED }}>ETD </span><span style={{ color: WHITE, fontWeight: 600 }}>{etdTime}</span></span>
                    {fl.passenger_count != null && <span style={{ fontSize: 13 }}><span style={{ color: MUTED }}>Pax </span><span style={{ color: WHITE, fontWeight: 600 }}>{fl.passenger_count}</span></span>}
                    {fl.aircraft_type && <span style={{ fontSize: 13 }}><span style={{ color: MUTED }}>Type </span><span style={{ color: WHITE, fontWeight: 600 }}>{fl.aircraft_type}</span></span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: CYAN }}>
                    Start FRAT →
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Active flights (mine) */}
        {(() => {
          const uid = session?.user?.id;
          const pilotName = profile?.full_name;
          const myActive = (flights || []).filter(f => (f.userId ? f.userId === uid : f.pilot === pilotName) && f.status === "ACTIVE");
          if (myActive.length === 0) return null;
          return (
            <div style={{ padding: "16px 16px 0" }}>
              {(myScheduledFlights || []).length > 0 && <div style={{ height: 1, background: BORDER, marginBottom: 16 }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>Active</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: GREEN, background: "rgba(74,222,128,0.1)", padding: "2px 8px", borderRadius: 10 }}>{myActive.length}</span>
              </div>
              {myActive.map(f => (
                <FlightCard
                  key={f.id || f.dbId}
                  flight={f}
                  isOverdue={isOverdue(f)}
                  expanded={expandedId === (f.id || f.dbId)}
                  onToggle={() => setExpandedId(prev => prev === (f.id || f.dbId) ? null : (f.id || f.dbId))}
                  onSwipeArrive={(fl) => setArrivalFlight(fl)}
                  onSwipeCancel={(fl) => setCancelFlight(fl)}
                  onDelete={onDeleteFlight}
                  isLive={f.status === "ACTIVE" && !!(livePositions[f.dbId] && (Date.now() - (livePositions[f.dbId].receivedAt || 0)) < 30000)}
                />
              ))}
            </div>
          );
        })()}

        {/* Recent flights (mine, past 48h) */}
        {(() => {
          const uid = session?.user?.id;
          const h48 = 48 * 60 * 60 * 1000;
          const pilotName2 = profile?.full_name;
          const myRecent = (flights || []).filter(f => {
            if (!(f.userId ? f.userId === uid : f.pilot === pilotName2)) return false;
            if (f.status !== "ARRIVED" && f.status !== "CANCELLED") return false;
            const ts = new Date(f.arrivedAt || f.timestamp).getTime();
            return ts > now - h48;
          }).sort((a, b) => new Date(b.arrivedAt || b.timestamp).getTime() - new Date(a.arrivedAt || a.timestamp).getTime());
          if (myRecent.length === 0) return null;
          return (
            <div style={{ padding: "16px 16px 0" }}>
              <div style={{ height: 1, background: BORDER, marginBottom: 16 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>Recent</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, background: `${MUTED}18`, padding: "2px 8px", borderRadius: 10 }}>{myRecent.length}</span>
              </div>
              {myRecent.map(f => (
                <FlightCard
                  key={f.id || f.dbId}
                  flight={f}
                  isOverdue={false}
                  expanded={expandedId === (f.id || f.dbId)}
                  onToggle={() => setExpandedId(prev => prev === (f.id || f.dbId) ? null : (f.id || f.dbId))}
                  onSwipeArrive={(fl) => setArrivalFlight(fl)}
                  onSwipeCancel={(fl) => setCancelFlight(fl)}
                  onDelete={onDeleteFlight}
                  isLive={false}
                />
              ))}
            </div>
          );
        })()}

        {/* Empty state for My Flights mode */}
        {(() => {
          const uid = session?.user?.id;
          const pilotName3 = profile?.full_name;
          const isMe = (f) => f.userId ? f.userId === uid : f.pilot === pilotName3;
          const hasScheduled = (myScheduledFlights || []).length > 0;
          const hasActive = (flights || []).some(f => isMe(f) && f.status === "ACTIVE");
          const h48 = 48 * 60 * 60 * 1000;
          const hasRecent = (flights || []).some(f => isMe(f) && (f.status === "ARRIVED" || f.status === "CANCELLED") && new Date(f.arrivedAt || f.timestamp).getTime() > now - h48);
          if (hasScheduled || hasActive || hasRecent) return null;
          return <div style={{ padding: "16px" }}><EmptyState onNewFrat={onNewFrat} /></div>;
        })()}
      </>) : (<>

      {/* ── ALL FLIGHTS MODE (existing org-wide view) ── */}

      {/* Flight Following header */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>Flight Following</span>
        </div>
      </div>

      {/* Filter pills */}
      <div role="radiogroup" aria-label="Filter flights" style={{ padding: "0 16px 8px", display: "flex", gap: 8, overflowX: "auto" }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            role="radio"
            aria-checked={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "10px 16px", borderRadius: 20,
              background: filter === f.id ? WHITE : "transparent",
              color: filter === f.id ? BLACK : MUTED,
              border: filter === f.id ? "none" : `1px solid ${BORDER}`,
              fontSize: 14, fontWeight: filter === f.id ? 700 : 500,
              cursor: "pointer", whiteSpace: "nowrap",
              minHeight: 44,
            }}
          >
            {f.label}{f.id === "active" && activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        ))}
      </div>

      {/* Flight list */}
      <div style={{ padding: "4px 16px 16px" }}>
        {displayedFlights.length === 0 ? (
          <EmptyState onNewFrat={onNewFrat} />
        ) : (
          displayedFlights.map(f => (
            <FlightCard
              key={f.id || f.dbId}
              flight={f}
              isOverdue={isOverdue(f)}
              expanded={expandedId === (f.id || f.dbId)}
              onToggle={() => setExpandedId(prev => prev === (f.id || f.dbId) ? null : (f.id || f.dbId))}
              onSwipeArrive={(fl) => setArrivalFlight(fl)}
              onSwipeCancel={(fl) => setCancelFlight(fl)}
              onDelete={onDeleteFlight}
              isLive={f.status === "ACTIVE" && !!(livePositions[f.dbId] && (Date.now() - (livePositions[f.dbId].receivedAt || 0)) < 30000)}
            />
          ))
        )}
      </div>
      </>)}

      {/* Arrival bottom sheet */}
      {arrivalFlight && (
        <ArrivalSheet
          flight={arrivalFlight}
          onConfirm={handleArrivalConfirm}
          onCancel={() => setArrivalFlight(null)}
          aircraftDefs={(fleetAircraft || []).find(a => a.registration === (arrivalFlight.tailNumber || arrivalFlight.aircraft))?.status_field_defs}
        />
      )}

      {/* Cancel confirmation sheet */}
      {cancelFlight && (
        <CancelSheet
          flight={cancelFlight}
          onConfirm={handleCancelConfirm}
          onDismiss={() => setCancelFlight(null)}
        />
      )}

      {/* Post-flight nudge */}
      {showNudge && nudgeFlight && (
        <PostFlightNudge
          flight={nudgeFlight}
          suggestion={nudgeSuggestion}
          onFileReport={handleNudgeReport}
          onNothingToReport={() => { setShowNudge(false); if (onNudgeNothingToReport) onNudgeNothingToReport(); }}
          onRemindLater={() => { setShowNudge(false); if (onNudgeRemindLater) onNudgeRemindLater(); }}
          onDismiss={() => { setShowNudge(false); if (onNudgeDismiss) onNudgeDismiss(); }}
        />
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  );
}

const cardStyle = {
  background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`,
};

const inputStyle = {
  width: "100%", padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 8,
  fontSize: 16, background: BLACK, color: OFF_WHITE, boxSizing: "border-box",
  fontFamily: "inherit",
};
