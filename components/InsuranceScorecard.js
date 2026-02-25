import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const DARK = "#0A0A0A";
const CARD = "#222222";
const BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const LIME = "#A3E635";

function getScoreColor(score) {
  if (score <= 40) return RED;
  if (score <= 60) return AMBER;
  if (score <= 80) return LIME;
  return GREEN;
}

function getScoreLabel(score) {
  if (score <= 40) return "Early Stage";
  if (score <= 60) return "Developing";
  if (score <= 80) return "Established";
  return "Advanced";
}

function trendArrow(current, previous) {
  if (previous == null || current == null) return { symbol: "—", color: MUTED };
  const diff = current - previous;
  if (diff > 5) return { symbol: "▲", color: GREEN };
  if (diff < -5) return { symbol: "▼", color: RED };
  return { symbol: "►", color: YELLOW };
}

function CircularGauge({ score, size = 180 }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - pct);
  const color = getScoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#333" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x={size / 2} y={size / 2 - 8} textAnchor="middle" fill={WHITE} fontSize={36} fontWeight={800}>{Math.round(score)}</text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fill={color} fontSize={12} fontWeight={600}>{getScoreLabel(score)}</text>
    </svg>
  );
}

function computeMetrics({ records, flights, reports, hazards, actions, policies, trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules, periodStart, periodEnd }) {
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);
  const inPeriod = (dateStr) => { if (!dateStr) return false; const d = new Date(dateStr); return d >= pStart && d <= pEnd; };

  const fratsInPeriod = (records || []).filter(r => inPeriod(r.created_at || r.timestamp));
  const flightsInPeriod = (flights || []).filter(f => inPeriod(f.created_at || f.timestamp));
  const reportsInPeriod = (reports || []).filter(r => inPeriod(r.created_at));
  const actionsInPeriod = (actions || []).filter(a => inPeriod(a.created_at));
  const hazardsAll = hazards || [];

  const metrics = [];

  // 1. FRAT Completion Rate (15%)
  (() => {
    const nFlights = flightsInPeriod.length;
    const nFrats = fratsInPeriod.length;
    if (nFlights === 0 && nFrats === 0) {
      metrics.push({ name: "FRAT Completion Rate", weight: 15, score: null, value: "N/A", detail: "No flights or FRATs in period" });
    } else {
      const rate = nFlights > 0 ? Math.min(100, (nFrats / nFlights) * 100) : (nFrats > 0 ? 100 : 0);
      metrics.push({ name: "FRAT Completion Rate", weight: 15, score: rate, value: `${Math.round(rate)}%`, detail: `${nFrats} FRATs / ${nFlights} flights` });
    }
  })();

  // 2. FRAT Risk Score Trend (10%)
  (() => {
    if (fratsInPeriod.length < 3) {
      metrics.push({ name: "FRAT Risk Score Trend", weight: 10, score: null, value: "N/A", detail: "Insufficient FRAT data" });
    } else {
      const sorted = [...fratsInPeriod].sort((a, b) => new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp));
      const third = Math.ceil(sorted.length / 3);
      const firstThird = sorted.slice(0, third);
      const lastThird = sorted.slice(-third);
      const avgFirst = firstThird.reduce((s, r) => s + (r.score || 0), 0) / firstThird.length;
      const avgLast = lastThird.reduce((s, r) => s + (r.score || 0), 0) / lastThird.length;
      const changePct = avgFirst > 0 ? ((avgLast - avgFirst) / avgFirst) * 100 : 0;
      let score, label;
      if (changePct < -5) { score = 100; label = "Improving"; }
      else if (changePct <= 5) { score = 70; label = "Stable"; }
      else { score = 30; label = "Worsening"; }
      metrics.push({ name: "FRAT Risk Score Trend", weight: 10, score, value: label, detail: `Avg ${avgFirst.toFixed(1)} → ${avgLast.toFixed(1)}` });
    }
  })();

  // 3. Safety Report Frequency (15%)
  (() => {
    const nReports = reportsInPeriod.length;
    const nFlights = flightsInPeriod.length;
    if (nReports === 0 && nFlights === 0) {
      metrics.push({ name: "Safety Report Frequency", weight: 15, score: null, value: "N/A", detail: "No reports or flights in period" });
    } else if (nFlights > 0) {
      const ratePerHundred = (nReports / nFlights) * 100;
      const score = Math.min(100, (ratePerHundred / 2) * 100);
      metrics.push({ name: "Safety Report Frequency", weight: 15, score, value: `${ratePerHundred.toFixed(1)}/100 flights`, detail: `${nReports} reports / ${nFlights} flights` });
    } else {
      const months = Math.max(1, (pEnd - pStart) / (30 * 24 * 60 * 60 * 1000));
      const perMonth = nReports / months;
      const score = Math.min(100, (perMonth / 2) * 100);
      metrics.push({ name: "Safety Report Frequency", weight: 15, score, value: `${perMonth.toFixed(1)}/month`, detail: `${nReports} reports in period` });
    }
  })();

  // 4. CA Closure Rate (15%)
  (() => {
    const dueInPeriod = actionsInPeriod.filter(a => a.due_date);
    if (dueInPeriod.length === 0) {
      metrics.push({ name: "CA Closure Rate", weight: 15, score: null, value: "N/A", detail: "No corrective actions due in period" });
    } else {
      const closedOnTime = dueInPeriod.filter(a => a.status === "completed" && a.completed_at && new Date(a.completed_at) <= new Date(a.due_date)).length;
      const rate = (closedOnTime / dueInPeriod.length) * 100;
      metrics.push({ name: "CA Closure Rate", weight: 15, score: rate, value: `${Math.round(rate)}%`, detail: `${closedOnTime}/${dueInPeriod.length} closed on time` });
    }
  })();

  // 5. Avg CA Closure Time (5%)
  (() => {
    const closed = actionsInPeriod.filter(a => a.status === "completed" && a.completed_at && a.created_at);
    if (closed.length === 0) {
      metrics.push({ name: "Avg CA Closure Time", weight: 5, score: null, value: "N/A", detail: "No closed CAs in period" });
    } else {
      const avgDays = closed.reduce((s, a) => s + (new Date(a.completed_at) - new Date(a.created_at)) / (1000 * 60 * 60 * 24), 0) / closed.length;
      let score;
      if (avgDays < 30) score = 100;
      else if (avgDays < 60) score = 70;
      else if (avgDays < 90) score = 40;
      else score = 10;
      metrics.push({ name: "Avg CA Closure Time", weight: 5, score, value: `${Math.round(avgDays)} days`, detail: `${closed.length} CAs closed` });
    }
  })();

  // 6. Training Compliance (15%)
  (() => {
    const reqs = trainingReqs || [];
    const recs = trainingRecs || [];
    const profiles = orgProfiles || [];
    if (reqs.length === 0) {
      metrics.push({ name: "Training Compliance", weight: 15, score: null, value: "N/A", detail: "No training requirements defined" });
    } else {
      const now = new Date();
      const reqRates = reqs.map(req => {
        const matchingUsers = profiles.filter(p => !req.required_roles || req.required_roles.length === 0 || req.required_roles.includes(p.role));
        if (matchingUsers.length === 0) return null;
        const compliant = matchingUsers.filter(u => {
          const userRecs = recs.filter(r => r.user_id === u.id && r.requirement_id === req.id);
          return userRecs.some(r => !r.expiry_date || new Date(r.expiry_date) > now);
        }).length;
        return compliant / matchingUsers.length;
      }).filter(r => r != null);
      if (reqRates.length === 0) {
        metrics.push({ name: "Training Compliance", weight: 15, score: null, value: "N/A", detail: "No applicable requirements" });
      } else {
        const avgRate = (reqRates.reduce((s, r) => s + r, 0) / reqRates.length) * 100;
        metrics.push({ name: "Training Compliance", weight: 15, score: avgRate, value: `${Math.round(avgRate)}%`, detail: `${reqRates.length} requirements tracked` });
      }
    }
  })();

  // 7. Investigation Completion (10%)
  (() => {
    if (reportsInPeriod.length === 0) {
      metrics.push({ name: "Investigation Completion", weight: 10, score: null, value: "N/A", detail: "No reports in period" });
    } else {
      const linked = reportsInPeriod.filter(r => hazardsAll.some(h => h.related_report_id === r.id));
      const rate = (linked.length / reportsInPeriod.length) * 100;
      metrics.push({ name: "Investigation Completion", weight: 10, score: rate, value: `${Math.round(rate)}%`, detail: `${linked.length}/${reportsInPeriod.length} reports investigated` });
    }
  })();

  // 8. Policy Acknowledgment (5%)
  (() => {
    const activePolicies = (policies || []).filter(p => p.status !== "archived" && p.status !== "draft");
    const nProfiles = (orgProfiles || []).length;
    if (activePolicies.length === 0 || nProfiles === 0) {
      metrics.push({ name: "Policy Acknowledgment", weight: 5, score: null, value: "N/A", detail: "No active policies" });
    } else {
      const rates = activePolicies.map(p => {
        const acks = (p.acknowledgments || p.acks || []).length;
        return acks / nProfiles;
      });
      const avgRate = (rates.reduce((s, r) => s + r, 0) / rates.length) * 100;
      metrics.push({ name: "Policy Acknowledgment", weight: 5, score: avgRate, value: `${Math.round(avgRate)}%`, detail: `${activePolicies.length} active policies` });
    }
  })();

  // 9. ERP Drill Recency (5%)
  (() => {
    const drills = (erpDrills || []).filter(d => d.status === "completed" && d.conducted_date);
    if (drills.length === 0) {
      metrics.push({ name: "ERP Drill Recency", weight: 5, score: 0, value: "Never", detail: "No completed drills" });
    } else {
      const latest = drills.reduce((max, d) => { const dt = new Date(d.conducted_date); return dt > max ? dt : max; }, new Date(0));
      const monthsAgo = (new Date() - latest) / (30 * 24 * 60 * 60 * 1000);
      let score;
      if (monthsAgo < 6) score = 100;
      else if (monthsAgo < 12) score = 60;
      else score = 20;
      metrics.push({ name: "ERP Drill Recency", weight: 5, score, value: monthsAgo < 1 ? "< 1 month" : `${Math.round(monthsAgo)} months ago`, detail: `Last drill: ${latest.toLocaleDateString()}` });
    }
  })();

  // 10. Audit Activity (5%)
  (() => {
    const audits = (iepAudits || []).filter(a => a.status === "completed" && a.completed_at);
    if (iepAudits == null && (auditSchedules == null || auditSchedules.length === 0)) {
      metrics.push({ name: "Audit Activity", weight: 5, score: null, value: "N/A", detail: "IEP feature not available" });
    } else if (audits.length === 0) {
      metrics.push({ name: "Audit Activity", weight: 5, score: 0, value: "Never", detail: "No completed audits" });
    } else {
      const latest = audits.reduce((max, a) => { const dt = new Date(a.completed_at); return dt > max ? dt : max; }, new Date(0));
      const monthsAgo = (new Date() - latest) / (30 * 24 * 60 * 60 * 1000);
      let score;
      if (monthsAgo < 3) score = 100;
      else if (monthsAgo < 6) score = 70;
      else if (monthsAgo < 12) score = 40;
      else score = 0;
      metrics.push({ name: "Audit Activity", weight: 5, score, value: monthsAgo < 1 ? "< 1 month" : `${Math.round(monthsAgo)} months ago`, detail: `Last audit: ${latest.toLocaleDateString()}` });
    }
  })();

  // Weight redistribution for N/A metrics
  const active = metrics.filter(m => m.score != null);
  const totalActiveWeight = active.reduce((s, m) => s + m.weight, 0);
  const adjustedMetrics = metrics.map(m => {
    if (m.score == null) return { ...m, adjustedWeight: 0, weightedScore: 0 };
    const adjustedWeight = totalActiveWeight > 0 ? (m.weight / totalActiveWeight) * 100 : 0;
    return { ...m, adjustedWeight, weightedScore: (m.score * adjustedWeight) / 100 };
  });

  const overallScore = adjustedMetrics.reduce((s, m) => s + m.weightedScore, 0);

  return { metrics: adjustedMetrics, overallScore };
}

function computeMonthlyScores({ records, flights, reports, hazards, actions, policies, trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules, periodStart, periodEnd }) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const months = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    months.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }

  return months.map(monthDate => {
    const mEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const { overallScore } = computeMetrics({
      records, flights, reports, hazards, actions, policies,
      trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules,
      periodStart: monthDate.toISOString().split("T")[0],
      periodEnd: mEnd.toISOString().split("T")[0],
    });
    return {
      month: monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      score: Math.round(overallScore),
    };
  });
}

export default function InsuranceScorecard({
  profile, session, org, orgProfiles,
  records, flights, reports, hazards, actions, policies,
  trainingReqs, trainingRecs, erpPlans, erpDrills,
  iepAudits, auditSchedules,
  insuranceExports,
  onGenerateExport, onDeleteExport,
}) {
  const [view, setView] = useState("scorecard");
  const [periodMonths, setPeriodMonths] = useState(6);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [generating, setGenerating] = useState(false);

  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);

  const { periodStartDate, periodEndDate } = useMemo(() => {
    if (customStart && customEnd) {
      return { periodStartDate: customStart, periodEndDate: customEnd };
    }
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - periodMonths);
    return {
      periodStartDate: start.toISOString().split("T")[0],
      periodEndDate: end.toISOString().split("T")[0],
    };
  }, [periodMonths, customStart, customEnd]);

  // Compute previous period for trend comparison
  const { prevStart, prevEnd } = useMemo(() => {
    const s = new Date(periodStartDate);
    const e = new Date(periodEndDate);
    const duration = e - s;
    const ps = new Date(s.getTime() - duration);
    return { prevStart: ps.toISOString().split("T")[0], prevEnd: s.toISOString().split("T")[0] };
  }, [periodStartDate, periodEndDate]);

  const currentResult = useMemo(() => computeMetrics({
    records, flights, reports, hazards, actions, policies,
    trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules,
    periodStart: periodStartDate, periodEnd: periodEndDate,
  }), [records, flights, reports, hazards, actions, policies, trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules, periodStartDate, periodEndDate]);

  const prevResult = useMemo(() => computeMetrics({
    records, flights, reports, hazards, actions, policies,
    trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules,
    periodStart: prevStart, periodEnd: prevEnd,
  }), [records, flights, reports, hazards, actions, policies, trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules, prevStart, prevEnd]);

  const monthlyScores = useMemo(() => computeMonthlyScores({
    records, flights, reports, hazards, actions, policies,
    trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules,
    periodStart: periodStartDate, periodEnd: periodEndDate,
  }), [records, flights, reports, hazards, actions, policies, trainingReqs, trainingRecs, orgProfiles, erpDrills, iepAudits, auditSchedules, periodStartDate, periodEndDate]);

  const generatePdf = async (type) => {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const margin = 50;
      let y = 50;

      const checkPage = (needed) => {
        if (y + needed > H - 50) { doc.addPage(); y = 50; }
      };

      // Logo
      if (org?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = org.logo_url; });
          doc.addImage(img, "PNG", margin, y, 50, 50);
          y += 60;
        } catch { /* skip */ }
      }

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(type === "scorecard" ? "SMS Maturity Scorecard" : "Safety Management System — Full Report", W / 2, y, { align: "center" });
      y += 18;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(org?.name || "Organization", W / 2, y, { align: "center" });
      y += 14;
      if (org?.certificate_number) {
        doc.text(`Certificate: ${org.certificate_number}`, W / 2, y, { align: "center" });
        y += 14;
      }
      doc.text(`Report Period: ${periodStartDate} to ${periodEndDate}`, W / 2, y, { align: "center" });
      y += 28;

      // Overall Score
      const scoreColor = getScoreColor(currentResult.overallScore);
      const hexR = parseInt(scoreColor.slice(1, 3), 16);
      const hexG = parseInt(scoreColor.slice(3, 5), 16);
      const hexB = parseInt(scoreColor.slice(5, 7), 16);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Overall SMS Maturity Score", margin, y);
      y += 20;
      doc.setFontSize(32);
      doc.setTextColor(hexR, hexG, hexB);
      doc.text(`${Math.round(currentResult.overallScore)}`, margin, y);
      doc.setFontSize(14);
      doc.text(` / 100  —  ${getScoreLabel(currentResult.overallScore)}`, margin + 50, y);
      doc.setTextColor(0, 0, 0);
      y += 30;

      // Metrics table
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Metric Breakdown", margin, y);
      y += 16;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Metric", margin, y);
      doc.text("Value", margin + 220, y);
      doc.text("Score", margin + 340, y);
      doc.text("Weight", margin + 400, y);
      doc.text("Trend", margin + 460, y);
      y += 4;
      doc.setDrawColor(180);
      doc.line(margin, y, W - margin, y);
      y += 12;

      doc.setFont("helvetica", "normal");
      currentResult.metrics.forEach((m, i) => {
        checkPage(16);
        const prevMetric = prevResult.metrics[i];
        const trend = m.score != null && prevMetric?.score != null
          ? (m.score > prevMetric.score + 5 ? "Up" : m.score < prevMetric.score - 5 ? "Down" : "Stable")
          : "—";
        doc.text(m.name, margin, y);
        doc.text(m.value, margin + 220, y);
        doc.text(m.score != null ? `${Math.round(m.score)}` : "N/A", margin + 340, y);
        doc.text(m.score != null ? `${Math.round(m.adjustedWeight)}%` : "—", margin + 400, y);
        doc.text(trend === "Up" ? "Improving" : trend === "Down" ? "Declining" : trend, margin + 460, y);
        y += 14;
      });

      y += 10;

      if (type === "full_report") {
        // FRAT Analytics
        checkPage(80);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FRAT Analytics", margin, y);
        y += 16;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        const fratsInPeriod = (records || []).filter(r => {
          const d = new Date(r.created_at || r.timestamp);
          return d >= new Date(periodStartDate) && d <= new Date(periodEndDate);
        });
        const riskDist = { low: 0, moderate: 0, high: 0, critical: 0 };
        fratsInPeriod.forEach(r => {
          const s = r.score || 0;
          if (s <= 15) riskDist.low++;
          else if (s <= 30) riskDist.moderate++;
          else if (s <= 45) riskDist.high++;
          else riskDist.critical++;
        });
        const total = fratsInPeriod.length || 1;
        doc.text(`Risk Distribution: Low ${Math.round(riskDist.low / total * 100)}% | Moderate ${Math.round(riskDist.moderate / total * 100)}% | High ${Math.round(riskDist.high / total * 100)}% | Critical ${Math.round(riskDist.critical / total * 100)}%`, margin, y);
        y += 14;
        doc.text(`Total FRATs in period: ${fratsInPeriod.length}`, margin, y);
        y += 20;

        // Safety Reporting Trends
        checkPage(60);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Safety Reporting Trends", margin, y);
        y += 16;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const reportsInPeriod = (reports || []).filter(r => {
          const d = new Date(r.created_at);
          return d >= new Date(periodStartDate) && d <= new Date(periodEndDate);
        });
        const reportsByType = {};
        reportsInPeriod.forEach(r => { reportsByType[r.type || "other"] = (reportsByType[r.type || "other"] || 0) + 1; });
        doc.text(`Total reports: ${reportsInPeriod.length}`, margin, y);
        y += 14;
        Object.entries(reportsByType).forEach(([type, count]) => {
          doc.text(`  ${type}: ${count}`, margin, y);
          y += 12;
        });
        y += 10;

        // CA Summary
        checkPage(60);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Corrective Actions Summary", margin, y);
        y += 16;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const actionsInPeriod = (actions || []).filter(a => {
          const d = new Date(a.created_at);
          return d >= new Date(periodStartDate) && d <= new Date(periodEndDate);
        });
        const openCAs = actionsInPeriod.filter(a => a.status !== "completed").length;
        const closedCAs = actionsInPeriod.filter(a => a.status === "completed").length;
        const overdueCAs = actionsInPeriod.filter(a => a.status !== "completed" && a.due_date && new Date(a.due_date) < new Date()).length;
        doc.text(`Open: ${openCAs} | Closed: ${closedCAs} | Overdue: ${overdueCAs}`, margin, y);
        y += 20;

        // Training Compliance
        checkPage(60);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Training Compliance", margin, y);
        y += 16;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        (trainingReqs || []).forEach(req => {
          checkPage(14);
          const matchingUsers = (orgProfiles || []).filter(p => !req.required_roles || req.required_roles.length === 0 || req.required_roles.includes(p.role));
          const compliant = matchingUsers.filter(u => (trainingRecs || []).some(r => r.user_id === u.id && r.requirement_id === req.id && (!r.expiry_date || new Date(r.expiry_date) > new Date()))).length;
          const rate = matchingUsers.length > 0 ? Math.round((compliant / matchingUsers.length) * 100) : 0;
          doc.text(`${req.name || req.title || "Requirement"}: ${rate}% (${compliant}/${matchingUsers.length})`, margin, y);
          y += 12;
        });
        y += 10;

        // Investigation Summary
        checkPage(60);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Investigation Summary", margin, y);
        y += 16;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const hazardsInPeriod = (hazards || []).filter(h => {
          const d = new Date(h.created_at);
          return d >= new Date(periodStartDate) && d <= new Date(periodEndDate);
        });
        const byStatus = {};
        hazardsInPeriod.forEach(h => { byStatus[h.status || "open"] = (byStatus[h.status || "open"] || 0) + 1; });
        doc.text(`Total hazards: ${hazardsInPeriod.length}`, margin, y);
        y += 14;
        Object.entries(byStatus).forEach(([status, count]) => {
          doc.text(`  ${status}: ${count}`, margin, y);
          y += 12;
        });
        y += 10;

        // Part 5 compliance from audits
        if ((iepAudits || []).length > 0) {
          checkPage(40);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("IEP Audit Activity", margin, y);
          y += 16;
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const completedAudits = (iepAudits || []).filter(a => a.status === "completed");
          doc.text(`Completed audits: ${completedAudits.length} | Total: ${(iepAudits || []).length}`, margin, y);
          y += 20;
        }
      }

      // Summary text
      checkPage(60);
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      const summaryText = `This ${type === "scorecard" ? "scorecard" : "report"} reflects the active use and performance of ${org?.name || "the organization"}'s Safety Management System as tracked in PreflightSMS during ${periodStartDate} to ${periodEndDate}.`;
      const splitSummary = doc.splitTextToSize(summaryText, W - margin * 2);
      doc.text(splitSummary, margin, y);
      y += splitSummary.length * 12 + 10;

      // Disclaimer
      checkPage(40);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      const disclaimer = "This report is generated from system data and does not constitute an audit or certification of SMS compliance.";
      doc.text(disclaimer, margin, y);
      y += 14;
      doc.text(`Generated ${new Date().toLocaleString()} by PreflightSMS`, margin, y);
      doc.setTextColor(0, 0, 0);

      const pdfBlob = doc.output("blob");
      const fileName = `SMS_${type === "scorecard" ? "Scorecard" : "Full_Report"}_${periodStartDate}_${periodEndDate}.pdf`;

      // Download locally
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Save to database
      if (onGenerateExport) {
        const exportData = {
          export_type: type,
          period_start: periodStartDate,
          period_end: periodEndDate,
          scorecard_data: {
            metrics: currentResult.metrics.map(m => ({ name: m.name, score: m.score, value: m.value, weight: m.weight, adjustedWeight: m.adjustedWeight })),
            overallScore: currentResult.overallScore,
          },
          overall_sms_maturity_score: Math.round(currentResult.overallScore * 100) / 100,
          generated_by: session?.user?.id,
        };
        await onGenerateExport(exportData, pdfBlob);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const userName = (id) => {
    const p = (orgProfiles || []).find(u => u.id === id);
    return p ? (p.full_name || p.email || "Unknown") : "Unknown";
  };

  return (
    <div>
      {/* Sub-view toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[["scorecard", "Scorecard"], ["history", "Export History"]].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{
            padding: "8px 16px", borderRadius: 6, border: `1px solid ${view === id ? WHITE : BORDER}`,
            background: view === id ? WHITE : "transparent", color: view === id ? "#000" : MUTED,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {view === "scorecard" && (
        <div>
          {/* Period Selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: MUTED, marginRight: 4 }}>Period:</span>
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => { setPeriodMonths(m); setCustomStart(""); setCustomEnd(""); }} style={{
                padding: "6px 12px", borderRadius: 4, border: `1px solid ${periodMonths === m && !customStart ? WHITE : BORDER}`,
                background: periodMonths === m && !customStart ? WHITE : "transparent",
                color: periodMonths === m && !customStart ? "#000" : MUTED,
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>{m} mo</button>
            ))}
            <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>Custom:</span>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{
              padding: "5px 8px", background: DARK, color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 11,
            }} />
            <span style={{ color: MUTED, fontSize: 11 }}>to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{
              padding: "5px 8px", background: DARK, color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 11,
            }} />
          </div>

          {/* Score + Gauge */}
          <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 220 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>SMS Maturity Score</div>
              <CircularGauge score={currentResult.overallScore} />
              <div style={{ fontSize: 10, color: MUTED, marginTop: 8 }}>{periodStartDate} — {periodEndDate}</div>
            </div>

            {/* Quick stats */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {currentResult.metrics.filter(m => m.score != null).slice(0, 6).map(m => (
                <div key={m.name} style={{ background: CARD, borderRadius: 8, border: `1px solid ${BORDER}`, padding: 12 }}>
                  <div style={{ fontSize: 9, color: MUTED, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: getScoreColor(m.score) }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: MUTED }}>{m.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Metric Breakdown Table */}
          <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 20, overflowX: "auto" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>Metric Breakdown</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Metric</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Value</th>
                  <th style={{ textAlign: "right", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Score</th>
                  <th style={{ textAlign: "right", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Weight</th>
                  <th style={{ textAlign: "right", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Weighted</th>
                  <th style={{ textAlign: "center", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {currentResult.metrics.map((m, i) => {
                  const prevMetric = prevResult.metrics[i];
                  const trend = trendArrow(m.score, prevMetric?.score);
                  return (
                    <tr key={m.name} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "8px 6px", color: OFF_WHITE }}>{m.name}</td>
                      <td style={{ padding: "8px 6px", color: WHITE }}>{m.value}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right", color: m.score != null ? getScoreColor(m.score) : MUTED }}>{m.score != null ? Math.round(m.score) : "N/A"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right", color: MUTED }}>{m.score != null ? `${Math.round(m.adjustedWeight)}%` : "—"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "right", color: WHITE, fontWeight: 600 }}>{m.score != null ? Math.round(m.weightedScore) : "—"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: trend.color, fontSize: 14 }}>{trend.symbol}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={4} style={{ padding: "8px 6px", color: WHITE, fontWeight: 700 }}>Overall Score</td>
                  <td style={{ padding: "8px 6px", textAlign: "right", color: getScoreColor(currentResult.overallScore), fontWeight: 800, fontSize: 14 }}>{Math.round(currentResult.overallScore)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Trend Chart */}
          {monthlyScores.length > 1 && (
            <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>SMS Maturity Trend</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyScores}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getScoreColor(currentResult.overallScore)} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={getScoreColor(currentResult.overallScore)} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: WHITE }} />
                  <Area type="monotone" dataKey="score" stroke={getScoreColor(currentResult.overallScore)} fill="url(#scoreFill)" strokeWidth={2} dot={{ r: 3, fill: getScoreColor(currentResult.overallScore) }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Export Buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button onClick={() => generatePdf("scorecard")} disabled={generating} style={{
              padding: "10px 20px", background: generating ? BORDER : WHITE, color: "#000",
              border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: generating ? "not-allowed" : "pointer",
            }}>{generating ? "Generating..." : "Generate Insurance Scorecard"}</button>
            <button onClick={() => generatePdf("full_report")} disabled={generating} style={{
              padding: "10px 20px", background: "transparent", color: WHITE,
              border: `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: generating ? "not-allowed" : "pointer",
            }}>{generating ? "Generating..." : "Generate Full Safety Report"}</button>
          </div>
        </div>
      )}

      {view === "history" && (
        <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 12 }}>Export History</div>
          {(!insuranceExports || insuranceExports.length === 0) ? (
            <div style={{ color: MUTED, fontSize: 12, padding: 20, textAlign: "center" }}>No exports yet. Generate a scorecard or report from the Scorecard tab.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Date</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Type</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Period</th>
                  <th style={{ textAlign: "right", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Score</th>
                  <th style={{ textAlign: "left", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Generated By</th>
                  <th style={{ textAlign: "right", padding: "8px 6px", color: MUTED, fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {insuranceExports.map(exp => (
                  <tr key={exp.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "8px 6px", color: OFF_WHITE }}>{new Date(exp.generated_at).toLocaleDateString()}</td>
                    <td style={{ padding: "8px 6px", color: WHITE }}>{exp.export_type === "scorecard" ? "Scorecard" : "Full Report"}</td>
                    <td style={{ padding: "8px 6px", color: MUTED }}>{exp.period_start} — {exp.period_end}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: getScoreColor(exp.overall_sms_maturity_score || 0), fontWeight: 700 }}>{exp.overall_sms_maturity_score != null ? Math.round(exp.overall_sms_maturity_score) : "—"}</td>
                    <td style={{ padding: "8px 6px", color: MUTED }}>{userName(exp.generated_by)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {exp.pdf_path && (
                          <a href={exp.pdf_path} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", fontSize: 11, textDecoration: "none" }}>Download</a>
                        )}
                        {isAdmin && onDeleteExport && (
                          <button onClick={() => onDeleteExport(exp.id)} style={{ background: "transparent", border: "none", color: RED, fontSize: 11, cursor: "pointer", padding: 0 }}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
