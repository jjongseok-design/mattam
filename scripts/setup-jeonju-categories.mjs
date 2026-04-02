/**
 * 전주 카테고리 초기화 스크립트
 * - 기존 jeonju 카테고리 전체 삭제
 * - 전주 식당 데이터에 맞는 카테고리 새로 삽입
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  "Content-Type": "application/json",
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Prefer": "return=representation",
};

const JEONJU_CATEGORIES = [
  // 전주 전용 (상단 고정)
  { id: "비빔밥",    label: "비빔밥",    emoji: "🍚", id_prefix: "bb",   sort_order: 1 },
  { id: "콩나물국밥", label: "콩나물국밥", emoji: "🥣", id_prefix: "kn",  sort_order: 2 },
  { id: "한정식",    label: "한정식",    emoji: "🍱", id_prefix: "hj",   sort_order: 3 },
  // 춘천과 동일
  { id: "중화요리",  label: "중화요리",  emoji: "🥡", id_prefix: "cn",   sort_order: 4 },
  { id: "돼지갈비",  label: "돼지갈비",  emoji: "🍖", id_prefix: "dg",   sort_order: 5 },
  { id: "삼겹살",    label: "삼겹살",    emoji: "🥓", id_prefix: "sp",   sort_order: 6 },
  { id: "한우",      label: "한우",      emoji: "🥩", id_prefix: "hw",   sort_order: 7 },
  { id: "이탈리안",  label: "이탈리안",  emoji: "🍝", id_prefix: "it",   sort_order: 8 },
  { id: "일식",      label: "일식",      emoji: "🍣", id_prefix: "jp",   sort_order: 9 },
  { id: "초밥",      label: "초밥",      emoji: "🍱", id_prefix: "sb",   sort_order: 10 },
  { id: "보쌈/족발", label: "보쌈/족발", emoji: "🐷", id_prefix: "bj",   sort_order: 11 },
  { id: "샤브샤브",  label: "샤브샤브",  emoji: "🍲", id_prefix: "sv",   sort_order: 12 },
  { id: "막국수",    label: "막국수",    emoji: "🍜", id_prefix: "jjmk", sort_order: 13 },
  { id: "닭갈비",    label: "닭갈비",    emoji: "🍗", id_prefix: "dc",   sort_order: 14 },
  { id: "조개구이",  label: "조개구이",  emoji: "🦪", id_prefix: "jg",   sort_order: 15 },
  { id: "생선구이",  label: "생선구이",  emoji: "🐟", id_prefix: "fs",   sort_order: 16 },
  { id: "갈비탕",    label: "갈비탕",    emoji: "🍖", id_prefix: "gb",   sort_order: 17 },
  { id: "삼계탕",    label: "삼계탕",    emoji: "🍲", id_prefix: "sg",   sort_order: 18 },
  { id: "감자탕",    label: "감자탕",    emoji: "🫕", id_prefix: "gj",   sort_order: 19 },
  { id: "국밥/탕류", label: "국밥/탕류", emoji: "🥣", id_prefix: "hs",   sort_order: 20 },
  { id: "칼국수",    label: "칼국수",    emoji: "🍜", id_prefix: "kk",   sort_order: 21 },
  { id: "수제버거",  label: "수제버거",  emoji: "🍔", id_prefix: "bg",   sort_order: 22 },
  { id: "돈까스",    label: "돈까스",    emoji: "🍛", id_prefix: "dk",   sort_order: 23 },
  { id: "분식",      label: "분식",      emoji: "🥚", id_prefix: "bs",   sort_order: 24 },
  { id: "통닭",      label: "통닭",      emoji: "🍗", id_prefix: "td",   sort_order: 25 },
  { id: "베이커리",  label: "베이커리",  emoji: "🥐", id_prefix: "bk",   sort_order: 26 },
  { id: "카페",      label: "카페",      emoji: "☕", id_prefix: "cf",   sort_order: 27 },
  { id: "술집",      label: "술집",      emoji: "🍻", id_prefix: "sj",   sort_order: 28 },
  { id: "기타",      label: "기타",      emoji: "🍽️", id_prefix: "etc",  sort_order: 29 },
];

async function deleteExisting() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/categories?city_id=eq.jeonju`,
    { method: "DELETE", headers }
  );
  console.log(`기존 카테고리 삭제: ${res.status}`);
}

async function insertCategories() {
  const rows = JEONJU_CATEGORIES.map((c) => ({
    ...c,
    city_id: "jeonju",
    tag_placeholder: "",
    tag_suggestions: [],
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`INSERT 실패 ${res.status}: ${text}`);
  }
  console.log(`✅ 전주 카테고리 ${rows.length}개 삽입 완료`);
  rows.forEach((c) => console.log(`  - ${c.emoji} ${c.label} (prefix: ${c.id_prefix})`));
}

(async () => {
  console.log("전주 카테고리 초기화 시작...\n");
  await deleteExisting();
  await insertCategories();
  console.log("\n완료! 앱을 새로고침하면 전주 카테고리가 반영됩니다.");
})();
