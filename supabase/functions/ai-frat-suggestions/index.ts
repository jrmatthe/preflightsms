// supabase/functions/ai-frat-suggestions/index.ts
//
// AI FRAT Risk Suggestions — suggests risk factors based on flight context
// and historical FRAT data. Uses Claude API.
//
// Deploy: supabase functions deploy ai-frat-suggestions --no-verify-jwt
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
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orgId, departure, destination, aircraft, flightDate, etd } = await req.json();
    if (!orgId) {
      return new Response(JSON.stringify({ error: "orgId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10 calls/hour/user
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "frat_suggestions")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 30) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch historical FRATs for context
    const { data: departureFrats } = await supabase
      .from("frat_submissions")
      .select("departure, destination, aircraft, score, factors, created_at")
      .eq("org_id", orgId)
      .or(`departure.eq.${departure},destination.eq.${destination}`)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: aircraftFrats } = await supabase
      .from("frat_submissions")
      .select("departure, destination, aircraft, score, factors, created_at")
      .eq("org_id", orgId)
      .eq("aircraft", aircraft || "")
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch available risk factors from the org's FRAT template
    const { data: templates } = await supabase
      .from("frat_templates")
      .select("categories")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .limit(1);

    const categories = templates?.[0]?.categories || [];
    const availableFactors = categories.flatMap((cat: { id: string; name: string; factors: { id: string; label: string; score: number }[] }) =>
      (cat.factors || []).map((f: { id: string; label: string; score: number }) => ({
        factor_id: f.id,
        factor_label: f.label,
        category: cat.name,
        score: f.score,
      }))
    );

    // Determine season/month context
    const month = flightDate ? new Date(flightDate).getMonth() + 1 : new Date().getMonth() + 1;
    const seasonMap: Record<number, string> = { 1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring", 6: "summer", 7: "summer", 8: "summer", 9: "fall", 10: "fall", 11: "fall", 12: "winter" };
    const season = seasonMap[month] || "unknown";

    // Build prompt
    const historicalSummary = (departureFrats || []).slice(0, 10).map(f =>
      `Route: ${f.departure}→${f.destination}, Aircraft: ${f.aircraft}, Score: ${f.score}, Factors: ${(f.factors || []).map((fac: string | { id?: string; label?: string }) => typeof fac === "string" ? fac : fac.label || fac.id).join(", ")}`
    ).join("\n");

    const prompt = `You are an aviation safety risk analyst for a Part 135 flight operation. Based on the following flight context and historical FRAT data, suggest which risk factors should be checked for this flight.

FLIGHT CONTEXT:
- Departure: ${departure || "Not specified"}
- Destination: ${destination || "Not specified"}
- Aircraft Type: ${aircraft || "Not specified"}
- Flight Date: ${flightDate || "Not specified"}
- ETD: ${etd || "Not specified"}
- Season: ${season}

HISTORICAL FRAT DATA (recent flights on similar routes/aircraft):
${historicalSummary || "No historical data available."}

AVAILABLE RISK FACTORS:
${availableFactors.map((f: { factor_id: string; factor_label: string; category: string; score: number }) => `- [${f.factor_id}] ${f.category}: ${f.factor_label} (score: ${f.score})`).join("\n")}

Based on this context, suggest 3-6 risk factors that are most likely relevant. For each, provide a brief explanation of why it's relevant.

Respond ONLY with a JSON array:
[{"factor_id": "...", "factor_label": "...", "category": "...", "explanation": "...", "confidence": 0.0-1.0}]`;

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
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content?.[0]?.text || "[]";

    // Parse suggestions from response
    let suggestions = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse Claude response:", responseText);
    }

    // Log usage
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
    await supabase.from("ai_usage_log").insert({
      org_id: orgId,
      user_id: user.id,
      feature: "frat_suggestions",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify({ suggestions, model: "claude-sonnet-4-6" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
