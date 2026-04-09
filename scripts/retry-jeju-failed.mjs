/**
 * retry-jeju-failed.mjs
 *
 * restaurants-jeju-failed.json 을 재검증합니다.
 *   - 3단계 재검증으로 import-jeju.mjs 에서 놓친 식당 구제
 *   - 통과 → restaurants-jeju-retry-ok.json
 *   - 최종 실패 → restaurants-jeju-failed2.json
 *   - city_id = 'jeju' 전용 — 춘천/전주 데이터 절대 건드리지 않음
 *
 * 3단계 재검증:
 *   1단계: 이름 + 제주 키워드 검색 → 앞 2글자 이상 유사도 체크
 *   2단계: 지점명(본점/점/관 등) 제거 후 재검색
 *   3단계: 주소로 카카오 address.json 검색 → 근처 식당 이름 비교
 *
 * 환경변수: .env.local 우선, 없으면 .env
 *   KAKAO_REST_API_KEY
 *
 * 사용법:
 *   node scripts/retry-jeju-failed.mjs
 *   DRY_RUN=1 node scripts/retry-jeju-failed.mjs
 *
 *   # PowerShell:
 *   $env:DRY_RUN="1"; node scripts/retry-jeju-failed.mjs
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
const DRY_RUN = process.env.DRY_RUN === "1";

if (!KAKAO) { console.error("❌ KAKAO_REST_API_KEY 누락"); process.exit(1); }

const INPUT_FILE  = resolve(ROOT, "restaurants-jeju-failed.json");
const OK_FILE     = resolve(ROOT, "restaurants-jeju-retry-ok.json");
const FAILED_FILE = resolve(ROOT, "restaurants-jeju-failed2.json");

if (!existsSync(INPUT_FILE)) {
  console.error(`❌ ${INPUT_FILE} 파일이 없습니다.`);
  process.exit(1);
}

const RESTAURANTS = JSON.parse(readFileSync(INPUT_FILE, "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 이름 유사도 (재시도용 — 앞 2글자 이상 일치면 통과) ────────────────────────
function nameMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/\s/g, "").replace(/[()（）\[\]]/g, "");
  const ca = clean(a), cb = clean(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;
  // 앞 2글자 이상 일치
  const minLen = Math.min(ca.length, cb.length);
  if (minLen >= 2 && ca.slice(0, 2) === cb.slice(0, 2)) return true;
  return false;
}

// ── 지점명 제거 ───────────────────────────────────────────────────────────────
// 제거 대상: 본점, OO점, OO관, 제주점, 제주본점 등
function stripBranch(name) {
  return name
    .replace(/\s*(제주\S*본점|제주\S*점|\S*본점|\S+점|\S+관)$/, "")
    .trim();
}

// ── 카카오 API ────────────────────────────────────────────────────────────────
const KAKAO_H = { Authorization: `KakaoAK ${KAKAO}` };

async function kakaoKeyword(query, opts = {}) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "5");
  if (opts.x)      url.searchParams.set("x",      String(opts.x));
  if (opts.y)      url.searchParams.set("y",      String(opts.y));
  if (opts.radius) url.searchParams.set("radius", String(opts.radius));
  const r = await fetch(url.toString(), { headers: KAKAO_H });
  const d = await r.json();
  return d.documents ?? [];
}

async function kakaoAddress(address) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);
  url.searchParams.set("size", "1");
  const r = await fetch(url.toString(), { headers: KAKAO_H });
  const d = await r.json();
  return d.documents ?? [];
}

function toResult(doc, category) {
  return {
    name:     doc.place_name,
    address:  doc.road_address_name || doc.address_name,
    lat:      parseFloat(doc.y),
    lng:      parseFloat(doc.x),
    phone:    doc.phone || null,
    category,
  };
}

// ── 3단계 재검증 ──────────────────────────────────────────────────────────────
async function retry(item) {
  const name     = item.name;
  const address  = item.address ?? "";
  const category = item.category ?? "";

  // ── 1단계: 이름 + 제주 키워드 검색 ──────────────────────────────────────────
  for (const code of ["FD6", "CE7", ""]) {
    const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url.searchParams.set("query", `${name} 제주`);
    if (code) url.searchParams.set("category_group_code", code);
    url.searchParams.set("size", "5");
    const r  = await fetch(url.toString(), { headers: KAKAO_H });
    const d  = await r.json();
    const doc = (d.documents ?? []).find(d => nameMatch(name, d.place_name));
    if (doc) return { result: toResult(doc, category), step: 1 };
  }
  await sleep(200);

  // ── 2단계: 지점명 제거 후 재검색 ─────────────────────────────────────────────
  const baseName = stripBranch(name);
  if (baseName && baseName !== name) {
    for (const code of ["FD6", "CE7", ""]) {
      const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
      url.searchParams.set("query", `${baseName} 제주`);
      if (code) url.searchParams.set("category_group_code", code);
      url.searchParams.set("size", "5");
      const r  = await fetch(url.toString(), { headers: KAKAO_H });
      const d  = await r.json();
      const doc = (d.documents ?? []).find(d => nameMatch(baseName, d.place_name));
      if (doc) return { result: toResult(doc, category), step: 2, strippedName: baseName };
    }
    await sleep(200);
  }

  // ── 3단계: 주소로 좌표 확보 → 근처 식당 이름 비교 ────────────────────────────
  if (address) {
    const addrDocs = await kakaoAddress(address);
    const addrDoc  = addrDocs[0];
    if (addrDoc) {
      const lat = parseFloat(addrDoc.y ?? addrDoc.address?.y);
      const lng = parseFloat(addrDoc.x ?? addrDoc.address?.x);
      if (lat && lng) {
        await sleep(200);
        const near    = await kakaoKeyword(name, { x: lng, y: lat, radius: 300 });
        const nearDoc = near.find(d => nameMatch(name, d.place_name));
        if (nearDoc) return { result: toResult(nearDoc, category), step: 3 };

        // 이름 완전 불일치여도 반경 내 첫 번째 음식점을 후보로 올림 (수동 확인용)
        const fallback = near[0];
        if (fallback) return { result: { ...toResult(fallback, category), _manualCheck: true }, step: 3 };
      }
    }
  }

  return null;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
console.log(`━━━ 제주 실패 목록 재검증 (${RESTAURANTS.length}개)${DRY_RUN ? " [DRY RUN]" : ""} ━━━\n`);

const ok      = [];
const failed2 = [];

for (let i = 0; i < RESTAURANTS.length; i++) {
  const item   = RESTAURANTS[i];
  const prefix = `  [${String(i + 1).padStart(3)}/${RESTAURANTS.length}] ${item.name}`;

  const found = await retry(item);

  if (!found) {
    console.log(`${prefix} → ❌ 3단계 모두 실패`);
    failed2.push({ ...item, _reason: "재검증 3단계 모두 실패" });
    await sleep(300);
    continue;
  }

  const { result, step, strippedName } = found;
  const stepLabel = ["", "1단계(키워드)", "2단계(지점명제거)", "3단계(주소)"][step];
  const checkFlag = result._manualCheck ? " ⚠️  수동확인필요" : "";

  console.log(`${prefix} → ✅ ${stepLabel}${checkFlag}`);
  console.log(`      카카오명: ${result.name}`);
  console.log(`      주소:     ${result.address}`);
  console.log(`      좌표:     (${result.lat.toFixed(5)}, ${result.lng.toFixed(5)})`);
  if (strippedName) console.log(`      지점명 제거: "${item.name}" → "${strippedName}"`);

  // _manualCheck 제거 후 저장
  const { _manualCheck, ...cleanResult } = result;
  ok.push({ ...cleanResult, _manualCheck: !!_manualCheck });

  await sleep(300);
}

console.log(`\n${"─".repeat(50)}`);
console.log(`통과: ${ok.length}개 / 최종 실패: ${failed2.length}개`);

if (DRY_RUN) {
  console.log("\n[DRY RUN] 파일 저장 생략.");
  if (ok.length)      { console.log(`\n통과 목록 (${ok.length}개):`);      ok.forEach(r => console.log(`  ✅ ${r.name}  ${r.address}`)); }
  if (failed2.length) { console.log(`\n실패 목록 (${failed2.length}개):`); failed2.forEach(r => console.log(`  ❌ ${r.name}`)); }
} else {
  writeFileSync(OK_FILE,     JSON.stringify(ok,      null, 2), "utf8");
  writeFileSync(FAILED_FILE, JSON.stringify(failed2, null, 2), "utf8");
  console.log(`\n💾 통과  → ${OK_FILE}`);
  console.log(`💾 실패  → ${FAILED_FILE}`);

  const manualList = ok.filter(r => r._manualCheck);
  if (manualList.length > 0) {
    console.log(`\n⚠️  수동 확인 권장 (주소 근처 식당으로 대체된 항목):`);
    manualList.forEach(r => console.log(`   - ${r.name}  ${r.address}`));
  }
}

console.log(`\n다음 단계: restaurants-jeju-retry-ok.json 을 import-jeju.mjs 로 삽입`);
console.log(`  INPUT=restaurants-jeju-retry-ok.json node scripts/import-jeju.mjs`);
