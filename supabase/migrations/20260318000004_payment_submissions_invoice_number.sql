-- Add server-generated invoice number for payment submissions

ALTER TABLE payment_submissions
  ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_submissions_invoice_number
  ON payment_submissions (invoice_number)
  WHERE invoice_number IS NOT NULL;

