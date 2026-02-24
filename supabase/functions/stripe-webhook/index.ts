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

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("No stripe-signature header");
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
  }

  const valid = await verifySignature(body, sig, webhookSecret);
  if (!valid) {
    console.error("Webhook signature verification failed");
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
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
    // Record this event ID (best-effort — don't fail the webhook if insert fails)
    await supabase.from("stripe_webhook_events").insert({ event_id: event.id, event_type: event.type }).catch(() => {});
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.org_id;
        const plan = session.metadata?.plan || "starter";
        if (orgId) {
          await supabase.from("organizations").update({
            subscription_status: "active",
            tier: plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          }).eq("id", orgId);
          console.log(`Org ${orgId} activated: ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const orgId = sub.metadata?.org_id;
        if (orgId) {
          const status = sub.status === "active" ? "active"
            : sub.status === "past_due" ? "past_due"
            : sub.status === "canceled" ? "canceled"
            : sub.status === "unpaid" ? "suspended"
            : "active";
          const updateFields: Record<string, any> = { subscription_status: status };
          const newTier = sub.metadata?.plan;
          if (newTier && ["starter", "professional", "enterprise"].includes(newTier)) {
            updateFields.tier = newTier;
          }
          await supabase.from("organizations").update(updateFields).eq("id", orgId);
          console.log(`Org ${orgId} subscription updated: ${status}${newTier ? `, tier: ${newTier}` : ""}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const orgId = sub.metadata?.org_id;
        if (orgId) {
          await supabase.from("organizations").update({
            subscription_status: "canceled",
          }).eq("id", orgId);
          console.log(`Org ${orgId} subscription canceled`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();
          if (org) {
            await supabase.from("organizations").update({
              subscription_status: "past_due",
            }).eq("id", org.id);
            console.log(`Org ${org.id} payment failed`);
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();
          if (org) {
            await supabase.from("organizations").update({
              subscription_status: "active",
            }).eq("id", org.id);
            console.log(`Org ${org.id} payment succeeded`);
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
