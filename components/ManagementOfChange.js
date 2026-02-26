import { useState, useMemo, useEffect, useRef } from "react";

const CARD = "#161616", NEAR_BLACK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", BLACK = "#000000";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };
const labelStyle = { display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 };

const STATUSES = [
  { id: "identified", label: "Identified", color: CYAN },
  { id: "analyzing", label: "Analyzing", color: "#A78BFA" },
  { id: "mitigating", label: "Mitigating", color: YELLOW },
  { id: "implementing", label: "Implementing", color: "#F97316" },
  { id: "monitoring", label: "Monitoring", color: "#60A5FA" },
  { id: "closed", label: "Closed", color: MUTED },
];

const PRIORITIES = [
  { id: "low", label: "Low", color: GREEN },
  { id: "medium", label: "Medium", color: YELLOW },
  { id: "high", label: "High", color: "#F97316" },
  { id: "critical", label: "Critical", color: RED },
];

const CHANGE_TYPES = [
  { id: "new_route", label: "New Route" },
  { id: "fleet_change", label: "Fleet Change" },
  { id: "crew_change", label: "Crew Change" },
  { id: "procedure_change", label: "Procedure Change" },
  { id: "regulatory_change", label: "Regulatory Change" },
  { id: "facility_change", label: "Facility Change" },
  { id: "vendor_change", label: "Vendor Change" },
  { id: "technology_change", label: "Technology Change" },
  { id: "other", label: "Other" },
];

const LIKELIHOOD_LABELS = ["", "Improbable", "Remote", "Occasional", "Probable", "Frequent"];
const SEVERITY_LABELS = ["", "Negligible", "Minor", "Major", "Hazardous", "Catastrophic"];

function riskColor(score) {
  if (score <= 4) return GREEN;
  if (score <= 9) return YELLOW;
  if (score <= 16) return "#F97316";
  return RED;
}

function riskLabel(score) {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

// ── Risk Matrix (reused from HazardRegister pattern) ──
function RiskMatrix({ likelihood, severity, onChange, label }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "80px repeat(5, 1fr)", gap: 2 }}>
        <div />
        {[1,2,3,4,5].map(s => (
          <div key={s} style={{ textAlign: "center", fontSize: 8, color: MUTED, padding: "4px 0" }}>
            {SEVERITY_LABELS[s]}
          </div>
        ))}
        {[5,4,3,2,1].map(l => (
          [
            <div key={`l${l}`} style={{ fontSize: 8, color: MUTED, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
              {LIKELIHOOD_LABELS[l]}
            </div>,
            ...[1,2,3,4,5].map(s => {
              const score = l * s;
              const selected = likelihood === l && severity === s;
              return (
                <button key={`${l}-${s}`} onClick={() => onChange(l, s)}
                  style={{
                    width: "100%", aspectRatio: "1", border: selected ? `2px solid ${WHITE}` : `1px solid ${BORDER}`,
                    borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700,
                    background: `${riskColor(score)}${selected ? "88" : "22"}`,
                    color: selected ? WHITE : `${riskColor(score)}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {score}
                </button>
              );
            })
          ]
        )).flat()}
      </div>
      {likelihood > 0 && severity > 0 && (
        <div style={{ marginTop: 6, textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: riskColor(likelihood * severity) }}>
            {riskLabel(likelihood * severity)} Risk ({likelihood * severity})
          </span>
          <span style={{ fontSize: 10, color: MUTED }}> — {LIKELIHOOD_LABELS[likelihood]} likelihood, {SEVERITY_LABELS[severity]} severity</span>
        </div>
      )}
    </div>
  );
}

// ── Hazard Row ──
function HazardRow({ hazard, index, onChange, onRemove }) {
  return (
    <div style={{ padding: "12px 14px", background: NEAR_BLACK, borderRadius: 6, marginBottom: 8, border: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>HAZARD {index + 1}</span>
        <button onClick={onRemove} style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Hazard Description</label>
        <input style={inp} value={hazard.hazard || ""} onChange={e => onChange({ ...hazard, hazard: e.target.value })} placeholder="Describe the hazard..." />
      </div>
      <RiskMatrix
        likelihood={hazard.likelihood || 0}
        severity={hazard.severity || 0}
        onChange={(l, s) => onChange({ ...hazard, likelihood: l, severity: s, risk_level: riskLabel(l * s) })}
        label="Risk Assessment"
      />
    </div>
  );
}

// ── Creation Form ──
function MocForm({ onSubmit, onCancel, orgProfiles, session }) {
  const [form, setForm] = useState({
    title: "", change_type: "procedure_change", description: "", priority: "medium", responsible_id: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>New Change Request</div>
          <div style={{ fontSize: 11, color: MUTED }}>&sect;5.53 — Management of Change</div>
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Change Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. New SFO-LAX route addition" style={inp} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Description *</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)}
          placeholder="Describe the change, its scope, and potential impact" rows={4}
          style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }} className="report-grid">
        <div>
          <label style={labelStyle}>Change Type</label>
          <select value={form.change_type} onChange={e => set("change_type", e.target.value)} style={inp}>
            {CHANGE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Priority</label>
          <select value={form.priority} onChange={e => set("priority", e.target.value)} style={inp}>
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Responsible Person</label>
          <select value={form.responsible_id} onChange={e => set("responsible_id", e.target.value)} style={inp}>
            <option value="">— Select —</option>
            {(orgProfiles || []).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>
      <button onClick={() => { if (!form.title.trim() || !form.description.trim()) return; onSubmit(form); }} disabled={!form.title.trim() || !form.description.trim()}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: (!form.title.trim() || !form.description.trim()) ? 0.4 : 1 }}>
        Create Change Request
      </button>
    </div>
  );
}

// ── Detail View ──
function MocDetail({ item, orgProfiles, onUpdate, onClose, onUploadFile, onFetchAttachments, onCreateAttachment, onDeleteAttachment }) {
  const [form, setForm] = useState({ ...item });
  const [hazards, setHazards] = useState(item.identified_hazards || []);
  const [residual, setResidual] = useState(item.residual_risk || []);
  const [attachments, setAttachments] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (item.id && onFetchAttachments) {
      onFetchAttachments(item.id).then(att => setAttachments(att || []));
    }
    // Build activity log from timestamps
    const log = [];
    if (item.created_at) log.push({ date: item.created_at, text: "Change request created" });
    if (item.updated_at && item.updated_at !== item.created_at) log.push({ date: item.updated_at, text: "Last updated" });
    if (item.closed_at) log.push({ date: item.closed_at, text: "Change closed" });
    log.sort((a, b) => new Date(b.date) - new Date(a.date));
    setActivityLog(log);
  }, [item]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const priority = PRIORITIES.find(p => p.id === form.priority) || PRIORITIES[1];
  const status = STATUSES.find(s => s.id === form.status) || STATUSES[0];
  const changeType = CHANGE_TYPES.find(t => t.id === form.change_type) || CHANGE_TYPES[8];

  const save = (extra) => {
    const updates = {
      title: form.title,
      change_type: form.change_type,
      description: form.description,
      priority: form.priority,
      responsible_id: form.responsible_id || null,
      mitigation_plan: form.mitigation_plan,
      implementation_date: form.implementation_date || null,
      review_date: form.review_date || null,
      effectiveness_review: form.effectiveness_review,
      identified_hazards: hazards,
      residual_risk: residual,
      ...extra,
    };
    onUpdate(item.id, updates);
  };

  const closeChange = () => {
    onUpdate(item.id, {
      status: "closed",
      closed_at: new Date().toISOString(),
      closed_by: null,
      effectiveness_review: form.effectiveness_review,
      identified_hazards: hazards,
      residual_risk: residual,
      mitigation_plan: form.mitigation_plan,
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile || !onCreateAttachment) return;
    setUploading(true);
    const { url, error } = await onUploadFile(item.id, file);
    if (!error && url) {
      await onCreateAttachment(item.id, { file_name: file.name, file_path: url, uploaded_by: null });
      const att = await onFetchAttachments(item.id);
      setAttachments(att || []);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={onClose} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>
          &larr; Back
        </button>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${status.color}15`, color: status.color, border: `1px solid ${status.color}33`, fontWeight: 600 }}>{status.label}</span>
          <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${priority.color}15`, color: priority.color, border: `1px solid ${priority.color}33`, fontWeight: 600 }}>{priority.label}</span>
        </div>
      </div>

      {/* Header fields */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Title</label>
        <input style={inp} value={form.title || ""} onChange={e => set("title", e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }} className="report-grid">
        <div>
          <label style={labelStyle}>Change Type</label>
          <select style={inp} value={form.change_type || ""} onChange={e => set("change_type", e.target.value)}>
            {CHANGE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Priority</label>
          <select style={inp} value={form.priority || "medium"} onChange={e => set("priority", e.target.value)}>
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Responsible Person</label>
          <select style={inp} value={form.responsible_id || ""} onChange={e => set("responsible_id", e.target.value)}>
            <option value="">— Select —</option>
            {(orgProfiles || []).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} rows={4} value={form.description || ""} onChange={e => set("description", e.target.value)} />
      </div>

      {/* Hazard Analysis */}
      <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5 }}>Hazard Analysis</div>
          <button onClick={() => setHazards(prev => [...prev, { hazard: "", likelihood: 0, severity: 0, risk_level: "" }])}
            style={{ fontSize: 10, color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}33`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
            + Add Hazard
          </button>
        </div>
        {hazards.length === 0 && <div style={{ fontSize: 11, color: MUTED, padding: "16px 0", textAlign: "center" }}>No hazards identified yet. Click "+ Add Hazard" to begin analysis.</div>}
        {hazards.map((h, i) => (
          <HazardRow key={i} hazard={h} index={i}
            onChange={(updated) => setHazards(prev => prev.map((x, j) => j === i ? updated : x))}
            onRemove={() => setHazards(prev => prev.filter((_, j) => j !== i))} />
        ))}
      </div>

      {/* Mitigation Plan */}
      <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Mitigation Plan</div>
        <textarea style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} rows={4} value={form.mitigation_plan || ""} onChange={e => set("mitigation_plan", e.target.value)}
          placeholder="Describe strategies to mitigate identified hazards..." />
      </div>

      {/* Residual Risk — only visible after mitigation plan filled */}
      {(form.mitigation_plan || "").trim().length > 0 && (
        <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5 }}>Residual Risk (Post-Mitigation)</div>
            <button onClick={() => setResidual(prev => [...prev, { hazard: "", likelihood: 0, severity: 0, risk_level: "" }])}
              style={{ fontSize: 10, color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}33`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
              + Add Residual Hazard
            </button>
          </div>
          {residual.length === 0 && <div style={{ fontSize: 11, color: MUTED, padding: "16px 0", textAlign: "center" }}>No residual risk entries. Add post-mitigation assessments.</div>}
          {residual.map((h, i) => (
            <HazardRow key={i} hazard={h} index={i}
              onChange={(updated) => setResidual(prev => prev.map((x, j) => j === i ? updated : x))}
              onRemove={() => setResidual(prev => prev.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      {/* Implementation */}
      <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Implementation</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="report-grid">
          <div>
            <label style={labelStyle}>Implementation Date</label>
            <input type="date" style={inp} value={form.implementation_date || ""} onChange={e => set("implementation_date", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Review Date</label>
            <input type="date" style={inp} value={form.review_date || ""} onChange={e => set("review_date", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Effectiveness Review — only when monitoring */}
      {form.status === "monitoring" && (
        <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Effectiveness Review</div>
          <textarea style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} rows={4} value={form.effectiveness_review || ""} onChange={e => set("effectiveness_review", e.target.value)}
            placeholder="Document the effectiveness of the change and mitigation measures..." />
          <button onClick={closeChange}
            style={{ marginTop: 10, padding: "10px 20px", background: GREEN, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            Close Change
          </button>
        </div>
      )}

      {/* Attachments */}
      <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Attachments</div>
        {attachments.length > 0 && attachments.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: NEAR_BLACK, borderRadius: 4, marginBottom: 4 }}>
            <a href={a.file_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: CYAN, textDecoration: "none" }}>{a.file_name}</a>
            <button onClick={async () => { if (onDeleteAttachment) { await onDeleteAttachment(a.id); const att = await onFetchAttachments(item.id); setAttachments(att || []); } }}
              style={{ fontSize: 9, color: RED, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
          </div>
        ))}
        <input type="file" ref={fileRef} onChange={handleFileUpload} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ marginTop: 6, fontSize: 10, color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}33`, borderRadius: 4, padding: "6px 12px", cursor: uploading ? "wait" : "pointer", fontWeight: 600 }}>
          {uploading ? "Uploading..." : "+ Upload File"}
        </button>
      </div>

      {/* Activity Log */}
      <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Activity Log</div>
        {activityLog.length === 0 && <div style={{ fontSize: 11, color: MUTED }}>No activity recorded yet.</div>}
        {activityLog.map((entry, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: i < activityLog.length - 1 ? `1px solid ${BORDER}` : "none" }}>
            <span style={{ fontSize: 10, color: MUTED, minWidth: 110 }}>{new Date(entry.date).toLocaleString()}</span>
            <span style={{ fontSize: 11, color: OFF_WHITE }}>{entry.text}</span>
          </div>
        ))}
      </div>

      {/* Save button */}
      <button onClick={() => save()}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 32 }}>
        Save Changes
      </button>
    </div>
  );
}

// ── Kanban Card ──
function KanbanCard({ item, orgProfiles, onClick, onDragStart }) {
  const priority = PRIORITIES.find(p => p.id === item.priority) || PRIORITIES[1];
  const changeType = CHANGE_TYPES.find(t => t.id === item.change_type) || CHANGE_TYPES[8];
  const responsible = (orgProfiles || []).find(p => p.id === item.responsible_id);
  const daysInStatus = Math.floor((Date.now() - new Date(item.updated_at || item.created_at).getTime()) / 86400000);

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", item.id); onDragStart?.(item.id); }}
      onClick={onClick}
      style={{ ...card, padding: "12px 14px", marginBottom: 6, cursor: "grab", transition: "border-color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#444"}
      onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: WHITE, marginBottom: 6, lineHeight: 1.3 }}>{item.title}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: `${CYAN}15`, color: CYAN, fontWeight: 600 }}>{changeType.label}</span>
        <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: `${priority.color}15`, color: priority.color, fontWeight: 600 }}>{priority.label}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {responsible ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 8, fontWeight: 700 }}>
              {(responsible.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <span style={{ fontSize: 9, color: MUTED }}>{responsible.full_name?.split(" ")[0]}</span>
          </div>
        ) : <span style={{ fontSize: 9, color: MUTED }}>Unassigned</span>}
        <span style={{ fontSize: 8, color: MUTED }}>{daysInStatus}d</span>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function ManagementOfChange({
  profile, session, orgProfiles, mocItems, onCreateMoc, onUpdateMoc, onDeleteMoc,
  onUploadFile, onFetchAttachments, onCreateAttachment, onDeleteAttachment,
}) {
  const [view, setView] = useState("kanban"); // kanban | list | form | detail
  const [selectedItem, setSelectedItem] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Filters (for list view)
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterResponsible, setFilterResponsible] = useState("all");

  const items = mocItems || [];

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      if (filterType !== "all" && i.change_type !== filterType) return false;
      if (filterPriority !== "all" && i.priority !== filterPriority) return false;
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterResponsible !== "all" && i.responsible_id !== filterResponsible) return false;
      return true;
    });
  }, [items, filterType, filterPriority, filterStatus, filterResponsible]);

  const handleCreate = async (form) => {
    await onCreateMoc({
      ...form,
      initiator_id: profile?.id,
    });
    setView("kanban");
  };

  const handleDrop = (status, e) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    const existing = items.find(i => i.id === itemId);
    if (!existing || existing.status === status) { setDragOverCol(null); return; }
    const updates = { status };
    if (status === "closed") {
      updates.closed_at = new Date().toISOString();
    }
    onUpdateMoc(itemId, updates);
    setDragOverCol(null);
  };

  const handleUpdate = async (id, updates) => {
    await onUpdateMoc(id, updates);
    // refresh selected item view with the updates
    setSelectedItem(prev => prev ? { ...prev, ...updates } : prev);
  };

  if (view === "form") {
    return <MocForm onSubmit={handleCreate} onCancel={() => setView("kanban")} orgProfiles={orgProfiles} session={session} />;
  }

  if (view === "detail" && selectedItem) {
    // Get latest data for selected item
    const latest = items.find(i => i.id === selectedItem.id) || selectedItem;
    return (
      <MocDetail
        item={latest}
        orgProfiles={orgProfiles}
        onUpdate={(id, updates) => { handleUpdate(id, updates); }}
        onClose={() => { setSelectedItem(null); setView("kanban"); }}
        onUploadFile={(mocId, file) => onUploadFile(mocId, file)}
        onFetchAttachments={onFetchAttachments}
        onCreateAttachment={onCreateAttachment}
        onDeleteAttachment={onDeleteAttachment}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>Management of Change<button onClick={() => setShowHelp(!showHelp)} title="What's this?" style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: MUTED, fontSize: 10, fontWeight: 700, marginLeft: 8, verticalAlign: "middle" }}>?</button></div>
          <div style={{ fontSize: 11, color: MUTED }}>&sect;5.53 — Identifying changes and assessing associated hazards</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", gap: 2, background: NEAR_BLACK, borderRadius: 6, padding: 2 }}>
            <button onClick={() => setView("kanban")}
              style={{ padding: "5px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none",
                background: view === "kanban" ? WHITE : "transparent", color: view === "kanban" ? BLACK : MUTED }}>
              Board
            </button>
            <button onClick={() => setView("list")}
              style={{ padding: "5px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none",
                background: view === "list" ? WHITE : "transparent", color: view === "list" ? BLACK : MUTED }}>
              List
            </button>
          </div>
          <button onClick={() => setView("form")}
            style={{ padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: WHITE, color: BLACK, border: "none" }}>
            + New Change
          </button>
        </div>
      </div>
      {showHelp && <div style={{ fontSize: 11, color: OFF_WHITE, lineHeight: 1.6, padding: "10px 14px", marginBottom: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 6 }}>Change Management tracks operational changes through structured hazard analysis. Use this when adding new routes, aircraft, procedures, or responding to regulatory changes.</div>}

      {/* Kanban View */}
      {view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUSES.length}, minmax(200px, 1fr))`, gap: 8, overflowX: "auto" }} className="moc-kanban">
          {STATUSES.map(col => {
            const colItems = items.filter(i => i.status === col.id);
            const isOver = dragOverCol === col.id;
            return (
              <div key={col.id}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(col.id, e)}
                style={{ minHeight: 300, background: isOver ? "rgba(255,255,255,0.03)" : "transparent", borderRadius: 8, padding: "0 4px", transition: "background 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 8px 8px", position: "sticky", top: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: OFF_WHITE, textTransform: "uppercase", letterSpacing: 0.5 }}>{col.label}</span>
                  <span style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>{colItems.length}</span>
                </div>
                {colItems.map(it => (
                  <KanbanCard key={it.id} item={it} orgProfiles={orgProfiles}
                    onClick={() => { setSelectedItem(it); setView("detail"); }}
                    onDragStart={() => {}} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <select style={{ ...inp, width: "auto", fontSize: 10, padding: "6px 10px" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {CHANGE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select style={{ ...inp, width: "auto", fontSize: 10, padding: "6px 10px" }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">All Priorities</option>
              {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <select style={{ ...inp, width: "auto", fontSize: 10, padding: "6px 10px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select style={{ ...inp, width: "auto", fontSize: 10, padding: "6px 10px" }} value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)}>
              <option value="all">All People</option>
              {(orgProfiles || []).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          {/* Table */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", padding: "10px 16px", borderBottom: `1px solid ${BORDER}` }}>
              {["Title", "Type", "Priority", "Status", "Responsible", "Days"].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>
              ))}
            </div>
            {filteredItems.length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: MUTED }}>No change requests match your filters.</div>
            )}
            {filteredItems.map(it => {
              const pri = PRIORITIES.find(p => p.id === it.priority) || PRIORITIES[1];
              const st = STATUSES.find(s => s.id === it.status) || STATUSES[0];
              const ct = CHANGE_TYPES.find(t => t.id === it.change_type) || CHANGE_TYPES[8];
              const resp = (orgProfiles || []).find(p => p.id === it.responsible_id);
              const days = Math.floor((Date.now() - new Date(it.updated_at || it.created_at).getTime()) / 86400000);
              return (
                <div key={it.id} onClick={() => { setSelectedItem(it); setView("detail"); }}
                  style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px", padding: "10px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: WHITE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                  <div><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${CYAN}15`, color: CYAN }}>{ct.label}</span></div>
                  <div><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${pri.color}15`, color: pri.color }}>{pri.label}</span></div>
                  <div><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${st.color}15`, color: st.color }}>{st.label}</span></div>
                  <div style={{ fontSize: 11, color: MUTED }}>{resp?.full_name || "—"}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{days}d</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && view === "kanban" && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 16, opacity: 0.5 }}>
            <path d="M24 4a20 20 0 0 1 14.14 5.86" stroke={MUTED} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M38.14 9.86A20 20 0 0 1 44 24" stroke={MUTED} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M44 24a20 20 0 0 1-5.86 14.14" stroke={MUTED} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M38.14 38.14A20 20 0 0 1 24 44" stroke={MUTED} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M24 44a20 20 0 0 1-14.14-5.86" stroke={MUTED} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M9.86 38.14A20 20 0 0 1 4 24" stroke={MUTED} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M4 24a20 20 0 0 1 5.86-14.14" stroke={MUTED} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M9.86 9.86A20 20 0 0 1 24 4" stroke={MUTED} strokeWidth="2" strokeLinecap="round" fill="none" />
            <polygon points="36,8 40,14 34,14" fill={MUTED} />
            <polygon points="12,40 8,34 14,34" fill={MUTED} />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: OFF_WHITE, marginBottom: 6 }}>No Change Requests</div>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, maxWidth: 420, margin: "0 auto", marginBottom: 20 }}>
            Management of Change helps you evaluate the safety impact of operational changes before they happen. Track new routes, fleet changes, procedure updates, and more through structured hazard analysis.
          </div>
          <button onClick={() => setView("form")}
            style={{ padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", background: WHITE, color: BLACK, border: "none" }}>
            Start a Change Request
          </button>
        </div>
      )}
    </div>
  );
}
