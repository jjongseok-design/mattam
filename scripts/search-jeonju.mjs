import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 파일에서 환경변수 읽기
const envPath = join(__dirname, "../.env");
const env = readFileSync(envPath, "utf-8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 없습니다.");
  process.exit(1);
}

const CATEGORIES = [
  { keyword: "전주 비빔밥 맛집", category: "비빔밥" },
  { keyword: "전주 콩나물국밥 맛집", category: "콩나물국밥" },
  { keyword: "전주 한정식 맛집", category: "한정식" },
  { keyword: "전주 칼국수 맛집", category: "칼국수" },
  { keyword: "전주 삼겹살 맛집", category: "삼겹살" },
  { keyword: "전주 한우 맛집", category: "한우" },
  { keyword: "전주 중화요리 맛집", category: "중화요리" },
  { keyword: "전주 일식 맛집", category: "일식" },
  { keyword: "전주 초밥 맛집", category: "초밥" },
  { keyword: "전주 이탈리안 파스타 맛집", category: "이탈리안" },
  { keyword: "전주 베이커리 빵집", category: "베이커리" },
  { keyword: "전주 카페 맛집", category: "카페" },
  { keyword: "전주 돈까스 맛집", category: "돈까스" },
  { keyword: "전주 보쌈 족발 맛집", category: "보쌈/족발" },
  { keyword: "전주 통닭 치킨 맛집", category: "통닭" },
  { keyword: "전주 갈비탕 맛집", category: "갈비탕" },
  { keyword: "전주 감자탕 맛집", category: "감자탕" },
  { keyword: "전주 순대국밥 맛집", category: "국밥/탕류" },
  { keyword: "전주 분식 맛집", category: "분식" },
  { keyword: "전주 술집 이자카야 맛집", category: "술집" },
];

const stripTags = (str) => str
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchLocal(keyword) {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(keyword)}&display=5&start=1`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": CLIENT_ID,
      "X-Naver-Client-Secret": CLIENT_SECRET,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.items ?? [];
}

const results = [];
const seenNames = new Set();

for (const { keyword, category } of CATEGORIES) {
  console.log(`검색 중: ${keyword}`);
  try {
    const items = await searchLocal(keyword);
    let count = 0;
    for (const item of items) {
      const name = stripTags(item.title).trim();
      const address = (item.address || item.roadAddress || "").trim();

      if (!address.includes("전주")) continue;
      if (seenNames.has(name)) continue;

      seenNames.add(name);
      results.push({ name, address, category });
      count++;
    }
    console.log(`  → ${count}개 수집 (누적: ${results.length})`);
  } catch (e) {
    console.error(`  오류: ${e.message}`);
  }
  await sleep(300);
}

const outPath = join(__dirname, "../restaurants-jeonju.json");
writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
console.log(`\n완료! 총 ${results.length}개 → restaurants-jeonju.json 저장`);
