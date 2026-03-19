-- Additional indexes for admin-order filters and POS member lookup/sort.

-- Admin orders list commonly filters by deleted_at/status and sorts by created_at.
CREATE INDEX IF NOT EXISTS idx_orders_deleted_status_created_desc
  ON orders (deleted_at, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_deleted_created_desc
  ON orders (deleted_at, created_at DESC);

-- POS member selector and admin/member identity search patterns.
CREATE INDEX IF NOT EXISTS idx_profiles_role_status_full_name_email
  ON profiles (role, status, full_name, email);

CREATE INDEX IF NOT EXISTS idx_profiles_mobile_number
  ON profiles (mobile_number);
