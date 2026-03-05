import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { supabase, signIn, signUp, signOut, resetPasswordForEmail, updateUserPassword, getSession, getProfile, submitFRAT, fetchFRATs, deleteFRAT, createFlight, deleteFlight, fetchFlights, updateFlightStatus, subscribeToFlights, subscribeToNotifications, submitReport, fetchReports, updateReport, createHazard, fetchHazards, updateHazard, createAction, fetchActions, updateAction, fetchOrgProfiles, updateProfileRole, updateProfilePermissions, updateProfileEmail, createPolicy, fetchPolicies, acknowledgePolicy, createTrainingRequirement, fetchTrainingRequirements, createTrainingRecord, fetchTrainingRecords, deleteTrainingRecord, deleteTrainingRequirement, uploadOrgLogo, fetchFratTemplate, fetchAllFratTemplates, upsertFratTemplate, createFratTemplate, deleteFratTemplate, setActiveFratTemplate, uploadFratAttachment, approveFlight, rejectFlight, selfDispatchFlight, approveRejectFRAT, updateOrg, fetchAircraft, createAircraft, updateAircraft, updateAircraftStatus, deleteAircraft, fetchCbtCourses, createCbtCourse, updateCbtCourse, deleteCbtCourse, fetchCbtLessons, upsertCbtLesson, deleteCbtLesson, fetchCbtProgress, upsertCbtProgress, fetchCbtEnrollments, upsertCbtEnrollment, fetchInvitations, createInvitation, revokeInvitation, resendInvitation, getInvitationByToken, acceptInvitation, reconcileInvitations, removeUserFromOrg, fetchSmsManuals, upsertSmsManual, updateSmsManualSections, deleteSmsManual, saveSmsTemplateVariables, saveSmsSignatures, publishManualToPolicy, clearPolicyAcknowledgments, uploadPolicyFile, fetchNotifications, createNotification, deleteNotificationByLinkId, fetchNotificationReads, markNotificationRead, saveOnboardingStatus, createNudgeResponse, fetchNudgeResponsesForUser, fetchForeflightConfig, upsertForeflightConfig, fetchForeflightFlights, fetchPendingForeflightFlights, updateForeflightFlight, fetchSchedaeroConfig, upsertSchedaeroConfig, fetchSchedaeroTrips, fetchPendingSchedaeroTrips, updateSchedaeroTrip, fetchErpPlans, createErpPlan, updateErpPlan, deleteErpPlan, fetchErpChecklistItems, upsertErpChecklistItems, fetchErpCallTree, upsertErpCallTree, fetchErpDrills, createErpDrill, updateErpDrill, deleteErpDrill, fetchSpis, createSpi, updateSpi, deleteSpi, fetchSpiTargets, createSpiTarget, updateSpiTarget, deleteSpiTarget, fetchSpiMeasurements, fetchAllSpiMeasurements, createSpiMeasurement, fetchAuditTemplates, createAuditTemplate, updateAuditTemplate, deleteAuditTemplate, fetchAudits, createAudit, updateAudit, fetchAuditResponses, upsertAuditResponse, upsertAuditResponses, fetchAuditSchedules, createAuditSchedule, updateAuditSchedule, deleteAuditSchedule, fetchTrendAlerts, acknowledgeTrendAlert, fetchDeclarations, createDeclaration, updateDeclaration, uploadDeclarationPdf, fetchMocItems, createMocItem, updateMocItem, deleteMocItem, fetchMocAttachments, createMocAttachment, deleteMocAttachment, uploadMocFile, fetchCultureSurveys, createCultureSurvey, updateCultureSurvey, deleteCultureSurvey, fetchCultureSurveyResponses, submitCultureSurveyResponse, fetchCultureSurveyResults, upsertCultureSurveyResults, checkUserSurveyResponse, createFatigueAssessment, fetchPilotEngagement, fetchOrgEngagement, upsertEngagementMetric, fetchSafetyRecognitions, fetchOrgRecognitions, awardRecognition, acknowledgeRecognition, fetchApiKeys, createApiKey, updateApiKey, deleteApiKey, fetchWebhooks, createWebhook, updateWebhook, deleteWebhook, fetchAsapConfig, upsertAsapConfig, fetchAsapReports, fetchAsapReport, createAsapReport, updateAsapReport, deleteAsapReport, fetchAsapReportCount, fetchAsapErcReviews, createAsapErcReview, updateAsapErcReview, fetchAsapCorrectiveActions, fetchAsapCorrectiveActionsForReport, createAsapCorrectiveAction, updateAsapCorrectiveAction, deleteAsapCorrectiveAction, fetchAsapMeetings, createAsapMeeting, updateAsapMeeting, deleteAsapMeeting, fetchComplianceFrameworks, upsertComplianceFramework, deleteComplianceFramework, fetchAllComplianceChecklistItems, fetchComplianceStatus, upsertComplianceStatus, fetchComplianceCrosswalk, fetchInsuranceExports, createInsuranceExport, deleteInsuranceExport, uploadInsuranceExportPdf, updateNotificationPreferences } from "../lib/supabase";
import { hasFeature, NAV_FEATURE_MAP, TIERS, FEATURE_LABELS, getTierFeatures, isFreeTier, FREE_TIER_LIMITS } from "../lib/tiers";
import { initOfflineQueue, enqueue, getQueueCount, flushQueue } from "../lib/offlineQueue";
const DashboardCharts = dynamic(() => import("../components/DashboardCharts"), { ssr: false });
import { computePart5Compliance } from "../components/FaaAuditLog";
const SafetyReporting = dynamic(() => import("../components/SafetyReporting"), { ssr: false });
const HazardRegister = dynamic(() => import("../components/HazardRegister"), { ssr: false });
const CorrectiveActions = dynamic(() => import("../components/CorrectiveActions"), { ssr: false });
const AdminPanel = dynamic(() => import("../components/AdminPanel"), { ssr: false });
const PolicyTraining = dynamic(() => import("../components/PolicyTraining"), { ssr: false });
const SmsManuals = dynamic(() => import("../components/SmsManuals"), { ssr: false });
const CbtModules = dynamic(() => import("../components/CbtModules"), { ssr: false });
const FleetManagement = dynamic(() => import("../components/FleetManagement"), { ssr: false });
const NotificationCenter = dynamic(() => import("../components/NotificationCenter"), { ssr: false });
const PostFlightNudge = dynamic(() => import("../components/PostFlightNudge"), { ssr: false });
const EmergencyResponsePlan = dynamic(() => import("../components/EmergencyResponsePlan"), { ssr: false });
const SafetyPerformanceIndicators = dynamic(() => import("../components/SafetyPerformanceIndicators"), { ssr: false });
const InternalEvaluation = dynamic(() => import("../components/InternalEvaluation"), { ssr: false });
const ManagementOfChange = dynamic(() => import("../components/ManagementOfChange"), { ssr: false });
const SafetyCultureSurvey = dynamic(() => import("../components/SafetyCultureSurvey"), { ssr: false });
const PilotEngagement = dynamic(() => import("../components/PilotEngagement").then(m => ({ default: m.PilotEngagementCard })), { ssr: false });
const TeamEngagement = dynamic(() => import("../components/PilotEngagement").then(m => ({ default: m.TeamEngagementWidget })), { ssr: false });
const AsapProgram = dynamic(() => import("../components/AsapProgram"), { ssr: false });
const InsuranceScorecard = dynamic(() => import("../components/InsuranceScorecard"), { ssr: false });
const UpgradePrompt = dynamic(() => import("../components/UpgradePrompt"), { ssr: false });
const MobileLayout = dynamic(() => import("../components/mobile/MobileLayout"), { ssr: false });
import useIsMobile, { setDesktopPreference } from "../lib/useIsMobile";

const COMPANY_NAME = "PreflightSMS";
const ADMIN_PASSWORD = "admin2026";
const LOGO_URL = "/logo.png";

const BLACK = "#000000";
const NEAR_BLACK = "#0A0A0A";
const DARK = "#111111";
const CARD = "#161616";
const BORDER = "#232323";
const LIGHT_BORDER = "#2E2E2E";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#D4D4D4";
const MUTED = "#666666";
const SUBTLE = "#444444";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";

const DEFAULT_RISK_LEVELS = {
  LOW: { label: "LOW RISK", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", min: 0, max: 15, action: "Flight authorized — standard procedures", approval_mode: "none" },
  MODERATE: { label: "MODERATE RISK", color: YELLOW, bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", min: 16, max: 30, action: "Enhanced awareness — brief crew on elevated risk factors", approval_mode: "none" },
  HIGH: { label: "HIGH RISK", color: AMBER, bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", min: 31, max: 45, action: "Requires management approval before departure", approval_mode: "required" },
  CRITICAL: { label: "CRITICAL RISK", color: RED, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", min: 46, max: 100, action: "Flight should not depart without risk mitigation and executive approval", approval_mode: "required" },
};

const ONBOARDING_STEPS = [
  { id: "welcome", phase: "setup", title: "Welcome to PreflightSMS", desc: "Let\u2019s get your safety management system set up in about 3 minutes.", descNonAdmin: "Here\u2019s a quick tour of your organization\u2019s safety management system." },
  { id: "fleet", phase: "setup", adminOnly: true, title: "Add Your Fleet", desc: "Register the aircraft your organization operates." },
  { id: "invite", phase: "setup", adminOnly: true, title: "Invite Your Team", desc: "Bring your pilots and safety officers on board." },
  // Overview phase — one step per nav tab with brief description
  { id: "ov-frat", phase: "overview", tab: "submit", target: "nav-operations", placement: "right", title: "FRAT", feature: null, desc: "Submit Flight Risk Assessment Tools before every departure to quantify and manage operational risk.", descNonAdmin: "Submit a risk assessment before each flight to flag hazards and get departure authorization." },
  { id: "ov-flights", phase: "overview", tab: "flights", target: "nav-operations", placement: "right", title: "Flight Following", feature: null, desc: "Track live flights from departure to arrival with automatic overdue alerts.", descNonAdmin: "Track your flights from departure to arrival and update your status in real time." },
  { id: "ov-reports", phase: "overview", tab: "reports", target: "nav-safety", placement: "right", title: "Safety Reporting", feature: null, desc: "Receive and manage anonymous hazard and safety reports from your team.", descNonAdmin: "Submit anonymous or confidential safety reports to help your organization improve." },
  { id: "ov-hazards", phase: "overview", tab: "hazards", target: "nav-investigations", placement: "right", title: "Investigations", adminOnly: true, feature: "hazard_register", desc: "Investigate escalated safety reports with risk-scored severity tracking." },
  { id: "ov-actions", phase: "overview", tab: "actions", target: "nav-investigations", placement: "right", title: "Corrective Actions", adminOnly: true, feature: "corrective_actions", desc: "Assign and track corrective and preventative actions through to resolution." },
  { id: "ov-policy", phase: "overview", tab: "policy", target: "nav-documents", placement: "right", title: "Policies & Manuals", feature: "policy_library", desc: "Publish policies with acknowledgment tracking and build Part 5 SMS manuals.", descNonAdmin: "Read and acknowledge your organization\u2019s safety policies and SMS manuals." },
  { id: "ov-cbt", phase: "overview", tab: "cbt", target: "nav-training", placement: "right", title: "Training", feature: "cbt_modules", desc: "Create training courses, set requirements, and monitor crew compliance.", descNonAdmin: "Complete assigned training courses and track your certification requirements." },
  { id: "ov-audits", phase: "overview", tab: "audits", target: "nav-compliance", placement: "right", title: "Audits & Compliance", adminOnly: true, feature: "audit_program", desc: "FAA Part 5 compliance tracking, internal evaluations, audit scheduling, and templates." },
  { id: "ov-dashboard", phase: "overview", tab: "dashboard", target: "nav-dashboard", placement: "right", title: "Safety Dashboard", adminOnly: true, feature: "dashboard_basic", desc: "KPI cards, trend charts, and an overall SMS Health Score for your organization." },
  { id: "ov-admin", phase: "overview", tab: "admin", target: "nav-admin", placement: "right", title: "Admin Panel", adminOnly: true, feature: null, desc: "Organization settings, fleet, FRAT templates, user management, and billing." },
  { id: "ov-erp", phase: "overview", tab: "erp", target: "nav-safety", placement: "right", title: "Emergency Response", feature: null, desc: "Pre-built emergency response plans with checklists, call trees, and drill tracking." },
  { id: "ov-asap", phase: "overview", tab: "asap", target: "nav-safety", placement: "right", title: "ASAP Program", adminOnly: true, feature: "asap_program", desc: "Aviation Safety Action Program with ERC review workflow and corrective action tracking." },
  { id: "ov-moc", phase: "overview", tab: "moc", target: "nav-investigations", placement: "right", title: "Change Management", adminOnly: true, feature: "management_of_change", desc: "Track operational changes through hazard analysis and mitigation with a Kanban workflow." },
  { id: "tour-frat", phase: "tour", tab: "submit", title: "Flight Risk Assessment", feature: null, subSteps: [
    { target: "tour-frat-flight-info", placement: "bottom", title: "Flight Information", desc: "Enter flight details including PIC, aircraft, route, and times. Use ICAO airport codes to auto-fetch live weather data and flag risk factors.", descNonAdmin: "Enter your flight details including aircraft, route, and times. ICAO airport codes auto-fetch live weather data and flag risk factors for you." },
    { target: "tour-frat-risk-categories", placement: "right", title: "Risk Scoring", desc: "Five weighted risk categories \u2014 Weather, Pilot/Crew, Aircraft, Environment, and Operational. Check applicable factors; weather items are auto-detected from METAR/TAF data." },
    { target: "tour-frat-score-panel", placement: "left", title: "Live Risk Score", desc: "The cumulative risk score updates in real time. Color-coded thresholds determine if the flight is authorized or requires additional consideration before departure.", descNonAdmin: "Your cumulative risk score updates in real time. Color-coded thresholds show whether the flight is authorized or requires additional consideration before flying." },
  ]},
  { id: "tour-flights", phase: "tour", tab: "flights", title: "Flight Following", feature: null, subSteps: [
    { target: "tour-flights-board", placement: "bottom", title: "Live Flight Board", desc: "Every submitted FRAT creates a live flight. Track departures and arrivals on an interactive route map with real-time aircraft position estimates.", descNonAdmin: "Every FRAT you submit creates a live flight. View your departures and arrivals on an interactive route map with real-time position estimates." },
    { target: "tour-flights-arrived", placement: "right", title: "Mark Arrived", desc: "When a flight lands, tap Mark Arrived to close it out. Overdue flights automatically trigger email alerts to your notification contacts.", descNonAdmin: "When you land, tap Mark Arrived to close out your flight. Overdue flights automatically alert your safety team \u2014 so marking arrived on time matters." },
  ]},
  { id: "tour-reports", phase: "tour", tab: "reports", title: "Safety Reporting", feature: null, subSteps: [
    { target: "tour-reports-new-btn", placement: "bottom", title: "Submit Reports", desc: "Pilots and crew can submit anonymous or confidential hazard and safety reports \u2014 the backbone of a just-culture SMS.", descNonAdmin: "Submit anonymous or confidential hazard and safety reports here. This is the backbone of a just-culture SMS \u2014 your reports help keep everyone safe." },
    { target: "tour-reports-stats", placement: "bottom", title: "Report Queue", titleNonAdmin: "Your Reports", desc: "Track report status across your organization. See open, in-review, and closed counts at a glance.", descNonAdmin: "Track the status of reports you\u2019ve submitted. See whether they\u2019re open, in review, or closed." },
    { target: null, placement: "top-right", title: "Admin Escalation", desc: "Safety managers review incoming reports and can escalate them directly into formal investigations with a single click.", adminOnly: true },
  ]},
  { id: "tour-hazards", phase: "tour", tab: "hazards", title: "Investigations", adminOnly: true, feature: "hazard_register", subSteps: [
    { target: "tour-hazards-stats", placement: "bottom", title: "Investigation Dashboard", desc: "Risk-scored investigations from escalated safety reports. Track open, in-progress, and closed investigations with severity ratings." },
    { target: null, placement: "top-right", title: "Risk Matrix & Escalation", desc: "Each investigation uses a 5\u00d75 risk matrix (severity \u00d7 likelihood). When corrective or preventative action is needed, escalate directly to the Actions tab." },
  ]},
  { id: "tour-actions", phase: "tour", tab: "actions", title: "Corrective Actions", adminOnly: true, feature: "corrective_actions", subSteps: [
    { target: "tour-actions-stats", placement: "bottom", title: "Action Tracking", desc: "Monitor open, overdue, and completed corrective and preventative actions. Each action links back to its source investigation." },
    { target: null, placement: "top-right", title: "Status Workflow", desc: "Assign owners, set due dates, and track completion \u2014 closing the loop from hazard report all the way through to resolution." },
  ]},
  { id: "tour-policy", phase: "tour", tab: "policy", title: "Policies & SMS Manuals", feature: "policy_library", subSteps: [
    { target: "tour-policy-tabs", placement: "bottom", title: "Policy Library", desc: "Publish company policies and track who has acknowledged them. See at a glance how many team members still need to sign off on each document.", descNonAdmin: "Read and acknowledge your organization\u2019s safety policies here. You\u2019ll be notified when new policies are published that need your sign-off.", componentTab: { component: "policy", value: "policies" } },
    { target: "tour-policy-tabs", placement: "bottom", title: "SMS Manual Templates", desc: "Build Part 5 manuals with guided autofill templates. Each section maps to FAA requirements \u2014 no starting from scratch.", adminOnly: true, componentTab: { component: "policy", value: "manuals" } },
  ]},
  { id: "tour-cbt", phase: "tour", tab: "cbt", title: "Training & CBT", feature: "cbt_modules", subSteps: [
    { target: "tour-cbt-tabs", placement: "bottom", title: "CBT Courses", desc: "Create and assign video-based training courses with quizzes and completion tracking. Enroll crew members and monitor progress.", descNonAdmin: "Complete your assigned training courses here. Each course includes video lessons and quizzes \u2014 your progress is tracked automatically.", componentTab: { component: "cbt", value: "cbt" } },
    { target: "tour-cbt-tabs", placement: "bottom", title: "Training Requirements", desc: "Set recurring training requirements with due dates. Log completion records and monitor employee compliance across your entire organization.", descNonAdmin: "View your training requirements and due dates. Log completion records to stay current with your organization\u2019s training program.", componentTab: { component: "cbt", value: "requirements" } },
  ]},
  { id: "tour-audits", phase: "tour", tab: "audits", title: "Audits & Compliance", adminOnly: true, feature: "audit_program", subSteps: [
    { target: "tour-audit-stats", placement: "bottom", title: "Part 5 Compliance", desc: "A real-time 42-point Part 5 compliance checklist. Each item syncs automatically with data across the platform \u2014 FRATs, flights, reports, investigations, actions, policies, and training." },
    { target: "tour-audit-progress", placement: "bottom", title: "Compliance Progress", desc: "See your overall compliance percentage and drill into each subpart. Present this to the FAA during an audit to prove Part 5 compliance." },
    { target: "tour-audits-templates", placement: "bottom", title: "Audit Templates", desc: "Create audit templates with sections and questions, or use one of the pre-built templates." },
    { target: "tour-audits-schedule", placement: "right", title: "Scheduling", desc: "Schedule recurring audits with automated reminders. Assign auditors and track completion." },
  ]},
  { id: "tour-dashboard", phase: "tour", tab: "dashboard", title: "Safety Dashboard", adminOnly: true, feature: "dashboard_basic", subSteps: [
    { target: "tour-dashboard-health", placement: "bottom", title: "SMS Health Score", desc: "Your organization\u2019s overall SMS Compliance Health score \u2014 a single number that reflects how well your safety system is performing across all areas." },
    { target: "tour-dashboard-kpi", placement: "bottom", title: "KPI Cards & Trends", desc: "Risk score distributions, reporting frequency, hazard categories, action completion rates, and training compliance \u2014 spot patterns before they become problems." },
  ]},
  { id: "tour-admin", phase: "tour", tab: "admin", title: "Admin Panel", adminOnly: true, feature: null, subSteps: [
    { target: "tour-admin-tabs", placement: "bottom", title: "Command Center", desc: "Five sections: Organization settings, Fleet management, FRAT Templates, User management, and Subscription & billing.", componentTab: { component: "admin", value: "org" } },
    { target: "tour-admin-invite", placement: "right", title: "Invite & Manage Users", desc: "Invite new team members by email with role-based access. Manage permissions for pilots, safety managers, chief pilots, and admins.", componentTab: { component: "admin", value: "users" } },
    { target: "tour-admin-tabs", placement: "bottom", title: "FRAT Templates", desc: "Customize FRAT risk categories and scoring to match your company\u2019s specific operations. Create multiple templates and assign them to different aircraft types.", componentTab: { component: "admin", value: "frat" } },
  ]},
  { id: "tour-erp", phase: "tour", tab: "erp", title: "Emergency Response Plans", feature: null, subSteps: [
    { target: "tour-erp-plans", placement: "bottom", title: "Response Plans", desc: "Pre-built templates for aircraft accidents, medical emergencies, security threats, and more. Each plan includes step-by-step checklists and call trees." },
    { target: "tour-erp-drills", placement: "right", title: "Drill Tracking", desc: "Schedule and record emergency drills. Log lessons learned and create corrective actions from findings." },
  ]},
  { id: "tour-moc", phase: "tour", tab: "moc", title: "Management of Change", adminOnly: true, feature: "management_of_change", subSteps: [
    { target: "tour-moc-board", placement: "bottom", title: "Change Board", desc: "Track changes through 6 stages on a Kanban board. Each change includes hazard analysis and mitigation plans." },
  ]},
];

const DEFAULT_RISK_CATEGORIES = [
  { id: "weather", name: "Weather", icon: "", factors: [
    { id: "wx_ceiling", label: "Ceiling < 1000' AGL at departure or destination", score: 4 },
    { id: "wx_vis", label: "Visibility < 3 SM at departure or destination", score: 4 },
    { id: "wx_xwind", label: "Crosswind > 15 kts (or > 50% of max demonstrated)", score: 3 },
    { id: "wx_ts", label: "Thunderstorms forecast along route or at terminals", score: 5 },
    { id: "wx_ice", label: "Known or forecast icing conditions", score: 4 },
    { id: "wx_turb", label: "Moderate or greater turbulence forecast", score: 3 },
    { id: "wx_wind_shear", label: "Wind shear advisories or PIREPs", score: 5 },
    { id: "wx_mountain", label: "Mountain obscuration or high DA affecting performance", score: 4 },
  ]},
  { id: "pilot", name: "Pilot / Crew", icon: "", factors: [
    { id: "plt_fatigue", label: "Crew rest < 10 hours or significant fatigue factors", score: 5 },
    { id: "plt_recency", label: "PIC < 3 flights in aircraft type in last 30 days", score: 3 },
    { id: "plt_new_crew", label: "First time flying together as a crew pairing", score: 2 },
    { id: "plt_stress", label: "Significant personal stressors affecting crew", score: 4 },
    { id: "plt_duty", label: "Approaching max duty time limitations", score: 3 },
    { id: "plt_unfam_apt", label: "PIC unfamiliar with departure or destination airport", score: 3 },
  ]},
  { id: "aircraft", name: "Aircraft", icon: "", factors: [
    { id: "ac_mel", label: "Operating with MEL items", score: 3 },
    { id: "ac_mx_defer", label: "Deferred maintenance items", score: 3 },
    { id: "ac_recent_mx", label: "Aircraft recently out of major maintenance", score: 2 },
    { id: "ac_perf_limit", label: "Operating near weight/performance limits", score: 4 },
    { id: "ac_known_issue", label: "Known recurring squawk or system anomaly", score: 3 },
  ]},
  { id: "environment", name: "Environment", icon: "", factors: [
    { id: "env_night", label: "Night operations", score: 2 },
    { id: "env_terrain", label: "Mountainous terrain along route", score: 3 },
    { id: "env_unfam_airspace", label: "Complex or unfamiliar airspace", score: 2 },
    { id: "env_short_runway", label: "Runway length < 4000' or contaminated surface", score: 4 },
    { id: "env_remote", label: "Limited alternate airports available", score: 3 },
    { id: "env_notams", label: "Significant NOTAMs affecting operation", score: 2 },
  ]},
  { id: "operational", name: "Operational", icon: "", factors: [
    { id: "ops_pax_pressure", label: "Significant schedule pressure from passengers/client", score: 3 },
    { id: "ops_time_pressure", label: "Tight schedule with minimal buffer", score: 3 },
    { id: "ops_vip", label: "High-profile passengers or sensitive mission", score: 2 },
    { id: "ops_multi_leg", label: "3+ legs in a single duty period", score: 3 },
    { id: "ops_unfam_mission", label: "Unusual mission profile or first-time operation type", score: 3 },
    { id: "ops_hazmat", label: "Hazardous materials on board", score: 2 },
  ]},
];

// Convert DB template thresholds to runtime risk levels
function buildRiskLevels(thresholds) {
  if (!thresholds || !Array.isArray(thresholds)) return DEFAULT_RISK_LEVELS;
  const colorMap = { green: GREEN, yellow: YELLOW, amber: AMBER, red: RED };
  const bgMap = { green: "rgba(74,222,128,0.08)", yellow: "rgba(250,204,21,0.08)", amber: "rgba(245,158,11,0.08)", red: "rgba(239,68,68,0.08)" };
  const borderMap = { green: "rgba(74,222,128,0.25)", yellow: "rgba(250,204,21,0.25)", amber: "rgba(245,158,11,0.25)", red: "rgba(239,68,68,0.25)" };
  const result = {};
  thresholds.forEach(t => {
    result[t.level] = { label: t.label, color: colorMap[t.color] || GREEN, bg: bgMap[t.color] || bgMap.green, border: borderMap[t.color] || borderMap.green, min: t.min, max: t.max, action: t.action, approval_mode: t.approval_mode || "none" };
  });
  return result;
}

function getRiskLevel(s, riskLevels) { const rl = riskLevels || DEFAULT_RISK_LEVELS; const sorted = Object.values(rl).sort((a, b) => a.min - b.min); for (const l of sorted) { if (s >= l.min && s <= l.max) return l; } return sorted[sorted.length - 1] || Object.values(DEFAULT_RISK_LEVELS)[3]; }
function formatDateTime(d) { return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function generateId() { return `FRAT-${Date.now().toString(36).toUpperCase()}`; }
function downloadBlob(c, t, f) { const b = new Blob([c], { type: t }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = f; a.style.display = "none"; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 200); }

const inp = { width: "100%", maxWidth: "100%", padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, background: BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };

// ── TIME UTILITIES ──────────────────────────────────────────────
// Pilots enter times in local time for the departure airport. App converts to UTC for TAF matching.
function parseLocalTime(dateStr, timeStr, tz = "America/Los_Angeles") {
  if (!dateStr || !timeStr) return null;
  const t = timeStr.replace(/[^0-9]/g, "").padStart(4, "0");
  const hh = parseInt(t.slice(0, 2), 10);
  const mm = parseInt(t.slice(2, 4), 10);
  if (isNaN(hh) || isNaN(mm) || hh > 23 || mm > 59) return null;
  // Use Intl to get the UTC offset for the given timezone on this date
  try {
    const opts = { timeZone: tz, hour: "numeric", hour12: false, timeZoneName: "shortOffset" };
    const fmt = new Intl.DateTimeFormat("en-US", opts);
    const tempDate = new Date(`${dateStr}T12:00:00Z`);
    const parts = fmt.formatToParts(tempDate);
    const tzPart = parts.find(p => p.type === "timeZoneName");
    let offsetHours = -8; // default PST
    if (tzPart && tzPart.value) {
      const match = tzPart.value.match(/GMT([+-]?\d+)/);
      if (match) offsetHours = parseInt(match[1], 10);
    }
    const localDate = new Date(`${dateStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00Z`);
    return new Date(localDate.getTime() - offsetHours * 3600000);
  } catch {
    const localDate = new Date(`${dateStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00Z`);
    return new Date(localDate.getTime() + 8 * 3600000);
  }
}

function parseETE(ete) {
  if (!ete) return 0;
  const s = ete.trim();
  if (s.includes(":") || s.includes("+")) {
    const parts = s.split(/[:\+]/);
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (n < 10) return Math.round(n * 60);
  if (n < 100) return Math.round(n);
  return Math.floor(n / 100) * 60 + (n % 100);
}

function formatETE(raw) {
  if (!raw) return raw;
  const s = raw.trim();
  if (s.includes(":")) return s;
  const n = parseInt(s, 10);
  if (isNaN(n)) return s;
  if (n < 10) return `${n}:00`;
  if (n < 60) return `0:${String(n).padStart(2, "0")}`;
  if (n >= 100) return `${Math.floor(n / 100)}:${String(n % 100).padStart(2, "0")}`;
  return s;
}

function calcArrivalTime(dateStr, etdStr, eteStr, tz = "America/Los_Angeles") {
  const dep = parseLocalTime(dateStr, etdStr, tz);
  if (!dep) return null;
  const mins = parseETE(eteStr);
  if (!mins) return null;
  return new Date(dep.getTime() + mins * 60000);
}

function formatZulu(d) {
  if (!d) return "";
  return `${String(d.getUTCHours()).padStart(2,"0")}${String(d.getUTCMinutes()).padStart(2,"0")}Z`;
}

function formatLocal(d, tz = "America/Los_Angeles") {
  if (!d) return "";
  try {
    return d.toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", "");
  } catch { return ""; }
}

// ── WEATHER ENGINE ──────────────────────────────────────────────
async function fetchWeather(dep, dest, cruiseAlt) {
  const ids = [dep, dest].filter(Boolean).join(",");
  if (!ids) return null;
  const altFt = parseCruiseAlt(cruiseAlt);
  const r = await fetch(`/api/weather?ids=${encodeURIComponent(ids)}&cruiseAlt=${encodeURIComponent(cruiseAlt || "")}`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  const data = await r.json();
  data.altFt = altFt;
  return data;
}

function parseCruiseAlt(val) {
  if (!val) return 0;
  const s = val.toString().trim().toUpperCase();
  if (s.startsWith("FL")) return parseInt(s.slice(2), 10) * 100;
  return parseInt(s, 10) || 0;
}

function getCeiling(clouds) {
  if (!clouds || !Array.isArray(clouds)) return 99999;
  for (const c of clouds) {
    if ((c.cover === "BKN" || c.cover === "OVC") && c.base != null) return c.base;
  }
  return 99999;
}

function analyzeWeather(wx) {
  if (!wx) return { flags: {}, reasons: {}, briefing: null, stationSummaries: [] };
  const flags = {};
  const reasons = {};
  const briefItems = [];
  const stationSummaries = [];
  const aptCoords = [];

  const depTimeZ = wx.depTimeZ; // Date object or null
  const arrTimeZ = wx.arrTimeZ; // Date object or null
  const ids = (wx.metars || []).map(m => m.icaoId).filter(Boolean);
  const depId = ids[0] || null;
  const destId = ids[1] || ids[0] || null;

  // Helper: find TAF period covering a target time for a station
  function findTafPeriod(tafs, stationId, targetTime) {
    if (!targetTime) return null;
    const taf = tafs.find(t => (t.icaoId || "").toUpperCase() === stationId.toUpperCase());
    if (!taf || !taf.fcsts) return null;
    const ts = targetTime.getTime() / 1000;
    // Find the period that covers the target time
    for (let i = taf.fcsts.length - 1; i >= 0; i--) {
      const f = taf.fcsts[i];
      const from = f.timeFrom || 0;
      const to = f.timeTo || 0;
      if (ts >= from && ts <= to) return { ...f, station: stationId, periodLabel: "TAF" };
    }
    // Fallback: return last period
    return taf.fcsts.length > 0 ? { ...taf.fcsts[taf.fcsts.length - 1], station: stationId, periodLabel: "TAF" } : null;
  }

  // Helper: check if METAR is current for a target time (within 90 min)
  function isMetarCurrent(metar, targetTime) {
    if (!targetTime || !metar.obsTime) return true; // no time info = assume current
    const obsTs = metar.obsTime * 1000;
    const targetTs = targetTime.getTime();
    return Math.abs(targetTs - obsTs) < 90 * 60000;
  }

  // Analyze a weather period (METAR or TAF) and flag risks
  function analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, label) {
    if (ceiling < 1000) { flags.wx_ceiling = true; reasons.wx_ceiling = (reasons.wx_ceiling || "") + `${station} ${label} ceiling ${ceiling}' AGL. `; }
    if (vis < 3) { flags.wx_vis = true; reasons.wx_vis = (reasons.wx_vis || "") + `${station} ${label} vis ${vis} SM. `; }
    if (wspd > 15 || wgst > 15) { flags.wx_xwind = true; reasons.wx_xwind = (reasons.wx_xwind || "") + `${station} ${label} wind ${wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt. `; }
    if (wxStr.includes("TS")) { flags.wx_ts = true; reasons.wx_ts = (reasons.wx_ts || "") + `${station} ${label} thunderstorm. `; }
  }

  // Process METARs — always show current conditions
  for (const m of (Array.isArray(wx.metars) ? wx.metars : [])) {
    const station = m.icaoId || "??";
    const ceiling = getCeiling(m.clouds);
    const vis = m.visib === "10+" ? 10 : parseFloat(m.visib) || 99;
    const wspd = m.wspd || 0; const wgst = m.wgst || 0; const wdir = m.wdir || 0;
    const wxStr = (m.wxString || "").toUpperCase();
    const raw = m.rawOb || "";
    const temp = m.temp != null ? `${Math.round(m.temp)}\u00B0C` : "";
    const dewp = m.dewp != null ? `${Math.round(m.dewp)}\u00B0C` : "";
    if (m.lat && m.lon) aptCoords.push({ lat: m.lat, lon: m.lon });
    briefItems.push({ station, type: "METAR", raw });
    const ceilStr = ceiling >= 99999 ? "CLR" : `${ceiling}'`;
    const visStr = vis >= 10 ? "10+ SM" : `${vis} SM`;
    const windStr = wspd === 0 ? "Calm" : `${wdir}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt`;
    const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
    stationSummaries.push({ station, type: "METAR (current)", summary: `Ceil ${ceilStr} | Vis ${visStr} | Wind ${windStr}${temp ? ` | ${temp}/${dewp}` : ""}${wxStr ? ` | ${wxStr}` : ""}`, flight_rules: fr });

    // Always analyze current METAR for risk flags — even if the flight is
    // hours away, current conditions (especially gusts) are relevant.
    analyzePeriod(station, ceiling, vis, wspd, wgst, wdir, wxStr, "METAR");
    if (raw.includes("WS") || raw.toUpperCase().includes("WIND SHEAR")) { flags.wx_wind_shear = true; reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} wind shear. `; }
  }

  // Process TAFs — find period covering ETD (departure) or ETA (destination)
  const tafs = Array.isArray(wx.tafs) ? wx.tafs : [];
  for (const t of tafs) {
    const station = t.icaoId || "??";
    briefItems.push({ station, type: "TAF", raw: t.rawTAF || "" });

    const targetTime = (station === depId) ? depTimeZ : (station === destId) ? arrTimeZ : null;
    const matched = targetTime ? findTafPeriod(tafs, station, targetTime) : null;
    const timeLabel = targetTime ? `@ ${formatZulu(targetTime)}` : "";

    if (matched) {
      const vis = matched.visib === "6+" ? 10 : parseFloat(matched.visib) || 99;
      const ceiling = getCeiling(matched.clouds);
      const wxStr = (matched.wxString || "").toUpperCase();
      const wspd = matched.wspd || 0; const wgst = matched.wgst || 0;
      const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
      const ceilStr = ceiling >= 99999 ? "CLR" : `${ceiling}'`;
      stationSummaries.push({ station, type: `TAF ${timeLabel}`, summary: `Ceil ${ceilStr} | Vis ${vis >= 10 ? "6+" : vis} SM | Wind ${matched.wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt${wxStr ? ` | ${wxStr}` : ""}`, flight_rules: fr });
      analyzePeriod(station, ceiling, vis, wspd, wgst, matched.wdir, wxStr, `TAF ${timeLabel}`);
      if (matched.wshearHgt != null) { flags.wx_wind_shear = true; reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} TAF wind shear ${matched.wshearHgt}ft. `; }
    } else {
      // No target time or no match — analyze worst period (original behavior)
      let worstFR = "VFR"; let worstSum = "";
      const rank = { LIFR: 4, IFR: 3, MVFR: 2, VFR: 1 };
      for (const f of (t.fcsts || [])) {
        const vis = f.visib === "6+" ? 10 : parseFloat(f.visib) || 99;
        const ceiling = getCeiling(f.clouds); const wxStr = (f.wxString || "").toUpperCase();
        const wspd = f.wspd || 0; const wgst = f.wgst || 0;
        const fr = ceiling < 200 || vis < 0.5 ? "LIFR" : ceiling < 500 || vis < 1 ? "IFR" : ceiling < 1000 || vis < 3 ? "MVFR" : "VFR";
        if (rank[fr] > rank[worstFR]) { worstFR = fr; worstSum = `Ceil ${ceiling >= 99999 ? "CLR" : ceiling + "'"} | Vis ${vis >= 10 ? "6+" : vis} SM | Wind ${f.wdir || "VRB"}\u00B0/${wspd}${wgst ? "G" + wgst : ""}kt${wxStr ? ` | ${wxStr}` : ""}`; }
        analyzePeriod(station, ceiling, vis, wspd, wgst, f.wdir, wxStr, "TAF fcst");
        if (f.wshearHgt != null && !flags.wx_wind_shear) { flags.wx_wind_shear = true; reasons.wx_wind_shear = (reasons.wx_wind_shear || "") + `${station} TAF wind shear ${f.wshearHgt}ft. `; }
      }
      if (worstSum) stationSummaries.push({ station, type: "TAF worst", summary: worstSum, flight_rules: worstFR });
    }
  }

  const isNearRoute = (item) => {
    if (aptCoords.length === 0) return true;
    // Check direct lat/lon
    if (item.lat && item.lon) return aptCoords.some(a => haversineNm(a.lat, a.lon, item.lat, item.lon) < 200);
    // Check various coordinate field names used by AWC
    const coords = item.coords || (item.geometry && item.geometry.coordinates) || item.geom?.coordinates;
    if (coords && Array.isArray(coords)) { const flat = flattenCoords(coords); if (flat.length > 0) return flat.some(([lon, lat]) => aptCoords.some(a => haversineNm(a.lat, a.lon, lat, lon) < 200)); }
    // If no coordinates found at all, include it (better to show extra than miss something)
    return true;
  };

  const altFt = wx.altFt || 0;

  return { flags, reasons, briefing: briefItems, stationSummaries };
}

function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const R = 3440.065;
  const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function flattenCoords(arr) {
  if (!Array.isArray(arr)) return [];
  if (arr.length >= 2 && typeof arr[0] === "number") return [arr];
  return arr.flatMap(item => flattenCoords(item));
}

// ── WEATHER BRIEFING PANEL ──────────────────────────────────────
function WeatherBriefing({ briefing, reasons, flags, stationSummaries, wxLoading, wxError }) {
  const flagCount = Object.keys(flags).length;
  const sums = stationSummaries || [];
  const frColors = { VFR: GREEN, MVFR: CYAN, IFR: RED, LIFR: "#C026D3" };

  if (wxLoading) return (
    <div style={{ ...card, padding: 16, marginBottom: 14, border: `1px solid ${CYAN}33` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: CYAN }}>
        <span style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>&#10227;</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Fetching weather from AviationWeather.gov...</span>
      </div></div>);
  if (wxError) return (
    <div style={{ ...card, padding: 16, marginBottom: 14, border: `1px solid ${RED}33` }}>
      <div style={{ color: RED, fontSize: 12 }}>&#9888; Weather fetch failed: {wxError}</div></div>);
  if (!briefing || briefing.length === 0) return null;

  return (
    <div style={{ ...card, padding: 16, marginBottom: 14, border: `1px solid ${flagCount > 0 ? `${AMBER}44` : `${GREEN}33`}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: WHITE, fontFamily: "Georgia,serif", fontSize: 14 }}>
          <span style={{ marginRight: 8 }}>&#127760;</span>Weather Briefing</h3>
        <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 12, fontWeight: 700,
          background: flagCount > 0 ? "rgba(245,158,11,0.15)" : "rgba(74,222,128,0.15)",
          color: flagCount > 0 ? AMBER : GREEN, border: `1px solid ${flagCount > 0 ? AMBER : GREEN}44` }}>
          {flagCount > 0 ? `${flagCount} FACTOR${flagCount > 1 ? "S" : ""} DETECTED` : "NO FACTORS DETECTED"}</span></div>

      {sums.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {sums.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 3,
              background: NEAR_BLACK, borderRadius: 5, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 90 }}>
                <span style={{ fontWeight: 800, fontSize: 11, color: WHITE }}>{s.station}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                  background: `${frColors[s.flight_rules] || MUTED}22`,
                  color: frColors[s.flight_rules] || MUTED,
                  border: `1px solid ${frColors[s.flight_rules] || MUTED}44` }}>{s.flight_rules}</span>
                <span style={{ fontSize: 8, color: SUBTLE }}>{s.type}</span>
              </div>
              <span style={{ fontSize: 11, color: OFF_WHITE, fontFamily: "monospace", lineHeight: 1.3 }}>{s.summary}</span>
            </div>))}
        </div>)}

      {flagCount > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Flagged Risk Factors</div>
          {Object.entries(reasons).map(([fid, reason]) => (
            <div key={fid} style={{ display: "flex", gap: 8, padding: "5px 8px", marginBottom: 3, borderRadius: 5,
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span style={{ color: AMBER, fontSize: 11, flexShrink: 0 }}>&#9888;</span>
              <span style={{ color: OFF_WHITE, fontSize: 11, lineHeight: 1.4 }}>{reason.trim()}</span></div>))}
        </div>)}

      <details style={{ marginTop: 6 }}>
        <summary style={{ color: MUTED, fontSize: 10, cursor: "pointer", letterSpacing: 0.5, fontWeight: 600 }}>RAW REPORTS ({briefing.length})</summary>
        <div style={{ marginTop: 6 }}>
          {briefing.map((b, i) => (
            <div key={i} style={{ padding: "6px 8px", marginBottom: 3, background: NEAR_BLACK, borderRadius: 4, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 9, color: CYAN, fontWeight: 700, marginBottom: 2 }}>{b.station} &#8212; {b.type}</div>
              <div style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.4 }}>{b.raw}</div></div>))}</div></details>
      <div style={{ marginTop: 8, fontSize: 9, color: SUBTLE }}>Source: AviationWeather.gov &#183; Auto-suggested factors shown with &#127760; &#8212; pilot review required.</div></div>);
}

// ── COMPONENTS ──────────────────────────────────────────────────
function AdminGate({ children, isAuthed, onAuth }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(false);
  if (isAuthed) return children;
  const go = () => { if (pw === ADMIN_PASSWORD) { onAuth(true); setErr(false); } else setErr(true); };
  return (
    <div style={{ maxWidth: 380, margin: "80px auto", textAlign: "center" }}>
      <div style={{ ...card, padding: 36 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 22 }}>🔒</span></div>
        <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", marginBottom: 6, fontSize: 20 }}>Admin Access</h2>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 24 }}>Enter password to continue.</p>
        <input type="password" placeholder="Password" value={pw} onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && go()}
          style={{ ...inp, border: `1px solid ${err ? RED : BORDER}`, marginBottom: 12 }} />
        {err && <p style={{ color: RED, fontSize: 12, marginBottom: 12 }}>Incorrect password</p>}
        <button onClick={go} style={{ width: "100%", padding: "11px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.5 }}>UNLOCK</button>
      </div></div>);
}

const NAV_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", cvs: ["dashboard"] },
  { id: "operations", label: "Operations", icon: "fleet", cvs: ["submit", "flights", "fleet"] },
  { id: "safety", label: "Safety", icon: "reports", cvs: ["reports", "asap", "erp"] },
  { id: "investigations", label: "Investigations", icon: "hazards", cvs: ["hazards", "actions", "moc"] },
  { id: "compliance", label: "Compliance", icon: "audits", cvs: ["audits"] },
  { id: "training", label: "Training", icon: "cbt", cvs: ["cbt"] },
  { id: "documents", label: "Documents", icon: "manuals", cvs: ["policy"] },
  { id: "admin", label: "Admin", icon: "admin", cvs: ["admin"] },
];

const SUB_TAB_LABELS = {
  submit: "FRAT", flights: "Flight Following", fleet: "Fleet",
  reports: "Reports", asap: "ASAP", erp: "ERP",
  hazards: "Investigations", actions: "Corrective Actions", moc: "Change Mgmt",
};

function getSection(cv) {
  return NAV_SECTIONS.find(s => s.cvs.includes(cv)) || NAV_SECTIONS[0];
}

function NavBar({ currentView, setCurrentView, isAuthed, orgLogo, orgName, userName, onSignOut, org, userRole, notifications, notifReads, onMarkNotifRead, onMarkAllNotifsRead, profile, isOnline, session, onNotifNavigate, onUpgrade, onSwitchToMobile, onUpdatePreferences }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // SVG icons — monochrome, inherit color from parent
  const I = (d, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
  const icons = {
    submit: I(<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></>),
    flights: I(<><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="none"/><path d="M2 18h4l2-2 3 4 3-6 2 4h4" strokeDasharray="2 2" opacity="0.5"/></>),
    reports: I(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
    hazards: I(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
    actions: I(<><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>),
    policy: I(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>),
    cbt: I(<><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></>),
    audit: I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>),
    manuals: I(<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>),
    dashboard: I(<><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>),
    admin: I(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>),
    fleet: I(<><path d="M17.8 19.2L16 11l3.5-3.5C20.3 6.7 21 5.1 21 4.5c0-1-.5-1.5-1.5-1.5-.6 0-2.2.7-3 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.3 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></>),
    erp: I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>),
    audits: I(<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></>),
    moc: I(<><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/><path d="M16 21h5v-5"/><path d="M8 21H3v-5"/><path d="M21 21l-7-7"/><path d="M3 21l7-7"/></>),
    asap: I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></>),
  };
  const isAdminRole = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(userRole);
  const cvPassesGate = (cv) => { const feat = NAV_FEATURE_MAP[cv]; return !feat || hasFeature(org, feat); };
  const sectionFullyGated = (sec) => sec.id !== "admin" && sec.id !== "dashboard" && !sec.cvs.some(cv => cvPassesGate(cv));
  const visibleSections = NAV_SECTIONS.filter(sec => {
    if (sec.id === "admin") return isAdminRole;
    if (sec.id === "compliance") return isAdminRole;
    return true; // Show all sections, even gated ones
  });
  const activeSection = getSection(currentView);
  const firstVisibleCv = (sec) => sec.cvs.find(cv => cvPassesGate(cv)) || sec.cvs[0];
  const sideTab = (sec) => {
    const isActive = activeSection.id === sec.id;
    const isGated = sectionFullyGated(sec);
    return (
    <button key={sec.id} data-tour={`nav-${sec.id}`} onClick={() => {
        if (isGated && onUpgrade) { onUpgrade(sec.label, `${sec.label} features are not available on your current plan. Upgrade to unlock this section.`); }
        else { setCurrentView(firstVisibleCv(sec)); }
        setMenuOpen(false);
      }}
      title={sec.label}
      style={{
        width: "100%", height: 40, display: "flex", alignItems: "center", gap: 8, paddingLeft: 14,
        background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
        color: isActive ? WHITE : isGated ? "#444" : MUTED,
        border: "none", borderLeft: isActive ? `2px solid ${WHITE}` : "2px solid transparent",
        cursor: "pointer", fontSize: 15, transition: "all 0.15s", borderRadius: 0,
        fontFamily: "inherit",
      }}>
      <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{icons[sec.icon]}</span>
      <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, letterSpacing: 0.3 }}>{sec.label}</span>
      {isGated && <span style={{ fontSize: 9, opacity: 0.5, marginLeft: "auto", marginRight: 10 }}>{"\uD83D\uDD12"}</span>}
    </button>);
  };
  return (<>
    {/* Desktop sidebar */}
    <aside className="nav-sidebar" style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: 140, zIndex: 100,
      background: NEAR_BLACK, borderRight: `1px solid ${BORDER}`,
      display: "flex", flexDirection: "column", paddingTop: 12,
    }}>
      <div style={{ marginBottom: 16, padding: "0 12px", display: "flex", justifyContent: "center" }}>
        <img src={orgLogo || LOGO_URL} alt={orgName || "P"} style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 50, border: `1px solid ${BORDER}` }} onError={e => { e.target.src = LOGO_URL; }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {visibleSections.map(sec => sideTab(sec))}
      </div>
    </aside>
    {/* Mobile top bar */}
    <header className="nav-mobile-header" style={{ display: "none", background: BLACK, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100, padding: "0 16px", alignItems: "center", justifyContent: "space-between" }}>
      <img src={orgLogo || LOGO_URL} alt={orgName || "P"} style={{ height: 28, objectFit: "contain" }} onError={e => { e.target.src = LOGO_URL; }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isOnline && session && <NotificationCenter notifications={notifications} reads={notifReads} onMarkRead={onMarkNotifRead} onMarkAllRead={onMarkAllNotifsRead} profile={profile} onNavigate={(tab, linkId) => { if (onNotifNavigate) onNotifNavigate(tab, linkId); else setCurrentView(tab); setMenuOpen(false); }} onUpdatePreferences={onUpdatePreferences} />}
        <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: WHITE, fontSize: 18 }}>
          {menuOpen ? "\u2715" : "\u2630"}</button>
      </div>
    </header>
    {menuOpen && (<div className="nav-mobile-menu" style={{ display: "none", flexDirection: "column", padding: "8px 16px", gap: 2, background: NEAR_BLACK, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 48, zIndex: 99 }}>
      {visibleSections.map(sec => {
        const isActive = activeSection.id === sec.id;
        const isGated = sectionFullyGated(sec);
        return (
        <button key={sec.id} onClick={() => {
            if (isGated && onUpgrade) { onUpgrade(sec.label, `${sec.label} features are not available on your current plan. Upgrade to unlock this section.`); }
            else { setCurrentView(firstVisibleCv(sec)); }
            setMenuOpen(false);
          }}
          style={{ background: isActive ? "rgba(255,255,255,0.08)" : "transparent", color: isActive ? WHITE : isGated ? "#444" : MUTED, border: "none", padding: "10px 12px", cursor: "pointer", fontWeight: isActive ? 700 : 500, fontSize: 13, textAlign: "left", borderRadius: 6, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center" }}>{icons[sec.icon]}</span> {sec.label}
          {isGated && <span style={{ fontSize: 9, opacity: 0.5, marginLeft: "auto" }}>{"\uD83D\uDD12"}</span>}
        </button>);
      })}
      {userName && (<>
        <div style={{ borderTop: `1px solid ${BORDER}`, margin: "6px 0", paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 11, fontWeight: 700 }}>{(userName || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <span style={{ fontSize: 12, color: OFF_WHITE, fontWeight: 600 }}>{userName}</span>
            </div>
            <button onClick={() => { setMenuOpen(false); if (onSignOut) onSignOut(); }}
              style={{ fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>Log out</button>
          </div>
          {onSwitchToMobile && (
            <button onClick={() => { setMenuOpen(false); onSwitchToMobile(); }}
              style={{ width: "100%", fontSize: 12, color: "#22D3EE", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 6, padding: "10px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", marginTop: 8 }}>Switch to Mobile View</button>
          )}
        </div>
      </>)}
    </div>)}
    {/* ── Mobile Bottom Tab Bar ──────────────────── */}
    <nav className="mobile-bottom-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: BLACK, borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "center", width: "100%" }}>
        {[
          NAV_SECTIONS.find(s => s.id === "dashboard"),
          NAV_SECTIONS.find(s => s.id === "operations"),
          NAV_SECTIONS.find(s => s.id === "safety"),
          NAV_SECTIONS.find(s => s.id === "investigations"),
        ].map(sec => {
          const isActive = activeSection.id === sec.id;
          const isGated = sectionFullyGated(sec);
          return (
          <button key={sec.id} onClick={() => {
              if (isGated && onUpgrade) { onUpgrade(sec.label, `${sec.label} features are not available on your current plan. Upgrade to unlock this section.`); }
              else { setCurrentView(firstVisibleCv(sec)); }
              setMenuOpen(false);
            }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 4px", background: "none", border: "none", cursor: "pointer",
              color: isActive ? WHITE : isGated ? "#444" : MUTED, transition: "color 0.15s" }}>
            <span style={{ display: "flex", alignItems: "center", opacity: isActive ? 1 : isGated ? 0.3 : 0.6 }}>{icons[sec.icon]}</span>
            <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500 }}>{sec.label}</span>
          </button>);
        })}
        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 4px", background: "none", border: "none", cursor: "pointer",
            color: menuOpen ? WHITE : MUTED, transition: "color 0.15s" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          <span style={{ fontSize: 9, fontWeight: menuOpen ? 700 : 500 }}>More</span>
        </button>
      </div>
    </nav>
  </>);
}

function OnboardingWizard({ onComplete, onDismiss, onTourStart, onSubTabChange, setCv, fleetAircraft, onAddAircraft, onInviteUser, orgName, userName, org, orgSlug, userRole }) {
  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [cardPos, setCardPos] = useState(null);
  const [highlightRect, setHighlightRect] = useState(null);
  // Fleet mini-form state
  const [acType, setAcType] = useState("");
  const [acTail, setAcTail] = useState("");
  const [acAdded, setAcAdded] = useState(0);
  // Invite mini-form state
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState("pilot");
  const [invSent, setInvSent] = useState(0);
  const [invError, setInvError] = useState("");
  const [invSuccess, setInvSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const prevStepRef = useRef(step);

  // Filter steps by org features and user role
  const isAdminRole = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(userRole);
  const orgSettings = org?.settings || {};
  const steps = useMemo(() => ONBOARDING_STEPS.filter(s => {
    if (s.adminOnly && !isAdminRole) return false;
    if (s.id === "fleet" && fleetAircraft.length > 0) return false;
    if (s.id === "invite" && (orgSettings.onboarding_completed || isFreeTier(org))) return false;
    if (s.feature && !hasFeature(org, s.feature)) return false;
    return true;
  }), [org, isAdminRole, fleetAircraft, orgSettings.onboarding_completed]);

  const current = steps[step] || steps[0];
  const setupSteps = steps.filter(s => s.phase === "setup");
  const overviewSteps = steps.filter(s => s.phase === "overview");
  const tourSteps = steps.filter(s => s.phase === "tour");
  const isSetup = current.phase === "setup";
  const isOverview = current.phase === "overview";
  const overviewIdx = overviewSteps.indexOf(current);
  const tourIdx = tourSteps.indexOf(current);
  // Filter sub-steps by role (remove adminOnly sub-steps for non-admins)
  const filterSubs = useCallback((subs) => subs ? subs.filter(s => !s.adminOnly || isAdminRole) : null, [isAdminRole]);
  const filteredSubSteps = filterSubs(current.subSteps);
  const currentSub = filteredSubSteps ? filteredSubSteps[subStep] : null;

  // Count total sub-steps for global progress
  const totalSubSteps = useMemo(() => tourSteps.reduce((sum, s) => sum + (filterSubs(s.subSteps) ? filterSubs(s.subSteps).length : 1), 0), [tourSteps, filterSubs]);
  const globalSubIdx = useMemo(() => {
    let count = 0;
    for (let i = 0; i < tourIdx; i++) count += (filterSubs(tourSteps[i].subSteps) ? filterSubs(tourSteps[i].subSteps).length : 1);
    return count + subStep;
  }, [tourIdx, subStep, tourSteps, filterSubs]);
  const isLastGlobal = tourIdx === tourSteps.length - 1 && (!filteredSubSteps || subStep === filteredSubSteps.length - 1);

  // Navigate to the tab when entering a tour or overview step (only when tab-level step changes)
  useEffect(() => {
    if ((current.phase === "tour" || current.phase === "overview") && current.tab && step !== prevStepRef.current) {
      setCv(current.tab);
    }
    prevStepRef.current = step;
    // Switch component sub-tabs when sub-step has componentTab
    if (currentSub?.componentTab && onSubTabChange) {
      onSubTabChange(currentSub.componentTab.component, currentSub.componentTab.value);
    }
  }, [step, subStep, current, currentSub]);

  // Highlight ring for overview phase — target the nav button
  const [overviewHighlight, setOverviewHighlight] = useState(null);
  useEffect(() => {
    if (!isOverview || !current.target) { setOverviewHighlight(null); return; }
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (!el) { setOverviewHighlight(null); return; }
      const rect = el.getBoundingClientRect();
      setOverviewHighlight({ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 });
    }, 100);
    return () => clearTimeout(timer);
  }, [step, isOverview, current]);

  // Position calculation for tour card
  useEffect(() => {
    if (!currentSub) { setCardPos(null); setHighlightRect(null); return; }
    const timer = setTimeout(() => {
      if (!currentSub.target) {
        setCardPos({ top: 80, right: 24, arrowDir: null });
        setHighlightRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${currentSub.target}"]`);
      if (!el) {
        setCardPos({ top: 80, right: 24, arrowDir: null });
        setHighlightRect(null);
        return;
      }
      const isMobile = window.innerWidth <= 768;
      el.scrollIntoView({ behavior: "smooth", block: isMobile ? "start" : "center" });
      // Re-measure after scroll settles
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const cardW = 340;
        const cardH = 220;
        const margin = 16;
        let pos = {};
        let arrowDir = null;
        const placement = currentSub.placement || "bottom";
        if (placement === "bottom") {
          pos.top = Math.min(rect.bottom + 12, window.innerHeight - cardH - margin);
          pos.left = Math.max(margin, Math.min(rect.left + rect.width / 2 - cardW / 2, window.innerWidth - cardW - margin));
          arrowDir = "up";
        } else if (placement === "right") {
          pos.top = Math.max(margin, Math.min(rect.top + rect.height / 2 - cardH / 2, window.innerHeight - cardH - margin));
          pos.left = Math.min(rect.right + 12, window.innerWidth - cardW - margin);
          arrowDir = "left";
        } else if (placement === "left") {
          pos.top = Math.max(margin, Math.min(rect.top + rect.height / 2 - cardH / 2, window.innerHeight - cardH - margin));
          pos.left = Math.max(margin, rect.left - cardW - 12);
          arrowDir = "right";
        } else if (placement === "top") {
          pos.top = Math.max(margin, rect.top - cardH - 12);
          pos.left = Math.max(margin, Math.min(rect.left + rect.width / 2 - cardW / 2, window.innerWidth - cardW - margin));
          arrowDir = "down";
        } else {
          pos.top = 80;
          pos.right = 24;
        }
        // Clamp
        if (pos.top !== undefined) pos.top = Math.max(margin, Math.min(pos.top, window.innerHeight - cardH - margin));
        if (pos.left !== undefined) pos.left = Math.max(margin, Math.min(pos.left, window.innerWidth - cardW - margin));
        pos.arrowDir = arrowDir;
        setCardPos(pos);
        setHighlightRect({ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 });
      }, 300);
    }, 200);
    return () => clearTimeout(timer);
  }, [step, subStep, currentSub]);

  const goNext = () => {
    if (current.phase === "tour" && filteredSubSteps) {
      if (subStep < filteredSubSteps.length - 1) { setSubStep(subStep + 1); return; }
    }
    const nextIdx = step + 1;
    if (nextIdx < steps.length) {
      if (current.phase === "setup" && steps[nextIdx].phase !== "setup" && onTourStart) onTourStart();
      setStep(nextIdx); setSubStep(0);
    } else onComplete();
  };

  const goBack = () => {
    if (current.phase === "tour" && subStep > 0) { setSubStep(subStep - 1); return; }
    if (step > 0) {
      const prevStep = steps[step - 1];
      const prevSubs = filterSubs(prevStep.subSteps);
      setStep(step - 1);
      setSubStep(prevSubs ? prevSubs.length - 1 : 0);
    }
  };

  const skipToTour = () => {
    const firstTourIdx = steps.findIndex(s => s.phase === "tour");
    if (firstTourIdx >= 0) {
      setStep(firstTourIdx);
      setSubStep(0);
    }
  };

  const handleAddAircraft = async () => {
    if (!acType.trim() || !acTail.trim()) return;
    setBusy(true);
    try {
      let reg = acTail.trim().toUpperCase();
      if (reg && !reg.startsWith("N")) reg = "N" + reg;
      await onAddAircraft({ type: acType.trim().toUpperCase(), registration: reg });
      setAcAdded(prev => prev + 1);
      setAcType("");
      setAcTail("");
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const handleInvite = async () => {
    if (!invEmail.trim()) return;
    setBusy(true);
    setInvError("");
    setInvSuccess("");
    try {
      const result = await onInviteUser(invEmail.trim(), invRole);
      if (result?.error) { setInvError(typeof result.error === "string" ? result.error : result.error.message || "Failed to send invite"); }
      else { setInvSent(prev => prev + 1); setInvSuccess(`Invite sent to ${invEmail.trim()}`); setInvEmail(""); }
    } catch (e) { setInvError("Failed to send invite"); }
    setBusy(false);
  };

  const inp = { width: "100%", padding: "10px 12px", borderRadius: 6, border: `1px solid ${BORDER}`, background: NEAR_BLACK, color: WHITE, fontSize: 13, fontFamily: "inherit" };
  const btnPrimary = { padding: "10px 28px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
  const btnSecondary = { padding: "10px 28px", background: "transparent", color: OFF_WHITE, border: `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };

  // Arrow component
  const TourArrow = ({ dir }) => {
    if (!dir) return null;
    const size = 10;
    const styles = {
      position: "absolute", width: 0, height: 0,
      ...(dir === "up" && { top: -size, left: "50%", transform: "translateX(-50%)", borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderBottom: `${size}px solid ${CARD}` }),
      ...(dir === "down" && { bottom: -size, left: "50%", transform: "translateX(-50%)", borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderTop: `${size}px solid ${CARD}` }),
      ...(dir === "left" && { left: -size, top: "50%", transform: "translateY(-50%)", borderTop: `${size}px solid transparent`, borderBottom: `${size}px solid transparent`, borderRight: `${size}px solid ${CARD}` }),
      ...(dir === "right" && { right: -size, top: "50%", transform: "translateY(-50%)", borderTop: `${size}px solid transparent`, borderBottom: `${size}px solid transparent`, borderLeft: `${size}px solid ${CARD}` }),
    };
    return <div style={styles} />;
  };

  // Setup phase — full-screen modal
  if (isSetup) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ ...card, maxWidth: 520, width: "100%", padding: "36px 32px", position: "relative" }}>
          {/* Step dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
            {setupSteps.map((s, i) => {
              const stepIdx = steps.indexOf(s);
              return <div key={s.id} style={{ width: 8, height: 8, borderRadius: 4, background: stepIdx <= step ? WHITE : BORDER, transition: "background 0.2s" }} />;
            })}
          </div>

          {/* Step 0: Welcome */}
          {current.id === "welcome" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>{"\u2708\uFE0F"}</div>
              <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 8px", fontSize: 22 }}>Welcome, {(userName || "").split(" ")[0] || "there"}!</h2>
              {isAdminRole
                ? <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, margin: "0 0 8px" }}>You&apos;ve created <strong style={{ color: WHITE }}>{orgName}</strong> on PreflightSMS.</p>
                : <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, margin: "0 0 8px" }}>You&apos;ve joined <strong style={{ color: WHITE }}>{orgName}</strong> on PreflightSMS.</p>
              }
              <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, margin: "0 0 28px" }}>{isAdminRole ? current.desc : (current.descNonAdmin || current.desc)}</p>
              <button onClick={goNext} style={btnPrimary}>{isAdminRole ? "Let\u2019s Go" : "Start Tour"}</button>
            </div>
          )}

          {/* Step 1: Add Fleet */}
          {current.id === "fleet" && (
            <div>
              <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 6px", fontSize: 20 }}>{current.title}</h2>
              <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "0 0 20px" }}>{current.desc}</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input value={acType} onChange={e => setAcType(e.target.value)} placeholder="Aircraft type (e.g. PC-12)" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && handleAddAircraft()} />
                <input value={acTail} onChange={e => setAcTail(e.target.value)} placeholder="Tail # (e.g. N123AB)" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && handleAddAircraft()} />
              </div>
              <button onClick={handleAddAircraft} disabled={busy || !acType.trim() || !acTail.trim()} style={{ ...btnSecondary, width: "100%", marginBottom: 16, opacity: (!acType.trim() || !acTail.trim()) ? 0.4 : 1 }}>
                {busy ? "Adding..." : "+ Add Aircraft"}
              </button>
              {(acAdded > 0 || (fleetAircraft && fleetAircraft.length > 0)) && (
                <div style={{ padding: "10px 14px", borderRadius: 6, background: NEAR_BLACK, border: `1px solid ${BORDER}`, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: GREEN, fontSize: 16 }}>{"\u2713"}</span>
                  <span style={{ color: OFF_WHITE, fontSize: 13 }}>{fleetAircraft?.length || acAdded} aircraft registered</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={goBack} style={{ ...btnSecondary, padding: "8px 16px", fontSize: 12 }}>Back</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={goNext} style={{ ...btnSecondary, padding: "8px 16px", fontSize: 12 }}>Skip</button>
                  {(fleetAircraft?.length > 0 || acAdded > 0) && <button onClick={goNext} style={{ ...btnPrimary, padding: "8px 20px", fontSize: 12 }}>Next</button>}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Invite Team */}
          {current.id === "invite" && (
            <div>
              <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 6px", fontSize: 20 }}>{current.title}</h2>
              <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "0 0 20px" }}>{current.desc}</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={invEmail} onChange={e => { setInvEmail(e.target.value); setInvError(""); setInvSuccess(""); }} placeholder="Email address" type="email" style={{ ...inp, flex: 2 }} onKeyDown={e => e.key === "Enter" && handleInvite()} />
                <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ ...inp, flex: 1, appearance: "auto" }}>
                  <option value="pilot">Pilot</option>
                  <option value="safety_manager">Safety Manager</option>
                  <option value="chief_pilot">Chief Pilot</option>
                </select>
              </div>
              <button onClick={handleInvite} disabled={busy || !invEmail.trim()} style={{ ...btnSecondary, width: "100%", marginBottom: 12, opacity: !invEmail.trim() ? 0.4 : 1 }}>
                {busy ? "Sending..." : "Send Invite"}
              </button>
              {invError && <div style={{ color: RED, fontSize: 12, marginBottom: 8 }}>{invError}</div>}
              {invSuccess && <div style={{ color: GREEN, fontSize: 12, marginBottom: 8 }}>{invSuccess}</div>}
              {invSent > 0 && <div style={{ padding: "10px 14px", borderRadius: 6, background: NEAR_BLACK, border: `1px solid ${BORDER}`, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: GREEN, fontSize: 16 }}>{"\u2713"}</span>
                <span style={{ color: OFF_WHITE, fontSize: 13 }}>{invSent} invite{invSent !== 1 ? "s" : ""} sent</span>
              </div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={goBack} style={{ ...btnSecondary, padding: "8px 16px", fontSize: 12 }}>Back</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={goNext} style={{ ...btnSecondary, padding: "8px 16px", fontSize: 12 }}>Skip</button>
                  {invSent > 0 && <button onClick={goNext} style={{ ...btnPrimary, padding: "8px 20px", fontSize: 12 }}>Next</button>}
                </div>
              </div>
            </div>
          )}

          {/* Skip setup link */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={onDismiss} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>Skip setup entirely</button>
          </div>
        </div>
      </div>
    );
  }

  // Overview phase — centered modal with nav highlight ring
  if (isOverview) {
    const ovDesc = !isAdminRole && current.descNonAdmin ? current.descNonAdmin : current.desc;
    // Find the icon for this tab from the tabs array context
    const TAB_ICONS = { submit: "\u{1F4CB}", flights: "\u{1F4CD}", reports: "\u26A0\uFE0F", hazards: "\u{1F50D}", actions: "\u2705", policy: "\u{1F4C4}", cbt: "\u{1F393}", audit: "\u{1F6E1}\uFE0F", dashboard: "\u{1F4CA}", admin: "\u2699\uFE0F" };
    const tabIcon = TAB_ICONS[current.tab] || "\u2708\uFE0F";
    return (
      <>
        {/* Light dim overlay so nav is visible */}
        <div style={{ position: "fixed", inset: 0, zIndex: 1998, background: "rgba(0,0,0,0.4)", pointerEvents: "none" }} />

        {/* Highlight ring on nav button */}
        {overviewHighlight && (
          <div style={{
            position: "fixed", top: overviewHighlight.top, left: overviewHighlight.left,
            width: overviewHighlight.width, height: overviewHighlight.height,
            borderRadius: 6, pointerEvents: "none", zIndex: 1999,
            boxShadow: "0 0 0 3px #FFFFFF, 0 0 20px rgba(255,255,255,0.35)",
            animation: "tourPulse 2s ease-in-out infinite",
          }} />
        )}

        {/* Centered card */}
        <div style={{ position: "fixed", inset: 0, zIndex: 2001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, pointerEvents: "none" }}>
          <div style={{ ...card, maxWidth: 480, width: "100%", padding: "36px 32px", position: "relative", pointerEvents: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
            {/* Segmented progress bar */}
            <div style={{ display: "flex", gap: 3, marginBottom: 24 }}>
              {overviewSteps.map((s, i) => (
                <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i < overviewIdx ? WHITE : i === overviewIdx ? CYAN : BORDER, transition: "background 0.2s" }} />
              ))}
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{tabIcon}</div>
              <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 8px", fontSize: 20 }}>{current.title}</h2>
              <p style={{ color: OFF_WHITE, fontSize: 13, lineHeight: 1.6, margin: "0 0 24px" }}>{ovDesc}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={goBack} disabled={overviewIdx === 0} style={{ ...btnSecondary, padding: "8px 16px", fontSize: 12, opacity: overviewIdx === 0 ? 0.3 : 1 }}>Back</button>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={skipToTour} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Skip to tour</button>
                <button onClick={goNext} style={{ ...btnPrimary, padding: "8px 20px", fontSize: 12 }}>Next</button>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: SUBTLE }}>
              Step {overviewIdx + 1} of {overviewSteps.length}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Tour phase — dynamic positioned card with highlight ring
  const subSteps = filteredSubSteps || [];
  const subTitle = currentSub ? (!isAdminRole && currentSub.titleNonAdmin ? currentSub.titleNonAdmin : currentSub.title) : current.title;
  const subDesc = currentSub ? (!isAdminRole && currentSub.descNonAdmin ? currentSub.descNonAdmin : currentSub.desc) : "";
  const pos = cardPos || { top: 80, right: 24, arrowDir: null };

  return (
    <>
      {/* Dim overlay — pointer-events: none so user can see underlying app */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1998, background: "rgba(0,0,0,0.3)", pointerEvents: "none" }} />

      {/* Highlight ring around target element */}
      {highlightRect && (
        <div className="tour-highlight-ring" style={{
          position: "fixed", top: highlightRect.top, left: highlightRect.left,
          width: highlightRect.width, height: highlightRect.height,
          borderRadius: 8, pointerEvents: "none", zIndex: 1999,
          boxShadow: "0 0 0 3px #FFFFFF, 0 0 16px rgba(255,255,255,0.2)",
          animation: "tourPulse 2s ease-in-out infinite",
        }} />
      )}

      {/* Tour card */}
      <div className="onboarding-tour-card" style={{
        position: "fixed",
        top: pos.top != null ? pos.top : undefined,
        left: pos.left != null ? pos.left : undefined,
        right: pos.right != null ? pos.right : undefined,
        width: 340, ...card, padding: "24px 22px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)", zIndex: 2001,
        transition: "top 0.3s ease, left 0.3s ease, right 0.3s ease",
      }}>
        <TourArrow dir={pos.arrowDir} />

        {/* Tab-level segmented progress bar */}
        <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
          {tourSteps.map((s, i) => (
            <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i < tourIdx ? WHITE : i === tourIdx ? CYAN : BORDER, transition: "background 0.2s" }} />
          ))}
        </div>

        {/* Sub-step dots */}
        {subSteps.length > 1 && (
          <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 10 }}>
            {subSteps.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: i <= subStep ? WHITE : BORDER, transition: "background 0.2s" }} />
            ))}
          </div>
        )}

        <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
          Feature tour — Tab {tourIdx + 1} of {tourSteps.length}
        </div>
        <div style={{ fontSize: 10, color: SUBTLE, marginBottom: 10 }}>{current.title}</div>
        <h3 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 6px", fontSize: 17 }}>{subTitle}</h3>
        <p style={{ color: OFF_WHITE, fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }}>{subDesc}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={goBack} disabled={tourIdx === 0 && subStep === 0} style={{ ...btnSecondary, padding: "8px 16px", fontSize: 12, opacity: (tourIdx === 0 && subStep === 0) ? 0.3 : 1 }}>Back</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={onDismiss} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Skip tour</button>
            <button onClick={isLastGlobal ? onComplete : goNext} style={{ ...btnPrimary, padding: "8px 20px", fontSize: 12 }}>
              {isLastGlobal ? "Get Started" : "Next"}
            </button>
          </div>
        </div>

        {/* Global sub-step counter */}
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: SUBTLE }}>
          {globalSubIdx + 1} of {totalSubSteps}
        </div>
      </div>
    </>
  );
}

function RiskScoreGauge({ score }) {
  const l = getRiskLevel(score); const pct = Math.min((score / 75) * 100, 100);
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ position: "relative", width: 160, height: 90, margin: "0 auto" }}>
        <svg viewBox="0 0 200 110" width="160" height="90">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={BORDER} strokeWidth="14" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={l.color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${pct * 2.51} 251`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: l.color, fontFamily: "Georgia,serif" }}>{score}</div></div></div>
      <div style={{ display: "inline-block", padding: "4px 16px", borderRadius: 20, background: l.bg, border: `1px solid ${l.border}`, marginTop: 4 }}>
        <span style={{ fontWeight: 700, color: l.color, fontSize: 11, letterSpacing: 1.5 }}>{l.label}</span></div>
      <div style={{ marginTop: 6, color: MUTED, fontSize: 11, maxWidth: 260, margin: "6px auto 0", lineHeight: 1.4 }}>{l.action}</div></div>);
}

function FRATForm({ onSubmit, onNavigate, riskCategories, riskLevels, orgId, userName, allTemplates, activeTemplate, fleetAircraft, pendingFfFlights, selectedFfFlight, onSelectFfFlight, onClearFfFlight, pendingScTrips, selectedScTrip, onSelectScTrip, onClearScTrip, org, prefill, onClearPrefill }) {
  // AI Risk Suggestions state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  // Template switching: find template assigned to selected aircraft
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const resolveTemplate = useCallback((aircraft) => {
    if (!allTemplates || allTemplates.length <= 1) return null;
    return allTemplates.find(t => (t.assigned_aircraft || []).includes(aircraft)) || allTemplates.find(t => t.is_active) || null;
  }, [allTemplates]);

  const currentTemplate = activeTemplateId ? allTemplates?.find(t => t.id === activeTemplateId) : null;
  const RISK_CATEGORIES = currentTemplate?.categories || riskCategories || DEFAULT_RISK_CATEGORIES;
  const fleetList = fleetAircraft || [];
  const FLEET_REG_MAP = useMemo(() => {
    const map = {};
    fleetList.forEach(a => { if (!map[a.type]) map[a.type] = []; map[a.type].push(a); });
    return map;
  }, [fleetList]);
  const AIRCRAFT_TYPES = [...new Set(fleetList.map(a => a.type))];
  const hasFleet = fleetList.length > 0;
  const currentRiskLevels = currentTemplate?.risk_thresholds ? buildRiskLevels(currentTemplate.risk_thresholds) : riskLevels;
  const getRL = (s) => getRiskLevel(s, currentRiskLevels);
  const getLocalDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const [fi, setFi] = useState({ pilot: userName || "", aircraft: "", tailNumber: "", departure: "", destination: "", cruiseAlt: "", date: getLocalDate(), etd: "", ete: "", fuelLbs: "", numCrew: "1", numPax: "", remarks: "" });
  const [fratFuelUnit, setFratFuelUnit] = useState("hrs");
  // Apply prefill from setup checklist
  useEffect(() => {
    if (!prefill) return;
    setFi(prev => ({ ...prev, ...prefill }));
    if (onClearPrefill) onClearPrefill();
  }, [prefill]);
  // Sync initial aircraft + tail with first fleet entry when fleet loads
  useEffect(() => {
    if (fleetList.length > 0 && !fi.aircraft) {
      const firstType = fleetList[0].type;
      const matches = FLEET_REG_MAP[firstType] || [];
      setFi(p => ({ ...p, aircraft: firstType, tailNumber: matches.length === 1 ? matches[0].registration : "" }));
    }
  }, [fleetList]);
  // ForeFlight pre-population
  useEffect(() => {
    if (!selectedFfFlight) return;
    const ff = selectedFfFlight;
    const etdStr = ff.etd ? new Date(ff.etd).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }).replace(":", "") : "";
    const dateStr = ff.etd ? new Date(ff.etd).toISOString().split("T")[0] : getLocalDate();
    setFi(p => ({
      ...p,
      departure: ff.departure_icao || p.departure,
      destination: ff.destination_icao || p.destination,
      tailNumber: ff.tail_number || p.tailNumber,
      aircraft: ff.aircraft_type || p.aircraft,
      pilot: ff.pilot_name || p.pilot,
      date: dateStr,
      etd: etdStr || p.etd,
    }));
  }, [selectedFfFlight]);
  // Schedaero pre-population
  useEffect(() => {
    if (!selectedScTrip) return;
    const sc = selectedScTrip;
    const etdStr = sc.etd ? new Date(sc.etd).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }).replace(":", "") : "";
    const dateStr = sc.etd ? new Date(sc.etd).toISOString().split("T")[0] : getLocalDate();
    let eteStr = "";
    if (sc.etd && sc.eta) {
      const diffMs = new Date(sc.eta).getTime() - new Date(sc.etd).getTime();
      if (diffMs > 0) {
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        eteStr = String(h).padStart(2, "0") + String(m).padStart(2, "0");
      }
    }
    setFi(p => ({
      ...p,
      departure: sc.departure_icao || p.departure,
      destination: sc.destination_icao || p.destination,
      tailNumber: sc.tail_number || p.tailNumber,
      aircraft: sc.aircraft_type || p.aircraft,
      pilot: sc.pilot_name || p.pilot,
      date: dateStr,
      etd: etdStr || p.etd,
      ete: eteStr || p.ete,
      numPax: sc.passenger_count != null ? String(sc.passenger_count) : p.numPax,
      numCrew: p.numCrew || "1",
    }));
  }, [selectedScTrip]);
  const [attachments, setAttachments] = useState([]); // { file, preview, uploading, url }
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [checked, setChecked] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [wxData, setWxData] = useState(null);
  const [wxAnalysis, setWxAnalysis] = useState({ flags: {}, reasons: {}, briefing: null });
  const [wxLoading, setWxLoading] = useState(false);
  const [wxError, setWxError] = useState(null);
  const [autoSuggested, setAutoSuggested] = useState({});
  const [depTz, setDepTz] = useState(null); // { tz, tzAbbr }
  const [destTz, setDestTz] = useState(null);
  const fetchTimer = useRef(null);
  // Fatigue assessment state
  const resolvedTemplate = currentTemplate || allTemplates?.find(t => t.is_active) || activeTemplate || null;
  const fatigueEnabled = !!(resolvedTemplate?.include_fatigue);
  const [fatigueOpen, setFatigueOpen] = useState(true);
  const [fatigue, setFatigue] = useState({ sleepHours: "", hoursAwake: "", dutyStart: "", tzCrossings: "0", commute: "", subjective: null, mitigations: "" });
  const updateFatigue = (k, v) => setFatigue(p => ({ ...p, [k]: v }));

  // Calculate fatigue score (0-100 scale)
  const fatigueResult = useMemo(() => {
    if (!fatigueEnabled) return { score: 0, level: "low", points: 0 };
    let pts = 0;
    const sleep = parseFloat(fatigue.sleepHours);
    const awake = parseFloat(fatigue.hoursAwake);
    const subj = fatigue.subjective;
    const tz = parseInt(fatigue.tzCrossings) || 0;
    const commute = parseInt(fatigue.commute) || 0;
    // Sleep deficit
    if (!isNaN(sleep)) { if (sleep < 5) pts += 30; else if (sleep <= 6) pts += 15; }
    // Hours awake
    if (!isNaN(awake)) { if (awake > 20) pts += 35; else if (awake > 17) pts += 20; }
    // Circadian low: departure in 02:00-06:00 local
    if (fatigue.dutyStart) {
      const [h] = fatigue.dutyStart.split(":").map(Number);
      if (h >= 2 && h < 6) pts += 15;
    }
    // Subjective fatigue (Samn-Perelli)
    if (subj === 5) pts += 15;
    if (subj >= 6) pts += 25;
    // Timezone crossings
    if (tz >= 2) pts += 10;
    // Long commute
    if (commute > 60) pts += 5;
    const clamped = Math.min(pts, 100);
    let level = clamped <= 20 ? "low" : clamped <= 40 ? "moderate" : clamped <= 60 ? "high" : "critical";
    if (subj >= 6 && level !== "critical") level = level === "low" || level === "moderate" ? "high" : level;
    // FRAT contribution: Low=0, Moderate=+2, High=+5, Critical=+8
    const fratPoints = level === "low" ? 0 : level === "moderate" ? 2 : level === "high" ? 5 : 8;
    return { score: clamped, level, points: fratPoints };
  }, [fatigueEnabled, fatigue]);

  const score = useMemo(() => { let s = 0; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { if (checked[f.id]) s += f.score; })); return s + fatigueResult.points; }, [checked, fatigueResult.points]);
  const toggle = id => {
    setChecked(p => ({ ...p, [id]: !p[id] }));
    if (autoSuggested[id]) setAutoSuggested(p => { const n = { ...p }; delete n[id]; return n; });
  };

  // Auto-fetch weather when airports or altitude change
  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    const dep = fi.departure.trim().toUpperCase();
    const dest = fi.destination.trim().toUpperCase();
    if (dep.length < 3 && dest.length < 3) {
      setWxData(null);
      setWxAnalysis({ flags: {}, reasons: {}, briefing: null });
      setWxError(null);
      // Clear auto-suggested items
      setChecked(p => { const n = { ...p }; Object.keys(autoSuggested).forEach(k => { delete n[k]; }); return n; });
      setAutoSuggested({});
      return;
    }
    fetchTimer.current = setTimeout(async () => {
      setWxLoading(true); setWxError(null);
      try {
        const data = await fetchWeather(dep, dest, fi.cruiseAlt, fi.date, fi.etd, fi.ete);
        if (!data || (data.metars.length === 0 && data.tafs.length === 0)) {
          setWxError("No data returned — verify ICAO codes");
          setWxData(null);
          setWxAnalysis({ flags: {}, reasons: {}, briefing: null });
        } else {
          setWxData(data);
          data.depTimeZ = parseLocalTime(fi.date, fi.etd, depTz?.tz);
          data.arrTimeZ = calcArrivalTime(fi.date, fi.etd, fi.ete, depTz?.tz);
          const analysis = analyzeWeather(data);
          setWxAnalysis(analysis);
          // Auto-check flagged items, track which were auto-suggested
          setChecked(prev => {
            const next = { ...prev };
            // Remove previously auto-suggested that are no longer flagged
            Object.keys(autoSuggested).forEach(k => { if (!analysis.flags[k]) delete next[k]; });
            // Add newly flagged
            Object.keys(analysis.flags).forEach(k => { next[k] = true; });
            return next;
          });
          setAutoSuggested(analysis.flags);
        }
      } catch (e) {
        setWxError(e.message || "Network error");
      }
      setWxLoading(false);
    }, 1200);
    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, [fi.departure, fi.destination, fi.cruiseAlt, fi.etd, fi.ete, fi.date]);

  // Fetch departure airport timezone
  useEffect(() => {
    const dep = fi.departure.trim().toUpperCase();
    if (dep.length < 3) { setDepTz(null); return; }
    fetch(`/api/airports?ids=${dep}`).then(r => r.json()).then(data => {
      if (data[dep]?.tz) setDepTz({ tz: data[dep].tz, tzAbbr: data[dep].tzAbbr });
      else setDepTz(null);
    }).catch(() => setDepTz(null));
  }, [fi.departure]);

  // Fetch destination airport timezone
  useEffect(() => {
    const dest = fi.destination.trim().toUpperCase();
    if (dest.length < 3) { setDestTz(null); return; }
    fetch(`/api/airports?ids=${dest}`).then(r => r.json()).then(data => {
      if (data[dest]?.tz) setDestTz({ tz: data[dest].tz, tzAbbr: data[dest].tzAbbr });
      else setDestTz(null);
    }).catch(() => setDestTz(null));
  }, [fi.destination]);

  // Photo attachment handlers
  const handleAddPhoto = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) { alert("Photo must be under 10MB"); return; }
      const preview = URL.createObjectURL(file);
      setAttachments(prev => [...prev, { file, preview, uploading: false, url: null }]);
    });
    e.target.value = "";
  };

  const removePhoto = (idx) => {
    setAttachments(prev => { URL.revokeObjectURL(prev[idx]?.preview); return prev.filter((_, i) => i !== idx); });
  };

  const handleSubmit = async () => {
    const errs = {};
    if (!fi.pilot) errs.pilot = "Select a pilot";
    if (!fi.aircraft) errs.aircraft = "Select an aircraft";
    if (!fi.tailNumber) errs.tailNumber = "Select a tail number";
    if (!fi.departure) errs.departure = "Enter departure airport (e.g. KSFF)";
    if (fi.departure && fi.departure.length < 3) errs.departure = "Use ICAO or IATA code (e.g. KSFF)";
    if (!fi.destination) errs.destination = "Enter destination airport (e.g. KBOI)";
    if (fi.destination && fi.destination.length < 3) errs.destination = "Use ICAO or IATA code (e.g. KBOI)";
    if (!fi.cruiseAlt) errs.cruiseAlt = "Enter cruise altitude (e.g. FL180)";
    if (!fi.date) errs.date = "Select a flight date";
    if (!fi.etd) errs.etd = "Enter departure time (e.g. 1430)";
    if (!fi.ete) errs.ete = "Enter time enroute (e.g. 1:30)";
    if (!fi.fuelLbs) errs.fuelLbs = `Enter fuel onboard in ${fratFuelUnit}`;
    if (!fi.numCrew) errs.numCrew = "Enter number of crew";
    if (!fi.numPax) errs.numPax = "Enter number of passengers";
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); const firstKey = Object.keys(errs)[0]; const el = document.querySelector(`[data-field="${firstKey}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    setValidationErrors({});
    
    // Upload photos first
    const fratId = generateId();
    let uploadedUrls = [];
    if (attachments.length > 0 && orgId) {
      setUploadingPhotos(true);
      for (const att of attachments) {
        const { url, error } = await uploadFratAttachment(orgId, fratId, att.file);
        if (url) uploadedUrls.push({ url, name: att.file.name, type: att.file.type, size: att.file.size });
      }
      setUploadingPhotos(false);
    }

    const eta = calcArrivalTime(fi.date, fi.etd, fi.ete, depTz?.tz);
    const matchedRL = getRL(score);
    onSubmit({ id: fratId, ...fi, fuelUnit: fratFuelUnit, depTz: depTz?.tz || "America/Los_Angeles", destTz: destTz?.tz || "America/Los_Angeles", eta: eta ? eta.toISOString() : "", score, riskLevel: matchedRL.label, approvalMode: matchedRL.approval_mode || "none", factors: Object.keys(checked).filter(k => checked[k]), timestamp: new Date().toISOString(),
      wxBriefing: wxAnalysis.briefing ? wxAnalysis.briefing.map(b => b.raw).join(" | ") : "", attachments: uploadedUrls, foreflightFlightId: selectedFfFlight?.id || null, schedaeroTripId: selectedScTrip?.id || null,
      fatigueData: fatigueEnabled ? { sleepHours24: parseFloat(fatigue.sleepHours) || null, hoursAwake: parseFloat(fatigue.hoursAwake) || null, dutyStartTime: fatigue.dutyStart || null, timezoneCrossings: parseInt(fatigue.tzCrossings) || 0, commuteMinutes: parseInt(fatigue.commute) || null, subjectiveFatigue: fatigue.subjective, calculatedScore: fatigueResult.score, riskLevel: fatigueResult.level, mitigations: fatigue.mitigations } : null });
    if (onNavigate) onNavigate("flights");
  };
  const defaultAircraft = fleetList.length > 0 ? fleetList[0].type : "";
  const reset = () => { attachments.forEach(a => URL.revokeObjectURL(a.preview)); setAttachments([]); setUploadingPhotos(false); setFi({ pilot: "", aircraft: defaultAircraft, tailNumber: "", departure: "", destination: "", cruiseAlt: "", date: getLocalDate(), etd: "", ete: "", fuelLbs: "", numCrew: "1", numPax: "", remarks: "" }); setFratFuelUnit("hrs"); setChecked({}); setSubmitted(false); setValidationErrors({}); setWxData(null); setWxAnalysis({ flags: {}, reasons: {}, briefing: null }); setAutoSuggested({}); setFatigue({ sleepHours: "", hoursAwake: "", dutyStart: "", tzCrossings: "0", commute: "", subjective: null, mitigations: "" }); };

  if (!hasFleet) return (
    <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center", ...card, padding: "48px 36px" }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: 16 }}><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.7 7.3c.3.4.7.5 1.1.3l.5-.3c.4-.2.6-.7.5-1.1z"/></svg>
      <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 8 }}>No Aircraft Registered</div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 20, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 20px" }}>Add your fleet to enable FRAT submissions. You can add aircraft in the Admin panel under Fleet Management.</div>
      <button onClick={() => onNavigate("admin")} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Go to Fleet Management</button>
    </div>
  );

  // Build tail number options for current aircraft type
  const tailOptions = FLEET_REG_MAP[fi.aircraft] || [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* ForeFlight pending flights selector */}
      {pendingFfFlights && pendingFfFlights.length > 0 && !selectedFfFlight && !selectedScTrip && (
        <div style={{ ...card, padding: "16px 20px", marginBottom: 14, borderLeft: `4px solid ${CYAN}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>ForeFlight Dispatch Flights</div>
          {pendingFfFlights.map(ff => (
            <div key={ff.id} onClick={() => onSelectFfFlight(ff)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 6, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = CYAN + "66"} onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>{ff.departure_icao} → {ff.destination_icao}</span>
                {ff.tail_number && <span style={{ fontSize: 11, color: MUTED }}>| {ff.tail_number}</span>}
              </div>
              <span style={{ fontSize: 10, color: MUTED }}>{ff.etd ? new Date(ff.etd).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No ETD"}</span>
            </div>
          ))}
        </div>
      )}
      {/* ForeFlight pre-populated banner */}
      {selectedFfFlight && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", marginBottom: 14, borderRadius: 8, background: "rgba(34,211,238,0.08)", border: `1px solid rgba(34,211,238,0.25)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: CYAN }}>Pre-populated from ForeFlight Dispatch</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: BLACK, background: CYAN, padding: "2px 8px", borderRadius: 3 }}>{selectedFfFlight.departure_icao} → {selectedFfFlight.destination_icao}</span>
          </div>
          <button onClick={onClearFfFlight} style={{ background: "none", border: "none", color: MUTED, fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>{"\u00D7"}</button>
        </div>
      )}
      {/* Schedaero pending trips selector */}
      {pendingScTrips && pendingScTrips.length > 0 && !selectedScTrip && !selectedFfFlight && (
        <div style={{ ...card, padding: "16px 20px", marginBottom: 14, borderLeft: "4px solid #60A5FA" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Schedaero Trips</div>
          {pendingScTrips.map(sc => (
            <div key={sc.id} onClick={() => onSelectScTrip(sc)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 6, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#60A5FA66"} onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>{sc.departure_icao} → {sc.destination_icao}</span>
                {sc.tail_number && <span style={{ fontSize: 11, color: MUTED }}>| {sc.tail_number}</span>}
                {sc.trip_number && <span style={{ fontSize: 9, fontWeight: 700, color: "#60A5FA", background: "rgba(96,165,250,0.12)", padding: "2px 6px", borderRadius: 3 }}>{sc.trip_number}</span>}
              </div>
              <span style={{ fontSize: 10, color: MUTED }}>{sc.etd ? new Date(sc.etd).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No ETD"}</span>
            </div>
          ))}
        </div>
      )}
      {/* Schedaero pre-populated banner */}
      {selectedScTrip && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", marginBottom: 14, borderRadius: 8, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#60A5FA" }}>Pre-populated from Schedaero</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: BLACK, background: "#60A5FA", padding: "2px 8px", borderRadius: 3 }}>{selectedScTrip.trip_number || `${selectedScTrip.departure_icao} → ${selectedScTrip.destination_icao}`}</span>
          </div>
          <button onClick={onClearScTrip} style={{ background: "none", border: "none", color: MUTED, fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>{"\u00D7"}</button>
        </div>
      )}
      <div data-tour="tour-frat-flight-info" style={{ ...card, padding: "24px 28px 28px", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Flight Information</div>
        <div className="flight-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, minWidth: 0 }}>
          {[{ key: "pilot", label: "Pilot in Command", placeholder: "Full name", type: "text" },
            { key: "aircraft", label: "Aircraft Type", type: "fleet-type" },
            { key: "tailNumber", label: "Tail Number", type: "fleet-tail" },
            { key: "departure", label: "Departure (ICAO)", placeholder: "e.g. KSFF", type: "text", upper: true },
            { key: "destination", label: "Destination (ICAO)", placeholder: "e.g. KBOI", type: "text", upper: true },
            { key: "cruiseAlt", label: "Cruise Altitude", placeholder: "e.g. FL180 or 12000", type: "text" },
            { key: "date", label: "Flight Date", type: "date" },
            { key: "etd", label: `Est. Departure (${depTz?.tzAbbr || "local"})`, placeholder: "HH:MM", type: "time" },
            { key: "ete", label: "Est. Time Enroute", placeholder: "HH:MM", type: "time" },
            { key: "fuelLbs", label: `Fuel Onboard (${fratFuelUnit})`, placeholder: fratFuelUnit === "hrs" ? "e.g. 3.5" : "e.g. 2400", type: "fuel" },
            { key: "numCrew", label: "Number of Crew", placeholder: "e.g. 2", type: "text" },
            { key: "numPax", label: "Number of Passengers", placeholder: "e.g. 4", type: "text" },
          ].map(f => {
            const err = validationErrors[f.key];
            const isNum = ["fuelLbs","numCrew","numPax"].includes(f.key);
            return (
            <div key={f.key} data-field={f.key} style={{ minWidth: 0, overflow: "hidden" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: err ? RED : MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</label>
              {f.type === "fleet-type" ? (
                <select value={fi.aircraft} onChange={e => {
                  const val = e.target.value;
                  const matches = FLEET_REG_MAP[val] || [];
                  setFi(p => ({ ...p, aircraft: val, tailNumber: matches.length === 1 ? matches[0].registration : "" }));
                  if (allTemplates && allTemplates.length > 1) {
                    const matched = resolveTemplate(val);
                    if (matched) { setActiveTemplateId(matched.id); setChecked({}); setAutoSuggested({}); }
                  }
                  if (err) setValidationErrors(p => { const n = {...p}; delete n.aircraft; delete n.tailNumber; return n; });
                }} style={{...inp, ...(err ? {borderColor: RED} : {})}}>
                  {AIRCRAFT_TYPES.map(a => <option key={a}>{a}</option>)}</select>
              ) : f.type === "fleet-tail" ? (
                tailOptions.length === 1
                  ? <input type="text" value={tailOptions[0].registration} readOnly style={{...inp, color: CYAN, cursor: "default"}} />
                  : <select value={fi.tailNumber} onChange={e => { setFi(p => ({ ...p, tailNumber: e.target.value })); if (err) setValidationErrors(p => { const n = {...p}; delete n.tailNumber; return n; }); }} style={{...inp, ...(err ? {borderColor: RED} : {})}}>
                      <option value="">Select tail number...</option>
                      {tailOptions.map(a => <option key={a.registration} value={a.registration}>{a.registration}</option>)}
                    </select>
              ) : f.type === "fuel" ? (
                <div style={{ display: "flex", gap: 0 }}>
                  <input type="text" inputMode="decimal" placeholder={f.placeholder} value={fi[f.key]}
                    onChange={e => { setFi(p => ({ ...p, [f.key]: e.target.value })); if (err) setValidationErrors(p => { const n = {...p}; delete n[f.key]; return n; }); }}
                    style={{...inp, ...(err ? {borderColor: RED} : {}), flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", minWidth: 0}} />
                  <button type="button" onClick={() => setFratFuelUnit(u => u === "lbs" ? "hrs" : "lbs")}
                    style={{ padding: "8px 10px", background: CARD, border: `1px solid ${err ? RED : BORDER}`, borderTopRightRadius: 6, borderBottomRightRadius: 6, color: WHITE, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{fratFuelUnit}</button>
                </div>
              ) : f.type === "time" ? (() => {
                const raw = fi[f.key] || "";
                const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
                const display = digits.length > 2 ? digits.slice(0, 2) + ":" + digits.slice(2) : digits;
                return (
                  <input type="text" inputMode="numeric" maxLength={5} placeholder={f.placeholder} value={display}
                    onFocus={e => e.target.select()}
                    onChange={e => { const d = e.target.value.replace(/[^0-9]/g, "").slice(0, 4); const v = d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d; setFi(p => ({ ...p, [f.key]: v })); if (err) setValidationErrors(p => { const n = {...p}; delete n[f.key]; return n; }); }}
                    style={{...inp, ...(err ? {borderColor: RED} : {})}} />);
              })() : (<input type={f.type === "date" ? "date" : "text"} inputMode={isNum ? "numeric" : undefined} placeholder={f.placeholder} value={fi[f.key]}
                onChange={e => { let v = f.upper ? e.target.value.toUpperCase() : e.target.value; if (f.key === "cruiseAlt") v = v.toUpperCase(); setFi(p => ({ ...p, [f.key]: v })); if (err) setValidationErrors(p => { const n = {...p}; delete n[f.key]; return n; }); }}
                onBlur={f.key === "ete" ? () => setFi(p => ({ ...p, ete: formatETE(p.ete) })) : f.key === "cruiseAlt" ? () => setFi(p => { const raw = p.cruiseAlt.trim().toUpperCase(); if (!raw) return p; if (raw.startsWith("FL")) return { ...p, cruiseAlt: "FL" + raw.slice(2) }; const num = parseInt(raw, 10); if (!isNaN(num) && num >= 100 && num <= 999) return { ...p, cruiseAlt: "FL" + num }; if (!isNaN(num) && num >= 18000) return { ...p, cruiseAlt: "FL" + Math.round(num / 100) }; return p; }) : undefined}
                style={{...inp, ...(err ? {borderColor: RED} : {})}} />)}
              {err && <div style={{ fontSize: 10, color: RED, marginTop: 3 }}>{err}</div>}
            </div>);})}
        </div>
      </div>

      {/* Template indicator (multi-template mode) */}
      {allTemplates && allTemplates.length > 1 && (
        <div style={{ ...card, padding: "12px 18px", marginBottom: 18, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>Template:</span>
            <select value={activeTemplateId || ""} onChange={e => { setActiveTemplateId(e.target.value || null); setChecked({}); setAutoSuggested({}); }}
              style={{ ...inp, width: "auto", padding: "6px 10px", fontSize: 12, background: "transparent" }}>
              {allTemplates.filter(t => t.categories && t.categories.length > 0).map(t => (
                <option key={t.id} value={t.id}>{t.name}{t.is_active ? " (default)" : ""}</option>
              ))}
            </select>
          </div>
          {currentTemplate?.assigned_aircraft?.length > 0 && (
            <span style={{ fontSize: 10, color: SUBTLE }}>Assigned: {currentTemplate.assigned_aircraft.join(", ")}</span>
          )}
        </div>
      )}

      {/* Photo Attachments */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 18, borderRadius: 10 }}>
        <div style={{ color: MUTED, fontSize: 11, marginBottom: 12 }}>Attach photos of HAZMAT PIC notifications or other documents</div>
        {attachments.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 12 }}>
            {attachments.map((att, idx) => (
              <div key={idx} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}`, background: BLACK, aspectRatio: "1" }}>
                <img src={att.preview} alt={att.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => removePhoto(idx)} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: `1px solid ${BORDER}`, color: WHITE, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>&times;</button>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", background: "rgba(0,0,0,0.7)", fontSize: 9, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{att.file.name}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, color: OFF_WHITE, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Take Photo
            <input type="file" accept="image/*" capture="environment" onChange={handleAddPhoto} style={{ display: "none" }} />
          </label>
          <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 16px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, color: OFF_WHITE, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            Choose File
            <input type="file" accept="image/*" multiple onChange={handleAddPhoto} style={{ display: "none" }} />
          </label>
        </div>
        {uploadingPhotos && <div style={{ color: CYAN, fontSize: 11, marginTop: 8, textAlign: "center" }}>Uploading photos...</div>}
      </div>

      <WeatherBriefing briefing={wxAnalysis.briefing} reasons={wxAnalysis.reasons} flags={wxAnalysis.flags} stationSummaries={wxAnalysis.stationSummaries} wxLoading={wxLoading} wxError={wxError} />

      {/* AI Risk Suggestions Panel */}
      {hasFeature(org, "safety_trend_alerts") && (
        <div style={{ ...card, padding: "14px 18px", marginBottom: 18, borderRadius: 10, border: `1px solid ${aiPanelOpen ? CYAN + "44" : BORDER}` }}>
          <button onClick={async () => {
            if (!aiPanelOpen) {
              setAiPanelOpen(true);
              if (aiSuggestions.length === 0 && (fi.departure || fi.destination || fi.aircraft)) {
                setAiSuggestionsLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke('ai-frat-suggestions', {
                    body: { orgId, departure: fi.departure, destination: fi.destination, aircraft: fi.aircraft, flightDate: fi.date, etd: fi.etd }
                  });
                  if (!error && data?.suggestions) setAiSuggestions(data.suggestions);
                } catch { /* toast handled by UI */ }
                setAiSuggestionsLoading(false);
              }
            } else {
              setAiPanelOpen(false);
            }
          }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            <span style={{ color: CYAN, fontSize: 16 }}>🤖</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: CYAN }}>AI Risk Suggestions</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: MUTED }}>{aiPanelOpen ? "▲" : "▼"}</span>
          </button>
          {aiPanelOpen && (
            <div style={{ marginTop: 12 }}>
              {aiSuggestionsLoading && <div style={{ fontSize: 11, color: CYAN, padding: "8px 0" }}>Analyzing flight context...</div>}
              {!aiSuggestionsLoading && aiSuggestions.length === 0 && (
                <div style={{ fontSize: 11, color: MUTED, padding: "8px 0" }}>
                  {fi.departure || fi.destination ? "No suggestions available for this flight." : "Fill in departure/destination to get AI risk suggestions."}
                </div>
              )}
              {aiSuggestions.map((s, i) => {
                const isChecked = checked[s.factor_id];
                return (
                  <div key={i} style={{ padding: "10px 12px", marginBottom: 6, borderRadius: 8, background: isChecked ? `${CYAN}11` : `${CYAN}06`, border: `1px solid ${isChecked ? CYAN + "44" : BORDER}`, cursor: "pointer" }}
                    onClick={() => { if (s.factor_id && !isChecked) toggle(s.factor_id); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: CYAN, background: `${CYAN}22`, padding: "2px 8px", borderRadius: 8 }}>{s.category || "General"}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: WHITE }}>{s.factor_label}</span>
                      {isChecked && <span style={{ fontSize: 9, color: GREEN, marginLeft: "auto" }}>✓ Added</span>}
                    </div>
                    <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.4 }}>{s.explanation}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="frat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        <div data-tour="tour-frat-risk-categories">
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>Risk Categories</div>
          {RISK_CATEGORIES.map(cat => { const catScore = cat.factors.reduce((s, f) => s + (checked[f.id] ? f.score : 0), 0); return (
            <div key={cat.id} style={{ ...card, padding: "18px 22px", marginBottom: 14, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, color: WHITE, fontSize: 15, fontWeight: 700 }}>{cat.name}</h3>
                {catScore > 0 && <span style={{ fontWeight: 700, fontSize: 14, color: GREEN }}>+{catScore}</span>}
              </div>
              {cat.factors.map(f => { const ic = !!checked[f.id]; const isAuto = !!autoSuggested[f.id]; const rl = getRL(f.score > 4 ? 46 : f.score > 3 ? 31 : 16); return (
                <div key={f.id} onClick={() => toggle(f.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4, borderRadius: 6, cursor: "pointer",
                  background: ic ? (isAuto ? "rgba(34,211,238,0.06)" : rl.bg) : "rgba(255,255,255,0.02)",
                  border: `1px solid ${ic ? (isAuto ? "rgba(34,211,238,0.3)" : rl.border) : BORDER}`, transition: "all 0.15s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${ic ? (isAuto ? CYAN : WHITE) : LIGHT_BORDER}`, background: ic ? (isAuto ? CYAN : WHITE) : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {ic && <span style={{ color: BLACK, fontSize: 12, fontWeight: 700 }}>✓</span>}</div>
                  <span style={{ flex: 1, fontSize: 12, color: OFF_WHITE, lineHeight: 1.3 }}>
                    {isAuto && <span title="Auto-detected from weather data" style={{ marginRight: 4, color: CYAN, fontSize: 10 }}>AUTO</span>}
                    {f.label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 10, color: ic ? (isAuto ? CYAN : rl.color) : SUBTLE, minWidth: 22, textAlign: "right" }}>+{f.score}</span>
                </div>); })}</div>); })}

          {/* Fatigue Assessment Card — appears after Pilot/Crew category */}
          {fatigueEnabled && (() => {
            const SAMN_PERELLI = [
              { value: 1, label: "Fully alert, wide awake", color: GREEN },
              { value: 2, label: "Very lively, responsive", color: GREEN },
              { value: 3, label: "Okay, somewhat fresh", color: GREEN },
              { value: 4, label: "A little tired, less than fresh", color: YELLOW },
              { value: 5, label: "Moderately tired, let down", color: AMBER },
              { value: 6, label: "Extremely tired, very difficult to concentrate", color: RED },
              { value: 7, label: "Completely exhausted, unable to function effectively", color: RED },
            ];
            const fl = fatigueResult.level;
            const flColor = fl === "low" ? GREEN : fl === "moderate" ? YELLOW : fl === "high" ? AMBER : RED;
            const flBg = fl === "low" ? "rgba(74,222,128,0.08)" : fl === "moderate" ? "rgba(250,204,21,0.08)" : fl === "high" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)";
            const flBorder = fl === "low" ? "rgba(74,222,128,0.25)" : fl === "moderate" ? "rgba(250,204,21,0.25)" : fl === "high" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)";
            const hasInput = fatigue.sleepHours !== "" || fatigue.hoursAwake !== "" || fatigue.subjective !== null;
            return (
              <div style={{ ...card, padding: "18px 22px", marginBottom: 14, borderRadius: 10, border: `1px solid ${hasInput ? flBorder : BORDER}` }}>
                <div onClick={() => setFatigueOpen(p => !p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3 style={{ margin: 0, color: WHITE, fontSize: 15, fontWeight: 700 }}>Fatigue Assessment</h3>
                    {hasInput && <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: flBg, color: flColor, border: `1px solid ${flBorder}`, textTransform: "uppercase" }}>{fl}{fatigueResult.points > 0 ? ` (+${fatigueResult.points})` : ""}</span>}
                  </div>
                  <span style={{ color: MUTED, fontSize: 12 }}>{fatigueOpen ? "▲" : "▼"}</span>
                </div>
                {fatigueOpen && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Hours of sleep in last 24 hours</label>
                        <input type="number" min="0" max="24" step="0.5" placeholder="e.g. 7" value={fatigue.sleepHours} onChange={e => updateFatigue("sleepHours", e.target.value)} style={inp} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Hours awake at departure</label>
                        <input type="number" min="0" max="48" step="0.5" placeholder="e.g. 12" value={fatigue.hoursAwake} onChange={e => updateFatigue("hoursAwake", e.target.value)} style={inp} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Duty period start time</label>
                        <input type="time" value={fatigue.dutyStart} onChange={e => updateFatigue("dutyStart", e.target.value)} style={inp} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Time zone crossings (last 48 hrs)</label>
                        <input type="number" min="0" max="10" value={fatigue.tzCrossings} onChange={e => updateFatigue("tzCrossings", e.target.value)} style={inp} />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Commute time to airport (minutes)</label>
                        <input type="number" min="0" placeholder="e.g. 45" value={fatigue.commute} onChange={e => updateFatigue("commute", e.target.value)} style={{ ...inp, maxWidth: 200 }} />
                      </div>
                    </div>

                    {/* Samn-Perelli Scale */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>How do you feel right now?</label>
                      {SAMN_PERELLI.map(sp => (
                        <div key={sp.value} onClick={() => updateFatigue("subjective", sp.value)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 3, borderRadius: 6, cursor: "pointer",
                            background: fatigue.subjective === sp.value ? flBg : "rgba(255,255,255,0.02)",
                            border: `1px solid ${fatigue.subjective === sp.value ? sp.color + "44" : BORDER}`, transition: "all 0.15s" }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${fatigue.subjective === sp.value ? sp.color : LIGHT_BORDER}`,
                            background: fatigue.subjective === sp.value ? sp.color : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {fatigue.subjective === sp.value && <div style={{ width: 6, height: 6, borderRadius: "50%", background: BLACK }} />}
                          </div>
                          <span style={{ fontSize: 12, color: fatigue.subjective === sp.value ? WHITE : OFF_WHITE, flex: 1 }}>
                            <span style={{ fontWeight: 700, color: sp.color, marginRight: 6 }}>{sp.value}.</span>{sp.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Live fatigue score badge */}
                    {hasInput && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, background: flBg, border: `1px solid ${flBorder}`, marginBottom: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: flColor + "22", border: `1px solid ${flColor}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: flColor }}>{fatigueResult.score}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: flColor, textTransform: "uppercase" }}>Fatigue Risk: {fl}</div>
                          <div style={{ fontSize: 10, color: MUTED }}>{fatigueResult.points > 0 ? `Contributing +${fatigueResult.points} to Pilot/Crew score` : "No additional risk points"}</div>
                        </div>
                      </div>
                    )}

                    {/* Warning + mitigations for High/Critical */}
                    {(fl === "high" || fl === "critical") && (
                      <div style={{ padding: "12px 16px", borderRadius: 8, background: fl === "critical" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${fl === "critical" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`, marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: fl === "critical" ? RED : AMBER, marginBottom: 8 }}>
                          {fl === "critical" ? "⚠ Critical Fatigue — Consider not flying" : "⚠ High Fatigue Risk — Mitigation required"}
                        </div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>What steps will you take to mitigate fatigue?</label>
                        <textarea value={fatigue.mitigations} onChange={e => updateFatigue("mitigations", e.target.value)}
                          placeholder="e.g. Additional rest before flight, caffeine strategy, crew resource management plan..."
                          rows={3} style={{ ...inp, resize: "vertical", minHeight: 60 }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="score-panel-desktop" data-tour="tour-frat-score-panel" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
          <div style={{ ...card, padding: 24, border: `1px solid ${getRL(score).border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "center", marginBottom: 8 }}>Risk Score</div>
            <div style={{ fontSize: 56, fontWeight: 800, color: getRL(score).color, textAlign: "center", lineHeight: 1, marginBottom: 12 }}>{score}</div>
            {/* Progress bar */}
            <div style={{ position: "relative", height: 6, background: BORDER, borderRadius: 3, marginBottom: 4 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min((score / 40) * 100, 100)}%`, background: getRL(score).color, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: SUBTLE, marginBottom: 14 }}>
              <span>0</span><span>15</span><span>25</span><span>40</span>
            </div>
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: getRL(score).color, marginBottom: 16 }}>✓ {getRL(score).label.replace(" RISK", "")} — {getRL(score).label.includes("LOW") ? "Low Risk" : getRL(score).label.includes("MODERATE") ? "Moderate Risk" : getRL(score).label.includes("HIGH") ? "High Risk" : "Critical Risk"}</div>
            {/* Category breakdown */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 16 }}>
              {RISK_CATEGORIES.map(cat => { const catScore = cat.factors.reduce((s, f) => s + (checked[f.id] ? f.score : 0), 0); return (
                <div key={cat.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                  <span style={{ fontSize: 12, color: OFF_WHITE }}>{cat.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: catScore > 0 ? GREEN : SUBTLE }}>+{catScore}</span>
                </div>); })}
              {fatigueEnabled && fatigueResult.points > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                  <span style={{ fontSize: 12, color: OFF_WHITE }}>Fatigue</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: fatigueResult.level === "critical" ? RED : fatigueResult.level === "high" ? AMBER : YELLOW }}>+{fatigueResult.points}</span>
                </div>
              )}
            </div>
            <button onClick={handleSubmit} style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.5, textTransform: "uppercase" }}>Submit FRAT</button>
          </div>
        </div></div>

      <div className="score-panel-mobile" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", margin: "0 16px 6px", background: BLACK, borderRadius: 10, border: `1px solid ${getRL(score).border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: getRL(score).bg, border: `1px solid ${getRL(score).border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 800, color: getRL(score).color, fontSize: 16, fontFamily: "Georgia,serif" }}>{score}</span></div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, color: getRL(score).color, fontSize: 11 }}>{getRL(score).label}</div>
              <div style={{ color: MUTED, fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getRL(score).action}</div></div></div>
          <button onClick={handleSubmit} style={{ padding: "10px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>SUBMIT</button></div></div>
    </div>);
}

function HistoryView({ records, onDelete, onViewDetail }) {
  const [filter, setFilter] = useState("ALL"); const [search, setSearch] = useState("");
  const filtered = useMemo(() => records.filter(r => { if (filter !== "ALL" && r.riskLevel !== filter) return false; if (search && !`${r.pilot} ${r.departure} ${r.destination} ${r.aircraft} ${r.id}`.toLowerCase().includes(search.toLowerCase())) return false; return true; }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [records, filter, search]);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search pilot, airport, ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, flex: 1, minWidth: 180, fontSize: 13 }} />
        {["ALL", ...Object.values(DEFAULT_RISK_LEVELS).map(l => l.label)].map(l => (
          <button key={l} onClick={() => setFilter(l)} style={{ padding: "6px 11px", borderRadius: 16, border: `1px solid ${filter === l ? WHITE : BORDER}`, background: filter === l ? WHITE : CARD, color: filter === l ? BLACK : MUTED, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
            {l === "ALL" ? "All" : l.split(" ")[0]}</button>))}</div>
      {filtered.length === 0 ? (<div style={{ textAlign: "center", padding: 60, color: MUTED }}><div style={{ fontSize: 14 }}>No FRAT records found</div></div>)
        : filtered.map(r => { const l = getRiskLevel(r.score); return (
          <div key={r.id} onClick={() => onViewDetail && onViewDetail(r.id)} style={{ ...card, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, cursor: onViewDetail ? "pointer" : "default" }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: l.bg, border: `1px solid ${l.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 800, color: l.color, fontSize: 16, fontFamily: "Georgia,serif" }}>{r.score}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{r.departure} → {r.destination}</span>
                <span style={{ background: l.bg, color: l.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, border: `1px solid ${l.border}` }}>{l.label}</span>
                <span style={{ background: NEAR_BLACK, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 600 }}>{r.aircraft}</span>
                {r.cruiseAlt && <span style={{ background: NEAR_BLACK, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 600 }}>{r.cruiseAlt}</span>}</div>
              <div style={{ color: MUTED, fontSize: 10 }}>{r.pilot} · {formatDateTime(r.timestamp)} · {r.id} · {r.factors.length} factor{r.factors.length !== 1 ? "s" : ""}</div>
              {r.remarks && <div style={{ color: SUBTLE, fontSize: 10, marginTop: 2, fontStyle: "italic" }}>"{r.remarks}"</div>}
              {r.attachments && r.attachments.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {r.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "block", width: 48, height: 48, borderRadius: 6, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                      <img src={att.url} alt={att.name || "Attachment"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </a>
                  ))}
                </div>
              )}</div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(r.id); }} style={{ background: "none", border: "none", color: LIGHT_BORDER, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button></div>); })}</div>);
}

function FRATDetailModal({ fratId, records, flights, riskCategories, canApprove, onApproveFlight, onRejectFlight, onApproveFRAT, onRejectFRAT, onClose }) {
  const frat = records.find(r => r.id === fratId);
  if (!frat) return (<div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
    <div style={{ ...card, padding: 32, maxWidth: 480, width: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
      <div style={{ color: MUTED, fontSize: 13 }}>Loading FRAT...</div>
    </div></div>);
  const rl = getRiskLevel(frat.score);
  const allFactors = (riskCategories || DEFAULT_RISK_CATEGORIES).flatMap(c => c.factors.map(f => ({ ...f, category: c.name })));
  const checkedFactors = allFactors.filter(f => frat.factors.includes(f.id));
  const flight = flights.find(f => f.id === fratId);
  const needsApproval = frat.approvalStatus === "pending" || frat.approvalStatus === "review" || (flight && flight.status === "PENDING_APPROVAL");
  const isReviewOnly = frat.approvalStatus === "review" && (!flight || flight.status !== "PENDING_APPROVAL");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ ...card, padding: 0, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>{frat.departure} → {frat.destination}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{frat.id} · {frat.pilot} · {formatDateTime(frat.timestamp)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, fontSize: 20, cursor: "pointer", padding: 4 }}>×</button>
        </div>
        {/* Score banner */}
        <div style={{ margin: "16px 24px", padding: "14px 18px", background: rl.bg, border: `1px solid ${rl.border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: 10, background: CARD, border: `1px solid ${rl.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontWeight: 800, color: rl.color, fontSize: 20, fontFamily: "Georgia,serif" }}>{frat.score}</span></div>
          <div>
            <div style={{ fontWeight: 700, color: rl.color, fontSize: 13 }}>{rl.label}</div>
            {rl.action && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{rl.action}</div>}
          </div>
        </div>
        {/* Flight details grid */}
        <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 11 }}>
          {frat.aircraft && <div><span style={{ color: MUTED }}>Aircraft </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{frat.aircraft}{frat.tailNumber ? ` (${frat.tailNumber})` : ""}</span></div>}
          {frat.date && <div><span style={{ color: MUTED }}>Date </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{frat.date}</span></div>}
          {frat.etd && <div><span style={{ color: MUTED }}>ETD </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{frat.etd}</span></div>}
          {frat.ete && <div><span style={{ color: MUTED }}>ETE </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{frat.ete}</span></div>}
          {frat.cruiseAlt && <div><span style={{ color: MUTED }}>Cruise Alt </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{frat.cruiseAlt}</span></div>}
          {frat.fuelLbs && <div><span style={{ color: MUTED }}>Fuel </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{frat.fuelLbs} {frat.fuelUnit || "lbs"}</span></div>}
          {frat.numCrew && <div><span style={{ color: MUTED }}>Crew </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{frat.numCrew}</span></div>}
          {frat.numPax && <div><span style={{ color: MUTED }}>Pax </span><span style={{ color: OFF_WHITE, fontWeight: 600 }}>{frat.numPax}</span></div>}
        </div>
        {/* Risk factors */}
        {checkedFactors.length > 0 && (
          <div style={{ padding: "16px 24px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Risk Factors ({checkedFactors.length})</div>
            {checkedFactors.map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", marginBottom: 4, background: NEAR_BLACK, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, minWidth: 18, textAlign: "center" }}>+{f.score}</span>
                <span style={{ fontSize: 10, color: OFF_WHITE, flex: 1 }}>{f.label}</span>
                <span style={{ fontSize: 9, color: MUTED }}>{f.category}</span>
              </div>))}
          </div>)}
        {/* Wx briefing */}
        {frat.wxBriefing && (
          <div style={{ padding: "12px 24px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Weather Briefing</div>
            <div style={{ fontSize: 10, color: OFF_WHITE, background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 10px", whiteSpace: "pre-wrap" }}>{frat.wxBriefing}</div>
          </div>)}
        {/* Remarks */}
        {frat.remarks && (
          <div style={{ padding: "12px 24px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Pilot Remarks</div>
            <div style={{ fontSize: 10, color: OFF_WHITE, fontStyle: "italic" }}>"{frat.remarks}"</div>
          </div>)}
        {/* Attachments */}
        {frat.attachments && frat.attachments.length > 0 && (
          <div style={{ padding: "12px 24px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: WHITE, marginBottom: 6 }}>Attachments</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {frat.attachments.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: 56, height: 56, borderRadius: 6, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                  <img src={att.url} alt={att.name || "Attachment"} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></a>))}
            </div>
          </div>)}
        {/* Approval section */}
        {needsApproval && canApprove && (
          <div style={{ padding: "16px 24px 0" }}>
            <div style={{ padding: "10px 14px", background: isReviewOnly ? "rgba(34,211,238,0.08)" : "rgba(250,204,21,0.08)", border: `1px solid ${isReviewOnly ? "rgba(34,211,238,0.25)" : "rgba(250,204,21,0.25)"}`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isReviewOnly ? CYAN : YELLOW, marginBottom: 4 }}>{isReviewOnly ? "Flagged for Review" : "Supervisor Approval Required"}</div>
              <div style={{ fontSize: 10, color: MUTED }}>{isReviewOnly ? `This FRAT scored ${frat.score} (${frat.riskLevel}). The pilot has departed — please review.` : `This FRAT scored ${frat.score} (${frat.riskLevel}) which requires management approval.`}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { if (flight && (flight.status === "PENDING_APPROVAL" || flight.approvalStatus === "pending" || isReviewOnly)) { onApproveFlight(flight.dbId, flight.fratDbId); } else { onApproveFRAT(frat.dbId); } onClose(); }}
                style={{ flex: 1, padding: "10px 0", background: GREEN, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{isReviewOnly ? "MARK REVIEWED" : "APPROVE"}</button>
              {!isReviewOnly && <button onClick={() => { if (flight && (flight.status === "PENDING_APPROVAL" || flight.approvalStatus === "pending")) { onRejectFlight(flight.dbId, flight.fratDbId); } else { onRejectFRAT(frat.dbId); } onClose(); }}
                style={{ padding: "10px 16px", background: "transparent", color: RED, border: `1px solid ${RED}44`, borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Reject</button>}
            </div>
          </div>)}
        <div style={{ height: 24 }} />
      </div>
    </div>);
}

function FlightBoard({ flights, foreflightFlights, schedaeroTrips, onUpdateFlight, onApproveFlight, onRejectFlight, canApprove, onSelfDispatch, initialSelectedFlight, adsbEnabled, session }) {
  const STATUSES = {
    ACTIVE: { label: "ENROUTE", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)" },
    ARRIVED: { label: "ARRIVED", color: GREEN, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)" },
    CANCELLED: { label: "CANCELLED", color: MUTED, bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)" },
    PENDING_APPROVAL: { label: "AWAITING APPROVAL", color: YELLOW, bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)" },
    REJECTED: { label: "REJECTED", color: RED, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
  };
  // Pending approval = DB status is ACTIVE but approval_status is "pending" (or legacy client-side PENDING_APPROVAL status)
  const isPending = (f) => f.status === "PENDING_APPROVAL" || (f.status === "ACTIVE" && f.approvalStatus === "pending");
  const isActiveOrPending = (f) => f.status === "ACTIVE" || f.status === "PENDING_APPROVAL";
  const [filter, setFilter] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  const [selectedFlight, setSelectedFlight] = useState(initialSelectedFlight || null);
  const [arrivedForm, setArrivedForm] = useState(null); // flight id being marked arrived
  const [parkingSpot, setParkingSpot] = useState("");
  const [fuelRemaining, setFuelRemaining] = useState("");
  const [fuelUnit, setFuelUnit] = useState("hrs");
  const [airportCoords, setAirportCoords] = useState({});
  const [now, setNow] = useState(Date.now());

  // Update 'now' every 10 seconds so progress bar and map plane move
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(iv);
  }, []);

  // Live ADS-B positions
  const [livePositions, setLivePositions] = useState({});
  useEffect(() => {
    console.log("[adsb] polling check — adsbEnabled:", adsbEnabled, "hasToken:", !!session?.access_token);
    if (!adsbEnabled || !session?.access_token) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/flight-positions", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        console.log("[adsb] poll result:", { status: res.status, cached: data.cached, positions: data.positions?.length, provider: data.provider, feature_disabled: data.feature_disabled, reason: data.reason });
        if (!res.ok || cancelled || data.feature_disabled || !data.positions) return;
        const map = {};
        for (const p of data.positions) {
          map[p.flight_id] = { ...p, receivedAt: Date.now() };
        }
        if (!cancelled) setLivePositions(map);
      } catch (err) { console.error("[adsb] poll error:", err); }
    };
    poll();
    const iv = setInterval(poll, 12000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [adsbEnabled, session?.access_token]);

  // Fetch airport coordinates
  useEffect(() => {
    const ids = new Set();
    flights.forEach(f => { if (f.departure) ids.add(f.departure); if (f.destination) ids.add(f.destination); });
    if (ids.size === 0) return;
    const toFetch = [...ids].filter(id => !airportCoords[id]);
    if (toFetch.length === 0) return;
    fetch(`/api/airports?ids=${toFetch.join(",")}`).then(r => r.json()).then(data => {
      setAirportCoords(prev => ({ ...prev, ...data }));
    }).catch(() => {});
  }, [flights]);

  const recent = useMemo(() => flights.filter(f => {
    if (isActiveOrPending(f)) return true;
    const completedAt = f.arrivedAt || f.timestamp;
    if (!completedAt) return false;
    return (now - new Date(completedAt).getTime()) < 24 * 3600000;
  }), [flights, now]);
  const flightCounts = useMemo(() => {
    let active = 0, arrived = 0;
    recent.forEach(f => { if (isActiveOrPending(f)) active++; else arrived++; });
    return { ACTIVE: active, ARRIVED: arrived, ALL: recent.length };
  }, [recent]);
  const displayed = (() => {
    let list = filter === "ACTIVE" ? recent.filter(f => isActiveOrPending(f)) : filter === "ARRIVED" ? recent.filter(f => !isActiveOrPending(f)) : recent;
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(f => `${f.pilot || ""} ${f.departure || ""} ${f.destination || ""} ${f.aircraft || ""} ${f.id || ""}`.toLowerCase().includes(q));
    return list;
  })();
  const activeFlights = flights.filter(f => isActiveOrPending(f));

  const isOverdue = (f) => {
    if (f.status !== "ACTIVE" || isPending(f) || !f.eta) return false;
    // If flight was held for approval, recalculate ETA from approved_at + ete
    if (f.approvedAt) {
      const eteMins = parseETE(f.ete);
      if (eteMins > 0) {
        const adjustedEta = new Date(f.approvedAt).getTime() + eteMins * 60000;
        return !isNaN(adjustedEta) && now > adjustedEta;
      }
    }
    const etaMs = new Date(f.eta).getTime();
    return !isNaN(etaMs) && now > etaMs;
  };

  const getProgress = (f) => {
    if (f.status === "ARRIVED") return 100;
    if (isPending(f)) return 0;
    if (!f.eta) return -1;
    const end = new Date(f.eta).getTime();
    const eteMins = parseETE(f.ete);
    // If flight was approved, use max(approvedAt, planned ETD) as start
    if (f.approvedAt) {
      const approvedAtMs = new Date(f.approvedAt).getTime();
      const plannedEtdMs = eteMins > 0 ? end - eteMins * 60000 : approvedAtMs;
      const actualStart = Math.max(approvedAtMs, plannedEtdMs);
      const adjustedEnd = actualStart + eteMins * 60000;
      if (isNaN(actualStart) || isNaN(adjustedEnd) || adjustedEnd <= actualStart) return 0;
      const pct = ((now - actualStart) / (adjustedEnd - actualStart)) * 100;
      return Math.max(0, Math.min(pct, 95));
    }
    // Compute actual departure time from eta minus ete (more accurate than created_at)
    const start = eteMins > 0 ? end - eteMins * 60000 : new Date(f.timestamp).getTime();
    if (isNaN(end) || isNaN(start) || end <= start) return 0;
    const pct = ((now - start) / (end - start)) * 100;
    return Math.max(0, Math.min(pct, 95));
  };

  const getEstimatedPos = (f) => {
    // Prefer live ADS-B position if available and fresh (<30s)
    const live = livePositions[f.dbId];
    if (live && live.latitude != null && live.longitude != null && (Date.now() - (live.receivedAt || 0)) < 30000) {
      return {
        lat: live.latitude,
        lon: live.longitude,
        isLive: true,
        heading: live.track,
        speed: live.ground_speed,
        alt: live.altitude_baro,
        verticalRate: live.vertical_rate,
        onGround: live.on_ground,
      };
    }
    const dep = airportCoords[f.departure];
    const dest = airportCoords[f.destination];
    if (!dep || !dest) return null;
    const pct = Math.max(getProgress(f), 0) / 100;
    return {
      lat: dep.lat + (dest.lat - dep.lat) * pct,
      lon: dep.lon + (dest.lon - dep.lon) * pct,
    };
  };

  // SVG Map
  const renderMap = () => {
    if (activeFlights.length === 0) return null;
    const allCoords = [];
    activeFlights.forEach(f => {
      const dep = airportCoords[f.departure]; const dest = airportCoords[f.destination];
      if (dep) allCoords.push(dep); if (dest) allCoords.push(dest);
    });
    if (allCoords.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    allCoords.forEach(c => { minLat = Math.min(minLat, c.lat); maxLat = Math.max(maxLat, c.lat); minLon = Math.min(minLon, c.lon); maxLon = Math.max(maxLon, c.lon); });
    const padLat = Math.max((maxLat - minLat) * 0.3, 1); const padLon = Math.max((maxLon - minLon) * 0.3, 1.5);
    minLat -= padLat; maxLat += padLat; minLon -= padLon; maxLon += padLon;
    const W = 800, H = 400;
    const toX = (lon) => ((lon - minLon) / (maxLon - minLon)) * W;
    const toY = (lat) => H - ((lat - minLat) / (maxLat - minLat)) * H;

    return (
      <div style={{ ...card, padding: 0, marginBottom: 18, overflow: "hidden", borderRadius: 10 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", background: BLACK }}>
          {[0.25, 0.5, 0.75].map(v => (<g key={v}>
            <line x1={0} y1={H * v} x2={W} y2={H * v} stroke={BORDER} strokeWidth="0.5" />
            <line x1={W * v} y1={0} x2={W * v} y2={H} stroke={BORDER} strokeWidth="0.5" />
          </g>))}
          <rect x={0} y={0} width={W} height={H} fill="none" stroke={BORDER} strokeWidth="1" />
          {activeFlights.map(f => {
            const dep = airportCoords[f.departure]; const dest = airportCoords[f.destination];
            if (!dep || !dest) return null;
            const pos = getEstimatedPos(f);
            const dx = toX(dep.lon), dy = toY(dep.lat);
            const ex = toX(dest.lon), ey = toY(dest.lat);
            const angle = Math.atan2(ex - dx, -(ey - dy)) * (180 / Math.PI);
            return (
              <g key={f.id}>
                <line x1={dx} y1={dy} x2={ex} y2={ey} stroke={BORDER} strokeWidth="1" strokeDasharray="4,4" />
                <text x={dx} y={dy + 16} textAnchor="middle" fill={MUTED} fontSize="11" fontFamily="monospace">{f.departure}</text>
                <text x={ex} y={ey + 16} textAnchor="middle" fill={MUTED} fontSize="11" fontFamily="monospace">{f.destination}</text>
                <circle cx={dx} cy={dy} r="3" fill={MUTED} />
                <circle cx={ex} cy={ey} r="3" fill={MUTED} />
                {pos && (
                  <g transform={`translate(${toX(pos.lon)},${toY(pos.lat)}) rotate(${pos.isLive && pos.heading != null ? pos.heading : angle})`}>
                    <text textAnchor="middle" dominantBaseline="central" fill={isPending(f) ? YELLOW : pos.isLive ? GREEN : WHITE} fontSize="16" fontFamily="sans-serif">&#9992;</text>
                  </g>
                )}
                {pos && pos.isLive && (
                  <text x={toX(pos.lon) + 12} y={toY(pos.lat) - 8} fill={GREEN} fontSize="7" fontWeight="700" fontFamily="monospace">LIVE</text>
                )}
              </g>);
          })}
        </svg>
      </div>);
  };

  return (
    <div data-tour="tour-flights-board" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flights..." style={{ ...inp, width: 200, maxWidth: 200, padding: "5px 10px", fontSize: 12 }} />
      </div>
      <div data-tour="tour-flights-status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["ACTIVE", "ARRIVED", "ALL"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${filter === f ? WHITE : BORDER}`,
              background: filter === f ? WHITE : "transparent", color: filter === f ? BLACK : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>
              {(f === "ALL" ? "All (24h)" : f === "ACTIVE" ? "Active" : "Arrived") + ` (${flightCounts[f]})`}</button>))}
        </div>
        <span style={{ fontSize: 13, color: GREEN, fontWeight: 600 }}>&#x25CF; {activeFlights.length} Active</span>
      </div>

      <div className="flight-board-grid" style={{ display: "grid", gridTemplateColumns: activeFlights.length > 0 ? "1fr 1fr" : "1fr", gap: 20 }}>
        {/* Map */}
        {activeFlights.length > 0 && renderMap()}

        {/* Flight cards */}
        <div>
          {displayed.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
              <div style={{ fontSize: 14, marginBottom: 6 }}>No {filter === "ACTIVE" ? "active" : ""} flights</div>
              <div style={{ fontSize: 11 }}>Submit a FRAT to create a flight</div></div>
          ) : displayed.sort((a, b) => {
            if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
          }).map(f => {
            const pending = isPending(f);
            const st = pending ? STATUSES.PENDING_APPROVAL : (STATUSES[f.status] || STATUSES.ACTIVE);
            const overdue = isOverdue(f);
            const progress = getProgress(f);
            const statusLabel = overdue ? "OVERDUE" : st.label;
            const statusColor = overdue ? RED : st.color;
            return (
              <div key={f.id} style={{ ...card, padding: "18px 22px", marginBottom: 12, borderRadius: 10, border: `1px solid ${pending ? RED + "44" : overdue ? RED + "44" : BORDER}`, cursor: "pointer" }}
                onClick={() => setSelectedFlight(selectedFlight === f.id ? null : f.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: WHITE }}>{f.tailNumber || f.aircraft}</span>
                    {foreflightFlights?.some(ff => ff.flight_id === f.dbId) && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: CYAN, background: `${CYAN}18`, padding: "2px 6px", borderRadius: 3, border: `1px solid ${CYAN}33` }}>ForeFlight</span>
                    )}
                    {schedaeroTrips?.some(sc => sc.flight_id === f.dbId) && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#60A5FA", background: "rgba(96,165,250,0.09)", padding: "2px 6px", borderRadius: 3, border: "1px solid rgba(96,165,250,0.2)" }}>Schedaero</span>
                    )}
                    {livePositions[f.dbId] && (Date.now() - (livePositions[f.dbId].receivedAt || 0)) < 30000 && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: GREEN, background: "rgba(74,222,128,0.09)", padding: "2px 6px", borderRadius: 3, border: `1px solid ${GREEN}33` }}>LIVE ADS-B</span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 4, color: BLACK, background: statusColor, letterSpacing: 0.5 }}>{statusLabel}</span>
                </div>
                {/* Progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: WHITE, minWidth: 42 }}>{f.departure}</span>
                  <div style={{ flex: 1, position: "relative", height: 4, background: BORDER, borderRadius: 2 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.max(progress, 0)}%`, background: pending ? RED : overdue ? RED : GREEN, borderRadius: 2, transition: "width 2s linear" }} />
                    {isActiveOrPending(f) && progress >= 0 && (
                      <div style={{ position: "absolute", top: -4, left: `${Math.max(progress, 0)}%`, width: 12, height: 12, borderRadius: "50%", background: pending ? YELLOW : WHITE, border: `2px solid ${pending ? YELLOW : overdue ? RED : GREEN}`, transform: "translateX(-6px)", transition: "left 2s linear" }} />
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: WHITE, minWidth: 42, textAlign: "right" }}>{f.destination}</span>
                </div>
                {/* Flight details */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ color: MUTED, fontSize: 11 }}>
                    <span>PIC</span>{" "}<span style={{ color: OFF_WHITE }}>{f.pilot}</span>
                    {f.cruiseAlt && <><span style={{ margin: "0 6px" }}>Alt</span><span style={{ color: OFF_WHITE }}>{f.cruiseAlt}</span></>}
                  </div>
                  <div style={{ color: MUTED, fontSize: 11 }}>
                    <span>ETD/ETA</span>{" "}
                    <span style={{ color: OFF_WHITE }}>{(() => {
                      const depCoord = airportCoords[f.departure];
                      const destCoord = airportCoords[f.destination];
                      const depAbbr = depCoord?.tzAbbr || "";
                      const destAbbr = destCoord?.tzAbbr || "";
                      const etdFmt = f.etd ? f.etd.replace(/[^0-9]/g, "").padStart(4, "0").replace(/(\d{2})(\d{2})/, "$1:$2") : "—";
                      const destTzId = destCoord?.tz || "America/Los_Angeles";
                      const etaFmt = f.eta ? formatLocal(new Date(f.eta), destTzId).replace(/(\d{2})(\d{2})/, "$1:$2") : "—";
                      return `${etdFmt}${depAbbr ? " " + depAbbr : ""} / ${etaFmt}${destAbbr ? " " + destAbbr : ""}`;
                    })()}</span>
                  </div>
                </div>
                {/* Expanded details */}
                {selectedFlight === f.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                    {livePositions[f.dbId] && (Date.now() - (livePositions[f.dbId].receivedAt || 0)) < 30000 && (() => {
                      const lp = livePositions[f.dbId];
                      return (
                        <div style={{ display: "flex", gap: 16, marginBottom: 10, padding: "8px 12px", background: "rgba(74,222,128,0.06)", borderRadius: 6, border: `1px solid ${GREEN}22` }}>
                          {lp.altitude_baro != null && <div style={{ fontSize: 10, color: MUTED }}>Alt <span style={{ color: GREEN, fontWeight: 700 }}>{lp.altitude_baro.toLocaleString()} ft</span></div>}
                          {lp.ground_speed != null && <div style={{ fontSize: 10, color: MUTED }}>GS <span style={{ color: GREEN, fontWeight: 700 }}>{Math.round(lp.ground_speed)} kts</span></div>}
                          {lp.track != null && <div style={{ fontSize: 10, color: MUTED }}>Hdg <span style={{ color: GREEN, fontWeight: 700 }}>{Math.round(lp.track)}&deg;</span></div>}
                          {lp.vertical_rate != null && lp.vertical_rate !== 0 && <div style={{ fontSize: 10, color: MUTED }}>VS <span style={{ color: GREEN, fontWeight: 700 }}>{lp.vertical_rate > 0 ? "+" : ""}{lp.vertical_rate} fpm</span></div>}
                        </div>
                      );
                    })()}
                    <div style={{ color: MUTED, fontSize: 10, lineHeight: 1.8 }}>
                      {f.numCrew && <span>Crew: {f.numCrew} </span>}{f.numPax && <span>Pax: {f.numPax} </span>}{f.fuelLbs && <span>Fuel: {f.fuelLbs} {f.fuelUnit || "lbs"} </span>}
                      <br />ID: {f.id} &middot; Score: {f.score} {f.riskLevel} &middot; Filed {formatDateTime(f.timestamp)}
                      {f.arrivedAt && <span> &middot; Arrived {formatDateTime(f.arrivedAt)}</span>}
                      {f.parkingSpot && <span> &middot; Parked: {f.parkingSpot}</span>}
                      {f.fuelRemaining && <span> &middot; Fuel remaining: {f.fuelRemaining} {f.fuelUnit || "lbs"}</span>}
                    </div>
                    {f.attachments && f.attachments.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {f.attachments.map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                             style={{ display: "block", width: 48, height: 48, borderRadius: 6, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                            <img src={att.url} alt={att.name || "Attachment"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </a>
                        ))}
                      </div>
                    )}
                    {f.status === "ACTIVE" && !pending && arrivedForm !== f.id && (
                      <div data-tour="tour-flights-arrived" style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={(e) => { e.stopPropagation(); setArrivedForm(f.id); setParkingSpot(""); setFuelRemaining(""); setFuelUnit("lbs"); }}
                          style={{ flex: 1, padding: "10px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>MARK ARRIVED</button>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateFlight(f.id, "CANCEL"); }}
                          style={{ padding: "10px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                      </div>)}
                    {f.status === "ACTIVE" && !pending && arrivedForm === f.id && (
                      <div style={{ marginTop: 10, padding: 12, background: "rgba(74,222,128,0.06)", border: `1px solid rgba(74,222,128,0.2)`, borderRadius: 8 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" }}>Parking spot</label>
                            <input value={parkingSpot} onChange={e => setParkingSpot(e.target.value)} placeholder="e.g. A3, Ramp 2"
                              onClick={e => e.stopPropagation()}
                              style={{ ...inp, fontSize: 13, padding: "8px 10px", width: "100%" }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 9, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" }}>Fuel remaining</label>
                            <div style={{ display: "flex", gap: 0 }}>
                              <input value={fuelRemaining} onChange={e => setFuelRemaining(e.target.value)} placeholder="Optional" inputMode="decimal"
                                onClick={e => e.stopPropagation()}
                                style={{ ...inp, fontSize: 13, padding: "8px 10px", flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", minWidth: 0 }} />
                              <button onClick={e => { e.stopPropagation(); setFuelUnit(u => u === "lbs" ? "hrs" : "lbs"); }}
                                style={{ padding: "8px 10px", background: CARD, border: `1px solid ${BORDER}`, borderTopRightRadius: 6, borderBottomRightRadius: 6, color: WHITE, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{fuelUnit}</button>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={(e) => { e.stopPropagation(); const extra = {}; if (parkingSpot.trim()) extra.parkingSpot = parkingSpot.trim(); if (fuelRemaining.trim()) { extra.fuelRemaining = fuelRemaining.trim(); extra.fuelUnit = fuelUnit; } onUpdateFlight(f.id, "ARRIVED", extra); setArrivedForm(null); }}
                            style={{ flex: 1, padding: "10px 0", background: GREEN, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>CONFIRM ARRIVED</button>
                          <button onClick={(e) => { e.stopPropagation(); setArrivedForm(null); }}
                            style={{ padding: "10px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Back</button>
                        </div>
                      </div>)}
                    {pending && canApprove && onApproveFlight && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ padding: "10px 14px", background: "rgba(250,204,21,0.08)", border: `1px solid rgba(250,204,21,0.25)`, borderRadius: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: YELLOW, marginBottom: 4 }}>🔒 Supervisor Approval Required</div>
                          <div style={{ fontSize: 10, color: MUTED }}>This flight scored {f.score} ({f.riskLevel}) which requires management approval before departure.</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={(e) => { e.stopPropagation(); onApproveFlight(f.dbId, f.fratDbId); }}
                            style={{ flex: 1, padding: "10px 0", background: GREEN, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>APPROVE FLIGHT</button>
                          <button onClick={(e) => { e.stopPropagation(); onRejectFlight(f.dbId, f.fratDbId); }}
                            style={{ padding: "10px 16px", background: "transparent", color: RED, border: `1px solid ${RED}44`, borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Reject</button>
                        </div>
                      </div>)}
                    {pending && !canApprove && onSelfDispatch && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: `1px solid rgba(245,158,11,0.25)`, borderRadius: 8, marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: AMBER, marginBottom: 4 }}>⏳ Awaiting Supervisor Approval</div>
                          <div style={{ fontSize: 10, color: MUTED }}>This flight requires supervisor approval. If no supervisor is available, you may self-dispatch with acknowledgment.</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onSelfDispatch(f.dbId, f.fratDbId); }}
                          style={{ width: "100%", padding: "10px 0", background: AMBER, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>SELF-DISPATCH</button>
                        <div style={{ fontSize: 9, color: MUTED, textAlign: "center", marginTop: 6 }}>Your departure will be logged and flagged for post-flight review</div>
                      </div>)}
                  </div>
                )}
              </div>); })}
        </div>
      </div>
      {activeFlights.length > 0 && <div style={{ textAlign: "center", padding: "14px 0 4px", color: SUBTLE, fontSize: 10 }}>{adsbEnabled ? "Flights with LIVE ADS-B badges show real-time positions. Others are estimates based on departure time and ETA." : "Flight positions on map and progress bars are estimates based on departure time and ETA \u2014 not live tracking."}</div>}
      <div style={{ textAlign: "center", padding: "8px 16px", color: "#f59e0b", fontSize: 10, lineHeight: 1.5 }}>All users with the Flight Follower permission will be notified if a flight is not marked arrived within 30 minutes of its ETA.</div>
    </div>);
}

function ExportView({ records, orgName }) {
  const prefix = (orgName || "FRAT").replace(/\s+/g, "_");
  const genCSV = useCallback(() => { if (!records.length) return; const h = ["FRAT_ID", "Date", "Pilot", "Aircraft", "Departure", "Destination", "CruiseAlt", "Score", "Risk_Level", "Factors_Count", "Remarks"]; const rows = records.map(r => [r.id, new Date(r.timestamp).toISOString(), r.pilot, r.aircraft, r.departure, r.destination, r.cruiseAlt || "", r.score, r.riskLevel, r.factors.length, `"${(r.remarks || "").replace(/"/g, '""')}"`]); downloadBlob([h.join(","), ...rows.map(r => r.join(","))].join("\n"), "text/csv", `${prefix}_FRAT_Export_${new Date().toISOString().slice(0, 10)}.csv`); }, [records, prefix]);
  const genDetailed = useCallback(() => { if (!records.length) return; const ids = []; const labels = []; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { ids.push(f.id); labels.push(`${c.name}: ${f.label}`); })); const h = ["FRAT_ID", "Date", "Pilot", "Aircraft", "Departure", "Destination", "CruiseAlt", "Score", "Risk_Level", ...labels]; const rows = records.map(r => [r.id, new Date(r.timestamp).toISOString(), r.pilot, r.aircraft, r.departure, r.destination, r.cruiseAlt || "", r.score, r.riskLevel, ...ids.map(fid => r.factors.includes(fid) ? "YES" : "")]); downloadBlob([h.join(","), ...rows.map(r => r.join(","))].join("\n"), "text/csv", `${prefix}_FRAT_Detailed_${new Date().toISOString().slice(0, 10)}.csv`); }, [records, prefix]);
  const genSummary = useCallback(() => { if (!records.length) return; const scores = records.map(r => r.score); const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1); const lc = { "LOW RISK": 0, "MODERATE RISK": 0, "HIGH RISK": 0, "CRITICAL RISK": 0 }; records.forEach(r => { lc[r.riskLevel] = (lc[r.riskLevel] || 0) + 1; }); const ff = {}; records.forEach(r => r.factors.forEach(f => { ff[f] = (ff[f] || 0) + 1; })); const tf = Object.entries(ff).sort((a, b) => b[1] - a[1]).slice(0, 10); let t = `${orgName || "FRAT"} SUMMARY REPORT\nGenerated: ${new Date().toLocaleString()}\n${"=".repeat(60)}\n\nTotal: ${records.length}\nAvg Score: ${avg}\nHighest: ${Math.max(...scores)}\n\nRISK DISTRIBUTION\n`; Object.entries(lc).forEach(([k, v]) => { t += `  ${k}: ${v} (${((v / records.length) * 100).toFixed(1)}%)\n`; }); t += `\nTOP RISK FACTORS\n`; tf.forEach(([id, count], i) => { let label = id; RISK_CATEGORIES.forEach(c => c.factors.forEach(f => { if (f.id === id) label = f.label; })); t += `  ${i + 1}. ${label} — ${count}x\n`; }); downloadBlob(t, "text/plain", `${prefix}_FRAT_Summary_${new Date().toISOString().slice(0, 10)}.txt`); }, [records, prefix, orgName]);
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ ...card, padding: 26 }}>
        <h2 style={{ margin: "0 0 6px", color: WHITE, fontFamily: "Georgia,serif", fontSize: 18 }}>Export Reports</h2>
        <p style={{ color: MUTED, fontSize: 12, margin: "0 0 22px" }}>Generate reports for SMS recordkeeping per §5.97.</p>
        {[{ title: "Summary Report", desc: "Overview with risk distribution and top hazard factors.", action: genSummary, btn: "Download .txt", icon: "📄" },
          { title: "Standard Export", desc: "All FRAT records with scores and metadata for Excel.", action: genCSV, btn: "Download CSV", icon: "📊" },
          { title: "Detailed Factor Export", desc: "Every record with individual risk factor columns.", action: genDetailed, btn: "Download CSV", icon: "🔬" }].map((r, i) => (
          <div key={i} style={{ padding: 16, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</div>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: WHITE, fontSize: 13, marginBottom: 2 }}>{r.title}</div>
              <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.3 }}>{r.desc}</div></div>
            <button onClick={r.action} disabled={!records.length} style={{ padding: "8px 14px", background: !records.length ? BORDER : WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: !records.length ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{r.btn}</button></div>))}
        <div style={{ background: NEAR_BLACK, borderRadius: 6, padding: 12, border: `1px solid ${BORDER}`, marginTop: 6 }}>
          <div style={{ fontSize: 11, color: MUTED }}><strong style={{ color: OFF_WHITE }}>§5.97 Recordkeeping:</strong> SRM records must be retained as long as controls remain relevant. Current records: <strong style={{ color: WHITE }}>{records.length}</strong></div></div></div></div>);
}

function DashboardWrapper({ records, flights, reports, hazards, actions, onDelete, riskLevels, org, erpPlans, erpDrills, profile, session, spis, spiMeasurements, onCreateSpi, onUpdateSpi, onDeleteSpi, onLoadTargets, onCreateTarget, onUpdateTarget, onDeleteTarget, onLoadMeasurements, onCreateMeasurement, onInitSpiDefaults, cultureSurveys, orgProfiles, onCreateSurvey, onUpdateSurvey, onDeleteSurvey, onFetchSurveyResponses, onSubmitSurveyResponse, onCheckUserSurveyResponse, onFetchSurveyResults, onUpsertSurveyResults, trendAlerts, onAcknowledgeTrendAlert, pilotEngagement, safetyRecognitions, orgEngagement, orgRecognitions, onAcknowledgeRecognition, complianceFrameworks, complianceChecklistItems, complianceStatusData, trainingReqs, trainingRecs, policies, iepAudits, auditSchedules, mocItems, insuranceExports, onGenerateExport, onDeleteExport, onNavigateSubscription, onNavigate, fleetAircraft, part5Compliance, onViewDetail }) {
  const analyticsOn = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const [sub, setSub] = useState(analyticsOn ? "analytics" : "culture");
  const hasAnalytics = hasFeature(org, "dashboard_analytics");
  const hasSpi = hasFeature(org, "dashboard_analytics"); // SPIs require Professional+ (same gate as analytics)
  const hasCulture = hasFeature(org, "safety_culture_survey");
  const hasInsurance = hasFeature(org, "insurance_export");
  const isDashboardFree = isFreeTier(org);
  const gamificationOn = org?.gamification_enabled === true;
  const fleetStatusOn = org?.fleet_status_enabled !== false;
  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Dashboard</div>
          <div style={{ fontSize: 11, color: MUTED }}>Safety analytics, trends, and compliance status</div>
        </div>
      </div>
      {/* Pilot Engagement Card */}
      {gamificationOn && (
        <div style={{ marginBottom: 16 }}>
          <PilotEngagement engagement={pilotEngagement} recognitions={safetyRecognitions} onAcknowledge={onAcknowledgeRecognition} />
        </div>
      )}
      {/* Team Engagement Widget */}
      {gamificationOn && (
        <div style={{ marginBottom: 16 }}>
          <TeamEngagement orgEngagement={orgEngagement} orgRecognitions={orgRecognitions} orgProfiles={orgProfiles} records={records} reports={reports} />
        </div>
      )}
      {/* Quick Actions & Training Summary — non-admin roles */}
      {!analyticsOn && (() => {
        const userId = session?.user?.id;
        const userRole = profile?.role || "pilot";
        const myReqs = (trainingReqs || []).filter(r => !r.required_for || r.required_for.length === 0 || r.required_for.includes(userRole));
        const myRecs = (trainingRecs || []).filter(r => r.user_id === userId);
        const now = new Date();
        const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const reqStatus = myReqs.map(req => {
          const rec = myRecs.filter(r => r.requirement_id === req.id).sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0];
          if (!rec) return { req, status: "not_started" };
          const exp = rec.expiry_date ? new Date(rec.expiry_date) : null;
          if (exp && exp < now) return { req, status: "overdue", expiry: exp };
          if (exp && exp < soon) return { req, status: "expiring", expiry: exp };
          return { req, status: "current", expiry: exp };
        });
        const overdue = reqStatus.filter(r => r.status === "overdue");
        const expiring = reqStatus.filter(r => r.status === "expiring");
        const current = reqStatus.filter(r => r.status === "current");
        const notStarted = reqStatus.filter(r => r.status === "not_started");
        return (<>
          {/* Quick Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <button onClick={() => onNavigate("submit")} style={{ ...card, padding: "16px 14px", border: `1px solid ${BORDER}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(34,211,238,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{"\u2708"}</div>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Submit FRAT</div><div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Start a new flight risk assessment</div></div>
            </button>
            <button onClick={() => onNavigate("reports")} style={{ ...card, padding: "16px 14px", border: `1px solid ${BORDER}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{"\u26A0"}</div>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>File Safety Report</div><div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Report a hazard, incident, or near-miss</div></div>
            </button>
          </div>
          {/* Training Summary */}
          {myReqs.length > 0 && (
            <div style={{ ...card, padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Training Status</div>
                <button onClick={() => onNavigate("cbt")} style={{ background: "none", border: "none", color: CYAN, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>View All &rarr;</button>
              </div>
              {overdue.length > 0 && (
                <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Overdue</div>
                  {overdue.map(({ req, expiry }) => (
                    <div key={req.id} style={{ fontSize: 11, color: OFF_WHITE, padding: "2px 0", display: "flex", justifyContent: "space-between" }}>
                      <span>{req.title}</span>
                      {expiry && <span style={{ color: RED, fontSize: 10 }}>Expired {expiry.toLocaleDateString()}</span>}
                    </div>
                  ))}
                </div>
              )}
              {expiring.length > 0 && (
                <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: AMBER, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Expiring Soon</div>
                  {expiring.map(({ req, expiry }) => (
                    <div key={req.id} style={{ fontSize: 11, color: OFF_WHITE, padding: "2px 0", display: "flex", justifyContent: "space-between" }}>
                      <span>{req.title}</span>
                      {expiry && <span style={{ color: AMBER, fontSize: 10 }}>Expires {expiry.toLocaleDateString()}</span>}
                    </div>
                  ))}
                </div>
              )}
              {notStarted.length > 0 && (
                <div style={{ padding: "8px 12px", borderRadius: 6, background: `rgba(255,255,255,0.02)`, border: `1px solid ${BORDER}`, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Not Completed</div>
                  {notStarted.map(({ req }) => (
                    <div key={req.id} style={{ fontSize: 11, color: OFF_WHITE, padding: "2px 0" }}>{req.title}</div>
                  ))}
                </div>
              )}
              {current.length > 0 && overdue.length === 0 && expiring.length === 0 && notStarted.length === 0 && (
                <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <div style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>All {current.length} training requirement{current.length !== 1 ? "s" : ""} current</div>
                </div>
              )}
              {current.length > 0 && (overdue.length > 0 || expiring.length > 0 || notStarted.length > 0) && (
                <div style={{ fontSize: 10, color: MUTED, padding: "4px 0" }}>{current.length} other requirement{current.length !== 1 ? "s" : ""} current</div>
              )}
            </div>
          )}
        </>);
      })()}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {[...(analyticsOn ? [["analytics", "Overview"]] : []), ...(analyticsOn && hasAnalytics ? [["frat", "FRAT Analytics"], ["safety", "Safety Metrics"]] : []), ...(analyticsOn && hasSpi ? [["performance", "Performance"]] : []), ...(hasCulture ? [["culture", "Safety Culture"]] : []), ...(analyticsOn && hasInsurance ? [["insurance", "Insurance & Export"]] : []), ...(analyticsOn ? [["history", "FRAT History"]] : []), ...(analyticsOn && !isDashboardFree ? [["export", "Export"]] : [])].map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${sub === id ? WHITE : BORDER}`,
              background: sub === id ? WHITE : "transparent", color: sub === id ? BLACK : MUTED,
              fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
        ))}
        {!hasAnalytics && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <span style={{ fontSize: 10, color: "#F59E0B", padding: "4px 10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 4 }}>Upgrade to Professional for full analytics</span>
          </div>
        )}
      </div>
      {sub === "analytics" && analyticsOn && <DashboardCharts records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} riskLevels={riskLevels} view="overview" erpPlans={erpPlans} erpDrills={erpDrills} spis={spis} spiMeasurements={spiMeasurements} trendAlerts={trendAlerts} onAcknowledgeTrendAlert={onAcknowledgeTrendAlert} mocItems={mocItems} isDashboardFree={isDashboardFree} onNavigateSubscription={onNavigateSubscription} onNavigate={(target) => target === "spiDashboard" ? setSub("performance") : onNavigate(target)} fleetAircraft={fleetAircraft} part5Compliance={part5Compliance} />}
      {sub === "frat" && analyticsOn && hasAnalytics && <DashboardCharts records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} riskLevels={riskLevels} view="frat" erpPlans={erpPlans} erpDrills={erpDrills} />}
      {sub === "safety" && analyticsOn && hasAnalytics && <DashboardCharts records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} riskLevels={riskLevels} view="safety" erpPlans={erpPlans} erpDrills={erpDrills} />}
      {sub === "culture" && hasCulture && <SafetyCultureSurvey profile={profile} session={session} orgProfiles={orgProfiles} surveys={cultureSurveys} onCreateSurvey={onCreateSurvey} onUpdateSurvey={onUpdateSurvey} onDeleteSurvey={onDeleteSurvey} onFetchResponses={onFetchSurveyResponses} onSubmitResponse={onSubmitSurveyResponse} onCheckUserResponse={onCheckUserSurveyResponse} onFetchResults={onFetchSurveyResults} onUpsertResults={onUpsertSurveyResults} />}
      {sub === "performance" && analyticsOn && hasSpi && <SafetyPerformanceIndicators profile={profile} org={org} spis={spis} spiMeasurements={spiMeasurements} onCreateSpi={onCreateSpi} onUpdateSpi={onUpdateSpi} onDeleteSpi={onDeleteSpi} onCreateTarget={onCreateTarget} onUpdateTarget={onUpdateTarget} onDeleteTarget={onDeleteTarget} onLoadTargets={onLoadTargets} onLoadMeasurements={onLoadMeasurements} onCreateMeasurement={onCreateMeasurement} onInitDefaults={onInitSpiDefaults} />}
      {sub === "insurance" && analyticsOn && hasInsurance && <InsuranceScorecard profile={profile} session={session} org={org} orgProfiles={orgProfiles} records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} policies={policies} trainingReqs={trainingReqs} trainingRecs={trainingRecs} erpPlans={erpPlans} erpDrills={erpDrills} iepAudits={iepAudits} auditSchedules={auditSchedules} insuranceExports={insuranceExports} onGenerateExport={onGenerateExport} onDeleteExport={onDeleteExport} />}
      {sub === "history" && analyticsOn && <HistoryView records={records} onDelete={onDelete} onViewDetail={onViewDetail} />}
      {sub === "export" && analyticsOn && <ExportView records={records} orgName={org?.name} />}
    </div>
  );
}

// ── LANDING PAGE ─────────────────────────────────────────────
function LandingPage() {
  const nav = (path) => { window.location.search = path; };
  const FEATURES = [
    { icon: "\u2713", title: "Flight Risk Assessment", desc: "Configurable FRAT with weighted scoring, risk thresholds, and approval workflows." },
    { icon: "\u25CE", title: "Flight Following", desc: "Real-time flight tracking with status updates, ETA monitoring, and arrival confirmation." },
    { icon: "\u26A0", title: "Safety Reporting", desc: "Confidential hazard, incident, and near-miss reporting with status tracking." },
    { icon: "\u25B3", title: "Investigation Register", desc: "Structured safety investigation with severity/likelihood risk matrix scoring." },
    { icon: "\u2298", title: "Corrective Actions", desc: "Track risk controls from identification through completion with due dates." },
    { icon: "\u25C7", title: "FAA Part 5 Audit Log", desc: "42-point compliance checklist mapped to every Part 5 requirement with evidence tracking." },
    { icon: "\u25C8", title: "Policy & Training", desc: "Document library with acknowledgment tracking and training record management." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: WHITE, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <Head><title>PreflightSMS — Safety Management System for Part 135 Operators</title><meta name="description" content="FAA Part 5 compliant SMS for Part 135 operators. FRAT, flight following, hazard reporting, corrective actions, and audit compliance." /><link rel="icon" type="image/png" href="/favicon.png" /><link rel="icon" href="/favicon.ico" /><link rel="manifest" href="/manifest.json" /><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" /></Head>

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: DARK, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 36, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>PreflightSMS</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => nav("login")} style={{ padding: "8px 20px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Log In</button>
          <button onClick={() => nav("signup")} style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Start Free Trial</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 32px 60px", textAlign: "center", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>FAA Part 5 Compliant SMS</div>
        <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, margin: "0 0 16px", fontFamily: "Georgia, serif" }}>Safety Management<br />Built for Part 135</h1>
        <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 32px" }}>
          FRAT submissions, flight following, hazard reporting, corrective actions, and full Part 5 audit compliance — in one platform your pilots will actually use.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => nav("signup")} style={{ padding: "14px 36px", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 }}>Start 14-Day Free Trial</button>
          <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{ padding: "14px 36px", background: "transparent", color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>See Features</button>
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 12 }}>No credit card required</div>
        <div style={{ marginTop: 8 }}><button onClick={() => nav("signup?plan=free")} style={{ background: "none", border: "none", color: CYAN, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Or start with the Free plan &rarr;</button></div>
      </section>

      {/* Compliance banner */}
      <section style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 24px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ fontSize: 11, color: AMBER, fontWeight: 700 }}>{"\u26A0"} Part 135 SMS Deadline</div>
          <div style={{ fontSize: 12, color: OFF_WHITE }}>All Part 135 operators must have a compliant SMS by <strong>May 28, 2027</strong> per 14 CFR Part 5.</div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" style={{ padding: "60px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", fontFamily: "Georgia, serif" }}>Everything You Need</h2>
          <p style={{ fontSize: 14, color: MUTED }}>All four SMS pillars — policy, risk management, assurance, and promotion — in one system.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 18px" }}>
              <div style={{ fontSize: 18, marginBottom: 8, color: CYAN }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "60px 32px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", fontFamily: "Georgia, serif" }}>Simple Pricing</h2>
          <p style={{ fontSize: 14, color: MUTED }}>14-day free trial on all plans. No credit card required.</p>
        </div>
        <div className="signup-plan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { name: "Starter", price: "$149", desc: "Core SMS for small operators", features: ["Flight Risk Assessment (FRAT)", "Flight Following", "Safety Reports & Investigations", "Corrective Actions", "Policy Library", "Basic Dashboard", "Up to 5 aircraft"] },
            { name: "Professional", price: "$349", desc: "Full SMS with analytics & compliance", badge: "MOST POPULAR", features: ["Everything in Starter, plus:", "Dashboard Analytics & Trends", "Safety Trend Alerts", "FAA Part 5 Audit Log", "Scheduled PDF Reports", "Document Library", "Custom FRAT Templates", "Approval Workflows", "Up to 15 aircraft"] },
          ].map(p => (
            <div key={p.name} style={{ background: CARD, border: `1px solid ${p.badge ? WHITE+"44" : BORDER}`, borderRadius: 12, padding: "28px 24px", position: "relative" }}>
              {p.badge && <div style={{ position: "absolute", top: -10, right: 16, fontSize: 9, fontWeight: 700, color: BLACK, background: GREEN, padding: "3px 10px", borderRadius: 4 }}>{p.badge}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
              <div style={{ marginBottom: 12 }}><span style={{ fontSize: 32, fontWeight: 800, fontFamily: "Georgia, serif" }}>{p.price}</span><span style={{ fontSize: 13, color: MUTED }}>/mo</span></div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>{p.desc}</div>
              {p.features.map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: f.startsWith("Everything") ? CYAN : OFF_WHITE, padding: "3px 0", display: "flex", gap: 6 }}>
                  <span style={{ color: GREEN, flexShrink: 0 }}>{f.startsWith("Everything") ? "\u2605" : "\u2713"}</span>{f}
                </div>
              ))}
              <button onClick={() => nav("signup")} style={{ width: "100%", marginTop: 16, padding: "12px 0", background: p.badge ? WHITE : "transparent", color: p.badge ? BLACK : WHITE, border: p.badge ? "none" : `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Start Free Trial</button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: MUTED }}>Need more than 15 aircraft or custom integrations? <button onClick={() => window.location.href = "mailto:support@preflightsms.com"} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Contact us for Enterprise pricing</button></div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 32px 80px", textAlign: "center" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "40px 32px", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", fontFamily: "Georgia, serif" }}>Ready to Get Compliant?</h2>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>Set up your SMS in minutes. Your team can be submitting FRATs today.</p>
          <button onClick={() => nav("signup")} style={{ padding: "14px 40px", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Start Free Trial</button>
          <div style={{ marginTop: 10 }}><button onClick={() => nav("signup?plan=free")} style={{ background: "none", border: "none", color: CYAN, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Or start with the Free plan &rarr;</button></div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 11, color: MUTED }}>{"\u00A9"} {new Date().getFullYear()} PreflightSMS. Built for aviation safety.</div>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={() => nav("login")} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}>Log In</button>
          <button onClick={() => nav("signup")} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}>Sign Up</button>
        </div>
      </footer>
    </div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────
function SignupFlow({ onAuth }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [certType, setCertType] = useState("Part 135");
  const [fleetSize, setFleetSize] = useState("1-5");
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [agreedTos, setAgreedTos] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const daysLeft = useMemo(() => Math.floor((new Date("2027-05-28") - new Date()) / 864e5), []);

  const next = () => {
    setError("");
    if (step === 1) {
      if (!name.trim()) { setError("What\u2019s your name?"); return; }
      if (!email || !email.includes("@")) { setError("We need a valid email"); return; }
      const disposable = ["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com"];
      const domain = email.split("@")[1];
      if (domain && disposable.includes(domain.toLowerCase())) { setError("Please use a work email address"); return; }
      if (!password || password.length < 6) { setError("Password needs at least 6 characters"); return; }
      setStep(2); return;
    }
    if (step === 2) {
      if (!orgName.trim()) { setError("What\u2019s your organization called?"); return; }
      setStep(3); return;
    }
    submit();
  };

  const submit = async () => {
    if (!agreedTos) { setError("Please agree to the Terms of Service and Privacy Policy"); return; }
    setError(""); setLoading(true);
    try {
      // 1. Check email availability by attempting auth sign-up first (before creating org)
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr) { setError(authErr.message); setLoading(false); return; }
      if (authData.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        setError("An account with this email already exists. Please log in or reset your password."); setLoading(false); return;
      }
      // 2. Create org via API route (uses service role to bypass RLS)
      const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const tier = selectedPlan;
      const features = getTierFeatures(tier);
      const isFreeSignup = tier === "free";
      const headers = { "Content-Type": "application/json" };
      if (authData.session?.access_token) headers.Authorization = `Bearer ${authData.session.access_token}`;
      const orgRes = await fetch("/api/create-org", {
        method: "POST", headers,
        body: JSON.stringify({ name: orgName.trim(), slug, tier, feature_flags: features,
          userId: authData.user?.id,
          subscription_status: isFreeSignup ? "free" : "trial",
          max_aircraft: isFreeSignup ? 1 : tier === "enterprise" ? 999 : tier === "professional" ? 15 : 5 }),
      });
      const orgJson = await orgRes.json();
      if (!orgRes.ok || !orgJson.data) { setError(orgJson.error || "Failed to create organization"); setLoading(false); return; }
      // 3. Create profile linked to org as admin (org creator = admin) — use service-role-based insert via API if no session
      if (authData.user) {
        if (authData.session) {
          await supabase.from("profiles").insert({ id: authData.user.id, org_id: orgJson.data.id, full_name: name.trim(), email, role: "admin" });
        } else {
          // No session yet (email confirmation pending) — create profile via create-org API or direct service call
          await fetch("/api/create-org", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create-profile", userId: authData.user.id, orgId: orgJson.data.id, fullName: name.trim(), email }) });
        }
      }
      // 4. Sign in
      const { data: session } = await signIn(email, password);
      if (session?.session) {
        onAuth(session.session);
      } else {
        setError("Account created! Check your email to confirm, then log in.");
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const proofIcon = { width: 32, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 };
  const proofCard = { display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6 };

  const slides = {
    1: { label: "Why PreflightSMS", headline: "SMS Compliance Without the Enterprise Price Tag.", body: "Most Part 135 operators are stuck between bloated airline platforms and cobbled-together spreadsheets. We built PreflightSMS to fill that gap.", proofs: [
      { icon: "\u2713", title: "14 CFR Part 5 Aligned", desc: "Every feature maps to a Part 5 requirement." },
      { icon: "\u29D7", title: "Live in Days, Not Months", desc: "Configure your fleet and start documenting immediately." },
      { icon: "\u2606", title: "No Credit Card Required", desc: "Full Professional access for 14 days." },
    ]},
    2: { label: "Built for Charter", headline: "Designed for Part 135. Not Retrofitted From Airlines.", body: "Every workflow and default is calibrated for how charter operators actually run \u2014 small crews, fast turnarounds, distributed bases.", proofs: [
      { icon: "\u25A3", title: "One Platform", desc: "FRAT, flight following, crew, training, hazards \u2014 all integrated." },
      { icon: "\u25C8", title: "Mobile-First", desc: "Pilots complete FRATs from any device. No app download." },
      { icon: "\u26A0", title: "Anonymous Reporting", desc: "Non-punitive hazard reporting \u2014 the foundation of just culture." },
    ]},
    3: { label: "The Deadline Is Real", headline: "Your FSDO Won\u2019t Wait.", body: "Every Part 135 operator needs a compliant SMS by May 28, 2027. Most implementations take 6\u201312 months.", proofs: [
      { icon: "\u2713", title: "Full Features During Trial", desc: "FRAT, flight following, crew management, CBT, analytics \u2014 everything." },
      { icon: "\u2691", title: "Your Data, Your Control", desc: "Export anytime. No lock-in. Cancel with one click." },
    ]},
  };
  const slide = slides[step];

  return (
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <style>{`@media(max-width:768px){
.signup-split{grid-template-columns:1fr !important;min-height:auto !important}
.signup-left-panel{display:none !important}
.signup-right-panel{padding:24px 20px !important}
.signup-plan-grid{grid-template-columns:1fr !important}
}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: DARK, zIndex: 100 }}>
        <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 32, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
        <button onClick={() => { window.location.search = "login"; }} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "6px 14px", cursor: "pointer" }}>Log in</button>
      </div>
      <div className="signup-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 53px)" }}>
        {/* LEFT: Marketing */}
        <div className="signup-left-panel" style={{ borderRight: `1px solid ${BORDER}`, background: NEAR_BLACK, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 40px", position: "relative", overflow: "hidden" }}>
            {[15, 38, 62, 85].map(top => (
              <div key={top} style={{ position: "absolute", top: `${top}%`, left: "-10%", width: "120%", height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)", transform: "rotate(-6deg)", pointerEvents: "none" }} />
            ))}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, boxShadow: "0 0 8px rgba(74,222,128,0.4)" }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: SUBTLE }}>{slide.label}</span>
              </div>
              {step === 3 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 4, marginBottom: 20 }}>
                  <span style={{ fontSize: 12, color: AMBER }}>{"\u23F1"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, letterSpacing: 0.5 }}>{daysLeft} days until deadline</span>
                </div>
              )}
              <h2 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1, color: WHITE, margin: "0 0 14px", fontFamily: "Georgia, serif" }}>{slide.headline}</h2>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: MUTED, marginBottom: 28, maxWidth: 380 }}>{slide.body}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {slide.proofs.map(p => (
                  <div key={p.title} style={proofCard}>
                    <div style={proofIcon}><span style={{ color: OFF_WHITE }}>{p.icon}</span></div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: WHITE, marginBottom: 2 }}>{p.title}</div>
                      <div style={{ fontSize: 11, lineHeight: 1.45, color: MUTED }}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: `1px solid ${BORDER}`, background: CARD }}>
            {[{ num: "\u00A75.1\u20135.97", label: "Part 5 Aligned" }, { num: "14-Day", label: "Free Trial" }, { num: "$0", label: "To Get Started" }].map((s, i) => (
              <div key={s.label} style={{ padding: "16px", textAlign: "center", borderRight: i < 2 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: WHITE, marginBottom: 2 }}>{s.num}</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: SUBTLE }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* RIGHT: Form */}
        <div className="signup-right-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 44px" }}>
          <div style={{ maxWidth: 440, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
              {["Account", "Operation", "Plan"].map((s, i) => (
                <div key={s} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: step > i+1 ? GREEN : step === i+1 ? WHITE : NEAR_BLACK, color: step > i+1 ? BLACK : step === i+1 ? BLACK : MUTED, border: `2px solid ${step > i+1 ? GREEN : step === i+1 ? WHITE : BORDER}`, transition: "all 0.3s" }}>
                      {step > i + 1 ? "\u2713" : i + 1}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: step >= i+1 ? WHITE : MUTED }}>{s}</span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: step > i+1 ? GREEN : BORDER, margin: "0 10px", transition: "all 0.3s" }} />}
                </div>
              ))}
            </div>
            {step === 1 && (<>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: WHITE, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>Create your account</h1>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 28px" }}>Full Professional access for 14 days. No credit card.</p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="James Mitchell" autoFocus style={{ ...inp, padding: "12px 14px", fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Work Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourcompany.com" style={{ ...inp, padding: "12px 14px", fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={{ ...inp, padding: "12px 14px", fontSize: 14 }} onKeyDown={e => { if (e.key === "Enter") next(); }} />
              </div>
            </>)}
            {step === 2 && (<>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: WHITE, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>Your operation</h1>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 28px" }}>We&apos;ll configure your workspace. Change anything later.</p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Company Name</label>
                <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="SkyCharter Aviation" autoFocus style={{ ...inp, padding: "12px 14px", fontSize: 14 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Certificate</label>
                  <select value={certType} onChange={e => setCertType(e.target.value)} style={{ ...inp, padding: "12px 14px", fontSize: 13, appearance: "auto" }}>
                    <option value="Part 135">Part 135</option><option value="Part 121">Part 121</option><option value="Part 91">Part 91</option><option value="Part 91K">Part 91K</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: OFF_WHITE, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Fleet Size</label>
                  <select value={fleetSize} onChange={e => setFleetSize(e.target.value)} style={{ ...inp, padding: "12px 14px", fontSize: 13, appearance: "auto" }}>
                    <option value="1-5">1–5 aircraft</option><option value="6-15">6–15 aircraft</option><option value="16+">16+ aircraft</option>
                  </select>
                </div>
              </div>
            </>)}
            {step === 3 && (<>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: WHITE, margin: "0 0 6px", fontFamily: "Georgia, serif" }}>Pick your plan — no credit card required.</h1>
              <p style={{ fontSize: 13, color: MUTED, margin: "0 0 24px" }}>Both include a full 14-day trial. Upgrade or downgrade anytime.</p>
              <div className="signup-plan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { id: "starter", name: "Starter", price: "$149", desc: "Up to 5 aircraft", features: ["FRAT & Flight Following", "Safety Reporting", "Investigation Register", "Policy Library"] },
                  { id: "professional", name: "Professional", price: "$349", desc: "Up to 15 aircraft", badge: true, features: ["Everything in Starter", "Dashboard Analytics", "FAA Audit Log", "Custom FRAT Templates", "CBT Modules", "Approval Workflows"] },
                ].map(p => (
                  <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{ ...card, padding: "18px 16px", cursor: "pointer", position: "relative", transition: "all 0.2s", border: `2px solid ${selectedPlan === p.id ? (p.badge ? GREEN : WHITE) : BORDER}`, background: selectedPlan === p.id ? "rgba(255,255,255,0.03)" : CARD, opacity: selectedPlan === "free" ? 0.5 : 1 }}>
                    {p.badge && <div style={{ position: "absolute", top: -8, right: 10, fontSize: 8, fontWeight: 700, color: BLACK, background: GREEN, padding: "2px 8px", borderRadius: 3 }}>RECOMMENDED</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div><div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{p.name}</div><div style={{ fontSize: 10, color: MUTED }}>{p.desc}</div></div>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selectedPlan === p.id ? GREEN : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{selectedPlan === p.id && <div style={{ width: 10, height: 10, borderRadius: "50%", background: GREEN }} />}</div>
                    </div>
                    <div style={{ marginBottom: 10 }}><span style={{ fontSize: 24, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{p.price}</span><span style={{ fontSize: 11, color: MUTED }}>/mo after trial</span></div>
                    {p.features.map((f, i) => (<div key={i} style={{ fontSize: 10, color: f.startsWith("Everything") ? CYAN : OFF_WHITE, padding: "2px 0", display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: GREEN, flexShrink: 0 }}>{f.startsWith("Everything") ? "\u2605" : "\u2713"}</span>{f}</div>))}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: MUTED, textAlign: "center" }}>No charge during your trial. Cancel anytime.</div>
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <button onClick={() => setSelectedPlan("free")} style={{ background: "none", border: "none", color: selectedPlan === "free" ? WHITE : MUTED, cursor: "pointer", fontSize: 11, fontWeight: selectedPlan === "free" ? 700 : 400, padding: 0, fontFamily: "inherit" }}>
                  Just need the basics? <span style={{ color: selectedPlan === "free" ? GREEN : CYAN, textDecoration: "underline" }}>Start with our Free plan</span> — 1 aircraft, core SMS features.
                </button>
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, cursor: "pointer" }}>
                <input type="checkbox" checked={agreedTos} onChange={e => setAgreedTos(e.target.checked)} style={{ marginTop: 2, accentColor: CYAN }} />
                <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>I agree to the <a href="/terms" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Privacy Policy</a></span>
              </label>
            </>)}
            {error && <div style={{ color: error.includes("Check your email") || error.includes("created") ? GREEN : RED, fontSize: 12, padding: "10px 14px", borderRadius: 8, background: error.includes("created") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              {step > 1 && <button onClick={() => { setStep(step - 1); setError(""); }} style={{ padding: "13px 20px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{"\u2190"}</button>}
              <button onClick={next} disabled={loading} style={{ flex: 1, padding: "13px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, letterSpacing: 0.3 }}>
                {loading ? "Setting up..." : step === 3 ? (selectedPlan === "free" ? "Start Free Plan \u2192" : "Start Free Trial \u2192") : "Continue \u2192"}</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: MUTED }}>
              {step === 1 && <>Already have an account? <button onClick={() => { window.location.search = "login"; }} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Log in</button></>}
              {step === 3 && <>16+ aircraft? <button onClick={() => window.location.href = "mailto:support@preflightsms.com"} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Contact us for Enterprise</button></>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── INVITE ACCEPT SCREEN ─────────────────────────────────────
function InviteAcceptScreen({ token, onAuth }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("loading"); // loading | form | expired | error
  const [agreedTos, setAgreedTos] = useState(false);

  useEffect(() => {
    if (!token) { setStep("error"); setError("No invitation token"); setLoading(false); return; }
    getInvitationByToken(token).then(({ data, error: err }) => {
      setLoading(false);
      if (err || !data) { setStep("expired"); return; }
      if (new Date(data.expires_at) < new Date()) { setStep("expired"); return; }
      setInvite(data);
      setEmail(data.email);
      setStep("form");
    });
  }, [token]);

  const handleAccept = async () => {
    if (!name.trim()) { setError("Enter your name"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (!agreedTos) { setError("Please agree to the Terms of Service and Privacy Policy"); return; }
    setError(""); setSubmitting(true);
    try {
      // Try sign up first
      const { error: signupErr } = await signUp(email, password, name.trim(), invite.org_id);
      let isReturningUser = false;
      if (signupErr) {
        if (signupErr.message && signupErr.message.includes("already registered")) {
          isReturningUser = true;
        } else {
          setError(signupErr.message); setSubmitting(false); return;
        }
      }
      if (isReturningUser) {
        // Returning user — use server API to update password and re-create profile
        const res = await fetch("/api/rejoin-org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName: name.trim(), orgId: invite.org_id, role: invite.role, invitationToken: invite.token }),
        });
        const result = await res.json();
        if (!res.ok) { setError(result.error || "Failed to rejoin organization"); setSubmitting(false); return; }
      }
      // Sign in (with new password for returning users, or freshly created account)
      const { data: session, error: loginErr } = await signIn(email, password);
      if (loginErr) {
        setError(isReturningUser ? "Failed to sign in after rejoining. Try logging in from the main page." : "Account created. Check your email to confirm, then log in.");
        setSubmitting(false); return;
      }
      if (session?.session) {
        const userId = session.session.user.id;
        if (!isReturningUser) {
          // New user — set the invited role (signUp created profile with 'pilot' default)
          await supabase.from("profiles").update({ role: invite.role }).eq("id", userId);
        }
        // Mark invitation as accepted
        await acceptInvitation(token, userId);
        // Auto-enroll in onboarding course based on role
        try {
          const { data: orgCourses } = await fetchCbtCourses(invite.org_id);
          const onboardingTitle = invite.role === "pilot" ? "Getting Started — Pilot Guide" : "Getting Started — Admin & Operations Guide";
          const onboardingCourse = (orgCourses || []).find(c => c.title === onboardingTitle && c.status === "published");
          if (onboardingCourse) await upsertCbtEnrollment(invite.org_id, onboardingCourse.id, userId, { status: "enrolled" });
        } catch (_) { /* enrollment is best-effort */ }
        // Clear URL and auth
        if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
        onAuth(session.session);
      }
    } catch (e) { setError(e.message); }
    setSubmitting(false);
  };

  const roleLabel = invite?.role === "admin" ? "Administrator" :
    invite?.role === "safety_manager" ? "Safety Manager" :
    invite?.role === "chief_pilot" ? "Chief Pilot" :
    invite?.role === "dispatcher" ? "Dispatcher" :
    invite?.role === "accountable_exec" ? "Accountable Executive" : "Pilot";

  return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...card, padding: "32px 28px", maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 200, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
        </div>

        {step === "loading" && <div style={{ textAlign: "center", padding: 24, color: MUTED, fontSize: 13 }}>Loading invitation...</div>}

        {step === "expired" && (
          <div style={{ textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏰</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Invitation Expired</div>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 20 }}>This invitation link has expired or is no longer valid. Ask your organization admin to send a new one.</div>
            <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }}
              style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Go to Login</button>
          </div>
        )}

        {step === "form" && invite && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Join {invite.organizations?.name || "Organization"}</div>
              <div style={{ fontSize: 12, color: MUTED }}>You've been invited as a <span style={{ color: CYAN, fontWeight: 600 }}>{roleLabel}</span></div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
              <input type="email" value={email} disabled style={{ ...inp, opacity: 0.6, cursor: "not-allowed" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
                style={inp} onKeyDown={e => { if (e.key === "Enter") handleAccept(); }} />
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={agreedTos} onChange={e => setAgreedTos(e.target.checked)} style={{ marginTop: 2, accentColor: CYAN }} />
              <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>I agree to the <a href="/terms" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: CYAN, textDecoration: "none" }}>Privacy Policy</a></span>
            </label>

            {error && <div style={{ color: error.includes("Check your email") ? GREEN : RED, fontSize: 11, marginBottom: 12, padding: "8px 10px", borderRadius: 6, background: error.includes("Check your email") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)" }}>{error}</div>}

            <button onClick={handleAccept} disabled={submitting}
              style={{ width: "100%", padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Creating account..." : "Accept & Join"}</button>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: MUTED }}>
              Already have an account? <button onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }} style={{ background: "none", border: "none", color: CYAN, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Log in</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onAuth, initialMode }) {
  const [mode, setMode] = useState(initialMode || "login"); // login | forgot | reset_password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // Check for recovery token in URL hash on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    // Supabase appends #access_token=...&type=recovery to the redirect URL
    if (hash.includes("type=recovery") || params.has("reset")) {
      setMode("reset_password");
    }
  }, []);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    const { data, error: err } = await signIn(email, password);
    if (err) { setError(err.message); setLoading(false); return; }
    onAuth(data.session);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError("Enter your email address"); return; }
    setError(""); setLoading(true);
    const { error: err } = await resetPasswordForEmail(email.trim());
    setLoading(false);
    if (err) { setError(err.message); return; }
    setResetSent(true);
  };

  const handleSetNewPassword = async () => {
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }
    setError(""); setLoading(true);
    const { error: err } = await updateUserPassword(password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setPasswordUpdated(true);
    // Clear hash from URL
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...card, padding: "32px 28px", maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={LOGO_URL} alt="PreflightSMS" style={{ height: 200, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} /></div>

        {/* Login form */}
        {mode === "login" && (<>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pilot@company.com" style={inp} /></div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"
              style={inp} onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} /></div>
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <button onClick={() => { setMode("forgot"); setError(""); setResetSent(false); }} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 11 }}>Forgot password?</button>
          </div>
        </>)}

        {/* Forgot password */}
        {mode === "forgot" && (<>
          {!resetSent ? (<>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Reset Password</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Enter your email and we'll send you a reset link.</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pilot@company.com"
                style={inp} onKeyDown={e => { if (e.key === "Enter") handleForgotPassword(); }} /></div>
          </>) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Check Your Email</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>We sent a password reset link to <strong style={{ color: OFF_WHITE }}>{email}</strong>. Click the link in the email to set a new password.</div>
            </div>
          )}
        </>)}

        {/* Set new password (after clicking reset link) */}
        {mode === "reset_password" && (<>
          {!passwordUpdated ? (<>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Set New Password</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Enter your new password below.</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={inp} /></div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password"
                style={inp} onKeyDown={e => { if (e.key === "Enter") handleSetNewPassword(); }} /></div>
          </>) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 4 }}>Password Updated</div>
              <div style={{ fontSize: 12, color: MUTED }}>You can now log in with your new password.</div>
            </div>
          )}
        </>)}


        {error && <div style={{ color: error.includes("Check your email") ? GREEN : RED, fontSize: 11, marginBottom: 12, padding: "8px 10px", borderRadius: 6, background: error.includes("Check your email") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          {mode === "forgot" && resetSent ? (
            <button onClick={() => { setMode("login"); setError(""); setResetSent(false); }}
              style={{ flex: 1, padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Back to Login</button>
          ) : mode === "reset_password" && passwordUpdated ? (
            <button onClick={() => { setMode("login"); setError(""); setPasswordUpdated(false); setPassword(""); setConfirmPassword(""); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); }}
              style={{ flex: 1, padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Log In</button>
          ) : (
            <button onClick={mode === "login" ? handleLogin : mode === "forgot" ? handleForgotPassword : handleSetNewPassword} disabled={loading}
              style={{ flex: 1, padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "..." : mode === "login" ? "Log In" : mode === "forgot" ? "Send Reset Link" : "Update Password"}</button>
          )}
        </div>

        {mode === "forgot" && !resetSent && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 11 }}>← Back to login</button>
          </div>
        )}

        {mode === "login" && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: MUTED }}>
            New to PreflightSMS? <a href="?signup" style={{ color: CYAN, textDecoration: "none", fontSize: 11, fontWeight: 600 }}>Create an account</a>
          </div>
        )}
      </div></div>);
}

// ── Tour seed data generator (state-only, never written to DB) ──
function buildTourSeedData(today, userName, fleet) {
  const d = new Date(today + "T12:00:00Z");
  const iso = (offset) => { const dt = new Date(d); dt.setDate(dt.getDate() + offset); return dt.toISOString(); };
  const dateStr = (offset) => { const dt = new Date(d); dt.setDate(dt.getDate() + offset); return dt.toISOString().slice(0, 10); };
  const pilot = userName || "J. Smith";
  const ac = fleet && fleet[0] ? fleet[0].aircraft_type || "PC-12" : "PC-12";
  const tail = fleet && fleet[0] ? fleet[0].tail_number || "N123AB" : "N123AB";

  // ETA helpers for active flights
  const now = new Date();
  const eta2h = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const eta4h = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();

  return {
    records: [
      { id: "_seed_FRAT001", dbId: "_seed_r1", pilot, aircraft: ac, tailNumber: tail, departure: "KSFF", destination: "KBOI", cruiseAlt: "FL250", date: dateStr(-1), etd: "14:00", ete: "1:45", eta: "15:45", fuelLbs: 2800, numCrew: 2, numPax: 3, score: 8, riskLevel: "LOW", factors: ["Day VFR", "Familiar route"], wxBriefing: "VFR conditions", remarks: "", attachments: [], timestamp: iso(-1) },
      { id: "_seed_FRAT002", dbId: "_seed_r2", pilot, aircraft: ac, tailNumber: tail, departure: "KBOI", destination: "KSEA", cruiseAlt: "FL270", date: dateStr(-2), etd: "09:00", ete: "1:30", eta: "10:30", fuelLbs: 2600, numCrew: 2, numPax: 5, score: 22, riskLevel: "MODERATE", factors: ["Mountain terrain", "IFR required", "Gusty winds"], wxBriefing: "IFR with moderate turbulence", remarks: "Mountain wave advisory", attachments: [], timestamp: iso(-2) },
      { id: "_seed_FRAT003", dbId: "_seed_r3", pilot, aircraft: ac, tailNumber: tail, departure: "KDEN", destination: "KASE", cruiseAlt: "FL250", date: dateStr(-3), etd: "07:00", ete: "0:55", eta: "07:55", fuelLbs: 2200, numCrew: 2, numPax: 4, score: 35, riskLevel: "HIGH", factors: ["Mountain terrain", "Short runway", "Night approach", "Icing conditions", "Gusty crosswind"], wxBriefing: "Marginal VFR, icing above 12000", remarks: "Chief pilot approval obtained", attachments: [], timestamp: iso(-3) },
    ],
    flights: [
      { id: "_seed_FLT001", dbId: "_seed_f1", pilot, aircraft: ac, tailNumber: tail, departure: "KSFF", destination: "KBOI", cruiseAlt: "FL250", etd: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), ete: "1:45", eta: eta2h, fuelLbs: 2800, numCrew: 2, numPax: 3, score: 8, riskLevel: "LOW", status: "ACTIVE", timestamp: iso(0), arrivedAt: null, cancelled: false },
      { id: "_seed_FLT002", dbId: "_seed_f2", pilot, aircraft: ac, tailNumber: tail, departure: "KBOI", destination: "KSEA", cruiseAlt: "FL270", etd: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), ete: "1:30", eta: eta4h, fuelLbs: 2600, numCrew: 2, numPax: 5, score: 22, riskLevel: "MODERATE", status: "ACTIVE", timestamp: iso(0), arrivedAt: null, cancelled: false },
      { id: "_seed_FLT003", dbId: "_seed_f3", pilot, aircraft: ac, tailNumber: tail, departure: "KDEN", destination: "KASE", cruiseAlt: "FL250", etd: iso(-1), ete: "0:55", eta: iso(-1), fuelLbs: 2200, numCrew: 2, numPax: 4, score: 35, riskLevel: "HIGH", status: "ARRIVED", timestamp: iso(-1), arrivedAt: iso(-1), cancelled: false },
    ],
    reports: [
      { id: "_seed_rp1", org_id: "_seed", report_code: "RPT-SEED01", title: "Bird Strike on Departure", report_type: "hazard", description: "Large bird strike during initial climb out of KSFF runway 21. Minor leading edge dent, no engine ingestion.", reporter_id: "_seed_u1", anonymous: false, confidential: false, status: "open", severity: "medium", category: "wildlife", location: "KSFF", tail_number: tail, aircraft_type: ac, flight_phase: "climb", date_occurred: dateStr(-2), created_at: iso(-2) },
      { id: "_seed_rp2", org_id: "_seed", report_code: "RPT-SEED02", title: "Cabin Pressure Fluctuation", report_type: "incident", description: "Intermittent cabin pressure fluctuations noted between FL250-FL270 on KBOI-KSEA segment. Returned to normal after descent.", reporter_id: "_seed_u2", anonymous: false, confidential: false, status: "under_review", severity: "high", category: "mechanical", location: "KBOI", tail_number: tail, aircraft_type: ac, flight_phase: "cruise", date_occurred: dateStr(-5), created_at: iso(-5) },
      { id: "_seed_rp3", org_id: "_seed", report_code: "RPT-SEED03", title: "Runway Incursion Avoided", report_type: "near_miss", description: "Ground vehicle crossed runway 28L during taxi. Stopped short per tower instruction. No conflict.", reporter_id: "_seed_u1", anonymous: false, confidential: false, status: "closed", severity: "high", category: "ground_ops", location: "KSEA", tail_number: tail, aircraft_type: ac, flight_phase: "taxi", date_occurred: dateStr(-10), created_at: iso(-10) },
    ],
    hazards: [
      { id: "_seed_h1", org_id: "_seed", hazard_code: "HAZ-SEED01", title: "Icing Conditions — Mountain Routes", description: "Persistent moderate icing reported on KDEN-KASE and KBOI-KSEA mountain segments above FL180.", status: "active", initial_severity: 4, initial_likelihood: 3, initial_risk_score: 12, residual_severity: 3, residual_likelihood: 2, residual_risk_score: 6, category: "weather", source: "safety_report", mitigations: "Verify anti-ice/de-ice systems operational. Brief alternate routes below icing layer.", responsible_person: pilot, review_date: dateStr(14), created_at: iso(-4), related_report_id: null },
      { id: "_seed_h2", org_id: "_seed", hazard_code: "HAZ-SEED02", title: "Fuel Contamination — KSFF", description: "Water contamination found in sumped fuel sample at KSFF FBO. FBO notified and filters replaced.", status: "mitigated", initial_severity: 4, initial_likelihood: 3, initial_risk_score: 12, residual_severity: 2, residual_likelihood: 1, residual_risk_score: 2, category: "maintenance", source: "pilot_debrief", mitigations: "Fuel filters replaced. Double sump checks required for 30 days.", responsible_person: "M. Davis", review_date: dateStr(-7), created_at: iso(-14), related_report_id: null },
    ],
    actions: [
      { id: "_seed_a1", org_id: "_seed", action_code: "CA-SEED01", title: "Verify anti-ice systems on all fleet aircraft", description: "Perform functional check of all anti-ice and de-ice systems prior to winter operations.", status: "open", priority: "high", assigned_to_name: pilot, due_date: dateStr(14), created_at: iso(-3), hazard_id: "_seed_h1", completed_at: null },
      { id: "_seed_a2", org_id: "_seed", action_code: "CA-SEED02", title: "Update winter operations SOP", description: "Revise winter ops SOP to include mandatory icing briefings for mountain routes.", status: "in_progress", priority: "medium", assigned_to_name: pilot, due_date: dateStr(30), created_at: iso(-7), hazard_id: "_seed_h1", completed_at: null },
      { id: "_seed_a3", org_id: "_seed", action_code: "CA-SEED03", title: "Replace fuel filters at KSFF", description: "Coordinate with FBO to replace all fuel filters and verify fuel quality.", status: "completed", priority: "high", assigned_to_name: "M. Davis", due_date: dateStr(-3), created_at: iso(-14), hazard_id: "_seed_h2", completed_at: iso(-7) },
    ],
    policies: [
      { id: "_seed_p1", org_id: "_seed", title: "Safety Policy Statement", category: "safety_policy", description: "Company-wide safety commitment", content: "Our organization is committed to achieving the highest level of aviation safety...", status: "active", version: 1, effective_date: dateStr(-30), acknowledgments: [{ user_id: "_seed_u1", user_name: pilot, acknowledged_at: iso(-5) }], created_at: iso(-30) },
      { id: "_seed_p2", org_id: "_seed", title: "Standard Operating Procedures", category: "sop", description: "Normal and emergency operations procedures", content: "These procedures govern normal, abnormal, and emergency operations...", status: "active", version: 2, effective_date: dateStr(-60), acknowledgments: [], created_at: iso(-60) },
    ],
    trainingReqs: [
      { id: "_seed_tr1", org_id: "_seed", title: "Annual Safety Recurrent", description: "Annual SMS and safety awareness recurrent training.", category: "recurrent", frequency_months: 12, required_for: ["pilot", "captain", "first_officer"], created_at: iso(-90) },
    ],
    trainingRecs: [
      { id: "_seed_trr1", org_id: "_seed", requirement_id: "_seed_tr1", user_id: "_seed_u1", title: "Annual Safety Recurrent", user: { full_name: pilot }, completed_date: dateStr(-15), expiry_date: dateStr(350), notes: "Completed online module and check ride", created_at: iso(-15) },
    ],
    cbtCourses: [
      { id: "_seed_cbt1", org_id: "_seed", title: "SMS Fundamentals", description: "Introduction to Safety Management Systems for Part 5 compliance.", status: "published", category: "sms", estimated_minutes: 45, passing_score: 80, created_at: iso(-60) },
    ],
    smsManuals: [
      { id: "_seed_sm1", org_id: "_seed", title: "Safety Policy Manual", manual_key: "safety_policy", status: "draft", sections: [
        { id: "sp1", title: "Safety Policy Statement", content: "Our organization is committed to the highest standards of aviation safety.", completed: true },
        { id: "sp2", title: "Safety Objectives", content: "Achieve zero preventable accidents through proactive hazard identification.", completed: true },
        { id: "sp3", title: "Management Commitment", content: "Senior management allocates adequate resources for SMS implementation.", completed: true },
        { id: "sp4", title: "Accountable Executive", content: "", completed: false },
        { id: "sp5", title: "Safety Accountabilities", content: "", completed: false },
      ], created_at: iso(-20), updated_at: iso(-5) },
    ],
  };
}

export default function PVTAIRFrat() {
  const isMobile = useIsMobile();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    const check = () => setIsMobileViewport(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const _initTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
  const [cv, setCv] = useState(() => {
    if (_initTab === "subscription") return "admin";
    if (_initTab) return _initTab;
    return "dashboard";
  });
  const [initialAdminTab, setInitialAdminTab] = useState(_initTab === "subscription" ? "subscription" : null);
  const [fratDetailId, setFratDetailId] = useState(null);
  useEffect(() => { if (_initTab && typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); }, []);
  const [records, setRecords] = useState([]);
  const [flights, setFlights] = useState([]);
  const [reports, setReports] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [actions, setActions] = useState([]);
  const [fleetAircraft, setFleetAircraft] = useState([]);
  const [orgProfiles, setOrgProfiles] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [trainingReqs, setTrainingReqs] = useState([]);
  const [trainingRecs, setTrainingRecs] = useState([]);
  const [cbtCourses, setCbtCourses] = useState([]);
  const [cbtLessonsMap, setCbtLessonsMap] = useState({}); // { courseId: [lessons] }
  const [cbtProgress, setCbtProgress] = useState([]);
  const [cbtEnrollments, setCbtEnrollments] = useState([]);
  const [smsManuals, setSmsManuals] = useState([]);
  const [templateVariables, setTemplateVariables] = useState({});
  const [smsSignatures, setSmsSignatures] = useState({});
  const [isAuthed, setIsAuthed] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [savingProfileEmail, setSavingProfileEmail] = useState(false);
  // Supabase auth state
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fratTemplate, setFratTemplate] = useState(null);
  const [fratTemplates, setFratTemplates] = useState([]);
  const [hazardFromReport, setHazardFromReport] = useState(null);
  const [actionFromInvestigation, setActionFromInvestigation] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const notificationsLoadedRef = useRef(false);
  const [notifReads, setNotifReads] = useState([]);
  const [invitations_list, setInvitationsList] = useState([]);
  const isOnline = !!supabase;
  const [networkOnline, setNetworkOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Track actual network connectivity
  useEffect(() => {
    const goOnline = () => setNetworkOnline(true);
    const goOffline = () => setNetworkOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // Cache profile to localStorage for offline use
  useEffect(() => {
    if (profile) {
      try { localStorage.setItem("pvtair_profile", JSON.stringify(profile)); } catch (e) {}
    }
  }, [profile]);

  const org = profile?.organizations || {};
  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState(null); // { feature, message } or null
  // Redirect gated tabs to dashboard with upgrade prompt
  useEffect(() => {
    if (!org || !org.id) return;
    const requiredFeature = NAV_FEATURE_MAP[cv];
    if (requiredFeature && !hasFeature(org, requiredFeature)) {
      const label = FEATURE_LABELS[requiredFeature] || requiredFeature;
      setUpgradePrompt({ feature: label, message: `${label} is not available on your current plan. Upgrade to access this feature.` });
      setCv("dashboard");
    }
  }, [cv, org]);
  // Pilots default to FRAT view for quick pre-flight access
  const defaultViewSetRef = useRef(false);
  useEffect(() => {
    if (!profile || defaultViewSetRef.current) return;
    if (_initTab) return; // user navigated to a specific tab
    defaultViewSetRef.current = true;
    if (!isAdmin) setCv("frat");
  }, [profile]);
  const [tourSubTabs, setTourSubTabs] = useState({});
  const [nudgeFlight, setNudgeFlight] = useState(null);
  const [nudgeResponses, setNudgeResponses] = useState([]);
  const [foreflightConfig, setForeflightConfig] = useState(null);
  const [foreflightFlights, setForeflightFlights] = useState([]);
  const [pendingFfFlights, setPendingFfFlights] = useState([]);
  const [schedaeroConfig, setSchedaeroConfig] = useState(null);
  const [schedaeroTrips, setSchedaeroTrips] = useState([]);
  const [pendingScTrips, setPendingScTrips] = useState([]);
  const [erpPlans, setErpPlans] = useState([]);
  const [erpDrills, setErpDrills] = useState([]);
  const [spis, setSpis] = useState([]);
  const [spiMeasurements, setSpiMeasurements] = useState([]);
  const [auditTemplatesData, setAuditTemplatesData] = useState([]);
  const [iepAudits, setIepAudits] = useState([]);
  const [auditSchedulesData, setAuditSchedulesData] = useState([]);
  const [trendAlerts, setTrendAlerts] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [mocItems, setMocItems] = useState([]);
  const [cultureSurveys, setCultureSurveys] = useState([]);
  const [pilotEngagement, setPilotEngagement] = useState([]);
  const [orgEngagement, setOrgEngagement] = useState([]);
  const [safetyRecognitions, setSafetyRecognitions] = useState([]);
  const [orgRecognitions, setOrgRecognitions] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooksData, setWebhooksData] = useState([]);
  const [asapConfig, setAsapConfig] = useState(null);
  const [asapReports, setAsapReports] = useState([]);
  const [asapCorrActions, setAsapCorrActions] = useState([]);
  const [asapMeetings, setAsapMeetings] = useState([]);
  const [complianceFrameworks, setComplianceFrameworks] = useState([]);
  const [complianceChecklistItems, setComplianceChecklistItems] = useState([]);
  const [complianceStatusData, setComplianceStatusData] = useState([]);
  const [complianceCrosswalk, setComplianceCrosswalk] = useState([]);
  const [insuranceExports, setInsuranceExports] = useState([]);
  const [selectedFfFlight, setSelectedFfFlight] = useState(null);
  const [selectedScTrip, setSelectedScTrip] = useState(null);
  const [reportPrefill, setReportPrefill] = useState(null);

  // Derived template config
  const riskCategories = fratTemplate?.categories || DEFAULT_RISK_CATEGORIES;
  const riskLevels = fratTemplate?.risk_thresholds ? buildRiskLevels(fratTemplate.risk_thresholds) : DEFAULT_RISK_LEVELS;

  // Part 5 compliance for dashboard
  const part5Compliance = useMemo(() =>
    computePart5Compliance({ frats: records, flights, reports, hazards, actions, policies, profiles: orgProfiles, trainingRecords: trainingRecs, smsManuals }),
    [records, flights, reports, hazards, actions, policies, orgProfiles, trainingRecs, smsManuals]
  );

  // Init offline queue
  useEffect(() => {
    const refreshData = async () => {
      if (!profile) return;
      const orgId = profile.org_id;
      const { data: fl } = await fetchFlights(orgId);
      if (fl) setFlights(fl.map(f => ({
        id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
        departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
        etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs, fuelUnit: f.fuel_unit || "lbs",
        numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
        status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at, cancelled: f.status === "CANCELLED",
        approvedAt: f.approved_at, approvalStatus: f.approval_status, fratDbId: f.frat_id, attachments: f.attachments || [],
        parkingSpot: f.parking_spot || "", fuelRemaining: f.fuel_remaining || "", fuelUnit: f.fuel_unit || "",
      })));
      const { data: frats } = await fetchFRATs(orgId);
      if (frats) setRecords(frats.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs, fuelUnit: r.fuel_unit || "lbs",
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at, approvalStatus: r.approval_status, userId: r.user_id,
      })));
      setPendingSync(getQueueCount());
    };
    initOfflineQueue(refreshData);
    setPendingSync(getQueueCount());
    // Update pending count periodically
    const interval = setInterval(() => setPendingSync(getQueueCount()), 5000);
    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => { setProfileEmail(profile?.email || ""); }, [profile?.email]);

  // ── Initialize: check session or fall back to localStorage ──
  useEffect(() => {
    // Helper: restore cached profile + data from localStorage
    const restoreFromCache = () => {
      try { const p = localStorage.getItem("pvtair_profile"); if (p) setProfile(JSON.parse(p)); } catch (e) {}
      try { const d = localStorage.getItem("pvtair_frat_records"); if (d) setRecords(JSON.parse(d)); } catch (e) {}
      try { const f = localStorage.getItem("pvtair_flights"); if (f) setFlights(JSON.parse(f)); } catch (e) {}
    };

    if (isOnline) {
      getSession().then(({ data }) => {
        if (data.session) {
          setSession(data.session);
          getProfile().then(p => {
            if (p) {
              setProfile(p);
            } else if (!navigator.onLine) {
              // Profile fetch failed while offline — use cached profile
              restoreFromCache();
            }
            setAuthLoading(false);
          });
        } else {
          // No session from Supabase — if offline, try cached data
          if (!navigator.onLine) restoreFromCache();
          setAuthLoading(false);
        }
      }).catch(() => {
        // getSession failed (offline) — restore from cache
        if (!navigator.onLine) restoreFromCache();
        setAuthLoading(false);
      });
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
        setSession(sess);
        if (sess) { setProfileLoading(true); getProfile().then(p => { if (p) setProfile(p); else if (!navigator.onLine) restoreFromCache(); setProfileLoading(false); }); }
        else { setProfile(null); setProfileLoading(false); setRecords([]); setFlights([]); }
      });
      return () => subscription.unsubscribe();
    } else {
      // localStorage fallback (supabase not configured at all)
      restoreFromCache();
    }
  }, []);

  // Handle email confirmation token from Supabase auth links
  useEffect(() => {
    if (typeof window === "undefined" || !supabase) return;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && type) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ data, error }) => {
        if (data?.session) {
          setSession(data.session);
          getProfile().then(p => { if (p) setProfile(p); });
        }
        window.history.replaceState(null, "", window.location.pathname);
      });
    }
  }, []);

  // Handle payment return from Stripe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("payment")) {
      const status = params.get("payment");
      if (status === "success") {
        setToast({ message: "Payment successful! Your subscription is now active.", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
        // Refresh profile to get updated subscription status
        setTimeout(() => { getProfile().then(p => { if (p) setProfile(p); }); }, 2000);
      } else if (status === "canceled") {
        setToast({ message: "Checkout canceled", level: { bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", color: YELLOW } });
      }
      setTimeout(() => setToast(null), 5000);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // ── Re-fetch tour-seeded data from Supabase (used by useEffect + tour-end handlers) ──
  const refreshAllData = (orgId) => {
    fetchFRATs(orgId).then(({ data }) => {
      setRecords(data.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs, fuelUnit: r.fuel_unit || "lbs",
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [],
        timestamp: r.created_at, approvalStatus: r.approval_status, userId: r.user_id,
        fatigueScore: r.fatigue_score ?? null, fatigueRiskLevel: r.fatigue_risk_level || null,
      })));
    });
    fetchFlights(orgId).then(({ data }) => {
      setFlights(data.map(f => ({
        id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
        departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
        etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs, fuelUnit: f.fuel_unit || "lbs",
        numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
        status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at,
        cancelled: f.status === "CANCELLED", approvedAt: f.approved_at, approvalStatus: f.approval_status,
        fratDbId: f.frat_id, attachments: f.attachments || [],
        parkingSpot: f.parking_spot || "", fuelRemaining: f.fuel_remaining || "", fuelUnit: f.fuel_unit || "",
      })));
    });
    fetchReports(orgId).then(({ data }) => setReports(data || []));
    fetchHazards(orgId).then(({ data }) => setHazards(data || []));
    fetchActions(orgId).then(({ data }) => setActions(data || []));
    fetchPolicies(orgId).then(({ data }) => setPolicies(data || []));
    fetchTrainingRequirements(orgId).then(({ data }) => setTrainingReqs(data || []));
    fetchTrainingRecords(orgId).then(({ data }) => setTrainingRecs(data || []));
    fetchCbtCourses(orgId).then(({ data }) => {
      setCbtCourses(data || []);
      (data || []).forEach(c => {
        fetchCbtLessons(c.id).then(({ data: lessons }) => {
          setCbtLessonsMap(prev => ({ ...prev, [c.id]: lessons || [] }));
        });
      });
    });
    fetchCbtProgress(orgId).then(({ data }) => setCbtProgress(data || []));
    fetchCbtEnrollments(orgId).then(({ data }) => setCbtEnrollments(data || []));
    fetchSmsManuals(orgId).then(({ data }) => setSmsManuals(data || []));
    fetchErpPlans(orgId).then(({ data }) => setErpPlans(data || []));
    fetchErpDrills(orgId).then(({ data }) => setErpDrills(data || []));
    fetchSpis(orgId).then(({ data }) => setSpis(data || []));
    fetchAllSpiMeasurements(orgId).then(({ data }) => setSpiMeasurements(data || []));
    fetchAuditTemplates(orgId).then(({ data }) => setAuditTemplatesData(data || []));
    fetchAudits(orgId).then(({ data }) => setIepAudits(data || []));
    fetchAuditSchedules(orgId).then(({ data }) => setAuditSchedulesData(data || []));
    fetchTrendAlerts(orgId).then(({ data }) => setTrendAlerts(data || []));
    fetchDeclarations(orgId).then(({ data }) => setDeclarations(data || []));
    fetchMocItems(orgId).then(({ data }) => setMocItems(data || []));
    fetchCultureSurveys(orgId).then(({ data }) => setCultureSurveys(data || []));
    // Engagement data
    if (session?.user?.id) {
      fetchPilotEngagement(session.user.id).then(({ data }) => setPilotEngagement(data || []));
      fetchSafetyRecognitions(session.user.id).then(({ data }) => setSafetyRecognitions(data || []));
    }
    fetchOrgEngagement(orgId).then(({ data }) => setOrgEngagement(data || []));
    fetchOrgRecognitions(orgId).then(({ data }) => setOrgRecognitions(data || []));
    // API keys & webhooks
    fetchApiKeys(orgId).then(({ data }) => setApiKeys(data || []));
    fetchWebhooks(orgId).then(({ data }) => setWebhooksData(data || []));
  };

  // ── Load data from Supabase when profile is available ──
  useEffect(() => {
    if (!profile) return;
    const orgId = profile.org_id;
    refreshAllData(orgId);
    // Subscribe to real-time flight updates
    const channel = subscribeToFlights(orgId, (payload) => {
      fetchFlights(orgId).then(({ data }) => {
        setFlights(data.map(f => ({
          id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
          departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
          etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs, fuelUnit: f.fuel_unit || "lbs",
          numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
          status: f.status, timestamp: f.created_at, arrivedAt: f.arrived_at,
          cancelled: f.status === "CANCELLED", approvedAt: f.approved_at, approvalStatus: f.approval_status,
          fratDbId: f.frat_id, attachments: f.attachments || [],
          parkingSpot: f.parking_spot || "", fuelRemaining: f.fuel_remaining || "", fuelUnit: f.fuel_unit || "",
        })));
      });
    });
    // Load FRAT template
    fetchFratTemplate(orgId).then(({ data }) => { if (data) setFratTemplate(data); });
    fetchAllFratTemplates(orgId).then(({ data }) => { setFratTemplates(data || []); });
    fetchAircraft(orgId).then(({ data }) => setFleetAircraft(data || []));
    fetchOrgProfiles(orgId).then(({ data }) => setOrgProfiles(data || []));

    fetchNotifications(orgId).then(({ data }) => { setNotifications(data || []); notificationsLoadedRef.current = true; });
    if (session?.user?.id) fetchNotificationReads(session.user.id).then(({ data }) => setNotifReads((data || []).map(r => r.notification_id)));
    if (session?.user?.id) fetchNudgeResponsesForUser(session.user.id).then(({ data }) => setNudgeResponses(data || []));
    reconcileInvitations(orgId).then(() => fetchInvitations(orgId).then(({ data }) => setInvitationsList(data || [])));
    // ForeFlight integration (only if feature enabled)
    if (hasFeature(profile?.organizations, "foreflight_integration")) {
      fetchForeflightConfig(orgId).then(({ data }) => setForeflightConfig(data));
      fetchForeflightFlights(orgId).then(({ data }) => setForeflightFlights(data || []));
      fetchPendingForeflightFlights(orgId).then(({ data }) => setPendingFfFlights(data || []));
    }
    // Schedaero integration (only if feature enabled)
    if (hasFeature(profile?.organizations, "schedaero_integration")) {
      fetchSchedaeroConfig(orgId).then(({ data }) => setSchedaeroConfig(data));
      fetchSchedaeroTrips(orgId).then(({ data }) => setSchedaeroTrips(data || []));
      fetchPendingSchedaeroTrips(orgId).then(({ data }) => setPendingScTrips(data || []));
    }
    // ASAP program (only if feature enabled)
    if (hasFeature(profile?.organizations, "asap_program")) {
      fetchAsapConfig(orgId).then(({ data }) => setAsapConfig(data));
      fetchAsapReports(orgId).then(({ data }) => setAsapReports(data || []));
      fetchAsapCorrectiveActions(orgId).then(({ data }) => setAsapCorrActions(data || []));
      fetchAsapMeetings(orgId).then(({ data }) => setAsapMeetings(data || []));
    }
    // International compliance (only if feature enabled)
    if (hasFeature(profile?.organizations, "international_compliance")) {
      fetchComplianceFrameworks(orgId).then(({ data }) => setComplianceFrameworks(data || []));
      fetchAllComplianceChecklistItems().then(({ data }) => setComplianceChecklistItems(data || []));
      fetchComplianceStatus(orgId).then(({ data }) => setComplianceStatusData(data || []));
      fetchComplianceCrosswalk().then(({ data }) => setComplianceCrosswalk(data || []));
    }
    // Insurance export (Professional+)
    if (hasFeature(profile?.organizations, "insurance_export")) {
      fetchInsuranceExports(orgId).then(({ data }) => setInsuranceExports(data || []));
    }
    // Subscribe to real-time notification updates
    const notifChannel = subscribeToNotifications(orgId, () => {
      fetchNotifications(orgId).then(({ data }) => setNotifications(data || []));
    });
    return () => {
      if (channel) supabase.removeChannel(channel);
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, [profile]);

  // Load SMS template variables & signatures from org settings
  useEffect(() => {
    const orgSettings = profile?.organizations?.settings || {};
    setTemplateVariables(orgSettings.sms_template_variables || {});
    setSmsSignatures(orgSettings.sms_signatures || {});
  }, [profile]);

  // NOTE: audit_due/audit_overdue and moc_review_due notifications are handled
  // by the check-audit-schedules and check-moc-reviews cron edge functions,
  // which dedup server-side. Removed in-app useEffects that duplicated these
  // because having notifications in the dependency array caused re-fire loops.

  // Onboarding wizard trigger — per-user via localStorage
  useEffect(() => {
    if (!profile || !isOnline || !session?.user?.id) return;
    const subStatus = profile.organizations?.subscription_status || "active";
    if (["canceled", "suspended"].includes(subStatus)) return;
    const trialCreatedAt = profile.organizations?.created_at ? new Date(profile.organizations.created_at) : null;
    if (subStatus === "trial" && subStatus !== "free" && trialCreatedAt && Math.floor((Date.now() - trialCreatedAt.getTime()) / (1000 * 60 * 60 * 24)) >= 14) return;
    const key = `preflightsms_onboarding_${session.user.id}`;
    const done = localStorage.getItem(key);
    if (!done) setShowOnboarding(true);
  }, [profile, isOnline, session]);

  const [fratPrefill, setFratPrefill] = useState(null);

  // ── Poll notifications every 60s ──
  useEffect(() => {
    if (!profile?.org_id || !session?.user?.id) return;
    const interval = setInterval(() => {
      fetchNotifications(profile.org_id).then(({ data }) => { if (data) setNotifications(data); });
      fetchNotificationReads(session.user.id).then(({ data }) => { if (data) setNotifReads(data.map(r => r.notification_id)); });
    }, 60000);
    return () => clearInterval(interval);
  }, [profile, session]);

  // ── localStorage helpers (offline mode only) ──
  const saveLocal = useCallback(nr => { setRecords(nr); try { localStorage.setItem("pvtair_frat_records", JSON.stringify(nr)); } catch (e) {} }, []);
  const saveFlightsLocal = useCallback(nf => { setFlights(nf); try { localStorage.setItem("pvtair_flights", JSON.stringify(nf)); } catch (e) {} }, []);

  // ── Engagement helpers ──
  const gamificationOn = org?.gamification_enabled === true; // default true
  const updateEngagement = useCallback(async (metricType, newValue, bestValue) => {
    if (!profile || !session?.user?.id || !gamificationOn) return;
    await upsertEngagementMetric(session.user.id, profile.org_id, metricType, newValue, bestValue);
    fetchPilotEngagement(session.user.id).then(({ data }) => setPilotEngagement(data || []));
    fetchOrgEngagement(profile.org_id).then(({ data }) => setOrgEngagement(data || []));
  }, [profile, session, gamificationOn]);

  const checkAndAwardRecognition = useCallback(async (recognitionType, title, description) => {
    if (!profile || !session?.user?.id || !gamificationOn) return;
    // Check if already awarded (except training_100pct which can re-award quarterly)
    const existing = safetyRecognitions.find(r => r.recognition_type === recognitionType);
    if (existing && recognitionType !== "training_100pct") return;
    if (recognitionType === "training_100pct" && existing) {
      const lastAwarded = new Date(existing.awarded_at);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (lastAwarded > threeMonthsAgo) return;
    }
    const { data: rec } = await awardRecognition(profile.org_id, session.user.id, recognitionType, title, description);
    if (rec) {
      createNotification(profile.org_id, {
        type: "engagement_milestone",
        title: `Recognition Earned: ${title}`,
        body: `You earned "${title}"! Keep it up.`,
        link_tab: "dashboard",
        target_user_id: session.user.id,
      });
      fetchSafetyRecognitions(session.user.id).then(({ data }) => setSafetyRecognitions(data || []));
      fetchOrgRecognitions(profile.org_id).then(({ data }) => setOrgRecognitions(data || []));
    }
  }, [profile, session, safetyRecognitions, gamificationOn]);

  const updateFratEngagement = useCallback(async () => {
    if (!profile || !session?.user?.id || !gamificationOn) return;
    // Get current engagement
    const { data: metrics } = await fetchPilotEngagement(session.user.id);
    const streakMetric = (metrics || []).find(m => m.metric_type === "frat_streak");
    const totalMetric = (metrics || []).find(m => m.metric_type === "total_frats");

    // Total FRATs
    const newTotal = (totalMetric?.current_value || 0) + 1;
    await upsertEngagementMetric(session.user.id, profile.org_id, "total_frats", newTotal, Math.max(newTotal, totalMetric?.best_value || 0));

    // Streak: check if last FRAT was yesterday or today
    const lastActivity = streakMetric?.last_activity_at ? new Date(streakMetric.last_activity_at) : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    let newStreak = 1;
    if (lastActivity) {
      const lastDay = new Date(lastActivity); lastDay.setHours(0, 0, 0, 0);
      if (lastDay.getTime() === today.getTime()) {
        newStreak = streakMetric.current_value; // same day, keep streak
      } else if (lastDay.getTime() === yesterday.getTime()) {
        newStreak = (streakMetric.current_value || 0) + 1; // consecutive day
      }
      // else streak broken, reset to 1
    }
    const bestStreak = Math.max(newStreak, streakMetric?.best_value || 0);
    await upsertEngagementMetric(session.user.id, profile.org_id, "frat_streak", newStreak, bestStreak);

    // Refresh engagement state
    fetchPilotEngagement(session.user.id).then(({ data }) => setPilotEngagement(data || []));
    fetchOrgEngagement(profile.org_id).then(({ data }) => setOrgEngagement(data || []));

    // Check streak recognitions
    if (newStreak >= 7) checkAndAwardRecognition("frat_streak_7", "7-Day FRAT Streak", "Submitted a FRAT every day for 7 consecutive days");
    if (newStreak >= 30) checkAndAwardRecognition("frat_streak_30", "30-Day FRAT Streak", "Submitted a FRAT every day for 30 consecutive days");
    if (newStreak >= 90) checkAndAwardRecognition("frat_streak_90", "90-Day FRAT Streak", "Submitted a FRAT every day for 90 consecutive days");
  }, [profile, session, gamificationOn, checkAndAwardRecognition]);

  const updateReportEngagement = useCallback(async () => {
    if (!profile || !session?.user?.id || !gamificationOn) return;
    const { data: metrics } = await fetchPilotEngagement(session.user.id);
    const reportMetric = (metrics || []).find(m => m.metric_type === "reports_submitted");
    const newCount = (reportMetric?.current_value || 0) + 1;
    await upsertEngagementMetric(session.user.id, profile.org_id, "reports_submitted", newCount, Math.max(newCount, reportMetric?.best_value || 0));
    fetchPilotEngagement(session.user.id).then(({ data }) => setPilotEngagement(data || []));
    fetchOrgEngagement(profile.org_id).then(({ data }) => setOrgEngagement(data || []));
    // Check recognitions
    if (newCount === 1) checkAndAwardRecognition("first_report", "First Safety Report", "Submitted your first safety report");
    if (newCount >= 5) checkAndAwardRecognition("report_milestone_5", "5 Safety Reports", "Submitted 5 safety reports");
    if (newCount >= 10) checkAndAwardRecognition("report_milestone_10", "10 Safety Reports", "Submitted 10 safety reports");
  }, [profile, session, gamificationOn, checkAndAwardRecognition]);

  const updateTrainingEngagement = useCallback(async () => {
    if (!profile || !session?.user?.id || !gamificationOn) return;
    // Check if all required training is current
    const userEnrollments = (cbtEnrollments || []).filter(e => e.user_id === session.user.id);
    const userProgress = (cbtProgress || []).filter(p => p.user_id === session.user.id);
    const requiredCourses = (cbtCourses || []).filter(c => c.is_required);
    const allComplete = requiredCourses.length > 0 && requiredCourses.every(c => {
      const prog = userProgress.find(p => p.course_id === c.id);
      return prog && prog.completed_at;
    });
    const trainingVal = allComplete ? 1 : 0;
    await upsertEngagementMetric(session.user.id, profile.org_id, "training_current", trainingVal, trainingVal);
    fetchPilotEngagement(session.user.id).then(({ data }) => setPilotEngagement(data || []));
    if (allComplete) checkAndAwardRecognition("training_100pct", "Training 100% Current", "All required training courses completed");
  }, [profile, session, gamificationOn, cbtCourses, cbtProgress, cbtEnrollments, checkAndAwardRecognition]);

  const updatePolicyEngagement = useCallback(async () => {
    if (!profile || !session?.user?.id || !gamificationOn) return;
    const { data: metrics } = await fetchPilotEngagement(session.user.id);
    const policyMetric = (metrics || []).find(m => m.metric_type === "policy_ack");
    const newCount = (policyMetric?.current_value || 0) + 1;
    await upsertEngagementMetric(session.user.id, profile.org_id, "policy_ack", newCount, Math.max(newCount, policyMetric?.best_value || 0));
    fetchPilotEngagement(session.user.id).then(({ data }) => setPilotEngagement(data || []));
  }, [profile, session, gamificationOn]);

  // ── Helper: map DB flights to local state, preserving approved statuses from local state ──
  // Approval is one-way; stale read replicas may return "pending" for recently-approved flights.
  const mapDbFlights = useCallback((dbFlights, prev) => {
    const prevMap = {};
    (prev || []).forEach(f => { prevMap[f.dbId] = f; });
    return dbFlights.map(f => {
      const p = prevMap[f.id];
      const wasApproved = p && (p.approvalStatus === "approved" || p.approvalStatus === "auto_approved");
      return {
        id: f.frat_code, dbId: f.id, pilot: f.pilot, aircraft: f.aircraft, tailNumber: f.tail_number,
        departure: f.departure, destination: f.destination, cruiseAlt: f.cruise_alt,
        etd: f.etd, ete: f.ete, eta: f.eta, fuelLbs: f.fuel_lbs, fuelUnit: f.fuel_unit || "lbs",
        numCrew: f.num_crew, numPax: f.num_pax, score: f.score, riskLevel: f.risk_level,
        status: wasApproved && f.approval_status === "pending" ? "ACTIVE" : f.status,
        timestamp: f.created_at, arrivedAt: f.arrived_at, cancelled: f.status === "CANCELLED",
        approvedAt: wasApproved ? (f.approved_at || p.approvedAt) : f.approved_at,
        approvalStatus: wasApproved && f.approval_status === "pending" ? "approved" : f.approval_status,
        fratDbId: f.frat_id, attachments: f.attachments || [],
        parkingSpot: f.parking_spot || "", fuelRemaining: f.fuel_remaining || "", fuelUnit: f.fuel_unit || "",
      };
    });
  }, []);

  // ── Submit FRAT ──
  const onSubmit = useCallback(async entry => {
    // Use approval mode determined by FRATForm (from the template the pilot actually used)
    const approvalMode = entry.approvalMode || "none";
    const isApprover = ["admin","safety_manager","accountable_exec","chief_pilot"].includes(profile?.role) || (profile?.permissions || []).includes("approver");
    let needsBlock = approvalMode === "required";
    // Determine approval status and notification behavior based on submitter + mode
    let fratApprovalStatus = "auto_approved";
    let shouldNotify = false;
    let toastMsg = "";
    if (approvalMode === "review" && isApprover) {
      // Approver + review → auto-approved, no notifications
      fratApprovalStatus = "auto_approved";
      shouldNotify = false;
      toastMsg = `${entry.riskLevel} FRAT submitted`;
    } else if (approvalMode === "review" && !isApprover) {
      // Non-approver + review → review status, notify approvers
      fratApprovalStatus = "review";
      shouldNotify = true;
      toastMsg = `${entry.riskLevel} FRAT submitted, all FRAT approvers notified`;
    } else if (approvalMode === "required" && isApprover) {
      // Approver + required → auto-approved, no block, no notifications
      fratApprovalStatus = "auto_approved";
      needsBlock = false;
      shouldNotify = false;
      toastMsg = `${entry.riskLevel} FRAT submitted`;
    } else if (approvalMode === "required") {
      // Non-approver + required → pending, notify approvers
      fratApprovalStatus = "pending";
      shouldNotify = true;
      toastMsg = `${entry.riskLevel} FRAT submitted, management approval required`;
    } else {
      // Scenario: none → auto-approved, no notifications
      toastMsg = `${entry.id} submitted — flight plan created`;
    }

    if (isOnline && profile) {
      const { data: fratData, error: fratErr } = await submitFRAT(profile.org_id, session.user.id, {
        ...entry,
        approvalStatus: fratApprovalStatus,
        fatigueScore: entry.fatigueData?.calculatedScore ?? null,
        fatigueRiskLevel: entry.fatigueData?.riskLevel || null,
      }).catch(e => ({ data: null, error: e }));
      if (fratErr) {
        // Queue for offline sync
        enqueue({ type: "frat_submit", payload: { orgId: profile.org_id, userId: session.user.id, entry } });
        setPendingSync(getQueueCount());
        const localFlight = { id: entry.id, pilot: entry.pilot, aircraft: entry.aircraft, tailNumber: entry.tailNumber || "", departure: entry.departure, destination: entry.destination, cruiseAlt: entry.cruiseAlt || "", etd: entry.etd || "", ete: entry.ete || "", eta: entry.eta || "", fuelLbs: entry.fuelLbs || "", numCrew: entry.numCrew || "", numPax: entry.numPax || "", score: entry.score, riskLevel: entry.riskLevel, status: needsBlock ? "PENDING_APPROVAL" : "ACTIVE", timestamp: entry.timestamp, arrivedAt: null, pendingSync: true };
        setFlights(prev => [localFlight, ...prev]);
        setRecords(prev => [entry, ...prev]);
        setToast({ message: `${entry.id} saved offline — will sync when connected`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 5000);
        return;
      }
      const { data: flightData, error: flightErr } = await createFlight(profile.org_id, fratData.id, entry, needsBlock);
      if (flightErr) console.error("Flight create error:", flightErr);

      // Save fatigue assessment if present
      if (entry.fatigueData && fratData) {
        createFatigueAssessment(profile.org_id, {
          frat_id: fratData.id,
          pilot_id: session.user.id,
          sleep_hours_24: entry.fatigueData.sleepHours24,
          hours_awake: entry.fatigueData.hoursAwake,
          duty_start_time: entry.fatigueData.dutyStartTime,
          timezone_crossings: entry.fatigueData.timezoneCrossings,
          commute_minutes: entry.fatigueData.commuteMinutes,
          subjective_fatigue: entry.fatigueData.subjectiveFatigue,
          calculated_fatigue_score: entry.fatigueData.calculatedScore,
          fatigue_risk_level: entry.fatigueData.riskLevel,
          mitigations: entry.fatigueData.mitigations,
        }).catch(e => console.error("Fatigue assessment save error:", e));
      }

      // ForeFlight linking — update FF flight and optionally push FRAT PDF
      if (entry.foreflightFlightId && flightData) {
        try {
          await updateForeflightFlight(entry.foreflightFlightId, {
            frat_id: fratData.id,
            flight_id: flightData.id,
            status: "frat_created",
          });
          if (foreflightConfig?.push_frat_enabled) {
            supabase.functions.invoke("foreflight-push-frat", {
              body: { orgId: profile.org_id, fratId: fratData.id, foreflightFlightId: entry.foreflightFlightId },
            }).catch(e => console.error("ForeFlight push error:", e));
          }
          setSelectedFfFlight(null);
          fetchPendingForeflightFlights(profile.org_id).then(({ data }) => setPendingFfFlights(data || []));
          fetchForeflightFlights(profile.org_id).then(({ data }) => setForeflightFlights(data || []));
        } catch (e) { console.error("ForeFlight link error:", e); }
      }

      // Schedaero linking — update Schedaero trip
      if (entry.schedaeroTripId && flightData) {
        try {
          await updateSchedaeroTrip(entry.schedaeroTripId, {
            frat_id: fratData.id,
            flight_id: flightData.id,
            status: "frat_created",
          });
          setSelectedScTrip(null);
          fetchPendingSchedaeroTrips(profile.org_id).then(({ data }) => setPendingScTrips(data || []));
          fetchSchedaeroTrips(profile.org_id).then(({ data }) => setSchedaeroTrips(data || []));
        } catch (e) { console.error("Schedaero link error:", e); }
      }

      // Send notification + email for applicable modes
      if (shouldNotify) {
        try {
          await fetch("/api/request-approval", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
              orgId: profile.org_id,
              fratCode: entry.id,
              pilot: entry.pilot,
              aircraft: entry.aircraft,
              tailNumber: entry.tailNumber,
              departure: entry.departure,
              destination: entry.destination,
              score: entry.score,
              riskLevel: entry.riskLevel,
              orgName: profile?.organizations?.name || "",
            }),
          });
        } catch (e) { console.error("Approval notification error:", e); }
        const notifTitle = approvalMode === "required" ? "FRAT Awaiting Approval" : "FRAT Flagged for Review";
        createNotification(profile.org_id, { type: "frat_needs_approval", title: notifTitle, body: `${entry.pilot} — ${entry.riskLevel} risk — ${entry.departure} to ${entry.destination}`, link_tab: "flights", link_id: entry.id, target_roles: ["admin", "safety_manager"] });
      }

      // Refresh data from server
      const { data: frats } = await fetchFRATs(profile.org_id);
      setRecords(frats.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs, fuelUnit: r.fuel_unit || "lbs",
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at,
        approvalStatus: r.approval_status, userId: r.user_id,
      })));
      const { data: fl } = await fetchFlights(profile.org_id);
      setFlights(prev => mapDbFlights(fl, prev));
    } else {
      const nr = [entry, ...records]; saveLocal(nr);
      const flight = { id: entry.id, pilot: entry.pilot, aircraft: entry.aircraft, tailNumber: entry.tailNumber || "", departure: entry.departure, destination: entry.destination, cruiseAlt: entry.cruiseAlt || "", etd: entry.etd || "", ete: entry.ete || "", eta: entry.eta || "", fuelLbs: entry.fuelLbs || "", numCrew: entry.numCrew || "", numPax: entry.numPax || "", score: entry.score, riskLevel: entry.riskLevel, status: needsBlock ? "PENDING_APPROVAL" : "ACTIVE", timestamp: entry.timestamp, arrivedAt: null };
      const nf = [flight, ...flights]; saveFlightsLocal(nf);
    }
    // Update engagement metrics
    updateFratEngagement().catch(e => console.error("Engagement update error:", e));
    setToast({ message: toastMsg, level: getRiskLevel(entry.score, riskLevels) }); setTimeout(() => setToast(null), 4000);
  }, [records, flights, saveLocal, saveFlightsLocal, profile, session, isOnline, foreflightConfig, updateFratEngagement]);

  // ── Update flight status ──
  const onUpdateFlight = useCallback(async (id, action, extra = {}) => {
    if (isOnline && profile) {
      const flight = flights.find(f => f.id === id);
      if (flight && flight.dbId) {
        const status = action === "CANCEL" ? "CANCELLED" : action;
        try {
          const { error } = await updateFlightStatus(flight.dbId, status, extra);
          if (error) throw error;
          // Refresh fleet aircraft to pick up status updates from arrival
          if (status === "ARRIVED") { fetchAircraft(profile.org_id).then(({ data }) => setFleetAircraft(data || [])); }
          const { data: fl } = await fetchFlights(profile.org_id);
          setFlights(prev => mapDbFlights(fl, prev));
        } catch (e) {
          // Queue for offline sync
          enqueue({ type: "flight_status", payload: { flightDbId: flight.dbId, status, ...extra } });
          setPendingSync(getQueueCount());
          // Update local state immediately so pilot sees the change
          setFlights(prev => prev.map(f => {
            if (f.id !== id) return f;
            return { ...f, status, arrivedAt: (status === "ARRIVED" || status === "CANCELLED") ? new Date().toISOString() : f.arrivedAt, pendingSync: true, ...extra };
          }));
          setToast({ message: `Status saved offline — will sync when connected`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 5000);
        }
      } else if (flight && !flight.dbId) {
        // Flight was created offline, queue the status update
        enqueue({ type: "flight_status", payload: { flightDbId: null, fratCode: flight.id, status: action === "CANCEL" ? "CANCELLED" : action, ...extra } });
        setPendingSync(getQueueCount());
        setFlights(prev => prev.map(f => {
          if (f.id !== id) return f;
          const newStatus = action === "CANCEL" ? "CANCELLED" : action;
          return { ...f, status: newStatus, arrivedAt: new Date().toISOString(), pendingSync: true, ...extra };
        }));
        setToast({ message: `Status saved offline — will sync when connected`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 5000);
      }
    } else {
      const nf = flights.map(f => {
        if (f.id !== id) return f;
        if (action === "ARRIVED") return { ...f, status: "ARRIVED", arrivedAt: new Date().toISOString(), ...extra };
        if (action === "CANCEL") return { ...f, status: "ARRIVED", arrivedAt: new Date().toISOString(), cancelled: true };
        return f;
      });
      saveFlightsLocal(nf);
    }
    if (action === "ARRIVED") {
      setToast({ message: `${id} arrived safely`, level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: GREEN } });
      const arrivedFlight = flights.find(f => f.id === id);
      if (arrivedFlight?.dbId) {
        const hasTerminal = nudgeResponses.some(
          nr => nr.flight_id === arrivedFlight.dbId &&
          ['submitted_report', 'nothing_to_report', 'dismissed'].includes(nr.response)
        );
        if (!hasTerminal) setTimeout(() => setNudgeFlight(arrivedFlight), 1500);
      }
    }
    setTimeout(() => setToast(null), 3000);
  }, [flights, saveFlightsLocal, profile, isOnline, nudgeResponses]);

  // ── Remind-later nudge check (every 5 min) ──
  useEffect(() => {
    if (!session?.user?.id || !profile) return;
    const check = () => {
      const now = new Date();
      const pending = nudgeResponses.filter(nr =>
        nr.response === 'remind_later' && nr.remind_at && new Date(nr.remind_at) <= now
      );
      if (!pending.length || nudgeFlight) return;
      for (const nr of pending) {
        const hasTerminal = nudgeResponses.some(
          t => t.flight_id === nr.flight_id &&
          ['submitted_report', 'nothing_to_report', 'dismissed'].includes(t.response)
        );
        if (!hasTerminal) {
          const match = flights.find(f => f.dbId === nr.flight_id);
          if (match) { setNudgeFlight(match); break; }
        }
      }
    };
    check();
    const interval = setInterval(check, 300000);
    return () => clearInterval(interval);
  }, [nudgeResponses, flights, nudgeFlight, session, profile]);

  // ── Nudge handlers ──
  const onNudgeSubmitReport = useCallback(async () => {
    if (!nudgeFlight || !profile || !session) return;
    await createNudgeResponse(profile.org_id, session.user.id, { flightId: nudgeFlight.dbId, response: 'submitted_report' });
    fetchNudgeResponsesForUser(session.user.id).then(({ data }) => setNudgeResponses(data || []));
    setReportPrefill({
      tailNumber: nudgeFlight.tailNumber || '',
      aircraftType: nudgeFlight.aircraft || '',
      flightPhase: 'post_flight',
      location: nudgeFlight.destination || '',
      dateOccurred: new Date().toISOString().split('T')[0],
    });
    setNudgeFlight(null);
    setCv("reports");
  }, [nudgeFlight, profile, session]);

  const onNudgeNothingToReport = useCallback(async () => {
    if (!nudgeFlight || !profile || !session) return;
    await createNudgeResponse(profile.org_id, session.user.id, { flightId: nudgeFlight.dbId, response: 'nothing_to_report' });
    fetchNudgeResponsesForUser(session.user.id).then(({ data }) => setNudgeResponses(data || []));
    setNudgeFlight(null);
  }, [nudgeFlight, profile, session]);

  const onNudgeRemindLater = useCallback(async () => {
    if (!nudgeFlight || !profile || !session) return;
    const remindAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await createNudgeResponse(profile.org_id, session.user.id, { flightId: nudgeFlight.dbId, response: 'remind_later', remindAt });
    fetchNudgeResponsesForUser(session.user.id).then(({ data }) => setNudgeResponses(data || []));
    setNudgeFlight(null);
    setToast({ message: "We'll check back in 2 hours", level: { bg: "rgba(34,211,238,0.15)", border: "rgba(34,211,238,0.4)", color: "#22D3EE" } }); setTimeout(() => setToast(null), 4000);
  }, [nudgeFlight, profile, session]);

  const onNudgeDismiss = useCallback(async () => {
    if (!nudgeFlight || !profile || !session) return;
    await createNudgeResponse(profile.org_id, session.user.id, { flightId: nudgeFlight.dbId, response: 'dismissed' });
    fetchNudgeResponsesForUser(session.user.id).then(({ data }) => setNudgeResponses(data || []));
    setNudgeFlight(null);
  }, [nudgeFlight, profile, session]);

  // ── Delete FRAT ──
  const onDelete = useCallback(async id => {
    if (isOnline && profile) {
      const rec = records.find(r => r.id === id);
      if (rec && rec.dbId) await deleteFRAT(rec.dbId);
      const { data: frats } = await fetchFRATs(profile.org_id);
      setRecords(frats.map(r => ({
        id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number,
        departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt,
        date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs, fuelUnit: r.fuel_unit || "lbs",
        numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level,
        factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at, approvalStatus: r.approval_status, userId: r.user_id,
      })));
    } else {
      saveLocal(records.filter(r => r.id !== id));
    }
  }, [records, saveLocal, profile, isOnline]);

  // ── Submit Safety Report ──
  const onSubmitReport = useCallback(async (report) => {
    if (isOnline && profile) {
      const { error } = await submitReport(profile.org_id, session.user.id, report);
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchReports(profile.org_id);
      setReports(data || []);
      createNotification(profile.org_id, { type: "report_submitted", title: "New Safety Report", body: `${profile.full_name} submitted a safety report`, link_tab: "reports", target_roles: ["admin", "safety_manager"] });
      updateReportEngagement().catch(e => console.error("Engagement update error:", e));
      setToast({ message: `${report.reportCode} submitted`, level: { bg: "rgba(34,211,238,0.15)", border: "rgba(34,211,238,0.4)", color: "#22D3EE" } }); setTimeout(() => setToast(null), 4000);
    }
  }, [profile, session, isOnline, updateReportEngagement]);

  // ── Update Report Status ──
  const STATUS_LABELS = { open: "Open", under_review: "Under Review", investigation: "Investigation", corrective_action: "Corrective Action", closed: "Closed" };
  const onReportStatusChange = useCallback(async (reportId, newStatus) => {
    if (isOnline && profile) {
      await updateReport(reportId, { status: newStatus, closed_at: newStatus === "closed" ? new Date().toISOString() : null });
      const { data } = await fetchReports(profile.org_id);
      setReports(data || []);
      // Notify reporter
      const rpt = (data || []).find(r => r.id === reportId);
      if (rpt?.reporter_id && rpt.reporter_id !== session.user.id) {
        createNotification(profile.org_id, { type: "report_status_update", title: "Report Status Updated", body: `Your report ${rpt.report_code} is now: ${STATUS_LABELS[newStatus] || newStatus}`, link_tab: "reports", target_user_id: rpt.reporter_id });
      }
    }
  }, [profile, session, isOnline]);

  // ── Create Hazard ──
  const onCreateHazard = useCallback(async (hazard) => {
    if (isOnline && profile) {
      const { error } = await createHazard(profile.org_id, session.user.id, hazard);
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchHazards(profile.org_id);
      setHazards(data || []);
      // Auto-advance linked report to "investigation"
      if (hazard.relatedReportId) {
        await updateReport(hazard.relatedReportId, { status: "investigation" });
        const { data: rpts } = await fetchReports(profile.org_id);
        setReports(rpts || []);
        const rpt = (rpts || []).find(r => r.id === hazard.relatedReportId);
        if (rpt?.reporter_id && rpt.reporter_id !== session.user.id) {
          createNotification(profile.org_id, { type: "report_status_update", title: "Report Status Updated", body: `Your report ${rpt.report_code} is now: Investigation`, link_tab: "reports", target_user_id: rpt.reporter_id });
        }
      }
      createNotification(profile.org_id, { type: "investigation_created", title: "New Investigation", body: `Investigation opened: ${hazard.title || hazard.hazardCode || "Untitled"}`, link_tab: "hazards", target_roles: ["admin", "safety_manager"] });
      setToast({ message: `${hazard.hazardCode} registered`, level: { bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)", color: "#FACC15" } }); setTimeout(() => setToast(null), 4000);
    }
  }, [profile, session, isOnline]);

  // ── Update Hazard ──
  const onUpdateHazard = useCallback(async (hazardId, updates) => {
    if (isOnline && profile) {
      await updateHazard(hazardId, updates);
      const { data } = await fetchHazards(profile.org_id);
      setHazards(data || []);
      // If closing hazard, cascade-close linked report + notify reporter
      if (updates.status === "closed") {
        const hazard = (data || []).find(h => h.id === hazardId);
        if (hazard?.related_report_id) {
          await updateReport(hazard.related_report_id, { status: "closed", closed_at: new Date().toISOString() });
          const { data: rpts } = await fetchReports(profile.org_id);
          setReports(rpts || []);
          const rpt = (rpts || []).find(r => r.id === hazard.related_report_id);
          if (rpt?.reporter_id && rpt.reporter_id !== session.user.id) {
            createNotification(profile.org_id, { type: "report_status_update", title: "Report Closed", body: `Your report ${rpt.report_code} has been closed`, link_tab: "reports", target_user_id: rpt.reporter_id });
          }
        }
      }
    }
  }, [profile, session, isOnline]);

  // ── Corrective Actions ──
  const onCreateAction = useCallback(async (action) => {
    if (isOnline && profile) {
      const { error } = await createAction(profile.org_id, action);
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchActions(profile.org_id);
      setActions(data || []);
      // Auto-advance linked report to "corrective_action"
      if (action.reportId) {
        const actionText = action.title || "Corrective action created";
        await updateReport(action.reportId, { status: "corrective_action", investigation_notes: `Corrective action: ${actionText}` });
        const { data: rpts } = await fetchReports(profile.org_id);
        setReports(rpts || []);
        const rpt = (rpts || []).find(r => r.id === action.reportId);
        if (rpt?.reporter_id && rpt.reporter_id !== session.user.id) {
          createNotification(profile.org_id, { type: "report_status_update", title: "Report Status Updated", body: `Your report ${rpt.report_code} is now: Corrective Action — ${actionText}`, link_tab: "reports", target_user_id: rpt.reporter_id });
        }
      }
      createNotification(profile.org_id, { type: "action_created", title: "New Corrective Action", body: `Corrective action created: ${action.title || action.actionCode || "Untitled"}`, link_tab: "actions", target_roles: ["admin", "safety_manager"] });
      // Notify assigned user
      if (action.assignedTo && action.assignedTo !== session.user.id) {
        createNotification(profile.org_id, { type: "action_assigned", title: "Corrective Action Assigned", body: `You have been assigned ${action.actionCode}: ${action.title}`, link_tab: "actions", target_user_id: action.assignedTo });
      }
      setToast({ message: `${action.actionCode} created`, level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ADE80" } }); setTimeout(() => setToast(null), 4000);
    }
  }, [profile, isOnline]);

  const onUpdateAction = useCallback(async (actionId, updates) => {
    if (isOnline && profile) {
      // If completing/cancelling, find linked report to auto-close
      if (updates.status === "completed" || updates.status === "cancelled") {
        const action = actions.find(a => a.id === actionId);
        if (action?.hazard_id) {
          const hazard = hazards.find(h => h.id === action.hazard_id);
          if (hazard?.related_report_id) {
            await updateReport(hazard.related_report_id, { status: "closed", closed_at: new Date().toISOString() });
            const { data: rpts } = await fetchReports(profile.org_id);
            setReports(rpts || []);
            const rpt = (rpts || []).find(r => r.id === hazard.related_report_id);
            if (rpt?.reporter_id && rpt.reporter_id !== session.user.id) {
              createNotification(profile.org_id, { type: "report_status_update", title: "Report Closed", body: `Your report ${rpt.report_code} has been closed`, link_tab: "reports", target_user_id: rpt.reporter_id });
            }
          }
        }
      }
      await updateAction(actionId, updates);
      const { data } = await fetchActions(profile.org_id);
      setActions(data || []);
    }
  }, [profile, isOnline, actions, hazards]);

  // ── Notification mark-read handlers ──
  const onMarkNotifRead = useCallback(async (notifId) => {
    if (!session?.user?.id) return;
    await markNotificationRead(notifId, session.user.id);
    setNotifReads(prev => [...prev, notifId]);
  }, [session]);

  const onMarkAllNotifsRead = useCallback(async () => {
    if (!session?.user?.id) return;
    const userRole = profile?.role || "pilot";
    const userId = profile?.id;
    const readSet = new Set(notifReads);
    const unread = notifications.filter(n => {
      if (readSet.has(n.id)) return false;
      if (n.target_user_id && n.target_user_id !== userId) return false;
      if (n.target_roles && n.target_roles.length > 0 && !n.target_roles.includes(userRole)) {
        if (n.target_user_id === userId) return true;
        return false;
      }
      return true;
    });
    await Promise.all(unread.map(n => markNotificationRead(n.id, session.user.id)));
    setNotifReads(prev => [...prev, ...unread.map(n => n.id)]);
  }, [session, profile, notifications, notifReads]);

  const onUpdateNotifPreferences = useCallback(async (prefs) => {
    if (!profile?.id) return;
    await updateNotificationPreferences(profile.id, prefs);
    setProfile(prev => prev ? { ...prev, notification_preferences: prefs } : prev);
  }, [profile]);

  // ── Admin: Update Role ──
  const onUpdateRole = useCallback(async (profileId, role) => {
    if (isOnline && profile) {
      await updateProfileRole(profileId, role);
      const { data } = await fetchOrgProfiles(profile.org_id);
      setOrgProfiles(data || []);
      // Auto-enroll in the correct onboarding course based on new role
      const orgId = profile.org_id;
      const onboardingTitle = role === "pilot" ? "Getting Started — Pilot Guide" : "Getting Started — Admin & Operations Guide";
      const matchingCourse = (cbtCourses || []).find(c => c.title === onboardingTitle && c.status === "published");
      if (matchingCourse) {
        await upsertCbtEnrollment(orgId, matchingCourse.id, profileId, { status: "enrolled" });
      }
    }
  }, [profile, isOnline, cbtCourses]);

  // ── Policy Library ──
  const onCreatePolicy = useCallback(async (policy) => {
    if (isOnline && profile) {
      let fileUrl = null, fileName = null;
      if (policy.file) {
        const { url, error: uploadErr } = await uploadPolicyFile(profile.org_id, policy.file);
        if (uploadErr) { setToast({ message: `Upload error: ${uploadErr.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
        fileUrl = url;
        fileName = policy.file.name;
      }
      const { error } = await createPolicy(profile.org_id, session.user.id, { ...policy, fileUrl, fileName });
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchPolicies(profile.org_id);
      setPolicies(data || []);
      createNotification(profile.org_id, { type: "policy_published", title: "New Policy Published", body: `${policy.title} has been published`, link_tab: "policy", target_roles: null });
      setToast({ message: "Document added", level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ADE80" } }); setTimeout(() => setToast(null), 3000);
    }
  }, [profile, session, isOnline]);

  const onAcknowledgePolicy = useCallback(async (policyId) => {
    if (isOnline && profile) {
      await acknowledgePolicy(profile.org_id, policyId, session.user.id);
      const { data } = await fetchPolicies(profile.org_id);
      setPolicies(data || []);
      updatePolicyEngagement().catch(e => console.error("Engagement update error:", e));
    }
  }, [profile, session, isOnline, updatePolicyEngagement]);

  // ── Training ──
  const onCreateRequirement = useCallback(async (req) => {
    if (isOnline && profile) {
      const { error } = await createTrainingRequirement(profile.org_id, req);
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchTrainingRequirements(profile.org_id);
      setTrainingReqs(data || []);
    }
  }, [profile, isOnline]);

  const onLogTraining = useCallback(async (record) => {
    if (isOnline && profile) {
      const { error } = await createTrainingRecord(profile.org_id, session.user.id, record);
      if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); return; }
      const { data } = await fetchTrainingRecords(profile.org_id);
      setTrainingRecs(data || []);
      updateTrainingEngagement().catch(e => console.error("Engagement update error:", e));
      setToast({ message: "Training logged", level: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ADE80" } }); setTimeout(() => setToast(null), 3000);
    }
  }, [profile, session, isOnline, updateTrainingEngagement]);

  const onDeleteTrainingRecord = useCallback(async (id) => {
    if (isOnline && profile) {
      await deleteTrainingRecord(id);
      const { data } = await fetchTrainingRecords(profile.org_id);
      setTrainingRecs(data || []);
    }
  }, [profile, isOnline]);

  const onDeleteRequirement = useCallback(async (id) => {
    if (isOnline && profile) {
      await deleteTrainingRequirement(id);
      const { data } = await fetchTrainingRequirements(profile.org_id);
      setTrainingReqs(data || []);
    }
  }, [profile, isOnline]);

  // ── CBT ──
  const refreshCbt = useCallback(async () => {
    if (!profile) return;
    const orgId = profile.org_id;
    const { data: courses } = await fetchCbtCourses(orgId);
    setCbtCourses(courses || []);
    (courses || []).forEach(c => {
      fetchCbtLessons(c.id).then(({ data: lessons }) => {
        setCbtLessonsMap(prev => ({ ...prev, [c.id]: lessons || [] }));
      });
    });
    const { data: prog } = await fetchCbtProgress(orgId);
    setCbtProgress(prog || []);
    const { data: enr } = await fetchCbtEnrollments(orgId);
    setCbtEnrollments(enr || []);
  }, [profile]);

  const onCreateCbtCourse = useCallback(async (course) => {
    if (!isOnline || !profile) return;
    const { error } = await createCbtCourse(profile.org_id, session.user.id, course);
    if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); }
  }, [profile, session, isOnline]);

  const onUpdateCbtCourse = useCallback(async (courseId, updates) => {
    if (!isOnline) return;
    const { error } = await updateCbtCourse(courseId, updates);
    if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); }
  }, [isOnline]);

  const onSaveCbtLesson = useCallback(async (courseId, lesson) => {
    if (!isOnline || !profile) return;
    const { error } = await upsertCbtLesson(profile.org_id, courseId, lesson);
    if (error) { setToast({ message: `Error: ${error.message}`, level: DEFAULT_RISK_LEVELS.CRITICAL }); setTimeout(() => setToast(null), 4000); }
  }, [profile, isOnline]);

  const onDeleteCbtLesson = useCallback(async (lessonId) => {
    if (!isOnline) return;
    await deleteCbtLesson(lessonId);
  }, [isOnline]);

  const onUpdateCbtProgress = useCallback(async (courseId, lessonId, prog) => {
    if (!isOnline || !profile) return;
    await upsertCbtProgress(profile.org_id, courseId, lessonId, session.user.id, prog);
  }, [profile, session, isOnline]);

  const onUpdateCbtEnrollment = useCallback(async (courseId, enrollment) => {
    if (!isOnline || !profile) return;
    await upsertCbtEnrollment(profile.org_id, courseId, session.user.id, enrollment);
  }, [profile, session, isOnline]);

  const onInitTraining = useCallback(async (requirements, courses) => {
    if (!isOnline || !profile) return;
    const orgId = profile.org_id;
    const userId = session.user.id;
    for (const req of requirements) {
      await createTrainingRequirement(orgId, req);
    }
    const createdCourses = [];
    for (const tmpl of courses) {
      const { lessons: lessonTmpls, ...courseData } = tmpl;
      const { data: course, error } = await createCbtCourse(orgId, userId, { ...courseData, status: "draft" });
      if (error || !course) continue;
      for (const lesson of lessonTmpls) {
        await upsertCbtLesson(orgId, course.id, lesson);
      }
      await updateCbtCourse(course.id, { status: "published" });
      createdCourses.push(course);
    }
    // Auto-enroll existing users in onboarding courses
    const pilotCourse = createdCourses.find(c => c.title === "Getting Started — Pilot Guide");
    const adminCourse = createdCourses.find(c => c.title === "Getting Started — Admin & Operations Guide");
    if (pilotCourse || adminCourse) {
      const { data: allProfiles } = await fetchOrgProfiles(orgId);
      for (const p of (allProfiles || [])) {
        const target = p.role === "pilot" ? pilotCourse : adminCourse;
        if (target) await upsertCbtEnrollment(orgId, target.id, p.id, { status: "enrolled" });
      }
    }
    const { data: reqs } = await fetchTrainingRequirements(orgId);
    setTrainingReqs(reqs || []);
    await refreshCbt();
    setToast({ message: "Part 5 training program initialized", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
    setTimeout(() => setToast(null), 3000);
  }, [profile, session, isOnline, refreshCbt]);

  // Detect password recovery redirect (Supabase sets session + hash contains type=recovery)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    if (hash.includes("type=recovery") || params.has("reset")) {
      setIsPasswordRecovery(true);
    }
  }, []);

  // Orphan invite: user has session but no profile and arrived via invite link
  const [orphanInviteProcessing, setOrphanInviteProcessing] = useState(false);
  const orphanInviteToken = (isOnline && session && !authLoading && !profileLoading && !profile && typeof window !== "undefined") ? new URLSearchParams(window.location.search).get("invite") : null;
  useEffect(() => {
    if (!orphanInviteToken || orphanInviteProcessing) return;
    setOrphanInviteProcessing(true);
    (async () => {
      try {
        const { data: inv, error: invErr } = await getInvitationByToken(orphanInviteToken);
        if (invErr || !inv) { setOrphanInviteProcessing(false); return; }
        const userId = session.user.id;
        const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", userId).single();
        if (existingProfile) {
          await supabase.from("profiles").update({ org_id: inv.org_id, role: inv.role }).eq("id", userId);
        } else {
          await supabase.from("profiles").insert({ id: userId, org_id: inv.org_id, full_name: session.user.user_metadata?.full_name || session.user.email, email: session.user.email, role: inv.role });
        }
        await acceptInvitation(orphanInviteToken, userId);
        // Auto-enroll in onboarding course based on role
        try {
          const { data: orgCourses } = await fetchCbtCourses(inv.org_id);
          const onboardingTitle = inv.role === "pilot" ? "Getting Started — Pilot Guide" : "Getting Started — Admin & Operations Guide";
          const onboardingCourse = (orgCourses || []).find(c => c.title === onboardingTitle && c.status === "published");
          if (onboardingCourse) await upsertCbtEnrollment(inv.org_id, onboardingCourse.id, userId, { status: "enrolled" });
        } catch (_) { /* enrollment is best-effort */ }
        if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
        const p = await getProfile();
        setProfile(p);
      } catch (e) { console.error("Orphan invite error:", e); }
      setOrphanInviteProcessing(false);
    })();
  }, [orphanInviteToken]);

  if (authLoading) return <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: MUTED, fontSize: 14 }}>Loading...</div></div>;

  // Show reset password form even if session exists (recovery flow)
  if (isPasswordRecovery) {
    return <AuthScreen onAuth={(s) => { setIsPasswordRecovery(false); setSession(s); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); }} initialMode="reset_password" />;
  }

  if (isOnline && !session && !profile) {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (params?.has("signup")) return <SignupFlow onAuth={setSession} />;
    if (params?.has("invite")) return <InviteAcceptScreen token={params.get("invite")} onAuth={setSession} />;
    return <AuthScreen onAuth={setSession} />;
  }

  if (isOnline && networkOnline && session && !authLoading && !profileLoading && !profile) {
    if (orphanInviteProcessing) {
      return <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: MUTED, fontSize: 14 }}>Joining organization...</div></div>;
    }
    // If they arrived via invite link, show the invite accept screen
    const inviteParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (inviteParams?.has("invite")) {
      return <InviteAcceptScreen token={inviteParams.get("invite")} onAuth={async (sess) => {
        setSession(sess);
        const p = await getProfile();
        setProfile(p);
      }} />;
    }
    return (
      <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...card, padding: 48, maxWidth: 440, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${AMBER}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 28 }}>{"\u26A0"}</span></div>
          <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 8px", fontSize: 20 }}>No Organization Found</h2>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "0 0 24px" }}>Your account is not associated with any organization. You may have been removed, or your organization no longer exists. Contact your administrator or join a new organization.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={async () => { await signOut(); setSession(null); setProfile(null); }} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  const subStatus = profile?.organizations?.subscription_status || "active";
  const isSuspended = subStatus === "suspended";
  const isCanceled = subStatus === "canceled";
  const isPastDue = subStatus === "past_due";
  const isTrial = subStatus === "trial";
  const isFree = subStatus === "free" || isFreeTier(profile?.organizations);

  // Trial expiration check — free tier never expires
  const trialCreatedAt = profile?.organizations?.created_at ? new Date(profile.organizations.created_at) : null;
  const trialDaysElapsed = trialCreatedAt ? Math.floor((Date.now() - trialCreatedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const trialDaysRemaining = Math.max(0, 14 - trialDaysElapsed);
  const isTrialExpired = isTrial && !isFree && trialDaysElapsed >= 14;
  const isTrialActive = isTrial && !isTrialExpired;

  const isReadOnly = !isFree && (isCanceled || isSuspended || isPastDue || isTrialExpired);

  // Fully blocked — suspended
  if (isSuspended) return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, padding: 48, maxWidth: 440, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${RED}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 28 }}>{"\u26D4"}</span></div>
        <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 8px", fontSize: 20 }}>Account Suspended</h2>
        <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "0 0 24px" }}>This organization&apos;s subscription has been suspended. Please contact your administrator or support to restore access.</p>
        <button onClick={async () => { await signOut(); setSession(null); setProfile(null); }} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign Out</button>
      </div>
    </div>
  );

  // Trial expired — force admin users to subscription tab, block non-admins
  if (isTrialExpired) {
    const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
    if (!isAdmin) return (
      <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...card, padding: 48, maxWidth: 440, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: NEAR_BLACK, border: `1px solid ${AMBER}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 28 }}>{"\u23F0"}</span></div>
          <h2 style={{ color: WHITE, fontFamily: "Georgia,serif", margin: "0 0 8px", fontSize: 20 }}>Trial Expired</h2>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, margin: "0 0 24px" }}>Your organization&apos;s free trial has ended. Contact your administrator to subscribe and restore access.</p>
          <button onClick={async () => { await signOut(); setSession(null); setProfile(null); }} style={{ padding: "10px 24px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>
    );
    // Admin — force to subscription tab
    if (cv !== "admin") setCv("admin");
  }

  const orgName = profile?.organizations?.name || COMPANY_NAME;
  const orgLogo = profile?.organizations?.logo_url || LOGO_URL;
  const userName = profile?.full_name || "";
  const needsAuth = !isOnline && ["history", "dashboard", "export"].includes(cv) && !isAuthed;

  // Onboarding handlers
  const handleSubTabChange = (component, value) => {
    setTourSubTabs(prev => ({ ...prev, [component]: value }));
  };
  const handleTourStart = () => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = buildTourSeedData(today, userName, fleetAircraft);
    setRecords(seed.records);
    setFlights(seed.flights);
    setReports(seed.reports);
    setHazards(seed.hazards);
    setActions(seed.actions);
    setPolicies(seed.policies);
    setTrainingReqs(seed.trainingReqs);
    setTrainingRecs(seed.trainingRecs);
    setCbtCourses(seed.cbtCourses);
    setSmsManuals(seed.smsManuals);
  };
  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    setTourSubTabs({});
    setCv("dashboard");
    if (session?.user?.id) localStorage.setItem(`preflightsms_onboarding_${session.user.id}`, "completed");
    if (profile?.org_id) {
      refreshAllData(profile.org_id);
      if (isAdmin) {
        await saveOnboardingStatus(profile.org_id, { onboarding_completed: true });
        setProfile(prev => prev ? { ...prev, organizations: { ...prev.organizations, settings: { ...(prev.organizations?.settings || {}), onboarding_completed: true } } } : prev);
      }
    }
  };
  const handleOnboardingDismiss = async () => {
    setShowOnboarding(false);
    setTourSubTabs({});
    setCv("dashboard");
    if (session?.user?.id) localStorage.setItem(`preflightsms_onboarding_${session.user.id}`, "skipped");
    if (profile?.org_id) {
      refreshAllData(profile.org_id);
      if (isAdmin) {
        await saveOnboardingStatus(profile.org_id, { onboarding_completed: true, onboarding_skipped: true });
        setProfile(prev => prev ? { ...prev, organizations: { ...prev.organizations, settings: { ...(prev.organizations?.settings || {}), onboarding_completed: true, onboarding_skipped: true } } } : prev);
      }
    }
  };

  // Read-only guard for canceled subscriptions
  const roGuard = (fn) => isReadOnly ? (...args) => { setToast({ message: isTrialExpired ? "Your trial has expired — subscribe to continue" : "Read-only mode — subscription " + subStatus, level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 3000); } : fn;

  // Free tier limit helpers
  const showUpgrade = (feature, message) => setUpgradePrompt({ feature, message });
  const freeGuard = (fn, feature, limitCheck, limitMsg) => {
    if (!isFree) return fn;
    return (...args) => {
      if (limitCheck && limitCheck()) { showUpgrade(feature, limitMsg); return; }
      return fn(...args);
    };
  };
  if (isMobile) return (
    <><Head><title>{orgName} SMS - PreflightSMS</title><meta name="theme-color" content="#000000" /><link rel="icon" type="image/png" href="/favicon.png" /><link rel="icon" href="/favicon.ico" /><link rel="manifest" href="/manifest.json" /><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" /></Head>
    <MobileLayout session={session} profile={profile} orgData={profile?.organizations || {}} notifications={notifications} notifReads={notifReads} onMarkNotifRead={onMarkNotifRead} onMarkAllNotifsRead={onMarkAllNotifsRead} onSignOut={async () => { await signOut(); setSession(null); setProfile(null); setRecords([]); setFlights([]); setReports([]); setHazards([]); setActions([]); setOrgProfiles([]); setPolicies([]); setTrainingReqs([]); setTrainingRecs([]); setCbtCourses([]); setCbtLessonsMap({}); setCbtProgress([]); setCbtEnrollments([]); setSmsManuals([]); setTemplateVariables({}); setSmsSignatures({}); }} flights={flights} onUpdateFlight={roGuard(onUpdateFlight)} onSubmitFRAT={roGuard(onSubmit)} fleetAircraft={fleetAircraft} fratTemplate={fratTemplate} allFratTemplates={fratTemplates} riskLevels={riskLevels} nudgeFlight={nudgeFlight} onNudgeSubmitReport={onNudgeSubmitReport} onNudgeDismiss={onNudgeDismiss} reportPrefill={reportPrefill} setReportPrefill={setReportPrefill} reports={reports} onSubmitReport={roGuard(onSubmitReport)} cbtCourses={cbtCourses} cbtLessonsMap={cbtLessonsMap} cbtProgress={cbtProgress} cbtEnrollments={cbtEnrollments} trainingReqs={trainingReqs} trainingRecs={trainingRecs} onUpdateCbtProgress={roGuard(onUpdateCbtProgress)} onUpdateCbtEnrollment={roGuard(onUpdateCbtEnrollment)} onLogTraining={roGuard(onLogTraining)} refreshCbt={refreshCbt} hazards={hazards} actions={actions} onUpdateAction={roGuard(onUpdateAction)} onUpdateAircraftStatus={roGuard(async (id, statusFields) => { await updateAircraftStatus(id, statusFields); const { data } = await fetchAircraft(profile?.org_id); setFleetAircraft(data || []); })} erpPlans={erpPlans} onLoadErpChecklist={async (planId) => { const { data } = await fetchErpChecklistItems(planId); return data || []; }} onLoadErpCallTree={async (planId) => { const { data } = await fetchErpCallTree(planId); return data || []; }} policies={policies} onAcknowledgePolicy={roGuard(onAcknowledgePolicy)} hasFlights={!!hasFeature(org, "flight_following")} hasTraining={!!hasFeature(org, "cbt_modules")} onUpdatePreferences={onUpdateNotifPreferences} onUpdateEmail={async (newEmail) => { await updateProfileEmail(profile.id, newEmail); const p = await getProfile(); if (p) setProfile(p); }} org={org} orgProfiles={orgProfiles} records={records} /></>
  );
  return (
    <><Head><title>{orgName} SMS - PreflightSMS</title><meta name="theme-color" content="#000000" /><link rel="icon" type="image/png" href="/favicon.png" /><link rel="icon" href="/favicon.ico" /><link rel="manifest" href="/manifest.json" /><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" /></Head>
    {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} onDismiss={handleOnboardingDismiss} onTourStart={handleTourStart} onSubTabChange={handleSubTabChange} setCv={setCv} fleetAircraft={fleetAircraft} onAddAircraft={async (record) => { const orgId = profile?.org_id; if (!orgId) return; await createAircraft(orgId, record); const { data } = await fetchAircraft(orgId); setFleetAircraft(data || []); }} onInviteUser={async (email, role) => { const orgId = profile?.org_id; if (!orgId) return { error: "No org" }; const { data, error } = await createInvitation(orgId, email, role, session.user.id); if (error) return { error: error.message }; try { await supabase.functions.invoke('send-invite', { body: { email, orgName, role, token: data.token } }); } catch (e) { console.error("Invite email error:", e); } fetchInvitations(orgId).then(({ data: inv }) => setInvitationsList(inv || [])); return { success: true }; }} orgName={orgName} userName={userName} org={org} orgSlug={profile?.organizations?.slug || ""} userRole={profile?.role} />}
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <NavBar currentView={cv} setCurrentView={setCv} isAuthed={isAuthed || isOnline} orgLogo={orgLogo} orgName={orgName} userName={userName} org={profile?.organizations || {}} userRole={profile?.role} onSignOut={async () => { await signOut(); setSession(null); setProfile(null); setRecords([]); setFlights([]); setReports([]); setHazards([]); setActions([]); setOrgProfiles([]); setPolicies([]); setTrainingReqs([]); setTrainingRecs([]); setCbtCourses([]); setCbtLessonsMap({}); setCbtProgress([]); setCbtEnrollments([]); setSmsManuals([]); setTemplateVariables({}); setSmsSignatures({}); }} notifications={notifications} notifReads={notifReads} onMarkNotifRead={onMarkNotifRead} onMarkAllNotifsRead={onMarkAllNotifsRead} profile={profile} isOnline={isOnline} session={session} onNotifNavigate={(tab, linkId) => { if (linkId) { if (profile?.org_id) refreshAllData(profile.org_id); setFratDetailId(linkId); } else { setCv(tab); } }} onUpgrade={(feature, message) => setUpgradePrompt({ feature, message })} onSwitchToMobile={isMobileViewport ? () => setDesktopPreference(false) : undefined} onUpdatePreferences={onUpdateNotifPreferences} />
      <div className="main-content" style={{ marginLeft: 140 }}>
        {/* Top bar with user info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px 0" }}>
          <div>
            <h1 style={{ margin: 0, color: WHITE, fontSize: 22, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
              {(() => { const sec = getSection(cv); if (sec.cvs.length > 1) return sec.label.toUpperCase(); return cv === "dashboard" ? "SAFETY DASHBOARD" : cv === "audits" ? "AUDITS & COMPLIANCE" : cv === "cbt" ? "TRAINING" : cv === "policy" ? "DOCUMENTS" : cv === "admin" ? "ADMIN" : ""; })()}
            </h1>
          </div>
          <div className="user-info-desktop" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {pendingSync > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: YELLOW, background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)", padding: "2px 8px", borderRadius: 10, cursor: "pointer" }} onClick={() => flushQueue()} title="Click to retry sync">{pendingSync} pending</span>}
            {isOnline && session && (<>
              <NotificationCenter notifications={notifications} reads={notifReads} onMarkRead={onMarkNotifRead} onMarkAllRead={onMarkAllNotifsRead} profile={profile} onNavigate={(tab, linkId) => { if (linkId) { if (profile?.org_id) refreshAllData(profile.org_id); setFratDetailId(linkId); } else { setCv(tab); } }} onUpdatePreferences={onUpdateNotifPreferences} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                  <span style={{ fontSize: 11, color: MUTED }}>{userName}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 50, background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 12, fontWeight: 700 }}>{(userName || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                </div>
                {showProfileMenu && <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setShowProfileMenu(false)} />
                  <div style={{ position: "absolute", top: 42, right: 0, zIndex: 1000, width: 280, background: "#161616", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.6)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 4 }}>{userName}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 12 }}>{profile?.role || "member"}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Email</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="you@example.com"
                        style={{ flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 12, background: "#000", color: "#E5E5E5", border: `1px solid ${BORDER}`, boxSizing: "border-box" }} />
                      <button disabled={savingProfileEmail || profileEmail === (profile?.email || "")} onClick={async () => { setSavingProfileEmail(true); await updateProfileEmail(profile.id, profileEmail); const p = await getProfile(); if (p) setProfile(p); setSavingProfileEmail(false); }}
                        style={{ padding: "6px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: savingProfileEmail || profileEmail === (profile?.email || "") ? "default" : "pointer",
                          background: savingProfileEmail || profileEmail === (profile?.email || "") ? "transparent" : "rgba(74,222,128,0.13)", color: savingProfileEmail || profileEmail === (profile?.email || "") ? MUTED : GREEN,
                          border: `1px solid ${savingProfileEmail || profileEmail === (profile?.email || "") ? BORDER : "rgba(74,222,128,0.27)"}` }}>{savingProfileEmail ? "…" : "Save"}</button>
                    </div>
                    {isMobileViewport && <button onClick={() => { setShowProfileMenu(false); setDesktopPreference(false); }}
                      style={{ width: "100%", fontSize: 12, color: "#22D3EE", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 6, padding: "10px", cursor: "pointer", fontWeight: 700, marginBottom: 8 }}>Switch to Mobile View</button>}
                    <button onClick={async () => { setShowProfileMenu(false); await signOut(); setSession(null); setProfile(null); setRecords([]); setFlights([]); setReports([]); setHazards([]); setActions([]); setOrgProfiles([]); setPolicies([]); setTrainingReqs([]); setTrainingRecs([]); setCbtCourses([]); setCbtLessonsMap({}); setCbtProgress([]); setCbtEnrollments([]); setSmsManuals([]); setTemplateVariables({}); setSmsSignatures({}); setNotifications([]); setNotifReads([]); }}
                      style={{ width: "100%", fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}>Log out</button>
                  </div>
                </>}
              </div>
            </>)}
          </div>
        </div>
        {(() => {
          const sec = getSection(cv);
          if (sec.cvs.length <= 1) return null;
          return (
            <div style={{ display: "flex", gap: 4, marginBottom: 0, flexWrap: "wrap", padding: "8px 32px 0" }}>
              {sec.cvs.map(c => {
                const feat = NAV_FEATURE_MAP[c];
                const isGated = feat && !hasFeature(org, feat);
                return (
                <button key={c} onClick={() => {
                    if (isGated) { setUpgradePrompt({ feature: SUB_TAB_LABELS[c], message: `${SUB_TAB_LABELS[c]} is not available on your current plan. Upgrade to access this feature.` }); }
                    else { setCv(c); }
                  }}
                  style={{ padding: "8px 16px", borderRadius: 6,
                    border: `1px solid ${cv === c ? WHITE : BORDER}`,
                    background: cv === c ? WHITE : "transparent",
                    color: isGated ? "#444" : cv === c ? BLACK : MUTED,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    opacity: isGated ? 0.6 : 1 }}>
                  {SUB_TAB_LABELS[c]}{isGated ? " \uD83D\uDD12" : ""}
                </button>);
              })}
            </div>
          );
        })()}
        {toast && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, padding: "10px 18px", borderRadius: 8, background: toast.level.bg, border: `1px solid ${toast.level.border}`, color: toast.level.color, fontWeight: 700, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>{toast.message}</div>}
        {nudgeFlight && <PostFlightNudge flight={nudgeFlight} onSubmitReport={onNudgeSubmitReport} onNothingToReport={onNudgeNothingToReport} onRemindLater={onNudgeRemindLater} onDismiss={onNudgeDismiss} />}
        {fratDetailId && <FRATDetailModal fratId={fratDetailId} records={records} flights={flights} riskCategories={riskCategories} canApprove={["admin","safety_manager","accountable_exec","chief_pilot"].includes(profile?.role) || (profile?.permissions || []).includes("approver")} onApproveFlight={async (flightDbId, fratDbId) => { setFlights(prev => prev.map(f => f.dbId === flightDbId ? { ...f, status: "ACTIVE", approvalStatus: "approved", approvedAt: new Date().toISOString() } : f)); if (fratDbId) setRecords(prev => prev.map(r => r.dbId === fratDbId ? { ...r, approvalStatus: "approved" } : r)); setToast({ message: "Flight approved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); await approveFlight(flightDbId, session.user.id); if (fratDbId) await approveRejectFRAT(fratDbId, session.user.id, "approved", ""); deleteNotificationByLinkId(profile.org_id, fratDetailId); setNotifications(prev => prev.filter(n => n.link_id !== fratDetailId)); const { data: fl } = await fetchFlights(profile.org_id); setFlights(prev => mapDbFlights(fl, prev)); }} onRejectFlight={async (flightDbId, fratDbId) => { const fratRecord = fratDbId ? records.find(r => r.dbId === fratDbId) : null; await deleteFlight(flightDbId); if (fratDbId) await approveRejectFRAT(fratDbId, session.user.id, "rejected", ""); deleteNotificationByLinkId(profile.org_id, fratDetailId); setNotifications(prev => prev.filter(n => n.link_id !== fratDetailId)); if (fratRecord?.userId) { createNotification(profile.org_id, { type: "frat_rejected", title: "FRAT Rejected", body: `Your FRAT ${fratDetailId} was rejected`, target_user_id: fratRecord.userId, link_tab: "submit" }); } const { data: fl } = await fetchFlights(profile.org_id); setFlights(prev => mapDbFlights(fl, prev)); const { data: frats } = await fetchFRATs(profile.org_id); setRecords(frats.map(r => ({ id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number, departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt, date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs, fuelUnit: r.fuel_unit || "lbs", numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level, factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at, approvalStatus: r.approval_status, userId: r.user_id }))); setToast({ message: "Flight rejected and removed", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 3000); }} onApproveFRAT={async (fratDbId) => { const matchedFlight = flights.find(f => f.fratDbId === fratDbId); setFlights(prev => prev.map(f => f.fratDbId === fratDbId ? { ...f, status: "ACTIVE", approvalStatus: "approved", approvedAt: new Date().toISOString() } : f)); setRecords(prev => prev.map(r => r.dbId === fratDbId ? { ...r, approvalStatus: "approved" } : r)); setToast({ message: "FRAT approved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); await approveRejectFRAT(fratDbId, session.user.id, "approved", ""); if (matchedFlight) await approveFlight(matchedFlight.dbId, session.user.id); deleteNotificationByLinkId(profile.org_id, fratDetailId); setNotifications(prev => prev.filter(n => n.link_id !== fratDetailId)); const { data: frats } = await fetchFRATs(profile.org_id); setRecords(frats.map(r => ({ id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number, departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt, date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs, fuelUnit: r.fuel_unit || "lbs", numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level, factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at, approvalStatus: r.approval_status, userId: r.user_id }))); const { data: fl } = await fetchFlights(profile.org_id); setFlights(prev => mapDbFlights(fl, prev)); }} onRejectFRAT={async (fratDbId) => { await approveRejectFRAT(fratDbId, session.user.id, "rejected", ""); deleteNotificationByLinkId(profile.org_id, fratDetailId); setNotifications(prev => prev.filter(n => n.link_id !== fratDetailId)); const { data: frats } = await fetchFRATs(profile.org_id); setRecords(frats.map(r => ({ id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number, departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt, date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs, fuelUnit: r.fuel_unit || "lbs", numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level, factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at, approvalStatus: r.approval_status, userId: r.user_id }))); setToast({ message: "FRAT rejected", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 3000); }} onClose={() => setFratDetailId(null)} />}
        {upgradePrompt && <UpgradePrompt feature={upgradePrompt.feature} message={upgradePrompt.message} onNavigateToSubscription={() => { setUpgradePrompt(null); setInitialAdminTab("subscription"); setCv("admin"); }} onDismiss={() => setUpgradePrompt(null)} />}
        {isPastDue && <div style={{ margin: "12px 32px 0", padding: "10px 16px", borderRadius: 8, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.25)", color: YELLOW, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>{"\u26A0"} Your subscription payment is past due. Update your payment method to restore access.</span>{isAdmin && <button onClick={async () => { const customerId = org?.stripe_customer_id; if (!customerId) return; const { data } = await supabase.functions.invoke('stripe-portal', { body: { customerId, returnUrl: window.location.origin } }); if (data?.url) window.location.href = data.url; }} style={{ background: "none", border: "1px solid currentColor", borderRadius: 4, color: "inherit", fontSize: 10, fontWeight: 700, padding: "3px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>Update Payment</button>}</div>}
        {isCanceled && <div style={{ margin: "12px 32px 0", padding: "10px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: RED, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>{"\u26D4"} Subscription canceled — this account is in read-only mode. Contact your administrator to restore full access.</div>}
        {isTrialActive && <div className="trial-banner" style={{ margin: "12px 32px 0", padding: "10px 16px", borderRadius: 8, background: trialDaysRemaining <= 3 ? "rgba(245,158,11,0.08)" : "rgba(34,211,238,0.08)", border: `1px solid ${trialDaysRemaining <= 3 ? "rgba(245,158,11,0.25)" : "rgba(34,211,238,0.25)"}`, color: trialDaysRemaining <= 3 ? AMBER : CYAN, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>{trialDaysRemaining <= 3 ? "\u26A0" : "\u2139\uFE0F"} Free trial — {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining</span><button onClick={() => { setInitialAdminTab("subscription"); setCv("admin"); }} style={{ background: "none", border: `1px solid currentColor`, borderRadius: 4, color: "inherit", fontSize: 10, fontWeight: 700, padding: "3px 10px", cursor: "pointer" }}>Subscribe</button></div>}
        {isFree && <div className="trial-banner" style={{ margin: "12px 32px 0", padding: "10px 16px", borderRadius: 8, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", color: CYAN, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>Free Plan — 1 aircraft, basic SMS features</span><button onClick={() => { setInitialAdminTab("subscription"); setCv("admin"); }} style={{ background: "none", border: "1px solid currentColor", borderRadius: 4, color: "inherit", fontSize: 10, fontWeight: 700, padding: "3px 10px", cursor: "pointer" }}>Upgrade</button></div>}
        <main style={{ padding: "20px 32px 50px" }}>
        {cv === "submit" && (isReadOnly
          ? <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center", ...card, padding: 36 }}><div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Read-Only Mode</div><div style={{ fontSize: 12, color: MUTED }}>{isTrialExpired ? "Your free trial has expired. Subscribe to resume submitting FRATs." : `New FRAT submissions are disabled while your subscription is ${subStatus}.`}</div></div>
          : <FRATForm onSubmit={onSubmit} onNavigate={(view) => setCv(view)} riskCategories={riskCategories} riskLevels={riskLevels} orgId={profile?.org_id} userName={userName} allTemplates={fratTemplates} activeTemplate={fratTemplate} fleetAircraft={fleetAircraft} pendingFfFlights={pendingFfFlights} selectedFfFlight={selectedFfFlight} onSelectFfFlight={setSelectedFfFlight} onClearFfFlight={() => setSelectedFfFlight(null)} pendingScTrips={pendingScTrips} selectedScTrip={selectedScTrip} onSelectScTrip={setSelectedScTrip} onClearScTrip={() => setSelectedScTrip(null)} org={org} prefill={fratPrefill} onClearPrefill={() => setFratPrefill(null)} />)}
        {cv === "flights" && <FlightBoard flights={flights} foreflightFlights={foreflightFlights} schedaeroTrips={schedaeroTrips} onUpdateFlight={onUpdateFlight} initialSelectedFlight={showOnboarding ? "_seed_FLT001" : null} adsbEnabled={hasFeature(org, "adsb_tracking")} session={session} onApproveFlight={async (flightDbId, fratDbId) => {
          setFlights(prev => prev.map(f => f.dbId === flightDbId ? { ...f, status: "ACTIVE", approvalStatus: "approved", approvedAt: new Date().toISOString() } : f));
          if (fratDbId) setRecords(prev => prev.map(r => r.dbId === fratDbId ? { ...r, approvalStatus: "approved" } : r));
          setToast({ message: "Flight approved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000);
          await approveFlight(flightDbId, session.user.id);
          if (fratDbId) await approveRejectFRAT(fratDbId, session.user.id, "approved", "");
          const matchedFlight = flights.find(fl => fl.dbId === flightDbId);
          if (matchedFlight) { deleteNotificationByLinkId(profile.org_id, matchedFlight.id); setNotifications(prev => prev.filter(n => n.link_id !== matchedFlight.id)); }
          const { data: fl } = await fetchFlights(profile.org_id);
          setFlights(prev => mapDbFlights(fl, prev));
        }} onRejectFlight={async (flightDbId, fratDbId) => {
          const matchedFlight = flights.find(fl => fl.dbId === flightDbId);
          const fratRecord = fratDbId ? records.find(r => r.dbId === fratDbId) : null;
          await deleteFlight(flightDbId);
          if (fratDbId) await approveRejectFRAT(fratDbId, session.user.id, "rejected", "");
          if (matchedFlight) { deleteNotificationByLinkId(profile.org_id, matchedFlight.id); setNotifications(prev => prev.filter(n => n.link_id !== matchedFlight.id)); }
          if (fratRecord?.userId) {
            createNotification(profile.org_id, { type: "frat_rejected", title: "FRAT Rejected", body: `Your FRAT ${matchedFlight?.id || ""} was rejected`, target_user_id: fratRecord.userId, link_tab: "submit" });
          }
          const { data: fl } = await fetchFlights(profile.org_id);
          setFlights(prev => mapDbFlights(fl, prev));
          const { data: frats } = await fetchFRATs(profile.org_id);
          setRecords(frats.map(r => ({ id: r.frat_code, dbId: r.id, pilot: r.pilot, aircraft: r.aircraft, tailNumber: r.tail_number, departure: r.departure, destination: r.destination, cruiseAlt: r.cruise_alt, date: r.flight_date, etd: r.etd, ete: r.ete, eta: r.eta, fuelLbs: r.fuel_lbs, fuelUnit: r.fuel_unit || "lbs", numCrew: r.num_crew, numPax: r.num_pax, score: r.score, riskLevel: r.risk_level, factors: r.factors || [], wxBriefing: r.wx_briefing, remarks: r.remarks, attachments: r.attachments || [], timestamp: r.created_at, approvalStatus: r.approval_status, userId: r.user_id })));
          setToast({ message: "Flight rejected and removed", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 3000);
        }} canApprove={["admin","safety_manager","accountable_exec","chief_pilot"].includes(profile?.role) || (profile?.permissions || []).includes("approver")} onSelfDispatch={async (flightDbId, fratDbId) => {
          await selfDispatchFlight(flightDbId);
          if (fratDbId) await approveRejectFRAT(fratDbId, session.user.id, "pilot_dispatched", "Pilot self-dispatched");
          const matchingFlight = flights.find(fl => fl.dbId === flightDbId);
          const { data: fl } = await fetchFlights(profile.org_id);
          setFlights(prev => mapDbFlights(fl, prev));
          createNotification(profile.org_id, { type: "frat_self_dispatched", title: "Pilot Self-Dispatched", body: `${matchingFlight?.pilot || userName} self-dispatched ${matchingFlight?.id || "flight"} (${matchingFlight?.riskLevel || "HIGH"} risk) — ${matchingFlight?.departure || "?"} to ${matchingFlight?.destination || "?"}`, link_tab: "flights", target_roles: ["admin", "safety_manager"] });
          setToast({ message: "Flight self-dispatched — flagged for review", level: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: AMBER } }); setTimeout(() => setToast(null), 3000);
        }} />}
        {cv === "fleet" && <DashboardCharts flights={flights} view="fleet" fleetAircraft={fleetAircraft} fleetStatusFields={org?.fleet_status_fields} onUpdateAircraftStatus={roGuard(async (id, statusFields) => { await updateAircraftStatus(id, statusFields); const { data } = await fetchAircraft(profile?.org_id); setFleetAircraft(data || []); })} />}
        {cv === "reports" && (() => { const canManageReports = ["admin","safety_manager","accountable_exec","chief_pilot"].includes(profile?.role); const visibleReports = canManageReports ? reports : reports.filter(r => r.reporter_id === session?.user?.id); return <SafetyReporting profile={profile} session={session} onSubmitReport={roGuard(onSubmitReport)} reports={visibleReports} onStatusChange={canManageReports ? roGuard(onReportStatusChange) : null} hazards={hazards} onCreateHazardFromReport={canManageReports ? (report) => { setHazardFromReport(report); setCv("hazards"); } : null} fleetAircraft={fleetAircraft} orgProfiles={orgProfiles} reportPrefill={reportPrefill} onClearPrefill={() => setReportPrefill(null)} org={org} onAiSearch={async (query) => { try { const { data, error } = await supabase.functions.invoke('ai-safety-search', { body: { orgId: profile?.org_id, query } }); if (error) { setToast({ message: "AI search unavailable — try again later", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } return data; } catch { setToast({ message: "AI search unavailable — try again later", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } }} onAiCategorize={hasFeature(org, "safety_trend_alerts") ? async ({ title, description, location, tailNumber }) => { try { const { data, error } = await supabase.functions.invoke('ai-categorize-report', { body: { orgId: profile?.org_id, title, description, location, tailNumber } }); if (error) { setToast({ message: "AI categorization unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } return data?.suggestion || null; } catch { setToast({ message: "AI categorization unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } } : undefined} />; })()}
        {cv === "asap" && <AsapProgram profile={profile} session={session} org={org} orgProfiles={orgProfiles} asapConfig={asapConfig} asapReports={asapReports} asapCorrActions={asapCorrActions} asapMeetings={asapMeetings} onSaveConfig={roGuard(async (config) => { const orgId = profile?.org_id; if (!orgId) return; const { data } = await upsertAsapConfig(orgId, config); if (data) setAsapConfig(data); })} onCreateReport={roGuard(async (report) => { const orgId = profile?.org_id; if (!orgId) return; const { count } = await fetchAsapReportCount(orgId); const prefix = asapConfig?.auto_number_prefix || "ASAP"; const reportNumber = `${prefix}-${String((count || 0) + 1).padStart(3, "0")}`; await createAsapReport(orgId, { ...report, report_number: reportNumber, reporter_id: session.user.id, reporter_name: userName }); createNotification(orgId, { type: "asap_report_submitted", title: "ASAP Report Submitted", body: `New ASAP report ${reportNumber}: ${report.title || "Untitled"}`, link_tab: "asap", target_roles: ["admin", "safety_manager"] }); fetchAsapReports(orgId).then(({ data }) => setAsapReports(data || [])); })} onUpdateReport={roGuard(async (reportId, updates) => { await updateAsapReport(reportId, updates); const orgId = profile?.org_id; if (orgId) fetchAsapReports(orgId).then(({ data }) => setAsapReports(data || [])); })} onDeleteReport={roGuard(async (reportId) => { await deleteAsapReport(reportId); const orgId = profile?.org_id; if (orgId) fetchAsapReports(orgId).then(({ data }) => setAsapReports(data || [])); })} onFetchErcReviews={async (reportId) => { const { data } = await fetchAsapErcReviews(reportId); return data || []; }} onCreateErcReview={roGuard(async (review) => { await createAsapErcReview(review); const orgId = profile?.org_id; if (orgId && review.report_id) { const report = asapReports.find(r => r.id === review.report_id); if (report?.reporter_id) { createNotification(orgId, { type: "asap_erc_decision", title: "ERC Review Decision", body: `ERC has reviewed your ASAP report ${report.report_number || ""}: ${review.decision || "reviewed"}`, link_tab: "asap", link_id: review.report_id, target_user_id: report.reporter_id }); } } })} onUpdateErcReview={roGuard(async (reviewId, updates) => { await updateAsapErcReview(reviewId, updates); })} onCreateCorrAction={roGuard(async (action) => { const orgId = profile?.org_id; if (!orgId) return; await createAsapCorrectiveAction(orgId, action); fetchAsapCorrectiveActions(orgId).then(({ data }) => setAsapCorrActions(data || [])); })} onUpdateCorrAction={roGuard(async (actionId, updates) => { await updateAsapCorrectiveAction(actionId, updates); const orgId = profile?.org_id; if (orgId) fetchAsapCorrectiveActions(orgId).then(({ data }) => setAsapCorrActions(data || [])); })} onDeleteCorrAction={roGuard(async (actionId) => { await deleteAsapCorrectiveAction(actionId); const orgId = profile?.org_id; if (orgId) fetchAsapCorrectiveActions(orgId).then(({ data }) => setAsapCorrActions(data || [])); })} onCreateMeeting={roGuard(async (meeting) => { const orgId = profile?.org_id; if (!orgId) return; await createAsapMeeting(orgId, meeting); fetchAsapMeetings(orgId).then(({ data }) => setAsapMeetings(data || [])); })} onUpdateMeeting={roGuard(async (meetingId, updates) => { await updateAsapMeeting(meetingId, updates); const orgId = profile?.org_id; if (orgId) fetchAsapMeetings(orgId).then(({ data }) => setAsapMeetings(data || [])); })} onDeleteMeeting={roGuard(async (meetingId) => { await deleteAsapMeeting(meetingId); const orgId = profile?.org_id; if (orgId) fetchAsapMeetings(orgId).then(({ data }) => setAsapMeetings(data || [])); })} onRefresh={async () => { const orgId = profile?.org_id; if (orgId) { fetchAsapReports(orgId).then(({ data }) => setAsapReports(data || [])); fetchAsapCorrectiveActions(orgId).then(({ data }) => setAsapCorrActions(data || [])); fetchAsapMeetings(orgId).then(({ data }) => setAsapMeetings(data || [])); } }} onCreateAction={(finding) => { setActionFromInvestigation(finding); setCv("actions"); }} onInitSetup={roGuard(async () => { const { DEFAULT_MOU_TEXT, DEFAULT_ACCEPTANCE_CRITERIA, DEFAULT_EXCLUSION_CRITERIA } = await import("../components/AsapProgram"); const orgId = profile?.org_id; if (!orgId) return; const { data } = await upsertAsapConfig(orgId, { mou_text: DEFAULT_MOU_TEXT, acceptance_criteria: DEFAULT_ACCEPTANCE_CRITERIA, exclusion_criteria: DEFAULT_EXCLUSION_CRITERIA, reporting_window_hours: 24, auto_number_prefix: "ASAP" }); if (data) setAsapConfig(data); setToast({ message: "ASAP program initialized with default templates", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} />}
        {cv === "erp" && <EmergencyResponsePlan profile={profile} session={session} org={org} erpPlans={erpPlans} erpDrills={erpDrills} onCreatePlan={roGuard(async (plan) => { const orgId = profile?.org_id; if (!orgId) return; await createErpPlan(orgId, plan); fetchErpPlans(orgId).then(({ data }) => setErpPlans(data || [])); })} onUpdatePlan={roGuard(async (planId, updates) => { await updateErpPlan(planId, updates); const orgId = profile?.org_id; if (orgId) fetchErpPlans(orgId).then(({ data }) => setErpPlans(data || [])); })} onDeletePlan={roGuard(async (planId) => { await deleteErpPlan(planId); const orgId = profile?.org_id; if (orgId) { fetchErpPlans(orgId).then(({ data }) => setErpPlans(data || [])); fetchErpDrills(orgId).then(({ data }) => setErpDrills(data || [])); } })} onLoadChecklist={async (planId) => { const { data } = await fetchErpChecklistItems(planId); return data || []; }} onSaveChecklist={roGuard(async (planId, items) => { await upsertErpChecklistItems(planId, items); })} onLoadCallTree={async (planId) => { const { data } = await fetchErpCallTree(planId); return data || []; }} onSaveCallTree={roGuard(async (planId, contacts) => { await upsertErpCallTree(planId, contacts); })} onCreateDrill={roGuard(async (drill) => { const orgId = profile?.org_id; if (!orgId) return; await createErpDrill(orgId, drill); fetchErpDrills(orgId).then(({ data }) => setErpDrills(data || [])); })} onUpdateDrill={roGuard(async (drillId, updates) => { await updateErpDrill(drillId, updates); const orgId = profile?.org_id; if (orgId) fetchErpDrills(orgId).then(({ data }) => setErpDrills(data || [])); })} onDeleteDrill={roGuard(async (drillId) => { await deleteErpDrill(drillId); const orgId = profile?.org_id; if (orgId) fetchErpDrills(orgId).then(({ data }) => setErpDrills(data || [])); })} onInitTemplates={roGuard(async () => { const { ERP_TEMPLATES, DEFAULT_CALL_TREE } = await import("../components/EmergencyResponsePlan"); const orgId = profile?.org_id; if (!orgId) return; for (const tmpl of ERP_TEMPLATES) { const { data: plan } = await createErpPlan(orgId, { name: tmpl.name, category: tmpl.category, description: tmpl.description }); if (plan) { await upsertErpChecklistItems(plan.id, tmpl.checklist); await upsertErpCallTree(plan.id, DEFAULT_CALL_TREE); } } fetchErpPlans(orgId).then(({ data }) => setErpPlans(data || [])); setToast({ message: "6 ERP templates loaded with checklists and call trees", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} onCreateActionFromDrill={(drill) => { const planName = (erpPlans || []).find(p => p.id === drill.erp_plan_id)?.name || "ERP Drill"; setActionFromInvestigation({ title: `Corrective action from ${planName} drill`, description: `Drill findings: ${drill.findings || "N/A"}\nLessons learned: ${drill.lessons_learned || "N/A"}`, source: "erp_drill", source_id: drill.id }); setCv("actions"); }} />}
        {cv === "audits" && <InternalEvaluation profile={profile} session={session} org={org} orgProfiles={orgProfiles} auditTemplates={auditTemplatesData} iepAudits={iepAudits} auditSchedules={auditSchedulesData} onCreateTemplate={roGuard(async (data) => { const orgId = profile?.org_id; if (!orgId) return; await createAuditTemplate(orgId, data); fetchAuditTemplates(orgId).then(({ data: d }) => setAuditTemplatesData(d || [])); })} onUpdateTemplate={roGuard(async (templateId, updates) => { await updateAuditTemplate(templateId, updates); const orgId = profile?.org_id; if (orgId) fetchAuditTemplates(orgId).then(({ data: d }) => setAuditTemplatesData(d || [])); })} onDeleteTemplate={roGuard(async (templateId) => { await deleteAuditTemplate(templateId); const orgId = profile?.org_id; if (orgId) fetchAuditTemplates(orgId).then(({ data: d }) => setAuditTemplatesData(d || [])); })} onCreateAudit={roGuard(async (audit) => { const orgId = profile?.org_id; if (!orgId) return; await createAudit(orgId, audit); fetchAudits(orgId).then(({ data: d }) => setIepAudits(d || [])); })} onUpdateAudit={roGuard(async (auditId, updates) => { await updateAudit(auditId, updates); const orgId = profile?.org_id; if (orgId) { fetchAudits(orgId).then(({ data: d }) => setIepAudits(d || [])); if (updates.status === "completed" && updates.findings_count && updates.findings_count > 0) { createNotification(orgId, { type: "audit_finding", title: "Audit Findings Recorded", body: `Audit completed with ${updates.findings_count} finding(s) requiring attention`, link_tab: "audits", link_id: auditId, target_roles: ["admin", "safety_manager"] }); } } })} onLoadResponses={async (auditId) => { return await fetchAuditResponses(auditId); }} onSaveResponse={roGuard(async (response) => { return await upsertAuditResponse(response); })} onSaveResponses={roGuard(async (auditId, responses) => { await upsertAuditResponses(auditId, responses); })} onCreateSchedule={roGuard(async (schedule) => { const orgId = profile?.org_id; if (!orgId) return; await createAuditSchedule(orgId, schedule); fetchAuditSchedules(orgId).then(({ data: d }) => setAuditSchedulesData(d || [])); })} onUpdateSchedule={roGuard(async (scheduleId, updates) => { await updateAuditSchedule(scheduleId, updates); const orgId = profile?.org_id; if (orgId) fetchAuditSchedules(orgId).then(({ data: d }) => setAuditSchedulesData(d || [])); })} onDeleteSchedule={roGuard(async (scheduleId) => { await deleteAuditSchedule(scheduleId); const orgId = profile?.org_id; if (orgId) fetchAuditSchedules(orgId).then(({ data: d }) => setAuditSchedulesData(d || [])); })} onInitTemplates={roGuard(async () => { const { SEED_TEMPLATES } = await import("../components/InternalEvaluation"); const orgId = profile?.org_id; if (!orgId) return; for (const tmpl of SEED_TEMPLATES) { await createAuditTemplate(orgId, { name: tmpl.name, description: tmpl.description, category: tmpl.category, sections: tmpl.sections }); } fetchAuditTemplates(orgId).then(({ data: d }) => setAuditTemplatesData(d || [])); setToast({ message: "5 default IEP templates loaded", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} onRefreshAudits={async () => { const orgId = profile?.org_id; if (orgId) { fetchAudits(orgId).then(({ data: d }) => setIepAudits(d || [])); fetchAuditSchedules(orgId).then(({ data: d }) => setAuditSchedulesData(d || [])); } }} onCreateAction={(finding) => { setActionFromInvestigation(finding); setCv("actions"); }} frats={records} flights={flights} reports={reports} hazards={hazards} actions={actions} policies={policies} profiles={orgProfiles} trainingRecords={trainingRecs} smsManuals={smsManuals} declarations={declarations} onSaveDeclaration={async (data) => { const { data: newDecl } = await createDeclaration(profile.org_id, data); fetchDeclarations(profile.org_id).then(({ data: d }) => setDeclarations(d || [])); return { data: newDecl }; }} onUpdateDeclaration={async (id, updates) => { await updateDeclaration(id, updates); fetchDeclarations(profile.org_id).then(({ data: d }) => setDeclarations(d || [])); }} onUploadPdf={uploadDeclarationPdf} hasIntlCompliance={hasFeature(org, "international_compliance")} complianceFrameworks={complianceFrameworks} checklistItems={complianceChecklistItems} complianceStatus={complianceStatusData} crosswalkData={complianceCrosswalk} onUpsertFramework={async (fw) => { const orgId = profile?.org_id; if (!orgId) return; await upsertComplianceFramework(orgId, fw); }} onDeleteFramework={async (fwId) => { await deleteComplianceFramework(fwId); }} onUpsertStatus={async (status) => { const orgId = profile?.org_id; if (!orgId) return; await upsertComplianceStatus(orgId, status); fetchComplianceStatus(orgId).then(({ data }) => setComplianceStatusData(data || [])); }} onRefreshCompliance={async () => { const orgId = profile?.org_id; if (!orgId) return; fetchComplianceFrameworks(orgId).then(({ data }) => setComplianceFrameworks(data || [])); fetchComplianceStatus(orgId).then(({ data }) => setComplianceStatusData(data || [])); }} onAiGenerateChecklist={hasFeature(org, "safety_trend_alerts") ? async ({ auditScope, auditCategory }) => { try { const { data, error } = await supabase.functions.invoke('ai-draft-assist', { body: { orgId: profile?.org_id, mode: "audit_checklist", auditScope, auditCategory } }); if (error) { setToast({ message: "AI checklist generation unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } return data?.result || null; } catch { setToast({ message: "AI checklist generation unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } } : undefined} onNavigate={(tab) => setCv(tab)} part5ReqStatuses={part5Compliance.reqStatuses} />}
        {cv === "moc" && <ManagementOfChange profile={profile} session={session} orgProfiles={orgProfiles} mocItems={mocItems} onCreateMoc={roGuard(async (data) => { const orgId = profile?.org_id; if (!orgId) return; const { data: newItem } = await createMocItem(orgId, data); if (newItem?.responsible_id && newItem.responsible_id !== profile?.id) { createNotification(orgId, { type: "moc_assigned", title: "Change Request Assigned", body: `You have been assigned: ${newItem.title}`, link_tab: "moc", link_id: newItem.id, target_user_id: newItem.responsible_id }); } fetchMocItems(orgId).then(({ data: d }) => setMocItems(d || [])); })} onUpdateMoc={roGuard(async (id, updates) => { const orgId = profile?.org_id; if (!orgId) return; const existing = mocItems.find(i => i.id === id); await updateMocItem(id, updates); if (updates.responsible_id && updates.responsible_id !== existing?.responsible_id && updates.responsible_id !== profile?.id) { createNotification(orgId, { type: "moc_assigned", title: "Change Request Assigned", body: `You have been assigned: ${existing?.title || "Change request"}`, link_tab: "moc", link_id: id, target_user_id: updates.responsible_id }); } fetchMocItems(orgId).then(({ data: d }) => setMocItems(d || [])); })} onDeleteMoc={roGuard(async (id) => { await deleteMocItem(id); const orgId = profile?.org_id; if (orgId) fetchMocItems(orgId).then(({ data: d }) => setMocItems(d || [])); })} onUploadFile={async (mocId, file) => { const orgId = profile?.org_id; if (!orgId) return { url: null, error: { message: "No org" } }; return uploadMocFile(orgId, mocId, file); }} onFetchAttachments={async (mocId) => { const { data } = await fetchMocAttachments(mocId); return data || []; }} onCreateAttachment={async (mocId, att) => { await createMocAttachment(mocId, att); }} onDeleteAttachment={async (id) => { await deleteMocAttachment(id); }} onAiIdentifyHazards={hasFeature(org, "safety_trend_alerts") ? async ({ mocTitle, changeType, mocDescription }) => { try { const { data, error } = await supabase.functions.invoke('ai-draft-assist', { body: { orgId: profile?.org_id, mode: "moc_hazards", mocTitle, changeType, mocDescription } }); if (error) { setToast({ message: "AI hazard identification unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } return data?.result || null; } catch { setToast({ message: "AI hazard identification unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } } : undefined} />}
        {cv === "hazards" && <HazardRegister profile={profile} session={session} onCreateHazard={isFree ? (() => showUpgrade("investigations", "Full investigation capabilities are available on the Starter plan. Free plan is view-only.")) : roGuard(onCreateHazard)} onUpdateHazard={isFree ? (() => showUpgrade("investigations", "Full investigation capabilities are available on the Starter plan. Free plan is view-only.")) : roGuard(onUpdateHazard)} hazards={hazards} reports={reports} fromReport={hazardFromReport} onClearFromReport={() => setHazardFromReport(null)} actions={actions} onCreateAction={(hazard) => { setActionFromInvestigation(hazard); setCv("actions"); }} org={org} onAiInvestigate={async (hazardId) => { try { const { data, error } = await supabase.functions.invoke('ai-investigation-assist', { body: { orgId: profile?.org_id, hazardId } }); if (error) { setToast({ message: "AI analysis unavailable — try again later", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } return data; } catch { setToast({ message: "AI analysis unavailable — try again later", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } }} onGenerateLessonsLearned={hasFeature(org, "safety_trend_alerts") ? async (hazardId) => { try { const { data, error } = await supabase.functions.invoke('ai-lessons-learned', { body: { orgId: profile?.org_id, hazardId } }); if (error) { setToast({ message: "AI lessons learned unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return; } if (data?.lessonsLearned) { await updateHazard(hazardId, { lessons_learned: data.lessonsLearned }); const orgId = profile?.org_id; if (orgId) { const { data: h } = await fetchHazards(orgId); setHazards(h || []); } setToast({ message: "Lessons learned generated", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); } } catch { setToast({ message: "AI lessons learned unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); } } : undefined} onPublishBulletin={hasFeature(org, "safety_trend_alerts") ? (hazard) => { if (!hazard.lessons_learned) return; const orgId = profile?.org_id; if (!orgId) return; createNotification(orgId, { type: "safety_bulletin", title: `Safety Bulletin: ${hazard.title}`, body: hazard.lessons_learned.summary || `Lessons learned from investigation ${hazard.hazard_code}`, link_tab: "hazards", target_roles: null }); setToast({ message: "Safety bulletin published to all org members", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); } : undefined} onCreateTrainingModule={hasFeature(org, "safety_trend_alerts") ? async (hazard) => { if (!hazard.lessons_learned) return; const orgId = profile?.org_id; if (!orgId) return; const ll = hazard.lessons_learned; const courseData = { title: `Lessons Learned: ${hazard.title}`, description: ll.summary || `Safety lessons from investigation ${hazard.hazard_code}`, status: "draft" }; const { data: course, error } = await createCbtCourse(orgId, session.user.id, courseData); if (error || !course) { setToast({ message: "Failed to create training module", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return; } const lessonContent = [{ type: "text", content: ll.summary || "" }, ...(ll.takeaways || []).map(t => ({ type: "text", content: `**Key Takeaway:** ${t}` })), ...(ll.prevention_tips || []).map(t => ({ type: "text", content: `**Prevention Tip:** ${t}` }))]; await upsertCbtLesson(orgId, course.id, { title: `${hazard.hazard_code} — Lessons Learned`, content_blocks: lessonContent, order_index: 0 }); await refreshCbt(); setToast({ message: "Training module created from lessons learned", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); } : undefined} />}
        {cv === "actions" && <CorrectiveActions actions={actions} onCreateAction={freeGuard(roGuard(onCreateAction), "corrective actions", () => isFree && (actions || []).filter(a => a.status !== "completed").length >= FREE_TIER_LIMITS.maxOpenActions, `Free plan allows up to ${FREE_TIER_LIMITS.maxOpenActions} open corrective actions. Upgrade to Starter for unlimited.`)} onUpdateAction={roGuard(onUpdateAction)} fromInvestigation={actionFromInvestigation} hazards={hazards} onClearFromInvestigation={() => setActionFromInvestigation(null)} orgProfiles={orgProfiles} />}
        {cv === "policy" && <PolicyTraining tourTab={tourSubTabs.policy} profile={profile} session={session} policies={policies} onCreatePolicy={freeGuard(roGuard(onCreatePolicy), "policy library", () => isFree && (policies || []).length >= FREE_TIER_LIMITS.maxPolicies, `Free plan allows up to ${FREE_TIER_LIMITS.maxPolicies} policies. Upgrade to Starter for unlimited.`)} onAcknowledgePolicy={onAcknowledgePolicy} orgProfiles={orgProfiles} smsManuals={smsManuals} showManuals={(hasFeature(org, "sms_manuals") || isFree) && ["admin","safety_manager","accountable_exec","chief_pilot"].includes(profile?.role)} readOnlyManuals={isFree} templateVariables={templateVariables} signatures={smsSignatures} fleetAircraft={fleetAircraft} onSaveManual={roGuard(async (manual) => { const orgId = profile?.org_id; if (!orgId) return; const { error } = await upsertSmsManual(orgId, { ...manual, lastEditedBy: session?.user?.id }); if (!error) { const { data: all } = await fetchSmsManuals(orgId); setSmsManuals(all || []); const { data: policyData, error: policyError, wasUpdate } = await publishManualToPolicy(orgId, session.user.id, manual); if (!policyError && policyData && wasUpdate) { await clearPolicyAcknowledgments(policyData.id); } const { data: refreshedPolicies } = await fetchPolicies(orgId); setPolicies(refreshedPolicies || []); setToast({ message: wasUpdate ? "Manual saved & policy updated — acknowledgments reset" : "Manual saved & published to Policy Library", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); } })} onInitManuals={roGuard(async (templates) => { const orgId = profile?.org_id; if (!orgId) return; for (const tmpl of templates) { await upsertSmsManual(orgId, { ...tmpl, lastEditedBy: session?.user?.id }); } const { data: all } = await fetchSmsManuals(orgId); setSmsManuals(all || []); setToast({ message: "SMS manuals initialized", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} onSaveVariables={roGuard(async (vars, mergedManuals) => { const orgId = profile?.org_id; if (!orgId) return; const oldVars = templateVariables || {}; await saveSmsTemplateVariables(orgId, vars); setTemplateVariables(vars); const acft = vars._aircraft || []; const fleetLines = acft.filter(a => a.type?.trim()).map(a => `- ${a.type || "TBD"} - ${a.reg || "N/A"} - ${a.pax || "N/A"} pax - ${a.range || "N/A"}`).join("\n"); const oldAcft = oldVars._aircraft || []; const oldFleetLines = oldAcft.filter(a => a.type?.trim()).map(a => `- ${a.type || "TBD"} - ${a.reg || "N/A"} - ${a.pax || "N/A"} pax - ${a.range || "N/A"}`).join("\n"); const manualsToProcess = mergedManuals || smsManuals; for (const manual of manualsToProcess) { const updatedSections = manual.sections.map(sec => { let c = sec.content || ""; for (const [key, value] of Object.entries(vars)) { if (key === "_aircraft" || !value) continue; const oldVal = oldVars[key]; if (oldVal && oldVal !== value && oldVal.length >= 2) c = c.replaceAll(oldVal, value); c = c.replaceAll(`[${key}]`, value); } if (fleetLines) { if (oldFleetLines && oldFleetLines !== fleetLines) c = c.replaceAll(oldFleetLines, fleetLines); c = c.replaceAll("[Aircraft Fleet List]", fleetLines); } return c !== sec.content ? { ...sec, content: c } : sec; }); const hasChanges = manual.sections.some((s, i) => s.content !== updatedSections[i].content); if (hasChanges) { await upsertSmsManual(orgId, { ...manual, sections: updatedSections, lastEditedBy: session?.user?.id }); } } const { data: all } = await fetchSmsManuals(orgId); setSmsManuals(all || []); setToast({ message: "Variables saved and applied to all manuals", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} onSaveSignature={roGuard(async (sectionId, sigData) => { const orgId = profile?.org_id; if (!orgId) return; const updated = { ...smsSignatures, [sectionId]: sigData }; await saveSmsSignatures(orgId, updated); setSmsSignatures(updated); setToast({ message: "Signature saved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} onAiDraftPolicy={hasFeature(org, "safety_trend_alerts") ? async ({ policyTitle, policyCategory }) => { try { const { data, error } = await supabase.functions.invoke('ai-draft-assist', { body: { orgId: profile?.org_id, mode: "policy_draft", policyTitle, policyCategory } }); if (error) { setToast({ message: "AI draft unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } return data?.result || null; } catch { setToast({ message: "AI draft unavailable", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return null; } } : undefined} />}
        {cv === "cbt" && <CbtModules tourTab={tourSubTabs.cbt} profile={profile} session={session} orgProfiles={orgProfiles} courses={cbtCourses} lessons={cbtLessonsMap} progress={cbtProgress} enrollments={cbtEnrollments} onCreateCourse={roGuard(onCreateCbtCourse)} onUpdateCourse={onUpdateCbtCourse} onDeleteCourse={async (id) => { await deleteCbtCourse(id); refreshCbt(); }} onSaveLesson={roGuard(onSaveCbtLesson)} onDeleteLesson={onDeleteCbtLesson} onUpdateProgress={onUpdateCbtProgress} onUpdateEnrollment={onUpdateCbtEnrollment} onPublishCourse={onUpdateCbtCourse} onRefresh={refreshCbt} trainingRequirements={trainingReqs} trainingRecords={trainingRecs} onCreateRequirement={roGuard(onCreateRequirement)} onLogTraining={roGuard(onLogTraining)} onDeleteTrainingRecord={roGuard(onDeleteTrainingRecord)} onDeleteRequirement={roGuard(onDeleteRequirement)} onInitTraining={roGuard(onInitTraining)} />}
        {needsAuth && <AdminGate isAuthed={isAuthed} onAuth={setIsAuthed}>{null}</AdminGate>}
        {cv === "dashboard" && (isAuthed || isOnline) && <DashboardWrapper records={records} flights={flights} reports={reports} hazards={hazards} actions={actions} onDelete={onDelete} riskLevels={riskLevels} org={org} erpPlans={erpPlans} erpDrills={erpDrills} profile={profile} session={session} spis={spis} spiMeasurements={spiMeasurements} onCreateSpi={roGuard(async (data) => { const orgId = profile?.org_id; if (!orgId) return; await createSpi(orgId, data); fetchSpis(orgId).then(({ data: d }) => setSpis(d || [])); })} onUpdateSpi={roGuard(async (spiId, updates) => { await updateSpi(spiId, updates); const orgId = profile?.org_id; if (orgId) fetchSpis(orgId).then(({ data: d }) => setSpis(d || [])); })} onDeleteSpi={roGuard(async (spiId) => { await deleteSpi(spiId); const orgId = profile?.org_id; if (orgId) { fetchSpis(orgId).then(({ data: d }) => setSpis(d || [])); fetchAllSpiMeasurements(orgId).then(({ data: d }) => setSpiMeasurements(d || [])); } })} onLoadTargets={async (spiId) => { const { data } = await fetchSpiTargets(spiId); return data || []; }} onCreateTarget={roGuard(async (target) => { await createSpiTarget(target); })} onUpdateTarget={roGuard(async (targetId, updates) => { await updateSpiTarget(targetId, updates); })} onDeleteTarget={roGuard(async (targetId) => { await deleteSpiTarget(targetId); })} onLoadMeasurements={async (spiId) => { const { data } = await fetchSpiMeasurements(spiId); return data || []; }} onCreateMeasurement={roGuard(async (measurement) => { await createSpiMeasurement(measurement); const orgId = profile?.org_id; if (orgId) fetchAllSpiMeasurements(orgId).then(({ data: d }) => setSpiMeasurements(d || [])); })} onInitSpiDefaults={roGuard(async () => { const { DEFAULT_SPIS } = await import("../components/SafetyPerformanceIndicators"); const orgId = profile?.org_id; if (!orgId) return; for (const tmpl of DEFAULT_SPIS) { const { default_target, ...spiData } = tmpl; const { data: spi } = await createSpi(orgId, spiData); if (spi && default_target) { await createSpiTarget({ spi_id: spi.id, ...default_target, effective_date: new Date().toISOString().split("T")[0] }); } } fetchSpis(orgId).then(({ data: d }) => setSpis(d || [])); setToast({ message: "8 default SPIs loaded with targets", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} cultureSurveys={cultureSurveys} orgProfiles={orgProfiles} onCreateSurvey={roGuard(async (data) => { const orgId = profile?.org_id; if (!orgId) return; await createCultureSurvey(orgId, data); fetchCultureSurveys(orgId).then(({ data: d }) => setCultureSurveys(d || [])); if (data.status === "active") { createNotification(orgId, { type: "culture_survey_available", title: "Safety Culture Survey", body: `A new survey is available: ${data.title}`, link_tab: "dashboard", target_roles: null }); } })} onUpdateSurvey={roGuard(async (id, updates) => { const orgId = profile?.org_id; if (!orgId) return; const existing = cultureSurveys.find(s => s.id === id); await updateCultureSurvey(id, updates); fetchCultureSurveys(orgId).then(({ data: d }) => setCultureSurveys(d || [])); if (updates.status === "active" && existing?.status !== "active") { createNotification(orgId, { type: "culture_survey_available", title: "Safety Culture Survey", body: `A new survey is available: ${existing?.title || "Survey"}`, link_tab: "dashboard", target_roles: null }); } })} onDeleteSurvey={roGuard(async (id) => { await deleteCultureSurvey(id); const orgId = profile?.org_id; if (orgId) fetchCultureSurveys(orgId).then(({ data: d }) => setCultureSurveys(d || [])); })} onFetchSurveyResponses={async (surveyId) => fetchCultureSurveyResponses(surveyId)} onSubmitSurveyResponse={async (response) => submitCultureSurveyResponse(response)} onCheckUserSurveyResponse={async (surveyId, userId) => checkUserSurveyResponse(surveyId, userId)} onFetchSurveyResults={async (surveyId) => fetchCultureSurveyResults(surveyId)} onUpsertSurveyResults={async (surveyId, results) => upsertCultureSurveyResults(surveyId, results)} trendAlerts={trendAlerts} onAcknowledgeTrendAlert={async (alertId) => { await acknowledgeTrendAlert(alertId, session.user.id); const orgId = profile?.org_id; if (orgId) fetchTrendAlerts(orgId).then(({ data }) => setTrendAlerts(data || [])); }} pilotEngagement={pilotEngagement} safetyRecognitions={safetyRecognitions} orgEngagement={orgEngagement} orgRecognitions={orgRecognitions} onAcknowledgeRecognition={async (recId) => { await acknowledgeRecognition(recId); if (session?.user?.id) fetchSafetyRecognitions(session.user.id).then(({ data }) => setSafetyRecognitions(data || [])); }} complianceFrameworks={complianceFrameworks} complianceChecklistItems={complianceChecklistItems} complianceStatusData={complianceStatusData} trainingReqs={trainingReqs} trainingRecs={trainingRecs} policies={policies} iepAudits={iepAudits} auditSchedules={auditSchedulesData} mocItems={mocItems} insuranceExports={insuranceExports} onGenerateExport={roGuard(async (exportData, pdfBlob) => { const orgId = profile?.org_id; if (!orgId) return; const { data } = await createInsuranceExport(orgId, exportData); if (data && pdfBlob) { const { data: pdfUrl } = await uploadInsuranceExportPdf(orgId, data.id, pdfBlob); if (pdfUrl) { await supabase.from('insurance_exports').update({ pdf_path: pdfUrl }).eq('id', data.id); } } fetchInsuranceExports(orgId).then(({ data: d }) => setInsuranceExports(d || [])); setToast({ message: "Insurance export generated", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } }); setTimeout(() => setToast(null), 3000); })} onDeleteExport={roGuard(async (exportId) => { await deleteInsuranceExport(exportId); const orgId = profile?.org_id; if (orgId) fetchInsuranceExports(orgId).then(({ data }) => setInsuranceExports(data || [])); })} onNavigateSubscription={() => { setInitialAdminTab("subscription"); setCv("admin"); }} onNavigate={setCv} fleetAircraft={fleetAircraft} part5Compliance={part5Compliance} onViewDetail={(id) => setFratDetailId(id)} />}
        {cv === "admin" && (isAuthed || isOnline) && <AdminPanel tourTab={tourSubTabs.admin} profile={profile} orgProfiles={orgProfiles} initialTab={initialAdminTab} onUpdateRole={onUpdateRole} onUpdatePermissions={async (userId, perms) => { await updateProfilePermissions(userId, perms); const orgId = profile?.org_id; if (orgId) fetchOrgProfiles(orgId).then(({ data }) => setOrgProfiles(data || [])); }} onUpdateEmail={async (userId, email) => { await updateProfileEmail(userId, email); const orgId = profile?.org_id; if (orgId) fetchOrgProfiles(orgId).then(({ data }) => setOrgProfiles(data || [])); }} onRemoveUser={async (userId) => { await removeUserFromOrg(userId); const orgId = profile?.org_id; if (orgId) fetchOrgProfiles(orgId).then(({ data }) => setOrgProfiles(data || [])); setToast({ message: "User removed", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 3000); }} orgName={orgName} orgSlug={profile?.organizations?.slug || ""} orgLogo={orgLogo} fratTemplate={fratTemplate} fratTemplates={fratTemplates} onSaveTemplate={async (templateData) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { data, error } = await upsertFratTemplate(orgId, templateData);
          if (!error && data) {
            setFratTemplate(data);
            fetchAllFratTemplates(orgId).then(({ data: all }) => setFratTemplates(all || []));
            setToast({ message: "FRAT template saved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
            setTimeout(() => setToast(null), 3000);
          } else {
            setToast({ message: "Failed to save template: " + (error?.message || "Unknown error"), level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } });
            setTimeout(() => setToast(null), 5000);
          }
        }} onCreateTemplate={async (templateData) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { data, error } = await createFratTemplate(orgId, templateData);
          if (!error) {
            fetchAllFratTemplates(orgId).then(({ data: all }) => setFratTemplates(all || []));
            setToast({ message: "Template created", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
            setTimeout(() => setToast(null), 3000);
          }
        }} onDeleteTemplate={async (templateId) => {
          const orgId = profile?.org_id;
          await deleteFratTemplate(templateId);
          if (orgId) fetchAllFratTemplates(orgId).then(({ data: all }) => setFratTemplates(all || []));
        }} onSetActiveTemplate={async (templateId) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await setActiveFratTemplate(orgId, templateId);
          fetchFratTemplate(orgId).then(({ data }) => { if (data) setFratTemplate(data); });
          fetchAllFratTemplates(orgId).then(({ data: all }) => setFratTemplates(all || []));
          setToast({ message: "Active template updated", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
          setTimeout(() => setToast(null), 3000);
        }} onUploadLogo={async (file) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { url, error } = await uploadOrgLogo(orgId, file);
          if (!error && url) {
            // Refresh profile to pick up new logo
            const prof = await getProfile();
            if (prof) setProfile(prof);
          }
          return { url, error };
        }} orgData={profile?.organizations || {}} onUpdateOrg={async (updates) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await updateOrg(orgId, updates);
          const prof = await getProfile();
          if (prof) setProfile(prof);
          setToast({ message: "Settings updated", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
          setTimeout(() => setToast(null), 3000);
        }} onCheckout={async (plan, interval) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          try {
            const { data, error } = await supabase.functions.invoke('stripe-checkout', {
              body: {
                plan,
                interval,
                orgId,
                orgName,
                email: profile?.email || session?.user?.email,
                returnUrl: window.location.origin,
              },
            });
            if (error) { setToast({ message: "Checkout error: " + error.message, level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return; }
            if (data?.url) window.location.href = data.url;
          } catch (e) { console.error("Checkout error:", e); }
        }} onBillingPortal={async () => {
          const customerId = org?.stripe_customer_id;
          if (!customerId) return;
          try {
            const { data, error } = await supabase.functions.invoke('stripe-portal', {
              body: { customerId, returnUrl: window.location.origin },
            });
            if (error) { setToast({ message: "Failed to open billing portal", level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } }); setTimeout(() => setToast(null), 4000); return; }
            if (data?.url) window.location.href = data.url;
          } catch (e) { console.error("Portal error:", e); }
        }} invitations={invitations_list} onInviteUser={async (email, role) => {
          if (isFree) { showUpgrade("team invitations", "Team invitations are available on the Starter plan. The Free plan supports a single user."); return { error: "Free plan: 1 user limit" }; }
          const orgId = profile?.org_id;
          if (!orgId) return { error: "No org" };
          const { data, error } = await createInvitation(orgId, email, role, session.user.id);
          if (error) return { error: error.message };
          // Send the email via edge function
          try {
            const { error: invokeErr } = await supabase.functions.invoke('send-invite', {
              body: { email, orgName, role, token: data.token },
            });
            if (invokeErr) console.error("Invite email error:", invokeErr);
          } catch (e) { console.error("Failed to send invite email:", e); }
          fetchInvitations(orgId).then(({ data }) => setInvitationsList(data || []));
          return { success: true };
        }} onRevokeInvitation={async (invId) => {
          await revokeInvitation(invId);
          const orgId = profile?.org_id;
          if (orgId) fetchInvitations(orgId).then(({ data }) => setInvitationsList(data || []));
        }} onResendInvitation={async (invId) => {
          const { data } = await resendInvitation(invId);
          if (data) {
            try {
              await supabase.functions.invoke('send-invite', {
                body: { email: data.email, orgName, role: data.role, token: data.token },
              });
            } catch (e) { console.error("Failed to resend invite:", e); }
          }
          const orgId = profile?.org_id;
          if (orgId) fetchInvitations(orgId).then(({ data: inv }) => setInvitationsList(inv || []));
        }} fleetAircraft={fleetAircraft} maxAircraft={org?.max_aircraft || 5} onAddAircraft={roGuard(async (record) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await createAircraft(orgId, record);
          const { data } = await fetchAircraft(orgId);
          setFleetAircraft(data || []);
        })} onUpdateAircraft={roGuard(async (id, updates) => {
          await updateAircraft(id, updates);
          const { data } = await fetchAircraft(profile?.org_id);
          setFleetAircraft(data || []);
        })} onDeleteAircraft={roGuard(async (id) => {
          await deleteAircraft(id);
          const { data } = await fetchAircraft(profile?.org_id);
          setFleetAircraft(data || []);
        })} foreflightConfig={foreflightConfig} onSaveForeflightConfig={roGuard(async (configData) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { data, error } = await upsertForeflightConfig(orgId, configData);
          if (!error && data) {
            setForeflightConfig(data);
            setToast({ message: "ForeFlight configuration saved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
            setTimeout(() => setToast(null), 3000);
          } else {
            setToast({ message: "Failed to save: " + (error?.message || "Unknown error"), level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } });
            setTimeout(() => setToast(null), 5000);
          }
        })} onTestForeflightConnection={async (apiKey, apiSecret) => {
          try {
            const { data, error } = await supabase.functions.invoke('foreflight-test-connection', {
              body: { apiKey, apiSecret },
            });
            if (error) return { success: false, error: error.message };
            return data;
          } catch (e) { return { success: false, error: e.message }; }
        }} onForeflightSyncNow={roGuard(async () => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          try {
            await supabase.functions.invoke('foreflight-sync', {
              body: { orgId, manual: true },
            });
            // Refresh data after sync
            const { data: cfg } = await fetchForeflightConfig(orgId);
            if (cfg) setForeflightConfig(cfg);
            const { data: ff } = await fetchForeflightFlights(orgId);
            setForeflightFlights(ff || []);
            const { data: pff } = await fetchPendingForeflightFlights(orgId);
            setPendingFfFlights(pff || []);
            setToast({ message: "ForeFlight sync complete", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
            setTimeout(() => setToast(null), 3000);
          } catch (e) {
            setToast({ message: "Sync failed: " + e.message, level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } });
            setTimeout(() => setToast(null), 5000);
          }
        })} schedaeroConfig={schedaeroConfig} onSaveSchedaeroConfig={roGuard(async (configData) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          const { data, error } = await upsertSchedaeroConfig(orgId, configData);
          if (!error && data) {
            setSchedaeroConfig(data);
            setToast({ message: "Schedaero configuration saved", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
            setTimeout(() => setToast(null), 3000);
          } else {
            setToast({ message: "Failed to save: " + (error?.message || "Unknown error"), level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } });
            setTimeout(() => setToast(null), 5000);
          }
        })} onTestSchedaeroConnection={async (apiKey) => {
          try {
            const { data, error } = await supabase.functions.invoke('schedaero-test-connection', {
              body: { apiKey },
            });
            if (error) return { success: false, error: error.message };
            return data;
          } catch (e) { return { success: false, error: e.message }; }
        }} onSchedaeroSyncNow={roGuard(async () => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          try {
            await supabase.functions.invoke('schedaero-sync', {
              body: { orgId, manual: true },
            });
            const { data: cfg } = await fetchSchedaeroConfig(orgId);
            if (cfg) setSchedaeroConfig(cfg);
            const { data: sc } = await fetchSchedaeroTrips(orgId);
            setSchedaeroTrips(sc || []);
            const { data: psc } = await fetchPendingSchedaeroTrips(orgId);
            setPendingScTrips(psc || []);
            setToast({ message: "Schedaero sync complete", level: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", color: GREEN } });
            setTimeout(() => setToast(null), 3000);
          } catch (e) {
            setToast({ message: "Sync failed: " + e.message, level: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: RED } });
            setTimeout(() => setToast(null), 5000);
          }
        })} apiKeys={apiKeys} webhooks={webhooksData} onCreateApiKey={roGuard(async (keyData) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await createApiKey(orgId, keyData);
          fetchApiKeys(orgId).then(({ data }) => setApiKeys(data || []));
        })} onRevokeApiKey={roGuard(async (keyId) => {
          await updateApiKey(keyId, { is_active: false });
          const orgId = profile?.org_id;
          if (orgId) fetchApiKeys(orgId).then(({ data }) => setApiKeys(data || []));
        })} onCreateWebhook={roGuard(async (webhookData) => {
          const orgId = profile?.org_id;
          if (!orgId) return;
          await createWebhook(orgId, webhookData);
          fetchWebhooks(orgId).then(({ data }) => setWebhooksData(data || []));
        })} onUpdateWebhook={roGuard(async (webhookId, updates) => {
          await updateWebhook(webhookId, updates);
          const orgId = profile?.org_id;
          if (orgId) fetchWebhooks(orgId).then(({ data }) => setWebhooksData(data || []));
        })} onDeleteWebhook={roGuard(async (webhookId) => {
          await deleteWebhook(webhookId);
          const orgId = profile?.org_id;
          if (orgId) fetchWebhooks(orgId).then(({ data }) => setWebhooksData(data || []));
        })} onTestWebhook={async (webhookId) => {
          try {
            const token = (await supabase.auth.getSession())?.data?.session?.access_token;
            const res = await fetch("/api/test-webhook", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ webhookId }),
            });
            return await res.json();
          } catch (e) { return { success: false, error: e.message }; }
        }} />}
      </main>
      <footer style={{ textAlign: "center", padding: "16px", color: SUBTLE, fontSize: 10, borderTop: `1px solid ${BORDER}` }}>
        {orgName} Safety Management System · PreflightSMS · 14 CFR Part 5 SMS · {new Date().getFullYear()}</footer>
      </div>{/* end main-content */}
      {/* ── Floating Action Buttons ─────────────────────── */}
      {session && cv !== "submit" && (
        <div className="fab-container" style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 10, zIndex: 1000 }}>
          {cv !== "reports" && (
            <button onClick={() => { setReportPrefill({}); setCv("reports"); }} title="File a safety report"
              style={{ width: 48, height: 48, borderRadius: "50%", border: "none", background: "rgba(74,222,128,0.15)", color: GREEN, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.4)", transition: "all 0.15s", backdropFilter: "blur(8px)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(74,222,128,0.3)"; e.currentTarget.style.transform = "scale(1.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(74,222,128,0.15)"; e.currentTarget.style.transform = "scale(1)"; }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </button>
          )}
          <button onClick={() => setCv("submit")} title="New FRAT"
            style={{ width: 56, height: 56, borderRadius: "50%", border: "none", background: WHITE, color: BLACK, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", transition: "all 0.15s", fontWeight: 800, fontSize: 13 }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.5)"; }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      )}
      <style>{`*{box-sizing:border-box}input:focus,select:focus,textarea:focus{outline:none;border-color:${WHITE} !important;box-shadow:0 0 0 2px rgba(255,255,255,0.15) !important}select option{background:${NEAR_BLACK};color:${OFF_WHITE}}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${DARK}}::-webkit-scrollbar-thumb{background:${BORDER};border-radius:3px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes checkDraw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
.fade-in{animation:fadeIn 0.2s ease-out}
button:focus-visible{outline:2px solid ${WHITE};outline-offset:2px}
a:focus-visible{outline:2px solid ${WHITE};outline-offset:2px}
@keyframes tourPulse{0%,100%{box-shadow:0 0 0 3px #ffffff,0 0 12px rgba(255,255,255,0.15)}50%{box-shadow:0 0 0 3px #22d3ee,0 0 24px rgba(34,211,238,0.35)}}
.tour-highlight-ring{animation:tourPulse 2s ease-in-out infinite}
@media(max-width:768px){
.fab-container{bottom:calc(72px + env(safe-area-inset-bottom, 8px)) !important;right:16px !important}
.mobile-bottom-nav{display:flex !important;padding:8px 24px calc(10px + env(safe-area-inset-bottom, 0px)) 24px !important}
.score-panel-mobile{padding-bottom:env(safe-area-inset-bottom, 6px) !important}
.frat-grid{grid-template-columns:1fr !important}
.flight-info-grid{grid-template-columns:1fr 1fr !important}
.fleet-status-desktop{display:none !important}
.fleet-status-mobile{display:flex !important}
.score-panel-desktop{display:none !important}
.score-panel-mobile{display:flex !important;bottom:calc(60px + env(safe-area-inset-bottom, 8px)) !important}
.nav-sidebar{display:none !important}
.nav-mobile-header{display:flex !important}
.nav-mobile-menu{display:flex !important}
.main-content{margin-left:0 !important;padding:0 !important}
.main-content main{padding:12px 16px 80px !important}
.main-content h1{font-size:16px !important}
.user-info-desktop{display:none !important}
.stat-grid{grid-template-columns:repeat(2,1fr) !important}
.crew-grid{grid-template-columns:1fr !important}
.chart-grid-2{grid-template-columns:1fr !important}
.signup-split{grid-template-columns:1fr !important;min-height:auto !important}
.signup-left-panel{display:none !important}
.signup-right-panel{padding:24px 20px !important}
.signup-plan-grid{grid-template-columns:1fr !important}
.admin-org-grid{grid-template-columns:1fr !important}
.admin-tabs{overflow-x:auto !important;flex-wrap:nowrap !important;-webkit-overflow-scrolling:touch}
.admin-tabs button{white-space:nowrap !important;flex-shrink:0 !important;min-width:auto !important;min-height:auto !important;padding:6px 12px !important;font-size:11px !important}
.admin-toggle{min-height:22px !important;min-width:40px !important}
.admin-toggle-sm{min-height:20px !important;min-width:36px !important}
.plan-feature-grid{grid-template-columns:1fr !important}
.invite-form-grid{grid-template-columns:1fr !important}
.trial-expired-plans{flex-direction:column !important}
.trial-banner{flex-direction:column !important;gap:8px !important;text-align:center}
.flight-board-grid{grid-template-columns:1fr !important}
.plan-grid{grid-template-columns:1fr 1fr !important}
.report-grid{grid-template-columns:1fr !important}
.onboarding-tour-card{top:auto !important;bottom:0 !important;right:0 !important;left:0 !important;width:100% !important;border-radius:16px 16px 0 0 !important;max-height:60vh;overflow-y:auto}
.tour-highlight-ring{display:none !important}
button,a,[role="button"]{min-height:44px;min-width:44px}
input,select,textarea{min-height:44px;font-size:16px !important}
}
@media(max-width:480px){
.flight-info-grid{grid-template-columns:1fr !important}
.stat-grid{grid-template-columns:1fr !important}
.auth-plan-grid{grid-template-columns:1fr !important}
.plan-grid{grid-template-columns:1fr !important}
}`}</style>
    </div></>);
}
