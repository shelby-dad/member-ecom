-- Enterprise products: has_variants, option_sets, variant option_values and sort_order

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS option_sets jsonb NOT NULL DEFAULT '[]';

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS option_values jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

COMMENT ON COLUMN products.option_sets IS 'Array of { "name": "Size", "values": ["S","M","L","XL"] }';
COMMENT ON COLUMN product_variants.option_values IS 'e.g. { "Size": "M", "Color": "Black" }';
