// supabase/functions/ai-risk-assessment/index.ts
//
// AI Risk Assessment — suggests initial risk scores, mitigations, and residual
// risk scores for new hazard investigations.
//
// Deploy: supabase functions deploy ai-risk-assessment --no-verify-jwt
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
    console.log("ai-risk-assessment: invoked");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      console.error("ai-risk-assessment: ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
    console.log("ai-risk-assessment: authenticated user", user.id);

    const { orgId, title, description, category, source, mitigations } = await req.json();
    if (!orgId || !title || !description) {
      return new Response(JSON.stringify({ error: "orgId, title, and description required" }), {
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
      .eq("feature", "risk_assessment")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 30) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch 5 similar past hazards (same category) with their risk scores
    const { data: similarHazards } = await supabase
      .from("hazard_register")
      .select("hazard_code, title, description, category, initial_likelihood, initial_severity, residual_likelihood, residual_severity, mitigations, status")
      .eq("org_id", orgId)
      .eq("category", category || "other")
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch org name for context
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    const isResidualMode = !!mitigations;

    let prompt: string;

    if (!isResidualMode) {
      // Phase 1: Initial risk assessment + suggested mitigations
      prompt = `You are an aviation safety risk analyst for ${orgData?.name || "a Part 135 operation"}. Analyze the following hazard and suggest initial risk scores using a 5x5 risk matrix.

RISK MATRIX SCALES:
- Likelihood (1-5): 1=Improbable, 2=Remote, 3=Occasional, 4=Probable, 5=Frequent
- Severity (1-5): 1=Negligible, 2=Minor, 3=Major, 4=Hazardous, 5=Catastrophic
- Risk Score = Likelihood x Severity (1-25)
- Low: 1-4, Medium: 5-9, High: 10-16, Critical: 17-25

HAZARD DETAILS:
- Title: ${title}
- Description: ${description}
- Category: ${category || "other"}
- Source: ${source || "N/A"}

SIMILAR PAST HAZARDS FOR CALIBRATION:
${(similarHazards || []).map(h => `- ${h.hazard_code}: ${h.title} (L=${h.initial_likelihood}, S=${h.initial_severity}, Score=${(h.initial_likelihood || 0) * (h.initial_severity || 0)}) — Mitigations: ${h.mitigations || "None"}`).join("\n") || "None found."}

Based on the hazard description and similar past hazards, provide:
1. Suggested initial likelihood and severity scores with reasoning
2. 3-5 recommended mitigations specific to this hazard

Respond ONLY with a JSON object:
{
  "initial_likelihood": 1-5,
  "initial_severity": 1-5,
  "reasoning": "2-3 sentence explanation of why these scores were chosen, referencing similar hazards if relevant",
  "suggested_mitigations": [
    {"text": "specific mitigation action", "rationale": "brief reason why this helps"}
  ]
}`;
    } else {
      // Phase 2: Residual risk after mitigations
      prompt = `You are an aviation safety risk analyst for ${orgData?.name || "a Part 135 operation"}. Evaluate the residual risk after mitigations have been applied to the following hazard.

RISK MATRIX SCALES:
- Likelihood (1-5): 1=Improbable, 2=Remote, 3=Occasional, 4=Probable, 5=Frequent
- Severity (1-5): 1=Negligible, 2=Minor, 3=Major, 4=Hazardous, 5=Catastrophic
- Risk Score = Likelihood x Severity (1-25)
- Low: 1-4, Medium: 5-9, High: 10-16, Critical: 17-25

HAZARD DETAILS:
- Title: ${title}
- Description: ${description}
- Category: ${category || "other"}
- Source: ${source || "N/A"}

MITIGATIONS IN PLACE:
${mitigations}

SIMILAR PAST HAZARDS FOR CALIBRATION:
${(similarHazards || []).filter(h => h.residual_likelihood && h.residual_severity).map(h => `- ${h.hazard_code}: ${h.title} (Initial: L=${h.initial_likelihood} S=${h.initial_severity}, Residual: L=${h.residual_likelihood} S=${h.residual_severity}) — Mitigations: ${h.mitigations || "None"}`).join("\n") || "None found."}

Evaluate how much the mitigations reduce the initial risk. Consider:
- Do the mitigations address the root causes?
- How effective are they at reducing likelihood vs severity?
- Are there gaps in the mitigation strategy?

Respond ONLY with a JSON object:
{
  "residual_likelihood": 1-5,
  "residual_severity": 1-5,
  "reasoning": "2-3 sentence explanation of how the mitigations reduce risk, noting any remaining gaps"
}`;
    }

    console.log("ai-risk-assessment: calling Claude API, mode:", isResidualMode ? "residual" : "initial");
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    console.log("ai-risk-assessment: Claude response status", claudeRes.status);
    if (!claudeRes.ok) console.error("ai-risk-assessment: Claude error", JSON.stringify(claudeData));
    const responseText = claudeData.content?.[0]?.text || "{}";

    // Parse response
    const defaultResult = isResidualMode
      ? { residual_likelihood: 0, residual_severity: 0, reasoning: "" }
      : { initial_likelihood: 0, initial_severity: 0, reasoning: "", suggested_mitigations: [] };
    let result = defaultResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse Claude response:", responseText);
    }

    // Log usage
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
    await supabase.from("ai_usage_log").insert({
      org_id: orgId,
      user_id: user.id,
      feature: "risk_assessment",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify({ ...result, model: "claude-sonnet-4-6" }),
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
