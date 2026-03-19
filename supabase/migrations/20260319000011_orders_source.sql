-- Track order source for admin/staff/superadmin visibility.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source TEXT;

-- Backfill existing rows randomly as requested.
UPDATE orders
SET source = CASE WHEN random() < 0.5 THEN 'Member Order' ELSE 'POS Order' END
WHERE source IS NULL;

-- Enforce constrained values and default.
ALTER TABLE orders
  ALTER COLUMN source SET DEFAULT 'Member Order';

ALTER TABLE orders
  ALTER COLUMN source SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_source_check'
      AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_source_check CHECK (source IN ('Member Order', 'POS Order'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source);
