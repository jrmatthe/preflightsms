// Subscription tier definitions and feature gating

export const TIERS = {
  starter: {
    name: "Starter",
    price: 149,
    maxAircraft: 5,
    features: {
      frat: true,
      flight_following: true,
      crew_roster: true,
      safety_reporting: true,
      hazard_register: true,
      corrective_actions: true,
      policy_library: true,
      training_records: true,
      dashboard_basic: true,
      dashboard_analytics: false,
      safety_trend_alerts: false,
      scheduled_reports: false,
      faa_audit_log: false,
      custom_frat_template: false,
      cbt_modules: false,
      role_permissions: false,
      approval_workflow: false,
      document_library: false,
      sms_manuals: false,
      api_access: false,
      multi_base: false,
      custom_integrations: false,
      priority_support: false,
    },
  },
  professional: {
    name: "Professional",
    price: 299,
    maxAircraft: 15,
    features: {
      frat: true,
      flight_following: true,
      crew_roster: true,
      safety_reporting: true,
      hazard_register: true,
      corrective_actions: true,
      policy_library: true,
      training_records: true,
      dashboard_basic: true,
      dashboard_analytics: true,
      safety_trend_alerts: true,
      scheduled_reports: true,
      faa_audit_log: true,
      custom_frat_template: true,
      cbt_modules: true,
      role_permissions: true,
      approval_workflow: true,
      document_library: true,
      sms_manuals: true,
      api_access: false,
      multi_base: false,
      custom_integrations: false,
      priority_support: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    price: null, // Custom
    maxAircraft: 999,
    features: {
      frat: true,
      flight_following: true,
      crew_roster: true,
      safety_reporting: true,
      hazard_register: true,
      corrective_actions: true,
      policy_library: true,
      training_records: true,
      dashboard_basic: true,
      dashboard_analytics: true,
      safety_trend_alerts: true,
      scheduled_reports: true,
      faa_audit_log: true,
      custom_frat_template: true,
      cbt_modules: true,
      role_permissions: true,
      approval_workflow: true,
      document_library: true,
      sms_manuals: true,
      api_access: true,
      multi_base: true,
      custom_integrations: true,
      priority_support: true,
    },
  },
};

// Feature display names for UI
export const FEATURE_LABELS = {
  frat: "Flight Risk Assessment (FRAT)",
  flight_following: "Flight Following",
  crew_roster: "Crew Roster & Tracking",
  safety_reporting: "Safety Reporting",
  hazard_register: "Hazard Register",
  corrective_actions: "Corrective Actions",
  policy_library: "Policy Library",
  training_records: "Training Records",
  dashboard_basic: "Dashboard (Basic Stats)",
  dashboard_analytics: "Dashboard Analytics (Trends & Charts)",
  safety_trend_alerts: "Safety Trend Alerts",
  scheduled_reports: "Scheduled PDF Reports",
  faa_audit_log: "FAA Part 5 Audit Log",
  custom_frat_template: "Custom FRAT Templates",
  cbt_modules: "CBT Modules & Tracking",
  role_permissions: "Role-Based Permissions",
  approval_workflow: "FRAT Approval Workflow",
  document_library: "Document Library & Version Control",
  sms_manuals: "SMS Manual Templates",
  api_access: "API Access",
  multi_base: "Multi-Base Support",
  custom_integrations: "Custom Integrations",
  priority_support: "Priority Support",
};

// Check if a specific feature is enabled for an org
export function hasFeature(org, featureKey) {
  if (!org) return false;
  // Check feature_flags on the org object (overrides tier defaults)
  if (org.feature_flags && typeof org.feature_flags === "object") {
    if (featureKey in org.feature_flags) return org.feature_flags[featureKey];
  }
  // Fall back to tier defaults
  const tier = TIERS[org.tier || "starter"];
  return tier?.features?.[featureKey] ?? false;
}

// Get the default feature set for a tier
export function getTierFeatures(tierName) {
  return TIERS[tierName]?.features || TIERS.starter.features;
}

// Map nav items to required features
export const NAV_FEATURE_MAP = {
  submit: "frat",
  flights: "flight_following",
  crew: "crew_roster",
  reports: "safety_reporting",
  hazards: "hazard_register",
  actions: "corrective_actions",
  policy: "policy_library",
  cbt: "cbt_modules",
  audit: "faa_audit_log",
  manuals: "sms_manuals",
  dashboard: "dashboard_basic",
  admin: null, // always available
};
