// supabase/functions/stripe-checkout/index.ts
//
// Creates a Stripe Checkout Session for subscription
// Called from the frontend when user clicks Subscribe
// Uses Stripe REST API directly (no SDK) for edge runtime compatibility
//
// SETUP:
// 1. Deploy: supabase functions deploy stripe-checkout --no-verify-jwt
// 2. Set secrets:
//    supabase secrets set STRIPE_SECRET_KEY=sk_test_...
//    supabase secrets set STRIPE_STARTER_MONTHLY=price_1T3s2wBfO8VDPODhptEY2ZrB
//    supabase secrets set STRIPE_STARTER_ANNUAL=price_1T3s3UBfO8VDPODhIcvPp2px
//    supabase secrets set STRIPE_PRO_MONTHLY=price_1T3s3qBfO8VDPODhNZ5u8lTK
//    supabase secrets set STRIPE_PRO_ANNUAL=price_1T3s4FBfO8VDPODhjBwP3UHp

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

    const body = await req.json();
    const { plan, interval, orgId, orgName, email, returnUrl } = body;
    console.log("Request body:", JSON.stringify({ plan, interval, orgId, orgName, email, returnUrl }));

    const priceMap: Record<string, string | undefined> = {
      "starter_monthly": Deno.env.get("STRIPE_STARTER_MONTHLY"),
      "starter_annual": Deno.env.get("STRIPE_STARTER_ANNUAL"),
      "professional_monthly": Deno.env.get("STRIPE_PRO_MONTHLY"),
      "professional_annual": Deno.env.get("STRIPE_PRO_ANNUAL"),
    };

    const key = `${plan}_${interval}`;
    const priceId = priceMap[key];
    console.log("Price lookup:", key, "→", priceId || "NOT FOUND");
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Invalid plan/interval: ${key}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("payment_method_types[]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("customer_email", email);
    params.append("success_url", `${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${returnUrl}?payment=canceled`);
    params.append("metadata[org_id]", orgId);
    params.append("metadata[org_name]", orgName);
    params.append("metadata[plan]", plan);
    params.append("metadata[interval]", interval);
    params.append("subscription_data[metadata][org_id]", orgId);
    params.append("subscription_data[metadata][plan]", plan);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Stripe API error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: data.error?.message || "Stripe error" }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.url, sessionId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Function error:", err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
