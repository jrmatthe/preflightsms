// /api/check-overdue — v3
// Called by cron every 5 minutes. Finds overdue flights, sends email (and SMS if configured).
// Required env vars: SUPABASE_SERVICE_KEY, RESEND_API_KEY, CRON_SECRET
// Optional: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (for SMS)

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const cronSecret = req.headers["x-cron-secret"] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const hasTwilio = !!(twilioSid && twilioAuth && twilioPhone);

  if (!resendKey && !hasTwilio) {
    return res.status(500).json({ error: "No notification provider configured. Set RESEND_API_KEY or Twilio env vars." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();

    if (req.query.reset === "true") {
      await supabase.from("flights").update({ overdue_notified_at: null }).eq("status", "ACTIVE");
    }

    const { data: overdueFlights, error: flightErr } = await supabase
      .from("flights")
      .select("*, organizations(name, slug)")
      .eq("status", "ACTIVE")
      .not("eta", "is", null)
      .lt("eta", now)
      .is("overdue_notified_at", null);

    if (flightErr) {
      return res.status(500).json({ error: flightErr.message });
    }

    if (!overdueFlights || overdueFlights.length === 0) {
      return res.status(200).json({ message: "No overdue flights", checked: now });
    }

    let totalEmails = 0;
    let totalSMS = 0;
    const results = [];

    for (const flight of overdueFlights) {
      const { data: contacts } = await supabase
        .from("notification_contacts")
        .select("*")
        .eq("org_id", flight.org_id)
        .eq("notify_overdue", true)
        .eq("active", true);

      // Also get users with flight_follower permission
      const { data: followers } = await supabase
        .from("profiles")
        .select("id, full_name, email, permissions")
        .eq("org_id", flight.org_id)
        .not("email", "is", null);

      // Merge: notification_contacts + flight_follower profiles (dedupe by email)
      const allContacts = [...(contacts || [])];
      const existingEmails = new Set(allContacts.map(c => c.email?.toLowerCase()).filter(Boolean));
      if (followers) {
        for (const f of followers) {
          if (f.permissions && f.permissions.includes("flight_follower") && f.email && !existingEmails.has(f.email.toLowerCase())) {
            allContacts.push({ name: f.full_name, email: f.email, phone: "", role: "Flight Follower" });
            existingEmails.add(f.email.toLowerCase());
          }
        }
      }

      if (allContacts.length === 0) {
        results.push({ flight: flight.frat_code, status: "no_contacts" });
        await supabase.from("flights").update({ overdue_notified_at: now }).eq("id", flight.id);
        continue;
      }

      const etaDate = new Date(flight.eta);
      const minsOverdue = Math.round((new Date() - etaDate) / 60000);
      const etaLocal = etaDate.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "numeric", minute: "2-digit", hour12: true,
      });
      const dateLocal = etaDate.toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "short", day: "numeric",
      });

      const orgName = flight.organizations?.name || "Your organization";
      const f = {
        code: flight.frat_code,
        aircraft: flight.tail_number || flight.aircraft,
        pilot: flight.pilot,
        dep: flight.departure,
        dest: flight.destination,
        eta: etaLocal,
        date: dateLocal,
        mins: minsOverdue,
        org: orgName,
      };

      const flightResults = { flight: flight.frat_code, emails: 0, sms: 0, errors: [] };

      for (const contact of allContacts) {
        // Send email
        if (contact.email && resendKey) {
          try {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "PreflightSMS Alerts <onboarding@resend.dev>",
                to: [contact.email],
                subject: `OVERDUE FLIGHT — ${f.code} | ${f.aircraft} | ${f.dep} to ${f.dest}`,
                html: buildEmailHtml(f),
              }),
            });
            const emailData = await emailRes.json();
            if (emailRes.ok) {
              totalEmails++;
              flightResults.emails++;
            } else {
              flightResults.errors.push({ type: "email", to: contact.email, error: emailData.message || "Unknown" });
            }
          } catch (e) {
            flightResults.errors.push({ type: "email", to: contact.email, error: e.message });
          }
        }

        // Send SMS (optional)
        if (contact.phone && hasTwilio) {
          try {
            const smsBody = `OVERDUE FLIGHT — ${f.code}\n` +
              `${f.aircraft} | ${f.pilot}\n` +
              `${f.dep} > ${f.dest}\n` +
              `ETA was ${f.eta} (${f.mins} min ago)\n` +
              `No arrival reported\n— ${f.org} via PreflightSMS`;

            const twilioRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64"),
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ To: contact.phone, From: twilioPhone, Body: smsBody }).toString(),
              }
            );
            const twilioData = await twilioRes.json();
            if (twilioRes.ok) {
              totalSMS++;
              flightResults.sms++;
            } else {
              flightResults.errors.push({ type: "sms", to: contact.phone, error: twilioData.message || "Unknown" });
            }
          } catch (e) {
            flightResults.errors.push({ type: "sms", to: contact.phone, error: e.message });
          }
        }
      }

      await supabase.from("flights").update({ overdue_notified_at: now }).eq("id", flight.id);
      results.push(flightResults);
    }

    return res.status(200).json({
      message: `Checked ${overdueFlights.length} overdue flights — ${totalEmails} emails, ${totalSMS} SMS sent`,
      results,
      checked: now,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function buildEmailHtml(f) {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#111;color:#e5e5e5;border-radius:12px;overflow:hidden;border:1px solid #333">
  <div style="background:#7f1d1d;padding:16px 24px;border-bottom:1px solid #991b1b">
    <div style="font-size:12px;font-weight:700;color:#fca5a5;letter-spacing:1.5px;text-transform:uppercase">⚠️ Overdue Flight Alert</div>
  </div>
  <div style="padding:24px">
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">${f.code}</div>
    <div style="font-size:13px;color:#888;margin-bottom:20px">${f.date}</div>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:8px 0;color:#888;font-size:12px;width:120px">Aircraft</td>
        <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600">${f.aircraft}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#888;font-size:12px">Pilot</td>
        <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600">${f.pilot}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#888;font-size:12px">Route</td>
        <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600">${f.dep} → ${f.dest}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#888;font-size:12px">ETA</td>
        <td style="padding:8px 0;color:#ef4444;font-size:14px;font-weight:700">${f.eta} (${f.mins} min ago)</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#888;font-size:12px">Status</td>
        <td style="padding:8px 0;color:#ef4444;font-size:14px;font-weight:700">No arrival reported</td>
      </tr>
    </table>
    <div style="margin-top:20px;padding:12px 16px;background:#1c1917;border:1px solid #44403c;border-radius:8px;font-size:12px;color:#a8a29e">
      Please attempt to contact the pilot and verify their status. This alert was triggered because the flight's estimated arrival time has passed without an arrival confirmation in PreflightSMS.
    </div>
  </div>
  <div style="padding:12px 24px;border-top:1px solid #333;font-size:10px;color:#666;text-align:center">
    ${f.org} · Sent by PreflightSMS Flight Following
  </div>
</div>`;
}
