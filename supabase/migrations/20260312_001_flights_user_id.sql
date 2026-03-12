-- Add user_id to flights table for "My Flights" filtering
ALTER TABLE flights ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill from frat_submissions
UPDATE flights f
SET user_id = fs.user_id
FROM frat_submissions fs
WHERE f.frat_id = fs.id
  AND f.user_id IS NULL;

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_flights_user_id ON flights(user_id);
