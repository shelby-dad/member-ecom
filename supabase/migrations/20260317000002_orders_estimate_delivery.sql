-- Optional estimated delivery range for shipped orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estimate_delivery_start timestamptz,
  ADD COLUMN IF NOT EXISTS estimate_delivery_end timestamptz;
