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

export default function InternationalCompliance({
  profile, session, org, orgProfiles,
  complianceFrameworks, checklistItems, complianceStatus, crosswalkData,
  onUpsertFramework, onDeleteFramework, onUpsertStatus, onRefresh,
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

  // Compliance stats per framework
  const frameworkStats = useMemo(() => {
    const stats = {};
    Object.entries(itemsByFramework).forEach(([fw, fwItems]) => {
      const total = fwItems.length;
      let compliant = 0, nonCompliant = 0, inProgress = 0, notStarted = 0, na = 0;
      fwItems.forEach(item => {
        const s = statusMap[item.id]?.status || "not_started";
        if (s === "compliant") compliant++;
        else if (s === "non_compliant") nonCompliant++;
        else if (s === "in_progress") inProgress++;
        else if (s === "not_applicable") na++;
        else notStarted++;
      });
      const applicable = total - na;
      stats[fw] = { total, compliant, nonCompliant, inProgress, notStarted, na, applicable, pct: applicable > 0 ? Math.round((compliant / applicable) * 100) : 0 };
    });
    return stats;
  }, [itemsByFramework, statusMap]);

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
        <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginBottom: 16 }}>Compliance Frameworks</div>
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
          const sectionCompliant = allItems.filter(i => (statusMap[i.id]?.status || "not_started") === "compliant").length;
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
                  <ChecklistItem item={section} statusMap={statusMap} onUpdate={handleStatusUpdate} isAdmin={isAdmin} fwColor={fwMeta?.color} profile={profile} />
                  {/* Child items */}
                  {sectionChildren.map(child => (
                    <ChecklistItem key={child.id} item={child} statusMap={statusMap} onUpdate={handleStatusUpdate} isAdmin={isAdmin} fwColor={fwMeta?.color} profile={profile} />
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
          const statusLabel = STATUS_OPTIONS.find(o => o.id === (s?.status || "not_started"))?.label || "Not Started";
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
function ChecklistItem({ item, statusMap, onUpdate, isAdmin, fwColor, profile }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const s = statusMap[item.id];
  const currentStatus = s?.status || "not_started";
  const sc = STATUS_OPTIONS.find(o => o.id === currentStatus) || STATUS_OPTIONS[0];

  useEffect(() => {
    setNotes(s?.evidence_notes || "");
  }, [s]);

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: "10px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: sc.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: fwColor || CYAN, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>{item.section_number}</span>
          <span style={{ fontSize: 12, color: OFF_WHITE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.section_title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={badge(`${sc.color}22`, sc.color)}>{sc.label}</span>
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
