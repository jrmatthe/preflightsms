// /api/send-nudge-push — cron (every 5 min)
// Sends Web Push notifications for "remind_later" nudges whose remind_at has passed.
// Required env vars: SUPABASE_SERVICE_KEY, CRON_SECRET, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ error: "POST or GET only" });

  // Auth — same pattern as check-overdue.js
  const authHeader = req.headers["authorization"];
  const cronSecret = req.headers["x-cron-secret"] || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Supabase not configured" });
  if (!vapidPublic || !vapidPrivate) return res.status(500).json({ error: "VAPID keys not configured" });

  webpush.setVapidDetails("mailto:noreply@preflightsms.com", vapidPublic, vapidPrivate);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const nowISO = new Date().toISOString();

  try {
    // 1. Find due remind_later nudges that haven't had push sent
    const { data: dueNudges, error: nudgeErr } = await supabase
      .from("nudge_responses")
      .select("id, flight_id, user_id")
      .eq("response", "remind_later")
      .lte("remind_at", nowISO)
      .is("push_sent_at", null);

    if (nudgeErr) {
      console.error("[send-nudge-push] DB query failed:", nudgeErr.message);
      return res.status(500).json({ error: nudgeErr.message });
    }

    if (!dueNudges || dueNudges.length === 0) {
      return res.status(200).json({ message: "No due nudges", checked: nowISO });
    }

    let sent = 0;
    let skipped = 0;
    let staleRemoved = 0;

    for (const nudge of dueNudges) {
      // 2. Check no terminal response exists for this flight
      const { data: terminal } = await supabase
        .from("nudge_responses")
        .select("id")
        .eq("flight_id", nudge.flight_id)
        .eq("user_id", nudge.user_id)
        .in("response", ["submitted_report", "nothing_to_report", "dismissed"])
        .limit(1);

      if (terminal && terminal.length > 0) {
        // Already handled — mark push_sent_at so we don't check again
        await supabase.from("nudge_responses").update({ push_sent_at: nowISO }).eq("id", nudge.id);
        skipped++;
        continue;
      }

      // 3. Get flight details for the notification body
      const { data: flight } = await supabase
        .from("flights")
        .select("departure, destination, frat_code")
        .eq("id", nudge.flight_id)
        .single();

      const dep = flight?.departure || "???";
      const dest = flight?.destination || "???";

      // 4. Look up user's push subscriptions
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", nudge.user_id);

      if (!subs || subs.length === 0) {
        skipped++;
        continue;
      }

      const payload = JSON.stringify({
        title: "Safety Report Reminder",
        body: `Anything to report for your ${dep} to ${dest} flight?`,
        tag: `nudge-${nudge.flight_id}`,
        url: `/?nudge=${nudge.flight_id}`,
      });

      // 5. Send push to all devices
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (pushErr) {
          // 6. Clean up stale subscriptions (gone or not found)
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            staleRemoved++;
          } else {
            console.warn("[send-nudge-push] Push failed:", pushErr.statusCode, pushErr.message);
          }
        }
      }

      // Mark push as sent
      await supabase.from("nudge_responses").update({ push_sent_at: nowISO }).eq("id", nudge.id);
      sent++;
    }

    console.log(`[send-nudge-push] Done — ${sent} sent, ${skipped} skipped, ${staleRemoved} stale subs removed`);
    return res.status(200).json({ message: `${sent} push sent, ${skipped} skipped`, staleRemoved, checked: nowISO });
  } catch (err) {
    console.error("[send-nudge-push] Unhandled error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
