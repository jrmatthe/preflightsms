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
  { title: "Pillar 1: Safety Policy & SMS Foundations", description: "Comprehensive training on Safety Management Systems under 14 CFR Part 5 Subpart B. Covers the four pillars of SMS, safety policy development and implementation, organizational safety objectives, management commitment, safety reporting policy, just culture principles, roles and accountability for the Accountable Executive, Safety Manager, and all employees (§5.21, §5.23, §5.25). Includes the regulatory framework, real-world case studies of SMS implementation, and practical guidance for integrating SMS into daily operations.", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
  { title: "Pillar 2: Safety Risk Management", description: "In-depth training on the Safety Risk Management process under 14 CFR Part 5 Subpart C (§5.51–§5.55). Covers systematic hazard identification through multiple data sources, system and task analysis methods, risk assessment using standardized 5×5 likelihood/severity matrices, risk control development following the hierarchy of controls, and residual risk evaluation. Includes practical application of risk management tools such as bowtie analysis, the Swiss Cheese Model, and real-world aviation case studies demonstrating how SRM prevents accidents.", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
  { title: "Pillar 3: Safety Assurance", description: "Detailed training on Safety Assurance processes under 14 CFR Part 5 Subpart D (§5.71–§5.75). Covers continuous safety performance monitoring using Safety Performance Indicators (SPIs), multi-source data collection and trend analysis, safety performance assessment against organizational objectives, the continuous improvement cycle, corrective action development and verification, and management of change. Includes guidance on building effective safety review boards and leveraging data analytics for proactive safety management.", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
  { title: "Pillar 4: Safety Promotion", description: "Training on Safety Promotion requirements under 14 CFR Part 5 Subpart E (§5.91, §5.93). Covers SMS competency and training program requirements, multi-channel safety communication strategies, hazard information dissemination tailored to employee responsibilities, explaining safety actions and procedure changes, and building and sustaining a positive safety culture. Includes practical guidance on safety newsletters, safety stand-downs, recognition programs, feedback mechanisms, and leadership behaviors that shape organizational safety culture.", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
  { title: "Emergency Response Planning", description: "Training on the organization's Emergency Response Plan (ERP) as required by §5.27. Covers ERP structure and emergency classification levels, notification chains and command structure during emergencies, delegation of emergency authority, assignment of emergency responsibilities, coordination with interfacing organizations (airports, FBOs, medical facilities), post-event investigation procedures, organizational recovery planning, NTSB/FAA reporting requirements, and Critical Incident Stress Management (CISM). Includes tabletop exercise scenarios and real-world case studies.", category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"], frequencyMonths: 12 },
];

// ── PART 5 CBT COURSES (pre-seed) ──────────────────────────────
const PART5_CBT_COURSES = [
  {
    title: "Pillar 1: Safety Policy & SMS Foundations",
    description: "Comprehensive training on Safety Management Systems under 14 CFR Part 5 Subpart B. Covers the four pillars of SMS, safety policy development and implementation, organizational safety objectives, management commitment, safety reporting policy, just culture principles, roles and accountability for the Accountable Executive, Safety Manager, and all employees (§5.21, §5.23, §5.25). Includes the regulatory framework, real-world case studies of SMS implementation, and practical guidance for integrating SMS into daily operations.",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 60,
    lessons: [
      {
        title: "Introduction to SMS & The Four Pillars",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "What Is a Safety Management System?" },
          { type: "text", content: "A Safety Management System (SMS) is a formal, organization-wide approach to managing safety risk and assuring the effectiveness of safety controls. Required by 14 CFR Part 5 for certificate holders operating under Part 121 and voluntarily adopted by Part 135 operators, an SMS provides a structured framework that moves beyond simple regulatory compliance to proactive safety management." },
          { type: "text", content: "The concept of SMS emerged from decades of aviation accident investigation. In the early years of commercial aviation, safety improvements came primarily from investigating accidents and fixing what went wrong — a purely reactive approach. By the 1990s, the industry recognized that waiting for accidents was no longer acceptable. Organizations like ICAO began developing frameworks for proactive safety management, leading to ICAO Annex 19 and eventually the FAA's 14 CFR Part 5." },
          { type: "text", content: "An SMS is not a separate program bolted onto your existing operations. It is a management system — like quality management or financial management — that is integrated into how you plan, execute, and evaluate every aspect of your operation. Just as you would not run a business without financial controls, you should not run an aviation operation without systematic safety management." },
          { type: "video", content: "https://www.youtube.com/watch?v=Bx3-A_VG-b0", caption: "FAA Safety Management System Overview — An introduction to the SMS framework and its application in aviation operations" },
          { type: "divider" },
          { type: "heading", content: "The Four Pillars of SMS" },
          { type: "image", content: "/training/four-pillars.png", alt: "The Four Pillars of SMS", caption: "The four interdependent pillars that form the foundation of every Safety Management System" },
          { type: "text", content: "Every SMS is built on four interdependent pillars:\n\n1. Safety Policy (Subpart B, §5.21–§5.27) — Establishes management commitment, safety objectives, reporting policy, and the emergency response plan. This is the foundation that sets the tone for your entire safety culture.\n\n2. Safety Risk Management (Subpart C, §5.51–§5.57) — The processes for identifying hazards, analyzing and assessing risk, and implementing controls. SRM is applied whenever there are changes to systems, procedures, or operations.\n\n3. Safety Assurance (Subpart D, §5.71–§5.75) — Continuous monitoring of safety performance, evaluation of risk controls, and management of change. SA ensures that the controls you put in place actually work.\n\n4. Safety Promotion (Subpart E, §5.91–§5.93) — Training, education, and communication that build a positive safety culture. This course is part of your organization's Safety Promotion program." },
          { type: "callout", content: "Key Point: SMS is not a separate program bolted onto operations — it is integrated into how you plan, execute, and evaluate every aspect of your operation." },
          { type: "text", content: "The FAA designed Part 5 so that each pillar supports the others. Safety Policy sets the direction, SRM identifies and controls risk, Safety Assurance verifies effectiveness, and Safety Promotion ensures everyone has the knowledge and motivation to participate." },
          { type: "text", content: "Think of the four pillars like the legs of a table. Remove one and the table becomes unstable. An organization with excellent risk management but poor safety promotion will struggle because employees don't understand or trust the system. Conversely, an organization with great communication but weak risk management will talk about safety without actually controlling risk. All four pillars must work together." },
          { type: "text", content: "The evolution of SMS can be traced through several landmark events. The investigation of the 1996 ValuJet 592 crash in the Florida Everglades highlighted systemic failures in oversight and organizational safety management. The accident was not caused by a single error but by a chain of organizational failures — exactly the type of systemic risk that SMS is designed to address. Similarly, the investigation of Colgan Air 3407 in 2009 revealed deficiencies in fatigue management, training standards, and safety culture that led to sweeping regulatory changes including enhanced SMS requirements." },
          { type: "success", content: "By completing this course, you are actively participating in Pillar 4 (Safety Promotion) — building the competencies required by §5.91 to effectively participate in your organization's SMS." },
          { type: "video", content: "https://www.youtube.com/watch?v=5wQxNipilqI", caption: "FAA Safety Culture — Understanding the role of organizational culture in aviation safety" },
        ],
        quizQuestions: [
          { question: "How many pillars make up an SMS under 14 CFR Part 5?", options: ["Three", "Four", "Five", "Six"], correct: 1, explanation: "SMS is built on four pillars: Safety Policy, Safety Risk Management, Safety Assurance, and Safety Promotion (Subparts B through E of Part 5)." },
          { question: "Which SMS pillar covers hazard identification and risk analysis?", options: ["Safety Policy", "Safety Risk Management", "Safety Assurance", "Safety Promotion"], correct: 1, explanation: "Safety Risk Management (Subpart C, §5.51–§5.57) covers hazard identification, risk analysis, risk assessment, and risk control." },
          { question: "Under which subpart of 14 CFR Part 5 are training requirements defined?", options: ["Subpart B — Safety Policy", "Subpart C — Safety Risk Management", "Subpart D — Safety Assurance", "Subpart E — Safety Promotion"], correct: 3, explanation: "Safety Promotion (Subpart E, §5.91–§5.93) defines competency and training requirements as well as safety communication." },
          { question: "What best describes the relationship between the four pillars of SMS?", options: ["They operate independently of each other", "They are sequential — you complete one before starting the next", "They are interdependent — each pillar supports and reinforces the others", "Only Pillars 1 and 2 are mandatory; 3 and 4 are optional"], correct: 2, explanation: "The four pillars are interdependent. Safety Policy sets the direction, SRM identifies and controls risk, Safety Assurance verifies effectiveness, and Safety Promotion ensures everyone can participate. Removing any one pillar weakens the entire system." },
          { question: "Which landmark accident investigation highlighted systemic failures that SMS is specifically designed to address?", options: ["A single bird strike event", "ValuJet 592, which revealed organizational and oversight failures", "A routine maintenance delay", "A minor runway incursion with no damage"], correct: 1, explanation: "The ValuJet 592 investigation revealed systemic organizational failures — not a single error — that contributed to the accident. SMS frameworks are specifically designed to identify and manage these types of systemic risks before they result in accidents." },
        ],
      },
      {
        title: "Safety Policy & Your Responsibilities",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "The Safety Policy Framework" },
          { type: "text", content: "Under §5.21, your organization's safety policy must include:\n\n• Safety objectives — Measurable targets the organization commits to achieving\n• Management commitment — A formal declaration of commitment to SMS implementation\n• Provision of resources — Commitment to providing the personnel, training, and tools needed\n• Reporting policy — Requirements and protections for safety reporting\n• Unacceptable behavior policy — Clear definitions of where disciplinary boundaries lie\n• Emergency Response Plan — Coordination procedures for emergencies (§5.27)" },
          { type: "list", content: "Safety objectives must be measurable and achievable\nManagement commitment must be demonstrated through actions, not just words\nResources include personnel, budget, training, and tools like PreflightSMS\nReporting policy must define both requirements and protections\nUnacceptable behavior must be clearly defined so employees understand the boundaries\nThe ERP must be coordinated with interfacing organizations", ordered: false },
          { type: "text", content: "The safety policy is not a static document. It must be reviewed and updated at least annually by the Accountable Executive and whenever significant changes occur in the organization's operations, structure, or risk environment. The policy must be communicated to all employees and made readily accessible — posting it in crew rooms, maintenance hangars, and on digital platforms like PreflightSMS." },
          { type: "text", content: "Consider the safety policy as the constitution of your SMS. Just as a constitution establishes the fundamental principles and governance structure of a nation, the safety policy establishes the fundamental principles and governance structure of your safety management system. Every other SMS component — from risk assessments to training programs — derives its authority and direction from the safety policy." },
          { type: "divider" },
          { type: "heading", content: "Roles & Accountability (§5.23–§5.25)" },
          { type: "text", content: "Every person in the organization has a role in SMS:\n\n• Accountable Executive — Has ultimate accountability for SMS implementation and must ensure adequate resources, effective risk controls, and regular safety performance review (§5.25(a-b)).\n\n• Safety Manager — Designated to coordinate SMS across the organization, facilitate hazard identification and risk analysis, monitor risk controls, ensure safety promotion, and report to the AE (§5.25(c)).\n\n• All Employees — Accountable for following safety procedures, reporting hazards, completing required training, and supporting the safety culture (§5.23)." },
          { type: "callout", content: "Your responsibility: Know the safety policy, report hazards without fear of retaliation, complete required training, and follow established risk controls." },
          { type: "text", content: "The safety policy is not a document that sits on a shelf. It is the living framework that guides daily decisions. When you encounter a situation where the safe course of action is unclear, the safety policy provides the principles to guide your decision-making." },
          { type: "text", content: "A real-world example illustrates this well. In the years leading up to the Alaska Airlines 261 accident in January 2000, maintenance practices had gradually deviated from manufacturer specifications. The jackscrew assembly that ultimately failed had not been lubricated on the schedule required by the manufacturer. This case demonstrates what happens when an organization's actual practices drift away from its stated policies — a phenomenon known as 'practical drift' or 'normalization of deviance.' A robust safety policy with active monitoring (Safety Assurance) is designed to detect and correct this drift before it leads to catastrophe." },
          { type: "success", content: "Tip: Review your organization's safety policy at least once per year. If you notice that actual practices have drifted from the written policy, submit a safety report — this is exactly the kind of observation that prevents accidents." },
        ],
        quizQuestions: [
          { question: "According to §5.25(a), who has ultimate accountability for SMS implementation?", options: ["The Safety Manager", "The Chief Pilot", "The Accountable Executive", "The Director of Operations"], correct: 2, explanation: "Under §5.25(a), the Accountable Executive has ultimate responsibility for SMS implementation, resource allocation, and safety performance oversight." },
          { question: "Which of the following is NOT a required element of the safety policy under §5.21?", options: ["Safety objectives", "Reporting policy", "Fleet maintenance schedule", "Emergency Response Plan reference"], correct: 2, explanation: "§5.21 requires safety objectives, management commitment, resources, reporting policy, unacceptable behavior policy, and ERP reference. Fleet maintenance schedules, while important, are not a required element of the safety policy." },
          { question: "How often should the safety policy be reviewed at minimum?", options: ["Every five years", "Every two years", "At least annually by the Accountable Executive", "Only when the FAA requests it"], correct: 2, explanation: "The safety policy must be reviewed at least annually by the Accountable Executive and updated whenever significant changes occur in operations, structure, or the risk environment." },
          { question: "What is 'normalization of deviance' in the context of safety policy?", options: ["A formal process for updating procedures", "The gradual drift of actual practices away from written policies until unsafe becomes normal", "A statistical method for analyzing safety data", "The process of aligning multiple departments' policies"], correct: 1, explanation: "Normalization of deviance occurs when an organization's actual practices gradually drift from stated policies. Small deviations become accepted as normal over time, eroding safety margins — as tragically demonstrated in the Alaska Airlines 261 case." },
        ],
      },
      {
        title: "Safety Reporting & Just Culture",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "Why Safety Reporting Matters" },
          { type: "text", content: "Safety reporting is the lifeblood of an SMS. Without a steady flow of reports about hazards, near-misses, and operational concerns, the organization cannot identify risks before they result in accidents. Under §5.21(a)(4), your organization is required to establish a safety reporting policy that encourages open communication about safety issues." },
          { type: "text", content: "Research from the aviation industry consistently shows that for every accident, there are approximately 10 serious incidents, 30 minor incidents, and 600 near-misses. This ratio — often called Heinrich's Triangle or the Safety Pyramid — illustrates why near-miss and hazard reporting is so critical. If you can identify and address issues at the near-miss level, you prevent the incidents and accidents at the top of the pyramid." },
          { type: "text", content: "The investigation of Colgan Air 3407 (February 2009, Buffalo, NY) revealed that the captain had failed multiple check rides and the first officer had limited experience in icing conditions — factors that were known within the organization but never surfaced through the safety reporting system. This tragedy, which killed all 49 aboard and one person on the ground, became a catalyst for sweeping changes in crew training, fatigue management, and safety reporting requirements. Had a robust safety reporting culture existed, these risk factors might have been identified and addressed before the fatal flight." },
          { type: "divider" },
          { type: "heading", content: "Just Culture Principles" },
          { type: "text", content: "A Just Culture balances accountability with learning. The core principles are:\n\n• Honest mistakes and errors are treated as learning opportunities, not grounds for punishment\n• Reporting a safety concern — even one you caused — is always protected\n• Willful violations, gross negligence, and substance abuse are NOT protected and are subject to disciplinary action (§5.21(a)(5))\n• The goal is to understand WHY errors occur, not to assign blame\n\nThis means you should always report hazards, incidents, and near-misses. The organization cannot fix problems it doesn't know about." },
          { type: "image", content: "/training/swiss-cheese-model.png", alt: "James Reason's Swiss Cheese Model", caption: "Each layer of defense has holes — an accident occurs when the holes align across multiple layers" },
          { type: "text", content: "James Reason's Swiss Cheese Model illustrates why just culture matters. Accidents rarely result from a single error by a single person. Instead, they occur when multiple layers of defense each have weaknesses ('holes') that happen to align. By reporting errors and near-misses, you help the organization identify and patch those holes before they align catastrophically. Punishing honest errors discourages reporting, which means holes go unpatched — ultimately making the organization less safe, not more." },
          { type: "callout", content: "Remember: The only report that can hurt you is the one you don't file. Honest reporting is always protected under your organization's Just Culture policy." },
          { type: "heading", content: "What to Report" },
          { type: "list", content: "Hazards — Conditions or situations that could lead to an unsafe event\nNear-misses — Events that could have resulted in an accident but did not\nSafety concerns — Anything that makes you uncomfortable about the safety of an operation\nProcess deficiencies — Procedures that are unclear, outdated, or difficult to follow\nEquipment issues — Malfunctions, defects, or design concerns\nFatigue or fitness-for-duty concerns — Situations where crew fatigue may affect safety\nEnvironmental hazards — Weather, wildlife, runway conditions, or airspace issues", ordered: false },
          { type: "text", content: "Reports can be submitted through PreflightSMS at any time. Confidentiality protections per §5.71(a)(7) ensure your identity is protected when requested." },
          { type: "success", content: "Best practice: Submit safety reports as soon as possible after the event while details are fresh. Even a brief report is better than no report. You can always add supplemental information later." },
        ],
        quizQuestions: [
          { question: "Under a Just Culture policy, which situation would typically be protected from disciplinary action?", options: ["A pilot who reports a near-miss they were involved in", "A mechanic who intentionally signs off incomplete work", "An employee operating under the influence of alcohol", "A pilot who repeatedly ignores checklist procedures"], correct: 0, explanation: "Under Just Culture, honest mistakes and voluntary reports are protected. Willful violations, intentional negligence, and substance abuse are specifically excluded from protection per §5.21(a)(5)." },
          { question: "What does §5.21(a)(4) require regarding safety reporting?", options: ["Annual safety audits by outside agencies", "Mandatory drug testing for all employees", "A policy defining safety reporting requirements and protections", "GPS tracking of all company aircraft"], correct: 2, explanation: "§5.21(a)(4) requires the organization to establish a safety reporting policy that defines requirements for employees to report safety hazards and issues, along with protections for those who report." },
          { question: "Which of the following is the BEST reason to report a near-miss event?", options: ["To place blame on the responsible party", "To comply with insurance requirements", "To identify hazards before they cause an accident", "To create a paper trail for legal defense"], correct: 2, explanation: "The primary purpose of reporting near-misses is to identify hazards and contributing factors so that risk controls can be implemented before an accident occurs. This is the proactive foundation of SMS." },
          { question: "What does the Swiss Cheese Model illustrate about accident causation?", options: ["Accidents are always caused by a single catastrophic failure", "Accidents occur when weaknesses in multiple layers of defense align", "Cheese production facilities are hazardous", "Only mechanical failures cause accidents"], correct: 1, explanation: "James Reason's Swiss Cheese Model shows that accidents rarely result from a single failure. Instead, each layer of defense (procedures, training, equipment, oversight) has weaknesses ('holes'). An accident occurs when holes in multiple layers align, allowing a hazard to pass through all defenses." },
          { question: "What lesson from the Colgan Air 3407 investigation is most relevant to safety reporting?", options: ["Aircraft should not fly in icing conditions", "Known risk factors (failed check rides, limited experience) were not surfaced through safety reporting", "Regional airlines should not operate turboprops", "All flights to Buffalo should be cancelled in winter"], correct: 1, explanation: "The Colgan 3407 investigation revealed that significant risk factors — the captain's failed check rides and the first officer's limited icing experience — were known within the organization but never surfaced through safety reporting. A robust reporting culture might have identified and addressed these risks before the fatal flight." },
        ],
      },
      {
        title: "Accountable Executive Responsibilities",
        sortOrder: 3,
        contentBlocks: [
          { type: "heading", content: "The Accountable Executive Role (§5.25(a-b))" },
          { type: "text", content: "The Accountable Executive (AE) is the single person who bears ultimate accountability for SMS implementation. Under §5.25(a), the AE must have:\n\n• Control of the resources required for operations authorized under the certificate\n• Responsibility for the financial affairs of the organization\n• Final authority over operations conducted under the certificate\n\nThis is typically the CEO, President, or certificate holder. The AE cannot delegate this accountability — though specific tasks may be delegated, the accountability remains with the AE." },
          { type: "text", content: "The concept of a single accountable executive is one of the most important elements of SMS. In organizations without clear accountability, safety responsibilities can fall through the cracks — everyone assumes someone else is handling it. By designating one person with ultimate accountability, the SMS ensures there is always a clear answer to the question: 'Who is responsible for ensuring this organization operates safely?'" },
          { type: "text", content: "The AE role is not merely ceremonial. FAA inspectors conducting SMS assessments will interview the AE directly to verify active engagement with the safety management system. An AE who cannot describe current safety performance indicators, recent hazards, or open corrective actions signals an SMS that exists on paper but not in practice. The FAA's Safety Assurance System (SAS) specifically evaluates AE engagement as a key indicator of SMS effectiveness." },
          { type: "divider" },
          { type: "heading", content: "Five Core AE Responsibilities (§5.25(b))" },
          { type: "list", content: "Ensuring the SMS is properly implemented and performing in all areas of the organization\nEnsuring the SMS is implemented and functions as designed\nEnsuring the necessary resources for SMS are available\nEnsuring effective safety risk controls are in place\nRegularly reviewing the organization's safety performance", ordered: true },
          { type: "text", content: "These are not passive responsibilities. The AE must actively engage with the SMS — reviewing safety performance data, approving high-level risk acceptances, ensuring corrective actions are completed, and visibly demonstrating commitment to safety." },
          { type: "callout", content: "The AE's signature on the safety policy is not a formality. It represents personal accountability for every element of the SMS. FAA inspectors will verify that the AE is actively engaged, not just a figurehead." },
          { type: "text", content: "Practical AE engagement includes:\n\n• Quarterly review of safety performance indicators with the Safety Manager\n• Personal approval of any risk assessment rated as 'High'\n• Annual review and signing of the safety policy\n• Allocation of budget for safety training, reporting tools, and corrective actions\n• Attendance at safety meetings (at minimum, quarterly safety review boards)\n• Follow-up on overdue corrective actions and open hazards" },
          { type: "text", content: "A useful benchmark for AE engagement: the AE should be able to answer the following questions at any time without referring to notes: (1) What are the organization's top three safety risks right now? (2) How many open corrective actions are overdue? (3) What is the current trend in safety reporting volume? (4) When was the last safety review board meeting and what were the key outcomes? If the AE cannot answer these questions, the level of engagement is likely insufficient." },
          { type: "success", content: "For Accountable Executives: Schedule a recurring monthly 30-minute briefing with your Safety Manager. This single habit ensures you stay connected to SMS performance and demonstrates visible commitment to your entire organization." },
        ],
        quizQuestions: [
          { question: "Under §5.25(a), which attribute must the Accountable Executive possess?", options: ["An airline transport pilot certificate", "Control of operational resources and financial responsibility", "A degree in safety management", "At least 10 years of industry experience"], correct: 1, explanation: "§5.25(a) requires the AE to have control of the resources required for operations and responsibility for the organization's financial affairs. These ensure the AE has the authority and means to fund and support SMS implementation." },
          { question: "How many specific responsibilities does §5.25(b) assign to the Accountable Executive?", options: ["Three", "Five", "Seven", "Ten"], correct: 1, explanation: "§5.25(b) lists five specific responsibilities: (1) ensure SMS is properly implemented, (2) ensure SMS functions as designed, (3) ensure necessary resources, (4) ensure effective risk controls, and (5) regularly review safety performance." },
          { question: "Can the Accountable Executive delegate their SMS accountability to the Safety Manager?", options: ["Yes, through a formal letter of delegation", "Yes, if the Safety Manager agrees", "No — accountability remains with the AE even if tasks are delegated", "Only during the AE's absence"], correct: 2, explanation: "The AE can delegate specific SMS tasks but cannot delegate the accountability itself. This is a fundamental principle of §5.25 — one person must be ultimately accountable for SMS performance." },
          { question: "What will FAA inspectors look for when evaluating AE engagement during an SMS assessment?", options: ["The AE's pilot certificates and ratings", "Whether the AE can describe current safety performance, recent hazards, and open corrective actions", "The AE's academic credentials in safety management", "Whether the AE personally conducts all safety audits"], correct: 1, explanation: "FAA inspectors will interview the AE directly to verify active engagement. An AE who cannot describe current safety performance indicators, recent hazards, or open corrective actions signals an SMS that exists on paper but not in practice." },
        ],
      },
      {
        title: "Safety Manager & Management Personnel Duties",
        sortOrder: 4,
        contentBlocks: [
          { type: "heading", content: "Designated Management Personnel (§5.25(c))" },
          { type: "text", content: "Under §5.25(c), the certificate holder must designate management personnel who, on behalf of the Accountable Executive, are responsible for:\n\n1. Coordinating the SMS throughout the organization\n2. Facilitating hazard identification and safety risk analysis\n3. Monitoring the effectiveness of safety risk controls\n4. Ensuring safety promotion activities are carried out\n5. Regularly reporting to the Accountable Executive on SMS performance\n\nThe Safety Manager typically fulfills most of these functions, but they may be distributed among multiple management positions depending on organizational size." },
          { type: "text", content: "In smaller Part 135 operations, the Safety Manager role may be combined with other management positions — for example, the Chief Pilot may also serve as the Safety Manager. While this is permitted, it creates inherent conflicts of interest (the person responsible for operational efficiency is also responsible for safety oversight). Organizations in this situation should implement additional safeguards, such as having an independent safety committee or external safety consultant provide periodic oversight." },
          { type: "divider" },
          { type: "heading", content: "Day-to-Day Safety Manager Functions" },
          { type: "list", content: "Monitoring incoming safety reports and triaging by severity\nMaintaining the hazard register and ensuring timely risk assessments\nTracking corrective action completion and verifying effectiveness\nPreparing safety performance data for management review\nCoordinating training requirements and tracking compliance\nManaging the safety reporting system (PreflightSMS)\nServing as the primary point of contact for safety-related inquiries\nCoordinating with the FAA and other regulatory bodies on safety matters\nFacilitating safety meetings and documenting outcomes\nEnsuring all SMS documentation is current and accessible", ordered: false },
          { type: "callout", content: "The Safety Manager is the engine of the SMS. While the AE provides direction and resources, the Safety Manager ensures the system runs day-to-day. Without active engagement from this role, the SMS becomes a paper program." },
          { type: "text", content: "The Chief Pilot often shares SMS management responsibilities, particularly regarding:\n\n• Operational risk decisions (FRAT review, flight approval)\n• Pilot training and competency evaluation\n• Standard operating procedure development and updates\n• Line safety audits and operational observations\n• Crew resource management program oversight" },
          { type: "text", content: "Effective Safety Managers develop a daily rhythm: start each day by reviewing overnight safety reports, check for overdue corrective actions, review upcoming training due dates, and scan industry safety bulletins (FAA InFOs, SAFOs, and ASRS alerts). Weekly, prepare a brief safety status summary for operations leadership. Monthly, compile a more comprehensive safety performance report. This disciplined approach ensures nothing falls through the cracks and demonstrates active SMS management during FAA surveillance." },
          { type: "success", content: "For Safety Managers: Create a daily checklist in PreflightSMS that includes reviewing new safety reports, checking overdue corrective actions, and verifying training compliance. Consistency in these daily tasks is the foundation of an effective SMS." },
        ],
        quizQuestions: [
          { question: "Under §5.25(c), how many specific functions must designated management personnel fulfill?", options: ["Three", "Five", "Seven", "Nine"], correct: 1, explanation: "§5.25(c) lists five specific functions: coordinate SMS, facilitate hazard identification and risk analysis, monitor risk control effectiveness, ensure safety promotion, and report to the AE on SMS performance." },
          { question: "What is the Safety Manager's role regarding the hazard register?", options: ["They only review it annually", "They maintain it and ensure timely risk assessments are completed", "They delegate it entirely to line employees", "They only use it during FAA audits"], correct: 1, explanation: "The Safety Manager actively maintains the hazard register as a core daily responsibility — ensuring new hazards are logged, risk assessments are completed in a timely manner, and controls are tracked through to implementation and verification." },
          { question: "In a small Part 135 operation where the Chief Pilot also serves as Safety Manager, what additional safeguard is recommended?", options: ["No additional safeguards are needed", "The operation should cease until a separate Safety Manager is hired", "An independent safety committee or external consultant should provide periodic oversight", "The FAA must approve the dual role in writing"], correct: 2, explanation: "When one person holds both the Chief Pilot and Safety Manager roles, conflicts of interest can arise between operational efficiency and safety oversight. An independent safety committee or external consultant provides the additional layer of oversight needed to mitigate this conflict." },
          { question: "What should a Safety Manager do FIRST each working day?", options: ["Prepare the annual SMS report", "Review overnight safety reports and check for overdue corrective actions", "Conduct a full audit of all departments", "Update the organization's safety policy"], correct: 1, explanation: "The recommended daily rhythm for Safety Managers starts with reviewing overnight safety reports and checking for overdue corrective actions. This ensures emerging safety issues are identified and addressed promptly." },
        ],
      },
    ],
  },
  {
    title: "Pillar 2: Safety Risk Management",
    description: "In-depth training on the Safety Risk Management process under 14 CFR Part 5 Subpart C (§5.51–§5.55). Covers systematic hazard identification through multiple data sources, system and task analysis methods, risk assessment using standardized 5×5 likelihood/severity matrices, risk control development following the hierarchy of controls, and residual risk evaluation. Includes practical application of risk management tools such as bowtie analysis, the Swiss Cheese Model, and real-world aviation case studies demonstrating how SRM prevents accidents.",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 45,
    lessons: [
      {
        title: "Understanding Hazards, Threats & Risk",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "Definitions That Matter" },
          { type: "text", content: "Before you can manage risk, you need to speak the same language:\n\n• Hazard — A condition that could foreseeably cause or contribute to an aircraft accident (§5.5). Examples: icing conditions, fatigue, unstable approach, runway contamination.\n\n• Threat — A broader term for any event or error that could compromise safety during operations. Not all threats become hazards, but unmanaged threats often do.\n\n• Risk — The composite of predicted severity and likelihood of the potential effect of a hazard (§5.5). Risk is not the hazard itself — it is the measure of what could happen if the hazard is not controlled." },
          { type: "text", content: "Understanding these distinctions is critical because they determine how you respond. A hazard exists as a condition — it requires identification and assessment. Risk is the measure of that hazard's potential impact — it requires evaluation and control. Confusing the two leads to either overreaction (treating every hazard as a crisis) or underreaction (ignoring hazards because 'nothing has happened yet')." },
          { type: "text", content: "Consider a practical example: a contaminated runway is a hazard. The risk depends on multiple factors — the type of contamination (water, snow, ice, rubber), the depth, the aircraft type, the wind conditions, and the crew's training and experience with contaminated runway operations. The same hazard can present very different levels of risk depending on the circumstances. This is why risk assessment requires evaluating both likelihood and severity in context, not just checking a box." },
          { type: "divider" },
          { type: "heading", content: "Where Hazards Come From (§5.53)" },
          { type: "text", content: "Under §5.53, hazards are identified through:\n\n• Safety reporting by employees — The most common and valuable source\n• Analysis of flight data (FRAT scores, flight data monitoring)\n• Audit and inspection findings\n• Investigation of incidents and accidents\n• Industry safety data and regulatory information\n• Changes to equipment, procedures, or organizational structure\n• Management observations during line checks and ramp visits" },
          { type: "list", content: "Reactive sources: incident reports, accident investigations, enforcement actions\nProactive sources: FRATs, safety surveys, audits, management observations\nPredictive sources: flight data monitoring trends, statistical analysis, industry data\nConfidential sources: anonymous safety reports, ASRS-style reporting", ordered: false },
          { type: "callout", content: "A hazard is not the same as risk. Ice on a wing is a hazard. The risk is the probability and severity of loss of control that could result if the ice is not removed." },
          { type: "text", content: "Effective hazard identification requires both reactive sources (incident reports, accident data) and proactive sources (FRATs, safety surveys, audits). The SMS emphasizes proactive identification — finding hazards before they cause events." },
          { type: "text", content: "The most mature SMS organizations also use predictive methods — analyzing trends in flight data, FRAT scores, and maintenance records to predict where the next safety event is most likely to occur. For example, if FRAT data shows a steady increase in risk scores for night operations during winter months, the organization can proactively implement additional controls (enhanced crew training, increased weather minimums, mandatory second-in-command) before an incident occurs." },
          { type: "video", content: "https://www.youtube.com/watch?v=pR6PPKZ1bTo", caption: "FAA Risk Management — Understanding the fundamentals of aviation risk management" },
        ],
        quizQuestions: [
          { question: "According to §5.5, what is the definition of 'risk' in an SMS context?", options: ["Any condition that could cause an accident", "The composite of predicted severity and likelihood of a hazard's potential effect", "The probability of a mechanical failure", "The financial cost of an accident"], correct: 1, explanation: "Per §5.5, risk is defined as the composite of predicted severity and likelihood of the potential effect of a hazard. It requires evaluating both dimensions." },
          { question: "Which of the following is an example of PROACTIVE hazard identification?", options: ["Investigating an accident after it occurs", "Reviewing an NTSB final report", "Analyzing FRAT scores to identify risk trends", "Responding to an FAA enforcement action"], correct: 2, explanation: "Proactive hazard identification means finding hazards before incidents occur. Analyzing FRAT data trends is proactive because it identifies patterns that could lead to events, rather than reacting to events that already happened." },
          { question: "What is the key difference between a hazard and a risk?", options: ["There is no difference — the terms are interchangeable", "A hazard is a condition; risk is the measure of its potential impact", "A risk is always more dangerous than a hazard", "Hazards only apply to maintenance; risks only apply to flight operations"], correct: 1, explanation: "A hazard is a condition that could cause harm. Risk is the composite measure of likelihood and severity of that hazard's potential effect. The same hazard can present different levels of risk depending on circumstances and controls in place." },
          { question: "Which type of hazard identification is considered the most mature in an SMS?", options: ["Reactive — learning from accidents after they occur", "Proactive — finding hazards through audits and surveys", "Predictive — using data trends to forecast where events are most likely", "Compliance-based — only identifying what regulators require"], correct: 2, explanation: "Predictive hazard identification represents the highest level of SMS maturity. By analyzing trends in data (FRAT scores, flight data, maintenance records), organizations can forecast and prevent safety events rather than merely reacting to them." },
          { question: "A contaminated runway is best described as:", options: ["A risk", "A hazard", "A threat and a risk", "An incident"], correct: 1, explanation: "A contaminated runway is a hazard — a condition that could foreseeably contribute to an accident. The risk is the assessed likelihood and severity of an adverse outcome (such as a runway excursion) that could result from operating on that contaminated runway." },
        ],
      },
      {
        title: "The Risk Matrix — Likelihood & Severity",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "Risk Assessment Under §5.55(a-b)" },
          { type: "text", content: "Once a hazard is identified, §5.55 requires the organization to assess the risk by evaluating two dimensions:\n\n1. Likelihood — How probable is it that the hazard will result in an adverse event?\n2. Severity — If the event occurs, how bad will the consequences be?" },
          { type: "text", content: "Risk assessment is not a purely mathematical exercise. While the matrix provides a structured framework, the assessment requires expert judgment informed by experience, data, and context. Two qualified assessors might rate the same hazard differently based on their understanding of the operational context. This is normal and expected — the value of the assessment process lies as much in the structured discussion it generates as in the final number." },
          { type: "divider" },
          { type: "heading", content: "Likelihood Scale" },
          { type: "list", content: "5 — Frequent: Expected to occur routinely during operations\n4 — Probable: Will occur several times over a period\n3 — Remote: Unlikely but possible; may occur at some point\n2 — Extremely Remote: Very unlikely; not expected but conceivable\n1 — Extremely Improbable: Almost inconceivable that the event will occur", ordered: false },
          { type: "heading", content: "Severity Scale" },
          { type: "list", content: "A — Catastrophic: Multiple fatalities, hull loss\nB — Hazardous: Serious injury, major aircraft damage, large reduction in safety margins\nC — Major: Significant injury, significant reduction in safety margins, crew workload increase\nD — Minor: Slight injury, minor aircraft damage, slight increase in workload\nE — Negligible: Little or no impact on safety", ordered: false },
          { type: "image", content: "/training/risk-matrix-5x5.png", alt: "5x5 Risk Assessment Matrix", caption: "The standard 5×5 risk matrix used for SMS risk assessment — likelihood (rows) vs severity (columns)" },
          { type: "text", content: "The risk matrix combines likelihood and severity to produce a risk level. A standard 5×5 matrix produces four risk categories:\n\n• HIGH (Red) — Unacceptable risk. Operations must be stopped or significantly modified. Only the Accountable Executive can accept this level of risk, and only when no other option exists.\n\n• SERIOUS (Orange) — Risk requires senior management review and approval. Additional controls must be implemented to reduce risk before operations continue.\n\n• MEDIUM (Yellow) — Acceptable with management review and monitoring. Controls should be considered to further reduce risk.\n\n• LOW (Green) — Acceptable risk. Normal operations continue with routine monitoring." },
          { type: "callout", content: "The risk matrix combines likelihood and severity to produce a risk level (High, Serious, Medium, Low). Only the Accountable Executive or designated authority can accept High-level risks." },
          { type: "text", content: "When conducting risk assessments, always assess the risk both before controls (inherent risk) and after controls (residual risk). This gives you a clear picture of how much risk reduction your controls are actually providing. If the residual risk after controls is still unacceptable, additional controls are needed — or the operation should not proceed." },
        ],
        quizQuestions: [
          { question: "What two dimensions are evaluated when assessing risk under §5.55?", options: ["Cost and schedule impact", "Likelihood and severity", "Frequency and duration", "Probability and detectability"], correct: 1, explanation: "§5.55(a-b) requires assessing risk as a combination of the likelihood of a hazard's effect occurring and the severity of that effect. These two dimensions form the risk matrix." },
          { question: "On a standard severity scale, which level represents 'serious injury or major aircraft damage'?", options: ["Catastrophic", "Hazardous", "Major", "Minor"], correct: 1, explanation: "The Hazardous severity level (B) represents serious injury to persons, major aircraft damage, or a large reduction in safety margins. Catastrophic (A) involves fatalities or hull loss." },
          { question: "Who typically has authority to accept a High-level risk assessment?", options: ["Any line pilot", "The maintenance supervisor", "The Accountable Executive or designated authority", "The dispatcher on duty"], correct: 2, explanation: "High-level risks require acceptance by the Accountable Executive or a specifically designated authority. This ensures that significant risk acceptance decisions are made at the appropriate organizational level." },
          { question: "What is the difference between 'inherent risk' and 'residual risk'?", options: ["There is no difference", "Inherent risk is the risk before controls; residual risk is what remains after controls", "Residual risk is always higher than inherent risk", "Inherent risk only applies to maintenance operations"], correct: 1, explanation: "Inherent risk is assessed before any controls are applied — it represents the raw risk level of the hazard. Residual risk is what remains after controls are implemented. Both should be assessed to understand how much risk reduction the controls actually provide." },
          { question: "A hazard assessed as Likelihood 4 (Probable) and Severity B (Hazardous) would typically result in what risk level?", options: ["Low", "Medium", "Serious or High", "Cannot be determined without more information"], correct: 2, explanation: "A Probable likelihood combined with Hazardous severity represents a significant risk that would typically fall in the Serious or High category on a standard 5×5 risk matrix. This would require senior management or Accountable Executive review." },
        ],
      },
      {
        title: "Risk Controls & Mitigation",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "Designing Risk Controls (§5.55(c))" },
          { type: "text", content: "Once risk is assessed, §5.55(c) requires the organization to develop risk controls that reduce the risk to an acceptable level. Risk controls follow a hierarchy of effectiveness:\n\n1. Elimination — Remove the hazard entirely (most effective, often not practical)\n2. Substitution — Replace with something less hazardous\n3. Engineering controls — Physical changes to equipment or environment\n4. Administrative controls — Procedures, policies, training, checklists\n5. Personal protective equipment — Last resort (least effective)" },
          { type: "text", content: "In aviation, we rely heavily on administrative controls (procedures, checklists, training) because many hazards cannot be eliminated or engineered away. Weather cannot be eliminated. Gravity cannot be substituted. This means our administrative controls must be exceptionally well-designed, clearly communicated, and consistently followed. The quality of our procedures and training is literally a matter of life and death." },
          { type: "image", content: "/training/bowtie-analysis.png", alt: "Bowtie Risk Analysis Diagram", caption: "Bowtie analysis maps threats (left), the top event (center), consequences (right), and the barriers that prevent escalation" },
          { type: "text", content: "Bowtie analysis is a powerful tool for visualizing risk controls. The center of the bowtie is the 'top event' — the unwanted occurrence (e.g., runway excursion). On the left side are the threats that could cause the event, with preventive barriers between threats and the event. On the right side are the potential consequences, with recovery barriers between the event and consequences. This visual representation helps identify gaps in your defenses and ensures controls address both prevention and mitigation." },
          { type: "divider" },
          { type: "heading", content: "Evaluating Control Effectiveness (§5.55(d))" },
          { type: "text", content: "Before implementing a risk control, §5.55(d) requires you to assess whether the proposed control will actually work. Consider:\n\n• Does the control address the root cause of the hazard, or just a symptom?\n• Could the control introduce new hazards?\n• Is the control practical and sustainable in daily operations?\n• How will you verify the control is working after implementation?\n• What residual risk remains after the control is in place?" },
          { type: "callout", content: "A risk control that looks good on paper but is routinely ignored in practice provides no actual risk reduction. Effective controls must be practical, understood, and followed." },
          { type: "text", content: "Common risk controls in aviation operations include:\n\n• Weather minimums above regulatory requirements\n• Crew pairing policies (experience matching)\n• Additional training requirements for specific operations\n• Enhanced preflight procedures for known risk areas\n• FRAT score thresholds requiring management review\n• Standard operating procedures for high-risk phases of flight\n\nRemember: The goal is to reduce risk to an acceptable level, not to eliminate all risk. Aviation inherently involves some level of risk." },
          { type: "text", content: "The Alaska Airlines 261 accident provides a sobering case study in risk control failure. The operator had maintenance procedures (administrative controls) requiring lubrication of the horizontal stabilizer jackscrew assembly at specified intervals. Over time, these intervals were extended, and the quality of the maintenance performed was not adequately verified. The risk controls existed on paper but were not effectively implemented or monitored — a failure that Safety Assurance (Pillar 3) is specifically designed to prevent." },
          { type: "success", content: "When designing risk controls, ask yourself: 'Will a tired crew member at 3 AM actually follow this procedure?' If the answer is uncertain, the control needs to be simplified, automated, or reinforced with additional barriers." },
        ],
        quizQuestions: [
          { question: "What does §5.55(c) require when risk is assessed as unacceptable?", options: ["Cancel all operations until the hazard is eliminated", "Develop risk controls to reduce risk to an acceptable level", "File a report with the FAA", "Transfer the risk to insurance"], correct: 1, explanation: "§5.55(c) requires the organization to design and implement risk controls that reduce the safety risk of a hazard to an acceptable level. Complete elimination is often not practical in aviation." },
          { question: "In the hierarchy of risk controls, which type is generally MOST effective?", options: ["Administrative controls (procedures, training)", "Elimination of the hazard", "Personal protective equipment", "Engineering controls"], correct: 1, explanation: "Elimination — completely removing the hazard — is the most effective control because the risk no longer exists. However, it is often not practical in aviation, so a combination of engineering and administrative controls is typically used." },
          { question: "What does bowtie analysis help visualize?", options: ["Financial costs of accidents", "The relationship between threats, the top event, consequences, and barriers", "Employee performance ratings", "Aircraft maintenance schedules"], correct: 1, explanation: "Bowtie analysis maps threats on the left, the top event (unwanted occurrence) in the center, and consequences on the right. Preventive barriers sit between threats and the event, while recovery barriers sit between the event and consequences. This visualization helps identify gaps in defenses." },
          { question: "Why do aviation organizations rely heavily on administrative controls?", options: ["They are the cheapest option", "Many aviation hazards cannot be eliminated or engineered away", "Regulators only accept administrative controls", "Engineering controls are prohibited in aviation"], correct: 1, explanation: "Aviation relies heavily on administrative controls (procedures, checklists, training) because many fundamental hazards — weather, gravity, human factors — cannot be eliminated or engineered away. This makes the quality of procedures and training critically important." },
          { question: "What key lesson does the Alaska Airlines 261 case provide about risk controls?", options: ["Engineering controls always prevent accidents", "Risk controls that exist on paper but are not effectively implemented provide no actual protection", "Maintenance is never a safety issue", "Administrative controls are always sufficient"], correct: 1, explanation: "Alaska 261 demonstrated that risk controls must be effectively implemented and monitored, not just documented. Maintenance procedures existed but were not followed or verified — highlighting the critical role of Safety Assurance in ensuring controls actually work." },
        ],
      },
    ],
  },
  {
    title: "Pillar 3: Safety Assurance",
    description: "Detailed training on Safety Assurance processes under 14 CFR Part 5 Subpart D (§5.71–§5.75). Covers continuous safety performance monitoring using Safety Performance Indicators (SPIs), multi-source data collection and trend analysis, safety performance assessment against organizational objectives, the continuous improvement cycle, corrective action development and verification, and management of change. Includes guidance on building effective safety review boards and leveraging data analytics for proactive safety management.",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 45,
    lessons: [
      {
        title: "Safety Performance Monitoring",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "Why Monitor Safety Performance? (§5.71)" },
          { type: "text", content: "Safety Risk Management identifies hazards and puts controls in place. Safety Assurance answers the critical follow-up question: Are those controls actually working?\n\nUnder §5.71(a), the organization must monitor its operations, products, and services to:\n\n1. Verify risk controls are effective (§5.71(a)(1))\n2. Acquire safety data to identify new hazards (§5.71(a)(2))\n3. Identify previously unrecognized safety deviations (§5.71(a)(3))\n4. Assess the organization's safety performance overall" },
          { type: "text", content: "Without Safety Assurance, an SMS is incomplete. You can identify every hazard and design perfect risk controls, but if you never check whether those controls are actually working in practice, you have no assurance of safety — only an assumption of safety. The history of aviation accidents is filled with cases where controls existed on paper but failed in practice." },
          { type: "text", content: "Consider the analogy of a smoke detector. Installing a smoke detector (a risk control) is essential. But if you never test the batteries (safety assurance), you cannot be confident the detector will work when you need it. Safety Assurance is the process of 'testing the batteries' on all of your risk controls, continuously and systematically." },
          { type: "divider" },
          { type: "heading", content: "Key Safety Performance Indicators" },
          { type: "text", content: "Safety Performance Indicators (SPIs) are measurable data points that tell you how your SMS is performing. Common SPIs include:\n\n• Number of safety reports submitted per month\n• FRAT completion rate for flights\n• Average FRAT risk scores and trends\n• Hazard closure time (days from identification to mitigation)\n• Training completion rates and currency status\n• Overdue corrective action items\n• Incident and event rates per flight hours\n\nYour Accountable Executive reviews these metrics regularly to ensure the organization is meeting its safety objectives." },
          { type: "list", content: "Leading indicators (predictive): FRAT scores, training completion rates, report volume, audit findings\nLagging indicators (reactive): incident rates, accident rates, enforcement actions, insurance claims\nBoth types are needed — leading indicators warn of future problems, lagging indicators confirm past performance", ordered: false },
          { type: "callout", content: "Safety monitoring is not about catching people doing things wrong — it is about detecting trends and weaknesses in the system before they lead to incidents." },
          { type: "text", content: "The PreflightSMS dashboard and FAA Audit Log provide real-time visibility into these performance indicators, making it easy for safety managers and the AE to identify emerging risks and track improvement actions." },
          { type: "text", content: "Safety Performance Targets (SPTs) should be established for each SPI. For example, your organization might set an SPT of 'at least 10 safety reports per month' to ensure the reporting culture remains healthy, or 'all corrective actions closed within 30 days' to ensure timely risk mitigation. When actual performance deviates from these targets, it triggers investigation and corrective action under the continuous improvement process (§5.75)." },
          { type: "success", content: "Tip: Focus on leading indicators, not just lagging indicators. A decrease in safety report volume is often a leading indicator of declining safety culture — it means people have stopped reporting, not that hazards have disappeared." },
        ],
        quizQuestions: [
          { question: "What is the primary purpose of safety performance monitoring under §5.71?", options: ["To discipline employees who make errors", "To verify that risk controls are effective and identify new hazards", "To prepare marketing materials about safety", "To satisfy insurance company requirements"], correct: 1, explanation: "§5.71(a) requires monitoring to verify risk control effectiveness (§5.71(a)(1)), acquire safety data (§5.71(a)(2)), and identify previously unrecognized deviations (§5.71(a)(3)). It is about system-level insight, not individual punishment." },
          { question: "Which of the following is a valid Safety Performance Indicator (SPI)?", options: ["Company revenue per quarter", "Number of safety reports submitted per month", "Employee satisfaction survey score", "Number of new customers acquired"], correct: 1, explanation: "Safety reports per month is a direct indicator of safety culture health and SMS activity. Revenue and customer metrics, while important for business, are not safety performance indicators." },
          { question: "What is the difference between leading and lagging safety indicators?", options: ["There is no meaningful difference", "Leading indicators predict future problems; lagging indicators measure past events", "Lagging indicators are more important than leading indicators", "Leading indicators only apply to maintenance"], correct: 1, explanation: "Leading indicators (like FRAT scores and report volume) are predictive — they warn of potential future problems. Lagging indicators (like incident rates) are reactive — they measure events that have already occurred. Both are needed for comprehensive safety monitoring." },
          { question: "A sudden decrease in safety report volume most likely indicates:", options: ["Safety has improved and there is nothing to report", "The reporting system is working perfectly", "A declining safety culture where people have stopped reporting", "The organization has eliminated all hazards"], correct: 2, explanation: "A decrease in safety report volume is typically a warning sign of declining safety culture, not improved safety. Hazards exist in every operation — when reporting drops, it usually means people have stopped reporting, not that hazards have disappeared." },
          { question: "What should happen when actual safety performance deviates from Safety Performance Targets?", options: ["Nothing — targets are aspirational only", "Investigation and corrective action under the continuous improvement process (§5.75)", "Immediately ground all aircraft", "Change the targets to match actual performance"], correct: 1, explanation: "When performance deviates from targets, the continuous improvement process (§5.75) is triggered — investigate why the deviation occurred, identify root causes, develop corrective actions, and verify their effectiveness." },
        ],
      },
      {
        title: "Data Collection & Analysis",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "Safety Data Sources (§5.71(a)(2))" },
          { type: "text", content: "Effective safety assurance depends on collecting data from multiple sources. Under §5.71(a)(2), your organization should gather:\n\n• Safety reports from employees (hazard reports, incident reports, near-miss reports)\n• FRAT assessments for each flight\n• Flight data monitoring records (if available)\n• Maintenance discrepancy reports and squawk sheets\n• Training records and currency data\n• Audit and inspection findings\n• External data: ASRS reports, NTSB recommendations, FAA InFO/SAFO bulletins, industry safety data" },
          { type: "text", content: "No single data source tells the complete story. Internal reports capture what employees observe and experience. FRAT data provides a systematic pre-flight risk snapshot. Flight data monitoring reveals what actually happened during operations. External data provides industry-wide context and emerging risk information. The power of Safety Assurance comes from synthesizing all of these sources into a comprehensive picture of organizational safety." },
          { type: "text", content: "Data quality matters as much as data quantity. A safety reporting system that collects hundreds of vague, one-line reports is less valuable than one that collects fewer but detailed, actionable reports. Encourage reporters to include specific details: what happened, where, when, who was involved, what conditions existed, and what they think contributed to the event. PreflightSMS prompts reporters for this information, improving data quality at the point of collection." },
          { type: "divider" },
          { type: "heading", content: "Turning Data Into Insight" },
          { type: "text", content: "Raw data is only useful when analyzed for patterns and trends. Effective analysis involves:\n\n• Trend identification — Are FRAT scores increasing over time? Are certain risk factors appearing more frequently?\n• Root cause analysis — When incidents occur, what underlying system factors contributed?\n• Comparative analysis — How do this month's safety metrics compare to previous months or the same month last year?\n• Correlation analysis — Are high FRAT scores correlated with specific routes, weather patterns, or crew pairings?\n\nSafety data should be treated as confidential and used for system improvement, not for punitive purposes (§5.71(a)(7))." },
          { type: "callout", content: "§5.71(a)(7) requires confidentiality protections for safety data. Safety data collected under the SMS must not be used for enforcement or disciplinary purposes except in cases of willful misconduct." },
          { type: "text", content: "The safety manager should present data analysis results to the safety review board (or equivalent) on a regular basis. Trends that indicate declining safety performance should trigger an immediate review and potential activation of SRM processes." },
          { type: "text", content: "Modern safety data analysis is evolving rapidly. While traditional SMS relies on manual review of reports and spreadsheet-based trend tracking, advanced programs incorporate statistical process control, predictive analytics, and even machine learning to identify subtle patterns in large datasets. Regardless of the tools used, the fundamental principle remains the same: collect data from multiple sources, analyze it for patterns, and act on what you find." },
          { type: "success", content: "When writing safety reports, include the 'Five W's': What happened, Where it happened, When it happened, Who was involved, and Why you think it happened. This dramatically improves the analytical value of your report." },
        ],
        quizQuestions: [
          { question: "What does §5.71(a)(7) require regarding safety data?", options: ["All data must be shared publicly", "Confidentiality protections must be in place", "Data must be deleted after 90 days", "Only the FAA can access safety data"], correct: 1, explanation: "§5.71(a)(7) requires appropriate confidentiality protections for safety data. This ensures that employees continue to report honestly without fear that data will be used against them." },
          { question: "Which analysis method identifies whether FRAT scores are changing over time?", options: ["Root cause analysis", "Comparative analysis", "Trend analysis", "Compliance audit"], correct: 2, explanation: "Trend analysis tracks how a metric changes over time, making it ideal for identifying whether FRAT risk scores are increasing or decreasing. This helps detect emerging risks before they result in events." },
          { question: "Why is data quality as important as data quantity in safety reporting?", options: ["Regulators count the number of reports as a compliance metric", "Detailed, actionable reports enable better analysis than vague, one-line submissions", "Quality reports take less storage space", "There is no practical difference"], correct: 1, explanation: "Data quality directly affects analytical value. Detailed reports with specific information about what happened, conditions, and contributing factors enable meaningful trend analysis and root cause identification. Vague reports provide limited analytical value regardless of volume." },
          { question: "What should trigger an immediate review and potential SRM activation?", options: ["A single low-risk safety report", "Trends indicating declining safety performance", "A routine quarterly review date", "An employee requesting time off"], correct: 1, explanation: "Trends indicating declining safety performance should trigger immediate review and potential activation of SRM processes. The continuous monitoring under Safety Assurance is specifically designed to detect these trends so the organization can respond proactively." },
        ],
      },
      {
        title: "Continuous Improvement & Corrective Action",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "Safety Performance Assessment (§5.73)" },
          { type: "text", content: "Under §5.73, the organization must conduct periodic assessments of its safety performance. This typically involves:\n\n• Quarterly safety performance reviews with the safety review board\n• Annual comprehensive assessments presented to the Accountable Executive\n• Ad-hoc assessments triggered by significant events or trend alerts\n\nAssessments should compare actual performance against the safety objectives defined in the safety policy (§5.21). Where performance falls short, corrective action is required." },
          { type: "text", content: "Safety performance assessment is the bridge between monitoring (§5.71) and improvement (§5.75). Monitoring tells you what is happening. Assessment tells you whether what is happening is acceptable. Improvement fixes what is not acceptable. Without all three steps, the assurance cycle is incomplete." },
          { type: "divider" },
          { type: "heading", content: "Continuous Improvement (§5.75)" },
          { type: "text", content: "§5.75 requires the organization to establish and maintain a process for correcting safety performance deficiencies. This means:\n\n1. Identify deficiency — Through monitoring (§5.71) or assessment (§5.73)\n2. Determine root cause — Why did the deficiency occur? What systemic factors contributed?\n3. Develop corrective action — Specific, measurable actions with assigned owners and deadlines\n4. Implement the action — Execute the plan\n5. Verify effectiveness — Follow up to confirm the action resolved the deficiency\n6. Document everything — Maintain records for audit purposes" },
          { type: "list", content: "Identify the deficiency through monitoring or assessment\nDetermine root cause using structured analysis methods\nDevelop SMART corrective actions (Specific, Measurable, Achievable, Relevant, Time-bound)\nAssign clear owners and realistic deadlines\nImplement the corrective action\nVerify effectiveness through follow-up monitoring\nDocument the entire process for audit purposes", ordered: true },
          { type: "callout", content: "Continuous improvement is not optional — §5.75 requires your organization to actively correct safety performance deficiencies and evaluate the effectiveness of those corrections." },
          { type: "text", content: "Corrective actions should follow the SMART framework: Specific, Measurable, Achievable, Relevant, and Time-bound. Vague actions like 'improve safety culture' are not effective. Instead, a corrective action should be specific: 'Implement mandatory FRAT briefing for all flights departing after 2200L by March 1, measured by FRAT completion rate during night operations.'" },
          { type: "text", content: "Root cause analysis is a critical skill that separates effective corrective actions from superficial ones. When investigating a deficiency, ask 'Why?' at least five times to drill down from symptoms to root causes. For example: Why did the incident occur? Because the crew missed a checklist item. Why did they miss it? Because they were interrupted. Why were they interrupted? Because dispatch called during the preflight. Why did dispatch call during preflight? Because there was no protected time policy for critical phases. The root cause — lack of a protected time policy — is far more actionable than the symptom — a missed checklist item." },
          { type: "success", content: "Use the '5 Whys' technique when developing corrective actions. Each 'Why?' peels back a layer from the surface symptom to reveal deeper systemic causes. The corrective action should address the deepest 'Why' you can identify." },
        ],
        quizQuestions: [
          { question: "What does §5.75 require regarding safety performance deficiencies?", options: ["They must be reported to the FAA within 24 hours", "A process must exist to correct deficiencies and evaluate corrections", "They must be addressed only during annual reviews", "They are acceptable as long as no accidents occur"], correct: 1, explanation: "§5.75 requires the organization to establish and maintain a process for identifying and correcting safety performance deficiencies, including evaluating whether corrective actions are effective." },
          { question: "Which step should come AFTER implementing a corrective action?", options: ["Close the finding and move on", "Verify the action actually resolved the deficiency", "Reduce the safety budget", "Remove the hazard from the register"], correct: 1, explanation: "After implementing a corrective action, you must verify its effectiveness — confirm that the action actually resolved the deficiency. Without this verification step, you cannot know if the problem is truly fixed." },
          { question: "How often should safety performance assessments typically be conducted?", options: ["Only after an accident", "Daily by line employees", "At least quarterly, with an annual comprehensive review", "Every five years during certificate renewal"], correct: 2, explanation: "Best practice under §5.73 is to conduct safety performance reviews at least quarterly, with a comprehensive annual assessment for the Accountable Executive. Ad-hoc assessments may be needed after significant events." },
          { question: "What does the 'M' in SMART corrective actions stand for?", options: ["Mandatory", "Measurable", "Minimal", "Monthly"], correct: 1, explanation: "SMART stands for Specific, Measurable, Achievable, Relevant, and Time-bound. Measurable means the corrective action's success can be objectively verified — you can tell whether it worked or not." },
          { question: "Using the '5 Whys' technique, what is the goal of repeatedly asking 'Why?'?", options: ["To assign blame to the individual who made the error", "To drill from surface symptoms down to root systemic causes", "To create a longer investigation report", "To satisfy regulatory documentation requirements"], correct: 1, explanation: "The '5 Whys' technique drills down from surface symptoms to root causes. Corrective actions addressing root causes (e.g., missing policies, inadequate training, systemic process gaps) are far more effective than those addressing only symptoms (e.g., 'crew member made an error')." },
        ],
      },
      {
        title: "Safety Performance Review & Oversight",
        sortOrder: 3,
        contentBlocks: [
          { type: "heading", content: "Management Review Process" },
          { type: "text", content: "Effective SMS leadership requires regular, structured review of safety performance. This connects the AE's oversight responsibility (§5.25(b)(5)) with the Safety Assurance requirements (§5.73).\n\nA recommended review structure:\n\n• Weekly — Safety Manager reviews incoming reports, FRAT trends, and open actions\n• Monthly — Safety Manager briefs Chief Pilot and operations leadership on safety metrics\n• Quarterly — Safety Review Board meeting with AE, Safety Manager, Chief Pilot, and department heads\n• Annually — Comprehensive SMS performance assessment with formal report to the AE" },
          { type: "text", content: "The Safety Review Board (SRB) is the organizational body that provides oversight of SMS performance. Typically chaired by the Accountable Executive or a designated senior leader, the SRB reviews safety performance data, approves risk acceptances, evaluates corrective action effectiveness, and sets safety priorities. The SRB should include representatives from all operational departments — flight operations, maintenance, dispatch, training, and administration — to ensure a comprehensive perspective." },
          { type: "divider" },
          { type: "heading", content: "What to Review" },
          { type: "list", content: "Safety reports received (volume, types, trends)\nFRAT score trends and distribution\nOpen hazards and average time to closure\nCorrective action completion rate and overdue items\nTraining compliance rates across all requirements\nIncident and event rates (normalized per flight hours or departures)\nAudit findings — internal and external\nSafety objectives — progress toward targets defined in safety policy", ordered: false },
          { type: "text", content: "Look for trends, not just individual data points. A single high FRAT score is normal. A steady increase in average FRAT scores over three months is a signal that requires investigation." },
          { type: "callout", content: "If you review safety data but don't act on what it tells you, you don't have a safety management system — you have a safety data collection system. Review must lead to action." },
          { type: "text", content: "After each review, document:\n\n• Key findings and trends identified\n• Decisions made and rationale\n• Action items with owners and deadlines\n• Resources approved or requested\n• Date of next review\n\nThis documentation serves as evidence of active SMS management during FAA audits and demonstrates the continuous improvement cycle required by §5.75. PreflightSMS's Audit Log and Dashboard provide ready-made data for these reviews." },
          { type: "text", content: "The difference between a thriving SMS and a paper SMS often comes down to the quality of management reviews. A paper SMS holds reviews because the regulation requires it. A thriving SMS holds reviews because leadership genuinely wants to understand safety performance and make data-driven decisions. The AE's engagement level during these reviews — asking probing questions, requesting follow-up, approving resources — sets the tone for the entire organization." },
          { type: "success", content: "For Safety Review Board meetings: Prepare a one-page safety dashboard showing the top 5 SPIs with trend arrows (improving, stable, declining). This makes it easy for leadership to quickly grasp the current safety picture and focus discussion on areas that need attention." },
        ],
        quizQuestions: [
          { question: "How often should the Accountable Executive formally review SMS safety performance?", options: ["Only when an accident occurs", "Daily, reviewing every safety report personally", "At least quarterly, with a comprehensive annual assessment", "Every five years during certificate renewal"], correct: 2, explanation: "Best practice is for the AE to participate in quarterly Safety Review Board meetings and receive a comprehensive annual SMS performance assessment. This fulfills the §5.25(b)(5) requirement to regularly review safety performance." },
          { question: "What should happen after a management safety review identifies a negative trend?", options: ["Document the finding and wait to see if it resolves itself", "Take specific corrective action with assigned owners and deadlines", "Increase punishment for involved employees", "Reduce the frequency of future reviews"], correct: 1, explanation: "Review must lead to action per §5.75. When a negative trend is identified, specific corrective actions should be developed with clear owners, deadlines, and a plan to verify effectiveness. Passive documentation without action defeats the purpose of monitoring." },
          { question: "Which combination of metrics provides the best picture of overall SMS health?", options: ["Revenue and customer satisfaction only", "Report volume, hazard closure time, training compliance, and FRAT trends", "Number of FAA inspections passed", "Total flight hours and fleet size"], correct: 1, explanation: "A comprehensive view of SMS health requires multiple indicators: reporting volume (culture health), hazard closure time (responsiveness), training compliance (competency), and FRAT trends (operational risk). No single metric tells the full story." },
          { question: "What distinguishes a thriving SMS from a paper SMS during management reviews?", options: ["A thriving SMS has more paperwork", "Leadership engagement — asking probing questions, approving resources, and following up on actions", "A paper SMS uses more technology", "The frequency of reviews is the only difference"], correct: 1, explanation: "The quality of management reviews is a key differentiator. In a thriving SMS, leadership genuinely engages — asking probing questions, requesting follow-up, and approving resources. In a paper SMS, reviews are held to check a compliance box without genuine engagement or follow-through." },
        ],
      },
    ],
  },
  {
    title: "Pillar 4: Safety Promotion",
    description: "Training on Safety Promotion requirements under 14 CFR Part 5 Subpart E (§5.91, §5.93). Covers SMS competency and training program requirements, multi-channel safety communication strategies, hazard information dissemination tailored to employee responsibilities, explaining safety actions and procedure changes, and building and sustaining a positive safety culture. Includes practical guidance on safety newsletters, safety stand-downs, recognition programs, feedback mechanisms, and leadership behaviors that shape organizational safety culture.",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 35,
    lessons: [
      {
        title: "Safety Communication Framework",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "Safety Promotion Under §5.93" },
          { type: "text", content: "Safety Promotion is the fourth pillar of SMS and arguably the one that ties everything together. Without effective communication, even the best safety policies, risk assessments, and assurance programs fail — because people don't know about them.\n\nUnder §5.93, your organization must provide safety communication that:\n\n(a) Conveys SMS policies, procedures, and tools relevant to each employee's responsibilities\n(b) Conveys hazard information relevant to each employee's responsibilities\n(c) Explains why safety actions have been taken\n(d) Explains why safety procedures have been introduced or changed" },
          { type: "text", content: "Safety Promotion is sometimes overlooked because it feels 'soft' compared to the technical rigor of Risk Management or the data-driven discipline of Safety Assurance. But consider this: every risk control, every procedure, every safety policy is only as effective as the people who implement it. And people can only implement what they understand, value, and remember. Safety Promotion is the pillar that ensures understanding, builds value, and reinforces memory." },
          { type: "text", content: "The Colgan Air 3407 accident investigation revealed significant deficiencies in safety promotion. Training standards varied widely, communication about known risks was inadequate, and the safety culture did not encourage open discussion of concerns. The Airline Safety and Federal Aviation Administration Extension Act of 2010 (Public Law 111-216) — passed in direct response to Colgan 3407 — included enhanced training requirements and safety culture provisions that are now embedded in SMS regulations." },
          { type: "divider" },
          { type: "heading", content: "Communication Channels" },
          { type: "list", content: "Safety bulletins and newsletters — Written summaries of recent events, lessons learned, and policy changes\nSafety meetings — Regular team meetings where safety topics are discussed openly\nDigital platforms — PreflightSMS notifications, email alerts, and dashboard announcements\nBriefings — Pre-flight and pre-shift briefings that include relevant safety information\nPosters and visual aids — Physical reminders in crew rooms, hangars, and dispatch areas\nOne-on-one conversations — Direct communication for sensitive or role-specific safety matters", ordered: false },
          { type: "callout", content: "The best safety communication is two-way. Employees should feel empowered to ask questions, raise concerns, and contribute ideas — not just receive information." },
          { type: "text", content: "When choosing a communication channel, consider your audience, the urgency of the message, and whether acknowledgment of receipt is needed. Critical safety information (like a new hazard affecting current operations) needs immediate, direct communication — not a newsletter that might be read next week." },
          { type: "text", content: "Research on effective safety communication in high-reliability organizations (HROs) shows that the most effective programs use multiple redundant channels. Important safety messages should be communicated through at least two different channels — for example, both a written safety bulletin and a verbal briefing during the next safety meeting. Redundancy ensures the message reaches everyone, even those who miss one channel." },
          { type: "success", content: "Practical tip: After implementing a new safety procedure, follow up within 30 days to ask employees how it is working in practice. This closes the communication loop and demonstrates that management values frontline feedback." },
        ],
        quizQuestions: [
          { question: "Under §5.93, which of the following is a required element of safety communication?", options: ["Marketing the company's safety record to customers", "Explaining why safety actions have been taken", "Reporting safety data to competitors", "Publishing annual financial statements"], correct: 1, explanation: "§5.93(c) specifically requires the organization to explain why safety actions have been taken. This ensures employees understand the rationale behind safety decisions, building trust and compliance." },
          { question: "What is the most important characteristic of effective safety communication?", options: ["It uses technical jargon to demonstrate expertise", "It is one-way, from management to employees", "It is two-way, encouraging employee feedback and questions", "It only occurs during annual training sessions"], correct: 2, explanation: "Effective safety communication is two-way — employees should feel empowered to ask questions, raise concerns, and contribute ideas. One-way communication misses the valuable insights that front-line employees can provide." },
          { question: "Why should important safety messages use multiple communication channels?", options: ["To increase administrative workload", "Redundancy ensures the message reaches everyone, even those who miss one channel", "Regulators require at least three channels for each message", "Multiple channels look better in audit documentation"], correct: 1, explanation: "Using multiple redundant channels ensures important safety messages reach all personnel. If someone misses a safety bulletin, they may hear the message during a safety meeting. Redundancy is a key principle of reliable communication in high-reliability organizations." },
          { question: "What legislative action was passed in direct response to deficiencies highlighted by the Colgan Air 3407 investigation?", options: ["The Patriot Act", "The Airline Safety and FAA Extension Act of 2010", "The Airport Improvement Act", "The Aviation Security Act"], correct: 1, explanation: "The Airline Safety and FAA Extension Act of 2010 (Public Law 111-216) was passed in direct response to the Colgan Air 3407 accident and included enhanced training requirements, safety culture provisions, and other safety improvements now embedded in SMS regulations." },
        ],
      },
      {
        title: "Communicating Hazards & Safety Actions",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "Hazard Information Communication (§5.93(b))" },
          { type: "text", content: "When a hazard is identified through the SRM process, the people who need to know about it must be informed promptly. §5.93(b) requires communicating hazard information relevant to each employee's responsibilities.\n\nEffective hazard communication includes:\n\n• What the hazard is — Clear, specific description\n• Who is affected — Which roles, routes, aircraft, or operations\n• What controls are in place — Current risk mitigations\n• What action is expected — What employees should do differently\n• Timeframe — How long the hazard is expected to persist" },
          { type: "text", content: "Tailoring hazard communication to the audience is essential. A maintenance-related hazard (e.g., a fleet-wide inspection requirement) should be communicated differently to maintenance personnel than to pilots. Maintenance teams need the technical details of the inspection. Pilots need to know which aircraft are affected, how it impacts scheduling, and whether there are any operational limitations. Sending the same generic communication to everyone dilutes the message and reduces compliance." },
          { type: "divider" },
          { type: "heading", content: "Explaining Safety Actions (§5.93(c-d))" },
          { type: "text", content: "People are more likely to follow safety procedures when they understand why they exist. §5.93(c) requires explaining why safety actions are taken, and §5.93(d) requires explaining why procedures are introduced or changed.\n\nWhen communicating a safety action or procedure change:\n\n1. State what changed — The specific policy, procedure, or requirement\n2. Explain the trigger — What event, hazard, or analysis led to the change\n3. Describe the rationale — Why this particular action was chosen\n4. Clarify the expectation — What compliance looks like in practice\n5. Invite feedback — Ask for input on whether the action is practical and effective" },
          { type: "list", content: "State what changed — the specific policy, procedure, or requirement\nExplain the trigger — what event, hazard, or analysis led to the change\nDescribe the rationale — why this particular action was chosen\nClarify the expectation — what compliance looks like in practice\nInvite feedback — ask for input on whether the action is practical and effective", ordered: true },
          { type: "callout", content: "Never communicate a new safety procedure without explaining WHY. 'Because we said so' is not safety promotion — it breeds resentment and non-compliance." },
          { type: "text", content: "Example of poor communication: 'Effective immediately, all flights require a FRAT score below 25 for dispatch.'\n\nExample of effective communication: 'Following analysis of our Q3 safety data, we identified that flights departing with FRAT scores above 25 had a 3x higher rate of safety events. Starting Monday, flights scoring above 25 will require Chief Pilot review before dispatch. This adds approximately 10 minutes to the dispatch process but significantly reduces our exposure to high-risk operations. Please contact the Safety Manager with any questions or feedback on how this works in practice.'" },
          { type: "text", content: "The difference between these two communications is profound. The first tells people what to do. The second tells them what to do, why, what data supports it, what the practical impact is, and invites their feedback. The second approach builds trust, demonstrates transparency, and dramatically increases the likelihood that the procedure will be followed consistently." },
          { type: "success", content: "Template for safety action communications: 'What changed: [specific change]. Why: [data/event that triggered it]. Impact: [what this means for your daily work]. Feedback: [who to contact with questions or concerns].' Using a consistent template makes communications clearer and easier to follow." },
        ],
        quizQuestions: [
          { question: "When communicating a new safety procedure, what should always be included per §5.93(c-d)?", options: ["The name of the employee who caused the problem", "An explanation of why the procedure was introduced", "The estimated cost savings from the change", "A comparison with competitor practices"], correct: 1, explanation: "§5.93(c) requires explaining why safety actions are taken and §5.93(d) requires explaining why procedures are introduced or changed. Understanding the 'why' drives genuine compliance rather than reluctant obedience." },
          { question: "What information should hazard communication include under §5.93(b)?", options: ["Only the hazard name and a severity rating", "The hazard description, who is affected, controls in place, and expected actions", "Only a reminder to be more careful", "Statistical analysis of all similar hazards industry-wide"], correct: 1, explanation: "Effective hazard communication under §5.93(b) must be relevant to each employee's responsibilities, meaning it should describe the hazard, who is affected, current controls, and what specific action is expected from the employee." },
          { question: "Why is explaining the rationale behind safety changes important?", options: ["It satisfies legal documentation requirements only", "People comply more when they understand why a rule exists", "It allows employees to decide whether to follow the rule", "It is not important — rules should simply be followed"], correct: 1, explanation: "Research consistently shows that people are more likely to comply with safety procedures when they understand the reasoning. Unexplained rules breed resentment and non-compliance, while transparent communication builds trust and genuine safety culture." },
          { question: "Why should hazard communications be tailored to different audiences?", options: ["To create more paperwork for the Safety Manager", "Different roles need different details to take appropriate action", "Tailoring is not important — one message fits all", "Only pilots need hazard communications"], correct: 1, explanation: "Different roles interact with hazards differently and need different information to respond appropriately. Maintenance teams need technical inspection details; pilots need to know about operational impacts and limitations. Generic communications dilute the message and reduce compliance." },
        ],
      },
      {
        title: "Building & Sustaining Safety Culture",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "What Is Safety Culture?" },
          { type: "text", content: "Safety culture is the set of shared values, beliefs, and behaviors that determine how safety is prioritized in your organization. It is not a policy you write — it is the reality of how people behave when no one is watching.\n\nA positive safety culture is characterized by:\n\n• Trust — Employees trust that reporting will be handled fairly\n• Openness — People openly discuss safety concerns without fear\n• Learning — The organization treats errors as learning opportunities\n• Accountability — Everyone takes responsibility for safety, at every level\n• Flexibility — Procedures adapt based on experience and feedback" },
          { type: "text", content: "Safety culture exists on a spectrum. Professor Patrick Hudson developed a widely-used Safety Culture Ladder that describes five levels of organizational maturity:\n\n1. Pathological — 'Who cares about safety as long as we don't get caught?'\n2. Reactive — 'Safety is important; we do a lot every time we have an accident.'\n3. Calculative — 'We have systems in place to manage hazards.'\n4. Proactive — 'We work on problems we find before they cause incidents.'\n5. Generative — 'Safety is how we do business around here.'\n\nMost organizations implementing SMS are somewhere between Calculative and Proactive. The goal is to move toward Generative, where safety thinking is embedded in every decision and action." },
          { type: "text", content: "The concept of safety culture gained prominence after the investigation of the 1986 Chernobyl nuclear disaster, which cited 'poor safety culture' as a primary contributing factor. In aviation, safety culture became a focus after accidents like the 1996 ValuJet 592 crash and the 2009 Colgan Air 3407 accident revealed organizational cultures where known risks were not adequately addressed. These events demonstrated that technical proficiency alone is insufficient — the organizational culture must actively support safety." },
          { type: "divider" },
          { type: "heading", content: "The Safety Promotion Role in Culture" },
          { type: "text", content: "Safety Promotion (§5.91–§5.93) is the primary tool for building and maintaining safety culture. As a safety manager, chief pilot, or administrator, you shape culture through:\n\n• Training programs — Ensuring competency in SMS principles and tools (§5.91)\n• Communication — Making safety information accessible, timely, and relevant (§5.93)\n• Recognition — Acknowledging good safety behavior and quality reports\n• Responsiveness — Acting visibly on safety reports and closing the feedback loop\n• Leadership — Demonstrating commitment through actions, not just words\n\nThe Accountable Executive sets the tone, but every manager reinforces or undermines it daily." },
          { type: "callout", content: "Culture is not what you say in meetings — it's what happens on the flight line at 0500 when no one is looking. Safety Promotion ensures that the right behaviors are understood, encouraged, and sustained." },
          { type: "heading", content: "Practical Safety Promotion Activities" },
          { type: "list", content: "Monthly safety newsletters highlighting reports received and actions taken\n'Safety Stand-Down' events for focused discussion of emerging risks\nRecognition program for top safety reporters each quarter\nFeedback surveys asking employees to rate communication effectiveness\nRegular updates to the company safety board (physical or digital)\nInclusion of safety topics in every operational briefing and meeting\nNew-employee SMS orientation during onboarding\nAnnual safety culture survey to measure organizational health\nSharing relevant ASRS reports and industry lessons learned\nInviting guest speakers from FAASTeam or industry safety organizations", ordered: false },
          { type: "text", content: "One of the most powerful — and most underused — safety promotion activities is closing the feedback loop. When an employee submits a safety report, they need to know what happened with it. Did anyone read it? Was action taken? What changed? Organizations that consistently close this loop see dramatically higher reporting rates. Organizations that don't — where reports disappear into a black hole — see reporting decline until only regulatory-required reports are submitted." },
          { type: "success", content: "Start a 'You Reported, We Acted' section in your monthly safety newsletter. For each safety report that led to a change, briefly describe the report, the analysis, and the action taken. This closes the feedback loop and demonstrates that reporting leads to real results." },
          { type: "video", content: "https://www.youtube.com/watch?v=5wQxNipilqI", caption: "FAA Safety Culture — Building and sustaining a positive safety culture in aviation organizations" },
        ],
        quizQuestions: [
          { question: "Which of the following best describes a positive safety culture?", options: ["Zero accident record over the past year", "Employees openly discuss concerns and trust that reporting is handled fairly", "Strict punishment for any deviation from standard procedures", "Management makes all safety decisions without employee input"], correct: 1, explanation: "A positive safety culture is characterized by trust, openness, and learning. A zero-accident record may reflect luck rather than culture, and punitive approaches actually discourage the reporting that makes SMS effective." },
          { question: "Under §5.91–§5.93, who is primarily responsible for safety promotion activities?", options: ["Only the FAA inspector", "Only line pilots", "Management, with the Accountable Executive setting the tone", "The insurance company"], correct: 2, explanation: "While everyone participates in safety culture, §5.25 makes the Accountable Executive responsible for ensuring safety promotion, and §5.25(c) designates management personnel to carry it out. Leadership sets the tone that everyone else follows." },
          { question: "On the Safety Culture Ladder, which level describes 'Safety is how we do business around here'?", options: ["Reactive", "Calculative", "Proactive", "Generative"], correct: 3, explanation: "The Generative level is the highest on the Safety Culture Ladder, where safety thinking is embedded in every decision and action. It represents a culture where safety is not a separate program but an integral part of how the organization operates." },
          { question: "What is the single most powerful action for increasing safety reporting rates?", options: ["Offering financial rewards for each report", "Mandating a minimum number of reports per employee", "Closing the feedback loop — letting reporters know what happened with their report", "Making reporting anonymous only"], correct: 2, explanation: "Closing the feedback loop is the most effective way to increase reporting. When employees see that their reports are read, analyzed, and lead to action, they are motivated to continue reporting. When reports disappear into a black hole, reporting declines." },
          { question: "What event first brought the concept of 'safety culture' to international prominence?", options: ["The Wright Brothers' first flight", "The 1986 Chernobyl nuclear disaster investigation", "The invention of the flight data recorder", "The formation of ICAO"], correct: 1, explanation: "The Chernobyl investigation cited 'poor safety culture' as a primary contributing factor, bringing the concept to international prominence. The term and its application were subsequently adopted across high-risk industries including aviation." },
        ],
      },
    ],
  },
  {
    title: "Emergency Response Planning",
    description: "Training on the organization's Emergency Response Plan (ERP) as required by §5.27. Covers ERP structure and emergency classification levels, notification chains and command structure during emergencies, delegation of emergency authority, assignment of emergency responsibilities, coordination with interfacing organizations (airports, FBOs, medical facilities), post-event investigation procedures, organizational recovery planning, NTSB/FAA reporting requirements, and Critical Incident Stress Management (CISM). Includes tabletop exercise scenarios and real-world case studies.",
    category: "sms", requiredFor: ["pilot", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"],
    passingScore: 80, estimatedMinutes: 30,
    lessons: [
      {
        title: "ERP Overview & Emergency Classification",
        sortOrder: 0,
        contentBlocks: [
          { type: "heading", content: "Emergency Response Plan Requirements (§5.27)" },
          { type: "text", content: "Under §5.27, your organization must maintain an Emergency Response Plan (ERP) that provides procedures for responding to emergencies and unusual situations. The ERP is a required component of the safety policy and must be coordinated with the ERPs of other organizations you interface with, such as FBOs, airports, and medical facilities." },
          { type: "text", content: "The ERP is distinct from day-to-day safety management. While SMS focuses on identifying and controlling risks during normal operations, the ERP addresses what happens when things go seriously wrong — when risk controls fail and an emergency event occurs. Think of it as the 'break glass in case of emergency' plan that everyone hopes never to use but must be prepared for." },
          { type: "text", content: "The importance of ERP preparation was tragically illustrated by the Asiana Airlines 214 accident at San Francisco International Airport on July 6, 2013. The aircraft crashed on approach, and the subsequent emergency response involved coordination between the airline, airport rescue and firefighting (ARFF), local hospitals, the NTSB, and multiple government agencies. Organizations that had rehearsed their ERPs through drills and tabletop exercises performed significantly better during the actual response." },
          { type: "image", content: "/training/erp-flowchart.png", alt: "Emergency Response Plan Activation Flowchart", caption: "Decision flowchart for ERP activation — from initial event detection through classification and response" },
          { type: "divider" },
          { type: "heading", content: "Emergency Classification Levels" },
          { type: "text", content: "Your ERP should define classification levels that determine the scale and nature of the response:\n\n• Level 1 — Alert: A situation requiring heightened awareness but no immediate activation (e.g., overdue aircraft, security concern, medical advisory)\n\n• Level 2 — Emergency: An event requiring activation of emergency procedures (e.g., aircraft incident with no injuries, forced landing, significant mechanical failure in flight)\n\n• Level 3 — Crisis: A major event requiring full ERP activation (e.g., accident with injuries or fatalities, hull loss, midair collision)" },
          { type: "list", content: "Level 1 (Alert): Heightened awareness, monitoring, preliminary notifications\nLevel 2 (Emergency): Partial ERP activation, designated responders mobilized, regulatory notifications initiated\nLevel 3 (Crisis): Full ERP activation, all response teams mobilized, NTSB notification, family assistance plan activated", ordered: true },
          { type: "callout", content: "Know your ERP classification levels and what triggers each level. In an emergency, every minute counts — familiarity with procedures before an event is critical." },
          { type: "text", content: "Each classification level should have a defined set of actions, a list of people to notify, and clear criteria for escalation to the next level. The ERP should be reviewed annually and after every activation or drill." },
          { type: "text", content: "A common mistake in ERP design is making the plan too complex. During an actual emergency, people are under extreme stress. Fine motor skills, cognitive function, and decision-making are all impaired. Your ERP must be simple enough to follow under these conditions. Use clear headings, bullet points, and checklists rather than dense paragraphs. Include phone numbers and contact information directly in the relevant sections rather than in a separate appendix. Test the plan by asking: 'Could someone follow this at 2 AM while under extreme stress?' If not, simplify it." },
          { type: "success", content: "Keep a laminated quick-reference card with emergency classification levels and key phone numbers in each cockpit, crew room, and maintenance office. In an emergency, you need this information immediately accessible — not buried in a 50-page document." },
        ],
        quizQuestions: [
          { question: "Under §5.27, what must the Emergency Response Plan be coordinated with?", options: ["The company's marketing strategy", "The ERPs of interfacing organizations", "The FAA's national airspace plan", "Local law enforcement patrol schedules"], correct: 1, explanation: "§5.27 requires that the ERP be coordinated with the emergency response plans of other organizations the certificate holder interfaces with, such as airports, FBOs, and medical facilities." },
          { question: "Which emergency classification level would typically apply to an aircraft accident with injuries?", options: ["Level 1 — Alert", "Level 2 — Emergency", "Level 3 — Crisis", "No classification needed"], correct: 2, explanation: "An accident with injuries represents the most serious classification level (Crisis), requiring full ERP activation including notifications to NTSB, FAA, family members, and media response preparation." },
          { question: "Why should an ERP be designed for simplicity?", options: ["To save paper and printing costs", "People under extreme stress have impaired cognitive function and need clear, simple procedures", "Simple plans are easier to file with the FAA", "Complex plans are never approved by regulators"], correct: 1, explanation: "During emergencies, personnel experience extreme stress that impairs fine motor skills, cognitive function, and decision-making. An ERP must be simple enough to follow under these conditions — clear headings, bullet points, checklists, and immediately accessible contact information." },
          { question: "How often should the ERP be reviewed at minimum?", options: ["Only after an actual emergency", "Annually and after every activation or drill", "Every five years", "Monthly"], correct: 1, explanation: "The ERP should be reviewed at minimum annually and after every activation (real or drill). Lessons learned from drills and actual events should be incorporated to continuously improve the plan." },
          { question: "What is the key distinction between day-to-day SMS operations and the ERP?", options: ["The ERP replaces the SMS during emergencies", "SMS manages risk during normal operations; the ERP addresses response when an emergency occurs", "The ERP is voluntary while SMS is mandatory", "There is no distinction — they are the same thing"], correct: 1, explanation: "SMS focuses on proactive risk management during normal operations. The ERP addresses response procedures when things go seriously wrong — when risk controls fail and an emergency event occurs. Both are required components, but they serve different purposes." },
        ],
      },
      {
        title: "Notification Chain & Command Structure",
        sortOrder: 1,
        contentBlocks: [
          { type: "heading", content: "Notification Procedures" },
          { type: "text", content: "When an emergency occurs, a structured notification chain ensures the right people are informed in the right order:\n\n1. Immediate safety — Ensure the safety of persons involved (crew, passengers, bystanders)\n2. Emergency services — Contact 911 / ATC / airport emergency if not already involved\n3. Internal notification — Alert the on-call emergency coordinator (typically chief pilot or director of operations)\n4. Accountable Executive — The AE must be notified of any Level 2 or Level 3 event\n5. Regulatory notification — NTSB (for accidents/serious incidents) and FAA FSDO\n6. Insurance and legal — Notify as required by your organization's policies\n7. Family and next-of-kin — For events involving injury or fatality, following your organization's family assistance plan" },
          { type: "list", content: "Priority 1 — Life safety: Ensure safety of all persons involved\nPriority 2 — Emergency services: 911, ATC, airport ARFF\nPriority 3 — Internal notification: Emergency coordinator, Accountable Executive\nPriority 4 — Regulatory: NTSB (accidents within 10 hours), FAA FSDO\nPriority 5 — Support: Insurance, legal, family notification\nPriority 6 — Recovery: Operations continuity, employee support, CISM", ordered: true },
          { type: "text", content: "NTSB notification requirements are time-sensitive and legally binding. Under 49 CFR Part 830, the operator must notify the NTSB immediately (in practice, within 10 hours) of any aircraft accident and certain serious incidents. Failure to make timely notification is a regulatory violation. The NTSB can be reached 24/7 at their Response Operations Center. Know this number or have it immediately accessible in your ERP quick-reference card." },
          { type: "divider" },
          { type: "heading", content: "Command Structure During Emergencies" },
          { type: "text", content: "During an emergency response, clear command structure prevents confusion:\n\n• Emergency Coordinator — The designated person who manages the overall response (usually chief pilot or director of operations for the first 24 hours)\n• Communications Lead — Handles all external communications including media inquiries; no one else should speak to media\n• Operations Lead — Manages ongoing flight operations, makes go/no-go decisions for remaining flights\n• Family Liaison — If applicable, serves as single point of contact for affected families\n• Accountable Executive — Makes strategic decisions and authorizes major actions" },
          { type: "text", content: "The command structure should follow Incident Command System (ICS) principles, which are widely used in emergency management across all industries. ICS provides a scalable, flexible framework that can expand or contract based on the scope of the emergency. For a small operation, one person might fill multiple roles. For a major crisis, each role might have a full team. The key principle is that every function has a designated owner and there is a clear chain of command." },
          { type: "callout", content: "Never speak to media or post on social media about an emergency event. All external communications must go through the designated Communications Lead." },
          { type: "text", content: "Your notification contact list should be maintained in PreflightSMS (Admin > Notification Contacts) and reviewed monthly for accuracy. Phone trees should be tested periodically to ensure numbers are current." },
          { type: "text", content: "Social media has fundamentally changed emergency communications. In the age of smartphones, news of an aviation emergency can spread globally within minutes — often before the organization has had time to verify facts or notify families. Your ERP must address social media explicitly: employees should be instructed never to post about an emergency on any social media platform, and the Communications Lead should be prepared to monitor social media and respond to misinformation quickly." },
          { type: "success", content: "Test your notification chain quarterly by conducting a no-notice phone tree drill. Time how long it takes to reach every person on the list. If you cannot reach everyone within 30 minutes, your contact information needs updating or your notification procedures need revision." },
        ],
        quizQuestions: [
          { question: "In the notification chain, what is the FIRST priority during an emergency?", options: ["Notify the insurance company", "Contact the media", "Ensure the safety of persons involved", "File a report with the FAA"], correct: 2, explanation: "The immediate priority in any emergency is ensuring the safety of all persons involved — crew, passengers, and bystanders. All other notifications follow once safety is addressed." },
          { question: "Who should handle media inquiries during an emergency response?", options: ["Any available employee", "The pilot in command", "The designated Communications Lead only", "The maintenance department"], correct: 2, explanation: "All external communications including media inquiries must be handled exclusively by the designated Communications Lead. This ensures consistent, accurate messaging and prevents unauthorized statements that could create legal or reputational issues." },
          { question: "Within what timeframe must the NTSB be notified of an aircraft accident?", options: ["Within 72 hours", "Within 30 days", "Immediately — in practice within 10 hours", "Only after the internal investigation is complete"], correct: 2, explanation: "Under 49 CFR Part 830, the operator must notify the NTSB immediately of any aircraft accident. In practice, this means within 10 hours. The NTSB Response Operations Center is available 24/7. Failure to make timely notification is a regulatory violation." },
          { question: "What should the ERP instruct employees to do regarding social media during an emergency?", options: ["Post updates to keep the public informed", "Share photos to document the event", "Never post about the emergency on any social media platform", "Only post if they were not directly involved"], correct: 2, explanation: "Employees should be instructed never to post about an emergency on any social media platform. Social media posts can spread misinformation, compromise investigations, cause legal issues, and reach families before they are officially notified. All communications must go through the designated Communications Lead." },
          { question: "How often should the notification contact list be tested?", options: ["Only after a real emergency reveals problems", "At least quarterly through no-notice drills", "Annually during the ERP review", "Never — testing wastes resources"], correct: 1, explanation: "Quarterly no-notice phone tree drills are recommended to verify that contact information is current and the notification chain functions as designed. Problems discovered during drills are far preferable to problems discovered during an actual emergency." },
        ],
      },
      {
        title: "Post-Event Investigation & Recovery",
        sortOrder: 2,
        contentBlocks: [
          { type: "heading", content: "Post-Event Investigation" },
          { type: "text", content: "After the immediate emergency response, the organization must conduct an internal investigation. This is separate from (but coordinated with) any NTSB or FAA investigation:\n\n1. Preserve evidence — Secure the aircraft, preserve electronic records (FDR, CVR, GPS data, FRAT), photograph the scene\n2. Gather witness statements — Interview crew, passengers, witnesses, ATC. Do this while memories are fresh.\n3. Analyze contributing factors — Use the SMS hazard identification and risk analysis framework\n4. Identify root causes — Look beyond the immediate cause to systemic factors\n5. Develop corrective actions — Address root causes, not just symptoms\n6. Feed findings back into SMS — Update hazard register, risk assessments, and training as needed" },
          { type: "list", content: "Preserve all evidence immediately — aircraft, electronic records, photographs, ATC recordings\nGather witness statements within 24-48 hours while memories are fresh\nUse structured analysis methods (5 Whys, bowtie, fault tree) to identify contributing factors\nDistinguish between immediate causes and root systemic causes\nDevelop corrective actions that address root causes using the SMART framework\nFeed all findings back into the SMS through updated hazard registers, risk assessments, and training", ordered: true },
          { type: "text", content: "When the NTSB investigates, they have legal authority over the investigation site and evidence. Your internal investigation must coordinate with — not interfere with — the NTSB investigation. The NTSB will typically designate the operator as a 'party' to the investigation, which provides access to the investigation process. However, you must not move or alter evidence, release investigation information to the public, or conduct independent testing without NTSB coordination." },
          { type: "text", content: "Internal investigations should use the same analytical rigor applied in SRM. The goal is not to assign blame but to understand what happened and why, so that systemic changes can prevent recurrence. This is where the Just Culture principles from Pillar 1 are critically important — if the investigation becomes a blame exercise, people will stop cooperating, and the organization will lose the opportunity to learn from the event." },
          { type: "divider" },
          { type: "heading", content: "Organizational Recovery" },
          { type: "text", content: "An emergency event affects the entire organization. Recovery planning should address:\n\n• Operational continuity — Returning to normal operations safely and systematically\n• Employee support — Critical Incident Stress Management (CISM) for affected personnel; provide access to counseling\n• Communication — Keep all employees informed about what happened, what was learned, and what changes are being made\n• Regulatory compliance — Complete all required reports (NTSB Form 6120.1, NASA ASRS if applicable, FAA notification)\n• Lessons learned — Share findings through safety meetings and training updates (Safety Promotion per §5.93)" },
          { type: "text", content: "Critical Incident Stress Management (CISM) is an essential component of organizational recovery that is often overlooked in ERPs. Personnel involved in or witnessing an emergency event may experience acute stress reactions, post-traumatic stress, anxiety, depression, and difficulty returning to normal duties. CISM provides structured psychological support through peer support, defusing sessions (within hours), debriefing sessions (within 72 hours), and referral to professional counseling when needed. Having a CISM team or contract in place before an event occurs ensures timely support." },
          { type: "callout", content: "Every emergency event, whether a minor incident or major accident, generates lessons that should feed back into your SMS through the continuous improvement process (§5.75)." },
          { type: "text", content: "ERP drills and tabletop exercises are recommended at least annually. These practice events build organizational muscle memory so that when a real emergency occurs, the response is automatic rather than improvised. Document all drills and update the ERP based on lessons learned." },
          { type: "text", content: "Tabletop exercises are particularly valuable because they are low-cost, low-disruption, and can be tailored to specific scenarios. A typical tabletop exercise takes 2-3 hours and involves key ERP personnel walking through a simulated emergency scenario, discussing their responses, identifying gaps in the plan, and developing improvements. Scenarios should vary — sometimes an accident, sometimes a security event, sometimes a medical emergency — to exercise different parts of the ERP." },
          { type: "success", content: "Schedule your next tabletop exercise now. Pick a realistic scenario (overdue aircraft, forced landing, medical emergency), assemble your ERP team, and walk through the response step by step. Document what worked, what was unclear, and update the ERP accordingly. The investment of 2-3 hours could save lives when a real emergency occurs." },
        ],
        quizQuestions: [
          { question: "What is the first step in post-event investigation?", options: ["Interview the media", "Preserve evidence", "File insurance claims", "Resume normal operations"], correct: 1, explanation: "Preserving evidence is the critical first step — secure the aircraft, preserve electronic records, and photograph the scene. Evidence can be lost or degraded quickly, making early preservation essential." },
          { question: "Under §5.75, what should happen with findings from an emergency investigation?", options: ["They should be filed away and forgotten", "They should feed back into the SMS through corrective actions and training", "They should only be shared with the FAA", "They should be handled solely by the insurance company"], correct: 1, explanation: "Per §5.75, investigation findings must feed back into the SMS through the continuous improvement process. This means updating the hazard register, developing corrective actions, and incorporating lessons learned into training." },
          { question: "How often should ERP drills or tabletop exercises be conducted?", options: ["Only after a real emergency", "At least annually", "Every five years", "Never — drills are disruptive"], correct: 1, explanation: "Best practice is to conduct at least one tabletop exercise annually and a full-scale drill periodically. Regular practice builds organizational readiness so that emergency response becomes automatic." },
          { question: "What is CISM and why is it important in emergency recovery?", options: ["Certificate Information System Management — a regulatory database", "Critical Incident Stress Management — structured psychological support for personnel affected by emergencies", "Crew Information Scheduling Module — a duty time tracker", "Corrective Item Status Monitor — a maintenance tracking tool"], correct: 1, explanation: "Critical Incident Stress Management provides structured psychological support for personnel involved in or witnessing emergency events. Without CISM, affected personnel may experience lasting psychological harm that impairs their ability to return to duty safely." },
          { question: "When the NTSB investigates an accident, what must the operator NOT do?", options: ["Cooperate with NTSB investigators", "Provide records when requested", "Move or alter evidence or release investigation information without NTSB coordination", "Designate a company representative to participate in the investigation"], correct: 2, explanation: "When the NTSB investigates, they have legal authority over the investigation site and evidence. The operator must not move or alter evidence, release investigation information to the public, or conduct independent testing without NTSB coordination." },
        ],
      },
    ],
  },
];

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
          {["pilot", "dispatcher", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"].map(r => (
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
          {["pilot", "dispatcher", "maintenance", "safety_manager", "chief_pilot", "accountable_exec", "admin"].map(r => (
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
    await onInitTraining(PART5_TRAINING_REQUIREMENTS, PART5_CBT_COURSES);
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
