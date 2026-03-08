
-- Reviews table for anonymous restaurant reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  nickname text DEFAULT '익명',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Anyone can insert reviews (anonymous)
CREATE POLICY "Anyone can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

-- Index for fast lookup by restaurant
CREATE INDEX idx_reviews_restaurant_id ON public.reviews(restaurant_id);

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
