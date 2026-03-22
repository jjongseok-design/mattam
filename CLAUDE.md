# 맛탐 프로젝트 — Claude 참고 문서

## 프로젝트 개요
도시별 맛집 지도 웹앱 (React + Vite + Supabase + Kakao Maps)
- **로컬 개발**: `localhost:8080` (Vite dev server)
- **프로덕션**: `mattam.vercel.app` (Vercel, GitHub 자동 배포)

---

## 인프라 설정 (수동 구성 항목)

### Supabase
- **프로젝트명**: `resstaurantchuncheon`
- **환경변수**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
- **RLS 정책**: 아래 테이블에 `anon` 역할 read 허용 정책 추가됨
  - `restaurants`
  - `categories`
  - `cities`
  - `device_visits`
  - `device_favorites`

> **주의**: 새 테이블 추가 시 RLS 정책을 반드시 설정해야 Vercel에서 데이터가 조회됨.
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
