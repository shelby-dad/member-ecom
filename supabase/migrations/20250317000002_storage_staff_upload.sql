-- Allow staff to upload product images (select remains public)
DROP POLICY IF EXISTS "product_images_upload" ON storage.objects;

CREATE POLICY "product_images_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'admin', 'staff')
  );
