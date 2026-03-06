// /api/cancel-deletion
// Cancels a scheduled organization deletion.
// If the Stripe subscription was set to cancel at period end, re-enables it.

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
    const { orgId } = req.body;
    if (!orgId) return res.status(400).json({ error: "orgId required" });

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

    // Check if org has a Stripe subscription set to cancel at period end — re-enable it
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", orgId)
      .single();

    if (org?.stripe_subscription_id && org.subscription_status === "active") {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey);
          await stripe.subscriptions.update(org.stripe_subscription_id, {
            cancel_at_period_end: false,
          });
        } catch (stripeErr) {
          console.error("Failed to re-enable Stripe subscription:", stripeErr.message);
          // Continue anyway — clearing the deletion fields is more important
        }
      }
    }

    const { error: updateErr } = await supabase
      .from("organizations")
      .update({
        scheduled_deletion_at: null,
        deletion_reason: null,
      })
      .eq("id", orgId);

    if (updateErr) return res.status(400).json({ error: updateErr.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
