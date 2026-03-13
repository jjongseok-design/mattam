-- #3: 방문기록 / 즐겨찾기 기기 동기화
CREATE TABLE IF NOT EXISTS public.device_visits (
  device_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, restaurant_id)
);
ALTER TABLE public.device_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage own device visits"
  ON public.device_visits FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.device_favorites (
  device_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  favorited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, restaurant_id)
);
ALTER TABLE public.device_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage own device favorites"
  ON public.device_favorites FOR ALL USING (true) WITH CHECK (true);

-- #8: 리뷰 좋아요
CREATE TABLE IF NOT EXISTS public.review_likes (
  device_id TEXT NOT NULL,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, review_id)
);
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage own review likes"
  ON public.review_likes FOR ALL USING (true) WITH CHECK (true);

-- Add likes_count to reviews for performance
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Auto-update likes_count on review_likes changes
CREATE OR REPLACE FUNCTION public.update_review_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews SET likes_count = likes_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_review_likes_count ON public.review_likes;
CREATE TRIGGER trigger_update_review_likes_count
AFTER INSERT OR DELETE ON public.review_likes
FOR EACH ROW EXECUTE FUNCTION public.update_review_likes_count();

-- #9: PWA 푸시 알림 구독 저장
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage own push subscriptions"
  ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);
