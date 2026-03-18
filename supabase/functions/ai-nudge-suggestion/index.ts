// supabase/functions/ai-nudge-suggestion/index.ts
//
// AI Post-Flight Nudge Suggestion — generates a contextual safety prompt
// based on actual flight data to encourage relevant safety reports.
//
// Deploy: supabase functions deploy ai-nudge-suggestion --no-verify-jwt
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
        JSON.stringify({ suggestion: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ suggestion: null }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ suggestion: null }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orgId, flightId } = await req.json();
    if (!orgId || !flightId) {
      return new Response(JSON.stringify({ suggestion: null }), {
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
      .eq("feature", "nudge_suggestion")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 30) {
      return new Response(
        JSON.stringify({ suggestion: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch flight data, FRAT, recent reports, and aircraft MEL in parallel
    const [flightRes, fratRes, reportsRes] = await Promise.all([
      supabase
        .from("flights")
        .select("departure, destination, aircraft, tail_number, status, created_at")
        .eq("id", flightId)
        .single(),
      supabase
        .from("frat_submissions")
        .select("score, risk_level, factors, wx_briefing, departure, destination")
        .eq("org_id", orgId)
        .eq("flight_id", flightId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("safety_reports")
        .select("title, description, category, severity")
        .eq("org_id", orgId)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 3600000).toISOString())
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const flight = flightRes.data;
    if (!flight) {
      return new Response(
        JSON.stringify({ suggestion: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch aircraft MEL items if we have a tail number
    let melItems: string[] = [];
    if (flight.tail_number) {
      const { data: aircraft } = await supabase
        .from("aircraft")
        .select("mel_items")
        .eq("org_id", orgId)
        .eq("registration", flight.tail_number)
        .limit(1);
      if (aircraft?.[0]?.mel_items) {
        const items = aircraft[0].mel_items;
        melItems = Array.isArray(items)
          ? items.map((m: { description?: string; item?: string }) => m.description || m.item || JSON.stringify(m))
          : [];
      }
    }

    const frat = fratRes.data?.[0] || null;
    const recentReports = reportsRes.data || [];

    // Filter reports relevant to this route's airports
    const routeAirports = [flight.departure, flight.destination].filter(Boolean);
    const relevantReports = recentReports.filter((r: { title?: string; description?: string }) => {
      const text = `${r.title || ""} ${r.description || ""}`.toLowerCase();
      return routeAirports.some(apt => apt && text.includes(apt.toLowerCase()));
    });

    // Build factors list from FRAT
    const factorsList = frat?.factors
      ? (frat.factors as Array<string | { label?: string; id?: string }>)
          .map((f) => typeof f === "string" ? f : f.label || f.id || "")
          .filter(Boolean)
          .join(", ")
      : "None flagged";

    // Build recent report summaries
    const reportSummaries = relevantReports.length > 0
      ? relevantReports.map((r: { title?: string; category?: string }) => `${r.category || "General"}: ${r.title || "Untitled"}`).join("; ")
      : "None";

    const prompt = `You are a safety analyst for an aviation SMS. A pilot just completed a flight.
Based on the flight context below, write ONE short, specific safety prompt (1-2 sentences)
that encourages the pilot to report something relevant. Be conversational, not formal.

FLIGHT: ${flight.departure || "?"} → ${flight.destination || "?"}, ${flight.aircraft || "Unknown"} (${flight.tail_number || "N/A"})
FRAT SCORE: ${frat ? `${frat.score} (${frat.risk_level})` : "No FRAT filed"} — Factors flagged: ${factorsList}
WEATHER BRIEFING: ${frat?.wx_briefing || "None filed"}
AIRCRAFT MEL: ${melItems.length > 0 ? melItems.join(", ") : "No MEL items"}
RECENT REPORTS AT THESE AIRPORTS: ${reportSummaries}

Respond with ONLY the suggestion text, no JSON, no quotes, no preamble.
Examples of good suggestions:
- "You flagged crosswinds on the FRAT — how were conditions on final at KBOI?"
- "Any turbulence worth noting on today's mountain route?"
- "The MEL shows the autopilot is deferred — did that affect workload today?"`;

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
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const suggestion = claudeData.content?.[0]?.text?.trim() || null;

    // Log usage
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
    await supabase.from("ai_usage_log").insert({
      org_id: orgId,
      user_id: user.id,
      feature: "nudge_suggestion",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify({ suggestion, model: "claude-sonnet-4-6" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ suggestion: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
