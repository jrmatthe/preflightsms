// Webhook dispatch helper
// Sends webhook events to registered URLs with HMAC-SHA256 signatures

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchWebhooks(orgId, eventType, eventData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find active webhooks matching this event for this org
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .contains("events", [eventType]);

  if (!webhooks || webhooks.length === 0) return;

  const payload = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: eventData,
  });

  for (const webhook of webhooks) {
    try {
      const signature = signPayload(payload, webhook.secret);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature-256": `sha256=${signature}`,
          "X-Webhook-Event": eventType,
          "User-Agent": "PreflightSMS-Webhook/1.0",
        },
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const statusCode = response.status;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      if (isSuccess) {
        // Success — reset failure count
        await supabase.from("webhooks").update({
          last_triggered_at: new Date().toISOString(),
          last_status_code: statusCode,
          failure_count: 0,
        }).eq("id", webhook.id);
      } else {
        // Failure — increment failure count
        const newFailureCount = (webhook.failure_count || 0) + 1;
        const updates = {
          last_triggered_at: new Date().toISOString(),
          last_status_code: statusCode,
          failure_count: newFailureCount,
        };

        // After 10 consecutive failures, deactivate
        if (newFailureCount >= 10) {
          updates.is_active = false;
          // Notify admin via in-app notification
          await supabase.from("notifications").insert({
            org_id: orgId,
            type: "webhook_disabled",
            title: "Webhook Disabled",
            body: `Webhook to ${webhook.url} was disabled after 10 consecutive failures.`,
            link_tab: "admin",
            target_roles: ["admin", "safety_manager"],
          });
        }

        await supabase.from("webhooks").update(updates).eq("id", webhook.id);
      }
    } catch (err) {
      // Network error / timeout
      const newFailureCount = (webhook.failure_count || 0) + 1;
      const updates = {
        last_triggered_at: new Date().toISOString(),
        last_status_code: 0,
        failure_count: newFailureCount,
      };
      if (newFailureCount >= 10) {
        updates.is_active = false;
        await supabase.from("notifications").insert({
          org_id: orgId,
          type: "webhook_disabled",
          title: "Webhook Disabled",
          body: `Webhook to ${webhook.url} was disabled after 10 consecutive failures.`,
          link_tab: "admin",
          target_roles: ["admin", "safety_manager"],
        });
      }
      await supabase.from("webhooks").update(updates).eq("id", webhook.id);
    }
  }
}
