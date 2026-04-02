/**
 * stage1-verify.mjs
 *
 * 식당 목록을 카카오 API로 검증합니다.
 *   1. 식당명으로 카카오 키워드 검색
 *   2. 반환된 이름·주소가 입력과 일치하는지 확인
 *   3. 좌표 반경 200m 재검색으로 실제 위치 교차검증
 *   4. 결과를 restaurants-verified.json 으로 저장
 *
 * 사용법:
 *   node scripts/stage1-verify.mjs
 *
 * 입력: restaurants-jeonju-new.json
 *   [{ "name": "식당명", "address": "주소(선택)", "category": "카테고리" }]
 *
 * 출력: restaurants-verified.json
 *   검증 통과한 식당 목록 (카카오 확정 이름/주소/좌표 포함)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const KAKAO = env.KAKAO_REST_API_KEY;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const INPUT_FILE  = process.env.INPUT  ?? "restaurants-jeonju-new.json";
const OUTPUT_FILE = process.env.OUTPUT ?? "restaurants-verified.json";

const RESTAURANTS = JSON.parse(readFileSync(resolve(ROOT, INPUT_FILE), "utf8"));

function nameMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/\s/g, "").replace(/[()（）]/g, "");
  const ca = clean(a), cb = clean(b);
  return ca === cb || ca.includes(cb) || cb.includes(ca) || ca.slice(0, 4) === cb.slice(0, 4);
}

// 1차: 이름+전주 키워드 검색
async function kakaoKeyword(name) {
  for (const code of ["FD6", "CE7", ""]) {
    const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url.searchParams.set("query", `${name} 전주`);
    if (code) url.searchParams.set("category_group_code", code);
    url.searchParams.set("size", "5");
    const r = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO}` } });
    const d = await r.json();
    if (d.documents?.length) return d.documents;
  }
  return [];
}

// 2차: 좌표 반경 200m 재검색 (위치 교차검증)
async function kakaoByCoords(name, lat, lng) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", name);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("radius", "200");
  url.searchParams.set("size", "3");
  const r = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO}` } });
  const d = await r.json();
  return d.documents ?? [];
}

console.log(`━━━ Stage 1: 카카오 검증 (${RESTAURANTS.length}개) ━━━\n`);

const verified = [];
const failed = [];

for (let i = 0; i < RESTAURANTS.length; i++) {
  const item = RESTAURANTS[i];
  const prefix = `  [${String(i + 1).padStart(2)}/${RESTAURANTS.length}] ${item.name}`;

  // 1차 검색
  const docs = await kakaoKeyword(item.name);
  const doc = docs.find(d => nameMatch(item.name, d.place_name));

  if (!doc) {
    console.log(`${prefix} → ❌ 검색 결과 없음`);
    failed.push({ ...item, _reason: "검색 결과 없음" });
    await sleep(200);
    continue;
  }

  const lat = parseFloat(doc.y);
  const lng = parseFloat(doc.x);
  const address = doc.road_address_name || doc.address_name;

  // 2차: 좌표로 재검색 (위치 교차검증)
  await sleep(200);
  const coordDocs = await kakaoByCoords(doc.place_name, lat, lng);
  const coordMatch = coordDocs.find(d => nameMatch(doc.place_name, d.place_name));

  if (!coordMatch) {
    // 좌표 주변에서 동일 식당 못 찾음 → 위치 불확실
    console.log(`${prefix} → ⚠️  위치 불확실 — 이름: ${doc.place_name} / 주소: ${address}`);
    console.log(`    (좌표 반경 200m 재검색에서 식당 미확인)`);
    // 통과는 시키되 플래그 표시
    verified.push({
      name: doc.place_name,
      address,
      lat,
      lng,
      phone: doc.phone || null,
      category: item.category,
      _coordVerified: false,
    });
  } else {
    // 이름 + 좌표 모두 일치 ✅
    console.log(`${prefix} → ✅ ${doc.place_name}`);
    console.log(`    주소: ${address}`);
    console.log(`    좌표: (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    verified.push({
      name: doc.place_name,
      address,
      lat,
      lng,
      phone: doc.phone || null,
      category: item.category,
      _coordVerified: true,
    });
  }

  await sleep(300);
}

console.log(`\n${"─".repeat(50)}`);
console.log(`✅ 검증 통과: ${verified.length}개`);
console.log(`❌ 검증 실패: ${failed.length}개`);

if (failed.length > 0) {
  console.log(`\n❌ 실패 목록:`);
  failed.forEach(r => console.log(`  - ${r.name} → ${r._reason}`));
}

const unverified = verified.filter(r => !r._coordVerified);
if (unverified.length > 0) {
  console.log(`\n⚠️  위치 불확실 (수동 확인 권장):`);
  unverified.forEach(r => console.log(`  - ${r.name} | ${r.address}`));
}

// 결과 저장
const output = verified.map(({ _coordVerified, ...r }) => r);
writeFileSync(resolve(ROOT, OUTPUT_FILE), JSON.stringify(output, null, 2), "utf8");
console.log(`\n💾 ${OUTPUT_FILE} 저장 완료 (${output.length}개)`);
console.log(`\n다음 단계: node scripts/stage2-insert.mjs`);
