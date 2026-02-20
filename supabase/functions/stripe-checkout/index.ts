// supabase/functions/stripe-checkout/index.ts
//
// Creates a Stripe Checkout Session for subscription
// Called from the frontend when user clicks Subscribe
//
// SETUP:
// 1. Deploy: supabase functions deploy stripe-checkout --no-verify-jwt
// 2. Set secrets:
//    supabase secrets set STRIPE_SECRET_KEY=sk_test_...
//    supabase secrets set STRIPE_STARTER_MONTHLY=price_1T2loBBbOwyCfgT4JiPVvS7d
//    supabase secrets set STRIPE_STARTER_ANNUAL=price_1T2lnjBbOwyCfgT4uiMWNI33
//    supabase secrets set STRIPE_PRO_MONTHLY=price_1T2lqMBbOwyCfgT4Xag4mrW3
//    supabase secrets set STRIPE_PRO_ANNUAL=price_1T2lqfBbOwyCfgT4Hn9scVs6

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const { plan, interval, orgId, orgName, email, returnUrl } = await req.json();

    // Map plan + interval to price ID
    const priceMap: Record<string, string | undefined> = {
      "starter_monthly": Deno.env.get("STRIPE_STARTER_MONTHLY"),
      "starter_annual": Deno.env.get("STRIPE_STARTER_ANNUAL"),
      "professional_monthly": Deno.env.get("STRIPE_PRO_MONTHLY"),
      "professional_annual": Deno.env.get("STRIPE_PRO_ANNUAL"),
    };

    const priceId = priceMap[`${plan}_${interval}`];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Invalid plan/interval" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?payment=canceled`,
      metadata: {
        org_id: orgId,
        org_name: orgName,
        plan: plan,
        interval: interval,
      },
      subscription_data: {
        metadata: {
          org_id: orgId,
          plan: plan,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
