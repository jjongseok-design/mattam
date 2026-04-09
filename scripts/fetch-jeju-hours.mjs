/**
 * fetch-jeju-hours.mjs
 *
 * 제주 식당 중 영업시간이 없는 항목에 Google Places 로 영업시간을 수집합니다.
 *   - city_id = 'jeju' 이고 opening_hours IS NULL 인 식당만 처리
 *   - Google Places findplacefromtext → place/details 로 영업시간 조회
 *   - opening_hours, closed_days, phone(없는 경우만) 업데이트
 *   - 춘천/전주 데이터 절대 건드리지 않음
 *
 * 환경변수: .env.local 우선, 없으면 .env
 *   GOOGLE_PLACES_API_KEY
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 사용법:
 *   node scripts/fetch-jeju-hours.mjs
 *   DRY_RUN=1 node scripts/fetch-jeju-hours.mjs
 *
 *   # PowerShell:
 *   $env:DRY_RUN="1"; node scripts/fetch-jeju-hours.mjs
 *
 * 옵션:
 *   LIMIT=10   처음 N개만 처리
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── 환경변수 로드 (.env.local 우선, 없으면 .env) ──────────────────────────────
const parseEnvFile = path =>
  Object.fromEntries(
    readFileSync(path, "utf8").split("\n")
      .filter(l => l && !l.startsWith("#") && l.includes("="))
      .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );

const envLocalPath = resolve(ROOT, ".env.local");
const envPath      = resolve(ROOT, ".env");

let env;
if (existsSync(envLocalPath)) {
  env = parseEnvFile(envLocalPath);
  console.log("환경변수: .env.local 사용\n");
} else if (existsSync(envPath)) {
  env = parseEnvFile(envPath);
  console.log("환경변수: .env 사용 (.env.local 없음)\n");
} else {
  console.error("❌ .env.local 도 .env 도 없습니다.");
  process.exit(1);
}

const GOOGLE_KEY = env.GOOGLE_PLACES_API_KEY;
const SB_URL     = env.VITE_SUPABASE_URL;
const SK         = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN    = process.env.DRY_RUN === "1";
const LIMIT      = process.env.LIMIT ? parseInt(process.env.LIMIT) : null;

if (!GOOGLE_KEY) { console.error("❌ GOOGLE_PLACES_API_KEY 누락"); process.exit(1); }
if (!SB_URL)     { console.error("❌ VITE_SUPABASE_URL 누락");     process.exit(1); }
if (!SK)         { console.error("❌ SUPABASE_SERVICE_ROLE_KEY 누락"); process.exit(1); }

const CITY_ID   = "jeju";
const CITY_NAME = "제주";

const SB_H = {
  apikey: SK,
  Authorization: `Bearer ${SK}`,
  "Content-Type": "application/json",
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Google Places ─────────────────────────────────────────────────────────────
const DAY_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function parseHours(openingHours) {
  if (!openingHours?.periods?.length) return {};
  const periods = openingHours.periods;
  // 24시간 영업
  if (periods.length === 1 && periods[0].open?.time === "0000" && !periods[0].close)
    return { opening_hours: "00:00~24:00", closed_days: null };

  const fmt = t => t ? `${t.slice(0, 2)}:${t.slice(2)}` : null;
  // 월~금 중 대표 시간대 (평일 우선)
  const rep = periods.find(p => p.open?.day >= 1) ?? periods[0];
  const opening_hours =
    fmt(rep?.open?.time) && fmt(rep?.close?.time)
      ? `${fmt(rep.open.time)}~${fmt(rep.close.time)}`
      : null;

  const openDays = new Set(periods.map(p => p.open?.day).filter(d => d != null));
  const closed = [0, 1, 2, 3, 4, 5, 6].filter(d => !openDays.has(d));
  let closed_days = null;
  if (closed.length) {
    const hasSat = closed.includes(6), hasSun = closed.includes(0);
    if (hasSat && hasSun && closed.length === 2) {
      closed_days = "주말";
    } else if (hasSat && hasSun) {
      closed_days = `주말, ${closed.filter(d => d !== 0 && d !== 6).map(d => DAY_KO[d]).join(", ")}`;
    } else {
      closed_days = closed.map(d => DAY_KO[d]).join(", ");
    }
  }
  return { opening_hours, closed_days };
}

// Google Places findplacefromtext → place/details
// 반환: { opening_hours, closed_days, phone } (없으면 null)
async function fetchGoogleHours(name, lat, lng) {
  // 1. findplacefromtext
  const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findUrl.searchParams.set("input",         `${name} ${CITY_NAME}`);
  findUrl.searchParams.set("inputtype",     "textquery");
  findUrl.searchParams.set("fields",        "name,place_id");
  findUrl.searchParams.set("locationbias",  `circle:5000@${lat},${lng}`);
  findUrl.searchParams.set("language",      "ko");
  findUrl.searchParams.set("key",           GOOGLE_KEY);

  const fr = await fetch(findUrl.toString());
  if (!fr.ok) throw new Error(`findplace HTTP ${fr.status}`);
  const fd = await fr.json();
  const placeId = fd.candidates?.[0]?.place_id;
  if (!placeId) return null;

  await sleep(300);

  // 2. place/details
  const detUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detUrl.searchParams.set("place_id", placeId);
  detUrl.searchParams.set("fields",   "formatted_phone_number,opening_hours");
  detUrl.searchParams.set("language", "ko");
  detUrl.searchParams.set("key",      GOOGLE_KEY);

  const dr = await fetch(detUrl.toString());
  if (!dr.ok) throw new Error(`place/details HTTP ${dr.status}`);
  const dd = await dr.json();
  const res = dd.result ?? {};

  const hours = parseHours(res.opening_hours);
  if (!hours.opening_hours && !res.formatted_phone_number) return null;

  return {
    opening_hours: hours.opening_hours ?? null,
    closed_days:   hours.closed_days   ?? null,
    phone:         res.formatted_phone_number ?? null,
  };
}

// ── Supabase: 제주 식당 조회 (opening_hours IS NULL) ─────────────────────────
async function fetchTargetRestaurants() {
  const url = new URL(`${SB_URL}/rest/v1/restaurants`);
  url.searchParams.set("city_id",       `eq.${CITY_ID}`);
  url.searchParams.set("opening_hours", "is.null");
  url.searchParams.set("select",        "id,name,address,lat,lng,phone");
  url.searchParams.set("order",         "id.asc");

  const r = await fetch(url.toString(), { headers: SB_H });
  if (!r.ok) throw new Error(`식당 조회 실패: ${r.status} ${await r.text()}`);
  return r.json();
}

// ── Supabase: 영업시간 업데이트 ───────────────────────────────────────────────
async function updateRestaurant(id, patch) {
  const r = await fetch(
    `${SB_URL}/rest/v1/restaurants?id=eq.${encodeURIComponent(id)}&city_id=eq.${CITY_ID}`,
    {
      method:  "PATCH",
      headers: { ...SB_H, Prefer: "return=minimal" },
      body:    JSON.stringify(patch),
    }
  );
  if (!r.ok) throw new Error(`UPDATE 실패 ${r.status}: ${await r.text()}`);
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
console.log(`\n━━━ 제주 영업시간 수집${DRY_RUN ? " [DRY RUN]" : ""} ━━━\n`);

const restaurants = await fetchTargetRestaurants();
const targets = LIMIT ? restaurants.slice(0, LIMIT) : restaurants;

console.log(`대상: ${targets.length}개 (city_id='jeju', opening_hours IS NULL)\n`);

if (targets.length === 0) {
  console.log("처리할 식당이 없습니다.");
  process.exit(0);
}

let updated = 0, notFound = 0, failed = 0;

for (let i = 0; i < targets.length; i++) {
  const r      = targets[i];
  const logPfx = `  [${String(i + 1).padStart(3)}/${targets.length}] ${r.name}`;

  try {
    const info = await fetchGoogleHours(r.name, r.lat, r.lng);

    if (!info) {
      console.log(`${logPfx} → ⚪ Google 결과 없음`);
      notFound++;
      await sleep(500);
      continue;
    }

    // phone: 이미 있으면 덮어쓰지 않음
    const patch = {
      opening_hours: info.opening_hours,
      closed_days:   info.closed_days,
      ...(r.phone ? {} : { phone: info.phone }),
    };

    // null 값 키 제거 (불필요한 덮어쓰기 방지)
    for (const key of Object.keys(patch)) {
      if (patch[key] == null) delete patch[key];
    }

    if (Object.keys(patch).length === 0) {
      console.log(`${logPfx} → ⚪ 업데이트할 데이터 없음`);
      notFound++;
      await sleep(500);
      continue;
    }

    const parts = [];
    if (patch.opening_hours) parts.push(`🕐 ${patch.opening_hours}`);
    if (patch.closed_days)   parts.push(`휴무: ${patch.closed_days}`);
    if (patch.phone)         parts.push(`📞 ${patch.phone}`);
    console.log(`${logPfx} → ✅ ${parts.join("  ")}`);

    if (!DRY_RUN) {
      await updateRestaurant(r.id, patch);
    }
    updated++;

  } catch (err) {
    console.log(`${logPfx} → ❌ 오류: ${err.message}`);
    failed++;
  }

  await sleep(500);
}

console.log(`\n${"─".repeat(50)}`);
console.log(`완료!  업데이트: ${updated}개 / 결과없음: ${notFound}개 / 오류: ${failed}개`);
if (DRY_RUN) console.log("(DRY RUN — DB 변경 없음)");
