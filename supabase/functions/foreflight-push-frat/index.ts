// supabase/functions/foreflight-push-frat/index.ts
//
// Pushes a FRAT PDF as a file attachment to a ForeFlight flight
// Called after a FRAT is submitted for a ForeFlight-synced flight
//
// SETUP:
// 1. Deploy: supabase functions deploy foreflight-push-frat --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orgId, foreflightFlightId, pdfUrl, fratCode } = await req.json();

    if (!orgId || !foreflightFlightId) {
      return new Response(
        JSON.stringify({ success: false, error: "orgId and foreflightFlightId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get ForeFlight config for this org
    const { data: config } = await supabase
      .from("foreflight_config")
      .select("*")
      .eq("org_id", orgId)
      .eq("enabled", true)
      .maybeSingle();

    if (!config?.api_key) {
      return new Response(
        JSON.stringify({ success: false, error: "ForeFlight not configured for this org" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.push_frat_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: "FRAT push not enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the PDF from Supabase storage if a URL is provided
    let pdfBlob: Blob;
    if (pdfUrl) {
      const pdfRes = await fetch(pdfUrl);
      if (!pdfRes.ok) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to download FRAT PDF" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      pdfBlob = await pdfRes.blob();
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "pdfUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload PDF to ForeFlight flight as attachment
    const fileName = `FRAT-${fratCode || "report"}.pdf`;
    const formData = new FormData();
    formData.append("file", pdfBlob, fileName);
    formData.append("category", "General");

    const uploadRes = await fetch(
      `${FF_BASE}/public/api/flights/files?flightId=${foreflightFlightId}`,
      {
        method: "POST",
        headers: {
          "x-api-key": config.api_key,
          "x-vendorId": FF_VENDOR_ID,
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("ForeFlight file upload error:", uploadRes.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `Upload failed (${uploadRes.status})`, detail: errText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark the foreflight_flight as frat_created
    await supabase
      .from("foreflight_flights")
      .update({ status: "frat_created", updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .eq("foreflight_id", foreflightFlightId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Push FRAT error:", e);
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
