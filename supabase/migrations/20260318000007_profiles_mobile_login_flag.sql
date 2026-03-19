-- Allow member login by phone when explicitly enabled
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_mobile_logged_in boolean NOT NULL DEFAULT false;

