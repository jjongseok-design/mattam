/**
 * setup-new-city.mjs
 *
 * 새 도시를 맛탐 플랫폼에 추가합니다.
 *   1. cities 테이블에 도시 등록
 *   2. 카테고리 세팅:
 *      - 도시 특화 카테고리를 맨 앞에 삽입 (sort_order 1, 2, ...)
 *      - 춘천 기본 카테고리를 그 뒤에 복사 (완전히 새 도시 city_id로 분리)
 *   3. 식당 데이터는 비워둠 — 나중에 stage1/stage2로 추가
 *
 * ─── 사용법 ───────────────────────────────────────────────────────────────────
 *
 *   기본 (특화 카테고리 없이 춘천 복사만):
 *     CITY_ID=busan CITY_NAME=부산 CITY_LAT=35.1796 CITY_LNG=129.0756 \
 *       node scripts/setup-new-city.mjs
 *
 *   특화 카테고리 JSON 파일 지정:
 *     CITY_ID=busan CITY_NAME=부산 CITY_LAT=35.1796 CITY_LNG=129.0756 \
 *     SPECIAL_FILE=city-busan-special.json \
 *       node scripts/setup-new-city.mjs
 *
 *   DRY RUN (DB 변경 없이 미리보기):
 *     DRY_RUN=1 CITY_ID=busan ... node scripts/setup-new-city.mjs
 *
 * ─── 필수 환경변수 ────────────────────────────────────────────────────────────
 *   CITY_ID     영문 소문자 (예: busan, daegu, suwon)
 *   CITY_NAME   표시 이름 (예: 부산, 대구, 수원)
 *   CITY_LAT    중심 위도
 *   CITY_LNG    중심 경도
 *
 * ─── 선택 환경변수 ────────────────────────────────────────────────────────────
 *   CITY_DESC     도시 설명 (기본: "맛탐 {CITY_NAME}")
 *   CITY_ZOOM     지도 줌 레벨 (기본: 12)
 *   SPECIAL_FILE  도시 특화 카테고리 JSON 파일 경로 (기본: 없음)
 *   BASE_CITY     복사할 기본 도시 (기본: chuncheon)
 *   DRY_RUN=1     미리보기 전용
 *
 * ─── 특화 카테고리 JSON 형식 ─────────────────────────────────────────────────
 *   [
 *     { "id": "비빔밥",    "label": "비빔밥",    "emoji": "🍚", "id_prefix": "bb" },
 *     { "id": "콩나물국밥", "label": "콩나물국밥", "emoji": "🥣", "id_prefix": "kn" }
 *   ]
 *   → sort_order는 자동 부여 (1, 2, ...), base 카테고리는 그 뒤로 밀림
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SB_URL  = env.VITE_SUPABASE_URL;
const SK      = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === "1";

const H = {
  "Content-Type": "application/json",
  "apikey": SK,
  "Authorization": `Bearer ${SK}`,
  "Prefer": "return=representation",
};

// ── 필수 파라미터 검증 ────────────────────────────────────────────────────────
const CITY_ID    = process.env.CITY_ID;
const CITY_NAME  = process.env.CITY_NAME;
const CITY_LAT   = parseFloat(process.env.CITY_LAT ?? "");
const CITY_LNG   = parseFloat(process.env.CITY_LNG ?? "");
const CITY_DESC  = process.env.CITY_DESC ?? `맛탐 ${CITY_NAME}`;
const CITY_ZOOM  = parseInt(process.env.CITY_ZOOM ?? "12");
const BASE_CITY  = process.env.BASE_CITY ?? "chuncheon";
const SPECIAL_FILE = process.env.SPECIAL_FILE ?? null;

if (!CITY_ID || !CITY_NAME || isNaN(CITY_LAT) || isNaN(CITY_LNG)) {
  console.error("❌ 필수 환경변수 누락");
  console.error("   CITY_ID, CITY_NAME, CITY_LAT, CITY_LNG 모두 필요합니다.");
  console.error("\n   예시:");
  console.error("   CITY_ID=busan CITY_NAME=부산 CITY_LAT=35.1796 CITY_LNG=129.0756 node scripts/setup-new-city.mjs");
  process.exit(1);
}

console.log(`\n${"━".repeat(55)}`);
console.log(` 새 도시 설정: ${CITY_NAME} (${CITY_ID})${DRY_RUN ? "  [DRY RUN]" : ""}`);
console.log(`${"━".repeat(55)}\n`);

// ── Step 1: 도시 중복 확인 ────────────────────────────────────────────────────
const existRes = await fetch(`${SB_URL}/rest/v1/cities?id=eq.${CITY_ID}&select=id`, { headers: H });
const existData = await existRes.json();
if (existData.length > 0) {
  console.error(`❌ "${CITY_ID}" 도시가 이미 존재합니다. 다른 CITY_ID를 사용하세요.`);
  process.exit(1);
}

// ── Step 2: cities 테이블에 삽입 ─────────────────────────────────────────────
console.log(`📍 도시 등록`);
console.log(`   ID: ${CITY_ID}  |  이름: ${CITY_NAME}`);
console.log(`   좌표: (${CITY_LAT}, ${CITY_LNG})  |  줌: ${CITY_ZOOM}`);
console.log(`   설명: ${CITY_DESC}`);

if (!DRY_RUN) {
  const r = await fetch(`${SB_URL}/rest/v1/cities`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      id: CITY_ID,
      name: CITY_NAME,
      description: CITY_DESC,
      lat: CITY_LAT,
      lng: CITY_LNG,
      zoom: CITY_ZOOM,
      is_active: true,
      sort_order: 99,
    }),
  });
  if (!r.ok) {
    console.error(`❌ cities 삽입 실패: ${await r.text()}`);
    process.exit(1);
  }
  console.log(`   ✅ 완료\n`);
} else {
  console.log(`   [DRY RUN] 스킵\n`);
}

// ── Step 3: 도시 특화 카테고리 로드 ──────────────────────────────────────────
let specialCats = [];

if (SPECIAL_FILE) {
  const filePath = resolve(ROOT, SPECIAL_FILE);
  if (!existsSync(filePath)) {
    console.error(`❌ SPECIAL_FILE 파일을 찾을 수 없습니다: ${filePath}`);
    process.exit(1);
  }
  specialCats = JSON.parse(readFileSync(filePath, "utf8"));
  console.log(`🌟 도시 특화 카테고리 (${specialCats.length}개) — 맨 앞에 삽입`);
  specialCats.forEach((c, i) => console.log(`   ${i + 1}. ${c.emoji} ${c.label}  (id: ${c.id}, prefix: ${c.id_prefix})`));
  console.log();
} else {
  console.log(`ℹ️  SPECIAL_FILE 없음 — 특화 카테고리 없이 진행\n`);
}

// ── Step 4: 기본 도시(춘천) 카테고리 복사 ────────────────────────────────────
console.log(`📂 "${BASE_CITY}" 카테고리 복사 중...`);
const catRes = await fetch(
  `${SB_URL}/rest/v1/categories?city_id=eq.${BASE_CITY}&select=id,label,emoji,id_prefix,tag_placeholder,tag_suggestions,sort_order&order=sort_order`,
  { headers: H }
);
const baseCats = await catRes.json();

if (!Array.isArray(baseCats) || baseCats.length === 0) {
  console.error(`❌ "${BASE_CITY}" 카테고리를 가져오지 못했습니다.`);
  process.exit(1);
}

// 특화 카테고리 ID 목록 — 기본 카테고리에서 중복 제거
const specialIds = new Set(specialCats.map(c => c.id));
const filteredBase = baseCats.filter(c => !specialIds.has(c.id));
console.log(`   ${baseCats.length}개 중 ${filteredBase.length}개 복사 (특화 카테고리 ${specialCats.length}개 중복 제외)`);

// ── Step 5: sort_order 재부여 ──────────────────────────────────────────────
//   특화 카테고리: 1, 2, 3 ...
//   기본 카테고리: special_count + 1, special_count + 2 ...
const allCategories = [
  ...specialCats.map((c, i) => ({ ...c, sort_order: i + 1 })),
  ...filteredBase.map((c, i) => ({ ...c, sort_order: specialCats.length + i + 1 })),
];

console.log(`\n📋 최종 카테고리 순서 (${allCategories.length}개):`);
allCategories.forEach(c => {
  const tag = specialIds.has(c.id) ? " 🌟특화" : "";
  console.log(`   ${String(c.sort_order).padStart(2)}. ${c.emoji} ${c.label}${tag}`);
});

// ── Step 6: DB 삽입 ───────────────────────────────────────────────────────────
console.log();
if (!DRY_RUN) {
  const rows = allCategories.map(c => ({
    id: c.id,
    city_id: CITY_ID,          // ← 반드시 새 도시 ID로 저장 (기존 도시와 완전 분리)
    label: c.label,
    emoji: c.emoji,
    id_prefix: c.id_prefix,
    tag_placeholder: c.tag_placeholder ?? "",
    tag_suggestions: c.tag_suggestions ?? [],
    sort_order: c.sort_order,
  }));

  const r = await fetch(`${SB_URL}/rest/v1/categories`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    console.error(`❌ 카테고리 삽입 실패: ${await r.text()}`);
    process.exit(1);
  }
  console.log(`✅ 카테고리 ${rows.length}개 삽입 완료\n`);
} else {
  console.log(`[DRY RUN] 카테고리 삽입 스킵\n`);
}

// ── 완료 ─────────────────────────────────────────────────────────────────────
console.log(`${"─".repeat(55)}`);
console.log(`${DRY_RUN ? "[DRY RUN] " : ""}✅ ${CITY_NAME}(${CITY_ID}) 플랫폼 준비 완료!`);
console.log(`
다음 단계:
  1. 앱 접속 확인    : mattam.vercel.app/${CITY_ID}
  2. 카테고리 조정   : 관리자 모드 → ${CITY_NAME} 선택 → 편집모드
  3. 식당 추가 (나중에):
       CITY=${CITY_ID} CITY_NAME=${CITY_NAME} node scripts/stage1-verify.mjs
       CITY=${CITY_ID} CITY_NAME=${CITY_NAME} node scripts/stage2-insert.mjs
`);
