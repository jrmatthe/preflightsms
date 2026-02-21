// /api/create-org
// Creates organization during signup using service role (bypasses RLS)

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const { name, slug, tier, feature_flags, subscription_status, max_aircraft } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.from("organizations").insert({
    name, slug, tier: tier || "starter", feature_flags: feature_flags || {},
    subscription_status: subscription_status || "trial",
    max_aircraft: max_aircraft || 5,
  }).select().single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
}
