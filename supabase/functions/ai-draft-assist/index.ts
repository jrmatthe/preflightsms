// supabase/functions/ai-draft-assist/index.ts
//
// AI Draft Assist — multi-mode function for generating:
//   - audit_checklist: Audit template sections + questions
//   - moc_hazards: MOC hazard identification + mitigation
//   - policy_draft: Policy document content
//
// Deploy: supabase functions deploy ai-draft-assist --no-verify-jwt
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

    console.log("ai-draft-assist request received");
    const body = await req.json();
    const { orgId, mode } = body;
    console.log("ai-draft-assist invoked", { mode, orgId: orgId?.slice(0, 8) });

    if (!orgId || !mode) {
      return new Response(JSON.stringify({ error: "orgId and mode required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["audit_checklist", "moc_hazards", "policy_draft", "identify_hazard"].includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid mode. Use: audit_checklist, moc_hazards, policy_draft, identify_hazard" }), {
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
      .eq("feature", "draft_assist")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch org info
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name, tier")
      .eq("id", orgId)
      .single();

    let prompt = "";
    let maxTokens = 1500;

    if (mode === "audit_checklist") {
      const { auditScope, auditCategory } = body;

      // Fetch existing policies for context
      const { data: policies } = await supabase
        .from("policies")
        .select("title, category, description")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch recent reports
      const { data: reports } = await supabase
        .from("safety_reports")
        .select("title, category, severity")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(15);

      const policySummary = (policies || []).map(p => `- ${p.title} (${p.category})`).join("\n");
      const reportSummary = (reports || []).map(r => `- ${r.title} [${r.category}/${r.severity}]`).join("\n");

      prompt = `You are an aviation safety auditor for a Part 135 operation (${orgData?.name || "operator"}). Generate a comprehensive internal audit checklist template.

AUDIT SCOPE: ${auditScope || "General SMS audit"}
AUDIT CATEGORY: ${auditCategory || "general"}

EXISTING POLICIES:
${policySummary || "No policies found"}

RECENT SAFETY REPORTS:
${reportSummary || "No recent reports"}

Generate an audit checklist with sections and questions. Each question should have guidance text and an appropriate response type.

Respond ONLY with a JSON object:
{"name": "Template name", "description": "Template description", "category": "${auditCategory || "general"}", "sections": [{"title": "Section Title", "questions": [{"text": "Question text?", "guidance": "Reference or guidance", "response_type": "yes_no_na"}]}]}

Include 3-5 sections with 3-6 questions each. Response types can be: yes_no_na, yes_no, text, numeric, rating.`;
      maxTokens = 2048;

    } else if (mode === "moc_hazards") {
      const { mocTitle, changeType, mocDescription } = body;

      // Fetch existing hazards
      const { data: hazards } = await supabase
        .from("hazard_register")
        .select("title, category, initial_likelihood, initial_severity, mitigations")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(15);

      // Fetch past MOC items
      const { data: mocs } = await supabase
        .from("moc_items")
        .select("title, change_type, identified_hazards, mitigation_plan")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);

      const hazardSummary = (hazards || []).map(h =>
        `- ${h.title} (${h.category}) L${h.initial_likelihood}/S${h.initial_severity}`
      ).join("\n");

      const mocSummary = (mocs || []).map(m => {
        const hazCount = Array.isArray(m.identified_hazards) ? m.identified_hazards.length : 0;
        return `- ${m.title} (${m.change_type}) — ${hazCount} hazards identified`;
      }).join("\n");

      prompt = `You are a safety risk analyst for a Part 135 flight operation (${orgData?.name || "operator"}). Identify potential hazards for the following operational change.

CHANGE REQUEST:
- Title: ${mocTitle || "Untitled change"}
- Type: ${changeType || "other"}
- Description: ${mocDescription || "No description"}

EXISTING HAZARDS IN REGISTER:
${hazardSummary || "No existing hazards"}

PAST MOC ITEMS:
${mocSummary || "No past changes"}

Identify 3-6 potential hazards, rate each for likelihood (1-5: Improbable to Frequent) and severity (1-5: Negligible to Catastrophic), categorize them, and provide a mitigation plan.

Respond ONLY with a JSON object:
{"identified_hazards": [{"description": "Hazard description", "likelihood": 1-5, "severity": 1-5, "category": "category_name"}], "mitigation_plan": "Overall mitigation strategy paragraph", "additional_considerations": ["consideration 1", "consideration 2"]}`;
      maxTokens = 1500;

    } else if (mode === "policy_draft") {
      const { policyTitle, policyCategory } = body;

      // Fetch existing policies
      const { data: policies } = await supabase
        .from("policies")
        .select("title, category, description, content")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch SMS manuals
      const { data: manuals } = await supabase
        .from("sms_manuals")
        .select("title, manual_type")
        .eq("org_id", orgId)
        .limit(10);

      const policySummary = (policies || []).map(p => `- ${p.title} (${p.category}): ${p.description || "No description"}`).join("\n");
      const manualSummary = (manuals || []).map(m => `- ${m.title} (${m.manual_type})`).join("\n");

      prompt = `You are a safety management system specialist for a Part 135 flight operation (${orgData?.name || "operator"}). Draft a safety policy document.

POLICY TO DRAFT:
- Title: ${policyTitle || "Untitled Policy"}
- Category: ${policyCategory || "general"}

EXISTING POLICIES:
${policySummary || "No existing policies"}

SMS MANUALS:
${manualSummary || "No manuals"}

Draft a professional policy document with a description and markdown-formatted content. The content should include purpose, scope, responsibilities, procedures, and compliance references where applicable.

Respond ONLY with a JSON object:
{"title": "${policyTitle || "Untitled Policy"}", "description": "Brief policy description", "content": "Full markdown policy content", "category": "${policyCategory || "general"}"}`;
      maxTokens = 2048;

    } else if (mode === "identify_hazard") {
      const { reportTitle, reportDescription, reportCategory, reportSeverity } = body;

      // Fetch existing hazards for context
      const { data: hazards } = await supabase
        .from("hazard_register")
        .select("title, category, status")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(15);

      // Fetch recent reports for pattern recognition
      const { data: reports } = await supabase
        .from("safety_reports")
        .select("title, category, severity")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(15);

      const hazardSummary = (hazards || []).map(h => `- ${h.title} (${h.category}) [${h.status}]`).join("\n");
      const reportSummary = (reports || []).map(r => `- ${r.title} [${r.category}/${r.severity}]`).join("\n");

      prompt = `You are a safety risk analyst for a Part 135 flight operation (${orgData?.name || "operator"}). A safety report has been filed describing a specific event. Your job is to identify the UNDERLYING HAZARD — the systemic risk, procedural gap, or recurring threat — that this event reveals.

IMPORTANT: A safety report describes what HAPPENED (an event). A hazard describes the underlying RISK or SYSTEMIC ISSUE that could cause similar events repeatedly. For example:
- Report: "Bird strike on final approach to KBFI" → Hazard: "Seasonal bird migration risk on KBFI approach corridors"
- Report: "Pilot skipped checklist items due to fatigue" → Hazard: "Fatigue-related procedural compliance degradation on early departures"
- Report: "Hydraulic fluid leak found during preflight" → Hazard: "Aging hydraulic system reliability on fleet nose gear assemblies"

SAFETY REPORT:
- Title: ${reportTitle || "Untitled"}
- Description: ${reportDescription || "No description"}
- Category: ${reportCategory || "other"}
- Severity: ${reportSeverity || "unknown"}

EXISTING HAZARDS (avoid duplicates):
${hazardSummary || "None"}

RECENT REPORTS (for pattern recognition):
${reportSummary || "None"}

Identify the underlying hazard. Provide a concise hazard title (focused on the systemic risk, not the event), a description explaining why this is a systemic concern, and a suggested category.

Respond ONLY with a JSON object:
{"title": "Hazard title (systemic risk, not the event)", "description": "2-3 sentences explaining the underlying hazard, why it's systemic, and what could happen if unaddressed", "category": "category_name", "reasoning": "Brief explanation of how you identified the underlying hazard from the report"}`;
      maxTokens = 1024;
    }

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
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content?.[0]?.text || "{}";

    // Parse result from response
    let result = {};
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
      feature: "draft_assist",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify({ result, mode, model: "claude-sonnet-4-6" }),
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
