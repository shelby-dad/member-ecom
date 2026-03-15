-- Product metadata: categories, tags, and brand model

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text UNIQUE,
  image_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  parent_id uuid REFERENCES categories (id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, name)
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS product_categories (
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories (product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags (product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id ON product_tags (tag_id);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_select_authenticated"
  ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_select_authenticated"
  ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags_select_authenticated"
  ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_categories_select_authenticated"
  ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_tags_select_authenticated"
  ON product_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "brands_all_service_role"
  ON brands FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "categories_all_service_role"
  ON categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tags_all_service_role"
  ON tags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "product_categories_all_service_role"
  ON product_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "product_tags_all_service_role"
  ON product_tags FOR ALL TO service_role USING (true) WITH CHECK (true);

