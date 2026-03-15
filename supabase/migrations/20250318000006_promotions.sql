-- Flexible promotions for ecommerce

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_discount_type') THEN
    CREATE TYPE promotion_discount_type AS ENUM ('fixed', 'percent');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  description text,
  discount_type promotion_discount_type NOT NULL,
  discount_value numeric(12, 2) NOT NULL CHECK (discount_value > 0),
  min_subtotal numeric(12, 2) NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
  max_discount numeric(12, 2) CHECK (max_discount IS NULL OR max_discount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int CHECK (usage_limit IS NULL OR usage_limit > 0),
  per_user_limit int CHECK (per_user_limit IS NULL OR per_user_limit > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS promo_id uuid REFERENCES promotions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_total numeric(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions (is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions (code);
CREATE INDEX IF NOT EXISTS idx_orders_promo_id ON orders (promo_id);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions_select_authenticated"
  ON promotions FOR SELECT TO authenticated USING (true);

CREATE POLICY "promotions_all_service_role"
  ON promotions FOR ALL TO service_role USING (true) WITH CHECK (true);

