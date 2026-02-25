// GET /api/v1/frats/:id — Single FRAT detail

import { verifyApiKey, setRateLimitHeaders, logApiRequest, hasPermission } from "../../../../lib/apiKeyAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: `Method ${req.method} not allowed` });

  const startTime = Date.now();
  const { apiKey, org, supabase, rateLimit, error, status } = await verifyApiKey(req);
  if (error) return res.status(status || 401).json({ error });
  setRateLimitHeaders(res, rateLimit);

  if (!hasPermission(apiKey, "frats:read")) {
    logApiRequest(supabase, apiKey.id, org.id, "GET", `/api/v1/frats/${req.query.id}`, 403, startTime);
    return res.status(403).json({ error: "Missing permission: frats:read" });
  }

  const { id } = req.query;
  const { data, error: qErr } = await supabase
    .from("frat_submissions")
    .select("*")
    .eq("id", id)
    .eq("org_id", org.id)
    .single();

  logApiRequest(supabase, apiKey.id, org.id, "GET", `/api/v1/frats/${id}`, qErr ? (qErr.code === "PGRST116" ? 404 : 500) : 200, startTime);
  if (qErr) {
    if (qErr.code === "PGRST116") return res.status(404).json({ error: "FRAT not found" });
    return res.status(500).json({ error: qErr.message });
  }

  return res.status(200).json({ data });
}
