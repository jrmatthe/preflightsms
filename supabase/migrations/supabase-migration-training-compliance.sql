-- Training Compliance Management
-- Adds expiry notification tracking and training notification preferences

ALTER TABLE public.training_records
  ADD COLUMN IF NOT EXISTS expiry_notified_at timestamptz DEFAULT NULL;

ALTER TABLE public.notification_contacts
  ADD COLUMN IF NOT EXISTS notify_training boolean DEFAULT true;
