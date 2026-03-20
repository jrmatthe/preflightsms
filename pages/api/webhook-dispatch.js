// /api/webhook-dispatch
// Called internally when events occur that should trigger webhooks
// Requires valid Supabase auth token

import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "../../lib/apiAuth";
import { dispatchWebhooks } from "../../lib/webhookDispatch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) return res.status(401).json({ error: authError || "Unauthorized" });

  const { orgId, event, data } = req.body;
  if (!orgId || !event) return res.status(400).json({ error: "Missing orgId or event" });

  // Verify caller belongs to this org
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
    if (!callerProfile || callerProfile.org_id !== orgId) {
      return res.status(403).json({ error: "Not a member of this organization" });
    }
  }

  try {
    await dispatchWebhooks(orgId, event, data);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook dispatch error:", err);
    return res.status(500).json({ error: err.message });
  }
}
