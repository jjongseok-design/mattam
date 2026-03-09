
-- Rate limiting for reviews: max 10 reviews per restaurant per hour
CREATE OR REPLACE FUNCTION public.check_review_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM public.reviews
  WHERE restaurant_id = NEW.restaurant_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Too many reviews for this restaurant recently. Please try again later.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER review_rate_limit_trigger
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_review_rate_limit();

-- Admin PIN brute-force protection: lockout tracking
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hint text NOT NULL DEFAULT 'unknown',
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to login attempts"
  ON public.admin_login_attempts
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
