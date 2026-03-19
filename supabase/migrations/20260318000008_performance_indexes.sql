-- Performance indexes for high-traffic order/member search and listing paths.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Member order list: frequent filters/sorts by user/status/date.
CREATE INDEX IF NOT EXISTS idx_orders_user_created_desc
  ON orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created_desc
  ON orders (user_id, status, created_at DESC);

-- Admin/member textual search across order fields.
CREATE INDEX IF NOT EXISTS idx_orders_search_trgm
  ON orders
  USING gin (
    ((
      coalesce(order_number, '')
      || ' ' || coalesce(shipping_name, '')
      || ' ' || coalesce(shipping_line1, '')
      || ' ' || coalesce(shipping_line2, '')
      || ' ' || coalesce(shipping_city, '')
      || ' ' || coalesce(shipping_state, '')
      || ' ' || coalesce(shipping_postal_code, '')
      || ' ' || coalesce(shipping_country, '')
    )) gin_trgm_ops
  );

-- POS/member selectors and admin search on profile identity fields.
CREATE INDEX IF NOT EXISTS idx_profiles_search_trgm
  ON profiles
  USING gin (
    ((coalesce(full_name, '') || ' ' || coalesce(email, ''))) gin_trgm_ops
  );

-- My-order line-item keyword search.
CREATE INDEX IF NOT EXISTS idx_order_items_search_trgm
  ON order_items
  USING gin (
    ((coalesce(product_name, '') || ' ' || coalesce(variant_name, ''))) gin_trgm_ops
  );
