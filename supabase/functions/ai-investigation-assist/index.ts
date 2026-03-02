// supabase/functions/ai-investigation-assist/index.ts
//
// AI Investigation Assistance — analyzes hazards and suggests root causes,
// recommended corrective actions, and similar patterns.
//
// Deploy: supabase functions deploy ai-investigation-assist --no-verify-jwt
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
    console.log("ai-investigation-assist: invoked");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      console.error("ai-investigation-assist: ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("ai-investigation-assist: API key found");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("ai-investigation-assist: no auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("ai-investigation-assist: auth failed", authError?.message, "token prefix", token.substring(0, 20));
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("ai-investigation-assist: authenticated user", user.id);

    const { orgId, hazardId } = await req.json();
    console.log("ai-investigation-assist: orgId", orgId, "hazardId", hazardId);
    if (!orgId || !hazardId) {
      return new Response(JSON.stringify({ error: "orgId and hazardId required" }), {
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
      .eq("feature", "investigation_assist")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the hazard
    const { data: hazard } = await supabase
      .from("hazard_register")
      .select("*")
      .eq("id", hazardId)
      .single();

    if (!hazard) {
      return new Response(JSON.stringify({ error: "Hazard not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch linked safety report if present
    let linkedReport = null;
    if (hazard.related_report_id) {
      const { data: report } = await supabase
        .from("safety_reports")
        .select("*")
        .eq("id", hazard.related_report_id)
        .single();
      linkedReport = report;
    }

    // Fetch similar past hazards (same category)
    const { data: similarHazards } = await supabase
      .from("hazard_register")
      .select("hazard_code, title, description, category, mitigations, status")
      .eq("org_id", orgId)
      .eq("category", hazard.category || "other")
      .neq("id", hazardId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch recent corrective actions for context
    const { data: recentActions } = await supabase
      .from("corrective_actions")
      .select("title, description, priority, status")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build prompt
    const prompt = `You are an aviation safety investigator for a Part 135 operation. Analyze the following hazard and provide investigation assistance.

HAZARD DETAILS:
- Code: ${hazard.hazard_code}
- Title: ${hazard.title}
- Description: ${hazard.description || "N/A"}
- Category: ${hazard.category || "other"}
- Source: ${hazard.source || "N/A"}
- Current Status: ${hazard.status}
- Existing Mitigations: ${hazard.mitigations || "None"}
${linkedReport ? `
LINKED SAFETY REPORT:
- Title: ${linkedReport.title}
- Description: ${linkedReport.description || "N/A"}
- Category: ${linkedReport.category || "N/A"}
- Severity: ${linkedReport.severity || "N/A"}
- Location: ${linkedReport.location || "N/A"}
- Flight Phase: ${linkedReport.flight_phase || "N/A"}
` : ""}
SIMILAR PAST HAZARDS:
${(similarHazards || []).map(h => `- ${h.hazard_code}: ${h.title} (${h.status}) — Mitigations: ${h.mitigations || "None"}`).join("\n") || "None found."}

RECENT CORRECTIVE ACTIONS IN ORG:
${(recentActions || []).map(a => `- ${a.title} (${a.priority}, ${a.status})`).join("\n") || "None found."}

Provide your analysis as JSON with this exact structure:
{
  "root_causes": [{"cause": "description", "confidence": 0.0-1.0}],
  "recommended_actions": [{"title": "short title", "description": "detailed description", "priority": "high|medium|low"}],
  "similar_patterns": [{"hazard_code": "code", "title": "title", "similarity": "brief description of similarity"}]
}

Provide 2-4 root causes, 2-4 recommended actions, and note any similar patterns from the data above.`;

    console.log("ai-investigation-assist: calling Claude API");
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
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    console.log("ai-investigation-assist: Claude response status", claudeRes.status);
    if (!claudeRes.ok) console.error("ai-investigation-assist: Claude error", JSON.stringify(claudeData));
    const responseText = claudeData.content?.[0]?.text || "{}";

    // Parse analysis from response
    let analysis = { root_causes: [], recommended_actions: [], similar_patterns: [] };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse Claude response:", responseText);
    }

    // Log usage
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
    await supabase.from("ai_usage_log").insert({
      org_id: orgId,
      user_id: user.id,
      feature: "investigation_assist",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify({ ...analysis, model: "claude-sonnet-4-6" }),
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
