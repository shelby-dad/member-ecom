-- Products and variants

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku text UNIQUE,
  name text NOT NULL,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(12, 2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);

CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants (id) ON DELETE SET NULL,
  path text NOT NULL,
  alt text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_is_active ON products (is_active);
CREATE INDEX idx_products_slug ON products (slug);
CREATE INDEX idx_product_variants_product_id ON product_variants (product_id);
CREATE INDEX idx_product_images_product_id ON product_images (product_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Members and staff can read active products and their variants/images
CREATE POLICY "products_select_public"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "product_variants_select_public"
  ON product_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_active = true)
  );

CREATE POLICY "product_images_select_public"
  ON product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_active = true)
  );

-- Admin/superadmin full access (via app check or service role)
CREATE POLICY "products_all_service_role"
  ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "product_variants_all_service_role"
  ON product_variants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "product_images_all_service_role"
  ON product_images FOR ALL TO service_role USING (true) WITH CHECK (true);
