-- Realtime support chat between member and shop operators.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_thread_status') THEN
    CREATE TYPE chat_thread_status AS ENUM ('open', 'banned');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status chat_thread_status NOT NULL DEFAULT 'open',
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (length(trim(message)) > 0),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_member ON chat_threads(member_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_assigned ON chat_threads(assigned_to, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_status ON chat_threads(status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_message ON chat_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Thread read access:
-- member: own threads
-- staff: assigned threads only
-- admin/superadmin: all threads
CREATE POLICY "chat_threads_select_policy"
  ON chat_threads FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR (
      assigned_to = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff'
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "chat_messages_select_policy"
  ON chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM chat_threads t
      WHERE t.id = thread_id
      AND (
        t.member_id = auth.uid()
        OR (
          t.assigned_to = auth.uid()
          AND EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff'
          )
        )
        OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
        )
      )
    )
  );

-- Insert message only in accessible non-banned thread and only as current sender.
CREATE POLICY "chat_messages_insert_policy"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM chat_threads t
      WHERE t.id = thread_id
      AND t.status <> 'banned'
      AND (
        t.member_id = auth.uid()
        OR (
          t.assigned_to = auth.uid()
          AND EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff'
          )
        )
        OR EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
        )
      )
    )
  );

-- Service role full control for API orchestration.
CREATE POLICY "chat_threads_all_service_role"
  ON chat_threads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "chat_messages_all_service_role"
  ON chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS chat_threads_updated_at ON chat_threads;
CREATE TRIGGER chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END$$;
