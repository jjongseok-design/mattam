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

-- (No image_url column to migrate in this project)
