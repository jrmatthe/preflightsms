// /api/create-org
// Creates organization during signup using service role (bypasses RLS)
// Accepts either a valid JWT or a userId (for email-confirmation-pending signups)

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Try JWT auth first; fall back to userId in body (for pre-confirmation signups)
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && !authHeader.endsWith("undefined")) {
    const { user, error: authError } = await verifyAuth(req);
    if (user) userId = user.id;
  }
  if (!userId && req.body.userId) {
    // Verify the user actually exists via service role
    const { data: userData } = await supabase.auth.admin.getUserById(req.body.userId);
    if (userData?.user) userId = userData.user.id;
  }
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // Handle profile creation for pre-confirmation signups
  if (req.body.action === "create-profile") {
    const { orgId, fullName, email: profileEmail } = req.body;
    if (!orgId) return res.status(400).json({ error: "orgId required" });
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId, org_id: orgId, full_name: fullName || "", email: profileEmail || "", role: "admin",
    });
    if (profileErr) return res.status(400).json({ error: profileErr.message });
    return res.status(200).json({ success: true });
  }

  const { name, slug, tier, feature_flags, subscription_status, max_aircraft } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });

  const { data, error } = await supabase.from("organizations").insert({
    name, slug, tier: tier || "starter", feature_flags: feature_flags || {},
    subscription_status: subscription_status || "trial",
    max_aircraft: max_aircraft || 5,
  }).select().single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
}
