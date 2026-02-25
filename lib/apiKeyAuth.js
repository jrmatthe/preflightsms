// Shared auth helper for public API key validation
// Validates API keys from Authorization: Bearer pflt_xxxx header
// Returns org context + permissions for the key

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Simple in-memory rate limiter (per-process; resets on cold start)
const rateLimits = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60000;

function hashKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function checkRateLimit(keyId) {
  const now = Date.now();
  let entry = rateLimits.get(keyId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimits.set(keyId, entry);
  }
  entry.count++;
  return {
    remaining: Math.max(0, RATE_LIMIT - entry.count),
    limit: RATE_LIMIT,
    exceeded: entry.count > RATE_LIMIT,
  };
}

export async function verifyApiKey(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer pflt_")) {
    return { apiKey: null, org: null, error: "Missing or invalid API key. Use Authorization: Bearer pflt_xxxx" };
  }

  const rawKey = authHeader.replace("Bearer ", "");
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 8);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return { apiKey: null, org: null, error: "Server not configured" };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find matching key by hash
  const { data: keys, error: keyError } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .limit(1);

  if (keyError || !keys || keys.length === 0) {
    return { apiKey: null, org: null, error: "Invalid or revoked API key" };
  }

  const apiKeyRecord = keys[0];

  // Check expiration
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return { apiKey: null, org: null, error: "API key expired" };
  }

  // Rate limit check
  const rl = checkRateLimit(apiKeyRecord.id);
  if (rl.exceeded) {
    return { apiKey: null, org: null, error: "Rate limit exceeded", rateLimit: rl, status: 429 };
  }

  // Get org with tier info
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", apiKeyRecord.org_id)
    .single();

  if (!org) {
    return { apiKey: null, org: null, error: "Organization not found" };
  }

  // Check tier access
  const tier = org.tier || "starter";
  const flags = org.feature_flags || {};
  const apiAccess = flags.api_access !== undefined ? flags.api_access : (
    tier === "enterprise" ? true : tier === "professional" ? "read_only" : false
  );

  if (!apiAccess) {
    return { apiKey: null, org: null, error: "API access is not available on your plan. Upgrade to Professional or Enterprise." };
  }

  // Update last_used_at (fire-and-forget)
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyRecord.id).then(() => {});

  return {
    apiKey: apiKeyRecord,
    org,
    supabase,
    rateLimit: rl,
    apiAccess, // true (full) or "read_only"
    error: null,
  };
}

export function setRateLimitHeaders(res, rateLimit) {
  if (rateLimit) {
    res.setHeader("X-RateLimit-Limit", rateLimit.limit);
    res.setHeader("X-RateLimit-Remaining", rateLimit.remaining);
  }
}

export function logApiRequest(supabase, apiKeyId, orgId, method, path, statusCode, startTime) {
  const responseTimeMs = Date.now() - startTime;
  supabase.from("api_request_log").insert({
    api_key_id: apiKeyId,
    org_id: orgId,
    method,
    path,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
  }).then(() => {});
}

export function hasPermission(apiKey, permission) {
  return (apiKey.permissions || []).includes(permission);
}
