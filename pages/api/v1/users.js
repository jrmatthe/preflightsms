// GET /api/v1/users — List users with roles (no passwords/tokens)

import { verifyApiKey, setRateLimitHeaders, logApiRequest, hasPermission } from "../../../lib/apiKeyAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: `Method ${req.method} not allowed` });

  const startTime = Date.now();
  const { apiKey, org, supabase, rateLimit, error, status } = await verifyApiKey(req);
  if (error) return res.status(status || 401).json({ error });
  setRateLimitHeaders(res, rateLimit);

  if (!hasPermission(apiKey, "users:read")) {
    logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/users", 403, startTime);
    return res.status(403).json({ error: "Missing permission: users:read" });
  }

  const { data, error: qErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, permissions, created_at")
    .eq("org_id", org.id)
    .order("full_name", { ascending: true });

  logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/users", qErr ? 500 : 200, startTime);
  if (qErr) return res.status(500).json({ error: qErr.message });

  return res.status(200).json({ data: data || [] });
}
