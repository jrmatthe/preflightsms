import { useState, useEffect } from "react";
import { fetchNotificationContacts, createNotificationContact, updateNotificationContact, deleteNotificationContact, fetchOverdueNotifications, updateOrgNotificationSettings } from "../lib/supabase";

const BLACK = "#000000", NEAR_BLACK = "#0A0A0A", CARD = "#161616";
const WHITE = "#FFFFFF", OFF_WHITE = "#D4D4D4", MUTED = "#666666", SUBTLE = "#444444";
const BORDER = "#232323", LIGHT_BORDER = "#2E2E2E";
const GREEN = "#4ADE80", RED = "#EF4444", YELLOW = "#FACC15", CYAN = "#22D3EE";

const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, background: BLACK, color: OFF_WHITE, boxSizing: "border-box" };
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };

function formatPhone(input) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
}

function toE164(input) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  return `+${digits}`;
}

export default function NotificationSettings({ orgId, notificationSettings }) {
  const [contacts, setContacts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", role: "" });
  const [graceMins, setGraceMins] = useState(notificationSettings?.grace_minutes || 15);
  const [enabled, setEnabled] = useState(notificationSettings?.enabled !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      fetchNotificationContacts(orgId),
      fetchOverdueNotifications(orgId, 10),
    ]).then(([c, n]) => {
      setContacts(c.data || []);
      setNotifications(n.data || []);
      setLoading(false);
    });
  }, [orgId]);

  const handleAdd = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) return;
    const phone = toE164(newContact.phone);
    if (phone.length < 11) { alert("Please enter a valid 10-digit phone number"); return; }
    const { data, error } = await createNotificationContact(orgId, { ...newContact, phone });
    if (!error && data) {
      setContacts([...contacts, data]);
      setNewContact({ name: "", phone: "", role: "" });
      setAdding(false);
    }
  };

  const handleToggle = async (contact, field) => {
    const newVal = !contact[field];
    await updateNotificationContact(contact.id, { [field]: newVal });
    setContacts(contacts.map(c => c.id === contact.id ? { ...c, [field]: newVal } : c));
  };

  const handleDelete = async (contactId) => {
    if (!confirm("Remove this contact?")) return;
    await deleteNotificationContact(contactId);
    setContacts(contacts.filter(c => c.id !== contactId));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    await updateOrgNotificationSettings(orgId, { grace_minutes: graceMins, enabled });
    setSaving(false);
  };

  if (loading) return <div style={{ color: MUTED, fontSize: 12, padding: 20 }}>Loading notification settings...</div>;

  return (
    <div>
      {/* Settings */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Overdue Flight Alerts</div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div onClick={() => setEnabled(!enabled)} style={{ width: 40, height: 22, borderRadius: 11, background: enabled ? GREEN : BORDER, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: WHITE, position: "absolute", top: 2, left: enabled ? 20 : 2, transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 13, color: OFF_WHITE, fontWeight: 600 }}>Enable SMS notifications</span>
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: MUTED }}>Grace period after ETA:</label>
          <select value={graceMins} onChange={e => setGraceMins(parseInt(e.target.value))} style={{ ...inp, width: 100, padding: "6px 8px" }}>
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={15}>15 min</option>
            <option value={20}>20 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
          <button onClick={handleSaveSettings} disabled={saving} style={{ padding: "6px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{saving ? "..." : "Save"}</button>
        </div>

        <div style={{ fontSize: 10, color: SUBTLE, lineHeight: 1.5 }}>
          When an active flight exceeds its ETA by the grace period, an SMS is sent to all active contacts below. Each flight only triggers one notification — it won't repeat.
        </div>
      </div>

      {/* Contacts */}
      <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5 }}>Notification Contacts</div>
          <button onClick={() => setAdding(true)} style={{ padding: "6px 14px", background: "transparent", color: CYAN, border: `1px solid ${CYAN}44`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Add Contact</button>
        </div>

        {contacts.length === 0 && !adding && (
          <div style={{ textAlign: "center", padding: "24px 0", color: SUBTLE, fontSize: 12 }}>No notification contacts configured. Add a contact to enable overdue flight alerts.</div>
        )}

        {contacts.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 6, background: NEAR_BLACK, borderRadius: 8, border: `1px solid ${BORDER}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{c.name}</span>
                {c.role && <span style={{ fontSize: 9, color: MUTED, background: `${MUTED}22`, padding: "1px 6px", borderRadius: 8 }}>{c.role}</span>}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>{c.phone}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }} title="Overdue alerts">
                <div onClick={() => handleToggle(c, "active")} style={{ width: 32, height: 18, borderRadius: 9, background: c.active ? GREEN : BORDER, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 7, background: WHITE, position: "absolute", top: 2, left: c.active ? 16 : 2, transition: "left 0.2s" }} />
                </div>
              </label>
              <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", color: SUBTLE, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
            </div>
          </div>
        ))}

        {/* Add contact form */}
        {adding && (
          <div style={{ padding: "14px", marginTop: 8, background: NEAR_BLACK, borderRadius: 8, border: `1px solid ${LIGHT_BORDER}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Name *</label>
                <input value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="John Smith" style={{ ...inp, fontSize: 12, padding: "8px 10px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Phone *</label>
                <input value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: formatPhone(e.target.value) })} placeholder="(509) 555-1234" style={{ ...inp, fontSize: 12, padding: "8px 10px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 9, fontWeight: 600, color: MUTED, marginBottom: 3, textTransform: "uppercase" }}>Role</label>
                <select value={newContact.role} onChange={e => setNewContact({ ...newContact, role: e.target.value })} style={{ ...inp, fontSize: 12, padding: "8px 10px" }}>
                  <option value="">Select...</option>
                  <option value="Chief Pilot">Chief Pilot</option>
                  <option value="Dispatch">Dispatch</option>
                  <option value="Safety Manager">Safety Manager</option>
                  <option value="Director of Ops">Director of Ops</option>
                  <option value="Owner">Owner</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAdd} style={{ padding: "8px 16px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Add Contact</button>
              <button onClick={() => { setAdding(false); setNewContact({ name: "", phone: "", role: "" }); }} style={{ padding: "8px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Recent notifications log */}
      {notifications.length > 0 && (
        <div style={{ ...card, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Recent Notifications</div>
          {notifications.map(n => (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: n.status === "sent" ? GREEN : n.status === "delivered" ? GREEN : RED, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: OFF_WHITE }}>{n.phone}</div>
                <div style={{ fontSize: 9, color: SUBTLE, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.message.split("\n")[0]}</div>
              </div>
              <div style={{ fontSize: 9, color: MUTED, flexShrink: 0 }}>{new Date(n.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
