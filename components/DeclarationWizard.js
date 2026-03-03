import { useState, useMemo } from "react";

const BLACK="#000000",NEAR_BLACK="#0A0A0A",CARD="#222222",BORDER="#2E2E2E",LIGHT_BORDER="#3A3A3A";
const WHITE="#FFFFFF",OFF_WHITE="#E0E0E0",MUTED="#777777";
const GREEN="#4ADE80",YELLOW="#FACC15",AMBER="#F59E0B",RED="#EF4444",CYAN="#22D3EE";
const card={background:CARD,borderRadius:10,border:`1px solid ${BORDER}`};
const inp={width:"100%",padding:"8px 12px",background:NEAR_BLACK,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,fontSize:12,boxSizing:"border-box"};

const STEPS = [
  "Organization Information",
  "SMS Structure Overview",
  "Part 5 Compliance Mapping",
  "Supporting Evidence Summary",
  "Schedule of Events",
  "Generate & Download",
];

export default function DeclarationWizard({
  org, session, profiles, frats, flights, reports, hazards, actions, policies,
  trainingRecords, smsManuals, dataCtx, reqStatuses, summary, subpartNames,
  part5Requirements, subpartGroups, manualStatuses,
  declarations, onSave, onUpdate, onUploadPdf, onClose,
}) {
  const [step, setStep] = useState(0);
  const [wizardData, setWizardData] = useState(() => {
    const latest = (declarations || [])[0];
    if (latest?.wizard_data && Object.keys(latest.wizard_data).length > 0) return latest.wizard_data;
    return { orgInfo: {}, smsStructure: {}, complianceAck: false, evidence: {}, milestones: [] };
  });
  const [generating, setGenerating] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [savedId, setSavedId] = useState(() => (declarations || [])[0]?.id || null);

  // Auto-populate org info
  const autoOrg = useMemo(() => {
    const ae = (profiles || []).find(p => p.role === "accountable_exec");
    const sm = (profiles || []).find(p => p.role === "safety_manager");
    return {
      orgName: org?.name || "",
      certificateNumber: org?.certificate_number || "",
      mailingAddress: org?.mailing_address || "",
      chdoName: org?.chdo_name || "",
      chdoLocation: org?.chdo_location || "",
      aeName: ae ? `${ae.first_name || ""} ${ae.last_name || ""}`.trim() : "",
      aeTitle: ae?.title || "Accountable Executive",
      smName: sm ? `${sm.first_name || ""} ${sm.last_name || ""}`.trim() : "",
      smTitle: sm?.title || "Safety Manager",
    };
  }, [org, profiles]);

  const orgInfo = { ...autoOrg, ...(wizardData.orgInfo || {}) };

  const updateField = (section, key, value) => {
    setWizardData(prev => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [key]: value },
    }));
  };

  // Step 2: SMS Structure auto-detection
  const smsChecklist = useMemo(() => {
    const d = dataCtx || {};
    return {
      safetyPolicy: [
        { label: "Safety policies published", ok: (policies || []).length > 0 },
        { label: "Accountable Executive designated", ok: (profiles || []).some(p => p.role === "accountable_exec") },
        { label: "Safety reporting active", ok: true },
      ],
      safetyRiskManagement: [
        { label: "FRAT risk assessments active", ok: (frats || []).length > 0 },
        { label: "Hazard register populated", ok: (hazards || []).length > 0 },
        { label: "Risk matrix configured", ok: true },
      ],
      safetyAssurance: [
        { label: "Safety Performance Indicators", ok: !!d.fratCount },
        { label: "Internal audits / evaluations", ok: (smsManuals || []).length > 0 || (policies || []).length > 1 },
        { label: "Corrective actions tracked", ok: (actions || []).length > 0 },
      ],
      safetyPromotion: [
        { label: "Training records maintained", ok: (trainingRecords || []).length > 0 },
        { label: "SMS manuals published", ok: (smsManuals || []).length > 0 },
        { label: "Policy acknowledgment tracking", ok: (d.policyAckCount || 0) > 0 },
      ],
    };
  }, [dataCtx, policies, profiles, frats, hazards, actions, trainingRecords, smsManuals]);

  // Step 4: Evidence stats
  const evidenceStats = useMemo(() => {
    const sortedFrats = [...(frats || [])].sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));
    const closedActions = (actions || []).filter(a => a.status === "completed" || a.status === "closed");
    const totalProfiles = (profiles || []).filter(p => p.role !== "pending").length;
    const trainedCount = (trainingRecords || []).length;
    return {
      firstFrat: sortedFrats.length > 0 ? (sortedFrats[0].timestamp || sortedFrats[0].created_at || "").split("T")[0] : "N/A",
      totalFrats: (frats || []).length,
      totalReports: (reports || []).length,
      totalHazards: (hazards || []).length,
      totalActions: (actions || []).length,
      closedActions: closedActions.length,
      trainingCompliance: totalProfiles > 0 ? Math.round(trainedCount / totalProfiles * 100) : 0,
      totalPolicies: (policies || []).length,
      policyAckCount: (dataCtx || {}).policyAckCount || 0,
    };
  }, [frats, reports, hazards, actions, profiles, trainingRecords, policies, dataCtx]);

  // Step 5: Auto milestones
  const autoMilestones = useMemo(() => {
    const ms = [];
    const earliest = (arr, field) => {
      if (!arr || arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => new Date(a[field] || a.created_at) - new Date(b[field] || b.created_at));
      return (sorted[0][field] || sorted[0].created_at || "").split("T")[0];
    };
    if (org?.created_at) ms.push({ date: (org.created_at || "").split("T")[0], title: "Organization registered in PreflightSMS", auto: true });
    const ep = earliest(policies, "created_at");
    if (ep) ms.push({ date: ep, title: "First safety policy published", auto: true });
    const ef = earliest(frats, "timestamp");
    if (ef) ms.push({ date: ef, title: "First FRAT submitted", auto: true });
    const er = earliest(reports, "created_at");
    if (er) ms.push({ date: er, title: "First safety report filed", auto: true });
    const em = earliest(smsManuals, "created_at");
    if (em) ms.push({ date: em, title: "SMS manual first published", auto: true });
    const et = earliest(trainingRecords, "created_at");
    if (et) ms.push({ date: et, title: "Training program launched", auto: true });
    ms.sort((a, b) => a.date.localeCompare(b.date));
    return ms;
  }, [org, policies, frats, reports, smsManuals, trainingRecords]);

  const allMilestones = [...autoMilestones, ...(wizardData.milestones || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");

  const addMilestone = () => {
    if (!newMilestoneTitle.trim() || !newMilestoneDate) return;
    setWizardData(prev => ({
      ...prev,
      milestones: [...(prev.milestones || []), { title: newMilestoneTitle.trim(), date: newMilestoneDate, auto: false }],
    }));
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
  };

  const removeMilestone = (idx) => {
    setWizardData(prev => ({
      ...prev,
      milestones: (prev.milestones || []).filter((_, i) => i !== idx),
    }));
  };

  // Step 3: subpart compliance
  const subpartCompliance = useMemo(() => {
    const result = {};
    Object.entries(subpartGroups || {}).forEach(([sp, reqs]) => {
      const compliant = reqs.filter(r => reqStatuses[r.id] === "compliant").length;
      result[sp] = { total: reqs.length, compliant, pct: Math.round(compliant / reqs.length * 100) };
    });
    return result;
  }, [subpartGroups, reqStatuses]);

  // Generate PDF — formal letter per AC 120-92D / Notice 8900.700
  const generatePdf = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const margin = 72; // 1-inch margins
      const textW = W - margin * 2;
      let y = 72;
      const leading = 15; // line spacing for body text
      const paraGap = 10; // extra space between paragraphs

      const checkPage = (needed) => {
        if (y + needed > H - 72) {
          doc.addPage();
          y = 72;
        }
      };

      // Helper: write wrapped paragraph
      const writePara = (text, opts = {}) => {
        const fontSize = opts.fontSize || 11;
        const font = opts.font || "normal";
        const indent = opts.indent || 0;
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", font);
        const lines = doc.splitTextToSize(text, textW - indent);
        lines.forEach(line => {
          checkPage(leading);
          doc.text(line, margin + indent, y);
          y += leading;
        });
        y += paraGap;
      };

      const today = new Date();
      const dateStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // ── LETTERHEAD ──
      // Try to load org logo
      if (org?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = org.logo_url;
          });
          doc.addImage(img, "PNG", margin, y, 50, 50);
          y += 58;
        } catch { /* logo load failed, skip */ }
      }

      // Organization block
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(orgInfo.orgName || "[Organization Name]", margin, y);
      y += 16;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (orgInfo.mailingAddress) { doc.text(orgInfo.mailingAddress, margin, y); y += 13; }
      if (orgInfo.certificateNumber) { doc.text(`FAA Certificate No. ${orgInfo.certificateNumber}`, margin, y); y += 13; }
      y += 10;

      // Date
      doc.setFontSize(11);
      doc.text(dateStr, margin, y);
      y += 24;

      // Addressee
      const chdoLine = [orgInfo.chdoName, orgInfo.chdoLocation].filter(Boolean).join(", ");
      writePara(chdoLine || "[Certificate Holding District Office]");
      writePara("Federal Aviation Administration");
      y -= paraGap; // tighten address block
      y += 10;

      // Subject line
      doc.setFont("helvetica", "bold");
      doc.text("Re: Declaration of Compliance — 14 CFR Part 5 Safety Management System", margin, y);
      y += 24;

      // ── SALUTATION ──
      writePara("Dear Sir or Madam:");

      // ── PARAGRAPH 1: FORMAL DECLARATION ──
      writePara(
        `This letter serves as the Declaration of Compliance for ${orgInfo.orgName || "[Organization Name]"}, ` +
        `holder of FAA Certificate No. ${orgInfo.certificateNumber || "[Certificate Number]"}, ` +
        `in accordance with 14 CFR Part 5 and the guidance set forth in Advisory Circular (AC) 120-92D ` +
        `and FAA Notice 8900.700.`
      );

      writePara(
        `${orgInfo.orgName || "[Organization Name]"} hereby declares that it has developed and implemented ` +
        `a Safety Management System (SMS) that meets the requirements of Title 14 of the Code of Federal ` +
        `Regulations (14 CFR) Part 5, Safety Management Systems. This SMS has been designed, documented, ` +
        `and integrated into the operations of this certificate holder as described herein.`
      );

      // ── PARAGRAPH 2: SMS COMPONENTS ──
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      checkPage(20);
      doc.text("SMS Components", margin, y);
      y += 18;

      writePara(
        `The SMS implemented by ${orgInfo.orgName || "[Organization Name]"} encompasses all four ` +
        `components required by 14 CFR Part 5:`
      );

      // Component 1: Safety Policy (Subpart B)
      writePara("1.  Safety Policy (Subpart B, §§ 5.21–5.27)", { font: "bold", indent: 10 });
      writePara(
        `The accountable executive, ${orgInfo.aeName || "[Name]"} (${orgInfo.aeTitle || "Accountable Executive"}), ` +
        `has established and signed a safety policy that defines the organization's safety objectives and ` +
        `commitment to the SMS. This policy communicates management's commitment to safety, defines methods ` +
        `for employee safety reporting, and clearly designates safety accountabilities and authorities ` +
        `throughout the organization. An emergency response plan has been developed and is maintained ` +
        `in accordance with § 5.27.`,
        { indent: 28 }
      );

      // Component 2: SRM (Subpart C)
      writePara("2.  Safety Risk Management (Subpart C, §§ 5.51–5.57)", { font: "bold", indent: 10 });
      writePara(
        `The organization has implemented a Safety Risk Management (SRM) process for identifying hazards, ` +
        `analyzing and assessing risk, and developing mitigations to an acceptable level of safety. ` +
        `Hazards are identified through employee safety reporting, operational data analysis, internal ` +
        `evaluations, and other systematic methods. Risk is assessed using a documented risk matrix ` +
        `that evaluates severity and likelihood. When risk is found to be unacceptable, mitigations ` +
        `are developed, implemented, and tracked to completion. The SRM process is applied when ` +
        `designing new systems, making operational changes, or when existing operations are found ` +
        `to have unacceptable risk as described in § 5.51.`,
        { indent: 28 }
      );

      // Component 3: Safety Assurance (Subpart D)
      writePara("3.  Safety Assurance (Subpart D, §§ 5.71–5.75)", { font: "bold", indent: 10 });
      writePara(
        `The organization has established Safety Assurance processes to evaluate the continued ` +
        `effectiveness of risk mitigations and the SMS itself. These processes include continuous ` +
        `monitoring of operational data, employee reporting programs, internal evaluations and ` +
        `audits, and analysis of safety performance against established safety performance ` +
        `indicators. When deficiencies are identified, corrective actions are developed and ` +
        `tracked through resolution in accordance with § 5.75.`,
        { indent: 28 }
      );

      // Component 4: Safety Promotion (Subpart E)
      writePara("4.  Safety Promotion (Subpart E, §§ 5.91–5.95)", { font: "bold", indent: 10 });
      writePara(
        `The organization provides SMS training and education to all personnel commensurate with ` +
        `their safety responsibilities. Safety communication ensures that all employees are aware ` +
        `of the SMS, that safety-critical information is conveyed, and that personnel understand ` +
        `why safety actions are taken. The organization maintains documentation of the SMS, ` +
        `including all safety policies, SRM processes, and safety assurance activities, in ` +
        `accordance with § 5.95.`,
        { indent: 28 }
      );

      // ── PARAGRAPH 3: ACCOUNTABLE EXECUTIVE RESPONSIBILITIES ──
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      checkPage(20);
      doc.text("Accountable Executive Responsibilities", margin, y);
      y += 18;

      writePara(
        `In accordance with § 5.25, the accountable executive, ${orgInfo.aeName || "[Name]"}, ` +
        `is the person who has ultimate responsibility for the operations and activities authorized ` +
        `under the certificate, has full authority over operations conducted under the certificate, ` +
        `has final authority over SMS activities, and controls the financial resources required for ` +
        `SMS operations. The accountable executive is responsible for ensuring the SMS is properly ` +
        `implemented, performing as designed, and regularly reviewed. The accountable executive ` +
        `ensures that the SRM process is integrated into operational decision-making and that ` +
        `adequate resources are allocated for safety management activities.`
      );

      // ── PARAGRAPH 4: SAFETY MANAGER / SMS POINT OF CONTACT ──
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      checkPage(20);
      doc.text("SMS Point of Contact", margin, y);
      y += 18;

      writePara(
        `${orgInfo.smName || "[Name]"} (${orgInfo.smTitle || "Safety Manager"}) serves as the designated SMS ` +
        `point of contact for this organization and is responsible for the day-to-day administration of the ` +
        `SMS. This individual may be contacted regarding any matters related to SMS implementation, ` +
        `compliance, or coordination with the FAA Certificate Management Office.`
      );

      // ── PARAGRAPH 5: SUPPORTING DOCUMENTATION ──
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      checkPage(20);
      doc.text("Supporting Documentation", margin, y);
      y += 18;

      writePara(
        `The following documentation is maintained by ${orgInfo.orgName || "[Organization Name]"} and ` +
        `is available for review upon request by the FAA Certificate Management Office:`
      );

      const supportingDocs = [
        "Safety Management System Manual",
        "Safety Policy, signed by the Accountable Executive",
        "Safety Risk Management procedures and records",
        "Hazard register and risk assessments",
        "Emergency Response Plan",
        "Safety Assurance program and internal evaluation records",
        "Safety Performance Indicators and targets",
        "Safety Promotion and training program records",
        "Employee safety reporting system records",
        "Corrective action tracking records",
      ];
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      supportingDocs.forEach(item => {
        checkPage(leading);
        doc.text(`•   ${item}`, margin + 20, y);
        y += leading;
      });
      y += paraGap;

      // ── CLOSING DECLARATION ──
      writePara(
        `By signing below, the undersigned accountable executive hereby certifies that ` +
        `${orgInfo.orgName || "[Organization Name]"} has developed and implemented a Safety ` +
        `Management System that meets all applicable requirements of 14 CFR Part 5. This declaration ` +
        `is submitted in accordance with § 5.7 and the guidance provided in AC 120-92D and ` +
        `FAA Notice 8900.700.`
      );

      writePara("Respectfully submitted,");
      y += 10;

      // ── SIGNATURE BLOCKS ──
      checkPage(120);

      // AE signature
      doc.line(margin, y, margin + 240, y);
      y += 14;
      doc.setFont("helvetica", "bold");
      doc.text(orgInfo.aeName || "___________________________", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.text(orgInfo.aeTitle || "Accountable Executive", margin, y);
      y += 14;
      doc.text(`${orgInfo.orgName || "[Organization Name]"}`, margin, y);
      y += 20;
      doc.text("Date: ___________________________", margin, y);
      y += 36;

      // SM signature
      doc.line(margin, y, margin + 240, y);
      y += 14;
      doc.setFont("helvetica", "bold");
      doc.text(orgInfo.smName || "___________________________", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.text(orgInfo.smTitle || "Safety Manager / SMS Point of Contact", margin, y);
      y += 14;
      doc.text(`${orgInfo.orgName || "[Organization Name]"}`, margin, y);
      y += 20;
      doc.text("Date: ___________________________", margin, y);

      // Footer on every page
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`${orgInfo.orgName || ""} — Declaration of Compliance — 14 CFR Part 5`, W / 2, H - 30, { align: "center" });
        doc.text(`Page ${i} of ${totalPages}`, W - margin, H - 30, { align: "right" });
        doc.setTextColor(0);
      }

      // Save record
      const pdfBlob = doc.output("blob");
      const latest = (declarations || [])[0];
      let declId = savedId;

      if (declId) {
        await onUpdate(declId, { wizard_data: wizardData, status: "generated" });
      } else {
        const version = latest ? latest.version + 1 : 1;
        const { data: newDecl } = await onSave({
          version,
          status: "generated",
          wizard_data: wizardData,
          created_by: session?.user?.id,
        });
        if (newDecl) declId = newDecl.id;
        setSavedId(declId);
      }

      // Upload PDF
      if (declId && onUploadPdf) {
        const { data: url } = await onUploadPdf(org?.id, declId, pdfBlob);
        if (url) {
          await onUpdate(declId, { pdf_url: url });
          setGeneratedPdfUrl(url);
        }
      }

      // Also trigger download
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Declaration_of_Compliance_v${(declarations || [])[0]?.version || 1}_${orgInfo.orgName.replace(/\s+/g, "_") || "org"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const markSubmitted = async () => {
    if (!savedId) return;
    await onUpdate(savedId, { submitted_to_faa_date: new Date().toISOString().split("T")[0], status: "submitted" });
  };

  const createNewVersion = () => {
    setSavedId(null);
    setGeneratedPdfUrl(null);
    setStep(0);
  };

  // ── RENDER ──
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Declaration of Compliance Wizard</div>
          <div style={{ fontSize: 11, color: MUTED }}>14 CFR Part 5 — Part 135 Certificate Holder</div>
        </div>
        <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: MUTED, border: `1px solid ${BORDER}` }}>
          Back to Audit Log
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <div key={i} onClick={() => setStep(i)} style={{ flex: 1, padding: "8px 4px", textAlign: "center", cursor: "pointer", borderRadius: 6,
            background: i === step ? `${CYAN}22` : i < step ? `${GREEN}15` : NEAR_BLACK,
            border: `1px solid ${i === step ? CYAN : i < step ? GREEN + "44" : BORDER}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: i === step ? CYAN : i < step ? GREEN : MUTED }}>{i + 1}</div>
            <div style={{ fontSize: 8, color: i === step ? CYAN : i < step ? GREEN : MUTED, marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        {/* Step 1: Organization Information */}
        {step === 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Organization Information</div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Auto-populated from your organization profile. Edit as needed.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { key: "orgName", label: "Organization Name" },
                { key: "certificateNumber", label: "Certificate Number" },
                { key: "mailingAddress", label: "Mailing Address" },
                { key: "chdoName", label: "CHDO Name" },
                { key: "chdoLocation", label: "CHDO Location" },
                { key: "aeName", label: "Accountable Executive Name" },
                { key: "aeTitle", label: "AE Title" },
                { key: "smName", label: "Safety Manager Name" },
                { key: "smTitle", label: "SM Title" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, color: MUTED, display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input style={inp} value={orgInfo[f.key] || ""} onChange={e => updateField("orgInfo", f.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: SMS Structure Overview */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>SMS Structure Overview</div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>The four pillars of your SMS, auto-detected from system data.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { title: "Safety Policy", key: "safetyPolicy", icon: "I" },
                { title: "Safety Risk Management", key: "safetyRiskManagement", icon: "II" },
                { title: "Safety Assurance", key: "safetyAssurance", icon: "III" },
                { title: "Safety Promotion", key: "safetyPromotion", icon: "IV" },
              ].map(pillar => (
                <div key={pillar.key} style={{ ...card, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: `${CYAN}22`, color: CYAN, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{pillar.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>{pillar.title}</span>
                  </div>
                  {smsChecklist[pillar.key].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <span style={{ fontSize: 12, color: item.ok ? GREEN : AMBER }}>{item.ok ? "\u2713" : "\u26A0"}</span>
                      <span style={{ fontSize: 11, color: item.ok ? OFF_WHITE : AMBER }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Part 5 Compliance Mapping */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Part 5 Compliance Mapping</div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Current compliance status from the FAA Audit Log. Review before proceeding.</div>

            {/* Overall bar */}
            <div style={{ padding: "10px 14px", background: NEAR_BLACK, borderRadius: 6, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: OFF_WHITE, fontWeight: 600 }}>Overall Compliance</span>
                <span style={{ fontSize: 11, color: WHITE, fontWeight: 700 }}>{Math.round(summary.compliant / summary.total * 100)}%</span>
              </div>
              <div style={{ height: 6, background: CARD, borderRadius: 3, overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${summary.compliant / summary.total * 100}%`, background: GREEN }} />
                <div style={{ width: `${summary.needs_attention / summary.total * 100}%`, background: AMBER }} />
                <div style={{ width: `${summary.manual_review / summary.total * 100}%`, background: MUTED }} />
              </div>
            </div>

            {/* Per-subpart bars */}
            {Object.entries(subpartCompliance).map(([sp, data]) => (
              <div key={sp} style={{ padding: "8px 14px", background: NEAR_BLACK, borderRadius: 6, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: OFF_WHITE }}>Subpart {sp}: {(subpartNames || {})[sp] || sp}</span>
                  <span style={{ fontSize: 10, color: data.pct === 100 ? GREEN : WHITE, fontWeight: 600 }}>{data.compliant}/{data.total} ({data.pct}%)</span>
                </div>
                <div style={{ height: 4, background: CARD, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${data.pct}%`, height: "100%", background: data.pct === 100 ? GREEN : AMBER, borderRadius: 2 }} />
                </div>
                {data.pct < 100 && (
                  <div style={{ marginTop: 6 }}>
                    {(subpartGroups[sp] || []).filter(r => reqStatuses[r.id] !== "compliant").map(r => (
                      <div key={r.id} style={{ fontSize: 9, color: AMBER, padding: "2px 0" }}>
                        {"\u26A0"} {r.section} — {r.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Acknowledge checkbox */}
            <div style={{ marginTop: 16, padding: "12px 14px", background: NEAR_BLACK, borderRadius: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={wizardData.complianceAck || false}
                onChange={e => setWizardData(prev => ({ ...prev, complianceAck: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: CYAN }} />
              <span style={{ fontSize: 11, color: OFF_WHITE }}>I acknowledge the current compliance status and understand that all requirements must be met by May 28, 2027.</span>
            </div>
          </div>
        )}

        {/* Step 4: Supporting Evidence Summary */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Supporting Evidence Summary</div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Auto-calculated from your system data. Add notes for any metric as needed.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { key: "firstFrat", label: "First FRAT Date", value: evidenceStats.firstFrat },
                { key: "totalFrats", label: "Total FRATs", value: evidenceStats.totalFrats },
                { key: "totalReports", label: "Safety Reports", value: evidenceStats.totalReports },
                { key: "totalHazards", label: "Hazard Investigations", value: evidenceStats.totalHazards },
                { key: "totalActions", label: "Corrective Actions", value: `${evidenceStats.totalActions} (${evidenceStats.closedActions} closed)` },
                { key: "trainingCompliance", label: "Training Compliance", value: `${evidenceStats.trainingCompliance}%` },
                { key: "totalPolicies", label: "Published Policies", value: evidenceStats.totalPolicies },
                { key: "policyAckCount", label: "Policy Acknowledgments", value: evidenceStats.policyAckCount },
              ].map(stat => (
                <div key={stat.key} style={{ padding: "12px 14px", background: NEAR_BLACK, borderRadius: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: MUTED }}>{stat.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{stat.value}</span>
                  </div>
                  <textarea style={{ ...inp, height: 48, resize: "vertical", fontSize: 10 }}
                    placeholder="Add notes..."
                    value={(wizardData.evidence || {})[stat.key] || ""}
                    onChange={e => updateField("evidence", stat.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Schedule of Events */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Schedule of Events</div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Key milestones auto-detected from your system data. Add custom milestones below.</div>

            {allMilestones.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: NEAR_BLACK, borderRadius: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: CYAN, minWidth: 90 }}>{m.date}</span>
                <span style={{ fontSize: 11, color: OFF_WHITE, flex: 1 }}>{m.title}</span>
                {m.auto ? (
                  <span style={{ fontSize: 8, color: MUTED, padding: "2px 6px", borderRadius: 3, background: CARD }}>Auto</span>
                ) : (
                  <button onClick={() => removeMilestone(i - autoMilestones.length)} style={{ fontSize: 10, color: RED, background: "transparent", border: "none", cursor: "pointer" }}>Remove</button>
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: MUTED, display: "block", marginBottom: 4 }}>Milestone Title</label>
                <input style={inp} value={newMilestoneTitle} onChange={e => setNewMilestoneTitle(e.target.value)} placeholder="e.g., Gap analysis completed" />
              </div>
              <div style={{ width: 150 }}>
                <label style={{ fontSize: 10, color: MUTED, display: "block", marginBottom: 4 }}>Date</label>
                <input type="date" style={inp} value={newMilestoneDate} onChange={e => setNewMilestoneDate(e.target.value)} />
              </div>
              <button onClick={addMilestone} style={{ padding: "8px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: `${CYAN}22`, color: CYAN, border: `1px solid ${CYAN}44`, whiteSpace: "nowrap" }}>
                Add Milestone
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Generate & Download */}
        {step === 5 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Generate & Download</div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Generate a professional PDF of your Declaration of Compliance.</div>

            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <button onClick={generatePdf} disabled={generating}
                style={{ padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: generating ? "wait" : "pointer",
                  background: generating ? MUTED : CYAN, color: BLACK, border: "none" }}>
                {generating ? "Generating..." : "Generate Declaration PDF"}
              </button>
              {generatedPdfUrl && (
                <button onClick={markSubmitted}
                  style={{ padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}44` }}>
                  Mark as Submitted to FAA
                </button>
              )}
            </div>

            {/* Version history */}
            {(declarations || []).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Version History</div>
                {(declarations || []).map(d => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: NEAR_BLACK, borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: WHITE }}>v{d.version}</span>
                    <span style={{ fontSize: 10, color: MUTED }}>{new Date(d.created_at).toLocaleDateString()}</span>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3,
                      background: d.status === "submitted" ? `${GREEN}15` : d.status === "generated" ? `${CYAN}15` : `${MUTED}15`,
                      color: d.status === "submitted" ? GREEN : d.status === "generated" ? CYAN : MUTED,
                      border: `1px solid ${d.status === "submitted" ? GREEN : d.status === "generated" ? CYAN : MUTED}33` }}>
                      {d.status === "submitted" ? `Submitted ${d.submitted_to_faa_date || ""}` : d.status}
                    </span>
                    {d.pdf_url && (
                      <a href={d.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: CYAN, textDecoration: "none" }}>Download PDF</a>
                    )}
                  </div>
                ))}
                <button onClick={createNewVersion}
                  style={{ marginTop: 8, padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: "transparent", color: CYAN, border: `1px solid ${CYAN}44` }}>
                  Create New Version
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          style={{ padding: "8px 20px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: step === 0 ? "default" : "pointer",
            background: "transparent", color: step === 0 ? MUTED : OFF_WHITE, border: `1px solid ${step === 0 ? BORDER : LIGHT_BORDER}` }}>
          Back
        </button>
        {step < STEPS.length - 1 && (
          <button onClick={() => setStep(step + 1)}
            style={{ padding: "8px 20px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: CYAN, color: BLACK, border: "none" }}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
