-- SMTP secret refactor: dedicated iv/content columns.
-- Backward compatibility intentionally removed.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS smtp_password_iv text,
  ADD COLUMN IF NOT EXISTS smtp_password_content text;

UPDATE app_settings
SET smtp_password = NULL,
    smtp_password_iv = NULL,
    smtp_password_content = NULL,
    updated_at = now()
WHERE id = true;
