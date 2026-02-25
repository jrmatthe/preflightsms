// GET /api/v1/reports — List safety reports (paginated)
// POST /api/v1/reports — Create a safety report (requires reports:write)

import { verifyApiKey, setRateLimitHeaders, logApiRequest, hasPermission } from "../../../../lib/apiKeyAuth";

export default async function handler(req, res) {
  const startTime = Date.now();
  const { apiKey, org, supabase, rateLimit, apiAccess, error, status } = await verifyApiKey(req);
  if (error) return res.status(status || 401).json({ error });
  setRateLimitHeaders(res, rateLimit);

  if (req.method === "GET") {
    if (!hasPermission(apiKey, "reports:read")) {
      logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/reports", 403, startTime);
      return res.status(403).json({ error: "Missing permission: reports:read" });
    }

    const { page = 1, per_page = 25, status: rptStatus, category, from_date, to_date } = req.query;
    const limit = Math.min(parseInt(per_page) || 25, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    let query = supabase
      .from("safety_reports")
      .select("id, report_code, category, severity, status, description, location, date_of_event, created_at, reporter_id", { count: "exact" })
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (rptStatus) query = query.eq("status", rptStatus);
    if (category) query = query.eq("category", category);
    if (from_date) query = query.gte("created_at", from_date);
    if (to_date) query = query.lte("created_at", to_date);

    const { data, error: qErr, count } = await query;
    logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/reports", qErr ? 500 : 200, startTime);
    if (qErr) return res.status(500).json({ error: qErr.message });

    return res.status(200).json({
      data: data || [],
      pagination: { page: parseInt(page) || 1, per_page: limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
    });
  }

  if (req.method === "POST") {
    if (apiAccess === "read_only") {
      logApiRequest(supabase, apiKey.id, org.id, "POST", "/api/v1/reports", 403, startTime);
      return res.status(403).json({ error: "Write access requires Enterprise plan" });
    }
    if (!hasPermission(apiKey, "reports:write")) {
      logApiRequest(supabase, apiKey.id, org.id, "POST", "/api/v1/reports", 403, startTime);
      return res.status(403).json({ error: "Missing permission: reports:write" });
    }

    const body = req.body;
    if (!body.category || !body.description) {
      logApiRequest(supabase, apiKey.id, org.id, "POST", "/api/v1/reports", 400, startTime);
      return res.status(400).json({ error: "Required fields: category, description" });
    }

    const reportCode = `SR-${Date.now().toString(36).toUpperCase()}`;
    const { data, error: insertErr } = await supabase
      .from("safety_reports")
      .insert({
        org_id: org.id,
        reporter_id: apiKey.created_by,
        report_code: reportCode,
        category: body.category,
        severity: body.severity || "low",
        description: body.description,
        location: body.location || "",
        date_of_event: body.date_of_event || new Date().toISOString().split("T")[0],
        status: "open",
        is_anonymous: body.is_anonymous || false,
      })
      .select()
      .single();

    logApiRequest(supabase, apiKey.id, org.id, "POST", "/api/v1/reports", insertErr ? 500 : 201, startTime);
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.status(201).json({ data });
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
