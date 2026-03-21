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
