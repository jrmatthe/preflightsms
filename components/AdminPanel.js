import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const FRATTemplateEditor = dynamic(() => import("./FRATTemplateEditor"), { ssr: false });
const NotificationContacts = dynamic(() => import("./NotificationContacts"), { ssr: false });

const CARD = "#161616", NEAR_BLACK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", BLACK = "#000000";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", CYAN = "#22D3EE", YELLOW = "#FACC15", AMBER = "#F59E0B";

const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };
const inp = { width: "100%", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, background: BLACK, color: OFF_WHITE, boxSizing: "border-box" };

const ROLES = [
  { id: "pilot", label: "Pilot", desc: "Submit FRATs, reports, view flights" },
  { id: "dispatcher", label: "Dispatcher", desc: "Create flights, view FRATs, monitor flight following" },
  { id: "safety_manager", label: "Safety Manager", desc: "Full SMS access, investigate reports, manage hazards" },
  { id: "chief_pilot", label: "Chief Pilot", desc: "View all data, assign actions" },
  { id: "accountable_exec", label: "Accountable Executive", desc: "Dashboard summaries, approve closures" },
  { id: "admin", label: "Admin", desc: "Full access including user management" },
];

const PERMISSIONS = [
  { id: "flight_follower", label: "Flight Follower", desc: "Receives overdue flight email notifications" },
  { id: "approver", label: "FRAT Approver", desc: "Can approve/reject high-risk FRATs before departure" },
  { id: "frat_reviewer", label: "FRAT Reviewer", desc: "Can review and comment on submitted FRATs" },
  { id: "hazard_manager", label: "Hazard Manager", desc: "Can create and manage hazards" },
  { id: "training_manager", label: "Training Manager", desc: "Can manage training requirements and records" },
];

const TIER_DEFS = {
  starter: { name: "Starter", price: "$149/mo", aircraft: "5", color: MUTED },
  professional: { name: "Professional", price: "$299/mo", aircraft: "15", color: GREEN },
  enterprise: { name: "Enterprise", price: "Custom", aircraft: "Unlimited", color: CYAN },
};

const FEATURE_LABELS_MAP = {
  frat: "Flight Risk Assessment (FRAT)",
  flight_following: "Flight Following",
  crew_roster: "Crew Roster & Tracking",
  safety_reporting: "Safety Reporting",
  hazard_register: "Hazard Register",
  corrective_actions: "Corrective Actions",
  policy_library: "Policy Library",
  training_records: "Training Records",
  dashboard_analytics: "Dashboard Analytics",
  custom_frat_template: "Custom FRAT Templates",
  cbt_modules: "CBT Modules & Tracking",
  role_permissions: "Role-Based Permissions",
  approval_workflow: "FRAT Approval Workflow",
  document_library: "Document Library",
  api_access: "API Access",
  multi_base: "Multi-Base Support",
  custom_integrations: "Custom Integrations",
  priority_support: "Priority Support",
};

function SubscriptionTab({ orgData, onUpdateOrg, canManage }) {
  const tier = orgData?.tier || "starter";
  const tierDef = TIER_DEFS[tier] || TIER_DEFS.starter;
  const flags = orgData?.feature_flags || {};
  const status = orgData?.subscription_status || "trial";
  const trialEnds = orgData?.trial_ends_at;
  const [editingFlags, setEditingFlags] = useState(false);
  const [localFlags, setLocalFlags] = useState(flags);
  const [selectedTier, setSelectedTier] = useState(tier);

  const handleSaveFlags = () => {
    if (onUpdateOrg) onUpdateOrg({ feature_flags: localFlags, tier: selectedTier });
    setEditingFlags(false);
  };

  const handleTierChange = (newTier) => {
    setSelectedTier(newTier);
    // Auto-set features based on tier
    const tierFeatures = {
      starter: { frat: true, flight_following: true, crew_roster: true, safety_reporting: true, hazard_register: true, corrective_actions: true, policy_library: true, training_records: true, dashboard_analytics: true, custom_frat_template: false, cbt_modules: false, role_permissions: false, approval_workflow: false, document_library: false, api_access: false, multi_base: false, custom_integrations: false, priority_support: false },
      professional: { frat: true, flight_following: true, crew_roster: true, safety_reporting: true, hazard_register: true, corrective_actions: true, policy_library: true, training_records: true, dashboard_analytics: true, custom_frat_template: true, cbt_modules: true, role_permissions: true, approval_workflow: true, document_library: true, api_access: false, multi_base: false, custom_integrations: false, priority_support: true },
      enterprise: { frat: true, flight_following: true, crew_roster: true, safety_reporting: true, hazard_register: true, corrective_actions: true, policy_library: true, training_records: true, dashboard_analytics: true, custom_frat_template: true, cbt_modules: true, role_permissions: true, approval_workflow: true, document_library: true, api_access: true, multi_base: true, custom_integrations: true, priority_support: true },
    };
    setLocalFlags(tierFeatures[newTier] || tierFeatures.starter);
  };

  return (
    <div>
      {/* Current plan */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 16, borderLeft: `4px solid ${tierDef.color}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{tierDef.name}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{tierDef.price} · Up to {tierDef.aircraft} aircraft</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ padding: "4px 12px", borderRadius: 12, fontSize: 10, fontWeight: 700,
              background: status === "active" ? `${GREEN}22` : status === "trial" ? `${YELLOW}22` : `${RED}22`,
              color: status === "active" ? GREEN : status === "trial" ? YELLOW : RED,
              border: `1px solid ${status === "active" ? GREEN + "44" : status === "trial" ? YELLOW + "44" : RED + "44"}`,
              textTransform: "uppercase" }}>{status}</span>
            {status === "trial" && trialEnds && (
              <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>Trial ends {new Date(trialEnds).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Feature flags */}
      <div style={{ ...card, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Active Features</div>
          {canManage && (
            <button onClick={() => { if (editingFlags) handleSaveFlags(); else { setLocalFlags(flags); setSelectedTier(tier); setEditingFlags(true); } }}
              style={{ padding: "5px 14px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                background: editingFlags ? GREEN : "transparent", color: editingFlags ? BLACK : MUTED,
                border: `1px solid ${editingFlags ? GREEN : BORDER}` }}>
              {editingFlags ? "Save Changes" : "Edit Features"}
            </button>
          )}
        </div>

        {/* Tier selector (only in edit mode) */}
        {editingFlags && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {Object.entries(TIER_DEFS).map(([id, def]) => (
              <button key={id} onClick={() => handleTierChange(id)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                  background: selectedTier === id ? `${def.color}22` : "transparent",
                  border: `1px solid ${selectedTier === id ? def.color + "44" : BORDER}`,
                  color: selectedTier === id ? def.color : MUTED }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{def.name}</div>
                <div style={{ fontSize: 9, marginTop: 2 }}>{def.price}</div>
              </button>
            ))}
          </div>
        )}

        {/* Feature toggles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(FEATURE_LABELS_MAP).map(([key, label]) => {
            const enabled = editingFlags ? localFlags[key] : flags[key];
            return (
              <div key={key}
                onClick={() => { if (editingFlags) setLocalFlags(prev => ({ ...prev, [key]: !prev[key] })); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6,
                  cursor: editingFlags ? "pointer" : "default",
                  background: enabled ? "rgba(74,222,128,0.06)" : "transparent",
                  border: `1px solid ${enabled ? "rgba(74,222,128,0.15)" : BORDER}`,
                  opacity: editingFlags ? 1 : (enabled ? 1 : 0.4) }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                  border: `2px solid ${enabled ? GREEN : BORDER}`,
                  background: enabled ? GREEN : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {enabled && <span style={{ color: BLACK, fontSize: 10, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 10, color: enabled ? OFF_WHITE : MUTED }}>{label}</span>
              </div>
            );
          })}
        </div>

        {editingFlags && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={handleSaveFlags}
              style={{ padding: "8px 20px", background: GREEN, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              Save Changes
            </button>
            <button onClick={() => { setEditingFlags(false); setLocalFlags(flags); setSelectedTier(tier); }}
              style={{ padding: "8px 20px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, profile, canManage, onUpdateRole, onUpdatePermissions, onRemoveUser }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const role = ROLES.find(r => r.id === user.role) || ROLES[0];
  const isMe = user.id === profile?.id;
  const userPerms = user.permissions || [];

  const togglePerm = (permId) => {
    const updated = userPerms.includes(permId) ? userPerms.filter(p => p !== permId) : [...userPerms, permId];
    onUpdatePermissions(user.id, updated);
  };

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: canManage ? "pointer" : "default" }} onClick={() => canManage && setExpanded(!expanded)}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: NEAR_BLACK, border: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: MUTED }}>{(user.full_name || "?")[0].toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: WHITE }}>{user.full_name}</span>
            {isMe && <span style={{ fontSize: 9, color: CYAN, background: `${CYAN}22`, padding: "1px 6px", borderRadius: 8 }}>You</span>}
          </div>
          <div style={{ fontSize: 10, color: MUTED }}>
            {user.email || "No email"} · Joined {new Date(user.created_at).toLocaleDateString()}
            {userPerms.length > 0 && ` · ${userPerms.length} extra permission${userPerms.length > 1 ? "s" : ""}`}
          </div>
        </div>
        {canManage && !isMe ? (
          <select value={user.role} onChange={e => { e.stopPropagation(); onUpdateRole(user.id, e.target.value); }}
            onClick={e => e.stopPropagation()}
            style={{ padding: "4px 8px", borderRadius: 4, fontSize: 11, background: NEAR_BLACK, color: OFF_WHITE,
              border: `1px solid ${BORDER}`, cursor: "pointer" }}>
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 11, color: role.id === "admin" ? CYAN : role.id === "safety_manager" ? GREEN : MUTED, fontWeight: 600 }}>
            {role.label}
          </span>
        )}
        {canManage && <span style={{ color: MUTED, fontSize: 12, flexShrink: 0 }}>{expanded ? "\u25B2" : "\u25BC"}</span>}
      </div>
      {expanded && canManage && (
        <div style={{ padding: "8px 0 14px 48px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Additional Permissions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PERMISSIONS.map(p => {
              const has = userPerms.includes(p.id);
              return (
                <button key={p.id} onClick={() => togglePerm(p.id)} title={p.desc}
                  style={{ padding: "5px 12px", borderRadius: 16, fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: has ? `${GREEN}22` : "transparent", color: has ? GREEN : MUTED,
                    border: `1px solid ${has ? GREEN + "44" : BORDER}` }}>
                  {has ? "✓ " : ""}{p.label}
                </button>
              );
            })}
          </div>
          {!isMe && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
              {!confirmRemove ? (
                <button onClick={() => setConfirmRemove(true)}
                  style={{ fontSize: 10, color: RED, background: "none", border: `1px solid ${RED}44`, borderRadius: 4, padding: "5px 12px", cursor: "pointer" }}>Remove User</button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: RED, fontWeight: 600 }}>Remove {user.full_name}?</span>
                  <button onClick={() => { onRemoveUser(user.id); setConfirmRemove(false); }}
                    style={{ fontSize: 10, color: WHITE, background: RED, border: "none", borderRadius: 4, padding: "5px 12px", cursor: "pointer", fontWeight: 700 }}>Yes, Remove</button>
                  <button onClick={() => setConfirmRemove(false)}
                    style={{ fontSize: 10, color: MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "5px 12px", cursor: "pointer" }}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── INVITE SECTION ─────────────────────────────────────────
function InviteSection({ canManage, onInvite, invitations, onRevoke, onResend }) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("pilot");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInvite = async () => {
    if (!email.trim()) { setError("Enter an email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Invalid email address"); return; }
    setError(""); setSending(true);
    try {
      const result = await onInvite(email.trim(), role);
      if (result?.error) { setError(result.error); setSending(false); return; }
      setSuccess(`Invitation sent to ${email.trim()}`);
      setEmail(""); setRole("pilot");
      setTimeout(() => { setSuccess(""); setShowForm(false); }, 3000);
    } catch (e) { setError(e.message); }
    setSending(false);
  };

  const pending = invitations.filter(i => i.status === "pending");
  const accepted = invitations.filter(i => i.status === "accepted");
  const expired = invitations.filter(i => i.status === "expired" || (i.status === "pending" && new Date(i.expires_at) < new Date()));

  if (!canManage) return null;

  return (
    <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Invite Team Members</div>
        {!showForm && <button onClick={() => setShowForm(true)} style={{ padding: "6px 14px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ Invite User</button>}
      </div>

      {showForm && (
        <div style={{ background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
          <div className="invite-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Email Address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="pilot@company.com" style={{ ...inp, padding: "10px 12px" }}
                onKeyDown={e => { if (e.key === "Enter") handleInvite(); }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inp, padding: "10px 12px" }}>
                <option value="pilot">Pilot</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="safety_manager">Safety Manager</option>
                <option value="chief_pilot">Chief Pilot</option>
                <option value="accountable_exec">Accountable Exec</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {error && <div style={{ fontSize: 11, color: RED, marginBottom: 8 }}>{error}</div>}
          {success && <div style={{ fontSize: 11, color: GREEN, marginBottom: 8 }}>{success}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleInvite} disabled={sending}
              style={{ padding: "8px 20px", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.6 : 1 }}>
              {sending ? "Sending..." : "Send Invitation"}</button>
            <button onClick={() => { setShowForm(false); setError(""); setSuccess(""); }}
              style={{ padding: "8px 16px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Pending ({pending.length})</div>
          {pending.map(inv => {
            const isExpired = new Date(inv.expires_at) < new Date();
            return (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: isExpired ? MUTED : OFF_WHITE, fontWeight: 600 }}>{inv.email}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>
                    {ROLES.find(r => r.id === inv.role)?.label || inv.role} · Sent {new Date(inv.created_at).toLocaleDateString()}
                    {isExpired && <span style={{ color: AMBER }}> · Expired</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => onResend(inv.id)} style={{ fontSize: 10, color: CYAN, background: "none", border: `1px solid ${CYAN}44`, borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Resend</button>
                  <button onClick={() => onRevoke(inv.id)} style={{ fontSize: 10, color: RED, background: "none", border: `1px solid ${RED}44`, borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}>Revoke</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recently accepted */}
      {accepted.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Accepted ({accepted.length})</div>
          {accepted.slice(0, 5).map(inv => (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: OFF_WHITE }}>{inv.email}</span>
              <span style={{ fontSize: 10, color: GREEN }}>✓ Joined {new Date(inv.accepted_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {invitations.length === 0 && !showForm && (
        <div style={{ fontSize: 11, color: MUTED, textAlign: "center", padding: 12 }}>No invitations sent yet. Click "Invite User" to add team members.</div>
      )}
    </div>
  );
}

export default function AdminPanel({ profile, orgProfiles, onUpdateRole, onUpdatePermissions, onRemoveUser, orgName, orgSlug, orgLogo, onUploadLogo, fratTemplate, fratTemplates, onSaveTemplate, onCreateTemplate, onDeleteTemplate, onSetActiveTemplate, notificationContacts, onAddContact, onUpdateContact, onDeleteContact, orgData, onUpdateOrg, invitations, onInviteUser, onRevokeInvitation, onResendInvitation }) {
  const myRole = profile?.role;
  const canManage = ["admin", "safety_manager", "accountable_exec"].includes(myRole);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState("org");

  const handleSaveTemplate = async (templateData) => {
    setSavingTemplate(true);
    try {
      await onSaveTemplate(templateData);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadMsg("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { setUploadMsg("File must be under 2MB"); return; }
    setUploading(true);
    setUploadMsg("");
    const result = await onUploadLogo(file);
    setUploading(false);
    if (result?.error) { setUploadMsg("Upload failed: " + (result.error.message || result.error)); }
    else { setUploadMsg("Logo updated"); setTimeout(() => setUploadMsg(""), 3000); }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Admin tabs */}
      <div className="admin-tabs" style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ id: "org", label: "Organization" }, { id: "frat", label: "FRAT Template", feat: "custom_frat_template" }, { id: "notifications", label: "Notifications", feat: "approval_workflow" }, { id: "users", label: "Users & Roles" }, { id: "subscription", label: "Subscription" }].filter(t => {
          if (!t.feat) return true;
          const flags = orgData?.feature_flags || {};
          return flags[t.feat] !== false; // Show if true or undefined
        }).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "6px 16px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3,
            background: activeTab === t.id ? WHITE : "transparent", color: activeTab === t.id ? BLACK : MUTED,
            border: `1px solid ${activeTab === t.id ? WHITE : BORDER}`,
          }}>{t.label}</button>
        ))}
      </div>

      {/* FRAT Template Editor */}
      {activeTab === "frat" && canManage && (
        <FRATTemplateEditor template={fratTemplate} templates={fratTemplates} onSave={handleSaveTemplate} onCreateTemplate={onCreateTemplate} onDeleteTemplate={onDeleteTemplate} onSetActive={onSetActiveTemplate} saving={savingTemplate} />
      )}

      {activeTab === "notifications" && canManage && (
        <NotificationContacts contacts={notificationContacts || []} onAdd={onAddContact} onUpdate={onUpdateContact} onDelete={onDeleteContact} />
      )}

      {activeTab === "org" && (<>
      {/* Org Info */}
      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>Organization</div>
        <div className="admin-org-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Name</div>
            <div style={{ fontSize: 14, color: WHITE, fontWeight: 600 }}>{orgName}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Join Code</div>
            <div style={{ fontSize: 14, color: CYAN, fontFamily: "monospace", fontWeight: 600 }}>{orgSlug}</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: MUTED, marginTop: 8 }}>Share the join code with team members so they can create accounts and join your organization.</div>
        
        {/* Logo Upload */}
        {canManage && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Organization Logo</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {orgLogo && <img src={orgLogo} alt="Org logo" style={{ height: 40, objectFit: "contain", borderRadius: 4, background: BLACK, padding: 4 }} />}
              <label style={{ fontSize: 11, color: CYAN, cursor: "pointer", padding: "6px 14px", borderRadius: 6, border: `1px solid ${CYAN}44`, background: "rgba(34,211,238,0.08)" }}>
                {uploading ? "Uploading..." : orgLogo ? "Change Logo" : "Upload Logo"}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} disabled={uploading} />
              </label>
              {uploadMsg && <span style={{ fontSize: 10, color: uploadMsg.includes("failed") ? RED : GREEN }}>{uploadMsg}</span>}
            </div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 6 }}>PNG or JPG, max 2MB. This logo appears in the header for all team members.</div>
          </div>
        )}
      </div>
      </>)}

      {/* Users & Invitations */}
      {activeTab === "users" && (<>
      <InviteSection canManage={canManage} onInvite={onInviteUser} invitations={invitations || []} onRevoke={onRevokeInvitation} onResend={onResendInvitation} />

      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Team Members ({orgProfiles.length})</div>
        </div>

        {orgProfiles.map(user => (
          <UserRow key={user.id} user={user} profile={profile} canManage={canManage} onUpdateRole={onUpdateRole} onUpdatePermissions={onUpdatePermissions} onRemoveUser={onRemoveUser} />
        ))}
      </div>

      {/* Role & permission descriptions */}
      <div style={{ ...card, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Roles</div>
        {ROLES.map(r => (
          <div key={r.id} style={{ display: "flex", gap: 12, padding: "6px 0" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, width: 140, flexShrink: 0 }}>{r.label}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{r.desc}</span>
          </div>
        ))}
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>Additional Permissions</div>
        {PERMISSIONS.map(p => (
          <div key={p.id} style={{ display: "flex", gap: 12, padding: "6px 0" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, width: 140, flexShrink: 0 }}>{p.label}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{p.desc}</span>
          </div>
        ))}
      </div>
      </>)}

      {/* Subscription */}
      {activeTab === "subscription" && (<>
        <SubscriptionTab orgData={orgData} onUpdateOrg={onUpdateOrg} canManage={canManage} />
      </>)}
    </div>
  );
}
