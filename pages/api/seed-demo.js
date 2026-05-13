// /api/seed-demo — Thin HTTP wrapper around lib/seedDemo.
// POST with Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>.

import { seedDemoOrg } from "../../lib/seedDemo";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token || token !== SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: "Unauthorized — provide service role key as Bearer token" });
  }

  const result = await seedDemoOrg();
  return res.status(result.success ? 200 : 500).json(result);
}
