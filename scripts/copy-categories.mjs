/**
 * copy-categories.mjs
 *
 * 춘천(chuncheon) 카테고리를 제주(jeju)용으로 복사합니다.
 *   - id_prefix 앞에 "jj" 추가 (예: kk → jjkk)
 *   - city_id = 'jeju' 로 설정
 *   - 이미 jeju 카테고리가 존재하면 건너뜀
 *   - 춘천/전주 데이터는 읽기만 하고 절대 수정하지 않음
 *
 * 사용법:
 *   node scripts/copy-categories.mjs          # 실제 적용
 *   DRY_RUN=1 node scripts/copy-categories.mjs  # 미리보기 (DB 변경 없음)
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, "../.env"), "utf-8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ VITE_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  Prefer: "return=representation",
};

async function fetchCategories(cityId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/categories?city_id=eq.${cityId}&order=sort_order.asc`,
    { headers }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`카테고리 조회 실패 (${cityId}) ${res.status}: ${text}`);
  }
  return res.json();
}

async function insertCategories(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT 실패 ${res.status}: ${text}`);
  }
  return res.json();
}

(async () => {
  console.log(`\n제주 카테고리 복사 시작 (춘천 → 제주)${DRY_RUN ? " [DRY RUN]" : ""}\n`);

  // 1. 제주 카테고리 이미 존재하는지 확인
  const existing = await fetchCategories("jeju");
  if (existing.length > 0) {
    console.log(`⚠️  제주 카테고리가 이미 ${existing.length}개 존재합니다. 건너뜀.`);
    console.log("   기존 카테고리를 교체하려면 직접 DB에서 삭제 후 재실행하세요.");
    process.exit(0);
  }

  // 2. 춘천 카테고리 읽기 (읽기 전용)
  const chuncheonCategories = await fetchCategories("chuncheon");
  console.log(`✅ 춘천 카테고리 ${chuncheonCategories.length}개 조회 완료\n`);

  // 3. 제주용으로 변환
  //    - id:        "jeju_" 접두사 추가 → 춘천/전주와 완전히 별개 (관리자 모드 연계 차단)
  //    - id_prefix: 기존 도시코드 제거 후 "jj" 붙임
  //                 예) jjmk → endsWith('mk') → base='mk' → 'jjmk'
  //                 예) kk   → endsWith('kk') → base='kk' → 'jjkk'
  const BASE_PREFIXES = [
    'kk','sp','hw','dk','bs','td','bk','cf','sj','mk',
    'cn','dg','dc','it','jp','sb','bj','sv','jg','fs',
    'gb','sg','gj','hs','bg','dd','etc',
  ];

  const resolvePrefix = (rawPrefix) => {
    const base = BASE_PREFIXES.find((b) => rawPrefix.endsWith(b)) ?? rawPrefix;
    return `jj${base}`;
  };

  const jejuCategories = chuncheonCategories.map((c) => ({
    id: `jeju_${c.id}`,
    label: c.label,
    emoji: c.emoji,
    id_prefix: resolvePrefix(c.id_prefix),
    city_id: "jeju",
    sort_order: c.sort_order,
    tag_placeholder: c.tag_placeholder ?? "",
    tag_suggestions: c.tag_suggestions ?? [],
  }));

  // 4. 미리보기 출력
  console.log("복사할 카테고리 목록:");
  jejuCategories.forEach((c, i) => {
    const src = chuncheonCategories[i];
    console.log(`  ${c.emoji} ${c.label.padEnd(8)} id: ${src.id} → ${c.id}  prefix: ${src.id_prefix} → ${c.id_prefix}`);
  });
  console.log(`\n총 ${jejuCategories.length}개\n`);

  if (DRY_RUN) {
    console.log("DRY RUN 완료. DB는 변경되지 않았습니다.");
    process.exit(0);
  }

  // 5. 삽입
  await insertCategories(jejuCategories);
  console.log(`✅ 제주 카테고리 ${jejuCategories.length}개 삽입 완료!`);
  console.log("   앱을 새로고침하면 제주 카테고리가 반영됩니다.");
})();
