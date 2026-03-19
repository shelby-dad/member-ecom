DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;
  END IF;
END$$;
