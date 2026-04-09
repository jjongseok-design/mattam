/**
 * import-jeju-failed.mjs
 *
 * restaurants-jeju-failed.json 의 미검증 식당을 DB에 삽입합니다.
 *   - needs_review = true, is_hidden = true
 *   - 좌표: 제주 중심 임시값 (33.4996, 126.5312)
 *   - category: jeju_기타
 *   - id prefix: jjetc
 *   - city_id = 'jeju' 고정 — 춘천/전주 절대 건드리지 않음
 *
 * 환경변수: .env.local 우선, 없으면 .env
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 사용법:
 *   node scripts/import-jeju-failed.mjs
 *   DRY_RUN=1 node scripts/import-jeju-failed.mjs
 *
 *   # PowerShell:
 *   $env:DRY_RUN="1"; node scripts/import-jeju-failed.mjs
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

const SB_URL  = env.VITE_SUPABASE_URL;
const SK      = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SB_URL) { console.error("❌ VITE_SUPABASE_URL 누락"); process.exit(1); }
if (!SK)     { console.error("❌ SUPABASE_SERVICE_ROLE_KEY 누락"); process.exit(1); }

const CITY_ID       = "jeju";
const CATEGORY      = "jeju_기타";
const ID_PREFIX     = "jjetc";
const JEJU_LAT      = 33.4996;
const JEJU_LNG      = 126.5312;
const INPUT_FILE    = resolve(ROOT, "restaurants-jeju-failed.json");

const SB_H = {
  apikey:        SK,
  Authorization: `Bearer ${SK}`,
  "Content-Type": "application/json",
};

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
const items = JSON.parse(readFileSync(INPUT_FILE, "utf8"));
console.log(`\n━━━ 제주 실패 목록 삽입 (${items.length}개)${DRY_RUN ? " [DRY RUN]" : ""} ━━━\n`);

// ── 기존 slug 조회 (중복 방지) ────────────────────────────────────────────────
const existingRes = await fetch(
  `${SB_URL}/rest/v1/restaurants?city_id=eq.${CITY_ID}&select=slug`,
  { headers: SB_H }
);
if (!existingRes.ok) {
  console.error(`❌ 기존 식당 조회 실패: ${existingRes.status}`);
  process.exit(1);
}
const existingSlugs = new Set((await existingRes.json()).map(r => r.slug));
console.log(`기존 제주 DB: ${existingSlugs.size}개\n`);

// ── jjetc prefix 현재 최대 순번 조회 ─────────────────────────────────────────
const counterRes = await fetch(
  `${SB_URL}/rest/v1/restaurants?id=like.${ID_PREFIX}*&city_id=eq.${CITY_ID}&select=id`,
  { headers: SB_H }
);
const counterRows = await counterRes.json();
let counter = counterRows.reduce((m, row) => {
  const n = parseInt(row.id.replace(ID_PREFIX, ""));
  return isNaN(n) ? m : Math.max(m, n);
}, 0);

// ── 삽입 ─────────────────────────────────────────────────────────────────────
let inserted = 0, skipped = 0;

for (let i = 0; i < items.length; i++) {
  const item   = items[i];
  const slug   = slugify(item.name);
  const logPfx = `  [${String(i + 1).padStart(3)}/${items.length}] ${item.name}`;

  if (existingSlugs.has(slug)) {
    console.log(`${logPfx} → ⏭️  이미 존재`);
    skipped++;
    continue;
  }

  counter++;
  const id = `${ID_PREFIX}${String(counter).padStart(2, "0")}`;

  const row = {
    id,
    city_id:      CITY_ID,
    name:         item.name,
    slug,
    address:      item.address ?? null,
    lat:          JEJU_LAT,
    lng:          JEJU_LNG,
    phone:        item.phone ?? null,
    category:     CATEGORY,
    needs_review: true,
    is_hidden:    true,
  };

  if (DRY_RUN) {
    console.log(`${logPfx} → [DRY RUN] id: ${id}`);
    existingSlugs.add(slug);
    inserted++;
    continue;
  }

  const res = await fetch(`${SB_URL}/rest/v1/restaurants`, {
    method:  "POST",
    headers: { ...SB_H, Prefer: "return=minimal" },
    body:    JSON.stringify(row),
  });

  if (res.ok) {
    console.log(`${logPfx} → 💾 삽입 완료 (id: ${id})`);
    existingSlugs.add(slug);
    inserted++;
  } else {
    const t = await res.text();
    console.log(`${logPfx} → ⚠️  삽입 실패: ${t}`);
  }
}

console.log(`\n${"─".repeat(50)}`);
console.log(`완료!  삽입: ${inserted}개 / 건너뜀: ${skipped}개`);
if (DRY_RUN) console.log("(DRY RUN — DB 변경 없음)");
