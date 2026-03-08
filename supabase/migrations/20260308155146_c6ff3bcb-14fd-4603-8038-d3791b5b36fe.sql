CREATE TABLE public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  address TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- 누구나 제보 가능 (익명)
CREATE POLICY "Anyone can insert tips"
ON public.tips
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 제보 조회는 제한 (관리자만 edge function으로 조회)
CREATE POLICY "No direct read access to tips"
ON public.tips
FOR SELECT
USING (false);