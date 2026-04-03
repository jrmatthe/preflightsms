-- Add departure/destination timezone columns to flights table
-- Used to display ETD in departure local time and ETA in destination local time
ALTER TABLE flights ADD COLUMN IF NOT EXISTS dep_tz text;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS dest_tz text;
