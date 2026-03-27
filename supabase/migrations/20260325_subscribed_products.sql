-- Add subscribed_products column to profiles for dynamic product switcher
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscribed_products TEXT[] DEFAULT '{}';
