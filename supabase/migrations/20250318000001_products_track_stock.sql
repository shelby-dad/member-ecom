-- Product and variant stock tracking controls

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT true;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT true;

