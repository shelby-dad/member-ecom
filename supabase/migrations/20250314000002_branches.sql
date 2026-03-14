-- Company branches (single tenant, multiple branches)

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_branches_is_active ON branches (is_active);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read branches (for selection / display)
CREATE POLICY "branches_select"
  ON branches FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only superadmin and admin can manage branches (handled in app or service role)
CREATE POLICY "branches_all_service_role"
  ON branches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
