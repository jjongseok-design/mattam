/**
 * fetch-kakao-images.mjs
 *
 * image_url이 없는 식당에 카카오 이미지 검색으로 사진을 채웁니다.
 * fetch-all-data.mjs (Google Places) 실행 후 실패한 식당 보완용.
 *
 * 사용법:
 *   KAKAO_REST_API_KEY=... node scripts/fetch-kakao-images.mjs
 *
 * 옵션 (환경변수):
 *   DRY_RUN=1       DB·Storage 변경 없이 미리보기
 *   LIMIT=N         처리할 식당 수 제한
 *   CITY=chuncheon  특정 city_id만 처리
 *   DELAY_MS=1000   요청 간 딜레이 ms (기본 1000)
 *
 * 주의:
 *   KAKAO_REST_API_KEY는 카카오 개발자 콘솔 → 앱 키 → REST API 키
 *   (VITE_KAKAO_APP_KEY는 JS 키라 여기서 사용 불가)
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

const KAKAO_KEY = env.KAKAO_REST_API_KEY;
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const CITY = env.CITY || null;
const DELAY_MS = parseInt(env.DELAY_MS || "1000");

if (!KAKAO_KEY) {
  console.error("ERROR: KAKAO_REST_API_KEY가 없습니다.");
  console.error("카카오 개발자 콘솔 → 내 애플리케이션 → 앱 키 → REST API 키를 .env에 추가하세요.");
  console.error("  KAKAO_REST_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
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

// ── 카카오 이미지 검색 ───────────────────────────────────────────────────────

async function kakaoImageSearch(query, size = 5) {
  const url = new URL("https://dapi.kakao.com/v2/search/image");
  url.searchParams.set("query", query);
  url.searchParams.set("sort", "accuracy");
  url.searchParams.set("size", String(size));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
  });

  if (res.status === 401) {
    console.error("\n❌ 카카오 API 인증 실패: REST API 키를 확인하세요.");
    process.exit(1);
  }
  if (!res.ok) throw new Error(`Kakao API ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return data.documents ?? [];
}

async function downloadImage(imageUrl) {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.includes("image")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 5000) return null; // 너무 작은 이미지(아이콘 등) 제외
    return { buf, contentType: contentType.split(";")[0] };
  } catch {
    return null;
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`fetch-kakao-images.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작`);
  console.log(`설정: DELAY=${DELAY_MS}ms / LIMIT=${LIMIT ?? "없음"} / CITY=${CITY ?? "전체"}`);
  console.log();

  // image_url 없는 식당만 조회
  const params = {
    select: "id,name,address,city_id",
    image_url: "is.null",
    order: "name.asc",
  };
  if (CITY) params["city_id"] = `eq.${CITY}`;

  const all = await sbGet("restaurants", params);
  const targets = LIMIT ? all.slice(0, LIMIT) : all;

  console.log(`대상: ${targets.length}개 (image_url 없는 식당)`);
  if (DRY_RUN) console.log("[DRY RUN 모드 - DB·Storage 변경 없음]");
  console.log();

  let cntUpdated = 0, cntFailed = 0, cntNoResult = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const prefix = `[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name}`;

    try {
      // 쿼리 순서: 식당명+도시 → 식당명+맛집 → 식당명만
      const cityHint = r.address?.match(/([가-힣]+시)/)?.[1] ?? "춘천";
      const queries = [
        `${r.name} ${cityHint} 맛집`,
        `${r.name} ${cityHint}`,
        r.name,
      ];

      let docs = [];
      for (const q of queries) {
        docs = await kakaoImageSearch(q, 8);
        if (docs.length > 0) break;
        await sleep(200);
      }

      if (docs.length === 0) {
        console.log(`${prefix} → 검색 결과 없음`);
        cntNoResult++;
        if (i < targets.length - 1) await sleep(DELAY_MS);
        continue;
      }

      // 이미지 다운로드 (최대 5장)
      const imageUrls = [];
      for (const doc of docs) {
        if (imageUrls.length >= 5) break;
        const downloaded = await downloadImage(doc.image_url);
        if (!downloaded) continue;

        const ext = downloaded.contentType.includes("png") ? "png" : "jpg";
        const fileIdx = imageUrls.length;
        const filePath = fileIdx === 0 ? `${r.id}.${ext}` : `${r.id}_${fileIdx}.${ext}`;

        if (!DRY_RUN) {
          const publicUrl = await uploadToStorage(filePath, downloaded.buf, downloaded.contentType);
          imageUrls.push(publicUrl);
          process.stdout.write(`  📸 ${filePath} 업로드\n`);
        } else {
          imageUrls.push(`[DRY_RUN] ${filePath}`);
          process.stdout.write(`  📸 [예정] ${filePath}\n`);
        }
      }

      if (imageUrls.length === 0) {
        console.log(`${prefix} → 다운로드 실패 (검색은 됐으나 이미지 저장 불가)`);
        cntFailed++;
      } else {
        if (!DRY_RUN) {
          const updates = {
            image_url: imageUrls[0],
            ...(imageUrls.length > 1 && { extra_images: imageUrls.slice(1) }),
          };
          await sbPatch(r.id, updates);
          console.log(`${prefix} → ✅ ${imageUrls.length}장 저장 완료`);
        } else {
          console.log(`${prefix} → [DRY RUN] ${imageUrls.length}장 저장 예정`);
        }
        cntUpdated++;
      }
    } catch (err) {
      console.error(`${prefix} → 오류: ${err.message}`);
      cntFailed++;
    }

    console.log();
    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log("═".repeat(50));
  console.log(`완료: 성공 ${cntUpdated}개 / 검색없음 ${cntNoResult}개 / 오류 ${cntFailed}개`);
  if (DRY_RUN) console.log("※ DRY RUN 모드였으므로 실제 변경 없음");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
