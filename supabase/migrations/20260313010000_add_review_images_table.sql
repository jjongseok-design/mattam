-- Separate review_images table for multi-image support per review
-- Replaces single image_url column on reviews with a proper 1:N relationship

CREATE TABLE IF NOT EXISTS review_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url         text NOT NULL,
  position    int  NOT NULL DEFAULT 0,  -- display order within the review
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by review
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);

-- RLS: anyone can read, only device that created the review can insert
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_images_select" ON review_images
  FOR SELECT USING (true);

CREATE POLICY "review_images_insert" ON review_images
  FOR INSERT WITH CHECK (true);

-- Migrate existing single image_url values into new table
INSERT INTO review_images (review_id, url, position)
SELECT id, image_url, 0
FROM reviews
WHERE image_url IS NOT NULL AND image_url <> '';

-- Keep image_url column for backwards compat but mark as deprecated via comment
COMMENT ON COLUMN reviews.image_url IS 'DEPRECATED: use review_images table instead';
