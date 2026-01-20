-- Storage Policies for 'patterns' bucket
-- Users can upload/read/delete their own patterns

-- Policy: Users can upload to their own folder (user_id/*)
CREATE POLICY "Users can upload own patterns"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patterns' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own patterns"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'patterns' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own patterns"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'patterns' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can read patterns (for public sharing)
CREATE POLICY "Anyone can read patterns"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'patterns');
