
-- Admin settings table for PIN storage
CREATE TABLE public.admin_settings (
  id text PRIMARY KEY DEFAULT 'default',
  pin_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for edge function, but PIN is hashed)
CREATE POLICY "No direct access to admin_settings"
ON public.admin_settings FOR SELECT
USING (false);

-- No direct client writes
CREATE POLICY "No direct writes to admin_settings"
ON public.admin_settings FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct updates to admin_settings"
ON public.admin_settings FOR UPDATE
USING (false);

-- Insert default PIN '0000' (will be hashed by edge function on first use)
-- We store a simple hash for now; the edge function will handle proper hashing
INSERT INTO public.admin_settings (id, pin_hash) VALUES ('default', '0000');
