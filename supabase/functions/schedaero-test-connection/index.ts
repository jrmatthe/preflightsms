// supabase/functions/schedaero-test-connection/index.ts
//
// Tests Schedaero API credentials
// Called from Admin UI "Test Connection" button
//
// SETUP:
// 1. Deploy: supabase functions deploy schedaero-test-connection --no-verify-jwt

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const res = await fetch(
      "https://api.schedaero.com/v1/trips?limit=1",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
        ? "Invalid API key"
        : res.status === 403
        ? "API access forbidden — check your Schedaero plan"
        : `Schedaero API error (${res.status})`;

    return new Response(
      JSON.stringify({ success: false, error: statusMsg, detail: errorText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Test connection error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
