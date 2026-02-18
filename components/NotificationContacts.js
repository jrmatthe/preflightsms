import { useState, useEffect } from "react";

const BLACK = "#000000", NEAR_BLACK = "#0A0A0A", CARD = "#161616";
const WHITE = "#FFFFFF", OFF_WHITE = "#D4D4D4", MUTED = "#666666", SUBTLE = "#444444";
const BORDER = "#232323", LIGHT_BORDER = "#2E2E2E";
const GREEN = "#4ADE80", RED = "#EF4444", CYAN = "#22D3EE";

const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, background: BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };

function formatPhone(val) {
  // Strip non-digits
  const digits = val.replace(/\D/g, "");
  // Format as (xxx) xxx-xxxx
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function toE164(val) {
  const digits = val.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  return `+${digits}`;
}

export default function NotificationContacts({ contacts, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    await onAdd({
      name: name.trim(),
      email: email.trim(),
      phone: phone ? toE164(phone) : "",
      role: role.trim(),
      notify_overdue: true,
      active: true,
    });
    setName(""); setEmail(""); setPhone(""); setRole(""); setShowForm(false);
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Overdue Flight Notifications</div>
          <div style={{ fontSize: 11, color: SUBTLE }}>These contacts receive SMS alerts when a flight passes its ETA without reporting arrival.</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "6px 14px", background: showForm ? "transparent" : WHITE, color: showForm ? MUTED : BLACK, border: `1px solid ${showForm ? BORDER : WHITE}`, borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
          {showForm ? "Cancel" : "+ Add Contact"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Smith" style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Email *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@pvtair.com" type="email" style={inp} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Phone <span style={{ color: SUBTLE, fontWeight: 400 }}>(optional — for future SMS)</span></label>
              <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(509) 555-1234" style={inp} maxLength={14} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>Role</label>
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Chief Pilot" style={inp} />
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving || !name.trim() || !email.trim()}
            style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer", opacity: (saving || !name.trim() || !email.trim()) ? 0.4 : 1 }}>
            {saving ? "Saving..." : "Add Contact"}
          </button>
        </div>
      )}

      {/* Contact list */}
      {contacts.length === 0 ? (
        <div style={{ ...card, padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>No notification contacts configured</div>
          <div style={{ fontSize: 11, color: SUBTLE }}>Add contacts to receive SMS alerts for overdue flights.</div>
        </div>
      ) : (
        <div style={{ ...card, overflow: "hidden" }}>
          {contacts.map((c, idx) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: idx < contacts.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: c.active ? `${GREEN}18` : `${MUTED}18`, border: `1px solid ${c.active ? GREEN + "44" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.active ? GREEN : MUTED }}>{(c.name || "?")[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: WHITE }}>{c.name}</span>
                  {c.role && <span style={{ fontSize: 9, color: CYAN, background: `${CYAN}22`, padding: "1px 6px", borderRadius: 8 }}>{c.role}</span>}
                  {!c.active && <span style={{ fontSize: 9, color: MUTED, background: `${MUTED}22`, padding: "1px 6px", borderRadius: 8 }}>Paused</span>}
                </div>
                <div style={{ fontSize: 11, color: MUTED }}>{c.email}{c.phone ? ` · ${c.phone}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => onUpdate(c.id, { active: !c.active })}
                  style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: "transparent", color: c.active ? MUTED : GREEN, border: `1px solid ${BORDER}` }}>
                  {c.active ? "Pause" : "Enable"}
                </button>
                <button onClick={() => { if (confirm(`Remove ${c.name}?`)) onDelete(c.id); }}
                  style={{ padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer", background: "transparent", color: RED, border: `1px solid ${BORDER}` }}>
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contacts.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 10, color: SUBTLE }}>
          Overdue checks run every 5 minutes. Each flight triggers one notification per contact when ETA is passed.
        </div>
      )}
    </div>
  );
}
