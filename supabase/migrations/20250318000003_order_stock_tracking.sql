-- Track whether order stock has been reserved and snapshot track_stock per order item

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stock_applied boolean NOT NULL DEFAULT false;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT true;

