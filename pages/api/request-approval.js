// /api/request-approval
// Called when a FRAT score exceeds the approval threshold
// Sends email to users with 'approver' permission

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });
  if (!resendKey) return res.status(500).json({ error: "Resend not configured" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { orgId, fratCode, pilot, aircraft, tailNumber, departure, destination, score, riskLevel, orgName } = req.body;

    // Get approvers: users with 'approver' permission OR admin/safety_manager/chief_pilot roles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, permissions")
      .eq("org_id", orgId)
      .not("email", "is", null);

    const approvers = (profiles || []).filter(p => {
      if (["admin", "safety_manager", "chief_pilot"].includes(p.role)) return true;
      if (p.permissions && p.permissions.includes("approver")) return true;
      return false;
    });

    if (approvers.length === 0) {
      return res.status(200).json({ message: "No approvers found", sent: 0 });
    }

    let sent = 0;
    const riskColor = riskLevel.includes("CRITICAL") ? "#ef4444" : "#f59e0b";
    const riskBg = riskLevel.includes("CRITICAL") ? "#7f1d1d" : "#78350f";

    for (const approver of approvers) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "PreflightSMS Alerts <onboarding@resend.dev>",
            to: [approver.email],
            subject: `🔒 APPROVAL REQUIRED — ${fratCode} | ${riskLevel} (Score: ${score})`,
            html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#111;color:#e5e5e5;border-radius:12px;overflow:hidden;border:1px solid #333">
  <div style="background:${riskBg};padding:16px 24px;border-bottom:1px solid ${riskColor}44">
    <div style="font-size:12px;font-weight:700;color:${riskColor};letter-spacing:1.5px;text-transform:uppercase">🔒 Approval Required</div>
  </div>
  <div style="padding:24px">
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">${fratCode}</div>
    <div style="display:inline-block;padding:4px 12px;border-radius:16px;background:${riskColor}22;border:1px solid ${riskColor}44;font-size:12px;font-weight:700;color:${riskColor};margin-bottom:20px">${riskLevel} — Score: ${score}</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#888;font-size:12px;width:120px">Pilot</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600">${pilot}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:12px">Aircraft</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600">${tailNumber || aircraft}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:12px">Route</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600">${departure} → ${destination}</td></tr>
    </table>
    <div style="margin-top:20px;padding:12px 16px;background:#1c1917;border:1px solid #44403c;border-radius:8px;font-size:12px;color:#a8a29e">
      This flight scored ${score} (${riskLevel}) which exceeds your organization's approval threshold. Please log in to PreflightSMS to review the risk factors and approve or reject this flight.
    </div>
  </div>
  <div style="padding:12px 24px;border-top:1px solid #333;font-size:10px;color:#666;text-align:center">
    ${orgName || "Your organization"} · Sent by PreflightSMS
  </div>
</div>`,
          }),
        });
        if (emailRes.ok) sent++;
      } catch (e) {}
    }

    return res.status(200).json({ message: `Notified ${sent} approvers`, sent, approvers: approvers.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
