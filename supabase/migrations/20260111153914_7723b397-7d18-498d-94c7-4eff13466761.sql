-- Create storage bucket for site configuration images
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-config', 'site-config', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to site-config bucket
CREATE POLICY "Public read access for site-config"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-config');

-- Allow authenticated admin users to upload to site-config bucket
CREATE POLICY "Admin upload access for site-config"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-config');

-- Allow authenticated admin users to update in site-config bucket
CREATE POLICY "Admin update access for site-config"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-config');

-- Allow authenticated admin users to delete from site-config bucket
CREATE POLICY "Admin delete access for site-config"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-config');