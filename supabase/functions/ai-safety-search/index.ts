// supabase/functions/ai-safety-search/index.ts
//
// AI Safety Search — converts natural language queries into structured
// safety report filters. Uses Claude API.
//
// Deploy: supabase functions deploy ai-safety-search --no-verify-jwt
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ filters: {}, interpreted_as: "", error: "ANTHROPIC_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ filters: {}, interpreted_as: "", error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ filters: {}, interpreted_as: "", error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orgId, query } = await req.json();
    if (!orgId || !query) {
      return new Response(JSON.stringify({ filters: {}, interpreted_as: "", error: "orgId and query required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30 calls/hour/user
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "safety_search")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 30) {
      return new Response(
        JSON.stringify({ filters: {}, interpreted_as: "", error: "Rate limit exceeded. Try again later." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const prompt = `You are a search assistant for an aviation safety management system. Convert the following natural language query into structured filters for searching safety reports.

TODAY'S DATE: ${today}

USER QUERY: "${query}"

AVAILABLE FILTER FIELDS:
- category: one of ["hazard", "incident", "near_miss", "concern"]
- severity: one of ["low", "medium", "high", "critical", "catastrophic"]
- date_range: object with "start" and/or "end" in YYYY-MM-DD format
- airport: ICAO or IATA airport code mentioned
- keyword: key search term extracted from query
- flight_phase: one of ["preflight", "taxi", "takeoff", "climb", "cruise", "descent", "approach", "landing", "post_flight"]
- status: one of ["open", "under_review", "investigation", "closed"]

Return ONLY a JSON object with the relevant filters. Only include fields that are clearly indicated by the query. Example:
{"category": "incident", "severity": "high", "keyword": "bird strike", "flight_phase": "takeoff"}

Also include an "interpreted_as" field with a brief human-readable summary of how you interpreted the query.`;

    // Call Claude API
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error("Claude API error:", claudeRes.status, errBody);
      return new Response(
        JSON.stringify({ filters: {}, interpreted_as: "", error: `Claude API returned ${claudeRes.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeRes.json();
    let responseText = claudeData.content?.[0]?.text || "{}";

    // Strip markdown code fences if present
    responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

    // Parse filters from response
    let result = { filters: {}, interpreted_as: "" };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const { interpreted_as, ...filters } = parsed;
        result = { filters, interpreted_as: interpreted_as || query };
      }
    } catch {
      console.error("Failed to parse Claude response:", responseText);
      result = { filters: { keyword: query }, interpreted_as: query };
    }

    // Log usage
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
    await supabase.from("ai_usage_log").insert({
      org_id: orgId,
      user_id: user.id,
      feature: "safety_search",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ filters: {}, interpreted_as: "", error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
