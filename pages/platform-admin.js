import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { FEATURE_LABELS, getTierFeatures } from "../lib/tiers";

export const getServerSideProps = async () => ({ props: {} });

const BLACK = "#000000", DARK = "#111111", NEAR_BLACK = "#0A0A0A";
const CARD = "#222222", BORDER = "#2E2E2E", LIGHT_BORDER = "#3A3A3A";
const WHITE = "#FFFFFF", OFF_WHITE = "#E0E0E0", MUTED = "#777777", SUBTLE = "#555555";
const GREEN = "#4ADE80", YELLOW = "#FACC15", AMBER = "#F59E0B", RED = "#EF4444", CYAN = "#22D3EE";
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };
const TIER_COLORS = { free: "#22D3EE", starter: MUTED, professional: GREEN, enterprise: CYAN };
const STATUS_COLORS = { free: CYAN, active: GREEN, trial: YELLOW, canceled: RED, past_due: AMBER };
const inp = { padding: "8px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontSize: 12, boxSizing: "border-box" };

async function api(body) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("pa_token") : null;
    const res = await fetch("/api/platform-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, token }) });
    if (!res.ok) {
      try { const j = await res.json(); return { ...j, _status: res.status }; } catch { return { error: `Server error (${res.status})`, _status: res.status }; }
    }
    return res.json();
  } catch (e) {
    return { error: "Network error — check your connection" };
  }
}

function SetupScreen({ onComplete }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const go = async () => {
    if (!name || !email || !password) { setError("All fields required"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Min 8 characters"); return; }
    setLoading(true); setError("");
    const res = await api({ action: "setup", email, password, name });
    if (res.error) { setError(res.error); setLoading(false); return; }
    localStorage.setItem("pa_token", res.token); onComplete(res.admin);
  };
  const s = { width: "100%", padding: "10px 14px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontSize: 13, boxSizing: "border-box", marginBottom: 10 };
  return (
    <div style={{ minHeight: "100vh", background: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, padding: "40px 36px", maxWidth: 400, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/logo.png" alt="PreflightSMS" style={{ height: 200, objectFit: "contain", marginBottom: 8 }} onError={e => { e.target.style.display = "none"; }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Platform Setup</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Create your platform admin account</div>
        </div>
        <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={s} />
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={s} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={s} />
        <input placeholder="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} style={s} />
        {error && <div style={{ color: RED, fontSize: 11, marginBottom: 10 }}>{error}</div>}
        <button onClick={go} disabled={loading} style={{ width: "100%", padding: "12px 0", background: CYAN, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Creating..." : "Create Admin Account"}</button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const go = async () => {
    if (!email || !password) { setError("Email and password required"); return; }
    setLoading(true); setError("");
    const res = await api({ action: "login", email, password });
    if (res.error) { setError(res.error); setLoading(false); return; }
    localStorage.setItem("pa_token", res.token); onLogin(res.admin);
  };
  const s = { width: "100%", padding: "10px 14px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontSize: 13, boxSizing: "border-box", marginBottom: 10 };
  return (
    <div style={{ minHeight: "100vh", background: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, padding: "40px 36px", maxWidth: 380, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/logo.png" alt="PreflightSMS" style={{ height: 200, objectFit: "contain", marginBottom: 8 }} onError={e => { e.target.style.display = "none"; }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Platform Admin</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Sign in with your admin credentials</div>
        </div>
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={s} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} style={s} />
        {error && <div style={{ color: RED, fontSize: 11, marginBottom: 10 }}>{error}</div>}
        <button onClick={go} disabled={loading} style={{ width: "100%", padding: "12px 0", background: WHITE, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Signing in..." : "Sign In"}</button>
      </div>
    </div>
  );
}

export default function PlatformAdmin() {
  const [state, setState] = useState("loading");
  const [admin, setAdmin] = useState(null);
  const [view, setView] = useState("orgs");
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [orgStats, setOrgStats] = useState({});
  const [editFlags, setEditFlags] = useState(null);
  const [editStatus, setEditStatus] = useState(null);
  const [editMaxAircraft, setEditMaxAircraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("pa_token");
      if (token) {
        const res = await api({ action: "verify", token });
        if (res.admin) { setAdmin(res.admin); setState("app"); return; }
        localStorage.removeItem("pa_token");
      }
      const setup = await api({ action: "check_setup" });
      setState(setup.needs_setup ? "setup" : "login");
    })();
  }, []);

  const showToast = (msg, isError) => { setToast({ msg, isError }); setTimeout(() => setToast(null), 3000); };
  const logout = () => { localStorage.removeItem("pa_token"); setAdmin(null); setState("login"); };

  const callApi = useCallback(async (body) => {
    const res = await api(body);
    if (res._status === 401) { localStorage.removeItem("pa_token"); setAdmin(null); setState("login"); showToast("Session expired — please sign in again", true); return res; }
    return res;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrgs = useCallback(async () => { const res = await callApi({ action: "fetch_orgs" }); if (!res._status) setOrgs(res.orgs || []); }, [callApi]);
  const loadAdmins = useCallback(async () => { const res = await callApi({ action: "list_admins" }); if (!res._status) setAdmins(res.admins || []); }, [callApi]);
  useEffect(() => { if (state === "app") { loadOrgs(); loadAdmins(); } }, [state, loadOrgs, loadAdmins]);

  const isDirty = selectedOrg && (
    editStatus !== (selectedOrg.subscription_status || "trial") ||
    editMaxAircraft !== (selectedOrg.max_aircraft || 5) ||
    JSON.stringify(editFlags) !== JSON.stringify(selectedOrg.feature_flags || getTierFeatures(selectedOrg.tier || "starter"))
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const doSelectOrg = async (org) => {
    setSelectedOrg(org);
    setEditFlags(org.feature_flags || getTierFeatures(org.tier || "starter"));
    setEditStatus(org.subscription_status || "trial");
    setEditMaxAircraft(org.max_aircraft || 5);
    setOrgUsers([]); setOrgStats({}); setOrgLoading(true);
    const [u, s] = await Promise.all([callApi({ action: "fetch_org_users", org_id: org.id }), callApi({ action: "fetch_org_stats", org_id: org.id })]);
    if (u._status || s._status) return;
    setOrgUsers(u.users || []); setOrgStats(s.stats || {}); setOrgLoading(false);
  };

  const selectOrg = (org) => {
    if (isDirty) { setPendingAction({ type: "selectOrg", org }); return; }
    doSelectOrg(org);
  };

  const saveChanges = async () => {
    if (!selectedOrg) return; setSaving(true);
    const res = await callApi({ action: "update_org", org_id: selectedOrg.id, updates: { feature_flags: editFlags, subscription_status: editStatus, max_aircraft: editMaxAircraft } });
    if (res.error) { showToast("Error: " + res.error, true); setSaving(false); return; }
    // Refresh orgs list and update selected org from fresh data
    const orgsRes = await callApi({ action: "fetch_orgs" });
    const freshOrgs = orgsRes.orgs || [];
    setOrgs(freshOrgs);
    const updated = freshOrgs.find(o => o.id === selectedOrg.id);
    if (updated) {
      setSelectedOrg(updated);
      setEditFlags(updated.feature_flags || getTierFeatures(updated.tier || "starter"));
      setEditStatus(updated.subscription_status || "trial");
      setEditMaxAircraft(updated.max_aircraft || 5);
    }
    setSaving(false); showToast("Changes saved");
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) { showToast("All fields required", true); return; }
    if (newAdmin.password.length < 8) { showToast("Password must be at least 8 characters", true); return; }
    setAddingAdmin(true);
    const res = await callApi({ action: "add_admin", name: newAdmin.name, email: newAdmin.email, password: newAdmin.password });
    setAddingAdmin(false);
    if (res.error) { showToast("Error: " + res.error, true); return; }
    setNewAdmin({ name: "", email: "", password: "" }); loadAdmins(); showToast("Admin added");
  };

  const handleRemoveAdmin = async (id) => {
    if (id === admin?.id) { showToast("Can't remove yourself", true); return; }
    const res = await callApi({ action: "remove_admin", admin_id: id });
    if (res.error) { showToast("Error: " + res.error, true); return; }
    loadAdmins(); showToast("Admin deactivated");
  };

  const handleDeleteOrg = async (orgId) => {
    const res = await callApi({ action: "delete_org", org_id: orgId });
    if (res.error) { showToast("Error: " + res.error, true); return; }
    setSelectedOrg(null); loadOrgs();
    showToast(`Organization deleted (${res.deleted_users} user${res.deleted_users !== 1 ? "s" : ""} removed)`);
  };

  const filteredOrgs = orgs.filter(o => {
    if (!search) return true; const s = search.toLowerCase();
    return (o.name || "").toLowerCase().includes(s) || (o.slug || "").toLowerCase().includes(s) || (o.tier || "").toLowerCase().includes(s);
  });

  if (state === "loading") return <div style={{ minHeight: "100vh", background: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: MUTED }}>Loading...</div></div>;
  if (state === "setup") return <SetupScreen onComplete={(a) => { setAdmin(a); setState("app"); }} />;
  if (state === "login") return <LoginScreen onLogin={(a) => { setAdmin(a); setState("app"); }} />;

  return (
    <>
      <Head><title>Platform Admin — PreflightSMS</title></Head>
      <div style={{ minHeight: "100vh", background: BLACK, color: WHITE, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ background: DARK, borderBottom: `1px solid ${BORDER}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="PreflightSMS" style={{ height: 28, objectFit: "contain" }} />
            <span style={{ fontSize: 10, color: MUTED, padding: "2px 8px", background: `${RED}22`, border: `1px solid ${RED}44`, borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>Platform Admin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: MUTED }}>{admin?.name} ({admin?.email})</span>
            <button onClick={logout} style={{ fontSize: 11, color: RED, background: "transparent", border: "none", cursor: "pointer" }}>Sign Out</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "10px 24px", borderBottom: `1px solid ${BORDER}`, background: DARK }}>
          {[["orgs", "Organizations"], ["admins", "Platform Admins"]].map(([id, label]) => (
            <button key={id} onClick={() => {
              if (isDirty && view === "orgs" && id !== "orgs") { setPendingAction({ type: "switchTab", tab: id }); return; }
              setView(id);
            }} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: view === id ? WHITE : "transparent", color: view === id ? BLACK : MUTED, border: `1px solid ${view === id ? WHITE : BORDER}` }}>{label}</button>
          ))}
        </div>

        {pendingAction && (
          <div style={{ padding: "10px 24px", background: `${AMBER}15`, borderBottom: `1px solid ${AMBER}44`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: AMBER, fontWeight: 600 }}>You have unsaved changes</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={async () => { await saveChanges(); const a = pendingAction; setPendingAction(null); if (a.type === "selectOrg") doSelectOrg(a.org); else if (a.type === "switchTab") setView(a.tab); }} style={{ padding: "6px 14px", background: GREEN, color: BLACK, border: "none", borderRadius: 4, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Save & Continue</button>
              <button onClick={() => { const a = pendingAction; setPendingAction(null); if (a.type === "selectOrg") doSelectOrg(a.org); else if (a.type === "switchTab") setView(a.tab); }} style={{ padding: "6px 14px", background: "transparent", color: RED, border: `1px solid ${RED}44`, borderRadius: 4, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Discard</button>
              <button onClick={() => setPendingAction(null)} style={{ padding: "6px 14px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {view === "admins" && <AdminsView admins={admins} admin={admin} newAdmin={newAdmin} setNewAdmin={setNewAdmin} addingAdmin={addingAdmin} onAdd={handleAddAdmin} onRemove={handleRemoveAdmin} />}
        {view === "orgs" && <OrgsView orgs={filteredOrgs} selectedOrg={selectedOrg} selectOrg={selectOrg} search={search} setSearch={setSearch} orgUsers={orgUsers} orgStats={orgStats} orgLoading={orgLoading} editStatus={editStatus} editFlags={editFlags} editMaxAircraft={editMaxAircraft} setEditFlags={setEditFlags} setEditStatus={setEditStatus} setEditMaxAircraft={setEditMaxAircraft} saveChanges={saveChanges} saving={saving} onDeleteOrg={handleDeleteOrg} isDirty={isDirty} />}

        {toast && <div style={{ position: "fixed", bottom: 24, right: 24, padding: "10px 20px", background: toast.isError ? `${RED}22` : `${GREEN}22`, border: `1px solid ${toast.isError ? RED + "44" : GREEN + "44"}`, borderRadius: 8, color: toast.isError ? RED : GREEN, fontSize: 12, fontWeight: 600 }}>{toast.msg}</div>}
      </div>
      <style>{`*{box-sizing:border-box}input:focus{outline:none;border-color:${WHITE} !important}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${DARK}}::-webkit-scrollbar-thumb{background:${BORDER};border-radius:3px}@media(max-width:768px){.pa-orgs-layout{grid-template-columns:1fr !important;min-height:auto !important}.pa-sidebar{border-right:none !important;border-bottom:1px solid ${BORDER};max-height:40vh;overflow-y:auto}.pa-stats-grid{grid-template-columns:repeat(3,1fr) !important}}@media(max-width:480px){.pa-stats-grid{grid-template-columns:repeat(2,1fr) !important}}`}</style>
    </>
  );
}

function AdminsView({ admins, admin, newAdmin, setNewAdmin, addingAdmin, onAdd, onRemove }) {
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Platform Admins</div>
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 20 }}>These accounts are completely separate from customer accounts.</div>
      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 12 }}>Active ({admins.filter(a => a.is_active).length})</div>
        {admins.filter(a => a.is_active).map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{a.name}</div>
              <div style={{ fontSize: 10, color: MUTED }}>{a.email} · Last login: {a.last_login_at ? new Date(a.last_login_at).toLocaleDateString() : "Never"}</div>
            </div>
            {a.id === admin?.id ? (
              <button disabled style={{ padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "default", background: "transparent", border: `1px solid ${BORDER}`, color: SUBTLE, opacity: 0.5 }}>You</button>
            ) : confirmDeactivate === a.id ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { onRemove(a.id); setConfirmDeactivate(null); }} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer", background: RED, color: WHITE, border: "none" }}>Confirm</button>
                <button onClick={() => setConfirmDeactivate(null)} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: "transparent", color: MUTED, border: `1px solid ${BORDER}` }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeactivate(a.id)} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", background: "transparent", border: `1px solid ${RED}44`, color: RED }}>Deactivate</button>
            )}
          </div>
        ))}
      </div>
      <div style={{ ...card, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 12 }}>Add Platform Admin</div>
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          <input placeholder="Full name" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))} style={{ ...inp, width: "100%" }} />
          <input placeholder="Email" type="email" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} style={{ ...inp, width: "100%" }} />
          <input placeholder="Password" type="password" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} style={{ ...inp, width: "100%" }} />
        </div>
        <button onClick={onAdd} disabled={addingAdmin} style={{ padding: "8px 20px", background: GREEN, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer", opacity: addingAdmin ? 0.6 : 1 }}>{addingAdmin ? "Adding..." : "Add Admin"}</button>
      </div>
    </div>
  );
}

function OrgsView({ orgs, selectedOrg, selectOrg, search, setSearch, orgUsers, orgStats, orgLoading, editStatus, editFlags, editMaxAircraft, setEditFlags, setEditStatus, setEditMaxAircraft, saveChanges, saving, onDeleteOrg, isDirty }) {
  return (
    <div className="pa-orgs-layout" style={{ display: "grid", gridTemplateColumns: "360px 1fr", minHeight: "calc(100vh - 90px)" }}>
      <div className="pa-sidebar" style={{ borderRight: `1px solid ${BORDER}`, padding: 16, overflowY: "auto" }}>
        <div style={{ marginBottom: 12 }}><input placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", ...inp }} /></div>
        <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>{orgs.length} Organization{orgs.length !== 1 ? "s" : ""}</div>
        {orgs.map(o => (
          <div key={o.id} onClick={() => selectOrg(o)} style={{ padding: "12px 14px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: selectedOrg?.id === o.id ? "rgba(255,255,255,0.06)" : "transparent", border: `1px solid ${selectedOrg?.id === o.id ? LIGHT_BORDER : "transparent"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {o.logo_url && <img src={o.logo_url} alt="" style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 3 }} />}
                <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{o.name || o.slug || "Unnamed"}</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: TIER_COLORS[o.tier] || MUTED, textTransform: "uppercase" }}>{o.tier || "starter"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: MUTED }}>{o.slug}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLORS[o.subscription_status] || MUTED }}>{o.subscription_status || "trial"}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 24, overflowY: "auto" }}>
        {!selectedOrg ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: MUTED }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div><div style={{ fontSize: 14, fontWeight: 600 }}>Select an organization</div></div>
          </div>
        ) : (
          <OrgDetail key={selectedOrg.id} org={selectedOrg} orgUsers={orgUsers} orgStats={orgStats} orgLoading={orgLoading} editStatus={editStatus} editFlags={editFlags} editMaxAircraft={editMaxAircraft} setEditFlags={setEditFlags} setEditStatus={setEditStatus} setEditMaxAircraft={setEditMaxAircraft} saveChanges={saveChanges} saving={saving} onDeleteOrg={onDeleteOrg} isDirty={isDirty} />
        )}
      </div>
    </div>
  );
}

function OrgDetail({ org, orgUsers, orgStats, orgLoading, editStatus, editFlags, editMaxAircraft, setEditFlags, setEditStatus, setEditMaxAircraft, saveChanges, saving, onDeleteOrg, isDirty }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [orgDetails, setOrgDetails] = useState(null);
  useEffect(() => {
    if (!org?.id) return;
    api({ action: "fetch_org_details", org_id: org.id }).then(res => {
      if (!res.error && !res._status) setOrgDetails(res);
    });
  }, [org?.id]);
  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {org.logo_url && <img src={org.logo_url} alt="" style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 6, background: NEAR_BLACK, padding: 4 }} />}
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{org.name || "Unnamed"}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{org.slug} · Created {new Date(org.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <button onClick={saveChanges} disabled={saving || !isDirty} style={{ padding: "8px 24px", background: isDirty ? GREEN : SUBTLE, color: isDirty ? BLACK : MUTED, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: isDirty ? "pointer" : "default", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : isDirty ? "Save Changes" : "No Changes"}</button>
      </div>

      <div className="pa-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20, opacity: orgLoading ? 0.4 : 1, transition: "opacity 0.2s" }}>
        {[["FRATs", orgStats.frats], ["Flights", orgStats.flights], ["Reports", orgStats.reports], ["Hazards", orgStats.hazards], ["Actions", orgStats.actions]].map(([l, v]) => (
          <div key={l} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif", marginTop: 2 }}>{orgLoading ? "–" : (v || 0)}</div>
          </div>
        ))}
      </div>

      {/* API Keys, AI Usage, Integrations */}
      {orgDetails && (
        <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>API & Integrations</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>API Keys</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: WHITE, marginTop: 2 }}>{orgDetails.apiKeyCount} <span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>active</span></div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>AI Usage</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: WHITE, marginTop: 2 }}>{(orgDetails.aiUsage?.totalTokens || 0).toLocaleString()} <span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}>tokens</span></div>
              {orgDetails.aiUsage?.features?.length > 0 && <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{orgDetails.aiUsage.features.join(", ")}</div>}
            </div>
            <div>
              <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Integrations</div>
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 11, color: orgDetails.foreflight?.enabled ? GREEN : MUTED }}>ForeFlight {orgDetails.foreflight?.enabled ? "Active" : "—"}</div>
                <div style={{ fontSize: 11, color: orgDetails.schedaero?.enabled ? GREEN : MUTED }}>Schedaero {orgDetails.schedaero?.enabled ? "Active" : "—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...card, padding: "16px 20px", marginBottom: 16, opacity: orgLoading ? 0.4 : 1, transition: "opacity 0.2s" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Users ({orgLoading ? "…" : orgUsers.length})</div>
        {orgLoading ? <div style={{ fontSize: 11, color: MUTED }}>Loading...</div> : orgUsers.length === 0 ? <div style={{ fontSize: 11, color: MUTED }}>No users</div> : orgUsers.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
            <div><span style={{ fontSize: 12, color: WHITE, fontWeight: 600, marginRight: 8 }}>{u.full_name || "No name"}</span><span style={{ fontSize: 10, color: MUTED }}>{u.id?.slice(0, 8)}</span></div>
            <span style={{ fontSize: 10, color: CYAN, fontWeight: 600, textTransform: "uppercase" }}>{u.role || "pilot"}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {["trial", "active", "past_due", "canceled"].map(s => (
              <button key={s} onClick={() => setEditStatus(s)} style={{ padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, textTransform: "uppercase", background: editStatus === s ? `${STATUS_COLORS[s]}22` : "transparent", border: `1px solid ${editStatus === s ? STATUS_COLORS[s] + "66" : BORDER}`, color: editStatus === s ? STATUS_COLORS[s] : MUTED }}>{s.replace("_", " ")}</button>
            ))}
          </div>
        </div>
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Max Aircraft</div>
          <input type="number" value={editMaxAircraft} onChange={e => setEditMaxAircraft(parseInt(e.target.value) || 0)} style={{ width: "100%", ...inp, fontSize: 16, fontWeight: 700 }} />
        </div>
      </div>

      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Feature Flags</div>
          <button onClick={() => { const a = {}; Object.keys(FEATURE_LABELS).forEach(k => a[k] = true); setEditFlags(a); }} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", background: "transparent", border: `1px solid ${BORDER}`, color: GREEN }}>All On</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const on = editFlags?.[key] ?? false;
            return (
              <div key={key} onClick={() => setEditFlags(p => ({ ...p, [key]: !p[key] }))} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: on ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${on ? "rgba(74,222,128,0.2)" : BORDER}` }}>
                <div style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0, border: `2px solid ${on ? GREEN : SUBTLE}`, background: on ? GREEN : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {on && <span style={{ color: BLACK, fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 11, color: on ? OFF_WHITE : MUTED }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={saveChanges} disabled={saving || !isDirty} style={{ padding: "10px 32px", background: isDirty ? GREEN : SUBTLE, color: isDirty ? BLACK : MUTED, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: isDirty ? "pointer" : "default", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : isDirty ? "Save Changes" : "No Changes"}</button>

      <div style={{ ...card, padding: "16px 20px", marginTop: 24, borderColor: `${RED}33` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: RED, marginBottom: 8 }}>Danger Zone</div>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{ padding: "8px 20px", background: "transparent", color: RED, border: `1px solid ${RED}44`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Delete Organization</button>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>This will permanently delete <strong style={{ color: WHITE }}>{org.name}</strong>, all its data, and {orgUsers.length} user account{orgUsers.length !== 1 ? "s" : ""}. This cannot be undone.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { onDeleteOrg(org.id); setConfirmDelete(false); }} style={{ padding: "8px 20px", background: RED, color: WHITE, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Yes, Delete Everything</button>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: "8px 20px", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
