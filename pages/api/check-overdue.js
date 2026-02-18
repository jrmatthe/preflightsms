// /api/check-overdue — v2
// Called by cron every 5 minutes. Finds overdue flights, sends SMS to org contacts.
// Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, SUPABASE_URL, SUPABASE_SERVICE_KEY

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = req.headers["x-cron-secret"] || req.query.secret;
  if (cronSecret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service role key, not anon
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  if (!twilioSid || !twilioAuth || !twilioPhone) {
    return res.status(500).json({ error: "Twilio not configured" });
  }

  // Use service role to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();

    // Reset notified flights for testing (pass ?reset=true)
    if (req.query.reset === "true") {
      await supabase.from("flights").update({ overdue_notified_at: null }).eq("status", "ACTIVE");
    }

    // Find active flights that are past ETA and haven't been notified yet
    const { data: overdueFlights, error: flightErr } = await supabase
      .from("flights")
      .select("*, organizations(name, slug)")
      .eq("status", "ACTIVE")
      .not("eta", "is", null)
      .lt("eta", now)
      .is("overdue_notified_at", null);

    if (flightErr) {
      console.error("Error fetching overdue flights:", flightErr);
      return res.status(500).json({ error: flightErr.message });
    }

    if (!overdueFlights || overdueFlights.length === 0) {
      return res.status(200).json({ message: "No overdue flights", checked: now });
    }

    let totalSent = 0;
    const results = [];

    for (const flight of overdueFlights) {
      // Get notification contacts for this org
      const { data: contacts } = await supabase
        .from("notification_contacts")
        .select("*")
        .eq("org_id", flight.org_id)
        .eq("notify_overdue", true)
        .eq("active", true);

      if (!contacts || contacts.length === 0) {
        results.push({ flight: flight.frat_code, status: "no_contacts" });
        // Still mark as notified so we don't keep checking
        await supabase.from("flights").update({ overdue_notified_at: now }).eq("id", flight.id);
        continue;
      }

      // Calculate how overdue
      const etaDate = new Date(flight.eta);
      const nowDate = new Date();
      const minsOverdue = Math.round((nowDate - etaDate) / 60000);

      // Format the ETA in Pacific time
      const etaLocal = etaDate.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const orgName = flight.organizations?.name || "Your organization";
      const message = `⚠️ OVERDUE FLIGHT — ${flight.frat_code}\n` +
        `${flight.tail_number || flight.aircraft} | ${flight.pilot}\n` +
        `${flight.departure} → ${flight.destination}\n` +
        `ETA was ${etaLocal} (${minsOverdue} min ago)\n` +
        `Status: No arrival reported\n` +
        `— ${orgName} via PreflightSMS`;

      // Send to each contact
      for (const contact of contacts) {
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const body = new URLSearchParams({
            To: contact.phone,
            From: twilioPhone,
            Body: message,
          });

          const twilioRes = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64"),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          });

          const twilioData = await twilioRes.json();
          if (twilioRes.ok) {
            totalSent++;
          } else {
            results.push({ flight: flight.frat_code, sms_error: twilioData.message || twilioData.code || "Unknown Twilio error", to: contact.phone });
          }
        } catch (smsErr) {
          results.push({ flight: flight.frat_code, sms_error: smsErr.message, to: contact.phone });
        }
      }

      // Mark flight as notified
      await supabase.from("flights").update({ overdue_notified_at: now }).eq("id", flight.id);
      results.push({ flight: flight.frat_code, contacts: contacts.length, sent: true });
    }

    return res.status(200).json({
      message: `Checked ${overdueFlights.length} overdue flights, sent ${totalSent} SMS`,
      results,
      checked: now,
    });
  } catch (err) {
    console.error("check-overdue error:", err);
    return res.status(500).json({ error: err.message });
  }
}
