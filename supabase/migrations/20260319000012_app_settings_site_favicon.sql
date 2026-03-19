-- App settings: site tab fields and favicon paths
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS site_name text,
  ADD COLUMN IF NOT EXISTS site_favicon_original text,
  ADD COLUMN IF NOT EXISTS site_favicon_64 text,
  ADD COLUMN IF NOT EXISTS site_favicon_84 text,
  ADD COLUMN IF NOT EXISTS site_favicon_512 text;
