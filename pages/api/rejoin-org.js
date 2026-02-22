// /api/rejoin-org
// Handles re-invitation of previously removed users.
// Uses service role to update their auth password and upsert their profile.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const { email, password, fullName, orgId, role } = req.body;
  if (!email || !password || !orgId) return res.status(400).json({ error: "Missing required fields" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find the existing auth user by email
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) return res.status(500).json({ error: listErr.message });

  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user) return res.status(404).json({ error: "User not found" });

  // Update their password to the new one they entered
  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Upsert their profile
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: user.id,
    org_id: orgId,
    full_name: fullName || email,
    email: email.toLowerCase().trim(),
    role: role || "pilot",
  }, { onConflict: "id" });
  if (profileErr) return res.status(500).json({ error: profileErr.message });

  return res.status(200).json({ success: true, userId: user.id });
}
