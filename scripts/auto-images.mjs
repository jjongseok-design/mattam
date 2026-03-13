/**
 * 춘천 맛집지도 - 자동 이미지 검색 & 등록 스크립트
 *
 * 사용법:
 *   node scripts/auto-images.mjs --pin <관리자PIN> --naver-id <ClientID> --naver-secret <ClientSecret>
 *
 * 네이버 개발자센터(https://developers.naver.com) 앱에서
 * "검색 > 이미지" API를 활성화해야 합니다.
 *
 * 선택 옵션:
 *   --limit 50          처리할 최대 식당 수 (기본값: 50)
 *   --category 닭갈비   특정 카테고리만 처리
 *   --dry-run           실제 저장 없이 결과만 확인
 */

const SUPABASE_URL = "https://qnovapoiqhoextrudsax.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFub3ZhcG9pcWhvZXh0cnVkc2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjM4NzUsImV4cCI6MjA4Nzc5OTg3NX0.28ahaT71fgdBQOtFHSnCuwtpajH_J1MDGmZOUqqYHnw";
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/admin-api`;

// --- Parse CLI args ---
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
};
const PIN = getArg("pin");
const NAVER_ID = getArg("naver-id");
const NAVER_SECRET = getArg("naver-secret");
const LIMIT = parseInt(getArg("limit") || "50", 10);
const CATEGORY = getArg("category");
const DRY_RUN = args.includes("--dry-run");

if (!PIN || !NAVER_ID || !NAVER_SECRET) {
  console.error("❌ 필수 인자가 없습니다.");
  console.error("   --pin, --naver-id, --naver-secret 을 모두 입력하세요.");
  process.exit(1);
}

// --- Supabase REST API ---
async function dbQuery(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`DB 오류: ${res.status}`);
  return res.json();
}

// --- 네이버 이미지 검색 API ---
async function naverImageSearch(restaurantName, address) {
  // 1순위: 식당명 + 주소 검색
  const queries = [
    `${restaurantName} 춘천 맛집`,
    `${restaurantName} 춘천`,
    restaurantName,
  ];

  for (const query of queries) {
    try {
      const url = `https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(query)}&display=5&filter=medium`;
      const res = await fetch(url, {
        headers: {
          "X-Naver-Client-Id": NAVER_ID,
          "X-Naver-Client-Secret": NAVER_SECRET,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Naver API ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const items = data.items ?? [];

      // 음식 관련 이미지 우선 (썸네일 URL 사용)
      for (const item of items) {
        const imgUrl = item.thumbnail || item.link;
        if (imgUrl && imgUrl.startsWith("http")) {
          return imgUrl;
        }
      }
    } catch (err) {
      if (err.message.includes("401") || err.message.includes("403")) {
        console.error("\n❌ API 인증 오류: Client ID/Secret을 확인하거나 이미지 검색 API를 활성화하세요.");
        console.error("   https://developers.naver.com → 앱 설정 → 검색 > 이미지 체크\n");
        process.exit(1);
      }
      // 다음 쿼리 시도
    }
  }
  return null;
}

// --- Save image URL via admin-api ---
async function saveImageUrl(id, imageUrl) {
  const res = await fetch(EDGE_FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pin: PIN,
      action: "update",
      data: { id, image_url: imageUrl },
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "저장 실패");
}

// --- Main ---
async function main() {
  console.log("🔍 이미지 없는 식당 조회 중...");

  const params = {
    select: "id,name,category,address",
    image_url: "is.null",
    order: "review_count.desc",
    limit: LIMIT,
  };
  if (CATEGORY) params.category = `eq.${CATEGORY}`;

  let restaurants;
  try {
    restaurants = await dbQuery("restaurants", params);
  } catch (err) {
    console.error("DB 오류:", err.message);
    process.exit(1);
  }

  if (restaurants.length === 0) {
    console.log("✅ 이미지 없는 식당이 없습니다.");
    return;
  }

  console.log(`📋 처리 대상: ${restaurants.length}개 식당\n`);

  let success = 0, fail = 0;

  for (const r of restaurants) {
    process.stdout.write(`[${r.category}] ${r.name} ... `);

    try {
      const imageUrl = await naverImageSearch(r.name, r.address);

      if (!imageUrl) {
        console.log("❌ 이미지 없음");
        fail++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`✅ (dry-run) ${imageUrl.substring(0, 70)}`);
        success++;
        continue;
      }

      await saveImageUrl(r.id, imageUrl);
      console.log(`✅ 저장됨`);
      success++;

      // API rate limit 방지 (0.5초 대기)
      await new Promise((res) => setTimeout(res, 500));
    } catch (err) {
      console.log(`❌ 오류: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n✨ 완료: ${success}개 성공, ${fail}개 실패`);
}

main();
