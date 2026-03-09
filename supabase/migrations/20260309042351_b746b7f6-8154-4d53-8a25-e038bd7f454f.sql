
CREATE OR REPLACE FUNCTION public.update_restaurant_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  avg_rating numeric;
  count_reviews integer;
  target_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.restaurant_id;
  ELSE
    target_id := NEW.restaurant_id;
  END IF;

  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO avg_rating, count_reviews
  FROM public.reviews
  WHERE restaurant_id = target_id;

  UPDATE public.restaurants
  SET rating = ROUND(avg_rating, 1),
      review_count = count_reviews
  WHERE id = target_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_restaurant_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_restaurant_rating();
