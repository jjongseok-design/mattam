CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants (category);
CREATE INDEX IF NOT EXISTS idx_restaurants_category_rating ON public.restaurants (category, rating DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants (slug);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON public.reviews (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_device_visits_device_id ON public.device_visits (device_id);
CREATE INDEX IF NOT EXISTS idx_device_favorites_device_id ON public.device_favorites (device_id);
