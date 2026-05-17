// /api/team-signin-status
// Returns a map of { userId: hasSignedIn (boolean) } for every member of an org.
// Used by the admin Team Members list to distinguish "Invited" (pre-provisioned)
// vs "Joined" (actually completed first sign-in).

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const orgId = req.query.orgId;
  if (!orgId) return res.status(400).json({ error: "orgId is required" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify caller is a member of this org
  const { data: callerProfile, error: callerErr } = await supabase
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", user.id)
    .eq("org_id", orgId)
    .single();
  if (callerErr || !callerProfile) return res.status(403).json({ error: "Not a member of this organization" });

  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("org_id", orgId);
  if (profilesErr) return res.status(500).json({ error: profilesErr.message });

  const targetIds = new Set((profiles || []).map(p => p.id));
  const signedIn = {};

  // Page through auth.users (admin endpoint paginates at 1000/page by default).
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return res.status(500).json({ error: error.message });
    const users = data?.users || [];
    for (const u of users) {
      if (targetIds.has(u.id)) signedIn[u.id] = !!u.last_sign_in_at;
    }
    if (users.length < perPage) break;
    page++;
    if (page > 20) break; // hard ceiling — 20k users is more than any org
  }

  return res.status(200).json({ signedIn });
}
