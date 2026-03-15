-- Soft delete support for orders
ALTER TABLE orders
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX idx_orders_deleted_at ON orders (deleted_at);
