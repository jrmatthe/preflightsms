// POST /api/test-webhook — Send a test ping to a webhook endpoint
// Requires Supabase auth (internal use from admin panel)

import { verifyAuth } from "../../lib/apiAuth";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const { webhookId } = req.body;
  if (!webhookId) return res.status(400).json({ error: "Missing webhookId" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: "Server not configured" });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify caller belongs to the same org as the webhook
  const { data: callerProfile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
  if (!callerProfile) return res.status(403).json({ error: "Profile not found" });

  const { data: webhook } = await supabase.from("webhooks").select("*").eq("id", webhookId).eq("org_id", callerProfile.org_id).single();
  if (!webhook) return res.status(404).json({ error: "Webhook not found" });

  const payload = JSON.stringify({
    event: "test.ping",
    timestamp: new Date().toISOString(),
    data: { message: "Test webhook from PreflightSMS" },
  });

  const signature = crypto.createHmac("sha256", webhook.secret).update(payload).digest("hex");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature-256": `sha256=${signature}`,
        "X-Webhook-Event": "test.ping",
        "User-Agent": "PreflightSMS-Webhook/1.0",
      },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return res.status(200).json({ success: response.ok, statusCode: response.status });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.name === "AbortError" ? "Timeout (10s)" : err.message });
  }
}
