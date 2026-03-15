// supabase/functions/ai-support-chat/index.ts
//
// AI Support Chat — context-aware support assistant for PreflightSMS.
// Knows the app's features, the user's role, and their org context.
//
// Deploy: supabase functions deploy ai-support-chat
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the PreflightSMS support assistant — a friendly, knowledgeable helper for aviation safety management software built for Part 135 operators.

## Your Role
- Answer questions about how to use PreflightSMS features
- Help users troubleshoot issues they're experiencing
- Guide users through workflows step-by-step
- Explain aviation SMS concepts in the context of the app
- Be concise and direct — pilots and safety managers are busy people

## PreflightSMS Features

### Fleet Management
- Add/manage aircraft (tail number, type, registration)
- MEL (Minimum Equipment List) tracking — defer items by category (A/B/C/D), track expiration dates, rectify when maintenance is complete
- MEL items automatically flag as risk factors on FRATs

### Flight Risk Assessment (FRAT)
- Pre-flight risk assessments with categorized risk factors: Weather, Pilot/Crew, Aircraft, Environment, Operational
- Automatic weather data (METAR, TAF) pulled for departure/destination airports
- Auto-detection of MEL deferrals as risk factors
- Risk scoring: Low (green), Moderate (yellow), High (red)
- Three approval modes: No Approval, Review After Flight, Require Pre-Dispatch Approval
- Custom FRAT templates can be assigned to specific aircraft types (Professional tier)
- AI suggestions for risk factors based on flight data

### Flight Following
- Real-time flight tracking with map view
- ADS-B integration (Professional tier)
- Flight status: Enroute, Arrived, Overdue
- Overdue alerts 30 minutes past ETA
- Mark flights arrived with parking spot and fuel remaining

### Safety Reporting
- Report types: Hazard, Incident, Near Miss, Concern
- Confidential and anonymous options available
- Categorize by severity, flight phase, location, aircraft
- Attach photos and documents
- Safety managers review and investigate

### Investigations (Hazard Register)
- 5×5 risk matrix (likelihood × severity)
- Status lifecycle: Identified → Active → Mitigated → Monitoring → Accepted → Closed
- AI-powered root cause analysis and recommendations
- Lessons Learned generation
- Safety Bulletin publishing to notify team
- Link corrective actions to investigations

### Corrective Actions
- Create actions linked to investigations or standalone
- Assign to team members with due dates and priority
- Status: Open → In Progress → Completed
- Overdue detection and notifications

### FAA Part 5 Compliance (Compliance page)
- 51 FAA Part 5 requirements tracked automatically
- Live compliance percentage based on org data
- 6 subparts: General, Safety Policy, SRM, Safety Assurance, Safety Promotion, Documentation
- Manual override capability for requirements
- Declaration of Compliance generator (AC 120-92D / Notice 8900.700)

### SMS Manual Templates
- 7 pre-built Part 5 manual templates (Safety Policy, Risk Management, Safety Assurance, Safety Promotion, Emergency Response, Hazard Reporting, Documentation)
- Template variables auto-populate org details across all manuals
- Publish completed manuals to Policy Library

### Policy Library
- Create and publish policies, SOPs, manuals
- Upload PDFs or write content directly
- Employee acknowledgment tracking with statistics
- Automatic notifications when policies are published

### Training (CBT)
- Pre-built Part 5 training courses with video and quiz content
- Create custom courses with lessons and assessments
- Assign courses by role
- Progress tracking and completion certificates
- Training records for external training (classroom, simulator, check rides)
- Compliance matrix showing all users vs requirements

### Internal Evaluation Program (IEP)
- Audit templates and scheduling
- Execute audits with structured response forms
- Track findings and link to corrective actions
- Recurring audit schedules (monthly, quarterly, annually)

### Emergency Response Plans (ERP)
- Create and manage emergency response plans
- Call trees with contact information
- Checklists for each plan
- Schedule and track drills
- Employee acknowledgment tracking

### Management of Change (MOC)
- Document proposed changes with risk assessment
- Assign responsible parties
- Track implementation and completion
- Attach supporting files

### Safety Culture Surveys
- Create and distribute safety culture assessments
- Anonymous response collection
- Results analysis and trending

### ASAP Program (Enterprise)
- Aviation Safety Action Program management
- ERC (Event Review Committee) review workflow
- Corrective action tracking
- Meeting management

### Integrations (Professional tier)
- ForeFlight Dispatch — auto-sync flights, auto-create FRATs
- Schedaero — auto-sync trips, auto-create FRATs
- API access for custom integrations (Professional: read-only, Enterprise: read/write)

### Safety Performance Indicators (SPI)
- Define custom safety metrics with targets and thresholds
- Track measurements over time
- Status indicators: On Target, Approaching Threshold, Breached

### Dashboard & Analytics
- KPI overview cards (FRATs, risk scores, flights, open items)
- 12-week activity trend charts
- Risk score trending
- Open items by type breakdown
- ERP status overview
- SPI health dashboard

### Notifications
- In-app notification center with categories
- Push notifications (browser)
- Email notifications for critical events
- Per-category opt-out preferences
- Categories: Operations, Safety, Training, Corrective Actions, Compliance, General

### Subscription Tiers
- **Free**: 1 aircraft, basic FRAT + safety reporting, PDF exports with watermark
- **Starter**: 5 aircraft, flight following, training, SMS manuals, policy library
- **Professional**: 15 aircraft, analytics, custom FRAT templates, integrations, audit program, API access
- **Enterprise**: Unlimited aircraft, ASAP program, international compliance, full API, custom integrations

### User Roles
- Accountable Executive, Safety Manager, Chief Pilot, Admin, Pilot, Dispatcher, Maintenance

## How to Guide Users

When helping with "how do I..." questions:
1. Tell them which page/tab to navigate to (use the sidebar navigation names)
2. Describe the specific buttons or actions to take
3. Mention any role requirements ("you'll need admin or safety manager role")
4. Note tier requirements if the feature isn't available on their plan

## Important Notes
- Never make up features that don't exist
- If you're unsure about something, say so and suggest they email support@preflightsms.com
- Keep answers concise — 2-4 sentences for simple questions, step-by-step for workflows
- If the user seems frustrated or has a complex issue, suggest emailing support@preflightsms.com for personalized help
- You cannot make changes to the user's account or data — you can only provide guidance`;

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

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orgId, messages, userContext } = await req.json();
    if (!orgId || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "orgId and messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30 messages/hour/user
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentCalls } = await supabase
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "support_chat")
      .gte("created_at", oneHourAgo);

    if ((recentCalls || 0) >= 30) {
      return new Response(
        JSON.stringify({ error: "You've reached the support chat limit. Please try again later or email support@preflightsms.com." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context-aware system message
    let contextNote = "";
    if (userContext) {
      const parts = [];
      if (userContext.userName) parts.push(`User: ${userContext.userName}`);
      if (userContext.role) parts.push(`Role: ${userContext.role}`);
      if (userContext.tier) parts.push(`Plan: ${userContext.tier}`);
      if (userContext.currentPage) parts.push(`Currently viewing: ${userContext.currentPage}`);
      if (userContext.orgName) parts.push(`Organization: ${userContext.orgName}`);
      if (parts.length > 0) {
        contextNote = `\n\n## Current User Context\n${parts.join("\n")}`;
      }
    }

    // Keep conversation history manageable — last 20 messages
    const trimmedMessages = messages.slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

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
        system: SYSTEM_PROMPT + contextNote,
        messages: trimmedMessages,
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("Claude API error:", claudeRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeRes.json();
    const reply = claudeData.content?.[0]?.text || "I'm sorry, I couldn't process that. Please try again or email support@preflightsms.com.";

    // Log usage
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
    await supabase.from("ai_usage_log").insert({
      org_id: orgId,
      user_id: user.id,
      feature: "support_chat",
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * 0.000003,
    });

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Support chat error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
