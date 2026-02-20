import { useState, useMemo } from "react";

const BLACK = "#000000", NEAR_BLACK = "#0A0A0A", CARD = "#161616", BORDER = "#232323";
const WHITE = "#FFFFFF", OFF_WHITE = "#D4D4D4", MUTED = "#666666";
const GREEN = "#4ADE80", YELLOW = "#FACC15", AMBER = "#F59E0B", RED = "#EF4444", CYAN = "#22D3EE";

const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };
const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box", fontFamily: "inherit" };

// ══════════════════════════════════════════════════════
// 14 CFR PART 5 SMS MANUAL TEMPLATES
// ══════════════════════════════════════════════════════

const SMS_MANUAL_TEMPLATES = [
  {
    manualKey: "safety_policy",
    title: "Safety Policy",
    description: "Defines the organization's safety objectives, management commitment, and safety reporting framework per 14 CFR Part 5 Subpart B.",
    cfrReferences: ["5.21", "5.23", "5.25"],
    sections: [
      { id: "sp_objectives", title: "Safety Objectives", cfr_ref: "\u00A7 5.21(a)(1)",
        guidance: "Define measurable safety objectives for your organization. Objectives should address operational safety performance targets, hazard identification goals, and safety culture metrics. Example: 'Maintain zero preventable accidents through proactive hazard identification and risk mitigation.'",
        content: "", completed: false },
      { id: "sp_commitment", title: "Management Commitment to Safety", cfr_ref: "\u00A7 5.21(a)(2)",
        guidance: "Document a clear statement from senior management committing to fulfill the safety objectives. This should be a formal declaration signed by the accountable executive that the organization will implement and maintain the SMS.",
        content: "", completed: false },
      { id: "sp_resources", title: "Provision of Resources", cfr_ref: "\u00A7 5.21(a)(3)",
        guidance: "Describe how the organization provides the necessary resources for SMS implementation, including personnel, training, equipment, and financial support. Identify who is responsible for resource allocation decisions.",
        content: "", completed: false },
      { id: "sp_reporting", title: "Safety Reporting Policy", cfr_ref: "\u00A7 5.21(a)(4)",
        guidance: "Define the requirements for employee reporting of safety hazards and issues. Describe the reporting channels available, confidentiality protections, and the organization's commitment to a non-punitive reporting culture.",
        content: "", completed: false },
      { id: "sp_unacceptable", title: "Unacceptable Behavior & Disciplinary Policy", cfr_ref: "\u00A7 5.21(a)(5)",
        guidance: "Clearly define behaviors that are unacceptable and the conditions under which disciplinary action would be taken. Distinguish between honest errors (protected) and willful violations, negligence, or substance abuse (subject to discipline).",
        content: "", completed: false },
      { id: "sp_erp_ref", title: "Emergency Response Plan Reference", cfr_ref: "\u00A7 5.21(a)(6)",
        guidance: "Reference your Emergency Response Plan (ERP) here. Include a brief summary and direct readers to the full ERP manual for detailed procedures. The complete ERP should be maintained as a separate manual.",
        content: "", completed: false },
      { id: "sp_ethics", title: "Code of Ethics", cfr_ref: "\u00A7 5.21(a)(7)",
        guidance: "Document a code of ethics applicable to all employees that clarifies safety as the highest organizational priority. Address integrity in safety reporting, professional conduct, and the expectation that safety will never be compromised for commercial pressure.",
        content: "", completed: false },
      { id: "sp_signature", title: "Accountable Executive Signature Block", cfr_ref: "\u00A7 5.21(b)",
        guidance: "Provide a signature block for the accountable executive to sign and date. The safety policy must be signed by the person designated under \u00A7 5.25 who has ultimate responsibility for the SMS.",
        content: "", completed: false },
      { id: "sp_communication", title: "Policy Communication Plan", cfr_ref: "\u00A7 5.21(c)",
        guidance: "Describe how the safety policy will be documented and communicated throughout the organization. Include methods of distribution (digital, posted, briefings), frequency of communication, and how new employees will receive the policy.",
        content: "", completed: false },
      { id: "sp_review", title: "Policy Review Schedule", cfr_ref: "\u00A7 5.21(d)",
        guidance: "Define the schedule for the accountable executive to review the safety policy for continued relevance and effectiveness. Recommend at least annual review, and after any significant safety event or organizational change.",
        content: "", completed: false },
    ],
  },
  {
    manualKey: "safety_accountability",
    title: "Safety Accountability & Authority",
    description: "Documents the organizational structure, personnel designations, and authority for safety decisions per \u00A7\u00A7 5.23\u20135.25.",
    cfrReferences: ["5.23", "5.25"],
    sections: [
      { id: "sa_exec", title: "Accountable Executive Designation", cfr_ref: "\u00A7 5.25(a)",
        guidance: "Identify the accountable executive by name and title. This person must have control of the resources required for operations and must have financial responsibility. Typically this is the CEO, President, or certificate holder.",
        content: "", completed: false },
      { id: "sa_exec_resp", title: "Accountable Executive Responsibilities", cfr_ref: "\u00A7 5.25(b)",
        guidance: "Document the five specific responsibilities: (1) accountable for SMS implementation, (2) ensure SMS is established and maintained, (3) ensure adequate resources, (4) ensure risk controls are in place, (5) regularly review safety performance.",
        content: "", completed: false },
      { id: "sa_mgmt", title: "Management Personnel Designations", cfr_ref: "\u00A7 5.25(c)",
        guidance: "Identify the management personnel designated to: (1) coordinate SMS across the organization, (2) facilitate hazard identification and risk analysis, (3) monitor risk controls, (4) ensure safety promotion, (5) report to the accountable executive on SMS performance. Include names, titles, and contact information.",
        content: "", completed: false },
      { id: "sa_employee", title: "Employee Accountability Definitions", cfr_ref: "\u00A7 5.23(a)",
        guidance: "Define the safety accountability for all personnel levels: accountable executive, management, supervisors, and line employees. Each level should have specific SMS duties documented, such as hazard reporting, participating in training, and following safety procedures.",
        content: "", completed: false },
      { id: "sa_authority", title: "Authority Documentation", cfr_ref: "\u00A7 5.23(b)",
        guidance: "Document the authority of personnel to make safety decisions. Specify who can approve risk assessments, authorize flights, issue stop-work orders, close corrective actions, and publish safety policies. Include any delegations of authority.",
        content: "", completed: false },
      { id: "sa_org_chart", title: "Organizational Chart", cfr_ref: "\u00A7 5.23",
        guidance: "Include an organizational chart showing the SMS reporting structure. Identify the accountable executive, safety manager, department heads, and their reporting relationships. Show how safety information flows up and down the organization.",
        content: "", completed: false },
    ],
  },
  {
    manualKey: "erp",
    title: "Emergency Response Plan",
    description: "Defines procedures for responding to emergencies including accidents, incidents, and ground emergencies per \u00A7 5.27.",
    cfrReferences: ["5.27"],
    sections: [
      { id: "erp_purpose", title: "Purpose & Scope", cfr_ref: "\u00A7 5.27",
        guidance: "State the purpose of the ERP and define its scope \u2014 which types of emergencies it covers (aircraft accident, serious incident, ground emergency, medical emergency, security threat) and who is responsible for activation.",
        content: "", completed: false },
      { id: "erp_classification", title: "Emergency Classification", cfr_ref: "\u00A7 5.27",
        guidance: "Define emergency categories and severity levels. Examples: Aircraft Accident (NTSB-reportable), Serious Incident, Ground Emergency, Medical Emergency, Security Threat. Specify the response level for each classification.",
        content: "", completed: false },
      { id: "erp_notification", title: "Notification Procedures & Call Tree", cfr_ref: "\u00A7 5.27",
        guidance: "Document the complete notification chain: who is notified first, in what order, and by what method. Include an emergency call tree with current phone numbers. Address NTSB notification (49 CFR 830), FAA notification, insurance, and family/next-of-kin notification procedures.",
        content: "", completed: false },
      { id: "erp_command", title: "Command Structure During Emergencies", cfr_ref: "\u00A7 5.27",
        guidance: "Define the command structure during an emergency. Identify who serves as the Emergency Coordinator, who handles communications, who manages on-scene response, and what happens when primary personnel are unavailable. Include alternates for all key positions.",
        content: "", completed: false },
      { id: "erp_coordination", title: "Interfacing Organization Coordination", cfr_ref: "\u00A7 5.27",
        guidance: "Describe coordination procedures with interfacing organizations: airport authority, ATC, ARFF, local law enforcement, hospitals, NTSB, FAA FSDO, insurance company, and any contract service providers. Include key contacts and pre-arranged agreements.",
        content: "", completed: false },
      { id: "erp_media", title: "Media Relations Procedures", cfr_ref: "\u00A7 5.27",
        guidance: "Designate a media spokesperson and define procedures for media inquiries. Include guidance on what information can be shared, when to defer to NTSB or legal counsel, and how to protect the privacy of those involved.",
        content: "", completed: false },
      { id: "erp_cism", title: "Employee Assistance / CISM", cfr_ref: "\u00A7 5.27",
        guidance: "Describe the Critical Incident Stress Management (CISM) program. Include how employees will receive psychological support after a critical event, available resources (EAP, peer support, professional counseling), and return-to-duty procedures.",
        content: "", completed: false },
      { id: "erp_investigation", title: "Post-Event Investigation Procedures", cfr_ref: "\u00A7 5.27",
        guidance: "Outline procedures for conducting an internal investigation after an emergency. Address evidence preservation, witness interviews, coordination with NTSB/FAA, corrective action development, and how findings feed back into the SMS hazard register.",
        content: "", completed: false },
      { id: "erp_drills", title: "Plan Testing & Drill Schedule", cfr_ref: "\u00A7 5.27",
        guidance: "Define the schedule for testing and exercising the ERP. Include tabletop exercises, partial drills, and full-scale exercises. Recommend at least one tabletop exercise annually and a full exercise every two years. Document lessons learned from each drill.",
        content: "", completed: false },
    ],
  },
  {
    manualKey: "srm",
    title: "Safety Risk Management",
    description: "Describes the processes for hazard identification, risk analysis, risk assessment, and risk control per 14 CFR Part 5 Subpart C.",
    cfrReferences: ["5.51", "5.53", "5.55", "5.57"],
    sections: [
      { id: "srm_applicability", title: "SRM Applicability & Triggers", cfr_ref: "\u00A7 5.51",
        guidance: "Define when Safety Risk Management must be applied: (a) implementation of new systems, (b) revision of existing systems, (c) development of operational procedures, (d) identification of hazards through safety assurance. Include examples relevant to your operation.",
        content: "", completed: false },
      { id: "srm_analysis", title: "System Analysis Process", cfr_ref: "\u00A7 5.53(a)(b)",
        guidance: "Describe how the organization analyzes systems by considering: safety data, operational and design information, organizational changes, and safety recommendations from internal/external sources. Define who participates in system analysis and what tools are used.",
        content: "", completed: false },
      { id: "srm_hazard_id", title: "Hazard Identification Process", cfr_ref: "\u00A7 5.53(c)",
        guidance: "Document the processes used to identify hazards including: employee reporting, flight data analysis, FRAT results, audit findings, industry data, and management observations. Describe how hazards are documented in the hazard register.",
        content: "", completed: false },
      { id: "srm_risk_analysis", title: "Risk Analysis Methodology", cfr_ref: "\u00A7 5.55(a)",
        guidance: "Define the risk analysis methodology used to assess safety risk. Describe the likelihood and severity scales (e.g., 5x5 matrix), how composite risk scores are calculated, and who is responsible for conducting risk analysis.",
        content: "", completed: false },
      { id: "srm_risk_assess", title: "Risk Assessment Criteria & Tolerability Matrix", cfr_ref: "\u00A7 5.55(b)",
        guidance: "Define the risk assessment criteria including the risk tolerability matrix. Specify what risk levels are acceptable, tolerable with mitigation, or unacceptable. Include the FRAT score thresholds and what actions are required at each level.",
        content: "", completed: false },
      { id: "srm_controls", title: "Risk Control Development", cfr_ref: "\u00A7 5.55(c)",
        guidance: "Describe the process for developing safety risk controls. Address the hierarchy of controls (elimination, substitution, engineering, administrative, PPE), how controls are documented, assigned, and tracked through the corrective action system.",
        content: "", completed: false },
      { id: "srm_evaluation", title: "Risk Control Evaluation", cfr_ref: "\u00A7 5.55(d)",
        guidance: "Define the process for evaluating whether proposed risk controls will achieve acceptable safety risk before implementation. Include how residual risk is assessed and who has authority to accept residual risk at various levels.",
        content: "", completed: false },
      { id: "srm_notification", title: "Hazard Notification to Interfacing Parties", cfr_ref: "\u00A7 5.57",
        guidance: "Describe the process for notifying interfacing persons or organizations of identified hazards that they could address or mitigate. Include notification triggers, methods, documentation requirements, and follow-up procedures.",
        content: "", completed: false },
    ],
  },
  {
    manualKey: "safety_assurance",
    title: "Safety Assurance",
    description: "Defines safety performance monitoring, assessment, and continuous improvement processes per 14 CFR Part 5 Subpart D.",
    cfrReferences: ["5.71", "5.73", "5.75"],
    sections: [
      { id: "sa_monitoring", title: "Safety Performance Monitoring Overview", cfr_ref: "\u00A7 5.71(a)",
        guidance: "Provide an overview of the organization's safety performance monitoring program. Describe the data sources, analysis methods, and reporting cadence used to continuously monitor safety performance against objectives.",
        content: "", completed: false },
      { id: "sa_risk_control", title: "Risk Control Effectiveness Monitoring", cfr_ref: "\u00A7 5.71(a)(1)",
        guidance: "Describe how the organization monitors operations, products, and services to verify that safety risk controls are effective. Include inspection schedules, audit programs, and how control failures are detected and escalated.",
        content: "", completed: false },
      { id: "sa_data", title: "Safety Data Acquisition", cfr_ref: "\u00A7 5.71(a)(2)",
        guidance: "Define the safety-related data and information sources used for monitoring. Include FRAT data, flight following records, safety reports, maintenance records, industry safety bulletins, and any flight data monitoring programs.",
        content: "", completed: false },
      { id: "sa_hazard_data", title: "Hazard Identification from Data", cfr_ref: "\u00A7 5.71(a)(3)",
        guidance: "Describe how hazards are identified from acquired safety data. Include trend analysis methods, threshold triggers for investigation, and how data-driven hazard identification feeds into the SRM process.",
        content: "", completed: false },
      { id: "sa_corrective", title: "Corrective Action Monitoring", cfr_ref: "\u00A7 5.71(a)(4)",
        guidance: "Define how corrective actions are monitored and measured. Include tracking methods, due date management, escalation procedures for overdue actions, and how completion effectiveness is verified.",
        content: "", completed: false },
      { id: "sa_continuous", title: "Continuous Information Gathering", cfr_ref: "\u00A7 5.71(a)(5)",
        guidance: "Describe the systems and processes for continuous safety information gathering and analysis. Include real-time monitoring capabilities, periodic data reviews, and how emerging trends are identified.",
        content: "", completed: false },
      { id: "sa_employee_report", title: "Employee Safety Reporting System", cfr_ref: "\u00A7 5.71(a)(7)",
        guidance: "Document the confidential employee safety reporting system. Describe how reports are submitted, processed, investigated, and how feedback is provided to reporters. Address confidentiality and non-punitive protections.",
        content: "", completed: false },
      { id: "sa_assessment", title: "Safety Performance Assessment Process", cfr_ref: "\u00A7 5.73",
        guidance: "Define the process for conducting safety performance assessments. Include assessment frequency (recommend quarterly), who participates, what metrics are reviewed, and how results are reported to the accountable executive.",
        content: "", completed: false },
      { id: "sa_improvement", title: "Continuous Improvement Process", cfr_ref: "\u00A7 5.75",
        guidance: "Describe the process for correcting safety performance deficiencies identified during assessments. Include how improvement actions are prioritized, assigned, tracked, and how their effectiveness is evaluated.",
        content: "", completed: false },
    ],
  },
  {
    manualKey: "safety_promotion",
    title: "Safety Promotion",
    description: "Defines the SMS training program and safety communication processes per 14 CFR Part 5 Subpart E.",
    cfrReferences: ["5.91", "5.93"],
    sections: [
      { id: "prom_training", title: "SMS Training Program", cfr_ref: "\u00A7 5.91",
        guidance: "Describe the overall SMS training program. Define who requires training, what competencies they must achieve, and how training effectiveness is evaluated. Address both initial and recurrent training requirements.",
        content: "", completed: false },
      { id: "prom_initial", title: "Initial SMS Training Requirements", cfr_ref: "\u00A7 5.91",
        guidance: "Define the initial SMS training required for new employees and personnel assuming new SMS duties. Include training content (SMS principles, hazard reporting, risk assessment basics), delivery methods, and completion timeframes.",
        content: "", completed: false },
      { id: "prom_recurrent", title: "Recurrent SMS Training Requirements", cfr_ref: "\u00A7 5.91",
        guidance: "Define recurrent SMS training requirements including frequency (recommend annually), content updates, and how training incorporates lessons learned from recent safety events and organizational changes.",
        content: "", completed: false },
      { id: "prom_awareness", title: "SMS Awareness Communication", cfr_ref: "\u00A7 5.93(a)",
        guidance: "Describe how employees are made aware of SMS policies, processes, and tools relevant to their responsibilities. Include methods such as safety bulletins, briefings, digital distribution, and policy acknowledgment tracking.",
        content: "", completed: false },
      { id: "prom_hazard_comm", title: "Hazard Information Communication", cfr_ref: "\u00A7 5.93(b)",
        guidance: "Define how hazard information relevant to employee responsibilities is communicated. Include notification methods, timing requirements, and how information is tailored to different roles and operational areas.",
        content: "", completed: false },
      { id: "prom_action_comm", title: "Safety Action Communication", cfr_ref: "\u00A7 5.93(c)",
        guidance: "Describe how the organization explains why safety actions have been taken. Include communication channels for corrective actions, policy changes, and operational restrictions, ensuring employees understand the safety rationale.",
        content: "", completed: false },
      { id: "prom_change_comm", title: "Procedure Change Communication", cfr_ref: "\u00A7 5.93(d)",
        guidance: "Define the process for communicating new or changed safety procedures. Include advance notice requirements, training on changes, acknowledgment tracking, and how feedback on changes is collected.",
        content: "", completed: false },
    ],
  },
  {
    manualKey: "org_system_description",
    title: "Organizational System Description",
    description: "Maintains a summary of the organization's operational processes, structure, and regulatory requirements per \u00A7 5.17.",
    cfrReferences: ["5.17"],
    sections: [
      { id: "osd_processes", title: "Operational Processes Description", cfr_ref: "\u00A7 5.17(a)",
        guidance: "Describe the organization's operational processes including flight operations, ground operations, maintenance activities, dispatch/scheduling, and any other processes relevant to safety. Include normal and non-normal procedures.",
        content: "", completed: false },
      { id: "osd_products", title: "Products and Services", cfr_ref: "\u00A7 5.17(b)",
        guidance: "Describe the products and services offered: types of operations (charter, air ambulance, cargo, etc.), aircraft types operated, geographic areas of operation, and any specialized services provided.",
        content: "", completed: false },
      { id: "osd_structure", title: "Organizational Structure", cfr_ref: "\u00A7 5.17(c)",
        guidance: "Describe the organizational structure including departments, reporting relationships, number of employees by function, and locations/bases of operation. Reference the organizational chart in the Safety Accountability manual.",
        content: "", completed: false },
      { id: "osd_interfaces", title: "Interfaces with Other Organizations", cfr_ref: "\u00A7 5.17(d)",
        guidance: "Identify all organizations that interface with your operations: FBOs, maintenance providers, fuel suppliers, charter brokers, codeshare partners, ground handling agents, and regulatory bodies. Describe the nature of each interface and any safety-relevant agreements.",
        content: "", completed: false },
      { id: "osd_regulatory", title: "Applicable Regulatory Requirements", cfr_ref: "\u00A7 5.17(e)",
        guidance: "List all applicable regulatory requirements: 14 CFR Part 135, Part 91, Part 5, Part 43 (maintenance), TSA security requirements, OSHA, DOT hazmat, state regulations, and any additional requirements specific to your operations.",
        content: "", completed: false },
    ],
  },
];

// ══════════════════════════════════════════════════════
// MANUAL EDITOR
// ══════════════════════════════════════════════════════

function ManualEditor({ manual, onSave, onBack }) {
  const [sections, setSections] = useState(manual.sections || []);
  const [status, setStatus] = useState(manual.status || "draft");
  const [version, setVersion] = useState(manual.version || "1.0");
  const [expandedSection, setExpandedSection] = useState(null);
  const [dirty, setDirty] = useState(false);

  const completedCount = sections.filter(s => s.completed).length;
  const pct = sections.length > 0 ? Math.round(completedCount / sections.length * 100) : 0;

  const updateSection = (idx, updates) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, ...updates, lastEdited: new Date().toISOString() } : s));
    setDirty(true);
  };

  const handleSave = () => {
    onSave({ ...manual, sections, status, version });
    setDirty(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", color: MUTED, fontSize: 11 }}>&larr; Back</button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{manual.title}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{manual.cfr_references?.map(r => `\u00A7 ${r}`).join(", ")}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={status} onChange={e => { setStatus(e.target.value); setDirty(true); }}
            style={{ ...inp, width: "auto", padding: "6px 10px", fontSize: 11 }}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <input value={version} onChange={e => { setVersion(e.target.value); setDirty(true); }}
            style={{ ...inp, width: 60, padding: "6px 10px", fontSize: 11, textAlign: "center" }} placeholder="v1.0" />
          <button onClick={handleSave}
            style={{ padding: "6px 16px", background: dirty ? WHITE : BORDER, color: dirty ? BLACK : MUTED, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: dirty ? "pointer" : "default", opacity: dirty ? 1 : 0.5 }}>
            Save
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ ...card, padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>{completedCount} of {sections.length} sections complete</span>
          <span style={{ fontSize: 11, color: WHITE, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: NEAR_BLACK, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : CYAN, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Sections */}
      {sections.map((sec, idx) => {
        const isOpen = expandedSection === sec.id;
        return (
          <div key={sec.id} style={{ ...card, marginBottom: 6, overflow: "hidden" }}>
            <div onClick={() => setExpandedSection(isOpen ? null : sec.id)}
              style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isOpen ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <span style={{ fontSize: 14, color: sec.completed ? GREEN : MUTED, fontWeight: 700, width: 20, textAlign: "center" }}>
                {sec.completed ? "\u2713" : "\u25CB"}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{sec.title}</span>
                <span style={{ fontSize: 10, color: CYAN, marginLeft: 8 }}>{sec.cfr_ref}</span>
              </div>
              <span style={{ fontSize: 12, color: MUTED }}>{isOpen ? "\u25B4" : "\u25BE"}</span>
            </div>

            {isOpen && (
              <div style={{ padding: "0 16px 16px 46px" }}>
                {/* Guidance box */}
                <div style={{ padding: "10px 14px", borderRadius: 6, background: NEAR_BLACK, marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: CYAN, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>FAA Guidance</div>
                  <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.5 }}>{sec.guidance}</div>
                </div>

                {/* Content editor */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Your Procedures</label>
                  <textarea
                    value={sec.content}
                    onChange={e => updateSection(idx, { content: e.target.value })}
                    placeholder="Enter your organization's specific procedures, policies, and documentation for this section..."
                    rows={6}
                    style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                {/* Mark complete toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={() => updateSection(idx, { completed: !sec.completed })}
                    style={{ padding: "5px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                      background: sec.completed ? `${GREEN}22` : "transparent",
                      color: sec.completed ? GREEN : MUTED,
                      border: `1px solid ${sec.completed ? GREEN : BORDER}` }}>
                    {sec.completed ? "\u2713 Completed" : "Mark Complete"}
                  </button>
                  {sec.lastEdited && (
                    <span style={{ fontSize: 9, color: MUTED }}>Last edited: {new Date(sec.lastEdited).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Save button at bottom */}
      {dirty && (
        <button onClick={handleSave}
          style={{ width: "100%", padding: "14px 0", marginTop: 16, background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Save Changes
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════

export default function SmsManuals({ profile, session, smsManuals, onSaveManual, onInitManuals }) {
  const [selectedManual, setSelectedManual] = useState(null);
  const [initializing, setInitializing] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = smsManuals.length;
    let completed = 0, inProgress = 0, notStarted = 0;
    smsManuals.forEach(m => {
      const secs = m.sections || [];
      const done = secs.filter(s => s.completed).length;
      if (done === secs.length && secs.length > 0) completed++;
      else if (done > 0) inProgress++;
      else notStarted++;
    });
    const totalSections = smsManuals.reduce((n, m) => n + (m.sections || []).length, 0);
    const completedSections = smsManuals.reduce((n, m) => n + (m.sections || []).filter(s => s.completed).length, 0);
    const overallPct = totalSections > 0 ? Math.round(completedSections / totalSections * 100) : 0;
    return { total, completed, inProgress, notStarted, totalSections, completedSections, overallPct };
  }, [smsManuals]);

  // Initialize templates
  const handleInit = async () => {
    setInitializing(true);
    await onInitManuals(SMS_MANUAL_TEMPLATES);
    setInitializing(false);
  };

  // Editor view
  if (selectedManual) {
    const manual = smsManuals.find(m => m.id === selectedManual);
    if (!manual) { setSelectedManual(null); return null; }
    return (
      <ManualEditor
        manual={manual}
        onSave={(updated) => { onSaveManual(updated); }}
        onBack={() => setSelectedManual(null)}
      />
    );
  }

  // Empty state
  if (smsManuals.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
        <div style={{ ...card, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>{"\uD83D\uDCD6"}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE, marginBottom: 8 }}>SMS Manual Templates</div>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
            Set up your 14 CFR Part 5 SMS manuals with pre-built templates. Each manual includes section-by-section guidance aligned with FAA requirements that you customize for your operation.
          </div>
          <div style={{ fontSize: 11, color: OFF_WHITE, marginBottom: 20 }}>
            7 manuals will be created: Safety Policy, Safety Accountability, Emergency Response Plan, Safety Risk Management, Safety Assurance, Safety Promotion, and Organizational System Description.
          </div>
          <button onClick={handleInit} disabled={initializing}
            style={{ padding: "14px 32px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: initializing ? "default" : "pointer", opacity: initializing ? 0.5 : 1 }}>
            {initializing ? "Setting up..." : "Set Up SMS Manuals"}
          </button>
        </div>
      </div>
    );
  }

  // Manual list view
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>SMS Manuals</div>
          <div style={{ fontSize: 11, color: MUTED }}>14 CFR Part 5 SMS Documentation Templates</div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
        {[
          { label: "Total Manuals", value: stats.total },
          { label: "Completed", value: stats.completed, dot: GREEN },
          { label: "In Progress", value: stats.inProgress, dot: YELLOW },
          { label: "Not Started", value: stats.notStarted, dot: MUTED },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {s.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div style={{ ...card, padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>Overall Completion</span>
          <span style={{ fontSize: 11, color: WHITE, fontWeight: 700 }}>{stats.overallPct}% ({stats.completedSections}/{stats.totalSections} sections)</span>
        </div>
        <div style={{ height: 8, background: NEAR_BLACK, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${stats.overallPct}%`, height: "100%", background: stats.overallPct === 100 ? GREEN : CYAN, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Manual cards */}
      {smsManuals.map(m => {
        const secs = m.sections || [];
        const done = secs.filter(s => s.completed).length;
        const pct = secs.length > 0 ? Math.round(done / secs.length * 100) : 0;
        const statusColor = m.status === "active" ? GREEN : m.status === "archived" ? MUTED : YELLOW;
        const pctColor = pct === 100 ? GREEN : pct > 0 ? CYAN : MUTED;

        return (
          <div key={m.id} onClick={() => setSelectedManual(m.id)}
            style={{ ...card, padding: "16px 20px", marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s", borderLeft: `3px solid ${pctColor}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{m.title}</span>
                  <span style={{ background: `${statusColor}22`, color: statusColor, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{m.status}</span>
                  <span style={{ background: BORDER, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9 }}>v{m.version}</span>
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>{m.description}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {(m.cfr_references || []).map(r => (
                    <span key={r} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${CYAN}15`, color: CYAN }}>{"\u00A7 " + r}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "center", minWidth: 70 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: pctColor, fontFamily: "Georgia,serif" }}>{pct}%</div>
                <div style={{ fontSize: 9, color: MUTED }}>{done}/{secs.length} sections</div>
                <div style={{ width: 60, height: 4, background: NEAR_BLACK, borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pctColor, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 16, padding: "12px 16px", ...card, background: NEAR_BLACK }}>
        <div style={{ fontSize: 9, color: MUTED, lineHeight: 1.6 }}>
          These manuals provide customizable templates aligned with 14 CFR Part 5 SMS requirements for Part 135 operators.
          Complete each section with your organization's specific procedures, policies, and documentation.
          Completed manuals are automatically reflected in the FAA Part 5 Audit Log compliance checks.
        </div>
      </div>
    </div>
  );
}
