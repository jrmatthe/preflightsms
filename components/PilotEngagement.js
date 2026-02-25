import { useState, useMemo } from "react";

const CARD = "#222222", BORDER = "#2E2E2E", WHITE = "#FFFFFF", OFF_WHITE = "#E0E0E0";
const MUTED = "#777777", BLACK = "#000000", NEAR_BLACK = "#0A0A0A";
const GREEN = "#4ADE80", YELLOW = "#FACC15", AMBER = "#F59E0B", RED = "#EF4444", CYAN = "#22D3EE";
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };

// ════════════════════════════════════════════════════════════════
// Recognition definitions
// ════════════════════════════════════════════════════════════════
const RECOGNITION_DEFS = {
  frat_streak_7: { icon: "\uD83D\uDD25", color: AMBER },
  frat_streak_30: { icon: "\uD83C\uDFC6", color: YELLOW },
  frat_streak_90: { icon: "\u2B50", color: CYAN },
  first_report: { icon: "\uD83D\uDCE2", color: GREEN },
  report_milestone_5: { icon: "\uD83D\uDCCA", color: GREEN },
  report_milestone_10: { icon: "\uD83C\uDF1F", color: CYAN },
  training_100pct: { icon: "\uD83C\uDF93", color: GREEN },
};

// ════════════════════════════════════════════════════════════════
// Pilot personal engagement card
// ════════════════════════════════════════════════════════════════
export function PilotEngagementCard({ engagement, recognitions, onAcknowledge }) {
  const metrics = useMemo(() => {
    const m = {};
    (engagement || []).forEach(e => { m[e.metric_type] = e; });
    return m;
  }, [engagement]);

  const streak = metrics.frat_streak?.current_value || 0;
  const bestStreak = metrics.frat_streak?.best_value || 0;
  const totalFrats = metrics.total_frats?.current_value || 0;
  const reportsSubmitted = metrics.reports_submitted?.current_value || 0;
  const trainingCurrent = metrics.training_current?.current_value === 1;
  const policyAcks = metrics.policy_ack?.current_value || 0;

  const unacked = (recognitions || []).filter(r => !r.acknowledged);

  return (
    <div style={{ ...card, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Your Safety Engagement</div>
        {unacked.length > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: BLACK, background: CYAN, padding: "2px 8px", borderRadius: 10 }}>{unacked.length} NEW</span>
        )}
      </div>

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {/* FRAT Streak */}
        <div style={{ background: NEAR_BLACK, borderRadius: 8, padding: "12px 10px", textAlign: "center", border: `1px solid ${streak >= 7 ? AMBER + "44" : BORDER}` }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>{streak > 0 ? "\uD83D\uDD25" : "\u2014"}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: streak >= 7 ? AMBER : WHITE, fontFamily: "Georgia,serif" }}>{streak}</div>
          <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>FRAT Streak</div>
          {bestStreak > streak && <div style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>Best: {bestStreak}</div>}
        </div>

        {/* Total FRATs */}
        <div style={{ background: NEAR_BLACK, borderRadius: 8, padding: "12px 10px", textAlign: "center", border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>{"\u2708"}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{totalFrats}</div>
          <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Total FRATs</div>
        </div>

        {/* Reports */}
        <div style={{ background: NEAR_BLACK, borderRadius: 8, padding: "12px 10px", textAlign: "center", border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>{"\u26A0"}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{reportsSubmitted}</div>
          <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Reports</div>
        </div>

        {/* Training */}
        <div style={{ background: NEAR_BLACK, borderRadius: 8, padding: "12px 10px", textAlign: "center", border: `1px solid ${trainingCurrent ? GREEN + "11" : BORDER}` }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>{"\uD83C\uDF93"}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: trainingCurrent ? GREEN : RED, marginTop: 4 }}>{trainingCurrent ? "CURRENT" : "NOT CURRENT"}</div>
          <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginTop: 2 }}>Training</div>
        </div>
      </div>

      {/* Recognitions */}
      {(recognitions || []).length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>Recognitions Earned</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(recognitions || []).map(r => {
              const def = RECOGNITION_DEFS[r.recognition_type] || { icon: "\u2605", color: WHITE };
              return (
                <div key={r.id}
                  onClick={() => !r.acknowledged && onAcknowledge?.(r.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 10px", borderRadius: 16,
                    background: r.acknowledged ? "transparent" : `${def.color}15`,
                    border: `1px solid ${r.acknowledged ? BORDER : def.color + "44"}`,
                    cursor: r.acknowledged ? "default" : "pointer",
                    position: "relative",
                  }}>
                  <span style={{ fontSize: 14 }}>{def.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: r.acknowledged ? MUTED : def.color }}>{r.title}</span>
                  {!r.acknowledged && (
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: CYAN, position: "absolute", top: -2, right: -2 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(recognitions || []).length === 0 && (
        <div style={{ fontSize: 11, color: MUTED, textAlign: "center", padding: "8px 0" }}>
          Submit FRATs, file reports, and complete training to earn recognitions
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Team engagement widget (admin/safety_manager only)
// ════════════════════════════════════════════════════════════════
export function TeamEngagementWidget({ orgEngagement, orgRecognitions, orgProfiles, records, reports }) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const stats = useMemo(() => {
    const activePilots = (orgProfiles || []).filter(p =>
      ["pilot", "chief_pilot", "safety_manager", "admin", "accountable_exec", "dispatcher"].includes(p.role)
    );
    const pilotIds = new Set(activePilots.map(p => p.id));

    // FRAT completion this month: % of pilots who submitted at least one FRAT this month
    const thisMonthFrats = (records || []).filter(r => new Date(r.timestamp) >= thisMonthStart);
    const pilotsWithFrat = new Set(thisMonthFrats.map(r => r.userId).filter(id => pilotIds.has(id)));
    const fratCompletionRate = pilotIds.size > 0 ? Math.round((pilotsWithFrat.size / pilotIds.size) * 100) : 0;

    // Streak data from engagement metrics
    const streakMetrics = (orgEngagement || []).filter(e => e.metric_type === "frat_streak" && pilotIds.has(e.user_id));
    const avgStreak = streakMetrics.length > 0
      ? (streakMetrics.reduce((s, e) => s + e.current_value, 0) / streakMetrics.length).toFixed(1)
      : "0";

    // Top 3 streaks
    const topStreaks = [...streakMetrics]
      .sort((a, b) => b.current_value - a.current_value)
      .slice(0, 3)
      .map(e => {
        const p = activePilots.find(p => p.id === e.user_id);
        return { name: p?.full_name || "Pilot", streak: e.current_value };
      });

    // Reports this month vs last month
    const reportsThisMonth = (reports || []).filter(r => new Date(r.created_at) >= thisMonthStart).length;
    const reportsLastMonth = (reports || []).filter(r => {
      const d = new Date(r.created_at);
      return d >= lastMonthStart && d < thisMonthStart;
    }).length;

    // Recognitions this month
    const recognitionsThisMonth = (orgRecognitions || []).filter(r => new Date(r.awarded_at) >= thisMonthStart).length;

    return { fratCompletionRate, avgStreak, topStreaks, reportsThisMonth, reportsLastMonth, recognitionsThisMonth, activePilotCount: pilotIds.size };
  }, [orgEngagement, orgRecognitions, orgProfiles, records, reports, thisMonthStart, lastMonthStart]);

  const reportDelta = stats.reportsThisMonth - stats.reportsLastMonth;

  return (
    <div style={{ ...card, padding: "18px 20px" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 14 }}>Team Engagement</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {/* FRAT Completion Rate */}
        <div style={{ background: NEAR_BLACK, borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: stats.fratCompletionRate >= 80 ? GREEN : stats.fratCompletionRate >= 50 ? YELLOW : RED, fontFamily: "Georgia,serif" }}>{stats.fratCompletionRate}%</div>
          <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>FRAT Completion</div>
          <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>this month</div>
        </div>

        {/* Average Streak */}
        <div style={{ background: NEAR_BLACK, borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: AMBER, fontFamily: "Georgia,serif" }}>{stats.avgStreak}</div>
          <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Avg Streak</div>
          <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{stats.activePilotCount} active pilots</div>
        </div>

        {/* Reports This Month */}
        <div style={{ background: NEAR_BLACK, borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{stats.reportsThisMonth}</div>
          <div style={{ fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Reports</div>
          <div style={{ fontSize: 9, color: reportDelta > 0 ? GREEN : reportDelta < 0 ? RED : MUTED, marginTop: 2 }}>
            {reportDelta > 0 ? `+${reportDelta}` : reportDelta} vs last month
          </div>
        </div>
      </div>

      {/* Top Streaks */}
      {stats.topStreaks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Top FRAT Streaks</div>
          {stats.topStreaks.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: i === 0 ? YELLOW : i === 1 ? OFF_WHITE : MUTED }}>{i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : "\uD83E\uDD49"}</span>
                <span style={{ fontSize: 11, color: OFF_WHITE }}>{s.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: AMBER }}>{s.streak} days</span>
            </div>
          ))}
        </div>
      )}

      {/* Recognitions This Month */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: NEAR_BLACK, borderRadius: 8 }}>
        <span style={{ fontSize: 10, color: MUTED }}>Recognitions awarded this month</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: CYAN }}>{stats.recognitionsThisMonth}</span>
      </div>
    </div>
  );
}
