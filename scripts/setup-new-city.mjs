/**
 * setup-new-city.mjs
 *
 * 새 도시를 맛탐 플랫폼에 추가합니다.
 *   1. cities 테이블에 도시 등록
 *   2. 기본 카테고리 세팅 (다른 도시에서 복사하거나 기본값 사용)
 *   3. 식당 데이터는 비워둠 — 나중에 stage1/stage2로 추가
 *
 * 사용법:
 *   node scripts/setup-new-city.mjs
 *
 * 필수 환경변수:
 *   CITY_ID       새 도시 ID (영문 소문자, 예: busan, daegu, incheon)
 *   CITY_NAME     도시 표시명 (예: 부산, 대구, 인천)
 *   CITY_LAT      도시 중심 위도 (예: 35.1796)
 *   CITY_LNG      도시 중심 경도 (예: 129.0756)
 *
 * 선택 환경변수:
 *   CITY_DESC       도시 설명 (기본: "맛탐 {도시명}")
 *   CITY_ZOOM       지도 기본 줌 레벨 (기본: 12)
 *   COPY_FROM       카테고리 복사할 기존 도시 ID (기본: chuncheon)
 *                   "none" 으로 설정하면 기본 공통 카테고리만 세팅
 *   DRY_RUN=1       DB 변경 없이 미리보기만
 *
 * 예시:
 *   CITY_ID=busan CITY_NAME=부산 CITY_LAT=35.1796 CITY_LNG=129.0756 node scripts/setup-new-city.mjs
 *   CITY_ID=daegu CITY_NAME=대구 CITY_LAT=35.8714 CITY_LNG=128.6014 COPY_FROM=jeonju node scripts/setup-new-city.mjs
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
const CITY_ID   = process.env.CITY_ID;
const CITY_NAME = process.env.CITY_NAME;
const CITY_LAT  = parseFloat(process.env.CITY_LAT ?? "");
const CITY_LNG  = parseFloat(process.env.CITY_LNG ?? "");

if (!CITY_ID || !CITY_NAME || isNaN(CITY_LAT) || isNaN(CITY_LNG)) {
  console.error("❌ 필수 환경변수 누락: CITY_ID, CITY_NAME, CITY_LAT, CITY_LNG 모두 필요합니다.");
  console.error("   예시: CITY_ID=busan CITY_NAME=부산 CITY_LAT=35.1796 CITY_LNG=129.0756 node scripts/setup-new-city.mjs");
  process.exit(1);
}

const CITY_DESC  = process.env.CITY_DESC  ?? `맛탐 ${CITY_NAME}`;
const CITY_ZOOM  = parseInt(process.env.CITY_ZOOM ?? "12");
const COPY_FROM  = process.env.COPY_FROM  ?? "chuncheon";

// ── 기본 공통 카테고리 (COPY_FROM=none 시 사용) ──────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: "한식",     label: "한식",    emoji: "🍚", id_prefix: "hs",  sort_order: 1 },
  { id: "중화요리", label: "중화요리", emoji: "🥡", id_prefix: "cn",  sort_order: 2 },
  { id: "일식",     label: "일식",    emoji: "🍣", id_prefix: "jp",  sort_order: 3 },
  { id: "이탈리안", label: "이탈리안", emoji: "🍝", id_prefix: "it",  sort_order: 4 },
  { id: "삼겹살",   label: "삼겹살",  emoji: "🥓", id_prefix: "sp",  sort_order: 5 },
  { id: "한우",     label: "한우",    emoji: "🥩", id_prefix: "hw",  sort_order: 6 },
  { id: "초밥",     label: "초밥",    emoji: "🍱", id_prefix: "sb",  sort_order: 7 },
  { id: "보쌈/족발", label: "보쌈/족발", emoji: "🐷", id_prefix: "bj", sort_order: 8 },
  { id: "국밥/탕류", label: "국밥/탕류", emoji: "🥣", id_prefix: "gb", sort_order: 9 },
  { id: "칼국수",   label: "칼국수",  emoji: "🍜", id_prefix: "kk",  sort_order: 10 },
  { id: "수제버거", label: "수제버거", emoji: "🍔", id_prefix: "bg",  sort_order: 11 },
  { id: "돈까스",   label: "돈까스",  emoji: "🍛", id_prefix: "dk",  sort_order: 12 },
  { id: "분식",     label: "분식",    emoji: "🥚", id_prefix: "bs",  sort_order: 13 },
  { id: "통닭",     label: "통닭",    emoji: "🍗", id_prefix: "td",  sort_order: 14 },
  { id: "카페",     label: "카페",    emoji: "☕", id_prefix: "cf",  sort_order: 15 },
  { id: "베이커리", label: "베이커리", emoji: "🥐", id_prefix: "bk",  sort_order: 16 },
  { id: "술집",     label: "술집",    emoji: "🍻", id_prefix: "sj",  sort_order: 17 },
  { id: "기타",     label: "기타",    emoji: "🍽️", id_prefix: "etc", sort_order: 18 },
];

// ── Step 1: 도시 중복 확인 ────────────────────────────────────────────────────
console.log(`\n━━━ 새 도시 설정: ${CITY_NAME}(${CITY_ID}) ━━━${DRY_RUN ? " [DRY RUN]" : ""}\n`);

const existRes = await fetch(`${SB_URL}/rest/v1/cities?id=eq.${CITY_ID}&select=id`, { headers: H });
const existData = await existRes.json();
if (existData.length > 0) {
  console.error(`❌ "${CITY_ID}" 도시가 이미 존재합니다. 다른 CITY_ID를 사용하세요.`);
  process.exit(1);
}

// ── Step 2: cities 테이블에 삽입 ─────────────────────────────────────────────
const cityRow = {
  id: CITY_ID,
  name: CITY_NAME,
  description: CITY_DESC,
  lat: CITY_LAT,
  lng: CITY_LNG,
  zoom: CITY_ZOOM,
  is_active: true,
  sort_order: 99,  // 마지막 순서 — Supabase 대시보드에서 직접 조정
};

console.log(`📍 도시 등록:`);
console.log(`   ID: ${CITY_ID} | 이름: ${CITY_NAME}`);
console.log(`   좌표: (${CITY_LAT}, ${CITY_LNG}) | 줌: ${CITY_ZOOM}`);
console.log(`   설명: ${CITY_DESC}`);

if (!DRY_RUN) {
  const r = await fetch(`${SB_URL}/rest/v1/cities`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(cityRow),
  });
  if (!r.ok) {
    const t = await r.text();
    console.error(`❌ cities 삽입 실패: ${t}`);
    process.exit(1);
  }
  console.log(`   ✅ cities 테이블 삽입 완료\n`);
} else {
  console.log(`   [DRY RUN] 삽입 스킵\n`);
}

// ── Step 3: 카테고리 준비 ─────────────────────────────────────────────────────
let categories = [];

if (COPY_FROM === "none") {
  console.log(`📂 기본 공통 카테고리 사용 (${DEFAULT_CATEGORIES.length}개)`);
  categories = DEFAULT_CATEGORIES;
} else {
  console.log(`📂 "${COPY_FROM}" 도시 카테고리 복사 중...`);
  const catRes = await fetch(
    `${SB_URL}/rest/v1/categories?city_id=eq.${COPY_FROM}&select=id,label,emoji,id_prefix,tag_placeholder,tag_suggestions,sort_order&order=sort_order`,
    { headers: H }
  );
  const catData = await catRes.json();
  if (!Array.isArray(catData) || catData.length === 0) {
    console.warn(`⚠️  "${COPY_FROM}" 카테고리를 가져오지 못했습니다. 기본 카테고리로 대체합니다.`);
    categories = DEFAULT_CATEGORIES;
  } else {
    categories = catData;
    console.log(`   ${categories.length}개 카테고리 복사`);
  }
}

// ── Step 4: 카테고리 삽입 ─────────────────────────────────────────────────────
console.log(`\n📋 카테고리 삽입 (${categories.length}개):`);
categories.forEach(c => console.log(`   ${c.sort_order}. ${c.emoji} ${c.label} (id: ${c.id}, prefix: ${c.id_prefix})`));

if (!DRY_RUN) {
  const rows = categories.map(c => ({
    id: c.id,
    city_id: CITY_ID,
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
    const t = await r.text();
    console.error(`❌ 카테고리 삽입 실패: ${t}`);
    process.exit(1);
  }
  console.log(`   ✅ 카테고리 삽입 완료\n`);
} else {
  console.log(`   [DRY RUN] 삽입 스킵\n`);
}

// ── 완료 요약 ─────────────────────────────────────────────────────────────────
console.log(`${"─".repeat(55)}`);
console.log(`${DRY_RUN ? "[DRY RUN] " : ""}✅ ${CITY_NAME}(${CITY_ID}) 플랫폼 준비 완료!`);
console.log(`\n다음 단계:`);
console.log(`  1. 앱 접속: mattam.vercel.app/${CITY_ID}`);
console.log(`  2. 카테고리 커스터마이즈: 관리자 모드 → 도시 선택 → 편집모드`);
console.log(`  3. 식당 추가:`);
console.log(`     CITY=${CITY_ID} CITY_NAME=${CITY_NAME} node scripts/stage1-verify.mjs`);
console.log(`     CITY=${CITY_ID} CITY_NAME=${CITY_NAME} node scripts/stage2-insert.mjs`);
