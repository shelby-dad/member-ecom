-- Web Push subscriptions for chat notifications.

CREATE TABLE IF NOT EXISTS chat_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_push_subscriptions_user
  ON chat_push_subscriptions(user_id, is_active, updated_at DESC);

ALTER TABLE chat_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_push_subscriptions_select_own"
  ON chat_push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_push_subscriptions_insert_own"
  ON chat_push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_push_subscriptions_update_own"
  ON chat_push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_push_subscriptions_delete_own"
  ON chat_push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_push_subscriptions_all_service_role"
  ON chat_push_subscriptions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS chat_push_subscriptions_updated_at ON chat_push_subscriptions;
CREATE TRIGGER chat_push_subscriptions_updated_at
  BEFORE UPDATE ON chat_push_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
