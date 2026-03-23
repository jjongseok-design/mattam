# 맛탐 프로젝트 — Claude 참고 문서

## 프로젝트 개요
도시별 맛집 지도 웹앱 (React + Vite + Supabase + Kakao Maps)
- **로컬 개발**: `localhost:8080` (Vite dev server)
- **프로덕션**: `mattam.vercel.app` (Vercel, GitHub 자동 배포)

---

## ⚠️ Supabase 프로젝트 혼동 금지 (최우선 규칙)

> **맛탐 앱의 Supabase는 오직 `resstaurantchuncheon` 프로젝트 하나뿐이다.**
>
> - ✅ **사용**: `resstaurantchuncheon` (URL: `https://cblckdcrsotqynngblyb.supabase.co`)
> - ❌ **절대 사용 금지**: `mattam`이라는 이름의 Supabase 프로젝트 — 맛탐 앱과 **완전히 무관**
>
> SQL 작업 안내 시 반드시 **resstaurantchuncheon Supabase (cblckdcrsotqynngblyb)** 라고 명시한다.
> `mattam Supabase`에서 실행하라고 안내하는 것은 **절대 금지**된 오류다.

---

## 작업 규칙 (반드시 준수)

1. **기존 기능 보호**: 현재 작동 중인 기능은 절대 건드리지 않는다. 요청받은 기능만 수정한다.
2. **작업 전 커밋**: 새 기능 추가나 수정 작업을 시작하기 전에 반드시 `git commit`으로 현재 상태를 저장한다.
3. **한 번에 하나**: 한 번에 하나의 기능만 수정한다. 관련 없는 개선·리팩토링을 함께 포함하지 않는다.
4. **로컬 검증**: 수정 후 반드시 `localhost:8080`에서 기존 기능이 그대로 작동하는지 확인한 뒤 커밋·배포한다.
5. **SQL 안내 시 명시**: SQL 작업을 안내할 때는 반드시 **resstaurantchuncheon Supabase** (cblckdcrsotqynngblyb)에서 실행하도록 명시한다.

---

## 인프라 설정 (수동 구성 항목)

### Supabase
- **프로젝트명**: `resstaurantchuncheon`
- **Supabase URL**: `https://cblckdcrsotqynngblyb.supabase.co` ← 맛탐 전용 (신규)
- **환경변수**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
- **RLS 정책**: 아래 테이블에 `anon` 역할 read 허용 정책 추가됨
  - `restaurants`
  - `categories`
  - `cities`
  - `device_visits`
  - `device_favorites`

> **⚠️ 절대 혼동 금지**:
> - `cblckdcrsotqynngblyb` → **맛탐 전용 Supabase** (resstaurantchuncheon). 사용 O
> - `suwvgtidfknbnwgibrjm` → **구 Lovable Supabase**. 맛탐 앱에서 절대 사용 금지.
>
> 새 테이블 추가 시 RLS 정책을 반드시 설정해야 Vercel에서 데이터가 조회됨.
> 로컬에서는 `.env`의 키로 직접 접근하므로 RLS 없이도 작동할 수 있음.

### Vercel
- **프로젝트명**: `mattam`
- **연결 레포**: `mattam` GitHub 레포 (main 브랜치 push 시 자동 배포)
- **환경변수** (Vercel 대시보드에서 설정):
  - `VITE_KAKAO_APP_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SENTRY_DSN` (선택)

> **주의**: Supabase 키 교체 시 Vercel 환경변수도 반드시 함께 업데이트해야 함.
> `.env` 파일만 바꾸면 로컬만 반영되고 Vercel 빌드에는 적용되지 않음.

### 카카오 개발자 콘솔
- JS API 키의 허용 도메인에 `mattam.vercel.app` 등록 필요
- 미등록 시 Kakao Maps 로드 실패 → 10초 후 Leaflet 폴백으로 전환됨

---

## 작업 이력

### 2026-03-22 작업 내용

#### 1. 관리자 모드 버그 수정 (`src/pages/Admin.tsx`, `src/hooks/useRestaurants.ts`)
- **수정 (느린 반응)**: `handleSave` 편집 시 낙관적 업데이트를 API 호출 전으로 이동 → 폼이 즉시 닫히고 목록 즉시 반영
- **수정 (삭제 후 미동기화)**: `handleDelete` 성공 후 `silentRefresh()` + `queryClient.invalidateQueries` 추가
- **수정 (메인화면 지연)**: `useRestaurants` 리얼타임 디바운스 3000ms → 500ms 단축
- **수정 (크로스페이지 동기화)**: Admin에 `useQueryClient` 추가 → 관리자 조작 후 CityMap React Query 캐시 즉시 무효화

#### 2. 지도 카테고리 탭 복귀 시 줌아웃 (`src/components/MapView.tsx`)
- 식당 선택 후 카테고리 탭 클릭 시 도시 기본 위치·줌 레벨(level 7)로 복귀
- `prevSelectedIdRef`로 이전 선택 여부 추적 → 초기 로딩 시에는 동작 안 함
- 카카오맵·Leaflet 모두 적용

#### 3. 식당 대표 이미지 자동 정렬 스크립트 (`scripts/auto-sort-images.mjs`)
- 각 식당 이미지 중 외관/간판 사진을 Claude Vision으로 찾아 `image_url`(대표)로 설정
- Supabase 공개 URL을 Claude API에 직접 전달 (base64 다운로드 없음)
- **실행 방법**:
  ```bash
  # 미리보기 (DB 변경 없음)
  DRY_RUN=1 ANTHROPIC_API_KEY="sk-ant-..." node scripts/auto-sort-images.mjs

  # 실제 적용
  ANTHROPIC_API_KEY="sk-ant-..." node scripts/auto-sort-images.mjs
  ```
- **옵션**: `LIMIT=10` (개수 제한), `CITY=chuncheon` (도시 필터), `DRY_RUN=1` (미리보기)
- **주의사항**:
  - Tier 1 API 계정: 분당 50,000 토큰 한도 → 8초 간격 적용
  - 429 rate limit 발생 시 자동 재시도 (30초/60초/90초)
  - DRY RUN 결과: 437개 중 변경 대상 12개, 건너뜀 146개
  - **미완료**: 전체 437개 실제 적용 필요 (내일 실행 예정)

---

## 작업 현황 (2026-03-23 기준)

### ✅ 완료된 작업

#### 방문 통계 시스템
- 카드 목록: `👥 방문 N명` 표시 (첫 방문자 수, `useFirstVisitorCounts`)
- 식당 상세: `총 방문 N회 · 내가 방문 N회` 표시
- 재방문 팝업: 재방문 추가 / 방문 취소 / 닫기 버튼
- 재방문 추가 시 상세페이지 카운트 즉시 반영 (React Query 캐시 낙관적 업데이트)
- 성능 최적화: `useFirstVisitorCounts` 카드별 호출 → 상위 컴포넌트에서 1회 호출 후 prop 전달
- 관리자 페이지: 방문 통계 패널 (식당별 방문수 조회)

#### 리뷰 시스템
- 리뷰 등록: 별점(1~5) + 한 줄 코멘트(15자 이내), device_id 기반 익명
- 리뷰 수정: 내 리뷰 수정 버튼 → 별점·코멘트 재입력
- 리뷰 삭제: 내 리뷰 삭제 버튼 (ReviewForm 요약 뷰 + ReviewList 목록)
- 관리자 페이지: 전체 리뷰 조회·삭제 패널
- 카드·상세: 맛탐 평균 별점 표시 (네이버 별점/리뷰수 숨김)
- DB: `reviews` 테이블 (id, restaurant_id, device_id, rating, comment, created_at)
- RLS: `reviews_open` 정책 (FOR ALL TO anon) + RLS 비활성화로 최종 해결
- Supabase 스키마 캐시 이슈: `NOTIFY pgrst, 'reload schema'`로 해결

#### 기타
- `visitCountStore` 모듈 레벨 변수로 페이지 전환 시에도 카운트 즉시 반영
- CLAUDE.md: resstaurantchuncheon/mattam Supabase 혼동 금지 규칙 추가

---

### ❌ 미완료 / 알려진 이슈

- `reviews` 테이블 RLS 정책이 복잡한 과정 끝에 비활성화로 우회 — 향후 정책 재설계 필요
- `device_visits` 테이블 PK를 UUID로 변경함 (재방문 중복 insert 허용) — 기존 데이터 영향 없음 확인 필요

---

### 📋 다음 작업 목록 (TODO)

#### TODO 1: 이미지 자동 정렬 전체 적용
- `scripts/auto-sort-images.mjs` 전체 437개 실제 실행
- DRY RUN 결과: 변경 대상 12개 확인 완료
- 실행 명령:
  ```bash
  ANTHROPIC_API_KEY="sk-ant-api03-Xuw..." node scripts/auto-sort-images.mjs
  ```
- 소요 시간: 약 60분 (437개 × 8초 간격)

#### TODO 2: Supabase를 맛탐 전용 프로젝트로 분리
- 현재 `resstaurantchuncheon` 프로젝트는 다른 용도와 공유 중일 수 있음
- 맛탐 전용 Supabase 프로젝트 신규 생성 후 데이터 마이그레이션
- 작업 순서:
  1. 새 Supabase 프로젝트 생성 (이름: `mattam` 또는 원하는 이름)
  2. 테이블 스키마 마이그레이션 (restaurants, categories, cities, device_visits, device_favorites, reviews)
  3. RLS 정책 재설정
  4. 데이터 이전 (pg_dump 또는 Supabase 대시보드 export)
  5. `.env` 및 Vercel 환경변수 교체
  6. 카카오 개발자 콘솔 도메인 재확인
- **주의**: 마이그레이션 완료 전까지 기존 `resstaurantchuncheon` 유지

#### TODO 3: reviews RLS 정책 재설계
- 현재 RLS 비활성화 상태 → 보안상 정책 복구 필요
- 원인 파악 후 올바른 anon 정책으로 재설정
- `NOTIFY pgrst, 'reload schema'` 실행 필수 (스키마 캐시 반영)

---

## 과거 트러블슈팅 기록

### Vercel에서 카테고리 필터·마커 클릭·식당 선택 미동작 (2026-03-22 해결)
**원인**:
1. Vercel 환경변수에 `VITE_SUPABASE_PUBLISHABLE_KEY` 미설정 → Supabase 쿼리 실패
2. Supabase RLS 정책 미설정 → anon 역할로 테이블 read 불가
3. 구 서비스 워커(`chuncheon-v1`)가 stale JS 캐시 서빙

**해결**:
1. Vercel 환경변수에 anon key 추가
2. 각 테이블에 anon read RLS 정책 추가
3. `public/sw.js` → `mattam-v2` 버전으로 교체, 전체 캐시 삭제로 변경
4. `vite.config.ts`에서 Supabase `StaleWhileRevalidate` 캐시 제거
5. `index.html`에 React 로드 전 SW/캐시 정리 인라인 스크립트 추가
