// /api/process-deletions
// Daily cron job: permanently deletes organizations whose grace period has expired
// Secured with CRON_SECRET (same pattern as check-overdue)

import { createClient } from "@supabase/supabase-js";
import { deleteOrganization } from "../../lib/deleteOrg";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ error: "POST or GET only" });

  const authHeader = req.headers["authorization"];
  const cronSecret = req.headers["x-cron-secret"] || req.query.secret || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find orgs with expired grace period
    const { data: orgs, error: queryErr } = await supabase
      .from("organizations")
      .select("id, name")
      .not("scheduled_deletion_at", "is", null)
      .lte("scheduled_deletion_at", new Date().toISOString());

    if (queryErr) return res.status(500).json({ error: queryErr.message });

    if (!orgs || orgs.length === 0) {
      return res.status(200).json({ success: true, deleted: 0 });
    }

    const results = [];
    for (const org of orgs) {
      try {
        const result = await deleteOrganization(supabase, org.id);
        results.push({ org_id: org.id, name: org.name, success: true, deleted_users: result.deleted_users });
      } catch (err) {
        results.push({ org_id: org.id, name: org.name, success: false, error: err.message });
      }
    }

    return res.status(200).json({ success: true, deleted: results.filter(r => r.success).length, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
