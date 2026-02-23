// supabase/functions/stripe-portal/index.ts
//
// Creates a Stripe Billing Portal session for managing subscriptions
// Called from the frontend when user clicks "Manage Subscription" or "Update Payment"
// Uses Stripe REST API directly (no SDK) for edge runtime compatibility
//
// SETUP:
// 1. Deploy: supabase functions deploy stripe-portal --no-verify-jwt
// 2. Configure Customer Portal in Stripe Dashboard:
//    Settings > Billing > Customer portal
//    Enable: update payment, switch plans, cancel, view invoices

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

    const { customerId, returnUrl } = await req.json();

    if (!customerId) {
      return new Response(JSON.stringify({ error: "Customer ID required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams();
    params.append("customer", customerId);
    params.append("return_url", returnUrl);

    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "Stripe error" }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
