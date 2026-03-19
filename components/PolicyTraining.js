import { useState, useMemo, useEffect } from "react";
import SmsManuals from "./SmsManuals";

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

const PART5_TAG_OPTIONS = [
  { id: "safety_policy", label: "Safety Policy", cfr: "§5.21" },
  { id: "safety_accountability", label: "Safety Accountability & Authority", cfr: "§5.23–5.25" },
  { id: "erp", label: "Emergency Response Plan", cfr: "§5.27" },
  { id: "srm", label: "Safety Risk Management", cfr: "§5.51–5.57" },
  { id: "safety_assurance", label: "Safety Assurance", cfr: "§5.71–5.75" },
  { id: "safety_promotion", label: "Safety Promotion", cfr: "§5.91–5.93" },
  { id: "org_system_description", label: "Organizational System Description", cfr: "§5.17" },
];

// ── POLICY LIBRARY ────────────────────────────────────────────
function PolicyForm({ onSubmit, onCancel, onAiDraftPolicy, editPolicy }) {
  const isEdit = !!editPolicy;
  const [form, setForm] = useState({
    title: editPolicy?.title || "", description: editPolicy?.description || "",
    category: editPolicy?.category || "safety_policy", version: editPolicy?.version || "1.0",
    content: editPolicy?.content || "", effectiveDate: editPolicy?.effective_date || "",
    reviewDate: editPolicy?.review_date || "", status: editPolicy?.status || "active",
  });
  const [file, setFile] = useState(null);
  const [replaceFile, setReplaceFile] = useState(false);
  const [part5Tags, setPart5Tags] = useState(editPolicy?.part5_tags || []);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftError, setAiDraftError] = useState(null);
  const fileRef = { current: null };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const versionChanged = isEdit && form.version !== (editPolicy?.version || "1.0");
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>{isEdit ? "Edit Policy Document" : "Add Policy Document"}</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.21 — Safety policy documentation</div>
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Title *</label>
          {onAiDraftPolicy && form.title.trim() && (
            <button onClick={async () => {
              setAiDraftLoading(true); setAiDraftError(null);
              try {
                const result = await onAiDraftPolicy({ policyTitle: form.title, policyCategory: form.category });
                if (result && (result.description || result.content)) {
                  if (result.description) set("description", result.description);
                  if (result.content) set("content", result.content);
                } else {
                  setAiDraftError("AI returned no content. Try again.");
                }
              } catch (e) { setAiDraftError("AI draft failed. Try again."); }
              setAiDraftLoading(false);
            }} disabled={aiDraftLoading}
              style={{ fontSize: 10, color: CYAN, background: `${CYAN}08`, border: `1px solid ${CYAN}44`, borderRadius: 4, padding: "3px 10px", cursor: aiDraftLoading ? "wait" : "pointer", fontWeight: 600, fontFamily: "inherit", opacity: aiDraftLoading ? 0.6 : 1 }}>
              {aiDraftLoading ? "Drafting..." : "🤖 AI Draft"}
            </button>
          )}
        </div>
        <input value={form.title} onChange={e => { set("title", e.target.value); setAiDraftError(null); }} placeholder="e.g. Safety Policy Statement" style={inp} />
        {aiDraftError && <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>{aiDraftError}</div>}
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
        <textarea value={form.content} onChange={e => set("content", e.target.value)} placeholder="Paste policy text here, or use file upload below" rows={8} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>File Attachment</label>
        <input ref={el => fileRef.current = el} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setReplaceFile(true); } }} style={{ display: "none" }} />
        {isEdit && editPolicy?.file_url && !replaceFile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6 }}>
            <span style={{ fontSize: 12, color: CYAN }}>📎</span>
            <span style={{ fontSize: 12, color: OFF_WHITE, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{editPolicy.file_name || "Attached file"}</span>
            <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, color: MUTED, fontSize: 10, cursor: "pointer", padding: "3px 8px" }}>Replace</button>
          </div>
        ) : !file ? (
          <button onClick={() => fileRef.current?.click()} style={{ padding: "10px 16px", background: NEAR_BLACK, border: `1px dashed ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, cursor: "pointer", width: "100%" }}>
            Upload PDF, DOC, XLS, PPT, or TXT file
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6 }}>
            <span style={{ fontSize: 12, color: OFF_WHITE, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
            <span style={{ fontSize: 10, color: MUTED }}>{(file.size / 1024).toFixed(0)} KB</span>
            <button onClick={() => { setFile(null); setReplaceFile(false); if (fileRef.current) fileRef.current.value = ""; }} style={{ background: "none", border: "none", color: RED, fontSize: 14, cursor: "pointer", padding: "0 4px" }}>×</button>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Part 5 Compliance Tags <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 6 }}>Select which Part 5 requirements this document covers for audit tracking</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PART5_TAG_OPTIONS.map(t => {
            const selected = part5Tags.includes(t.id);
            return (
              <button key={t.id} type="button" onClick={() => setPart5Tags(prev => selected ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                style={{ padding: "5px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer",
                  background: selected ? `${CYAN}22` : NEAR_BLACK, color: selected ? CYAN : MUTED,
                  border: `1px solid ${selected ? CYAN + "66" : BORDER}`, fontWeight: selected ? 600 : 400 }}>
                {t.label} <span style={{ opacity: 0.6 }}>{t.cfr}</span>
              </button>
            );
          })}
        </div>
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
      {isEdit && versionChanged && (
        <div style={{ marginBottom: 12, padding: "10px 14px", background: `${YELLOW}10`, border: `1px solid ${YELLOW}33`, borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: YELLOW }}>Version changed (v{editPolicy?.version} → v{form.version})</div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>All existing acknowledgments will be reset so users must re-acknowledge the updated document.</div>
        </div>
      )}
      <button onClick={() => { if (form.title.trim()) onSubmit({ ...form, file: replaceFile ? file : null, part5Tags: part5Tags.length > 0 ? part5Tags : null, _isEdit: isEdit, _id: editPolicy?.id, _versionChanged: versionChanged }); }} disabled={!form.title.trim()}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !form.title.trim() ? 0.4 : 1 }}>
        {isEdit ? "Save Changes" : "Add Document"}
      </button>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function PolicyTraining({
  profile, session, policies, onCreatePolicy, onUpdatePolicy, onDeletePolicy, onAcknowledgePolicy, orgProfiles,
  smsManuals, showManuals, readOnlyManuals, tourTab,
  // SMS Manuals props (passed through when showManuals is true)
  templateVariables, signatures, fleetAircraft,
  onSaveManual, onPublishManual, onInitManuals, onSaveVariables, onSaveSignature,
  onAiDraftPolicy,
}) {
  const isAdmin = ["admin", "safety_manager", "accountable_exec", "chief_pilot"].includes(profile?.role);
  const [topTab, setTopTab] = useState("policies");
  useEffect(() => { if (tourTab) setTopTab(tourTab); }, [tourTab]);
  const [view, setView] = useState("list");   // list | new_policy | edit_policy
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [sortBy, setSortBy] = useState("newest");
  const [showCount, setShowCount] = useState(25);

  useEffect(() => { setShowCount(25); }, [filter, search, sortBy]);

  const myAcks = useMemo(() => {
    const set = new Set();
    policies.forEach(p => {
      if (p.acknowledgments?.some(a => a.user_id === profile?.id)) set.add(p.id);
    });
    return set;
  }, [policies, profile]);

  const manualPolicies = useMemo(() => policies.filter(p => p.source_manual_key), [policies]);
  const allUserPolicies = useMemo(() => policies.filter(p => !p.source_manual_key), [policies]);

  const policyCounts = useMemo(() => {
    const c = { all: 0, active: 0, draft: 0, under_review: 0, archived: 0 };
    allUserPolicies.forEach(p => { if (c[p.status] !== undefined) c[p.status]++; c.all++; });
    return c;
  }, [allUserPolicies]);

  const userPolicies = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = allUserPolicies.filter(p => {
      if (filter !== "all" && p.status !== filter) return false;
      if (q) {
        const hay = `${p.title} ${p.description || ""} ${p.category || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "title_az") return (a.title || "").localeCompare(b.title || "");
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return list;
  }, [allUserPolicies, filter, search, sortBy]);

  const ackComplianceMatrix = useMemo(() => {
    if (!isAdmin || !orgProfiles?.length) return { users: [], tags: PART5_TAG_OPTIONS, matrix: {}, compliantCount: 0, totalUsers: 0 };
    const activePolicies = policies.filter(p => p.status === "active");
    const users = orgProfiles.filter(u => u.full_name).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    const matrix = {};
    let compliantCount = 0;
    users.forEach(user => {
      matrix[user.id] = {};
      let fullyCompliant = true;
      PART5_TAG_OPTIONS.forEach(tag => {
        const taggedPolicies = activePolicies.filter(p => p.part5_tags?.includes(tag.id));
        if (taggedPolicies.length === 0) {
          matrix[user.id][tag.id] = "no_document";
        } else {
          const hasAck = taggedPolicies.some(p => p.acknowledgments?.some(a => a.user_id === user.id));
          matrix[user.id][tag.id] = hasAck ? "acknowledged" : "not_acknowledged";
          if (!hasAck) fullyCompliant = false;
        }
      });
      if (fullyCompliant) compliantCount++;
    });
    return { users, tags: PART5_TAG_OPTIONS, matrix, compliantCount, totalUsers: users.length };
  }, [isAdmin, policies, orgProfiles]);

  // Top-level tab bar (Policy Library | SMS Manuals)
  const tabs = [["policies", "Policy Library"]];
  if (showManuals) tabs.push(["manuals", "SMS Manual Templates"]);
  if (isAdmin) tabs.push(["compliance", "Acknowledgment Compliance"]);
  const renderTopTabs = () => tabs.length > 1 ? (
    <div data-tour="tour-policy-tabs" style={{ display: "flex", gap: 4, marginBottom: 16 }}>
      {tabs.map(([id, label]) => (
        <button key={id} data-onboarding={id === "policies" ? "policy-library-tab" : "policy-manuals-tab"} onClick={() => { setTopTab(id); setView("list"); setSearch(""); setFilter("active"); setSortBy("newest"); setShowCount(25); }}
          style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${topTab === id ? WHITE : BORDER}`,
            background: topTab === id ? WHITE : "transparent", color: topTab === id ? BLACK : MUTED,
            fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
      ))}
    </div>
  ) : null;

  // Forms
  if (view === "new_policy") return <PolicyForm onSubmit={p => { onCreatePolicy(p); setView("list"); }} onCancel={() => setView("list")} onAiDraftPolicy={onAiDraftPolicy} />;
  if (view === "edit_policy" && editingPolicy) return <PolicyForm editPolicy={editingPolicy} onSubmit={p => { if (onUpdatePolicy) onUpdatePolicy(p); setView("list"); setEditingPolicy(null); setExpandedPolicy(null); }} onCancel={() => { setView("list"); setEditingPolicy(null); }} onAiDraftPolicy={onAiDraftPolicy} />;

  // Compliance tab (admin-only)
  if (topTab === "compliance" && isAdmin) {
    const { users, tags, matrix, compliantCount, totalUsers } = ackComplianceMatrix;
    const ackDot = (status) => {
      if (status === "no_document") return <span title="No document uploaded" style={{ color: MUTED, fontSize: 14, lineHeight: 1 }}>—</span>;
      if (status === "acknowledged") return <span title="Acknowledged" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: GREEN }} />;
      return <span title="Not acknowledged" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#333" }} />;
    };
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Document Acknowledgment Compliance</div>
            <div style={{ fontSize: 11, color: MUTED }}>Per-user acknowledgment status across Part 5 requirements</div>
          </div>
        </div>
        {renderTopTabs()}
        <div style={{ ...card, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: compliantCount === totalUsers ? GREEN : YELLOW }}>
            {compliantCount} of {totalUsers}
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>users fully compliant</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 12, fontSize: 10, color: MUTED }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: GREEN, marginRight: 4 }} />Acknowledged</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#333", marginRight: 4 }} />Not acknowledged</span>
            <span><span style={{ color: MUTED, marginRight: 4 }}>—</span> No document</span>
          </div>
        </div>
        {users.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14 }}>No users found</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: MUTED, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, position: "sticky", left: 0, background: "#111", minWidth: 140 }}>User</th>
                  {tags.map(t => (
                    <th key={t.id} style={{ textAlign: "center", padding: "8px 6px", color: MUTED, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, fontSize: 10, minWidth: 80 }} title={`${t.label} (${t.cfr})`}>
                      {t.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ padding: "6px 10px", color: WHITE, fontWeight: 500, borderBottom: `1px solid ${BORDER}`, position: "sticky", left: 0, background: "#111" }}>{user.full_name}</td>
                    {tags.map(t => (
                      <td key={t.id} style={{ textAlign: "center", padding: "6px", borderBottom: `1px solid ${BORDER}` }}>
                        {ackDot(matrix[user.id]?.[t.id] || "not_acknowledged")}
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

  // SMS Manual Templates subtab
  if (topTab === "manuals" && showManuals) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>SMS Manual Templates</div>
            <div style={{ fontSize: 11, color: MUTED }}>§5.21–5.27 — 14 CFR Part 5 SMS documentation</div>
          </div>
        </div>
        {renderTopTabs()}
        <SmsManuals profile={profile} session={session} smsManuals={smsManuals}
          templateVariables={templateVariables} signatures={signatures}
          fleetAircraft={fleetAircraft} onSaveManual={readOnlyManuals ? null : onSaveManual} onPublishManual={readOnlyManuals ? null : onPublishManual}
          onInitManuals={readOnlyManuals ? null : onInitManuals} onSaveVariables={readOnlyManuals ? null : onSaveVariables}
          onSaveSignature={readOnlyManuals ? null : onSaveSignature} embedded readOnly={readOnlyManuals} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Policy Library</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.21–5.25 — Safety policy and documentation</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {isAdmin && (
            <button data-onboarding="policy-add-doc" onClick={() => setView("new_policy")} style={{ padding: "8px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Add Document</button>
          )}
        </div>
      </div>
      {renderTopTabs()}

      {/* Policy stats */}
      <div data-tour="tour-policy-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
        <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{policies.length}</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Documents</div>
        </div>
        <div style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: GREEN, fontFamily: "Georgia,serif" }}>{policies.filter(p => p.status === "active").length}</div>
          <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Active</div>
        </div>
        <div data-onboarding="policy-ack-stats" style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
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
            const isExpanded = expandedPolicy === p.id;
            return (
              <div key={p.id} style={{ ...card, marginBottom: 8, borderLeft: `3px solid ${CYAN}`, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", cursor: "pointer" }} onClick={() => setExpandedPolicy(isExpanded ? null : p.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{p.title}</span>
                        <span style={{ background: `${CYAN}22`, color: CYAN, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>SMS Manual</span>
                        <span style={{ background: `${statusColor}22`, color: statusColor, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{p.status}</span>
                        <span style={{ background: BORDER, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9 }}>v{p.version}</span>
                      </div>
                      <div style={{ color: MUTED, fontSize: 10 }}>
                        {ackCount}/{totalUsers} acknowledged{p.effective_date && ` \u00b7 Effective: ${p.effective_date}`}
                        {!isExpanded && " \u00b7 Click to review"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {!acked && (
                        <button onClick={(e) => { e.stopPropagation(); onAcknowledgePolicy(p.id); }}
                          style={{ padding: "6px 12px", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer",
                            background: `${CYAN}22`, color: CYAN, border: `1px solid ${CYAN}44` }}>
                          Acknowledge
                        </button>
                      )}
                      {acked && <span style={{ fontSize: 10, color: GREEN }}>Acknowledged</span>}
                      <span style={{ fontSize: 12, color: MUTED }}>{isExpanded ? "\u25B4" : "\u25BE"}</span>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${BORDER}` }}>
                    {p.file_url && (
                      <div style={{ marginTop: 14, marginBottom: p.content ? 10 : 0 }}>
                        <a href={p.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: CYAN, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                          📎 {p.file_name || "Download File"}
                        </a>
                      </div>
                    )}
                    {p.content && (
                      <div style={{ marginTop: p.file_url ? 0 : 14, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: OFF_WHITE, maxHeight: 500, overflowY: "auto", background: NEAR_BLACK, borderRadius: 6, padding: 16 }}>
                        {p.content}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                      {!acked && (
                        <button onClick={() => onAcknowledgePolicy(p.id)}
                          style={{ padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                            background: WHITE, color: BLACK, border: "none" }}>
                          I have reviewed this document — Acknowledge
                        </button>
                      )}
                      {isAdmin && onDeletePolicy && (
                        <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${p.title}"? This cannot be undone.`)) { setExpandedPolicy(null); onDeletePolicy(p.id); } }}
                          style={{ padding: "10px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                            background: `${RED}15`, color: RED, border: `1px solid ${RED}33`, marginLeft: "auto" }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* User-created policies */}
      {manualPolicies.length > 0 && allUserPolicies.length > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: OFF_WHITE, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Other Documents</div>
      )}
      {(allUserPolicies.length > 0 || search || filter !== "active") && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." style={{ ...inp, width: 200, maxWidth: 200, padding: "5px 10px", fontSize: 12 }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, width: "auto", maxWidth: 180, padding: "5px 10px", fontSize: 12 }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title_az">Title A-Z</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {["all", "active", "draft", "under_review", "archived"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${filter === f ? WHITE : BORDER}`,
                  background: filter === f ? WHITE : CARD, color: filter === f ? BLACK : MUTED,
                  fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                {(f === "all" ? "All" : f.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())) + ` (${policyCounts[f] || 0})`}
              </button>
            ))}
          </div>
        </>
      )}
      {policies.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 14 }}>No policy documents yet</div>
        </div>
      ) : userPolicies.slice(0, showCount).map(p => {
        const cat = POLICY_CATEGORIES.find(c => c.id === p.category);
        const acked = myAcks.has(p.id);
        const ackCount = p.acknowledgments?.length || 0;
        const statusColor = p.status === "active" ? GREEN : p.status === "draft" ? YELLOW : MUTED;
        const isExpanded = expandedPolicy === p.id;
        return (
          <div key={p.id} style={{ ...card, marginBottom: 8, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", cursor: "pointer" }} onClick={() => setExpandedPolicy(isExpanded ? null : p.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{p.title}</span>
                    <span style={{ background: `${statusColor}22`, color: statusColor, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{p.status}</span>
                    <span style={{ background: `${BORDER}`, color: MUTED, padding: "1px 7px", borderRadius: 8, fontSize: 9 }}>v{p.version}</span>
                    {p.file_url && <span style={{ background: `${CYAN}22`, color: CYAN, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>📎 File</span>}
                    {p.part5_tags?.length > 0 && <span style={{ background: `${GREEN}18`, color: GREEN, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 600 }}>Part 5</span>}
                  </div>
                  <div style={{ color: MUTED, fontSize: 10 }}>
                    {cat?.label || p.category} · {ackCount} acknowledgment{ackCount !== 1 ? "s" : ""}
                    {p.effective_date && ` \u00b7 Effective: ${p.effective_date}`}
                    {p.review_date && ` \u00b7 Review: ${p.review_date}`}
                  </div>
                  {p.description && <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>{p.description}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!acked && (
                    <button onClick={(e) => { e.stopPropagation(); onAcknowledgePolicy(p.id); }}
                      style={{ padding: "6px 12px", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer",
                        background: `${CYAN}22`, color: CYAN, border: `1px solid ${CYAN}44` }}>
                      Acknowledge
                    </button>
                  )}
                  {acked && <span style={{ fontSize: 10, color: GREEN }}>Acknowledged</span>}
                  <span style={{ fontSize: 12, color: MUTED }}>{isExpanded ? "\u25B4" : "\u25BE"}</span>
                </div>
              </div>
            </div>
            {isExpanded && (
              <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${BORDER}` }}>
                {p.file_url && (
                  <div style={{ marginTop: 14, marginBottom: p.content ? 10 : 0 }}>
                    <a href={p.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: CYAN, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      📎 {p.file_name || "Download File"}
                    </a>
                  </div>
                )}
                {p.content && (
                  <div style={{ marginTop: p.file_url ? 0 : 14, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: OFF_WHITE, maxHeight: 500, overflowY: "auto", background: NEAR_BLACK, borderRadius: 6, padding: 16 }}>
                    {p.content}
                  </div>
                )}
                {!p.content && !p.file_url && (
                  <div style={{ marginTop: 14, fontSize: 12, color: MUTED, fontStyle: "italic" }}>No content</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  {!acked && (
                    <button onClick={() => onAcknowledgePolicy(p.id)}
                      style={{ padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: WHITE, color: BLACK, border: "none" }}>
                      I have reviewed this document — Acknowledge
                    </button>
                  )}
                  {isAdmin && onUpdatePolicy && (
                    <button onClick={(e) => { e.stopPropagation(); setEditingPolicy(p); setView("edit_policy"); }}
                      style={{ padding: "10px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}33`, marginLeft: "auto" }}>
                      Edit
                    </button>
                  )}
                  {isAdmin && onDeletePolicy && (
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${p.title}"? This cannot be undone.`)) { setExpandedPolicy(null); onDeletePolicy(p.id); } }}
                      style={{ padding: "10px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: `${RED}15`, color: RED, border: `1px solid ${RED}33`, marginLeft: isAdmin && onUpdatePolicy ? 0 : "auto" }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {userPolicies.length > showCount && (
        <button onClick={() => setShowCount(c => c + 25)}
          style={{ width: "100%", padding: "12px 0", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>
          Showing {showCount} of {userPolicies.length} — Show 25 more
        </button>
      )}
      <div style={{ marginTop: 24, padding: "12px 16px", borderRadius: 6, border: `1px solid ${BORDER}`, background: NEAR_BLACK }}>
        <p style={{ fontSize: 10, color: MUTED, lineHeight: 1.6, margin: 0 }}>
          Disclaimer: Editing SMS manual templates or uploading your own policy documents may affect your organization's regulatory compliance. The certificate holder is solely responsible for ensuring all documentation — whether generated from templates, manually entered, or uploaded — meets applicable FAA, 14 CFR Part 5, and other regulatory requirements. PreflightSMS does not review, verify, or certify the compliance of any user content. See our <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: CYAN, textDecoration: "none" }}>Terms of Service</a> for details.
        </p>
      </div>
    </div>
  );
}
