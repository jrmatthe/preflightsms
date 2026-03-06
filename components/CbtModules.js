import { useState, useEffect, useMemo, useCallback } from "react";

const CARD = "#161616", NEAR_BLACK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", BLACK = "#000000";
const BORDER = "#232323", SUBTLE = "#555555";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE", AMBER = "#F59E0B";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };
const btn = { padding: "8px 14px", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer", border: "none", fontFamily: "inherit" };
const btnPrimary = { ...btn, background: WHITE, color: BLACK };
const btnGhost = { ...btn, background: "transparent", color: MUTED, border: `1px solid ${BORDER}` };

const TRAINING_CATEGORIES = [
  { id: "sms", label: "SMS Training" },
  { id: "initial", label: "Initial Training" },
  { id: "recurrent", label: "Recurrent" },
  { id: "aircraft_specific", label: "Aircraft Specific" },
  { id: "emergency", label: "Emergency Procedures" },
  { id: "hazmat", label: "Hazmat" },
  { id: "security", label: "Security" },
  { id: "crew_resource", label: "CRM" },
  { id: "company", label: "Company" },
  { id: "other", label: "Other" },
];

// Parse YouTube/Vimeo URLs into embeddable iframe src
function getEmbedUrl(url) {
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

const CATEGORIES = [
  { id: "sms", label: "SMS" }, { id: "initial", label: "Initial" }, { id: "recurrent", label: "Recurrent" },
  { id: "aircraft_specific", label: "Aircraft" }, { id: "emergency", label: "Emergency" }, { id: "hazmat", label: "Hazmat" },
  { id: "security", label: "Security" }, { id: "crew_resource", label: "CRM" }, { id: "company", label: "Company" },
];

// ── PART 5 TRAINING REQUIREMENTS (pre-seed) ─────────────────────
const PART5_TRAINING_REQUIREMENTS = [
  { title: "Safety Policy & SMS Foundations", description: "Training on SMS principles, the four pillars, safety policy, organizational roles and accountability, safety reporting, and just culture per Subpart B (§5.21, §5.23, §5.25).", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
  { title: "Safety Risk Management", description: "Training on hazard identification, system analysis, risk assessment using likelihood/severity matrices, and risk control development per Subpart C (§5.51–§5.55).", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
  { title: "Safety Assurance", description: "Training on safety performance monitoring, data analysis, safety performance assessment, and continuous improvement per Subpart D (§5.71–§5.75).", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
  { title: "Emergency Response Planning", description: "Training on the organization's Emergency Response Plan including delegation of emergency authority, assignment of responsibilities, and coordination with interfacing organizations per §5.27.", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
  { title: "Safety Promotion", description: "Training on SMS competency requirements, safety communication methods, hazard information dissemination, and explanation of safety actions and procedure changes per Subpart E (§5.91, §5.93).", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
];

// ── PART 5 CBT COURSES (pre-seed) ──────────────────────────────
const PART5_CBT_COURSES = [
  {
    title: "Safety Policy & SMS Foundations",
    description: "Comprehensive training on Safety Management Systems under 14 CFR Part 5 Subpart B. Covers the four pillars, safety policy, safety reporting, just culture, organizational roles and accountability (§5.21, §5.23, §5.25).",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 45,
    lessons: [
      {
        title: "Introduction to SMS & The Four Pillars",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "What Is a Safety Management System?" },
          { type: "text", content: "A Safety Management System (SMS) is a formal, organization-wide approach to managing safety risk and assuring the effectiveness of safety controls. Required by 14 CFR Part 5 for certificate holders operating under Part 121 and voluntarily adopted by Part 135 operators, an SMS provides a structured framework that moves beyond simple regulatory compliance to proactive safety management." },
          { type: "heading", content: "The Four Pillars of SMS" },
          { type: "text", content: "Every SMS is built on four interdependent pillars:\n\n1. Safety Policy (Subpart B, §5.21–§5.27) — Establishes management commitment, safety objectives, reporting policy, and the emergency response plan. This is the foundation that sets the tone for your entire safety culture.\n\n2. Safety Risk Management (Subpart C, §5.51–§5.57) — The processes for identifying hazards, analyzing and assessing risk, and implementing controls. SRM is applied whenever there are changes to systems, procedures, or operations.\n\n3. Safety Assurance (Subpart D, §5.71–§5.75) — Continuous monitoring of safety performance, evaluation of risk controls, and management of change. SA ensures that the controls you put in place actually work.\n\n4. Safety Promotion (Subpart E, §5.91–§5.93) — Training, education, and communication that build a positive safety culture. This course is part of your organization's Safety Promotion program." },
          { type: "callout", content: "Key Point: SMS is not a separate program bolted onto operations — it is integrated into how you plan, execute, and evaluate every aspect of your operation." },
          { type: "text", content: "The FAA designed Part 5 so that each pillar supports the others. Safety Policy sets the direction, SRM identifies and controls risk, Safety Assurance verifies effectiveness, and Safety Promotion ensures everyone has the knowledge and motivation to participate." },
        ],
        quizQuestions: [
          { question: "How many pillars make up an SMS under 14 CFR Part 5?", options: ["Three", "Four", "Five", "Six"], correct: 1, explanation: "SMS is built on four pillars: Safety Policy, Safety Risk Management, Safety Assurance, and Safety Promotion (Subparts B through E of Part 5)." },
          { question: "Which SMS pillar covers hazard identification and risk analysis?", options: ["Safety Policy", "Safety Risk Management", "Safety Assurance", "Safety Promotion"], correct: 1, explanation: "Safety Risk Management (Subpart C, §5.51–§5.57) covers hazard identification, risk analysis, risk assessment, and risk control." },
          { question: "Under which subpart of 14 CFR Part 5 are training requirements defined?", options: ["Subpart B — Safety Policy", "Subpart C — Safety Risk Management", "Subpart D — Safety Assurance", "Subpart E — Safety Promotion"], correct: 3, explanation: "Safety Promotion (Subpart E, §5.91–§5.93) defines competency and training requirements as well as safety communication." },
        ],
      },
      {
        title: "Safety Policy & Your Responsibilities",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "The Safety Policy Framework" },
          { type: "text", content: "Under §5.21, your organization's safety policy must include:\n\n• Safety objectives — Measurable targets the organization commits to achieving\n• Management commitment — A formal declaration of commitment to SMS implementation\n• Provision of resources — Commitment to providing the personnel, training, and tools needed\n• Reporting policy — Requirements and protections for safety reporting\n• Unacceptable behavior policy — Clear definitions of where disciplinary boundaries lie\n• Emergency Response Plan — Coordination procedures for emergencies (§5.27)" },
          { type: "heading", content: "Roles & Accountability (§5.23–§5.25)" },
          { type: "text", content: "Every person in the organization has a role in SMS:\n\n• Accountable Executive — Has ultimate accountability for SMS implementation and must ensure adequate resources, effective risk controls, and regular safety performance review (§5.25(a-b)).\n\n• Safety Manager — Designated to coordinate SMS across the organization, facilitate hazard identification and risk analysis, monitor risk controls, ensure safety promotion, and report to the AE (§5.25(c)).\n\n• All Employees — Accountable for following safety procedures, reporting hazards, completing required training, and supporting the safety culture (§5.23)." },
          { type: "callout", content: "Your responsibility: Know the safety policy, report hazards without fear of retaliation, complete required training, and follow established risk controls." },
          { type: "text", content: "The safety policy is not a document that sits on a shelf. It is the living framework that guides daily decisions. When you encounter a situation where the safe course of action is unclear, the safety policy provides the principles to guide your decision-making." },
        ],
        quizQuestions: [
          { question: "According to §5.25(a), who has ultimate accountability for SMS implementation?", options: ["The Safety Manager", "The Chief Pilot", "The Accountable Executive", "The Director of Operations"], correct: 2, explanation: "Under §5.25(a), the Accountable Executive has ultimate responsibility for SMS implementation, resource allocation, and safety performance oversight." },
          { question: "Which of the following is NOT a required element of the safety policy under §5.21?", options: ["Safety objectives", "Reporting policy", "Fleet maintenance schedule", "Emergency Response Plan reference"], correct: 2, explanation: "§5.21 requires safety objectives, management commitment, resources, reporting policy, unacceptable behavior policy, and ERP reference. Fleet maintenance schedules, while important, are not a required element of the safety policy." },
        ],
      },
      {
        title: "Safety Reporting & Just Culture",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "Why Safety Reporting Matters" },
          { type: "text", content: "Safety reporting is the lifeblood of an SMS. Without a steady flow of reports about hazards, near-misses, and operational concerns, the organization cannot identify risks before they result in accidents. Under §5.21(a)(4), your organization is required to establish a safety reporting policy that encourages open communication about safety issues." },
          { type: "heading", content: "Just Culture Principles" },
          { type: "text", content: "A Just Culture balances accountability with learning. The core principles are:\n\n• Honest mistakes and errors are treated as learning opportunities, not grounds for punishment\n• Reporting a safety concern — even one you caused — is always protected\n• Willful violations, gross negligence, and substance abuse are NOT protected and are subject to disciplinary action (§5.21(a)(5))\n• The goal is to understand WHY errors occur, not to assign blame\n\nThis means you should always report hazards, incidents, and near-misses. The organization cannot fix problems it doesn't know about." },
          { type: "callout", content: "Remember: The only report that can hurt you is the one you don't file. Honest reporting is always protected under your organization's Just Culture policy." },
          { type: "heading", content: "What to Report" },
          { type: "text", content: "You should report:\n• Hazards — Conditions or situations that could lead to an unsafe event\n• Near-misses — Events that could have resulted in an accident but didn't\n• Safety concerns — Anything that makes you uncomfortable about the safety of an operation\n• Process deficiencies — Procedures that are unclear, outdated, or difficult to follow\n• Equipment issues — Malfunctions, defects, or design concerns\n\nReports can be submitted through PreflightSMS at any time. Confidentiality protections per §5.71(a)(7) ensure your identity is protected when requested." },
        ],
        quizQuestions: [
          { question: "Under a Just Culture policy, which situation would typically be protected from disciplinary action?", options: ["A pilot who reports a near-miss they were involved in", "A mechanic who intentionally signs off incomplete work", "An employee operating under the influence of alcohol", "A pilot who repeatedly ignores checklist procedures"], correct: 0, explanation: "Under Just Culture, honest mistakes and voluntary reports are protected. Willful violations, intentional negligence, and substance abuse are specifically excluded from protection per §5.21(a)(5)." },
          { question: "What does §5.21(a)(4) require regarding safety reporting?", options: ["Annual safety audits by outside agencies", "Mandatory drug testing for all employees", "A policy defining safety reporting requirements and protections", "GPS tracking of all company aircraft"], correct: 2, explanation: "§5.21(a)(4) requires the organization to establish a safety reporting policy that defines requirements for employees to report safety hazards and issues, along with protections for those who report." },
          { question: "Which of the following is the BEST reason to report a near-miss event?", options: ["To place blame on the responsible party", "To comply with insurance requirements", "To identify hazards before they cause an accident", "To create a paper trail for legal defense"], correct: 2, explanation: "The primary purpose of reporting near-misses is to identify hazards and contributing factors so that risk controls can be implemented before an accident occurs. This is the proactive foundation of SMS." },
        ],
      },
      {
        title: "Accountable Executive Responsibilities",
        sortOrder: 3,
        contentBlocks: [
          { type: "heading", content: "The Accountable Executive Role (§5.25(a-b))" },
          { type: "text", content: "The Accountable Executive (AE) is the single person who bears ultimate accountability for SMS implementation. Under §5.25(a), the AE must have:\n\n• Control of the resources required for operations authorized under the certificate\n• Responsibility for the financial affairs of the organization\n• Final authority over operations conducted under the certificate\n\nThis is typically the CEO, President, or certificate holder. The AE cannot delegate this accountability — though specific tasks may be delegated, the accountability remains with the AE." },
          { type: "heading", content: "Five Core AE Responsibilities (§5.25(b))" },
          { type: "text", content: "Under §5.25(b), the Accountable Executive is specifically responsible for:\n\n1. Ensuring the SMS is properly implemented and performing in all areas of the organization\n2. Ensuring the SMS is implemented and functions as designed\n3. Ensuring the necessary resources for SMS are available\n4. Ensuring effective safety risk controls are in place\n5. Regularly reviewing the organization's safety performance\n\nThese are not passive responsibilities. The AE must actively engage with the SMS — reviewing safety performance data, approving high-level risk acceptances, ensuring corrective actions are completed, and visibly demonstrating commitment to safety." },
          { type: "callout", content: "The AE's signature on the safety policy is not a formality. It represents personal accountability for every element of the SMS. FAA inspectors will verify that the AE is actively engaged, not just a figurehead." },
          { type: "text", content: "Practical AE engagement includes:\n\n• Quarterly review of safety performance indicators with the Safety Manager\n• Personal approval of any risk assessment rated as 'High'\n• Annual review and signing of the safety policy\n• Allocation of budget for safety training, reporting tools, and corrective actions\n• Attendance at safety meetings (at minimum, quarterly safety review boards)\n• Follow-up on overdue corrective actions and open hazards" },
        ],
        quizQuestions: [
          { question: "Under §5.25(a), which attribute must the Accountable Executive possess?", options: ["An airline transport pilot certificate", "Control of operational resources and financial responsibility", "A degree in safety management", "At least 10 years of industry experience"], correct: 1, explanation: "§5.25(a) requires the AE to have control of the resources required for operations and responsibility for the organization's financial affairs. These ensure the AE has the authority and means to fund and support SMS implementation." },
          { question: "How many specific responsibilities does §5.25(b) assign to the Accountable Executive?", options: ["Three", "Five", "Seven", "Ten"], correct: 1, explanation: "§5.25(b) lists five specific responsibilities: (1) ensure SMS is properly implemented, (2) ensure SMS functions as designed, (3) ensure necessary resources, (4) ensure effective risk controls, and (5) regularly review safety performance." },
          { question: "Can the Accountable Executive delegate their SMS accountability to the Safety Manager?", options: ["Yes, through a formal letter of delegation", "Yes, if the Safety Manager agrees", "No — accountability remains with the AE even if tasks are delegated", "Only during the AE's absence"], correct: 2, explanation: "The AE can delegate specific SMS tasks but cannot delegate the accountability itself. This is a fundamental principle of §5.25 — one person must be ultimately accountable for SMS performance." },
        ],
      },
      {
        title: "Safety Manager & Management Personnel Duties",
        sortOrder: 4,
        contentBlocks: [
          { type: "heading", content: "Designated Management Personnel (§5.25(c))" },
          { type: "text", content: "Under §5.25(c), the certificate holder must designate management personnel who, on behalf of the Accountable Executive, are responsible for:\n\n1. Coordinating the SMS throughout the organization\n2. Facilitating hazard identification and safety risk analysis\n3. Monitoring the effectiveness of safety risk controls\n4. Ensuring safety promotion activities are carried out\n5. Regularly reporting to the Accountable Executive on SMS performance\n\nThe Safety Manager typically fulfills most of these functions, but they may be distributed among multiple management positions depending on organizational size." },
          { type: "heading", content: "Day-to-Day Safety Manager Functions" },
          { type: "text", content: "The Safety Manager's daily responsibilities include:\n\n• Monitoring incoming safety reports and triaging by severity\n• Maintaining the hazard register and ensuring timely risk assessments\n• Tracking corrective action completion and verifying effectiveness\n• Preparing safety performance data for management review\n• Coordinating training requirements and tracking compliance\n• Managing the safety reporting system (PreflightSMS)\n• Serving as the primary point of contact for safety-related inquiries\n• Coordinating with the FAA and other regulatory bodies on safety matters\n• Facilitating safety meetings and documenting outcomes\n• Ensuring all SMS documentation is current and accessible" },
          { type: "callout", content: "The Safety Manager is the engine of the SMS. While the AE provides direction and resources, the Safety Manager ensures the system runs day-to-day. Without active engagement from this role, the SMS becomes a paper program." },
          { type: "text", content: "The Chief Pilot often shares SMS management responsibilities, particularly regarding:\n\n• Operational risk decisions (FRAT review, flight approval)\n• Pilot training and competency evaluation\n• Standard operating procedure development and updates\n• Line safety audits and operational observations\n• Crew resource management program oversight" },
        ],
        quizQuestions: [
          { question: "Under §5.25(c), how many specific functions must designated management personnel fulfill?", options: ["Three", "Five", "Seven", "Nine"], correct: 1, explanation: "§5.25(c) lists five specific functions: coordinate SMS, facilitate hazard identification and risk analysis, monitor risk control effectiveness, ensure safety promotion, and report to the AE on SMS performance." },
          { question: "What is the Safety Manager's role regarding the hazard register?", options: ["They only review it annually", "They maintain it and ensure timely risk assessments are completed", "They delegate it entirely to line employees", "They only use it during FAA audits"], correct: 1, explanation: "The Safety Manager actively maintains the hazard register as a core daily responsibility — ensuring new hazards are logged, risk assessments are completed in a timely manner, and controls are tracked through to implementation and verification." },
        ],
      },
    ],
  },
  {
    title: "Safety Risk Management",
    description: "Training on hazard identification, system analysis, risk assessment using likelihood/severity matrices, and risk control development per 14 CFR Part 5 Subpart C (§5.51–§5.55).",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 25,
    lessons: [
      {
        title: "Understanding Hazards, Threats & Risk",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "Definitions That Matter" },
          { type: "text", content: "Before you can manage risk, you need to speak the same language:\n\n• Hazard — A condition that could foreseeably cause or contribute to an aircraft accident (§5.5). Examples: icing conditions, fatigue, unstable approach, runway contamination.\n\n• Threat — A broader term for any event or error that could compromise safety during operations. Not all threats become hazards, but unmanaged threats often do.\n\n• Risk — The composite of predicted severity and likelihood of the potential effect of a hazard (§5.5). Risk is not the hazard itself — it is the measure of what could happen if the hazard is not controlled." },
          { type: "heading", content: "Where Hazards Come From (§5.53)" },
          { type: "text", content: "Under §5.53, hazards are identified through:\n\n• Safety reporting by employees — The most common and valuable source\n• Analysis of flight data (FRAT scores, flight data monitoring)\n• Audit and inspection findings\n• Investigation of incidents and accidents\n• Industry safety data and regulatory information\n• Changes to equipment, procedures, or organizational structure\n• Management observations during line checks and ramp visits" },
          { type: "callout", content: "A hazard is not the same as risk. Ice on a wing is a hazard. The risk is the probability and severity of loss of control that could result if the ice is not removed." },
          { type: "text", content: "Effective hazard identification requires both reactive sources (incident reports, accident data) and proactive sources (FRATs, safety surveys, audits). The SMS emphasizes proactive identification — finding hazards before they cause events." },
        ],
        quizQuestions: [
          { question: "According to §5.5, what is the definition of 'risk' in an SMS context?", options: ["Any condition that could cause an accident", "The composite of predicted severity and likelihood of a hazard's potential effect", "The probability of a mechanical failure", "The financial cost of an accident"], correct: 1, explanation: "Per §5.5, risk is defined as the composite of predicted severity and likelihood of the potential effect of a hazard. It requires evaluating both dimensions." },
          { question: "Which of the following is an example of PROACTIVE hazard identification?", options: ["Investigating an accident after it occurs", "Reviewing an NTSB final report", "Analyzing FRAT scores to identify risk trends", "Responding to an FAA enforcement action"], correct: 2, explanation: "Proactive hazard identification means finding hazards before incidents occur. Analyzing FRAT data trends is proactive because it identifies patterns that could lead to events, rather than reacting to events that already happened." },
        ],
      },
      {
        title: "The Risk Matrix — Likelihood & Severity",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "Risk Assessment Under §5.55(a-b)" },
          { type: "text", content: "Once a hazard is identified, §5.55 requires the organization to assess the risk by evaluating two dimensions:\n\n1. Likelihood — How probable is it that the hazard will result in an adverse event?\n2. Severity — If the event occurs, how bad will the consequences be?" },
          { type: "heading", content: "Likelihood Scale" },
          { type: "text", content: "A typical 5-level likelihood scale:\n\n5 — Frequent: Expected to occur routinely during operations\n4 — Probable: Will occur several times over a period\n3 — Remote: Unlikely but possible; may occur at some point\n2 — Extremely Remote: Very unlikely; not expected but conceivable\n1 — Extremely Improbable: Almost inconceivable that the event will occur" },
          { type: "heading", content: "Severity Scale" },
          { type: "text", content: "A typical severity classification:\n\nA — Catastrophic: Multiple fatalities, hull loss\nB — Hazardous: Serious injury, major aircraft damage, large reduction in safety margins\nC — Major: Significant injury, significant reduction in safety margins, crew workload increase\nD — Minor: Slight injury, minor aircraft damage, slight increase in workload\nE — Negligible: Little or no impact on safety" },
          { type: "callout", content: "The risk matrix combines likelihood and severity to produce a risk level (High, Serious, Medium, Low). Only the Accountable Executive or designated authority can accept High-level risks." },
        ],
        quizQuestions: [
          { question: "What two dimensions are evaluated when assessing risk under §5.55?", options: ["Cost and schedule impact", "Likelihood and severity", "Frequency and duration", "Probability and detectability"], correct: 1, explanation: "§5.55(a-b) requires assessing risk as a combination of the likelihood of a hazard's effect occurring and the severity of that effect. These two dimensions form the risk matrix." },
          { question: "On a standard severity scale, which level represents 'serious injury or major aircraft damage'?", options: ["Catastrophic", "Hazardous", "Major", "Minor"], correct: 1, explanation: "The Hazardous severity level (B) represents serious injury to persons, major aircraft damage, or a large reduction in safety margins. Catastrophic (A) involves fatalities or hull loss." },
          { question: "Who typically has authority to accept a High-level risk assessment?", options: ["Any line pilot", "The maintenance supervisor", "The Accountable Executive or designated authority", "The dispatcher on duty"], correct: 2, explanation: "High-level risks require acceptance by the Accountable Executive or a specifically designated authority. This ensures that significant risk acceptance decisions are made at the appropriate organizational level." },
        ],
      },
      {
        title: "Risk Controls & Mitigation",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "Designing Risk Controls (§5.55(c))" },
          { type: "text", content: "Once risk is assessed, §5.55(c) requires the organization to develop risk controls that reduce the risk to an acceptable level. Risk controls follow a hierarchy of effectiveness:\n\n1. Elimination — Remove the hazard entirely (most effective, often not practical)\n2. Substitution — Replace with something less hazardous\n3. Engineering controls — Physical changes to equipment or environment\n4. Administrative controls — Procedures, policies, training, checklists\n5. Personal protective equipment — Last resort (least effective)" },
          { type: "heading", content: "Evaluating Control Effectiveness (§5.55(d))" },
          { type: "text", content: "Before implementing a risk control, §5.55(d) requires you to assess whether the proposed control will actually work. Consider:\n\n• Does the control address the root cause of the hazard, or just a symptom?\n• Could the control introduce new hazards?\n• Is the control practical and sustainable in daily operations?\n• How will you verify the control is working after implementation?\n• What residual risk remains after the control is in place?" },
          { type: "callout", content: "A risk control that looks good on paper but is routinely ignored in practice provides no actual risk reduction. Effective controls must be practical, understood, and followed." },
          { type: "text", content: "Common risk controls in aviation operations include:\n\n• Weather minimums above regulatory requirements\n• Crew pairing policies (experience matching)\n• Additional training requirements for specific operations\n• Enhanced preflight procedures for known risk areas\n• FRAT score thresholds requiring management review\n• Standard operating procedures for high-risk phases of flight\n\nRemember: The goal is to reduce risk to an acceptable level, not to eliminate all risk. Aviation inherently involves some level of risk." },
        ],
        quizQuestions: [
          { question: "What does §5.55(c) require when risk is assessed as unacceptable?", options: ["Cancel all operations until the hazard is eliminated", "Develop risk controls to reduce risk to an acceptable level", "File a report with the FAA", "Transfer the risk to insurance"], correct: 1, explanation: "§5.55(c) requires the organization to design and implement risk controls that reduce the safety risk of a hazard to an acceptable level. Complete elimination is often not practical in aviation." },
          { question: "In the hierarchy of risk controls, which type is generally MOST effective?", options: ["Administrative controls (procedures, training)", "Elimination of the hazard", "Personal protective equipment", "Engineering controls"], correct: 1, explanation: "Elimination — completely removing the hazard — is the most effective control because the risk no longer exists. However, it is often not practical in aviation, so a combination of engineering and administrative controls is typically used." },
        ],
      },
    ],
  },
  {
    title: "Safety Assurance",
    description: "Training on safety performance monitoring, data analysis, safety performance assessment, and continuous improvement per 14 CFR Part 5 Subpart D (§5.71–§5.75).",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 30,
    lessons: [
      {
        title: "Safety Performance Monitoring",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "Why Monitor Safety Performance? (§5.71)" },
          { type: "text", content: "Safety Risk Management identifies hazards and puts controls in place. Safety Assurance answers the critical follow-up question: Are those controls actually working?\n\nUnder §5.71(a), the organization must monitor its operations, products, and services to:\n\n1. Verify risk controls are effective (§5.71(a)(1))\n2. Acquire safety data to identify new hazards (§5.71(a)(2))\n3. Identify previously unrecognized safety deviations (§5.71(a)(3))\n4. Assess the organization's safety performance overall" },
          { type: "heading", content: "Key Safety Performance Indicators" },
          { type: "text", content: "Safety Performance Indicators (SPIs) are measurable data points that tell you how your SMS is performing. Common SPIs include:\n\n• Number of safety reports submitted per month\n• FRAT completion rate for flights\n• Average FRAT risk scores and trends\n• Hazard closure time (days from identification to mitigation)\n• Training completion rates and currency status\n• Overdue corrective action items\n• Incident and event rates per flight hours\n\nYour Accountable Executive reviews these metrics regularly to ensure the organization is meeting its safety objectives." },
          { type: "callout", content: "Safety monitoring is not about catching people doing things wrong — it is about detecting trends and weaknesses in the system before they lead to incidents." },
          { type: "text", content: "The PreflightSMS dashboard and FAA Audit Log provide real-time visibility into these performance indicators, making it easy for safety managers and the AE to identify emerging risks and track improvement actions." },
        ],
        quizQuestions: [
          { question: "What is the primary purpose of safety performance monitoring under §5.71?", options: ["To discipline employees who make errors", "To verify that risk controls are effective and identify new hazards", "To prepare marketing materials about safety", "To satisfy insurance company requirements"], correct: 1, explanation: "§5.71(a) requires monitoring to verify risk control effectiveness (§5.71(a)(1)), acquire safety data (§5.71(a)(2)), and identify previously unrecognized deviations (§5.71(a)(3)). It is about system-level insight, not individual punishment." },
          { question: "Which of the following is a valid Safety Performance Indicator (SPI)?", options: ["Company revenue per quarter", "Number of safety reports submitted per month", "Employee satisfaction survey score", "Number of new customers acquired"], correct: 1, explanation: "Safety reports per month is a direct indicator of safety culture health and SMS activity. Revenue and customer metrics, while important for business, are not safety performance indicators." },
        ],
      },
      {
        title: "Data Collection & Analysis",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "Safety Data Sources (§5.71(a)(2))" },
          { type: "text", content: "Effective safety assurance depends on collecting data from multiple sources. Under §5.71(a)(2), your organization should gather:\n\n• Safety reports from employees (hazard reports, incident reports, near-miss reports)\n• FRAT assessments for each flight\n• Flight data monitoring records (if available)\n• Maintenance discrepancy reports and squawk sheets\n• Training records and currency data\n• Audit and inspection findings\n• External data: ASRS reports, NTSB recommendations, FAA InFO/SAFO bulletins, industry safety data" },
          { type: "heading", content: "Turning Data Into Insight" },
          { type: "text", content: "Raw data is only useful when analyzed for patterns and trends. Effective analysis involves:\n\n• Trend identification — Are FRAT scores increasing over time? Are certain risk factors appearing more frequently?\n• Root cause analysis — When incidents occur, what underlying system factors contributed?\n• Comparative analysis — How do this month's safety metrics compare to previous months or the same month last year?\n• Correlation analysis — Are high FRAT scores correlated with specific routes, weather patterns, or crew pairings?\n\nSafety data should be treated as confidential and used for system improvement, not for punitive purposes (§5.71(a)(7))." },
          { type: "callout", content: "§5.71(a)(7) requires confidentiality protections for safety data. Safety data collected under the SMS must not be used for enforcement or disciplinary purposes except in cases of willful misconduct." },
          { type: "text", content: "The safety manager should present data analysis results to the safety review board (or equivalent) on a regular basis. Trends that indicate declining safety performance should trigger an immediate review and potential activation of SRM processes." },
        ],
        quizQuestions: [
          { question: "What does §5.71(a)(7) require regarding safety data?", options: ["All data must be shared publicly", "Confidentiality protections must be in place", "Data must be deleted after 90 days", "Only the FAA can access safety data"], correct: 1, explanation: "§5.71(a)(7) requires appropriate confidentiality protections for safety data. This ensures that employees continue to report honestly without fear that data will be used against them." },
          { question: "Which analysis method identifies whether FRAT scores are changing over time?", options: ["Root cause analysis", "Comparative analysis", "Trend analysis", "Compliance audit"], correct: 2, explanation: "Trend analysis tracks how a metric changes over time, making it ideal for identifying whether FRAT risk scores are increasing or decreasing. This helps detect emerging risks before they result in events." },
        ],
      },
      {
        title: "Continuous Improvement & Corrective Action",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "Safety Performance Assessment (§5.73)" },
          { type: "text", content: "Under §5.73, the organization must conduct periodic assessments of its safety performance. This typically involves:\n\n• Quarterly safety performance reviews with the safety review board\n• Annual comprehensive assessments presented to the Accountable Executive\n• Ad-hoc assessments triggered by significant events or trend alerts\n\nAssessments should compare actual performance against the safety objectives defined in the safety policy (§5.21). Where performance falls short, corrective action is required." },
          { type: "heading", content: "Continuous Improvement (§5.75)" },
          { type: "text", content: "§5.75 requires the organization to establish and maintain a process for correcting safety performance deficiencies. This means:\n\n1. Identify deficiency — Through monitoring (§5.71) or assessment (§5.73)\n2. Determine root cause — Why did the deficiency occur? What systemic factors contributed?\n3. Develop corrective action — Specific, measurable actions with assigned owners and deadlines\n4. Implement the action — Execute the plan\n5. Verify effectiveness — Follow up to confirm the action resolved the deficiency\n6. Document everything — Maintain records for audit purposes" },
          { type: "callout", content: "Continuous improvement is not optional — §5.75 requires your organization to actively correct safety performance deficiencies and evaluate the effectiveness of those corrections." },
          { type: "text", content: "Corrective actions should follow the SMART framework: Specific, Measurable, Achievable, Relevant, and Time-bound. Vague actions like 'improve safety culture' are not effective. Instead, a corrective action should be specific: 'Implement mandatory FRAT briefing for all flights departing after 2200L by March 1, measured by FRAT completion rate during night operations.'" },
        ],
        quizQuestions: [
          { question: "What does §5.75 require regarding safety performance deficiencies?", options: ["They must be reported to the FAA within 24 hours", "A process must exist to correct deficiencies and evaluate corrections", "They must be addressed only during annual reviews", "They are acceptable as long as no accidents occur"], correct: 1, explanation: "§5.75 requires the organization to establish and maintain a process for identifying and correcting safety performance deficiencies, including evaluating whether corrective actions are effective." },
          { question: "Which step should come AFTER implementing a corrective action?", options: ["Close the finding and move on", "Verify the action actually resolved the deficiency", "Reduce the safety budget", "Remove the hazard from the register"], correct: 1, explanation: "After implementing a corrective action, you must verify its effectiveness — confirm that the action actually resolved the deficiency. Without this verification step, you cannot know if the problem is truly fixed." },
          { question: "How often should safety performance assessments typically be conducted?", options: ["Only after an accident", "Daily by line employees", "At least quarterly, with an annual comprehensive review", "Every five years during certificate renewal"], correct: 2, explanation: "Best practice under §5.73 is to conduct safety performance reviews at least quarterly, with a comprehensive annual assessment for the Accountable Executive. Ad-hoc assessments may be needed after significant events." },
        ],
      },
      {
        title: "Safety Performance Review & Oversight",
        sortOrder: 3,
        contentBlocks: [
          { type: "heading", content: "Management Review Process" },
          { type: "text", content: "Effective SMS leadership requires regular, structured review of safety performance. This connects the AE's oversight responsibility (§5.25(b)(5)) with the Safety Assurance requirements (§5.73).\n\nA recommended review structure:\n\n• Weekly — Safety Manager reviews incoming reports, FRAT trends, and open actions\n• Monthly — Safety Manager briefs Chief Pilot and operations leadership on safety metrics\n• Quarterly — Safety Review Board meeting with AE, Safety Manager, Chief Pilot, and department heads\n• Annually — Comprehensive SMS performance assessment with formal report to the AE" },
          { type: "heading", content: "What to Review" },
          { type: "text", content: "Key metrics for management review:\n\n• Safety reports received (volume, types, trends)\n• FRAT score trends and distribution\n• Open hazards and average time to closure\n• Corrective action completion rate and overdue items\n• Training compliance rates across all requirements\n• Incident and event rates (normalized per flight hours or departures)\n• Audit findings — internal and external\n• Safety objectives — progress toward targets defined in safety policy\n\nLook for trends, not just individual data points. A single high FRAT score is normal. A steady increase in average FRAT scores over three months is a signal that requires investigation." },
          { type: "callout", content: "If you review safety data but don't act on what it tells you, you don't have a safety management system — you have a safety data collection system. Review must lead to action." },
          { type: "text", content: "After each review, document:\n\n• Key findings and trends identified\n• Decisions made and rationale\n• Action items with owners and deadlines\n• Resources approved or requested\n• Date of next review\n\nThis documentation serves as evidence of active SMS management during FAA audits and demonstrates the continuous improvement cycle required by §5.75. PreflightSMS's Audit Log and Dashboard provide ready-made data for these reviews." },
        ],
        quizQuestions: [
          { question: "How often should the Accountable Executive formally review SMS safety performance?", options: ["Only when an accident occurs", "Daily, reviewing every safety report personally", "At least quarterly, with a comprehensive annual assessment", "Every five years during certificate renewal"], correct: 2, explanation: "Best practice is for the AE to participate in quarterly Safety Review Board meetings and receive a comprehensive annual SMS performance assessment. This fulfills the §5.25(b)(5) requirement to regularly review safety performance." },
          { question: "What should happen after a management safety review identifies a negative trend?", options: ["Document the finding and wait to see if it resolves itself", "Take specific corrective action with assigned owners and deadlines", "Increase punishment for involved employees", "Reduce the frequency of future reviews"], correct: 1, explanation: "Review must lead to action per §5.75. When a negative trend is identified, specific corrective actions should be developed with clear owners, deadlines, and a plan to verify effectiveness. Passive documentation without action defeats the purpose of monitoring." },
          { question: "Which combination of metrics provides the best picture of overall SMS health?", options: ["Revenue and customer satisfaction only", "Report volume, hazard closure time, training compliance, and FRAT trends", "Number of FAA inspections passed", "Total flight hours and fleet size"], correct: 1, explanation: "A comprehensive view of SMS health requires multiple indicators: reporting volume (culture health), hazard closure time (responsiveness), training compliance (competency), and FRAT trends (operational risk). No single metric tells the full story." },
        ],
      },
    ],
  },
  {
    title: "Emergency Response Planning",
    description: "Training on the organization's Emergency Response Plan including delegation of emergency authority, assignment of responsibilities, and coordination with interfacing organizations per §5.27.",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 15,
    lessons: [
      {
        title: "ERP Overview & Emergency Classification",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "Emergency Response Plan Requirements (§5.27)" },
          { type: "text", content: "Under §5.27, your organization must maintain an Emergency Response Plan (ERP) that provides procedures for responding to emergencies and unusual situations. The ERP is a required component of the safety policy and must be coordinated with the ERPs of other organizations you interface with, such as FBOs, airports, and medical facilities." },
          { type: "heading", content: "Emergency Classification Levels" },
          { type: "text", content: "Your ERP should define classification levels that determine the scale and nature of the response:\n\n• Level 1 — Alert: A situation requiring heightened awareness but no immediate activation (e.g., overdue aircraft, security concern, medical advisory)\n\n• Level 2 — Emergency: An event requiring activation of emergency procedures (e.g., aircraft incident with no injuries, forced landing, significant mechanical failure in flight)\n\n• Level 3 — Crisis: A major event requiring full ERP activation (e.g., accident with injuries or fatalities, hull loss, midair collision)" },
          { type: "callout", content: "Know your ERP classification levels and what triggers each level. In an emergency, every minute counts — familiarity with procedures before an event is critical." },
          { type: "text", content: "Each classification level should have a defined set of actions, a list of people to notify, and clear criteria for escalation to the next level. The ERP should be reviewed annually and after every activation or drill." },
        ],
        quizQuestions: [
          { question: "Under §5.27, what must the Emergency Response Plan be coordinated with?", options: ["The company's marketing strategy", "The ERPs of interfacing organizations", "The FAA's national airspace plan", "Local law enforcement patrol schedules"], correct: 1, explanation: "§5.27 requires that the ERP be coordinated with the emergency response plans of other organizations the certificate holder interfaces with, such as airports, FBOs, and medical facilities." },
          { question: "Which emergency classification level would typically apply to an aircraft accident with injuries?", options: ["Level 1 — Alert", "Level 2 — Emergency", "Level 3 — Crisis", "No classification needed"], correct: 2, explanation: "An accident with injuries represents the most serious classification level (Crisis), requiring full ERP activation including notifications to NTSB, FAA, family members, and media response preparation." },
        ],
      },
      {
        title: "Notification Chain & Command Structure",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "Notification Procedures" },
          { type: "text", content: "When an emergency occurs, a structured notification chain ensures the right people are informed in the right order:\n\n1. Immediate safety — Ensure the safety of persons involved (crew, passengers, bystanders)\n2. Emergency services — Contact 911 / ATC / airport emergency if not already involved\n3. Internal notification — Alert the on-call emergency coordinator (typically chief pilot or director of operations)\n4. Accountable Executive — The AE must be notified of any Level 2 or Level 3 event\n5. Regulatory notification — NTSB (for accidents/serious incidents) and FAA FSDO\n6. Insurance and legal — Notify as required by your organization's policies\n7. Family and next-of-kin — For events involving injury or fatality, following your organization's family assistance plan" },
          { type: "heading", content: "Command Structure During Emergencies" },
          { type: "text", content: "During an emergency response, clear command structure prevents confusion:\n\n• Emergency Coordinator — The designated person who manages the overall response (usually chief pilot or director of operations for the first 24 hours)\n• Communications Lead — Handles all external communications including media inquiries; no one else should speak to media\n• Operations Lead — Manages ongoing flight operations, makes go/no-go decisions for remaining flights\n• Family Liaison — If applicable, serves as single point of contact for affected families\n• Accountable Executive — Makes strategic decisions and authorizes major actions" },
          { type: "callout", content: "Never speak to media or post on social media about an emergency event. All external communications must go through the designated Communications Lead." },
          { type: "text", content: "Your notification contact list should be maintained in PreflightSMS (Admin > Notification Contacts) and reviewed monthly for accuracy. Phone trees should be tested periodically to ensure numbers are current." },
        ],
        quizQuestions: [
          { question: "In the notification chain, what is the FIRST priority during an emergency?", options: ["Notify the insurance company", "Contact the media", "Ensure the safety of persons involved", "File a report with the FAA"], correct: 2, explanation: "The immediate priority in any emergency is ensuring the safety of all persons involved — crew, passengers, and bystanders. All other notifications follow once safety is addressed." },
          { question: "Who should handle media inquiries during an emergency response?", options: ["Any available employee", "The pilot in command", "The designated Communications Lead only", "The maintenance department"], correct: 2, explanation: "All external communications including media inquiries must be handled exclusively by the designated Communications Lead. This ensures consistent, accurate messaging and prevents unauthorized statements that could create legal or reputational issues." },
        ],
      },
      {
        title: "Post-Event Investigation & Recovery",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "Post-Event Investigation" },
          { type: "text", content: "After the immediate emergency response, the organization must conduct an internal investigation. This is separate from (but coordinated with) any NTSB or FAA investigation:\n\n1. Preserve evidence — Secure the aircraft, preserve electronic records (FDR, CVR, GPS data, FRAT), photograph the scene\n2. Gather witness statements — Interview crew, passengers, witnesses, ATC. Do this while memories are fresh.\n3. Analyze contributing factors — Use the SMS hazard identification and risk analysis framework\n4. Identify root causes — Look beyond the immediate cause to systemic factors\n5. Develop corrective actions — Address root causes, not just symptoms\n6. Feed findings back into SMS — Update hazard register, risk assessments, and training as needed" },
          { type: "heading", content: "Organizational Recovery" },
          { type: "text", content: "An emergency event affects the entire organization. Recovery planning should address:\n\n• Operational continuity — Returning to normal operations safely and systematically\n• Employee support — Critical Incident Stress Management (CISM) for affected personnel; provide access to counseling\n• Communication — Keep all employees informed about what happened, what was learned, and what changes are being made\n• Regulatory compliance — Complete all required reports (NTSB Form 6120.1, NASA ASRS if applicable, FAA notification)\n• Lessons learned — Share findings through safety meetings and training updates (Safety Promotion per §5.93)" },
          { type: "callout", content: "Every emergency event, whether a minor incident or major accident, generates lessons that should feed back into your SMS through the continuous improvement process (§5.75)." },
          { type: "text", content: "ERP drills and tabletop exercises are recommended at least annually. These practice events build organizational muscle memory so that when a real emergency occurs, the response is automatic rather than improvised. Document all drills and update the ERP based on lessons learned." },
        ],
        quizQuestions: [
          { question: "What is the first step in post-event investigation?", options: ["Interview the media", "Preserve evidence", "File insurance claims", "Resume normal operations"], correct: 1, explanation: "Preserving evidence is the critical first step — secure the aircraft, preserve electronic records, and photograph the scene. Evidence can be lost or degraded quickly, making early preservation essential." },
          { question: "Under §5.75, what should happen with findings from an emergency investigation?", options: ["They should be filed away and forgotten", "They should feed back into the SMS through corrective actions and training", "They should only be shared with the FAA", "They should be handled solely by the insurance company"], correct: 1, explanation: "Per §5.75, investigation findings must feed back into the SMS through the continuous improvement process. This means updating the hazard register, developing corrective actions, and incorporating lessons learned into training." },
          { question: "How often should ERP drills or tabletop exercises be conducted?", options: ["Only after a real emergency", "At least annually", "Every five years", "Never — drills are disruptive"], correct: 1, explanation: "Best practice is to conduct at least one tabletop exercise annually and a full-scale drill periodically. Regular practice builds organizational readiness so that emergency response becomes automatic." },
        ],
      },
    ],
  },
  {
    title: "Safety Promotion",
    description: "Training on SMS competency requirements, safety communication methods, hazard information dissemination, and explanation of safety actions and procedure changes per Subpart E (§5.91, §5.93).",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 20,
    lessons: [
      {
        title: "Safety Communication Framework",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "Safety Promotion Under §5.93" },
          { type: "text", content: "Safety Promotion is the fourth pillar of SMS and arguably the one that ties everything together. Without effective communication, even the best safety policies, risk assessments, and assurance programs fail — because people don't know about them.\n\nUnder §5.93, your organization must provide safety communication that:\n\n(a) Conveys SMS policies, procedures, and tools relevant to each employee's responsibilities\n(b) Conveys hazard information relevant to each employee's responsibilities\n(c) Explains why safety actions have been taken\n(d) Explains why safety procedures have been introduced or changed" },
          { type: "heading", content: "Communication Channels" },
          { type: "text", content: "Effective safety communication uses multiple channels to reach all personnel:\n\n• Safety bulletins and newsletters — Written summaries of recent events, lessons learned, and policy changes\n• Safety meetings — Regular team meetings where safety topics are discussed openly\n• Digital platforms — PreflightSMS notifications, email alerts, and dashboard announcements\n• Briefings — Pre-flight and pre-shift briefings that include relevant safety information\n• Posters and visual aids — Physical reminders in crew rooms, hangars, and dispatch areas\n• One-on-one conversations — Direct communication for sensitive or role-specific safety matters" },
          { type: "callout", content: "The best safety communication is two-way. Employees should feel empowered to ask questions, raise concerns, and contribute ideas — not just receive information." },
          { type: "text", content: "When choosing a communication channel, consider your audience, the urgency of the message, and whether acknowledgment of receipt is needed. Critical safety information (like a new hazard affecting current operations) needs immediate, direct communication — not a newsletter that might be read next week." },
        ],
        quizQuestions: [
          { question: "Under §5.93, which of the following is a required element of safety communication?", options: ["Marketing the company's safety record to customers", "Explaining why safety actions have been taken", "Reporting safety data to competitors", "Publishing annual financial statements"], correct: 1, explanation: "§5.93(c) specifically requires the organization to explain why safety actions have been taken. This ensures employees understand the rationale behind safety decisions, building trust and compliance." },
          { question: "What is the most important characteristic of effective safety communication?", options: ["It uses technical jargon to demonstrate expertise", "It is one-way, from management to employees", "It is two-way, encouraging employee feedback and questions", "It only occurs during annual training sessions"], correct: 2, explanation: "Effective safety communication is two-way — employees should feel empowered to ask questions, raise concerns, and contribute ideas. One-way communication misses the valuable insights that front-line employees can provide." },
        ],
      },
      {
        title: "Communicating Hazards & Safety Actions",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "Hazard Information Communication (§5.93(b))" },
          { type: "text", content: "When a hazard is identified through the SRM process, the people who need to know about it must be informed promptly. §5.93(b) requires communicating hazard information relevant to each employee's responsibilities.\n\nEffective hazard communication includes:\n\n• What the hazard is — Clear, specific description\n• Who is affected — Which roles, routes, aircraft, or operations\n• What controls are in place — Current risk mitigations\n• What action is expected — What employees should do differently\n• Timeframe — How long the hazard is expected to persist" },
          { type: "heading", content: "Explaining Safety Actions (§5.93(c-d))" },
          { type: "text", content: "People are more likely to follow safety procedures when they understand why they exist. §5.93(c) requires explaining why safety actions are taken, and §5.93(d) requires explaining why procedures are introduced or changed.\n\nWhen communicating a safety action or procedure change:\n\n1. State what changed — The specific policy, procedure, or requirement\n2. Explain the trigger — What event, hazard, or analysis led to the change\n3. Describe the rationale — Why this particular action was chosen\n4. Clarify the expectation — What compliance looks like in practice\n5. Invite feedback — Ask for input on whether the action is practical and effective" },
          { type: "callout", content: "Never communicate a new safety procedure without explaining WHY. 'Because we said so' is not safety promotion — it breeds resentment and non-compliance." },
          { type: "text", content: "Example of poor communication: 'Effective immediately, all flights require a FRAT score below 25 for dispatch.'\n\nExample of effective communication: 'Following analysis of our Q3 safety data, we identified that flights departing with FRAT scores above 25 had a 3x higher rate of safety events. Starting Monday, flights scoring above 25 will require Chief Pilot review before dispatch. This adds approximately 10 minutes to the dispatch process but significantly reduces our exposure to high-risk operations. Please contact the Safety Manager with any questions or feedback on how this works in practice.'" },
        ],
        quizQuestions: [
          { question: "When communicating a new safety procedure, what should always be included per §5.93(c-d)?", options: ["The name of the employee who caused the problem", "An explanation of why the procedure was introduced", "The estimated cost savings from the change", "A comparison with competitor practices"], correct: 1, explanation: "§5.93(c) requires explaining why safety actions are taken and §5.93(d) requires explaining why procedures are introduced or changed. Understanding the 'why' drives genuine compliance rather than reluctant obedience." },
          { question: "What information should hazard communication include under §5.93(b)?", options: ["Only the hazard name and a severity rating", "The hazard description, who is affected, controls in place, and expected actions", "Only a reminder to be more careful", "Statistical analysis of all similar hazards industry-wide"], correct: 1, explanation: "Effective hazard communication under §5.93(b) must be relevant to each employee's responsibilities, meaning it should describe the hazard, who is affected, current controls, and what specific action is expected from the employee." },
          { question: "Why is explaining the rationale behind safety changes important?", options: ["It satisfies legal documentation requirements only", "People comply more when they understand why a rule exists", "It allows employees to decide whether to follow the rule", "It is not important — rules should simply be followed"], correct: 1, explanation: "Research consistently shows that people are more likely to comply with safety procedures when they understand the reasoning. Unexplained rules breed resentment and non-compliance, while transparent communication builds trust and genuine safety culture." },
        ],
      },
      {
        title: "Building & Sustaining Safety Culture",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "What Is Safety Culture?" },
          { type: "text", content: "Safety culture is the set of shared values, beliefs, and behaviors that determine how safety is prioritized in your organization. It is not a policy you write — it is the reality of how people behave when no one is watching.\n\nA positive safety culture is characterized by:\n\n• Trust — Employees trust that reporting will be handled fairly\n• Openness — People openly discuss safety concerns without fear\n• Learning — The organization treats errors as learning opportunities\n• Accountability — Everyone takes responsibility for safety, at every level\n• Flexibility — Procedures adapt based on experience and feedback" },
          { type: "heading", content: "The Safety Promotion Role in Culture" },
          { type: "text", content: "Safety Promotion (§5.91–§5.93) is the primary tool for building and maintaining safety culture. As a safety manager, chief pilot, or administrator, you shape culture through:\n\n• Training programs — Ensuring competency in SMS principles and tools (§5.91)\n• Communication — Making safety information accessible, timely, and relevant (§5.93)\n• Recognition — Acknowledging good safety behavior and quality reports\n• Responsiveness — Acting visibly on safety reports and closing the feedback loop\n• Leadership — Demonstrating commitment through actions, not just words\n\nThe Accountable Executive sets the tone, but every manager reinforces or undermines it daily." },
          { type: "callout", content: "Culture is not what you say in meetings — it's what happens on the flight line at 0500 when no one is looking. Safety Promotion ensures that the right behaviors are understood, encouraged, and sustained." },
          { type: "text", content: "Practical safety promotion activities you can implement:\n\n• Monthly safety newsletters highlighting reports received and actions taken\n• 'Safety Stand-Down' events for focused discussion of emerging risks\n• Recognition program for top safety reporters each quarter\n• Feedback surveys asking employees to rate communication effectiveness\n• Regular updates to the company safety board (physical or digital)\n• Inclusion of safety topics in every operational briefing and meeting" },
        ],
        quizQuestions: [
          { question: "Which of the following best describes a positive safety culture?", options: ["Zero accident record over the past year", "Employees openly discuss concerns and trust that reporting is handled fairly", "Strict punishment for any deviation from standard procedures", "Management makes all safety decisions without employee input"], correct: 1, explanation: "A positive safety culture is characterized by trust, openness, and learning. A zero-accident record may reflect luck rather than culture, and punitive approaches actually discourage the reporting that makes SMS effective." },
          { question: "Under §5.91–§5.93, who is primarily responsible for safety promotion activities?", options: ["Only the FAA inspector", "Only line pilots", "Management, with the Accountable Executive setting the tone", "The insurance company"], correct: 2, explanation: "While everyone participates in safety culture, §5.25 makes the Accountable Executive responsible for ensuring safety promotion, and §5.25(c) designates management personnel to carry it out. Leadership sets the tone that everyone else follows." },
        ],
      },
    ],
  },
];

// ── ONBOARDING COURSES ──────────────────────────────────────────
export const PILOT_ONBOARDING_COURSE = {
  title: "Getting Started — Pilot Guide",
  description: "A comprehensive introduction to PreflightSMS for pilots. Learn how to submit FRATs, use flight following, file safety reports, complete training, and navigate the system.",
  category: "initial", requiredFor: ["pilot"], passingScore: 80, estimatedMinutes: 20,
  lessons: [
    {
      title: "Lesson 1: Welcome to PreflightSMS",
      sortOrder: 0,
      contentBlocks: [
        { type: "heading", content: "Welcome Aboard" },
        { type: "text", content: "PreflightSMS is your organization's Safety Management System (SMS), built specifically for Part 135 operators. It's the central place where you'll submit flight risk assessments, track flights, report safety concerns, and complete required training." },
        { type: "callout", content: "Under 14 CFR Part 5, all Part 135 operators must have a functioning SMS. Your participation as a pilot is essential to making it work — you're on the front line of identifying and managing risk every day." },
        { type: "image", content: "/training/pilot-nav-overview.png", alt: "PreflightSMS navigation sidebar showing Submit FRAT, Flights, Reports, Training, Dashboard, and Policy sections", caption: "The navigation sidebar — your main way to move between sections" },
        { type: "heading", content: "How the Navigation Works" },
        { type: "text", content: "The left sidebar is your main navigation. Each section serves a specific purpose:" },
        { type: "list", content: "Submit FRAT — Start a new Flight Risk Assessment before each flight\nFlights — View the flight board, check status, and confirm arrivals\nReports — File confidential safety reports for hazards, incidents, or near-misses\nTraining — Complete required CBT courses and view your training records\nDashboard — See your engagement stats, team activity, and safety culture surveys\nPolicy — Review and acknowledge company safety policies" },
        { type: "heading", content: "Your Role in the SMS" },
        { type: "text", content: "As a pilot, you are the primary source of operational safety data. Every FRAT you submit, every report you file, and every training you complete contributes to your organization's safety picture. The SMS isn't about finding fault — it's about finding and fixing risks before they become incidents." },
        { type: "success", content: "Remember: There are no penalties for honest safety reporting. PreflightSMS supports a just culture where good-faith reports are protected and valued." },
      ],
      quizQuestions: [
        { question: "What is the primary purpose of a Safety Management System?", options: ["To punish pilots for mistakes", "To systematically identify and manage safety risks", "To satisfy insurance requirements only", "To replace pilot judgment"], correct: 1, explanation: "An SMS provides a structured approach to identifying hazards, assessing risks, and implementing controls — making operations safer through data-driven decision making, not punishment." },
        { question: "Which section do you use to start a new flight risk assessment?", options: ["Dashboard", "Submit FRAT", "Reports", "Flights"], correct: 1, explanation: "The 'Submit FRAT' section is where you complete your Flight Risk Assessment Tool before each flight. The Flights section is for tracking flights already in progress." },
      ],
    },
    {
      title: "Lesson 2: Your Dashboard",
      sortOrder: 1,
      contentBlocks: [
        { type: "heading", content: "Understanding Your Dashboard" },
        { type: "text", content: "Your dashboard gives you a personal snapshot of your safety engagement and how the team is doing. It's the first thing you'll see when you open PreflightSMS." },
        { type: "image", content: "/training/pilot-dashboard.png", alt: "Pilot dashboard showing personal engagement card with FRAT streak, total FRATs, reports submitted, and training status", caption: "Your personal engagement card shows your safety activity at a glance" },
        { type: "heading", content: "Your Safety Engagement Card" },
        { type: "text", content: "At the top of the dashboard, you'll see your personal engagement metrics:" },
        { type: "list", content: "FRAT Streak — Consecutive days you've submitted a FRAT when flying. Build streaks to earn recognitions!\nTotal FRATs — Your all-time FRAT submission count\nReports — Number of safety reports you've filed\nTraining — Shows CURRENT (green) or NOT CURRENT (red) based on whether all required training is complete" },
        { type: "callout", content: "Your FRAT streak counter tracks consecutive flight days with FRAT submissions. If you fly and don't submit a FRAT, the streak resets. Streaks of 7, 30, and 90 days earn special recognitions." },
        { type: "heading", content: "Quick Actions" },
        { type: "text", content: "Below your engagement card, you'll find quick action buttons to immediately submit a FRAT or file a safety report — the two most common actions you'll take in the system." },
        { type: "image", content: "/training/pilot-quick-actions.png", alt: "Quick action buttons showing 'Submit FRAT' and 'File Safety Report' with icons", caption: "Quick actions let you jump straight to submitting a FRAT or filing a report" },
        { type: "heading", content: "Training Status" },
        { type: "text", content: "The training status section shows which required trainings are current, expiring soon, or overdue. Click 'View All' to go directly to your training courses." },
        { type: "warning", content: "If your training status shows NOT CURRENT, complete your overdue courses as soon as possible. Training currency is tracked for Part 5 compliance and may be reviewed during audits." },
        { type: "heading", content: "Team Engagement" },
        { type: "text", content: "The Team Engagement widget shows how the whole organization is doing — FRAT completion rates, average streaks, top performers, and reports filed this month. This helps build a sense of shared responsibility for safety." },
        { type: "heading", content: "Safety Culture Surveys" },
        { type: "text", content: "Periodically, your organization may publish safety culture surveys. These appear as a tab on the dashboard. Your responses are anonymous and help management understand how safety culture can be improved." },
      ],
      quizQuestions: [
        { question: "What does a red 'NOT CURRENT' training status mean?", options: ["Your account is locked", "You have overdue training courses that need to be completed", "Your FRAT streak was reset", "You need to update your profile"], correct: 1, explanation: "A red NOT CURRENT indicator means one or more required training courses have expired or haven't been completed. Navigate to the Training section to complete them." },
        { question: "How do you earn recognitions in PreflightSMS?", options: ["By requesting them from your safety manager", "By submitting FRATs consistently, filing reports, and completing training", "By having zero incidents", "Recognitions are assigned randomly"], correct: 1, explanation: "Recognitions are earned automatically through consistent safety engagement — FRAT submission streaks, filing safety reports, and completing all required training." },
      ],
    },
    {
      title: "Lesson 3: Submitting a FRAT",
      sortOrder: 2,
      contentBlocks: [
        { type: "heading", content: "What Is a FRAT?" },
        { type: "text", content: "A Flight Risk Assessment Tool (FRAT) is a structured checklist you complete before each flight to evaluate risk factors. It considers weather, pilot experience, aircraft condition, route complexity, and more to produce a risk score that helps you and your organization make informed go/no-go decisions." },
        { type: "callout", content: "FRATs are required under your organization's SMS per 14 CFR Part 5 §5.51–§5.55 (Safety Risk Management). They are the primary tool for systematically identifying and assessing flight-specific risks." },
        { type: "image", content: "/training/frat-form.png", alt: "FRAT submission form showing flight details fields (aircraft, departure, destination, ETD, ETE) and risk factor checkboxes organized by category", caption: "The FRAT form — fill in flight details, then check applicable risk factors" },
        { type: "heading", content: "Step-by-Step: Submitting a FRAT" },
        { type: "list", content: "Click 'Submit FRAT' in the navigation sidebar\nEnter your flight details: aircraft, departure airport, destination, cruise altitude, ETD, and ETE\nReview each risk category and check any factors that apply to your flight\nAdd remarks if needed — explain any elevated risk factors or mitigations\nReview your total risk score at the bottom\nClick 'Submit' to file the FRAT", ordered: true },
        { type: "heading", content: "Understanding Risk Scores" },
        { type: "text", content: "Each risk factor you check adds points to your total score. The total determines your risk level:" },
        { type: "image", content: "/training/frat-risk-levels.png", alt: "Risk level color bands: LOW RISK (green), MODERATE RISK (yellow), HIGH RISK (amber), CRITICAL RISK (red) with score thresholds", caption: "Risk levels are color-coded so you can quickly assess the overall risk picture" },
        { type: "list", content: "LOW RISK (Green) — Standard operations, proceed normally\nMODERATE RISK (Yellow) — Elevated risk, review mitigations carefully\nHIGH RISK (Amber) — Significant risk, requires management approval before flight\nCRITICAL RISK (Red) — Unacceptable risk, flight should not proceed without substantial mitigation" },
        { type: "warning", content: "High and Critical risk FRATs typically require approval from a chief pilot, safety manager, or designated approver before the flight can depart. Do not depart without required approvals." },
        { type: "heading", content: "Self-Dispatch" },
        { type: "text", content: "If your FRAT requires approval but the approver is unavailable, you may have the option to self-dispatch. This allows you to proceed, but your flight will be flagged for post-flight review. Use this option only when operationally necessary — it does not bypass the risk assessment, it just defers the approval review." },
        { type: "callout", content: "Self-dispatch is a safety feature, not a shortcut. It ensures operations can continue when approvers are unavailable while still maintaining full accountability and documentation." },
      ],
      quizQuestions: [
        { question: "When should you submit a FRAT?", options: ["Only when you expect bad weather", "Before every flight", "Only for Part 135 charter flights", "Once per week"], correct: 1, explanation: "FRATs should be submitted before every flight. They are your systematic pre-flight risk assessment and a key component of your organization's Safety Risk Management process." },
        { question: "What should you do if your FRAT scores as HIGH RISK?", options: ["Cancel the flight immediately", "Wait for management approval before departing", "Ignore it and fly anyway", "Reduce the score by unchecking risk factors"], correct: 1, explanation: "High risk FRATs require management approval. You should not depart until an authorized approver has reviewed the risk assessment. If the risk can't be adequately mitigated, the flight should be cancelled or rescheduled." },
        { question: "What does self-dispatch mean?", options: ["Flying without any risk assessment", "Proceeding when approver is unavailable, with the flight flagged for post-flight review", "Cancelling the flight yourself", "Submitting a blank FRAT"], correct: 1, explanation: "Self-dispatch allows you to proceed with the flight when the required approver is unavailable, but the flight is flagged for post-flight management review. It maintains accountability while allowing operations to continue." },
      ],
    },
    {
      title: "Lesson 4: Flight Following",
      sortOrder: 3,
      contentBlocks: [
        { type: "heading", content: "How Flight Following Works" },
        { type: "text", content: "After you submit a FRAT and your flight is approved, it appears on the Flight Board. Flight following tracks your flight from departure through arrival, and notifies designated personnel if you don't arrive on time." },
        { type: "image", content: "/training/flight-board.png", alt: "Flight board showing active flights with status indicators, departure/destination, ETD/ETA, and progress bars", caption: "The flight board shows all active flights with real-time status" },
        { type: "heading", content: "Flight Statuses" },
        { type: "list", content: "PENDING — FRAT submitted, awaiting approval\nAPPROVED — Ready to depart\nAIRBORNE — Flight in progress\nARRIVED — Flight completed, arrival confirmed\nCANCELLED — Flight was cancelled" },
        { type: "heading", content: "Confirming Your Arrival" },
        { type: "text", content: "When you land, it's important to mark your flight as arrived on the flight board. This stops the ETA monitoring and confirms safe completion of the flight." },
        { type: "warning", content: "If a flight is not marked as arrived within 30 minutes of its ETA, all users with Flight Follower permissions will be automatically notified. Always confirm your arrival promptly to avoid triggering unnecessary alerts." },
        { type: "callout", content: "Flight positions and progress bars on the board are estimates based on departure time and ETA — they are not GPS-based live tracking. Always confirm arrival status manually." },
      ],
      quizQuestions: [
        { question: "What happens if you don't mark your flight as arrived on time?", options: ["Nothing — the system ignores it", "Flight followers are notified after 30 minutes past ETA", "Your FRAT streak resets", "The flight is automatically cancelled"], correct: 1, explanation: "If a flight isn't marked arrived within 30 minutes of its ETA, the system automatically alerts all users with Flight Follower permissions. This is a safety feature to ensure overdue flights are promptly noticed." },
      ],
    },
    {
      title: "Lesson 5: Safety Reporting",
      sortOrder: 4,
      contentBlocks: [
        { type: "heading", content: "Why Safety Reporting Matters" },
        { type: "text", content: "Safety reports are how your organization learns about hazards, incidents, and near-misses. Under Part 5, employees must be encouraged to report safety concerns without fear of reprisal. Every report you file contributes to the safety data that drives risk management decisions." },
        { type: "callout", content: "Your organization operates under a just culture policy. Good-faith safety reports are protected — you will not face disciplinary action for reporting safety concerns, even if you were involved in the event." },
        { type: "image", content: "/training/safety-report-form.png", alt: "Safety report form showing fields for report type (hazard, incident, near-miss), title, description, location, date, and aircraft tail number", caption: "The safety report form — choose the report type and provide as much detail as possible" },
        { type: "heading", content: "Types of Reports" },
        { type: "list", content: "Hazard — A condition or situation that could lead to an accident or incident (e.g., icy ramp, confusing taxiway signage)\nIncident — An occurrence that adversely affected or could have adversely affected safety (e.g., bird strike, equipment malfunction)\nNear-Miss — An event where an accident or incident was narrowly avoided (e.g., runway incursion, traffic conflict)" },
        { type: "heading", content: "How to File a Report" },
        { type: "list", content: "Navigate to Reports from the sidebar (or use the Quick Action button on your dashboard)\nSelect the report type: Hazard, Incident, or Near-Miss\nEnter a clear, descriptive title\nProvide detailed description — what happened, when, where, contributing factors\nAdd location, date, and tail number if applicable\nSubmit the report", ordered: true },
        { type: "heading", content: "What Happens After You Report" },
        { type: "text", content: "After submission, your report enters a review workflow:" },
        { type: "list", content: "Your safety manager receives a notification and reviews the report\nThe report may be escalated to an investigation if it warrants further analysis\nCorrective actions may be assigned to address the root cause\nYou can track the status of your reports in the Reports section", ordered: true },
        { type: "success", content: "Filing safety reports is one of the most valuable things you can do for your organization. It takes courage to speak up — and every report makes the operation safer for everyone." },
      ],
      quizQuestions: [
        { question: "Which of these is an example of a hazard report?", options: ["Reporting a bird strike that damaged the aircraft", "Reporting a poorly lit parking area at an airport you frequently visit", "Reporting a runway incursion that almost happened", "Reporting that you forgot to file a FRAT"], correct: 1, explanation: "A hazard is a condition that could lead to an accident — like a poorly lit area. A bird strike that caused damage is an incident. A runway incursion that almost happened is a near-miss." },
        { question: "Under your organization's just culture policy, what happens when you file a good-faith safety report?", options: ["You may be disciplined depending on severity", "Your report is protected and you face no reprisal", "Only anonymous reports are protected", "It depends on whether the safety manager agrees with your assessment"], correct: 1, explanation: "Under a just culture policy as required by Part 5, good-faith safety reports are always protected. The goal is to encourage open reporting so hazards can be identified and mitigated." },
      ],
    },
    {
      title: "Lesson 6: Training & Policies",
      sortOrder: 5,
      contentBlocks: [
        { type: "heading", content: "Required Training" },
        { type: "text", content: "Part 5 requires that all SMS personnel receive appropriate safety training. Your required courses appear in the Training section, and your training status is tracked on your dashboard." },
        { type: "image", content: "/training/cbt-course-list.png", alt: "Training section showing a list of required CBT courses with completion status badges (completed in green, in-progress in amber, not started in gray)", caption: "Your training courses — complete all required courses to stay current" },
        { type: "heading", content: "Completing a Course" },
        { type: "list", content: "Navigate to Training in the sidebar\nSelect a course to open it\nWork through each lesson — read the content carefully\nComplete the quiz at the end of each lesson\nYou must score at or above the passing threshold to complete a lesson\nOnce all lessons are complete, the course is marked as finished and a certificate is generated", ordered: true },
        { type: "callout", content: "If you don't pass a quiz on the first try, you can retake it. Review the lesson content before retrying — the quiz tests your understanding of the material." },
        { type: "heading", content: "Training Expiration" },
        { type: "text", content: "Most SMS training is recurrent, meaning it expires after 12 months. When training expires, you'll need to retake the course. Your dashboard and training section will alert you when training is expiring soon or overdue." },
        { type: "warning", content: "Overdue training is flagged in your profile and on compliance reports. Stay ahead of expirations by completing renewals before the due date." },
        { type: "heading", content: "Policy Acknowledgments" },
        { type: "text", content: "Your organization publishes safety policies in the Policy section. You may be asked to review and acknowledge these policies. Acknowledgment is tracked and may be required for compliance." },
        { type: "heading", content: "That's It — You're Ready!" },
        { type: "text", content: "You now know the essentials of using PreflightSMS as a pilot. Remember:" },
        { type: "list", content: "Submit a FRAT before every flight\nConfirm your arrival after landing\nReport any safety concerns you observe\nComplete your training courses and stay current\nParticipate in safety culture surveys when available" },
        { type: "success", content: "Welcome to the team! Your active participation in the SMS makes flying safer for everyone. If you have questions, reach out to your safety manager." },
      ],
      quizQuestions: [
        { question: "What happens when a required training course expires?", options: ["Nothing — it stays completed forever", "You must retake the course to remain current", "Your account is suspended", "A new certificate is auto-generated"], correct: 1, explanation: "Recurrent training expires after a set period (usually 12 months). When it expires, your status changes to NOT CURRENT and you must retake the course." },
        { question: "Which of the following is NOT something pilots are expected to do in PreflightSMS?", options: ["Submit FRATs before flights", "File safety reports", "Approve other pilots' FRATs", "Complete required training courses"], correct: 2, explanation: "Approving FRATs is a management function (chief pilot, safety manager, admin). Pilots submit FRATs, file reports, and complete training — they don't approve other pilots' assessments." },
      ],
    },
  ],
};

export const ADMIN_ONBOARDING_COURSE = {
  title: "Getting Started — Admin & Operations Guide",
  description: "A comprehensive introduction to PreflightSMS for administrators, safety managers, chief pilots, and operations staff. Covers all system features including user management, FRAT approval, investigations, compliance, and more.",
  category: "initial", requiredFor: ["admin", "safety_manager", "chief_pilot", "accountable_exec", "dispatcher", "maintenance"], passingScore: 80, estimatedMinutes: 45,
  lessons: [
    {
      title: "Lesson 1: System Overview & Navigation",
      sortOrder: 0,
      contentBlocks: [
        { type: "heading", content: "Welcome to PreflightSMS" },
        { type: "text", content: "PreflightSMS is a complete Safety Management System for Part 135 operators, covering all four SMS pillars: Safety Policy, Safety Risk Management, Safety Assurance, and Safety Promotion. As an administrator or operations team member, you have access to the full suite of tools for managing your organization's safety program." },
        { type: "callout", content: "14 CFR Part 5 requires all Part 135 operators to implement and maintain an SMS. PreflightSMS provides the structure, tools, and documentation to achieve and demonstrate compliance." },
        { type: "image", content: "/training/admin-nav-full.png", alt: "Full navigation sidebar showing all sections: Dashboard, Submit FRAT, Flights, Fleet, Reports, ASAP, Investigations, Actions, Compliance, ERP, Change Mgmt, Policy, Training, and Admin", caption: "Admin navigation — you have access to all system sections" },
        { type: "heading", content: "Navigation Structure" },
        { type: "text", content: "The sidebar organizes PreflightSMS into logical sections. Here's what each area covers:" },
        { type: "list", content: "Dashboard — Analytics, safety metrics, performance indicators, safety culture surveys\nSubmit FRAT — Create flight risk assessments (same as pilots)\nFlights — Flight board with approval workflow, flight following, arrival monitoring\nFleet — Aircraft status management and fleet overview\nReports — Safety reports from all personnel, with investigation escalation\nASAP — Aviation Safety Action Program management (if enabled)\nInvestigations — Hazard register with risk matrix, root cause analysis\nCorrective Actions — Track risk controls from identification to completion\nCompliance — Part 5 audit log, international standards tracking\nERP — Emergency Response Plans with checklists and drill tracking\nChange Management — Management of Change (MOC) process\nPolicy — Policy library, SMS manuals, document management\nTraining — CBT course management, training records, compliance tracking\nAdmin — User management, org settings, billing, integrations" },
        { type: "heading", content: "Role-Based Access" },
        { type: "text", content: "PreflightSMS uses role-based access control. Each user is assigned a role that determines what they can see and do:" },
        { type: "list", content: "Pilot — Submit FRATs, file reports, complete training, view personal data\nDispatcher — Create and monitor flights, view FRATs and reports\nMaintenance — Submit safety reports, view hazards, complete SMS training\nSafety Manager — Full SMS access, investigate reports, manage hazards and users\nChief Pilot — Approve FRATs, view all data, assign corrective actions, manage users\nAccountable Executive — Approve FRATs, view dashboards and audit logs, manage users\nAdmin — Full access to all features including billing and org settings" },
        { type: "warning", content: "Be thoughtful when assigning roles. The Accountable Executive role should only be assigned to the individual who has ultimate responsibility for the SMS as defined in your safety policy." },
      ],
      quizQuestions: [
        { question: "What are the four pillars of an SMS under Part 5?", options: ["Policy, Risk, Assurance, Promotion", "Planning, Reporting, Auditing, Training", "Hazards, Incidents, Corrective Actions, Compliance", "Documentation, Communication, Investigation, Resolution"], correct: 0, explanation: "The four pillars are Safety Policy (Subpart B), Safety Risk Management (Subpart C), Safety Assurance (Subpart D), and Safety Promotion (Subpart E). PreflightSMS covers all four." },
        { question: "Which role should be assigned to the person ultimately responsible for the organization's SMS?", options: ["Admin", "Safety Manager", "Accountable Executive", "Chief Pilot"], correct: 2, explanation: "Under Part 5, the Accountable Executive has ultimate responsibility for the SMS. This is typically the highest-ranking official with operational control." },
      ],
    },
    {
      title: "Lesson 2: Dashboard & Analytics",
      sortOrder: 1,
      contentBlocks: [
        { type: "heading", content: "The Admin Dashboard" },
        { type: "text", content: "As an admin-level user, your dashboard provides comprehensive safety analytics that pilots don't see. You have access to the full suite of analytics tabs for monitoring safety trends, performance, and compliance." },
        { type: "image", content: "/training/admin-dashboard.png", alt: "Admin dashboard showing analytics tabs: Overview, FRAT Analytics, Safety Metrics, Performance, Safety Culture, Insurance & Export, FRAT History, Export", caption: "Admin dashboard tabs give you a complete view of your safety program" },
        { type: "heading", content: "Dashboard Tabs" },
        { type: "list", content: "Overview — High-level safety snapshot with key metrics, trend alerts, and compliance summary\nFRAT Analytics — FRAT submission trends, risk distribution, most common risk factors\nSafety Metrics — Safety report trends, investigation close rates, corrective action status\nPerformance — Safety Performance Indicators (SPIs) with targets and trend tracking\nSafety Culture — Create and manage anonymous safety culture surveys\nInsurance & Export — Generate insurance scorecards and compliance reports\nFRAT History — Searchable log of all submitted FRATs\nExport — Download reports for recordkeeping per §5.97" },
        { type: "heading", content: "Safety Performance Indicators (SPIs)" },
        { type: "text", content: "SPIs are quantitative metrics that track your organization's safety performance over time. The Performance tab lets you define SPIs, set targets, and record measurements." },
        { type: "callout", content: "Part 5 §5.71 requires organizations to monitor operational processes. SPIs provide the data-driven evidence that your SMS is working. Default SPIs are available to get you started — initialize them from the Performance tab." },
        { type: "heading", content: "Safety Culture Surveys" },
        { type: "text", content: "The Safety Culture tab allows you to create anonymous surveys and distribute them to your team. Responses are aggregated and anonymized — individual responses cannot be traced to specific people. This is a powerful tool for understanding how your team perceives safety culture." },
        { type: "warning", content: "Survey responses are truly anonymous. Even admins cannot see who submitted which response. This is by design — it encourages honest feedback." },
        { type: "heading", content: "Trend Alerts" },
        { type: "text", content: "The system can automatically detect emerging safety trends — for example, a spike in a particular risk factor or an increase in reports from a specific location. Trend alerts appear on the Overview dashboard and should be acknowledged and addressed." },
      ],
      quizQuestions: [
        { question: "What are Safety Performance Indicators (SPIs)?", options: ["One-time audit scores", "Quantitative metrics that track safety performance over time with targets", "Individual pilot risk scores", "Insurance premium calculations"], correct: 1, explanation: "SPIs are ongoing, measurable metrics (like FRAT completion rate or average risk score) that track how well your SMS is performing. They should have defined targets and be monitored regularly per §5.71." },
        { question: "Can administrators see individual responses to safety culture surveys?", options: ["Yes, all responses are visible with names", "Only the safety manager can see individual responses", "No, responses are fully anonymous", "Yes, but only after the survey closes"], correct: 2, explanation: "Safety culture survey responses are designed to be fully anonymous. This encourages honest, candid feedback that is essential for understanding true safety culture." },
      ],
    },
    {
      title: "Lesson 3: User Management & Admin Panel",
      sortOrder: 2,
      contentBlocks: [
        { type: "heading", content: "Managing Your Team" },
        { type: "text", content: "The Admin panel is where you manage users, organization settings, FRAT configuration, integrations, and billing. Access it from the navigation sidebar." },
        { type: "image", content: "/training/admin-panel-users.png", alt: "Admin panel user management section showing a list of team members with their roles, email addresses, and action buttons for editing role and permissions", caption: "User management — invite team members and manage their roles" },
        { type: "heading", content: "Inviting Users" },
        { type: "text", content: "To add someone to your organization:" },
        { type: "list", content: "Go to Admin in the sidebar\nClick 'Invite User' in the Team section\nEnter their email address and select a role\nThey'll receive an email invitation to join your organization\nOnce they accept and create an account, they'll have access based on their assigned role", ordered: true },
        { type: "callout", content: "New users are automatically enrolled in the appropriate onboarding course based on their role. Pilots receive the Pilot Guide; all other roles receive the Admin & Operations Guide." },
        { type: "heading", content: "Changing Roles" },
        { type: "text", content: "You can change a user's role at any time from the Team section. Click the role badge next to their name and select the new role. This immediately updates their access level." },
        { type: "heading", content: "Permissions" },
        { type: "text", content: "In addition to roles, you can assign specific permissions to users:" },
        { type: "list", content: "Approver — Can approve/reject FRATs and flights (useful for chief pilots or designated approvers)\nFlight Follower — Receives alerts when flights are overdue" },
        { type: "heading", content: "Organization Settings" },
        { type: "text", content: "The Admin panel also includes organization-level settings:" },
        { type: "list", content: "Organization name and logo\nFRAT template customization (add/remove risk categories and factors)\nPilot engagement and gamification toggles\nFleet status field configuration\nIntegration settings (ForeFlight, Schedaero, etc.)\nSubscription and billing management" },
        { type: "warning", content: "FRAT template changes affect all future submissions. Existing FRATs retain their original scoring. Test your template changes carefully before publishing." },
      ],
      quizQuestions: [
        { question: "What happens when you invite a new user to the organization?", options: ["They can immediately log in with a default password", "They receive an email invitation and are auto-enrolled in onboarding training", "They must be manually enrolled in each course", "They get admin access by default"], correct: 1, explanation: "Invited users receive an email to create their account. Once they join, they're automatically enrolled in the onboarding course that matches their assigned role." },
        { question: "Which permission allows a user to approve or reject FRATs?", options: ["Flight Follower", "Approver", "Admin role only", "Safety Manager role only"], correct: 1, explanation: "The 'Approver' permission can be granted to any user, allowing them to approve or reject FRATs and flights. This is separate from the role-based access." },
      ],
    },
    {
      title: "Lesson 4: FRAT Management & Approval",
      sortOrder: 3,
      contentBlocks: [
        { type: "heading", content: "The FRAT Workflow" },
        { type: "text", content: "As an admin or safety manager, you're responsible for reviewing and approving FRATs — especially those scoring at higher risk levels. The FRAT workflow is a core Safety Risk Management process under Part 5 §5.51–§5.55." },
        { type: "image", content: "/training/frat-approval-flow.png", alt: "Flowchart showing FRAT workflow: Pilot submits FRAT → Score calculated → Low/Moderate: auto-approved or manual review → High/Critical: requires manager approval → Approved or Rejected", caption: "FRAT approval flow — higher risk scores require management review" },
        { type: "heading", content: "Reviewing FRATs on the Flight Board" },
        { type: "text", content: "When a pilot submits a FRAT that requires approval, it appears as PENDING on the Flight Board. You'll receive a notification. To review:" },
        { type: "list", content: "Open the Flights section\nFind the pending flight and expand it\nReview the risk score, checked factors, and pilot remarks\nApprove the flight if risk is acceptable (with or without additional mitigations)\nOr reject the flight if risk is unacceptable — the pilot will be notified", ordered: true },
        { type: "callout", content: "When you approve a flight, you're accepting the risk level as documented. When you reject, you're determining that the risk cannot be adequately mitigated. Both decisions should be based on your professional judgment and organizational risk tolerance." },
        { type: "heading", content: "FRAT History & Export" },
        { type: "text", content: "All FRAT data is permanently stored and can be reviewed in the FRAT History tab on the dashboard. You can also export FRAT data in multiple formats:" },
        { type: "list", content: "Summary Report — Overview with risk distribution and top factors (.txt)\nStandard Export — All records with scores and metadata (.csv)\nDetailed Factor Export — Every record with individual risk factor columns (.csv)" },
        { type: "success", content: "FRAT records are required under §5.97 (Recordkeeping). The export features make it easy to produce documentation for FAA inspections or insurance renewals." },
        { type: "heading", content: "Customizing the FRAT Template" },
        { type: "text", content: "You can customize risk categories, factors, and scoring thresholds from the Admin panel. This lets you tailor the FRAT to your specific operation — different aircraft types, routes, or operational environments may have different risk considerations." },
      ],
      quizQuestions: [
        { question: "What should you do when a HIGH RISK FRAT is submitted?", options: ["Automatically reject it", "Review the risk factors and make a judgment call on whether to approve with mitigations or reject", "Tell the pilot to lower their score", "Ignore it — the pilot will self-dispatch"], correct: 1, explanation: "High-risk FRATs require careful review. Some high-risk flights may be acceptable with proper mitigations in place. The decision should be based on professional judgment, not an automatic response." },
        { question: "Where can you export FRAT data for regulatory compliance?", options: ["Only through the Supabase database", "The Export tab on the Dashboard", "By emailing the safety manager", "FRAT data cannot be exported"], correct: 1, explanation: "The Dashboard includes an Export tab with multiple report formats (summary, standard CSV, detailed CSV). These satisfy §5.97 recordkeeping requirements." },
      ],
    },
    {
      title: "Lesson 5: Safety Reporting & Investigations",
      sortOrder: 4,
      contentBlocks: [
        { type: "heading", content: "Managing Safety Reports" },
        { type: "text", content: "As an admin or safety manager, you see all safety reports submitted by your team — not just your own. You're responsible for reviewing, triaging, and escalating reports as needed." },
        { type: "image", content: "/training/safety-reports-admin.png", alt: "Admin view of safety reports showing a filterable list with report type, status (open, under review, closed), reporter name, date, and action buttons", caption: "Admin report view — filter by type, status, and date to manage incoming reports" },
        { type: "heading", content: "Report Review Workflow" },
        { type: "list", content: "New reports arrive with 'Open' status and trigger a notification\nReview the report details and assess severity\nChange status to 'Under Review' when you begin investigating\nEscalate to the Investigation Register if deeper analysis is needed\nClose the report once addressed, with resolution notes", ordered: true },
        { type: "heading", content: "Creating Investigations" },
        { type: "text", content: "When a report warrants deeper analysis, escalate it to the Investigation Register (Hazard Register). This creates a formal investigation with:" },
        { type: "list", content: "Risk matrix scoring (likelihood x severity)\nRoot cause analysis\nContributing factor identification\nCorrective action assignment\nLessons learned documentation" },
        { type: "image", content: "/training/risk-matrix.png", alt: "5x5 risk matrix showing likelihood (rare to almost certain) vs severity (negligible to catastrophic) with color-coded risk levels", caption: "The risk matrix helps quantify hazard severity for prioritization" },
        { type: "callout", content: "Under §5.51, you must analyze identified hazards in your SMS. The Investigation Register provides the structured process for this analysis, including the severity/likelihood matrix required by §5.53." },
        { type: "heading", content: "Corrective Actions" },
        { type: "text", content: "Investigations often result in corrective actions — specific tasks assigned to personnel to mitigate identified risks. The Corrective Actions section tracks these from creation through completion:" },
        { type: "list", content: "Title and description of the required action\nAssigned responsible person\nDue date\nPriority level\nStatus tracking (open → in progress → completed)\nEvidence of completion" },
        { type: "warning", content: "Open corrective actions are a key metric for SMS health. FAA inspectors will look at how many corrective actions are open, overdue, or completed. Stay on top of due dates." },
      ],
      quizQuestions: [
        { question: "When should a safety report be escalated to a formal investigation?", options: ["Only for incidents that caused injury", "When the report warrants deeper root cause analysis or risk assessment", "Never — reports are sufficient on their own", "Only when the FAA requests it"], correct: 1, explanation: "Reports should be escalated to investigations when they indicate a systemic hazard, warrant root cause analysis, or involve elevated risk. This is part of the SRM process under §5.51–§5.55." },
        { question: "What does a corrective action track?", options: ["Only financial costs of safety events", "A specific task assigned to someone to mitigate an identified risk, with due date and status", "Pilot disciplinary records", "Insurance claims"], correct: 1, explanation: "Corrective actions are risk controls — specific, assigned tasks with due dates, responsible persons, and completion tracking. They ensure that identified risks are actively mitigated." },
      ],
    },
    {
      title: "Lesson 6: Compliance & Audit",
      sortOrder: 5,
      contentBlocks: [
        { type: "heading", content: "Part 5 Audit Log" },
        { type: "text", content: "The Compliance section is where you track and demonstrate your organization's compliance with 14 CFR Part 5. The centerpiece is the 42-point Part 5 Audit Log — a comprehensive checklist mapped to every Part 5 requirement." },
        { type: "image", content: "/training/part5-audit-log.png", alt: "Part 5 audit log showing compliance checklist organized by subpart (B, C, D, E) with green checkmarks for compliant items, amber for needs attention, and red for non-compliant", caption: "The Part 5 audit log tracks compliance across all 42 requirements" },
        { type: "heading", content: "How Compliance Is Tracked" },
        { type: "text", content: "The audit log uses two methods to track compliance:" },
        { type: "list", content: "Automatic checks — The system automatically evaluates compliance based on your data (e.g., 'Do FRATs exist?' checks if any FRATs have been submitted)\nManual attestation — For requirements that can't be auto-checked, you manually confirm compliance and provide evidence" },
        { type: "callout", content: "The compliance percentage on your dashboard reflects both automatic and manual checks. Aim for 100% before any FAA inspection or audit." },
        { type: "heading", content: "Internal Evaluations (IEP)" },
        { type: "text", content: "Part 5 §5.71–§5.75 requires internal evaluations of your SMS. The Internal Evaluation section provides:" },
        { type: "list", content: "Audit templates — Premade and custom templates for structured evaluations\nAudit scheduling — Set up recurring audits on a calendar\nAudit execution — Walk through checklist items, record findings\nFindings tracking — Document non-conformances and link to corrective actions" },
        { type: "heading", content: "International Compliance" },
        { type: "text", content: "If your operation interfaces with international standards (Transport Canada, EASA, ICAO, etc.), the International Compliance tab lets you activate those frameworks and track compliance. Items that map to Part 5 requirements you've already satisfied are automatically marked as covered." },
        { type: "success", content: "When you're compliant with a Part 5 requirement, any international framework items that crosswalk to that requirement are automatically shown as 'Covered by FAA Part 5' — reducing duplicate compliance work." },
      ],
      quizQuestions: [
        { question: "What is the Part 5 Audit Log?", options: ["A simple checklist you fill out once", "A 42-point compliance tracker mapped to every Part 5 requirement, with automatic and manual checks", "A list of FAA violations", "An insurance requirement only"], correct: 1, explanation: "The audit log is a comprehensive tool that maps all Part 5 requirements and uses both automatic system checks and manual attestation to track compliance status." },
        { question: "What does §5.71–§5.75 require?", options: ["Only flight following", "Internal evaluations (audits) of your SMS", "Pilot recertification", "Equipment inspections only"], correct: 1, explanation: "Subpart D (§5.71–§5.75) covers Safety Assurance, which requires organizations to monitor their SMS through internal evaluations, data analysis, and continuous improvement." },
      ],
    },
    {
      title: "Lesson 7: Policies, Manuals & Training Management",
      sortOrder: 6,
      contentBlocks: [
        { type: "heading", content: "Policy Library" },
        { type: "text", content: "The Policy section is where you create, publish, and manage your organization's safety policies. Policies can be drafted, published, and tracked for employee acknowledgment." },
        { type: "image", content: "/training/policy-library.png", alt: "Policy library showing a list of policies with status (active, draft), version number, effective date, and acknowledgment progress bar", caption: "Policy library — manage your organization's safety documentation" },
        { type: "heading", content: "SMS Manuals" },
        { type: "text", content: "PreflightSMS includes a built-in SMS manual editor with templates for all required documentation. You can customize these with your organization's specific details using template variables (company name, certificate number, etc.)." },
        { type: "callout", content: "Under §5.21, your organization must have a safety policy signed by the Accountable Executive. Use the SMS Manual editor to create this document and the digital signature feature to sign it." },
        { type: "heading", content: "Managing Training" },
        { type: "text", content: "The Training section lets you manage Computer-Based Training (CBT) courses, track training records, and ensure compliance with training requirements." },
        { type: "heading", content: "Course Management" },
        { type: "list", content: "Create custom courses with lessons, content blocks, and quizzes\nUse the default Part 5 training courses as a foundation\nPublish courses to make them available to your team\nTrack completion and quiz scores across all personnel\nSet courses as required for specific roles" },
        { type: "heading", content: "Training Records" },
        { type: "text", content: "Training records track when each person completed training and when it expires. The system supports both:" },
        { type: "list", content: "CBT completion records — Automatically logged when a user completes a course\nManual training records — For in-person training, simulator sessions, or external courses" },
        { type: "warning", content: "Training compliance is a common focus during FAA inspections. Keep your training records up to date and ensure all required personnel have current training." },
        { type: "heading", content: "Emergency Response Plans" },
        { type: "text", content: "The ERP section manages your Emergency Response Plans. Each plan includes:" },
        { type: "list", content: "Plan details and description\nDetailed checklist of response procedures\nCall tree with emergency contacts\nDrill scheduling and tracking\nFindings and corrective actions from drills" },
        { type: "callout", content: "§5.27 requires an Emergency Response Plan. PreflightSMS provides templates for common scenarios (aircraft accident, medical emergency, security threat, etc.) to help you get started quickly." },
      ],
      quizQuestions: [
        { question: "What is required under §5.21 regarding safety policy?", options: ["Only verbal communication of safety goals", "A documented safety policy signed by the Accountable Executive", "An annual safety meeting", "Nothing specific about policy documentation"], correct: 1, explanation: "§5.21 requires a documented safety policy that includes a commitment to safety, reporting procedures, and accountability structure, signed by the Accountable Executive." },
        { question: "How are training records maintained in PreflightSMS?", options: ["Only through manual entry", "Both automatically (from CBT completion) and manually (for in-person or external training)", "Only through CBT courses", "Training records are not tracked"], correct: 1, explanation: "The system supports both automatic records from CBT course completion and manual records for training that happens outside the system (classroom, simulator, external courses)." },
      ],
    },
    {
      title: "Lesson 8: Advanced Features & Best Practices",
      sortOrder: 7,
      contentBlocks: [
        { type: "heading", content: "Management of Change (MOC)" },
        { type: "text", content: "When your organization makes significant changes — new aircraft, new routes, personnel changes, procedure updates — the Management of Change process ensures safety risks are identified and mitigated before implementation." },
        { type: "image", content: "/training/moc-process.png", alt: "Management of Change workflow showing: Identify Change → Assess Hazards → Implement Controls → Review Effectiveness", caption: "The MOC process ensures changes are safely managed" },
        { type: "list", content: "Document the proposed change and rationale\nIdentify hazards associated with the change\nAssess risk level using the risk matrix\nDefine mitigations and controls\nAssign responsible person and timeline\nTrack implementation and verify effectiveness" },
        { type: "callout", content: "Part 5 doesn't explicitly require MOC, but it's a best practice that supports §5.51 (hazard identification) and §5.71 (monitoring). Many international frameworks require it." },
        { type: "heading", content: "ASAP Program" },
        { type: "text", content: "If your organization has an Aviation Safety Action Program (ASAP), PreflightSMS provides full ASAP management including report intake, Event Review Committee (ERC) workflows, corrective actions, and meeting tracking." },
        { type: "heading", content: "Insurance Scorecard" },
        { type: "text", content: "The Insurance & Export tab generates comprehensive scorecards summarizing your safety program's health. These are valuable for insurance renewals and demonstrating your organization's commitment to safety." },
        { type: "heading", content: "Best Practices for SMS Success" },
        { type: "list", content: "Review the dashboard weekly — look for trends, open items, and overdue actions\nAcknowledge trend alerts promptly and investigate emerging patterns\nKeep corrective actions on schedule — overdue actions indicate SMS weakness\nRun internal evaluations quarterly at minimum\nEncourage reporting through positive recognition, not punishment\nUpdate your Part 5 audit log monthly to stay audit-ready\nConduct safety culture surveys at least annually\nDocument everything — if it's not documented, it didn't happen" },
        { type: "heading", content: "Getting Help" },
        { type: "text", content: "If you need assistance with PreflightSMS:" },
        { type: "list", content: "Check the tooltips and help text throughout the interface\nReview the Part 5 references in the compliance section\nContact your organization's safety manager for SMS questions\nReach out to PreflightSMS support for technical issues" },
        { type: "success", content: "You're now equipped to manage your organization's SMS effectively. Remember: a good SMS is a living system — it requires consistent attention, honest reporting, and continuous improvement. Your leadership sets the tone for safety culture." },
      ],
      quizQuestions: [
        { question: "What is the purpose of the Management of Change process?", options: ["To prevent any changes from being made", "To ensure safety risks from significant changes are identified and mitigated before implementation", "To document employee complaints about changes", "To satisfy insurance requirements only"], correct: 1, explanation: "MOC ensures that when significant operational changes occur, the associated hazards are identified, risks are assessed, and appropriate mitigations are in place before the change takes effect." },
        { question: "How often should you review the dashboard and SMS health indicators?", options: ["Once a year during the FAA audit", "Weekly at minimum", "Only when there's an incident", "Monthly is sufficient"], correct: 1, explanation: "Active SMS management requires regular monitoring. Weekly dashboard reviews help you spot trends, address overdue items, and maintain overall SMS health. More frequent is even better." },
        { question: "Which of the following is the MOST important factor for SMS success?", options: ["Having the most expensive software", "Consistent leadership attention, honest reporting culture, and continuous improvement", "Zero incident record", "Maximum number of policies"], correct: 1, explanation: "An effective SMS depends on active engagement, trust-based reporting culture, and continuous improvement. Technology is a tool — but culture and leadership are what make the system work." },
      ],
    },
  ],
};

// ── TRAINING RECORD FORM ────────────────────────────────────────
function TrainingForm({ onSubmit, onCancel, requirements }) {
  const [form, setForm] = useState({
    title: "", requirementId: "", completedDate: new Date().toISOString().slice(0, 10),
    expiryDate: "", instructor: "", notes: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectRequirement = (reqId) => {
    const req = requirements.find(r => r.id === reqId);
    if (req) {
      const completed = form.completedDate || new Date().toISOString().slice(0, 10);
      const expiry = req.frequency_months > 0 ? (() => {
        const d = new Date(completed);
        d.setMonth(d.getMonth() + req.frequency_months);
        return d.toISOString().slice(0, 10);
      })() : "";
      set("requirementId", reqId);
      setForm(f => ({ ...f, requirementId: reqId, title: req.title, expiryDate: expiry }));
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Log Training</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.91 — Safety promotion: competency and training</div>
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
      </div>
      {requirements.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>From Requirement</label>
          <select value={form.requirementId} onChange={e => selectRequirement(e.target.value)} style={inp}>
            <option value="">Custom / one-off training</option>
            {requirements.map(r => <option key={r.id} value={r.id}>{r.title} ({r.category})</option>)}
          </select>
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Training Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Initial SMS Awareness Training" style={inp} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Completed Date *</label>
          <input type="date" value={form.completedDate} onChange={e => set("completedDate", e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Expiry Date</label>
          <input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} style={inp} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Instructor</label>
          <input value={form.instructor} onChange={e => set("instructor", e.target.value)} placeholder="Name" style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Notes</label>
          <input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional" style={inp} />
        </div>
      </div>
      <button onClick={() => { if (form.title.trim() && form.completedDate) onSubmit(form); }}
        disabled={!form.title.trim() || !form.completedDate}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: (!form.title.trim() || !form.completedDate) ? 0.4 : 1 }}>
        Log Training
      </button>
    </div>
  );
}

// ── REQUIREMENT FORM ─────────────────────────────────────────────
function RequirementForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ title: "", description: "", category: "sms", requiredFor: ["pilot"], frequencyMonths: 12 });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleRole = (role) => {
    setForm(f => ({
      ...f,
      requiredFor: f.requiredFor.includes(role) ? f.requiredFor.filter(r => r !== role) : [...f.requiredFor, role],
    }));
  };
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>New Training Requirement</div>
          <div style={{ fontSize: 11, color: MUTED }}>Define recurring or one-time training requirements</div>
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Annual SMS Recurrent Training" style={inp} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
            {TRAINING_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Frequency (months, 0=one-time)</label>
          <input type="number" value={form.frequencyMonths} onChange={e => set("frequencyMonths", parseInt(e.target.value) || 0)} style={inp} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Required For</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["pilot", "safety_manager", "chief_pilot", "accountable_exec", "admin"].map(r => (
            <button key={r} onClick={() => toggleRole(r)}
              style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: form.requiredFor.includes(r) ? `${CYAN}22` : "transparent",
                color: form.requiredFor.includes(r) ? CYAN : MUTED,
                border: `1px solid ${form.requiredFor.includes(r) ? CYAN : BORDER}` }}>
              {r.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => { if (form.title.trim()) onSubmit(form); }} disabled={!form.title.trim()}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !form.title.trim() ? 0.4 : 1, marginTop: 8 }}>
        Create Requirement
      </button>
    </div>
  );
}

// ── COURSE BUILDER (Admin) ─────────────────────────────────────
function CourseForm({ course, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: course?.title || "", description: course?.description || "",
    category: course?.category || "sms", passingScore: course?.passing_score || 80,
    estimatedMinutes: course?.estimated_minutes || 30, requiredFor: course?.required_for || ["pilot"],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleRole = r => set("requiredFor", form.requiredFor.includes(r) ? form.requiredFor.filter(x => x !== r) : [...form.requiredFor, r]);

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{course ? "Edit Course" : "New Course"}</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.91–5.97 — Safety promotion training</div>
        </div>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Course Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. SMS Initial Training" style={inp} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Description</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="What this course covers..." style={{ ...inp, resize: "vertical" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Pass Score (%)</label>
          <input type="number" min={0} max={100} value={form.passingScore} onChange={e => set("passingScore", parseInt(e.target.value) || 80)} style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Est. Minutes</label>
          <input type="number" min={1} value={form.estimatedMinutes} onChange={e => set("estimatedMinutes", parseInt(e.target.value) || 30)} style={inp} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Required For</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["pilot", "safety_manager", "chief_pilot", "dispatcher", "admin"].map(r => (
            <button key={r} onClick={() => toggleRole(r)}
              style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: form.requiredFor.includes(r) ? `${CYAN}22` : "transparent",
                color: form.requiredFor.includes(r) ? CYAN : MUTED,
                border: `1px solid ${form.requiredFor.includes(r) ? CYAN : BORDER}` }}>
              {r.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => { if (form.title.trim()) onSave(form); }} disabled={!form.title.trim()}
        style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13, opacity: !form.title.trim() ? 0.4 : 1 }}>
        {course ? "Save Changes" : "Create Course"}
      </button>
    </div>
  );
}

// ── LESSON EDITOR ──────────────────────────────────────────────
function LessonEditor({ lesson, onSave, onCancel }) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [blocks, setBlocks] = useState(lesson?.content_blocks || []);
  const [questions, setQuestions] = useState(lesson?.quiz_questions || []);

  const addBlock = (type) => setBlocks(b => [...b, { type, content: "" }]);
  const updateBlock = (i, content) => setBlocks(b => b.map((bl, j) => j === i ? { ...bl, content } : bl));
  const removeBlock = (i) => setBlocks(b => b.filter((_, j) => j !== i));

  const addQuestion = () => setQuestions(q => [...q, { question: "", options: ["", "", "", ""], correct: 0, explanation: "" }]);
  const updateQuestion = (i, updates) => setQuestions(q => q.map((qu, j) => j === i ? { ...qu, ...updates } : qu));
  const removeQuestion = (i) => setQuestions(q => q.filter((_, j) => j !== i));

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{lesson ? "Edit Lesson" : "New Lesson"}</div>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Lesson Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction to SMS" style={inp} />
      </div>

      {/* Content blocks */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Content</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[["heading", "H"], ["text", "¶"], ["callout", "!"], ["video", "▶"]].map(([type, label]) => (
              <button key={type} onClick={() => addBlock(type)}
                style={{ ...btnGhost, padding: "3px 8px", fontSize: 10 }}>+ {label}</button>
            ))}
          </div>
        </div>
        {blocks.length === 0 && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12, ...card }}>No content yet. Add a heading, paragraph, callout, or video.</div>}
        {blocks.map((bl, i) => (
          <div key={i} style={{ marginBottom: 8, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: SUBTLE, textTransform: "uppercase", fontWeight: 700 }}>{bl.type}</span>
              <button onClick={() => removeBlock(i)} style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}>✕</button>
            </div>
            {bl.type === "heading" ? (
              <input value={bl.content} onChange={e => updateBlock(i, e.target.value)} placeholder="Section heading" style={inp} />
            ) : bl.type === "video" ? (
              <div>
                <input value={bl.content} onChange={e => updateBlock(i, e.target.value)} placeholder="Paste YouTube or Vimeo URL..." style={{ ...inp, marginBottom: 4 }} />
                {bl.content && <div style={{ fontSize: 10, color: MUTED }}>Preview will appear in lesson viewer</div>}
              </div>
            ) : (
              <textarea value={bl.content} onChange={e => updateBlock(i, e.target.value)} rows={bl.type === "callout" ? 2 : 4}
                placeholder={bl.type === "callout" ? "Key takeaway or important note..." : "Lesson content..."} style={{ ...inp, resize: "vertical" }} />
            )}
          </div>
        ))}
      </div>

      {/* Quiz questions */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Quiz Questions (optional)</label>
          <button onClick={addQuestion} style={{ ...btnGhost, padding: "3px 8px", fontSize: 10 }}>+ Question</button>
        </div>
        {questions.map((q, qi) => (
          <div key={qi} style={{ ...card, padding: "14px 16px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: OFF_WHITE }}>Q{qi + 1}</span>
              <button onClick={() => removeQuestion(qi)} style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
            </div>
            <input value={q.question} onChange={e => updateQuestion(qi, { question: e.target.value })} placeholder="Question text..." style={{ ...inp, marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => updateQuestion(qi, { correct: oi })}
                    style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${q.correct === oi ? GREEN : BORDER}`,
                      background: q.correct === oi ? GREEN : "transparent", cursor: "pointer", flexShrink: 0 }} />
                  <input value={opt} onChange={e => {
                    const newOpts = [...q.options]; newOpts[oi] = e.target.value;
                    updateQuestion(qi, { options: newOpts });
                  }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} />
                </div>
              ))}
            </div>
            <input value={q.explanation || ""} onChange={e => updateQuestion(qi, { explanation: e.target.value })}
              placeholder="Explanation (shown after answer)" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} />
          </div>
        ))}
      </div>

      <button onClick={() => { if (title.trim()) onSave({ id: lesson?.id, title, contentBlocks: blocks, quizQuestions: questions, sortOrder: lesson?.sort_order ?? 0 }); }}
        disabled={!title.trim()} style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13, opacity: !title.trim() ? 0.4 : 1 }}>
        {lesson ? "Save Lesson" : "Add Lesson"}
      </button>
    </div>
  );
}

// ── LESSON VIEWER (Learner taking a lesson) ────────────────────
function LessonViewer({ lesson, course, progress, onComplete, onBack }) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const quizzes = lesson.quiz_questions || [];
  const hasQuiz = quizzes.length > 0;
  const totalQs = quizzes.length;
  const score = useMemo(() => {
    if (!submitted || totalQs === 0) return 0;
    const correct = quizzes.filter((q, i) => answers[i] === q.correct).length;
    return Math.round((correct / totalQs) * 100);
  }, [submitted, answers, quizzes, totalQs]);
  const passed = score >= (course?.passing_score || 80);
  const alreadyCompleted = progress?.status === "completed";

  const handleSubmitQuiz = () => {
    setSubmitted(true);
    if (!hasQuiz || (score >= (course?.passing_score || 80))) {
      // Will be called after state updates via effect
    }
  };

  useEffect(() => {
    if (submitted && (passed || !hasQuiz)) {
      onComplete({ quizScore: hasQuiz ? score : null, quizAnswers: hasQuiz ? answers : null });
    }
  }, [submitted, passed]);

  const handleMarkComplete = () => {
    onComplete({ quizScore: null, quizAnswers: null });
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <button onClick={onBack} style={{ ...btnGhost, marginBottom: 16, fontSize: 11 }}>← Back to course</button>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: CYAN, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{course?.title}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: WHITE, margin: 0, fontFamily: "Georgia,serif" }}>{lesson.title}</h1>
      </div>

      {/* Content */}
      {!showQuiz && (
        <div style={{ marginBottom: 32 }}>
          {(lesson.content_blocks || []).map((bl, i) => {
            if (bl.type === "heading") return <h2 key={i} style={{ fontSize: 16, fontWeight: 700, color: WHITE, margin: "24px 0 8px", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>{bl.content}</h2>;
            if (bl.type === "callout") return (
              <div key={i} style={{ padding: "12px 16px", background: `${CYAN}08`, border: `1px solid ${CYAN}22`, borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: OFF_WHITE, lineHeight: 1.6 }}>{bl.content}</div>
              </div>
            );
            if (bl.type === "warning") return (
              <div key={i} style={{ padding: "12px 16px", background: `${AMBER}08`, border: `1px solid ${AMBER}22`, borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: OFF_WHITE, lineHeight: 1.6 }}>{bl.content}</div>
              </div>
            );
            if (bl.type === "success") return (
              <div key={i} style={{ padding: "12px 16px", background: `${GREEN}08`, border: `1px solid ${GREEN}22`, borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: OFF_WHITE, lineHeight: 1.6 }}>{bl.content}</div>
              </div>
            );
            if (bl.type === "image") return (
              <div key={i} style={{ marginBottom: 16, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                <img src={bl.content} alt={bl.alt || ""} style={{ width: "100%", display: "block" }}
                  onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                <div style={{ display: "none", padding: "32px 16px", background: NEAR_BLACK, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 24, opacity: 0.3 }}>{"\uD83D\uDDBC"}</div>
                  <div style={{ fontSize: 11, color: MUTED, textAlign: "center" }}>{bl.alt || "Image"}</div>
                </div>
                {bl.caption && <div style={{ padding: "8px 12px", background: NEAR_BLACK, fontSize: 11, color: MUTED, lineHeight: 1.4 }}>{bl.caption}</div>}
              </div>
            );
            if (bl.type === "list") return (
              <div key={i} style={{ marginBottom: 12, paddingLeft: 8 }}>
                {(bl.content || "").split("\n").filter(Boolean).map((item, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 13, color: OFF_WHITE, lineHeight: 1.6 }}>
                    <span style={{ color: CYAN, flexShrink: 0 }}>{bl.ordered ? `${j + 1}.` : "\u2022"}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            );
            if (bl.type === "divider") return <hr key={i} style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "20px 0" }} />;
            if (bl.type === "video") {
              const embedUrl = getEmbedUrl(bl.content);
              return embedUrl ? (
                <div key={i} style={{ position: "relative", paddingBottom: "56.25%", height: 0, marginBottom: 16, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                  <iframe src={embedUrl} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <div key={i} style={{ padding: "16px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, marginBottom: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: MUTED }}>Invalid video URL. Supports YouTube and Vimeo links.</div>
                </div>
              );
            }
            return <p key={i} style={{ fontSize: 13, color: OFF_WHITE, lineHeight: 1.7, marginBottom: 12 }}>{bl.content}</p>;
          })}

          {(lesson.content_blocks || []).length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: MUTED }}>This lesson has no content yet.</div>
          )}

          <div style={{ marginTop: 24 }}>
            {hasQuiz && !alreadyCompleted ? (
              <button onClick={() => setShowQuiz(true)} style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13 }}>
                Take Quiz ({totalQs} question{totalQs !== 1 ? "s" : ""}) →
              </button>
            ) : !alreadyCompleted ? (
              <button onClick={handleMarkComplete} style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13 }}>
                Mark as Complete ✓
              </button>
            ) : (
              <div style={{ textAlign: "center", padding: 16, color: GREEN, fontSize: 13, fontWeight: 700 }}>✓ Lesson completed</div>
            )}
          </div>
        </div>
      )}

      {/* Quiz */}
      {showQuiz && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Quiz — {totalQs} question{totalQs !== 1 ? "s" : ""} · {course?.passing_score || 80}% to pass</div>
          {quizzes.map((q, qi) => (
            <div key={qi} style={{ ...card, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE, marginBottom: 10 }}>{qi + 1}. {q.question}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const isCorrect = submitted && q.correct === oi;
                  const isWrong = submitted && selected && !isCorrect;
                  let borderColor = selected ? WHITE : BORDER;
                  if (submitted) borderColor = isCorrect ? GREEN : isWrong ? RED : BORDER;
                  return (
                    <button key={oi} onClick={() => { if (!submitted) setAnswers(a => ({ ...a, [qi]: oi })); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6,
                        background: selected ? "rgba(255,255,255,0.04)" : "transparent",
                        border: `1px solid ${borderColor}`, cursor: submitted ? "default" : "pointer", textAlign: "left" }}>
                      <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {(selected || isCorrect) && <div style={{ width: 10, height: 10, borderRadius: 5, background: isCorrect ? GREEN : isWrong ? RED : WHITE }} />}
                      </div>
                      <span style={{ fontSize: 12, color: isCorrect ? GREEN : isWrong ? RED : OFF_WHITE }}>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: `${CYAN}08`, borderRadius: 4, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}

          {!submitted ? (
            <button onClick={handleSubmitQuiz} disabled={Object.keys(answers).length < totalQs}
              style={{ ...btnPrimary, width: "100%", padding: "14px 0", fontSize: 13, opacity: Object.keys(answers).length < totalQs ? 0.4 : 1, marginTop: 8 }}>
              Submit Answers
            </button>
          ) : (
            <div style={{ ...card, padding: "20px 24px", textAlign: "center", marginTop: 8 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: passed ? GREEN : RED, fontFamily: "Georgia,serif" }}>{score}%</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: passed ? GREEN : RED, marginBottom: 4 }}>{passed ? "Passed!" : "Not Passed"}</div>
              <div style={{ fontSize: 11, color: MUTED }}>{passed ? "This lesson is complete." : `You need ${course?.passing_score || 80}% to pass. Review the material and try again.`}</div>
              {!passed && (
                <button onClick={() => { setAnswers({}); setSubmitted(false); setShowQuiz(false); }}
                  style={{ ...btnGhost, marginTop: 12 }}>Review Lesson</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── COURSE DETAIL VIEW ─────────────────────────────────────────
function CourseDetail({ course, lessons, progress, enrollments, orgProfiles, profile, isAdmin,
  onStartLesson, onEditCourse, onEditLesson, onNewLesson, onDeleteLesson, onPublish, onBack }) {
  const myEnrollment = enrollments.find(e => e.course_id === course.id && e.user_id === profile?.id);
  const lessonCount = lessons.length;
  const completedCount = lessons.filter(l => progress.find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")).length;
  const isComplete = lessonCount > 0 && completedCount === lessonCount;

  // Admin: enrollment stats
  const totalUsers = orgProfiles.length;
  const enrolledUsers = enrollments.filter(e => e.course_id === course.id).length;
  const completedUsers = enrollments.filter(e => e.course_id === course.id && e.status === "completed").length;

  return (
    <div style={{ maxWidth: 800 }}>
      <button onClick={onBack} style={{ ...btnGhost, marginBottom: 16, fontSize: 11 }}>← All Courses</button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
              background: course.status === "published" ? `${GREEN}22` : `${YELLOW}22`,
              color: course.status === "published" ? GREEN : YELLOW }}>{course.status}</span>
            <span style={{ fontSize: 10, color: MUTED }}>{CATEGORIES.find(c => c.id === course.category)?.label || course.category} · {course.estimated_minutes} min</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: WHITE, margin: "0 0 4px", fontFamily: "Georgia,serif" }}>{course.title}</h1>
          {course.description && <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>{course.description}</p>}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {course.status === "draft" && lessonCount > 0 && (
              <button onClick={onPublish} style={{ ...btn, background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}44` }}>Publish</button>
            )}
            <button onClick={onEditCourse} style={btnGhost}>Edit</button>
            <button onClick={onNewLesson} style={btnPrimary}>+ Lesson</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 8, marginBottom: 20 }} className="stat-grid">
        <div style={{ ...card, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{lessonCount}</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Lessons</div>
        </div>
        <div style={{ ...card, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: isComplete ? GREEN : CYAN, fontFamily: "Georgia,serif" }}>{completedCount}/{lessonCount}</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>My Progress</div>
        </div>
        <div style={{ ...card, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{course.passing_score}%</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Pass Score</div>
        </div>
        {isAdmin && (
          <div style={{ ...card, padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: GREEN, fontFamily: "Georgia,serif" }}>{completedUsers}/{totalUsers}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Completed</div>
          </div>
        )}
      </div>

      {/* Lesson list */}
      {lessons.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: MUTED }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📖</div>
          <div style={{ fontSize: 13 }}>No lessons yet.{isAdmin ? " Add one to get started." : ""}</div>
        </div>
      ) : lessons.map((l, i) => {
        const myProgress = progress.find(p => p.lesson_id === l.id && p.user_id === profile?.id);
        const isLessonComplete = myProgress?.status === "completed";
        const hasQuiz = (l.quiz_questions || []).length > 0;
        return (
          <div key={l.id} style={{ ...card, padding: "14px 18px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12,
            borderLeft: `3px solid ${isLessonComplete ? GREEN : BORDER}`, cursor: "pointer", transition: "all 0.15s" }}
            onClick={() => onStartLesson(l)}>
            <div style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              background: isLessonComplete ? `${GREEN}22` : NEAR_BLACK, border: `1px solid ${isLessonComplete ? GREEN : BORDER}`, flexShrink: 0 }}>
              {isLessonComplete ? <span style={{ color: GREEN, fontSize: 14 }}>✓</span> : <span style={{ color: MUTED, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{l.title}</div>
              <div style={{ fontSize: 10, color: MUTED }}>
                {(l.content_blocks || []).length} block{(l.content_blocks || []).length !== 1 ? "s" : ""}
                {hasQuiz && ` · ${(l.quiz_questions || []).length} quiz question${(l.quiz_questions || []).length !== 1 ? "s" : ""}`}
                {myProgress?.quiz_score != null && ` · Score: ${myProgress.quiz_score}%`}
              </div>
            </div>
            {isAdmin && (
              <button onClick={e => { e.stopPropagation(); onEditLesson(l); }} style={{ ...btnGhost, padding: "4px 10px", fontSize: 10 }}>Edit</button>
            )}
            {isAdmin && (
              <button onClick={e => { e.stopPropagation(); if (confirm("Delete this lesson?")) onDeleteLesson(l.id); }} style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer" }}>✕</button>
            )}
          </div>
        );
      })}

      {/* Admin: user progress table */}
      {isAdmin && orgProfiles.length > 0 && lessons.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: OFF_WHITE, marginBottom: 8 }}>Team Progress</div>
          <div style={{ ...card, overflow: "hidden" }}>
            {orgProfiles.map(u => {
              const userLessonsComplete = lessons.filter(l => progress.find(p => p.lesson_id === l.id && p.user_id === u.id && p.status === "completed")).length;
              const pct = lessonCount > 0 ? Math.round((userLessonsComplete / lessonCount) * 100) : 0;
              return (
                <div key={u.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 10, fontWeight: 700 }}>
                    {(u.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{u.full_name}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{userLessonsComplete}/{lessonCount} lessons</div>
                  </div>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: NEAR_BLACK, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : CYAN, borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: pct === 100 ? GREEN : MUTED, width: 36, textAlign: "right" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN CBT COMPONENT ─────────────────────────────────────────
export default function CbtModules({
  profile, session, orgProfiles,
  courses, lessons: allLessonsMap, progress, enrollments,
  onCreateCourse, onUpdateCourse, onDeleteCourse,
  onSaveLesson, onDeleteLesson,
  onUpdateProgress, onUpdateEnrollment,
  onPublishCourse, onRefresh,
  trainingRequirements, trainingRecords, onCreateRequirement, onLogTraining,
  onDeleteTrainingRecord, onDeleteRequirement,
  onInitTraining, tourTab,
}) {
  const [topTab, setTopTab] = useState("cbt"); // cbt | records | requirements
  useEffect(() => { if (tourTab) setTopTab(tourTab); }, [tourTab]);
  const [view, setView] = useState("catalog"); // catalog, course_detail, lesson, new_course, edit_course, new_lesson, edit_lesson
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [trainingView, setTrainingView] = useState("list"); // list | new_training | new_requirement
  const [initializing, setInitializing] = useState(false);
  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState("all");
  const [sortBy, setSortBy] = useState("title_az");
  const [showCount, setShowCount] = useState(25);

  useEffect(() => { setShowCount(25); }, [listFilter, search, sortBy]);

  // Auto-reset expired course enrollments so user must retake
  useEffect(() => {
    if (!profile?.id || !onUpdateEnrollment) return;
    const now = new Date();
    for (const course of courses) {
      const req = (trainingRequirements || []).find(r => r.title === course.title);
      if (!req) continue;
      const myRecord = (trainingRecords || [])
        .filter(r => r.user_id === profile.id && r.requirement_id === req.id)
        .sort((a, b) => (b.completed_date || "").localeCompare(a.completed_date || ""))[0];
      if (!myRecord?.expiry_date) continue;
      if (new Date(myRecord.expiry_date) >= now) continue;
      // Record is expired — reset enrollment if it's marked completed
      const myEnrollment = enrollments.find(e => e.course_id === course.id && e.user_id === profile.id && e.status === "completed");
      if (myEnrollment) {
        onUpdateEnrollment(course.id, { status: "expired", completedAt: null, certificateNumber: null });
      }
    }
  }, [profile, courses, trainingRequirements, trainingRecords, enrollments, onUpdateEnrollment]);

  const handleInitTraining = async () => {
    setInitializing(true);
    await onInitTraining(PART5_TRAINING_REQUIREMENTS, [...PART5_CBT_COURSES, PILOT_ONBOARDING_COURSE, ADMIN_ONBOARDING_COURSE]);
    setInitializing(false);
  };

  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const publishedCourses = courses.filter(c => c.status === "published" || isAdmin);

  // Admins see all org records; non-admins see only their own
  const visibleRecords = useMemo(() => {
    if (isAdmin) return trainingRecords || [];
    return (trainingRecords || []).filter(r => r.user_id === profile?.id);
  }, [trainingRecords, isAdmin, profile]);

  const openCourse = (c) => { setSelectedCourse(c); setView("course_detail"); };
  const openLesson = (l) => { setSelectedLesson(l); setView("lesson"); };

  const trainingStatus = useMemo(() => {
    const now = new Date();
    let current = 0, expiring = 0, expired = 0;
    visibleRecords.forEach(r => {
      if (!r.expiry_date) { current++; return; }
      const exp = new Date(r.expiry_date);
      if (exp < now) expired++;
      else {
        const daysLeft = (exp - now) / (1000 * 60 * 60 * 24);
        if (daysLeft < 30) expiring++;
        else current++;
      }
    });
    return { current, expiring, expired };
  }, [visibleRecords]);

  // Current user's training status (for expiry banner in CBT view)
  const myTrainingStatus = useMemo(() => {
    const now = new Date();
    let expiring = 0, expired = 0;
    (trainingRecords || []).forEach(r => {
      if (r.user_id !== profile?.id || !r.expiry_date) return;
      const exp = new Date(r.expiry_date);
      if (exp < now) expired++;
      else if ((exp - now) / (1000 * 60 * 60 * 24) < 30) expiring++;
    });
    return { expiring, expired };
  }, [trainingRecords, profile]);

  // Compliance matrix: users × requirements (admin only)
  const complianceMatrix = useMemo(() => {
    if (!isAdmin || !orgProfiles?.length || !trainingRequirements?.length) return { users: [], requirements: [], matrix: {}, compliantCount: 0, totalUsers: 0 };
    const now = new Date();
    const reqs = trainingRequirements;
    const users = orgProfiles.filter(p => p.full_name);
    const matrix = {};
    let compliantCount = 0;
    for (const user of users) {
      matrix[user.id] = {};
      let allCurrent = true;
      for (const req of reqs) {
        // Find most recent matching record for this user + requirement
        const matching = (trainingRecords || [])
          .filter(r => r.user_id === user.id && r.requirement_id === req.id)
          .sort((a, b) => (b.completed_date || "").localeCompare(a.completed_date || ""));
        const rec = matching[0];
        if (!rec) { matrix[user.id][req.id] = "not_completed"; allCurrent = false; }
        else if (!rec.expiry_date) { matrix[user.id][req.id] = "current"; }
        else {
          const exp = new Date(rec.expiry_date);
          if (exp < now) { matrix[user.id][req.id] = "expired"; allCurrent = false; }
          else if ((exp - now) / (1000 * 60 * 60 * 24) < 30) { matrix[user.id][req.id] = "expiring"; }
          else { matrix[user.id][req.id] = "current"; }
        }
      }
      if (allCurrent) compliantCount++;
    }
    return { users, requirements: reqs, matrix, compliantCount, totalUsers: users.length };
  }, [isAdmin, orgProfiles, trainingRequirements, trainingRecords]);

  // Count courses by category
  const courseCategoryCounts = useMemo(() => {
    const c = { all: 0 };
    CATEGORIES.forEach(cat => { c[cat.id] = 0; });
    publishedCourses.forEach(course => { c.all++; if (c[course.category] !== undefined) c[course.category]++; });
    return c;
  }, [publishedCourses]);

  // Per-course training status for current user (due/overdue indicators)
  const courseTrainingStatus = useMemo(() => {
    const now = new Date();
    const map = {};
    for (const course of publishedCourses) {
      const req = (trainingRequirements || []).find(r => r.title === course.title);
      if (!req) continue;
      const myRecord = (trainingRecords || [])
        .filter(r => r.user_id === profile?.id && r.requirement_id === req.id)
        .sort((a, b) => (b.completed_date || "").localeCompare(a.completed_date || ""))[0];
      if (!myRecord) { map[course.id] = "not_completed"; continue; }
      if (!myRecord.expiry_date) continue; // no expiry = current, no badge needed
      const exp = new Date(myRecord.expiry_date);
      if (exp < now) map[course.id] = "expired";
      else if ((exp - now) / (1000 * 60 * 60 * 24) < 30) map[course.id] = "expiring";
    }
    return map;
  }, [publishedCourses, trainingRequirements, trainingRecords, profile]);

  // Filtered lists for search + filter
  const filteredCourses = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = publishedCourses.filter(c => {
      if (listFilter !== "all" && c.category !== listFilter) return false;
      if (q) {
        const hay = `${c.title} ${c.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "progress") {
        const pctA = (a.lessons || []).length > 0 ? (a.lessons || []).filter(l => progress.find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")).length / (a.lessons || []).length : 0;
        const pctB = (b.lessons || []).length > 0 ? (b.lessons || []).filter(l => progress.find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")).length / (b.lessons || []).length : 0;
        return pctB - pctA;
      }
      return (a.title || "").localeCompare(b.title || "");
    });
    return list;
  }, [publishedCourses, listFilter, search, sortBy, progress, profile]);

  const recordStatusCounts = useMemo(() => {
    const c = { all: 0, current: 0, expiring: 0, expired: 0 };
    const now = new Date();
    visibleRecords.forEach(r => {
      c.all++;
      if (!r.expiry_date) { c.current++; return; }
      const exp = new Date(r.expiry_date);
      if (exp < now) c.expired++;
      else if ((exp - now) / (1000*60*60*24) < 30) c.expiring++;
      else c.current++;
    });
    return c;
  }, [visibleRecords]);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = new Date();
    let list = visibleRecords.filter(r => {
      if (listFilter !== "all") {
        const isExpired = r.expiry_date && new Date(r.expiry_date) < now;
        const isExpiring = r.expiry_date && !isExpired && (new Date(r.expiry_date) - now) / (1000*60*60*24) < 30;
        const status = isExpired ? "expired" : isExpiring ? "expiring" : "current";
        if (listFilter !== status) return false;
      }
      if (q) {
        const hay = `${r.title} ${r.user?.full_name || ""} ${r.instructor || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.completed_date || a.created_at) - new Date(b.completed_date || b.created_at);
      if (sortBy === "expiry") return (a.expiry_date || "9999") < (b.expiry_date || "9999") ? -1 : 1;
      return new Date(b.completed_date || b.created_at) - new Date(a.completed_date || a.created_at);
    });
    return list;
  }, [trainingRecords, listFilter, search, sortBy]);

  const requirementTypeCounts = useMemo(() => {
    const c = { all: 0, initial: 0, recurrent: 0 };
    (trainingRequirements || []).forEach(r => {
      c.all++;
      if (r.frequency_months > 0) c.recurrent++; else c.initial++;
    });
    return c;
  }, [trainingRequirements]);

  const filteredRequirements = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = (trainingRequirements || []).filter(r => {
      if (listFilter !== "all") {
        const type = r.frequency_months > 0 ? "recurrent" : "initial";
        if (listFilter !== type) return false;
      }
      if (q) {
        const hay = `${r.title} ${r.description || ""} ${r.category || ""} ${(r.required_for || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      return (a.title || "").localeCompare(b.title || "");
    });
    return list;
  }, [trainingRequirements, listFilter, search, sortBy]);

  const handleCompleteLesson = async (result) => {
    if (!selectedCourse || !selectedLesson) return;
    await onUpdateProgress(selectedCourse.id, selectedLesson.id, {
      status: "completed",
      quizScore: result.quizScore,
      quizAnswers: result.quizAnswers,
      completedAt: new Date().toISOString(),
    });
    // Check if all lessons in course are now complete
    const courseLessons = allLessonsMap[selectedCourse.id] || [];
    const updatedProgress = [...progress, { course_id: selectedCourse.id, lesson_id: selectedLesson.id, user_id: profile.id, status: "completed" }];
    const allDone = courseLessons.every(l =>
      updatedProgress.find(p => p.lesson_id === l.id && p.user_id === profile.id && p.status === "completed")
    );
    if (allDone) {
      const certNum = `CBT-${Date.now().toString(36).toUpperCase()}`;
      await onUpdateEnrollment(selectedCourse.id, { status: "completed", completedAt: new Date().toISOString(), certificateNumber: certNum });
      // Auto-log as training record — link to matching requirement and set expiry
      if (onLogTraining) {
        const matchingReq = (trainingRequirements || []).find(r => r.title === selectedCourse.title);
        const completedDate = new Date().toISOString().slice(0, 10);
        // Skip duplicate if same user + requirement + date already exists
        const isDuplicate = matchingReq && (trainingRecords || []).some(r =>
          r.user_id === profile.id && r.requirement_id === matchingReq.id && r.completed_date === completedDate
        );
        if (!isDuplicate) {
          let expiryDate = null;
          if (matchingReq && matchingReq.frequency_months > 0) {
            const exp = new Date();
            exp.setMonth(exp.getMonth() + matchingReq.frequency_months);
            expiryDate = exp.toISOString().slice(0, 10);
          }
          await onLogTraining({
            title: selectedCourse.title,
            completedDate,
            requirementId: matchingReq?.id || null,
            expiryDate,
            instructor: "Computer-Based Training",
            notes: `Certificate: ${certNum}`,
          });
        }
      }
    } else {
      await onUpdateEnrollment(selectedCourse.id, { status: "in_progress" });
    }
    onRefresh();
  };

  // Training forms (for records & requirements tabs)
  if (trainingView === "new_training") return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <TrainingForm requirements={trainingRequirements || []} onSubmit={t => { onLogTraining(t); setTrainingView("list"); }} onCancel={() => setTrainingView("list")} />
    </div>
  );
  if (trainingView === "new_requirement") return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <RequirementForm onSubmit={r => { onCreateRequirement(r); setTrainingView("list"); }} onCancel={() => setTrainingView("list")} />
    </div>
  );

  // Top-level tab bar (CBT Courses | Training Records | Requirements | Compliance)
  const tabs = [["cbt", "Training Courses"], ["records", "Training Records"], ["requirements", "Requirements"]];
  if (isAdmin) tabs.push(["compliance", "Compliance"]);
  const renderTopTabs = () => (
    <div data-tour="tour-cbt-tabs" style={{ display: "flex", gap: 4, marginBottom: 16 }}>
      {tabs.map(([id, label]) => (
        <button key={id} data-onboarding={id === "cbt" ? "cbt-courses-tab" : id === "records" ? "cbt-records-tab" : id === "requirements" ? "cbt-requirements-tab" : id === "compliance" ? "cbt-compliance-tab" : undefined} onClick={() => { setTopTab(id); setView("catalog"); setTrainingView("list"); setSearch(""); setListFilter("all"); setSortBy(id === "cbt" ? "title_az" : id === "records" ? "newest" : "title_az"); setShowCount(25); }}
          style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${topTab === id ? WHITE : BORDER}`,
            background: topTab === id ? WHITE : "transparent", color: topTab === id ? BLACK : MUTED,
            fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
      ))}
    </div>
  );

  // ── Training Records tab ──
  if (topTab === "records") {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Training Records</div>
            <div style={{ fontSize: 11, color: MUTED }}>§5.91–5.97 — Safety promotion and training</div>
          </div>
          <button data-onboarding="cbt-log-training-btn" onClick={() => setTrainingView("new_training")} style={btnPrimary}>+ Log Training</button>
        </div>
        {renderTopTabs()}
        <div data-onboarding="cbt-records-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: GREEN, fontFamily: "Georgia,serif" }}>{trainingStatus.current}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Current</div>
          </div>
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: YELLOW, fontFamily: "Georgia,serif" }}>{trainingStatus.expiring}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Expiring Soon</div>
          </div>
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: RED, fontFamily: "Georgia,serif" }}>{trainingStatus.expired}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Expired</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." style={{ ...inp, width: 200, maxWidth: 200, padding: "5px 10px", fontSize: 12 }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, width: "auto", maxWidth: 180, padding: "5px 10px", fontSize: 12 }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="expiry">Expiry (soonest)</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {[["all", "All"], ["current", "Current"], ["expiring", "Expiring"], ["expired", "Expired"]].map(([id, label]) => (
            <button key={id} onClick={() => setListFilter(id)}
              style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${listFilter === id ? WHITE : BORDER}`,
                background: listFilter === id ? WHITE : CARD, color: listFilter === id ? BLACK : MUTED,
                fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{label} ({recordStatusCounts[id] || 0})</button>
          ))}
        </div>
        {filteredRecords.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 14 }}>{(trainingRecords || []).length === 0 ? "No training records yet" : "No matching records"}</div>
          </div>
        ) : (<>
          {filteredRecords.slice(0, showCount).map(r => {
            const isExpired = r.expiry_date && new Date(r.expiry_date) < new Date();
            const isExpiring = r.expiry_date && !isExpired && (new Date(r.expiry_date) - new Date()) / (1000*60*60*24) < 30;
            const statusColor = isExpired ? RED : isExpiring ? YELLOW : GREEN;
            return (
              <div key={r.id} style={{ ...card, padding: "12px 16px", marginBottom: 6, borderLeft: `3px solid ${statusColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: WHITE }}>{r.title}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>
                      {r.user?.full_name || "Unknown"} · Completed: {r.completed_date}
                      {r.expiry_date && ` · Expires: ${r.expiry_date}`}
                      {r.instructor && ` · Instructor: ${r.instructor}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>
                    {isExpired ? "EXPIRED" : isExpiring ? "EXPIRING" : "CURRENT"}
                  </span>
                  {isAdmin && onDeleteTrainingRecord && (
                    <button onClick={() => { if (confirm("Delete this training record?")) onDeleteTrainingRecord(r.id); }}
                      style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>✕</button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredRecords.length > showCount && (
            <button onClick={() => setShowCount(c => c + 25)}
              style={{ width: "100%", padding: "12px 0", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>
              Showing {showCount} of {filteredRecords.length} — Show 25 more
            </button>
          )}
        </>)}
      </div>
    );
  }

  // ── Requirements tab ──
  if (topTab === "requirements") {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Training Requirements</div>
            <div style={{ fontSize: 11, color: MUTED }}>Define recurring or one-time training requirements for your organization</div>
          </div>
          <button onClick={() => setTrainingView("new_requirement")} style={btnPrimary}>+ Requirement</button>
        </div>
        {renderTopTabs()}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requirements..." style={{ ...inp, width: 200, maxWidth: 200, padding: "5px 10px", fontSize: 12 }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, width: "auto", maxWidth: 180, padding: "5px 10px", fontSize: 12 }}>
            <option value="title_az">Title A-Z</option>
            <option value="category">Category</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {[["all", "All"], ["initial", "Initial"], ["recurrent", "Recurrent"]].map(([id, label]) => (
            <button key={id} onClick={() => setListFilter(id)}
              style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${listFilter === id ? WHITE : BORDER}`,
                background: listFilter === id ? WHITE : CARD, color: listFilter === id ? BLACK : MUTED,
                fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{label} ({requirementTypeCounts[id] || 0})</button>
          ))}
        </div>
        {filteredRequirements.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14 }}>{(trainingRequirements || []).length === 0 ? "No training requirements defined yet" : "No matching requirements"}</div>
          </div>
        ) : (<>
          {filteredRequirements.slice(0, showCount).map(r => (
            <div key={r.id} style={{ ...card, padding: "10px 14px", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{r.title}</span>
                <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>
                  {r.frequency_months > 0 ? `Every ${r.frequency_months} months` : "One-time"} · {r.required_for?.join(", ")}
                </span>
              </div>
              {isAdmin && onDeleteRequirement && (
                <button onClick={() => { if (confirm("Delete this requirement?")) onDeleteRequirement(r.id); }}
                  style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>✕</button>
              )}
            </div>
          ))}
          {filteredRequirements.length > showCount && (
            <button onClick={() => setShowCount(c => c + 25)}
              style={{ width: "100%", padding: "12px 0", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>
              Showing {showCount} of {filteredRequirements.length} — Show 25 more
            </button>
          )}
        </>)}
      </div>
    );
  }

  // ── Compliance tab (admin-only) ──
  if (topTab === "compliance" && isAdmin) {
    const { users, requirements, matrix, compliantCount, totalUsers } = complianceMatrix;
    const statusDot = (status) => {
      const colors = { current: GREEN, expiring: YELLOW, expired: RED, not_completed: SUBTLE };
      const labels = { current: "Current", expiring: "Expiring", expired: "Expired", not_completed: "Not completed" };
      return <span title={labels[status] || status} style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: colors[status] || SUBTLE }} />;
    };
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Training Compliance</div>
            <div style={{ fontSize: 11, color: MUTED }}>Per-user compliance status across all training requirements</div>
          </div>
        </div>
        {renderTopTabs()}
        <div data-onboarding="cbt-compliance-summary" style={{ ...card, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: compliantCount === totalUsers ? GREEN : YELLOW }}>
            {compliantCount} of {totalUsers}
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>users fully compliant</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 12, fontSize: 10, color: MUTED }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: GREEN, marginRight: 4 }} />Current</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: YELLOW, marginRight: 4 }} />Expiring</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: RED, marginRight: 4 }} />Expired</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: SUBTLE, marginRight: 4 }} />Not completed</span>
          </div>
        </div>
        {requirements.length === 0 || users.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14 }}>No training requirements or users found</div>
          </div>
        ) : (
          <div data-onboarding="cbt-compliance-matrix" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, position: "sticky", left: 0, background: "#111", minWidth: 140 }}>User</th>
                  {requirements.map(r => (
                    <th key={r.id} style={{ textAlign: "center", padding: "8px 6px", color: MUTED, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, fontSize: 10, maxWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.title}>
                      {r.title.length > 16 ? r.title.slice(0, 15) + "…" : r.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ padding: "6px 10px", color: WHITE, fontWeight: 500, borderBottom: `1px solid ${BORDER}`, position: "sticky", left: 0, background: "#111" }}>{user.full_name}</td>
                    {requirements.map(r => (
                      <td key={r.id} style={{ textAlign: "center", padding: "6px", borderBottom: `1px solid ${BORDER}` }}>
                        {statusDot(matrix[user.id]?.[r.id] || "not_completed")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── CBT Courses tab (default) ──

  // Catalog view
  if (view === "catalog") {
    // Stats
    const totalCourses = publishedCourses.length;
    const myCompleted = enrollments.filter(e => e.user_id === profile?.id && e.status === "completed").length;
    const myInProgress = enrollments.filter(e => e.user_id === profile?.id && e.status === "in_progress").length;

    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Training Courses</div>
            <div style={{ fontSize: 11, color: MUTED }}>§5.91–5.97 — Online training and safety promotion</div>
          </div>
          {isAdmin && <button data-onboarding="cbt-new-course-btn" onClick={() => setView("new_course")} style={btnPrimary}>+ New Course</button>}
        </div>

        {renderTopTabs()}

        {myTrainingStatus.expired > 0 && (
          <div style={{ padding: "10px 14px", marginBottom: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>You have {myTrainingStatus.expired} expired training record{myTrainingStatus.expired !== 1 ? "s" : ""}</span>
            <button onClick={() => { setTopTab("records"); setTrainingView("list"); setSortBy("expiry"); }} style={{ ...btn, background: "rgba(239,68,68,0.2)", color: RED, fontSize: 10, padding: "4px 10px" }}>View</button>
          </div>
        )}
        {myTrainingStatus.expiring > 0 && myTrainingStatus.expired === 0 && (
          <div style={{ padding: "10px 14px", marginBottom: 12, borderRadius: 8, background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: YELLOW, fontWeight: 600 }}>You have {myTrainingStatus.expiring} training record{myTrainingStatus.expiring !== 1 ? "s" : ""} expiring within 30 days</span>
            <button onClick={() => { setTopTab("records"); setTrainingView("list"); setSortBy("expiry"); }} style={{ ...btn, background: "rgba(250,204,21,0.1)", color: YELLOW, fontSize: 10, padding: "4px 10px" }}>View</button>
          </div>
        )}

        <div data-onboarding="cbt-course-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }} className="stat-grid">
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{totalCourses}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Courses</div>
          </div>
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: GREEN, fontFamily: "Georgia,serif" }}>{myCompleted}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Completed</div>
          </div>
          <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: CYAN, fontFamily: "Georgia,serif" }}>{myInProgress}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>In Progress</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." style={{ ...inp, width: 200, maxWidth: 200, padding: "5px 10px", fontSize: 12 }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, width: "auto", maxWidth: 180, padding: "5px 10px", fontSize: 12 }}>
            <option value="title_az">Title A-Z</option>
            <option value="progress">Progress</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {[{ id: "all", label: "All" }, ...CATEGORIES].map(c => (
            <button key={c.id} onClick={() => setListFilter(c.id)}
              style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${listFilter === c.id ? WHITE : BORDER}`,
                background: listFilter === c.id ? WHITE : CARD, color: listFilter === c.id ? BLACK : MUTED,
                fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{c.label} ({courseCategoryCounts[c.id] || 0})</button>
          ))}
        </div>

        {(trainingRequirements || []).length === 0 && isAdmin && onInitTraining && (
          <div style={{ maxWidth: 600, margin: "0 auto 20px", textAlign: "center" }}>
            <div style={{ ...card, padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>🎓</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Part 5 Training Program</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
                Set up a complete 14 CFR Part 5 compliant training program with pre-built requirements and courses covering all SMS competency areas.
              </div>
              <div style={{ fontSize: 11, color: OFF_WHITE, marginBottom: 20 }}>
                5 training requirements and 5 courses with 18 lessons covering Safety Policy, Safety Risk Management, Safety Assurance, Emergency Response Planning, and Safety Promotion will be created.
              </div>
              <button data-onboarding="cbt-init-btn" onClick={handleInitTraining} disabled={initializing}
                style={{ padding: "14px 32px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: initializing ? "default" : "pointer", opacity: initializing ? 0.5 : 1 }}>
                {initializing ? "Initializing..." : "Initialize Part 5 Training Program"}
              </button>
            </div>
          </div>
        )}

        {filteredCourses.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 14 }}>{publishedCourses.length === 0 ? "No courses available yet." : "No matching courses."}</div>
            {publishedCourses.length === 0 && isAdmin && <div style={{ fontSize: 12, marginTop: 4 }}>Create one to get started.</div>}
          </div>
        ) : (<div data-onboarding="cbt-course-list">{filteredCourses.slice(0, showCount).map(c => {
          const courseLessons = c.lessons || [];
          const myEnrollment = enrollments.find(e => e.course_id === c.id && e.user_id === profile?.id);
          const myLessonsComplete = courseLessons.filter(l => progress.find(p => p.lesson_id === l.id && p.user_id === profile?.id && p.status === "completed")).length;
          const pct = courseLessons.length > 0 ? Math.round((myLessonsComplete / courseLessons.length) * 100) : 0;
          const cat = CATEGORIES.find(ca => ca.id === c.category);
          const statusColor = myEnrollment?.status === "completed" ? GREEN : myEnrollment?.status === "in_progress" ? CYAN : MUTED;

          return (
            <div key={c.id} onClick={() => openCourse(c)}
              style={{ ...card, padding: "16px 20px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all 0.15s" }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: NEAR_BLACK, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>📖</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{c.title}</span>
                  {c.status === "draft" && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: `${YELLOW}22`, color: YELLOW }}>DRAFT</span>}
                  {courseTrainingStatus[c.id] === "expired" && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: `${RED}22`, color: RED }}>OVERDUE</span>}
                  {courseTrainingStatus[c.id] === "expiring" && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: `${YELLOW}22`, color: YELLOW }}>DUE SOON</span>}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>
                  {cat?.label || c.category} · {courseLessons.length} lesson{courseLessons.length !== 1 ? "s" : ""} · {c.estimated_minutes} min
                  {c.required_for?.length > 0 && ` · Required: ${c.required_for.join(", ")}`}
                </div>
                {courseLessons.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1, maxWidth: 200, height: 4, borderRadius: 2, background: NEAR_BLACK, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : CYAN, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>{pct}%</span>
                  </div>
                )}
              </div>
              {isAdmin && (
                <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${c.title}"?`)) { onDeleteCourse(c.id); } }}
                  style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", padding: "4px 6px", flexShrink: 0 }}>✕</button>
              )}
              <span style={{ fontSize: 16, color: MUTED }}>→</span>
            </div>
          );
        })}
        {filteredCourses.length > showCount && (
          <button onClick={() => setShowCount(c => c + 25)}
            style={{ width: "100%", padding: "12px 0", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>
            Showing {showCount} of {filteredCourses.length} — Show 25 more
          </button>
        )}
        </div>)}
      </div>
    );
  }

  // New/Edit course
  if (view === "new_course" || view === "edit_course") {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <CourseForm course={view === "edit_course" ? selectedCourse : null}
          onSave={async (form) => {
            if (view === "edit_course" && selectedCourse) {
              await onUpdateCourse(selectedCourse.id, { title: form.title, description: form.description, category: form.category, passing_score: form.passingScore, estimated_minutes: form.estimatedMinutes, required_for: form.requiredFor });
            } else {
              await onCreateCourse(form);
            }
            onRefresh();
            setView("catalog");
          }}
          onCancel={() => setView(selectedCourse ? "course_detail" : "catalog")} />
      </div>
    );
  }

  // New/Edit lesson
  if (view === "new_lesson" || view === "edit_lesson") {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <LessonEditor lesson={view === "edit_lesson" ? selectedLesson : null}
          onSave={async (lessonData) => {
            const sortOrder = view === "new_lesson" ? (allLessonsMap[selectedCourse.id]?.length || 0) : lessonData.sortOrder;
            await onSaveLesson(selectedCourse.id, { ...lessonData, sortOrder });
            onRefresh();
            setView("course_detail");
          }}
          onCancel={() => setView("course_detail")} />
      </div>
    );
  }

  // Course detail
  if (view === "course_detail" && selectedCourse) {
    const courseLessons = allLessonsMap[selectedCourse.id] || [];
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <CourseDetail course={selectedCourse} lessons={courseLessons} progress={progress} enrollments={enrollments}
          orgProfiles={orgProfiles} profile={profile} isAdmin={isAdmin}
          onStartLesson={openLesson} onEditCourse={() => setView("edit_course")}
          onEditLesson={l => { setSelectedLesson(l); setView("edit_lesson"); }}
          onNewLesson={() => setView("new_lesson")}
          onDeleteLesson={async (id) => { await onDeleteLesson(id); onRefresh(); }}
          onPublish={async () => { await onUpdateCourse(selectedCourse.id, { status: "published" }); onRefresh(); setSelectedCourse(prev => ({ ...prev, status: "published" })); }}
          onBack={() => { setView("catalog"); setSelectedCourse(null); }} />
      </div>
    );
  }

  // Lesson viewer
  if (view === "lesson" && selectedLesson && selectedCourse) {
    const myProgress = progress.find(p => p.lesson_id === selectedLesson.id && p.user_id === profile?.id);
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <LessonViewer lesson={selectedLesson} course={selectedCourse} progress={myProgress}
          onComplete={handleCompleteLesson}
          onBack={() => setView("course_detail")} />
      </div>
    );
  }

  return null;
}
