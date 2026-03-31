// supabase/functions/ai-lessons-learned/index.ts
//
// AI Lessons Learned Generator — analyzes completed hazard investigations
// and produces lessons learned summaries, key takeaways, and training topics.
//
// Deploy: supabase functions deploy ai-lessons-learned --no-verify-jwt
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Sanitize user-generated text before embedding in AI prompts */
function sanitizeForPrompt(text: string): string {
  if (!text) return '';
  const truncated = text.slice(0, 2000);
  return truncated
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi, '[filtered]')
    .replace(/you\s+are\s+now/gi, '[filtered]')
    .replace(/system\s*:\s*/gi, '[filtered]')
    .replace(/<\/?system>/gi, '[filtered]');
}

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
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ lessonsLearned: null, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ lessonsLearned: null, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orgId, hazardId } = await req.json();
    if (!orgId || !hazardId) {
      return new Response(JSON.stringify({ lessonsLearned: null, error: "orgId and hazardId required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30 calls/hour/user
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "lessons_learned")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 30) {
      return new Response(
        JSON.stringify({ lessonsLearned: null, error: "Rate limit exceeded. Try again later." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      return new Response(JSON.stringify({ lessonsLearned: null, error: "Hazard not found" }), {
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

    // Build context — focus on what happened, not investigation status
    const eventContext = `
EVENT:
- Title: ${sanitizeForPrompt(hazard.title)}
- Description: ${sanitizeForPrompt(hazard.description)}
- Category: ${hazard.category}
${linkedReport ? `- What happened: ${sanitizeForPrompt(linkedReport.description)}
- Location: ${sanitizeForPrompt(linkedReport.location || "N/A")}
- Flight phase: ${linkedReport.flight_phase || "N/A"}` : ""}
- Mitigations put in place: ${sanitizeForPrompt(hazard.mitigations || "None documented")}`;

    const actionsContext = (actions || []).filter(a => a.status === "completed" || a.status === "in_progress").length > 0
      ? `\nWHAT WAS DONE ABOUT IT:\n${actions!.filter(a => a.status === "completed" || a.status === "in_progress").map(a => `- ${a.title}`).join("\n")}`
      : "";

    const prompt = `You are writing a safety bulletin for pilots at a Part 135 charter operation. This will be read on the ramp in under 60 seconds. It must be deidentified — no names, no dates, no specific flight numbers, no hazard codes.

${eventContext}${actionsContext}

Write a lessons-learned brief with three sections:

1. "summary" — What happened, written as a short narrative (3-4 sentences). Deidentify it: say "a crew member" or "during a flight" instead of specific names/codes. Focus on the event itself and why it matters, NOT the investigation process or status.

2. "takeaways" — 2-3 key lessons. Each should be one sentence a pilot would remember. Focus on the operational lesson, not organizational process.

3. "prevention_tips" — 2-3 concrete actions a pilot can take on their next flight to prevent this. Be specific and actionable — "brief the approach plate cold spots before every winter approach" not "review icing procedures."

4. "training_topics" — 1-2 short topic names for related training.

DO NOT mention investigation status, risk scores, corrective action status, or organizational processes. This is pilot-to-pilot safety communication.

Respond ONLY with a JSON object:
{"summary": "deidentified narrative", "takeaways": ["lesson 1", "lesson 2"], "prevention_tips": ["action 1", "action 2"], "training_topics": ["topic 1"]}`;

    // Call Claude API
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error("Claude API error:", claudeRes.status, errBody);
      return new Response(
        JSON.stringify({ lessonsLearned: null, error: `Claude API returned ${claudeRes.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeRes.json();
    let responseText = claudeData.content?.[0]?.text || "{}";

    // Strip markdown code fences if present
    responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

    // Parse lessons learned from response
    let lessonsLearned: Record<string, unknown> = {};
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        lessonsLearned = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse Claude response:", responseText);
    }

    if (!lessonsLearned.summary) {
      console.error("No summary in parsed response. Raw text:", responseText);
      return new Response(
        JSON.stringify({ lessonsLearned: null, error: "Failed to parse AI response" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      JSON.stringify({ lessonsLearned, model: "claude-haiku-4-5-20251001" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ lessonsLearned: null, error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
