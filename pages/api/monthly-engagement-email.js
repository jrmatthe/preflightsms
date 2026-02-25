// /api/monthly-engagement-email
// Sends monthly safety engagement summary to each pilot
// Called by cron job or manually by admin
// Requires SUPABASE_SERVICE_KEY (service role — no auth header needed for cron)
// Or a valid admin auth token for manual trigger

import { createClient } from "@supabase/supabase-js";

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });
  if (!resendKey) return res.status(500).json({ error: "Resend not configured" });

  // Auth: either cron secret or valid admin session
  const authHeader = req.headers.authorization;
  const cronHeader = req.headers["x-cron-secret"];
  if (cronHeader !== cronSecret && (!authHeader || !authHeader.startsWith("Bearer "))) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // If auth token provided, verify admin
  if (authHeader && authHeader.startsWith("Bearer ") && cronHeader !== cronSecret) {
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) return res.status(401).json({ error: "Invalid token" });
    const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
    if (!callerProfile || !["admin", "safety_manager"].includes(callerProfile.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }
  }

  try {
    // Get all orgs with monthly engagement email enabled
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, monthly_engagement_email, gamification_enabled")
      .eq("monthly_engagement_email", true);

    if (!orgs || orgs.length === 0) {
      return res.status(200).json({ message: "No orgs with monthly email enabled", sent: 0 });
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    let totalSent = 0;

    for (const org of orgs) {
      if (org.gamification_enabled === false) continue;

      // Get all profiles for this org
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("org_id", org.id)
        .not("email", "is", null);

      if (!profiles || profiles.length === 0) continue;

      // Get engagement metrics for all org members
      const { data: engagement } = await supabase
        .from("pilot_engagement")
        .select("*")
        .eq("org_id", org.id);

      // Get recognitions awarded this month
      const { data: recognitions } = await supabase
        .from("safety_recognitions")
        .select("*")
        .eq("org_id", org.id)
        .gte("awarded_at", thisMonthStart.toISOString());

      // Get FRAT count this month per user
      const { data: frats } = await supabase
        .from("frat_submissions")
        .select("user_id, created_at")
        .eq("org_id", org.id)
        .gte("created_at", thisMonthStart.toISOString());

      // Get report count this month per user
      const { data: reports } = await supabase
        .from("safety_reports")
        .select("reporter_id, created_at")
        .eq("org_id", org.id)
        .gte("created_at", thisMonthStart.toISOString());

      for (const pilot of profiles) {
        const userMetrics = {};
        (engagement || []).filter(e => e.user_id === pilot.id).forEach(e => { userMetrics[e.metric_type] = e; });

        const streak = userMetrics.frat_streak?.current_value || 0;
        const monthFrats = (frats || []).filter(f => f.user_id === pilot.id).length;
        const monthReports = (reports || []).filter(r => r.reporter_id === pilot.id).length;
        const trainingCurrent = userMetrics.training_current?.current_value === 1;
        const userRecognitions = (recognitions || []).filter(r => r.user_id === pilot.id);

        const pilotName = escapeHtml(pilot.full_name || "Pilot");
        const orgNameSafe = escapeHtml(org.name);

        const recognitionBadges = userRecognitions.length > 0
          ? userRecognitions.map(r => `<span style="display:inline-block;padding:4px 10px;border-radius:12px;background:#22d3ee22;border:1px solid #22d3ee44;font-size:11px;color:#22d3ee;margin:2px 4px">${escapeHtml(r.title)}</span>`).join("")
          : '<span style="font-size:11px;color:#666">Keep going — recognitions are earned through consistency</span>';

        const trainingColor = trainingCurrent ? "#4ade80" : "#ef4444";
        const trainingLabel = trainingCurrent ? "CURRENT" : "NOT CURRENT";

        const encouragement = streak >= 30 ? "Outstanding consistency — you're a safety leader!"
          : streak >= 7 ? "Great streak going — keep the momentum!"
          : monthFrats >= 3 ? "Solid month of safety engagement. Keep it up!"
          : "Every FRAT submitted makes your operation safer.";

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "PreflightSMS <onboarding@resend.dev>",
              to: [pilot.email],
              subject: `Your ${monthName} Safety Summary — PreflightSMS`,
              html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#111;color:#e5e5e5;border-radius:12px;overflow:hidden;border:1px solid #333">
  <div style="background:#0a0a0a;padding:20px 24px;border-bottom:1px solid #333">
    <div style="font-size:16px;font-weight:700;color:#fff">Monthly Safety Brief</div>
    <div style="font-size:11px;color:#888;margin-top:2px">${monthName} · ${orgNameSafe}</div>
  </div>
  <div style="padding:24px">
    <div style="font-size:14px;color:#fff;margin-bottom:16px">Hey ${pilotName},</div>
    <div style="font-size:12px;color:#a3a3a3;margin-bottom:20px">Here's your safety engagement summary for the month.</div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr>
        <td style="padding:12px;text-align:center;background:#1a1a1a;border-radius:8px 0 0 0">
          <div style="font-size:24px;font-weight:800;color:${streak >= 7 ? '#f59e0b' : '#fff'}">${streak}</div>
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px">FRAT Streak</div>
        </td>
        <td style="padding:12px;text-align:center;background:#1a1a1a">
          <div style="font-size:24px;font-weight:800;color:#fff">${monthFrats}</div>
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px">FRATs This Month</div>
        </td>
        <td style="padding:12px;text-align:center;background:#1a1a1a">
          <div style="font-size:24px;font-weight:800;color:#fff">${monthReports}</div>
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px">Reports</div>
        </td>
        <td style="padding:12px;text-align:center;background:#1a1a1a;border-radius:0 8px 0 0">
          <div style="font-size:13px;font-weight:800;color:${trainingColor}">${trainingLabel}</div>
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px">Training</div>
        </td>
      </tr>
    </table>

    <div style="margin-bottom:16px">
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Recognitions This Month</div>
      ${recognitionBadges}
    </div>

    <div style="padding:12px 16px;background:#1c1917;border:1px solid #44403c;border-radius:8px;font-size:12px;color:#d6d3d1;font-style:italic">
      ${encouragement}
    </div>
  </div>
  <div style="padding:12px 24px;border-top:1px solid #333;font-size:10px;color:#666;text-align:center">
    ${orgNameSafe} · Sent by PreflightSMS
  </div>
</div>`,
            }),
          });
          totalSent++;
        } catch (e) {
          console.error(`Failed to send email to ${pilot.email}:`, e);
        }
      }
    }

    return res.status(200).json({ message: `Sent ${totalSent} engagement emails`, sent: totalSent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
