-- Fix RLS: Allow matched pilots to update their own dispatch flights
-- Previously only admin/safety_manager could UPDATE, which meant pilots
-- couldn't link FRATs to their ForeFlight/SchedAero flights.

-- ── foreflight_flights ──────────────────────────────────────
DROP POLICY IF EXISTS "foreflight_flights_update" ON foreflight_flights;
CREATE POLICY "foreflight_flights_update" ON foreflight_flights
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
    OR matched_pilot_id = auth.uid()
  );

-- ── schedaero_trips ─────────────────────────────────────────
DROP POLICY IF EXISTS "schedaero_trips_update" ON schedaero_trips;
CREATE POLICY "schedaero_trips_update" ON schedaero_trips
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'safety_manager')
    )
    OR matched_pilot_id = auth.uid()
  );
