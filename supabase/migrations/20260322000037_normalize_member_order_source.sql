-- Normalize any legacy member source label to the canonical value.
UPDATE public.orders
SET source = 'Member Order'
WHERE source = 'Member Purchase';

-- Keep source check explicit and canonical.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_source_check
  CHECK (source IN ('Member Order', 'POS Order'));
