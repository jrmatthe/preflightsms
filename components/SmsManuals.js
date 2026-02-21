import { useState, useMemo, useRef, useEffect, useCallback } from "react";

const BLACK = "#000000", NEAR_BLACK = "#0A0A0A", CARD = "#161616", BORDER = "#232323";
const WHITE = "#FFFFFF", OFF_WHITE = "#D4D4D4", MUTED = "#666666";
const GREEN = "#4ADE80", YELLOW = "#FACC15", AMBER = "#F59E0B", RED = "#EF4444", CYAN = "#22D3EE";

const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };
const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box", fontFamily: "inherit" };

// ══════════════════════════════════════════════════════
// TEMPLATE VARIABLES DEFINITION
// ══════════════════════════════════════════════════════

const TEMPLATE_VARIABLES = [
  { group: "Organization", vars: [
    { key: "Company Name", label: "Company Name" },
    { key: "FSDO Name", label: "Local FSDO Name" },
    { key: "FSDO Phone", label: "FSDO Phone Number" },
    { key: "Principal Inspector Name", label: "FAA Principal Inspector" },
    { key: "Principal Inspector Phone", label: "PI Phone Number" },
    { key: "Insurance Company", label: "Insurance Company" },
    { key: "Insurance Phone", label: "Insurance Phone" },
    { key: "Insurance Policy Number", label: "Insurance Policy Number" },
    { key: "Office Location", label: "Primary Office / Base Location" },
    { key: "Posting Locations", label: "Crew Room / Common Areas" },
    { key: "Certificate Number", label: "Part 135 Certificate Number" },
  ]},
  { group: "Accountable Executive", vars: [
    { key: "Accountable Executive Name", label: "Full Name" },
    { key: "AE Title", label: "Title" },
    { key: "AE Phone", label: "Phone" },
    { key: "AE Email", label: "Email" },
    { key: "AE Alternate Name", label: "Alternate Name" },
    { key: "AE Alternate Title", label: "Alternate Title" },
    { key: "AE Alternate Phone", label: "Alternate Phone" },
    { key: "AE Alternate Email", label: "Alternate Email" },
  ]},
  { group: "Safety Manager", vars: [
    { key: "Safety Manager Name", label: "Full Name" },
    { key: "SM Phone", label: "Phone" },
    { key: "SM Email", label: "Email" },
  ]},
  { group: "Chief Pilot / Dir Ops", vars: [
    { key: "Chief Pilot Name", label: "Full Name" },
    { key: "CP Title", label: "Title" },
    { key: "CP Phone", label: "Phone" },
    { key: "CP Email", label: "Email" },
  ]},
  { group: "Director of Maintenance", vars: [
    { key: "Director of Maintenance Name", label: "Full Name" },
    { key: "DOM Phone", label: "Phone" },
    { key: "DOM Email", label: "Email" },
  ]},
  { group: "Emergency Contacts", vars: [
    { key: "Spokesperson Name", label: "Media Spokesperson" },
    { key: "Family Assistance Coordinator", label: "Family Assistance Coordinator" },
    { key: "HR Contact Name", label: "HR / Admin Contact" },
    { key: "Senior Captain Name", label: "Senior Captain" },
    { key: "Legal Counsel", label: "Legal Counsel / Firm" },
    { key: "Legal Phone", label: "Legal Phone" },
    { key: "EAP Provider Name", label: "EAP Provider Name" },
    { key: "EAP Phone", label: "EAP Phone" },
  ]},
  { group: "Locations & Facilities", vars: [
    { key: "Home Airport", label: "Home Airport (code & name)" },
    { key: "Home Airport Code", label: "Home Airport Code" },
    { key: "City State", label: "City, State" },
    { key: "Facility Address", label: "Facility Address" },
    { key: "Home Base FBO", label: "Home Base FBO" },
    { key: "Crew Records Location", label: "Crew Records Location" },
    { key: "Primary Hospital", label: "Primary Hospital" },
    { key: "Primary Hospital Phone", label: "Primary Hospital Phone" },
    { key: "Alternate Hospital", label: "Alternate Hospital" },
    { key: "Alternate Hospital Phone", label: "Alternate Hospital Phone" },
  ]},
  // Aircraft is handled as a dynamic list, not fixed variables (see TemplateVariablesForm)
  { group: "Operations", vars: [
    { key: "Primary Operating Area", label: "Primary Operating Area" },
    { key: "Approved Areas", label: "Approved Operating Areas" },
    { key: "Total Employees", label: "Total Employees" },
    { key: "Number of Pilots", label: "Number of Pilots" },
    { key: "Number of Maintenance", label: "Number of Maintenance" },
    { key: "Number of Dispatch", label: "Number of Dispatch/Ops" },
    { key: "Number of Admin", label: "Number of Mgmt/Admin" },
    { key: "State", label: "State of Operation" },
  ]},
];

// Utility: replace [Key] placeholders with variable values
function replaceVariables(content, variables) {
  if (!content || !variables) return content;
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    if (key === "_aircraft") continue; // handled separately
    if (value) result = result.replaceAll(`[${key}]`, value);
  }
  // Build aircraft fleet list from dynamic array
  const aircraft = variables._aircraft;
  if (aircraft && aircraft.length > 0) {
    const fleetLines = aircraft.map(a =>
      `- ${a.type || "TBD"} - ${a.reg || "N/A"} - ${a.pax || "N/A"} pax - ${a.range || "N/A"}`
    ).join("\n");
    result = result.replaceAll("[Aircraft Fleet List]", fleetLines);
  }
  return result;
}

// Utility: find unfilled [Placeholder] variables in content
function findUnfilledVariables(content) {
  if (!content) return [];
  const allKeys = new Set(TEMPLATE_VARIABLES.flatMap(g => g.vars.map(v => `[${v.key}]`)));
  const matches = content.match(/\[[A-Z][A-Za-z0-9 \/()#&,.'+-]+\]/g);
  return [...new Set((matches || []).filter(m => allKeys.has(m)))];
}

// ══════════════════════════════════════════════════════
// TEMPLATE VARIABLES FORM
// ══════════════════════════════════════════════════════

function TemplateVariablesForm({ variables, onSave }) {
  const [values, setValues] = useState(variables || {});
  const [expanded, setExpanded] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aircraft, setAircraft] = useState(variables?._aircraft || [{ type: "", reg: "", pax: "", range: "" }]);

  useEffect(() => {
    setValues(variables || {});
    setAircraft(variables?._aircraft || [{ type: "", reg: "", pax: "", range: "" }]);
  }, [variables]);

  const allVars = TEMPLATE_VARIABLES.flatMap(g => g.vars);
  const filledCount = allVars.filter(v => values[v.key]?.trim()).length;
  const aircraftFilled = aircraft.filter(a => a.type?.trim()).length;

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const updateAircraft = (idx, field, value) => {
    setAircraft(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };
  const addAircraft = () => setAircraft(prev => [...prev, { type: "", reg: "", pax: "", range: "" }]);
  const removeAircraft = (idx) => setAircraft(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...values, _aircraft: aircraft });
    setSaving(false);
  };

  return (
    <div style={{ ...card, marginBottom: 16, overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Template Variables</span>
          <span style={{ fontSize: 10, color: filledCount === allVars.length ? GREEN : CYAN, fontWeight: 600 }}>
            {filledCount} of {allVars.length} filled
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: MUTED }}>Fill in once, replaces everywhere</span>
          <span style={{ fontSize: 12, color: MUTED }}>{expanded ? "\u25B4" : "\u25BE"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.5, marginBottom: 12 }}>
            Fill in your organization's details below. Click "Save & Apply" to replace all [bracketed placeholders] throughout your manuals with these values.
          </div>

          {TEMPLATE_VARIABLES.map(group => {
            const isGroupOpen = expandedGroup === group.group;
            const groupFilled = group.vars.filter(v => values[v.key]?.trim()).length;
            return (
              <div key={group.group} style={{ marginBottom: 4 }}>
                <div onClick={() => setExpandedGroup(isGroupOpen ? null : group.group)}
                  style={{ padding: "8px 12px", background: NEAR_BLACK, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE }}>{group.group}</span>
                  <span style={{ fontSize: 9, color: groupFilled === group.vars.length ? GREEN : MUTED }}>{groupFilled}/{group.vars.length} {isGroupOpen ? "\u25B4" : "\u25BE"}</span>
                </div>
                {isGroupOpen && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 4px" }}>
                    {group.vars.map(v => (
                      <div key={v.key}>
                        <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{v.label}</label>
                        <input
                          value={values[v.key] || ""}
                          onChange={e => handleChange(v.key, e.target.value)}
                          placeholder={`[${v.key}]`}
                          style={{ ...inp, padding: "7px 10px", fontSize: 12 }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Dynamic Aircraft Fleet */}
          {(() => {
            const isGroupOpen = expandedGroup === "Aircraft";
            return (
              <div style={{ marginBottom: 4 }}>
                <div onClick={() => setExpandedGroup(isGroupOpen ? null : "Aircraft")}
                  style={{ padding: "8px 12px", background: NEAR_BLACK, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE }}>Aircraft Fleet</span>
                  <span style={{ fontSize: 9, color: aircraftFilled === aircraft.length && aircraftFilled > 0 ? GREEN : MUTED }}>{aircraftFilled} aircraft {isGroupOpen ? "\u25B4" : "\u25BE"}</span>
                </div>
                {isGroupOpen && (
                  <div style={{ padding: "10px 4px" }}>
                    {aircraft.map((a, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 6, marginBottom: 6, alignItems: "end" }}>
                        <div>
                          {idx === 0 && <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Type</label>}
                          <input value={a.type} onChange={e => updateAircraft(idx, "type", e.target.value)} placeholder="e.g. Cessna Citation CJ3" style={{ ...inp, padding: "7px 10px", fontSize: 12 }} />
                        </div>
                        <div>
                          {idx === 0 && <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Registration</label>}
                          <input value={a.reg} onChange={e => updateAircraft(idx, "reg", e.target.value)} placeholder="N12345" style={{ ...inp, padding: "7px 10px", fontSize: 12 }} />
                        </div>
                        <div>
                          {idx === 0 && <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Pax</label>}
                          <input value={a.pax} onChange={e => updateAircraft(idx, "pax", e.target.value)} placeholder="7" style={{ ...inp, padding: "7px 10px", fontSize: 12 }} />
                        </div>
                        <div>
                          {idx === 0 && <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Range</label>}
                          <input value={a.range} onChange={e => updateAircraft(idx, "range", e.target.value)} placeholder="1900nm" style={{ ...inp, padding: "7px 10px", fontSize: 12 }} />
                        </div>
                        <button onClick={() => removeAircraft(idx)} title="Remove"
                          style={{ padding: "7px 10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: MUTED, fontSize: 12, cursor: "pointer", marginTop: idx === 0 ? 17 : 0 }}>
                          &times;
                        </button>
                      </div>
                    ))}
                    <button onClick={addAircraft}
                      style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: CYAN, fontSize: 10, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
                      + Add Aircraft
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          <button onClick={handleSave} disabled={saving}
            style={{ marginTop: 12, padding: "10px 24px", background: CYAN, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: saving ? "default" : "pointer", opacity: saving ? 0.5 : 1 }}>
            {saving ? "Applying..." : "Save & Apply to All Manuals"}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SIGNATURE PAD COMPONENT
// ══════════════════════════════════════════════════════

function SignaturePad({ existingSignature, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!existingSignature?.signature_png);
  const [name, setName] = useState(existingSignature?.name || "");
  const [title, setTitle] = useState(existingSignature?.title || "");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw signature line
    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    // Load existing signature
    if (existingSignature?.signature_png) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existingSignature.signature_png;
    }
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * (canvas.width / rect.width), y: (cy - rect.top) * (canvas.height / rect.height) };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
    setIsEmpty(false);
  }, [getPos]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const endDraw = useCallback(() => setIsDrawing(false), []);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    setIsEmpty(true);
  };

  const save = () => {
    const png = canvasRef.current.toDataURL("image/png");
    onSave({
      name,
      title,
      signature_png: png,
      date_signed: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div style={{ ...card, padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Signature</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" style={{ ...inp, padding: "7px 10px", fontSize: 12 }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ ...inp, padding: "7px 10px", fontSize: 12 }} />
        </div>
      </div>
      <canvas ref={canvasRef} width={600} height={200}
        style={{ width: "100%", height: 150, border: `1px solid ${BORDER}`, borderRadius: 6, cursor: "crosshair", background: "#FFFFFF", touchAction: "none", display: "block" }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <div style={{ fontSize: 11, color: MUTED }}>Date: {existingSignature?.date_signed || new Date().toISOString().split("T")[0]}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={clear} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: MUTED, fontSize: 11, cursor: "pointer" }}>Clear</button>
          <button onClick={save} disabled={isEmpty && !name}
            style={{ padding: "6px 14px", background: isEmpty && !name ? BORDER : WHITE, color: isEmpty && !name ? MUTED : BLACK, border: "none", borderRadius: 4, fontWeight: 700, fontSize: 11, cursor: isEmpty && !name ? "default" : "pointer" }}>
            Save Signature
          </button>
        </div>
      </div>
      {existingSignature?.signature_png && (
        <div style={{ marginTop: 8, fontSize: 10, color: GREEN }}>Signed by {existingSignature.name} on {existingSignature.date_signed}</div>
      )}
    </div>
  );
}

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
        content: "[Company Name] establishes the following safety objectives:\n\n1. Maintain zero preventable accidents and serious incidents through proactive hazard identification and risk mitigation.\n2. Achieve 100% completion of all required safety training within established timeframes for all personnel.\n3. Process and respond to all employee safety reports within 5 business days of submission.\n4. Conduct Flight Risk Assessment Tool (FRAT) evaluations for 100% of revenue and non-revenue flights.\n5. Review and update all identified hazards in the hazard register at least quarterly.\n6. Complete corrective actions within established due dates with a target closure rate of 90% or greater.\n7. Conduct safety performance assessments quarterly, with results briefed to the accountable executive.\n8. Achieve a safety reporting rate of at least 2 voluntary reports per crew member per year, reflecting a healthy safety culture.\n\nThese objectives are reviewed annually by the accountable executive and updated as necessary to reflect changes in operations, regulatory requirements, or organizational priorities.", completed: false },
      { id: "sp_commitment", title: "Management Commitment to Safety", cfr_ref: "\u00A7 5.21(a)(2)",
        guidance: "Document a clear statement from senior management committing to fulfill the safety objectives. This should be a formal declaration signed by the accountable executive that the organization will implement and maintain the SMS.",
        content: "The management of [Company Name] is fully committed to the development, implementation, and continuous improvement of our Safety Management System. We commit to:\n\n- Ensuring that safety is the highest priority in all operational decisions, and that no commercial pressure shall override safety considerations.\n- Providing the resources necessary to implement and maintain the SMS, including qualified personnel, training, equipment, and financial support.\n- Establishing and maintaining safety risk management and safety assurance processes as defined in 14 CFR Part 5.\n- Actively promoting a positive safety culture where all employees feel empowered to report safety concerns without fear of reprisal.\n- Regularly reviewing safety performance data and taking action to address deficiencies.\n- Complying with all applicable regulatory requirements and industry best practices.\n- Continuously improving the effectiveness of the SMS through data-driven decision making.\n\nThis commitment extends to all levels of management, and all managers are expected to demonstrate visible safety leadership in their areas of responsibility.", completed: false },
      { id: "sp_resources", title: "Provision of Resources", cfr_ref: "\u00A7 5.21(a)(3)",
        guidance: "Describe how the organization provides the necessary resources for SMS implementation, including personnel, training, equipment, and financial support. Identify who is responsible for resource allocation decisions.",
        content: "[Company Name] ensures adequate resources are allocated for SMS implementation and maintenance:\n\nPersonnel:\n- A designated Safety Manager serves as the SMS coordinator with dedicated time allocated to safety duties.\n- All management personnel have SMS responsibilities defined in their position descriptions.\n\nTraining:\n- Initial SMS training is provided to all employees within 30 days of hire.\n- Annual recurrent SMS training is budgeted and scheduled for all personnel.\n- Specialized training is provided for safety managers, investigators, and auditors.\n\nEquipment & Technology:\n- PreflightSMS platform is maintained for FRAT submissions, safety reporting, hazard tracking, corrective actions, and compliance monitoring.\n- Safety reference materials and regulatory publications are kept current and accessible.\n\nFinancial:\n- The annual operating budget includes a dedicated line item for SMS activities including training, safety investigations, and corrective action implementation.\n- The accountable executive has authority to approve unbudgeted expenditures for urgent safety matters.\n\nResource Allocation Authority:\n- The accountable executive is responsible for ensuring adequate resource allocation.\n- The Safety Manager may request additional resources through the accountable executive as needed to address identified safety deficiencies.", completed: false },
      { id: "sp_reporting", title: "Safety Reporting Policy", cfr_ref: "\u00A7 5.21(a)(4)",
        guidance: "Define the requirements for employee reporting of safety hazards and issues. Describe the reporting channels available, confidentiality protections, and the organization's commitment to a non-punitive reporting culture.",
        content: "All employees of [Company Name] are required to report safety hazards, incidents, near-misses, and safety concerns. Reporting is a fundamental responsibility of every employee regardless of position.\n\nReporting Channels:\n- PreflightSMS Safety Reports module (preferred method) - accessible to all employees with login credentials.\n- Direct verbal report to the Safety Manager or any member of management.\n- Anonymous reporting option available through the PreflightSMS system for those who prefer not to identify themselves.\n\nWhat to Report:\n- Hazardous conditions or unsafe practices observed during operations.\n- Incidents and accidents, no matter how minor.\n- Near-miss events where an accident was narrowly avoided.\n- Equipment malfunctions or deficiencies that could affect safety.\n- Fatigue concerns, fitness-for-duty issues, or scheduling conflicts.\n- Any condition or situation that could reasonably lead to an accident or injury.\n\nConfidentiality:\n- Reporter identity is protected and shared only on a need-to-know basis for investigation purposes.\n- Confidential reports are available for employees who wish to be identified to the Safety Manager only.\n- Anonymous reports are accepted and investigated to the extent possible.\n\nNon-Punitive Policy:\n- [Company Name] maintains a non-punitive reporting environment. No employee will face disciplinary action for reporting a safety concern in good faith, including reports of their own errors or mistakes.\n- This protection does not extend to willful violations, negligence, or substance abuse as defined in the Unacceptable Behavior section of this policy.\n- Employees who report safety issues are protected from retaliation by any member of the organization.", completed: false },
      { id: "sp_unacceptable", title: "Unacceptable Behavior & Disciplinary Policy", cfr_ref: "\u00A7 5.21(a)(5)",
        guidance: "Clearly define behaviors that are unacceptable and the conditions under which disciplinary action would be taken. Distinguish between honest errors (protected) and willful violations, negligence, or substance abuse (subject to discipline).",
        content: "[Company Name] distinguishes between acceptable and unacceptable behaviors in our just culture framework:\n\nProtected Behaviors (not subject to discipline):\n- Honest errors or mistakes made in the normal course of duties.\n- Unintentional deviations from procedures when acting in good faith.\n- Reporting one's own errors, near-misses, or safety concerns.\n- Decisions made with incomplete information that were reasonable at the time.\n\nUnacceptable Behaviors (subject to disciplinary action):\n- Willful violations: Intentional disregard of established rules, regulations, SOPs, or safety procedures.\n- Gross negligence: Failure to exercise even minimal care or judgment that a reasonable person would exercise.\n- Substance abuse: Operating aircraft or performing safety-sensitive duties while impaired by alcohol, drugs, or medication. Violation of the company drug and alcohol policy or 14 CFR Part 120 requirements.\n- Falsification: Deliberately providing false information on reports, records, applications, or safety documents.\n- Concealment: Intentionally failing to report a known safety hazard, incident, or accident.\n- Retaliation: Taking adverse action against any employee for making a safety report.\n\nDisciplinary Process:\n- Investigations into potential unacceptable behavior are conducted by the Safety Manager with oversight from the accountable executive.\n- Employees are given the opportunity to provide their account before any disciplinary determination.\n- Disciplinary actions may include verbal counseling, written warning, additional training, suspension, or termination depending on severity.\n- All disciplinary actions related to safety are documented and retained in personnel files.", completed: false },
      { id: "sp_erp_ref", title: "Emergency Response Plan Reference", cfr_ref: "\u00A7 5.21(a)(6)",
        guidance: "Reference your Emergency Response Plan (ERP) here. Include a brief summary and direct readers to the full ERP manual for detailed procedures. The complete ERP should be maintained as a separate manual.",
        content: "[Company Name] maintains a comprehensive Emergency Response Plan (ERP) as a separate document within the SMS manual system. The ERP addresses the organization's response to:\n\n- Aircraft accidents and serious incidents (NTSB-reportable events per 49 CFR 830)\n- Non-reportable incidents and ground emergencies\n- Medical emergencies involving crew, passengers, or ground personnel\n- Security threats and unlawful interference\n- Natural disasters affecting operations or facilities\n\nThe ERP defines the notification chain, command structure, coordination with external agencies (NTSB, FAA, law enforcement, hospitals), media relations procedures, and post-event support for affected personnel.\n\nAll employees are required to be familiar with the ERP and their role within it. The ERP is reviewed annually and tested through tabletop exercises. The full Emergency Response Plan is available in the SMS Manuals section of PreflightSMS and in printed form at [Office Location].\n\nSee: Emergency Response Plan manual for complete procedures.", completed: false },
      { id: "sp_ethics", title: "Code of Ethics", cfr_ref: "\u00A7 5.21(a)(7)",
        guidance: "Document a code of ethics applicable to all employees that clarifies safety as the highest organizational priority. Address integrity in safety reporting, professional conduct, and the expectation that safety will never be compromised for commercial pressure.",
        content: "[Company Name] Code of Ethics for Safety:\n\n1. Safety First: Safety is the highest priority in all operations. No schedule, client demand, or financial pressure justifies compromising safety. Every employee has the authority and the obligation to stop an operation they believe is unsafe.\n\n2. Integrity in Reporting: All safety reports, records, and documentation shall be accurate and truthful. Falsification of any safety-related record is grounds for immediate termination.\n\n3. Professional Competence: All personnel shall maintain the qualifications, training, and proficiency required for their duties. No person shall perform duties for which they are not qualified or current.\n\n4. Compliance: All employees shall comply with applicable Federal Aviation Regulations, company procedures, and SMS requirements. When a conflict exists between a procedure and safety, employees shall err on the side of safety and report the conflict.\n\n5. Accountability: Every employee is accountable for their own safety performance and for contributing to the safety of the organization. This includes reporting hazards, participating in safety activities, and following established procedures.\n\n6. Respect and Support: All employees shall treat colleagues with respect, support those who raise safety concerns, and never retaliate against a safety reporter. A healthy safety culture depends on trust and mutual respect.\n\n7. Continuous Learning: All employees shall participate actively in safety training, learn from incidents and near-misses, and apply lessons learned to improve safety performance.\n\nThis code of ethics applies to all employees, contractors, and agents of [Company Name] regardless of position or seniority.", completed: false },
      { id: "sp_signature", title: "Accountable Executive Signature Block", cfr_ref: "\u00A7 5.21(b)",
        guidance: "Provide a signature block for the accountable executive to sign and date. The safety policy must be signed by the person designated under \u00A7 5.25 who has ultimate responsibility for the SMS.",
        content: "This Safety Policy has been reviewed and approved by the undersigned accountable executive of [Company Name]. By signing below, I affirm my commitment to the safety objectives, management commitment, and all provisions contained in this Safety Policy, and I accept ultimate accountability for the Safety Management System.\n\n\nAccountable Executive:\n\nName: _________________________________\n\nTitle: _________________________________\n\nSignature: _____________________________\n\nDate: _________________________________\n\n\nThis policy is effective as of the date signed above and remains in effect until superseded by a revised version. This policy shall be reviewed at least annually or following any significant safety event or organizational change.", completed: false },
      { id: "sp_communication", title: "Policy Communication Plan", cfr_ref: "\u00A7 5.21(c)",
        guidance: "Describe how the safety policy will be documented and communicated throughout the organization. Include methods of distribution (digital, posted, briefings), frequency of communication, and how new employees will receive the policy.",
        content: "The Safety Policy is communicated to all personnel through the following methods:\n\nInitial Distribution:\n- All new employees receive the Safety Policy during onboarding and are required to acknowledge receipt through PreflightSMS within their first week.\n- New hires receive a policy briefing from the Safety Manager or their supervisor as part of initial SMS training.\n\nOngoing Communication:\n- The current Safety Policy is available at all times through the PreflightSMS Policy Library.\n- A printed copy of the Safety Policy is posted in [Posting Locations].\n- The Safety Policy is reviewed during annual recurrent SMS training.\n- Any revisions to the Safety Policy are communicated via email to all employees and require re-acknowledgment in PreflightSMS.\n\nAcknowledgment Tracking:\n- Employee acknowledgment of the Safety Policy is tracked through the PreflightSMS policy acknowledgment system.\n- The Safety Manager monitors acknowledgment completion and follows up with any employees who have not acknowledged within the required timeframe.\n- Acknowledgment records are retained for the duration of employment per 14 CFR 5.97.\n\nContractors and Temporary Personnel:\n- Contractors and temporary personnel who perform safety-sensitive functions are briefed on the Safety Policy and relevant SMS procedures before beginning work.", completed: false },
      { id: "sp_review", title: "Policy Review Schedule", cfr_ref: "\u00A7 5.21(d)",
        guidance: "Define the schedule for the accountable executive to review the safety policy for continued relevance and effectiveness. Recommend at least annual review, and after any significant safety event or organizational change.",
        content: "The accountable executive shall review the Safety Policy for continued relevance and effectiveness on the following schedule:\n\nScheduled Reviews:\n- Annual review: Conducted each January (or anniversary of initial publication). The accountable executive reviews the entire Safety Policy with input from the Safety Manager.\n- The review evaluates whether safety objectives remain appropriate, whether the policy reflects current operations, and whether any regulatory changes require updates.\n\nEvent-Triggered Reviews:\n- Following any aircraft accident or serious incident.\n- Following a significant organizational change (merger, acquisition, new aircraft type, new base of operations, change in certificate scope).\n- Following a change in accountable executive or key safety personnel.\n- When directed by the FAA or as a result of audit findings.\n- When safety performance data indicates the current policy or objectives are not effective.\n\nReview Process:\n1. Safety Manager prepares a review package including safety performance data, regulatory changes, and any proposed revisions.\n2. Accountable executive reviews the package and meets with the Safety Manager to discuss.\n3. Revisions are drafted, reviewed by affected department heads, and approved by the accountable executive.\n4. Updated policy is republished with a new version number and effective date.\n5. All employees are notified of changes and required to acknowledge the updated policy.\n\nReview records including meeting notes, data reviewed, and decisions made are retained per 14 CFR 5.97.", completed: false },
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
        content: "The accountable executive for [Company Name] Safety Management System is:\n\nName: [Accountable Executive Name]\nTitle: [AE Title]\nPhone: [AE Phone]\nEmail: [AE Email]\n\nThis individual holds the Part 135 certificate and has:\n- Full control over the financial and human resources required for flight operations.\n- Authority to allocate funds and personnel for SMS implementation and maintenance.\n- Final decision-making authority on safety matters affecting the organization.\n- Direct oversight of all operational departments.\n\nIn the event the accountable executive is unavailable, the designated alternate is:\n\nName: [AE Alternate Name]\nTitle: [AE Alternate Title]\nPhone: [AE Alternate Phone]\nEmail: [AE Alternate Email]\n\nThe alternate has been delegated authority to make time-critical safety decisions in the absence of the accountable executive.", completed: false },
      { id: "sa_exec_resp", title: "Accountable Executive Responsibilities", cfr_ref: "\u00A7 5.25(b)",
        guidance: "Document the five specific responsibilities: (1) accountable for SMS implementation, (2) ensure SMS is established and maintained, (3) ensure adequate resources, (4) ensure risk controls are in place, (5) regularly review safety performance.",
        content: "Per 14 CFR 5.25(b), the accountable executive has the following responsibilities:\n\n1. SMS Implementation Accountability: The accountable executive is ultimately accountable for the implementation of the SMS throughout all areas of the organization. This includes ensuring all departments participate in SMS processes and that the SMS meets Part 5 requirements.\n\n2. SMS Establishment and Maintenance: The accountable executive ensures the SMS is properly established with all required components (safety policy, SRM, safety assurance, safety promotion) and that it is actively maintained and functional, not merely documented.\n\n3. Adequate Resource Provision: The accountable executive ensures that adequate resources are provided for SMS operations, including dedicated safety personnel, training budgets, safety technology (PreflightSMS), and time for employees to participate in safety activities.\n\n4. Risk Control Oversight: The accountable executive ensures that safety risk controls are developed, implemented, and maintained for identified hazards. This includes reviewing high-risk FRAT assessments, approving risk acceptance decisions, and ensuring corrective actions are completed.\n\n5. Safety Performance Review: The accountable executive regularly reviews safety performance through quarterly safety performance assessments, monthly review of the PreflightSMS dashboard, and direct engagement with the Safety Manager. The accountable executive ensures that safety performance deficiencies are addressed through corrective action.", completed: false },
      { id: "sa_mgmt", title: "Management Personnel Designations", cfr_ref: "\u00A7 5.25(c)",
        guidance: "Identify the management personnel designated to: (1) coordinate SMS across the organization, (2) facilitate hazard identification and risk analysis, (3) monitor risk controls, (4) ensure safety promotion, (5) report to the accountable executive on SMS performance. Include names, titles, and contact information.",
        content: "The following management personnel are designated with SMS responsibilities per 14 CFR 5.25(c):\n\nSafety Manager:\nName: [Safety Manager Name]\nTitle: Safety Manager\nPhone: [SM Phone] | Email: [SM Email]\nResponsibilities: Coordinates SMS across the organization, facilitates hazard identification and risk analysis, manages the hazard register and corrective actions, monitors safety reporting, conducts safety investigations, develops and delivers SMS training, and reports SMS performance to the accountable executive.\n\nDirector of Operations / Chief Pilot:\nName: [Chief Pilot Name]\nTitle: [CP Title]\nPhone: [CP Phone] | Email: [CP Email]\nResponsibilities: Oversees flight operations safety, reviews and approves high-risk FRAT assessments, monitors pilot proficiency and currency, ensures SOP compliance, and supports hazard identification related to flight operations.\n\nDirector of Maintenance:\nName: [Director of Maintenance Name]\nTitle: Director of Maintenance\nPhone: [DOM Phone] | Email: [DOM Email]\nResponsibilities: Manages maintenance safety, monitors MEL compliance, identifies maintenance-related hazards, ensures airworthiness, and reports maintenance safety issues to the Safety Manager.\n\nThese individuals collectively ensure all five SMS management functions are fulfilled. The Safety Manager serves as the primary point of contact for day-to-day SMS operations and reports directly to the accountable executive on SMS matters.", completed: false },
      { id: "sa_employee", title: "Employee Accountability Definitions", cfr_ref: "\u00A7 5.23(a)",
        guidance: "Define the safety accountability for all personnel levels: accountable executive, management, supervisors, and line employees. Each level should have specific SMS duties documented, such as hazard reporting, participating in training, and following safety procedures.",
        content: "Safety accountability is defined for all personnel levels at [Company Name]:\n\nAccountable Executive:\n- Ultimate accountability for SMS implementation and effectiveness.\n- Reviews safety performance quarterly and takes action on deficiencies.\n- Approves the safety policy and ensures adequate resources.\n- Makes final risk acceptance decisions for high-level risks.\n\nSafety Manager:\n- Day-to-day management of all SMS processes.\n- Conducts safety investigations and risk analyses.\n- Maintains the hazard register, corrective action tracker, and safety reports.\n- Delivers SMS training and safety communications.\n- Prepares safety performance reports for the accountable executive.\n\nChief Pilot / Director of Operations:\n- Ensures flight operations comply with safety policies and SOPs.\n- Reviews and approves/rejects high-risk FRAT assessments.\n- Monitors pilot proficiency, currency, and fitness for duty.\n- Supports hazard identification and risk mitigation in flight operations.\n\nAll Pilots and Crew Members:\n- Complete a FRAT assessment before every flight.\n- Report all safety hazards, incidents, near-misses, and concerns promptly.\n- Complete all required SMS training within established timeframes.\n- Follow established SOPs, safety procedures, and risk controls.\n- Exercise stop-work authority when they believe a situation is unsafe.\n\nDispatch / Operations Staff:\n- Monitor active flights through the flight following system.\n- Report scheduling or operational hazards identified during planning.\n- Support risk communication between crews and management.\n\nMaintenance Personnel:\n- Report maintenance-related hazards and safety concerns.\n- Follow approved maintenance procedures and documentation requirements.\n- Complete required SMS and maintenance safety training.", completed: false },
      { id: "sa_authority", title: "Authority Documentation", cfr_ref: "\u00A7 5.23(b)",
        guidance: "Document the authority of personnel to make safety decisions. Specify who can approve risk assessments, authorize flights, issue stop-work orders, close corrective actions, and publish safety policies. Include any delegations of authority.",
        content: "The following safety decision-making authorities are established at [Company Name]:\n\nFlight Authorization:\n- Low/Moderate Risk FRAT scores: PIC is authorized to conduct the flight.\n- High Risk FRAT scores: Requires approval from the Chief Pilot or Director of Operations before departure.\n- Critical Risk FRAT scores: Requires approval from the accountable executive. Flight should not depart without risk mitigation measures in place.\n\nStop-Work Authority:\n- All employees have the authority to stop any operation they believe presents an imminent safety hazard. This authority is absolute and may not be overridden by management.\n- No employee will face adverse consequences for exercising stop-work authority in good faith.\n\nHazard Register Management:\n- Safety Manager: Authority to create, update, and manage hazard entries.\n- Accountable Executive: Authority to accept residual risk and close hazards.\n\nCorrective Action Authority:\n- Safety Manager: Authority to create and assign corrective actions to any department.\n- Department Heads: Authority to implement corrective actions within their area.\n- Accountable Executive: Authority to close corrective actions and verify effectiveness.\n\nPolicy Publication:\n- Safety Manager: Authority to draft and submit policies for review.\n- Accountable Executive: Authority to approve and publish all safety policies.\n\nSafety Investigation:\n- Safety Manager: Authority to initiate and conduct safety investigations.\n- Authority to access all relevant records, interview personnel, and inspect equipment or facilities related to a safety event.", completed: false },
      { id: "sa_org_chart", title: "Organizational Chart", cfr_ref: "\u00A7 5.23",
        guidance: "Include an organizational chart showing the SMS reporting structure. Identify the accountable executive, safety manager, department heads, and their reporting relationships. Show how safety information flows up and down the organization.",
        content: "[Company Name] SMS Organizational Structure:\n\n                    Accountable Executive\n                   [Accountable Executive Name] - [AE Title]\n                            |\n          +-----------------+-----------------+\n          |                 |                 |\n    Safety Manager    Chief Pilot /      Director of\n  [Safety Manager Name]  Dir of Operations   Maintenance\n                     [Chief Pilot Name]   [Director of Maintenance Name]\n          |                 |                 |\n          |           Pilots / Crew     Maintenance\n          |           Dispatchers        Technicians\n          |\n    All Employees\n    (Safety Reporting)\n\nReporting Relationships:\n- The Safety Manager reports directly to the accountable executive on all SMS matters, independent of the operational chain of command. This ensures safety reporting is not filtered through operational management.\n- The Chief Pilot/Director of Operations reports to the accountable executive on operational matters and coordinates with the Safety Manager on safety issues.\n- The Director of Maintenance reports to the accountable executive and coordinates with the Safety Manager on maintenance safety issues.\n- All employees have direct access to the Safety Manager for safety reporting, bypassing the normal chain of command when necessary.\n\nSafety Information Flow:\n- Bottom-up: Safety reports, FRAT data, and hazard observations flow from line employees through the Safety Manager to the accountable executive.\n- Top-down: Safety policies, risk controls, corrective actions, and safety communications flow from the accountable executive through management to all employees.", completed: false },
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
        content: "Purpose:\nThis Emergency Response Plan (ERP) establishes the procedures and responsibilities for [Company Name] personnel in responding to emergencies. The plan is designed to ensure a prompt, effective, and coordinated response that prioritizes the safety and well-being of all persons involved, preserves evidence for investigation, and meets all regulatory notification requirements.\n\nScope:\nThis plan covers the following emergency types:\n- Aircraft accidents (as defined in 49 CFR 830.2)\n- Serious incidents (as defined in 49 CFR 830.5)\n- Non-reportable incidents and abnormal occurrences\n- Ground emergencies (fire, fuel spill, vehicle accident on ramp)\n- In-flight emergencies (engine failure, pressurization loss, medical emergency)\n- Medical emergencies involving crew, passengers, or ground personnel\n- Security threats (bomb threat, unauthorized access, hijacking)\n- Natural disasters affecting operations or facilities\n\nActivation Authority:\n- Any employee who becomes aware of an emergency situation shall immediately initiate the appropriate response actions.\n- The Emergency Coordinator (accountable executive or designee) is responsible for formally activating the full ERP and coordinating the response.\n- The PIC has authority to declare an in-flight emergency and initiate emergency procedures.\n\nThis plan applies to all [Company Name] operations, personnel, and facilities regardless of location.", completed: false },
      { id: "erp_classification", title: "Emergency Classification", cfr_ref: "\u00A7 5.27",
        guidance: "Define emergency categories and severity levels. Examples: Aircraft Accident (NTSB-reportable), Serious Incident, Ground Emergency, Medical Emergency, Security Threat. Specify the response level for each classification.",
        content: "Emergency Classification Levels:\n\nLEVEL 1 - AIRCRAFT ACCIDENT (Highest Response):\nDefinition: An occurrence associated with the operation of an aircraft per 49 CFR 830.2 involving death, serious injury, or substantial aircraft damage.\nResponse: Full ERP activation. NTSB immediate notification required. All response team positions activated. Evidence preservation mandatory. No aircraft components moved except for safety/rescue.\n\nLEVEL 2 - SERIOUS INCIDENT:\nDefinition: An incident per 49 CFR 830.5 requiring NTSB notification (engine failure in flight, in-flight fire, flight control malfunction, runway incursion with collision avoidance, etc.).\nResponse: Full ERP activation. NTSB notification required within specified timeframes. Emergency Coordinator and key response positions activated.\n\nLEVEL 3 - INCIDENT / ABNORMAL OCCURRENCE:\nDefinition: An occurrence that does not meet NTSB reporting criteria but involves operational irregularity, minor damage, or potential for more serious consequences (hard landing without damage, bird strike, minor ground damage, go-around due to unstable approach).\nResponse: Partial ERP activation. Internal notification and investigation. Safety Manager leads response. FAA notification as applicable.\n\nLEVEL 4 - GROUND EMERGENCY:\nDefinition: Fire, fuel spill, vehicle accident, facility damage, or other ground-based emergency.\nResponse: Local emergency services contacted. Internal notification to Safety Manager and accountable executive. Facility evacuation if warranted.\n\nLEVEL 5 - MEDICAL EMERGENCY:\nDefinition: Illness or injury to crew, passenger, or ground personnel requiring medical attention.\nResponse: Emergency medical services contacted. Internal notification. Return-to-duty evaluation for crew members.\n\nLEVEL 6 - SECURITY THREAT:\nDefinition: Bomb threat, unauthorized access, suspicious package, or unlawful interference.\nResponse: Law enforcement contacted immediately. TSA notification as required. Facility evacuation per security plan.", completed: false },
      { id: "erp_notification", title: "Notification Procedures & Call Tree", cfr_ref: "\u00A7 5.27",
        guidance: "Document the complete notification chain: who is notified first, in what order, and by what method. Include an emergency call tree with current phone numbers. Address NTSB notification (49 CFR 830), FAA notification, insurance, and family/next-of-kin notification procedures.",
        content: "IMMEDIATE ACTIONS (within minutes):\n1. Ensure safety of all persons - render aid as able.\n2. Contact local emergency services (911) if not already responding.\n3. Notify the Emergency Coordinator (accountable executive).\n   Primary: [Accountable Executive Name] - [AE Phone]\n   Alternate: [AE Alternate Name] - [AE Alternate Phone]\n\nINTERNAL NOTIFICATIONS (within 1 hour):\n4. Emergency Coordinator notifies:\n   - Safety Manager: [Safety Manager Name] - [SM Phone]\n   - Chief Pilot: [Chief Pilot Name] - [CP Phone]\n   - Director of Maintenance: [Director of Maintenance Name] - [DOM Phone]\n\nREGULATORY NOTIFICATIONS:\n5. NTSB (for accidents and 830.5 incidents):\n   NTSB Response Operations Center: 1-844-373-9922 (24 hours)\n   Notification required IMMEDIATELY for accidents, and within timeframes specified in 49 CFR 830.5 for incidents.\n   Information to provide: operator name, aircraft type/registration, location, nature of event, injuries, extent of damage.\n\n6. FAA Flight Standards District Office (FSDO):\n   [FSDO Name]: [FSDO Phone]\n   Notify within 24 hours or as directed by NTSB.\n\nOTHER NOTIFICATIONS (within 24 hours as applicable):\n7. Insurance Company: [Insurance Company] - [Insurance Phone] - Policy #[Insurance Policy Number]\n8. Legal Counsel: [Legal Counsel] - [Legal Phone]\n9. Airport Authority (if airport involved): Contact local airport operations.\n\nFAMILY / NEXT-OF-KIN NOTIFICATION:\n- Family notification is made by the accountable executive or designee only, never by unauthorized personnel.\n- Notification is made in person when possible, with a support person present.\n- No information about the event is released to families until facts are confirmed.\n- Crew emergency contact information is maintained in [Crew Records Location].\n\nThis call tree is reviewed and updated quarterly. All personnel listed above carry their contact information current in PreflightSMS.", completed: false },
      { id: "erp_command", title: "Command Structure During Emergencies", cfr_ref: "\u00A7 5.27",
        guidance: "Define the command structure during an emergency. Identify who serves as the Emergency Coordinator, who handles communications, who manages on-scene response, and what happens when primary personnel are unavailable. Include alternates for all key positions.",
        content: "Emergency Command Structure:\n\nEmergency Coordinator (overall command):\nPrimary: [Accountable Executive Name]\nAlternate: [AE Alternate Name]\nResponsibilities: Activates ERP, directs overall response, makes key decisions, authorizes external communications, coordinates with regulatory agencies.\n\nSafety/Investigation Lead:\nPrimary: [Safety Manager Name]\nAlternate: [Chief Pilot Name]\nResponsibilities: Leads internal investigation, preserves evidence, coordinates with NTSB investigators, documents findings, initiates corrective actions.\n\nOperations Lead:\nPrimary: [Chief Pilot Name]\nAlternate: [Senior Captain Name]\nResponsibilities: Manages operational response (aircraft recovery, flight cancellations, crew reassignment), coordinates with ATC and airport operations, ensures continuity of operations.\n\nCommunications Lead:\nPrimary: [Spokesperson Name]\nAlternate: [Accountable Executive Name]\nResponsibilities: Handles all media inquiries, prepares official statements, coordinates family notifications, manages internal communications to employees.\n\nFamily Assistance Coordinator:\nPrimary: [Family Assistance Coordinator]\nAlternate: [HR Contact Name]\nResponsibilities: Coordinates family notifications, arranges travel/lodging for families, serves as family liaison, coordinates CISM support.\n\nSuccession:\nIf the primary person for any role is unavailable, the alternate assumes that role immediately without waiting for authorization. If both primary and alternate are unavailable, the Emergency Coordinator assigns the role to the most qualified available person.", completed: false },
      { id: "erp_coordination", title: "Interfacing Organization Coordination", cfr_ref: "\u00A7 5.27",
        guidance: "Describe coordination procedures with interfacing organizations: airport authority, ATC, ARFF, local law enforcement, hospitals, NTSB, FAA FSDO, insurance company, and any contract service providers. Include key contacts and pre-arranged agreements.",
        content: "Interfacing Organization Contacts and Coordination:\n\nAirport Authority / Operations:\n- [Home Airport] Operations: Contact local airport operations.\n- Coordination: Airport emergency plan activation, runway/ramp closures, wreckage removal.\n\nAircraft Rescue & Firefighting (ARFF):\n- Local ARFF / Fire Department: 911\n- Coordination: Aircraft familiarization briefings provided annually. Hazmat information (fuel type, oxygen bottles) shared.\n\nLocal Law Enforcement:\n- Local law enforcement: 911\n- Coordination: Scene security, traffic control, witness management.\n\nHospitals / Medical:\n- Primary: [Primary Hospital] - [Primary Hospital Phone]\n- Alternate: [Alternate Hospital] - [Alternate Hospital Phone]\n\nNTSB:\n- Response Operations Center: 1-844-373-9922\n- Coordination: Immediate notification for accidents. Do not disturb wreckage except for rescue. Provide full cooperation with investigators.\n\nFAA FSDO:\n- [FSDO Name]: [FSDO Phone]\n- Principal Inspector: [Principal Inspector Name] - [Principal Inspector Phone]\n- Coordination: Notification of events, certificate actions, return-to-service coordination.\n\nInsurance:\n- [Insurance Company]: [Insurance Phone]\n- Policy Number: [Insurance Policy Number]\n- Coordination: Notify within 24 hours of any event involving damage or injury.\n\nLegal Counsel:\n- [Legal Counsel]: [Legal Phone]\n- Coordination: Consult before releasing official statements on accidents.\n\nFBO / Ground Handling:\n- [Home Base FBO]\n\nAll contact numbers are verified quarterly and updated immediately when changes occur.", completed: false },
      { id: "erp_media", title: "Media Relations Procedures", cfr_ref: "\u00A7 5.27",
        guidance: "Designate a media spokesperson and define procedures for media inquiries. Include guidance on what information can be shared, when to defer to NTSB or legal counsel, and how to protect the privacy of those involved.",
        content: "Designated Spokesperson:\nPrimary: [Spokesperson Name]\nAlternate: [Accountable Executive Name]\n\nMedia Procedures:\n- Only the designated spokesperson is authorized to communicate with the media. All media inquiries received by any employee must be immediately directed to the spokesperson.\n- No employee shall post, share, or discuss details of an emergency on social media or with unauthorized persons.\n\nApproved Information for Release:\n- Confirmation that an event occurred, in general terms.\n- Type of aircraft involved (after next-of-kin notification).\n- Number of persons on board (after next-of-kin notification).\n- General location of the event.\n- Statement that the company is cooperating fully with investigators.\n\nInformation NOT to be Released:\n- Names of crew or passengers until next-of-kin have been notified and at least 24 hours have passed.\n- Speculation about cause, fault, or contributing factors.\n- Cockpit voice recorder or flight data recorder information.\n- Details of the investigation.\n- Photographs of the accident scene, aircraft damage, or victims.\n\nWhen NTSB is Investigating:\n- Defer all questions about cause and investigation status to the NTSB.\n- Coordinate any public statements with the NTSB party coordinator.\n- The company may issue factual statements about its own response actions.\n\nPrepared Statement Template:\n\"[Company Name] confirms that [aircraft type] [registration] was involved in [general description] at [general location] on [date]. [Number] persons were aboard. Our immediate concern is for the safety and well-being of all those involved. We are cooperating fully with [NTSB/FAA/authorities] in their investigation. We will provide additional information as it becomes available.\"", completed: false },
      { id: "erp_cism", title: "Employee Assistance / CISM", cfr_ref: "\u00A7 5.27",
        guidance: "Describe the Critical Incident Stress Management (CISM) program. Include how employees will receive psychological support after a critical event, available resources (EAP, peer support, professional counseling), and return-to-duty procedures.",
        content: "[Company Name] provides Critical Incident Stress Management (CISM) support following any significant safety event.\n\nImmediate Response (0-24 hours):\n- Crew members involved in a significant event are immediately relieved of duty.\n- The Family Assistance Coordinator or Safety Manager contacts affected personnel to assess immediate needs.\n- A defusing session (brief, informal group discussion) may be offered within the first 24 hours.\n\nShort-Term Support (1-7 days):\n- A formal Critical Incident Stress Debriefing (CISD) is offered within 72 hours, facilitated by a qualified CISM professional.\n- Individual counseling is made available through the Employee Assistance Program (EAP).\n- EAP Contact: [EAP Provider Name] - [EAP Phone] - Available 24/7. Confidential. No cost to employees.\n\nOngoing Support:\n- Follow-up check-ins with affected personnel at 1 week, 1 month, and 3 months post-event.\n- Continued access to EAP counseling services for as long as needed.\n- Peer support from trained company personnel is available.\n\nReturn-to-Duty:\n- Crew members involved in a significant event must be evaluated for fitness before returning to flight duties.\n- Return-to-duty is authorized by the Chief Pilot in consultation with the Safety Manager.\n- A return-to-duty flight with a check airman may be required.\n- Medical evaluation may be required if physical or psychological fitness is in question.\n- The employee's privacy is protected throughout the return-to-duty process.\n\nAll CISM activities are voluntary. No employee is compelled to participate, but participation is strongly encouraged. CISM records are confidential and maintained separately from personnel files.", completed: false },
      { id: "erp_investigation", title: "Post-Event Investigation Procedures", cfr_ref: "\u00A7 5.27",
        guidance: "Outline procedures for conducting an internal investigation after an emergency. Address evidence preservation, witness interviews, coordination with NTSB/FAA, corrective action development, and how findings feed back into the SMS hazard register.",
        content: "Internal Investigation Procedures:\n\nEvidence Preservation:\n- Do not move, alter, or disturb the aircraft or wreckage except as necessary for rescue or safety, per 49 CFR 830.10.\n- Photograph and document the scene as soon as safely possible.\n- Secure the cockpit - do not move switches, controls, or instruments.\n- Preserve all flight records, FRAT forms, weather briefings, fuel receipts, maintenance logs, and communications.\n- Secure any electronic devices (tablets, phones, GPS units) that may contain relevant data.\n- Restrict access to the scene to authorized personnel only.\n\nInvestigation Process:\n1. The Safety Manager initiates the internal investigation immediately following the event.\n2. If NTSB is investigating, coordinate all investigation activities with the NTSB investigator-in-charge. The company investigation runs parallel but does not interfere with the NTSB investigation.\n3. Conduct witness interviews as soon as practical. Document statements in writing. Interviews are fact-finding, not fault-finding.\n4. Gather and review all relevant documentation.\n5. Analyze contributing factors using a systematic method (e.g., HFACS, Reason Model, or 5-Why analysis).\n6. Identify root causes and contributing factors.\n7. Develop corrective actions to prevent recurrence.\n\nReporting:\n- An internal investigation report is completed within 30 days of the event.\n- The report includes factual information, analysis, findings, and corrective action recommendations.\n- The report is reviewed by the accountable executive.\n\nSMS Integration:\n- Hazards identified during the investigation are entered into the PreflightSMS hazard register.\n- Corrective actions are entered into the corrective action tracker with assigned owners and due dates.\n- Lessons learned are communicated to all relevant personnel through safety communications.\n- Investigation findings are incorporated into training programs as applicable.", completed: false },
      { id: "erp_drills", title: "Plan Testing & Drill Schedule", cfr_ref: "\u00A7 5.27",
        guidance: "Define the schedule for testing and exercising the ERP. Include tabletop exercises, partial drills, and full-scale exercises. Recommend at least one tabletop exercise annually and a full exercise every two years. Document lessons learned from each drill.",
        content: "ERP Testing and Exercise Schedule:\n\nQuarterly - Call Tree Verification:\n- Verify all emergency contact numbers are current and functional.\n- Update the call tree for any personnel changes.\n- Confirm external agency contact information is accurate.\n\nAnnually - Tabletop Exercise:\n- Conduct a tabletop exercise involving all key response personnel.\n- Present a realistic scenario and walk through the ERP step by step.\n- Evaluate decision-making, communication, and coordination.\n- Identify gaps, confusion, or areas for improvement.\n- Document lessons learned and update the ERP as needed.\n\nEvery Two Years - Functional Exercise:\n- Conduct a functional exercise simulating an actual emergency response.\n- Activate the call tree, set up command structure, and practice coordination with at least one external agency.\n- Test communications equipment and backup procedures.\n- Evaluate response times, role clarity, and information flow.\n\nAfter Each Exercise:\n1. Conduct a hot debrief immediately following the exercise.\n2. Document observations, strengths, and areas for improvement.\n3. Develop corrective actions for identified deficiencies.\n4. Update the ERP to address lessons learned.\n5. Communicate changes to all personnel.\n\nExercise Records:\n- Exercise date, type, scenario, and participants.\n- Observations and findings.\n- Corrective actions taken.\n- ERP revisions resulting from the exercise.\n\nAll exercise records are retained for a minimum of 5 years per 14 CFR 5.97.", completed: false },
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
        content: "Safety Risk Management (SRM) shall be applied whenever the following conditions exist:\n\n(a) Implementation of New Systems:\n- Addition of a new aircraft type to the fleet.\n- New avionics or equipment installations.\n- New software, technology, or operational tools.\n- Opening a new base of operations or adding new routes.\n- Engaging new service providers (maintenance, fueling, ground handling).\n\n(b) Revision of Existing Systems:\n- Modification to existing aircraft systems or configurations.\n- Changes to dispatch or scheduling systems.\n- Upgrades or changes to communication or navigation equipment.\n- Changes to facility layout, ramp procedures, or ground operations.\n\n(c) Development of Operational Procedures:\n- New or revised Standard Operating Procedures (SOPs).\n- Changes to company minimums, weather policies, or flight planning procedures.\n- New passenger handling, cargo, or ground procedures.\n- Changes to crew scheduling, rest, or duty time policies.\n\n(d) Hazards Identified Through Safety Assurance:\n- Hazards identified from safety reports, FRAT data analysis, or trend monitoring.\n- Recurring issues identified in corrective action tracking.\n- Hazards identified through audits, inspections, or regulatory findings.\n- Industry events or safety bulletins relevant to our operations.\n\nThe Safety Manager is responsible for identifying when SRM is required and initiating the process. Any employee may recommend that SRM be applied by submitting a safety report or contacting the Safety Manager.", completed: false },
      { id: "srm_analysis", title: "System Analysis Process", cfr_ref: "\u00A7 5.53(a)(b)",
        guidance: "Describe how the organization analyzes systems by considering: safety data, operational and design information, organizational changes, and safety recommendations from internal/external sources. Define who participates in system analysis and what tools are used.",
        content: "System analysis is conducted by the Safety Manager with input from subject matter experts. The analysis considers:\n\nSafety Data Sources:\n- PreflightSMS FRAT submission history and risk score trends.\n- Safety report database (incidents, near-misses, hazard reports).\n- Hazard register and corrective action status.\n- Flight following data and overdue event history.\n- Crew currency and training compliance records.\n\nOperational and Design Information:\n- Aircraft flight manuals and performance data.\n- Standard Operating Procedures and checklists.\n- Maintenance records, MEL status, and airworthiness directives.\n- Airport/route information, NOTAMs, and operational limitations.\n\nOrganizational Factors:\n- Staffing levels and workload indicators.\n- Recent personnel changes, especially in key positions.\n- Operational tempo and scheduling pressures.\n- Financial or resource constraints that may affect safety.\n\nExternal Sources:\n- FAA safety alerts, InFO, and SAFO publications.\n- NTSB recommendations and investigation findings.\n- Industry safety data from ASAP, ASRS, and trade organizations.\n- Manufacturer service bulletins and safety communications.\n\nParticipants:\n- Safety Manager leads the analysis.\n- Chief Pilot provides operational expertise.\n- Director of Maintenance provides maintenance/airworthiness input.\n- Line pilots and crew members provide frontline perspective.\n- Accountable executive participates for significant changes.\n\nThe output of system analysis is documented and feeds directly into the hazard identification process.", completed: false },
      { id: "srm_hazard_id", title: "Hazard Identification Process", cfr_ref: "\u00A7 5.53(c)",
        guidance: "Document the processes used to identify hazards including: employee reporting, flight data analysis, FRAT results, audit findings, industry data, and management observations. Describe how hazards are documented in the hazard register.",
        content: "[Company Name] uses the following methods to identify hazards:\n\nReactive Methods (after an event):\n- Safety report investigation: All submitted safety reports (incidents, near-misses, concerns) are reviewed for underlying hazards.\n- Accident/incident investigation findings.\n- Corrective action reviews that reveal systemic issues.\n\nProactive Methods (before an event):\n- FRAT Analysis: FRAT submissions are reviewed for recurring high-risk factors. Patterns in elevated scores indicate emerging hazards.\n- Safety audits and inspections conducted per the audit schedule.\n- Management safety observations during line operations.\n- Facility and equipment inspections.\n- Review of maintenance discrepancy trends.\n\nPredictive Methods (anticipating future hazards):\n- Trend analysis of FRAT data, safety reports, and operational data using PreflightSMS dashboard analytics.\n- Review of industry safety data, NTSB recommendations, and FAA publications.\n- Analysis of organizational changes before implementation.\n- Seasonal and environmental risk assessments.\n\nEmployee Reporting:\n- All employees are encouraged and required to report identified hazards through the PreflightSMS safety reporting system.\n- Anonymous and confidential reporting options are available.\n- The Safety Manager reviews all reports within 5 business days.\n\nHazard Documentation:\n- All identified hazards are entered into the PreflightSMS Hazard Register with:\n  - Hazard description and source.\n  - Initial risk assessment (likelihood x severity).\n  - Proposed mitigations.\n  - Assigned responsible person.\n  - Target review date.\n- The hazard register is reviewed monthly by the Safety Manager and quarterly by the accountable executive.", completed: false },
      { id: "srm_risk_analysis", title: "Risk Analysis Methodology", cfr_ref: "\u00A7 5.55(a)",
        guidance: "Define the risk analysis methodology used to assess safety risk. Describe the likelihood and severity scales (e.g., 5x5 matrix), how composite risk scores are calculated, and who is responsible for conducting risk analysis.",
        content: "[Company Name] uses a 5x5 risk matrix to analyze safety risk for identified hazards.\n\nLikelihood Scale:\n1 - Extremely Improbable: Almost inconceivable that the event will occur.\n2 - Improbable: Very unlikely to occur; not known to have occurred.\n3 - Remote: Unlikely but possible; has occurred in the industry.\n4 - Probable: Likely to occur sometime; has occurred in our operation or similar operations.\n5 - Frequent: Expected to occur repeatedly; is occurring or has occurred multiple times.\n\nSeverity Scale:\n1 - Negligible: No safety effect. Minor inconvenience.\n2 - Minor: Slight reduction in safety margins. Minor incident.\n3 - Major: Significant reduction in safety margins. Serious incident. Injury.\n4 - Hazardous: Large reduction in safety margins. Serious injury. Major equipment damage.\n5 - Catastrophic: Hull loss or multiple fatalities.\n\nRisk Score Calculation:\nRisk Score = Likelihood x Severity (range: 1 to 25)\n\nRisk Score Classification:\n- Low Risk (1-5): Acceptable. Monitor and document.\n- Medium Risk (6-10): Acceptable with mitigation. Implement risk controls, monitor effectiveness.\n- High Risk (11-16): Undesirable. Requires management approval to accept. Risk controls must be implemented.\n- Critical Risk (17-25): Unacceptable. Operations must cease or be modified until risk is reduced. Accountable executive approval required.\n\nResponsibility:\n- The Safety Manager conducts risk analysis for hazards entered in the hazard register.\n- For operational risks, the FRAT system provides automated risk scoring across five categories (Weather, Pilot/Crew, Aircraft, Environment, Operational) with weighted factors.\n- The Chief Pilot reviews all FRAT scores above the approval threshold.", completed: false },
      { id: "srm_risk_assess", title: "Risk Assessment Criteria & Tolerability Matrix", cfr_ref: "\u00A7 5.55(b)",
        guidance: "Define the risk assessment criteria including the risk tolerability matrix. Specify what risk levels are acceptable, tolerable with mitigation, or unacceptable. Include the FRAT score thresholds and what actions are required at each level.",
        content: "Risk Tolerability Matrix:\n\n              Severity -->  1-Neg   2-Minor  3-Major  4-Hazard  5-Catast\nLikelihood\n5-Frequent              Medium    High    Critical Critical  Critical\n4-Probable              Medium    High     High    Critical  Critical\n3-Remote                 Low     Medium    High     High     Critical\n2-Improbable             Low      Low     Medium    High      High\n1-Ext.Improbable         Low      Low      Low     Medium    Medium\n\nRisk Tolerability Levels:\n\nLOW RISK (Green): Acceptable.\n- No specific action required beyond normal monitoring.\n- Document in hazard register for awareness.\n\nMEDIUM RISK (Yellow): Tolerable with mitigation.\n- Risk controls should be implemented to reduce risk.\n- Safety Manager monitors control effectiveness.\n- Document risk controls and rationale for acceptance.\n\nHIGH RISK (Amber): Undesirable.\n- Risk controls must be implemented before proceeding.\n- Requires approval from Chief Pilot or Director of Operations.\n- Enhanced monitoring of risk controls required.\n- Corrective action tracked in PreflightSMS.\n\nCRITICAL RISK (Red): Unacceptable as-is.\n- Operation must not proceed until risk is reduced.\n- Requires accountable executive approval to accept any residual risk.\n- Immediate corrective action required.\n- Root cause analysis and systemic review initiated.\n\nFRAT Score Thresholds (Pre-Flight Risk Assessment):\n- Low Risk: 0-15 points. Flight authorized under standard procedures.\n- Moderate Risk: 16-30 points. Enhanced awareness; crew briefing on elevated risk factors.\n- High Risk: 31-45 points. Requires management approval before departure.\n- Critical Risk: 46+ points. Flight should not depart without risk mitigation and executive approval.\n\nThese thresholds are configured in PreflightSMS and may be adjusted by the Safety Manager with accountable executive approval.", completed: false },
      { id: "srm_controls", title: "Risk Control Development", cfr_ref: "\u00A7 5.55(c)",
        guidance: "Describe the process for developing safety risk controls. Address the hierarchy of controls (elimination, substitution, engineering, administrative, PPE), how controls are documented, assigned, and tracked through the corrective action system.",
        content: "Risk controls are developed using the hierarchy of controls, in order of preference:\n\n1. Elimination: Remove the hazard entirely. Example: Cancel the flight when conditions are unacceptable, discontinue a hazardous procedure.\n\n2. Substitution: Replace with a less hazardous alternative. Example: Use an alternate airport with better approaches, assign a more experienced crew.\n\n3. Engineering Controls: Physical or system-based barriers. Example: Install terrain awareness systems, add equipment limitations in the FMS, implement automated alerts in PreflightSMS.\n\n4. Administrative Controls: Policies, procedures, and training. Example: Establish company weather minimums above regulatory minimums, require two-pilot operations for specific conditions, implement mandatory crew briefings for high-risk factors.\n\n5. Personal Protective Equipment: Last resort. Example: Require survival equipment for overwater operations, cold weather gear for remote operations.\n\nRisk Control Development Process:\n1. The Safety Manager identifies the need for risk controls based on hazard register analysis.\n2. Subject matter experts are consulted to develop appropriate controls.\n3. Controls are evaluated for feasibility, effectiveness, and unintended consequences.\n4. The proposed control is reviewed by the Chief Pilot and/or Director of Maintenance as applicable.\n5. The accountable executive approves implementation of significant new controls.\n\nTracking:\n- All risk controls are documented as corrective actions in PreflightSMS.\n- Each corrective action has an assigned owner, due date, and priority level.\n- The Safety Manager monitors corrective action status and escalates overdue items.\n- Completed controls are verified for effectiveness before the associated hazard is downgraded.", completed: false },
      { id: "srm_evaluation", title: "Risk Control Evaluation", cfr_ref: "\u00A7 5.55(d)",
        guidance: "Define the process for evaluating whether proposed risk controls will achieve acceptable safety risk before implementation. Include how residual risk is assessed and who has authority to accept residual risk at various levels.",
        content: "Before implementing a risk control, [Company Name] evaluates whether it will achieve acceptable safety risk:\n\nEvaluation Criteria:\n1. Effectiveness: Will the control adequately reduce the likelihood or severity of the hazard to an acceptable level?\n2. Feasibility: Can the control be practically implemented given operational, financial, and resource constraints?\n3. Unintended Consequences: Could the control introduce new hazards or negatively affect other operations?\n4. Sustainability: Can the control be maintained consistently over time?\n5. Compliance: Does the control comply with all regulatory requirements?\n\nResidual Risk Assessment:\n- After a risk control is proposed, the Safety Manager reassesses the hazard using the 5x5 risk matrix to determine the residual (remaining) risk.\n- Residual risk is documented in the PreflightSMS hazard register alongside the initial risk assessment.\n- If residual risk remains in the High or Critical range, additional controls must be considered.\n\nRisk Acceptance Authority:\n- Low residual risk: Safety Manager may accept.\n- Medium residual risk: Chief Pilot or Director of Operations may accept.\n- High residual risk: Accountable executive must approve. Documented rationale required.\n- Critical residual risk: Unacceptable. Operation may not proceed. Accountable executive must direct additional risk reduction measures.\n\nDocumentation:\n- Risk control evaluations are documented in the hazard register, including the initial risk, proposed controls, predicted residual risk, and acceptance authority.\n- Post-implementation monitoring verifies that actual risk reduction matches the predicted outcome.", completed: false },
      { id: "srm_notification", title: "Hazard Notification to Interfacing Parties", cfr_ref: "\u00A7 5.57",
        guidance: "Describe the process for notifying interfacing persons or organizations of identified hazards that they could address or mitigate. Include notification triggers, methods, documentation requirements, and follow-up procedures.",
        content: "When [Company Name] identifies a hazard that an interfacing organization could address or mitigate, the following process applies:\n\nNotification Triggers:\n- A hazard is identified that originates from or is influenced by an interfacing organization (FBO, airport, ATC, maintenance provider, etc.).\n- A safety event involves an interfacing organization's facilities, equipment, or personnel.\n- Trend analysis reveals a pattern related to a specific airport, service provider, or external factor.\n\nNotification Process:\n1. The Safety Manager evaluates the hazard and determines which interfacing organizations should be notified.\n2. Notification is made in writing (email or letter) to the appropriate contact at the interfacing organization.\n3. The notification includes: description of the hazard, relevant data or evidence, potential consequences, and a request for the organization to evaluate and address the hazard.\n4. For urgent safety hazards, verbal notification is made immediately, followed by written documentation.\n\nExamples:\n- Ramp hazard at an FBO (poor lighting, FOD, congested ramp): Notify FBO management.\n- ATC-related concern: File NASA ASRS report and/or contact the local ATC facility.\n- Airport infrastructure issue: Notify airport authority operations department.\n- Maintenance provider quality issue: Notify the maintenance provider and evaluate continued use.\n\nDocumentation:\n- All hazard notifications to interfacing parties are logged in PreflightSMS as safety reports or hazard register entries.\n- Responses received are documented and tracked.\n- If no response is received within 30 days, a follow-up is sent.\n\nFollow-Up:\n- The Safety Manager tracks responses and evaluates whether the interfacing organization has taken appropriate action.\n- If the hazard persists, escalation options include: contacting the organization's management, filing reports with the FAA, or modifying our operations to avoid the hazard.", completed: false },
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
        content: "[Company Name] continuously monitors safety performance through the PreflightSMS platform and regular management review.\n\nSafety Performance Indicators (SPIs):\n- FRAT average risk scores (monthly trend).\n- Number of High/Critical risk FRAT assessments per month.\n- Safety report submission rate (reports per crew member per quarter).\n- Hazard register status (open vs. closed hazards, average time to resolution).\n- Corrective action closure rate and timeliness.\n- Training compliance rate (percent of personnel current on required training).\n- Crew currency and medical compliance rates.\n- Flight following overdue events.\n\nSafety Performance Targets (SPTs):\n- Zero preventable accidents and serious incidents.\n- FRAT completion rate: 100% of flights.\n- Safety report processing: 100% within 5 business days.\n- Corrective action closure rate: 90% or greater on time.\n- Training compliance: 100% current.\n- Voluntary safety reports: minimum 2 per crew member per year.\n\nMonitoring Cadence:\n- Daily: Safety Manager reviews new safety reports, FRAT submissions, and flight following alerts.\n- Weekly: Safety Manager reviews corrective action status and approaching due dates.\n- Monthly: Safety Manager prepares a safety performance summary using PreflightSMS dashboard data.\n- Quarterly: Formal safety performance assessment with the accountable executive (see Safety Performance Assessment section).\n\nData is stored and analyzed within PreflightSMS, which provides dashboard analytics, trend charts, and automated alerts for anomalies.", completed: false },
      { id: "sa_risk_control", title: "Risk Control Effectiveness Monitoring", cfr_ref: "\u00A7 5.71(a)(1)",
        guidance: "Describe how the organization monitors operations, products, and services to verify that safety risk controls are effective. Include inspection schedules, audit programs, and how control failures are detected and escalated.",
        content: "[Company Name] monitors the effectiveness of risk controls through:\n\nCorrective Action Verification:\n- When a corrective action is marked complete in PreflightSMS, the Safety Manager verifies that the control has been properly implemented.\n- A follow-up assessment is conducted 30-90 days after implementation to determine if the control is achieving the desired risk reduction.\n- If the control is not effective, the hazard is reopened and additional controls are developed.\n\nOngoing Monitoring:\n- FRAT data is analyzed to determine whether implemented controls are reducing risk scores in the targeted areas.\n- Safety reports are monitored for recurrences of hazards that should have been mitigated by existing controls.\n- The hazard register is reviewed monthly for control effectiveness indicators.\n\nAudit Program:\n- Internal SMS audits are conducted annually, evaluating all SMS processes and risk controls.\n- Audit findings are documented and tracked as corrective actions.\n- The audit evaluates compliance with procedures, effectiveness of controls, and employee awareness.\n\nManagement Observation:\n- Management personnel conduct periodic observations of line operations to verify that procedures and controls are being followed.\n- Observations are documented and shared with the Safety Manager.\n\nEscalation:\n- Control failures are reported to the Safety Manager immediately.\n- If a control failure creates an immediate hazard, the operation is stopped until the hazard is addressed.\n- Systemic control failures are escalated to the accountable executive for review.", completed: false },
      { id: "sa_data", title: "Safety Data Acquisition", cfr_ref: "\u00A7 5.71(a)(2)",
        guidance: "Define the safety-related data and information sources used for monitoring. Include FRAT data, flight following records, safety reports, maintenance records, industry safety bulletins, and any flight data monitoring programs.",
        content: "[Company Name] acquires safety data from the following sources:\n\nInternal Data (collected through PreflightSMS):\n- FRAT Submissions: Risk scores, selected risk factors, weather conditions, crew information, and remarks for every flight.\n- Safety Reports: Incidents, near-misses, hazard observations, and safety concerns submitted by employees.\n- Flight Following: Active flight tracking, arrival confirmations, and overdue event data.\n- Hazard Register: Identified hazards with risk assessments, mitigations, and status.\n- Corrective Actions: Action items, assignments, due dates, and completion status.\n- Training Records: Completion dates, compliance status, and upcoming expirations.\n- Crew Records: Medical currency, flight review status, proficiency check dates, and rating information.\n- Policy Acknowledgments: Employee acknowledgment tracking for safety policies.\n\nInternal Data (other sources):\n- Maintenance records: Squawks, MEL items, recurring discrepancies, and AD compliance.\n- Pilot reports (PIREPs) and trip debriefs.\n- Fuel consumption data and performance calculations.\n\nExternal Data:\n- FAA Safety Alerts (SAFO), Information for Operators (InFO), and Airworthiness Directives.\n- NTSB accident and incident reports for similar operations.\n- NASA Aviation Safety Reporting System (ASRS) reports.\n- Manufacturer service bulletins and safety communications.\n- Industry publications and safety conference proceedings.\n- Weather data and forecasting services.\n\nData Retention:\n- All safety data in PreflightSMS is retained indefinitely.\n- Safety assurance records are retained for a minimum of 5 years per 14 CFR 5.97(b).\n- Training records are retained for the duration of employment per 14 CFR 5.97(c).", completed: false },
      { id: "sa_hazard_data", title: "Hazard Identification from Data", cfr_ref: "\u00A7 5.71(a)(3)",
        guidance: "Describe how hazards are identified from acquired safety data. Include trend analysis methods, threshold triggers for investigation, and how data-driven hazard identification feeds into the SRM process.",
        content: "The Safety Manager uses the following methods to identify hazards from acquired safety data:\n\nTrend Analysis:\n- Monthly review of FRAT score trends using PreflightSMS dashboard charts. Increasing average scores or spikes in specific risk categories trigger investigation.\n- Monthly review of safety report volume and categories. An increase in reports in a specific area indicates a potential emerging hazard.\n- Quarterly review of corrective action data for recurring themes.\n\nThreshold Triggers:\n- Any single FRAT score in the Critical range triggers immediate review.\n- Three or more FRAT scores in the High range for the same risk factor within 30 days triggers a hazard investigation.\n- Two or more safety reports on the same topic within 60 days triggers a trend review.\n- Any corrective action that is reopened or recurs triggers a systemic review.\n- Any overdue flight event triggers a review of flight following procedures.\n\nData-to-Hazard Process:\n1. Safety Manager identifies a trend, anomaly, or threshold exceedance from the data.\n2. Further analysis is conducted to confirm the trend and identify root cause.\n3. If a hazard is confirmed, it is entered into the PreflightSMS hazard register.\n4. Risk analysis is conducted per the SRM process.\n5. Risk controls are developed and implemented.\n\nCross-Referencing:\n- Safety data is cross-referenced across multiple sources. For example, a FRAT trend involving weather risk at a specific airport is cross-referenced with safety reports and maintenance data for that location.\n- Industry data (NTSB, ASRS) is compared with internal data to identify hazards that may not yet be apparent in our operations.", completed: false },
      { id: "sa_corrective", title: "Corrective Action Monitoring", cfr_ref: "\u00A7 5.71(a)(4)",
        guidance: "Define how corrective actions are monitored and measured. Include tracking methods, due date management, escalation procedures for overdue actions, and how completion effectiveness is verified.",
        content: "Corrective actions are tracked and monitored through the PreflightSMS Corrective Actions module:\n\nTracking:\n- Each corrective action includes: description, assigned owner, priority (low/medium/high/critical), due date, and status (open/in progress/completed/overdue).\n- The Safety Manager is responsible for creating corrective actions from safety reports, hazard register findings, audit results, and investigation recommendations.\n\nDue Date Management:\n- Priority-based due date guidelines:\n  - Critical: 7 days\n  - High: 30 days\n  - Medium: 60 days\n  - Low: 90 days\n- Assigned owners receive notification of their corrective actions and approaching due dates.\n\nMonitoring Cadence:\n- Weekly: Safety Manager reviews all open corrective actions and contacts owners of items approaching due date.\n- Monthly: Corrective action status summary included in monthly safety report.\n- Quarterly: Full corrective action review with the accountable executive during safety performance assessment.\n\nEscalation Procedures:\n- 7 days before due date: Reminder sent to assigned owner.\n- On due date: If not completed, status changes to overdue. Safety Manager contacts owner directly.\n- 7 days overdue: Escalated to the owner's supervisor.\n- 14 days overdue: Escalated to the accountable executive.\n\nCompletion Verification:\n- When an action is marked complete, the Safety Manager reviews the completion notes and verifies the action was implemented as intended.\n- For significant corrective actions, a follow-up assessment is conducted 30-90 days later to verify ongoing effectiveness.\n- If the corrective action does not resolve the underlying issue, the action is reopened or a new action is created.", completed: false },
      { id: "sa_continuous", title: "Continuous Information Gathering", cfr_ref: "\u00A7 5.71(a)(5)",
        guidance: "Describe the systems and processes for continuous safety information gathering and analysis. Include real-time monitoring capabilities, periodic data reviews, and how emerging trends are identified.",
        content: "[Company Name] maintains continuous safety information gathering through:\n\nReal-Time Monitoring:\n- PreflightSMS Flight Following: Active flights are monitored in real time. Overdue flights trigger automatic alerts to designated notification contacts.\n- FRAT submissions are immediately visible in the system, with high-risk scores flagged for management review.\n- Safety reports are submitted electronically and immediately queued for Safety Manager review.\n\nPeriodic Data Reviews:\n- Daily: New safety reports, FRAT submissions, and flight following events reviewed by the Safety Manager.\n- Weekly: Corrective action status review. Open hazard register items reviewed.\n- Monthly: Comprehensive review of all safety performance indicators using PreflightSMS dashboard analytics. FRAT score distribution, safety report trends, hazard status, and training compliance analyzed.\n- Quarterly: Formal safety performance assessment with trend analysis across all data sources.\n- Annually: Year-in-review analysis of all safety data, comparison to prior years, and establishment of targets for the coming year.\n\nEmerging Trend Detection:\n- PreflightSMS dashboard analytics display rolling trend charts for FRAT scores, safety reports by category, and hazard status.\n- The Safety Manager watches for upward trends in risk scores, clusters of reports in specific categories, and seasonal patterns.\n- Industry safety information (NTSB alerts, FAA publications, manufacturer bulletins) is monitored and assessed for relevance to our operations.\n\nAll information gathered is retained within PreflightSMS and available for historical analysis and regulatory review.", completed: false },
      { id: "sa_employee_report", title: "Employee Safety Reporting System", cfr_ref: "\u00A7 5.71(a)(7)",
        guidance: "Document the confidential employee safety reporting system. Describe how reports are submitted, processed, investigated, and how feedback is provided to reporters. Address confidentiality and non-punitive protections.",
        content: "[Company Name] maintains a confidential employee safety reporting system through PreflightSMS.\n\nSubmission:\n- Employees submit safety reports through the PreflightSMS Safety Reports module.\n- Report types available: Hazard observation, Incident, Near-miss, Safety concern.\n- Each report captures: title, description, date/location, category, severity assessment, flight phase, and related flight information.\n- Confidential option: Reporter identity is visible only to the Safety Manager.\n- Anonymous option: Reporter identity is not recorded at all.\n\nProcessing:\n- The Safety Manager reviews all new reports within 5 business days.\n- Reports are categorized, assessed for severity, and assigned a status.\n- Status workflow: Submitted > Under Review > Investigation > Corrective Action > Closed.\n- Reports that identify hazards are linked to hazard register entries.\n- Reports that require action generate corrective action items.\n\nInvestigation:\n- Reports warranting investigation are assigned to the Safety Manager or a qualified investigator.\n- Investigations follow a structured approach: gather facts, identify contributing factors, determine root cause, and develop corrective actions.\n- Investigation findings are documented in the report record.\n\nFeedback:\n- Reporters receive feedback on the status and outcome of their report.\n- For confidential reports, feedback is provided directly to the reporter.\n- For anonymous reports, feedback is communicated through safety bulletins or team briefings.\n- All employees are periodically informed about the types of reports received and actions taken, to reinforce the value of reporting.\n\nProtections:\n- Non-punitive policy applies to all good-faith safety reports (see Safety Policy - Unacceptable Behavior section).\n- Reporter confidentiality is protected. Identity is never shared beyond need-to-know without reporter consent.\n- Retaliation against a safety reporter is a violation of company policy subject to disciplinary action.", completed: false },
      { id: "sa_assessment", title: "Safety Performance Assessment Process", cfr_ref: "\u00A7 5.73",
        guidance: "Define the process for conducting safety performance assessments. Include assessment frequency (recommend quarterly), who participates, what metrics are reviewed, and how results are reported to the accountable executive.",
        content: "Safety performance assessments are conducted quarterly by the Safety Manager and reviewed by the accountable executive.\n\nAssessment Schedule:\n- Q1 Assessment: January (covers Oct-Dec data)\n- Q2 Assessment: April (covers Jan-Mar data)\n- Q3 Assessment: July (covers Apr-Jun data)\n- Q4 Assessment: October (covers Jul-Sep data)\n\nParticipants:\n- Safety Manager prepares the assessment report.\n- Accountable executive reviews and approves.\n- Chief Pilot and Director of Maintenance provide input.\n- Other personnel as needed based on findings.\n\nMetrics Reviewed:\n1. Safety objectives: Progress toward each stated safety objective.\n2. FRAT performance: Average scores, distribution by risk level, trends, and high-score analysis.\n3. Safety reporting: Volume, types, response times, and reporting culture indicators.\n4. Hazard register: New hazards identified, hazards closed, average time to resolution, open hazard aging.\n5. Corrective actions: Completion rate, timeliness, overdue items, recurring issues.\n6. Training compliance: Percentage current, upcoming expirations, completion rates.\n7. Crew currency: Medical, flight review, IPC, and recurrent training compliance.\n8. Incidents and events: Summary of all events during the period with trend comparison.\n\nAssessment Output:\n- Written safety performance report with data, analysis, and recommendations.\n- Identification of safety performance deficiencies requiring corrective action.\n- Recommendations for changes to safety objectives, procedures, or risk controls.\n- Recognition of positive safety performance and trends.\n\nThe accountable executive reviews the report, approves recommendations, and directs implementation of any required changes. Assessment reports are retained per 14 CFR 5.97.", completed: false },
      { id: "sa_improvement", title: "Continuous Improvement Process", cfr_ref: "\u00A7 5.75",
        guidance: "Describe the process for correcting safety performance deficiencies identified during assessments. Include how improvement actions are prioritized, assigned, tracked, and how their effectiveness is evaluated.",
        content: "[Company Name] is committed to continuous improvement of the SMS through a structured process:\n\nIdentifying Deficiencies:\n- Safety performance deficiencies are identified through quarterly safety performance assessments, audit findings, investigation recommendations, and ongoing monitoring.\n- Deficiencies include: failure to meet safety objectives, ineffective risk controls, recurring hazards, low reporting rates, training non-compliance, and any downward trend in safety performance indicators.\n\nPrioritization:\n- Deficiencies are prioritized based on their potential impact on safety:\n  - Immediate: Deficiencies that pose a current safety risk. Action required within 7 days.\n  - High: Deficiencies that could lead to safety risk if not addressed. Action within 30 days.\n  - Routine: Deficiencies that affect SMS effectiveness but do not pose immediate risk. Action within 90 days.\n\nCorrective Action Process:\n1. Safety Manager documents the deficiency and develops a corrective action plan.\n2. Corrective actions are entered into PreflightSMS with assigned owners and due dates.\n3. For systemic deficiencies, a root cause analysis is conducted before developing corrective actions.\n4. The accountable executive approves corrective action plans for significant deficiencies.\n\nTracking and Verification:\n- Corrective actions are tracked through the PreflightSMS corrective action module.\n- The Safety Manager monitors progress and provides status updates in monthly reports.\n- Upon completion, the Safety Manager verifies that the action was implemented as planned.\n- Effectiveness is evaluated by monitoring the relevant safety performance indicator for improvement in subsequent reporting periods.\n\nFeedback Loop:\n- Results of improvement actions are incorporated into the next quarterly safety performance assessment.\n- If the improvement action was not effective, the deficiency is reassessed and alternative actions are developed.\n- Successful improvements are documented and shared as lessons learned.", completed: false },
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
        content: "[Company Name] provides SMS training to ensure all personnel have the competencies needed for their SMS responsibilities.\n\nWho Requires Training:\n- All employees, regardless of role, receive SMS awareness training.\n- Management personnel receive additional training on their SMS responsibilities.\n- The Safety Manager receives specialized training in safety investigation, risk management, and SMS administration.\n- New employees receive initial SMS training within 30 days of hire.\n\nRequired Competencies:\n- All Employees: Understanding of SMS principles, safety policy, hazard reporting procedures, FRAT usage, non-punitive reporting culture, and individual safety responsibilities.\n- Pilots: FRAT completion and interpretation, pre-flight risk assessment, CRM, and flight safety procedures.\n- Management: SMS oversight responsibilities, risk management decision-making, safety performance review, and resource allocation for safety.\n- Safety Manager: Safety investigation techniques, risk analysis methodology, data analysis, regulatory compliance, and SMS program management.\n\nTraining Delivery Methods:\n- PreflightSMS CBT modules for standardized training content.\n- Classroom instruction for initial and specialized training.\n- On-the-job training and mentoring for role-specific skills.\n- Safety briefings and stand-up meetings for ongoing awareness.\n\nEffectiveness Evaluation:\n- CBT modules include quiz assessments with minimum passing scores.\n- Training feedback surveys collected after each session.\n- Safety performance data monitored for improvements following training.\n- Annual training program review to assess content relevance and effectiveness.\n\nTraining records are maintained in PreflightSMS for the duration of employment per 14 CFR 5.97(c).", completed: false },
      { id: "prom_initial", title: "Initial SMS Training Requirements", cfr_ref: "\u00A7 5.91",
        guidance: "Define the initial SMS training required for new employees and personnel assuming new SMS duties. Include training content (SMS principles, hazard reporting, risk assessment basics), delivery methods, and completion timeframes.",
        content: "Initial SMS Training is required for all new employees within 30 days of hire date.\n\nCourse Content:\n1. Introduction to SMS: What is an SMS, four components (policy, SRM, safety assurance, safety promotion), regulatory basis (14 CFR Part 5).\n2. [Company Name] Safety Policy: Safety objectives, management commitment, code of ethics, non-punitive reporting policy.\n3. Organizational Structure: Accountable executive, Safety Manager, employee responsibilities, reporting relationships.\n4. Hazard Reporting: How to submit safety reports in PreflightSMS, what to report, confidentiality protections, what happens after a report is submitted.\n5. FRAT System: How to complete a FRAT, understanding risk scores and thresholds, what to do at each risk level.\n6. Risk Management Basics: Hazard identification, risk matrix, risk controls, the hierarchy of controls.\n7. Emergency Response: Overview of the ERP, employee responsibilities during an emergency, notification procedures.\n8. Safety Communication: How safety information is shared, where to find policies and procedures, acknowledgment requirements.\n\nDelivery:\n- PreflightSMS CBT module (self-paced, approximately 60-90 minutes).\n- Supplemented by an in-person or virtual orientation session with the Safety Manager.\n- Access to PreflightSMS system demonstrated during orientation.\n\nCompletion Requirements:\n- Complete all CBT modules with a passing quiz score of 80% or higher.\n- Acknowledge the Safety Policy in PreflightSMS.\n- Must be completed within 30 days of hire. Training record logged in PreflightSMS.\n\nPersonnel assuming new SMS duties (e.g., promoted to management) receive additional role-specific training within 30 days of assuming the new role.", completed: false },
      { id: "prom_recurrent", title: "Recurrent SMS Training Requirements", cfr_ref: "\u00A7 5.91",
        guidance: "Define recurrent SMS training requirements including frequency (recommend annually), content updates, and how training incorporates lessons learned from recent safety events and organizational changes.",
        content: "Annual Recurrent SMS Training is required for all employees.\n\nFrequency: Every 12 calendar months from date of last completion.\n\nCourse Content:\n1. Safety Policy Review: Review of current safety objectives, any policy changes since last training.\n2. SMS Performance Summary: Overview of the past year's safety performance, trends, and key findings.\n3. Lessons Learned: Review of significant safety events (internal and industry) with discussion of contributing factors and corrective actions taken.\n4. Hazard Reporting Refresher: Reinforcement of reporting procedures, review of reporting metrics, and encouragement to report.\n5. Procedure Updates: Review of any new or changed SOPs, risk controls, or operational procedures implemented during the year.\n6. Regulatory Updates: Any changes to 14 CFR Part 5 or other applicable regulations.\n7. Interactive Discussion: Open forum for employees to raise safety concerns, ask questions, and provide feedback on SMS effectiveness.\n\nDelivery:\n- PreflightSMS CBT recurrent module (self-paced, approximately 45-60 minutes).\n- Annual safety meeting or stand-down day with in-person discussion component.\n- Content is updated annually by the Safety Manager to reflect current operations and recent events.\n\nCompletion Requirements:\n- Complete CBT module with passing quiz score of 80% or higher.\n- Attendance at annual safety meeting (documented in training records).\n- Re-acknowledge the Safety Policy if it has been updated.\n- Must be completed before the 12-month anniversary of last recurrent training.\n\nTraining records are tracked in PreflightSMS with automatic expiration date calculation.", completed: false },
      { id: "prom_awareness", title: "SMS Awareness Communication", cfr_ref: "\u00A7 5.93(a)",
        guidance: "Describe how employees are made aware of SMS policies, processes, and tools relevant to their responsibilities. Include methods such as safety bulletins, briefings, digital distribution, and policy acknowledgment tracking.",
        content: "[Company Name] ensures all employees are aware of SMS policies, processes, and tools through:\n\nDigital Distribution:\n- All SMS policies and procedures are published in the PreflightSMS Policy Library, accessible to all employees.\n- New and updated policies require employee acknowledgment through PreflightSMS, with compliance tracked by the Safety Manager.\n- SMS manuals are available in the Manuals section of PreflightSMS at all times.\n\nSafety Bulletins:\n- The Safety Manager issues safety bulletins as needed to communicate important safety information, new hazards, corrective actions, or procedure changes.\n- Bulletins are distributed via email and posted in PreflightSMS.\n\nBriefings:\n- Pre-duty safety briefings address current hazards, weather, NOTAMs, and relevant safety information.\n- Crew briefings include review of FRAT results and discussion of risk mitigation strategies.\n- Monthly or quarterly safety meetings provide a forum for safety discussion and updates.\n\nPosted Information:\n- Safety policy, emergency procedures, and key contact information are posted in [Posting Locations].\n- Safety performance metrics are displayed and updated monthly.\n\nOnboarding:\n- New employees receive a comprehensive SMS orientation during their first week, including access to all SMS tools and documentation.\n\nAcknowledgment Tracking:\n- PreflightSMS tracks policy acknowledgments by employee with timestamps.\n- The Safety Manager follows up with employees who have not acknowledged within the required timeframe.\n- Acknowledgment records are maintained per 14 CFR 5.97(d).", completed: false },
      { id: "prom_hazard_comm", title: "Hazard Information Communication", cfr_ref: "\u00A7 5.93(b)",
        guidance: "Define how hazard information relevant to employee responsibilities is communicated. Include notification methods, timing requirements, and how information is tailored to different roles and operational areas.",
        content: "[Company Name] communicates hazard information to employees through the following methods:\n\nImmediate Hazard Communication:\n- Hazards posing an immediate risk to operations are communicated verbally to all affected personnel without delay.\n- The Safety Manager or Chief Pilot issues an immediate safety alert via email and/or text to all relevant employees.\n- Operations are modified or suspended as necessary until the hazard is addressed.\n\nOngoing Hazard Communication:\n- Active hazards in the PreflightSMS Hazard Register are visible to management personnel.\n- Relevant hazard information is included in pre-duty and pre-flight briefings.\n- FRAT risk factors are updated to reflect currently identified hazards.\n- The PreflightSMS notification system alerts designated contacts when new hazards are identified.\n\nRole-Specific Communication:\n- Pilots: Hazards relevant to flight operations (weather patterns, airport-specific hazards, aircraft issues) are communicated through FRAT updates, crew briefings, and safety bulletins.\n- Maintenance: Maintenance-related hazards are communicated through maintenance safety bulletins and direct coordination with the Director of Maintenance.\n- Ground Operations: Ramp and ground hazards are communicated through posted notices and pre-shift briefings.\n\nTiming:\n- Immediate hazards: Communicated within 1 hour of identification.\n- New hazard register entries: Communicated within 24 hours to relevant personnel.\n- Hazard status updates: Included in monthly safety communications.\n\nAll hazard communications are documented in PreflightSMS and retained per 14 CFR 5.97(d).", completed: false },
      { id: "prom_action_comm", title: "Safety Action Communication", cfr_ref: "\u00A7 5.93(c)",
        guidance: "Describe how the organization explains why safety actions have been taken. Include communication channels for corrective actions, policy changes, and operational restrictions, ensuring employees understand the safety rationale.",
        content: "When [Company Name] takes safety actions, the rationale is communicated to ensure employees understand why the action was taken:\n\nCorrective Actions:\n- When corrective actions are implemented, affected employees receive an explanation of the hazard that prompted the action, what the action entails, and why it is expected to reduce risk.\n- Corrective action descriptions in PreflightSMS include the rationale and expected outcome.\n- For significant corrective actions (new procedures, operational restrictions, equipment changes), a safety bulletin is issued explaining the background and purpose.\n\nPolicy Changes:\n- When safety policies are new or revised, the communication includes an explanation of what changed and why.\n- Policy updates are distributed through PreflightSMS with a summary of changes.\n- Significant policy changes are discussed in safety meetings or briefings.\n\nOperational Restrictions:\n- When operations are restricted (e.g., new weather minimums, airport limitations, aircraft restrictions), employees are informed of the specific hazard or finding that led to the restriction.\n- Temporary restrictions include an expected duration and the conditions under which they will be lifted.\n\nInvestigation Outcomes:\n- After safety investigations are completed, relevant findings and lessons learned are shared with employees through safety bulletins, safety meetings, and/or training updates.\n- Specific details are shared to the extent possible while protecting reporter confidentiality.\n\nAll safety action communications are documented and retained per 14 CFR 5.97(d) for a minimum of 24 calendar months.", completed: false },
      { id: "prom_change_comm", title: "Procedure Change Communication", cfr_ref: "\u00A7 5.93(d)",
        guidance: "Define the process for communicating new or changed safety procedures. Include advance notice requirements, training on changes, acknowledgment tracking, and how feedback on changes is collected.",
        content: "When safety procedures are introduced or changed, [Company Name] follows this communication process:\n\nAdvance Notice:\n- Planned procedure changes are communicated at least 14 days before the effective date when possible.\n- The communication includes: what is changing, why it is changing, when it takes effect, and what employees need to do differently.\n- For urgent safety-driven changes, implementation may be immediate with concurrent communication.\n\nCommunication Methods:\n- Safety bulletin distributed via email to all affected personnel.\n- Updated procedure published in PreflightSMS Policy Library with a new version number.\n- Discussion at the next safety meeting or crew briefing.\n- For significant changes, a dedicated briefing session may be scheduled.\n\nTraining:\n- If the change requires new skills or knowledge, training is provided before the effective date.\n- Training may be delivered through updated CBT modules, briefings, or hands-on demonstration.\n- Training completion is tracked in PreflightSMS.\n\nAcknowledgment:\n- All affected employees are required to acknowledge the new or changed procedure in PreflightSMS.\n- The Safety Manager monitors acknowledgment completion and follows up with non-compliant employees.\n- The procedure does not take effect for an individual until they have been trained and acknowledged (except for urgent safety changes).\n\nFeedback:\n- Employees are encouraged to provide feedback on new or changed procedures through the safety reporting system or directly to the Safety Manager.\n- Feedback is reviewed and incorporated into procedure refinements as appropriate.\n- A 30-day review period follows significant changes to assess effectiveness and gather input.\n\nAll procedure change communications and acknowledgment records are retained per 14 CFR 5.97(d).", completed: false },
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
        content: "[Company Name] conducts the following operational processes:\n\nFlight Operations:\n- Pre-flight: FRAT completion in PreflightSMS, weather briefing, flight planning, aircraft preflight inspection, crew briefing.\n- Dispatch/Release: Flight release per Part 135 operational control procedures. High-risk FRAT scores require management approval before release.\n- In-Flight: Operations conducted per SOPs, aircraft flight manual, and ATC instructions. Flight following monitored through PreflightSMS.\n- Post-Flight: Aircraft arrival logged in PreflightSMS. Squawks documented. Post-flight debrief for notable events.\n\nGround Operations:\n- Passenger handling: Boarding, safety briefing, baggage loading, and deplaning procedures.\n- Ramp operations: Aircraft marshaling, fueling, de-icing, and ground power procedures.\n- Hangar operations: Aircraft movement, storage, and security.\n\nMaintenance:\n- Scheduled maintenance per manufacturer-approved maintenance program.\n- Unscheduled maintenance and squawk resolution.\n- MEL management and deferral tracking.\n- Airworthiness directive compliance.\n- Parts inventory and procurement.\n\nDispatch / Scheduling:\n- Flight scheduling and crew assignment.\n- Crew duty time and rest tracking per Part 135 requirements.\n- Customer coordination and trip planning.\n- Weather monitoring and flight watch.\n\nTraining:\n- Initial and recurrent pilot training per Part 135.\n- SMS training for all personnel.\n- Emergency procedures training.\n- CBT course management through PreflightSMS.\n\nSafety Management:\n- FRAT administration and review.\n- Safety reporting and investigation.\n- Hazard identification and risk management.\n- Corrective action tracking.\n- Safety performance monitoring and assessment.", completed: false },
      { id: "osd_products", title: "Products and Services", cfr_ref: "\u00A7 5.17(b)",
        guidance: "Describe the products and services offered: types of operations (charter, air ambulance, cargo, etc.), aircraft types operated, geographic areas of operation, and any specialized services provided.",
        content: "[Company Name] provides the following products and services under 14 CFR Part 135:\n\nTypes of Operations:\n- On-demand air charter (passenger)\n- [Air ambulance / air cargo / other - customize as applicable]\n- Part 91 ferry, positioning, and maintenance flights\n\nAircraft Fleet:\n[Aircraft Fleet List]\n(Update via Template Variables above)\n\nGeographic Area of Operations:\n- Primary operating area: [Primary Operating Area]\n- Approved areas: [Approved Areas]\n- Home base: [Home Airport]\n- Secondary base(s): As applicable\n- Common destinations: [List frequently served airports/regions]\n\nSpecialized Services:\n- [e.g., Mountain flying operations, overwater operations, night operations]\n- [e.g., VIP/executive transport, medical transport]\n- [e.g., Hazardous materials transport if applicable]\n\nOperations Specifications:\n- Certificate Number: [Certificate Number]\n- Operations Specifications authorizations: [List key OpSpec authorizations such as IFR, day/night, known icing, etc.]\n\nThis section is updated whenever aircraft are added or removed from the fleet, new services are offered, or the geographic area of operations changes.", completed: false },
      { id: "osd_structure", title: "Organizational Structure", cfr_ref: "\u00A7 5.17(c)",
        guidance: "Describe the organizational structure including departments, reporting relationships, number of employees by function, and locations/bases of operation. Reference the organizational chart in the Safety Accountability manual.",
        content: "[Company Name] Organizational Structure:\n\nDepartments:\n- Executive Management: Accountable executive, administrative support.\n- Flight Operations: Chief Pilot, line pilots, first officers.\n- Dispatch / Scheduling: Dispatchers, flight coordinators.\n- Maintenance: Director of Maintenance, maintenance technicians, inspectors.\n- Safety: Safety Manager.\n- Administration: Finance, HR, customer service.\n\nPersonnel Count (update with actual numbers):\n- Total employees: [Total Employees]\n- Pilots: [Number of Pilots]\n- Maintenance: [Number of Maintenance]\n- Dispatch/Operations: [Number of Dispatch]\n- Management/Admin: [Number of Admin]\n\nLocations:\n- Primary base of operations: [Home Airport Code] - [City State] - [Facility Address]\n- Secondary base(s): [Airport code(s)] if applicable\n- Maintenance facility: [Location]\n- Administrative office: [Address if different from ops base]\n\nReporting Relationships:\n- The organizational chart and detailed reporting relationships are documented in the Safety Accountability & Authority manual.\n- The Safety Manager reports directly to the accountable executive on safety matters, independent of the operational chain of command.\n- All department heads report to the accountable executive.\n\nThis section is updated whenever there are significant changes to the organizational structure, personnel count, or base locations.", completed: false },
      { id: "osd_interfaces", title: "Interfaces with Other Organizations", cfr_ref: "\u00A7 5.17(d)",
        guidance: "Identify all organizations that interface with your operations: FBOs, maintenance providers, fuel suppliers, charter brokers, codeshare partners, ground handling agents, and regulatory bodies. Describe the nature of each interface and any safety-relevant agreements.",
        content: "[Company Name] interfaces with the following organizations:\n\nFixed Base Operators (FBOs):\n- [Home base FBO name]: Fueling, ground handling, passenger services, hangar space.\n- [Other frequently used FBOs]: Ground handling and fueling at outstation airports.\n- Safety interface: Ramp safety, fueling procedures, FOD prevention, ground equipment operation.\n\nMaintenance Providers:\n- [Primary maintenance provider]: [Services provided - e.g., heavy maintenance, avionics, engine overhaul].\n- [Additional providers as applicable].\n- Safety interface: Airworthiness, return-to-service procedures, quality assurance, parts traceability.\n\nFuel Suppliers:\n- [Fuel contract provider(s)].\n- Safety interface: Fuel quality assurance, fuel handling procedures, spill prevention.\n\nCharter Brokers / Customers:\n- [Broker names if applicable].\n- Safety interface: Passenger information, special requirements, schedule pressure management.\n\nAir Traffic Control:\n- [Local ATC facilities - approach, tower, center].\n- Safety interface: Airspace procedures, communication, runway safety.\n\nAirport Authorities:\n- [Home airport authority].\n- Safety interface: Airport safety programs, NOTAMs, ramp rules, emergency coordination.\n\nRegulatory Bodies:\n- FAA Flight Standards District Office (FSDO): [FSDO name and location].\n- FAA Principal Inspector: [Name].\n- TSA: Security programs and compliance.\n- NTSB: Accident/incident investigation coordination.\n\nInsurance:\n- [Insurance provider]: Aviation liability and hull coverage.\n\nTraining Providers:\n- [Simulator training provider, if applicable].\n- Safety interface: Training quality, curriculum alignment.\n\nSafety-relevant agreements and contracts with interfacing organizations are maintained on file and reviewed annually.", completed: false },
      { id: "osd_regulatory", title: "Applicable Regulatory Requirements", cfr_ref: "\u00A7 5.17(e)",
        guidance: "List all applicable regulatory requirements: 14 CFR Part 135, Part 91, Part 5, Part 43 (maintenance), TSA security requirements, OSHA, DOT hazmat, state regulations, and any additional requirements specific to your operations.",
        content: "The following regulatory requirements apply to [Company Name] operations:\n\nFederal Aviation Regulations (14 CFR):\n- Part 1: Definitions and abbreviations.\n- Part 5: Safety Management Systems (SMS requirements for this manual system).\n- Part 43: Maintenance, preventive maintenance, rebuilding, and alteration.\n- Part 61: Certification of pilots, flight instructors, and ground instructors.\n- Part 91: General operating and flight rules (applicable to Part 91 operations and as supplemented by Part 135).\n- Part 119: Certification of air carriers and commercial operators.\n- Part 120: Drug and alcohol testing program.\n- Part 135: Operating requirements for commuter and on-demand operations.\n\nNTSB Regulations:\n- 49 CFR Part 830: Notification and reporting of aircraft accidents, incidents, and overdue aircraft.\n\nTSA Security:\n- 49 CFR Part 1544: Aircraft operator security (if applicable).\n- TSA Twelve-Five Standard Security Program or Private Charter Standard Security Program (as applicable based on aircraft size).\n\nDOT Hazardous Materials:\n- 49 CFR Parts 171-180: Hazardous materials transportation (if transporting hazmat).\n\nOSHA:\n- 29 CFR Part 1910: Occupational Safety and Health Standards (applicable to ground operations and maintenance).\n\nState and Local:\n- [State] labor and employment laws.\n- [State] environmental regulations (fuel storage, spill prevention).\n- Airport rules and regulations at [home airport].\n\nInternational (if applicable):\n- ICAO Annex 19: Safety Management (reference standard).\n- [Country-specific requirements for international destinations].\n\nThis list is reviewed annually and updated when regulatory changes occur or the scope of operations changes.", completed: false },
    ],
  },
];

// ══════════════════════════════════════════════════════
// MANUAL EDITOR
// ══════════════════════════════════════════════════════

function ManualEditor({ manual, onSave, onBack, templateVariables, signatures, onSaveSignature }) {
  // Merge template sample content into any sections that have empty content
  const initSections = () => {
    const dbSections = manual.sections || [];
    const template = SMS_MANUAL_TEMPLATES.find(t => t.manualKey === manual.manual_key);
    if (!template) return dbSections;
    return dbSections.map(sec => {
      if (sec.content) return sec; // user already has content, keep it
      const tmplSec = template.sections.find(ts => ts.id === sec.id);
      return tmplSec && tmplSec.content ? { ...sec, content: tmplSec.content } : sec;
    });
  };
  const [sections, setSections] = useState(initSections);
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

                {/* Unfilled variables indicator */}
                {(() => { const unfilled = findUnfilledVariables(sec.content); return unfilled.length > 0 ? (
                  <div style={{ padding: "6px 10px", background: `${YELLOW}15`, border: `1px solid ${YELLOW}33`, borderRadius: 4, marginBottom: 8, fontSize: 10, color: YELLOW }}>
                    {unfilled.length} unfilled variable{unfilled.length > 1 ? "s" : ""}: {unfilled.slice(0, 5).join(", ")}{unfilled.length > 5 ? "..." : ""}
                  </div>
                ) : null; })()}

                {/* Content editor */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Your Procedures</label>
                  <textarea
                    value={sec.content}
                    onChange={e => updateSection(idx, { content: e.target.value })}
                    placeholder="Enter your organization's specific procedures, policies, and documentation for this section..."
                    rows={sec.id === "sp_signature" ? 4 : 6}
                    style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                {/* Signature pad for signature sections */}
                {sec.id === "sp_signature" && (
                  <SignaturePad
                    existingSignature={signatures?.sp_signature}
                    onSave={(sigData) => onSaveSignature && onSaveSignature("sp_signature", sigData)}
                  />
                )}

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

export default function SmsManuals({ profile, session, smsManuals, onSaveManual, onInitManuals, templateVariables, signatures, onSaveVariables, onSaveSignature }) {
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

  // Reset existing manuals to template defaults (preserves completed status for sections with user content)
  const handleResetToDefaults = async () => {
    if (!confirm("This will reload all sample content into your manuals. Any sections you have already edited will be updated with the template text. Continue?")) return;
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
        templateVariables={templateVariables}
        signatures={signatures}
        onSaveSignature={onSaveSignature}
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
        <button onClick={handleResetToDefaults} disabled={initializing}
          style={{ padding: "8px 16px", background: "transparent", color: CYAN, border: `1px solid ${CYAN}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: initializing ? "default" : "pointer", opacity: initializing ? 0.5 : 1 }}>
          {initializing ? "Reloading..." : "Reload Template Defaults"}
        </button>
      </div>

      {/* Template Variables */}
      <TemplateVariablesForm variables={templateVariables} onSave={async (vars) => {
        // Merge template content into empty DB sections so variable replacement works
        const mergedManuals = smsManuals.map(m => {
          const template = SMS_MANUAL_TEMPLATES.find(t => t.manualKey === m.manual_key);
          if (!template) return m;
          const mergedSections = (m.sections || []).map(sec => {
            if (sec.content) return sec;
            const tmplSec = template.sections.find(ts => ts.id === sec.id);
            return tmplSec?.content ? { ...sec, content: tmplSec.content } : sec;
          });
          return { ...m, sections: mergedSections };
        });
        await onSaveVariables(vars, mergedManuals);
      }} />

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
