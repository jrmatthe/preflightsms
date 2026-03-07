// supabase/functions/foreflight-test-connection/index.ts
//
// Tests ForeFlight Dispatch API credentials
// Called from Admin UI "Test Connection" button
//
// SETUP:
// 1. Deploy: supabase functions deploy foreflight-test-connection --no-verify-jwt

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FF_BASE = "https://public-api.foreflight.com";
const FF_VENDOR_ID = "1b600c49-584c-4f60-b40c-10aa8bd34ecd";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "API key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test by listing aircraft — lightweight read-only call
    const res = await fetch(`${FF_BASE}/public/api/aircraft`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "x-vendorId": FF_VENDOR_ID,
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      return new Response(
        JSON.stringify({ success: true, aircraftCount: count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorText = await res.text();
    const statusMsg =
      res.status === 401
        ? "Invalid API key"
        : res.status === 403
        ? "API access forbidden — check your ForeFlight plan"
        : `ForeFlight API error (${res.status})`;

    return new Response(
      JSON.stringify({ success: false, error: statusMsg, detail: errorText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Test connection error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
