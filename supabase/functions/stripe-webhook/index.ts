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
    // NOTE: event ID is recorded AFTER successful processing (below)
    // to allow Stripe retries if processing fails
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
        // Resolve org: try metadata first, then look up by subscription ID or customer ID
        let orgId = sub.metadata?.org_id;
        if (!orgId && sub.id) {
          const { data: orgBySub } = await supabase
            .from("organizations")
            .select("id")
            .eq("stripe_subscription_id", sub.id)
            .maybeSingle();
          orgId = orgBySub?.id;
        }
        if (!orgId && sub.customer) {
          const { data: orgByCust } = await supabase
            .from("organizations")
            .select("id")
            .eq("stripe_customer_id", sub.customer)
            .maybeSingle();
          orgId = orgByCust?.id;
        }
        if (!orgId) {
          console.error(`subscription.updated: Could not resolve org for sub=${sub.id} customer=${sub.customer}`);
          break;
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
          console.error("WARNING: Price ID env vars not set — tier resolution will fail for portal plan switches");
        }
        const priceToTier: Record<string, string> = {};
        if (STARTER_MONTHLY) priceToTier[STARTER_MONTHLY] = "starter";
        if (STARTER_ANNUAL) priceToTier[STARTER_ANNUAL] = "starter";
        if (PRO_MONTHLY) priceToTier[PRO_MONTHLY] = "professional";
        if (PRO_ANNUAL) priceToTier[PRO_ANNUAL] = "professional";
        const resolvedTier = priceId ? priceToTier[priceId] : undefined;
        if (priceId && !resolvedTier) {
          console.error(`WARNING: Unknown price ID ${priceId} — cannot resolve tier. Check STRIPE_*_MONTHLY/ANNUAL env vars.`);
        }
        // Use price-based tier, fall back to metadata
        const newTier = resolvedTier || sub.metadata?.plan;
        if (newTier && ["starter", "professional", "enterprise"].includes(newTier)) {
          updateFields.tier = newTier;
        } else {
          console.error(`WARNING: Could not determine tier for org ${orgId}. priceId=${priceId}, metadata.plan=${sub.metadata?.plan}`);
        }
        await supabase.from("organizations").update(updateFields).eq("id", orgId);
        console.log(`Org ${orgId} subscription updated: ${status}, tier: ${newTier || "UNCHANGED"}, priceId: ${priceId || "none"}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        let orgId = sub.metadata?.org_id;
        if (!orgId && sub.id) {
          const { data: orgBySub } = await supabase
            .from("organizations").select("id").eq("stripe_subscription_id", sub.id).maybeSingle();
          orgId = orgBySub?.id;
        }
        if (!orgId && sub.customer) {
          const { data: orgByCust } = await supabase
            .from("organizations").select("id").eq("stripe_customer_id", sub.customer).maybeSingle();
          orgId = orgByCust?.id;
        }
        if (orgId) {
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

          await supabase.from("organizations").update(updateFields).eq("id", orgId);
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
