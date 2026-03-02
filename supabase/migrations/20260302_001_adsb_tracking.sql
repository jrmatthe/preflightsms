-- ADS-B Live Flight Tracking
-- Adds ICAO24 cache to aircraft, position tracking table, and provider health monitoring

-- 1. Add ICAO24 hex column to aircraft table for caching computed values
ALTER TABLE public.aircraft ADD COLUMN IF NOT EXISTS icao24_hex TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_aircraft_icao24_hex ON public.aircraft (icao24_hex) WHERE icao24_hex != '';

-- 2. Flight positions table — stores latest ADS-B position per flight
CREATE TABLE IF NOT EXISTS public.flight_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  icao24 TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude_baro INTEGER, -- feet
  altitude_geo INTEGER, -- feet
  ground_speed DOUBLE PRECISION, -- knots
  track DOUBLE PRECISION, -- degrees
  vertical_rate DOUBLE PRECISION, -- feet per minute
  on_ground BOOLEAN DEFAULT false,
  squawk TEXT,
  source TEXT NOT NULL DEFAULT 'adsb.lol',
  raw_data JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flight_id)
);

CREATE INDEX IF NOT EXISTS idx_flight_positions_org ON public.flight_positions (org_id);
CREATE INDEX IF NOT EXISTS idx_flight_positions_fetched ON public.flight_positions (fetched_at);

-- RLS for flight_positions
ALTER TABLE public.flight_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org flight positions"
  ON public.flight_positions FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service role can manage flight positions"
  ON public.flight_positions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.flight_positions;

-- 3. Provider health monitoring table
CREATE TABLE IF NOT EXISTS public.adsb_provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  icao24s_queried INTEGER DEFAULT 0,
  icao24s_found INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adsb_health_created ON public.adsb_provider_health (created_at);
CREATE INDEX IF NOT EXISTS idx_adsb_health_provider ON public.adsb_provider_health (provider, created_at);

-- 4. Cleanup function — deletes health rows >7 days and positions >24 hours old
CREATE OR REPLACE FUNCTION public.cleanup_adsb_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.adsb_provider_health WHERE created_at < now() - interval '7 days';
  DELETE FROM public.flight_positions WHERE fetched_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
