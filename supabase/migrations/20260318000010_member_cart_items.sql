-- Member cart persisted in DB for cross-device/browser consistency.
CREATE TABLE IF NOT EXISTS member_cart_items (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL DEFAULT '',
  variant_name TEXT NOT NULL DEFAULT '',
  price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_member_cart_items_user_id
  ON member_cart_items(user_id);

CREATE INDEX IF NOT EXISTS idx_member_cart_items_updated_at
  ON member_cart_items(updated_at DESC);

ALTER TABLE member_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_cart_items_select_own"
  ON member_cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "member_cart_items_insert_own"
  ON member_cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_cart_items_update_own"
  ON member_cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_cart_items_delete_own"
  ON member_cart_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "member_cart_items_all_service_role"
  ON member_cart_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS member_cart_items_updated_at ON member_cart_items;
CREATE TRIGGER member_cart_items_updated_at
  BEFORE UPDATE ON member_cart_items
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
