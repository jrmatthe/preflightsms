// Shared cascade-delete helper for full organization removal
// Deletes all data, profiles, auth users, and the org itself
// Used by: platform-admin.js (delete_org), process-deletions.js (cron)

export async function deleteOrganization(supabaseAdmin, orgId) {
  // Resolve Supabase URL and service key for direct GoTrue API calls
  // (supabase-js listUsers filter is unreliable — use GoTrue REST API directly)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  // Get all user profiles in this org so we can delete their auth accounts
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, email").eq("org_id", orgId);
  const userIds = (profiles || []).map(p => p.id);
  const userEmails = (profiles || []).map(p => p.email).filter(Boolean);

  // ── DELETE AUTH USERS FIRST ──
  // Must happen before profile/data deletion so we still have profile data
  // to look up auth users. profiles.id = auth.users.id (FK relationship).
  // Deleting auth user cascades to profile row automatically.
  const failedDeletes = [];
  for (const uid of userIds) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) {
      console.error(`Failed to delete auth user ${uid}:`, error.message);
      failedDeletes.push({ uid, error: error.message });
    }
  }

  // Fallback for any failures: look up auth users by email via GoTrue REST API
  // This catches edge cases where profile.id doesn't match auth.users.id
  if (failedDeletes.length > 0 && supabaseUrl && supabaseServiceKey) {
    for (const failed of [...failedDeletes]) {
      const profile = (profiles || []).find(p => p.id === failed.uid);
      if (profile?.email) {
        try {
          const goTrueRes = await fetch(
            `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(profile.email)}`,
            { headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey } }
          );
          if (goTrueRes.ok) {
            const body = await goTrueRes.json();
            const users = body.users || body;
            for (const u of (Array.isArray(users) ? users : [])) {
              const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id);
              if (!error) {
                const idx = failedDeletes.findIndex(f => f.uid === failed.uid);
                if (idx !== -1) failedDeletes.splice(idx, 1);
              }
            }
          }
        } catch (e) {
          console.error(`GoTrue fallback failed for ${profile.email}:`, e.message);
        }
      }
    }
  }

  // Also scan for any auth users with org emails that weren't in profiles
  // (e.g., auth user created but profile insert failed during signup)
  if (supabaseUrl && supabaseServiceKey) {
    for (const email of userEmails) {
      try {
        const goTrueRes = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
          { headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey } }
        );
        if (goTrueRes.ok) {
          const body = await goTrueRes.json();
          const users = body.users || body;
          for (const u of (Array.isArray(users) ? users : [])) {
            if (!userIds.includes(u.id)) {
              const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id);
              if (error) console.error(`Failed to delete orphaned auth user ${u.id} (${email}):`, error.message);
            }
          }
        }
      } catch (e) {
        console.error(`Error scanning for orphaned auth user ${email}:`, e.message);
      }
    }
  }

  // ── CASCADE DELETE (FK-safe order — children before parents) ──
  // Note: many profile/data rows may already be gone due to auth user CASCADE deletion above

  // ASAP
  await supabaseAdmin.from("asap_corrective_actions").delete().eq("org_id", orgId);
  await supabaseAdmin.from("asap_erc_reviews").delete().eq("org_id", orgId);
  await supabaseAdmin.from("asap_meetings").delete().eq("org_id", orgId);
  await supabaseAdmin.from("asap_reports").delete().eq("org_id", orgId);
  await supabaseAdmin.from("asap_config").delete().eq("org_id", orgId);

  // Audits
  await supabaseAdmin.from("audit_responses").delete().eq("org_id", orgId);
  await supabaseAdmin.from("audit_schedules").delete().eq("org_id", orgId);
  await supabaseAdmin.from("audits").delete().eq("org_id", orgId);
  await supabaseAdmin.from("audit_templates").delete().eq("org_id", orgId);

  // CBT (lessons need subquery via course IDs)
  await supabaseAdmin.from("cbt_progress").delete().eq("org_id", orgId);
  await supabaseAdmin.from("cbt_enrollments").delete().eq("org_id", orgId);
  const { data: cbtCourses } = await supabaseAdmin.from("cbt_courses").select("id").eq("org_id", orgId);
  const courseIds = (cbtCourses || []).map(c => c.id);
  if (courseIds.length > 0) {
    await supabaseAdmin.from("cbt_lessons").delete().in("course_id", courseIds);
  }
  await supabaseAdmin.from("cbt_courses").delete().eq("org_id", orgId);

  // Compliance & declarations
  await supabaseAdmin.from("compliance_status").delete().eq("org_id", orgId);
  await supabaseAdmin.from("compliance_frameworks").delete().eq("org_id", orgId);
  await supabaseAdmin.from("declarations").delete().eq("org_id", orgId);

  // Culture surveys
  await supabaseAdmin.from("culture_survey_results").delete().eq("org_id", orgId);
  await supabaseAdmin.from("culture_survey_responses").delete().eq("org_id", orgId);
  await supabaseAdmin.from("culture_surveys").delete().eq("org_id", orgId);

  // ERP (acknowledgments before plans)
  await supabaseAdmin.from("erp_drills").delete().eq("org_id", orgId);
  const { data: erpPlans } = await supabaseAdmin.from("erp_plans").select("id").eq("org_id", orgId);
  const erpPlanIds = (erpPlans || []).map(p => p.id);
  if (erpPlanIds.length > 0) {
    await supabaseAdmin.from("erp_acknowledgments").delete().in("erp_plan_id", erpPlanIds);
    await supabaseAdmin.from("erp_call_tree").delete().in("erp_plan_id", erpPlanIds);
    await supabaseAdmin.from("erp_checklist_items").delete().in("erp_plan_id", erpPlanIds);
  }
  await supabaseAdmin.from("erp_plans").delete().eq("org_id", orgId);

  // MOC
  await supabaseAdmin.from("moc_attachments").delete().eq("org_id", orgId);
  await supabaseAdmin.from("management_of_change").delete().eq("org_id", orgId);

  // Integrations (before flights/frat_submissions — FK references)
  await supabaseAdmin.from("foreflight_flights").delete().eq("org_id", orgId);
  await supabaseAdmin.from("foreflight_config").delete().eq("org_id", orgId);
  await supabaseAdmin.from("schedaero_trips").delete().eq("org_id", orgId);
  await supabaseAdmin.from("schedaero_config").delete().eq("org_id", orgId);

  // Safety core (FK-safe: children before parents)
  await supabaseAdmin.from("corrective_actions").delete().eq("org_id", orgId);
  await supabaseAdmin.from("hazard_register").delete().eq("org_id", orgId);
  await supabaseAdmin.from("safety_reports").delete().eq("org_id", orgId);
  await supabaseAdmin.from("nudge_responses").delete().eq("org_id", orgId);
  await supabaseAdmin.from("fatigue_assessments").delete().eq("org_id", orgId);
  await supabaseAdmin.from("flight_positions").delete().eq("org_id", orgId);
  await supabaseAdmin.from("flights").delete().eq("org_id", orgId);
  await supabaseAdmin.from("frat_submissions").delete().eq("org_id", orgId);
  await supabaseAdmin.from("mel_audit_log").delete().eq("org_id", orgId);
  await supabaseAdmin.from("aircraft").delete().eq("org_id", orgId);

  // SPI
  await supabaseAdmin.from("spi_measurements").delete().eq("org_id", orgId);
  await supabaseAdmin.from("safety_performance_targets").delete().eq("org_id", orgId);
  await supabaseAdmin.from("safety_performance_indicators").delete().eq("org_id", orgId);

  // Training & policy
  if (userIds.length > 0) {
    await supabaseAdmin.from("policy_acknowledgments").delete().in("user_id", userIds);
  }
  await supabaseAdmin.from("policy_documents").delete().eq("org_id", orgId);
  await supabaseAdmin.from("training_records").delete().eq("org_id", orgId);
  await supabaseAdmin.from("training_requirements").delete().eq("org_id", orgId);
  await supabaseAdmin.from("sms_manuals").delete().eq("org_id", orgId);

  // Engagement
  await supabaseAdmin.from("pilot_engagement").delete().eq("org_id", orgId);
  await supabaseAdmin.from("safety_recognitions").delete().eq("org_id", orgId);

  // AI & analytics
  await supabaseAdmin.from("trend_alerts").delete().eq("org_id", orgId);
  await supabaseAdmin.from("ai_suggestions").delete().eq("org_id", orgId);
  await supabaseAdmin.from("safety_digests").delete().eq("org_id", orgId);
  await supabaseAdmin.from("ai_usage_log").delete().eq("org_id", orgId);

  // API & webhooks
  await supabaseAdmin.from("api_keys").delete().eq("org_id", orgId);
  await supabaseAdmin.from("api_request_log").delete().eq("org_id", orgId);
  await supabaseAdmin.from("webhooks").delete().eq("org_id", orgId);

  // Notifications & push subscriptions
  if (userIds.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("user_id", userIds);
    await supabaseAdmin.from("notification_reads").delete().in("user_id", userIds);
  }
  await supabaseAdmin.from("notifications").delete().eq("org_id", orgId);
  await supabaseAdmin.from("notification_contacts").delete().eq("org_id", orgId);
  await supabaseAdmin.from("overdue_notifications").delete().eq("org_id", orgId);

  // Other
  await supabaseAdmin.from("frat_templates").delete().eq("org_id", orgId);
  await supabaseAdmin.from("invitations").delete().eq("org_id", orgId);
  await supabaseAdmin.from("trial_emails_sent").delete().eq("org_id", orgId);
  await supabaseAdmin.from("insurance_exports").delete().eq("org_id", orgId);

  // ── DELETE PROFILES & ORG ──
  // Profile rows may already be gone (CASCADE from auth.users deletion above)
  await supabaseAdmin.from("profiles").delete().eq("org_id", orgId);
  await supabaseAdmin.from("organizations").delete().eq("id", orgId);

  if (failedDeletes.length > 0) {
    console.error(`WARNING: ${failedDeletes.length} auth user(s) could not be deleted for org ${orgId}:`, failedDeletes);
  }

  return { deleted_users: userIds.length, failed_auth_deletes: failedDeletes };
}
