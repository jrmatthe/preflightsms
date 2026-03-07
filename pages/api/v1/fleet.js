// GET /api/v1/fleet — List aircraft

import { verifyApiKey, setRateLimitHeaders, logApiRequest, hasPermission } from "../../../lib/apiKeyAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: `Method ${req.method} not allowed` });

  const startTime = Date.now();
  const { apiKey, org, supabase, rateLimit, error, status } = await verifyApiKey(req);
  if (error) return res.status(status || 401).json({ error });
  setRateLimitHeaders(res, rateLimit);

  if (!hasPermission(apiKey, "fleet:read")) {
    logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/fleet", 403, startTime);
    return res.status(403).json({ error: "Missing permission: fleet:read" });
  }

  const { data, error: qErr } = await supabase
    .from("aircraft")
    .select("id, type, registration, tail_number, status, notes, mel_items, created_at")
    .eq("org_id", org.id)
    .order("type", { ascending: true });

  logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/fleet", qErr ? 500 : 200, startTime);
  if (qErr) return res.status(500).json({ error: qErr.message });

  return res.status(200).json({ data: data || [] });
}
