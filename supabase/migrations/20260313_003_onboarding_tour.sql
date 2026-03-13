-- Per-user onboarding tour state for non-admin roles (pilot, maintenance, dispatcher)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_tour JSONB DEFAULT NULL;
