/**
 * 전주 식당 주소 → 좌표 변환 스크립트
 * 카카오 주소 검색 API로 lat/lng 업데이트
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, "../.env"), "utf-8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const KAKAO_KEY     = process.env.KAKAO_REST_API_KEY;
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const ANON_KEY      = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 주소 → 좌표 (카카오 주소검색 API)
async function geocode(address) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) return null;
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
}

// 주소 검색 실패 시 키워드 검색으로 폴백
async function geocodeByKeyword(name, address) {
  const query = `${name} ${address}`;
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=FD6&size=1`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) return null;
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
}

// 전주 식당 목록 조회
async function fetchRestaurants() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurants?city_id=eq.jeonju&select=id,name,address,lat,lng`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
    }
  );
  return await res.json();
}

// 좌표 업데이트 (service role 키 사용 — RLS 우회)
async function updateCoords(id, lat, lng) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/restaurants?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ lat, lng }),
    }
  );
  return res.ok;
}

const CENTER_LAT = 35.8240731508767;
const CENTER_LNG = 127.148143800621;

(async () => {
  const restaurants = await fetchRestaurants();
  console.log(`전주 식당 ${restaurants.length}개 좌표 변환 시작...\n`);

  let updated = 0, failed = 0, skipped = 0;

  for (const r of restaurants) {
    // 이미 고유 좌표가 있으면 스킵
    if (r.lat && r.lng && r.lat !== CENTER_LAT && r.lng !== CENTER_LNG) {
      skipped++;
      continue;
    }

    const prefix = `  [${String(restaurants.indexOf(r) + 1).padStart(2)}/${restaurants.length}] ${r.name}`;

    // 1차: 주소 검색
    let coords = await geocode(r.address);

    // 2차: 키워드 검색 폴백
    if (!coords) {
      coords = await geocodeByKeyword(r.name, r.address);
    }

    if (coords) {
      const ok = await updateCoords(r.id, coords.lat, coords.lng);
      if (ok) {
        console.log(`${prefix} → ✅ (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`);
        updated++;
      } else {
        console.log(`${prefix} → ⚠️  DB 업데이트 실패`);
        failed++;
      }
    } else {
      console.log(`${prefix} → ❌ 좌표 없음 (주소: ${r.address})`);
      failed++;
    }

    await sleep(200);
  }

  console.log(`\n완료! 업데이트: ${updated}개 / 실패: ${failed}개 / 스킵: ${skipped}개`);
})();
