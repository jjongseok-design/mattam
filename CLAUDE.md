# 맛탐 프로젝트 — Claude 참고 문서

## 프로젝트 개요
도시별 맛집 지도 웹앱 (React + Vite + Supabase + Kakao Maps)
- **로컬 개발**: `localhost:8080` (Vite dev server)
- **프로덕션**: `mattam.vercel.app` (Vercel, GitHub 자동 배포)

---

## 작업 규칙 (반드시 준수)

1. **기존 기능 보호**: 현재 작동 중인 기능은 절대 건드리지 않는다. 요청받은 기능만 수정한다.
2. **작업 전 커밋**: 새 기능 추가나 수정 작업을 시작하기 전에 반드시 `git commit`으로 현재 상태를 저장한다.
3. **한 번에 하나**: 한 번에 하나의 기능만 수정한다. 관련 없는 개선·리팩토링을 함께 포함하지 않는다.
4. **로컬 검증**: 수정 후 반드시 `localhost:8080`에서 기존 기능이 그대로 작동하는지 확인한 뒤 커밋·배포한다.

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

## 다음 작업 목록

### TODO 1: 이미지 자동 정렬 전체 적용
- `scripts/auto-sort-images.mjs` 전체 437개 실제 실행
- DRY RUN 결과: 변경 대상 12개 확인 완료
- 실행 명령:
  ```bash
  ANTHROPIC_API_KEY="sk-ant-api03-Xuw..." node scripts/auto-sort-images.mjs
  ```
- 소요 시간: 약 60분 (437개 × 8초 간격)

### TODO 2: 방문 통계 기능 추가
- **식당 상세 페이지**: 방문자 N명 표시 (`device_visits` 테이블 집계)
- **관리자 페이지**: 식당별 방문 통계 열람 기능
- 관련 테이블: `device_visits` (이미 RLS anon read 정책 적용됨)
- 작업 전 반드시 git commit으로 현재 상태 저장 후 시작

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
