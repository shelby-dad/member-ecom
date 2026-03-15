-- Payment type refactor + wallet balance
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'bank_transfer' CHECK (type IN ('wallet', 'bank_transfer', 'cash', 'cod'));

ALTER TABLE payment_methods
  ALTER COLUMN account_name DROP NOT NULL,
  ALTER COLUMN account_number DROP NOT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_method_type text CHECK (payment_method_type IN ('wallet', 'bank_transfer', 'cash', 'cod'));

-- Optional seed records for non-bank methods (safe idempotent upsert by unique name+type style)
INSERT INTO payment_methods (name, type, is_active, sort_order)
SELECT 'Wallet', 'wallet', true, 10
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods WHERE type = 'wallet'
);

INSERT INTO payment_methods (name, type, is_active, sort_order)
SELECT 'Cash', 'cash', true, 20
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods WHERE type = 'cash'
);

INSERT INTO payment_methods (name, type, is_active, sort_order)
SELECT 'Cash on Delivery', 'cod', true, 30
WHERE NOT EXISTS (
  SELECT 1 FROM payment_methods WHERE type = 'cod'
);
