-- International Compliance Modules (ICAO Annex 19, IS-BAO, EASA, Transport Canada)
-- Enterprise-tier feature for international standards alignment
-- Run this in the Supabase SQL editor

-- ── compliance_frameworks ──────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  framework TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  registration_status TEXT,
  registration_date DATE,
  expiration_date DATE,
  auditor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, framework)
);

ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_frameworks_select" ON compliance_frameworks
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "compliance_frameworks_insert" ON compliance_frameworks
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "compliance_frameworks_update" ON compliance_frameworks
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "compliance_frameworks_delete" ON compliance_frameworks
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_org ON compliance_frameworks(org_id);

-- ── compliance_checklist_items (global reference table) ─────
CREATE TABLE IF NOT EXISTS compliance_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework TEXT NOT NULL,
  section_number TEXT NOT NULL,
  section_title TEXT NOT NULL,
  requirement_text TEXT NOT NULL,
  guidance_text TEXT,
  parent_section TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE compliance_checklist_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "compliance_checklist_items_select" ON compliance_checklist_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_compliance_checklist_framework ON compliance_checklist_items(framework);

-- ── compliance_status ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES compliance_checklist_items(id),
  status TEXT DEFAULT 'not_started',
  evidence_notes TEXT,
  evidence_file_path TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, checklist_item_id)
);

ALTER TABLE compliance_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_status_select" ON compliance_status
  FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "compliance_status_insert" ON compliance_status
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "compliance_status_update" ON compliance_status
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE POLICY "compliance_status_delete" ON compliance_status
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_compliance_status_org ON compliance_status(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status_item ON compliance_status(checklist_item_id);

-- ── compliance_crosswalk (global reference table) ──────────
CREATE TABLE IF NOT EXISTS compliance_crosswalk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_framework TEXT NOT NULL,
  source_section TEXT NOT NULL,
  target_framework TEXT NOT NULL,
  target_section TEXT NOT NULL,
  mapping_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE compliance_crosswalk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_crosswalk_select" ON compliance_crosswalk
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_compliance_crosswalk_source ON compliance_crosswalk(source_framework);
CREATE INDEX IF NOT EXISTS idx_compliance_crosswalk_target ON compliance_crosswalk(target_framework);


-- ════════════════════════════════════════════════════════════
-- SEED: ICAO ANNEX 19 CHECKLIST ITEMS (~40 items)
-- ════════════════════════════════════════════════════════════

INSERT INTO compliance_checklist_items (framework, section_number, section_title, requirement_text, guidance_text, parent_section, sort_order) VALUES

-- Component 1: Safety Policy and Objectives
('icao_annex19', '1', 'Safety Policy and Objectives', 'The service provider shall establish a safety policy and safety objectives.', 'Component 1 encompasses the management commitment, safety accountabilities, key personnel, ERP coordination, and SMS documentation.', NULL, 100),

('icao_annex19', '1.1', 'Management Commitment', 'Senior management shall define and endorse the safety policy, which shall reflect organizational commitment to safety.', 'The safety policy should be signed by the accountable executive and reflect a commitment to continuous safety improvement, compliance with standards, and provision of resources.', '1', 110),
('icao_annex19', '1.1.1', 'Safety Policy Statement', 'The safety policy shall include a commitment to achieve the highest safety performance, comply with applicable regulations, and promote effective safety reporting.', 'The policy statement should be visible, accessible to all staff, and reviewed periodically.', '1', 111),
('icao_annex19', '1.1.2', 'Safety Policy Communication', 'The safety policy shall be communicated throughout the organization and periodically reviewed for relevance.', 'Use bulletin boards, intranet, briefings, and training to disseminate the policy. Document distribution records.', '1', 112),
('icao_annex19', '1.1.3', 'Non-Punitive Reporting Policy', 'The safety policy shall include a commitment to non-punitive safety reporting, except in cases of gross negligence.', 'Clearly define boundaries between acceptable and unacceptable behavior. Document the just culture policy.', '1', 113),

('icao_annex19', '1.2', 'Safety Accountabilities', 'The organization shall define safety accountabilities for all levels of management and operational personnel.', 'Define and document responsibilities, authorities, and accountabilities for safety. Include in position descriptions.', '1', 120),
('icao_annex19', '1.2.1', 'Accountable Executive', 'An accountable executive shall have overall responsibility and accountability for the SMS and authority over financial/human resources.', 'This person is typically the CEO, President, or Director of Operations. Must have final authority on safety matters.', '1', 121),
('icao_annex19', '1.2.2', 'Safety Responsibilities of Management', 'All managers shall be responsible for the safety performance of their departments and shall be accountable for safety within their areas.', 'Document departmental safety responsibilities in position descriptions and organizational charts.', '1', 122),
('icao_annex19', '1.2.3', 'Safety Committee', 'The organization shall establish a safety committee or safety review board with participation from senior management.', 'Committee should meet regularly, review safety data, set priorities, and allocate resources for safety actions.', '1', 123),

('icao_annex19', '1.3', 'Appointment of Key Safety Personnel', 'The organization shall appoint a qualified safety manager responsible for the implementation and maintenance of the SMS.', 'The safety manager should have appropriate training and experience, direct access to the accountable executive, and adequate resources.', '1', 130),
('icao_annex19', '1.3.1', 'Safety Manager Qualifications', 'The safety manager shall have appropriate training, experience, and competence in safety management.', 'Consider formal SMS training (e.g., ICAO SMS course), aviation experience, and risk management qualifications.', '1', 131),

('icao_annex19', '1.4', 'Emergency Response Planning', 'The organization shall have an emergency response plan coordinated with interfacing organizations.', 'ERP should address notification procedures, resource allocation, continuity of operations, and recovery. Test through regular drills.', '1', 140),
('icao_annex19', '1.4.1', 'ERP Testing and Review', 'The emergency response plan shall be tested through drills and exercises and reviewed periodically.', 'Conduct tabletop or full-scale exercises at least annually. Document lessons learned and update the plan accordingly.', '1', 141),

('icao_annex19', '1.5', 'SMS Documentation', 'The organization shall develop and maintain SMS documentation describing the safety policy, objectives, procedures, and accountabilities.', 'SMS documentation typically includes an SMS Manual, safety policy, organizational charts, procedures, and records management system.', '1', 150),
('icao_annex19', '1.5.1', 'SMS Manual', 'An SMS manual shall be maintained that documents all SMS components and serves as the primary reference.', 'The SMS manual should describe the scope, integration with operations, and be kept current with organizational changes.', '1', 151),
('icao_annex19', '1.5.2', 'Records Management', 'Safety records shall be maintained and retained in accordance with applicable requirements.', 'Establish retention periods, storage methods, and access controls for safety records.', '1', 152),

-- Component 2: Safety Risk Management
('icao_annex19', '2', 'Safety Risk Management', 'The service provider shall develop and maintain safety risk management processes.', 'Component 2 covers hazard identification (reactive, proactive, predictive) and safety risk assessment and mitigation.', NULL, 200),

('icao_annex19', '2.1', 'Hazard Identification', 'The organization shall develop and maintain processes to identify hazards using reactive, proactive, and predictive methods.', 'Reactive: investigation of incidents/accidents. Proactive: safety reporting, audits, surveys. Predictive: data analysis, trend monitoring.', '2', 210),
('icao_annex19', '2.1.1', 'Reactive Hazard Identification', 'Hazards shall be identified through investigation and analysis of past incidents, accidents, and occurrences.', 'Investigate all safety events, identify root causes, and document hazards discovered through investigation.', '2', 211),
('icao_annex19', '2.1.2', 'Proactive Hazard Identification', 'Hazards shall be identified through safety reporting systems, audits, inspections, and safety surveys.', 'Encourage voluntary reporting, conduct regular safety audits, and use operational data to identify hazards before events occur.', '2', 212),
('icao_annex19', '2.1.3', 'Predictive Hazard Identification', 'Hazards shall be identified through analysis of safety data and operational trends to predict future hazards.', 'Use trend analysis, data mining, and performance monitoring to anticipate emerging hazards.', '2', 213),

('icao_annex19', '2.2', 'Safety Risk Assessment and Mitigation', 'The organization shall develop and maintain a process to assess and mitigate safety risks associated with identified hazards.', 'Use a risk matrix combining severity and probability. Define risk tolerability criteria and document risk acceptance decisions.', '2', 220),
('icao_annex19', '2.2.1', 'Risk Analysis', 'Each identified hazard shall be analyzed for severity and probability using a defined risk assessment methodology.', 'Use a standardized risk matrix (e.g., 5x5). Consider worst credible outcome and most realistic probability.', '2', 221),
('icao_annex19', '2.2.2', 'Risk Tolerability', 'The organization shall define criteria for determining whether safety risks are acceptable, tolerable, or intolerable.', 'Document risk tolerability levels (acceptable, tolerable with mitigation, intolerable). Obtain management approval for tolerable risks.', '2', 222),
('icao_annex19', '2.2.3', 'Risk Mitigation', 'Risk controls shall be developed and implemented to reduce intolerable risks to acceptable or tolerable levels.', 'Prioritize elimination, then substitution, engineering controls, administrative controls, and PPE. Document and track all mitigations.', '2', 223),
('icao_annex19', '2.2.4', 'Risk Mitigation Monitoring', 'Implemented risk controls shall be monitored for effectiveness and revised as necessary.', 'Track control effectiveness through follow-up assessments, audits, and performance indicators.', '2', 224),

-- Component 3: Safety Assurance
('icao_annex19', '3', 'Safety Assurance', 'The service provider shall develop and maintain safety assurance processes.', 'Component 3 covers safety performance monitoring, management of change, and continuous improvement.', NULL, 300),

('icao_annex19', '3.1', 'Safety Performance Monitoring and Measurement', 'The organization shall monitor safety performance against safety indicators and targets.', 'Establish SPIs linked to safety objectives. Set alert levels and target levels. Report performance to management.', '3', 310),
('icao_annex19', '3.1.1', 'Safety Performance Indicators', 'The organization shall establish and monitor safety performance indicators (SPIs) to measure safety performance.', 'SPIs should be quantifiable, relevant, and aligned with organizational safety objectives. Examples: incident rates, audit findings, report volumes.', '3', 311),
('icao_annex19', '3.1.2', 'Safety Audits and Assessments', 'The organization shall conduct internal safety audits and assessments at planned intervals.', 'Audit the SMS itself, operational processes, and compliance with procedures. Use qualified, independent auditors where possible.', '3', 312),
('icao_annex19', '3.1.3', 'Safety Reviews', 'Senior management shall conduct periodic safety reviews to evaluate overall safety performance.', 'Reviews should address SPI trends, audit results, hazard/risk status, corrective action effectiveness, and resource adequacy.', '3', 313),

('icao_annex19', '3.2', 'Management of Change', 'The organization shall manage safety risks related to changes to operations, systems, or the organization.', 'Identify changes that could affect safety, assess associated risks before implementation, and monitor after implementation.', '3', 320),
('icao_annex19', '3.2.1', 'Change Identification and Risk Assessment', 'Changes shall be identified and assessed for safety impact before implementation.', 'Consider organizational, operational, procedural, equipment, personnel, and regulatory changes. Document the risk assessment.', '3', 321),

('icao_annex19', '3.3', 'Continuous Improvement of the SMS', 'The organization shall continuously improve the SMS through proactive evaluation and corrective action.', 'Use audit findings, safety data analysis, and industry best practices to identify improvement opportunities.', '3', 330),
('icao_annex19', '3.3.1', 'Internal SMS Evaluation', 'The organization shall periodically evaluate the effectiveness of the SMS and implement improvements.', 'Assess whether the SMS is achieving its objectives, processes are followed, and resources are adequate.', '3', 331),

-- Component 4: Safety Promotion
('icao_annex19', '4', 'Safety Promotion', 'The service provider shall develop and maintain safety promotion activities.', 'Component 4 covers training/education and safety communication.', NULL, 400),

('icao_annex19', '4.1', 'Training and Education', 'The organization shall establish a safety training program for all personnel involved in SMS activities.', 'Training should cover SMS awareness, role-specific responsibilities, hazard reporting, and risk management processes.', '4', 410),
('icao_annex19', '4.1.1', 'SMS Awareness Training', 'All personnel shall receive SMS awareness training appropriate to their safety responsibilities.', 'Cover safety policy, reporting procedures, hazard identification, and the just culture. Include initial and recurrent training.', '4', 411),
('icao_annex19', '4.1.2', 'Role-Specific Safety Training', 'Personnel with SMS responsibilities shall receive training specific to their roles.', 'Safety managers, investigators, auditors, and ERC members should receive specialized training.', '4', 412),

('icao_annex19', '4.2', 'Safety Communication', 'The organization shall establish processes for safety communication to ensure all personnel are aware of the SMS and safety-critical information.', 'Use safety bulletins, newsletters, briefings, and digital platforms. Communicate lessons learned, hazard alerts, and safety performance data.', '4', 420),
('icao_annex19', '4.2.1', 'Safety Information Dissemination', 'Safety-critical information including lessons learned and safety actions shall be disseminated to relevant personnel.', 'Provide feedback to reporters, share investigation outcomes, and communicate changes resulting from safety analysis.', '4', 421),
('icao_annex19', '4.2.2', 'Safety Lessons Learned', 'The organization shall share lessons learned from safety events, investigations, and industry occurrences.', 'Include both internal events and relevant external events. Use case studies in training and briefings.', '4', 422);


-- ════════════════════════════════════════════════════════════
-- SEED: IS-BAO CHECKLIST ITEMS (~60 items)
-- ════════════════════════════════════════════════════════════

INSERT INTO compliance_checklist_items (framework, section_number, section_title, requirement_text, guidance_text, parent_section, sort_order) VALUES

-- Management and Administration
('is_bao', '1', 'Management and Administration', 'The operator shall have an effective management system for business aircraft operations.', 'This section covers organizational structure, management commitment, documentation, and quality management.', NULL, 100),

('is_bao', '1.1', 'Management Commitment', 'Senior management shall demonstrate commitment to safety and compliance through a documented safety policy.', 'The commitment should be evidenced by resource allocation, active participation in safety meetings, and visible leadership.', '1', 110),
('is_bao', '1.2', 'Organizational Structure', 'The operator shall define and document the organizational structure with clear lines of authority and accountability.', 'Include organization chart, position descriptions, and reporting relationships.', '1', 120),
('is_bao', '1.3', 'Accountable Manager', 'An accountable manager shall be designated with authority over operations and resources for safety.', 'This person must have the authority to ensure all operations are conducted safely and with adequate resources.', '1', 130),
('is_bao', '1.4', 'Documentation and Records', 'The operator shall maintain documentation of policies, procedures, and records of safety activities.', 'Establish document control procedures including version control, distribution, and retention.', '1', 140),
('is_bao', '1.5', 'Quality Management', 'The operator shall implement a quality management system to ensure consistency and compliance.', 'Include internal audits, management reviews, and processes for identifying non-conformities.', '1', 150),
('is_bao', '1.6', 'Insurance Coverage', 'The operator shall maintain adequate insurance coverage appropriate to the scope of operations.', 'Review coverage annually; hull, liability, and passenger coverage should meet or exceed regulatory and client requirements.', '1', 160),
('is_bao', '1.7', 'Subcontractor Management', 'The operator shall establish procedures for managing and overseeing subcontracted services.', 'Audit critical subcontractors; maintain agreements that specify safety requirements.', '1', 170),

-- Flight Operations
('is_bao', '2', 'Flight Operations', 'The operator shall conduct flight operations in accordance with applicable regulations and best practices.', 'This section covers operational procedures, crew qualifications, flight planning, and dispatch.', NULL, 200),

('is_bao', '2.1', 'Operations Manual', 'The operator shall develop and maintain a comprehensive operations manual.', 'The manual should include SOPs, limitations, emergency procedures, and be accessible to all crew.', '2', 210),
('is_bao', '2.2', 'Flight Crew Qualifications', 'Flight crew shall meet or exceed minimum qualification and currency requirements.', 'Document training, checkrides, medical certificates, and type ratings. Track expiration dates.', '2', 220),
('is_bao', '2.3', 'Flight Planning and Dispatch', 'Adequate flight planning shall be conducted for every flight including weather, NOTAMs, fuel, and alternates.', 'Use standardized flight planning tools and procedures. Maintain records of flight planning.', '2', 230),
('is_bao', '2.4', 'Crew Resource Management', 'The operator shall implement CRM training for all flight crew members.', 'CRM training should be recurrent and cover communication, workload management, decision-making, and situational awareness.', '2', 240),
('is_bao', '2.5', 'Fatigue Risk Management', 'The operator shall have procedures to manage crew fatigue and duty/rest requirements.', 'Track duty times, provide adequate rest periods, and consider fatigue risk in scheduling decisions.', '2', 250),
('is_bao', '2.6', 'Standard Operating Procedures', 'SOPs shall be established for all phases of flight and ground operations.', 'SOPs should be documented, trained, and monitored for compliance through audits and LOSA.', '2', 260),
('is_bao', '2.7', 'Operational Risk Assessment', 'A flight risk assessment shall be conducted before each flight.', 'Use a standardized risk assessment tool (e.g., FRAT) considering weather, crew, aircraft, and operational factors.', '2', 270),
('is_bao', '2.8', 'CFIT Prevention', 'The operator shall implement procedures and training to prevent controlled flight into terrain.', 'Include TAWS/EGPWS equipment, training on terrain awareness, and stabilized approach criteria.', '2', 280),
('is_bao', '2.9', 'Runway Safety', 'Procedures shall address runway incursion prevention and runway safety awareness.', 'Include ATC communication procedures, surface movement procedures, and hot spot awareness.', '2', 290),

-- Aircraft Maintenance
('is_bao', '3', 'Aircraft Maintenance', 'Aircraft shall be maintained in an airworthy condition in accordance with manufacturer and regulatory requirements.', 'This section covers maintenance programs, personnel, facilities, and continuing airworthiness.', NULL, 300),

('is_bao', '3.1', 'Maintenance Program', 'A maintenance program shall be established in accordance with manufacturer recommendations and regulatory requirements.', 'Include scheduled inspections, unscheduled maintenance procedures, and component life tracking.', '3', 310),
('is_bao', '3.2', 'Maintenance Personnel', 'Maintenance shall be performed by qualified, trained, and authorized personnel.', 'Maintain records of qualifications, training, and authorizations. Ensure ongoing training.', '3', 320),
('is_bao', '3.3', 'Maintenance Records', 'Comprehensive maintenance records shall be maintained for each aircraft.', 'Records should include inspections, repairs, modifications, AD compliance, and component history.', '3', 330),
('is_bao', '3.4', 'MEL/CDL Procedures', 'Procedures shall be established for operation with Minimum Equipment List and Configuration Deviation List items.', 'Ensure crew awareness of deferred items and any operational limitations.', '3', 340),
('is_bao', '3.5', 'Continuing Airworthiness', 'The operator shall ensure continuing airworthiness management for all aircraft.', 'Track ADs, SBs, mandatory modifications, and life-limited components. Maintain airworthiness review processes.', '3', 350),

-- Cabin Safety
('is_bao', '4', 'Cabin Safety', 'The operator shall establish procedures for cabin safety management.', 'Covers cabin crew training, passenger safety, and cabin equipment.', NULL, 400),

('is_bao', '4.1', 'Cabin Safety Procedures', 'Procedures shall be established for passenger briefings, cabin preparation, and emergency evacuation.', 'Include pre-departure briefings, seatbelt and exit demonstrations, and sterile cabin procedures.', '4', 410),
('is_bao', '4.2', 'Emergency Equipment', 'Required emergency and safety equipment shall be properly maintained and accessible.', 'Conduct regular checks of fire extinguishers, first aid kits, life vests, and emergency exits.', '4', 420),
('is_bao', '4.3', 'Cabin Crew Training', 'Cabin crew (if applicable) shall be trained on emergency procedures, first aid, and safety equipment.', 'Training should be initial and recurrent, with documented competency checks.', '4', 430),

-- Security
('is_bao', '5', 'Security', 'The operator shall implement appropriate security measures for operations.', 'Covers aircraft security, personnel screening, and threat assessment.', NULL, 500),

('is_bao', '5.1', 'Security Program', 'A security program appropriate to the scope of operations shall be established.', 'Address aircraft access control, crew identification, and security awareness training.', '5', 510),
('is_bao', '5.2', 'Threat Assessment', 'The operator shall conduct threat assessments for operations in areas of elevated security risk.', 'Monitor advisories from authorities and adjust operations based on current threat levels.', '5', 520),
('is_bao', '5.3', 'Personnel Security', 'Background checks and vetting shall be conducted for personnel with access to aircraft.', 'Maintain records of background checks and establish procedures for granting/revoking access.', '5', 530),

-- Emergency Response
('is_bao', '6', 'Emergency Response', 'The operator shall have an emergency response plan.', 'Covers emergency notification, response procedures, and post-event support.', NULL, 600),

('is_bao', '6.1', 'Emergency Response Plan', 'A documented emergency response plan shall be established and communicated to all personnel.', 'Include notification chains, response procedures, media handling, and family assistance.', '6', 610),
('is_bao', '6.2', 'Emergency Response Training', 'Personnel shall be trained on their roles in the emergency response plan.', 'Conduct regular drills and tabletop exercises. Document participation and lessons learned.', '6', 620),
('is_bao', '6.3', 'Post-Event Support', 'Procedures shall address post-event support for affected personnel and families.', 'Include critical incident stress management, employee assistance programs, and family support protocols.', '6', 630),

-- Safety Management System
('is_bao', '7', 'Safety Management System', 'The operator shall implement a safety management system appropriate to the size and complexity of operations.', 'Covers all four SMS components aligned with ICAO Annex 19 framework.', NULL, 700),

('is_bao', '7.1', 'Safety Policy', 'A safety policy shall be established, endorsed by senior management, and communicated to all personnel.', 'The policy should include management commitment, reporting policy, resource commitment, and just culture principles.', '7', 710),
('is_bao', '7.2', 'Safety Risk Management', 'Processes shall be established for hazard identification, risk assessment, and risk mitigation.', 'Use a combination of reactive, proactive, and predictive methods. Document risk assessments and controls.', '7', 720),
('is_bao', '7.3', 'Safety Assurance', 'Processes shall be established to monitor safety performance and ensure continuous improvement.', 'Include SPIs, internal audits, management reviews, and management of change processes.', '7', 730),
('is_bao', '7.4', 'Safety Promotion', 'The operator shall promote safety awareness through training and communication.', 'Include initial and recurrent SMS training, safety bulletins, and feedback mechanisms for reporters.', '7', 740),
('is_bao', '7.5', 'Safety Reporting', 'A confidential safety reporting system shall be established to collect safety information from all personnel.', 'Reports should be easy to submit, non-punitive (with defined boundaries), and analyzed for trends.', '7', 750),
('is_bao', '7.6', 'Safety Data Analysis', 'Safety data shall be analyzed to identify trends, emerging hazards, and areas for improvement.', 'Use statistical methods where appropriate. Present findings to safety committee and management.', '7', 760),
('is_bao', '7.7', 'Safety Action Tracking', 'Corrective and preventive actions shall be tracked to completion and effectiveness verified.', 'Assign responsibility, set due dates, track status, and verify effectiveness after implementation.', '7', 770),
('is_bao', '7.8', 'Third-Party SMS Audit', 'The operator shall undergo periodic third-party SMS audits (IS-BAO Stage I, II, or III).', 'Stage I: SMS framework established. Stage II: SMS processes producing results. Stage III: SMS mature and self-improving.', '7', 780);


-- ════════════════════════════════════════════════════════════
-- SEED: EASA SMS CHECKLIST ITEMS (~30 items)
-- ════════════════════════════════════════════════════════════

INSERT INTO compliance_checklist_items (framework, section_number, section_title, requirement_text, guidance_text, parent_section, sort_order) VALUES

-- Pillar 1: Safety Policy and Objectives
('easa', '1', 'Safety Policy and Objectives', 'The operator shall establish safety policy and objectives per EU regulation.', 'Based on Commission Regulation (EU) No 965/2012 and EASA acceptable means of compliance.', NULL, 100),

('easa', '1.1', 'Management Commitment', 'The operator shall have a safety policy endorsed by the accountable manager.', 'The policy must reflect the operator''s commitment to safety, be communicated to all employees, and include resource commitment.', '1', 110),
('easa', '1.2', 'Safety Accountabilities', 'Safety responsibilities and accountabilities shall be defined for all levels of management.', 'Document in OM Part A. Include safety action group and safety review board if applicable.', '1', 120),
('easa', '1.3', 'Safety Manager', 'A safety manager shall be appointed as the focal point for SMS development and maintenance.', 'The safety manager should be acceptable to the competent authority and have direct access to the accountable manager.', '1', 130),
('easa', '1.4', 'Emergency Response Planning', 'An emergency response plan shall be established appropriate to the size and scope of operations.', 'Coordinate with ATC, airport authorities, and emergency services. Test through exercises.', '1', 140),
('easa', '1.5', 'SMS Documentation', 'The SMS shall be described in a document (or series of documents) within the management system documentation.', 'May be part of the OM or a standalone SMS manual. Must describe all SMS processes and procedures.', '1', 150),

-- Pillar 2: Safety Risk Management
('easa', '2', 'Safety Risk Management', 'The operator shall implement processes for hazard identification and risk management.', 'Aligns with EASA AMC1 ORO.GEN.200(a)(1)(2)(3).', NULL, 200),

('easa', '2.1', 'Hazard Identification', 'Processes shall be established to identify hazards from all available safety data sources.', 'Include mandatory and voluntary reporting, investigation findings, audits, and external sources.', '2', 210),
('easa', '2.2', 'Risk Assessment', 'Identified hazards shall be assessed using a defined risk assessment methodology.', 'Use a risk matrix with defined severity and probability scales. Document assessment rationale.', '2', 220),
('easa', '2.3', 'Risk Mitigation', 'Risk mitigation measures shall be developed and implemented for intolerable risks.', 'Track implementation and verify effectiveness. Re-assess risk after mitigation.', '2', 230),
('easa', '2.4', 'Internal Safety Reporting', 'A mandatory and voluntary occurrence reporting system shall be implemented.', 'Must comply with EU Regulation 376/2014 on occurrence reporting. Protect reporter identity.', '2', 240),

-- Pillar 3: Safety Assurance
('easa', '3', 'Safety Assurance', 'The operator shall establish safety assurance processes.', 'Covers compliance monitoring, safety performance monitoring, management of change, and continuous improvement.', NULL, 300),

('easa', '3.1', 'Compliance Monitoring', 'The operator shall monitor compliance with regulatory requirements and internal procedures.', 'The compliance monitoring function is a mandatory component of the management system under ORO.GEN.200.', '3', 310),
('easa', '3.2', 'Safety Performance Monitoring', 'Safety performance shall be verified against safety performance indicators and targets.', 'Establish SPIs based on safety objectives. Review performance at management level.', '3', 320),
('easa', '3.3', 'Management of Change', 'The operator shall manage safety risks arising from changes.', 'Assess changes to organization, key personnel, fleet, operations, and procedures for safety impact.', '3', 330),
('easa', '3.4', 'Continuous Improvement', 'The operator shall continuously improve the effectiveness of the management system.', 'Use findings from audits, inspections, investigations, and safety data analysis to drive improvements.', '3', 340),
('easa', '3.5', 'Internal Audit Programme', 'An internal audit programme shall be established covering all management system processes.', 'Audit cycle should cover all areas within a defined period. Auditors must be trained and independent of the areas audited.', '3', 350),

-- Pillar 4: Safety Promotion
('easa', '4', 'Safety Promotion', 'The operator shall establish safety promotion activities.', 'Covers training and safety communication.', NULL, 400),

('easa', '4.1', 'Safety Training', 'All personnel shall receive safety training appropriate to their SMS responsibilities.', 'Include initial and recurrent SMS training. Document training records and competency verification.', '4', 410),
('easa', '4.2', 'Safety Communication', 'Processes shall ensure that all personnel are aware of the SMS and safety-critical information.', 'Use safety bulletins, meetings, intranet, and notice boards. Provide feedback on reported safety issues.', '4', 420),
('easa', '4.3', 'Lessons Learned', 'Safety lessons learned from investigations and occurrences shall be disseminated to relevant personnel.', 'Include both internal and external lessons learned. Use in recurrent training programmes.', '4', 430),

-- EASA-Specific Requirements
('easa', '5', 'EASA-Specific Requirements', 'Additional EASA regulatory requirements for commercial air transport operators.', 'Requirements specific to EASA regulatory framework not covered by the 4-pillar structure.', NULL, 500),

('easa', '5.1', 'Occurrence Reporting (EU 376/2014)', 'The operator shall comply with mandatory and voluntary occurrence reporting requirements under EU Regulation 376/2014.', 'Report to competent authority within 72 hours. Use ECCAIRS taxonomy. Protect reporter identity.', '5', 510),
('easa', '5.2', 'Competent Authority Interface', 'The operator shall maintain effective communication with the competent authority regarding safety matters.', 'Respond to authority communications promptly. Report significant safety issues without delay.', '5', 520),
('easa', '5.3', 'Operations Manual Integration', 'SMS processes shall be integrated into the Operations Manual.', 'OM Part A should reference SMS processes. SMS should not exist as a standalone system disconnected from operations.', '5', 530),
('easa', '5.4', 'Contracted Activities', 'Safety risks from contracted activities shall be managed within the SMS.', 'Assess contractor safety performance. Include safety requirements in contracts. Monitor contractor compliance.', '5', 540);


-- ════════════════════════════════════════════════════════════
-- SEED: TRANSPORT CANADA CHECKLIST ITEMS (~25 items)
-- ════════════════════════════════════════════════════════════

INSERT INTO compliance_checklist_items (framework, section_number, section_title, requirement_text, guidance_text, parent_section, sort_order) VALUES

('transport_canada', '1', 'Safety Management Plan', 'The operator shall develop and implement a safety management plan per CARs 107.', 'Transport Canada SMS requirements based on Canadian Aviation Regulations Part 107.', NULL, 100),

('transport_canada', '1.1', 'Safety Policy', 'A safety policy shall be endorsed by the accountable executive and communicated to all employees.', 'The policy must include commitment to SMS, non-punitive reporting, and resource provision.', '1', 110),
('transport_canada', '1.2', 'Non-Punitive Reporting', 'The safety policy shall include a commitment to non-punitive safety reporting.', 'Clearly define boundaries between non-punitive and punitive situations.', '1', 120),
('transport_canada', '1.3', 'Roles and Responsibilities', 'Safety roles, responsibilities, and accountabilities shall be defined and documented.', 'Include accountable executive, safety manager, and all operational personnel.', '1', 130),
('transport_canada', '1.4', 'Communication Processes', 'Processes shall be established for communicating safety information throughout the organization.', 'Include methods for top-down and bottom-up safety communication.', '1', 140),
('transport_canada', '1.5', 'Safety Planning and Objectives', 'The organization shall establish safety objectives and develop plans to achieve them.', 'Objectives should be measurable and supported by safety performance indicators.', '1', 150),
('transport_canada', '1.6', 'Performance Measurement', 'Safety performance shall be measured against established objectives and indicators.', 'Review performance regularly and take action when targets are not met.', '1', 160),
('transport_canada', '1.7', 'Management Review', 'Senior management shall review SMS effectiveness at planned intervals.', 'Reviews should address safety performance, resource adequacy, and improvement opportunities.', '1', 170),

('transport_canada', '2', 'Documentation', 'The operator shall maintain SMS documentation.', 'Covers documentation requirements specific to Transport Canada.', NULL, 200),
('transport_canada', '2.1', 'SMS Documentation', 'An SMS document shall be maintained describing all components of the SMS.', 'May be standalone or integrated into the company operations manual.', '2', 210),
('transport_canada', '2.2', 'Records Management', 'Safety records shall be maintained, protected, and retained per regulatory requirements.', 'Establish retention periods and access controls for all safety records.', '2', 220),

('transport_canada', '3', 'Safety Oversight', 'The operator shall establish safety oversight processes.', 'Covers reactive and proactive safety data analysis.', NULL, 300),
('transport_canada', '3.1', 'Reactive Processes', 'Processes shall be established for reporting, investigating, and analyzing safety occurrences.', 'Include mandatory reporting to TSB and voluntary internal reporting.', '3', 310),
('transport_canada', '3.2', 'Proactive Processes', 'Proactive processes shall be established for hazard identification and risk assessment.', 'Include safety surveys, audits, trend analysis, and flight data monitoring.', '3', 320),
('transport_canada', '3.3', 'Investigation', 'Safety occurrences shall be investigated to identify causes and contributing factors.', 'Use structured investigation methodologies. Document findings and recommendations.', '3', 330),
('transport_canada', '3.4', 'Risk Management', 'A risk management process shall be applied to identified hazards.', 'Assess severity and probability. Implement controls for intolerable risks.', '3', 340),

('transport_canada', '4', 'Training', 'SMS training shall be provided to all personnel.', 'Covers initial and recurrent SMS training requirements.', NULL, 400),
('transport_canada', '4.1', 'Initial SMS Training', 'All employees shall receive initial SMS awareness training.', 'Cover safety policy, reporting procedures, hazard identification, and individual responsibilities.', '4', 410),
('transport_canada', '4.2', 'Recurrent Training', 'Recurrent SMS training shall be provided at defined intervals.', 'Update personnel on changes to the SMS, lessons learned, and new procedures.', '4', 420),
('transport_canada', '4.3', 'Specialized Training', 'Personnel with specific SMS responsibilities shall receive specialized training.', 'Safety managers, investigators, and auditors require role-specific training.', '4', 430),

('transport_canada', '5', 'Quality Assurance', 'The operator shall establish quality assurance processes for the SMS.', 'Covers internal evaluation and continuous improvement.', NULL, 500),
('transport_canada', '5.1', 'Internal Evaluation', 'The SMS shall be periodically evaluated for effectiveness and compliance.', 'Conduct self-assessments using Transport Canada validation tools.', '5', 510),
('transport_canada', '5.2', 'Continuous Improvement', 'Findings from evaluations shall be used to continuously improve the SMS.', 'Track corrective actions from evaluations and verify effectiveness.', '5', 520);


-- ════════════════════════════════════════════════════════════
-- SEED: COMPLIANCE CROSSWALK
-- Maps FAA Part 5 sections to equivalent ICAO, IS-BAO, and EASA sections
-- ════════════════════════════════════════════════════════════

INSERT INTO compliance_crosswalk (source_framework, source_section, target_framework, target_section, mapping_notes) VALUES

-- Safety Policy mappings
('faa_part5', '5.21', 'icao_annex19', '1.1', 'Safety policy requirements — both require management-endorsed policy with safety objectives'),
('faa_part5', '5.21', 'is_bao', '1.1', 'Safety policy — management commitment and documented policy'),
('faa_part5', '5.21', 'easa', '1.1', 'Safety policy — management commitment per ORO.GEN.200'),
('faa_part5', '5.21', 'transport_canada', '1.1', 'Safety policy endorsement and communication'),

-- Safety Accountabilities
('faa_part5', '5.23', 'icao_annex19', '1.2', 'Safety accountabilities — defined responsibilities for all levels'),
('faa_part5', '5.23', 'is_bao', '1.2', 'Organizational structure with clear accountability'),
('faa_part5', '5.23', 'easa', '1.2', 'Safety responsibilities and accountabilities defined'),
('faa_part5', '5.23', 'transport_canada', '1.3', 'Roles, responsibilities, and accountabilities'),

-- Accountable Executive
('faa_part5', '5.25', 'icao_annex19', '1.2.1', 'Accountable executive designation and responsibilities'),
('faa_part5', '5.25', 'is_bao', '1.3', 'Accountable manager designation'),
('faa_part5', '5.25', 'easa', '1.3', 'Safety manager appointment (EASA requires safety manager, similar role)'),
('faa_part5', '5.25', 'transport_canada', '1.3', 'Accountable executive and safety roles'),

-- Emergency Response Planning
('faa_part5', '5.27', 'icao_annex19', '1.4', 'Emergency response planning and coordination'),
('faa_part5', '5.27', 'is_bao', '6.1', 'Emergency response plan'),
('faa_part5', '5.27', 'easa', '1.4', 'Emergency response planning'),

-- SRM / Hazard Identification
('faa_part5', '5.51', 'icao_annex19', '2.1', 'Hazard identification processes — reactive, proactive, predictive'),
('faa_part5', '5.51', 'is_bao', '7.2', 'Safety risk management processes'),
('faa_part5', '5.51', 'easa', '2.1', 'Hazard identification from safety data'),
('faa_part5', '5.51', 'transport_canada', '3.2', 'Proactive hazard identification'),

-- Risk Assessment
('faa_part5', '5.53', 'icao_annex19', '2.1', 'System analysis and hazard identification in context'),
('faa_part5', '5.53', 'is_bao', '2.7', 'Operational risk assessment'),
('faa_part5', '5.53', 'easa', '2.2', 'Risk assessment methodology'),
('faa_part5', '5.53', 'transport_canada', '3.4', 'Risk management process'),

-- Risk Controls
('faa_part5', '5.55', 'icao_annex19', '2.2', 'Risk assessment and mitigation'),
('faa_part5', '5.55', 'is_bao', '7.7', 'Safety action tracking and corrective actions'),
('faa_part5', '5.55', 'easa', '2.3', 'Risk mitigation measures'),
('faa_part5', '5.55', 'transport_canada', '3.4', 'Risk management and controls'),

-- Safety Performance Monitoring
('faa_part5', '5.71', 'icao_annex19', '3.1', 'Safety performance monitoring and measurement'),
('faa_part5', '5.71', 'is_bao', '7.3', 'Safety assurance and performance monitoring'),
('faa_part5', '5.71', 'easa', '3.2', 'Safety performance monitoring with SPIs'),
('faa_part5', '5.71', 'transport_canada', '1.6', 'Performance measurement against objectives'),

-- Management of Change
('faa_part5', '5.73', 'icao_annex19', '3.2', 'Management of change processes'),
('faa_part5', '5.73', 'is_bao', '7.3', 'Safety assurance includes change management'),
('faa_part5', '5.73', 'easa', '3.3', 'Management of change'),

-- Continuous Improvement
('faa_part5', '5.75', 'icao_annex19', '3.3', 'Continuous improvement of the SMS'),
('faa_part5', '5.75', 'is_bao', '7.3', 'Safety assurance and continuous improvement'),
('faa_part5', '5.75', 'easa', '3.4', 'Continuous improvement of management system'),
('faa_part5', '5.75', 'transport_canada', '5.2', 'Continuous improvement from evaluations'),

-- Safety Training
('faa_part5', '5.91', 'icao_annex19', '4.1', 'Training and education'),
('faa_part5', '5.91', 'is_bao', '7.4', 'Safety promotion and training'),
('faa_part5', '5.91', 'easa', '4.1', 'Safety training for personnel'),
('faa_part5', '5.91', 'transport_canada', '4.1', 'Initial SMS training'),

-- Safety Communication
('faa_part5', '5.93', 'icao_annex19', '4.2', 'Safety communication processes'),
('faa_part5', '5.93', 'is_bao', '7.5', 'Safety reporting system and communication'),
('faa_part5', '5.93', 'easa', '4.2', 'Safety communication'),
('faa_part5', '5.93', 'transport_canada', '1.4', 'Communication processes'),

-- SMS Documentation
('faa_part5', '5.17', 'icao_annex19', '1.5', 'SMS documentation requirements'),
('faa_part5', '5.17', 'is_bao', '1.4', 'Documentation and records management'),
('faa_part5', '5.17', 'easa', '1.5', 'SMS documentation within management system'),
('faa_part5', '5.17', 'transport_canada', '2.1', 'SMS documentation requirements'),

-- Internal Audit / Evaluation
('faa_part5', '5.75', 'icao_annex19', '3.3.1', 'Internal SMS evaluation'),
('faa_part5', '5.75', 'is_bao', '1.5', 'Quality management and internal audits'),
('faa_part5', '5.75', 'easa', '3.5', 'Internal audit programme'),
('faa_part5', '5.75', 'transport_canada', '5.1', 'Internal evaluation of SMS');
