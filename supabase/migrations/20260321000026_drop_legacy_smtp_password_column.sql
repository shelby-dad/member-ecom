-- Remove legacy single-column SMTP password storage.
-- SMTP secrets are now stored in smtp_password_iv + smtp_password_content.

ALTER TABLE app_settings
  DROP COLUMN IF EXISTS smtp_password;
