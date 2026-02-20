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

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Missing config" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let event: Stripe.Event;

  // Verify webhook signature if secret is set
  if (webhookSecret) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    try {
      event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }
  } else {
    // No webhook secret — parse body directly (test mode)
    const body = await req.json();
    event = body as Stripe.Event;
  }

  console.log("Stripe event:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const plan = session.metadata?.plan || "starter";
        if (orgId) {
          await supabase.from("organizations").update({
            subscription_status: "active",
            tier: plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          }).eq("id", orgId);
          console.log(`Org ${orgId} activated: ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        if (orgId) {
          const status = sub.status === "active" ? "active"
            : sub.status === "past_due" ? "past_due"
            : sub.status === "canceled" ? "canceled"
            : sub.status === "unpaid" ? "suspended"
            : "active";
          await supabase.from("organizations").update({
            subscription_status: status,
          }).eq("id", orgId);
          console.log(`Org ${orgId} subscription updated: ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
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
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          // Find org by stripe_subscription_id
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("stripe_subscription_id", subId)
            .single();
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
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("stripe_subscription_id", subId)
            .single();
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
