import { useMemo, useState } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

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

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ ...card, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: color || WHITE, fontFamily: "Georgia,serif" }}>{value}</div>
          {sub && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 20, opacity: 0.5 }}>{icon}</span>}
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
function OverviewDashboard({ records, flights, reports, hazards, actions }) {
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

    // Compliance score (simple heuristic)
    let compliance = 100;
    if (overdueActions > 0) compliance -= overdueActions * 10;
    if (openHazards > 3) compliance -= (openHazards - 3) * 5;
    if (r30.length === 0 && f30 > 0) compliance -= 20; // flights without FRATs
    compliance = Math.max(0, Math.min(100, compliance));

    return { avgScore, highCritical30, activeFlights, f30, openReports, r30Reports, openHazards, criticalHazards, openActions, overdueActions, weeklyData, compliance, totalFrats: records.length, totalReports: reports.length, r7Count: r7.length };
  }, [records, flights, reports, hazards, actions]);

  const compColor = stats.compliance >= 80 ? GREEN : stats.compliance >= 60 ? YELLOW : RED;

  return (
    <div>
      {/* Compliance banner */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16, borderLeft: `4px solid ${compColor}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: WHITE, marginBottom: 4 }}>SMS Compliance Health</div>
            <div style={{ fontSize: 10, color: MUTED }}>
              {stats.overdueActions > 0 ? `${stats.overdueActions} overdue action${stats.overdueActions > 1 ? "s" : ""}` : "No overdue actions"}
              {stats.openHazards > 0 ? ` · ${stats.openHazards} open hazard${stats.openHazards > 1 ? "s" : ""}` : ""}
              {stats.openReports > 0 ? ` · ${stats.openReports} open report${stats.openReports > 1 ? "s" : ""}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: compColor, fontFamily: "Georgia,serif" }}>{stats.compliance}%</div>
          </div>
        </div>
        <div style={{ marginTop: 8, height: 6, background: NEAR_BLACK, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${stats.compliance}%`, height: "100%", background: compColor, borderRadius: 3, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="FRATs (30d)" value={stats.r7Count} sub={`${stats.totalFrats} total`} icon="📋" />
        <StatCard label="Avg Risk Score" value={stats.avgScore.toFixed(1)} color={getRiskColor(Math.round(stats.avgScore))} sub="30-day average" icon="📊" />
        <StatCard label="Active Flights" value={stats.activeFlights} sub={`${stats.f30} in last 30d`} icon="✈️" />
        <StatCard label="Open Items" value={stats.openReports + stats.openHazards + stats.openActions} color={stats.overdueActions > 0 ? RED : WHITE} sub={stats.overdueActions > 0 ? `${stats.overdueActions} overdue` : "On track"} icon="⚠️" />
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
            { label: "Hazards", count: stats.openHazards, total: hazards.length, color: AMBER },
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

    // By aircraft
    const aircraftMap = {};
    filtered.forEach(r => {
      const ac = r.aircraft || "Unknown";
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

    return { avg, max: Math.max(...scores), total: filtered.length, lc, topFactors, catBreakdown, trendData, aircraftData, pilotData, pieData, dowData };
  }, [records, timeRange]);

  if (!stats) return <div style={{ textAlign: "center", padding: 80, color: MUTED }}><div style={{ fontSize: 48, marginBottom: 16 }}>📊</div><div style={{ fontSize: 16, fontWeight: 600 }}>No data for selected period</div></div>;

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
        <StatCard label="Assessments" value={stats.total} icon="📋" />
        <StatCard label="Avg Score" value={stats.avg.toFixed(1)} color={getRiskColor(Math.round(stats.avg))} icon="📊" />
        <StatCard label="Max Score" value={stats.max} color={getRiskColor(stats.max)} icon="🔺" />
        <StatCard label="High/Critical" value={stats.lc.HIGH + stats.lc.CRITICAL} color={stats.lc.HIGH + stats.lc.CRITICAL > 0 ? RED : GREEN} sub={`${Math.round(((stats.lc.HIGH + stats.lc.CRITICAL) / stats.total) * 100)}% of total`} icon="⚠️" />
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
        <StatCard label="Safety Reports" value={stats.totalReports} icon="📝" />
        <StatCard label="Open Hazards" value={stats.hazardRiskData.reduce((a, d) => a + d.value, 0)} color={AMBER} icon="⚡" />
        <StatCard label="Corrective Actions" value={stats.totalActions} sub={stats.overdueActions.length > 0 ? `${stats.overdueActions.length} overdue` : "None overdue"} color={stats.overdueActions.length > 0 ? RED : WHITE} icon="✓" />
        <StatCard label="Avg Closure Time" value={stats.avgClosureTime ? `${stats.avgClosureTime}d` : "—"} sub="For completed actions" icon="⏱" />
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
        <ChartCard title="Hazards by Risk Level">
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
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════
export default function DashboardCharts({ records, flights, reports, hazards, actions, riskLevels, view }) {
  const r = records || [];
  const f = flights || [];
  const rp = reports || [];
  const h = hazards || [];
  const a = actions || [];

  if (view === "overview") return <OverviewDashboard records={r} flights={f} reports={rp} hazards={h} actions={a} />;
  if (view === "frat") return <FRATAnalytics records={r} />;
  if (view === "safety") return <SafetyMetrics reports={rp} hazards={h} actions={a} />;

  // Fallback — original behavior
  return <FRATAnalytics records={r} />;
}
