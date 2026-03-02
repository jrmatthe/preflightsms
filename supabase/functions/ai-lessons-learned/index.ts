// supabase/functions/ai-lessons-learned/index.ts
//
// AI Lessons Learned Generator — analyzes completed hazard investigations
// and produces lessons learned summaries, key takeaways, and training topics.
//
// Deploy: supabase functions deploy ai-lessons-learned
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

    const { orgId, hazardId } = await req.json();
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
      .eq("feature", "lessons_learned")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch hazard details
    const { data: hazard } = await supabase
      .from("hazard_register")
      .select("*")
      .eq("id", hazardId)
      .eq("org_id", orgId)
      .single();

    if (!hazard) {
      return new Response(JSON.stringify({ error: "Hazard not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch linked safety report
    let linkedReport = null;
    if (hazard.related_report_id) {
      const { data: report } = await supabase
        .from("safety_reports")
        .select("*")
        .eq("id", hazard.related_report_id)
        .single();
      linkedReport = report;
    }

    // Fetch corrective actions for this hazard
    const { data: actions } = await supabase
      .from("corrective_actions")
      .select("title, description, status, priority")
      .eq("hazard_id", hazardId)
      .limit(20);

    // Fetch similar past hazards
    const { data: similarHazards } = await supabase
      .from("hazard_register")
      .select("title, description, category, mitigations, status, initial_likelihood, initial_severity")
      .eq("org_id", orgId)
      .eq("category", hazard.category)
      .neq("id", hazardId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Build context
    const hazardContext = `
HAZARD DETAILS:
- Code: ${hazard.hazard_code}
- Title: ${hazard.title}
- Description: ${hazard.description}
- Category: ${hazard.category}
- Source: ${hazard.source || "N/A"}
- Status: ${hazard.status}
- Initial Risk: Likelihood ${hazard.initial_likelihood}, Severity ${hazard.initial_severity} (Score: ${hazard.initial_likelihood * hazard.initial_severity})
- Residual Risk: ${hazard.residual_likelihood ? `Likelihood ${hazard.residual_likelihood}, Severity ${hazard.residual_severity} (Score: ${hazard.residual_likelihood * hazard.residual_severity})` : "N/A"}
- Mitigations: ${hazard.mitigations || "None documented"}`;

    const reportContext = linkedReport ? `
LINKED SAFETY REPORT:
- Title: ${linkedReport.title}
- Description: ${linkedReport.description}
- Category: ${linkedReport.category}
- Severity: ${linkedReport.severity}
- Location: ${linkedReport.location || "N/A"}
- Root Cause: ${linkedReport.root_cause || "N/A"}` : "";

    const actionsContext = (actions || []).length > 0
      ? `\nCORRECTIVE ACTIONS TAKEN:\n${actions!.map(a => `- [${a.status}] ${a.title}: ${a.description || "No description"}`).join("\n")}`
      : "\nNo corrective actions recorded.";

    const similarContext = (similarHazards || []).length > 0
      ? `\nSIMILAR PAST HAZARDS:\n${similarHazards!.map(h => `- ${h.title} (${h.status}) — Mitigations: ${h.mitigations || "None"}`).join("\n")}`
      : "";

    const prompt = `You are an aviation safety educator and analyst for a Part 135 flight operation. Analyze the following completed investigation and produce a comprehensive lessons-learned document.
${hazardContext}${reportContext}${actionsContext}${similarContext}

Based on this investigation, produce:
1. A summary of the safety event and investigation outcome
2. Key takeaways that all personnel should understand
3. Recommended training topics to prevent recurrence
4. Prevention tips for operational safety

Respond ONLY with a JSON object:
{"summary": "2-3 paragraph narrative summary", "takeaways": ["takeaway 1", "takeaway 2", ...], "training_topics": ["topic 1", "topic 2", ...], "prevention_tips": ["tip 1", "tip 2", ...]}`;

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
    const responseText = claudeData.content?.[0]?.text || "{}";

    // Parse lessons learned from response
    let lessonsLearned = {};
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        lessonsLearned = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse Claude response:", responseText);
    }

    // Log usage
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
    await supabase.from("ai_usage_log").insert({
      org_id: orgId,
      user_id: user.id,
      feature: "lessons_learned",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify({ lessonsLearned, model: "claude-sonnet-4-6" }),
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
