// /api/check-notifications — In-app notification generator
// Two modes:
//   1. Cron mode: called with x-cron-secret header, checks ALL orgs
//   2. Client mode: called with ?orgId=xxx, checks just that org
// Creates notifications for:
//   - Training records expiring within 30 days
//   - Corrective actions past due
//   - Corrective actions due within 7 days
// Required env vars: SUPABASE_SERVICE_KEY

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  // Auth: either cron secret OR orgId param
  const cronSecret = req.headers["x-cron-secret"] || req.query.secret;
  const orgIdParam = req.query.orgId;
  const isCron = cronSecret === process.env.CRON_SECRET && process.env.CRON_SECRET;

  if (!isCron && !orgIdParam) {
    return res.status(401).json({ error: "Unauthorized — provide secret or orgId" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();
    const results = { training_expiring: 0, action_overdue: 0, action_due_soon: 0 };

    // ── 1. Training Expiring (within 30 days) ───────────────────
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + 30);

    let trainingQuery = supabase
      .from("training_records")
      .select("*, user:profiles!training_records_user_id_fkey(id, full_name, org_id)")
      .not("expiry_date", "is", null)
      .lte("expiry_date", thresholdDate.toISOString().slice(0, 10))
      .gte("expiry_date", now.toISOString().slice(0, 10));
    if (orgIdParam) trainingQuery = trainingQuery.eq("org_id", orgIdParam);

    const { data: expiringRecords } = await trainingQuery;

    if (expiringRecords?.length) {
      for (const record of expiringRecords) {
        const user = record.user;
        if (!user?.org_id || !user?.id) continue;

        const daysUntil = Math.ceil((new Date(record.expiry_date) - now) / (1000 * 60 * 60 * 24));
        const bodyText = `${record.title} expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} (${user.full_name || "Unknown"})`;

        // Check for duplicate within past 7 days
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("org_id", user.org_id)
          .eq("type", "training_expiring")
          .eq("target_user_id", user.id)
          .ilike("body", `%${record.title}%`)
          .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existing?.length) continue;

        await supabase.from("notifications").insert({
          org_id: user.org_id,
          type: "training_expiring",
          title: "Training Expiring Soon",
          body: bodyText,
          link_tab: "cbt",
          target_user_id: user.id,
          target_roles: null,
        });
        results.training_expiring++;
      }
    }

    // ── 2. Corrective Actions Overdue ───────────────────────────
    let overdueQuery = supabase
      .from("corrective_actions")
      .select("*")
      .not("due_date", "is", null)
      .lt("due_date", now.toISOString().slice(0, 10))
      .not("status", "in", '("completed","cancelled")');
    if (orgIdParam) overdueQuery = overdueQuery.eq("org_id", orgIdParam);

    const { data: overdueActions } = await overdueQuery;

    if (overdueActions?.length) {
      for (const action of overdueActions) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("org_id", action.org_id)
          .eq("type", "action_overdue")
          .ilike("body", `%${action.action_code || action.title}%`)
          .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existing?.length) continue;

        await supabase.from("notifications").insert({
          org_id: action.org_id,
          type: "action_overdue",
          title: "Corrective Action Overdue",
          body: `${action.action_code || action.title || "Untitled"} is past due (${action.due_date})`,
          link_tab: "actions",
          target_roles: ["admin", "safety_manager"],
          target_user_id: null,
        });
        results.action_overdue++;
      }
    }

    // ── 3. Corrective Actions Due Within 7 Days ─────────────────
    const dueSoonDate = new Date(now);
    dueSoonDate.setDate(dueSoonDate.getDate() + 7);

    let dueSoonQuery = supabase
      .from("corrective_actions")
      .select("*")
      .not("due_date", "is", null)
      .gte("due_date", now.toISOString().slice(0, 10))
      .lte("due_date", dueSoonDate.toISOString().slice(0, 10))
      .not("status", "in", '("completed","cancelled")');
    if (orgIdParam) dueSoonQuery = dueSoonQuery.eq("org_id", orgIdParam);

    const { data: dueSoonActions } = await dueSoonQuery;

    if (dueSoonActions?.length) {
      for (const action of dueSoonActions) {
        const daysUntil = Math.ceil((new Date(action.due_date) - now) / (1000 * 60 * 60 * 24));

        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("org_id", action.org_id)
          .eq("type", "action_due_soon")
          .ilike("body", `%${action.action_code || action.title}%`)
          .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existing?.length) continue;

        await supabase.from("notifications").insert({
          org_id: action.org_id,
          type: "action_due_soon",
          title: "Corrective Action Due Soon",
          body: `${action.action_code || action.title || "Untitled"} due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          link_tab: "actions",
          target_roles: ["admin", "safety_manager"],
          target_user_id: null,
        });
        results.action_due_soon++;
      }
    }

    return res.status(200).json({
      message: `Created ${results.training_expiring} training, ${results.action_overdue} overdue, ${results.action_due_soon} due-soon notifications`,
      results,
      checked: now.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
