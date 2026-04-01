/**
 * add-city-pipeline.mjs
 *
 * 새 도시 맛집 데이터를 수집·검증·이미지·DB 삽입까지 한 번에 처리합니다.
 *
 * ── 파이프라인 순서 ──────────────────────────────────────────────────────────
 *   Phase 1. 카카오 로컬 API로 식당 목록 수집
 *   Phase 2. 식당명 + 주소 일치 여부 확인 (카카오 재검색)
 *            └ 불일치 → 주소로 재검색 → 폐업 / 명칭변경 판별
 *   Phase 3. 전화번호·좌표·주소 정합성 검증 (플래그 처리)
 *   Phase 4. Google Places로 영업시간 수집
 *   Phase 5. Google Places / 카카오 이미지 수집 (최대 5장)
 *   Phase 6. Claude Vision으로 음식 사진만 필터링
 *   Phase 7. 카테고리 복사 (춘천 → 새 도시)
 *   Phase 8. Supabase DB 삽입 (춘천과 동일한 스키마)
 *
 * ── 사용법 ──────────────────────────────────────────────────────────────────
 *   CITY=wonju CITY_NAME=원주 node scripts/add-city-pipeline.mjs
 *
 * ── 환경변수 ────────────────────────────────────────────────────────────────
 *   필수:
 *     CITY              city_id (영문 소문자, 예: wonju / gangneung)
 *     CITY_NAME         도시 한글명 (카카오 검색 힌트, 예: 원주)
 *     KAKAO_REST_API_KEY  카카오 REST API 키
 *     GOOGLE_PLACES_API_KEY
 *     ANTHROPIC_API_KEY
 *
 *   선택:
 *     CATEGORIES        수집할 카테고리 (기본값 아래 참고)
 *     KEYWORDS          추가 키워드 (쉼표 구분, 예: "막국수,닭갈비")
 *     MAX_PER_QUERY     카테고리당 최대 수집 수 (기본 45)
 *     SKIP_PHASES       건너뛸 Phase 번호 (기본: "5,6" — 이미지는 어드민에서 수동 작업)
 *     DRY_RUN=1         DB·Storage 변경 없이 미리보기
 *     DELAY_MS=1500     요청 간 딜레이 ms (기본 1500)
 *     LAT               도시 중심 위도 (기본: 카카오 geocode 자동)
 *     LNG               도시 중심 경도
 *     RADIUS            검색 반경 m (기본 15000)
 *
 * ── 실행 예시 ────────────────────────────────────────────────────────────────
 *   # 기본 실행 (이미지 스킵 — 이미지는 어드민에서 수동 작업)
 *   CITY=wonju CITY_NAME=원주 node scripts/add-city-pipeline.mjs
 *
 *   # 이미지까지 포함해서 실행하려면
 *   SKIP_PHASES="" CITY=wonju CITY_NAME=원주 node scripts/add-city-pipeline.mjs
 *
 *   # 미리보기
 *   DRY_RUN=1 CITY=wonju CITY_NAME=원주 node scripts/add-city-pipeline.mjs
 *
 *   # 추가 키워드 포함
 *   KEYWORDS=막국수,닭갈비 CITY=chuncheon CITY_NAME=춘천 node scripts/add-city-pipeline.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── .env 파싱 ────────────────────────────────────────────────────────────────

function parseEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = parseEnvFile(resolve(ROOT, ".env.local"));
const envBase = parseEnvFile(resolve(ROOT, ".env"));
const env = { ...envBase, ...envLocal, ...process.env };

// ── 설정 ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://cblckdcrsotqynngblyb.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8";

const KAKAO_KEY       = env.KAKAO_REST_API_KEY;
const GOOGLE_KEY      = env.GOOGLE_PLACES_API_KEY;
const ANTHROPIC_KEY   = env.ANTHROPIC_API_KEY;
const CITY            = env.CITY;
const CITY_NAME       = env.CITY_NAME;
const DRY_RUN         = env.DRY_RUN === "1";
const DELAY_MS        = parseInt(env.DELAY_MS || "1500");
const MAX_PER_QUERY   = parseInt(env.MAX_PER_QUERY || "45");
const RADIUS          = parseInt(env.RADIUS || "15000");
const SKIP_PHASES     = new Set((env.SKIP_PHASES ?? "5,6").split(",").map(s => s.trim()).filter(Boolean));

// 필수값 체크
const missing = [];
if (!CITY)         missing.push("CITY");
if (!CITY_NAME)    missing.push("CITY_NAME");
if (!KAKAO_KEY)    missing.push("KAKAO_REST_API_KEY");
if (!GOOGLE_KEY)   missing.push("GOOGLE_PLACES_API_KEY");
if (!ANTHROPIC_KEY) missing.push("ANTHROPIC_API_KEY");
if (missing.length) {
  console.error(`❌ 필수 환경변수가 없습니다: ${missing.join(", ")}`);
  console.error(`사용법: CITY=wonju CITY_NAME=원주 node scripts/add-city-pipeline.mjs`);
  process.exit(1);
}

// 수집 카테고리 (카카오 로컬 category_group_code: FD6 = 음식점)
const DEFAULT_CATEGORIES = [
  "중화요리", "국밥/탕류", "삼겹살", "국밥/찌개", "닭갈비",
  "이탈리안", "기타", "카페", "분식", "막국수",
  "한우", "일식", "칼국수", "돈까스", "베이커리",
  "술집", "돼지갈비", "샤브샤브", "초밥", "갈비탕",
  "보쌈/족발", "삼계탕", "생선구이", "조개구이", "통닭",
  "감자탕", "수제버거",
];
const EXTRA_KEYWORDS = env.KEYWORDS
  ? env.KEYWORDS.split(",").map(s => s.trim()).filter(Boolean)
  : [];
const ALL_QUERIES = [...DEFAULT_CATEGORIES, ...EXTRA_KEYWORDS];

// 카카오 카테고리 코드 매핑
const CATEGORY_MAP = {
  "한식": "한식",
  "일식": "일식",
  "중식": "중식",
  "양식": "양식",
  "카페": "카페,디저트",
  "분식": "분식",
  "치킨": "치킨",
  "술집": "술집",
  "해산물": "해산물",
  "고기": "고기",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 공통 유틸 ─────────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function generateId(name, address) {
  const base = `${name}-${address}`.replace(/[^가-힣a-z0-9]/g, "").slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

// ⚠️  절대 금지: city_id='chuncheon' 데이터 INSERT/UPDATE/DELETE 금지
//              춘천 restaurants, categories 테이블 데이터 수정 금지
//              아래 함수는 읽기(SELECT) 전용 — 절대 수정하지 말 것
async function generateRestaurantId(category) {
  // 카테고리 prefix 가져오기 (춘천 기준 — 읽기만 함, 수정 없음)
  const cats = await sbGet("categories", {
    city_id: `eq.chuncheon`,
    id: `eq.${category}`,
  });
  const prefix = cats[0]?.id_prefix ?? "xx";

  // 전체 DB에서 해당 prefix 최대 번호 조회 (도시 무관, 읽기만)
  const existing = await sbGet("restaurants", {
    select: "id",
    id: `like.${prefix}*`,
  });
  const maxNum = (existing ?? []).reduce((max, r) => {
    const m = r.id.match(new RegExp(`^${prefix}(\\d+)$`));
    return m ? Math.max(max, parseInt(m[1])) : max;
  }, 0);

  return `${prefix}${String(maxNum + 1).padStart(2, "0")}`;
}

function nameSimilar(a, b) {
  const clean = (s) => s.toLowerCase().replace(/\s/g, "");
  const ca = clean(a), cb = clean(b);
  return ca.includes(cb) || cb.includes(ca) || ca.slice(0, 3) === cb.slice(0, 3);
}

function nameMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/\s/g, "").replace(/[()（）]/g, "");
  const ca = clean(a), cb = clean(b);
  return ca === cb ||
    ca.includes(cb) ||
    cb.includes(ca) ||
    ca.slice(0, 4) === cb.slice(0, 4);
}

function addressMatch(a, b) {
  const extractCore = addr => {
    const match = addr?.match(/(\S+(?:로|길|동|읍|면)\s*\d+(?:-\d+)?)/);
    return match ? match[1].replace(/\s/g, "") : addr?.slice(-10) ?? "";
  };
  const ca = extractCore(a), cb = extractCore(b);
  return ca && cb && (ca.includes(cb) || cb.includes(ca));
}

// ── Supabase 헬퍼 ────────────────────────────────────────────────────────────

const SB_HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function sbGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`Supabase GET → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbInsert(rows) {
  const url = `${SUPABASE_URL}/rest/v1/restaurants`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase INSERT → ${res.status}: ${await res.text()}`);
}

async function sbPatch(id, body) {
  const url = `${SUPABASE_URL}/rest/v1/restaurants?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH → ${res.status}: ${await res.text()}`);
}

async function uploadToStorage(path, buf, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/restaurant-images/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!res.ok) throw new Error(`Storage upload → ${res.status}: ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/restaurant-images/${path}`;
}

async function deleteFromStorage(imageUrl) {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/restaurant-images/`;
  if (!imageUrl?.startsWith(prefix)) return;
  const filePath = imageUrl.slice(prefix.length);
  await fetch(`${SUPABASE_URL}/storage/v1/object/restaurant-images/${filePath}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
}

// ── 카카오 API 헬퍼 ──────────────────────────────────────────────────────────

async function kakaoGeocode(cityName) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", cityName);
  url.searchParams.set("size", "1");
  const res = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) return null;
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
}

async function kakaoSearchKeyword(query, x, y, radius, page = 1) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", `${CITY_NAME} ${query}`);
  url.searchParams.set("category_group_code", "FD6");
  url.searchParams.set("x", String(x));
  url.searchParams.set("y", String(y));
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("size", "15");
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "accuracy");
  const res = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!res.ok) throw new Error(`카카오 키워드 검색 ${res.status}`);
  return res.json();
}

// 주소로 카카오 로컬 재검색 → place 반환
async function kakaoSearchByAddress(address, lat, lng) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);
  url.searchParams.set("size", "1");
  const res = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.documents?.[0] ?? null;
}

// 좌표 반경으로 장소 이름 재확인
async function kakaoVerifyByCoords(name, lat, lng) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", name);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("radius", "200");
  url.searchParams.set("size", "3");
  const res = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.documents ?? [];
}

// ── Google Places 헬퍼 ───────────────────────────────────────────────────────

const DAY_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function parseGoogleHours(openingHours) {
  if (!openingHours?.periods?.length) return { opening_hours: null, closed_days: null };
  const periods = openingHours.periods;
  if (periods.length === 1 && periods[0].open?.time === "0000" && !periods[0].close) {
    return { opening_hours: "00:00~24:00", closed_days: null };
  }
  const fmtTime = (t) => (t ? `${t.slice(0, 2)}:${t.slice(2)}` : null);
  const weekdayPeriods = periods.filter((p) => p.open?.day >= 1 && p.open?.day <= 5);
  const rep = weekdayPeriods[0] || periods[0];
  const opening_hours =
    fmtTime(rep?.open?.time) && fmtTime(rep?.close?.time)
      ? `${fmtTime(rep.open.time)}~${fmtTime(rep.close.time)}`
      : null;
  const openDays = new Set(periods.map((p) => p.open?.day).filter((d) => d != null));
  const closedDays = [0,1,2,3,4,5,6].filter((d) => !openDays.has(d));
  let closed_days = null;
  if (closedDays.length) {
    const hasSat = closedDays.includes(6), hasSun = closedDays.includes(0);
    if (hasSat && hasSun && closedDays.length === 2) {
      closed_days = "주말";
    } else if (hasSat && hasSun) {
      const extra = closedDays.filter((d) => d !== 0 && d !== 6).map((d) => DAY_KO[d]);
      closed_days = extra.length ? `주말, ${extra.join(", ")}` : "주말";
    } else {
      closed_days = closedDays.map((d) => DAY_KO[d]).join(", ");
    }
  }
  return { opening_hours, closed_days };
}

async function googleFindPlace(name, lat, lng, byAddress = false) {
  const query = byAddress ? `${name}` : `${name} ${CITY_NAME}`;
  const url = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  url.searchParams.set("input", query);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "name,place_id,formatted_address");
  url.searchParams.set("locationbias", byAddress
    ? `circle:500@${lat},${lng}`
    : `circle:30000@${lat},${lng}`
  );
  url.searchParams.set("language", "ko");
  url.searchParams.set("key", GOOGLE_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status === "OVER_QUERY_LIMIT") throw new Error("OVER_QUERY_LIMIT");
  return data.candidates?.[0] ?? null;
}

async function googlePlaceDetails(placeId) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,formatted_phone_number,price_level,photos,opening_hours");
  url.searchParams.set("language", "ko");
  url.searchParams.set("key", GOOGLE_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status === "OVER_QUERY_LIMIT") throw new Error("OVER_QUERY_LIMIT");
  return data.result ?? null;
}

async function googleDownloadPhoto(photoReference) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.includes("image")) return null;
  const buf = await res.arrayBuffer();
  return { buf, contentType };
}

// ── 카카오 이미지 검색 ───────────────────────────────────────────────────────

async function kakaoImageSearch(query, size = 8) {
  const url = new URL("https://dapi.kakao.com/v2/search/image");
  url.searchParams.set("query", query);
  url.searchParams.set("sort", "accuracy");
  url.searchParams.set("size", String(size));
  const res = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents ?? [];
}

async function downloadImage(imageUrl) {
  try {
    const res = await fetch(imageUrl, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.includes("image")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 5000) return null;
    return { buf, contentType: contentType.split(";")[0] };
  } catch {
    return null;
  }
}

// ── Claude Vision: 음식 사진 판별 ────────────────────────────────────────────

async function detectFoodIndices(imageUrls) {
  const content = [];
  for (let i = 0; i < imageUrls.length; i++) {
    content.push({ type: "text", text: `[이미지 ${i}]` });
    content.push({ type: "image", source: { type: "url", url: imageUrls[i] } });
  }
  content.push({
    type: "text",
    text: `위 ${imageUrls.length}장은 식당 관련 사진들입니다.
이 중 음식/메뉴/요리가 주인공인 사진의 번호만 골라주세요.
- 포함: 음식, 메뉴, 요리, 음료, 디저트가 가까이 찍힌 사진
- 제외: 식당 외관, 건물, 간판, 실내 인테리어, 사람, 풍경, 텍스트만 있는 사진
음식 사진이 하나도 없으면 "없음"이라고만 답하세요.
있으면 번호만 콤마로 구분해서 답하세요. 예: 0,2`,
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 30,
        messages: [{ role: "user", content }],
      }),
    });
    if (res.status === 429) {
      const waitSec = attempt * 30;
      console.log(`  ⏳ Claude rate limit, ${waitSec}초 대기 (${attempt}/3)...`);
      await sleep(waitSec * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`Claude API → ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").trim();
    if (text === "없음" || text === "") return [];
    return text.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 0 && n < imageUrls.length);
  }
  throw new Error("Claude API rate limit 초과");
}

// ── 이미 존재하는 식당 ID 목록 로드 ─────────────────────────────────────────

async function loadExistingIds() {
  const rows = await sbGet("restaurants", {
    select: "id",
    city_id: `eq.${CITY}`,
  });
  return new Set(rows.map((r) => r.id));
}

// ── Phase 0: 도시 확인 및 등록 ────────────────────────────────────────────────

async function phase0_ensureCity(center) {
  console.log("\n━━━ Phase 0: 도시 확인 및 등록 ━━━");
  const existing = await sbGet("cities", { id: `eq.${CITY}` });
  if (existing.length > 0) {
    console.log(`  이미 등록된 도시: ${existing[0].name} (is_active: ${existing[0].is_active})`);
    return;
  }
  if (DRY_RUN) {
    console.log(`  [DRY RUN] cities 테이블에 ${CITY_NAME} 추가 예정`);
    return;
  }
  const cityRow = {
    id: CITY, name: CITY_NAME,
    description: `${CITY_NAME} 맛집 지도`,
    lat: center.lat, lng: center.lng, zoom: 13,
    bounds_sw_lat: center.lat - 0.15, bounds_sw_lng: center.lng - 0.2,
    bounds_ne_lat: center.lat + 0.15, bounds_ne_lng: center.lng + 0.2,
    is_active: false, coming_soon: true, sort_order: 99,
  };
  const url = `${SUPABASE_URL}/rest/v1/cities`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(cityRow),
  });
  if (!res.ok) throw new Error(`cities insert 실패: ${await res.text()}`);
  console.log(`  ✅ ${CITY_NAME} (${CITY}) 도시 등록 완료`);
  console.log(`  ℹ️  is_active=false, coming_soon=true 로 설정됨`);
  console.log(`  ℹ️  파이프라인 완료 후 어드민에서 is_active=true 로 변경하세요`);
}

// ── Phase 1: 카카오 수집 ──────────────────────────────────────────────────────

async function phase1_collect(center) {
  console.log("\n━━━ Phase 1: 카카오 수집 ━━━");

  const collected = new Map(); // place_id → raw 데이터

  for (const query of ALL_QUERIES) {
    console.log(`  🔍 "${CITY_NAME} ${query}" 검색 중...`);
    let page = 1, total = 0;

    while (total < MAX_PER_QUERY) {
      let data;
      try {
        data = await kakaoSearchKeyword(query, center.lng, center.lat, RADIUS, page);
      } catch (e) {
        console.log(`    ⚠️  API 오류: ${e.message}`);
        break;
      }

      const docs = data.documents ?? [];
      if (!docs.length) break;

      for (const doc of docs) {
        if (!collected.has(doc.id)) {
          collected.set(doc.id, {
            kakao_id:   doc.id,
            name:       doc.place_name,
            address:    doc.road_address_name || doc.address_name,
            phone:      doc.phone || null,
            lat:        parseFloat(doc.y),
            lng:        parseFloat(doc.x),
            category:   doc.category_name?.split(" > ").pop() ?? query,
            category_raw: doc.category_name ?? "",
            url:        doc.place_url ?? null,
          });
        }
        total++;
      }

      const meta = data.meta;
      if (meta?.is_end || page >= 3) break;
      page++;
      await sleep(300);
    }

    console.log(`    → ${total}건 스캔, 누적 ${collected.size}개 (중복 제외)`);
    await sleep(500);
  }

  console.log(`\n  ✅ Phase 1 완료: 총 ${collected.size}개 수집`);
  return [...collected.values()];
}

// ── Phase 2: 식당명 + 주소 일치 검증 ─────────────────────────────────────────

async function phase2_verify(restaurants) {
  console.log("\n━━━ Phase 2: 식당명·주소 일치 검증 (강화) ━━━");

  const verified = [];
  const failed = [];

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const prefix = `  [${String(i+1).padStart(3," ")}/${restaurants.length}] ${r.name}`;

    try {
      // 카카오 로컬 검색: 식당명 + 도시명
      const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
      url.searchParams.set("query", `${r.name} ${CITY_NAME}`);
      url.searchParams.set("category_group_code", "FD6");
      url.searchParams.set("x", String(r.lng));
      url.searchParams.set("y", String(r.lat));
      url.searchParams.set("radius", "500");
      url.searchParams.set("size", "5");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }
      });
      const data = await res.json();
      const docs = data.documents ?? [];

      if (docs.length === 0) {
        console.log(`${prefix} → ⛔ 검색 결과 없음 (폐업 의심) 제외`);
        failed.push({ ...r, _reason: "검색 결과 없음" });
        await sleep(200);
        continue;
      }

      // 이름 + 주소 둘 다 일치하는 결과 찾기
      const match = docs.find(doc =>
        nameMatch(r.name, doc.place_name) &&
        addressMatch(r.address, doc.road_address_name || doc.address_name)
      );

      if (!match) {
        // 이름만 일치하는 결과 찾기 (주소 변경 가능성)
        const nameOnly = docs.find(doc => nameMatch(r.name, doc.place_name));
        if (nameOnly) {
          // 이름은 맞는데 주소가 다름 → 이전했을 가능성, 카카오 데이터로 업데이트
          console.log(`${prefix} → ⚠️  주소 불일치, 카카오 주소로 업데이트: ${nameOnly.road_address_name}`);
          r.address = nameOnly.road_address_name || nameOnly.address_name || r.address;
          r.lat = parseFloat(nameOnly.y) || r.lat;
          r.lng = parseFloat(nameOnly.x) || r.lng;
          r.phone = nameOnly.phone || r.phone;
          verified.push(r);
        } else {
          console.log(`${prefix} → ⛔ 이름+주소 불일치 제외 (카카오: ${docs[0]?.place_name})`);
          failed.push({ ...r, _reason: `불일치: 카카오=${docs[0]?.place_name}` });
        }
      } else {
        // 완전 일치 → 카카오 데이터로 최신화
        r.name = match.place_name;
        r.address = match.road_address_name || match.address_name || r.address;
        r.lat = parseFloat(match.y) || r.lat;
        r.lng = parseFloat(match.x) || r.lng;
        r.phone = match.phone || r.phone;
        console.log(`${prefix} → ✅ 일치`);
        verified.push(r);
      }
    } catch (err) {
      console.log(`${prefix} → ⚠️  검증 오류: ${err.message} (통과)`);
      verified.push(r);
    }

    await sleep(200);
  }

  console.log(`\n  ✅ Phase 2 완료`);
  console.log(`    통과: ${verified.length}개 / 제외: ${failed.length}개`);

  if (failed.length > 0) {
    console.log(`\n  ⛔ 제외된 식당 목록:`);
    failed.forEach(r => console.log(`    - ${r.name} (${r.address}) → ${r._reason}`));
  }

  return verified;
}

// ── Phase 3: 전화번호·좌표·주소 정합성 검증 ──────────────────────────────────

async function phase3_validate(restaurants) {
  console.log("\n━━━ Phase 3: 정합성 검증 ━━━");

  let issues = 0;
  for (const r of restaurants) {
    const flags = [];

    // 좌표 범위 체크 (대한민국 범위)
    if (r.lat < 33 || r.lat > 38.6 || r.lng < 124 || r.lng > 132) {
      flags.push("좌표 범위 이상");
    }

    // 전화번호 형식 체크
    if (r.phone && !/^0\d{1,2}-\d{3,4}-\d{4}$/.test(r.phone.replace(/\s/g, ""))) {
      flags.push("전화번호 형식 이상");
    }

    // 주소에 도시명 포함 여부
    if (r.address && !r.address.includes(CITY_NAME) && !r.address.includes(CITY_NAME.slice(0, 2))) {
      flags.push(`주소에 "${CITY_NAME}" 미포함`);
    }

    if (flags.length) {
      r.needs_review = true;
      console.log(`  ⚑  ${r.name}: ${flags.join(", ")}`);
      issues++;
    }
  }

  console.log(`\n  ✅ Phase 3 완료: ${issues}개 플래그 처리됨`);
  return restaurants;
}

// ── Phase 4: Google Places 영업시간 수집 ─────────────────────────────────────

async function phase4_openingHours(restaurants) {
  console.log("\n━━━ Phase 4: 영업시간 수집 (Google Places) ━━━");

  let cntOk = 0, cntFail = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const prefix = `  [${String(i+1).padStart(3," ")}/${restaurants.length}] ${r.name}`;

    try {
      // 1차: 이름으로 검색
      let candidate = await googleFindPlace(r.name, r.lat, r.lng);
      await sleep(300);

      // 이름 불일치 시 주소로 재검색
      if (!candidate || !nameSimilar(r.name, candidate.name ?? "")) {
        candidate = await googleFindPlace(r.address, r.lat, r.lng, true);
        await sleep(300);
      }

      if (!candidate?.place_id) {
        console.log(`${prefix} → 검색 실패`);
        cntFail++;
        await sleep(DELAY_MS);
        continue;
      }

      const detail = await googlePlaceDetails(candidate.place_id);
      await sleep(300);

      if (!detail) {
        console.log(`${prefix} → 상세 정보 없음`);
        cntFail++;
        await sleep(DELAY_MS);
        continue;
      }

      const { opening_hours, closed_days } = parseGoogleHours(detail.opening_hours);
      if (opening_hours) {
        r.opening_hours = opening_hours;
        r.closed_days   = closed_days;
        // 전화번호 보완
        if (!r.phone && detail.formatted_phone_number) {
          r.phone = detail.formatted_phone_number;
        }
        // 가격대 보완
        if (!r.price_range && detail.price_level) {
          const map = { 1: "₩", 2: "₩₩", 3: "₩₩₩", 4: "₩₩₩₩" };
          r.price_range = map[detail.price_level] ?? null;
        }
        // Google Photos 레퍼런스 저장 (Phase 5에서 사용)
        r._googlePhotos = detail.photos ?? [];
        console.log(`${prefix} → ${opening_hours}${closed_days ? ` / 휴무: ${closed_days}` : ""}`);
        cntOk++;
      } else {
        console.log(`${prefix} → 영업시간 정보 없음`);
        r._googlePhotos = detail.photos ?? [];
        cntFail++;
      }
    } catch (err) {
      if (err.message === "OVER_QUERY_LIMIT") {
        console.error(`  ⚠️  API 할당량 초과! 60초 대기...`);
        await sleep(60000);
        i--;
        continue;
      }
      console.log(`${prefix} → 오류: ${err.message}`);
      cntFail++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n  ✅ Phase 4 완료: 성공 ${cntOk}개 / 실패 ${cntFail}개`);
  return restaurants;
}

// ── Phase 5: 이미지 수집 (Google → 카카오 폴백) ───────────────────────────────

async function phase5_images(restaurants) {
  console.log("\n━━━ Phase 5: 이미지 수집 ━━━");

  let cntOk = 0, cntFail = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const prefix = `  [${String(i+1).padStart(3," ")}/${restaurants.length}] ${r.name}`;
    const imageUrls = [];

    // ── Google Photos 시도 ───────────────────────────────────────────────────
    const googlePhotos = r._googlePhotos ?? [];
    let photoIdx = 0;
    while (imageUrls.length < 5 && photoIdx < googlePhotos.length) {
      const photo = googlePhotos[photoIdx++];
      if (DRY_RUN) {
        imageUrls.push(`[DRY_RUN] google_${photoIdx}.jpg`);
        continue;
      }
      const downloaded = await googleDownloadPhoto(photo.photo_reference);
      if (!downloaded) continue;
      const ext = downloaded.contentType.includes("png") ? "png" : "jpg";
      const fileIdx = imageUrls.length;
      const filePath = fileIdx === 0 ? `${r.id}.${ext}` : `${r.id}_${fileIdx}.${ext}`;
      try {
        const publicUrl = await uploadToStorage(filePath, downloaded.buf, downloaded.contentType);
        imageUrls.push(publicUrl);
        process.stdout.write(`    📸 구글: ${filePath}\n`);
      } catch {}
    }

    // ── 카카오 이미지로 보완 ────────────────────────────────────────────────
    if (imageUrls.length < 3) {
      const queries = [
        `${r.name} ${CITY_NAME} 맛집`,
        `${r.name} ${CITY_NAME}`,
        r.name,
      ];
      let docs = [];
      for (const q of queries) {
        docs = await kakaoImageSearch(q, 8);
        if (docs.length) break;
        await sleep(200);
      }

      for (const doc of docs) {
        if (imageUrls.length >= 5) break;
        if (DRY_RUN) {
          imageUrls.push(`[DRY_RUN] kakao_${imageUrls.length}.jpg`);
          continue;
        }
        const downloaded = await downloadImage(doc.image_url);
        if (!downloaded) continue;
        const ext = downloaded.contentType.includes("png") ? "png" : "jpg";
        const fileIdx = imageUrls.length;
        const filePath = fileIdx === 0 ? `${r.id}.${ext}` : `${r.id}_${fileIdx}.${ext}`;
        try {
          const publicUrl = await uploadToStorage(filePath, downloaded.buf, downloaded.contentType);
          imageUrls.push(publicUrl);
          process.stdout.write(`    📸 카카오: ${filePath}\n`);
        } catch {}
      }
    }

    if (imageUrls.length === 0) {
      console.log(`${prefix} → 이미지 없음`);
      cntFail++;
    } else {
      r.image_url    = imageUrls[0];
      r.extra_images = imageUrls.length > 1 ? imageUrls.slice(1) : null;
      console.log(`${prefix} → ${imageUrls.length}장 수집`);
      cntOk++;
    }

    delete r._googlePhotos;
    await sleep(500);
  }

  console.log(`\n  ✅ Phase 5 완료: 이미지 있음 ${cntOk}개 / 없음 ${cntFail}개`);
  return restaurants;
}

// ── Phase 6: Claude Vision 음식 사진 필터링 ──────────────────────────────────

async function phase6_filterFoodImages(restaurants) {
  console.log("\n━━━ Phase 6: 음식 사진 필터링 (Claude Vision) ━━━");

  let cntAllGood = 0, cntUpdated = 0, cntAllRemoved = 0, cntErrors = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const allImages = [r.image_url, ...(r.extra_images ?? [])].filter(
      (u) => u && !u.startsWith("[DRY_RUN]")
    );
    if (!allImages.length) continue;

    const prefix = `  [${String(i+1).padStart(3," ")}/${restaurants.length}] ${r.name} (${allImages.length}장)`;

    try {
      const foodIndices = await detectFoodIndices(allImages);
      const removeIndices = allImages.map((_, idx) => idx).filter((idx) => !foodIndices.includes(idx));

      if (removeIndices.length === 0) {
        console.log(`${prefix} → 전부 음식 사진 ✅`);
        cntAllGood++;
      } else if (foodIndices.length === 0) {
        console.log(`${prefix} → 음식 사진 없음, 전체 삭제 ⚠️`);
        if (!DRY_RUN) {
          for (const url of allImages) await deleteFromStorage(url);
        }
        r.image_url    = null;
        r.extra_images = null;
        cntAllRemoved++;
      } else {
        const keepUrls   = foodIndices.map((idx) => allImages[idx]);
        const removeUrls = removeIndices.map((idx) => allImages[idx]);
        console.log(`${prefix} → 음식 ${foodIndices.length}장 유지, 비음식 ${removeIndices.length}장 삭제`);
        if (!DRY_RUN) {
          for (const url of removeUrls) await deleteFromStorage(url);
        }
        r.image_url    = keepUrls[0];
        r.extra_images = keepUrls.length > 1 ? keepUrls.slice(1) : null;
        cntUpdated++;
      }
    } catch (err) {
      console.error(`${prefix} → 오류: ${err.message}`);
      cntErrors++;
    }

    await sleep(8000); // Claude Vision rate limit 준수
  }

  console.log(`\n  ✅ Phase 6 완료: 전부OK ${cntAllGood} / 일부삭제 ${cntUpdated} / 전체삭제 ${cntAllRemoved} / 오류 ${cntErrors}`);
  return restaurants;
}

// ── Phase 7: 카테고리 복사 ───────────────────────────────────────────────────

async function phase7_copyCategories() {
  console.log("\n━━━ Phase 7: 카테고리 복사 (춘천 → 새 도시) ━━━");

  // 이미 해당 도시 카테고리가 있으면 건너뜀
  const existing = await sbGet("categories", { city_id: `eq.${CITY}` });
  if (existing.length > 0) {
    console.log(`  이미 ${existing.length}개 카테고리 존재 → 건너뜀`);
    return;
  }

  // 춘천 카테고리 조회
  const chuncheonCats = await sbGet("categories", { city_id: "eq.chuncheon" });
  if (chuncheonCats.length === 0) {
    console.log("  ⚠️  춘천 카테고리를 찾을 수 없습니다");
    return;
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${chuncheonCats.length}개 카테고리 복사 예정`);
    chuncheonCats.forEach(c => console.log(`    - ${c.label} (${c.id})`));
    return;
  }

  // city_id만 새 도시로 바꿔서 insert
  const newCats = chuncheonCats.map(c => ({ ...c, city_id: CITY }));

  const url = `${SUPABASE_URL}/rest/v1/categories`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(newCats),
  });
  if (!res.ok) throw new Error(`카테고리 복사 실패: ${await res.text()}`);

  console.log(`  ✅ ${newCats.length}개 카테고리 복사 완료`);
  newCats.forEach(c => console.log(`    - ${c.label} (${c.id})`));
}

// ── Phase 8: Supabase DB 삽입 ────────────────────────────────────────────────

async function phase8_insert(restaurants, existingIds) {
  console.log("\n━━━ Phase 8: DB 삽입 ━━━");

  // 이미 DB에 있는 항목 제외 (재실행 안전)
  const toInsert = restaurants.filter((r) => !existingIds.has(r.id));
  const skipped  = restaurants.length - toInsert.length;

  console.log(`  삽입 대상: ${toInsert.length}개 / 이미 존재(건너뜀): ${skipped}개`);

  if (toInsert.length === 0) {
    console.log("  삽입할 항목이 없습니다.");
    return;
  }

  // restaurants 테이블 스키마에 맞춰 정제 (ID는 카테고리 prefix 기반 생성)
  const rows = await Promise.all(toInsert.map(async (r) => ({
    id:             r.id ?? await generateRestaurantId(r.category),
    name:           r.name,
    category:       r.category ?? "기타",
    address:        r.address ?? "",
    phone:          r.phone ?? null,
    rating:         r.rating ?? 0,
    review_count:   r.review_count ?? 0,
    lat:            r.lat,
    lng:            r.lng,
    price_range:    r.price_range ?? null,
    tags:           r.tags ?? null,
    description:    r.description ?? null,
    image_url:      r.image_url ?? null,
    extra_images:   r.extra_images ?? null,
    opening_hours:  r.opening_hours ?? null,
    closed_days:    r.closed_days ?? null,
    slug:           r.slug ?? slugify(r.name),
    city_id:        CITY,
    is_recommended: false,
    needs_review:   r.needs_review ?? false,
    is_hidden:      false,
    menu_items:     null,
    created_at:     new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  })));

  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${rows.length}개 삽입 예정`);
    console.log("  샘플 (첫 번째):", JSON.stringify(rows[0], null, 2));
    return;
  }

  // 50개씩 배치 삽입
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await sbInsert(batch);
    inserted += batch.length;
    console.log(`  ✅ ${inserted}/${rows.length}개 삽입 완료`);
  }

  console.log(`\n  🎉 Phase 8 완료: ${inserted}개 삽입`);
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log(`맛탐 새 도시 파이프라인`);
  console.log(`도시: ${CITY_NAME} (city_id: ${CITY})`);
  console.log(`DRY_RUN: ${DRY_RUN} / DELAY: ${DELAY_MS}ms / RADIUS: ${RADIUS}m`);
  console.log(`건너뛸 Phase: ${SKIP_PHASES.size ? [...SKIP_PHASES].join(",") : "없음"}`);
  console.log("═".repeat(60));

  // 도시 중심 좌표 확인
  let center;
  if (env.LAT && env.LNG) {
    center = { lat: parseFloat(env.LAT), lng: parseFloat(env.LNG) };
    console.log(`\n중심 좌표 (수동): ${center.lat}, ${center.lng}`);
  } else {
    console.log(`\n도시 중심 좌표 자동 조회: ${CITY_NAME}...`);
    center = await kakaoGeocode(CITY_NAME);
    if (!center) {
      console.error(`❌ "${CITY_NAME}" 좌표를 찾을 수 없습니다. LAT/LNG 환경변수로 직접 지정해주세요.`);
      process.exit(1);
    }
    console.log(`중심 좌표: ${center.lat}, ${center.lng}`);
  }

  // ── Phase 0: 도시 등록 ─────────────────────────────────────────────────────
  if (!SKIP_PHASES.has("0")) {
    await phase0_ensureCity(center);
  } else {
    console.log("\n━━━ Phase 0: 건너뜀 ━━━");
  }

  // 기존 DB 항목 로드
  const existingIds = await loadExistingIds();
  console.log(`\n기존 DB: ${CITY} 도시 ${existingIds.size}개 항목`);

  // ── Phase 1: 수집 ──────────────────────────────────────────────────────────
  let restaurants;
  if (!SKIP_PHASES.has("1")) {
    restaurants = await phase1_collect(center);
  } else {
    console.log("\n━━━ Phase 1: 건너뜀 ━━━");
    restaurants = [];
  }

  if (!restaurants.length) {
    console.log("\n❌ 수집된 식당이 없습니다.");
    return;
  }

  // slug 생성 (ID는 Phase 8에서 카테고리 prefix 기반으로 생성)
  restaurants = restaurants.map((r) => ({
    ...r,
    slug: r.slug ?? slugify(r.name),
  }));

  // 이미 DB에 있는 항목 제외 (Phase 2~6 처리량 줄이기)
  const newOnly = restaurants.filter((r) => !existingIds.has(r.id));
  console.log(`\n신규 항목: ${newOnly.length}개 (기존 ${restaurants.length - newOnly.length}개 제외)`);

  let targets = newOnly;

  // ── Phase 2: 검증 ──────────────────────────────────────────────────────────
  if (!SKIP_PHASES.has("2")) {
    targets = await phase2_verify(targets);
  } else {
    console.log("\n━━━ Phase 2: 건너뜀 ━━━");
  }

  // ── Phase 3: 정합성 ────────────────────────────────────────────────────────
  if (!SKIP_PHASES.has("3")) {
    targets = await phase3_validate(targets);
  } else {
    console.log("\n━━━ Phase 3: 건너뜀 ━━━");
  }

  // ── Phase 4: 영업시간 ──────────────────────────────────────────────────────
  if (!SKIP_PHASES.has("4")) {
    targets = await phase4_openingHours(targets);
  } else {
    console.log("\n━━━ Phase 4: 건너뜀 ━━━");
  }

  // ── Phase 5: 이미지 수집 ───────────────────────────────────────────────────
  if (!SKIP_PHASES.has("5")) {
    targets = await phase5_images(targets);
  } else {
    console.log("\n━━━ Phase 5: 건너뜀 ━━━");
  }

  // ── Phase 6: 음식 사진 필터링 ──────────────────────────────────────────────
  if (!SKIP_PHASES.has("6")) {
    targets = await phase6_filterFoodImages(targets);
  } else {
    console.log("\n━━━ Phase 6: 건너뜀 ━━━");
  }

  // ── Phase 7: 카테고리 복사 ────────────────────────────────────────────────
  if (!SKIP_PHASES.has("7")) {
    await phase7_copyCategories();
  } else {
    console.log("\n━━━ Phase 7: 건너뜀 ━━━");
  }

  // ── Phase 8: DB 삽입 ───────────────────────────────────────────────────────
  if (!SKIP_PHASES.has("8")) {
    await phase8_insert(targets, existingIds);
  } else {
    console.log("\n━━━ Phase 8: 건너뜀 ━━━");
  }

  // ── 최종 요약 ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("🎉 파이프라인 완료!");
  console.log(`도시: ${CITY_NAME} (${CITY})`);
  console.log(`처리된 식당: ${targets.length}개`);
  console.log(`이미지 있음: ${targets.filter(r => r.image_url).length}개`);
  console.log(`영업시간 있음: ${targets.filter(r => r.opening_hours).length}개`);
  console.log(`검토 필요: ${targets.filter(r => r.needs_review).length}개`);
  if (DRY_RUN) console.log("※ DRY RUN 모드 - 실제 DB·Storage 변경 없음");
  console.log("═".repeat(60));

  console.log("\n다음 단계:");
  console.log(`  CITY=${CITY} node scripts/fetch-menus.mjs        # 메뉴 태그`);
  console.log(`  CITY=${CITY} node scripts/auto-sort-images.mjs   # 간판→대표 이미지 정렬`);
  console.log(`  어드민에서 ${CITY} 도시를 is_active=true 로 변경하면 앱에 표시됩니다.`);
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
