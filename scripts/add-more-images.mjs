/**
 * add-more-images.mjs
 *
 * 현재 이미지가 5장 미만인 식당에 Google Places Photos API로 이미지를 추가합니다.
 * image_url + extra_images 합계가 5장이 될 때까지 채웁니다.
 *
 * 사용법:
 *   node scripts/add-more-images.mjs
 *
 * 옵션 (환경변수):
 *   DRY_RUN=1     DB·Storage 변경 없이 결과 미리보기
 *   LIMIT=N       처리할 식당 수 제한
 *   CITY=chuncheon  특정 city_id만 처리
 *   DELAY_MS=2000   요청 간 딜레이 ms (기본 2000)
 *
 * 실행 예시:
 *   DRY_RUN=1 LIMIT=10 node scripts/add-more-images.mjs
 *   node scripts/add-more-images.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── .env 파싱 ────────────────────────────────────────────────────────────────

function parseEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = parseEnvFile(resolve(ROOT, ".env.local"));
const envBase = parseEnvFile(resolve(ROOT, ".env"));
const env = { ...envBase, ...envLocal, ...process.env };

// ── 설정 ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://cblckdcrsotqynngblyb.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8";
const GOOGLE_KEY = env.GOOGLE_PLACES_API_KEY;
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const CITY = env.CITY || null;
const DELAY_MS = parseInt(env.DELAY_MS || "2000");

if (!GOOGLE_KEY) {
  console.error("ERROR: GOOGLE_PLACES_API_KEY를 찾을 수 없습니다.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Supabase REST 헬퍼 ───────────────────────────────────────────────────────

const SB_HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function sbGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`Supabase GET → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sbPatch(id, body) {
  const url = `${SUPABASE_URL}/rest/v1/restaurants?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH → ${res.status}: ${await res.text()}`);
}

async function uploadToStorage(path, buf, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/restaurant-images/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!res.ok) throw new Error(`Storage upload → ${res.status}: ${await res.text()}`);
  // 공개 URL 반환
  return `${SUPABASE_URL}/storage/v1/object/public/restaurant-images/${path}`;
}

// ── Google Places 헬퍼 ───────────────────────────────────────────────────────

async function getPlaceId(name, address) {
  const query = address ? `${name} ${address}` : `${name} 춘천`;
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0]?.place_id ?? null;
}

async function getPlacePhotos(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.result?.photos ?? [];
}

async function downloadPhoto(photoReference) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.includes("image")) return null;
  const buf = await res.arrayBuffer();
  return { buf, contentType };
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`add-more-images.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작`);
  console.log(`설정: DELAY=${DELAY_MS}ms / LIMIT=${LIMIT ?? "없음"}`);
  console.log();

  // 5장 미만 식당 조회
  const params = {
    select: "id,name,address,image_url,extra_images",
    order: "review_count.desc",
  };
  if (CITY) params["city_id"] = `eq.${CITY}`;

  const all = await sbGet("restaurants", params);

  let targets = all.filter((r) => {
    const count = (r.image_url ? 1 : 0) + (r.extra_images?.length ?? 0);
    return count > 0 && count < 5; // 이미지 없는 식당은 제외
  });

  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(`대상: ${targets.length}개 (이미지 1~4장 식당)`);
  if (DRY_RUN) console.log("[DRY RUN 모드 - DB·Storage 변경 없음]");
  console.log();

  let cntUpdated = 0, cntFailed = 0, cntNoPhoto = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const currentCount = (r.image_url ? 1 : 0) + (r.extra_images?.length ?? 0);
    const needed = 5 - currentCount;
    const prefix = `[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name} (현재 ${currentCount}장 → +${needed}장 필요)`;

    try {
      // 1. Google Places place_id 검색
      const placeId = await getPlaceId(r.name, r.address);
      if (!placeId) {
        console.log(`${prefix} → Google 검색 실패`);
        cntNoPhoto++;
        if (i < targets.length - 1) await sleep(DELAY_MS);
        continue;
      }

      // 2. 사진 목록 조회
      const photos = await getPlacePhotos(placeId);
      if (photos.length === 0) {
        console.log(`${prefix} → 사진 없음`);
        cntNoPhoto++;
        if (i < targets.length - 1) await sleep(DELAY_MS);
        continue;
      }

      // 3. 필요한 장수만큼 다운로드 (기존 이미지 수 이후부터 인덱스 시작)
      const newUrls = [];
      let photoIdx = 0;
      const startIdx = currentCount; // 새 파일명 인덱스 시작점

      while (newUrls.length < needed && photoIdx < photos.length) {
        const photo = photos[photoIdx++];
        const downloaded = await downloadPhoto(photo.photo_reference);
        if (!downloaded) continue;

        const ext = downloaded.contentType.includes("png") ? "png" : "jpg";
        const fileIdx = startIdx + newUrls.length;
        // image_url은 {id}.jpg, extra_images는 {id}_1.jpg, {id}_2.jpg ...
        const filePath = fileIdx === 0 ? `${r.id}.${ext}` : `${r.id}_${fileIdx}.${ext}`;

        console.log(`  → 파일: ${filePath}`);

        if (!DRY_RUN) {
          const publicUrl = await uploadToStorage(filePath, downloaded.buf, downloaded.contentType);
          newUrls.push(publicUrl);
        } else {
          newUrls.push(`[DRY_RUN] ${filePath}`);
        }
      }

      if (newUrls.length === 0) {
        console.log(`${prefix} → 다운로드 실패`);
        cntFailed++;
      } else {
        const updatedExtras = [...(r.extra_images ?? []), ...newUrls.filter((u) => !u.startsWith("[DRY_RUN]"))];
        const dryExtras = newUrls.filter((u) => u.startsWith("[DRY_RUN]"));

        console.log(`${prefix}`);
        if (DRY_RUN) {
          console.log(`  추가 예정: ${dryExtras.join(", ")}`);
        } else {
          await sbPatch(r.id, { extra_images: updatedExtras });
          console.log(`  추가 완료: ${newUrls.length}장 (총 ${currentCount + newUrls.length}장)`);
        }
        cntUpdated++;
      }
    } catch (err) {
      console.error(`${prefix} → 오류: ${err.message}`);
      cntFailed++;
    }

    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log();
  console.log("═".repeat(50));
  console.log(`완료: 업데이트 ${cntUpdated}개 / 사진없음 ${cntNoPhoto}개 / 오류 ${cntFailed}개`);
  if (DRY_RUN) console.log("※ DRY RUN 모드였으므로 실제 변경 없음");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
