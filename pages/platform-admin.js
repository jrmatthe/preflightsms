import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { supabase, getSession, getProfile, fetchAllOrgs, fetchOrgUsers, fetchOrgStats, updateOrg } from "../lib/supabase";
import { TIERS, FEATURE_LABELS, getTierFeatures } from "../lib/tiers";

// Force client-side rendering — no SSR for this page
export const getServerSideProps = async () => ({ props: {} });

const BLACK = "#000000";
const DARK = "#111111";
const NEAR_BLACK = "#0A0A0A";
const CARD = "#222222";
const BORDER = "#2E2E2E";
const LIGHT_BORDER = "#3A3A3A";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#E0E0E0";
const MUTED = "#777777";
const SUBTLE = "#555555";
const GREEN = "#4ADE80";
const YELLOW = "#FACC15";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const CYAN = "#22D3EE";
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };

const TIER_COLORS = { starter: MUTED, professional: GREEN, enterprise: CYAN };
const STATUS_COLORS = { active: GREEN, trial: YELLOW, canceled: RED, past_due: AMBER };

const PLATFORM_ADMIN_EMAILS = [
  // Add your email(s) here — only these users can access this page
  // e.g. "james@preflightsms.com"
];

export default function PlatformAdmin() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [orgStats, setOrgStats] = useState({});
  const [editFlags, setEditFlags] = useState(null);
  const [editTier, setEditTier] = useState(null);
  const [editStatus, setEditStatus] = useState(null);
  const [editMaxAircraft, setEditMaxAircraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  // Auth check
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    
    const init = async () => {
      const { data: { session: sess } } = await supabase.auth.getSession();
      if (sess) {
        setSession(sess);
        try {
          // Fetch profile directly
          const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sess.user.id)
            .single();
          if (profErr) console.error("Profile error:", profErr);
          setProfile(prof);
          const email = sess.user?.email || "";
          const isAdmin = prof?.role === "admin";
          const emailOk = PLATFORM_ADMIN_EMAILS.length === 0 || PLATFORM_ADMIN_EMAILS.includes(email);
          setAuthorized(isAdmin && emailOk);
        } catch (err) {
          console.error("Profile fetch error:", err);
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  // Fetch all orgs
  const loadOrgs = useCallback(async () => {
    const { data } = await fetchAllOrgs();
    setOrgs(data);
  }, []);

  useEffect(() => { if (authorized) loadOrgs(); }, [authorized, loadOrgs]);

  // Select org
  const selectOrg = async (org) => {
    setSelectedOrg(org);
    setEditFlags(org.feature_flags || getTierFeatures(org.tier || "starter"));
    setEditTier(org.tier || "starter");
    setEditStatus(org.subscription_status || "trial");
    setEditMaxAircraft(org.max_aircraft || 5);
    const [{ data: users }, { data: stats }] = await Promise.all([
      fetchOrgUsers(org.id),
      fetchOrgStats(org.id),
    ]);
    setOrgUsers(users);
    setOrgStats(stats);
  };

  // Save changes
  const saveChanges = async () => {
    if (!selectedOrg) return;
    setSaving(true);
    await updateOrg(selectedOrg.id, {
      tier: editTier,
      feature_flags: editFlags,
      subscription_status: editStatus,
      max_aircraft: editMaxAircraft,
    });
    // Refresh
    await loadOrgs();
    setSelectedOrg(prev => ({ ...prev, tier: editTier, feature_flags: editFlags, subscription_status: editStatus, max_aircraft: editMaxAircraft }));
    setSaving(false);
    setToast("Changes saved");
    setTimeout(() => setToast(null), 3000);
  };

  // Apply tier defaults
  const applyTierDefaults = (tierName) => {
    setEditTier(tierName);
    setEditFlags(getTierFeatures(tierName));
    setEditMaxAircraft(TIERS[tierName]?.maxAircraft || 5);
  };

  const filteredOrgs = orgs.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (o.name || "").toLowerCase().includes(s) || (o.slug || "").toLowerCase().includes(s) || (o.tier || "").toLowerCase().includes(s);
  });

  if (loading) return <div style={{ minHeight: "100vh", background: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: MUTED }}>Loading...</div></div>;

  if (!session) return (
    <div style={{ minHeight: "100vh", background: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, padding: 40, textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: WHITE, marginBottom: 8 }}>Platform Admin</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Sign in required</div>
        <a href="/" style={{ color: CYAN, fontSize: 12 }}>← Go to main app</a>
      </div>
    </div>
  );

  if (!authorized && !loading) {
    const debugInfo = {
      hasSession: !!session,
      email: session?.user?.email || "none",
      profileRole: profile?.role || "none",
      profileName: profile?.full_name || "none",
      adminEmailList: PLATFORM_ADMIN_EMAILS.length === 0 ? "empty (all admins allowed)" : PLATFORM_ADMIN_EMAILS.join(", "),
    };
    return (
      <div style={{ minHeight: "100vh", background: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...card, padding: 40, textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: RED, marginBottom: 8 }}>Access Denied</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>You don't have platform admin access.</div>
          <div style={{ textAlign: "left", fontSize: 10, color: MUTED, background: NEAR_BLACK, padding: 12, borderRadius: 6, fontFamily: "monospace", lineHeight: 1.8 }}>
            {Object.entries(debugInfo).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}
          </div>
          <a href="/" style={{ color: CYAN, fontSize: 12, display: "block", marginTop: 16 }}>← Back to app</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Platform Admin — PreflightSMS</title></Head>
      <div style={{ minHeight: "100vh", background: BLACK, color: WHITE, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {/* Top bar */}
        <div style={{ background: DARK, borderBottom: `1px solid ${BORDER}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1 }}>PREFLIGHT<span style={{ color: CYAN }}>SMS</span></span>
            <span style={{ fontSize: 10, color: MUTED, padding: "2px 8px", background: `${RED}22`, border: `1px solid ${RED}44`, borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>Platform Admin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: MUTED }}>{session?.user?.email}</span>
            <a href="/" style={{ fontSize: 11, color: CYAN, textDecoration: "none" }}>← App</a>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", minHeight: "calc(100vh - 49px)" }}>
          {/* Left panel — org list */}
          <div style={{ borderRight: `1px solid ${BORDER}`, padding: 16, overflowY: "auto" }}>
            <div style={{ marginBottom: 12 }}>
              <input placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontSize: 12, boxSizing: "border-box" }} />
            </div>
            <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>{filteredOrgs.length} Organization{filteredOrgs.length !== 1 ? "s" : ""}</div>
            {filteredOrgs.map(o => (
              <div key={o.id} onClick={() => selectOrg(o)}
                style={{ padding: "12px 14px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
                  background: selectedOrg?.id === o.id ? "rgba(255,255,255,0.06)" : "transparent",
                  border: `1px solid ${selectedOrg?.id === o.id ? LIGHT_BORDER : "transparent"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{o.name || o.slug || "Unnamed"}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: TIER_COLORS[o.tier] || MUTED, textTransform: "uppercase" }}>{o.tier || "starter"}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: MUTED }}>{o.slug}</span>
                  <span style={{ fontSize: 10, fontWeight: 600,
                    color: STATUS_COLORS[o.subscription_status] || MUTED }}>{o.subscription_status || "trial"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right panel — org detail */}
          <div style={{ padding: 24, overflowY: "auto" }}>
            {!selectedOrg ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: MUTED }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Select an organization</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Manage tiers, features, and subscriptions</div>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 800 }}>
                {/* Org header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{selectedOrg.name || "Unnamed Org"}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{selectedOrg.slug} · Created {new Date(selectedOrg.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={saveChanges} disabled={saving}
                    style={{ padding: "8px 24px", background: GREEN, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "FRATs", value: orgStats.frats || 0, icon: "✓" },
                    { label: "Flights", value: orgStats.flights || 0, icon: "✈" },
                    { label: "Reports", value: orgStats.reports || 0, icon: "⚠" },
                    { label: "Hazards", value: orgStats.hazards || 0, icon: "△" },
                    { label: "Actions", value: orgStats.actions || 0, icon: "⊘" },
                  ].map(s => (
                    <div key={s.label} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: WHITE, fontFamily: "Georgia,serif", marginTop: 2 }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Users list */}
                <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Users ({orgUsers.length})</div>
                  {orgUsers.length === 0 ? (
                    <div style={{ fontSize: 11, color: MUTED }}>No users</div>
                  ) : (
                    <div style={{ display: "grid", gap: 4 }}>
                      {orgUsers.map(u => (
                        <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                          <div>
                            <span style={{ fontSize: 12, color: WHITE, fontWeight: 600, marginRight: 8 }}>{u.full_name || "No name"}</span>
                            <span style={{ fontSize: 10, color: MUTED }}>{u.id?.slice(0, 8)}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: CYAN, fontWeight: 600, textTransform: "uppercase" }}>{u.role || "pilot"}</span>
                            {(u.permissions || []).length > 0 && (
                              <span style={{ fontSize: 9, color: MUTED }}>+{u.permissions.length} perms</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tier selector */}
                <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 12 }}>Subscription Tier</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {Object.entries(TIERS).map(([id, tier]) => (
                      <div key={id} onClick={() => applyTierDefaults(id)}
                        style={{ padding: "14px 16px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                          background: editTier === id ? `${TIER_COLORS[id]}15` : "transparent",
                          border: `2px solid ${editTier === id ? TIER_COLORS[id] : BORDER}`,
                          transition: "all 0.15s" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: editTier === id ? TIER_COLORS[id] : MUTED }}>{tier.name}</div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{tier.price ? `$${tier.price}/mo` : "Custom"}</div>
                        <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>Up to {tier.maxAircraft === 999 ? "∞" : tier.maxAircraft} aircraft</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status + max aircraft */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div style={{ ...card, padding: "16px 20px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Subscription Status</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {["trial", "active", "past_due", "canceled"].map(s => (
                        <button key={s} onClick={() => setEditStatus(s)}
                          style={{ padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: 0.5,
                            background: editStatus === s ? `${STATUS_COLORS[s]}22` : "transparent",
                            border: `1px solid ${editStatus === s ? STATUS_COLORS[s] + "66" : BORDER}`,
                            color: editStatus === s ? STATUS_COLORS[s] : MUTED }}>
                          {s.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ ...card, padding: "16px 20px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Max Aircraft</div>
                    <input type="number" value={editMaxAircraft} onChange={e => setEditMaxAircraft(parseInt(e.target.value) || 0)}
                      style={{ width: "100%", padding: "10px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontSize: 16, fontWeight: 700, boxSizing: "border-box" }} />
                    <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>Starter: 5 · Professional: 15 · Enterprise: Unlimited</div>
                  </div>
                </div>

                {/* Feature flags */}
                <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Feature Flags</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { const all = {}; Object.keys(FEATURE_LABELS).forEach(k => all[k] = true); setEditFlags(all); }}
                        style={{ padding: "4px 10px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", background: "transparent", border: `1px solid ${BORDER}`, color: GREEN }}>
                        Enable All
                      </button>
                      <button onClick={() => applyTierDefaults(editTier)}
                        style={{ padding: "4px 10px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", background: "transparent", border: `1px solid ${BORDER}`, color: MUTED }}>
                        Reset to Tier
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                      const enabled = editFlags?.[key] ?? false;
                      return (
                        <div key={key} onClick={() => setEditFlags(prev => ({ ...prev, [key]: !prev[key] }))}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6,
                            cursor: "pointer",
                            background: enabled ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${enabled ? "rgba(74,222,128,0.2)" : BORDER}` }}>
                          <div style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                            border: `2px solid ${enabled ? GREEN : SUBTLE}`,
                            background: enabled ? GREEN : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {enabled && <span style={{ color: BLACK, fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 11, color: enabled ? OFF_WHITE : MUTED }}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stripe IDs (info only for now) */}
                <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Billing Info</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Stripe Customer ID</div>
                      <div style={{ fontSize: 11, color: selectedOrg.stripe_customer_id ? WHITE : SUBTLE, fontFamily: "monospace" }}>
                        {selectedOrg.stripe_customer_id || "Not connected"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Stripe Subscription ID</div>
                      <div style={{ fontSize: 11, color: selectedOrg.stripe_subscription_id ? WHITE : SUBTLE, fontFamily: "monospace" }}>
                        {selectedOrg.stripe_subscription_id || "Not connected"}
                      </div>
                    </div>
                  </div>
                  {selectedOrg.trial_ends_at && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Trial Ends</div>
                      <div style={{ fontSize: 11, color: new Date(selectedOrg.trial_ends_at) < new Date() ? RED : YELLOW }}>
                        {new Date(selectedOrg.trial_ends_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        {new Date(selectedOrg.trial_ends_at) < new Date() && " (expired)"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Save button at bottom too */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveChanges} disabled={saving}
                    style={{ padding: "10px 32px", background: GREEN, color: BLACK, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", bottom: 24, right: 24, padding: "10px 20px", background: `${GREEN}22`, border: `1px solid ${GREEN}44`, borderRadius: 8, color: GREEN, fontSize: 12, fontWeight: 600 }}>
            {toast}
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input:focus { outline: none; border-color: ${WHITE} !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${DARK}; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 3px; }
      `}</style>
    </>
  );
}
