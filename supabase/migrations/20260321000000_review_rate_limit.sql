-- reviews 테이블에 device_id 추가
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 5분 내 동일 device_id의 중복 리뷰 체크 함수
CREATE OR REPLACE FUNCTION public.check_review_rate_limit(p_device_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.reviews
    WHERE device_id = p_device_id
    AND created_at > NOW() - INTERVAL '5 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 기존 INSERT 정책 제거 후 rate limit 포함 정책 추가
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;

CREATE POLICY "Rate limited review insert"
ON public.reviews
FOR INSERT
WITH CHECK (
  device_id IS NOT NULL
  AND public.check_review_rate_limit(device_id)
);
