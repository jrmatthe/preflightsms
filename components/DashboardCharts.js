import { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CARD = "#222222";
const BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#E0E0E0";
const MUTED = "#777777";
const SUBTLE = "#555555";
const NEAR_BLACK = "#111111";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const AIRCRAFT_TYPES = ["PC-12", "King Air"];
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };

function getRiskLevel(s) {
  if (s <= 15) return { color: GREEN };
  if (s <= 30) return { color: YELLOW };
  if (s <= 45) return { color: AMBER };
  return { color: RED };
}

const RISK_CATEGORIES = [
  { id: "weather", name: "Weather", factors: [
    { id: "wx_ceiling", label: "Ceiling < 1000' AGL at departure or destination" },{ id: "wx_vis", label: "Visibility < 3 SM at departure or destination" },
    { id: "wx_xwind", label: "Crosswind > 15 kts" },{ id: "wx_ts", label: "Thunderstorms forecast along route" },
    { id: "wx_ice", label: "Known or forecast icing conditions" },{ id: "wx_turb", label: "Moderate or greater turbulence forecast" },
    { id: "wx_wind_shear", label: "Wind shear advisories or PIREPs" },{ id: "wx_mountain", label: "Mountain obscuration or high DA" },
  ]},
  { id: "pilot", name: "Pilot / Crew", factors: [
    { id: "plt_fatigue", label: "Crew rest < 10 hours or significant fatigue" },{ id: "plt_recency", label: "PIC < 3 flights in type in last 30 days" },
    { id: "plt_new_crew", label: "First time flying together as crew" },{ id: "plt_stress", label: "Significant personal stressors" },
    { id: "plt_duty", label: "Approaching max duty time" },{ id: "plt_unfam_apt", label: "PIC unfamiliar with airport" },
  ]},
  { id: "aircraft", name: "Aircraft", factors: [
    { id: "ac_mel", label: "Operating with MEL items" },{ id: "ac_mx_defer", label: "Deferred maintenance items" },
    { id: "ac_recent_mx", label: "Recently out of major maintenance" },{ id: "ac_perf_limit", label: "Near weight/performance limits" },
    { id: "ac_known_issue", label: "Known recurring squawk" },
  ]},
  { id: "environment", name: "Environment", factors: [
    { id: "env_night", label: "Night operations" },{ id: "env_terrain", label: "Mountainous terrain" },
    { id: "env_unfam_airspace", label: "Complex or unfamiliar airspace" },{ id: "env_short_runway", label: "Runway < 4000' or contaminated" },
    { id: "env_remote", label: "Limited alternate airports" },{ id: "env_notams", label: "Significant NOTAMs" },
  ]},
  { id: "operational", name: "Operational", factors: [
    { id: "ops_pax_pressure", label: "Schedule pressure from passengers" },{ id: "ops_time_pressure", label: "Tight schedule" },
    { id: "ops_vip", label: "High-profile passengers" },{ id: "ops_multi_leg", label: "3+ legs in duty period" },
    { id: "ops_unfam_mission", label: "Unusual mission profile" },{ id: "ops_hazmat", label: "Hazardous materials on board" },
  ]},
];

export default function DashboardCharts({ records }) {
  const stats = useMemo(() => {
    if (!records.length) return null;
    const scores = records.map(r => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const lc = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    records.forEach(r => { if (r.score <= 15) lc.LOW++; else if (r.score <= 30) lc.MODERATE++; else if (r.score <= 45) lc.HIGH++; else lc.CRITICAL++; });
    const ff = {};
    records.forEach(r => r.factors.forEach(f => { ff[f] = (ff[f] || 0) + 1; }));
    const tf = Object.entries(ff).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, count]) => {
      let label = id; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { if (f.id === id) label = f.label; }));
      return { label: label.length > 40 ? label.slice(0, 38) + "…" : label, count };
    });
    const last30 = records.filter(r => new Date(r.timestamp) > new Date(Date.now() - 30 * 86400000)).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const td = last30.map(r => ({ date: new Date(r.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }), score: r.score }));
    const ad = AIRCRAFT_TYPES.map(ac => { const acR = records.filter(r => r.aircraft === ac); return { name: ac, flights: acR.length, avgScore: acR.length > 0 ? Math.round(acR.reduce((a, r) => a + r.score, 0) / acR.length) : 0 }; });
    const pd = [{ name: "Low", value: lc.LOW, color: GREEN }, { name: "Moderate", value: lc.MODERATE, color: YELLOW }, { name: "High", value: lc.HIGH, color: AMBER }, { name: "Critical", value: lc.CRITICAL, color: RED }].filter(d => d.value > 0);
    return { avg, max: Math.max(...scores), total: records.length, levelCounts: lc, topFactors: tf, trendData: td, aircraftData: ad, pieData: pd };
  }, [records]);

  if (!stats) return <div style={{ textAlign: "center", padding: 80, color: MUTED }}><div style={{ fontSize: 48, marginBottom: 16 }}>📊</div><div style={{ fontSize: 16, fontWeight: 600 }}>No data yet</div></div>;
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[{ label: "Total Assessments", value: stats.total, color: WHITE }, { label: "Average Score", value: stats.avg.toFixed(1), color: getRiskLevel(Math.round(stats.avg)).color },
          { label: "Highest Score", value: stats.max, color: getRiskLevel(stats.max).color }, { label: "High/Critical", value: stats.levelCounts.HIGH + stats.levelCounts.CRITICAL, color: stats.levelCounts.HIGH + stats.levelCounts.CRITICAL > 0 ? RED : GREEN }].map((s, i) => (
          <div key={i} style={{ ...card, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "Georgia,serif", marginTop: 4 }}>{s.value}</div></div>))}</div>
      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 18 }}>
        <div style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: "0 0 12px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>Risk Score Trend (30 Days)</h3>
          {stats.trendData.length > 0 ? (<ResponsiveContainer width="100%" height={190}><LineChart data={stats.trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} /><XAxis dataKey="date" tick={{ fontSize: 9, fill: MUTED }} /><YAxis tick={{ fontSize: 9, fill: MUTED }} />
            <Tooltip contentStyle={{ borderRadius: 6, border: `1px solid ${BORDER}`, background: CARD, color: WHITE }} /><Line type="monotone" dataKey="score" stroke={WHITE} strokeWidth={2} dot={{ r: 3, fill: WHITE }} /></LineChart></ResponsiveContainer>)
            : <div style={{ color: MUTED, textAlign: "center", padding: 40 }}>No data in last 30 days</div>}</div>
        <div style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: "0 0 12px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={150}><PieChart><Pie data={stats.pieData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={32}>
            {stats.pieData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, color: WHITE }} /></PieChart></ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>{stats.pieData.map(d => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
              <span style={{ color: MUTED }}>{d.name}: {d.value}</span></div>))}</div></div></div>
      <div className="chart-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: "0 0 12px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>Top Risk Factors</h3>
          {stats.topFactors.map((f, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            <div style={{ flex: 1, fontSize: 10, color: OFF_WHITE, lineHeight: 1.3 }}>{f.label}</div>
            <div style={{ width: 50, height: 5, borderRadius: 3, background: BORDER, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ width: `${(f.count / stats.total) * 100}%`, height: "100%", background: WHITE, borderRadius: 3 }} /></div>
            <span style={{ fontSize: 10, fontWeight: 700, color: WHITE, minWidth: 16, textAlign: "right" }}>{f.count}</span></div>))}</div>
        <div style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: "0 0 12px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>By Aircraft Type</h3>
          <ResponsiveContainer width="100%" height={170}><BarChart data={stats.aircraftData}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} /><YAxis tick={{ fontSize: 9, fill: MUTED }} />
            <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, color: WHITE }} /><Bar dataKey="flights" fill={WHITE} radius={[3, 3, 0, 0]} name="Flights" /><Bar dataKey="avgScore" fill={SUBTLE} radius={[3, 3, 0, 0]} name="Avg Score" /></BarChart></ResponsiveContainer></div></div></div>);
}
