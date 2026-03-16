-- Bank transfer QR image path
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS image_path text;
