// /api/check-training — Training expiry notification cron
// Called daily. Finds training records expiring within 30 days or already expired,
// sends email notifications, and marks them as notified.
// Required env vars: SUPABASE_SERVICE_KEY, RESEND_API_KEY, CRON_SECRET

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const authHeader = req.headers["authorization"];
  const cronSecret = req.headers["x-cron-secret"] || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: "RESEND_API_KEY not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();

    if (req.query.reset === "true") {
      return res.status(403).json({ error: "reset=true is disabled — use the platform admin panel to reset notification flags" });
    }

    // Find records expiring within 30 days or already expired, not yet notified
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + 30);

    // Get cancelled orgs to skip (dormant org filtering)
    const { data: cancelledOrgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("subscription_status", "cancelled");
    const cancelledOrgIds = new Set((cancelledOrgs || []).map(o => o.id));

    const { data: expiringRecords, error: recErr } = await supabase
      .from("training_records")
      .select("*, user:profiles!training_records_user_id_fkey(id, full_name, email, org_id, notification_preferences)")
      .not("expiry_date", "is", null)
      .lte("expiry_date", thresholdDate.toISOString().slice(0, 10))
      .is("expiry_notified_at", null);

    if (recErr) {
      return res.status(500).json({ error: recErr.message });
    }

    if (!expiringRecords || expiringRecords.length === 0) {
      return res.status(200).json({ message: "No expiring training records", checked: now.toISOString() });
    }

    let totalEmails = 0;
    const results = [];

    // Group by org for summary emails
    const byOrg = {};

    // Collect record IDs to batch-update expiry_notified_at at the end
    const idsToMarkNotified = [];

    // Collect email payloads first, then send
    const emailPayloads = [];

    for (const record of expiringRecords) {
      const user = record.user;
      // Skip cancelled/dormant orgs
      if (user?.org_id && cancelledOrgIds.has(user.org_id)) {
        results.push({ record: record.id, status: "org_cancelled" });
        continue;
      }
      if (!user?.email) {
        results.push({ record: record.id, status: "no_email" });
        idsToMarkNotified.push(record.id);
        continue;
      }

      // Skip email if user has disabled training notifications
      if (user.notification_preferences?.training === false) {
        results.push({ record: record.id, status: "training_disabled" });
        idsToMarkNotified.push(record.id);
        continue;
      }

      const expiryDate = new Date(record.expiry_date);
      const isExpired = expiryDate < now;
      const daysUntil = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      const r = {
        title: record.title,
        userName: user.full_name || "Team Member",
        userEmail: user.email,
        expiryDate: expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        isExpired,
        daysUntil,
        status: isExpired ? "EXPIRED" : `Expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
      };

      // Collect email payload for sending
      emailPayloads.push({
        recordId: record.id,
        to: user.email,
        subject: isExpired
          ? `EXPIRED — ${record.title} training has expired`
          : `Training Expiring — ${record.title} expires ${r.expiryDate}`,
        html: buildUserEmailHtml(r),
        title: record.title,
      });

      // Track for org summary
      const orgId = user.org_id || record.org_id;
      if (orgId) {
        if (!byOrg[orgId]) byOrg[orgId] = [];
        byOrg[orgId].push(r);
      }

      // Collect for batch update
      idsToMarkNotified.push(record.id);
    }

    // Send all collected emails (Resend requires per-recipient calls)
    for (const payload of emailPayloads) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.FROM_EMAIL || "PreflightSMS Alerts <noreply@preflightsms.com>",
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
          }),
        });
        if (emailRes.ok) {
          totalEmails++;
          results.push({ record: payload.recordId, title: payload.title, to: payload.to, status: "sent" });
        } else {
          const errData = await emailRes.json();
          results.push({ record: payload.recordId, to: payload.to, status: "error", error: errData.message || "Unknown" });
        }
      } catch (e) {
        results.push({ record: payload.recordId, to: payload.to, status: "error", error: e.message });
      }
    }

    // Batch update all expiry_notified_at in one query
    if (idsToMarkNotified.length > 0) {
      await supabase.from("training_records").update({ expiry_notified_at: now.toISOString() }).in("id", idsToMarkNotified);
    }

    // Send org summary emails to admins and safety managers
    for (const [orgId, orgRecords] of Object.entries(byOrg)) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, notification_preferences")
        .eq("org_id", orgId)
        .in("role", ["admin", "safety_manager"])
        .not("email", "is", null);

      if (!adminProfiles?.length) continue;

      // Filter out admins who disabled training notifications
      const filteredAdmins = adminProfiles.filter(p => p.notification_preferences?.training !== false);

      const { data: orgData } = await supabase.from("organizations").select("name").eq("id", orgId).single();
      const orgName = orgData?.name || "Your organization";

      const expiredCount = orgRecords.filter(r => r.isExpired).length;
      const expiringCount = orgRecords.length - expiredCount;

      for (const contact of filteredAdmins) {
        if (!contact.email) continue;
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: process.env.FROM_EMAIL || "PreflightSMS Alerts <noreply@preflightsms.com>",
              to: [contact.email],
              subject: `Training Compliance Summary — ${expiredCount} expired, ${expiringCount} expiring`,
              html: buildSummaryEmailHtml(orgName, orgRecords, expiredCount, expiringCount),
            }),
          });
          if (emailRes.ok) totalEmails++;
        } catch (_) { /* best-effort summary */ }
      }
    }

    return res.status(200).json({
      message: `Processed ${expiringRecords.length} expiring records — ${totalEmails} emails sent`,
      results,
      checked: now.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function buildUserEmailHtml(r) {
  const statusColor = r.isExpired ? "#ef4444" : "#facc15";
  const statusBg = r.isExpired ? "#7f1d1d" : "#713f12";
  const statusBorder = r.isExpired ? "#991b1b" : "#a16207";
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#111;color:#e5e5e5;border-radius:12px;overflow:hidden;border:1px solid #333">
  <div style="background:${statusBg};padding:16px 24px;border-bottom:1px solid ${statusBorder}">
    <div style="font-size:12px;font-weight:700;color:${statusColor};letter-spacing:1.5px;text-transform:uppercase">${r.isExpired ? "⚠️ Training Expired" : "⏰ Training Expiring Soon"}</div>
  </div>
  <div style="padding:24px">
    <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">${r.title}</div>
    <div style="font-size:13px;color:#888;margin-bottom:20px">Hi ${r.userName},</div>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:8px 0;color:#888;font-size:12px;width:120px">Status</td>
        <td style="padding:8px 0;color:${statusColor};font-size:14px;font-weight:700">${r.status}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#888;font-size:12px">Expiry Date</td>
        <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600">${r.expiryDate}</td>
      </tr>
    </table>
    <div style="margin-top:20px;padding:12px 16px;background:#1c1917;border:1px solid #44403c;border-radius:8px;font-size:12px;color:#a8a29e">
      ${r.isExpired
        ? "This training requirement has expired. Please complete the required training as soon as possible to remain compliant."
        : "This training is expiring soon. Please complete the renewal before the expiry date to maintain compliance."
      }
    </div>
  </div>
  <div style="padding:12px 24px;border-top:1px solid #333;font-size:10px;color:#666;text-align:center">
    Sent by PreflightSMS Training Compliance
  </div>
</div>`;
}

function buildSummaryEmailHtml(orgName, records, expiredCount, expiringCount) {
  const rows = records.map(r => `
    <tr>
      <td style="padding:6px 10px;color:#fff;font-size:12px;border-bottom:1px solid #232323">${r.userName}</td>
      <td style="padding:6px 10px;color:#fff;font-size:12px;border-bottom:1px solid #232323">${r.title}</td>
      <td style="padding:6px 10px;color:${r.isExpired ? "#ef4444" : "#facc15"};font-size:12px;font-weight:600;border-bottom:1px solid #232323">${r.status}</td>
      <td style="padding:6px 10px;color:#888;font-size:12px;border-bottom:1px solid #232323">${r.expiryDate}</td>
    </tr>`).join("");

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#e5e5e5;border-radius:12px;overflow:hidden;border:1px solid #333">
  <div style="background:#1e1b4b;padding:16px 24px;border-bottom:1px solid #312e81">
    <div style="font-size:12px;font-weight:700;color:#818cf8;letter-spacing:1.5px;text-transform:uppercase">📋 Training Compliance Summary</div>
  </div>
  <div style="padding:24px">
    <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:4px">${orgName}</div>
    <div style="font-size:13px;color:#888;margin-bottom:20px">
      ${expiredCount > 0 ? `<span style="color:#ef4444;font-weight:600">${expiredCount} expired</span>` : ""}
      ${expiredCount > 0 && expiringCount > 0 ? " · " : ""}
      ${expiringCount > 0 ? `<span style="color:#facc15;font-weight:600">${expiringCount} expiring soon</span>` : ""}
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 10px;color:#888;font-size:10px;font-weight:600;border-bottom:1px solid #333;text-transform:uppercase">User</th>
          <th style="text-align:left;padding:8px 10px;color:#888;font-size:10px;font-weight:600;border-bottom:1px solid #333;text-transform:uppercase">Training</th>
          <th style="text-align:left;padding:8px 10px;color:#888;font-size:10px;font-weight:600;border-bottom:1px solid #333;text-transform:uppercase">Status</th>
          <th style="text-align:left;padding:8px 10px;color:#888;font-size:10px;font-weight:600;border-bottom:1px solid #333;text-transform:uppercase">Expiry</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="padding:12px 24px;border-top:1px solid #333;font-size:10px;color:#666;text-align:center">
    ${orgName} · Sent by PreflightSMS Training Compliance
  </div>
</div>`;
}
