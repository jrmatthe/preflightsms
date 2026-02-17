import { useState, useEffect } from "react";

const CARD = "#161616", NEAR_BLACK = "#111111";
const WHITE = "#FFFFFF", OFF_WHITE = "#E5E5E5", MUTED = "#888888", BLACK = "#000000";
const BORDER = "#232323";
const GREEN = "#4ADE80", RED = "#EF4444", CYAN = "#22D3EE";

const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 };

const ROLES = [
  { id: "pilot", label: "Pilot", desc: "Submit FRATs, reports, view flights" },
  { id: "safety_manager", label: "Safety Manager", desc: "Full SMS access, investigate reports, manage hazards" },
  { id: "chief_pilot", label: "Chief Pilot", desc: "View all data, assign actions" },
  { id: "accountable_exec", label: "Accountable Executive", desc: "Dashboard summaries, approve closures" },
  { id: "admin", label: "Admin", desc: "Full access including user management" },
];

export default function AdminPanel({ profile, orgProfiles, onUpdateRole, orgName, orgSlug, orgLogo, onUploadLogo }) {
  const myRole = profile?.role;
  const canManage = ["admin", "safety_manager", "accountable_exec"].includes(myRole);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

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
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Admin</div>
        <div style={{ fontSize: 11, color: MUTED }}>Organization settings and user management</div>
      </div>

      {/* Org Info */}
      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 8 }}>Organization</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

      {/* Users */}
      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE }}>Team Members ({orgProfiles.length})</div>
        </div>

        {orgProfiles.map(user => {
          const role = ROLES.find(r => r.id === user.role) || ROLES[0];
          const isMe = user.id === profile?.id;
          return (
            <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: NEAR_BLACK, border: `1px solid ${BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: MUTED }}>{(user.full_name || "?")[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: WHITE }}>{user.full_name}</span>
                  {isMe && <span style={{ fontSize: 9, color: CYAN, background: `${CYAN}22`, padding: "1px 6px", borderRadius: 8 }}>You</span>}
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>{user.email || "No email"} · Joined {new Date(user.created_at).toLocaleDateString()}</div>
              </div>
              {canManage && !isMe ? (
                <select value={user.role} onChange={e => onUpdateRole(user.id, e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 4, fontSize: 11, background: NEAR_BLACK, color: OFF_WHITE,
                    border: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: 11, color: role.id === "admin" ? CYAN : role.id === "safety_manager" ? GREEN : MUTED, fontWeight: 600 }}>
                  {role.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Role descriptions */}
      <div style={{ ...card, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: OFF_WHITE, marginBottom: 10 }}>Role Permissions</div>
        {ROLES.map(r => (
          <div key={r.id} style={{ display: "flex", gap: 12, padding: "6px 0" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: OFF_WHITE, width: 140, flexShrink: 0 }}>{r.label}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{r.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
