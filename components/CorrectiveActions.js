import { useState, useMemo } from "react";

const CARD = "#161616", NEAR_BLACK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", BLACK = "#000000";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE";

const inp = { width: "100%", maxWidth: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, background: NEAR_BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };

const PRIORITIES = [
  { id: "low", label: "Low", color: GREEN },
  { id: "medium", label: "Medium", color: YELLOW },
  { id: "high", label: "High", color: "#F97316" },
  { id: "critical", label: "Critical", color: RED },
];

const STATUSES = [
  { id: "open", label: "Open", color: CYAN },
  { id: "in_progress", label: "In Progress", color: YELLOW },
  { id: "completed", label: "Completed", color: GREEN },
  { id: "overdue", label: "Overdue", color: RED },
  { id: "cancelled", label: "Cancelled", color: MUTED },
];

function ActionForm({ onSubmit, onCancel, existingCount }) {
  const [form, setForm] = useState({
    title: "", description: "", assignedToName: "", dueDate: "", priority: "medium",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSubmit({ ...form, actionCode: `CA-${String(existingCount + 1).padStart(3, "0")}` });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>New Corrective Action</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.73 — Corrective action processes</div>
        </div>
        {onCancel && <button onClick={onCancel} style={{ fontSize: 11, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>Cancel</button>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Action Required *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What needs to be done?" style={inp} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Details</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Additional context, steps, acceptance criteria" rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }} className="report-grid">
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Assigned To</label>
          <input value={form.assignedToName} onChange={e => set("assignedToName", e.target.value)} placeholder="Name" style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Due Date</label>
          <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Priority</label>
          <select value={form.priority} onChange={e => set("priority", e.target.value)} style={inp}>
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <button onClick={handleSubmit} disabled={!form.title.trim()}
        style={{ width: "100%", padding: "14px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !form.title.trim() ? 0.4 : 1 }}>
        Create Action
      </button>
    </div>
  );
}

function ActionCard({ a, onUpdateAction }) {
  const priority = PRIORITIES.find(p => p.id === a.priority) || PRIORITIES[1];
  const status = STATUSES.find(s => s.id === a.status) || STATUSES[0];
  const isOverdue = a.status === "overdue";
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ ...card, padding: "14px 18px", marginBottom: 8, borderLeft: `3px solid ${isOverdue ? RED : priority.color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: WHITE, fontSize: 13 }}>{a.title}</span>
            <span style={{ background: `${priority.color}22`, color: priority.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{priority.label}</span>
            <span style={{ background: `${status.color}22`, color: status.color, padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{status.label}</span>
          </div>
          <div style={{ color: MUTED, fontSize: 10 }}>
            {a.action_code}
            {a.assigned_to_name && ` · Assigned: ${a.assigned_to_name}`}
            {a.due_date && ` · Due: ${a.due_date}`}
          </div>
          {a.description && <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>{a.description}</div>}
        </div>
        <span style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>{expanded ? "\u25B2" : "\u25BC"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Update Status</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {STATUSES.filter(s => s.id !== "overdue").map(s => (
              <button key={s.id} onClick={() => onUpdateAction(a.id, { status: s.id, ...(s.id === "completed" ? { completed_at: new Date().toISOString() } : {}) })}
                style={{ padding: "6px 14px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  background: a.status === s.id ? `${s.color}33` : "transparent",
                  color: a.status === s.id ? s.color : MUTED,
                  border: `1px solid ${a.status === s.id ? s.color : BORDER}` }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CorrectiveActions({ actions, onCreateAction, onUpdateAction }) {
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Mark overdue
  const processed = useMemo(() => {
    const now = new Date();
    return actions.map(a => {
      if (a.status === "open" && a.due_date && new Date(a.due_date) < now) return { ...a, status: "overdue" };
      return a;
    });
  }, [actions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return processed.filter(a => {
      if (filter !== "all" && a.status !== filter) return false;
      if (q) {
        const hay = `${a.title} ${a.description || ""} ${a.action_code || ""} ${a.assigned_to_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [processed, filter, search]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, completed: 0, overdue: 0 };
    processed.forEach(a => { if (c[a.status] !== undefined) c[a.status]++; });
    return c;
  }, [processed]);

  if (view === "new") {
    return <ActionForm existingCount={actions.length} onSubmit={a => { onCreateAction(a); setView("list"); }} onCancel={() => setView("list")} />;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Corrective Actions</div>
          <div style={{ fontSize: 11, color: MUTED }}>§5.73 — Track and verify corrective actions to completion</div>
        </div>
        <button onClick={() => setView("new")} style={{ padding: "8px 16px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ New Action</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }} className="stat-grid">
        {[
          { label: "Open", value: counts.open },
          { label: "In Progress", value: counts.in_progress },
          { label: "Overdue", value: counts.overdue },
          { label: "Completed", value: counts.completed },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions..." style={{ ...inp, width: 200, maxWidth: 200, padding: "5px 10px", fontSize: 12 }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", ...STATUSES.map(s => s.id)].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${filter === f ? WHITE : BORDER}`,
              background: filter === f ? WHITE : CARD, color: filter === f ? BLACK : MUTED,
              fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
            {f === "all" ? `All (${actions.length})` : STATUSES.find(s => s.id === f)?.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 14 }}>No corrective actions</div>
        </div>
      ) : filtered.map(a => (
        <ActionCard key={a.id} a={a} onUpdateAction={onUpdateAction} />
      ))}
    </div>
  );
}
