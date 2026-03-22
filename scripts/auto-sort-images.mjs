/**
 * 식당 대표 이미지 자동 정렬 스크립트
 * 각 식당의 이미지 중 외관/간판 사진을 Claude Vision으로 찾아 image_url로 설정.
 *
 * 사용법:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/auto-sort-images.mjs
 *
 * 옵션:
 *   DRY_RUN=1       실제 DB 업데이트 없이 분석 결과만 출력
 *   LIMIT=10        처리할 식당 수 제한
 *   CITY=chuncheon  특정 도시만 처리
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── .env 파일 파싱 ───────────────────────────────────────────────────────────

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
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const CITY = env.CITY || null;

if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY를 찾을 수 없습니다.");
  console.error("   .env.local 파일에 ANTHROPIC_API_KEY=sk-ant-... 추가하거나");
  console.error("   실행 시 직접 전달: ANTHROPIC_API_KEY=sk-ant-... node scripts/auto-sort-images.mjs");
  process.exit(1);
}

// ── API 키 진단 ──────────────────────────────────────────────────────────────

{
  const nonAscii = [...ANTHROPIC_API_KEY].filter((c) => c.charCodeAt(0) > 127);
  if (nonAscii.length > 0) {
    console.error("❌ ANTHROPIC_API_KEY에 비ASCII 문자가 포함되어 있습니다:");
    nonAscii.forEach((c) =>
      console.error(`   문자: '${c}'  코드포인트: ${c.charCodeAt(0)}`)
    );
    console.error("   키를 다시 복사해서 설정해주세요.");
    process.exit(1);
  }
  console.log(`✅ API 키 확인: ${ANTHROPIC_API_KEY.substring(0, 14)}... (${ANTHROPIC_API_KEY.length}자)`);
}

// ── Supabase REST 헬퍼 (fetch 사용 — 헤더값은 모두 ASCII) ──────────────────

async function sbGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET 오류: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPatch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH 오류: ${res.status} ${await res.text()}`);
}

// ── Claude Vision 분석 (URL 직접 전달 — base64 다운로드 불필요) ─────────────

async function findExteriorIndex(imageUrls) {
  // Supabase 공개 URL을 Claude에 직접 전달 (base64 변환 없음)
  const content = [];
  for (let i = 0; i < imageUrls.length; i++) {
    content.push({ type: "text", text: `[이미지 ${i}]` });
    content.push({
      type: "image",
      source: { type: "url", url: imageUrls[i] },
    });
  }
  content.push({
    type: "text",
    text: `위 ${imageUrls.length}장의 식당 사진 중 식당 외관(건물 외부, 간판, 입구)을 찍은 사진의 번호를 하나만 골라주세요.\n외관 사진이 없으면 -1을 답하세요.\n숫자만 답하세요. 설명 없이.`,
  });

  const body = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 10,
    messages: [{ role: "user", content }],
  });

  // 429 rate limit 시 최대 3회 재시도
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

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API 오류: ${res.status} ${err}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() ?? "-1";
    const idx = parseInt(text, 10);
    return isNaN(idx) ? -1 : idx;
  }
  throw new Error("Claude API rate limit: 재시도 초과");
}

// ── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 식당 대표 이미지 자동 정렬 시작 ${DRY_RUN ? "(DRY RUN)" : ""}\n`);

  const params = {
    select: "id,name,image_url,extra_images,city_id",
    "image_url": "not.is.null",
    order: "name.asc",
  };
  if (CITY) params["city_id"] = `eq.${CITY}`;
  if (LIMIT) params.limit = String(LIMIT);

  const all = await sbGet("restaurants", params);
  const targets = all.filter(
    (r) => r.image_url && Array.isArray(r.extra_images) && r.extra_images.length > 0
  );

  console.log(`📋 처리 대상: ${targets.length}개 식당 (이미지 2장 이상)\n`);

  let changed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const allImages = [r.image_url, ...r.extra_images];
    process.stdout.write(`[${i + 1}/${targets.length}] ${r.name} (${allImages.length}장)\n`);

    try {
      // URL을 Claude에 직접 전달 (다운로드 없음)
      const bestIdx = await findExteriorIndex(allImages);

      if (bestIdx < 0 || bestIdx >= allImages.length) {
        process.stdout.write(`  ⏭️  외관 사진 없음 또는 판별 불가\n\n`);
        skipped++;
        await sleep(8000);
        continue;
      }

      if (bestIdx === 0) {
        process.stdout.write(`  ✅ 이미 대표 이미지가 외관 사진\n\n`);
        skipped++;
        await sleep(8000);
        continue;
      }

      const reordered = [
        allImages[bestIdx],
        ...allImages.filter((_, idx) => idx !== bestIdx),
      ];
      process.stdout.write(`  🔄 변경: 인덱스 ${bestIdx} → 대표\n\n`);

      if (!DRY_RUN) {
        await sbPatch("restaurants", r.id, {
          image_url: reordered[0],
          extra_images: reordered.slice(1),
        });
      }

      changed++;
    } catch (err) {
      process.stdout.write(`  ❌ 오류: ${err.message}\n\n`);
      errors++;
    }

    // 이미지 3장 ≈ 6000~9000 토큰, 한도 50,000/분 → 8초 간격
    await sleep(8000);
  }

  console.log("──────────────────────────────────");
  console.log(`✅ 변경: ${changed}개`);
  console.log(`⏭️  건너뜀: ${skipped}개`);
  console.log(`❌ 오류: ${errors}개`);
  if (DRY_RUN) console.log("(DRY RUN — DB는 변경되지 않았습니다)");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
