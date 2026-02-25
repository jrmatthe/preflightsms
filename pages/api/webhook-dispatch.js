// /api/webhook-dispatch
// Called internally when events occur that should trigger webhooks
// Requires valid Supabase auth token

import { verifyAuth } from "../../lib/apiAuth";
import { dispatchWebhooks } from "../../lib/webhookDispatch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const { orgId, event, data } = req.body;
  if (!orgId || !event) return res.status(400).json({ error: "Missing orgId or event" });

  try {
    await dispatchWebhooks(orgId, event, data);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook dispatch error:", err);
    return res.status(500).json({ error: err.message });
  }
}
