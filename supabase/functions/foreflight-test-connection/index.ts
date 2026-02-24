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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { apiKey, apiSecret } = await req.json();

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "API key and secret are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = btoa(`${apiKey}:${apiSecret}`);

    const res = await fetch(
      "https://dispatch.foreflight.com/api/v1/flights?status=scheduled&limit=1",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
      }
    );

    if (res.ok) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorText = await res.text();
    const statusMsg =
      res.status === 401
        ? "Invalid API credentials"
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
