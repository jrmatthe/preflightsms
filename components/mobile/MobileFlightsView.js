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
      <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}>
        <path d="M17.8 19.2L16 11l3.5-3.5C20.3 6.7 21 5.1 21 4.5c0-1-.5-1.5-1.5-1.5-.6 0-2.2.7-3 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.3 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
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
function ArrivalSheet({ flight, onConfirm, onCancel }) {
  const [parkingSpot, setParkingSpot] = useState("");
  const [fuelRemaining, setFuelRemaining] = useState("");
  const [fuelUnit, setFuelUnit] = useState("lbs");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <style>{`
        @keyframes arrBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes arrSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
      <div onClick={onCancel} aria-hidden="true" style={{ flex: 1, background: "rgba(0,0,0,0.6)", animation: "arrBackdropIn 0.2s ease-out" }} />
      <div role="dialog" aria-label="Mark flight arrived" style={{ background: CARD, borderTop: `1px solid ${BORDER}`, borderRadius: "16px 16px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))", animation: "arrSlideUp 0.25s ease-out" }}>
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

        <button
          onClick={() => onConfirm({
            parkingSpot: parkingSpot.trim() || undefined,
            fuelRemaining: fuelRemaining.trim() || undefined,
            fuelUnit,
          })}
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

// ── Post-flight nudge toast ──
function PostFlightNudge({ onFileReport, onDismiss }) {
  return (
    <div style={{
      position: "fixed", bottom: "calc(68px + max(env(safe-area-inset-bottom, 0px), 20px))", left: 16, right: 16, zIndex: 1500,
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: 16, display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      animation: "nudgeSlideIn 0.3s ease-out",
    }}>
      <style>{`@keyframes nudgeSlideIn { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
      <div style={{ flex: 1 }}>
        <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Notice anything worth reporting?</div>
        <div style={{ color: MUTED, fontSize: 14 }}>Help keep your operation safe</div>
      </div>
      <button onClick={onFileReport} aria-label="File a safety report" style={{
        padding: "10px 14px", background: WHITE, color: BLACK, border: "none",
        borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        minHeight: 44,
      }}>
        File Report
      </button>
      <button onClick={onDismiss} aria-label="Dismiss" style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

// ── Flight Card ──
function FlightCard({ flight, isOverdue, expanded, onToggle, onSwipeArrive }) {
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

  // Swipe state
  const touchStartX = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const canArrive = isActive && !isPending;

  const handleTouchStart = (e) => {
    if (!canArrive) return;
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    if (touchStartX.current == null) return;
    const diff = touchStartX.current - e.touches[0].clientX;
    if (diff > 0) setSwipeOffset(Math.min(diff, 100));
    else setSwipeOffset(0);
  };
  const handleTouchEnd = () => {
    if (swipeOffset > 60) {
      onSwipeArrive(flight);
    }
    setSwipeOffset(0);
    touchStartX.current = null;
  };

  // Progress for active flights
  const progress = useMemo(() => {
    if (isArrived) return 100;
    if (isPending || !flight.eta) return -1;
    const now = Date.now();
    const end = new Date(flight.eta).getTime();
    const eteMins = parseETE(flight.ete);
    if (flight.approvedAt) {
      const approvedMs = new Date(flight.approvedAt).getTime();
      const plannedStart = eteMins > 0 ? end - eteMins * 60000 : approvedMs;
      const actualStart = Math.max(approvedMs, plannedStart);
      const adjustedEnd = actualStart + eteMins * 60000;
      if (isNaN(actualStart) || adjustedEnd <= actualStart) return 0;
      return Math.max(0, Math.min(((now - actualStart) / (adjustedEnd - actualStart)) * 100, 95));
    }
    const start = eteMins > 0 ? end - eteMins * 60000 : new Date(flight.timestamp).getTime();
    if (isNaN(start) || end <= start) return 0;
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
      {/* Swipe reveal: arrive action */}
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
        {/* Top: Route + Status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ color: WHITE, fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}>
              {flight.departure || "????"} → {flight.destination || "????"}
            </div>
            <div style={{ color: MUTED, fontSize: 14, marginTop: 2 }}>
              {flight.tailNumber || flight.aircraft}{flight.tailNumber && flight.aircraft ? ` · ${flight.aircraft}` : ""}
              {flight.pilot ? ` · ${flight.pilot}` : ""}
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
        {canArrive && !expanded && (
          <div style={{ color: MUTED, fontSize: 14, marginTop: 6, opacity: 0.5 }}>
            \u2190 Swipe to mark arrived
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
  flights, profile, onUpdateFlight, onNewFrat, onNavigateToReports,
  onNudgeSubmitReport, onNudgeDismiss, nudgeFlight, loading,
}) {
  const [filter, setFilter] = useState("my");
  const [expandedId, setExpandedId] = useState(null);
  const [arrivalFlight, setArrivalFlight] = useState(null);
  const [showNudge, setShowNudge] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

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
    if (filter === "my") {
      list = list.filter(f => f.pilot === profile?.full_name);
    } else if (filter === "active") {
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

  const handleNudgeReport = () => {
    setShowNudge(false);
    if (onNudgeSubmitReport) onNudgeSubmitReport();
    else if (onNavigateToReports) onNavigateToReports();
  };

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "my", label: "My Flights" },
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

      {/* Filter pills */}
      <div role="radiogroup" aria-label="Filter flights" style={{ padding: "12px 16px 8px", display: "flex", gap: 8, overflowX: "auto" }}>
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
            />
          ))
        )}
      </div>

      {/* Arrival bottom sheet */}
      {arrivalFlight && (
        <ArrivalSheet
          flight={arrivalFlight}
          onConfirm={handleArrivalConfirm}
          onCancel={() => setArrivalFlight(null)}
        />
      )}

      {/* Post-flight nudge */}
      {showNudge && nudgeFlight && (
        <PostFlightNudge
          onFileReport={handleNudgeReport}
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
