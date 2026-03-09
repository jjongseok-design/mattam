
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS opening_hours text DEFAULT NULL;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS closed_days text DEFAULT NULL;
