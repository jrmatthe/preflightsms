import { useState, useMemo } from "react";

const BLACK = "#000000";
const CARD = "#161616";
const BORDER = "#232323";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const cardStyle = { background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` };

const HAZARD_STATUSES = {
  identified: { label: "Identified", color: CYAN },
  active: { label: "Active", color: "#F97316" },
  mitigated: { label: "Mitigated", color: YELLOW },
  monitoring: { label: "Monitoring", color: "#A78BFA" },
  accepted: { label: "Accepted", color: GREEN },
  closed: { label: "Closed", color: MUTED },
};

const CATEGORIES = {
  weather: "Weather", mechanical: "Mechanical", human_factors: "Human Factors",
  procedures: "Procedures", training: "Training", fatigue: "Fatigue",
  communication: "Communication", ground_ops: "Ground Ops", airspace: "Airspace",
  maintenance: "Maintenance", other: "Other",
};

function riskColor(score) {
  if (score <= 4) return GREEN;
  if (score <= 9) return YELLOW;
  if (score <= 16) return AMBER;
  return RED;
}

function riskLabel(score) {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

function SkeletonLoader() {
  return (
    <div style={{ padding: 16 }} aria-label="Loading investigations">
      <style>{`@keyframes hazPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 36, width: 80, background: BORDER, borderRadius: 20, animation: "hazPulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ ...cardStyle, padding: 0, marginBottom: 10, display: "flex", overflow: "hidden", animation: "hazPulse 1.5s ease-in-out infinite" }}>
          <div style={{ width: 52, background: `${BORDER}44`, minHeight: 80 }} />
          <div style={{ flex: 1, padding: 14 }}>
            <div style={{ height: 16, width: "70%", background: BORDER, borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 14, width: "50%", background: BORDER, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: `${GREEN}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div style={{ color: WHITE, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No Active Investigations</div>
      <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>All clear. Investigations are managed from the desktop app.</div>
    </div>
  );
}

function HazardCard({ hazard, actions }) {
  const [expanded, setExpanded] = useState(false);
  const status = HAZARD_STATUSES[hazard.status] || HAZARD_STATUSES.identified;
  const initialScore = (hazard.initial_likelihood || 0) * (hazard.initial_severity || 0);
  const residualScore = (hazard.residual_likelihood || 0) * (hazard.residual_severity || 0);
  const displayScore = residualScore || initialScore;
  const scoreColor = riskColor(displayScore);
  const linkedActions = (actions || []).filter(a => a.hazard_id === hazard.id);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      aria-expanded={expanded}
      aria-label={`${hazard.title}, risk score ${displayScore}, ${riskLabel(displayScore)}, ${status.label}`}
      style={{
        ...cardStyle, padding: 0, width: "100%", textAlign: "left", cursor: "pointer",
        fontFamily: "inherit", display: "block", marginBottom: 10, overflow: "hidden",
      }}
    >
      <div style={{ display: "flex" }}>
        {/* Risk score sidebar */}
        <div style={{
          width: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: `${scoreColor}12`, borderRight: `1px solid ${scoreColor}30`, flexShrink: 0,
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor }}>{displayScore}</div>
          <div style={{ fontSize: 10, color: scoreColor, fontWeight: 600, textTransform: "uppercase" }}>{riskLabel(displayScore)}</div>
        </div>

        <div style={{ flex: 1, padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 6, lineHeight: 1.3 }}>{hazard.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600,
              background: `${status.color}16`, color: status.color, border: `1px solid ${status.color}30`,
            }}>{status.label}</span>
            {hazard.category && CATEGORIES[hazard.category] && (
              <span style={{
                padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                background: `${MUTED}16`, color: MUTED,
              }}>{CATEGORIES[hazard.category]}</span>
            )}
            {hazard.responsible_person && (
              <span style={{ fontSize: 14, color: MUTED }}>
                {hazard.responsible_person}
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${BORDER}` }}>
          {hazard.description && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 14, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{hazard.description}</div>
            </div>
          )}

          {/* Risk scores */}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{ ...cardStyle, flex: 1, padding: 10, textAlign: "center", background: BLACK }}>
              <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", marginBottom: 2 }}>Initial Risk</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: riskColor(initialScore) }}>{initialScore || "\u2014"}</div>
              {initialScore > 0 && <div style={{ fontSize: 14, color: MUTED }}>L{hazard.initial_likelihood} \u00D7 S{hazard.initial_severity}</div>}
            </div>
            {residualScore > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", color: MUTED }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div style={{ ...cardStyle, flex: 1, padding: 10, textAlign: "center", background: BLACK }}>
                  <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", marginBottom: 2 }}>Residual Risk</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: riskColor(residualScore) }}>{residualScore}</div>
                  <div style={{ fontSize: 14, color: MUTED }}>L{hazard.residual_likelihood} \u00D7 S{hazard.residual_severity}</div>
                </div>
              </>
            )}
          </div>

          {hazard.mitigations && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Mitigations</div>
              <div style={{ fontSize: 14, color: OFF_WHITE, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{hazard.mitigations}</div>
            </div>
          )}

          {/* Linked corrective actions */}
          {linkedActions.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 14, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Corrective Actions</div>
              {linkedActions.map(a => (
                <div key={a.id} style={{
                  padding: "8px 10px", borderRadius: 8, background: BLACK,
                  border: `1px solid ${BORDER}`, marginBottom: 4,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                    background: a.status === "completed" ? GREEN : a.status === "overdue" ? RED : AMBER,
                  }} />
                  <div style={{ flex: 1, fontSize: 14, color: OFF_WHITE }}>{a.title}</div>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: a.status === "completed" ? GREEN : a.status === "overdue" ? RED : MUTED,
                  }}>{(a.status || "").replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export default function MobileHazardsView({ hazards, actions }) {
  const [filter, setFilter] = useState("all");

  if (hazards === undefined || hazards === null) return <SkeletonLoader />;

  const filteredHazards = useMemo(() => {
    const h = hazards || [];
    if (filter === "all") return h.filter(x => x.status !== "closed");
    if (filter === "active") return h.filter(x => x.status === "identified" || x.status === "active");
    if (filter === "monitoring") return h.filter(x => x.status === "monitoring" || x.status === "mitigated");
    return h;
  }, [hazards, filter]);

  const filters = [
    { id: "all", label: "All Open" },
    { id: "active", label: "Active" },
    { id: "monitoring", label: "Monitoring" },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Filter pills */}
      <div role="radiogroup" aria-label="Filter investigations" style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        {filters.map(f => (
          <button
            key={f.id}
            role="radio"
            aria-checked={filter === f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "10px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600,
              border: `1px solid ${filter === f.id ? WHITE : BORDER}`,
              background: filter === f.id ? WHITE : "transparent",
              color: filter === f.id ? BLACK : MUTED,
              cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
              minHeight: 44,
            }}
          >{f.label}</button>
        ))}
      </div>

      {filteredHazards.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ fontSize: 14, color: MUTED, marginBottom: 10 }}>
            {filteredHazards.length} investigation{filteredHazards.length !== 1 ? "s" : ""}
          </div>
          {filteredHazards.map(h => (
            <HazardCard key={h.id} hazard={h} actions={actions} />
          ))}
        </>
      )}
    </div>
  );
}
