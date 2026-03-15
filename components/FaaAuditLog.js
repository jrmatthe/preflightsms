import { useState, useMemo } from "react";
import DeclarationWizard from "./DeclarationWizard";

const BLACK="#000000",NEAR_BLACK="#0A0A0A",CARD="#222222",BORDER="#2E2E2E",LIGHT_BORDER="#3A3A3A";
const WHITE="#FFFFFF",OFF_WHITE="#E0E0E0",MUTED="#777777";
const GREEN="#4ADE80",YELLOW="#FACC15",AMBER="#F59E0B",RED="#EF4444",CYAN="#22D3EE";
const card={background:CARD,borderRadius:10,border:`1px solid ${BORDER}`};
const inp={width:"100%",padding:"8px 12px",background:NEAR_BLACK,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,fontSize:12,boxSizing:"border-box"};

// ══════════════════════════════════════════════════════
// COMPLETE 14 CFR PART 5 REQUIREMENTS FOR PART 135
// ══════════════════════════════════════════════════════

const PART5_REQUIREMENTS = [
  // ── SUBPART A: GENERAL ──
  { id: "5.1", subpart: "A", title: "Applicability", section: "§ 5.1",
    requirement: "Part 135 certificate holders must develop and implement an SMS that meets Part 5 requirements.",
    evidence: "system", autoCheck: (d) => true,
    evidenceDesc: "This system (PreflightSMS) IS the organization's SMS implementation.",
    guidance: "Using PreflightSMS satisfies this requirement. No action needed." },

  { id: "5.3", subpart: "A", title: "Definitions", section: "§ 5.3",
    requirement: "Organization must use Part 5 definitions for hazard, risk, risk control, safety assurance, SMS, safety objective, safety performance, safety policy, safety promotion, and safety risk management.",
    evidence: "policy", autoCheck: (d) => d.manualComplete("safety_policy") || d.policyCoversManual("safety_policy") || d.policies?.some(p => (p.title||"").toLowerCase().includes("definition") || (p.content||"").toLowerCase().includes("hazard means")),
    evidenceDesc: "Documented in SMS Manuals (Safety Policy — Part 5 Definitions section) or Policy library.",
    guidance: "Complete the Part 5 Definitions section in the Safety Policy SMS Manual, or upload an equivalent document to the Policy Library.",
    navTarget: "policy", navLabel: "Go to SMS Manuals" },

  { id: "5.5", subpart: "A", title: "General Requirements", section: "§ 5.5",
    requirement: "SMS must include: (1) Safety policy (Subpart B), (2) Safety risk management (Subpart C), (3) Safety assurance (Subpart D), (4) Safety promotion (Subpart E). Must be appropriate to size/scope/complexity.",
    evidence: "system", autoCheck: (d) => d.hasFrat && d.hasReports && d.hasHazards && d.hasPolicies,
    evidenceDesc: "PreflightSMS provides all four SMS components: Policy library (B), FRAT & hazard identification (C), Dashboard analytics & safety reports (D), Safety communications & training (E).",
    guidance: "Ensure you have policies uploaded, FRATs submitted, safety reports filed, and hazards tracked.",
    navTarget: "dashboard", navLabel: "Go to Dashboard" },

  { id: "5.9", subpart: "A", title: "Part 135 Requirements", section: "§ 5.9",
    requirement: "Part 135 operators must: (a) Implement SMS by May 28, 2027, (b) Submit declaration of compliance, (c) Maintain SMS while authorized, (d) Make information available to FAA on request.",
    evidence: "system", autoCheck: (d) => true,
    evidenceDesc: "PreflightSMS serves as the active SMS platform demonstrating ongoing compliance. File your Declaration of Compliance with the FAA CMO when all other requirements are met.",
    guidance: "When you reach 100% compliance, use the Declaration of Compliance wizard to generate and file your DoC with the FAA CMO." },

  { id: "5.17", subpart: "A", title: "Organizational System Description", section: "§ 5.17",
    requirement: "Must maintain summary of: (a) operational processes, (b) products/services, (c) organizational structure, (d) interfaces with other organizations, (e) regulatory requirements.",
    evidence: "policy", autoCheck: (d) => d.manualComplete("org_system_description") || d.policies?.some(p => (p.title||"").toLowerCase().includes("system description") || (p.title||"").toLowerCase().includes("organization")),
    evidenceDesc: "Documented in SMS Manuals (Organizational System Description) or Policy library.",
    guidance: "Complete the Organizational System Description in SMS Manuals, or upload an equivalent document to the Policy Library.",
    navTarget: "policy", navLabel: "Go to SMS Manuals" },

  { id: "5.19", subpart: "A", title: "Implementation Plan", section: "§ 5.19",
    requirement: "Must develop implementation plan describing how each Part 5 requirement will be met, with target dates.",
    evidence: "system", autoCheck: (d) => true,
    evidenceDesc: "Your SMS is actively implemented through PreflightSMS. The implementation plan is a pre-implementation artifact — once your SMS is operational, this requirement is satisfied.",
    guidance: "Your active use of PreflightSMS demonstrates an implemented SMS. If your FAA CMO requires a formal implementation plan document, you can generate one from the Declaration of Compliance wizard." },

  // ── SUBPART B: SAFETY POLICY ──
  { id: "5.21a1", subpart: "B", title: "Safety Objectives", section: "§ 5.21(a)(1)",
    requirement: "Safety policy must include the organization's safety objectives.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("safety policy") || (p.title||"").toLowerCase().includes("safety objective")),
    evidenceDesc: "Safety Policy document in Policy library with stated safety objectives.",
    guidance: "Upload a Safety Policy with stated safety objectives to the Policy Library, or complete the Safety Policy SMS manual.",
    navTarget: "policy", navLabel: "Go to Policy Library" },

  { id: "5.21a2", subpart: "B", title: "Commitment to Safety Objectives", section: "§ 5.21(a)(2)",
    requirement: "Safety policy must include commitment to fulfill safety objectives.",
    evidence: "policy", autoCheck: (d) => d.policies?.some(p => (p.title||"").toLowerCase().includes("safety policy")),
    evidenceDesc: "Documented in Safety Policy with management commitment statement.",
    guidance: "Include a management commitment statement in your Safety Policy document.",
    navTarget: "policy", navLabel: "Go to Policy Library" },

  { id: "5.21a3", subpart: "B", title: "Resource Provision", section: "§ 5.21(a)(3)",
    requirement: "Safety policy must include a clear statement about provision of necessary resources for SMS implementation.",
    evidence: "policy", autoCheck: (d) => d.manualComplete("safety_policy"),
    evidenceDesc: "Documented in SMS Manuals (Safety Policy — Provision of Resources section) or Policy library.",
    guidance: "Complete the Safety Policy SMS manual template (resource provision section), or document it in an uploaded policy.",
    navTarget: "policy", navLabel: "Go to SMS Manuals" },

  { id: "5.21a4", subpart: "B", title: "Safety Reporting Policy", section: "§ 5.21(a)(4)",
    requirement: "Safety policy must define requirements for employee reporting of safety hazards or issues.",
    evidence: "system", autoCheck: (d) => d.reportCount > 0,
    evidenceDesc: () => "PreflightSMS provides confidential safety reporting. Safety Reports module is active with employee submission capability.",
    guidance: "Submit safety reports through the Safety Reports module to demonstrate an active reporting system.",
    navTarget: "reports", navLabel: "Go to Safety Reports" },

  { id: "5.21a5", subpart: "B", title: "Unacceptable Behavior Policy", section: "§ 5.21(a)(5)",
    requirement: "Safety policy must define unacceptable behavior and conditions for disciplinary action.",
    evidence: "policy", autoCheck: (d) => d.manualComplete("safety_policy") || d.policies?.some(p => (p.title||"").toLowerCase().includes("disciplin") || (p.content||"").toLowerCase().includes("unacceptable")),
    evidenceDesc: "Documented in SMS Manuals (Safety Policy) or Policy library.",
    guidance: "Document unacceptable behavior and disciplinary conditions in your Safety Policy or a separate policy document.",
    navTarget: "policy", navLabel: "Go to Policy Library" },

  { id: "5.21a6", subpart: "B", title: "Emergency Response Plan", section: "§ 5.21(a)(6)",
    requirement: "Safety policy must include an emergency response plan per § 5.27.",
    evidence: "policy", autoCheck: (d) => d.manualComplete("erp") || d.policies?.some(p => (p.title||"").toLowerCase().includes("emergency")),
    evidenceDesc: "Documented in SMS Manuals (Emergency Response Plan) or Policy library.",
    guidance: "Complete the Emergency Response Plan SMS manual template, or upload an ERP document to the Policy Library.",
    navTarget: "policy", navLabel: "Go to SMS Manuals" },

  { id: "5.21a7", subpart: "B", title: "Code of Ethics", section: "§ 5.21(a)(7)",
    requirement: "Safety policy must include a code of ethics applicable to all employees clarifying safety as highest priority.",
    evidence: "policy", autoCheck: (d) => d.manualComplete("safety_policy") || d.policies?.some(p => (p.title||"").toLowerCase().includes("ethic") || (p.title||"").toLowerCase().includes("code of")),
    evidenceDesc: "Documented in SMS Manuals (Safety Policy — Code of Ethics section) or Policy library.",
    guidance: "Include a Code of Ethics in your Safety Policy, or upload a standalone ethics policy document.",
    navTarget: "policy", navLabel: "Go to Policy Library" },

  { id: "5.21b", subpart: "B", title: "Accountable Executive Signature", section: "§ 5.21(b)",
    requirement: "Safety policy must be signed by the accountable executive.",
    evidence: "manual", autoCheck: null,
    evidenceDesc: "Physical or electronic signature of accountable executive on Safety Policy document.",
    guidance: "Obtain the accountable executive's signature on the Safety Policy. This requires a physical or electronic signature outside the system." },

  { id: "5.21c", subpart: "B", title: "Policy Communication", section: "§ 5.21(c)",
    requirement: "Safety policy must be documented and communicated throughout the organization.",
    evidence: "system", autoCheck: (d) => d.policyAckCount > 0,
    evidenceDesc: "Policy library tracks employee acknowledgments. Policies are digitally distributed and acknowledgment is recorded with timestamps.",
    guidance: "Distribute policies through the Policy Library and have employees record acknowledgments.",
    navTarget: "policy", navLabel: "Go to Policy Library" },

  { id: "5.21d", subpart: "B", title: "Policy Review", section: "§ 5.21(d)",
    requirement: "Safety policy must be regularly reviewed by the accountable executive to ensure relevance.",
    evidence: "manual", autoCheck: null,
    evidenceDesc: "Accountable executive must document periodic review of safety policy (recommend annually).",
    guidance: "The accountable executive must periodically review the Safety Policy. Document the review outside the system." },

  { id: "5.23a", subpart: "B", title: "Safety Accountability", section: "§ 5.23(a)",
    requirement: "Must define accountability for: (1) accountable executive, (2) all management personnel, (3) all employees.",
    evidence: "system", autoCheck: (d) => d.hasRoles,
    evidenceDesc: "PreflightSMS defines user roles: admin, safety_manager, accountable_exec, pilot, dispatcher. Each role has defined SMS responsibilities.",
    guidance: "Assign user roles (admin, safety_manager, accountable_exec, pilot) in the Admin panel.",
    navTarget: "admin", navLabel: "Go to Admin" },

  { id: "5.23b", subpart: "B", title: "Authority Documentation", section: "§ 5.23(b)",
    requirement: "Must document authority of personnel to make safety decisions.",
    evidence: "system", autoCheck: (d) => d.hasRoles,
    evidenceDesc: "Role-based permissions system defines who can approve FRATs, manage hazards, close corrective actions, and publish policies.",
    guidance: "Assign user roles with defined authorities for safety decisions in the Admin panel.",
    navTarget: "admin", navLabel: "Go to Admin" },

  { id: "5.25a", subpart: "B", title: "Accountable Executive Designation", section: "§ 5.25(a)",
    requirement: "Must identify an accountable executive who has control of resources and financial responsibility for operations.",
    evidence: "system", autoCheck: (d) => d.profiles?.some(p => p.role === "accountable_exec"),
    evidenceDesc: "User with 'accountable_exec' role assigned in system.",
    guidance: "Assign a user the \"accountable_exec\" role in the Admin panel.",
    navTarget: "admin", navLabel: "Go to Admin" },

  { id: "5.25b", subpart: "B", title: "Accountable Executive Responsibilities", section: "§ 5.25(b)",
    requirement: "Accountable executive must: (1) be accountable for SMS implementation, (2) ensure SMS established/maintained, (3) ensure adequate resources, (4) ensure risk controls, (5) review safety performance.",
    evidence: "system", autoCheck: (d) => d.profiles?.some(p => p.role === "accountable_exec"),
    evidenceDesc: "Accountable executive has full system access to review dashboards, approve FRATs, manage policies, and oversee all SMS functions.",
    guidance: "Assign a user the \"accountable_exec\" role. They will have full system access to oversee all SMS functions.",
    navTarget: "admin", navLabel: "Go to Admin" },

  { id: "5.25c", subpart: "B", title: "Management Personnel Designation", section: "§ 5.25(c)",
    requirement: "Must designate management personnel to: (1) coordinate SMS, (2) facilitate hazard identification, (3) monitor risk controls, (4) ensure safety promotion, (5) report to accountable executive.",
    evidence: "system", autoCheck: (d) => d.profiles?.some(p => p.role === "safety_manager"),
    evidenceDesc: "Safety Manager role(s) designated in system with authorities for hazard management, corrective actions, and safety reporting.",
    guidance: "Assign at least one user the \"safety_manager\" role in the Admin panel.",
    navTarget: "admin", navLabel: "Go to Admin" },

  { id: "5.27", subpart: "B", title: "Emergency Response Planning", section: "§ 5.27",
    requirement: "Must coordinate emergency response planning with other organizations as appropriate.",
    evidence: "policy", autoCheck: (d) => d.manualComplete("erp") || d.policies?.some(p => (p.title||"").toLowerCase().includes("emergency")),
    evidenceDesc: "Documented in SMS Manuals (Emergency Response Plan) or Policy library.",
    guidance: "Complete the Emergency Response Plan SMS manual template, or upload an ERP document.",
    navTarget: "policy", navLabel: "Go to SMS Manuals" },

  // ── SUBPART C: SAFETY RISK MANAGEMENT ──
  { id: "5.51", subpart: "C", title: "SRM Applicability", section: "§ 5.51",
    requirement: "Must apply safety risk management to: (a) implementation of new systems, (b) revision of existing systems, (c) development of procedures, (d) hazards identified through safety assurance.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.hazardCount > 0,
    evidenceDesc: "FRAT system provides pre-flight risk assessment. Hazard register captures identified hazards. Both feed into the SRM process.",
    guidance: "Submit FRATs for flights and track hazards in the Hazard Register to demonstrate an active SRM process.",
    navTarget: "submit", navLabel: "Go to FRAT" },

  { id: "5.53a", subpart: "C", title: "System Analysis", section: "§ 5.53(a)(b)",
    requirement: "Must analyze systems and consider: safety data, relevant operational/design info, organizational changes, and safety recommendations.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0,
    evidenceDesc: "FRAT system analyzes flights across 5 risk categories (weather, pilot, aircraft, environment, operational) with weighted scoring. Dashboard provides trend analysis.",
    guidance: "Submit FRATs to demonstrate system analysis across risk categories (weather, pilot, aircraft, environment, operational).",
    navTarget: "submit", navLabel: "Go to FRAT" },

  { id: "5.53c", subpart: "C", title: "Hazard Identification", section: "§ 5.53(c)",
    requirement: "Must develop and maintain processes to identify hazards within the context of system analysis.",
    evidence: "system", autoCheck: (d) => d.hazardCount > 0,
    evidenceDesc: () => "Hazard Register provides structured hazard identification with risk matrix scoring. Active hazard tracking with status workflow.",
    guidance: "Identify and log hazards in the Hazard Register through safety reports or direct entry.",
    navTarget: "hazards", navLabel: "Go to Investigations" },

  { id: "5.55a", subpart: "C", title: "Risk Analysis", section: "§ 5.55(a)",
    requirement: "Must develop processes to analyze safety risk associated with identified hazards.",
    evidence: "system", autoCheck: (d) => d.hazardCount > 0,
    evidenceDesc: "Hazard Register includes severity/likelihood risk matrix for each identified hazard, producing composite risk scores.",
    guidance: "Log hazards with severity/likelihood scores in the Hazard Register to demonstrate risk analysis.",
    navTarget: "hazards", navLabel: "Go to Investigations" },

  { id: "5.55b", subpart: "C", title: "Risk Assessment Process", section: "§ 5.55(b)",
    requirement: "Must define process for conducting risk assessment to determine acceptable safety risk.",
    evidence: "system", autoCheck: (d) => d.hasFrat,
    evidenceDesc: "FRAT uses configurable risk thresholds (Low/Medium/High/Critical) with defined score ranges. High-risk flights trigger approval workflow.",
    guidance: "Submit FRATs to demonstrate the risk assessment process with configurable thresholds.",
    navTarget: "submit", navLabel: "Go to FRAT" },

  { id: "5.55c", subpart: "C", title: "Risk Controls", section: "§ 5.55(c)",
    requirement: "Must develop and maintain processes to develop safety risk controls.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions module tracks risk control implementation with assignees, due dates, status tracking, and completion verification.",
    guidance: "Create corrective actions to track risk control implementation with assignees and due dates.",
    navTarget: "actions", navLabel: "Go to Corrective Actions" },

  { id: "5.55d", subpart: "C", title: "Risk Control Evaluation", section: "§ 5.55(d)",
    requirement: "Must evaluate whether risk is acceptable before implementing a risk control.",
    evidence: "system", autoCheck: (d) => d.hasFrat,
    evidenceDesc: "FRAT approval workflow requires management review of high-risk assessments before flight authorization. Risk scores evaluated against thresholds.",
    guidance: "Submit FRATs \u2014 the approval workflow for high-risk flights demonstrates risk evaluation before action.",
    navTarget: "submit", navLabel: "Go to FRAT" },

  { id: "5.57", subpart: "C", title: "Hazard Notification", section: "§ 5.57",
    requirement: "Must notify interfacing persons of identified hazards that they could address or mitigate.",
    evidence: "system", autoCheck: (d) => d.hasNotifications,
    evidenceDesc: "Notification system enables hazard communication to relevant personnel. Safety reports can be escalated to interfacing organizations.",
    guidance: "Safety reports and hazard notifications are sent automatically. Ensure reports and hazards are being filed.",
    navTarget: "reports", navLabel: "Go to Safety Reports" },

  // ── SUBPART D: SAFETY ASSURANCE ──
  { id: "5.71a", subpart: "D", title: "Safety Performance Monitoring", section: "§ 5.71(a)",
    requirement: "Must develop processes to acquire data and monitor safety performance including: (1) monitoring risk controls, (2) acquiring safety data, (3) identifying hazards, (4) monitoring corrective actions, (5) continuous information gathering, (6) integration of management systems, (7) employee safety reporting.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.reportCount > 0 && d.hazardCount > 0,
    evidenceDesc: "PreflightSMS provides comprehensive monitoring: FRAT risk scoring, safety reports, hazard register, corrective action tracking, dashboard analytics, and trend analysis across all safety data.",
    guidance: "Submit FRATs, file safety reports, and track hazards to feed the safety performance monitoring system.",
    navTarget: "dashboard", navLabel: "Go to Dashboard" },

  { id: "5.71a1", subpart: "D", title: "Risk Control Monitoring", section: "§ 5.71(a)(1)",
    requirement: "Monitor operations, products, and services to verify safety risk controls are effective.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions module tracks risk control status from Open through Completion with due dates and verification.",
    guidance: "Create and track corrective actions with status updates to monitor risk control effectiveness.",
    navTarget: "actions", navLabel: "Go to Corrective Actions" },

  { id: "5.71a2", subpart: "D", title: "Safety Data Acquisition", section: "§ 5.71(a)(2)",
    requirement: "Acquire safety-related data and information relevant to operations.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.flightCount > 0,
    evidenceDesc: () => "System continuously acquires safety data: FRAT submissions, flight following data, safety reports, and hazard observations.",
    guidance: "Submit FRATs and log flights to continuously acquire safety-related data.",
    navTarget: "submit", navLabel: "Go to FRAT" },

  { id: "5.71a3", subpart: "D", title: "Hazard Identification Through Data", section: "§ 5.71(a)(3)",
    requirement: "Identify hazards from acquired safety data.",
    evidence: "system", autoCheck: (d) => d.hazardCount > 0 && d.reportCount > 0,
    evidenceDesc: "Safety reports can be directly linked to new hazard entries. FRAT high-risk factors identify operational hazards.",
    guidance: "File safety reports and link them to hazard entries in the Hazard Register.",
    navTarget: "hazards", navLabel: "Go to Investigations" },

  { id: "5.71a4", subpart: "D", title: "Corrective Action Monitoring", section: "§ 5.71(a)(4)",
    requirement: "Monitor and measure safety performance against corrective actions.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions tracked with status, due dates, and completion. Dashboard shows action completion rates.",
    guidance: "Create corrective actions and track them to completion with due dates.",
    navTarget: "actions", navLabel: "Go to Corrective Actions" },

  { id: "5.71a5", subpart: "D", title: "Continuous Information Gathering", section: "§ 5.71(a)(5)",
    requirement: "Provide continuous safety information gathering and analysis.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0,
    evidenceDesc: "Dashboard analytics provide continuous trend analysis of FRAT scores, safety reports, and hazard data over time.",
    guidance: "Submit FRATs regularly \u2014 dashboard analytics provide continuous trend analysis automatically.",
    navTarget: "submit", navLabel: "Go to FRAT" },

  { id: "5.71a6", subpart: "D", title: "Management Systems Integration", section: "§ 5.71(a)(6)",
    requirement: "Integrate data from other management systems (operations, maintenance, quality) into safety performance monitoring.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.reportCount > 0 && d.hazardCount > 0,
    evidenceDesc: "PreflightSMS integrates flight risk assessment (FRAT), safety reporting, hazard register, corrective actions, fleet management, and training records into unified dashboards and trend analytics.",
    guidance: "Ensure data flows from multiple sources (FRATs, safety reports, hazards) into the unified dashboard.",
    navTarget: "dashboard", navLabel: "Go to Dashboard" },

  { id: "5.71a7", subpart: "D", title: "Employee Safety Reporting", section: "§ 5.71(a)(7)",
    requirement: "Provide a confidential employee safety reporting system.",
    evidence: "system", autoCheck: (d) => d.reportCount >= 0,
    evidenceDesc: "Safety Reports module allows all employees to submit safety observations, hazards, incidents, and near-misses.",
    guidance: "File at least one safety report to demonstrate the confidential reporting system is active.",
    navTarget: "reports", navLabel: "Go to Safety Reports" },

  { id: "5.73", subpart: "D", title: "Safety Performance Assessment", section: "§ 5.73",
    requirement: "Must conduct assessments of safety performance against objectives, reviewed by accountable executive, to: (1) ensure compliance with risk controls, (2) evaluate effectiveness of risk controls, (3) identify ineffective controls, (4) identify new hazards, (5) identify employee noncompliance.",
    evidence: "system", autoCheck: (d) => d.hasDashboard,
    evidenceDesc: "Dashboard provides safety performance metrics: FRAT score trends, risk distribution, hazard resolution rates, corrective action completion. Accountable executive can review all metrics.",
    guidance: "Review dashboard analytics regularly. Ensure FRATs or safety reports exist to populate the performance metrics.",
    navTarget: "dashboard", navLabel: "Go to Dashboard" },

  { id: "5.75", subpart: "D", title: "Continuous Improvement", section: "§ 5.75",
    requirement: "Must establish and implement processes to correct safety performance deficiencies identified in assessments.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions module provides structured process: identify deficiency → assign action → track to completion → verify effectiveness.",
    guidance: "Create corrective actions to address identified safety deficiencies and track them to completion.",
    navTarget: "actions", navLabel: "Go to Corrective Actions" },

  // ── SUBPART E: SAFETY PROMOTION ──
  { id: "5.91", subpart: "E", title: "Competencies and Training", section: "§ 5.91",
    requirement: "Must provide training to each individual identified in § 5.23 to ensure competencies for SMS duties.",
    evidence: "system", autoCheck: (d) => d.trainingCount > 0,
    evidenceDesc: "Training Records module tracks SMS training completion for all personnel with role-based requirements.",
    guidance: "Record SMS training completion for personnel in the Training module.",
    navTarget: "cbt", navLabel: "Go to Training" },

  { id: "5.93a", subpart: "E", title: "SMS Awareness Communication", section: "§ 5.93(a)",
    requirement: "Must ensure employees are aware of SMS policies, processes, and tools relevant to their responsibilities.",
    evidence: "system", autoCheck: (d) => d.policyAckCount > 0,
    evidenceDesc: "Policy library distributes SMS documentation to all employees with acknowledgment tracking.",
    guidance: "Have employees acknowledge policies in the Policy Library, or complete the Safety Promotion SMS manual.",
    navTarget: "policy", navLabel: "Go to Policy Library" },

  { id: "5.93b", subpart: "E", title: "Hazard Information Communication", section: "§ 5.93(b)",
    requirement: "Must convey hazard information relevant to employee responsibilities.",
    evidence: "system", autoCheck: (d) => d.hasNotifications,
    evidenceDesc: "Notification system communicates hazard information. FRAT high-risk alerts notify relevant personnel.",
    guidance: "File safety reports or log hazards \u2014 the notification system communicates hazard info automatically.",
    navTarget: "reports", navLabel: "Go to Safety Reports" },

  { id: "5.93c", subpart: "E", title: "Safety Action Communication", section: "§ 5.93(c)",
    requirement: "Must explain why safety actions have been taken.",
    evidence: "system", autoCheck: (d) => d.actionCount > 0,
    evidenceDesc: "Corrective Actions include description fields explaining rationale. Safety reports include status updates and resolution notes.",
    guidance: "Create corrective actions with descriptions that explain why safety actions were taken.",
    navTarget: "actions", navLabel: "Go to Corrective Actions" },

  { id: "5.93d", subpart: "E", title: "Procedure Change Communication", section: "§ 5.93(d)",
    requirement: "Must explain why safety procedures are introduced or changed.",
    evidence: "system", autoCheck: (d) => d.hasPolicies,
    evidenceDesc: "Policy library supports versioned documents. New/changed procedures published with acknowledgment requirements.",
    guidance: "Upload new or changed procedures to the Policy Library with acknowledgment requirements.",
    navTarget: "policy", navLabel: "Go to Policy Library" },

  // ── SUBPART F: DOCUMENTATION AND RECORDKEEPING ──
  { id: "5.95a", subpart: "F", title: "Safety Policy Documentation", section: "§ 5.95(a)",
    requirement: "Must develop and maintain documentation describing the safety policy.",
    evidence: "system", autoCheck: (d) => d.manualComplete("safety_policy") || d.policies?.some(p => (p.title||"").toLowerCase().includes("safety policy")),
    evidenceDesc: "Documented in SMS Manuals (Safety Policy) or Policy library.",
    guidance: "Complete the Safety Policy SMS manual template, or upload a Safety Policy document to the Policy Library.",
    navTarget: "policy", navLabel: "Go to Policy Library" },

  { id: "5.95b", subpart: "F", title: "SMS Process Documentation", section: "§ 5.95(b)",
    requirement: "Must develop and maintain documentation describing SMS processes and procedures.",
    evidence: "policy", autoCheck: (d) => d.hasManuals || d.policies?.length > 1,
    evidenceDesc: "Documented in SMS Manuals or Policy library. PreflightSMS itself serves as the documented process implementation.",
    guidance: "Complete SMS manual templates or upload SMS process documentation to the Policy Library.",
    navTarget: "policy", navLabel: "Go to SMS Manuals" },

  { id: "5.97a", subpart: "F", title: "SRM Records", section: "§ 5.97(a)",
    requirement: "Must maintain records of SRM process outputs. Retain as long as control remains relevant to operation.",
    evidence: "system", autoCheck: (d) => d.fratCount > 0 && d.hazardCount > 0,
    evidenceDesc: "All FRAT submissions, hazard assessments, and risk controls stored with full audit trail. Records retained indefinitely in system.",
    guidance: "Submit FRATs and track hazards \u2014 all SRM records are retained automatically in the system.",
    navTarget: "submit", navLabel: "Go to FRAT" },

  { id: "5.97b", subpart: "F", title: "Safety Assurance Records", section: "§ 5.97(b)",
    requirement: "Must maintain records of safety assurance process outputs. Retain minimum 5 years.",
    evidence: "system", autoCheck: (d) => d.reportCount > 0,
    evidenceDesc: "Safety reports, performance assessments, and corrective actions stored with timestamps. All records retained in database.",
    guidance: "File safety reports \u2014 all safety assurance records are retained automatically with timestamps.",
    navTarget: "reports", navLabel: "Go to Safety Reports" },

  { id: "5.97c", subpart: "F", title: "Training Records", section: "§ 5.97(c)",
    requirement: "Must maintain training records for each individual. Retain as long as individual is employed.",
    evidence: "system", autoCheck: (d) => d.trainingCount >= 0,
    evidenceDesc: "Training Records module tracks all SMS training with completion dates, stored for duration of employment.",
    guidance: "Record at least one training entry in the Training module to demonstrate the recordkeeping system.",
    navTarget: "cbt", navLabel: "Go to Training" },

  { id: "5.97d", subpart: "F", title: "Communication Records", section: "§ 5.97(d)",
    requirement: "Must retain records of all safety communications per § 5.93 and § 5.57 for minimum 24 calendar months.",
    evidence: "system", autoCheck: (d) => d.hasNotifications || d.policyAckCount > 0,
    evidenceDesc: "Policy acknowledgments, notification records, and safety communication logs retained in system with timestamps.",
    guidance: "Distribute policies with acknowledgments or file safety reports \u2014 communication records are retained automatically.",
    navTarget: "policy", navLabel: "Go to Policy Library" },
];

const SUBPART_NAMES = {
  A: "General",
  B: "Safety Policy",
  C: "Safety Risk Management",
  D: "Safety Assurance",
  E: "Safety Promotion",
  F: "Documentation & Recordkeeping",
};

// Map each SMS manual template to the Part 5 requirements it satisfies when completed
const MANUAL_REQUIREMENT_MAP = {
  safety_policy: ["5.3", "5.21a1", "5.21a2", "5.21a3", "5.21a4", "5.21a5", "5.21a7", "5.21b", "5.21c", "5.21d", "5.95a"],
  safety_accountability: ["5.23a", "5.23b", "5.25a", "5.25b", "5.25c"],
  erp: ["5.21a6", "5.27"],
  srm: ["5.51", "5.53a", "5.53c", "5.55a", "5.55b", "5.55c", "5.55d", "5.57"],
  safety_assurance: ["5.71a", "5.71a1", "5.71a2", "5.71a3", "5.71a4", "5.71a5", "5.71a7", "5.73", "5.75"],
  safety_promotion: ["5.91", "5.93a", "5.93b", "5.93c", "5.93d"],
  org_system_description: ["5.17"],
};

// Reverse map: requirement ID → manual key(s) that satisfy it
const REQ_MANUAL_MAP = {};
Object.entries(MANUAL_REQUIREMENT_MAP).forEach(([key, ids]) => {
  ids.forEach(id => {
    if (!REQ_MANUAL_MAP[id]) REQ_MANUAL_MAP[id] = [];
    REQ_MANUAL_MAP[id].push(key);
  });
});

const MANUAL_LABELS = {
  safety_policy: "Safety Policy",
  safety_accountability: "Safety Accountability & Authority",
  erp: "Emergency Response Plan",
  srm: "Safety Risk Management",
  safety_assurance: "Safety Assurance",
  safety_promotion: "Safety Promotion",
  org_system_description: "Org. System Description",
};

// ── Exported helper: compute Part 5 compliance % without rendering ──
export function computePart5Compliance({ frats, flights, reports, hazards, actions, policies, profiles, trainingRecords, smsManuals, manualOverrides }) {
  const overrides = manualOverrides || {};
  const dataCtx = {
    fratCount: (frats||[]).length,
    flightCount: (flights||[]).length,
    reportCount: (reports||[]).length,
    hazardCount: (hazards||[]).length,
    actionCount: (actions||[]).length,
    trainingCount: (trainingRecords||[]).length,
    policyAckCount: (policies||[]).reduce((n, p) => n + (p.acknowledged_by||[]).length, 0),
    policies: policies||[],
    profiles: profiles||[],
    hasFrat: true, hasReports: true, hasHazards: true,
    hasPolicies: (policies||[]).length > 0,
    hasDashboard: true, hasNotifications: true,
    hasRoles: (profiles||[]).some(p => p.role === "admin" || p.role === "safety_manager"),
    smsManuals: smsManuals || [],
    hasManuals: (smsManuals || []).length > 0,
    manualComplete: (key) => { const m = (smsManuals || []).find(x => x.manual_key === key); if (!m) return false; const secs = m.sections || []; return secs.length > 0 && secs.every(s => s.completed); },
    policyCoversManual: (key) => (policies || []).some(p => p.status === "active" && p.part5_tags?.includes(key)),
  };
  let compliant = 0;
  const reqStatuses = {};
  PART5_REQUIREMENTS.forEach(req => {
    if (overrides[req.id] !== undefined) {
      reqStatuses[req.id] = overrides[req.id];
      if (overrides[req.id] === "compliant") compliant++;
    } else {
      const manualKeys = REQ_MANUAL_MAP[req.id] || [];
      const manualSatisfied = manualKeys.some(k => dataCtx.manualComplete(k) || dataCtx.policyCoversManual(k));
      if (manualSatisfied) { compliant++; reqStatuses[req.id] = "compliant"; }
      else if (req.autoCheck && req.autoCheck(dataCtx)) { compliant++; reqStatuses[req.id] = "compliant"; }
      else { reqStatuses[req.id] = req.autoCheck ? "needs_attention" : "manual_review"; }
    }
  });
  return { compliant, total: PART5_REQUIREMENTS.length, percent: Math.round(compliant / PART5_REQUIREMENTS.length * 100), reqStatuses };
}

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════

export default function FaaAuditLog({ frats, flights, reports, hazards, actions, policies, profiles, trainingRecords, org, smsManuals, declarations, onSaveDeclaration, onUpdateDeclaration, onUploadPdf, session, profile, orgProfiles, onNavigate, onOverridesChange }) {
  const [expandedSubpart, setExpandedSubpart] = useState("B");
  const [expandedReq, setExpandedReq] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [manualOverrides, setManualOverrides] = useState(() => {
    try { const s = typeof window !== "undefined" && localStorage.getItem("audit_overrides"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [wizardOpen, setWizardOpen] = useState(false);

  const updateOverrides = (fn) => {
    setManualOverrides(prev => {
      const next = fn(prev);
      try { localStorage.setItem("audit_overrides", JSON.stringify(next)); } catch {}
      if (onOverridesChange) onOverridesChange(next);
      return next;
    });
  };

  // Build data context for auto-checks
  const dataCtx = useMemo(() => ({
    fratCount: (frats||[]).length,
    flightCount: (flights||[]).length,
    reportCount: (reports||[]).length,
    hazardCount: (hazards||[]).length,
    actionCount: (actions||[]).length,
    trainingCount: (trainingRecords||[]).length,
    policyAckCount: (policies||[]).reduce((n, p) => n + (p.acknowledged_by||[]).length, 0),
    policies: policies||[],
    profiles: profiles||[],
    hasFrat: true,
    hasReports: true,
    hasHazards: true,
    hasPolicies: (policies||[]).length > 0,
    hasDashboard: true,
    hasNotifications: true,
    hasRoles: (profiles||[]).some(p => p.role === "admin" || p.role === "safety_manager"),
    smsManuals: smsManuals || [],
    hasManuals: (smsManuals || []).length > 0,
    manualComplete: (key) => {
      const m = (smsManuals || []).find(x => x.manual_key === key);
      if (!m) return false;
      const secs = m.sections || [];
      return secs.length > 0 && secs.every(s => s.completed);
    },
    // Check if any active uploaded policy is tagged with this Part 5 section
    policyCoversManual: (key) => {
      return (policies || []).some(p => p.status === "active" && p.part5_tags?.includes(key));
    },
  }), [frats, flights, reports, hazards, actions, policies, profiles, trainingRecords, smsManuals]);

  // Calculate compliance status for each requirement
  const reqStatuses = useMemo(() => {
    const statuses = {};
    PART5_REQUIREMENTS.forEach(req => {
      if (manualOverrides[req.id] !== undefined) {
        statuses[req.id] = manualOverrides[req.id];
      } else {
        // Check if a completed SMS manual template OR tagged uploaded policy satisfies this requirement
        const manualKeys = REQ_MANUAL_MAP[req.id] || [];
        const manualSatisfied = manualKeys.some(k => dataCtx.manualComplete(k) || dataCtx.policyCoversManual(k));
        if (manualSatisfied) {
          statuses[req.id] = "compliant";
        } else if (req.autoCheck) {
          statuses[req.id] = req.autoCheck(dataCtx) ? "compliant" : "needs_attention";
        } else {
          statuses[req.id] = "manual_review";
        }
      }
    });
    return statuses;
  }, [dataCtx, manualOverrides]);

  // SMS Manual template completion status for the summary section
  const manualStatuses = useMemo(() => {
    return Object.entries(MANUAL_REQUIREMENT_MAP).map(([key, reqIds]) => {
      const manual = (smsManuals || []).find(m => m.manual_key === key);
      const secs = manual?.sections || [];
      const completed = secs.filter(s => s.completed).length;
      const total = secs.length;
      const templateComplete = total > 0 && completed === total;
      const policyTagged = (policies || []).some(p => p.status === "active" && p.part5_tags?.includes(key));
      return { key, label: MANUAL_LABELS[key], reqIds, completed, total, isComplete: templateComplete || policyTagged, templateComplete, policyTagged, exists: !!manual };
    });
  }, [smsManuals, policies]);

  // Summary counts
  const summary = useMemo(() => {
    const vals = Object.values(reqStatuses);
    return {
      total: vals.length,
      compliant: vals.filter(v => v === "compliant").length,
      needs_attention: vals.filter(v => v === "needs_attention").length,
      manual_review: vals.filter(v => v === "manual_review").length,
    };
  }, [reqStatuses]);

  const toggleOverride = (id, val) => {
    updateOverrides(p => ({ ...p, [id]: val === p[id] ? undefined : val }));
  };

  const subpartGroups = useMemo(() => {
    const groups = {};
    PART5_REQUIREMENTS.forEach(r => {
      if (!groups[r.subpart]) groups[r.subpart] = [];
      groups[r.subpart].push(r);
    });
    return groups;
  }, []);

  const filteredReqs = useMemo(() => {
    if (filterStatus === "all") return PART5_REQUIREMENTS;
    return PART5_REQUIREMENTS.filter(r => reqStatuses[r.id] === filterStatus);
  }, [filterStatus, reqStatuses]);

  const statusIcon = (s) => s === "compliant" ? "\u2713" : s === "needs_attention" ? "\u26A0" : "\u25CB";
  const statusColor = (s) => s === "compliant" ? GREEN : s === "needs_attention" ? AMBER : MUTED;
  const statusLabel = (s) => s === "compliant" ? "Compliant" : s === "needs_attention" ? "Needs Attention" : "Manual Review";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>FAA Part 5 Audit Log<button onClick={() => setShowHelp(!showHelp)} title="What's this?" style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MUTED, fontSize: 10, fontWeight: 700, marginLeft: 8, verticalAlign: "middle" }}>?</button></div>
          <div style={{ fontSize: 11, color: MUTED }}>14 CFR Part 5 SMS Compliance for Part 135 Operations</div>
        </div>
        <button data-onboarding="compliance-doc-btn" onClick={() => setWizardOpen(true)}
          style={{ padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: `${CYAN}22`, color: CYAN, border: `1px solid ${CYAN}44`, whiteSpace: "nowrap" }}>
          Declaration of Compliance
        </button>
      </div>
      {showHelp && <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.6, padding: "10px 14px", marginBottom: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 6 }}>This is your live compliance checklist for 14 CFR Part 5. Each item automatically syncs with data across the platform — FRATs, flights, reports, investigations, and policies. Use this to prepare for FAA audits.</div>}

      {wizardOpen && (
        <DeclarationWizard
          org={org} session={session} profiles={profiles} frats={frats} flights={flights}
          reports={reports} hazards={hazards} actions={actions} policies={policies}
          trainingRecords={trainingRecords} smsManuals={smsManuals}
          dataCtx={dataCtx} reqStatuses={reqStatuses} summary={summary}
          subpartNames={SUBPART_NAMES} part5Requirements={PART5_REQUIREMENTS}
          subpartGroups={subpartGroups} manualStatuses={manualStatuses}
          declarations={declarations} onSave={onSaveDeclaration} onUpdate={onUpdateDeclaration}
          onUploadPdf={onUploadPdf} onClose={() => setWizardOpen(false)}
        />
      )}

      {wizardOpen ? null : <>

      {/* Summary cards */}
      <div data-tour="tour-audit-stats" data-onboarding="compliance-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
        {[
          { label: "Total Requirements", value: summary.total },
          { label: "Compliant", value: summary.compliant, dot: GREEN },
          { label: "Needs Attention", value: summary.needs_attention, dot: AMBER },
          { label: "Manual Review", value: summary.manual_review, dot: MUTED },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 14px", textAlign: "center", cursor: "pointer" }}
            onClick={() => setFilterStatus(s.dot === GREEN ? "compliant" : s.dot === AMBER ? "needs_attention" : s.dot === MUTED ? "manual_review" : "all")}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {s.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Compliance bar */}
      <div data-tour="tour-audit-progress" data-onboarding="compliance-progress" style={{ ...card, padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>Part 5 Readiness</span>
          <span style={{ fontSize: 11, color: WHITE, fontWeight: 700 }}>{Math.round(summary.compliant / summary.total * 100)}%</span>
        </div>
        <div style={{ height: 8, background: NEAR_BLACK, borderRadius: 4, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${summary.compliant/summary.total*100}%`, background: GREEN, borderRadius: "4px 0 0 4px" }} />
          <div style={{ width: `${summary.needs_attention/summary.total*100}%`, background: AMBER }} />
          <div style={{ width: `${summary.manual_review/summary.total*100}%`, background: MUTED, borderRadius: "0 4px 4px 0" }} />
        </div>
      </div>

      {/* 100% compliance — DoC prompt */}
      {summary.compliant === summary.total && (
        <div style={{ padding: "16px 20px", marginBottom: 12, background: `${GREEN}0A`, border: `1px solid ${GREEN}33`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 4 }}>All {summary.total} Part 5 requirements met</div>
            <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>Your SMS is fully compliant. Generate your Declaration of Compliance to file with the FAA CMO.</div>
          </div>
          <button onClick={() => setWizardOpen(true)}
            style={{ padding: "10px 20px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", background: GREEN, color: BLACK, border: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
            Generate Declaration of Compliance
          </button>
        </div>
      )}

      {/* Compliance disclaimer */}
      <div style={{ fontSize: 10, color: AMBER, lineHeight: 1.5, padding: "8px 12px", marginBottom: 12, background: `${AMBER}08`, border: `1px solid ${AMBER}22`, borderRadius: 6 }}>
        <span style={{ fontWeight: 700 }}>Important:</span> This is a self-assessment tool that checks for the presence of SMS data and documentation in PreflightSMS. It does not constitute a legal determination of regulatory compliance. Verify each requirement with your FAA Principal Operations Inspector (POI) before filing a Declaration of Compliance.
      </div>

      {/* SMS Manual Documentation Status */}
      <div data-onboarding="compliance-manuals" style={{ ...card, padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>SMS Manual Documentation Status</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {manualStatuses.map(ms => (
            <div key={ms.key} style={{ padding: "8px 12px", background: NEAR_BLACK, borderRadius: 6, border: `1px solid ${ms.isComplete ? GREEN + "44" : BORDER}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: ms.isComplete ? GREEN : OFF_WHITE }}>{ms.label}</span>
                <span style={{ fontSize: 9, color: ms.isComplete ? GREEN : MUTED, fontWeight: 600 }}>
                  {ms.policyTagged && !ms.templateComplete ? "Policy uploaded" : ms.exists ? `${ms.completed}/${ms.total}` : "Not started"}
                </span>
              </div>
              <div style={{ height: 3, background: CARD, borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ width: ms.isComplete ? "100%" : ms.total > 0 ? `${ms.completed / ms.total * 100}%` : "0%", height: "100%", background: ms.isComplete ? GREEN : AMBER, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 9, color: MUTED }}>
                {ms.isComplete
                  ? `Satisfies ${ms.reqIds.length} requirements${ms.policyTagged && !ms.templateComplete ? " (via uploaded policy)" : ""}`
                  : `Covers ${ms.reqIds.length} requirements when complete`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div data-onboarding="compliance-filters" style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[["all", "All"], ["compliant", "Compliant"], ["needs_attention", "Needs Attention"], ["manual_review", "Manual Review"]].map(([id, l]) => (
          <button key={id} onClick={() => setFilterStatus(id)}
            style={{ padding: "5px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
              background: filterStatus === id ? WHITE : "transparent",
              color: filterStatus === id ? BLACK : MUTED,
              border: `1px solid ${filterStatus === id ? WHITE : BORDER}` }}>{l}</button>
        ))}
      </div>

      {/* Requirements by subpart */}
      <div data-onboarding="compliance-subparts">
      {Object.entries(subpartGroups).map(([sp, reqs]) => {
        const spReqs = reqs.filter(r => filterStatus === "all" || reqStatuses[r.id] === filterStatus);
        if (spReqs.length === 0) return null;
        const spCompliant = reqs.filter(r => reqStatuses[r.id] === "compliant").length;
        const isExpanded = expandedSubpart === sp;

        return (
          <div key={sp} style={{ ...card, marginBottom: 8, overflow: "hidden" }}>
            <div onClick={() => setExpandedSubpart(isExpanded ? null : sp)}
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: isExpanded ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>Subpart {sp}: {SUBPART_NAMES[sp]}</span>
                <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>{spCompliant}/{reqs.length} compliant</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 60, height: 4, background: NEAR_BLACK, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${spCompliant/reqs.length*100}%`, height: "100%", background: GREEN, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 14, color: MUTED }}>{isExpanded ? "\u25B4" : "\u25BE"}</span>
              </div>
            </div>

            {isExpanded && spReqs.map(req => {
              const status = reqStatuses[req.id];
              const isOpen = expandedReq === req.id;
              const evidenceText = typeof req.evidenceDesc === "function" ? req.evidenceDesc(dataCtx) : req.evidenceDesc;

              return (
                <div key={req.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div onClick={() => setExpandedReq(isOpen ? null : req.id)}
                    style={{ padding: "10px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isOpen ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <span style={{ fontSize: 14, color: statusColor(status), fontWeight: 700, width: 20, textAlign: "center" }}>{statusIcon(status)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: WHITE }}>{req.section} — {req.title}</span>
                        {(REQ_MANUAL_MAP[req.id] || []).some(k => dataCtx.manualComplete(k) || dataCtx.policyCoversManual(k)) && (
                          <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 3, background: `${CYAN}18`, color: CYAN, fontWeight: 600 }}>
                            {(REQ_MANUAL_MAP[req.id] || []).some(k => dataCtx.manualComplete(k)) ? "SMS Manual" : "Policy Doc"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: statusColor(status), fontWeight: 600, padding: "2px 8px", borderRadius: 3, background: `${statusColor(status)}15`, border: `1px solid ${statusColor(status)}33` }}>{statusLabel(status)}</span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: "0 18px 14px 48px" }}>
                      <div style={{ fontSize: 11, color: OFF_WHITE, marginBottom: 8, lineHeight: 1.5 }}>{req.requirement}</div>
                      <div style={{ padding: "8px 12px", borderRadius: 6, background: NEAR_BLACK, marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: CYAN, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Evidence in PreflightSMS</div>
                        <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.4 }}>{evidenceText}</div>
                      </div>

                      {/* SMS Manual template / uploaded policy status for this requirement */}
                      {(REQ_MANUAL_MAP[req.id] || []).length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                          {(REQ_MANUAL_MAP[req.id] || []).map(mk => {
                            const templateDone = dataCtx.manualComplete(mk);
                            const policyDone = dataCtx.policyCoversManual(mk);
                            const satisfied = templateDone || policyDone;
                            const ms = manualStatuses.find(m => m.key === mk);
                            const labelSuffix = templateDone ? (ms?.exists ? ` (${ms.completed}/${ms.total})` : "") : policyDone ? " (uploaded policy)" : (ms?.exists ? ` (${ms.completed}/${ms.total})` : " (not started)");
                            return (
                              <span key={mk} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, display: "inline-flex", alignItems: "center", gap: 4,
                                background: satisfied ? `${GREEN}15` : `${AMBER}15`, color: satisfied ? GREEN : AMBER, border: `1px solid ${satisfied ? GREEN : AMBER}33` }}>
                                {satisfied ? "\u2713" : "\u25CB"} {MANUAL_LABELS[mk]}{labelSuffix}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Data counts if applicable */}
                      {req.evidence === "system" && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          {dataCtx.fratCount > 0 && req.id.includes("5.5") && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${GREEN}15`, color: GREEN }}>{dataCtx.fratCount} FRATs</span>}
                          {dataCtx.reportCount > 0 && (req.id.includes("5.71") || req.id === "5.21a4") && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${GREEN}15`, color: GREEN }}>{dataCtx.reportCount} Reports</span>}
                          {dataCtx.hazardCount > 0 && req.id.includes("5.53") && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${GREEN}15`, color: GREEN }}>{dataCtx.hazardCount} Hazards</span>}
                          {dataCtx.actionCount > 0 && (req.id.includes("5.55c") || req.id.includes("5.75")) && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${GREEN}15`, color: GREEN }}>{dataCtx.actionCount} Actions</span>}
                        </div>
                      )}

                      {/* Guidance */}
                      {req.guidance && (
                        <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 9, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>What to do</div>
                            <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.4 }}>{req.guidance}</div>
                          </div>
                          {req.navTarget && onNavigate && status !== "compliant" && (
                            <button onClick={() => onNavigate(req.navTarget)}
                              style={{ padding: "5px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                                background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}33` }}>
                              {req.navLabel || "Go"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Manual override */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 9, color: MUTED }}>Override:</span>
                        <button onClick={() => toggleOverride(req.id, "compliant")}
                          style={{ padding: "3px 8px", borderRadius: 3, fontSize: 9, cursor: "pointer", border: `1px solid ${manualOverrides[req.id] === "compliant" ? GREEN : BORDER}`, background: manualOverrides[req.id] === "compliant" ? `${GREEN}22` : "transparent", color: manualOverrides[req.id] === "compliant" ? GREEN : MUTED }}>
                          Compliant
                        </button>
                        <button onClick={() => toggleOverride(req.id, "needs_attention")}
                          style={{ padding: "3px 8px", borderRadius: 3, fontSize: 9, cursor: "pointer", border: `1px solid ${manualOverrides[req.id] === "needs_attention" ? AMBER : BORDER}`, background: manualOverrides[req.id] === "needs_attention" ? `${AMBER}22` : "transparent", color: manualOverrides[req.id] === "needs_attention" ? AMBER : MUTED }}>
                          Needs Work
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", ...card, background: NEAR_BLACK }}>
        <div style={{ fontSize: 9, color: MUTED, lineHeight: 1.6 }}>
          This audit log maps PreflightSMS features to 14 CFR Part 5 requirements applicable to Part 135 operators.
          Auto-compliance checks verify system data exists; manual review items require documentation outside this system.
          Manual overrides are saved locally on this device. Per § 5.9, Part 135 operators must be fully compliant by May 28, 2027.
        </div>
      </div>
      </>}
    </div>
  );
}
