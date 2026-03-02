// Notification category mapping and preference helpers
// Used by NotificationCenter, MobileNotificationsView, and check-training.js

export const NOTIFICATION_CATEGORY_MAP = {
  // Operations
  frat_needs_approval: "operations",
  frat_rejected: "operations",
  frat_submitted: "operations",
  frat_self_dispatched: "operations",
  foreflight_frat_created: "operations",
  schedaero_frat_created: "operations",
  schedaero_sync_error: "operations",
  api_webhook_failed: "operations",
  adsb_provider_degraded: "operations",
  // Safety
  report_submitted: "safety",
  report_status_update: "safety",
  investigation_created: "safety",
  safety_bulletin: "safety",
  safety_digest: "safety",
  trend_alert: "safety",
  asap_report_submitted: "safety",
  asap_erc_decision: "safety",
  // Training
  training_expiring: "training",
  // Corrective Actions
  action_overdue: "corrective_actions",
  action_due_soon: "corrective_actions",
  action_created: "corrective_actions",
  action_assigned: "corrective_actions",
  asap_corrective_action_due: "corrective_actions",
  // Compliance
  audit_due: "compliance",
  audit_overdue: "compliance",
  audit_finding: "compliance",
  compliance_item_expiring: "compliance",
  moc_assigned: "compliance",
  moc_review_due: "compliance",
  // General
  engagement_milestone: "general",
  culture_survey_available: "general",
  policy_published: "general",
  erp_drill_due: "general",
  erp_plan_review_due: "general",
  spi_threshold_approaching: "general",
  spi_target_breached: "general",
};

export const CATEGORY_LABELS = {
  operations: "Operations",
  safety: "Safety",
  training: "Training",
  corrective_actions: "Corrective Actions",
  compliance: "Compliance",
  general: "General",
};

export const CATEGORY_DESCRIPTIONS = {
  operations: "FRATs, dispatching, integrations, and sync alerts",
  safety: "Safety reports, investigations, bulletins, and trend alerts",
  training: "Training expiry and compliance reminders",
  corrective_actions: "Corrective action assignments and due dates",
  compliance: "Audits, compliance items, and management of change",
  general: "Engagement, surveys, policies, ERP drills, and SPI alerts",
};

// All category keys in display order
export const CATEGORY_ORDER = [
  "operations",
  "safety",
  "training",
  "corrective_actions",
  "compliance",
  "general",
];

/**
 * Returns true if a notification of the given type should be shown/sent,
 * based on the user's preferences object.
 *
 * prefs is the notification_preferences jsonb from the profiles table.
 * null/undefined prefs = all enabled (opt-out model).
 * prefs shape: { operations: true, safety: false, ... }
 * Missing keys = enabled.
 */
export function isNotificationEnabled(type, prefs) {
  if (!prefs) return true; // null prefs = all enabled
  const category = NOTIFICATION_CATEGORY_MAP[type];
  if (!category) return true; // unknown types are always shown
  return prefs[category] !== false; // only explicitly false disables
}
