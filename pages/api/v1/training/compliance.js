// GET /api/v1/training/compliance — Training compliance summary per user

import { verifyApiKey, setRateLimitHeaders, logApiRequest, hasPermission } from "../../../../lib/apiKeyAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: `Method ${req.method} not allowed` });

  const startTime = Date.now();
  const { apiKey, org, supabase, rateLimit, error, status } = await verifyApiKey(req);
  if (error) return res.status(status || 401).json({ error });
  setRateLimitHeaders(res, rateLimit);

  if (!hasPermission(apiKey, "training:read")) {
    logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/training/compliance", 403, startTime);
    return res.status(403).json({ error: "Missing permission: training:read" });
  }

  // Get all profiles, requirements, and records
  const [profilesRes, reqsRes, recsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").eq("org_id", org.id),
    supabase.from("training_requirements").select("*").eq("org_id", org.id),
    supabase.from("training_records").select("*").eq("org_id", org.id),
  ]);

  if (profilesRes.error || reqsRes.error || recsRes.error) {
    logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/training/compliance", 500, startTime);
    return res.status(500).json({ error: "Failed to fetch training data" });
  }

  const profiles = profilesRes.data || [];
  const requirements = reqsRes.data || [];
  const records = recsRes.data || [];

  const compliance = profiles.map(p => {
    const userRecords = records.filter(r => r.user_id === p.id);
    const reqStatus = requirements.map(req => {
      const matching = userRecords.filter(r => r.requirement_id === req.id);
      const latest = matching.sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))[0];
      let current = false;
      if (latest) {
        if (req.recurrence_months && req.recurrence_months > 0) {
          const completedAt = new Date(latest.completed_at || latest.created_at);
          const expiresAt = new Date(completedAt);
          expiresAt.setMonth(expiresAt.getMonth() + req.recurrence_months);
          current = expiresAt > new Date();
        } else {
          current = true;
        }
      }
      return { requirement_id: req.id, requirement_name: req.name, current, last_completed: latest?.completed_at || latest?.created_at || null };
    });

    const totalReqs = reqStatus.length;
    const currentCount = reqStatus.filter(r => r.current).length;
    return {
      user_id: p.id,
      full_name: p.full_name,
      role: p.role,
      total_requirements: totalReqs,
      completed: currentCount,
      compliance_pct: totalReqs > 0 ? Math.round((currentCount / totalReqs) * 100) : 100,
      requirements: reqStatus,
    };
  });

  logApiRequest(supabase, apiKey.id, org.id, "GET", "/api/v1/training/compliance", 200, startTime);
  return res.status(200).json({ data: compliance });
}
