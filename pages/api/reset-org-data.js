// /api/reset-org-data
// One-click cascade delete of all org data for trial/active users
// Preserves profiles, organizations, and auth users

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { orgId } = req.body;
    if (!orgId) return res.status(400).json({ error: "orgId required" });

    // Verify caller belongs to org and has admin-level role
    const { data: callerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, org_id, role")
      .eq("id", user.id)
      .eq("org_id", orgId)
      .single();

    if (profileErr || !callerProfile) {
      return res.status(403).json({ error: "You are not a member of this organization" });
    }

    const adminRoles = ["admin", "safety_manager", "accountable_exec", "chief_pilot"];
    if (!adminRoles.includes(callerProfile.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Verify org is trial or active (for post-payment reset)
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, subscription_status, settings")
      .eq("id", orgId)
      .single();

    if (orgErr || !org) return res.status(404).json({ error: "Organization not found" });

    if (!["trial", "active"].includes(org.subscription_status)) {
      return res.status(403).json({ error: "Start Fresh is only available for trial or active subscriptions" });
    }

    // Collect user IDs for this org (needed for user-scoped tables)
    const { data: profiles } = await supabase.from("profiles").select("id").eq("org_id", orgId);
    const userIds = (profiles || []).map(p => p.id);

    // ── CASCADE DELETE (FK-safe order) ──

    // ASAP
    await supabase.from("asap_corrective_actions").delete().eq("org_id", orgId);
    await supabase.from("asap_erc_reviews").delete().eq("org_id", orgId);
    await supabase.from("asap_meetings").delete().eq("org_id", orgId);
    await supabase.from("asap_reports").delete().eq("org_id", orgId);
    await supabase.from("asap_config").delete().eq("org_id", orgId);

    // Audits
    await supabase.from("audit_responses").delete().eq("org_id", orgId);
    await supabase.from("audit_schedules").delete().eq("org_id", orgId);
    await supabase.from("audits").delete().eq("org_id", orgId);
    await supabase.from("audit_templates").delete().eq("org_id", orgId);

    // CBT (lessons need subquery via course IDs)
    await supabase.from("cbt_progress").delete().eq("org_id", orgId);
    await supabase.from("cbt_enrollments").delete().eq("org_id", orgId);
    const { data: cbtCourses } = await supabase.from("cbt_courses").select("id").eq("org_id", orgId);
    const courseIds = (cbtCourses || []).map(c => c.id);
    if (courseIds.length > 0) {
      await supabase.from("cbt_lessons").delete().in("course_id", courseIds);
    }
    await supabase.from("cbt_courses").delete().eq("org_id", orgId);

    // Compliance & declarations
    await supabase.from("compliance_status").delete().eq("org_id", orgId);
    await supabase.from("compliance_frameworks").delete().eq("org_id", orgId);
    await supabase.from("declarations").delete().eq("org_id", orgId);

    // Culture surveys
    await supabase.from("culture_survey_results").delete().eq("org_id", orgId);
    await supabase.from("culture_survey_responses").delete().eq("org_id", orgId);
    await supabase.from("culture_surveys").delete().eq("org_id", orgId);

    // ERP
    await supabase.from("erp_drills").delete().eq("org_id", orgId);
    // erp_call_tree, erp_checklist_items, and erp_acknowledgments reference erp_plans
    const { data: erpPlans } = await supabase.from("erp_plans").select("id").eq("org_id", orgId);
    const erpPlanIds = (erpPlans || []).map(p => p.id);
    if (erpPlanIds.length > 0) {
      await supabase.from("erp_acknowledgments").delete().in("erp_plan_id", erpPlanIds);
      await supabase.from("erp_call_tree").delete().in("erp_plan_id", erpPlanIds);
      await supabase.from("erp_checklist_items").delete().in("erp_plan_id", erpPlanIds);
    }
    await supabase.from("erp_plans").delete().eq("org_id", orgId);

    // MOC
    await supabase.from("moc_attachments").delete().eq("org_id", orgId);
    await supabase.from("management_of_change").delete().eq("org_id", orgId);

    // Integrations (MUST come before flights/frat_submissions — FK references without CASCADE)
    await supabase.from("foreflight_flights").delete().eq("org_id", orgId);
    await supabase.from("foreflight_config").delete().eq("org_id", orgId);
    await supabase.from("schedaero_trips").delete().eq("org_id", orgId);
    await supabase.from("schedaero_config").delete().eq("org_id", orgId);

    // Safety core
    await supabase.from("corrective_actions").delete().eq("org_id", orgId);
    await supabase.from("hazard_register").delete().eq("org_id", orgId);
    await supabase.from("safety_reports").delete().eq("org_id", orgId);
    await supabase.from("nudge_responses").delete().eq("org_id", orgId);
    await supabase.from("fatigue_assessments").delete().eq("org_id", orgId);
    await supabase.from("flight_positions").delete().eq("org_id", orgId);
    await supabase.from("flights").delete().eq("org_id", orgId);
    await supabase.from("frat_submissions").delete().eq("org_id", orgId);
    await supabase.from("mel_audit_log").delete().eq("org_id", orgId);
    await supabase.from("aircraft").delete().eq("org_id", orgId);

    // SPI
    await supabase.from("spi_measurements").delete().eq("org_id", orgId);
    await supabase.from("safety_performance_targets").delete().eq("org_id", orgId);
    await supabase.from("safety_performance_indicators").delete().eq("org_id", orgId);

    // Training & policy
    if (userIds.length > 0) {
      await supabase.from("policy_acknowledgments").delete().in("user_id", userIds);
    }
    await supabase.from("policy_documents").delete().eq("org_id", orgId);
    await supabase.from("training_records").delete().eq("org_id", orgId);
    await supabase.from("training_requirements").delete().eq("org_id", orgId);
    await supabase.from("sms_manuals").delete().eq("org_id", orgId);

    // Engagement (user-scoped)
    await supabase.from("pilot_engagement").delete().eq("org_id", orgId);
    await supabase.from("safety_recognitions").delete().eq("org_id", orgId);

    // AI & analytics
    await supabase.from("trend_alerts").delete().eq("org_id", orgId);
    await supabase.from("ai_suggestions").delete().eq("org_id", orgId);
    await supabase.from("safety_digests").delete().eq("org_id", orgId);
    await supabase.from("ai_usage_log").delete().eq("org_id", orgId);

    // API & webhooks
    await supabase.from("api_keys").delete().eq("org_id", orgId);
    await supabase.from("api_request_log").delete().eq("org_id", orgId);
    await supabase.from("webhooks").delete().eq("org_id", orgId);

    // Notifications
    if (userIds.length > 0) {
      await supabase.from("notification_reads").delete().in("user_id", userIds);
    }
    await supabase.from("notifications").delete().eq("org_id", orgId);
    await supabase.from("notification_contacts").delete().eq("org_id", orgId);
    await supabase.from("overdue_notifications").delete().eq("org_id", orgId);

    // Other
    await supabase.from("frat_templates").delete().eq("org_id", orgId);
    await supabase.from("invitations").delete().eq("org_id", orgId);
    await supabase.from("trial_emails_sent").delete().eq("org_id", orgId);
    await supabase.from("insurance_exports").delete().eq("org_id", orgId);

    // ── RESET ORG SETTINGS ──
    const settings = org.settings || {};
    settings.onboarding_v2 = {
      started_at: new Date().toISOString(),
      completed_at: null,
      dismissed_at: null,
      flows: {
        fleet: { status: "not_started", current_step: 0 },
        frat: { status: "not_started", current_step: 0 },
        flights: { status: "not_started", current_step: 0 },
        safety_report: { status: "not_started", current_step: 0 },
        policy_manuals: { status: "not_started", current_step: 0 },
        training: { status: "not_started", current_step: 0 },
        investigations: { status: "not_started", current_step: 0 },
        integrations: { status: "not_started", current_step: 0 },
        custom_frat: { status: "not_started", current_step: 0 },
        compliance: { status: "not_started", current_step: 0 },
      },
    };
    settings.template_variables = {};
    settings.sms_signatures = {};

    await supabase.from("organizations").update({ settings }).eq("id", orgId);

    // Reset tour state for all users in org
    if (userIds.length > 0) {
      await supabase.from("profiles").update({ onboarding_tour: null }).in("id", userIds);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
