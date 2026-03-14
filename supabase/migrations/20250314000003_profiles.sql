-- User profiles linked to auth.users (role, branch, status)

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role app_role NOT NULL DEFAULT 'member',
  branch_id uuid REFERENCES branches (id) ON DELETE SET NULL,
  status profile_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_branch_id ON profiles (branch_id);
CREATE INDEX idx_profiles_status ON profiles (status);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Superadmin can read all; admin can read members/staff in their scope (simplified: all for now)
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('superadmin', 'admin')
    )
  );

-- Service role for inserts/updates (trigger or API)
CREATE POLICY "profiles_all_service_role"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to update their own non-sensitive fields (e.g. full_name) if needed
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
