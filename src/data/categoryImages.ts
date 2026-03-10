/** Category → default food image mapping (served from /categories/) */
export const CATEGORY_IMAGES: Record<string, string> = {
  "닭갈비": "/categories/dakgalbi.jpg",
  "막국수": "/categories/makguksu.jpg",
  "중화요리": "/categories/chinese.jpg",
  "국밥/찌개": "/categories/gukbap.jpg",
  "삼겹살": "/categories/samgyeopsal.jpg",
  "이탈리안": "/categories/italian.jpg",
  "돈까스": "/categories/donkatsu.jpg",
  "칼국수": "/categories/kalguksu.jpg",
  "한우": "/categories/hanwoo.jpg",
  "초밥": "/categories/sushi.jpg",
  "감자탕": "/categories/gamjatang.jpg",
  "보쌈/족발": "/categories/bossam.jpg",
  "분식": "/categories/bunsik.jpg",
  "삼계탕": "/categories/samgyetang.jpg",
  "통닭": "/categories/tongdak.jpg",
  "수제버거": "/categories/burger.jpg",
  "갈비탕": "/categories/galbitang.jpg",
  "생선구이": "/categories/fish.jpg",
  "카페": "/categories/cafe.jpg",
  "베이커리": "/categories/bakery.jpg",
  "일식": "/categories/japanese.jpg",
  "샤브샤브": "/categories/shabu.jpg",
  "돼지갈비": "/categories/dwaejigalbi.jpg",
  "기타": "/categories/etc.jpg",
};

export const getCategoryImage = (category: string): string | undefined =>
  CATEGORY_IMAGES[category];
