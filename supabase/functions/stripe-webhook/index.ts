// supabase/functions/stripe-webhook/index.ts
//
// Handles Stripe webhook events to update subscription status
//
// SETUP:
// 1. Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// 2. Set secrets:
//    supabase secrets set STRIPE_SECRET_KEY=sk_test_...
//    supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
// 3. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
//    URL: https://abfqoijsjyyiyvvaycsg.supabase.co/functions/v1/stripe-webhook
//    Events: checkout.session.completed, customer.subscription.updated,
//            customer.subscription.deleted, invoice.payment_failed, invoice.paid

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Manual signature verification using Web Crypto API (works reliably in Deno)
async function verifySignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const item of sigHeader.split(",")) {
    const [key, value] = item.split("=");
    parts[key.trim()] = value;
  }
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_TIERS = ["starter", "professional", "enterprise"];

// Resolve org ID from subscription metadata, subscription ID, or customer ID
// Returns null if org cannot be found
async function resolveOrg(
  supabase: any,
  metadata: Record<string, any> | undefined,
  subscriptionId: string | undefined,
  customerId: string | undefined,
): Promise<string | null> {
  // Try metadata first
  if (metadata?.org_id) {
    const { data } = await supabase
      .from("organizations").select("id").eq("id", metadata.org_id).maybeSingle();
    if (data?.id) return data.id;
    console.error(`Org from metadata not found: ${metadata.org_id}`);
  }
  // Try subscription ID
  if (subscriptionId) {
    const { data } = await supabase
      .from("organizations").select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle();
    if (data?.id) return data.id;
  }
  // Try customer ID
  if (customerId) {
    const { data } = await supabase
      .from("organizations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Missing config" }), { status: 500 });
  }

  const body = await req.text();

  // TODO: Once STRIPE_WEBHOOK_SECRET is deployed everywhere, make this required
  // and remove the backward-compatibility fallback below.
  if (!webhookSecret) {
    console.warn("WARNING: STRIPE_WEBHOOK_SECRET not set — skipping signature verification. Set this secret to enable webhook security.");
  } else {
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      console.error("No stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), { status: 400 });
    }

    const valid = await verifySignature(body, sig, webhookSecret);
    if (!valid) {
      console.error("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }
  }

  const event = JSON.parse(body);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("Stripe event:", event.type, event.id);

  // Idempotency: skip already-processed events
  if (event.id) {
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (existing) {
      console.log(`Skipping duplicate event: ${event.id}`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    // NOTE: event ID is recorded AFTER successful processing (below)
    // to allow Stripe retries if processing fails
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.org_id;
        const plan = session.metadata?.plan || "starter";
        if (!orgId) {
          console.error("checkout.session.completed: No org_id in metadata");
          return new Response(JSON.stringify({ error: "No org_id in metadata" }), { status: 500 });
        }
        // Verify org exists before updating
        const { data: org } = await supabase
          .from("organizations").select("id").eq("id", orgId).maybeSingle();
        if (!org) {
          console.error(`checkout.session.completed: Org ${orgId} not found in database`);
          return new Response(JSON.stringify({ error: `Org ${orgId} not found` }), { status: 500 });
        }
        // Validate tier
        const tier = VALID_TIERS.includes(plan) ? plan : "starter";
        if (plan !== tier) {
          console.error(`checkout.session.completed: Invalid plan "${plan}" in metadata, defaulting to starter`);
        }
        const { error: updateErr } = await supabase.from("organizations").update({
          subscription_status: "active",
          tier,
          feature_flags: null, // Reset to tier defaults on plan change
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        }).eq("id", orgId);
        if (updateErr) {
          console.error(`checkout.session.completed: Failed to update org ${orgId}:`, updateErr.message);
          return new Response(JSON.stringify({ error: "Database update failed" }), { status: 500 });
        }
        console.log(`Org ${orgId} activated: ${tier}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const orgId = await resolveOrg(supabase, sub.metadata, sub.id, sub.customer);
        if (!orgId) {
          console.error(`subscription.updated: Could not resolve org for sub=${sub.id} customer=${sub.customer}`);
          // Return 500 so Stripe retries — the org may not exist yet (checkout still processing)
          return new Response(JSON.stringify({ error: "Org not found" }), { status: 500 });
        }
        const status = sub.status === "active" ? "active"
          : sub.status === "past_due" ? "past_due"
          : sub.status === "canceled" ? "canceled"
          : sub.status === "unpaid" ? "suspended"
          : "active";
        const updateFields: Record<string, any> = { subscription_status: status };
        // Resolve tier from price ID (portal plan switches won't have correct metadata)
        const priceId = sub.items?.data?.[0]?.price?.id;
        const STARTER_MONTHLY = Deno.env.get("STRIPE_STARTER_MONTHLY");
        const STARTER_ANNUAL = Deno.env.get("STRIPE_STARTER_ANNUAL");
        const PRO_MONTHLY = Deno.env.get("STRIPE_PRO_MONTHLY");
        const PRO_ANNUAL = Deno.env.get("STRIPE_PRO_ANNUAL");
        if (!STARTER_MONTHLY && !PRO_MONTHLY) {
          console.error("CRITICAL: Price ID env vars not set — tier resolution will fail for portal plan switches");
        }
        const priceToTier: Record<string, string> = {};
        if (STARTER_MONTHLY) priceToTier[STARTER_MONTHLY] = "starter";
        if (STARTER_ANNUAL) priceToTier[STARTER_ANNUAL] = "starter";
        if (PRO_MONTHLY) priceToTier[PRO_MONTHLY] = "professional";
        if (PRO_ANNUAL) priceToTier[PRO_ANNUAL] = "professional";
        const resolvedTier = priceId ? priceToTier[priceId] : undefined;
        if (priceId && !resolvedTier) {
          console.error(`CRITICAL: Unknown price ID ${priceId} for org ${orgId} — cannot resolve tier. Check STRIPE_*_MONTHLY/ANNUAL env vars.`);
          // Don't return 500 here — the subscription status still needs updating.
          // But log it loudly so it can be investigated.
        }
        // Use price-based tier, fall back to metadata
        const newTier = resolvedTier || sub.metadata?.plan;
        if (newTier && VALID_TIERS.includes(newTier)) {
          updateFields.tier = newTier;
        } else {
          console.error(`WARNING: Could not determine tier for org ${orgId}. priceId=${priceId}, metadata.plan=${sub.metadata?.plan}. Subscription status updated but tier unchanged.`);
        }
        const { error: updateErr } = await supabase.from("organizations").update(updateFields).eq("id", orgId);
        if (updateErr) {
          console.error(`subscription.updated: Failed to update org ${orgId}:`, updateErr.message);
          return new Response(JSON.stringify({ error: "Database update failed" }), { status: 500 });
        }
        console.log(`Org ${orgId} subscription updated: ${status}, tier: ${newTier || "UNCHANGED"}, priceId: ${priceId || "none"}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const orgId = await resolveOrg(supabase, sub.metadata, sub.id, sub.customer);
        if (!orgId) {
          console.error(`subscription.deleted: Could not resolve org for sub=${sub.id} customer=${sub.customer}`);
          return new Response(JSON.stringify({ error: "Org not found" }), { status: 500 });
        }
        // Check if org has a pending deletion request
        const { data: orgData } = await supabase
          .from("organizations")
          .select("deletion_reason")
          .eq("id", orgId)
          .maybeSingle();

        const updateFields: Record<string, any> = {
          subscription_status: "canceled",
        };

        // If deletion was requested, start the 14-day grace period now
        if (orgData?.deletion_reason) {
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + 14);
          updateFields.scheduled_deletion_at = scheduledDate.toISOString();
          console.log(`Org ${orgId} deletion countdown started: ${updateFields.scheduled_deletion_at}`);
        }

        const { error: updateErr } = await supabase.from("organizations").update(updateFields).eq("id", orgId);
        if (updateErr) {
          console.error(`subscription.deleted: Failed to update org ${orgId}:`, updateErr.message);
          return new Response(JSON.stringify({ error: "Database update failed" }), { status: 500 });
        }
        console.log(`Org ${orgId} subscription canceled`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) {
          console.error("invoice.payment_failed: No subscription ID on invoice");
          break; // Not all invoices are subscription-related, OK to skip
        }
        const orgId = await resolveOrg(supabase, undefined, subId, invoice.customer);
        if (!orgId) {
          console.error(`invoice.payment_failed: Could not resolve org for sub=${subId} customer=${invoice.customer}`);
          return new Response(JSON.stringify({ error: "Org not found" }), { status: 500 });
        }
        const { error: updateErr } = await supabase.from("organizations").update({
          subscription_status: "past_due",
        }).eq("id", orgId);
        if (updateErr) {
          console.error(`invoice.payment_failed: Failed to update org ${orgId}:`, updateErr.message);
          return new Response(JSON.stringify({ error: "Database update failed" }), { status: 500 });
        }
        console.log(`Org ${orgId} payment failed`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break; // Not all invoices are subscription-related
        const orgId = await resolveOrg(supabase, undefined, subId, invoice.customer);
        if (!orgId) {
          console.error(`invoice.paid: Could not resolve org for sub=${subId} customer=${invoice.customer}`);
          return new Response(JSON.stringify({ error: "Org not found" }), { status: 500 });
        }
        const { error: updateErr } = await supabase.from("organizations").update({
          subscription_status: "active",
        }).eq("id", orgId);
        if (updateErr) {
          console.error(`invoice.paid: Failed to update org ${orgId}:`, updateErr.message);
          return new Response(JSON.stringify({ error: "Database update failed" }), { status: 500 });
        }
        console.log(`Org ${orgId} payment succeeded`);
        break;
      }
    }

    // Record event ID AFTER successful processing so Stripe retries on failure
    if (event.id) {
      await supabase.from("stripe_webhook_events").insert({ event_id: event.id, event_type: event.type }).catch(() => {});
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook handler error:", err);
    // Return 500 so Stripe retries — event ID NOT recorded, so retry won't be skipped
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
