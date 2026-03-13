ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS extra_images text[] DEFAULT '{}';
