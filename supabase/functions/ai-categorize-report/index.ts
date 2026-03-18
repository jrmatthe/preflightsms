// supabase/functions/ai-categorize-report/index.ts
//
// AI Auto-Categorize Safety Reports — suggests category, severity, flight phase,
// and triage summary for a new safety report based on title + description.
//
// Deploy: supabase functions deploy ai-categorize-report --no-verify-jwt
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
        JSON.stringify({ suggestion: null, error: "ANTHROPIC_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ suggestion: null, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ suggestion: null, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orgId, title, description, location, tailNumber } = await req.json();
    if (!orgId || !title || !description) {
      return new Response(JSON.stringify({ suggestion: null, error: "orgId, title, and description required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30 calls/hour/user
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "report_categorize")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 30) {
      return new Response(
        JSON.stringify({ suggestion: null, error: "Rate limit exceeded. Try again later." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent reports for category/severity distribution
    const { data: recentReports } = await supabase
      .from("safety_reports")
      .select("title, category, severity, flight_phase")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(15);

    // Fetch org fleet info
    const { data: fleet } = await supabase
      .from("fleet_aircraft")
      .select("registration, type")
      .eq("org_id", orgId)
      .limit(20);

    const recentSummary = (recentReports || []).map(r =>
      `${r.category} / ${r.severity} / ${r.flight_phase || "N/A"} — ${r.title}`
    ).join("\n");

    const fleetSummary = (fleet || []).map(a => `${a.registration} (${a.type || "unknown"})`).join(", ");

    const prompt = `You are an aviation safety report classifier for a Part 135 flight operation. Given the following safety report details, suggest the most appropriate category, severity level, flight phase, and a brief triage summary.

REPORT DETAILS:
- Title: ${title}
- Description: ${description}
- Location: ${location || "Not specified"}
- Aircraft: ${tailNumber || "Not specified"}

ORGANIZATION FLEET: ${fleetSummary || "No fleet data"}

RECENT REPORTS (for distribution context):
${recentSummary || "No recent reports"}

AVAILABLE CATEGORIES: weather, mechanical, human_factors, procedures, training, fatigue, communication, ground_ops, airspace, wildlife, maintenance, cabin_safety, security, other

SEVERITY LEVELS: negligible, low, medium, high, critical

FLIGHT PHASES: preflight, taxi, takeoff, climb, cruise, descent, approach, landing, post_flight, ground_ops, maintenance

Analyze the report and respond ONLY with a JSON object:
{"category": "...", "severity": "...", "flight_phase": "...", "triage_summary": "Brief 1-2 sentence summary of risk and recommended priority", "confidence": 0.0-1.0}`;

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
        JSON.stringify({ suggestion: null, error: `Claude API returned ${claudeRes.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeRes.json();
    let responseText = claudeData.content?.[0]?.text || "{}";

    // Strip markdown code fences if present
    responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

    // Parse suggestion from response
    let suggestion = {};
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse Claude response:", responseText);
    }

    // Log usage
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
    await supabase.from("ai_usage_log").insert({
      org_id: orgId,
      user_id: user.id,
      feature: "report_categorize",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify({ suggestion, model: "claude-sonnet-4-6" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ suggestion: null, error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
