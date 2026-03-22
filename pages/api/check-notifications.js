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
import { verifyAuth } from "../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  // Auth: either cron secret OR authenticated user with orgId param
  const authHeader = req.headers["authorization"];
  const cronSecret = req.headers["x-cron-secret"] || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
  const orgIdParam = req.query.orgId;
  const isCron = !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

  if (!isCron && !orgIdParam) {
    return res.status(401).json({ error: "Unauthorized — provide secret or orgId" });
  }

  // When using orgId mode, require a valid Supabase auth token and verify org membership
  if (!isCron && orgIdParam) {
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });
    const tmpSb = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await tmpSb.from("profiles").select("org_id").eq("id", user.id).single();
    if (!callerProfile || callerProfile.org_id !== orgIdParam) {
      return res.status(403).json({ error: "Not a member of this organization" });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();
    const results = { training_expiring: 0, training_admin: 0, action_overdue: 0, action_due_soon: 0 };
    const sevenDaysAgoISO = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Skip cancelled/dormant orgs in cron mode
    let cancelledOrgIds = new Set();
    if (isCron) {
      const { data: cancelledOrgs } = await supabase
        .from("organizations")
        .select("id")
        .eq("subscription_status", "cancelled");
      cancelledOrgIds = new Set((cancelledOrgs || []).map(o => o.id));
    }

    // ── 1. Training Expiring / Expired ───────────────────────────
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + 30);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let trainingQuery = supabase
      .from("training_records")
      .select("*, user:profiles!training_records_user_id_fkey(id, full_name, org_id)")
      .not("expiry_date", "is", null)
      .lte("expiry_date", thresholdDate.toISOString().slice(0, 10))
      .gte("expiry_date", thirtyDaysAgo.toISOString().slice(0, 10));
    if (orgIdParam) trainingQuery = trainingQuery.eq("org_id", orgIdParam);

    const { data: expiringRecords } = await trainingQuery;

    if (expiringRecords?.length) {
      // Fetch ALL existing recent training_expiring notifications upfront
      const relevantOrgIds = [...new Set(expiringRecords.map(r => r.user?.org_id).filter(Boolean))];
      let existingTrainingNotifs = [];
      if (relevantOrgIds.length > 0) {
        const { data: notifs } = await supabase
          .from("notifications")
          .select("id, org_id, target_user_id, body")
          .eq("type", "training_expiring")
          .in("org_id", relevantOrgIds)
          .gte("created_at", sevenDaysAgoISO);
        existingTrainingNotifs = notifs || [];
      }

      const pendingInserts = [];

      for (const record of expiringRecords) {
        const user = record.user;
        if (!user?.org_id || !user?.id) continue;
        if (cancelledOrgIds.has(user.org_id)) continue;

        const expiryDate = new Date(record.expiry_date);
        const isExpired = expiryDate < now;
        const daysUntil = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        const daysAgo = Math.floor((now - expiryDate) / (1000 * 60 * 60 * 24));

        const userBodyText = isExpired
          ? `${record.title} expired ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago (${user.full_name || "Unknown"})`
          : `${record.title} expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} (${user.full_name || "Unknown"})`;

        // ── 1a. Per-user notification ──
        const hasExistingUser = existingTrainingNotifs.some(n =>
          n.org_id === user.org_id &&
          n.target_user_id === user.id &&
          n.body?.toLowerCase().includes(record.title.toLowerCase())
        );

        if (!hasExistingUser) {
          pendingInserts.push({
            org_id: user.org_id,
            type: "training_expiring",
            title: isExpired ? "Training Expired" : "Training Expiring Soon",
            body: userBodyText,
            link_tab: "cbt",
            target_user_id: user.id,
            target_roles: null,
          });
          results.training_expiring++;
        }

        // ── 1b. Admin / safety-manager notification ──
        const adminBodyText = isExpired
          ? `${user.full_name || "Unknown"}'s ${record.title} expired ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`
          : `${user.full_name || "Unknown"}'s ${record.title} expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`;

        const hasExistingAdmin = existingTrainingNotifs.some(n =>
          n.org_id === user.org_id &&
          n.target_user_id === null &&
          n.body?.toLowerCase().includes(record.title.toLowerCase()) &&
          n.body?.toLowerCase().includes((user.full_name || "Unknown").toLowerCase())
        );

        if (!hasExistingAdmin) {
          pendingInserts.push({
            org_id: user.org_id,
            type: "training_expiring",
            title: isExpired ? "Training Expired" : "Training Expiring Soon",
            body: adminBodyText,
            link_tab: "cbt",
            target_user_id: null,
            target_roles: ["admin", "safety_manager"],
          });
          results.training_admin++;
        }
      }

      // Batch insert all training notifications
      if (pendingInserts.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < pendingInserts.length; i += BATCH_SIZE) {
          await supabase.from("notifications").insert(pendingInserts.slice(i, i + BATCH_SIZE));
        }
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

    // Fetch ALL existing recent action notifications upfront for both overdue and due_soon
    const actionOrgIds = [
      ...new Set([
        ...(overdueActions || []).map(a => a.org_id),
        ...(dueSoonActions || []).map(a => a.org_id),
      ].filter(Boolean))
    ];

    let existingActionNotifs = [];
    if (actionOrgIds.length > 0) {
      const { data: notifs } = await supabase
        .from("notifications")
        .select("id, org_id, type, body")
        .in("type", ["action_overdue", "action_due_soon"])
        .in("org_id", actionOrgIds)
        .gte("created_at", sevenDaysAgoISO);
      existingActionNotifs = notifs || [];
    }

    const actionInserts = [];

    if (overdueActions?.length) {
      for (const action of overdueActions) {
        if (cancelledOrgIds.has(action.org_id)) continue;

        const identifier = (action.action_code || action.title || "").toLowerCase();
        const hasExisting = existingActionNotifs.some(n =>
          n.org_id === action.org_id &&
          n.type === "action_overdue" &&
          n.body?.toLowerCase().includes(identifier)
        );

        if (hasExisting) continue;

        actionInserts.push({
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

    if (dueSoonActions?.length) {
      for (const action of dueSoonActions) {
        if (cancelledOrgIds.has(action.org_id)) continue;
        const daysUntil = Math.ceil((new Date(action.due_date) - now) / (1000 * 60 * 60 * 24));

        const identifier = (action.action_code || action.title || "").toLowerCase();
        const hasExisting = existingActionNotifs.some(n =>
          n.org_id === action.org_id &&
          n.type === "action_due_soon" &&
          n.body?.toLowerCase().includes(identifier)
        );

        if (hasExisting) continue;

        actionInserts.push({
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

    // Batch insert all action notifications
    if (actionInserts.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < actionInserts.length; i += BATCH_SIZE) {
        await supabase.from("notifications").insert(actionInserts.slice(i, i + BATCH_SIZE));
      }
    }

    return res.status(200).json({
      message: `Created ${results.training_expiring} training (user), ${results.training_admin} training (admin), ${results.action_overdue} overdue, ${results.action_due_soon} due-soon notifications`,
      results,
      checked: now.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
