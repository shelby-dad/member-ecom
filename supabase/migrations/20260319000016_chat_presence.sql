CREATE TABLE IF NOT EXISTS chat_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_presence_last_seen
  ON chat_presence(last_seen_at DESC);

ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_presence_select_self ON chat_presence;
CREATE POLICY chat_presence_select_self
  ON chat_presence FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_presence_upsert_self ON chat_presence;
CREATE POLICY chat_presence_upsert_self
  ON chat_presence FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_presence_update_self ON chat_presence;
CREATE POLICY chat_presence_update_self
  ON chat_presence FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_presence_all_service_role ON chat_presence;
CREATE POLICY chat_presence_all_service_role
  ON chat_presence FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS chat_presence_updated_at ON chat_presence;
CREATE TRIGGER chat_presence_updated_at
  BEFORE UPDATE ON chat_presence
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
