-- Chat image attachments support.

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime_type text,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_attachment_size_positive'
  ) THEN
    ALTER TABLE chat_messages
      ADD CONSTRAINT chat_messages_attachment_size_positive
      CHECK (attachment_size_bytes IS NULL OR attachment_size_bytes > 0);
  END IF;
END$$;
