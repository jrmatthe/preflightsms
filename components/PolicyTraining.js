import { useState, useMemo } from "react";

const CARD = "#161616", NEAR_BLACK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", BLACK = "#000000";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };

const POLICY_CATEGORIES = [
  { id: "safety_policy", label: "Safety Policy" },
  { id: "sop", label: "Standard Operating Procedure" },
  { id: "emergency_procedures", label: "Emergency Procedures" },
  { id: "training_manual", label: "Training Manual" },
  { id: "org_chart", label: "Organization Chart" },
  { id: "sms_manual", label: "SMS Manual" },
  { id: "maintenance", label: "Maintenance" },
  { id: "operations_specs", label: "Operations Specifications" },
  { id: "other", label: "Other" },
];

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

// ── POLICY LIBRARY ────────────────────────────────────────────
function PolicyForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "safety_policy", version: "1.0",
    content: "", effectiveDate: "", reviewDate: "", status: "active",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Add Policy Document</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.21 — Safety policy documentation</div>
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Title *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. PVTAIR Safety Policy Statement" style={inp} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
          <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
            {POLICY_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Version</label>
          <input value={form.version} onChange={e => set("version", e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Status</label>
          <select value={form.status} onChange={e => set("status", e.target.value)} style={inp}>
            <option value="draft">Draft</option><option value="active">Active</option><option value="under_review">Under Review</option><option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Description</label>
        <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief summary of this document" style={inp} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Content</label>
        <textarea value={form.content} onChange={e => set("content", e.target.value)} placeholder="Paste policy text here, or leave blank if using file upload (coming soon)" rows={8} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Effective Date</label>
          <input type="date" value={form.effectiveDate} onChange={e => set("effectiveDate", e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Review Date</label>
          <input type="date" value={form.reviewDate} onChange={e => set("reviewDate", e.target.value)} style={inp} />
        </div>
      </div>
      <button onClick={() => { if (form.title.trim()) onSubmit(form); }} disabled={!form.title.trim()}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !form.title.trim() ? 0.4 : 1 }}>
        Add Document
      </button>
    </div>
  );
}

// ── TRAINING RECORDS ──────────────────────────────────────────
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

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function PolicyTraining({
  profile, session, policies, onCreatePolicy, onAcknowledgePolicy,
  trainingRequirements, trainingRecords, onCreateRequirement, onLogTraining, orgProfiles,
  smsManuals,
}) {
  const [tab, setTab] = useState("policies"); // policies | training
  const [view, setView] = useState("list");   // list | new_policy | new_training | new_requirement

  const myAcks = useMemo(() => {
    const set = new Set();
    policies.forEach(p => {
      if (p.acknowledgments?.some(a => a.user_id === profile?.id)) set.add(p.id);
    });
    return set;
  }, [policies, profile]);

  const manualPolicies = useMemo(() => policies.filter(p => p.source_manual_key), [policies]);
  const userPolicies = useMemo(() => policies.filter(p => !p.source_manual_key), [policies]);

  const trainingStatus = useMemo(() => {
    const now = new Date();
    let current = 0, expiring = 0, expired = 0;
    trainingRecords.forEach(r => {
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
  }, [trainingRecords]);

  // Forms
  if (view === "new_policy") return <PolicyForm onSubmit={p => { onCreatePolicy(p); setView("list"); }} onCancel={() => setView("list")} />;
  if (view === "new_training") return <TrainingForm requirements={trainingRequirements} onSubmit={t => { onLogTraining(t); setView("list"); }} onCancel={() => setView("list")} />;
  if (view === "new_requirement") return <RequirementForm onSubmit={r => { onCreateRequirement(r); setView("list"); }} onCancel={() => setView("list")} />;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{tab === "policies" ? "Policy Library" : "Training Records"}</div>
          <div style={{ fontSize: 11, color: MUTED }}>{tab === "policies" ? "§5.21–5.25 — Safety policy and documentation" : "§5.91–5.97 — Safety promotion and training"}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tab === "policies" && <button onClick={() => setView("new_policy")} style={{ padding: "8px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Add Document</button>}
          {tab === "training" && <>
            <button onClick={() => setView("new_requirement")} style={{ padding: "8px 14px", background: "transparent", color: CYAN, border: `1px solid ${CYAN}44`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Requirement</button>
            <button onClick={() => setView("new_training")} style={{ padding: "8px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Log Training</button>
          </>}
        </div>
      </div>

      {/* Tab switch */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[["policies", "Policy Library"], ["training", "Training"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${tab === id ? WHITE : BORDER}`,
              background: tab === id ? WHITE : "transparent", color: tab === id ? BLACK : MUTED,
              fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {/* POLICIES TAB */}
      {tab === "policies" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
            <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{policies.length}</div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Documents</div>
            </div>
            <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: GREEN, fontFamily: "Georgia,serif" }}>{policies.filter(p => p.status === "active").length}</div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Active</div>
            </div>
            <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: CYAN, fontFamily: "Georgia,serif" }}>{myAcks.size}/{policies.filter(p => p.status === "active").length}</div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Acknowledged</div>
            </div>
          </div>
          {/* Part 5 SMS Manuals — read-only, sourced from Manuals tab */}
          {manualPolicies.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: CYAN, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Part 5 SMS Manuals</div>
              <div style={{ fontSize: 10, color: MUTED, marginBottom: 10 }}>These documents are managed in the SMS Manuals section. Review and acknowledge below.</div>
              {manualPolicies.map(p => {
                const acked = myAcks.has(p.id);
                const ackCount = p.acknowledgments?.length || 0;
                const totalUsers = orgProfiles?.length || 0;
                const statusColor = p.status === "active" ? GREEN : p.status === "draft" ? YELLOW : MUTED;
                return (
                  <div key={p.id} style={{ ...card, padding: "14px 18px", marginBottom: 8, borderLeft: `3px solid ${CYAN}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{p.title}</span>
                          <span style={{ background: `${CYAN}22`, color: CYAN, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>SMS Manual</span>
                          <span style={{ background: `${statusColor}22`, color: statusColor, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{p.status}</span>
                          <span style={{ background: BORDER, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9 }}>v{p.version}</span>
                        </div>
                        <div style={{ color: MUTED, fontSize: 10 }}>
                          {ackCount}/{totalUsers} acknowledged{p.effective_date && ` · Effective: ${p.effective_date}`}
                        </div>
                        {p.description && <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>{p.description}</div>}
                      </div>
                      {p.status === "active" && !acked && (
                        <button onClick={() => onAcknowledgePolicy(p.id)}
                          style={{ padding: "6px 12px", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer",
                            background: `${CYAN}22`, color: CYAN, border: `1px solid ${CYAN}44` }}>
                          Acknowledge
                        </button>
                      )}
                      {acked && <span style={{ fontSize: 10, color: GREEN }}>Acknowledged</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User-created policies */}
          {manualPolicies.length > 0 && userPolicies.length > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: OFF_WHITE, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Other Documents</div>
          )}
          {policies.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 14 }}>No policy documents yet</div>
            </div>
          ) : userPolicies.map(p => {
            const cat = POLICY_CATEGORIES.find(c => c.id === p.category);
            const acked = myAcks.has(p.id);
            const ackCount = p.acknowledgments?.length || 0;
            const statusColor = p.status === "active" ? GREEN : p.status === "draft" ? YELLOW : MUTED;
            return (
              <div key={p.id} style={{ ...card, padding: "14px 18px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{p.title}</span>
                      <span style={{ background: `${statusColor}22`, color: statusColor, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{p.status}</span>
                      <span style={{ background: `${BORDER}`, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9 }}>v{p.version}</span>
                    </div>
                    <div style={{ color: MUTED, fontSize: 10 }}>
                      {cat?.label || p.category} · {ackCount} acknowledgment{ackCount !== 1 ? "s" : ""}
                      {p.effective_date && ` · Effective: ${p.effective_date}`}
                      {p.review_date && ` · Review: ${p.review_date}`}
                    </div>
                    {p.description && <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>{p.description}</div>}
                  </div>
                  {p.status === "active" && !acked && (
                    <button onClick={() => onAcknowledgePolicy(p.id)}
                      style={{ padding: "6px 12px", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer",
                        background: `${CYAN}22`, color: CYAN, border: `1px solid ${CYAN}44` }}>
                      Acknowledge
                    </button>
                  )}
                  {acked && <span style={{ fontSize: 10, color: GREEN }}>✓ Acknowledged</span>}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* TRAINING TAB */}
      {tab === "training" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
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

          {trainingRequirements.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>Training Requirements</div>
              {trainingRequirements.map(r => (
                <div key={r.id} style={{ ...card, padding: "10px 14px", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{r.title}</span>
                    <span style={{ fontSize: 10, color: MUTED, marginLeft: 8 }}>
                      {r.frequency_months > 0 ? `Every ${r.frequency_months} months` : "One-time"} · {r.required_for?.join(", ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {trainingRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 14 }}>No training records yet</div>
            </div>
          ) : trainingRecords.map(r => {
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
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
