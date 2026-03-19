-- Track when order payment becomes paid

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE orders
SET paid_at = COALESCE(paid_at, updated_at, created_at)
WHERE payment_status = 'paid' AND paid_at IS NULL;

