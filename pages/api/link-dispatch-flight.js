// /api/link-dispatch-flight
// Links or unlinks a ForeFlight/SchedAero flight to a FRAT/flight.
// Uses service role to bypass RLS (pilots can't UPDATE foreflight_flights directly).

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { table, id, flight_id: lookupFlightId, frat_id, flight_id: linkFlightId, action } = req.body || {};
  if (!table) return res.status(400).json({ error: "Missing table" });
  if (table !== "foreflight_flights" && table !== "schedaero_trips") {
    return res.status(400).json({ error: "Invalid table" });
  }

  // Verify caller's org
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return res.status(403).json({ error: "Profile not found" });

  if (action === "unlink") {
    // Revert flight(s) back to pending by flight_id lookup
    const flightDbId = req.body.flight_db_id;
    if (!flightDbId) return res.status(400).json({ error: "Missing flight_db_id" });
    const { error } = await supabase
      .from(table)
      .update({ status: "pending", frat_id: null, flight_id: null, updated_at: new Date().toISOString() })
      .eq("flight_id", flightDbId)
      .eq("org_id", profile.org_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // Default action: link
  if (!id) return res.status(400).json({ error: "Missing id" });

  // Verify the row belongs to the caller's org
  const { data: row } = await supabase.from(table).select("org_id").eq("id", id).single();
  if (!row) return res.status(404).json({ error: "Flight not found" });
  if (profile.org_id !== row.org_id) {
    return res.status(403).json({ error: "Not authorized for this organization" });
  }

  const { error } = await supabase
    .from(table)
    .update({
      frat_id: frat_id || null,
      flight_id: linkFlightId || null,
      status: "frat_created",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
