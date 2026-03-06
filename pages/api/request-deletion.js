// /api/request-deletion
// Schedules an organization for deletion.
// - Non-paid orgs (trial/free/canceled): sets scheduled_deletion_at = NOW + 14 days (immediate read-only)
// - Paid orgs (active/past_due): cancels Stripe subscription at period end, sets deletion_reason.
//   The 14-day countdown starts when the Stripe webhook fires customer.subscription.deleted.

import Stripe from "stripe";
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

  try {
    const { orgId, reason } = req.body;
    if (!orgId) return res.status(400).json({ error: "orgId required" });
    if (!reason) return res.status(400).json({ error: "reason required" });

    // Verify caller belongs to org and has admin-level role
    const { data: callerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, org_id, role")
      .eq("id", user.id)
      .eq("org_id", orgId)
      .single();

    if (profileErr || !callerProfile) {
      return res.status(403).json({ error: "You are not a member of this organization" });
    }

    const adminRoles = ["admin", "safety_manager", "accountable_exec", "chief_pilot"];
    if (!adminRoles.includes(callerProfile.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, subscription_status, stripe_subscription_id")
      .eq("id", orgId)
      .single();

    if (orgErr || !org) return res.status(404).json({ error: "Organization not found" });

    const isPaid = ["active", "past_due"].includes(org.subscription_status);
    const updateFields = { deletion_reason: reason };

    if (isPaid && org.stripe_subscription_id) {
      // Cancel Stripe subscription at period end — user keeps access until billing cycle ends
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(500).json({ error: "Stripe not configured" });

      const stripe = new Stripe(stripeKey);
      await stripe.subscriptions.update(org.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      // Don't set scheduled_deletion_at yet — the Stripe webhook will set it
      // when customer.subscription.deleted fires after the billing cycle ends
    } else {
      // Non-paid orgs: start 14-day countdown immediately
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 14);
      updateFields.scheduled_deletion_at = scheduledDate.toISOString();
    }

    const { error: updateErr } = await supabase
      .from("organizations")
      .update(updateFields)
      .eq("id", orgId);

    if (updateErr) return res.status(400).json({ error: updateErr.message });

    return res.status(200).json({
      success: true,
      scheduled_deletion_at: updateFields.scheduled_deletion_at || null,
      subscription_canceling: isPaid,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
