// GET /api/v1/frats — List FRATs with filters (paginated)
// POST /api/v1/frats — Create a draft FRAT (requires frats:write)

import { verifyApiKey, setRateLimitHeaders, logApiRequest, hasPermission } from "../../../../lib/apiKeyAuth";

export default async function handler(req, res) {
  const startTime = Date.now();
  const { apiKey, org, supabase, rateLimit, apiAccess, error, status } = await verifyApiKey(req);
  if (error) {
    return res.status(status || 401).json({ error });
  }
  setRateLimitHeaders(res, rateLimit);

  if (req.method === "GET") {
    if (!hasPermission(apiKey, "frats:read")) {
      logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/frats", 403, startTime);
      return res.status(403).json({ error: "Missing permission: frats:read" });
    }

    const { page = 1, per_page = 25, status: fratStatus, pilot, aircraft, from_date, to_date } = req.query;
    const limit = Math.min(parseInt(per_page) || 25, 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    let query = supabase
      .from("frat_submissions")
      .select("id, frat_code, pilot, aircraft, tail_number, departure, destination, score, risk_level, factors, approval_status, flight_date, created_at, fatigue_score, fatigue_risk_level", { count: "exact" })
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fratStatus) query = query.eq("approval_status", fratStatus);
    if (pilot) query = query.ilike("pilot", `%${pilot}%`);
    if (aircraft) query = query.ilike("aircraft", `%${aircraft}%`);
    if (from_date) query = query.gte("created_at", from_date);
    if (to_date) query = query.lte("created_at", to_date);

    const { data, error: qErr, count } = await query;
    logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/frats", qErr ? 500 : 200, startTime);
    if (qErr) return res.status(500).json({ error: qErr.message });

    return res.status(200).json({
      data: data || [],
      pagination: { page: parseInt(page) || 1, per_page: limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
    });
  }

  if (req.method === "POST") {
    if (apiAccess === "read_only") {
      logApiRequest(supabase, apiKey.id, org.id, "POST", "/api/v1/frats", 403, startTime);
      return res.status(403).json({ error: "Write access requires Enterprise plan" });
    }
    if (!hasPermission(apiKey, "frats:write")) {
      logApiRequest(supabase, apiKey.id, org.id, "POST", "/api/v1/frats", 403, startTime);
      return res.status(403).json({ error: "Missing permission: frats:write" });
    }

    const body = req.body;
    if (!body.pilot || !body.aircraft || !body.departure || !body.destination) {
      logApiRequest(supabase, apiKey.id, org.id, "POST", "/api/v1/frats", 400, startTime);
      return res.status(400).json({ error: "Required fields: pilot, aircraft, departure, destination" });
    }

    const fratCode = `FRAT-${Date.now().toString(36).toUpperCase()}`;
    const { data, error: insertErr } = await supabase
      .from("frat_submissions")
      .insert({
        org_id: org.id,
        user_id: apiKey.created_by,
        frat_code: fratCode,
        pilot: body.pilot,
        aircraft: body.aircraft,
        tail_number: body.tail_number || "",
        departure: body.departure,
        destination: body.destination,
        cruise_alt: body.cruise_alt || "",
        flight_date: body.flight_date || new Date().toISOString().split("T")[0],
        etd: body.etd || "",
        ete: body.ete || "",
        eta: body.eta || "",
        fuel_lbs: body.fuel_lbs || "",
        num_crew: body.num_crew || "",
        num_pax: body.num_pax || "",
        score: body.score || 0,
        risk_level: body.risk_level || "LOW",
        factors: body.factors || [],
        remarks: body.remarks || "",
        approval_status: "auto_approved",
      })
      .select()
      .single();

    logApiRequest(supabase, apiKey.id, org.id, "POST", "/api/v1/frats", insertErr ? 500 : 201, startTime);
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.status(201).json({ data });
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
