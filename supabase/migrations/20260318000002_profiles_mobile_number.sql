-- Optional mobile number on user profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mobile_number text;

