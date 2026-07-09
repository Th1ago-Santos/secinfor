CREATE POLICY "Public can view notebook photos for QR lookup"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'notebook-photos');