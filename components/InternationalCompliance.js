import { useState, useMemo, useCallback, useEffect } from "react";

const DARK = "#0A0A0A", NEAR_BLACK = "#111111", CARD_BG = "#222222";
const WHITE = "#FFFFFF", OFF_WHITE = "#E0E0E0", MUTED = "#777777";
const BORDER = "#2E2E2E";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", AMBER = "#F59E0B", CYAN = "#22D3EE";

const card = { background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}` };
const inp = { width: "100%", padding: "8px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontSize: 12, boxSizing: "border-box" };
const btnStyle = (bg, color) => ({ padding: "8px 16px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", background: bg, color });
const badge = (bg, color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color, letterSpacing: 0.3 });

const FRAMEWORKS = {
  faa_part5: { id: "faa_part5", label: "FAA Part 5", desc: "14 CFR Part 5 SMS requirements for Part 135 operators", color: CYAN, always: true },
  icao_annex19: { id: "icao_annex19", label: "ICAO Annex 19", desc: "International Civil Aviation Organization Safety Management standards", color: "#3B82F6" },
  is_bao: { id: "is_bao", label: "IS-BAO", desc: "International Standard for Business Aircraft Operations", color: AMBER },
  easa: { id: "easa", label: "EASA", desc: "European Aviation Safety Agency SMS requirements", color: GREEN },
  transport_canada: { id: "transport_canada", label: "Transport Canada", desc: "Canadian Aviation Regulations SMS requirements (CARs 107)", color: RED },
};

const STATUS_OPTIONS = [
  { id: "not_started", label: "Not Started", color: MUTED },
  { id: "in_progress", label: "In Progress", color: AMBER },
  { id: "compliant", label: "Compliant", color: GREEN },
  { id: "non_compliant", label: "Non-Compliant", color: RED },
  { id: "not_applicable", label: "N/A", color: MUTED },
];

const REG_STATUS_OPTIONS = [
  { id: "not_started", label: "Not Started", color: MUTED },
  { id: "in_progress", label: "In Progress", color: AMBER },
  { id: "registered", label: "Registered", color: GREEN },
  { id: "expired", label: "Expired", color: RED },
];

// ════════════════════════════════════════════════════════════
// GAP GUIDANCE — International requirements with no Part 5 equivalent.
// Shown only for items that have NO crosswalk mapping to Part 5.
// ════════════════════════════════════════════════════════════
const GAP_GUIDANCE = {
  // ── ICAO ANNEX 19 ────────────────────────────────────────
  "icao_annex19:1.3": {
    guidance: "Part 5 requires an Accountable Executive (§5.25) but does not mandate appointment of a separate Safety Manager. ICAO Annex 19 requires a dedicated safety manager as the focal point for SMS development and maintenance, with direct access to the accountable executive. Formally designate a qualified individual and document the appointment.",
    template: `SAFETY MANAGER APPOINTMENT

[Name] is hereby designated as Safety Manager for [Organization], effective [Date].

Reporting: The Safety Manager reports directly to the Accountable Executive and has unrestricted access to all safety-related data, personnel, and operations.

Responsibilities:
• Day-to-day management and maintenance of the SMS
• Coordination of hazard identification and safety risk assessment activities
• Monitoring safety performance against indicators and targets
• Facilitating safety training and safety promotion activities
• Managing the safety reporting system and providing feedback to reporters
• Advising the Accountable Executive on safety matters
• Serving as the primary point of contact for regulatory authorities on SMS matters

Authority: The Safety Manager has the authority to access all areas of operations, stop any activity posing an imminent safety risk, and allocate SMS resources as delegated by the Accountable Executive.

Signed: _________________________ Date: _________
         Accountable Executive`,
  },
  "icao_annex19:1.3.1": {
    guidance: "Part 5 does not specify qualification requirements for safety personnel. ICAO expects the safety manager to have formal SMS training, relevant aviation experience, and competence in safety risk management. Document the minimum qualifications and ensure the appointed individual meets them.",
    template: `SAFETY MANAGER QUALIFICATION REQUIREMENTS

Minimum Qualifications:
• Completion of an approved SMS training course (e.g., ICAO SMS course, equivalent provider)
• Minimum [3–5] years of aviation operational experience
• Working knowledge of applicable aviation regulations (14 CFR Parts 91/135, ICAO Annex 19)
• Demonstrated competence in safety risk management and safety assurance processes
• Effective communication and leadership skills

Preferred Qualifications:
• Formal education in aviation safety, risk management, or related field
• Experience conducting safety investigations and audits
• Familiarity with human factors and organizational safety concepts

Current Appointee Qualifications:
Name: [Name]
SMS Training Completed: [Course name, date, provider]
Aviation Experience: [Summary]
Relevant Certifications: [List]`,
  },

  // ── IS-BAO ───────────────────────────────────────────────
  // Management & Administration gaps
  "is_bao:1.6": {
    guidance: "Part 5 does not address insurance. IS-BAO requires adequate insurance coverage appropriate to scope of operations. Review your hull, liability, passenger, and third-party coverage annually with your broker and ensure limits meet or exceed client and regulatory minimums. Document coverage details and renewal dates.",
  },
  "is_bao:1.7": {
    guidance: "Part 5 does not address subcontractor oversight. IS-BAO requires procedures for managing subcontracted services (fuel, ground handling, maintenance, training, etc.). Maintain a list of critical subcontractors, include safety requirements in agreements, and audit performance periodically.",
    template: `SUBCONTRACTOR MANAGEMENT PROCEDURE

1. Approved Subcontractor List: Maintain a register of all subcontracted services with contact information, scope of work, contract dates, and last audit date.

2. Selection Criteria: Before engaging a subcontractor, evaluate:
   • Regulatory compliance and certifications
   • Safety record and SMS maturity (if applicable)
   • Insurance coverage adequacy
   • References from other operators

3. Contract Requirements: Include clauses for:
   • Compliance with applicable regulations and operator safety standards
   • Incident/occurrence notification requirements
   • Right to audit and inspect
   • Corrective action response timelines

4. Ongoing Monitoring: Audit critical subcontractors at least every [12–24] months. Track and trend any safety events involving subcontracted services.`,
  },

  // Flight Operations gaps
  "is_bao:2": {
    guidance: "Flight operations requirements are outside the scope of Part 5 SMS. These items address operational standards typically governed by 14 CFR Part 135 (or Part 91 for non-commercial operations). Review each sub-item below to ensure your operations manual and procedures address IS-BAO expectations, which often exceed Part 135 minimums.",
  },
  "is_bao:2.1": {
    guidance: "Part 5 does not require an operations manual beyond SMS documentation. IS-BAO expects a comprehensive operations manual covering SOPs, limitations, emergency procedures, checklists, and policy. If you operate under Part 135, your General Operations Manual (GOM) likely satisfies this. Verify it includes all IS-BAO-expected content and is accessible to all crew.",
  },
  "is_bao:2.2": {
    guidance: "Part 5 does not address crew qualifications. IS-BAO expects documented flight crew qualification and currency tracking that meets or exceeds regulatory minimums. Ensure your records include training, checkrides, medical certificates, type ratings, and expiration tracking. Part 135 operators should reference their approved training program.",
  },
  "is_bao:2.3": {
    guidance: "Part 5 does not address flight planning. IS-BAO expects standardized flight planning procedures covering weather, NOTAMs, fuel, alternates, and performance. Part 135 operators should reference their GOM flight planning procedures and ensure records are retained.",
  },
  "is_bao:2.4": {
    guidance: "Part 5 does not address CRM. IS-BAO expects recurrent CRM training for all flight crew covering communication, workload management, decision-making, and situational awareness. Ensure CRM training is part of your recurrent training program and documented in training records.",
  },
  "is_bao:2.5": {
    guidance: "Part 5 does not address fatigue management. IS-BAO expects procedures for managing crew fatigue beyond minimum duty/rest requirements. Consider implementing a Fatigue Risk Management System (FRMS) or at minimum, document duty time tracking, rest policies, and a process for crew to report fatigue without penalty.",
    template: `FATIGUE RISK MANAGEMENT PROCEDURES

1. Duty/Rest Tracking: All crew duty and rest times are recorded and monitored for compliance with 14 CFR §135.263–135.267 and company limits.

2. Company Limits: [Organization] applies the following limits beyond regulatory minimums:
   • Maximum scheduled duty period: [X] hours
   • Minimum rest between duty periods: [X] hours
   • Maximum cumulative duty in 7 consecutive days: [X] hours

3. Fatigue Reporting: Crew members may report fatigue at any time without penalty. Reports are reviewed by [Safety Manager / Chief Pilot] and scheduling is adjusted when feasible.

4. Risk Assessment: Fatigue risk is assessed as part of pre-flight risk assessment (FRAT) and considered in scheduling decisions for early departures, late arrivals, and multi-leg days.`,
  },
  "is_bao:2.6": {
    guidance: "Part 5 does not prescribe SOPs. IS-BAO expects documented standard operating procedures for all phases of flight and ground operations. Part 135 operators should ensure their GOM includes SOPs that are trained, current, and monitored for compliance through audits or line checks.",
  },
  "is_bao:2.8": {
    guidance: "Part 5 does not address CFIT prevention. IS-BAO expects specific CFIT prevention procedures including TAWS/EGPWS equipment requirements, terrain awareness training, and stabilized approach criteria. Document your CFIT prevention program, equipment requirements, and callout procedures.",
  },
  "is_bao:2.9": {
    guidance: "Part 5 does not address runway safety. IS-BAO expects procedures for runway incursion prevention, surface movement, and hot spot awareness. Include ATC communication procedures, sterile cockpit during taxi, and hot spot briefings in your SOPs and training program.",
  },

  // Aircraft Maintenance gaps
  "is_bao:3": {
    guidance: "Aircraft maintenance requirements are outside the scope of Part 5 SMS. These items address airworthiness standards typically governed by 14 CFR Part 43, Part 91 Subpart E, and your approved maintenance program. Review each sub-item to ensure IS-BAO expectations are met.",
  },
  "is_bao:3.1": {
    guidance: "Part 5 does not address maintenance programs. IS-BAO expects a documented maintenance program per manufacturer recommendations and regulatory requirements. Part 135 operators should reference their CAMP (Continuous Airworthiness Maintenance Program) or approved inspection program. Ensure scheduled inspections, unscheduled maintenance procedures, and component life tracking are documented.",
  },
  "is_bao:3.2": {
    guidance: "Part 5 does not address maintenance personnel qualifications. IS-BAO expects maintenance by qualified, trained, and authorized personnel. Maintain records of mechanic certificates, IAs, training completions, and authorizations. Ensure ongoing training is documented.",
  },
  "is_bao:3.3": {
    guidance: "Part 5 does not address maintenance records. IS-BAO expects comprehensive records for each aircraft including inspections, repairs, modifications, AD compliance, and component history. Ensure your record-keeping meets 14 CFR §91.417 requirements and IS-BAO expectations for traceability.",
  },
  "is_bao:3.4": {
    guidance: "Part 5 does not address MEL/CDL procedures. IS-BAO expects documented procedures for operating with deferred maintenance items. Ensure crew awareness of deferred items, associated operational limitations, and rectification timelines. Reference your approved MEL and dispatch deviation procedures.",
  },
  "is_bao:3.5": {
    guidance: "Part 5 does not address continuing airworthiness. IS-BAO expects active management of ADs, service bulletins, mandatory modifications, and life-limited components. Document your airworthiness review process and tracking system for all fleet aircraft.",
  },

  // Cabin Safety gaps
  "is_bao:4": {
    guidance: "Cabin safety requirements are outside the scope of Part 5 SMS. These items address passenger safety standards. Review each sub-item to ensure your passenger handling procedures and emergency equipment meet IS-BAO expectations.",
  },
  "is_bao:4.1": {
    guidance: "Part 5 does not address cabin safety. IS-BAO expects documented procedures for passenger briefings, cabin preparation, and emergency evacuation. Include pre-departure safety briefings (seatbelt, exits, oxygen if applicable), sterile cabin during critical phases, and passenger safety cards.",
  },
  "is_bao:4.2": {
    guidance: "Part 5 does not address emergency equipment. IS-BAO expects required safety equipment to be maintained and accessible. Conduct regular inspections of fire extinguishers, first aid kits, life vests (if required), flashlights, and emergency exits. Document inspection dates and expiration tracking.",
  },
  "is_bao:4.3": {
    guidance: "Part 5 does not address cabin crew training. If your operation uses cabin crew or flight attendants, IS-BAO expects initial and recurrent training on emergency procedures, first aid, fire fighting, and safety equipment. Document training records and competency checks.",
  },

  // Security gaps
  "is_bao:5": {
    guidance: "Security requirements are outside the scope of Part 5 SMS. These items address physical and operational security. Part 135 operators should reference applicable TSA requirements. Review each sub-item to ensure IS-BAO security expectations are met.",
  },
  "is_bao:5.1": {
    guidance: "Part 5 does not address security programs. IS-BAO expects a security program appropriate to scope of operations. Address aircraft access control, crew identification, and security awareness training. Part 135 operators should reference their TSA security program if applicable.",
    template: `SECURITY PROGRAM OVERVIEW

1. Aircraft Access Control: Access to aircraft is restricted to authorized personnel. Aircraft are secured (doors locked, covers applied as appropriate) when unattended.

2. Crew and Personnel Identification: All crew carry valid company identification and government-issued ID. Access to flight deck is restricted per company policy.

3. Passenger and Baggage Screening: [Describe procedures based on operational scope — charter vs. management, domestic vs. international]

4. Security Awareness Training: All personnel receive initial and recurrent security awareness training covering:
   • Recognition of suspicious behavior and unattended items
   • Reporting procedures for security threats
   • Aircraft search procedures
   • Company security policies and local airport requirements

5. International Operations: For operations to/from international destinations, additional security assessments are conducted per [applicable authority] requirements.`,
  },
  "is_bao:5.2": {
    guidance: "Part 5 does not address threat assessment. IS-BAO expects operators to assess threats for operations in elevated-risk areas. Monitor advisories from the FAA, State Department, and applicable foreign authorities. Document threat assessments for international operations and high-risk destinations.",
  },
  "is_bao:5.3": {
    guidance: "Part 5 does not address personnel security. IS-BAO expects background checks and vetting for personnel with access to aircraft. Maintain records of background checks and establish procedures for granting and revoking access.",
  },

  // Emergency Response gaps
  "is_bao:6.2": {
    guidance: "Part 5 requires an ERP (§5.27) but does not specifically require ERP training and drills. IS-BAO expects regular drills, tabletop exercises, and documented training for all personnel on their ERP roles. Conduct at least one exercise annually and document participation, findings, and improvements.",
    template: `ERP TRAINING AND EXERCISE SCHEDULE

Annual Exercise Plan:
• Q[X]: Tabletop exercise — [scenario, e.g., aircraft accident at home base]
• Q[X]: Communication drill — Verify notification chain contacts and response times

Exercise Documentation:
• Date and type of exercise
• Participants and roles exercised
• Scenario description
• Actions taken and timeline
• Gaps or delays identified
• Corrective actions assigned

All personnel are briefed on their ERP roles during initial training and annually thereafter. The ERP contact list is reviewed and updated quarterly.`,
  },
  "is_bao:6.3": {
    guidance: "Part 5 does not address post-event support. IS-BAO expects procedures for supporting affected personnel and families after a safety event. Include critical incident stress management (CISM) resources, employee assistance program (EAP) access, and family notification/support procedures.",
    template: `POST-EVENT SUPPORT PROCEDURES

1. Immediate Response (0–24 hours):
   • Activate ERP notification chain
   • Designate a family liaison and a media point of contact
   • Secure affected personnel from media contact until briefed
   • Offer immediate psychological first aid

2. Short-Term Support (1–30 days):
   • Provide access to Employee Assistance Program (EAP): [Provider name, contact]
   • Arrange Critical Incident Stress Management (CISM) debriefing for involved personnel
   • Assign a peer support contact for each affected individual
   • Communicate factual updates to the organization as appropriate

3. Ongoing Support:
   • Monitor affected personnel for delayed stress reactions
   • Offer return-to-duty support and assessment when ready
   • Maintain confidentiality of personal information throughout

Family Assistance Contact: [Name, phone, email]
EAP Provider: [Name, phone, website]`,
  },

  // SMS gaps
  "is_bao:7.1": {
    guidance: "Part 5 §5.21 maps to IS-BAO 1.1 (Management Commitment) but not to IS-BAO 7.1 (Safety Policy under the SMS section). If you have completed §5.21 through your Part 5 compliance, your safety policy likely satisfies this requirement. Verify your policy includes IS-BAO-specific language on management commitment, reporting, resource commitment, and just culture.",
  },
  "is_bao:7.6": {
    guidance: "Part 5 requires safety performance monitoring (§5.71) but does not explicitly require a safety data analysis program. IS-BAO expects systematic analysis of safety data to identify trends, emerging hazards, and improvement areas. Establish a documented process for collecting, analyzing, and acting on safety data.",
    template: `SAFETY DATA ANALYSIS PROCEDURE

1. Data Sources:
   • Safety reports (voluntary and mandatory)
   • Flight risk assessments (FRAT scores and trends)
   • Audit and inspection findings
   • Maintenance discrepancy reports
   • Flight data monitoring (if equipped)
   • External data (ASRS, NTSB, industry alerts)

2. Analysis Methods:
   • Monthly trend review of safety report categories and frequency
   • Quarterly FRAT score analysis by route, crew, and risk factor
   • Annual safety data summary with year-over-year comparison
   • Ad hoc analysis in response to emerging trends or events

3. Reporting and Action:
   • Safety data findings are presented at [monthly/quarterly] safety meetings
   • Identified trends that exceed alert levels trigger a safety risk assessment
   • Analysis results are shared with relevant personnel through safety bulletins

4. Responsible Party: [Safety Manager] owns the safety data analysis process and presents findings to the Safety Committee and Accountable Executive.`,
  },
  "is_bao:7.8": {
    guidance: "Part 5 does not require third-party SMS audits. IS-BAO requires periodic independent audits to achieve and maintain IS-BAO registration (Stage I, II, or III). Contact IBAC to schedule an audit. Stage I confirms SMS framework is established, Stage II confirms SMS processes are producing results, and Stage III confirms the SMS is mature and self-improving. Budget for audit fees, auditor travel, and pre-audit preparation time.",
  },

  // ── EASA ─────────────────────────────────────────────────
  "easa:2.4": {
    guidance: "Part 5 does not include a standalone internal reporting requirement. EASA requires both mandatory and voluntary occurrence reporting per EU Regulation 376/2014, with reporter identity protection. If operating in EASA states, establish a reporting system that meets EU 376/2014 taxonomy (ECCAIRS) and timeliness requirements (72-hour mandatory reporting).",
    template: `INTERNAL SAFETY REPORTING SYSTEM

1. Mandatory Reporting: All occurrences defined in EU Regulation 376/2014, Annex I are reported to [Competent Authority] within 72 hours via [ECCAIRS/national reporting portal].

2. Voluntary Reporting: All personnel are encouraged to report any safety concern, hazard, or near-miss through [reporting tool/form]. Voluntary reports are confidential and non-punitive (within defined just culture boundaries).

3. Reporter Protection: Reporter identity is known only to the Safety Manager and is removed before safety data is shared for analysis or trend review, in accordance with Article 16 of EU 376/2014.

4. Feedback: Reporters receive acknowledgment within [48 hours] and outcome feedback within [30 days].

5. Data Retention: Occurrence reports are retained for a minimum of [X] years per EU 376/2014 requirements.`,
  },
  "easa:3.1": {
    guidance: "Part 5 requires continuous improvement (§5.75) but does not require a formal compliance monitoring function. EASA mandates a compliance monitoring programme under ORO.GEN.200 that is separate from, but complementary to, the SMS. This function monitors compliance with regulatory requirements and internal procedures through scheduled audits, inspections, and corrective action tracking.",
    template: `COMPLIANCE MONITORING PROGRAMME

1. Scope: The compliance monitoring function covers all activities under the Air Operator Certificate, including flight operations, continuing airworthiness, crew training, and ground handling.

2. Compliance Monitoring Manager: [Name] is designated as the Compliance Monitoring Manager, reporting to the Accountable Manager. This role is independent from the areas being monitored.

3. Audit Schedule: A rolling audit programme ensures all areas are audited within a [12–24] month cycle. The schedule is risk-based, with higher-risk areas audited more frequently.

4. Findings Management:
   • Level 1 findings (significant non-compliance): Immediate corrective action required; reported to competent authority
   • Level 2 findings (non-compliance): Corrective action within agreed timeframe
   • Observations: Tracked for improvement; no formal corrective action required

5. Management Review: Compliance monitoring results are presented to the Accountable Manager at least [annually] as part of the management review.`,
  },
  "easa:4.3": {
    guidance: "Part 5 requires safety communication (§5.93) but does not explicitly require a lessons-learned dissemination process. EASA expects systematic sharing of lessons learned from both internal events and relevant industry occurrences. Establish a process for capturing, packaging, and distributing lessons learned to relevant personnel.",
    template: `LESSONS LEARNED DISSEMINATION PROCESS

1. Sources: Lessons are drawn from:
   • Internal investigation findings and safety reports
   • EASA Safety Information Bulletins (SIBs)
   • National authority safety communications
   • Industry occurrence databases and peer operator sharing
   • IATA/ICAO safety alerts

2. Review and Packaging: The Safety Manager reviews source material, extracts applicable lessons, and prepares a summary including:
   • Brief description of the event or finding
   • Relevance to our operations
   • Recommended actions or awareness points

3. Distribution: Lessons learned are communicated via:
   • Safety bulletins posted to [platform] and emailed to relevant groups
   • Inclusion in recurrent training and crew briefings
   • Discussion at safety committee meetings
   • Case studies in annual safety review presentations`,
  },
  "easa:5": {
    guidance: "This section covers EASA-specific regulatory requirements not addressed by Part 5 or the standard four-pillar SMS structure. These requirements apply specifically to operators under EASA oversight and involve European regulatory obligations.",
  },
  "easa:5.1": {
    guidance: "Part 5 does not address EU occurrence reporting regulations. EASA operators must comply with EU Regulation 376/2014 for mandatory occurrence reporting. Reports must be submitted to the competent authority within 72 hours using ECCAIRS taxonomy. Establish procedures for identifying reportable occurrences, timely submission, and record retention.",
    template: `EU 376/2014 OCCURRENCE REPORTING PROCEDURE

1. Reportable Events: All events listed in Annex I of Regulation (EU) No 376/2014, including but not limited to:
   • Accidents and serious incidents
   • Runway incursions and excursions
   • Airprox events and TCAS RAs
   • Significant technical failures
   • Crew incapacitation
   • Fuel-related events

2. Reporting Timeline: Mandatory reports submitted within 72 hours of the occurrence being identified. Initial report may be supplemented with follow-up data.

3. Reporting Method: Reports are submitted via [national ECCAIRS portal / competent authority reporting system] by the Safety Manager or designated reporter.

4. Internal Coordination: Any person aware of a reportable event notifies the Safety Manager immediately. The Safety Manager assesses reportability and initiates the mandatory report.`,
  },
  "easa:5.2": {
    guidance: "Part 5 does not address the competent authority interface. EASA operators must maintain effective communication with their competent authority (national aviation authority) on safety matters. Respond promptly to authority communications, report significant safety issues without delay, and maintain records of regulatory correspondence.",
  },
  "easa:5.3": {
    guidance: "Part 5 requires SMS documentation (§5.17) but does not require integration into an Operations Manual. EASA expects SMS processes to be integrated into the OM Part A so that SMS is embedded in day-to-day operations, not a standalone system. Ensure your OM references safety reporting procedures, risk assessment processes, and safety policy.",
  },
  "easa:5.4": {
    guidance: "Part 5 does not address contracted activities. EASA requires that safety risks from contracted activities (ground handling, maintenance, training, etc.) are managed within the SMS. Include contracted activities in your hazard identification and risk assessment processes, and specify safety requirements in contracts.",
    template: `CONTRACTED ACTIVITIES SAFETY MANAGEMENT

1. Identification: All contracted activities relevant to flight safety are identified and recorded in a Contracted Activities Register, including:
   • Service description and scope
   • Contractor name and contact
   • Applicable regulatory requirements
   • Contract start/end dates

2. Safety Assessment: Before contracting, assess:
   • Contractor's regulatory approvals and safety record
   • Adequacy of contractor's own safety management processes
   • Interface risks between contractor and own operations

3. Contractual Requirements: Contracts include:
   • Compliance with applicable regulations and operator safety standards
   • Occurrence reporting obligations to [Organization]
   • Right to audit and access relevant safety data

4. Monitoring: Contractor safety performance is reviewed [annually / at contract renewal]. Safety events involving contractors are included in the organization's safety data analysis.`,
  },

  // ── TRANSPORT CANADA ─────────────────────────────────────
  "transport_canada:1.2": {
    guidance: "Part 5 §5.21 requires a safety policy but does not explicitly mandate non-punitive reporting provisions. Transport Canada CARs 107 requires the safety policy to specifically include a commitment to non-punitive reporting with clearly defined boundaries between acceptable and unacceptable behavior. Add explicit just culture language to your safety policy.",
    template: `NON-PUNITIVE REPORTING POLICY

[Organization] is committed to a just culture that encourages open safety reporting without fear of retribution. All employees are expected to report safety hazards, occurrences, and concerns through the safety reporting system.

Non-Punitive Commitment:
No disciplinary action will be taken against any employee who reports a safety hazard, occurrence, or concern in good faith, even if the report involves their own error or action.

Boundaries:
This non-punitive commitment does not apply to:
• Willful violations of regulations or company procedures
• Gross negligence or reckless disregard for safety
• Substance abuse or impairment
• Deliberate concealment of a safety event
• Criminal activity

All determinations regarding the applicability of these boundaries are made by [Accountable Executive / designated authority] after a fair review of the circumstances.

This policy is endorsed by:

_________________________ Date: _________
Accountable Executive`,
  },
  "transport_canada:1.5": {
    guidance: "Part 5 does not require formal safety planning with measurable objectives. Transport Canada requires the organization to establish safety objectives and develop plans to achieve them, supported by safety performance indicators. Define clear, measurable safety objectives annually and create action plans to achieve each one.",
    template: `SAFETY PLANNING AND OBJECTIVES

Safety Objectives for [Year]:

1. Objective: Reduce flight risk assessment scores exceeding "elevated" threshold by [X]% from prior year
   Indicator: Monthly percentage of flights with FRAT score > [threshold]
   Target: Less than [X]% of flights above threshold
   Action Plan: Review high-scoring risk factors quarterly; implement targeted mitigations for top contributors
   Responsible: Safety Manager
   Review Frequency: Quarterly

2. Objective: Achieve [X]% voluntary safety reporting participation across all personnel
   Indicator: Number of voluntary reports per employee per quarter
   Target: [X] reports per employee per year
   Action Plan: Conduct safety reporting awareness campaign; provide quarterly feedback on report outcomes
   Responsible: Safety Manager
   Review Frequency: Quarterly

3. Objective: Complete all corrective actions from safety investigations within [X] days
   Indicator: Average corrective action closure time
   Target: [X] days average; no action open beyond [X] days
   Action Plan: Assign clear ownership and deadlines at investigation close; track in safety action log
   Responsible: Safety Manager
   Review Frequency: Monthly

4. Objective: [Add additional objectives as appropriate]
   Indicator: [Measurable indicator]
   Target: [Specific target]
   Action Plan: [Steps to achieve]

Approved by: _________________________ Date: _________
              Accountable Executive`,
  },
  "transport_canada:1.7": {
    guidance: "Part 5 requires continuous improvement (§5.75) but does not mandate a structured management review process. Transport Canada requires senior management to review SMS effectiveness at planned intervals. Conduct formal management reviews at least annually, covering safety performance, resource adequacy, and improvement opportunities.",
    template: `MANAGEMENT REVIEW PROCEDURE

Frequency: [Annually / Semi-annually], or more often if warranted by safety performance.

Attendees: Accountable Executive, Safety Manager, Director of Operations, Chief Pilot, Director of Maintenance, [others as applicable].

Agenda:
1. Review of previous management review action items
2. Safety performance indicator trends and target achievement
3. Safety reporting statistics and trends
4. Summary of investigations, hazards, and corrective actions
5. Internal audit and evaluation findings
6. Regulatory changes and compliance status
7. Resource adequacy (personnel, budget, tools)
8. Training completion status
9. Status of safety objectives and plans
10. Emerging risks and industry safety issues
11. New action items and resource decisions

Outputs:
• Updated safety objectives and targets (if applicable)
• Resource allocation decisions
• Corrective actions and responsible parties
• Minutes distributed to attendees within [X] days

Records: Management review minutes are retained for a minimum of [3–5] years.`,
  },
  "transport_canada:2.2": {
    guidance: "Part 5 §5.17 addresses SMS documentation but does not specifically require a records management program. Transport Canada requires safety records to be maintained, protected, and retained per regulatory requirements. Establish formal retention periods, storage methods, access controls, and backup procedures for all safety records.",
    template: `SAFETY RECORDS MANAGEMENT

Record Types and Retention Periods:
• Safety reports: [5] years minimum
• Investigation files: [5] years minimum
• Risk assessments: [5] years minimum, or life of the associated operation/equipment
• Audit and evaluation reports: [5] years minimum
• Training records: Duration of employment plus [2] years
• Safety meeting minutes: [3] years minimum
• Management review records: [5] years minimum
• Safety performance data: [5] years minimum

Storage: Records are stored in [system/location] with regular backups to [backup location]. Electronic records are backed up [daily/weekly].

Access Control: Safety records are accessible to the Safety Manager, Accountable Executive, and authorized personnel. Personal information in safety reports is restricted to the Safety Manager.

Disposal: Records past their retention period are reviewed by the Safety Manager before disposal. Disposal is documented.`,
  },
  "transport_canada:3.1": {
    guidance: "Part 5 SRM addresses hazard identification broadly but does not mandate specific reactive processes for occurrence reporting and investigation. Transport Canada requires reactive processes including mandatory reporting to the Transportation Safety Board (TSB) and a structured internal reporting system. Ensure your reactive processes cover TSB-reportable occurrences and internal safety event capture.",
    template: `REACTIVE SAFETY PROCESSES

1. Mandatory Reporting (TSB):
   Occurrences meeting TSB reporting criteria under the Transportation Safety Board Regulations are reported immediately by the most expedient means available.
   • TSB Contact: [phone number]
   • Internal notification: [Safety Manager / Operations Control] is notified immediately for assessment and TSB reporting

2. Internal Safety Reporting:
   All safety occurrences, hazards, and concerns are reported through [reporting system].
   • Reportable events include: incidents, near-misses, hazards, equipment malfunctions, procedural deviations, and any safety concern
   • Reports are reviewed by the Safety Manager within [24–48] hours
   • Reporter receives acknowledgment within [48] hours and outcome feedback within [30] days

3. Investigation Trigger Criteria:
   A formal investigation is initiated for:
   • All accidents and serious incidents
   • Events with high severity potential regardless of actual outcome
   • Repeated occurrences or emerging trends
   • Events at the discretion of the Safety Manager or Accountable Executive`,
  },
  "transport_canada:3.3": {
    guidance: "Part 5 addresses SRM (§5.51–5.55) but does not mandate a structured investigation methodology. Transport Canada requires safety occurrences to be investigated to identify causes and contributing factors. Adopt a recognized investigation methodology (e.g., HFACS, Reason Model, BowTie) and document investigation procedures, responsibilities, and reporting timelines.",
    template: `SAFETY INVESTIGATION PROCEDURE

1. Investigation Authority: The Safety Manager has authority to initiate and conduct safety investigations. Investigations are independent from operational management decisions.

2. Methodology: Investigations use [HFACS / Reason Model / other] to identify:
   • Direct causes (what happened)
   • Contributing factors (conditions that enabled the event)
   • Systemic/organizational factors (why defenses failed)

3. Investigation Steps:
   a. Notification and initial response (within 24 hours)
   b. Evidence collection (statements, data, photographs, records)
   c. Analysis using selected methodology
   d. Identification of findings and contributing factors
   e. Development of corrective/preventive actions
   f. Report preparation and distribution
   g. Follow-up to verify corrective action effectiveness

4. Timeline: Investigations are completed within [30–60] days of the event. Complex investigations may be extended with Safety Manager approval.

5. Reporting: Investigation reports are distributed to the Accountable Executive, relevant department heads, and Safety Committee. Lessons learned are communicated per the safety communication process.`,
  },
  "transport_canada:4.2": {
    guidance: "Part 5 requires safety training (§5.91) but does not specify recurrent training intervals. Transport Canada requires recurrent SMS training at defined intervals. Establish a recurrent training cycle (typically annual) that covers SMS updates, lessons learned, new procedures, and refresher content on core SMS concepts.",
    template: `RECURRENT SMS TRAINING

Frequency: Annual, delivered within [Q1 / Q4 / anniversary month] each year.

Content:
• Review of safety policy and any changes
• Safety reporting system refresher and reporting statistics
• Summary of safety events, investigations, and lessons learned from the past year
• Updates to SMS procedures, forms, or systems
• Safety performance indicator trends and targets
• Relevant industry safety information and alerts
• Role-specific refresher content as applicable

Delivery: [Online modules / classroom / briefing], tracked in [training records system].

Completion Requirement: All personnel must complete recurrent SMS training within [30] days of the scheduled date. Non-completion is escalated to the department manager and Safety Manager.`,
  },
  "transport_canada:4.3": {
    guidance: "Part 5 requires safety training (§5.91) but does not distinguish specialized training for SMS role-holders. Transport Canada requires personnel with specific SMS responsibilities to receive role-specific training. Safety managers, investigators, auditors, and safety committee members should receive training beyond general SMS awareness.",
    template: `SPECIALIZED SMS TRAINING REQUIREMENTS

Safety Manager:
• Formal SMS training course (e.g., Transport Canada-recognized SMS course)
• Safety investigation methodology training
• Risk management and safety data analysis
• Human factors in aviation safety
• Recurrent: Annual refresher or conference attendance

Safety Investigators:
• Investigation methodology training (HFACS, BowTie, or equivalent)
• Interview techniques for safety investigations
• Evidence collection and preservation
• Report writing
• Recurrent: Refresher every [2] years

Internal Auditors / Evaluators:
• Audit principles and techniques (ISO 19011 or equivalent)
• SMS evaluation criteria and tools
• Findings classification and corrective action development
• Recurrent: Refresher every [2] years

Safety Committee Members:
• SMS overview and committee role orientation
• Risk assessment methodology
• Safety data interpretation
• Recurrent: Briefing at the start of each committee term`,
  },
};

export default function InternationalCompliance({
  profile, session, org, orgProfiles,
  complianceFrameworks, checklistItems, complianceStatus, crosswalkData,
  onUpsertFramework, onDeleteFramework, onUpsertStatus, onRefresh,
  part5ReqStatuses,
}) {
  const [view, setView] = useState("frameworks");
  const [activeFramework, setActiveFramework] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [editingFramework, setEditingFramework] = useState(null);

  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const frameworks = complianceFrameworks || [];
  const items = checklistItems || [];
  const statuses = complianceStatus || [];
  const crosswalk = crosswalkData || [];

  const activeFrameworks = useMemo(() => frameworks.filter(f => f.is_active), [frameworks]);
  const activeIds = useMemo(() => new Set(activeFrameworks.map(f => f.framework)), [activeFrameworks]);

  // Status lookup: { checklistItemId: statusObj }
  const statusMap = useMemo(() => {
    const m = {};
    statuses.forEach(s => { m[s.checklist_item_id] = s; });
    return m;
  }, [statuses]);

  // Items grouped by framework
  const itemsByFramework = useMemo(() => {
    const m = {};
    items.forEach(item => {
      if (!m[item.framework]) m[item.framework] = [];
      m[item.framework].push(item);
    });
    return m;
  }, [items]);

  // Determine which international checklist items are auto-satisfied by Part 5
  const part5AutoSatisfied = useMemo(() => {
    if (!part5ReqStatuses || !crosswalk.length) return {};
    const result = {};
    // Helper: check if a Part 5 section (and all its sub-requirements) are compliant
    const isSectionCompliant = (section) => {
      const matching = Object.keys(part5ReqStatuses).filter(id =>
        id === section || (id.startsWith(section) && !/^\d/.test(id.slice(section.length)))
      );
      return matching.length > 0 && matching.every(id => part5ReqStatuses[id] === "compliant");
    };
    // Build reverse crosswalk: for each international item, find mapped Part 5 sections
    items.forEach(item => {
      if (item.framework === "faa_part5") return;
      const mappings = crosswalk.filter(cw =>
        cw.target_framework === item.framework &&
        (cw.target_section === item.section_number ||
         item.section_number.startsWith(cw.target_section + ".") ||
         cw.target_section.startsWith(item.section_number + ".") ||
         cw.target_section === item.section_number)
      );
      if (mappings.length === 0) return;
      const allSourcesCompliant = mappings.every(cw => isSectionCompliant(cw.source_section));
      if (allSourcesCompliant) result[item.id] = true;
    });
    return result;
  }, [part5ReqStatuses, crosswalk, items]);

  // Determine which international items have NO crosswalk mapping to Part 5 at all
  const noP5Crosswalk = useMemo(() => {
    if (!crosswalk.length) return {};
    const result = {};
    items.forEach(item => {
      if (item.framework === "faa_part5") return;
      const mappings = crosswalk.filter(cw =>
        cw.target_framework === item.framework &&
        (cw.target_section === item.section_number ||
         item.section_number.startsWith(cw.target_section + ".") ||
         cw.target_section.startsWith(item.section_number + "."))
      );
      if (mappings.length === 0) result[item.id] = true;
    });
    return result;
  }, [crosswalk, items]);

  // Compliance stats per framework
  const frameworkStats = useMemo(() => {
    const stats = {};
    Object.entries(itemsByFramework).forEach(([fw, fwItems]) => {
      const total = fwItems.length;
      let compliant = 0, nonCompliant = 0, inProgress = 0, notStarted = 0, na = 0, autoSatisfied = 0;
      fwItems.forEach(item => {
        const s = statusMap[item.id]?.status || "not_started";
        if (s === "compliant") compliant++;
        else if (s === "non_compliant") nonCompliant++;
        else if (s === "in_progress") inProgress++;
        else if (s === "not_applicable") na++;
        else if (s === "not_started" && part5AutoSatisfied[item.id]) { autoSatisfied++; compliant++; }
        else notStarted++;
      });
      const applicable = total - na;
      stats[fw] = { total, compliant, nonCompliant, inProgress, notStarted, na, autoSatisfied, applicable, pct: applicable > 0 ? Math.round((compliant / applicable) * 100) : 0 };
    });
    return stats;
  }, [itemsByFramework, statusMap, part5AutoSatisfied]);

  // Section hierarchy for a framework
  const getSections = useCallback((fw) => {
    const fwItems = itemsByFramework[fw] || [];
    const topLevel = fwItems.filter(i => !i.parent_section);
    const children = {};
    fwItems.filter(i => i.parent_section).forEach(i => {
      if (!children[i.parent_section]) children[i.parent_section] = [];
      children[i.parent_section].push(i);
    });
    return { topLevel, children };
  }, [itemsByFramework]);

  const handleStatusUpdate = async (checklistItemId, newStatus, notes, reviewerName) => {
    await onUpsertStatus({
      checklist_item_id: checklistItemId,
      status: newStatus,
      evidence_notes: notes || "",
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
    });
  };

  // Tab button
  const tabBtn = (id, label) => (
    <button key={id} onClick={() => {
      setView(id);
      setExpandedSection(null);
      if (id === "checklist") {
        // Auto-select first active framework if none selected
        if (!activeFramework) {
          const first = activeFrameworks.find(f => f.framework !== "faa_part5");
          if (first) setActiveFramework(first.framework);
        }
      } else {
        setActiveFramework(null);
      }
    }}
      style={{ padding: "8px 20px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
        background: view === id ? "rgba(255,255,255,0.1)" : "transparent",
        border: view === id ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
        color: view === id ? WHITE : MUTED }}>
      {label}
    </button>
  );

  // ════════════════════════════════════════════════════════════
  // FRAMEWORK ACTIVATION
  // ════════════════════════════════════════════════════════════
  const renderFrameworks = () => {
    const fwEntries = Object.values(FRAMEWORKS);
    return (
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 12 }}>Compliance Frameworks</div>
        <div style={{ padding: "12px 16px", marginBottom: 16, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: OFF_WHITE, lineHeight: 1.6 }}>
          Activate the international compliance frameworks that apply to your operation.
          FAA Part 5 is always active as your baseline SMS standard. Once you activate
          additional frameworks, use the <strong style={{ color: WHITE }}>Checklist</strong> tab to track compliance for each
          framework's requirements.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280, 1fr))", gap: 12 }}>
          {fwEntries.map(fw => {
            const isActive = fw.always || activeIds.has(fw.id);
            const fwData = frameworks.find(f => f.framework === fw.id);
            const stats = frameworkStats[fw.id];
            return (
              <div key={fw.id} style={{ ...card, padding: 16, borderLeft: `3px solid ${fw.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{fw.label}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{fw.desc}</div>
                  </div>
                  {fw.always ? (
                    <span style={badge(`${GREEN}22`, GREEN)}>Always Active</span>
                  ) : (
                    <button onClick={async () => {
                      if (isActive && fwData) {
                        await onDeleteFramework(fwData.id);
                      } else {
                        await onUpsertFramework({ framework: fw.id, is_active: true });
                      }
                      onRefresh();
                    }} style={{ ...btnStyle(isActive ? `${RED}22` : `${GREEN}22`, isActive ? RED : GREEN), fontSize: 11, padding: "4px 12px" }}>
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>

                {/* Stats */}
                {stats && isActive && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: MUTED }}>{stats.compliant}/{stats.applicable} compliant</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: stats.pct >= 80 ? GREEN : stats.pct >= 50 ? AMBER : stats.pct > 0 ? RED : MUTED }}>{stats.pct}%</span>
                    </div>
                    <div style={{ width: "100%", height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${stats.pct}%`, height: "100%", background: stats.pct >= 80 ? GREEN : stats.pct >= 50 ? AMBER : RED, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                    {stats.nonCompliant > 0 && (
                      <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>{stats.nonCompliant} non-compliant items</div>
                    )}
                  </div>
                )}

                {/* IS-BAO registration details */}
                {fw.id === "is_bao" && isActive && (
                  <div style={{ marginTop: 12, padding: 8, background: DARK, borderRadius: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase" }}>Registration Status</div>
                    {editingFramework === fw.id ? (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                          <div>
                            <label style={{ fontSize: 9, color: MUTED }}>Status</label>
                            <select value={fwData?.registration_status || "not_started"} onChange={e => onUpsertFramework({ framework: fw.id, is_active: true, registration_status: e.target.value }).then(onRefresh)} style={{ ...inp, fontSize: 11 }}>
                              {REG_STATUS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 9, color: MUTED }}>Auditor</label>
                            <input value={fwData?.auditor_name || ""} onChange={e => onUpsertFramework({ framework: fw.id, is_active: true, auditor_name: e.target.value }).then(onRefresh)} style={{ ...inp, fontSize: 11 }} placeholder="Auditor name" />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                          <div>
                            <label style={{ fontSize: 9, color: MUTED }}>Registration Date</label>
                            <input type="date" value={fwData?.registration_date || ""} onChange={e => onUpsertFramework({ framework: fw.id, is_active: true, registration_date: e.target.value }).then(onRefresh)} style={{ ...inp, fontSize: 11 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 9, color: MUTED }}>Expiration Date</label>
                            <input type="date" value={fwData?.expiration_date || ""} onChange={e => onUpsertFramework({ framework: fw.id, is_active: true, expiration_date: e.target.value }).then(onRefresh)} style={{ ...inp, fontSize: 11 }} />
                          </div>
                        </div>
                        <button onClick={() => setEditingFramework(null)} style={{ ...btnStyle("rgba(255,255,255,0.06)", MUTED), fontSize: 10, padding: "3px 10px" }}>Done</button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          {(() => { const rs = REG_STATUS_OPTIONS.find(o => o.id === (fwData?.registration_status || "not_started")); return <span style={badge(`${rs.color}22`, rs.color)}>{rs.label}</span>; })()}
                          {fwData?.auditor_name && <span style={{ fontSize: 10, color: OFF_WHITE }}>Auditor: {fwData.auditor_name}</span>}
                        </div>
                        {fwData?.registration_date && <div style={{ fontSize: 10, color: MUTED }}>Registered: {new Date(fwData.registration_date).toLocaleDateString()}</div>}
                        {fwData?.expiration_date && <div style={{ fontSize: 10, color: MUTED }}>Expires: {new Date(fwData.expiration_date).toLocaleDateString()}</div>}
                        {isAdmin && <button onClick={() => setEditingFramework(fw.id)} style={{ ...btnStyle("rgba(255,255,255,0.06)", MUTED), fontSize: 10, padding: "3px 10px", marginTop: 6 }}>Edit</button>}
                      </div>
                    )}
                  </div>
                )}

                {/* View checklist button */}
                {isActive && !fw.always && stats && stats.total > 0 && (
                  <button onClick={() => { setActiveFramework(fw.id); setView("checklist"); setExpandedSection(null); }}
                    style={{ ...btnStyle("rgba(255,255,255,0.06)", OFF_WHITE), fontSize: 11, padding: "6px 12px", marginTop: 12, width: "100%" }}>
                    View Checklist ({stats.total} items)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════
  // CHECKLIST VIEW
  // ════════════════════════════════════════════════════════════
  const renderChecklist = () => {
    const fw = activeFramework;
    if (!fw) return <div style={{ color: MUTED, textAlign: "center", padding: 40 }}>Select a framework from the Frameworks tab</div>;
    const fwMeta = FRAMEWORKS[fw];
    const { topLevel, children } = getSections(fw);
    const stats = frameworkStats[fw] || {};

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>{fwMeta?.label || fw} Checklist</div>
            <div style={{ fontSize: 11, color: MUTED }}>{stats.compliant || 0}/{stats.applicable || 0} compliant ({stats.pct || 0}%)</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <select value={fw} onChange={e => { setActiveFramework(e.target.value); setExpandedSection(null); }} style={{ ...inp, width: "auto", fontSize: 11 }}>
              {Object.entries(FRAMEWORKS).filter(([k]) => k !== "faa_part5" && activeIds.has(k)).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Overall progress */}
        <div style={{ ...card, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: OFF_WHITE }}>Overall Compliance</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: stats.pct >= 80 ? GREEN : stats.pct >= 50 ? AMBER : MUTED }}>{stats.pct || 0}%</span>
          </div>
          <div style={{ width: "100%", height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${stats.pct || 0}%`, height: "100%", background: stats.pct >= 80 ? GREEN : stats.pct >= 50 ? AMBER : RED, borderRadius: 3 }} />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 10, color: MUTED }}>
            <span><span style={{ color: GREEN }}>&#9679;</span> Compliant: {stats.compliant || 0}</span>
            <span><span style={{ color: AMBER }}>&#9679;</span> In Progress: {stats.inProgress || 0}</span>
            <span><span style={{ color: RED }}>&#9679;</span> Non-Compliant: {stats.nonCompliant || 0}</span>
            <span><span style={{ color: MUTED }}>&#9679;</span> Not Started: {stats.notStarted || 0}</span>
          </div>
        </div>

        {/* Sections */}
        {topLevel.map(section => {
          const sectionChildren = children[section.section_number] || [];
          const allItems = [section, ...sectionChildren];
          const sectionCompliant = allItems.filter(i => {
            const s = statusMap[i.id]?.status || "not_started";
            return s === "compliant" || (s === "not_started" && part5AutoSatisfied[i.id]);
          }).length;
          const sectionApplicable = allItems.filter(i => (statusMap[i.id]?.status || "not_started") !== "not_applicable").length;
          const sectionPct = sectionApplicable > 0 ? Math.round((sectionCompliant / sectionApplicable) * 100) : 0;
          const isExpanded = expandedSection === section.section_number;

          return (
            <div key={section.id} style={{ ...card, marginBottom: 8, overflow: "hidden" }}>
              <div onClick={() => setExpandedSection(isExpanded ? null : section.section_number)}
                style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: fwMeta?.color || CYAN, fontWeight: 700, fontFamily: "monospace" }}>{section.section_number}</span>
                  <span style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{section.section_title}</span>
                  <span style={{ fontSize: 10, color: MUTED }}>({sectionCompliant}/{sectionApplicable})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 60, height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${sectionPct}%`, height: "100%", background: sectionPct >= 80 ? GREEN : sectionPct >= 50 ? AMBER : sectionPct > 0 ? RED : MUTED, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sectionPct >= 80 ? GREEN : sectionPct >= 50 ? AMBER : MUTED }}>{sectionPct}%</span>
                  <span style={{ fontSize: 10, color: MUTED }}>{isExpanded ? "▾" : "▸"}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: `1px solid ${BORDER}` }}>
                  {/* Section-level item */}
                  <ChecklistItem item={section} statusMap={statusMap} onUpdate={handleStatusUpdate} isAdmin={isAdmin} fwColor={fwMeta?.color} profile={profile} autoSatisfied={!!part5AutoSatisfied[section.id]} gapGuidance={noP5Crosswalk[section.id] ? GAP_GUIDANCE[`${section.framework}:${section.section_number}`] || null : null} hasNoCrosswalk={!!noP5Crosswalk[section.id]} />
                  {/* Child items */}
                  {sectionChildren.map(child => (
                    <ChecklistItem key={child.id} item={child} statusMap={statusMap} onUpdate={handleStatusUpdate} isAdmin={isAdmin} fwColor={fwMeta?.color} profile={profile} autoSatisfied={!!part5AutoSatisfied[child.id]} gapGuidance={noP5Crosswalk[child.id] ? GAP_GUIDANCE[`${child.framework}:${child.section_number}`] || null : null} hasNoCrosswalk={!!noP5Crosswalk[child.id]} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════
  // CROSSWALK VIEW
  // ════════════════════════════════════════════════════════════
  const renderCrosswalk = () => {
    // Group crosswalk by source section
    const groupedMap = {};
    crosswalk.forEach(cw => {
      const key = cw.source_section;
      if (!groupedMap[key]) groupedMap[key] = { source_framework: cw.source_framework, source_section: cw.source_section, mappings: [] };
      groupedMap[key].mappings.push(cw);
    });
    const grouped = Object.values(groupedMap).sort((a, b) => a.source_section.localeCompare(b.source_section, undefined, { numeric: true }));

    // Find the Part 5 requirement title for a section
    const getPart5Title = (section) => {
      // Match against common Part 5 section numbers
      const sectionMap = {
        "5.21": "Safety Policy", "5.23": "Safety Accountability", "5.25": "Accountable Executive",
        "5.27": "Emergency Response", "5.51": "SRM Applicability", "5.53": "System Analysis / Hazard ID",
        "5.55": "Risk Assessment & Controls", "5.71": "Safety Performance Monitoring",
        "5.73": "Management of Change", "5.75": "Continuous Improvement",
        "5.91": "Safety Training", "5.93": "Safety Communication", "5.17": "System Description / Documentation",
      };
      return sectionMap[section] || section;
    };

    // Determine if a crosswalk mapping is satisfied
    const isSatisfied = (targetFw, targetSection) => {
      const targetItems = (itemsByFramework[targetFw] || []).filter(i => i.section_number === targetSection || i.section_number.startsWith(targetSection + "."));
      if (targetItems.length === 0) return null; // no items to check
      return targetItems.every(i => {
        const s = statusMap[i.id]?.status;
        return s === "compliant" || s === "not_applicable";
      });
    };

    const targetFws = ["icao_annex19", "is_bao", "easa", "transport_canada"].filter(fw => activeIds.has(fw));

    return (
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Compliance Crosswalk</div>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Shows how FAA Part 5 compliance maps to other frameworks. Green = satisfied by current compliance status.</div>

        {targetFws.length === 0 ? (
          <div style={{ ...card, padding: 40, textAlign: "center", color: MUTED }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>No additional frameworks activated</div>
            <div style={{ fontSize: 11 }}>Activate ICAO, IS-BAO, EASA, or Transport Canada from the Frameworks tab.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase", minWidth: 180 }}>FAA Part 5</th>
                  {targetFws.map(fw => (
                    <th key={fw} style={{ textAlign: "center", padding: "10px 12px", color: FRAMEWORKS[fw]?.color || MUTED, fontWeight: 600, fontSize: 10, textTransform: "uppercase", minWidth: 120 }}>
                      {FRAMEWORKS[fw]?.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(row => (
                  <tr key={row.source_section} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ color: CYAN, fontWeight: 700, fontFamily: "monospace", fontSize: 11 }}>&#167; {row.source_section}</div>
                      <div style={{ color: OFF_WHITE, fontSize: 11 }}>{getPart5Title(row.source_section)}</div>
                    </td>
                    {targetFws.map(fw => {
                      const mapping = row.mappings.find(m => m.target_framework === fw);
                      if (!mapping) return <td key={fw} style={{ textAlign: "center", padding: "10px 12px", color: MUTED }}>—</td>;
                      const satisfied = isSatisfied(fw, mapping.target_section);
                      return (
                        <td key={fw} style={{ textAlign: "center", padding: "10px 12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            {satisfied === true && <span style={{ fontSize: 14, color: GREEN }}>&#10003;</span>}
                            {satisfied === false && <span style={{ fontSize: 14, color: AMBER }}>&#9888;</span>}
                            {satisfied === null && <span style={{ fontSize: 14, color: MUTED }}>&#8212;</span>}
                            <span style={{ fontSize: 10, color: OFF_WHITE, fontFamily: "monospace" }}>{mapping.target_section}</span>
                            {mapping.mapping_notes && <span style={{ fontSize: 9, color: MUTED, maxWidth: 140, textAlign: "center" }}>{mapping.mapping_notes.substring(0, 60)}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════
  // EXPORT VIEW
  // ════════════════════════════════════════════════════════════
  const renderExport = () => {
    const exportableFrameworks = Object.entries(FRAMEWORKS).filter(([k]) => k === "faa_part5" || activeIds.has(k));

    const generateReport = (fw) => {
      const fwMeta = FRAMEWORKS[fw];
      const fwItems = itemsByFramework[fw] || [];
      const stats = frameworkStats[fw] || {};
      const fwData = frameworks.find(f => f.framework === fw);

      let text = `COMPLIANCE REPORT: ${fwMeta.label}\n`;
      text += `${"=".repeat(50)}\n`;
      text += `Organization: ${org?.name || "—"}\n`;
      text += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
      text += `Overall Compliance: ${stats.pct || 0}% (${stats.compliant || 0}/${stats.applicable || 0})\n`;
      if (fwData?.registration_status) text += `Registration Status: ${fwData.registration_status}\n`;
      if (fwData?.auditor_name) text += `Auditor: ${fwData.auditor_name}\n`;
      if (fwData?.registration_date) text += `Registration Date: ${fwData.registration_date}\n`;
      if (fwData?.expiration_date) text += `Expiration Date: ${fwData.expiration_date}\n`;
      text += `\n`;

      // Group by parent section
      const topLevel = fwItems.filter(i => !i.parent_section);
      const children = {};
      fwItems.filter(i => i.parent_section).forEach(i => {
        if (!children[i.parent_section]) children[i.parent_section] = [];
        children[i.parent_section].push(i);
      });

      topLevel.forEach(section => {
        text += `\n${section.section_number} ${section.section_title}\n`;
        text += `${"-".repeat(40)}\n`;
        const allItems = [section, ...(children[section.section_number] || [])];
        allItems.forEach(item => {
          const s = statusMap[item.id];
          const rawStatus = s?.status || "not_started";
          const isAutoSat = rawStatus === "not_started" && part5AutoSatisfied[item.id];
          const statusLabel = isAutoSat ? "Covered by FAA Part 5" : (STATUS_OPTIONS.find(o => o.id === rawStatus)?.label || "Not Started");
          text += `  [${statusLabel}] ${item.section_number} - ${item.requirement_text}\n`;
          if (s?.evidence_notes) text += `    Evidence: ${s.evidence_notes}\n`;
          if (s?.reviewed_at) {
            const reviewer = (orgProfiles || []).find(p => p.id === s.reviewed_by)?.full_name || "—";
            text += `    Reviewed: ${new Date(s.reviewed_at).toLocaleDateString()} by ${reviewer}\n`;
          }
        });
      });

      text += `\n${"=".repeat(50)}\n`;
      text += `Summary:\n`;
      text += `  Compliant: ${stats.compliant || 0}\n`;
      text += `  In Progress: ${stats.inProgress || 0}\n`;
      text += `  Non-Compliant: ${stats.nonCompliant || 0}\n`;
      text += `  Not Started: ${stats.notStarted || 0}\n`;
      text += `  N/A: ${stats.na || 0}\n`;

      // Trigger download
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fwMeta.label.replace(/\s+/g, "_")}_Compliance_Report_${new Date().toISOString().split("T")[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Export Compliance Reports</div>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Generate compliance reports suitable for auditors, inspectors, or client due diligence.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {exportableFrameworks.map(([k, fw]) => {
            const stats = frameworkStats[k] || {};
            return (
              <div key={k} style={{ ...card, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginBottom: 4 }}>{fw.label}</div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
                  {stats.pct || 0}% compliant ({stats.compliant || 0}/{stats.applicable || 0} items)
                </div>
                <button onClick={() => generateReport(k)} style={btnStyle("rgba(255,255,255,0.1)", WHITE)}>
                  Export Report
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {tabBtn("frameworks", "Frameworks")}
        {tabBtn("checklist", "Checklist")}
        {tabBtn("crosswalk", "Crosswalk")}
        {tabBtn("export", "Export")}
      </div>

      {view === "frameworks" && renderFrameworks()}
      {view === "checklist" && renderChecklist()}
      {view === "crosswalk" && renderCrosswalk()}
      {view === "export" && renderExport()}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHECKLIST ITEM SUB-COMPONENT
// ════════════════════════════════════════════════════════════
function ChecklistItem({ item, statusMap, onUpdate, isAdmin, fwColor, profile, autoSatisfied, gapGuidance, hasNoCrosswalk }) {
  const [expanded, setExpanded] = useState(false);
  const [templateExpanded, setTemplateExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const s = statusMap[item.id];
  const currentStatus = s?.status || "not_started";
  const showAutoSatisfied = autoSatisfied && currentStatus === "not_started";
  const showGapGuidance = hasNoCrosswalk && !showAutoSatisfied;
  const displayStatus = showAutoSatisfied ? { id: "auto_satisfied", label: "Covered by FAA Part 5", color: GREEN } : (STATUS_OPTIONS.find(o => o.id === currentStatus) || STATUS_OPTIONS[0]);

  useEffect(() => {
    setNotes(s?.evidence_notes || "");
  }, [s]);

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: "10px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: displayStatus.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: fwColor || CYAN, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>{item.section_number}</span>
          <span style={{ fontSize: 12, color: OFF_WHITE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.section_title}</span>
          {showGapGuidance && (
            <span style={{ ...badge(`${AMBER}22`, AMBER), flexShrink: 0 }}>No Part 5 Equivalent</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={badge(`${displayStatus.color}22`, displayStatus.color)}>{displayStatus.label}</span>
          <span style={{ fontSize: 10, color: MUTED }}>{expanded ? "▾" : "▸"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 12px 36px" }}>
          <div style={{ fontSize: 12, color: OFF_WHITE, lineHeight: 1.6, marginBottom: 8 }}>{item.requirement_text}</div>
          {item.guidance_text && (
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, marginBottom: 8, padding: 8, background: DARK, borderRadius: 4, borderLeft: `2px solid ${BORDER}` }}>
              {item.guidance_text}
            </div>
          )}

          {showAutoSatisfied && (
            <div style={{ fontSize: 11, color: GREEN, lineHeight: 1.5, marginBottom: 8, padding: 8, background: `${GREEN}08`, borderRadius: 4, borderLeft: `2px solid ${GREEN}44` }}>
              This item is automatically covered by your FAA Part 5 compliance. You can still set a manual status if needed.
            </div>
          )}

          {/* Gap guidance for items with no Part 5 crosswalk */}
          {showGapGuidance && (
            <div style={{ marginBottom: 8, padding: 10, background: `${AMBER}08`, borderRadius: 6, borderLeft: `2px solid ${AMBER}44` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: AMBER, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>No Direct Part 5 Equivalent</div>
              {gapGuidance ? (
                <>
                  <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.6 }}>{gapGuidance.guidance}</div>
                  {gapGuidance.template && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); setTemplateExpanded(!templateExpanded); }}
                        style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: `${AMBER}15`, border: `1px solid ${AMBER}33`, color: AMBER }}>
                        {templateExpanded ? "Hide" : "Show"} Template Text
                      </button>
                      {templateExpanded && (
                        <pre style={{ marginTop: 8, padding: 12, background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: OFF_WHITE, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace", overflowX: "auto" }}>
                          {gapGuidance.template}
                        </pre>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>This requirement does not have a direct equivalent in FAA Part 5. It must be addressed independently to achieve compliance with this framework.</div>
              )}
            </div>
          )}

          {/* Status + evidence */}
          {isAdmin && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => onUpdate(item.id, opt.id, notes)}
                    style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                      background: currentStatus === opt.id ? `${opt.color}22` : "transparent",
                      border: `1px solid ${currentStatus === opt.id ? opt.color : BORDER}`,
                      color: currentStatus === opt.id ? opt.color : MUTED }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 9, color: MUTED, display: "block", marginBottom: 2 }}>Evidence / Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  onBlur={() => { if (notes !== (s?.evidence_notes || "")) onUpdate(item.id, currentStatus, notes); }}
                  style={{ ...inp, minHeight: 48, resize: "vertical", fontSize: 11 }} placeholder="Document evidence of compliance..." />
              </div>
              {s?.reviewed_at && (
                <div style={{ fontSize: 9, color: MUTED }}>Last reviewed: {new Date(s.reviewed_at).toLocaleDateString()}</div>
              )}
            </div>
          )}

          {!isAdmin && s?.evidence_notes && (
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Evidence: {s.evidence_notes}</div>
          )}
        </div>
      )}
    </div>
  );
}
