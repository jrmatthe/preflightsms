// supabase/functions/check-notifications/index.ts
//
// Supabase Edge Function — runs on a cron schedule (every 10 minutes)
// Processes queued notifications and dispatches email via Resend
// for unread notifications older than configured threshold.
//
// SETUP:
// 1. Deploy: supabase functions deploy check-notifications
// 2. Set secrets: supabase secrets set RESEND_API_KEY=your_key
// 3. Schedule via pg_cron (see check-overdue-flights for pattern)

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const thresholdMs = 15 * 60 * 1000; // 15 minutes
    const cutoff = new Date(now.getTime() - thresholdMs).toISOString();

    // Find unread notifications older than threshold that haven't been emailed
    const { data: notifications } = await supabase
      .from("notifications")
      .select("*, organizations(name)")
      .is("emailed_at", null)
      .lt("created_at", cutoff)
      .limit(100);

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ message: "No notifications to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailsSent = 0;

    for (const notif of notifications) {
      const orgId = notif.org_id;

      // Get notification contacts for this org
      const { data: contacts } = await supabase
        .from("notification_contacts")
        .select("email, name, notify_types")
        .eq("org_id", orgId)
        .eq("is_active", true);

      if (!contacts || contacts.length === 0) continue;

      // Filter contacts who should receive this notification type
      const recipients = contacts.filter(c => {
        if (!c.notify_types || c.notify_types.length === 0) return true; // all types
        return c.notify_types.includes(notif.type);
      });

      if (recipients.length === 0) continue;

      // Send email via Resend (if configured)
      if (resendApiKey) {
        for (const contact of recipients) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "PreflightSMS <notifications@preflightsms.com>",
                to: contact.email,
                subject: `[PreflightSMS] ${notif.title}`,
                html: `<p>${notif.body || ""}</p><p style="color:#666;font-size:12px;">— PreflightSMS Notification</p>`,
              }),
            });
            emailsSent++;
          } catch {
            // Continue on individual send failure
          }
        }
      }

      // Mark notification as emailed
      await supabase
        .from("notifications")
        .update({ emailed_at: now.toISOString() })
        .eq("id", notif.id);
    }

    return new Response(
      JSON.stringify({ processed: notifications.length, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
