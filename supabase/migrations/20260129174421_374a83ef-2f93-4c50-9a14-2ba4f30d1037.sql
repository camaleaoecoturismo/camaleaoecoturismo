-- Create storage bucket for landing page media
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-pages', 'landing-pages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for landing pages media"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-pages');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload landing pages media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'landing-pages' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete landing pages media"
ON storage.objects FOR DELETE
USING (bucket_id = 'landing-pages' AND auth.role() = 'authenticated');