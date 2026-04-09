/**
 * import-jeju.mjs
 *
 * restaurants-jeju.json 의 식당을 카카오 검증 후 Supabase에 삽입합니다.
 *   - city_id = 'jeju' 고정 — 춘천/전주 데이터 절대 건드리지 않음
 *   - 카카오 키워드 검색(이름 + 제주)으로 실존 여부·좌표 확인
 *   - 카테고리는 DB categories 테이블(city_id='jeju') 에서 미리 로드 후 매핑
 *   - 검증 실패 항목은 restaurants-jeju-failed.json 저장 + DB에 hidden/needs_review 로 삽입
 *   - restaurants-jeju-retry-ok.json 의 _manualCheck 항목도 hidden/needs_review 로 삽입
 *
 * 환경변수: .env.local 우선, 없으면 .env 사용
 *   KAKAO_REST_API_KEY
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 사용법:
 *   node scripts/import-jeju.mjs          # 실제 삽입
 *   DRY_RUN=1 node scripts/import-jeju.mjs  # 미리보기
 *
 *   # PowerShell:
 *   $env:DRY_RUN="1"; node scripts/import-jeju.mjs
 *
 * 옵션:
 *   LIMIT=10   처음 N개만 처리
 *
 * 입력 파일: restaurants-jeju.json
 *   [{ "name": "식당명", "category": "칼국수", "address": "주소(선택)" }]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
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

const KAKAO   = env.KAKAO_REST_API_KEY;
const SB_URL  = env.VITE_SUPABASE_URL;
const SK      = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT   = process.env.LIMIT ? parseInt(process.env.LIMIT) : null;

if (!KAKAO)  { console.error("❌ KAKAO_REST_API_KEY 누락"); process.exit(1); }
if (!SB_URL) { console.error("❌ VITE_SUPABASE_URL 누락"); process.exit(1); }
if (!SK)     { console.error("❌ SUPABASE_SERVICE_ROLE_KEY 누락"); process.exit(1); }

const CITY_ID   = "jeju";
const CITY_NAME = "제주";

// 제주시 중심 좌표 (검증 실패 항목 임시 좌표)
const JEJU_CENTER_LAT = 33.4996;
const JEJU_CENTER_LNG = 126.5312;

const INPUT_FILE    = resolve(ROOT, "restaurants-jeju.json");
const FAILED_FILE   = resolve(ROOT, "restaurants-jeju-failed.json");
const RETRY_OK_FILE = resolve(ROOT, "restaurants-jeju-retry-ok.json");

const SB_H = {
  apikey: SK,
  Authorization: `Bearer ${SK}`,
  "Content-Type": "application/json",
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const slugify = n =>
  n.toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

// ── 입력 파일 ─────────────────────────────────────────────────────────────────
if (!existsSync(INPUT_FILE)) {
  console.error(`❌ ${INPUT_FILE} 파일이 없습니다.`);
  process.exit(1);
}
const _all = JSON.parse(readFileSync(INPUT_FILE, "utf8"));
const RESTAURANTS = LIMIT ? _all.slice(0, LIMIT) : _all;

// ── 카카오 API ────────────────────────────────────────────────────────────────
function nameMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/\s/g, "").replace(/[()（）]/g, "");
  const ca = clean(a), cb = clean(b);
  return ca === cb || ca.includes(cb) || cb.includes(ca) || ca.slice(0, 4) === cb.slice(0, 4);
}

function stripBranch(name) {
  return name
    .replace(/\s*(제주\S*본점|제주\S*점|\S*본점|\S+점)$/, "")
    .trim();
}

async function kakaoKeyword(query, opts = {}) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "5");
  if (opts.x) url.searchParams.set("x", String(opts.x));
  if (opts.y) url.searchParams.set("y", String(opts.y));
  if (opts.radius) url.searchParams.set("radius", String(opts.radius));
  const r = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO}` } });
  const d = await r.json();
  return d.documents ?? [];
}

async function kakaoAddress(address) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);
  url.searchParams.set("size", "1");
  const r = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO}` } });
  const d = await r.json();
  return d.documents ?? [];
}

// 카카오 검증: 이름+제주 키워드 검색 → 좌표 교차검증
// 반환: { name, address, lat, lng, phone } 또는 null
async function verifyWithKakao(item) {
  // 1차: 이름 + 제주 키워드 검색
  for (const code of ["FD6", "CE7", ""]) {
    const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url.searchParams.set("query", `${item.name} ${CITY_NAME}`);
    if (code) url.searchParams.set("category_group_code", code);
    url.searchParams.set("size", "5");
    const r = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO}` } });
    const d = await r.json();
    const docs = d.documents ?? [];
    const doc = docs.find(d => nameMatch(item.name, d.place_name));
    if (doc) {
      const lat = parseFloat(doc.y), lng = parseFloat(doc.x);
      await sleep(200);
      const near = await kakaoKeyword(doc.place_name, { x: lng, y: lat, radius: 200 });
      const confirmed = near.find(d => nameMatch(doc.place_name, d.place_name));
      return {
        name: doc.place_name,
        address: doc.road_address_name || doc.address_name,
        lat, lng,
        phone: doc.phone || null,
        _coordVerified: !!confirmed,
      };
    }
  }

  // 2차: 지점명 제거 후 재시도
  const baseName = stripBranch(item.name);
  if (baseName && baseName !== item.name) {
    await sleep(200);
    const docs = await kakaoKeyword(`${baseName} ${CITY_NAME}`);
    const doc = docs.find(d => nameMatch(baseName, d.place_name));
    if (doc) {
      return {
        name: doc.place_name,
        address: doc.road_address_name || doc.address_name,
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        phone: doc.phone || null,
        _coordVerified: true,
      };
    }
  }

  // 3차: 주소로 재시도
  if (item.address) {
    await sleep(200);
    const addrDocs = await kakaoAddress(item.address);
    const addrDoc = addrDocs[0];
    if (addrDoc) {
      const addrLat = parseFloat(addrDoc.y ?? addrDoc.address?.y);
      const addrLng = parseFloat(addrDoc.x ?? addrDoc.address?.x);
      if (addrLat && addrLng) {
        await sleep(200);
        const near = await kakaoKeyword(item.name, { x: addrLng, y: addrLat, radius: 300 });
        const nearDoc = near.find(d => nameMatch(item.name, d.place_name));
        if (nearDoc) {
          return {
            name: nearDoc.place_name,
            address: nearDoc.road_address_name || nearDoc.address_name,
            lat: parseFloat(nearDoc.y),
            lng: parseFloat(nearDoc.x),
            phone: nearDoc.phone || null,
            _coordVerified: true,
          };
        }
      }
    }
  }

  return null;
}

// ── Supabase: 제주 카테고리 매핑 테이블 로드 ─────────────────────────────────
// DB categories 테이블(city_id='jeju')에서 미리 로드 후 Map으로 관리
// catMap 키: label("생선구이"), full id("jeju_생선구이"), bare id("생선구이") 모두 지원
// catMap 값: { id: "jeju_생선구이", id_prefix: "jjfs" }
async function loadJejuCatMap() {
  const r = await fetch(
    `${SB_URL}/rest/v1/categories?city_id=eq.${CITY_ID}&select=id,id_prefix,label`,
    { headers: SB_H }
  );
  if (!r.ok) throw new Error(`카테고리 조회 실패: ${r.status}`);
  const rows = await r.json();

  const catMap = new Map();
  let etcRow = null;

  for (const row of rows) {
    const entry = { id: row.id, id_prefix: row.id_prefix };

    // label 키 (예: "생선구이")
    catMap.set(row.label, entry);

    // full id 키 (예: "jeju_생선구이")
    catMap.set(row.id, entry);

    // bare id 키 — "jeju_" 제거 (예: "생선구이"), label과 다를 경우에만
    const bare = row.id.startsWith("jeju_") ? row.id.slice(5) : row.id;
    if (!catMap.has(bare)) catMap.set(bare, entry);

    if (row.label === "기타" || row.id === "jeju_기타") etcRow = entry;
  }

  return { catMap, etcRow };
}

// 카테고리 resolve: 입력 문자열 → jeju 카테고리 entry
// 반환: { id, id_prefix } 또는 etcRow
function resolveCategory(catMap, etcRow, inputCat) {
  return catMap.get(inputCat ?? "") ?? etcRow;
}

// ── ID 생성 ───────────────────────────────────────────────────────────────────
const prefixCounters = {};

async function fetchMaxCounter(idPrefix) {
  const r = await fetch(
    `${SB_URL}/rest/v1/restaurants?id=like.${encodeURIComponent(idPrefix)}*&city_id=eq.${CITY_ID}&select=id`,
    { headers: SB_H }
  );
  const rows = await r.json();
  return rows.reduce((m, row) => {
    const n = parseInt(row.id.replace(idPrefix, ""));
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
}

async function nextId(idPrefix) {
  if (prefixCounters[idPrefix] == null) {
    prefixCounters[idPrefix] = await fetchMaxCounter(idPrefix);
  }
  prefixCounters[idPrefix]++;
  return `${idPrefix}${String(prefixCounters[idPrefix]).padStart(2, "0")}`;
}

// ── DB 삽입 (일반) ────────────────────────────────────────────────────────────
async function insertRow(row) {
  if (DRY_RUN) return { ok: true, dryRun: true };
  const res = await fetch(`${SB_URL}/rest/v1/restaurants`, {
    method: "POST",
    headers: { ...SB_H, Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: await res.text() };
}

// ── DB 삽입 (검증 실패 — hidden/needs_review) ─────────────────────────────────
async function insertUnverifiedItems(items, catMap, etcRow, existingSlugs, label) {
  if (!items.length) return;
  console.log(`\n── ${label} (${items.length}개) — needs_review=true, is_hidden=true ──`);

  let count = 0;
  for (const item of items) {
    const slug = slugify(item.name);
    if (existingSlugs.has(slug)) {
      console.log(`  ⏭️  ${item.name} — 이미 존재`);
      continue;
    }

    const catEntry = resolveCategory(catMap, etcRow, item.category);
    if (!catEntry) {
      console.log(`  ⚠️  ${item.name} — 카테고리 매핑 실패, 건너뜀`);
      continue;
    }

    const id = await nextId(catEntry.id_prefix);

    const row = {
      id,
      city_id:      CITY_ID,
      name:         item.name,
      slug,
      address:      item.address ?? null,
      lat:          JEJU_CENTER_LAT,
      lng:          JEJU_CENTER_LNG,
      phone:        item.phone ?? null,
      category:     catEntry.id,
      needs_review: true,
      is_hidden:    true,
    };

    if (DRY_RUN) {
      console.log(`  [DRY RUN] ${item.name} → id: ${id}, category: ${catEntry.id}`);
      existingSlugs.add(slug);
      count++;
    } else {
      const result = await insertRow(row);
      if (result.ok) {
        console.log(`  💾 ${item.name} → id: ${id} (hidden)`);
        existingSlugs.add(slug);
        count++;
      } else {
        console.log(`  ⚠️  ${item.name} — 삽입 실패: ${result.error}`);
      }
    }
  }
  console.log(`  → ${count}개 삽입 완료`);
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
console.log(`\n━━━ 제주 식당 임포트 (${RESTAURANTS.length}개)${DRY_RUN ? " [DRY RUN]" : ""} ━━━\n`);

// 제주 카테고리 매핑 테이블 로드
const { catMap, etcRow } = await loadJejuCatMap();
console.log(`제주 카테고리 ${catMap.size / 3}개 로드 (label/id/bare 3종 키 매핑)\n`);

// 기존 slug 조회 (중복 방지)
const existingRes = await fetch(
  `${SB_URL}/rest/v1/restaurants?city_id=eq.${CITY_ID}&select=slug`,
  { headers: SB_H }
);
const existingSlugs = new Set((await existingRes.json()).map(r => r.slug));
console.log(`기존 제주 DB: ${existingSlugs.size}개\n`);

const failed = [];
let inserted = 0, skipped = 0, failedCount = 0;

// ── 1단계: 카카오 검증 후 정상 삽입 ──────────────────────────────────────────
for (let i = 0; i < RESTAURANTS.length; i++) {
  const item = RESTAURANTS[i];
  const logPrefix = `  [${String(i + 1).padStart(3)}/${RESTAURANTS.length}] ${item.name}`;
  const slug = slugify(item.name);

  // 중복 건너뜀
  if (existingSlugs.has(slug)) {
    console.log(`${logPrefix} → ⏭️  이미 존재`);
    skipped++;
    continue;
  }

  // 카카오 검증
  const verified = await verifyWithKakao(item);
  if (!verified) {
    console.log(`${logPrefix} → ❌ 카카오 검증 실패`);
    failed.push({ ...item, _reason: "카카오 검증 실패" });
    failedCount++;
    await sleep(300);
    continue;
  }

  const coordFlag = verified._coordVerified ? "✅" : "⚠️ ";
  console.log(`${logPrefix} → ${coordFlag} ${verified.name}`);
  console.log(`      주소: ${verified.address}`);
  console.log(`      좌표: (${verified.lat.toFixed(5)}, ${verified.lng.toFixed(5)})`);

  // 카테고리 매핑 (DB 로드된 catMap 사용)
  const catEntry = resolveCategory(catMap, etcRow, item.category);
  if (!catEntry) {
    console.log(`      ⚠️  카테고리 매핑 실패 — 건너뜀`);
    failed.push({ ...item, _reason: `카테고리 매핑 실패: ${item.category}` });
    failedCount++;
    await sleep(300);
    continue;
  }
  if (catEntry === etcRow && item.category !== "기타") {
    console.log(`      ⚠️  카테고리 "${item.category}" → "기타"로 분류 (수동 재분류 필요)`);
  }

  // ID 생성 + 삽입
  const id = await nextId(catEntry.id_prefix);
  console.log(`      카테고리: ${catEntry.id} (prefix: ${catEntry.id_prefix}) → id: ${id}`);

  const row = {
    id,
    city_id:  CITY_ID,
    name:     verified.name,
    slug,
    address:  verified.address,
    lat:      verified.lat,
    lng:      verified.lng,
    phone:    verified.phone || item.phone || null,
    category: catEntry.id,   // "jeju_칼국수" 형태 — 춘천/전주와 완전히 별개
  };

  const result = await insertRow(row);
  if (result.dryRun) {
    console.log(`      [DRY RUN] 삽입 예정`);
    existingSlugs.add(slug);
    inserted++;
  } else if (result.ok) {
    console.log(`      💾 삽입 완료`);
    existingSlugs.add(slug);
    inserted++;
  } else {
    console.log(`      ⚠️  삽입 실패: ${result.error}`);
    failed.push({ ...item, _reason: `DB 삽입 실패: ${result.error}` });
    failedCount++;
  }

  await sleep(300);
}

// 실패 목록 저장
if (failed.length > 0) {
  if (!DRY_RUN) writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2), "utf8");
  console.log(`\n❌ 실패 ${failed.length}개 → ${DRY_RUN ? "(DRY RUN, 저장 생략)" : FAILED_FILE}`);
  failed.forEach(r => console.log(`   - ${r.name}  (${r._reason})`));
}

// ── 2단계: 검증 실패 항목 hidden/needs_review 로 삽입 ────────────────────────
// 소스 1: 현재 실행에서 실패한 항목
await insertUnverifiedItems(failed, catMap, etcRow, existingSlugs, "현재 실패 항목");

// 소스 2: restaurants-jeju-failed.json (이전 실행 실패 항목)
if (existsSync(FAILED_FILE)) {
  const prevFailed = JSON.parse(readFileSync(FAILED_FILE, "utf8"));
  // _reason 필드가 있는 것만 (정상 실패 목록 형식)
  const eligible = prevFailed.filter(r => r._reason && !existingSlugs.has(slugify(r.name)));
  if (eligible.length > 0) {
    await insertUnverifiedItems(eligible, catMap, etcRow, existingSlugs, "restaurants-jeju-failed.json");
  }
}

// 소스 3: restaurants-jeju-retry-ok.json 의 _manualCheck 항목 (위치 불확실)
if (existsSync(RETRY_OK_FILE)) {
  const retryOk = JSON.parse(readFileSync(RETRY_OK_FILE, "utf8"));
  const manualItems = retryOk.filter(r => r._manualCheck && !existingSlugs.has(slugify(r.name)));
  if (manualItems.length > 0) {
    await insertUnverifiedItems(manualItems, catMap, etcRow, existingSlugs, "restaurants-jeju-retry-ok.json (_manualCheck)");
  }
}

// ── 최종 요약 ─────────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(50)}`);
console.log(`정상 삽입: ${inserted}개 / 건너뜀: ${skipped}개 / 검증 실패: ${failedCount}개`);
