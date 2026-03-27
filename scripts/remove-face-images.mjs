/**
 * remove-face-images.mjs
 *
 * 식당 이미지 중 사람 얼굴이 잘 보이는 사진을 Claude Vision으로 감지하여 삭제합니다.
 * image_url과 extra_images 모두 검사합니다.
 *
 * 사용법:
 *   node scripts/remove-face-images.mjs
 *
 * 옵션:
 *   DRY_RUN=1       실제 삭제 없이 결과만 출력
 *   LIMIT=N         처리할 식당 수 제한
 *   CITY=chuncheon  특정 도시만 처리
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
const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/restaurant-images/`;

const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const CITY = env.CITY || null;

if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY가 없습니다.");
  process.exit(1);
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

async function deleteFromStorage(imageUrl) {
  if (!imageUrl.startsWith(STORAGE_PREFIX)) return; // 외부 URL은 스킵
  const filePath = imageUrl.slice(STORAGE_PREFIX.length);
  const url = `${SUPABASE_URL}/storage/v1/object/restaurant-images/${filePath}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  // 404는 이미 없는 파일이므로 무시
  if (!res.ok && res.status !== 404) {
    console.warn(`  ⚠️  Storage 삭제 실패: ${filePath} (${res.status})`);
  }
}

// ── Claude Vision: 얼굴 감지 ─────────────────────────────────────────────────

async function detectFaceIndices(imageUrls) {
  const content = [];
  for (let i = 0; i < imageUrls.length; i++) {
    content.push({ type: "text", text: `[이미지 ${i}]` });
    content.push({ type: "image", source: { type: "url", url: imageUrls[i] } });
  }
  content.push({
    type: "text",
    text: `위 ${imageUrls.length}장의 사진 중 사람 얼굴이 명확하게 보이는 사진의 번호를 모두 알려주세요.\n얼굴이 없으면 "없음"이라고만 답하세요.\n있으면 번호만 콤마로 구분해서 답하세요. 예: 0,2,3`,
  });

  const body = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 30,
    messages: [{ role: "user", content }],
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body,
    });

    if (res.status === 429) {
      const waitSec = attempt * 30;
      process.stdout.write(`  ⏳ rate limit, ${waitSec}초 대기 후 재시도 (${attempt}/3)...\n`);
      await sleep(waitSec * 1000);
      continue;
    }

    if (!res.ok) throw new Error(`Claude API → ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").trim();

    if (text === "없음" || text === "") return [];

    return text
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n < imageUrls.length);
  }

  throw new Error("Claude API rate limit: 재시도 초과");
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`remove-face-images.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작`);
  console.log(`설정: LIMIT=${LIMIT ?? "없음"} / CITY=${CITY ?? "전체"}`);
  console.log();

  const params = {
    select: "id,name,image_url,extra_images",
    "image_url": "not.is.null",
    order: "name.asc",
  };
  if (CITY) params["city_id"] = `eq.${CITY}`;

  const all = await sbGet("restaurants", params);
  const targets = LIMIT ? all.slice(0, LIMIT) : all;

  console.log(`대상: ${targets.length}개 식당`);
  if (DRY_RUN) console.log("[DRY RUN 모드 - 실제 삭제 없음]");
  console.log();

  let cntRestaurantUpdated = 0;
  let cntImagesRemoved = 0;
  let cntClean = 0;
  let cntErrors = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const allImages = [r.image_url, ...(r.extra_images ?? [])].filter(Boolean);
    const prefix = `[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name} (${allImages.length}장)`;

    try {
      const faceIndices = await detectFaceIndices(allImages);

      if (faceIndices.length === 0) {
        console.log(`${prefix} → 얼굴 없음 ✅`);
        cntClean++;
      } else {
        const faceUrls = faceIndices.map((idx) => allImages[idx]);
        console.log(`${prefix} → 얼굴 감지 ${faceIndices.length}장: 인덱스 [${faceIndices.join(",")}]`);

        if (!DRY_RUN) {
          // 얼굴 있는 이미지 제거
          const remaining = allImages.filter((_, idx) => !faceIndices.includes(idx));

          // Storage에서 삭제
          for (const url of faceUrls) {
            await deleteFromStorage(url);
            console.log(`  🗑️  삭제: ${url.split("/").pop()}`);
          }

          // DB 업데이트
          const newImageUrl = remaining[0] ?? null;
          const newExtraImages = remaining.slice(1);
          await sbPatch(r.id, {
            image_url: newImageUrl,
            extra_images: newExtraImages.length > 0 ? newExtraImages : null,
          });

          console.log(`  → 남은 이미지: ${remaining.length}장`);
        } else {
          faceUrls.forEach((url) => console.log(`  [DRY RUN] 삭제 예정: ${url.split("/").pop()}`));
        }

        cntRestaurantUpdated++;
        cntImagesRemoved += faceIndices.length;
      }
    } catch (err) {
      console.error(`${prefix} → 오류: ${err.message}`);
      cntErrors++;
    }

    console.log();
    // 이미지당 약 2000토큰, 5장 = 10000토큰 → 분당 50000 한도, 8초 간격
    await sleep(8000);
  }

  console.log("═".repeat(50));
  console.log(`완료: 얼굴감지 ${cntRestaurantUpdated}개 식당 / 삭제 ${cntImagesRemoved}장 / 정상 ${cntClean}개 / 오류 ${cntErrors}개`);
  if (DRY_RUN) console.log("※ DRY RUN 모드였으므로 실제 변경 없음");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
