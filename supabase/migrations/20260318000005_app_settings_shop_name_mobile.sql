-- App settings: add shop name + mobile number, remove shop location

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS shop_name text,
  ADD COLUMN IF NOT EXISTS mobile_number text;

ALTER TABLE app_settings
  DROP COLUMN IF EXISTS shop_location;

