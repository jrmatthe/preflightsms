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

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function PolicyTraining({
  profile, session, policies, onCreatePolicy, onAcknowledgePolicy, orgProfiles,
  smsManuals, showManuals,
  // SMS Manuals props (passed through when showManuals is true)
  templateVariables, signatures, fleetAircraft,
  onSaveManual, onInitManuals, onSaveVariables, onSaveSignature,
}) {
  const [topTab, setTopTab] = useState("policies");
  const [view, setView] = useState("list");   // list | new_policy
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

  // Top-level tab bar (Policy Library | SMS Manuals)
  const tabs = [["policies", "Policy Library"]];
  if (showManuals) tabs.push(["manuals", "SMS Manual Templates"]);
  const renderTopTabs = () => tabs.length > 1 ? (
    <div data-tour="tour-policy-tabs" style={{ display: "flex", gap: 4, marginBottom: 16 }}>
      {tabs.map(([id, label]) => (
        <button key={id} onClick={() => { setTopTab(id); setView("list"); setSearch(""); setFilter("active"); setSortBy("newest"); setShowCount(25); }}
          style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${topTab === id ? WHITE : BORDER}`,
            background: topTab === id ? WHITE : "transparent", color: topTab === id ? BLACK : MUTED,
            fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
      ))}
    </div>
  ) : null;

  // Forms
  if (view === "new_policy") return <PolicyForm onSubmit={p => { onCreatePolicy(p); setView("list"); }} onCancel={() => setView("list")} />;

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
          fleetAircraft={fleetAircraft} onSaveManual={onSaveManual}
          onInitManuals={onInitManuals} onSaveVariables={onSaveVariables}
          onSaveSignature={onSaveSignature} embedded />
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
          <button onClick={() => setView("new_policy")} style={{ padding: "8px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Add Document</button>
        </div>
      </div>
      {renderTopTabs()}

      {/* Policy stats */}
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
                {isExpanded && p.content && (
                  <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ marginTop: 14, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: OFF_WHITE, maxHeight: 500, overflowY: "auto", background: NEAR_BLACK, borderRadius: 6, padding: 16 }}>
                      {p.content}
                    </div>
                    {!acked && (
                      <button onClick={() => onAcknowledgePolicy(p.id)}
                        style={{ marginTop: 12, padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                          background: WHITE, color: BLACK, border: "none" }}>
                        I have reviewed this document — Acknowledge
                      </button>
                    )}
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
            {isExpanded && p.content && (
              <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${BORDER}` }}>
                <div style={{ marginTop: 14, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: OFF_WHITE, maxHeight: 500, overflowY: "auto", background: NEAR_BLACK, borderRadius: 6, padding: 16 }}>
                  {p.content}
                </div>
                {!acked && (
                  <button onClick={() => onAcknowledgePolicy(p.id)}
                    style={{ marginTop: 12, padding: "10px 24px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: WHITE, color: BLACK, border: "none" }}>
                    I have reviewed this document — Acknowledge
                  </button>
                )}
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
    </div>
  );
}
