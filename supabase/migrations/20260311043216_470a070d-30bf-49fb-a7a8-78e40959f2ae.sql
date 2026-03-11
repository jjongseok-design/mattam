
-- Create public storage bucket for restaurant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true);

-- Allow anyone to view images
CREATE POLICY "Anyone can view restaurant images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'restaurant-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload restaurant images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'restaurant-images');

-- Allow authenticated users to update images
CREATE POLICY "Authenticated users can update restaurant images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'restaurant-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete restaurant images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'restaurant-images');
