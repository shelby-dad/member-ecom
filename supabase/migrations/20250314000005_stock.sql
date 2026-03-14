-- Stock per variant (and optional branch); movements for audit

CREATE TABLE stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_id, branch_id)
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  movement_type stock_movement_type NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  reference_type text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX idx_stock_variant_branch ON stock (variant_id, branch_id);
CREATE INDEX idx_stock_movements_variant ON stock_movements (variant_id);
CREATE INDEX idx_stock_movements_created ON stock_movements (created_at DESC);

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_select_authenticated"
  ON stock FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_movements_select_authenticated"
  ON stock_movements FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_all_service_role"
  ON stock FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "stock_movements_all_service_role"
  ON stock_movements FOR ALL TO service_role USING (true) WITH CHECK (true);
