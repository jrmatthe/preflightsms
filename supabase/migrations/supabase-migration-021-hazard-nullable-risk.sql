-- Allow hazards to be created without initial risk scoring
-- (risk assessment now happens as a separate workflow step after identification)

-- Drop the NOT NULL constraint on initial_likelihood and initial_severity
ALTER TABLE hazard_register ALTER COLUMN initial_likelihood DROP NOT NULL;
ALTER TABLE hazard_register ALTER COLUMN initial_severity DROP NOT NULL;

-- Update CHECK constraints to allow NULL values
-- (PostgreSQL CHECK constraints already pass for NULL, so we only need to drop NOT NULL)
-- The existing CHECK (initial_likelihood between 1 and 5) naturally allows NULL.
