/**
 * insert-jeonju-new.mjs
 * 전주 신규 식당 직접 삽입:
 *   1. 카카오 키워드 검색으로 좌표/주소/전화번호 확인
 *   2. Google Places로 영업시간/가격대 수집
 *   3. Supabase DB 삽입
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const KAKAO      = env.KAKAO_REST_API_KEY;
const GOOGLE_KEY = env.GOOGLE_PLACES_API_KEY;
const SB_URL     = env.VITE_SUPABASE_URL;
const SK         = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN    = process.env.DRY_RUN === "1";

const SB_H = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slugify = n => n.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

const RESTAURANTS = JSON.parse(readFileSync(resolve(ROOT, "restaurants-jeonju-new.json"), "utf8"));

// ── 카카오 키워드 검색 ────────────────────────────────────────────────────────
async function kakaoSearch(name) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", `${name} 전주`);
  url.searchParams.set("category_group_code", "FD6");
  url.searchParams.set("size", "5");
  const r = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO}` } });
  const d = await r.json();
  // FD6 없으면 카테고리 없이 재검색 (카페/베이커리 등)
  if (!d.documents?.length) {
    const url2 = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url2.searchParams.set("query", `${name} 전주`);
    url2.searchParams.set("size", "5");
    const r2 = await fetch(url2.toString(), { headers: { Authorization: `KakaoAK ${KAKAO}` } });
    const d2 = await r2.json();
    return d2.documents ?? [];
  }
  return d.documents ?? [];
}

function nameMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/\s/g, "").replace(/[()（）]/g, "");
  const ca = clean(a), cb = clean(b);
  return ca === cb || ca.includes(cb) || cb.includes(ca) || ca.slice(0, 4) === cb.slice(0, 4);
}

// ── Google Places ─────────────────────────────────────────────────────────────
const DAY_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
function parseHours(openingHours) {
  if (!openingHours?.periods?.length) return {};
  const periods = openingHours.periods;
  if (periods.length === 1 && periods[0].open?.time === "0000" && !periods[0].close)
    return { opening_hours: "00:00~24:00" };
  const fmt = t => t ? `${t.slice(0, 2)}:${t.slice(2)}` : null;
  const rep = periods.find(p => p.open?.day >= 1) || periods[0];
  const opening_hours = fmt(rep?.open?.time) && fmt(rep?.close?.time)
    ? `${fmt(rep.open.time)}~${fmt(rep.close.time)}` : null;
  const openDays = new Set(periods.map(p => p.open?.day).filter(d => d != null));
  const closed = [0,1,2,3,4,5,6].filter(d => !openDays.has(d));
  let closed_days = null;
  if (closed.length) {
    const hasSat = closed.includes(6), hasSun = closed.includes(0);
    if (hasSat && hasSun && closed.length === 2) closed_days = "주말";
    else if (hasSat && hasSun) closed_days = `주말, ${closed.filter(d => d !== 0 && d !== 6).map(d => DAY_KO[d]).join(", ")}`;
    else closed_days = closed.map(d => DAY_KO[d]).join(", ");
  }
  return { opening_hours, closed_days };
}

async function googlePlaces(name, lat, lng) {
  const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findUrl.searchParams.set("input", `${name} 전주`);
  findUrl.searchParams.set("inputtype", "textquery");
  findUrl.searchParams.set("fields", "name,place_id");
  findUrl.searchParams.set("locationbias", `circle:5000@${lat},${lng}`);
  findUrl.searchParams.set("language", "ko");
  findUrl.searchParams.set("key", GOOGLE_KEY);
  const fr = await fetch(findUrl.toString());
  const fd = await fr.json();
  const placeId = fd.candidates?.[0]?.place_id;
  if (!placeId) return {};
  await sleep(300);
  const detUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detUrl.searchParams.set("place_id", placeId);
  detUrl.searchParams.set("fields", "formatted_phone_number,price_level,opening_hours");
  detUrl.searchParams.set("language", "ko");
  detUrl.searchParams.set("key", GOOGLE_KEY);
  const dr = await fetch(detUrl.toString());
  const dd = await dr.json();
  const res = dd.result ?? {};
  const price_map = { 1: "₩", 2: "₩₩", 3: "₩₩₩", 4: "₩₩₩₩" };
  return {
    phone: res.formatted_phone_number ?? null,
    price_range: price_map[res.price_level] ?? null,
    ...parseHours(res.opening_hours),
  };
}

// ── ID 생성 ───────────────────────────────────────────────────────────────────
async function nextId(prefix) {
  const r = await fetch(`${SB_URL}/rest/v1/restaurants?id=like.${prefix}*&select=id`, { headers: SB_H });
  const rows = await r.json();
  const max = rows.reduce((m, row) => {
    const n = parseInt(row.id.replace(prefix, ""));
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${prefix}${String(max + 1).padStart(2, "0")}`;
}

// ── 카테고리별 ID prefix 조회 ─────────────────────────────────────────────────
async function getPrefix(category) {
  const r = await fetch(`${SB_URL}/rest/v1/categories?city_id=eq.jeonju&id=eq.${encodeURIComponent(category)}&select=id_prefix`, { headers: SB_H });
  const d = await r.json();
  if (d[0]?.id_prefix) return d[0].id_prefix;
  // 춘천 기준 폴백
  const r2 = await fetch(`${SB_URL}/rest/v1/categories?city_id=eq.chuncheon&id=eq.${encodeURIComponent(category)}&select=id_prefix`, { headers: SB_H });
  const d2 = await r2.json();
  return d2[0]?.id_prefix ?? "je";
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
console.log(`전주 신규 식당 ${RESTAURANTS.length}개 삽입 시작...\n${DRY_RUN ? "(DRY RUN)\n" : ""}`);

let inserted = 0, failed = 0;
const prefixCounters = {};

for (let i = 0; i < RESTAURANTS.length; i++) {
  const item = RESTAURANTS[i];
  const prefix_str = `  [${String(i + 1).padStart(2)}/${RESTAURANTS.length}] ${item.name}`;

  // 1. 카카오 검색
  const docs = await kakaoSearch(item.name);
  const doc = docs.find(d => nameMatch(item.name, d.place_name)) ?? docs[0];
  if (!doc) {
    console.log(`${prefix_str} → ❌ 카카오 검색 실패`);
    failed++;
    await sleep(300);
    continue;
  }
  if (!nameMatch(item.name, doc.place_name)) {
    console.log(`${prefix_str} → ⛔ 이름 불일치 (카카오: ${doc.place_name})`);
    failed++;
    await sleep(300);
    continue;
  }

  const lat = parseFloat(doc.y);
  const lng = parseFloat(doc.x);
  const address = doc.road_address_name || doc.address_name;
  const phone = doc.phone || null;
  console.log(`${prefix_str} → ✅ ${doc.place_name} (${lat.toFixed(5)}, ${lng.toFixed(5)})`);

  // 2. Google 영업정보
  await sleep(300);
  const gInfo = await googlePlaces(item.name, lat, lng);
  if (gInfo.opening_hours) console.log(`    🕐 ${gInfo.opening_hours}${gInfo.closed_days ? " · 휴무: " + gInfo.closed_days : ""}`);
  if (gInfo.phone) console.log(`    📞 ${gInfo.phone}`);
  if (gInfo.price_range) console.log(`    💰 ${gInfo.price_range}`);

  // 3. ID 생성
  const idPrefix = await getPrefix(item.category);
  if (!prefixCounters[idPrefix]) {
    // DB에서 현재 최대값 로드 (카운터 초기화)
    const r = await fetch(`${SB_URL}/rest/v1/restaurants?id=like.${idPrefix}*&select=id`, { headers: SB_H });
    const rows = await r.json();
    prefixCounters[idPrefix] = rows.reduce((m, row) => {
      const n = parseInt(row.id.replace(idPrefix, ""));
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
  }
  prefixCounters[idPrefix]++;
  const id = `${idPrefix}${String(prefixCounters[idPrefix]).padStart(2, "0")}`;

  const row = {
    id,
    city_id: "jeonju",
    name: doc.place_name,
    slug: slugify(doc.place_name),
    address,
    lat,
    lng,
    phone: gInfo.phone || phone,
    category: item.category,
    price_range: gInfo.price_range ?? null,
    opening_hours: gInfo.opening_hours ?? null,
    closed_days: gInfo.closed_days ?? null,
  };

  if (!DRY_RUN) {
    const res = await fetch(`${SB_URL}/rest/v1/restaurants`, {
      method: "POST",
      headers: { ...SB_H, Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (res.ok) { console.log(`    💾 삽입 완료 (id: ${id})`); inserted++; }
    else { const t = await res.text(); console.log(`    ⚠️  삽입 실패: ${t}`); failed++; }
  } else {
    console.log(`    [DRY RUN] 삽입 예정: ${JSON.stringify(row)}`);
    inserted++;
  }

  await sleep(500);
}

console.log(`\n${"─".repeat(50)}`);
console.log(`완료! 삽입: ${inserted}개 / 실패: ${failed}개`);
