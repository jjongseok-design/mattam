/**
 * keep-food-images.mjs
 *
 * 식당 이미지 중 음식/메뉴 사진만 남기고 나머지(외관, 인테리어, 무관한 사진)를 삭제합니다.
 * Claude Vision으로 판별하며, 식당당 1회 API 호출로 처리합니다.
 *
 * 사용법:
 *   node scripts/keep-food-images.mjs
 *
 * 옵션:
 *   DRY_RUN=1       실제 삭제 없이 결과만 출력
 *   LIMIT=N         처리할 식당 수 제한
 *   CITY=chuncheon  특정 도시만 처리
 *
 * 소요 시간: 식당당 약 8초 (rate limit 준수)
 * 주의: 음식 사진이 하나도 없으면 image_url = null이 됩니다 (재수집 필요)
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
  if (!imageUrl.startsWith(STORAGE_PREFIX)) return;
  const filePath = imageUrl.slice(STORAGE_PREFIX.length);
  const url = `${SUPABASE_URL}/storage/v1/object/restaurant-images/${filePath}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok && res.status !== 404) {
    console.warn(`  ⚠️  Storage 삭제 실패: ${filePath} (${res.status})`);
  }
}

// ── Claude Vision: 음식 사진 판별 ─────────────────────────────────────────────

async function detectFoodIndices(imageUrls) {
  const content = [];
  for (let i = 0; i < imageUrls.length; i++) {
    content.push({ type: "text", text: `[이미지 ${i}]` });
    content.push({ type: "image", source: { type: "url", url: imageUrls[i] } });
  }
  content.push({
    type: "text",
    text: `위 ${imageUrls.length}장은 식당 관련 사진들입니다.
이 중 음식/메뉴/요리가 주인공인 사진의 번호만 골라주세요.
- 포함: 음식, 메뉴, 요리, 음료, 디저트가 가까이 찍힌 사진
- 제외: 식당 외관, 건물, 간판, 실내 인테리어, 사람, 풍경, 텍스트만 있는 사진
음식 사진이 하나도 없으면 "없음"이라고만 답하세요.
있으면 번호만 콤마로 구분해서 답하세요. 예: 0,2`,
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
  console.log(`keep-food-images.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작`);
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

  let cntAllGood = 0;
  let cntUpdated = 0;
  let cntAllRemoved = 0;
  let cntErrors = 0;
  let totalDeleted = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const allImages = [r.image_url, ...(r.extra_images ?? [])].filter(Boolean);
    const prefix = `[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name} (${allImages.length}장)`;

    try {
      const foodIndices = await detectFoodIndices(allImages);
      const removeIndices = allImages
        .map((_, idx) => idx)
        .filter((idx) => !foodIndices.includes(idx));

      if (removeIndices.length === 0) {
        console.log(`${prefix} → 전부 음식 사진 ✅`);
        cntAllGood++;
      } else if (foodIndices.length === 0) {
        console.log(`${prefix} → 음식 사진 없음 ⚠️  (전체 ${allImages.length}장 삭제)`);
        if (!DRY_RUN) {
          for (const url of allImages) await deleteFromStorage(url);
          await sbPatch(r.id, { image_url: null, extra_images: null });
        }
        cntAllRemoved++;
        totalDeleted += allImages.length;
      } else {
        const keepUrls = foodIndices.map((idx) => allImages[idx]);
        const removeUrls = removeIndices.map((idx) => allImages[idx]);
        console.log(`${prefix} → 음식 ${foodIndices.length}장 유지, 비음식 ${removeIndices.length}장 삭제`);
        removeUrls.forEach((url) => console.log(`  🗑️  ${url.split("/").pop()}`));

        if (!DRY_RUN) {
          for (const url of removeUrls) await deleteFromStorage(url);
          await sbPatch(r.id, {
            image_url: keepUrls[0],
            extra_images: keepUrls.length > 1 ? keepUrls.slice(1) : null,
          });
        }
        cntUpdated++;
        totalDeleted += removeIndices.length;
      }
    } catch (err) {
      console.error(`${prefix} → 오류: ${err.message}`);
      cntErrors++;
    }

    console.log();
    await sleep(8000);
  }

  console.log("═".repeat(50));
  console.log(`완료:`);
  console.log(`  ✅ 전부 음식 사진: ${cntAllGood}개`);
  console.log(`  ✂️  일부 삭제 후 유지: ${cntUpdated}개`);
  console.log(`  ⚠️  음식사진 없어 전체삭제: ${cntAllRemoved}개`);
  console.log(`  ❌ 오류: ${cntErrors}개`);
  console.log(`  🗑️  총 삭제 이미지: ${totalDeleted}장`);
  if (DRY_RUN) console.log("※ DRY RUN 모드였으므로 실제 변경 없음");
  if (cntAllRemoved > 0) {
    console.log();
    console.log(`💡 음식사진이 없어진 ${cntAllRemoved}개 식당은 fetch-kakao-images.mjs로 재수집하세요.`);
  }
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
