-- Create public storage bucket for restaurant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read restaurant images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'restaurant-images');

-- Allow service role (Edge Function) to upload
CREATE POLICY "Service role upload restaurant images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'restaurant-images');

-- Allow service role to update (upsert)
CREATE POLICY "Service role update restaurant images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'restaurant-images');
