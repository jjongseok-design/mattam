/**
 * fetch-opening-hours.mjs
 *
 * 식당의 영업시간(opening_hours)과 휴무일(closed_days)을 자동 수집해 DB에 업데이트합니다.
 *
 * ⚠️  네이버 공개 검색 API(local.json)는 영업시간 데이터를 제공하지 않습니다.
 *     (반환 필드: 이름·주소·전화번호·좌표만 있음)
 *     이 스크립트는 영업시간을 지원하는 Google Places API를 사용합니다.
 *     GOOGLE_PLACES_API_KEY는 이미 Supabase 시크릿에 설정되어 있습니다.
 *     → 로컬 실행 전 .env 파일에 GOOGLE_PLACES_API_KEY=AIza... 한 줄 추가해주세요.
 *
 * 사용법:
 *   node scripts/fetch-opening-hours.mjs
 *
 * 옵션 (환경변수로 전달):
 *   DRY_RUN=1           DB 변경 없이 결과 미리보기
 *   LIMIT=20            처리할 식당 수 제한
 *   DELAY_MS=1200       요청 간 딜레이 ms (기본 1200 — 분당 50건 이하)
 *   SKIP_EXISTING=0     이미 영업시간 있는 식당도 덮어쓰기 (기본: 건너뜀)
 *   CITY=chuncheon      특정 city_id만 처리
 *
 * 실행 예시:
 *   DRY_RUN=1 LIMIT=10 node scripts/fetch-opening-hours.mjs
 *   node scripts/fetch-opening-hours.mjs
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

const GOOGLE_KEY = env.GOOGLE_PLACES_API_KEY;
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const DELAY_MS = parseInt(env.DELAY_MS || "1200");
const SKIP_EXISTING = env.SKIP_EXISTING !== "0"; // 기본값: 이미 있으면 건너뜀
const CITY = env.CITY || null;

if (!GOOGLE_KEY) {
  console.error("ERROR: GOOGLE_PLACES_API_KEY를 찾을 수 없습니다.");
  console.error(".env 파일에 아래 줄을 추가해주세요:");
  console.error("  GOOGLE_PLACES_API_KEY=AIzaSy...");
  console.error("");
  console.error("키는 Supabase 대시보드 > Project Settings > Edge Functions > Secrets 에서 확인하거나");
  console.error("Google Cloud Console > APIs & Services > Credentials 에서 가져오세요.");
  process.exit(1);
}

// ── Supabase REST 헬퍼 ───────────────────────────────────────────────────────

const SB_HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function sbGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}`);
  return res.json();
}

async function sbPatch(path, filter, body) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH ${path} → ${res.status}: ${text}`);
  }
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DAY_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

/**
 * Google Places opening_hours.periods → { opening_hours, closed_days }
 * - opening_hours: "HH:MM~HH:MM" (평일 대표 시간)
 * - closed_days: "월요일" / "주말" / "화요일, 수요일" 등
 */
function parseGoogleHours(openingHours) {
  if (!openingHours?.periods?.length) return { opening_hours: null, closed_days: null };

  const periods = openingHours.periods;

  // 24시간 영업 체크 (open 0000, close 없음)
  if (periods.length === 1 && periods[0].open?.time === "0000" && !periods[0].close) {
    return { opening_hours: "00:00~24:00", closed_days: null };
  }

  const fmtTime = (t) => (t ? `${t.slice(0, 2)}:${t.slice(2)}` : null);

  // 대표 영업시간: 평일(월~금) 중 첫 번째, 없으면 전체 중 첫 번째
  const weekdayPeriods = periods.filter((p) => p.open?.day >= 1 && p.open?.day <= 5);
  const rep = weekdayPeriods[0] || periods[0];
  const openTime = fmtTime(rep?.open?.time);
  const closeTime = fmtTime(rep?.close?.time);
  const opening_hours = openTime && closeTime ? `${openTime}~${closeTime}` : null;

  // 영업하는 요일 파악
  const openDays = new Set(periods.map((p) => p.open?.day).filter((d) => d != null));
  const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !openDays.has(d));

  let closed_days = null;
  if (closedDays.length > 0) {
    const hasSat = closedDays.includes(6);
    const hasSun = closedDays.includes(0);
    if (hasSat && hasSun && closedDays.length === 2) {
      closed_days = "주말";
    } else if (hasSat && hasSun) {
      // 주말 + 추가 휴무
      const extra = closedDays.filter((d) => d !== 0 && d !== 6).map((d) => DAY_KO[d]);
      closed_days = extra.length ? `주말, ${extra.join(", ")}` : "주말";
    } else {
      closed_days = closedDays.map((d) => DAY_KO[d]).join(", ");
    }
  }

  return { opening_hours, closed_days };
}

/** Google API 상태 코드 처리 */
function checkGoogleStatus(status, errorMessage) {
  if (status === "REQUEST_DENIED") throw new Error(`Google API 거부: ${errorMessage || status}`);
  if (status === "OVER_QUERY_LIMIT") throw new Error("OVER_QUERY_LIMIT");
  if (status === "INVALID_REQUEST") throw new Error(`잘못된 요청: ${errorMessage || ""}`);
  // OK / ZERO_RESULTS / NOT_FOUND 는 정상 처리
}

/**
 * Google Places 2단계 호출로 영업시간 취득
 *
 * 왜 2단계인가?
 *   Find Place from Text의 opening_hours 필드는 open_now(현재 영업중 여부)만 반환.
 *   periods(요일별 시간표)는 Place Details API에서만 제공됨.
 *
 * Step 1: findplacefromtext → place_id + 이름 확인
 * Step 2: place/details    → opening_hours.periods (요일별 영업 시간)
 */
async function fetchGooglePlaceHours(restaurant) {
  const cityHint = restaurant.address
    ? restaurant.address.match(/([가-힣]+시)/)?.[1] ?? "춘천"
    : "춘천";
  const query = `${restaurant.name} ${cityHint}`;

  // ── Step 1: place_id 찾기 ──────────────────────────────────────────────────
  const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findUrl.searchParams.set("input", query);
  findUrl.searchParams.set("inputtype", "textquery");
  findUrl.searchParams.set("fields", "name,place_id,formatted_address");
  findUrl.searchParams.set(
    "locationbias",
    `circle:30000@${restaurant.lat ?? 37.8813},${restaurant.lng ?? 127.7298}`
  );
  findUrl.searchParams.set("language", "ko");
  findUrl.searchParams.set("key", GOOGLE_KEY);

  const findRes = await fetch(findUrl.toString());
  if (!findRes.ok) throw new Error(`Find Place HTTP ${findRes.status}`);
  const findData = await findRes.json();
  checkGoogleStatus(findData.status, findData.error_message);

  const candidate = findData.candidates?.[0];
  if (!candidate?.place_id) return null;

  // 이름 유사도 체크 (전혀 다른 식당 방지)
  const candidateName = (candidate.name ?? "").toLowerCase().replace(/\s/g, "");
  const searchName = restaurant.name.toLowerCase().replace(/\s/g, "");
  const nameMatch =
    candidateName.includes(searchName) ||
    searchName.includes(candidateName) ||
    candidateName.slice(0, 3) === searchName.slice(0, 3);

  if (!nameMatch) {
    return {
      _skipped: true,
      _reason: `이름 불일치 (검색: ${restaurant.name}, 결과: ${candidate.name})`,
    };
  }

  // ── Step 2: Place Details로 opening_hours.periods 취득 ────────────────────
  // Find Place의 opening_hours는 open_now만 반환 → periods는 Details API 필요
  await sleep(300); // Step 1/2 사이 짧은 딜레이

  const detailUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailUrl.searchParams.set("place_id", candidate.place_id);
  detailUrl.searchParams.set("fields", "name,opening_hours");
  detailUrl.searchParams.set("language", "ko");
  detailUrl.searchParams.set("key", GOOGLE_KEY);

  const detailRes = await fetch(detailUrl.toString());
  if (!detailRes.ok) throw new Error(`Place Details HTTP ${detailRes.status}`);
  const detailData = await detailRes.json();
  checkGoogleStatus(detailData.status, detailData.error_message);

  const detail = detailData.result;

  return {
    ...parseGoogleHours(detail?.opening_hours),
    _candidateName: candidate.name,
    _candidateAddress: candidate.formatted_address,
  };
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`fetch-opening-hours.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작`);
  console.log(
    `설정: DELAY=${DELAY_MS}ms / SKIP_EXISTING=${SKIP_EXISTING} / LIMIT=${LIMIT ?? "없음"} / CITY=${CITY ?? "전체"}`
  );
  console.log();

  // 1. 대상 식당 조회
  const params = {
    select: "id,name,address,lat,lng,city_id,opening_hours,closed_days",
    order: "review_count.desc",
  };
  if (SKIP_EXISTING) params["opening_hours"] = "is.null";
  if (CITY) params["city_id"] = `eq.${CITY}`;

  const all = await sbGet("restaurants", params);
  const targets = LIMIT ? all.slice(0, LIMIT) : all;

  console.log(`대상: ${targets.length}개 (전체 조회 ${all.length}개)`);
  if (DRY_RUN) console.log("[DRY RUN 모드 - DB 변경 없음]");
  console.log();

  let cntUpdated = 0, cntSkipped = 0, cntNoData = 0, cntFailed = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const prefix = `[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name}`;

    try {
      const result = await fetchGooglePlaceHours(r);

      if (!result) {
        console.log(`${prefix} → 검색 결과 없음`);
        cntNoData++;
      } else if (result._skipped) {
        console.log(`${prefix} → 건너뜀: ${result._reason}`);
        cntSkipped++;
      } else if (!result.opening_hours && !result.closed_days) {
        console.log(`${prefix} → 영업시간 정보 없음 (후보: ${result._candidateName ?? "-"})`);
        cntNoData++;
      } else {
        const hoursStr = result.opening_hours ?? "-";
        const closedStr = result.closed_days ?? "없음";
        console.log(
          `${prefix} → ${hoursStr} / 휴무: ${closedStr}` +
          (result._candidateName ? ` (${result._candidateName})` : "")
        );

        if (!DRY_RUN) {
          const updates = {};
          if (result.opening_hours) updates.opening_hours = result.opening_hours;
          if (result.closed_days) updates.closed_days = result.closed_days;
          if (Object.keys(updates).length > 0) {
            await sbPatch("restaurants", { id: `eq.${r.id}` }, updates);
          }
        }
        cntUpdated++;
      }
    } catch (err) {
      if (err.message === "OVER_QUERY_LIMIT") {
        console.error(`${prefix} → API 할당량 초과! 60초 대기 후 재시도...`);
        await sleep(60000);
        i--; // 재시도
        continue;
      }
      console.error(`${prefix} → 오류: ${err.message}`);
      cntFailed++;
    }

    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log();
  console.log("═".repeat(50));
  console.log(`완료: 업데이트 ${cntUpdated}개 / 이름불일치 ${cntSkipped}개 / 정보없음 ${cntNoData}개 / 오류 ${cntFailed}개`);
  if (DRY_RUN) console.log("※ DRY RUN 모드였으므로 실제 DB 변경 없음");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
