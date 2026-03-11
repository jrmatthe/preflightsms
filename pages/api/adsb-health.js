// /api/adsb-health — Hourly cron for ADS-B provider health monitoring
// Checks rolling success rate, creates degradation alerts, runs cleanup

import { createClient } from "@supabase/supabase-js";

const DEGRADED_THRESHOLD = 0.70; // alert if success rate < 70%
const MIN_POLLS = 5; // need at least 5 polls in window to evaluate

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ error: "POST or GET only" });

  const authHeader = req.headers["authorization"];
  const cronSecret = req.headers["x-cron-secret"] || req.query.secret || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60000).toISOString();

    // Get health entries from last 60 minutes
    const { data: healthRows } = await supabase
      .from("adsb_provider_health")
      .select("provider, success, response_time_ms")
      .gte("created_at", oneHourAgo);

    const stats = {};
    for (const row of (healthRows || [])) {
      if (!stats[row.provider]) {
        stats[row.provider] = { total: 0, success: 0, totalMs: 0 };
      }
      stats[row.provider].total++;
      if (row.success) stats[row.provider].success++;
      stats[row.provider].totalMs += row.response_time_ms || 0;
    }

    const providerStats = {};
    const degraded = [];

    for (const [provider, s] of Object.entries(stats)) {
      const rate = s.total > 0 ? s.success / s.total : 1;
      const avgMs = s.total > 0 ? Math.round(s.totalMs / s.total) : 0;
      providerStats[provider] = {
        total_polls: s.total,
        successful: s.success,
        success_rate: Math.round(rate * 100),
        avg_response_ms: avgMs,
      };

      if (rate < DEGRADED_THRESHOLD && s.total >= MIN_POLLS) {
        degraded.push(provider);
      }
    }

    // Run cleanup
    const { error: cleanupErr } = await supabase.rpc("cleanup_adsb_data");
    if (cleanupErr) {
      console.error("[adsb-health] Cleanup error:", cleanupErr.message);
    }

    return res.status(200).json({
      providers: providerStats,
      degraded,
      cleanup: cleanupErr ? "failed" : "ok",
      checked: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[adsb-health] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
