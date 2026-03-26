/**
 * remove-url-duplicates.mjs
 *
 * API 키 없이 URL이 동일한 중복 이미지만 제거합니다.
 *
 * 사용법:
 *   node scripts/remove-url-duplicates.mjs
 *
 * 옵션:
 *   DRY_RUN=1      DB 변경 없이 결과만 미리보기
 *   LIMIT=N        처리할 식당 수 제한
 *   CITY=chuncheon 특정 도시만 처리
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── .env 파싱 ─────────────────────────────────────────────────────────────────

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
const env = { ...parseEnvFile(resolve(ROOT, ".env")), ...process.env };

const SUPABASE_URL = "https://cblckdcrsotqynngblyb.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8";
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const CITY = env.CITY || null;

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

async function main() {
  console.log(`remove-url-duplicates.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작\n`);

  const params = {
    select: "id,name,image_url,extra_images",
    order: "name.asc",
  };
  if (CITY) params["city_id"] = `eq.${CITY}`;

  const all = await sbGet("restaurants", params);

  let targets = all.filter((r) => {
    const count = (r.image_url ? 1 : 0) + (r.extra_images?.length ?? 0);
    return count >= 2;
  });

  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(`총 ${all.length}개 중 이미지 2장 이상: ${targets.length}개 검사\n`);

  let totalRemoved = 0;
  let cntChanged = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const allImages = [r.image_url, ...(r.extra_images ?? [])].filter(Boolean);

    // URL 중복 제거
    const seen = new Set();
    const deduped = allImages.filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });

    const removedCount = allImages.length - deduped.length;
    if (removedCount === 0) continue;

    console.log(`[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name}`);
    console.log(`  ${allImages.length}장 → ${deduped.length}장 (중복 ${removedCount}장 제거)`);

    // 제거된 URL 표시
    const removedUrls = allImages.filter((url) => {
      const first = allImages.indexOf(url);
      const dup = allImages.lastIndexOf(url);
      return first !== dup;
    });
    [...new Set(removedUrls)].forEach((url) => console.log(`  - ${url.slice(-60)}`));

    if (!DRY_RUN) {
      await sbPatch(r.id, {
        image_url: deduped[0] ?? null,
        extra_images: deduped.length > 1 ? deduped.slice(1) : null,
      });
      console.log(`  ✅ 저장 완료`);
    } else {
      console.log(`  [DRY RUN] 저장 건너뜀`);
    }

    totalRemoved += removedCount;
    cntChanged++;
  }

  console.log(`\n완료: ${cntChanged}개 식당 변경, 중복 ${totalRemoved}장 제거`);
}

main().catch((err) => {
  console.error("❌ 오류:", err.message);
  process.exit(1);
});
