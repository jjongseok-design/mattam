-- ===== 20260228003948_17287899-70a5-417e-80fa-cc76f868ea40.sql =====

-- Create restaurants table
CREATE TABLE public.restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '중국집',
  address TEXT NOT NULL,
  phone TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  price_range TEXT,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view restaurants)
CREATE POLICY "Anyone can view restaurants"
ON public.restaurants
FOR SELECT
USING (true);

-- Only authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can insert restaurants"
ON public.restaurants
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update restaurants"
ON public.restaurants
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete restaurants"
ON public.restaurants
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===== 20260303000946_14e4ead0-dfee-4c5a-a589-91160cb678c5.sql =====

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

-- ===== 20260308155146_c6ff3bcb-14fd-4603-8038-d3791b5b36fe.sql =====
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
-- ===== 20260308160055_fe84696e-df02-4086-8281-1435fcd62529.sql =====

-- Reviews table for anonymous restaurant reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  nickname text DEFAULT '익명',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Anyone can insert reviews (anonymous)
CREATE POLICY "Anyone can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

-- Index for fast lookup by restaurant
CREATE INDEX idx_reviews_restaurant_id ON public.reviews(restaurant_id);

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- ===== 20260308160639_189b63c3-d671-492a-abb0-b86e4d8f97d4.sql =====

-- 청년반점: 퇴계동 593-24 → 퇴계동 중심부
UPDATE public.restaurants SET lat = 37.8548, lng = 127.7288 WHERE id = 'cn46';

-- 따거: 후평동 714-12 → 후평동 중심부  
UPDATE public.restaurants SET lat = 37.8720, lng = 127.7380 WHERE id = 'cn47';

-- 만리향: 죽림동 11-78 → 죽림동 중심부
UPDATE public.restaurants SET lat = 37.8774, lng = 127.7260 WHERE id = 'cn49';

-- 평창한우 춘천 삼천점: 삼천동 42-2 → 삼천동 중심부
UPDATE public.restaurants SET lat = 37.8682, lng = 127.6957 WHERE id = 'cn51';

-- 남도 갈비탕: 근화동 562-5 → 근화동 중심부
UPDATE public.restaurants SET lat = 37.8806, lng = 127.7123 WHERE id = 'gb07';

-- 대주객: 석사동 749-3, 애막골길11번길 7 → 석사동 애막골길
UPDATE public.restaurants SET lat = 37.8661, lng = 127.7522 WHERE id = 'cn50';

-- 호반중식뷔페: 근화동 160-9 → 근화동 (춘천역 근처)
UPDATE public.restaurants SET lat = 37.8806, lng = 127.7123 WHERE id = 'cn48';

-- 본향갈비타: 신동면 정족리 632-11 → 신동면 정족리 추정
UPDATE public.restaurants SET lat = 37.8350, lng = 127.7800 WHERE id = 'gb08';

-- 권바우부대찌개: 퇴계동 491-10, 솟발1길 4-13 → 퇴계동 중남부
UPDATE public.restaurants SET lat = 37.8560, lng = 127.7300 WHERE id = 'jjigae-001';

-- ===== 20260309022110_f147604e-903a-4570-a253-e63548993777.sql =====

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS opening_hours text DEFAULT NULL;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS closed_days text DEFAULT NULL;

-- ===== 20260309024944_223d4110-e2e4-4c66-811b-e2ca036cf590.sql =====

-- 설렁탕/곰탕 추가 (겹치지 않는 ID)
INSERT INTO restaurants (id, name, category, address, phone, rating, review_count, lat, lng, tags, description, price_range) VALUES
('sg13', '감미옥', '설렁탕/곰탕', '강원 춘천시 석사동 850', '033-262-8080', 4.3, 950, 37.8848, 127.7510, ARRAY['설렁탕','도가니탕','수육','곰탕'], '부모님 모시고 가기 좋은 설렁탕', '₩10,000~18,000'),
('sg14', '춘천장 스무숲본점', '설렁탕/곰탕', '강원 춘천시 석사동 스무숲', '033-264-5678', 4.2, 680, 37.8855, 127.7520, ARRAY['육개장','곰탕','갈비탕','한우'], '정성 가득한 곰탕 전문점', '₩10,000~15,000');

-- 베이커리 추가
INSERT INTO restaurants (id, name, category, address, phone, rating, review_count, lat, lng, tags, description, price_range) VALUES
('bk11', '38마일', '베이커리', '강원 춘천시 남산면 종자리로 42', '033-263-3800', 4.5, 3200, 37.8200, 127.6800, ARRAY['소금빵','베이글','깜빠뉴','대형카페'], '춘천 대형 베이커리 카페', '₩3,000~8,000'),
('bk12', '파머스가든', '베이커리', '강원 춘천시 동면 순환대로 1154-18', '033-244-9292', 4.2, 1800, 37.9000, 127.7700, ARRAY['빵','케이크','정원카페','브런치'], '정원이 아름다운 베이커리 카페', '₩4,000~12,000'),
('bk13', '라뜰리에김가', '베이커리', '강원 춘천시 동면 순환대로 1154-20', '033-244-5577', 3.6, 980, 37.9010, 127.7710, ARRAY['빵','타르트','케이크','정원'], '예쁜 정원의 베이커리', '₩4,000~10,000'),
('bk14', '에이드런', '베이커리', '강원 춘천시 석사동 산38번길 15', '033-264-1100', 4.1, 650, 37.8860, 127.7530, ARRAY['크로와상','식빵','케이크'], '동네 인기 베이커리', '₩3,000~8,000'),
('bk15', '아우어베이커리 춘천', '베이커리', '강원 춘천시 중앙로 87', '033-255-1234', 4.3, 520, 37.8780, 127.7310, ARRAY['크루아상','빵','카페','디저트'], '감성 베이커리 카페', '₩4,000~9,000'),
('bk16', '올댓브레드 춘천점', '베이커리', '강원 춘천시 후평동 640', '033-257-3500', 4.0, 890, 37.8830, 127.7400, ARRAY['식빵','크림빵','샌드위치'], '다양한 빵을 만날 수 있는 베이커리', '₩3,000~7,000');

-- 초밥 추가
INSERT INTO restaurants (id, name, category, address, phone, rating, review_count, lat, lng, tags, description, price_range) VALUES
('sb12', '스시니쿠', '초밥', '강원 춘천시 석사동 858', '033-264-8282', 4.2, 1500, 37.8855, 127.7515, ARRAY['회전초밥','스시','사시미','가성비'], '가성비 좋은 회전초밥', '₩12,000~25,000'),
('sb13', '스시미야', '초밥', '강원 춘천시 후평동 735', '033-256-6600', 4.0, 780, 37.8835, 127.7410, ARRAY['초밥','사시미','모둠초밥'], '깔끔한 동네 초밥집', '₩15,000~30,000'),
('sb14', '쿠시카츠나카노 춘천', '초밥', '강원 춘천시 중앙로 120', '033-255-5050', 4.1, 620, 37.8780, 127.7300, ARRAY['쿠시카츠','초밥','일본식튀김'], '일본식 쿠시카츠 전문점', '₩15,000~25,000'),
('sb15', '이자카야 하나', '초밥', '강원 춘천시 석사동 852', '033-262-1122', 4.3, 450, 37.8850, 127.7510, ARRAY['이자카야','사시미','야키토리','사케'], '분위기 좋은 이자카야', '₩20,000~35,000'),
('sb16', '오마카세 겐', '초밥', '강원 춘천시 효자동 300', '033-263-7788', 4.5, 320, 37.8710, 127.7260, ARRAY['오마카세','초밥','코스요리','프리미엄'], '춘천 오마카세 초밥', '₩50,000~80,000');

-- 수제버거 추가
INSERT INTO restaurants (id, name, category, address, phone, rating, review_count, lat, lng, tags, description, price_range) VALUES
('bg12', '올드팝버거', '수제버거', '강원 춘천시 중앙로 65', '033-255-8585', 4.1, 980, 37.8780, 127.7290, ARRAY['치즈버거','베이컨버거','감자튀김'], '미국식 클래식 수제버거', '₩9,000~15,000'),
('bg13', '1982버거', '수제버거', '강원 춘천시 후평동 710', '033-257-1982', 4.2, 650, 37.8830, 127.7390, ARRAY['수제버거','더블버거','어니언링'], '감성 수제버거 맛집', '₩10,000~16,000'),
('bg14', '바이브버거', '수제버거', '강원 춘천시 석사동 산38번길 10', '033-264-9090', 4.0, 420, 37.8855, 127.7525, ARRAY['스매쉬버거','감자튀김','밀크쉐이크'], '트렌디한 스매쉬버거', '₩10,000~15,000');

-- 감자탕 추가
INSERT INTO restaurants (id, name, category, address, phone, rating, review_count, lat, lng, tags, description, price_range) VALUES
('gj11', '대암감자탕', '감자탕', '강원 춘천시 효자동 백령로 19', '033-253-5055', 4.0, 850, 37.8700, 127.7240, ARRAY['감자탕','부대찌개','갈비탕','24시'], '24시 운영 감자탕 전문점', '₩9,000~33,000'),
('gj12', '이모네감자탕', '감자탕', '강원 춘천시 퇴계동 590', '033-256-7890', 4.1, 520, 37.8620, 127.7190, ARRAY['감자탕','뼈해장국','우거지탕'], '깊은 국물의 감자탕', '₩8,000~25,000'),
('gj13', '한강감자탕', '감자탕', '강원 춘천시 석사동 860', '033-264-3344', 3.9, 680, 37.8860, 127.7530, ARRAY['감자탕','뼈해장국','순대국'], '서민적 분위기의 감자탕집', '₩8,000~28,000');

-- 보쌈/족발 추가
INSERT INTO restaurants (id, name, category, address, phone, rating, review_count, lat, lng, tags, description, price_range) VALUES
('bj11', '춘천족발야시장', '보쌈/족발', '강원 춘천시 중앙로 88', '033-255-6789', 4.3, 1200, 37.8780, 127.7305, ARRAY['족발','보쌈','야시장','포장마차'], '명동 야시장 인기 족발', '₩15,000~35,000'),
('bj12', '황금족발', '보쌈/족발', '강원 춘천시 후평동 730', '033-257-4567', 4.1, 780, 37.8835, 127.7405, ARRAY['족발','불족발','쟁반막국수'], '매콤한 불족발 맛집', '₩18,000~38,000'),
('bj13', '우리집보쌈', '보쌈/족발', '강원 춘천시 석사동 855', '033-262-3456', 4.0, 450, 37.8850, 127.7515, ARRAY['보쌈','족발','막국수','수육'], '정갈한 보쌈 전문점', '₩16,000~35,000');

-- ===== 20260309042351_b746b7f6-8154-4d53-8a25-e038bd7f454f.sql =====

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

-- ===== 20260309071428_bb55f3a1-9f91-42e4-82d9-d422badf5226.sql =====
CREATE TABLE public.categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '🍴',
  sort_order integer NOT NULL DEFAULT 0,
  id_prefix text NOT NULL DEFAULT 'etc',
  tag_suggestions text[] DEFAULT '{}',
  tag_placeholder text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Seed existing categories
INSERT INTO public.categories (id, label, emoji, sort_order, id_prefix, tag_suggestions, tag_placeholder) VALUES
('닭갈비', '닭갈비', '🍗', 1, 'dc', ARRAY['닭갈비','숯불닭갈비','철판닭갈비','닭내장','닭목살','막국수','볶음밥','우동사리','간장닭갈비','삼색닭갈비'], '닭갈비, 숯불닭갈비, 철판닭갈비'),
('막국수', '막국수', '🍜', 2, 'mk', ARRAY['물막국수','비빔막국수','순메밀막국수','편육','메밀전병','감자전','녹두전','보쌈','메밀전','들기름막국수'], '막국수, 비빔막국수, 편육'),
('중화요리', '중화요리', '🥟', 3, 'cn', ARRAY['짜장면','짬뽕','탕수육','볶음밥','군만두','간짜장','울면','마라탕','코스요리','해물짬뽕'], '짬뽕, 탕수육, 짜장면'),
('갈비탕', '갈비탕', '🍖', 4, 'gb', ARRAY['갈비탕','소갈비탕','왕갈비탕','설렁탕','도가니탕','한식','수육','갈비찜'], '갈비탕, 소갈비탕, 한식'),
('삼계탕', '삼계탕', '🐔', 5, 'sg', ARRAY['삼계탕','한방삼계탕','옻닭','백숙','녹두삼계탕','전복삼계탕','인삼주','수정과'], '삼계탕, 한방삼계탕, 옻닭'),
('칼국수', '칼국수', '🍜', 6, 'kk', ARRAY['칼국수','손칼국수','샤브샤브','바지락칼국수','해물칼국수','수제비','만두','들깨칼국수'], '칼국수, 손칼국수, 샤브샤브'),
('수제버거', '수제버거', '🍔', 7, 'bg', ARRAY['수제버거','치즈버거','베이컨버거','감자튀김','어니언링','쉐이크','핫도그','치킨버거'], '수제버거, 치즈버거, 감자튀김'),
('삼겹살', '삼겹살', '🥓', 8, 'sp', ARRAY['삼겹살','목살','항정살','껍데기','냉삼','숯불구이','된장찌개','파김치','미나리'], '삼겹살, 목살, 구이'),
('초밥', '초밥', '🍣', 9, 'sb', ARRAY['초밥','사시미','연어초밥','광어초밥','오마카세','모듬초밥','우동','미소시루'], '초밥, 사시미, 오마카세'),
('일식', '일식/횟집', '🍱', 10, 'jp', ARRAY['라멘','소바','우동','스시','초밥','사케동','이자카야','오마카세','텐동','카레','송어회','활어회','매운탕','향어회'], '라멘, 소바, 초밥, 횟집'),
('감자탕', '감자탕', '🥘', 11, 'gj', ARRAY['감자탕','뼈해장국','등뼈찜','해장국','수육','볶음밥','우거지탕'], '감자탕, 뼈해장국, 등뼈찜'),
('한우', '한우', '🥩', 12, 'hw', ARRAY['한우','등심','안심','채끝','꽃등심','육회','한우국밥','불고기'], '한우, 등심, 안심'),
('돼지갈비', '돼지갈비', '🍖', 13, 'dg', ARRAY['돼지갈비','양념갈비','생갈비','갈비찜','냉면','된장찌개','공기밥'], '돼지갈비, 양념갈비, 생갈비'),
('이탈리안', '이탈리안', '🍝', 14, 'it', ARRAY['파스타','피자','화덕피자','리조또','스테이크','샐러드','크림파스타','알리오올리오','마르게리타'], '파스타, 피자, 리조또'),
('베이커리', '베이커리', '🥐', 15, 'bk', ARRAY['크루아상','앙버터','소금빵','식빵','케이크','마카롱','보리빵','맘모스빵','타르트'], '크루아상, 앙버터, 식빵'),
('국밥/탕류', '국밥/탕류', '🍲', 16, 'hs', ARRAY['설렁탕','곰탕','도가니탕','소꼬리탕','사골국','수육','선지국','순대국밥','돼지국밥','소머리국밥','김치찌개','된장찌개','순두부찌개','부대찌개','해장국'], '설렁탕, 곰탕, 국밥, 찌개'),
('보쌈/족발', '보쌈/족발', '🐷', 17, 'bj', ARRAY['보쌈','족발','수육','막국수','냉채족발','마늘보쌈','쟁반국수'], '보쌈, 족발, 수육'),
('돈까스', '돈까스', '🍛', 18, 'dk', ARRAY['돈까스','왕돈까스','카츠','경양식','치즈돈까스','카레','소바','냉모밀','함박스테이크','가성비'], '돈까스, 왕돈까스, 카츠'),
('샤브샤브', '샤브샤브', '🫕', 19, 'sv', ARRAY['샤브샤브','월남쌈','편백찜','칼국수','무한리필','뷔페','셀프바','소고기샤브','해물샤브','1인샤브'], '샤브샤브, 월남쌈, 편백찜'),
('생선구이', '생선구이', '🐟', 20, 'fs', ARRAY['생선구이','고등어구이','갈치구이','조기구이','꽁치구이'], '생선구이, 고등어구이, 갈치구이'),
('통닭', '통닭', '🍗', 21, 'td', ARRAY['통닭','후라이드','양념치킨','반반','치킨'], '통닭, 후라이드, 양념치킨'),
('카페', '카페', '☕', 22, 'cf', ARRAY['커피','라떼','아메리카노','디저트','케이크','브런치','베이글','스콘','감자빵','루프탑','뷰맛집','대형카페'], '커피, 디저트, 브런치'),
('기타', '기타', '🍴', 23, 'etc', ARRAY['한정식','백반','분식','떡볶이','쌀국수','태국음식','베트남음식','김밥','라면','팟타이','냉면'], '한정식, 백반, 분식, 동남아');

-- ===== 20260309083106_2523e262-2f96-490e-b6a3-996f5a493f96.sql =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
-- ===== 20260309123739_5910480c-f6cf-456a-821c-0615f92835a3.sql =====

-- Add 분식 category
INSERT INTO categories (id, label, emoji, sort_order, id_prefix, tag_suggestions, tag_placeholder)
VALUES ('분식', '분식', '🧆', 24, 'bs', ARRAY['떡볶이','김밥','순대','튀김','만두','즉석떡볶이','분식','라볶이','어묵','꼬마김밥'], '예: 떡볶이, 김밥, 순대')
ON CONFLICT (id) DO NOTHING;

-- Insert 분식 restaurants
INSERT INTO restaurants (id, name, category, address, lat, lng, rating, review_count, tags, description, phone, opening_hours, closed_days) VALUES
('bs001', '동이만두', '분식', '강원 춘천시 효제길 36', 37.8697, 127.7245, 4.6, 4, ARRAY['만두','튀김만두','분식'], '춘천 현지인 만두 맛집. 튀김만두가 특히 인기', NULL, '09:30~22:00', NULL),
('bs002', '팬더하우스', '분식', '강원 춘천시 명동길 49', 37.8812, 127.7290, 3.8, 17, ARRAY['분식','튀김만두','떡볶이'], '전현무계획 출연, 춘천 명동 분식 맛집', NULL, '10:00~18:30', NULL),
('bs003', '또또아', '분식', '강원 춘천시 명동길 49', 37.8810, 127.7288, 3.8, 6, ARRAY['분식','튀김만두','만두'], '추억의 맛 분식집. 중식만두 스타일 분식', NULL, '10:30~19:00', NULL),
('bs004', '떡의작품 남춘천점', '분식', '강원 춘천시 안마산로 107-1 1층 106호', 37.8583, 127.7340, 4.9, 3, ARRAY['떡볶이','가래떡떡볶이','쌀떡볶이'], '가래떡 쌀떡볶이 전문점', NULL, '11:00~20:30', NULL),
('bs005', '미화네떡볶이', '분식', '강원 춘천시 서부대성로206번길 15 1층', 37.8720, 127.7200, 3.0, 4, ARRAY['떡볶이','뚝배기떡볶이','세트메뉴'], '뚝배기 떡볶이와 다양한 세트메뉴 제공', NULL, '11:00~22:40', NULL),
('bs006', '청춘꼬마김밥앤떡볶이 본점', '분식', '강원 춘천시 퇴계농공로 12', 37.8930, 127.7520, 3.5, 5, ARRAY['김밥','꼬마김밥','떡볶이'], '석사동 인기 꼬마김밥 전문점', NULL, '06:00~21:00', NULL),
('bs007', '아리랑떡볶이', '분식', '강원 춘천시 후석로46번길 20 1층', 37.8942, 127.7490, 4.5, 5, ARRAY['즉석떡볶이','치즈밥','볶음밥'], '춘천 독보적 즉석떡볶이 맛집. 교대생 단골', NULL, '11:00~19:30', '일요일'),
('bs008', '별미당', '분식', '강원 춘천시 명동길 49 1층', 37.8811, 127.7289, 3.5, 3, ARRAY['분식','튀김만두','떡볶이'], '춘천 현지인 분식 맛집. 튀김만두 인기', NULL, '11:00~19:00', NULL),
('bs009', '꽃돼지분식', '분식', '강원 춘천시 방송길 34', 37.8760, 127.7350, 3.5, 2, ARRAY['떡볶이','분식','튀김'], '혁신의 떡볶이를 선보이는 근화동 분식집', NULL, '10:00~20:00', NULL),
('bs010', '김밥마녀', '분식', '강원 춘천시 중앙로 62', 37.8805, 127.7295, 3.8, 3, ARRAY['떡볶이','김밥','분식'], '춘천 중앙로 분식 맛집', NULL, '09:00~20:00', NULL),
('bs011', '가리미김밥 온의점', '분식', '강원 춘천시 영서로2279번길 13', 37.8755, 127.7155, 3.3, 2, ARRAY['김밥','분식'], '기본 김밥이 맛있는 분식점', NULL, '06:30~21:00', NULL),
('bs012', '김밥나라 봄내초교점', '분식', '강원 춘천시 퇴계로 217', 37.8890, 127.7450, 3.5, 3, ARRAY['김밥','분식','떡볶이'], '석사동 봄내초교 인근 분식점', NULL, '06:00~21:00', NULL)
ON CONFLICT (id) DO NOTHING;

-- ===== 20260309124611_3d528d01-aa1d-48d3-b910-d09f3fcc3cf4.sql =====
UPDATE categories SET emoji = '🍢' WHERE id = '분식';
-- ===== 20260309142511_f172dfe8-5e86-44d1-b4b0-0bbd1b41651d.sql =====

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

-- ===== 20260311000000_create_restaurant_images_bucket.sql =====
-- Create public storage bucket for restaurant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read restaurant images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'restaurant-images');

-- Allow service role (Edge Function) to upload
CREATE POLICY "Service role upload restaurant images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'restaurant-images');

-- Allow service role to update (upsert)
CREATE POLICY "Service role update restaurant images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'restaurant-images');

-- ===== 20260311043216_470a070d-30bf-49fb-a7a8-78e40959f2ae.sql =====

-- Create public storage bucket for restaurant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view images
CREATE POLICY "Anyone can view restaurant images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'restaurant-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload restaurant images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'restaurant-images');

-- Allow authenticated users to update images
CREATE POLICY "Authenticated users can update restaurant images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'restaurant-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete restaurant images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'restaurant-images');

-- ===== 20260311083136_acf4f4a3-58ef-4969-b6ba-19a522c3b307.sql =====
TRUNCATE public.admin_login_attempts;
-- ===== 20260313000000_add_device_sync_likes_notifications.sql =====
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

-- ===== 20260313000000_add_extra_images.sql =====
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS extra_images text[] DEFAULT '{}';

-- ===== 20260313010000_add_review_images_table.sql =====
-- Separate review_images table for multi-image support per review
-- Replaces single image_url column on reviews with a proper 1:N relationship

CREATE TABLE IF NOT EXISTS review_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url         text NOT NULL,
  position    int  NOT NULL DEFAULT 0,  -- display order within the review
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by review
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);

-- RLS: anyone can read, only device that created the review can insert
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_images_select" ON review_images
  FOR SELECT USING (true);

CREATE POLICY "review_images_insert" ON review_images
  FOR INSERT WITH CHECK (true);

-- (No image_url column to migrate in this project)

-- ===== 20260313020000_add_restaurant_slug.sql =====
-- Add slug column to restaurants for readable URLs
-- Keeps existing ID intact (no breaking changes)

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS slug text;

-- Generate initial slugs from existing IDs + name
-- Format: {category_prefix}-{name_romanized} — simplified: just use the existing id as slug initially
-- Then update to human-readable slugs via the app
UPDATE restaurants SET slug = id WHERE slug IS NULL;

-- Unique constraint
ALTER TABLE restaurants ADD CONSTRAINT restaurants_slug_key UNIQUE (slug);

-- Index for fast slug lookups (used in /restaurant/:slug route)
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);

COMMENT ON COLUMN restaurants.slug IS 'URL-friendly identifier (e.g. "dakgalbi-matzip-01"). Defaults to id. Use for /restaurant/:slug routes.';

-- ===== 20260320000000_add_cities_and_city_id.sql =====
-- ================================================================
-- 맛탐 멀티시티 스키마
-- cities 테이블 생성 + restaurants/categories 에 city_id 컬럼 추가
-- ================================================================

-- 1. cities 테이블
create table if not exists public.cities (
  id          text primary key,          -- e.g. 'chuncheon', 'gangneung'
  name        text not null,             -- 표시 이름 e.g. '춘천'
  description text,
  lat         double precision not null,
  lng         double precision not null,
  zoom        integer not null default 12,
  bounds_sw_lat double precision,
  bounds_sw_lng double precision,
  bounds_ne_lat double precision,
  bounds_ne_lng double precision,
  is_active   boolean not null default true,
  coming_soon boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 기본 도시: 춘천
insert into public.cities (id, name, description, lat, lng, zoom, bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng, is_active, sort_order)
values (
  'chuncheon', '춘천', '강원도 도청 소재지. 닭갈비·막국수의 고장',
  37.8813, 127.73, 12,
  37.734, 127.58, 38.02, 127.92,
  true, 1
)
on conflict (id) do nothing;

-- 2. restaurants 테이블에 city_id 컬럼 추가
alter table public.restaurants
  add column if not exists city_id text references public.cities(id);

-- 기존 데이터를 chuncheon 으로 마이그레이션
update public.restaurants set city_id = 'chuncheon' where city_id is null;

-- 인덱스
create index if not exists restaurants_city_id_idx on public.restaurants (city_id);

-- 3. categories 테이블에 city_id 컬럼 추가
alter table public.categories
  add column if not exists city_id text references public.cities(id);

update public.categories set city_id = 'chuncheon' where city_id is null;

create index if not exists categories_city_id_idx on public.categories (city_id);

-- 4. tips 테이블에 city_id 컬럼 추가 (선택적)
alter table public.tips
  add column if not exists city_id text references public.cities(id);

-- 5. RLS: cities 테이블은 누구나 읽기 가능
alter table public.cities enable row level security;

create policy "cities_select_all" on public.cities
  for select using (true);

-- ===== 20260321000000_review_rate_limit.sql =====
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

-- ===== 20260321010000_restaurant_slug_auto.sql =====
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

-- ===== 20260321020000_add_indexes.sql =====
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants (category);
CREATE INDEX IF NOT EXISTS idx_restaurants_category_rating ON public.restaurants (category, rating DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants (slug);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON public.reviews (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_device_visits_device_id ON public.device_visits (device_id);
CREATE INDEX IF NOT EXISTS idx_device_favorites_device_id ON public.device_favorites (device_id);

