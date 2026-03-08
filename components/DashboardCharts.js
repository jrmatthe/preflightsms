import { useMemo, useState, Fragment } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis } from "recharts";

const CARD = "#222222";
const BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#E0E0E0";
const MUTED = "#777777";
const SUBTLE = "#555555";
const BLACK = "#000000";
const NEAR_BLACK = "#0A0A0A";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };

function getRiskColor(s) {
  if (s <= 15) return GREEN;
  if (s <= 30) return YELLOW;
  if (s <= 45) return AMBER;
  return RED;
}

function getRiskLabel(s) {
  if (s <= 15) return "LOW";
  if (s <= 30) return "MODERATE";
  if (s <= 45) return "HIGH";
  return "CRITICAL";
}

function daysAgo(d) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
function formatDate(d) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function timeAgo(d) {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return "Just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

const RISK_CATEGORIES = [
  { id: "weather", name: "Weather", factors: [
    { id: "wx_ceiling", label: "Ceiling < 1000' AGL" },{ id: "wx_vis", label: "Visibility < 3 SM" },
    { id: "wx_xwind", label: "Crosswind > 15 kts" },{ id: "wx_ts", label: "Thunderstorms along route" },
    { id: "wx_ice", label: "Known/forecast icing" },{ id: "wx_turb", label: "Moderate+ turbulence" },
    { id: "wx_wind_shear", label: "Wind shear advisories" },{ id: "wx_mountain", label: "Mountain obscuration / high DA" },
  ]},
  { id: "pilot", name: "Pilot / Crew", factors: [
    { id: "plt_fatigue", label: "Fatigue / rest < 10hrs" },{ id: "plt_recency", label: "Low recency (< 3 flights/30d)" },
    { id: "plt_new_crew", label: "First time as crew" },{ id: "plt_stress", label: "Personal stressors" },
    { id: "plt_duty", label: "Approaching max duty" },{ id: "plt_unfam_apt", label: "Unfamiliar airport" },
  ]},
  { id: "aircraft", name: "Aircraft", factors: [
    { id: "ac_mel", label: "Operating with MEL" },{ id: "ac_mx_defer", label: "Deferred maintenance" },
    { id: "ac_recent_mx", label: "Recently out of mx" },{ id: "ac_perf_limit", label: "Near weight/perf limits" },
    { id: "ac_known_issue", label: "Recurring squawk" },
  ]},
  { id: "environment", name: "Environment", factors: [
    { id: "env_night", label: "Night ops" },{ id: "env_terrain", label: "Mountainous terrain" },
    { id: "env_unfam_airspace", label: "Complex airspace" },{ id: "env_short_runway", label: "Short/contaminated runway" },
    { id: "env_remote", label: "Limited alternates" },{ id: "env_notams", label: "Significant NOTAMs" },
  ]},
  { id: "operational", name: "Operational", factors: [
    { id: "ops_pax_pressure", label: "Passenger pressure" },{ id: "ops_time_pressure", label: "Tight schedule" },
    { id: "ops_vip", label: "High-profile pax" },{ id: "ops_multi_leg", label: "3+ legs in duty" },
    { id: "ops_unfam_mission", label: "Unusual mission" },{ id: "ops_hazmat", label: "HAZMAT on board" },
  ]},
];

const ALL_FACTORS = {};
RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { ALL_FACTORS[f.id] = f.label; }));

function StatCard({ label, value, sub, color, icon, onClick }) {
  const [hovered, setHovered] = useState(false);
  const isClickable = !!onClick;
  const baseStyle = {
    ...card,
    padding: "14px 16px",
    minWidth: 0,
    ...(isClickable ? {
      cursor: "pointer",
      transition: "all 0.15s",
      ...(hovered ? {
        borderColor: "#444444",
        background: "#282828",
      } : {}),
    } : {}),
  };
  return (
    <div
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={isClickable ? () => setHovered(true) : undefined}
      onMouseLeave={isClickable ? () => setHovered(false) : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: color || WHITE, fontFamily: "Georgia,serif" }}>{value}</div>
          {sub && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {icon && <span style={{ fontSize: 20, opacity: 0.5 }}>{icon}</span>}
          {isClickable && <span style={{ fontSize: 11, color: hovered ? OFF_WHITE : MUTED, transition: "color 0.15s", marginTop: icon ? 0 : 4 }}>→</span>}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12, marginTop: 20 }}>{children}</div>;
}

function ChartCard({ title, children, height }) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <h3 style={{ margin: "0 0 12px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

const ttStyle = { borderRadius: 6, border: `1px solid ${BORDER}`, background: CARD, color: WHITE, fontSize: 11 };

// ════════════════════════════════════════════════════════════════
// OVERVIEW TAB — high-level SMS health across all modules
// ════════════════════════════════════════════════════════════════
function OverviewDashboard({ records, flights, reports, hazards, actions, erpPlans, erpDrills, spis, spiMeasurements, trendAlerts, onAcknowledgeTrendAlert, mocItems, insuranceScore, isDashboardFree, onNavigateSubscription, onNavigate, part5Compliance }) {
  const stats = useMemo(() => {
    const now = Date.now();
    const d30 = now - 30 * 86400000;
    const d7 = now - 7 * 86400000;

    // FRAT stats
    const r30 = records.filter(r => new Date(r.timestamp) > d30);
    const r7 = records.filter(r => new Date(r.timestamp) > d7);
    const avgScore = r30.length > 0 ? r30.reduce((a, r) => a + r.score, 0) / r30.length : 0;
    const highCritical30 = r30.filter(r => r.score > 30).length;

    // Flight stats
    const activeFlights = flights.filter(f => f.status === "ACTIVE" || f.status === "PENDING_APPROVAL").length;
    const f30 = flights.filter(f => new Date(f.timestamp) > d30).length;

    // Report stats
    const openReports = reports.filter(r => r.status === "new" || r.status === "investigating").length;
    const r30Reports = reports.filter(r => new Date(r.created_at || r.timestamp) > d30).length;

    // Hazard stats
    const openHazards = hazards.filter(h => h.status === "open" || h.status === "mitigating").length;
    const criticalHazards = hazards.filter(h => h.risk_score >= 15).length;

    // Action stats
    const openActions = actions.filter(a => a.status !== "completed" && a.status !== "closed").length;
    const overdueActions = actions.filter(a => a.status !== "completed" && a.status !== "closed" && a.due_date && new Date(a.due_date) < new Date()).length;

    // Trend data (weekly for last 12 weeks)
    const weeklyData = [];
    for (let i = 11; i >= 0; i--) {
      const wStart = now - (i + 1) * 7 * 86400000;
      const wEnd = now - i * 7 * 86400000;
      const wRecs = records.filter(r => { const t = new Date(r.timestamp).getTime(); return t > wStart && t <= wEnd; });
      const wReports = reports.filter(r => { const t = new Date(r.created_at || r.timestamp).getTime(); return t > wStart && t <= wEnd; });
      weeklyData.push({
        week: new Date(wEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        frats: wRecs.length,
        avgScore: wRecs.length > 0 ? Math.round(wRecs.reduce((a, r) => a + r.score, 0) / wRecs.length) : 0,
        reports: wReports.length,
      });
    }

    // Compliance score — use Part 5 data when available, otherwise heuristic
    let compliance;
    if (part5Compliance && part5Compliance.total > 0) {
      compliance = part5Compliance.percent;
    } else {
      compliance = 100;
      if (overdueActions > 0) compliance -= overdueActions * 10;
      if (openHazards > 3) compliance -= (openHazards - 3) * 5;
      if (r30.length === 0 && f30 > 0) compliance -= 20;
      compliance = Math.max(0, Math.min(100, compliance));
    }

    // ERP stats
    const activePlans = (erpPlans || []).filter(p => p.is_active).length;
    const erpNeedsReview = (erpPlans || []).filter(p => !p.last_reviewed_at || (now - new Date(p.last_reviewed_at).getTime()) > 365 * 86400000).length;
    const completedDrills = (erpDrills || []).filter(d => d.status === 'completed');
    const lastDrill = completedDrills.sort((a,b) => new Date(b.completed_date) - new Date(a.completed_date))[0] || null;
    const nextDrill = (erpDrills || []).filter(d => d.status === 'scheduled').sort((a,b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0] || null;

    // SPI health stats
    const spiList = spis || [];
    const spiM = spiMeasurements || [];
    const spiHealth = { green: 0, yellow: 0, red: 0, noData: 0 };
    for (const s of spiList.filter(s => s.is_active)) {
      const latest = spiM.filter(m => m.spi_id === s.id).sort((a, b) => new Date(b.period_end) - new Date(a.period_end))[0];
      if (!latest || !latest.status) spiHealth.noData++;
      else if (latest.status === 'on_target') spiHealth.green++;
      else if (latest.status === 'approaching_threshold') spiHealth.yellow++;
      else if (latest.status === 'breached') spiHealth.red++;
    }

    return { avgScore, highCritical30, activeFlights, f30, openReports, r30Reports, openHazards, criticalHazards, openActions, overdueActions, weeklyData, compliance, totalFrats: records.length, totalReports: reports.length, r7Count: r7.length, activePlans, erpNeedsReview, lastDrill, nextDrill, spiHealth, spiCount: spiList.filter(s => s.is_active).length };
  }, [records, flights, reports, hazards, actions, erpPlans, erpDrills, spis, spiMeasurements]);

  const [erpHovered, setErpHovered] = useState(false);
  const [spiHovered, setSpiHovered] = useState(false);

  return (
    <div>
      {/* KPI cards */}
      <div className="stat-grid" data-tour="tour-dashboard-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="FRATs (30d)" value={stats.r7Count} sub={`${stats.totalFrats} total`} onClick={onNavigate ? () => onNavigate("history") : undefined} />
        <StatCard label="Avg Risk Score" value={stats.avgScore.toFixed(1)} color={getRiskColor(Math.round(stats.avgScore))} sub="30-day average" />
        <StatCard label="Active Flights" value={stats.activeFlights} sub={`${stats.f30} in last 30d`} onClick={onNavigate ? () => onNavigate("flights") : undefined} />
        <StatCard label="Open Items" value={stats.openReports + stats.openHazards + stats.openActions} color={stats.overdueActions > 0 ? RED : WHITE} sub={stats.overdueActions > 0 ? `${stats.overdueActions} overdue` : "On track"} onClick={onNavigate ? () => onNavigate("actions") : undefined} />
      </div>

      {/* Weekly trend */}
      <ChartCard title="12-Week Activity Trend">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats.weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: MUTED }} />
            <YAxis tick={{ fontSize: 9, fill: MUTED }} />
            <Tooltip contentStyle={ttStyle} />
            <Area type="monotone" dataKey="frats" stackId="a" stroke={CYAN} fill={CYAN} fillOpacity={0.15} name="FRATs" />
            <Area type="monotone" dataKey="reports" stackId="b" stroke={AMBER} fill={AMBER} fillOpacity={0.15} name="Reports" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Bottom grid */}
      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <ChartCard title="Weekly Average Risk Score">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats.weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: MUTED }} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} domain={[0, "auto"]} />
              <Tooltip contentStyle={ttStyle} />
              <Line type="monotone" dataKey="avgScore" stroke={WHITE} strokeWidth={2} dot={{ r: 3, fill: WHITE }} name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <div style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: "0 0 14px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>Open Items by Type</h3>
          {[
            { label: "Safety Reports", count: stats.openReports, total: stats.totalReports, color: CYAN },
            { label: "Investigations", count: stats.openHazards, total: hazards.length, color: AMBER },
            { label: "Corrective Actions", count: stats.openActions, total: actions.length, color: stats.overdueActions > 0 ? RED : GREEN },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: OFF_WHITE }}>{item.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.count} open</span>
              </div>
              <div style={{ height: 4, background: NEAR_BLACK, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: item.total > 0 ? `${(item.count / item.total) * 100}%` : "0%", height: "100%", background: item.color, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{item.total} total</div>
            </div>
          ))}
        </div>
      </div>

      {/* ERP Status */}
      {(erpPlans || []).length > 0 ? (
        <div style={{ ...card, padding: 18, marginTop: 16 }}>
          <h3
            style={{
              margin: "0 0 14px",
              color: WHITE,
              fontFamily: "Georgia,serif",
              fontSize: 14,
              ...(onNavigate ? { cursor: "pointer", transition: "all 0.15s", ...(erpHovered ? { color: CYAN } : {}) } : {}),
            }}
            onClick={onNavigate ? () => onNavigate("erp") : undefined}
            onMouseEnter={onNavigate ? () => setErpHovered(true) : undefined}
            onMouseLeave={onNavigate ? () => setErpHovered(false) : undefined}
          >ERP Status{onNavigate && <span style={{ fontSize: 11, color: erpHovered ? CYAN : MUTED, marginLeft: 6, transition: "color 0.15s" }}> →</span>}</h3>
          <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: WHITE }}>{stats.activePlans}</div>
              <div style={{ fontSize: 10, color: MUTED }}>Active Plans</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: stats.erpNeedsReview > 0 ? AMBER : WHITE }}>{stats.erpNeedsReview}</div>
              <div style={{ fontSize: 10, color: MUTED }}>Needs Review</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{stats.lastDrill ? new Date(stats.lastDrill.completed_date).toLocaleDateString() : "—"}</div>
              <div style={{ fontSize: 10, color: MUTED }}>Last Drill</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{stats.nextDrill ? new Date(stats.nextDrill.scheduled_date).toLocaleDateString() : "—"}</div>
              <div style={{ fontSize: 10, color: MUTED }}>Next Drill</div>
            </div>
          </div>
        </div>
      ) : !isDashboardFree && (
        <div style={{ ...card, padding: 18, marginTop: 16 }}>
          <h3
            style={{
              margin: "0 0 14px",
              color: WHITE,
              fontFamily: "Georgia,serif",
              fontSize: 14,
              ...(onNavigate ? { cursor: "pointer", transition: "all 0.15s" } : {}),
            }}
            onClick={onNavigate ? () => onNavigate("erp") : undefined}
          >ERP Status{onNavigate && <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}> →</span>}</h3>
          <div style={{ textAlign: "center", padding: "12px 0", color: MUTED, fontSize: 11 }}>No emergency response plans created yet</div>
        </div>
      )}

      {/* SPI Health */}
      {!isDashboardFree && stats.spiCount === 0 && (
        <div style={{ ...card, padding: 18, marginTop: 16 }}>
          <h3
            style={{
              margin: "0 0 14px",
              color: WHITE,
              fontFamily: "Georgia,serif",
              fontSize: 14,
              ...(onNavigate ? { cursor: "pointer", transition: "all 0.15s" } : {}),
            }}
            onClick={onNavigate ? () => onNavigate("spiDashboard") : undefined}
          >SPI Health{onNavigate && <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}> →</span>}</h3>
          <div style={{ textAlign: "center", padding: "12px 0", color: MUTED, fontSize: 11 }}>No safety performance indicators configured</div>
        </div>
      )}
      {!isDashboardFree && stats.spiCount > 0 && (
        <div style={{ ...card, padding: 18, marginTop: 16 }}>
          <h3
            style={{
              margin: "0 0 14px",
              color: WHITE,
              fontFamily: "Georgia,serif",
              fontSize: 14,
              ...(onNavigate ? { cursor: "pointer", transition: "all 0.15s", ...(spiHovered ? { color: CYAN } : {}) } : {}),
            }}
            onClick={onNavigate ? () => onNavigate("spiDashboard") : undefined}
            onMouseEnter={onNavigate ? () => setSpiHovered(true) : undefined}
            onMouseLeave={onNavigate ? () => setSpiHovered(false) : undefined}
          >SPI Health{onNavigate && <span style={{ fontSize: 11, color: spiHovered ? CYAN : MUTED, marginLeft: 6, transition: "color 0.15s" }}> →</span>}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: WHITE }}>{stats.spiHealth.green}</span>
              <span style={{ fontSize: 11, color: MUTED }}>On Target</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: AMBER, display: "inline-block" }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: stats.spiHealth.yellow > 0 ? AMBER : WHITE }}>{stats.spiHealth.yellow}</span>
              <span style={{ fontSize: 11, color: MUTED }}>Approaching</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: RED, display: "inline-block" }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: stats.spiHealth.red > 0 ? RED : WHITE }}>{stats.spiHealth.red}</span>
              <span style={{ fontSize: 11, color: MUTED }}>Breached</span>
            </div>
            {stats.spiHealth.noData > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: SUBTLE, display: "inline-block" }} />
                <span style={{ fontSize: 18, fontWeight: 800, color: MUTED }}>{stats.spiHealth.noData}</span>
                <span style={{ fontSize: 11, color: MUTED }}>No Data</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Trend Alerts (AI Intelligence) ── */}
      {!isDashboardFree && (!trendAlerts || trendAlerts.filter(a => !a.acknowledged_by).length === 0) && (
        <div style={{ ...card, padding: 18, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: CYAN }}>&#9889;</span> Trend Alerts</div>
          <div style={{ textAlign: "center", padding: "12px 0", color: MUTED, fontSize: 11 }}>No trend alerts — all clear</div>
        </div>
      )}
      {!isDashboardFree && trendAlerts && trendAlerts.filter(a => !a.acknowledged_by).length > 0 && (
        <div style={{ ...card, padding: "18px 22px", marginTop: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            Trend Alerts
            <span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>Anomalies detected in safety metrics</span>
          </div>
          {trendAlerts
            .filter(a => !a.acknowledged_by)
            .sort((a, b) => { const sev = { critical: 0, warning: 1, info: 2 }; return (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3); })
            .map(alert => {
              const sevColor = alert.severity === "critical" ? RED : alert.severity === "warning" ? AMBER : CYAN;
              const direction = alert.change_percentage > 0 ? "↑" : "↓";
              return (
                <div key={alert.id} style={{ ...card, padding: "12px 16px", marginBottom: 8, borderRadius: 8, borderLeft: `3px solid ${sevColor}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: sevColor, background: `${sevColor}22`, padding: "2px 8px", borderRadius: 8, textTransform: "uppercase" }}>{alert.severity}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{alert.metric_name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: MUTED }}>
                        {direction} {Math.abs(Math.round(alert.change_percentage))}% change — {Math.round((alert.baseline_value || 0) * 10) / 10} → {Math.round((alert.current_value || 0) * 10) / 10}
                      </div>
                    </div>
                    {onAcknowledgeTrendAlert && (
                      <button onClick={() => onAcknowledgeTrendAlert(alert.id)}
                        style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: MUTED, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        Acknowledge
                      </button>
                    )}
                  </div>
                  {alert.narrative && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                      {alert.narrative.summary && (
                        <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5, marginBottom: 6 }}>{alert.narrative.summary}</div>
                      )}
                      {alert.narrative.focus_areas && alert.narrative.focus_areas.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>Focus:</span>
                          {alert.narrative.focus_areas.map((area, i) => (
                            <span key={i} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: `${CYAN}15`, color: CYAN, fontWeight: 600 }}>{area}</span>
                          ))}
                        </div>
                      )}
                      {alert.narrative.risk_outlook && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: alert.narrative.risk_outlook === "improving" ? `${GREEN}22` : alert.narrative.risk_outlook === "declining" ? `${RED}22` : `${AMBER}22`, color: alert.narrative.risk_outlook === "improving" ? GREEN : alert.narrative.risk_outlook === "declining" ? RED : AMBER }}>
                          {alert.narrative.risk_outlook === "improving" ? "Improving" : alert.narrative.risk_outlook === "declining" ? "Declining" : "Stable"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Management of Change (MOC) */}
      {!isDashboardFree && (!mocItems || mocItems.length === 0 || mocItems.filter(m => m.status !== "closed").length === 0) && (
        <div style={{ ...card, padding: 18, marginTop: 16 }}>
          <h3 style={{ margin: "0 0 14px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>Management of Change</h3>
          <div style={{ textAlign: "center", padding: "12px 0", color: MUTED, fontSize: 11 }}>No active change management items</div>
        </div>
      )}
      {!isDashboardFree && mocItems && mocItems.length > 0 && (() => {
        const open = mocItems.filter(m => m.status !== "closed");
        const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
        open.forEach(m => { if (byPriority.hasOwnProperty(m.priority)) byPriority[m.priority]++; });
        return open.length > 0 ? (
          <div style={{ ...card, padding: 18, marginTop: 16 }}>
            <h3 style={{ margin: "0 0 14px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>Management of Change</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {[
                { label: "Critical", count: byPriority.critical, color: RED },
                { label: "High", count: byPriority.high, color: AMBER },
                { label: "Medium", count: byPriority.medium, color: YELLOW },
                { label: "Low", count: byPriority.low, color: GREEN },
              ].map(p => (
                <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                  <span style={{ fontSize: 18, fontWeight: 800, color: p.count > 0 ? p.color : MUTED }}>{p.count}</span>
                  <span style={{ fontSize: 11, color: MUTED }}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* SMS Maturity Score (from Insurance Scorecard) */}
      {!isDashboardFree && typeof insuranceScore === "number" && (
        <div style={{ ...card, padding: 18, marginTop: 16 }}>
          <h3 style={{ margin: "0 0 14px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>SMS Maturity Score</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: `4px solid ${insuranceScore >= 81 ? GREEN : insuranceScore >= 61 ? "#A3E635" : insuranceScore >= 41 ? AMBER : RED}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{Math.round(insuranceScore)}</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: insuranceScore >= 81 ? GREEN : insuranceScore >= 61 ? "#A3E635" : insuranceScore >= 41 ? AMBER : RED }}>
                {insuranceScore >= 81 ? "Advanced" : insuranceScore >= 61 ? "Established" : insuranceScore >= 41 ? "Developing" : "Early Stage"}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>View full scorecard in Insurance & Export</div>
            </div>
          </div>
        </div>
      )}

      {/* Free tier blurred preview overlays */}
      {isDashboardFree && (
        <div style={{ position: "relative", marginTop: 16 }}>
          <div style={{ filter: "blur(3px)", pointerEvents: "none", opacity: 0.5 }}>
            <div style={{ ...card, padding: 18, marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 14px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>SPI Health</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {[{ label: "On Target", n: 5, c: GREEN }, { label: "Approaching", n: 1, c: AMBER }, { label: "Breached", n: 0, c: RED }].map(p => (
                  <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: p.c, display: "inline-block" }} />
                    <span style={{ fontSize: 18, fontWeight: 800, color: WHITE }}>{p.n}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...card, padding: 18, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: CYAN }}>&#9889;</span> Trend Alerts</div>
              {[{ sev: "warning", metric: "Avg Risk Score", pct: 18 }, { sev: "info", metric: "Report Frequency", pct: -12 }].map((a, i) => (
                <div key={i} style={{ ...card, padding: "12px 16px", marginBottom: 8, borderRadius: 8, borderLeft: `3px solid ${a.sev === "warning" ? AMBER : CYAN}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: a.sev === "warning" ? AMBER : CYAN, background: `${a.sev === "warning" ? AMBER : CYAN}22`, padding: "2px 8px", borderRadius: 8, textTransform: "uppercase" }}>{a.sev}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{a.metric}</span>
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>{a.pct > 0 ? "↑" : "↓"} {Math.abs(a.pct)}% change</div>
                </div>
              ))}
            </div>
            <div style={{ ...card, padding: 18 }}>
              <h3 style={{ margin: "0 0 14px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>Management of Change</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {[{ l: "Critical", n: 0, c: RED }, { l: "High", n: 2, c: AMBER }, { l: "Medium", n: 3, c: YELLOW }, { l: "Low", n: 1, c: GREEN }].map(p => (
                  <div key={p.l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.c, display: "inline-block" }} />
                    <span style={{ fontSize: 18, fontWeight: 800, color: p.n > 0 ? p.c : MUTED }}>{p.n}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{p.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,10,10,0.7)", borderRadius: 10 }}>
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 6 }}>Upgrade to Unlock</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>FRAT Analytics, Safety Metrics, Trend Alerts, and more</div>
              <button onClick={() => onNavigateSubscription && onNavigateSubscription()} style={{ padding: "8px 20px", background: CYAN, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>View Plans</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FRAT ANALYTICS TAB — deep dive into FRAT data
// ════════════════════════════════════════════════════════════════
function FRATAnalytics({ records }) {
  const [timeRange, setTimeRange] = useState(30);

  const stats = useMemo(() => {
    if (!records.length) return null;
    const cutoff = Date.now() - timeRange * 86400000;
    const filtered = records.filter(r => new Date(r.timestamp) > cutoff);
    if (!filtered.length) return null;

    const scores = filtered.map(r => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const lc = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    filtered.forEach(r => { const l = getRiskLabel(r.score); lc[l]++; });

    // Factor frequency
    const ff = {};
    filtered.forEach(r => (r.factors || []).forEach(f => { ff[f] = (ff[f] || 0) + 1; }));
    const topFactors = Object.entries(ff).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => ({
      label: ALL_FACTORS[id] || id,
      count,
      pct: Math.round((count / filtered.length) * 100),
    }));

    // Category risk breakdown
    const catBreakdown = RISK_CATEGORIES.map(cat => {
      let catCount = 0;
      filtered.forEach(r => (r.factors || []).forEach(f => {
        if (cat.factors.some(cf => cf.id === f)) catCount++;
      }));
      return { name: cat.name, count: catCount, pct: filtered.length > 0 ? Math.round((catCount / filtered.length) * 100) : 0 };
    });

    // Daily trend
    const dailyMap = {};
    filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(r => {
      const d = formatDate(r.timestamp);
      if (!dailyMap[d]) dailyMap[d] = { date: d, scores: [], count: 0 };
      dailyMap[d].scores.push(r.score);
      dailyMap[d].count++;
    });
    const trendData = Object.values(dailyMap).map(d => ({
      date: d.date,
      avg: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
      max: Math.max(...d.scores),
      count: d.count,
    }));

    // By aircraft (normalize variants like "PC-12", "PC12", "pc12" into one group)
    const normalizeAircraftKey = (name) => (name || "").toLowerCase().replace(/[-\s.]/g, "");
    const canonicalCount = {};
    filtered.forEach(r => {
      const raw = r.aircraft || "Unknown";
      const key = normalizeAircraftKey(raw);
      if (!canonicalCount[key]) canonicalCount[key] = {};
      canonicalCount[key][raw] = (canonicalCount[key][raw] || 0) + 1;
    });
    const canonicalName = {};
    Object.entries(canonicalCount).forEach(([key, variants]) => {
      canonicalName[key] = Object.entries(variants).sort((a, b) => b[1] - a[1])[0][0];
    });

    const aircraftMap = {};
    filtered.forEach(r => {
      const ac = canonicalName[normalizeAircraftKey(r.aircraft || "Unknown")] || r.aircraft || "Unknown";
      if (!aircraftMap[ac]) aircraftMap[ac] = { name: ac, flights: 0, totalScore: 0 };
      aircraftMap[ac].flights++;
      aircraftMap[ac].totalScore += r.score;
    });
    const aircraftData = Object.values(aircraftMap).map(a => ({ ...a, avgScore: Math.round(a.totalScore / a.flights) }));

    // By pilot
    const pilotMap = {};
    filtered.forEach(r => {
      const p = r.pilot || "Unknown";
      if (!pilotMap[p]) pilotMap[p] = { name: p, flights: 0, totalScore: 0 };
      pilotMap[p].flights++;
      pilotMap[p].totalScore += r.score;
    });
    const pilotData = Object.values(pilotMap).map(p => ({ ...p, avgScore: Math.round(p.totalScore / p.flights) })).sort((a, b) => b.flights - a.flights);

    // Pie data
    const pieData = [
      { name: "Low", value: lc.LOW, color: GREEN },
      { name: "Moderate", value: lc.MODERATE, color: YELLOW },
      { name: "High", value: lc.HIGH, color: AMBER },
      { name: "Critical", value: lc.CRITICAL, color: RED },
    ].filter(d => d.value > 0);

    // By day of week
    const dowMap = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
    const dowData = Array(7).fill(null).map((_, i) => ({ day: dowMap[i], count: 0, totalScore: 0 }));
    filtered.forEach(r => {
      const dow = new Date(r.timestamp).getDay();
      dowData[dow].count++;
      dowData[dow].totalScore += r.score;
    });
    dowData.forEach(d => { d.avgScore = d.count > 0 ? Math.round(d.totalScore / d.count) : 0; });

    // Fatigue analytics
    const fatigueRecords = filtered.filter(r => r.fatigueScore != null);
    let fatigueDist = null;
    let fatigueTrend = null;
    let fatigueCorrelation = null;
    if (fatigueRecords.length > 0) {
      // Distribution
      const fLc = { low: 0, moderate: 0, high: 0, critical: 0 };
      fatigueRecords.forEach(r => { const fl = r.fatigueRiskLevel || "low"; fLc[fl] = (fLc[fl] || 0) + 1; });
      fatigueDist = [
        { name: "Low", value: fLc.low, color: GREEN },
        { name: "Moderate", value: fLc.moderate, color: YELLOW },
        { name: "High", value: fLc.high, color: AMBER },
        { name: "Critical", value: fLc.critical, color: RED },
      ].filter(d => d.value > 0);

      // Trend over time
      const fDailyMap = {};
      fatigueRecords.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(r => {
        const d = formatDate(r.timestamp);
        if (!fDailyMap[d]) fDailyMap[d] = { date: d, scores: [], count: 0 };
        fDailyMap[d].scores.push(r.fatigueScore);
        fDailyMap[d].count++;
      });
      fatigueTrend = Object.values(fDailyMap).map(d => ({
        date: d.date, avg: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length), count: d.count,
      }));

      // Correlation: fatigue score vs overall FRAT score
      fatigueCorrelation = fatigueRecords.map(r => ({
        fatigueScore: r.fatigueScore, fratScore: r.score, pilot: r.pilot || "Unknown",
      }));
    }

    return { avg, max: Math.max(...scores), total: filtered.length, lc, topFactors, catBreakdown, trendData, aircraftData, pilotData, pieData, dowData, fatigueDist, fatigueTrend, fatigueCorrelation, fatigueCount: fatigueRecords.length };
  }, [records, timeRange]);

  if (!stats) return <div style={{ textAlign: "center", padding: 80, color: MUTED }}><div style={{ fontSize: 16, fontWeight: 600 }}>No data for selected period</div></div>;

  return (
    <div>
      {/* Time range selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[7, 30, 90, 365].map(d => (
          <button key={d} onClick={() => setTimeRange(d)}
            style={{ padding: "6px 14px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
              background: timeRange === d ? WHITE : "transparent", color: timeRange === d ? BLACK : MUTED,
              border: `1px solid ${timeRange === d ? WHITE : BORDER}` }}>
            {d === 365 ? "1 Year" : `${d} Days`}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Assessments" value={stats.total} />
        <StatCard label="Avg Score" value={stats.avg.toFixed(1)} color={getRiskColor(Math.round(stats.avg))} />
        <StatCard label="Max Score" value={stats.max} color={getRiskColor(stats.max)} />
        <StatCard label="High/Critical" value={stats.lc.HIGH + stats.lc.CRITICAL} color={stats.lc.HIGH + stats.lc.CRITICAL > 0 ? RED : GREEN} sub={`${Math.round(((stats.lc.HIGH + stats.lc.CRITICAL) / stats.total) * 100)}% of total`} />
      </div>

      {/* Score trend + distribution */}
      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Risk Score Trend">
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={stats.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: MUTED }} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} />
              <Tooltip contentStyle={ttStyle} />
              <Area type="monotone" dataKey="avg" stroke={WHITE} fill={WHITE} fillOpacity={0.08} strokeWidth={2} name="Avg" />
              <Area type="monotone" dataKey="max" stroke={RED} fill={RED} fillOpacity={0.06} strokeWidth={1} strokeDasharray="4 4" name="Max" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Risk Distribution">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart><Pie data={stats.pieData} dataKey="value" cx="50%" cy="50%" outerRadius={52} innerRadius={30}>
              {stats.pieData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie>
              <Tooltip contentStyle={ttStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {stats.pieData.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
                <span style={{ color: MUTED }}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Top risk factors + category breakdown */}
      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Top Risk Factors">
          {stats.topFactors.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ flex: 1, fontSize: 10, color: OFF_WHITE, lineHeight: 1.3, minWidth: 0 }}>
                {f.label.length > 35 ? f.label.slice(0, 33) + "…" : f.label}
              </div>
              <div style={{ width: 60, height: 5, borderRadius: 3, background: NEAR_BLACK, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ width: `${f.pct}%`, height: "100%", background: f.pct > 40 ? RED : f.pct > 20 ? AMBER : WHITE, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: WHITE, minWidth: 30, textAlign: "right" }}>{f.pct}%</span>
            </div>
          ))}
        </ChartCard>
        <ChartCard title="Risk by Category">
          <ResponsiveContainer width="100%" height={stats.catBreakdown.length * 32 + 10}>
            <BarChart data={stats.catBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: MUTED }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: OFF_WHITE }} width={80} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="count" fill={CYAN} radius={[0, 3, 3, 0]} name="Factor Hits" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* By aircraft + by day of week */}
      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="By Aircraft">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stats.aircraftData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="flights" fill={WHITE} radius={[3, 3, 0, 0]} name="Flights" />
              <Bar dataKey="avgScore" fill={SUBTLE} radius={[3, 3, 0, 0]} name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="By Day of Week">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stats.dowData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="count" fill={CYAN} radius={[3, 3, 0, 0]} name="Flights" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* By pilot */}
      {stats.pilotData.length > 1 && (
        <ChartCard title="By Pilot">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: MUTED, fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Pilot</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: MUTED, fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Flights</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", color: MUTED, fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>Avg Score</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: MUTED, fontWeight: 600, fontSize: 9, textTransform: "uppercase", width: 120 }}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {stats.pilotData.map(p => (
                  <tr key={p.name} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "8px 8px", color: WHITE, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: "8px 8px", color: OFF_WHITE, textAlign: "right" }}>{p.flights}</td>
                    <td style={{ padding: "8px 8px", color: getRiskColor(p.avgScore), textAlign: "right", fontWeight: 700 }}>{p.avgScore}</td>
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ height: 4, background: NEAR_BLACK, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min((p.avgScore / 50) * 100, 100)}%`, height: "100%", background: getRiskColor(p.avgScore), borderRadius: 2 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Fatigue Risk Analytics */}
      {stats.fatigueCount > 0 && (
        <>
          <SectionTitle>Fatigue Risk Analytics</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }} className="stat-grid">
            <StatCard label="Fatigue Assessments" value={stats.fatigueCount} />
            <StatCard label="Avg Fatigue Score" value={Math.round(stats.fatigueCorrelation.reduce((a, d) => a + d.fatigueScore, 0) / stats.fatigueCount)} color={(() => { const avg = stats.fatigueCorrelation.reduce((a, d) => a + d.fatigueScore, 0) / stats.fatigueCount; return avg <= 20 ? GREEN : avg <= 40 ? YELLOW : avg <= 60 ? AMBER : RED; })()} />
            <StatCard label="High/Critical" value={stats.fatigueDist.filter(d => d.name === "High" || d.name === "Critical").reduce((a, d) => a + d.value, 0)} color={(stats.fatigueDist.filter(d => d.name === "High" || d.name === "Critical").reduce((a, d) => a + d.value, 0)) > 0 ? RED : GREEN} sub={`${Math.round(stats.fatigueDist.filter(d => d.name === "High" || d.name === "Critical").reduce((a, d) => a + d.value, 0) / stats.fatigueCount * 100)}% of assessments`} />
          </div>

          <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Fatigue Risk Distribution */}
            <ChartCard title="Fatigue Risk Distribution">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart><Pie data={stats.fatigueDist} dataKey="value" cx="50%" cy="50%" outerRadius={52} innerRadius={30}>
                  {stats.fatigueDist.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie>
                  <Tooltip contentStyle={ttStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {stats.fatigueDist.map(d => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
                    <span style={{ color: MUTED }}>{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Average Fatigue Score Trend */}
            <ChartCard title="Average Fatigue Score Trend">
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={stats.fatigueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: MUTED }} />
                  <YAxis tick={{ fontSize: 9, fill: MUTED }} domain={[0, 100]} />
                  <Tooltip contentStyle={ttStyle} />
                  <Line type="monotone" dataKey="avg" stroke={AMBER} strokeWidth={2} dot={{ fill: AMBER, r: 3 }} name="Avg Fatigue" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Fatigue vs Overall Risk Correlation */}
          <ChartCard title="Fatigue vs. Overall FRAT Score">
            <div style={{ fontSize: 10, color: MUTED, marginBottom: 8 }}>Each dot represents a FRAT submission with fatigue data. Higher fatigue scores trending with higher FRAT scores suggests systemic fatigue risk.</div>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis type="number" dataKey="fatigueScore" name="Fatigue Score" tick={{ fontSize: 9, fill: MUTED }} domain={[0, 100]} label={{ value: "Fatigue Score", position: "insideBottom", offset: -2, fontSize: 9, fill: MUTED }} />
                <YAxis type="number" dataKey="fratScore" name="FRAT Score" tick={{ fontSize: 9, fill: MUTED }} label={{ value: "FRAT Score", angle: -90, position: "insideLeft", fontSize: 9, fill: MUTED }} />
                <ZAxis range={[30, 30]} />
                <Tooltip contentStyle={ttStyle} formatter={(val, name) => [val, name === "fatigueScore" ? "Fatigue" : "FRAT Score"]} />
                <Scatter data={stats.fatigueCorrelation} fill={CYAN} fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SAFETY METRICS TAB — reports, hazards, actions tracking
// ════════════════════════════════════════════════════════════════
function SafetyMetrics({ reports, hazards, actions }) {
  const stats = useMemo(() => {
    const now = Date.now();

    // Reports by status
    const reportStatus = {};
    reports.forEach(r => { const s = r.status || "new"; reportStatus[s] = (reportStatus[s] || 0) + 1; });
    const reportStatusData = Object.entries(reportStatus).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
      value,
      color: name === "closed" ? GREEN : name === "investigating" ? CYAN : name === "new" ? AMBER : MUTED,
    }));

    // Reports by category
    const reportCats = {};
    reports.forEach(r => { const c = r.category || "Other"; reportCats[c] = (reportCats[c] || 0) + 1; });
    const reportCatData = Object.entries(reportCats).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

    // Reports over time (monthly)
    const monthlyReports = {};
    reports.forEach(r => {
      const d = new Date(r.created_at || r.timestamp);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyReports[key] = (monthlyReports[key] || 0) + 1;
    });
    const monthlyReportData = Object.entries(monthlyReports).map(([month, count]) => ({ month, count }));

    // Hazards by risk level
    const hazardRisk = { low: 0, medium: 0, high: 0, critical: 0 };
    hazards.forEach(h => {
      const rs = h.risk_score || 0;
      if (rs <= 4) hazardRisk.low++;
      else if (rs <= 9) hazardRisk.medium++;
      else if (rs <= 14) hazardRisk.high++;
      else hazardRisk.critical++;
    });
    const hazardRiskData = [
      { name: "Low", value: hazardRisk.low, color: GREEN },
      { name: "Medium", value: hazardRisk.medium, color: YELLOW },
      { name: "High", value: hazardRisk.high, color: AMBER },
      { name: "Critical", value: hazardRisk.critical, color: RED },
    ].filter(d => d.value > 0);

    // Action stats
    const actionStatus = {};
    actions.forEach(a => { const s = a.status || "open"; actionStatus[s] = (actionStatus[s] || 0) + 1; });
    const overdueActions = actions.filter(a => a.status !== "completed" && a.status !== "closed" && a.due_date && new Date(a.due_date) < new Date());
    const avgClosureTime = (() => {
      const closed = actions.filter(a => (a.status === "completed" || a.status === "closed") && a.created_at && a.updated_at);
      if (closed.length === 0) return null;
      const totalDays = closed.reduce((sum, a) => sum + Math.max(1, Math.round((new Date(a.updated_at) - new Date(a.created_at)) / 86400000)), 0);
      return Math.round(totalDays / closed.length);
    })();

    return { reportStatusData, reportCatData, monthlyReportData, hazardRiskData, actionStatus, overdueActions, avgClosureTime, totalReports: reports.length, totalHazards: hazards.length, totalActions: actions.length };
  }, [reports, hazards, actions]);

  return (
    <div>
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Safety Reports" value={stats.totalReports} />
        <StatCard label="Open Investigations" value={stats.hazardRiskData.reduce((a, d) => a + d.value, 0)} color={AMBER} />
        <StatCard label="Corrective Actions" value={stats.totalActions} sub={stats.overdueActions.length > 0 ? `${stats.overdueActions.length} overdue` : "None overdue"} color={stats.overdueActions.length > 0 ? RED : WHITE} />
        <StatCard label="Avg Closure Time" value={stats.avgClosureTime ? `${stats.avgClosureTime}d` : "—"} sub="For completed actions" />
      </div>

      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Reports by Status">
          {stats.reportStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={stats.reportStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={52} innerRadius={30}>
                {stats.reportStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie>
                <Tooltip contentStyle={ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 12 }}>No reports yet</div>}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {stats.reportStatusData.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
                <span style={{ color: MUTED }}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Investigations by Risk Level">
          {stats.hazardRiskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={stats.hazardRiskData} dataKey="value" cx="50%" cy="50%" outerRadius={52} innerRadius={30}>
                {stats.hazardRiskData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie>
                <Tooltip contentStyle={ttStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 12 }}>No hazards yet</div>}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {stats.hazardRiskData.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
                <span style={{ color: MUTED }}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="Report Categories">
          {stats.reportCatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={stats.reportCatData.length * 32 + 10}>
              <BarChart data={stats.reportCatData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: MUTED }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: OFF_WHITE }} width={100} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="count" fill={CYAN} radius={[0, 3, 3, 0]} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 12 }}>No reports yet</div>}
        </ChartCard>
        {stats.overdueActions.length > 0 ? (
          <ChartCard title={`Overdue Actions (${stats.overdueActions.length})`}>
            {stats.overdueActions.map((a, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < stats.overdueActions.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: WHITE, marginBottom: 2 }}>{a.title || "Untitled action"}</div>
                <div style={{ fontSize: 10, color: RED }}>Due {formatDate(a.due_date)} · {Math.abs(daysAgo(a.due_date))} days overdue</div>
                {a.assigned_to && <div style={{ fontSize: 9, color: MUTED }}>Assigned to: {a.assigned_to}</div>}
              </div>
            ))}
          </ChartCard>
        ) : (
          <ChartCard title="Action Status">
            {Object.entries(stats.actionStatus).length > 0 ? Object.entries(stats.actionStatus).map(([status, count]) => (
              <div key={status} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 11, color: OFF_WHITE, textTransform: "capitalize" }}>{status.replace(/_/g, " ")}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: status === "completed" || status === "closed" ? GREEN : WHITE }}>{count}</span>
              </div>
            )) : <div style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 12 }}>No actions yet</div>}
          </ChartCard>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FLEET STATUS TAB
// ════════════════════════════════════════════════════════════════
function FleetStatusRow({ ac, columns, fields, onUpdateStatus }) {
  const [editing, setEditing] = useState(false);
  const [editLocation, setEditLocation] = useState(ac.last_location || "");
  const [editParking, setEditParking] = useState(ac.parking_spot || "");
  const [editFuel, setEditFuel] = useState(ac.fuel_remaining || "");
  const [editFuelUnit, setEditFuelUnit] = useState(ac.fuel_unit || "lbs");
  const [editCustomFields, setEditCustomFields] = useState(ac.status_field_values || {});
  const [saving, setSaving] = useState(false);

  const hasData = ac.last_location || ac.parking_spot || ac.fuel_remaining;

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
    else if (ac.status_field_defs?.length > 0) update.status_field_values = {};
    await onUpdateStatus(ac.id, update);
    setSaving(false);
    setEditing(false);
  };

  const handleStartEdit = () => {
    setEditLocation(ac.last_location || "");
    setEditParking(ac.parking_spot || "");
    setEditFuel(ac.fuel_remaining || "");
    setEditFuelUnit(ac.fuel_unit || "lbs");
    setEditCustomFields(ac.status_field_values || {});
    setEditing(true);
  };

  const inlineInput = { padding: "4px 8px", borderRadius: 4, fontSize: 12, color: WHITE, background: NEAR_BLACK, border: `1px solid ${BORDER}`, fontFamily: "inherit", width: "100%" };

  if (editing) {
    return (
      <Fragment>
        {columns.map(c => {
          if (c.key === "tailNumber") return <div key={c.key} style={{ padding: "8px 0", color: CYAN, fontWeight: 700 }}>{ac.registration}</div>;
          if (c.key === "type") return <div key={c.key} style={{ padding: "8px 0", color: OFF_WHITE }}>{ac.type}</div>;
          if (c.key === "location") return (
            <div key={c.key} style={{ padding: "4px 0", display: "flex", gap: 4 }}>
              <input value={editLocation} onChange={e => setEditLocation(e.target.value.toUpperCase())} placeholder="ICAO" style={{ ...inlineInput, flex: 2 }} />
              <input value={editParking} onChange={e => setEditParking(e.target.value)} placeholder="Spot" style={{ ...inlineInput, flex: 1 }} />
            </div>
          );
          if (c.key === "fuel") return (
            <div key={c.key} style={{ padding: "4px 0", display: "flex", gap: 4 }}>
              <input value={editFuel} onChange={e => setEditFuel(e.target.value)} placeholder="Amt" inputMode="decimal" style={{ ...inlineInput, flex: 1 }} />
              <button onClick={() => setEditFuelUnit(u => u === "lbs" ? "gal" : u === "gal" ? "hrs" : "lbs")} style={{ padding: "4px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}30`, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{editFuelUnit}</button>
            </div>
          );
          if (c.isCustom) return (
            <div key={c.key} style={{ padding: "4px 0" }}>
              <input value={editCustomFields[c.customName] || ""} onChange={e => setEditCustomFields(prev => ({ ...prev, [c.customName]: e.target.value }))} placeholder={c.customName} style={{ ...inlineInput }} />
            </div>
          );
          if (c.key === "updated") return (
            <div key={c.key} style={{ padding: "4px 0", display: "flex", gap: 4 }}>
              <button onClick={handleSave} disabled={saving} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: CYAN, color: BLACK, border: "none", cursor: saving ? "wait" : "pointer", fontFamily: "inherit" }}>{saving ? "..." : "Save"}</button>
              <button onClick={() => setEditing(false)} style={{ padding: "4px 8px", borderRadius: 4, fontSize: 11, color: MUTED, background: "transparent", border: `1px solid ${BORDER}`, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          );
          return <div key={c.key} style={{ padding: "8px 0" }} />;
        })}
      </Fragment>
    );
  }

  return (
    <Fragment>
      {columns.map(c => {
        if (c.key === "tailNumber") return <div key={c.key} style={{ padding: "8px 0", color: CYAN, fontWeight: 700 }}>{ac.registration}</div>;
        if (c.key === "type") return <div key={c.key} style={{ padding: "8px 0", color: OFF_WHITE }}>{ac.type}</div>;
        if (c.key === "location") return (
          <div key={c.key} style={{ padding: "8px 0", color: hasData ? OFF_WHITE : MUTED, fontStyle: hasData ? "normal" : "italic", cursor: onUpdateStatus ? "pointer" : "default" }} onClick={onUpdateStatus ? handleStartEdit : undefined} title={onUpdateStatus ? "Click to edit" : undefined}>
            {ac.last_location ? `${ac.last_location}${ac.parking_spot ? ` / ${ac.parking_spot}` : ""}` : "No recent data"}
          </div>
        );
        if (c.key === "fuel") return (
          <div key={c.key} style={{ padding: "8px 0", color: ac.fuel_remaining ? OFF_WHITE : MUTED, cursor: onUpdateStatus ? "pointer" : "default" }} onClick={onUpdateStatus ? handleStartEdit : undefined} title={onUpdateStatus ? "Click to edit" : undefined}>
            {ac.fuel_remaining ? `${ac.fuel_remaining} ${ac.fuel_unit || "lbs"}` : hasData ? "\u2014" : ""}
          </div>
        );
        if (c.isCustom) return (
          <div key={c.key} style={{ padding: "8px 0", color: ac.status_field_values?.[c.customName] ? OFF_WHITE : MUTED, cursor: onUpdateStatus ? "pointer" : "default" }} onClick={onUpdateStatus ? handleStartEdit : undefined} title={onUpdateStatus ? "Click to edit" : undefined}>
            {ac.status_field_values?.[c.customName] || "\u2014"}
          </div>
        );
        if (c.key === "updated") return (
          <div key={c.key} style={{ padding: "8px 0", color: MUTED, display: "flex", alignItems: "center", gap: 6 }}>
            {ac.status_updated_at ? timeAgo(ac.status_updated_at) : ""}
            {onUpdateStatus && (
              <button onClick={handleStartEdit} title="Edit status" style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, color: CYAN, background: "transparent", border: `1px solid ${CYAN}30`, cursor: "pointer", fontFamily: "inherit", opacity: 0.7 }}>Edit</button>
            )}
          </div>
        );
        return <div key={c.key} style={{ padding: "8px 0" }} />;
      })}
    </Fragment>
  );
}

function FleetStatusView({ flights, fleetAircraft, fleetStatusFields, onUpdateAircraftStatus }) {
  const fields = fleetStatusFields || { tailNumber: true, type: true, location: true, fuel: true, updated: true };
  const customFieldNames = useMemo(() => {
    const names = new Set();
    (fleetAircraft || []).forEach(ac => {
      (ac.status_field_defs || []).forEach(fd => names.add(fd.name));
    });
    return [...names];
  }, [fleetAircraft]);
  const columns = [
    { key: "tailNumber", label: "Tail #" },
    { key: "type", label: "Type" },
    { key: "location", label: "Location" },
    { key: "fuel", label: "Fuel" },
    ...customFieldNames.map(name => ({ key: `custom_${name}`, label: name, isCustom: true, customName: name })),
    { key: "updated", label: "Updated" },
  ].filter(c => c.isCustom || fields[c.key] !== false);

  // Read status from aircraft table fields directly
  const fleetStatus = useMemo(() => {
    const fleet = fleetAircraft || [];
    if (fleet.length === 0) return [];
    return fleet.map(ac => {
      // Fallback: if aircraft record has no status fields, check flights
      if (!ac.last_location && !ac.parking_spot && !ac.fuel_remaining) {
        const arrived = (flights || [])
          .filter(f => f.tailNumber === ac.registration && f.status === "ARRIVED" && !f.cancelled)
          .sort((a, b) => new Date(b.arrivedAt || b.timestamp) - new Date(a.arrivedAt || a.timestamp));
        const last = arrived[0];
        if (last) {
          return {
            ...ac,
            last_location: last.destination || "",
            parking_spot: last.parkingSpot || "",
            fuel_remaining: last.fuelRemaining || "",
            fuel_unit: last.fuelUnit || "lbs",
            status_updated_at: last.arrivedAt || last.timestamp,
          };
        }
      }
      return ac;
    });
  }, [fleetAircraft, flights]);

  if (!fleetAircraft || fleetAircraft.length === 0) {
    return (
      <div style={{ ...card, padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: MUTED }}>No aircraft in fleet</div>
      </div>
    );
  }

  const colCount = columns.length;

  return (
    <div style={{ ...card, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>{"\u2708"}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Fleet Status</span>
      </div>
      {/* Desktop: grid table */}
      <div className="fleet-status-desktop" style={{ display: "grid", gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: "6px 16px", fontSize: 12 }}>
        {columns.map(c => (
          <div key={c.key} style={{ color: MUTED, fontWeight: 700, paddingBottom: 6, borderBottom: `1px solid ${BORDER}` }}>{c.label}</div>
        ))}
        {fleetStatus.map(ac => (
          <FleetStatusRow key={ac.registration || ac.id} ac={ac} columns={columns} fields={fields} onUpdateStatus={onUpdateAircraftStatus} />
        ))}
      </div>
      {/* Mobile: stacked cards */}
      <div className="fleet-status-mobile" style={{ display: "none", flexDirection: "column", gap: 12 }}>
        {fleetStatus.map(ac => {
          const hasData = ac.last_location;
          return (
            <div key={ac.registration || ac.id} style={{ background: NEAR_BLACK, borderRadius: 8, padding: "12px 14px", border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasData ? 8 : 0 }}>
                <div>
                  {fields.tailNumber !== false && <span style={{ color: CYAN, fontWeight: 700, fontSize: 13 }}>{ac.registration}</span>}
                  {fields.type !== false && <span style={{ color: MUTED, fontSize: 12, marginLeft: 8 }}>{ac.type}</span>}
                </div>
                {hasData && fields.updated !== false && <span style={{ color: MUTED, fontSize: 11 }}>{timeAgo(ac.status_updated_at)}</span>}
              </div>
              {hasData ? (
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  {fields.location !== false && <div><span style={{ color: MUTED, fontSize: 10 }}>Location </span><span style={{ color: OFF_WHITE }}>{ac.last_location}</span>{ac.parking_spot ? <span style={{ color: MUTED }}> / <span style={{ color: OFF_WHITE }}>{ac.parking_spot}</span></span> : null}</div>}
                  {fields.fuel !== false && <div><span style={{ color: MUTED, fontSize: 10 }}>Fuel </span><span style={{ color: OFF_WHITE }}>{ac.fuel_remaining ? `${ac.fuel_remaining} ${ac.fuel_unit || "lbs"}` : "\u2014"}</span></div>}
                  {customFieldNames.map(name => { const val = ac.status_field_values?.[name]; return val ? <div key={name}><span style={{ color: MUTED, fontSize: 10 }}>{name} </span><span style={{ color: OFF_WHITE }}>{val}</span></div> : null; })}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic", marginTop: 4 }}>No recent data</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════
export default function DashboardCharts({ records, flights, reports, hazards, actions, riskLevels, view, erpPlans, erpDrills, spis, spiMeasurements, trendAlerts, onAcknowledgeTrendAlert, mocItems, insuranceScore, isDashboardFree, onNavigateSubscription, onNavigate, fleetAircraft, fleetStatusFields, onUpdateAircraftStatus, part5Compliance }) {
  const r = records || [];
  const f = flights || [];
  const rp = reports || [];
  const h = hazards || [];
  const a = actions || [];

  if (view === "overview") return <OverviewDashboard records={r} flights={f} reports={rp} hazards={h} actions={a} erpPlans={erpPlans} erpDrills={erpDrills} spis={spis} spiMeasurements={spiMeasurements} trendAlerts={trendAlerts} onAcknowledgeTrendAlert={onAcknowledgeTrendAlert} mocItems={mocItems} insuranceScore={insuranceScore} isDashboardFree={isDashboardFree} onNavigateSubscription={onNavigateSubscription} onNavigate={onNavigate} part5Compliance={part5Compliance} />;
  if (view === "fleet") return <FleetStatusView flights={f} fleetAircraft={fleetAircraft} fleetStatusFields={fleetStatusFields} onUpdateAircraftStatus={onUpdateAircraftStatus} />;
  if (view === "frat") return <FRATAnalytics records={r} />;
  if (view === "safety") return <SafetyMetrics reports={rp} hazards={h} actions={a} />;

  // Fallback — original behavior
  return <FRATAnalytics records={r} />;
}
