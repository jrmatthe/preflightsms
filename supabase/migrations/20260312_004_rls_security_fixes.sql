-- Security fixes: close overly permissive RLS policies
-- Service role bypasses RLS entirely, so WITH CHECK (true) INSERT policies
-- only benefit attackers — replace with WITH CHECK (false) to block anon/authenticated users.

-- ── Fix 1: trend_alerts — close open INSERT ────────────────
DROP POLICY IF EXISTS "trend_alerts_service_insert" ON trend_alerts;
CREATE POLICY "trend_alerts_service_insert" ON trend_alerts
  FOR INSERT WITH CHECK (false);

-- ── Fix 2: ai_usage_log — close open INSERT ────────────────
DROP POLICY IF EXISTS "ai_usage_log_service_insert" ON ai_usage_log;
CREATE POLICY "ai_usage_log_service_insert" ON ai_usage_log
  FOR INSERT WITH CHECK (false);

-- ── Fix 3: safety_digests — close open INSERT ──────────────
DROP POLICY IF EXISTS "safety_digests_service_insert" ON safety_digests;
CREATE POLICY "safety_digests_service_insert" ON safety_digests
  FOR INSERT WITH CHECK (false);

-- ── Fix 4: flight_positions — remove unrestricted ALL policy ──
-- The org-scoped SELECT policy remains. Service role (used by the
-- /api/flight-positions endpoint) bypasses RLS and can still write.
DROP POLICY IF EXISTS "Service role can manage flight positions" ON flight_positions;

-- ── Fix 5: foreflight_flights — add WITH CHECK to pilot update ──
-- Prevents a matched pilot from changing org_id or matched_pilot_id
-- via a crafted direct Supabase API call.
DROP POLICY IF EXISTS "foreflight_flights_update" ON foreflight_flights;
CREATE POLICY "foreflight_flights_update" ON foreflight_flights
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
    OR matched_pilot_id = auth.uid()
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );
