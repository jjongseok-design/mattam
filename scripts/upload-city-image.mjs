/**
 * upload-city-image.mjs
 *
 * 로컬 이미지를 Supabase Storage에 업로드하고 cities 테이블 image_url을 업데이트합니다.
 *
 * 사용법:
 *   IMAGE=./제주.png node scripts/upload-city-image.mjs
 *
 * 옵션:
 *   IMAGE      업로드할 로컬 이미지 경로 (필수)
 *   CITY_ID    대상 도시 ID (기본: jeju)
 *   DEST       Storage 업로드 경로 (기본: cities/{CITY_ID}.{확장자})
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, extname, basename } from "path";
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

const SB_URL = env.VITE_SUPABASE_URL;
const SK     = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL) { console.error("❌ VITE_SUPABASE_URL 누락"); process.exit(1); }
if (!SK)     { console.error("❌ SUPABASE_SERVICE_ROLE_KEY 누락"); process.exit(1); }

// ── 인자 파싱 ─────────────────────────────────────────────────────────────────
const IMAGE_PATH = process.env.IMAGE;
const CITY_ID    = process.env.CITY_ID ?? "jeju";
const BUCKET     = "restaurant-images";

if (!IMAGE_PATH) {
  console.error("❌ IMAGE 환경변수가 필요합니다.");
  console.error("   예: IMAGE=./제주.png node scripts/upload-city-image.mjs");
  process.exit(1);
}

const absImagePath = resolve(process.cwd(), IMAGE_PATH);
if (!existsSync(absImagePath)) {
  console.error(`❌ 파일을 찾을 수 없습니다: ${absImagePath}`);
  process.exit(1);
}

const ext      = extname(absImagePath).toLowerCase();           // ".png"
const DEST     = process.env.DEST ?? `cities/${CITY_ID}${ext}`; // "cities/jeju.png"

const MIME_MAP = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
};
const contentType = MIME_MAP[ext] ?? "application/octet-stream";

const SB_H = {
  apikey:        SK,
  Authorization: `Bearer ${SK}`,
};

// ── 업로드 ────────────────────────────────────────────────────────────────────
console.log(`파일:    ${basename(absImagePath)}`);
console.log(`도시:    ${CITY_ID}`);
console.log(`버킷:    ${BUCKET}`);
console.log(`경로:    ${DEST}`);
console.log(`형식:    ${contentType}\n`);

const fileData = readFileSync(absImagePath);

// upsert=true: 이미 존재하면 덮어씀
const uploadUrl = `${SB_URL}/storage/v1/object/${BUCKET}/${DEST}`;
const uploadRes = await fetch(uploadUrl, {
  method:  "POST",
  headers: {
    ...SB_H,
    "Content-Type":        contentType,
    "x-upsert":            "true",
    "Cache-Control":       "3600",
  },
  body: fileData,
});

if (!uploadRes.ok) {
  const text = await uploadRes.text();
  console.error(`❌ 업로드 실패 (${uploadRes.status}): ${text}`);
  process.exit(1);
}

console.log("✅ Storage 업로드 완료");

// ── 공개 URL 조회 ─────────────────────────────────────────────────────────────
const publicUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${DEST}`;
console.log(`   공개 URL: ${publicUrl}\n`);

// ── cities 테이블 image_url 업데이트 ─────────────────────────────────────────
const updateRes = await fetch(
  `${SB_URL}/rest/v1/cities?id=eq.${CITY_ID}`,
  {
    method:  "PATCH",
    headers: {
      ...SB_H,
      "Content-Type": "application/json",
      "Prefer":       "return=minimal",
    },
    body: JSON.stringify({ image_url: publicUrl }),
  }
);

if (!updateRes.ok) {
  const text = await updateRes.text();
  console.error(`❌ cities 테이블 업데이트 실패 (${updateRes.status}): ${text}`);
  process.exit(1);
}

console.log(`✅ cities.image_url 업데이트 완료 (${CITY_ID})`);
