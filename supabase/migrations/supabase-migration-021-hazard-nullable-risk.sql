-- Allow hazards to be created without initial risk scoring
-- (risk assessment now happens as a separate workflow step after identification)

-- Drop the NOT NULL constraint on initial_likelihood and initial_severity
ALTER TABLE hazard_register ALTER COLUMN initial_likelihood DROP NOT NULL;
ALTER TABLE hazard_register ALTER COLUMN initial_severity DROP NOT NULL;

-- Update status CHECK constraint to new workflow statuses
ALTER TABLE hazard_register DROP CONSTRAINT IF EXISTS hazard_register_status_check;
ALTER TABLE hazard_register ADD CONSTRAINT hazard_register_status_check
  CHECK (status IN ('identified', 'assessed', 'acceptable', 'unacceptable', 'mitigated', 'monitoring', 'closed'));

-- Update default status
ALTER TABLE hazard_register ALTER COLUMN status SET DEFAULT 'identified';
