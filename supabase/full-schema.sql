-- 20250314000001_custom_types.sql
-- Custom enums and types for single-tenant shop

CREATE TYPE app_role AS ENUM (
  'superadmin',
  'admin',
  'member',
  'staff'
);

CREATE TYPE profile_status AS ENUM (
  'active',
  'suspended',
  'inactive'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE payment_submission_status AS ENUM (
  'pending',
  'verified',
  'rejected'
);

CREATE TYPE stock_movement_type AS ENUM (
  'in',
  'out',
  'adjustment'
);


-- 20250314000002_branches.sql
-- Company branches (single tenant, multiple branches)

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_is_active ON branches (is_active);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read branches (for selection / display)
CREATE POLICY "branches_select"
  ON branches FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only superadmin and admin can manage branches (handled in app or service role)
CREATE POLICY "branches_all_service_role"
  ON branches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 20250314000003_profiles.sql
-- User profiles linked to auth.users (role, branch, status)

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  mobile_number text,
  is_mobile_logged_in boolean NOT NULL DEFAULT false,
  avatar_url text,
  role app_role NOT NULL DEFAULT 'member',
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  status profile_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_branch_id ON profiles (branch_id);
CREATE INDEX idx_profiles_status ON profiles (status);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Superadmin can read all; admin can read members/staff in their scope (simplified: all for now)
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('superadmin', 'admin')
    )
  );

-- Service role for inserts/updates (trigger or API)
CREATE POLICY "profiles_all_service_role"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to update their own non-sensitive fields (e.g. full_name) if needed
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- 20250314000004_products.sql
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


-- 20250314000005_stock.sql
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


-- 20260317000003_address_geo_tables.sql
-- Address geo master tables: countries, states, and cities

CREATE TABLE countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES countries (id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_id, name),
  UNIQUE (country_id, code)
);

CREATE TABLE cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES countries (id) ON DELETE CASCADE,
  state_id uuid NOT NULL REFERENCES states (id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_id, name)
);

CREATE INDEX idx_states_country_id ON states (country_id);
CREATE INDEX idx_cities_country_id ON cities (country_id);
CREATE INDEX idx_cities_state_id ON cities (state_id);

INSERT INTO countries (code, name, is_active)
VALUES ('MM', 'Myanmar', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true;

-- 20260317000004_address_geo_seed_mm_regions.sql
WITH mm AS (
  SELECT id FROM countries WHERE code = 'MM' LIMIT 1
)
INSERT INTO states (country_id, code, name, is_active)
SELECT mm.id, 'MM-YGN', 'Yangon Region', true
FROM mm
WHERE NOT EXISTS (
  SELECT 1 FROM states s WHERE s.country_id = mm.id AND s.name = 'Yangon Region'
);

WITH mm AS (
  SELECT id FROM countries WHERE code = 'MM' LIMIT 1
)
INSERT INTO states (country_id, code, name, is_active)
SELECT mm.id, 'MM-MDY', 'Mandalay Region', true
FROM mm
WHERE NOT EXISTS (
  SELECT 1 FROM states s WHERE s.country_id = mm.id AND s.name = 'Mandalay Region'
);

WITH ygn AS (
  SELECT s.id, s.country_id
  FROM states s
  JOIN countries c ON c.id = s.country_id
  WHERE c.code = 'MM' AND s.name = 'Yangon Region'
  LIMIT 1
),
townships(name) AS (
  VALUES
    ('Ahlone'), ('Bahan'), ('Botahtaung'), ('Cocokyun'), ('Dagon'),
    ('Dagon Myothit (East)'), ('Dagon Myothit (North)'), ('Dagon Myothit (Seikkan)'), ('Dagon Myothit (South)'),
    ('Dala'), ('Dawbon'), ('Hlaing'), ('Hlaingthaya'), ('Hlegu'), ('Hmawbi'), ('Htantabin'),
    ('Insein'), ('Kamayut'), ('Kawhmu'), ('Khayan'), ('Kungyangon'), ('Kyauktan'), ('Kyauktada'),
    ('Kyeemyindaing'), ('Lanmadaw'), ('Latha'), ('Mayangon'), ('Mingala Taungnyunt'), ('Mingaladon'),
    ('North Okkalapa'), ('Pabedan'), ('Pazundaung'), ('Sanchaung'), ('Seikkan'), ('Seikkyi Kanaungto'),
    ('Shwepyitha'), ('South Okkalapa'), ('Taikkyi'), ('Tamwe'), ('Thanlyin'), ('Thingangyun'),
    ('Thongwa'), ('Twante'), ('Yankin')
)
INSERT INTO cities (country_id, state_id, name, is_active)
SELECT ygn.country_id, ygn.id, t.name, true
FROM ygn
CROSS JOIN townships t
WHERE NOT EXISTS (
  SELECT 1 FROM cities c WHERE c.state_id = ygn.id AND c.name = t.name
);

WITH mdy AS (
  SELECT s.id, s.country_id
  FROM states s
  JOIN countries c ON c.id = s.country_id
  WHERE c.code = 'MM' AND s.name = 'Mandalay Region'
  LIMIT 1
),
townships(name) AS (
  VALUES
    ('Aungmyaythazan'), ('Amarapura'), ('Chanayethazan'), ('Chanmyathazi'), ('Kyaukpadaung'),
    ('Kyaukse'), ('Madaya'), ('Mahaaungmye'), ('Mahlaing'), ('Meiktila'), ('Mogok'),
    ('Myingyan'), ('Myittha'), ('Natogyi'), ('Ngazun'), ('Nyaung-U'), ('Patheingyi'),
    ('Pyawbwe'), ('Pyigyidagun'), ('Pyin Oo Lwin'), ('Singu'), ('Sintgaing'),
    ('Tada-U'), ('Taungtha'), ('Thabeikkyin'), ('Thazi'), ('Wundwin'), ('Yamethin')
)
INSERT INTO cities (country_id, state_id, name, is_active)
SELECT mdy.country_id, mdy.id, t.name, true
FROM mdy
CROSS JOIN townships t
WHERE NOT EXISTS (
  SELECT 1 FROM cities c WHERE c.state_id = mdy.id AND c.name = t.name
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_select_authenticated"
  ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "states_select_authenticated"
  ON states FOR SELECT TO authenticated USING (true);
CREATE POLICY "cities_select_authenticated"
  ON cities FOR SELECT TO authenticated USING (true);

CREATE POLICY "countries_all_service_role"
  ON countries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "states_all_service_role"
  ON states FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cities_all_service_role"
  ON cities FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 20250314000006_addresses.sql
-- Member addresses (for checkout and order snapshot)

CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'Myanmar',
  country_id uuid REFERENCES countries (id) ON DELETE SET NULL,
  state_id uuid REFERENCES states (id) ON DELETE SET NULL,
  city_id uuid REFERENCES cities (id) ON DELETE SET NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON addresses (user_id);
CREATE INDEX idx_addresses_country_id ON addresses (country_id);
CREATE INDEX idx_addresses_state_id ON addresses (state_id);
CREATE INDEX idx_addresses_city_id ON addresses (city_id);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_select_own"
  ON addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_own"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_own"
  ON addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_delete_own"
  ON addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

UPDATE addresses
SET country = 'Myanmar'
WHERE country IS NULL OR btrim(country) = '' OR country = 'TH';

UPDATE addresses a
SET country_id = c.id
FROM countries c
WHERE c.code = 'MM'
  AND a.country_id IS NULL;


-- 20250314000007_orders.sql
-- Orders and order items

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  shipping_name text,
  shipping_line1 text,
  shipping_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text,
  estimate_delivery_start timestamptz,
  estimate_delivery_end timestamptz,
  paid_at timestamptz,
  subtotal numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  total numeric(12, 2) NOT NULL CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_staff uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  variant_name text NOT NULL,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  quantity int NOT NULL CHECK (quantity > 0),
  total numeric(12, 2) NOT NULL CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX idx_orders_order_number ON orders (order_number);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_status_history_order_id ON order_status_history (order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Members see their own orders
CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "order_items_select_own"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE POLICY "order_status_history_select_own"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- Admin/superadmin read all orders (via service role or role check in app)
CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('superadmin', 'admin'))
  );

CREATE POLICY "order_items_select_admin"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('superadmin', 'admin'))
  );

CREATE POLICY "order_status_history_select_admin"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('superadmin', 'admin'))
  );

-- Service role for insert/update (app creates orders and status changes)
CREATE POLICY "orders_all_service_role"
  ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "order_items_all_service_role"
  ON order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "order_status_history_all_service_role"
  ON order_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Members can insert their own orders (for checkout)
CREATE POLICY "orders_insert_own"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_items_insert_own"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- Order number generator (default for new orders)
CREATE SEQUENCE order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
  SELECT 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('order_number_seq')::text, 5, '0');
$$ LANGUAGE sql;


-- 20250314000008_payments.sql
-- Payment methods (admin-managed) and member payment submissions (slip / transaction id)

CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_name text,
  image_path text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text,
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  payment_method_id uuid NOT NULL REFERENCES payment_methods (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  transaction_id text,
  slip_path text,
  status payment_submission_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_methods_is_active ON payment_methods (is_active);
CREATE INDEX idx_payment_submissions_order_id ON payment_submissions (order_id);
CREATE INDEX idx_payment_submissions_user_id ON payment_submissions (user_id);
CREATE INDEX idx_payment_submissions_status ON payment_submissions (status);
CREATE UNIQUE INDEX idx_payment_submissions_invoice_number ON payment_submissions (invoice_number) WHERE invoice_number IS NOT NULL;

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;

-- All authenticated can read active payment methods (for checkout)
CREATE POLICY "payment_methods_select"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Members see their own submissions
CREATE POLICY "payment_submissions_select_own"
  ON payment_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/superadmin see all submissions
CREATE POLICY "payment_submissions_select_admin"
  ON payment_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('superadmin', 'admin'))
  );

-- Members can insert their own submission
CREATE POLICY "payment_submissions_insert_own"
  ON payment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role for payment_methods CRUD and submission updates (verify)
CREATE POLICY "payment_methods_all_service_role"
  ON payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "payment_submissions_all_service_role"
  ON payment_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 20250314000009_reviews.sql
-- Product reviews by members (tied to completed orders)

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders (id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX idx_reviews_product_id ON reviews (product_id);
CREATE INDEX idx_reviews_user_id ON reviews (user_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_visible"
  ON reviews FOR SELECT
  TO authenticated
  USING (is_visible = true);

CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_all_service_role"
  ON reviews FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 20250314000010_triggers.sql
-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER states_updated_at
  BEFORE UPDATE ON states
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER stock_updated_at
  BEFORE UPDATE ON stock
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER payment_submissions_updated_at
  BEFORE UPDATE ON payment_submissions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    'member',
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();



-- 20250314000011_storage.sql
-- Storage buckets: product images (public read), payment slips (private)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips',
  'payment-slips',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- product-images: authenticated upload (admin); public read
CREATE POLICY "product_images_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );

CREATE POLICY "product_images_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );

CREATE POLICY "product_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );

-- payment-slips: member upload own; admin read/update
CREATE POLICY "payment_slips_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "payment_slips_read_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-slips'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin'))
  );

CREATE POLICY "payment_slips_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-slips'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );

CREATE POLICY "payment_slips_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-slips'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );
