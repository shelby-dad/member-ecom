-- Storage buckets: product images (public read), payment slips (private)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips',
  'payment-slips',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- product-images: authenticated upload (admin); public read
CREATE POLICY "product_images_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );

CREATE POLICY "product_images_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );

CREATE POLICY "product_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );

-- payment-slips: member upload own; admin read/update
CREATE POLICY "payment_slips_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "payment_slips_read_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-slips'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin'))
  );

CREATE POLICY "payment_slips_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-slips'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );

CREATE POLICY "payment_slips_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-slips'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin')
  );
