// Shared auth helper for API routes
// Validates Supabase session tokens from the Authorization header

import { createClient } from "@supabase/supabase-js";

export async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return { user: null, error: "Supabase not configured" };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { user: null, error: error?.message || "Invalid token" };
  }

  return { user: data.user, error: null };
}
