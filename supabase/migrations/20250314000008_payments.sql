-- Payment methods (admin-managed) and member payment submissions (slip / transaction id)

CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_name text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  payment_method_id uuid NOT NULL REFERENCES payment_methods (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  transaction_id text,
  slip_path text,
  status payment_submission_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_methods_is_active ON payment_methods (is_active);
CREATE INDEX idx_payment_submissions_order_id ON payment_submissions (order_id);
CREATE INDEX idx_payment_submissions_user_id ON payment_submissions (user_id);
CREATE INDEX idx_payment_submissions_status ON payment_submissions (status);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;

-- All authenticated can read active payment methods (for checkout)
CREATE POLICY "payment_methods_select"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Members see their own submissions
CREATE POLICY "payment_submissions_select_own"
  ON payment_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/superadmin see all submissions
CREATE POLICY "payment_submissions_select_admin"
  ON payment_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('superadmin', 'admin'))
  );

-- Members can insert their own submission
CREATE POLICY "payment_submissions_insert_own"
  ON payment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role for payment_methods CRUD and submission updates (verify)
CREATE POLICY "payment_methods_all_service_role"
  ON payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "payment_submissions_all_service_role"
  ON payment_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);
