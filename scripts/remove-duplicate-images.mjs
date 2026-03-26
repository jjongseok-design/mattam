/**
 * remove-duplicate-images.mjs
 *
 * 각 식당의 이미지 중 중복(시각적으로 동일/유사)된 사진을 Claude Vision으로 감지·제거하고,
 * 줄어든 자리는 Google Places API로 새 사진을 채웁니다.
 *
 * 사용법:
 *   ANTHROPIC_API_KEY=sk-ant-... GOOGLE_PLACES_API_KEY=... node scripts/remove-duplicate-images.mjs
 *
 * 옵션:
 *   DRY_RUN=1      DB 변경 없이 결과만 미리보기
 *   LIMIT=N        처리할 식당 수 제한
 *   CITY=chuncheon 특정 도시만 처리
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

const SUPABASE_URL = "https://cblckdcrsotqynngblyb.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8";
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
const GOOGLE_KEY = env.GOOGLE_PLACES_API_KEY;
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const CITY = env.CITY || null;
const DELAY_MS = 8000; // Claude rate limit (Tier 1: 50k tokens/min)

if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY 필요");
  process.exit(1);
}
if (!GOOGLE_KEY) {
  console.warn("⚠️  GOOGLE_PLACES_API_KEY 없음 → 중복 제거만 하고 새 사진 추가 안 함");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Supabase 헬퍼 ────────────────────────────────────────────────────────────

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
  return `${SUPABASE_URL}/storage/v1/object/public/restaurant-images/${path}`;
}

// ── Claude Vision: 중복 감지 ─────────────────────────────────────────────────

async function detectDuplicates(images, restaurantName) {
  if (images.length < 2) return [];

  const imageBlocks = images.map((url, i) => [
    {
      type: "text",
      text: `이미지 ${i}:`,
    },
    {
      type: "image",
      source: { type: "url", url },
    },
  ]).flat();

  const prompt = `식당 "${restaurantName}"의 사진 ${images.length}장입니다.
시각적으로 동일하거나 매우 유사한 중복 사진을 찾아주세요.

규칙:
- 같은 장면을 거의 동일하게 찍은 사진은 중복
- 비슷한 각도지만 다른 날/다른 메뉴면 중복 아님
- 중복 그룹에서 첫 번째(가장 작은 인덱스) 사진은 남기고, 나머지는 제거 대상

응답 형식 (JSON만, 설명 없이):
{"remove": [제거할_인덱스_배열]}

예시: {"remove": [2, 4]}
중복 없으면: {"remove": []}`;

  let retries = 0;
  while (retries < 3) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: [...imageBlocks, { type: "text", text: prompt }],
            },
          ],
        }),
      });

      if (res.status === 429) {
        const wait = (retries + 1) * 30000;
        console.log(`  ⏳ Rate limit → ${wait / 1000}초 대기...`);
        await sleep(wait);
        retries++;
        continue;
      }

      if (!res.ok) throw new Error(`Claude API → ${res.status}: ${await res.text()}`);

      const data = await res.json();
      const text = data.content?.[0]?.text ?? "";
      const match = text.match(/\{[^}]*"remove"\s*:\s*\[[^\]]*\][^}]*\}/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      return (parsed.remove ?? []).filter((i) => typeof i === "number" && i >= 0 && i < images.length);
    } catch (err) {
      console.log(`  ⚠️  Claude 오류: ${err.message}`);
      retries++;
      if (retries < 3) await sleep(10000);
    }
  }
  return [];
}

// ── Google Places: 새 사진 추가 ──────────────────────────────────────────────

async function getPlaceId(name, address) {
  const query = address ? `${name} ${address}` : `${name} 춘천`;
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${GOOGLE_KEY}`;
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
  return { buf: await res.arrayBuffer(), contentType };
}

async function fetchNewImages(restaurant, needed, existingUrls) {
  if (!GOOGLE_KEY || needed <= 0) return [];

  const placeId = await getPlaceId(restaurant.name, restaurant.address);
  if (!placeId) return [];

  const photos = await getPlacePhotos(placeId);
  if (photos.length === 0) return [];

  const newUrls = [];
  const startIdx = existingUrls.length; // 파일 인덱스 시작점

  for (const photo of photos) {
    if (newUrls.length >= needed) break;
    const downloaded = await downloadPhoto(photo.photo_reference);
    if (!downloaded) continue;
    const ext = downloaded.contentType.includes("png") ? "png" : "jpg";
    const fileIdx = startIdx + newUrls.length;
    const filePath = fileIdx === 0 ? `${restaurant.id}.${ext}` : `${restaurant.id}_${fileIdx}.${ext}`;
    const publicUrl = await uploadToStorage(filePath, downloaded.buf, downloaded.contentType);
    newUrls.push(publicUrl);
    console.log(`  + 새 사진 추가: ${filePath}`);
  }
  return newUrls;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`remove-duplicate-images.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작\n`);

  const params = {
    select: "id,name,address,image_url,extra_images",
    order: "name.asc",
  };
  if (CITY) params["city_id"] = `eq.${CITY}`;

  const all = await sbGet("restaurants", params);

  // 이미지 2장 이상인 식당만 대상
  let targets = all.filter((r) => {
    const count = (r.image_url ? 1 : 0) + (r.extra_images?.length ?? 0);
    return count >= 2;
  });

  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(`총 ${all.length}개 중 이미지 2장 이상: ${targets.length}개 검사 대상\n`);

  let totalRemoved = 0, totalAdded = 0, cntChanged = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const allImages = [r.image_url, ...(r.extra_images ?? [])].filter(Boolean);
    const prefix = `[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name} (${allImages.length}장)`;

    // 1. URL 중복 먼저 제거 (동일 URL)
    const urlSeen = new Set();
    const urlDeduped = allImages.filter((url) => {
      if (urlSeen.has(url)) return false;
      urlSeen.add(url);
      return true;
    });
    const urlDupCount = allImages.length - urlDeduped.length;

    // 2. Claude Vision으로 시각적 중복 감지
    let toRemoveIndices = [];
    if (urlDeduped.length >= 2) {
      process.stdout.write(`${prefix} → Claude 분석 중...`);
      toRemoveIndices = await detectDuplicates(urlDeduped, r.name);
      process.stdout.write(` ${toRemoveIndices.length > 0 ? `중복 ${toRemoveIndices.length}장 발견` : "중복 없음"}\n`);
    } else {
      console.log(`${prefix} → URL 중복 제거 후 1장 이하, 분석 건너뜀`);
    }

    const removedCount = urlDupCount + toRemoveIndices.length;

    if (removedCount === 0) {
      if (i < targets.length - 1) await sleep(DELAY_MS);
      continue;
    }

    // 3. 중복 제거 후 이미지 목록 구성
    const dedupedImages = urlDeduped.filter((_, idx) => !toRemoveIndices.includes(idx));

    console.log(`  제거: ${removedCount}장 (URL중복 ${urlDupCount} + 시각중복 ${toRemoveIndices.length})`);
    if (toRemoveIndices.length > 0) {
      toRemoveIndices.forEach((idx) => console.log(`    - [${idx}] ${urlDeduped[idx]}`));
    }

    // 4. 빈 자리 채우기 (Google Places)
    const needed = allImages.length - dedupedImages.length;
    let finalImages = [...dedupedImages];

    if (!DRY_RUN && needed > 0 && GOOGLE_KEY) {
      const newImgs = await fetchNewImages(r, needed, dedupedImages);
      finalImages = [...dedupedImages, ...newImgs];
      totalAdded += newImgs.length;
      if (newImgs.length < needed) {
        console.log(`  ⚠️  ${needed}장 필요했으나 ${newImgs.length}장만 추가됨`);
      }
    } else if (needed > 0 && !GOOGLE_KEY) {
      console.log(`  ℹ️  GOOGLE_PLACES_API_KEY 없어 ${needed}장 보충 건너뜀`);
    }

    // 5. DB 업데이트
    const newImageUrl = finalImages[0] ?? null;
    const newExtraImages = finalImages.slice(1);

    if (!DRY_RUN) {
      await sbPatch(r.id, {
        image_url: newImageUrl,
        extra_images: newExtraImages.length > 0 ? newExtraImages : null,
      });
      console.log(`  ✅ 저장 완료: ${finalImages.length}장`);
    } else {
      console.log(`  [DRY RUN] 변경 예정: ${finalImages.length}장`);
    }

    totalRemoved += removedCount;
    cntChanged++;

    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n완료: ${cntChanged}개 식당 변경, 중복 ${totalRemoved}장 제거, 새 사진 ${totalAdded}장 추가`);
}

main().catch((err) => {
  console.error("❌ 오류:", err.message);
  process.exit(1);
});
