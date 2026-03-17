-- Address geo master tables: countries, states, cities
-- Countries seed: Myanmar only

CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES countries (id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_id, name),
  UNIQUE (country_id, code)
);

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES countries (id) ON DELETE CASCADE,
  state_id uuid NOT NULL REFERENCES states (id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_id, name)
);

CREATE INDEX IF NOT EXISTS idx_states_country_id ON states (country_id);
CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities (country_id);
CREATE INDEX IF NOT EXISTS idx_cities_state_id ON cities (state_id);

ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES countries (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS state_id uuid REFERENCES states (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES cities (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_addresses_country_id ON addresses (country_id);
CREATE INDEX IF NOT EXISTS idx_addresses_state_id ON addresses (state_id);
CREATE INDEX IF NOT EXISTS idx_addresses_city_id ON addresses (city_id);

-- Keep legacy text fields but align defaults/data with Myanmar
ALTER TABLE addresses
  ALTER COLUMN country SET DEFAULT 'Myanmar';

UPDATE addresses
SET country = 'Myanmar'
WHERE country IS NULL OR btrim(country) = '' OR country = 'TH';

INSERT INTO countries (code, name, is_active)
VALUES ('MM', 'Myanmar', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true;

UPDATE addresses a
SET country_id = c.id
FROM countries c
WHERE c.code = 'MM'
  AND a.country_id IS NULL;

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_select_authenticated"
  ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "states_select_authenticated"
  ON states FOR SELECT TO authenticated USING (true);
CREATE POLICY "cities_select_authenticated"
  ON cities FOR SELECT TO authenticated USING (true);

CREATE POLICY "countries_all_service_role"
  ON countries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "states_all_service_role"
  ON states FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "cities_all_service_role"
  ON cities FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS countries_updated_at ON countries;
CREATE TRIGGER countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS states_updated_at ON states;
CREATE TRIGGER states_updated_at
  BEFORE UPDATE ON states
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS cities_updated_at ON cities;
CREATE TRIGGER cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
