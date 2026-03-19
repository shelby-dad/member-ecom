-- App settings: shop logo path from storage explorer

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS shop_logo text;

