// supabase/functions/check-overdue-flights/index.ts
// 
// Supabase Edge Function — runs on a cron schedule (every 5 minutes)
// Checks for active flights past their ETA + grace period
// Sends SMS via Twilio to configured notification contacts
//
// SETUP:
// 1. Deploy: supabase functions deploy check-overdue-flights
// 2. Set secrets:
//    supabase secrets set TWILIO_ACCOUNT_SID=your_sid
//    supabase secrets set TWILIO_AUTH_TOKEN=your_token
//    supabase secrets set TWILIO_FROM_NUMBER=+15551234567
// 3. Set up cron in Supabase Dashboard → Database → Extensions → pg_cron:
//    select cron.schedule(
//      'check-overdue-flights',
//      '*/5 * * * *',
//      $$select net.http_post(
//        url := 'https://YOUR_PROJECT.supabase.co/functions/v1/check-overdue-flights',
//        headers := jsonb_build_object(
//          'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
//          'Content-Type', 'application/json'
//        ),
//        body := '{}'::jsonb
//      );$$
//    );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!twilioSid || !twilioToken || !twilioFrom) {
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    // Get all orgs with notification settings
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, notification_settings");

    if (!orgs || orgs.length === 0) {
      return new Response(JSON.stringify({ message: "No orgs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalNotifications = 0;

    for (const org of orgs) {
      const settings = org.notification_settings || { grace_minutes: 15, enabled: true };
      if (!settings.enabled) continue;

      const graceMins = settings.grace_minutes || 15;

      // Find active flights that are overdue and haven't been notified yet
      const { data: overdueFlights } = await supabase
        .from("flights")
        .select("*")
        .eq("org_id", org.id)
        .eq("status", "ACTIVE")
        .eq("overdue_notified", false)
        .not("eta", "is", null);

      if (!overdueFlights || overdueFlights.length === 0) continue;

      // Filter to flights actually past grace period
      const actuallyOverdue = overdueFlights.filter((f) => {
        const eta = new Date(f.eta);
        const threshold = new Date(eta.getTime() + graceMins * 60000);
        return now > threshold;
      });

      if (actuallyOverdue.length === 0) continue;

      // Get notification contacts for this org
      const { data: contacts } = await supabase
        .from("notification_contacts")
        .select("*")
        .eq("org_id", org.id)
        .eq("notify_overdue", true)
        .eq("active", true);

      if (!contacts || contacts.length === 0) {
        // No contacts configured, still mark as notified so we don't keep checking
        for (const flight of actuallyOverdue) {
          await supabase
            .from("flights")
            .update({ overdue_notified: true })
            .eq("id", flight.id);
        }
        continue;
      }

      // Send notifications
      for (const flight of actuallyOverdue) {
        const etaLocal = new Date(flight.eta).toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const minutesOverdue = Math.round(
          (now.getTime() - new Date(flight.eta).getTime()) / 60000
        );

        const message =
          `⚠️ OVERDUE FLIGHT — ${org.name}\n` +
          `${flight.tail_number || flight.aircraft} | ${flight.departure} → ${flight.destination}\n` +
          `PIC: ${flight.pilot}\n` +
          `ETA was ${etaLocal} (${minutesOverdue} min ago)\n` +
          `FRAT: ${flight.frat_code} | Score: ${flight.score || "N/A"}`;

        for (const contact of contacts) {
          try {
            // Send SMS via Twilio
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const body = new URLSearchParams({
              To: contact.phone,
              From: twilioFrom,
              Body: message,
            });

            const twilioRes = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: body.toString(),
            });

            const twilioData = await twilioRes.json();

            // Log the notification
            await supabase.from("overdue_notifications").insert({
              org_id: org.id,
              flight_id: flight.id,
              contact_id: contact.id,
              phone: contact.phone,
              message: message,
              status: twilioRes.ok ? "sent" : "failed",
              twilio_sid: twilioData.sid || "",
            });

            if (twilioRes.ok) {
              totalNotifications++;
              console.log(
                `SMS sent to ${contact.name} (${contact.phone}) for flight ${flight.frat_code}`
              );
            } else {
              console.error(
                `Twilio error for ${contact.phone}:`,
                twilioData.message
              );
            }
          } catch (e) {
            console.error(`Failed to notify ${contact.phone}:`, e.message);
          }
        }

        // Mark flight as notified
        await supabase
          .from("flights")
          .update({ overdue_notified: true })
          .eq("id", flight.id);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked all orgs. Sent ${totalNotifications} notifications.`,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
