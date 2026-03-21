-- 슬러그 생성 함수 (한글+영문 지원, 중복 시 숫자 추가)
CREATE OR REPLACE FUNCTION public.generate_slug(p_name TEXT, p_exclude_id TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  base_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9가-힣]', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'restaurant'; END IF;

  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE slug = final_slug
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 신규 식당 insert 시 슬러그 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.set_restaurant_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR NEW.slug = NEW.id THEN
    NEW.slug := public.generate_slug(NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_restaurant_slug ON public.restaurants;
CREATE TRIGGER trg_set_restaurant_slug
BEFORE INSERT OR UPDATE OF name ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.set_restaurant_slug();
