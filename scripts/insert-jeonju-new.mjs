/**
 * insert-jeonju-new.mjs
 *
 * 전주 신규 식당을 한 번에 처리합니다:
 *   1. 카카오 키워드 검색 → 좌표/주소/전화번호 확인
 *   2. Google Places → 영업시간/가격대
 *   3. Claude Haiku → 메뉴 태그 + 한 줄 설명
 *   4. Supabase DB 삽입
 *
 * 사용법:
 *   node scripts/insert-jeonju-new.mjs
 *   DRY_RUN=1 node scripts/insert-jeonju-new.mjs   (DB 변경 없이 미리보기)
 *
 * 입력 파일: restaurants-jeonju-new.json
 *   형식: [{ "name": "식당명", "address": "주소", "category": "카테고리" }, ...]
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

const KAKAO         = env.KAKAO_REST_API_KEY;
const GOOGLE_KEY    = env.GOOGLE_PLACES_API_KEY;
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;
const SB_URL        = env.VITE_SUPABASE_URL;
const SK            = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN       = process.env.DRY_RUN === "1";
const CLAUDE_MODEL  = "claude-haiku-4-5-20251001";

const SB_H = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slugify = n => n.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

const RESTAURANTS = JSON.parse(readFileSync(resolve(ROOT, "restaurants-jeonju-new.json"), "utf8"));

// ── 카카오 키워드 검색 ────────────────────────────────────────────────────────
async function kakaoSearch(name) {
  for (const categoryCode of ["FD6", ""]) {
    const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url.searchParams.set("query", `${name} 전주`);
    if (categoryCode) url.searchParams.set("category_group_code", categoryCode);
    url.searchParams.set("size", "5");
    const r = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO}` } });
    const d = await r.json();
    if (d.documents?.length) return d.documents;
  }
  return [];
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
  detUrl.searchParams.set("fields", "formatted_phone_number,price_level,opening_hours,editorial_summary");
  detUrl.searchParams.set("language", "ko");
  detUrl.searchParams.set("key", GOOGLE_KEY);
  const dr = await fetch(detUrl.toString());
  const dd = await dr.json();
  const res = dd.result ?? {};
  const price_map = { 1: "₩", 2: "₩₩", 3: "₩₩₩", 4: "₩₩₩₩" };
  return {
    phone: res.formatted_phone_number ?? null,
    price_range: price_map[res.price_level] ?? null,
    google_description: res.editorial_summary?.overview ?? null,
    ...parseHours(res.opening_hours),
  };
}

// ── Claude: 메뉴 태그 + 한 줄 설명 ────────────────────────────────────────────
async function claudeFetch(name, category, address, googleDesc) {
  const prompt = `전주 식당 정보를 보고 아래 두 가지를 JSON으로 답해줘.

식당명: ${name}
카테고리: ${category}
주소: ${address}
${googleDesc ? `Google 설명: ${googleDesc}` : ""}

답변 형식 (JSON만, 설명 없이):
{
  "menus": ["대표메뉴1", "대표메뉴2", "대표메뉴3"],
  "description": "한 줄 설명 (20자 이내, 이 식당의 특징)"
}

규칙:
- menus: 이 식당에서 실제로 파는 대표 메뉴 3~5개, 한국어, 10자 이내
- description: 식당의 핵심 특징 한 줄 (예: "전주 한옥마을 대표 비빔밥 노포")
- 모르면 카테고리 기반으로 추정`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
    });
    if (res.status === 429) {
      const wait = attempt * 30;
      process.stdout.write(`  rate limit, ${wait}초 대기...\n`);
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      const parsed = JSON.parse(match[0]);
      return {
        tags: Array.isArray(parsed.menus) ? parsed.menus.filter(m => typeof m === "string" && m.length <= 15).slice(0, 5) : null,
        description: typeof parsed.description === "string" ? parsed.description.slice(0, 100) : null,
      };
    } catch { return {}; }
  }
  return {};
}

// ── ID 생성 ───────────────────────────────────────────────────────────────────
async function getPrefix(category) {
  for (const cityId of ["jeonju", "chuncheon"]) {
    const r = await fetch(`${SB_URL}/rest/v1/categories?city_id=eq.${cityId}&id=eq.${encodeURIComponent(category)}&select=id_prefix`, { headers: SB_H });
    const d = await r.json();
    if (d[0]?.id_prefix) return d[0].id_prefix;
  }
  return "je";
}

const prefixCounters = {};
async function nextId(idPrefix) {
  if (!prefixCounters[idPrefix]) {
    const r = await fetch(`${SB_URL}/rest/v1/restaurants?id=like.${idPrefix}*&select=id`, { headers: SB_H });
    const rows = await r.json();
    prefixCounters[idPrefix] = rows.reduce((m, row) => {
      const n = parseInt(row.id.replace(idPrefix, ""));
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
  }
  prefixCounters[idPrefix]++;
  return `${idPrefix}${String(prefixCounters[idPrefix]).padStart(2, "0")}`;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
console.log(`전주 신규 식당 ${RESTAURANTS.length}개 처리 시작...\n${DRY_RUN ? "(DRY RUN — DB 변경 없음)\n" : ""}`);

let inserted = 0, failed = 0;

for (let i = 0; i < RESTAURANTS.length; i++) {
  const item = RESTAURANTS[i];
  const prefix = `  [${String(i + 1).padStart(2)}/${RESTAURANTS.length}] ${item.name}`;

  // 1. 카카오 검색
  const docs = await kakaoSearch(item.name);
  const doc = docs.find(d => nameMatch(item.name, d.place_name)) ?? docs[0];
  if (!doc || !nameMatch(item.name, doc.place_name)) {
    console.log(`${prefix} → ❌ 카카오 불일치 (${doc?.place_name ?? "결과없음"})`);
    failed++;
    await sleep(300);
    continue;
  }

  const lat = parseFloat(doc.y);
  const lng = parseFloat(doc.x);
  const address = doc.road_address_name || doc.address_name;
  const kakaoPhone = doc.phone || null;
  console.log(`${prefix} → ✅ ${doc.place_name}`);

  // 2. Google Places (영업시간/가격대)
  await sleep(300);
  const gInfo = await googlePlaces(doc.place_name, lat, lng);
  if (gInfo.opening_hours) process.stdout.write(`    🕐 ${gInfo.opening_hours}${gInfo.closed_days ? " · 휴무: " + gInfo.closed_days : ""}\n`);
  if (gInfo.phone || kakaoPhone) process.stdout.write(`    📞 ${gInfo.phone || kakaoPhone}\n`);
  if (gInfo.price_range) process.stdout.write(`    💰 ${gInfo.price_range}\n`);

  // 3. Claude (메뉴 + 설명)
  await sleep(500);
  const aiInfo = await claudeFetch(doc.place_name, item.category, address, gInfo.google_description);
  if (aiInfo.tags?.length) process.stdout.write(`    🍽️  ${aiInfo.tags.join(", ")}\n`);
  if (aiInfo.description) process.stdout.write(`    📝 ${aiInfo.description}\n`);

  // 4. ID 생성
  const idPrefix = await getPrefix(item.category);
  const id = await nextId(idPrefix);

  const row = {
    id,
    city_id: "jeonju",
    name: doc.place_name,
    slug: slugify(doc.place_name),
    address,
    lat,
    lng,
    phone: gInfo.phone || kakaoPhone,
    category: item.category,
    price_range: gInfo.price_range ?? null,
    opening_hours: gInfo.opening_hours ?? null,
    closed_days: gInfo.closed_days ?? null,
    tags: aiInfo.tags ?? null,
    description: aiInfo.description ?? null,
  };

  if (!DRY_RUN) {
    const res = await fetch(`${SB_URL}/rest/v1/restaurants`, {
      method: "POST",
      headers: { ...SB_H, Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (res.ok) {
      process.stdout.write(`    💾 삽입 완료 (id: ${id})\n`);
      inserted++;
    } else {
      const t = await res.text();
      process.stdout.write(`    ⚠️  삽입 실패: ${t}\n`);
      failed++;
    }
  } else {
    process.stdout.write(`    [DRY RUN] id: ${id}\n`);
    inserted++;
  }

  await sleep(8000); // Claude rate limit 대응
}

console.log(`\n${"─".repeat(50)}`);
console.log(`완료! 삽입: ${inserted}개 / 실패: ${failed}개`);
