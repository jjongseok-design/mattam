/**
 * fetch-all-data.mjs
 *
 * 이미지가 없는 식당(수동 저장분)에 대해 한 번에 모든 데이터를 수집합니다:
 *   - 이미지 최대 5장 (Google Places Photos → Supabase Storage)
 *   - 전화번호 (Google Places Details)
 *   - 영업시간 / 휴무일 (Google Places Details)
 *   - 가격대 (Google Places price_level → ₩~₩₩₩₩)
 *
 * 사용법:
 *   node scripts/fetch-all-data.mjs
 *
 * 옵션 (환경변수):
 *   DRY_RUN=1          DB·Storage 변경 없이 미리보기
 *   LIMIT=10           처리할 식당 수 제한
 *   CITY=chuncheon     특정 city_id만 처리
 *   DELAY_MS=2000      요청 간 딜레이 ms (기본 2000)
 *
 * 이 스크립트 완료 후 추가로 실행할 스크립트:
 *   CITY=chuncheon node scripts/fetch-menus.mjs        (메뉴 태그)
 *   CITY=chuncheon node scripts/auto-sort-images.mjs   (대표이미지 간판 사진으로)
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

const GOOGLE_KEY = env.GOOGLE_PLACES_API_KEY;
const DRY_RUN = env.DRY_RUN === "1";
const LIMIT = env.LIMIT ? parseInt(env.LIMIT) : null;
const DELAY_MS = parseInt(env.DELAY_MS || "2000");
const CITY = env.CITY || null;

if (!GOOGLE_KEY) {
  console.error("ERROR: GOOGLE_PLACES_API_KEY를 찾을 수 없습니다.");
  console.error(".env 파일에 GOOGLE_PLACES_API_KEY=AIzaSy... 추가해주세요.");
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

// ── 유틸 ─────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DAY_KO = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function checkGoogleStatus(status, errorMessage) {
  if (status === "REQUEST_DENIED") throw new Error(`Google API 거부: ${errorMessage || status}`);
  if (status === "OVER_QUERY_LIMIT") throw new Error("OVER_QUERY_LIMIT");
  if (status === "INVALID_REQUEST") throw new Error(`잘못된 요청: ${errorMessage || ""}`);
}

function parseGoogleHours(openingHours) {
  if (!openingHours?.periods?.length) return { opening_hours: null, closed_days: null };

  const periods = openingHours.periods;

  if (periods.length === 1 && periods[0].open?.time === "0000" && !periods[0].close) {
    return { opening_hours: "00:00~24:00", closed_days: null };
  }

  const fmtTime = (t) => (t ? `${t.slice(0, 2)}:${t.slice(2)}` : null);

  const weekdayPeriods = periods.filter((p) => p.open?.day >= 1 && p.open?.day <= 5);
  const rep = weekdayPeriods[0] || periods[0];
  const openTime = fmtTime(rep?.open?.time);
  const closeTime = fmtTime(rep?.close?.time);
  const opening_hours = openTime && closeTime ? `${openTime}~${closeTime}` : null;

  const openDays = new Set(periods.map((p) => p.open?.day).filter((d) => d != null));
  const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !openDays.has(d));

  let closed_days = null;
  if (closedDays.length > 0) {
    const hasSat = closedDays.includes(6);
    const hasSun = closedDays.includes(0);
    if (hasSat && hasSun && closedDays.length === 2) {
      closed_days = "주말";
    } else if (hasSat && hasSun) {
      const extra = closedDays.filter((d) => d !== 0 && d !== 6).map((d) => DAY_KO[d]);
      closed_days = extra.length ? `주말, ${extra.join(", ")}` : "주말";
    } else {
      closed_days = closedDays.map((d) => DAY_KO[d]).join(", ");
    }
  }

  return { opening_hours, closed_days };
}

function priceLevelToStr(level) {
  const map = { 1: "₩", 2: "₩₩", 3: "₩₩₩", 4: "₩₩₩₩" };
  return map[level] ?? null;
}

// ── Google Places 헬퍼 ───────────────────────────────────────────────────────

async function getPlaceDetails(restaurant) {
  const cityHint = restaurant.address
    ? restaurant.address.match(/([가-힣]+시)/)?.[1] ?? "춘천"
    : "춘천";
  const query = `${restaurant.name} ${cityHint}`;

  // Step 1: place_id 검색
  const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findUrl.searchParams.set("input", query);
  findUrl.searchParams.set("inputtype", "textquery");
  findUrl.searchParams.set("fields", "name,place_id,formatted_address");
  findUrl.searchParams.set(
    "locationbias",
    `circle:30000@${restaurant.lat ?? 37.8813},${restaurant.lng ?? 127.7298}`
  );
  findUrl.searchParams.set("language", "ko");
  findUrl.searchParams.set("key", GOOGLE_KEY);

  const findRes = await fetch(findUrl.toString());
  if (!findRes.ok) throw new Error(`Find Place HTTP ${findRes.status}`);
  const findData = await findRes.json();
  checkGoogleStatus(findData.status, findData.error_message);

  const candidate = findData.candidates?.[0];
  if (!candidate?.place_id) return null;

  // 이름 유사도 체크
  const candidateName = (candidate.name ?? "").toLowerCase().replace(/\s/g, "");
  const searchName = restaurant.name.toLowerCase().replace(/\s/g, "");
  const nameMatch =
    candidateName.includes(searchName) ||
    searchName.includes(candidateName) ||
    candidateName.slice(0, 3) === searchName.slice(0, 3);

  if (!nameMatch) {
    console.log(`  ⚠️  이름 불일치 (검색: ${restaurant.name}, 결과: ${candidate.name}), 주소로 재시도`);
    // 주소 기반 재검색
    return getPlaceDetailsByAddress(restaurant);
  }

  await sleep(300);

  // Step 2: Place Details (phone, price_level, photos, opening_hours 한 번에)
  const detailUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailUrl.searchParams.set("place_id", candidate.place_id);
  detailUrl.searchParams.set(
    "fields",
    "name,formatted_phone_number,price_level,photos,opening_hours"
  );
  detailUrl.searchParams.set("language", "ko");
  detailUrl.searchParams.set("key", GOOGLE_KEY);

  const detailRes = await fetch(detailUrl.toString());
  if (!detailRes.ok) throw new Error(`Place Details HTTP ${detailRes.status}`);
  const detailData = await detailRes.json();
  checkGoogleStatus(detailData.status, detailData.error_message);

  const result = detailData.result;
  return {
    placeId: candidate.place_id,
    candidateName: candidate.name,
    phone: result?.formatted_phone_number ?? null,
    price_level: result?.price_level ?? null,
    photos: result?.photos ?? [],
    ...parseGoogleHours(result?.opening_hours),
  };
}

async function getPlaceDetailsByAddress(restaurant) {
  if (!restaurant.address) return null;

  const query = `${restaurant.name} ${restaurant.address}`;
  const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findUrl.searchParams.set("input", query);
  findUrl.searchParams.set("inputtype", "textquery");
  findUrl.searchParams.set("fields", "name,place_id,formatted_address");
  const bias = restaurant.lat && restaurant.lng
    ? `circle:500@${restaurant.lat},${restaurant.lng}`
    : `circle:30000@37.8813,127.7298`;
  findUrl.searchParams.set("locationbias", bias);
  findUrl.searchParams.set("language", "ko");
  findUrl.searchParams.set("key", GOOGLE_KEY);

  const findRes = await fetch(findUrl.toString());
  if (!findRes.ok) throw new Error(`Find Place (주소) HTTP ${findRes.status}`);
  const findData = await findRes.json();
  checkGoogleStatus(findData.status, findData.error_message);

  const candidate = findData.candidates?.[0];
  if (!candidate?.place_id) return null;

  await sleep(300);

  const detailUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailUrl.searchParams.set("place_id", candidate.place_id);
  detailUrl.searchParams.set(
    "fields",
    "name,formatted_phone_number,price_level,photos,opening_hours"
  );
  detailUrl.searchParams.set("language", "ko");
  detailUrl.searchParams.set("key", GOOGLE_KEY);

  const detailRes = await fetch(detailUrl.toString());
  if (!detailRes.ok) throw new Error(`Place Details (주소) HTTP ${detailRes.status}`);
  const detailData = await detailRes.json();
  checkGoogleStatus(detailData.status, detailData.error_message);

  const result = detailData.result;
  return {
    placeId: candidate.place_id,
    candidateName: candidate.name,
    phone: result?.formatted_phone_number ?? null,
    price_level: result?.price_level ?? null,
    photos: result?.photos ?? [],
    _byAddress: true,
    ...parseGoogleHours(result?.opening_hours),
  };
}

async function downloadPhoto(photoReference) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.includes("image")) return null;
  const buf = await res.arrayBuffer();
  return { buf, contentType };
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`fetch-all-data.mjs ${DRY_RUN ? "[DRY RUN] " : ""}시작`);
  console.log(`설정: DELAY=${DELAY_MS}ms / LIMIT=${LIMIT ?? "없음"} / CITY=${CITY ?? "전체"}`);
  console.log();

  // 이미지 없는 식당 조회
  const params = {
    select: "id,name,address,lat,lng,city_id,phone,price_range,opening_hours,closed_days",
    "image_url": "is.null",
    order: "name.asc",
  };
  if (CITY) params["city_id"] = `eq.${CITY}`;

  const all = await sbGet("restaurants", params);
  const targets = LIMIT ? all.slice(0, LIMIT) : all;

  console.log(`대상: ${targets.length}개 (이미지 없는 식당)`);
  if (DRY_RUN) console.log("[DRY RUN 모드 - DB·Storage 변경 없음]");
  console.log();

  let cntUpdated = 0, cntNoPhoto = 0, cntFailed = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const prefix = `[${String(i + 1).padStart(3, " ")}/${targets.length}] ${r.name}`;

    try {
      const details = await getPlaceDetails(r);

      if (!details) {
        console.log(`${prefix} → Google 검색 실패`);
        cntNoPhoto++;
        if (i < targets.length - 1) await sleep(DELAY_MS);
        continue;
      }

      console.log(
        `${prefix} → 후보: ${details.candidateName}${details._byAddress ? " [주소검색]" : ""}`
      );

      // 사진 다운로드 & 업로드 (최대 5장)
      const imageUrls = [];
      let photoIdx = 0;

      while (imageUrls.length < 5 && photoIdx < details.photos.length) {
        const photo = details.photos[photoIdx++];
        const downloaded = await downloadPhoto(photo.photo_reference);
        if (!downloaded) continue;

        const ext = downloaded.contentType.includes("png") ? "png" : "jpg";
        // image_url: {id}.jpg, extra_images: {id}_1.jpg, {id}_2.jpg ...
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

      if (imageUrls.length === 0 && details.photos.length > 0) {
        console.log(`  ⚠️  사진 다운로드 실패`);
      } else if (details.photos.length === 0) {
        console.log(`  ⚠️  Google에 사진 없음`);
      }

      // DB 업데이트할 필드 수집
      const updates = {};

      if (imageUrls.length > 0 && !DRY_RUN) {
        updates.image_url = imageUrls[0];
        if (imageUrls.length > 1) updates.extra_images = imageUrls.slice(1);
      }

      if (details.phone && !r.phone) {
        updates.phone = details.phone;
        console.log(`  📞 전화번호: ${details.phone}`);
      }

      const priceStr = priceLevelToStr(details.price_level);
      if (priceStr && !r.price_range) {
        updates.price_range = priceStr;
        console.log(`  💰 가격대: ${priceStr}`);
      }

      if (details.opening_hours && !r.opening_hours) {
        updates.opening_hours = details.opening_hours;
        console.log(`  🕐 영업시간: ${details.opening_hours}`);
      }

      if (details.closed_days && !r.closed_days) {
        updates.closed_days = details.closed_days;
        console.log(`  📅 휴무: ${details.closed_days}`);
      }

      if (Object.keys(updates).length === 0 && DRY_RUN) {
        console.log(`  ℹ️  업데이트 없음`);
      }

      if (!DRY_RUN && Object.keys(updates).length > 0) {
        await sbPatch(r.id, updates);
        console.log(`  ✅ 저장 완료 (이미지 ${imageUrls.length}장)`);
        cntUpdated++;
      } else if (DRY_RUN) {
        console.log(
          `  [DRY RUN] 업데이트 예정: ${Object.keys(updates).filter(k => k !== 'image_url' && k !== 'extra_images').join(", ")} / 이미지 ${imageUrls.length}장`
        );
        cntUpdated++;
      }
    } catch (err) {
      if (err.message === "OVER_QUERY_LIMIT") {
        console.error(`${prefix} → API 할당량 초과! 60초 대기 후 재시도...`);
        await sleep(60000);
        i--;
        continue;
      }
      console.error(`${prefix} → 오류: ${err.message}`);
      cntFailed++;
    }

    console.log();
    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log("═".repeat(50));
  console.log(`완료: 처리 ${cntUpdated}개 / 검색실패 ${cntNoPhoto}개 / 오류 ${cntFailed}개`);
  if (DRY_RUN) console.log("※ DRY RUN 모드였으므로 실제 변경 없음");
  console.log();
  console.log("다음 단계:");
  console.log("  CITY=chuncheon node scripts/fetch-menus.mjs        # 메뉴 태그");
  console.log("  CITY=chuncheon node scripts/auto-sort-images.mjs   # 간판 사진 대표로");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
