/**
 * fetch-menus.mjs
 *
 * 식당별 실제 대표 메뉴를 Claude AI로 조회해 DB에 업데이트합니다.
 *
 * ⚠️  Google Places / 네이버 공개 API는 메뉴 항목을 제공하지 않습니다.
 *     이 스크립트는 Claude AI(claude-haiku)를 사용해 각 식당의 실제 메뉴를 파악합니다.
 *
 * 저장 대상:
 *   기본값       → tags 컬럼을 실제 메뉴로 교체 (카드 UI에 즉시 반영)
 *   USE_MENU_ITEMS=1 → menu_items 컬럼에 저장 (아래 SQL 먼저 실행 필요)
 *
 * [USE_MENU_ITEMS=1 사용 전] resstaurantchuncheon Supabase SQL Editor에서 실행:
 *   ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS menu_items text[] DEFAULT '{}';
 *
 * 사용법:
 *   node scripts/fetch-menus.mjs
 *
 * 옵션 (환경변수):
 *   DRY_RUN=1           DB 변경 없이 결과 미리보기
 *   LIMIT=N             처리할 식당 수 제한
 *   DELAY_MS=8000       요청 간 딜레이 ms (기본 8000 — Tier1 분당 50k 토큰 제한)
 *   SKIP_EXISTING=1     이미 tags/menu_items가 채워진 식당 건너뜀
 *   CITY=chuncheon      특정 city_id만 처리
 *   USE_MENU_ITEMS=1    tags 대신 menu_items 컬럼에 저장
 *   MODEL=claude-haiku-4-5-20251001  사용할 Claude 모델 (기본값)
 *
 * 실행 예시:
 *   DRY_RUN=1 LIMIT=10 node scripts/fetch-menus.mjs
 *   SKIP_EXISTING=1 node scripts/fetch-menus.mjs
 *   USE_MENU_ITEMS=1 DRY_RUN=1 LIMIT=5 node scripts/fetch-menus.mjs
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

const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const DELAY_MS = parseInt(env.DELAY_MS || "8000");
const SKIP_EXISTING = env.SKIP_EXISTING === "1";
const CITY = env.CITY || null;
const USE_MENU_ITEMS = env.USE_MENU_ITEMS === "1";
const MODEL = env.MODEL || "claude-haiku-4-5-20251001";

if (!ANTHROPIC_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY를 찾을 수 없습니다.");
  console.error(".env 파일에 아래 줄을 추가해주세요:");
  console.error("  ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

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

// ── Claude API ───────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Claude API로 식당 대표 메뉴 3~5개 조회
 * 반환값: string[] | null
 */
async function fetchMenusFromClaude(restaurant) {
  const { name, category, address, tags, description } = restaurant;

  const prompt = `춘천 식당 정보를 보고, 이 식당에서 실제로 판매하는 대표 메뉴 3~5가지를 파악해줘.

식당명: ${name}
카테고리: ${category}
주소: ${address ?? "춘천시"}
현재 태그: ${tags?.length ? tags.join(", ") : "없음"}
설명: ${description ?? "없음"}

규칙:
- 이 식당에서 실제로 파는 메뉴명을 한국어로 간결하게 작성 (예: "닭갈비", "막국수", "된장찌개")
- 카테고리명·식당명·분위기 설명은 메뉴가 아니므로 제외 (예: "닭갈비 맛집", "춘천 맛집" 제외)
- 이 식당이 실제로 유명한 메뉴 우선, 모르면 카테고리 "${category}"의 일반적인 대표 메뉴로 작성
- JSON 배열만 출력, 다른 설명 없이: ["메뉴1", "메뉴2", "메뉴3"]`;

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  // 429 rate limit 시 최대 3회 재시도
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body,
    });

    if (res.status === 429) {
      const waitSec = attempt * 30;
      console.log(`  rate limit, ${waitSec}초 대기 후 재시도 (${attempt}/3)...`);
      await sleep(waitSec * 1000);
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API ${res.status}: ${err}`);
    }

    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").trim();

    // JSON 배열 파싱
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;

    try {
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      // 문자열만 남기고, 너무 긴 항목 제거 (메뉴명은 보통 10자 이내)
      const filtered = parsed
        .filter((m) => typeof m === "string" && m.trim().length > 0 && m.trim().length <= 15)
        .map((m) => m.trim())
        .slice(0, 5);
      return filtered.length > 0 ? filtered : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`fetch-menus.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작`);
  console.log(
    `설정: MODEL=${MODEL} / DELAY=${DELAY_MS}ms / SKIP_EXISTING=${SKIP_EXISTING} / LIMIT=${LIMIT ?? "없음"} / 저장=${USE_MENU_ITEMS ? "menu_items" : "tags"}`
  );

  if (USE_MENU_ITEMS) {
    console.log(
      "\n[USE_MENU_ITEMS=1] menu_items 컬럼이 존재해야 합니다."
    );
    console.log(
      "없다면 resstaurantchuncheon Supabase SQL Editor에서 실행:\n  ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS menu_items text[] DEFAULT '{}';\n"
    );
  }
  console.log();

  // 대상 식당 조회
  const params = {
    select: "id,name,category,address,tags,description",
    order: "review_count.desc",
  };
  if (CITY) params["city_id"] = `eq.${CITY}`;
  // SKIP_EXISTING: tags가 이미 2개 이상인 식당 건너뜀
  // (완전히 없는 것만 처리하고 싶으면 tags=eq.{} 도 가능하나 실용적이지 않아 JS에서 필터)

  const all = await sbGet("restaurants", params);

  let targets = all;
  if (SKIP_EXISTING) {
    targets = all.filter((r) => !r.tags || r.tags.length < 2);
    console.log(`SKIP_EXISTING: tags 2개 미만 식당만 처리 (${targets.length}/${all.length}개)`);
  }
  if (LIMIT) targets = targets.slice(0, LIMIT);

  console.log(`대상: ${targets.length}개`);
  if (DRY_RUN) console.log("[DRY RUN 모드 - DB 변경 없음]");
  console.log();

  let cntUpdated = 0, cntFailed = 0, cntNoData = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const prefix = `[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name} (${r.category})`;

    try {
      const menus = await fetchMenusFromClaude(r);

      if (!menus) {
        console.log(`${prefix} → 메뉴 파악 실패`);
        cntNoData++;
      } else {
        const before = r.tags?.join(", ") || "없음";
        const after = menus.join(", ");
        console.log(`${prefix}`);
        console.log(`  이전: [${before}]`);
        console.log(`  이후: [${after}]`);

        if (!DRY_RUN) {
          const update = USE_MENU_ITEMS
            ? { menu_items: menus }
            : { tags: menus };
          await sbPatch(r.id, update);
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
  console.log(`완료: 업데이트 ${cntUpdated}개 / 메뉴없음 ${cntNoData}개 / 오류 ${cntFailed}개`);
  if (DRY_RUN) console.log("※ DRY RUN 모드였으므로 실제 DB 변경 없음");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
