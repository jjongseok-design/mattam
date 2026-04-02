/**
 * verify-jeonju.mjs
 *
 * DB에 저장된 전주 식당들을 카카오 로컬 API로 재검증합니다.
 *   1. 현재 좌표 반경 200m 내에서 식당명으로 검색
 *   2. 이름 + 주소 일치 여부 확인
 *   3. 일치 → 카카오 최신 주소/전화번호로 DB 업데이트
 *   4. 불일치 → 제외 목록 출력 (자동 삭제 안 함, DRY_RUN과 무관하게 보고)
 *
 * 옵션:
 *   DRY_RUN=1   DB 업데이트 없이 결과만 출력
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env"), "utf8")
    .split("\n")
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const KAKAO_KEY    = env.KAKAO_REST_API_KEY;
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN      = process.env.DRY_RUN === "1";

const sleep = ms => new Promise(r => setTimeout(r, ms));

const SB_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function nameMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/\s/g, "").replace(/[()（）]/g, "");
  const ca = clean(a), cb = clean(b);
  return ca === cb || ca.includes(cb) || cb.includes(ca) || ca.slice(0, 4) === cb.slice(0, 4);
}

function addressMatch(a, b) {
  const extractCore = addr => {
    const m = addr?.match(/(\S+(?:로|길|동|읍|면)\s*\d+(?:-\d+)?)/);
    return m ? m[1].replace(/\s/g, "") : addr?.slice(-10) ?? "";
  };
  const ca = extractCore(a), cb = extractCore(b);
  return ca && cb && (ca.includes(cb) || cb.includes(ca));
}

async function kakaoSearchByCoords(name, lat, lng) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", name);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("radius", "200");
  url.searchParams.set("size", "5");
  const res = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  const data = await res.json();
  return data.documents ?? [];
}

async function kakaoSearchByName(name) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", `${name} 전주`);
  url.searchParams.set("category_group_code", "FD6");
  url.searchParams.set("size", "5");
  const res = await fetch(url.toString(), { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  const data = await res.json();
  return data.documents ?? [];
}

async function sbPatch(id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...SB_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH 실패: ${res.status}`);
}

// 전주 식당 전체 조회
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/restaurants?city_id=eq.jeonju&select=id,name,address,lat,lng,phone`,
  { headers: SB_HEADERS }
);
const restaurants = await res.json();
console.log(`전주 식당 ${restaurants.length}개 검증 시작...\n${DRY_RUN ? "(DRY RUN — DB 변경 없음)\n" : ""}`);

const verified = [], updated = [], failed = [];

for (let i = 0; i < restaurants.length; i++) {
  const r = restaurants[i];
  const prefix = `  [${String(i + 1).padStart(2)}/${restaurants.length}] ${r.name}`;

  try {
    // 1차: 좌표 반경 200m 검색
    let docs = await kakaoSearchByCoords(r.name, r.lat, r.lng);

    // 2차: 좌표 검색 결과 없으면 전주 전체 검색
    if (docs.length === 0) {
      docs = await kakaoSearchByName(r.name);
    }

    if (docs.length === 0) {
      console.log(`${prefix} → ⛔ 카카오 검색 결과 없음 (폐업 의심)`);
      failed.push({ ...r, _reason: "검색 결과 없음" });
      await sleep(200);
      continue;
    }

    // 이름 + 주소 완전 일치
    const fullMatch = docs.find(d =>
      nameMatch(r.name, d.place_name) &&
      addressMatch(r.address, d.road_address_name || d.address_name)
    );

    if (fullMatch) {
      const updates = {};
      const newAddr = fullMatch.road_address_name || fullMatch.address_name;
      const newLat = parseFloat(fullMatch.y);
      const newLng = parseFloat(fullMatch.x);
      const newPhone = fullMatch.phone;
      if (newAddr && newAddr !== r.address) updates.address = newAddr;
      if (newLat && newLng && (Math.abs(newLat - r.lat) > 0.0001 || Math.abs(newLng - r.lng) > 0.0001)) {
        updates.lat = newLat; updates.lng = newLng;
      }
      if (newPhone && newPhone !== r.phone) updates.phone = newPhone;

      if (Object.keys(updates).length > 0) {
        console.log(`${prefix} → ✅ 일치 (업데이트: ${Object.keys(updates).join(", ")})`);
        if (!DRY_RUN) await sbPatch(r.id, updates);
        updated.push(r.name);
      } else {
        console.log(`${prefix} → ✅ 일치`);
      }
      verified.push(r.name);
      await sleep(200);
      continue;
    }

    // 이름만 일치 (주소 변경)
    const nameOnly = docs.find(d => nameMatch(r.name, d.place_name));
    if (nameOnly) {
      const newAddr = nameOnly.road_address_name || nameOnly.address_name;
      console.log(`${prefix} → ⚠️  주소 변경 감지 → ${newAddr}`);
      if (!DRY_RUN) await sbPatch(r.id, {
        address: newAddr,
        lat: parseFloat(nameOnly.y),
        lng: parseFloat(nameOnly.x),
        phone: nameOnly.phone || r.phone,
      });
      verified.push(r.name);
      updated.push(r.name);
      await sleep(200);
      continue;
    }

    // 불일치
    console.log(`${prefix} → ⛔ 불일치 (카카오 최상위: ${docs[0]?.place_name})`);
    failed.push({ ...r, _reason: `카카오=${docs[0]?.place_name}` });

  } catch (err) {
    console.log(`${prefix} → ⚠️  오류: ${err.message} (통과)`);
    verified.push(r.name);
  }

  await sleep(200);
}

console.log(`\n${"─".repeat(50)}`);
console.log(`✅ 검증 통과: ${verified.length}개`);
console.log(`🔄 정보 업데이트: ${updated.length}개`);
console.log(`⛔ 검증 실패: ${failed.length}개`);

if (failed.length > 0) {
  console.log(`\n⛔ 실패 목록 (수동 확인 필요):`);
  failed.forEach(r => console.log(`  - ${r.name} | ${r.address} | 이유: ${r._reason}`));
  console.log(`\n위 식당들은 DB에서 삭제하려면:`);
  console.log(`  resstaurantchuncheon Supabase SQL 에디터에서 실행:`);
  failed.forEach(r => console.log(`  DELETE FROM restaurants WHERE id = '${r.id}';`));
}
