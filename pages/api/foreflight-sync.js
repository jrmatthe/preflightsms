// /api/foreflight-sync — Vercel cron wrapper
// Calls the Supabase Edge Function foreflight-sync every 5 minutes.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ error: "POST or GET only" });

  const authHeader = req.headers["authorization"];
  const cronSecret = req.headers["x-cron-secret"] || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "Missing Supabase config" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.functions.invoke("foreflight-sync", {
      body: {},
    });

    if (error) {
      console.error("[foreflight-sync] Edge function error:", error);
      return res.status(500).json({ error: error.message || "Sync failed" });
    }

    return res.status(200).json({ ok: true, result: data });
  } catch (err) {
    console.error("[foreflight-sync] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
