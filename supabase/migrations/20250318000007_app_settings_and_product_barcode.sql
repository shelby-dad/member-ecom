-- Global app settings + product barcode support
CREATE TABLE IF NOT EXISTS app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  pricing_sign text NOT NULL DEFAULT '',
  pricing_symbol text NOT NULL DEFAULT '฿',
  pricing_label text NOT NULL DEFAULT 'Price',
  pricing_decimals integer NOT NULL DEFAULT 2 CHECK (pricing_decimals BETWEEN 0 AND 4),
  pricing_symbol_position text NOT NULL DEFAULT 'before' CHECK (pricing_symbol_position IN ('before', 'after')),
  shop_address text,
  shop_email text,
  shop_location text,
  barcode_type text NOT NULL DEFAULT 'code128' CHECK (barcode_type IN ('code128', 'ean13', 'upca')),
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  smtp_secure boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'app_settings_updated_at'
  ) THEN
    CREATE TRIGGER app_settings_updated_at
      BEFORE UPDATE ON app_settings
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS barcode text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
  ON products (barcode)
  WHERE barcode IS NOT NULL;
