export interface Restaurant {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  priceRange: string;
  tags: string[];
  description?: string;
}

export interface CategoryInfo {
  name: string;
  color: string;
  emoji: string;
}

export const categoryMap: Record<string, CategoryInfo> = {
  전체: { name: "전체", color: "grey", emoji: "🍽️" },
  중국집: { name: "중국집", color: "red", emoji: "🥟" },
  닭갈비: { name: "닭갈비", color: "orange", emoji: "🍗" },
  돼지갈비: { name: "돼지갈비", color: "violet", emoji: "🥩" },
  삼겹살: { name: "삼겹살", color: "gold", emoji: "🐷" },
  소고기: { name: "소고기", color: "red", emoji: "🥩" },
  곰탕갈비탕: { name: "곰탕/갈비탕", color: "green", emoji: "🍲" },
  삼계탕: { name: "삼계탕", color: "gold", emoji: "🐔" },
  칼국수: { name: "칼국수", color: "blue", emoji: "🍜" },
  막국수: { name: "막국수", color: "blue", emoji: "🍝" },
  국밥순대국: { name: "국밥/순대국", color: "green", emoji: "🥘" },
  곱창막창: { name: "곱창/막창", color: "violet", emoji: "🫕" },
  냉면: { name: "냉면", color: "blue", emoji: "🍜" },
  족발보쌈: { name: "족발/보쌈", color: "gold", emoji: "🦶" },
  일식: { name: "일식/초밥", color: "orange", emoji: "🍣" },
  양식: { name: "양식/파스타", color: "violet", emoji: "🍝" },
  피자: { name: "피자", color: "red", emoji: "🍕" },
  치킨: { name: "치킨", color: "yellow", emoji: "🍗" },
  해물횟집: { name: "해물/횟집", color: "blue", emoji: "🐟" },
  분식: { name: "분식", color: "gold", emoji: "🍢" },
  카페베이커리: { name: "카페/베이커리", color: "grey", emoji: "☕" },
  한식기타: { name: "한식(기타)", color: "green", emoji: "🍚" },
};

export const categories = Object.keys(categoryMap);

export const markerColorUrls: Record<string, string> = {
  red: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  orange: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  green: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  blue: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  yellow: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
  violet: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  gold: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  grey: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
};

export const restaurants: Restaurant[] = [
  // ===== 중국집 (10) =====
  { id: "cn1", name: "회영루", category: "중국집", address: "춘천시 금강로 38", phone: "033-254-2358", rating: 4.2, reviewCount: 13267, lat: 37.8789, lng: 127.7284, priceRange: "₩7,000~₩15,000", tags: ["짜장면","짬뽕","탕수육"], description: "춘천 명동 인기 중국집" },
  { id: "cn2", name: "란중식", category: "중국집", address: "춘천시 동면 춘천순환로 356", phone: "033-241-5588", rating: 4.0, reviewCount: 9617, lat: 37.8920, lng: 127.7580, priceRange: "₩8,000~₩18,000", tags: ["코스요리","짬뽕","탕수육"] },
  { id: "cn3", name: "온정", category: "중국집", address: "춘천시 동면 가산로 165", phone: "033-243-1234", rating: 3.7, reviewCount: 8050, lat: 37.8950, lng: 127.7620, priceRange: "₩7,000~₩14,000", tags: ["짜장면","짬뽕"] },
  { id: "cn4", name: "치엔롱", category: "중국집", address: "춘천시 서면 월송길 381-15", phone: "033-242-8899", rating: 3.7, reviewCount: 9505, lat: 37.8650, lng: 127.6880, priceRange: "₩7,000~₩15,000", tags: ["짬뽕","탕수육","볶음밥"] },
  { id: "cn5", name: "차이나게이트", category: "중국집", address: "춘천시 애막골길7번길 31-1", phone: "033-252-5566", rating: 3.5, reviewCount: 11951, lat: 37.8770, lng: 127.7350, priceRange: "₩6,000~₩13,000", tags: ["짜장면","짬뽕","군만두"] },
  { id: "cn6", name: "북경관", category: "중국집", address: "춘천시 중앙로 67", phone: "033-253-7788", rating: 3.4, reviewCount: 7253, lat: 37.8800, lng: 127.7300, priceRange: "₩6,000~₩12,000", tags: ["짜장면","짬뽕"] },
  { id: "cn7", name: "복성원", category: "중국집", address: "춘천시 춘천로 195", phone: "033-256-1234", rating: 2.8, reviewCount: 4986, lat: 37.8740, lng: 127.7260, priceRange: "₩6,000~₩11,000", tags: ["짜장면","볶음밥"] },
  { id: "cn8", name: "보문각", category: "중국집", address: "춘천시 약사고개길 42", phone: "033-255-4455", rating: 3.5, reviewCount: 7501, lat: 37.8810, lng: 127.7320, priceRange: "₩7,000~₩14,000", tags: ["짜장면","짬뽕","탕수육"] },
  { id: "cn9", name: "뽕뽕황짬뽕이야", category: "중국집", address: "춘천시 후석로455번길 53-1", phone: "033-257-0909", rating: 3.8, reviewCount: 344, lat: 37.8720, lng: 127.7380, priceRange: "₩8,000~₩14,000", tags: ["짬뽕","볶음밥"] },
  { id: "cn10", name: "구가네찹쌀탕수육", category: "중국집", address: "춘천시 퇴계로145번길 7-11", phone: "033-251-3344", rating: 3.6, reviewCount: 4884, lat: 37.8695, lng: 127.7275, priceRange: "₩8,000~₩16,000", tags: ["찹쌀탕수육","짜장면"] },

  // ===== 닭갈비 (6) =====
  { id: "dk1", name: "통나무집닭갈비", category: "닭갈비", address: "춘천시 신북읍 신샘밭로 763", phone: "033-242-5359", rating: 4.5, reviewCount: 15230, lat: 37.9280, lng: 127.7350, priceRange: "₩15,000~₩20,000", tags: ["철판닭갈비","막국수"], description: "1970년대 3대째 운영 원조" },
  { id: "dk2", name: "농가닭갈비", category: "닭갈비", address: "춘천시 신북읍 신뱀밭로 622-5", phone: "033-242-2110", rating: 4.3, reviewCount: 12450, lat: 37.9250, lng: 127.7310, priceRange: "₩14,000~₩18,000", tags: ["숯불닭갈비","감자전"], description: "숯불닭갈비 유행의 시초" },
  { id: "dk3", name: "장호닭갈비", category: "닭갈비", address: "춘천시 신북읍 신샘밭로 682", phone: "033-242-7373", rating: 4.4, reviewCount: 18900, lat: 37.9260, lng: 127.7330, priceRange: "₩15,000~₩20,000", tags: ["소금숯불닭갈비","막국수"], description: "닭갈비의 신" },
  { id: "dk4", name: "우성닭갈비", category: "닭갈비", address: "춘천시 동면 만천양지길 87", phone: "033-243-1800", rating: 4.2, reviewCount: 9870, lat: 37.8960, lng: 127.7550, priceRange: "₩14,000~₩18,000", tags: ["닭갈비","막국수"] },
  { id: "dk5", name: "우미닭갈비", category: "닭갈비", address: "춘천시 금강로62번길 4", phone: "033-254-9292", rating: 4.1, reviewCount: 7650, lat: 37.8785, lng: 127.7290, priceRange: "₩15,000~₩18,000", tags: ["원조닭갈비","닭내장"] },
  { id: "dk6", name: "상호네닭갈비", category: "닭갈비", address: "춘천시 우묵들길 7", phone: "033-253-4400", rating: 4.0, reviewCount: 8422, lat: 37.8775, lng: 127.7260, priceRange: "₩14,000~₩17,000", tags: ["닭갈비","볶음밥"] },

  // ===== 돼지갈비 (5) =====
  { id: "pg1", name: "팔뚝갈비", category: "돼지갈비", address: "춘천시 동면 공단로 110", phone: "033-244-8282", rating: 4.2, reviewCount: 7825, lat: 37.8930, lng: 127.7600, priceRange: "₩12,000~₩20,000", tags: ["돼지갈비","왕갈비"], description: "춘천 대표 돼지갈비" },
  { id: "pg2", name: "화로산채", category: "돼지갈비", address: "춘천시 신동면 정족길 188", phone: "033-261-5577", rating: 3.0, reviewCount: 6800, lat: 37.8550, lng: 127.7800, priceRange: "₩11,000~₩18,000", tags: ["돼지갈비","산채정식"] },
  { id: "pg3", name: "도원갈비", category: "돼지갈비", address: "춘천시 후평동 634-5", phone: "033-252-1177", rating: 4.0, reviewCount: 5430, lat: 37.8700, lng: 127.7400, priceRange: "₩13,000~₩22,000", tags: ["돼지갈비","양념갈비"] },
  { id: "pg4", name: "풍미닭갈비돼지갈비", category: "돼지갈비", address: "춘천시 운교길 7", phone: "033-253-9080", rating: 3.5, reviewCount: 2428, lat: 37.8760, lng: 127.7240, priceRange: "₩12,000~₩18,000", tags: ["돼지갈비","닭갈비"] },
  { id: "pg5", name: "산골갈비", category: "돼지갈비", address: "춘천시 남산면 강촌리 123", phone: "033-262-3344", rating: 3.8, reviewCount: 3200, lat: 37.8300, lng: 127.7100, priceRange: "₩13,000~₩19,000", tags: ["양념돼지갈비","된장찌개"] },

  // ===== 삼겹살 (5) =====
  { id: "sg1", name: "명월집", category: "삼겹살", address: "춘천시 남춘로5번길 16 2층", phone: "033-254-7300", rating: 4.1, reviewCount: 6540, lat: 37.8710, lng: 127.7270, priceRange: "₩13,000~₩18,000", tags: ["삼겹살","목살","된장찌개"], description: "퇴계동 인기 삼겹살" },
  { id: "sg2", name: "토담화로구이", category: "삼겹살", address: "춘천시 남춘로36번길 65", phone: "033-256-2200", rating: 3.8, reviewCount: 2444, lat: 37.8680, lng: 127.7290, priceRange: "₩12,000~₩17,000", tags: ["삼겹살","항정살"] },
  { id: "sg3", name: "고깃집춘천", category: "삼겹살", address: "춘천시 효자동 234-8", phone: "033-262-1100", rating: 4.0, reviewCount: 3200, lat: 37.8665, lng: 127.7310, priceRange: "₩14,000~₩20,000", tags: ["삼겹살","갈매기살"] },
  { id: "sg4", name: "왕돼지국밥삼겹살", category: "삼겹살", address: "춘천시 중앙로 89", phone: "033-255-1900", rating: 3.6, reviewCount: 1890, lat: 37.8798, lng: 127.7288, priceRange: "₩11,000~₩16,000", tags: ["삼겹살","국밥"] },
  { id: "sg5", name: "홍익돈", category: "삼겹살", address: "춘천시 공지로 260", phone: "033-253-8800", rating: 4.3, reviewCount: 4200, lat: 37.8755, lng: 127.7230, priceRange: "₩14,000~₩19,000", tags: ["삼겹살","목살","특수부위"] },

  // ===== 소고기 (5) =====
  { id: "bf1", name: "춘천한우명가", category: "소고기", address: "춘천시 퇴계로 145", phone: "033-254-0808", rating: 4.4, reviewCount: 5600, lat: 37.8690, lng: 127.7260, priceRange: "₩25,000~₩50,000", tags: ["한우","꽃등심","갈비살"], description: "춘천 대표 한우 전문점" },
  { id: "bf2", name: "산수정", category: "소고기", address: "춘천시 봉의산길 33", phone: "033-252-3939", rating: 4.1, reviewCount: 3400, lat: 37.8815, lng: 127.7305, priceRange: "₩20,000~₩45,000", tags: ["소갈비","한우등심"] },
  { id: "bf3", name: "석파정", category: "소고기", address: "춘천시 소양로 120", phone: "033-253-5050", rating: 4.0, reviewCount: 2800, lat: 37.8830, lng: 127.7250, priceRange: "₩22,000~₩48,000", tags: ["한우","소갈비","육회"] },
  { id: "bf4", name: "소야", category: "소고기", address: "춘천시 동면 순환대로 1100", phone: "033-244-1234", rating: 3.9, reviewCount: 1950, lat: 37.8940, lng: 127.7560, priceRange: "₩18,000~₩40,000", tags: ["소고기","갈비살"] },
  { id: "bf5", name: "미트팩토리", category: "소고기", address: "춘천시 후평3동 655", phone: "033-251-7777", rating: 4.2, reviewCount: 3100, lat: 37.8705, lng: 127.7420, priceRange: "₩20,000~₩42,000", tags: ["한우","꽃등심","차돌박이"] },

  // ===== 곰탕/갈비탕 (5) =====
  { id: "gt1", name: "옛날곰탕", category: "곰탕갈비탕", address: "춘천시 중앙로 145", phone: "033-252-8800", rating: 4.1, reviewCount: 3870, lat: 37.8805, lng: 127.7315, priceRange: "₩10,000~₩14,000", tags: ["곰탕","갈비탕","설렁탕"], description: "정통 곰탕 전문" },
  { id: "gt2", name: "소양정", category: "곰탕갈비탕", address: "춘천시 소양로 88", phone: "033-254-1188", rating: 3.9, reviewCount: 4200, lat: 37.8825, lng: 127.7245, priceRange: "₩9,000~₩15,000", tags: ["갈비탕","불고기","제육볶음"] },
  { id: "gt3", name: "한양곰탕", category: "곰탕갈비탕", address: "춘천시 퇴계로 203", phone: "033-256-0011", rating: 4.0, reviewCount: 2900, lat: 37.8685, lng: 127.7268, priceRange: "₩10,000~₩13,000", tags: ["곰탕","도가니탕"] },
  { id: "gt4", name: "명가갈비탕", category: "곰탕갈비탕", address: "춘천시 춘천로 210", phone: "033-253-2233", rating: 3.7, reviewCount: 1800, lat: 37.8745, lng: 127.7278, priceRange: "₩11,000~₩14,000", tags: ["갈비탕","꼬리곰탕"] },
  { id: "gt5", name: "장터곰탕", category: "곰탕갈비탕", address: "춘천시 신북읍 유포리길 22", phone: "033-242-5511", rating: 3.8, reviewCount: 1500, lat: 37.9290, lng: 127.7210, priceRange: "₩9,000~₩12,000", tags: ["곰탕","수육"] },

  // ===== 삼계탕 (4) =====
  { id: "sc1", name: "토속촌삼계탕 춘천", category: "삼계탕", address: "춘천시 금강로 52", phone: "033-254-7900", rating: 4.2, reviewCount: 3500, lat: 37.8792, lng: 127.7295, priceRange: "₩14,000~₩20,000", tags: ["삼계탕","옻닭","한방삼계탕"], description: "전통 한방 삼계탕" },
  { id: "sc2", name: "황금삼계탕", category: "삼계탕", address: "춘천시 효자동 130", phone: "033-262-5588", rating: 3.8, reviewCount: 2100, lat: 37.8660, lng: 127.7300, priceRange: "₩13,000~₩18,000", tags: ["삼계탕","녹두삼계탕"] },
  { id: "sc3", name: "봉황삼계탕", category: "삼계탕", address: "춘천시 중앙로 180", phone: "033-255-3300", rating: 3.9, reviewCount: 1750, lat: 37.8808, lng: 127.7310, priceRange: "₩14,000~₩19,000", tags: ["삼계탕","전복삼계탕"] },
  { id: "sc4", name: "원조누룽지삼계탕", category: "삼계탕", address: "춘천시 퇴계로 167", phone: "033-251-9988", rating: 4.0, reviewCount: 2600, lat: 37.8698, lng: 127.7272, priceRange: "₩13,000~₩17,000", tags: ["누룽지삼계탕","옻닭"] },

  // ===== 칼국수 (5) =====
  { id: "kk1", name: "풍물옹심이칼국수", category: "칼국수", address: "춘천시 신북읍 신샘밭로 644", phone: "033-242-8989", rating: 4.3, reviewCount: 23869, lat: 37.9240, lng: 127.7290, priceRange: "₩9,000~₩13,000", tags: ["옹심이","칼국수","감자전"], description: "춘천 대표 옹심이 칼국수" },
  { id: "kk2", name: "현대장칼국수", category: "칼국수", address: "춘천시 춘천로 178", phone: "033-254-3456", rating: 4.0, reviewCount: 5200, lat: 37.8748, lng: 127.7265, priceRange: "₩8,000~₩11,000", tags: ["손칼국수","수제비"] },
  { id: "kk3", name: "부안칼국수", category: "칼국수", address: "춘천시 후석로344번길 8", phone: "033-256-7890", rating: 4.1, reviewCount: 4800, lat: 37.8725, lng: 127.7370, priceRange: "₩8,000~₩10,000", tags: ["칼국수","들깨칼국수"] },
  { id: "kk4", name: "손가네칼국수", category: "칼국수", address: "춘천시 퇴계로 95", phone: "033-255-0505", rating: 3.7, reviewCount: 2100, lat: 37.8692, lng: 127.7255, priceRange: "₩7,000~₩10,000", tags: ["칼국수","수제비","김치전"] },
  { id: "kk5", name: "샘밭칼국수", category: "칼국수", address: "춘천시 신북읍 신샘밭로 650", phone: "033-242-1100", rating: 3.9, reviewCount: 3400, lat: 37.9242, lng: 127.7295, priceRange: "₩8,000~₩12,000", tags: ["칼국수","옹심이"] },

  // ===== 막국수 (5) =====
  { id: "mk1", name: "샘밭막국수", category: "막국수", address: "춘천시 신북읍 신샘밭로 644", phone: "033-242-1765", rating: 3.9, reviewCount: 23869, lat: 37.9235, lng: 127.7295, priceRange: "₩8,000~₩12,000", tags: ["비빔막국수","물막국수","편육"], description: "춘천 대표 막국수" },
  { id: "mk2", name: "유포리막국수", category: "막국수", address: "춘천시 신북읍 유포리길 45", phone: "033-242-3500", rating: 4.2, reviewCount: 8940, lat: 37.9300, lng: 127.7200, priceRange: "₩8,000~₩11,000", tags: ["물막국수","수육"] },
  { id: "mk3", name: "동명막국수", category: "막국수", address: "춘천시 영서로 3034", phone: "033-244-6090", rating: 3.7, reviewCount: 1267, lat: 37.9100, lng: 127.7450, priceRange: "₩8,000~₩15,000", tags: ["막국수","숯불닭갈비"] },
  { id: "mk4", name: "춘천막국수체험관", category: "막국수", address: "춘천시 신북읍 신샘밭로 680", phone: "033-242-8811", rating: 3.5, reviewCount: 2200, lat: 37.9255, lng: 127.7320, priceRange: "₩8,000~₩11,000", tags: ["막국수","메밀전"] },
  { id: "mk5", name: "남부막국수", category: "막국수", address: "춘천시 남산면 서면춘천로 88", phone: "033-263-1234", rating: 4.0, reviewCount: 3800, lat: 37.8440, lng: 127.7140, priceRange: "₩8,000~₩12,000", tags: ["막국수","편육","메밀전"] },

  // ===== 국밥/순대국 (5) =====
  { id: "gb1", name: "춘천해장국", category: "국밥순대국", address: "춘천시 중앙로 98", phone: "033-253-1234", rating: 4.0, reviewCount: 3400, lat: 37.8802, lng: 127.7298, priceRange: "₩8,000~₩11,000", tags: ["해장국","순대국","내장탕"] },
  { id: "gb2", name: "부산돼지국밥", category: "국밥순대국", address: "춘천시 퇴계로 155", phone: "033-254-6600", rating: 3.8, reviewCount: 2800, lat: 37.8695, lng: 127.7270, priceRange: "₩8,000~₩10,000", tags: ["돼지국밥","수육국밥"] },
  { id: "gb3", name: "원조순대국", category: "국밥순대국", address: "춘천시 공지로 278", phone: "033-252-4455", rating: 3.9, reviewCount: 2200, lat: 37.8752, lng: 127.7225, priceRange: "₩8,000~₩10,000", tags: ["순대국","모듬순대"] },
  { id: "gb4", name: "양평해장국 춘천점", category: "국밥순대국", address: "춘천시 후석로 290", phone: "033-257-8800", rating: 3.7, reviewCount: 1600, lat: 37.8730, lng: 127.7365, priceRange: "₩9,000~₩12,000", tags: ["선지해장국","소머리국밥"] },
  { id: "gb5", name: "진이찬국밥", category: "국밥순대국", address: "춘천시 동면 순환대로 1088", phone: "033-244-2200", rating: 3.6, reviewCount: 1200, lat: 37.8935, lng: 127.7545, priceRange: "₩7,000~₩10,000", tags: ["돼지국밥","순대"] },

  // ===== 곱창/막창 (4) =====
  { id: "gc1", name: "춘천곱창전골", category: "곱창막창", address: "춘천시 퇴계로 98", phone: "033-255-7700", rating: 4.1, reviewCount: 3600, lat: 37.8688, lng: 127.7252, priceRange: "₩12,000~₩18,000", tags: ["곱창전골","소곱창","대창"], description: "춘천 퇴계동 곱창 맛집" },
  { id: "gc2", name: "남산곱창", category: "곱창막창", address: "춘천시 남산면 춘천로 45", phone: "033-263-5500", rating: 3.9, reviewCount: 2100, lat: 37.8460, lng: 127.7155, priceRange: "₩13,000~₩20,000", tags: ["소곱창","막창","대창"] },
  { id: "gc3", name: "을지곱창", category: "곱창막창", address: "춘천시 금강로 45", phone: "033-254-3300", rating: 4.0, reviewCount: 2800, lat: 37.8793, lng: 127.7288, priceRange: "₩14,000~₩22,000", tags: ["곱창","막창"] },
  { id: "gc4", name: "명동곱창거리", category: "곱창막창", address: "춘천시 명동길 15", phone: "033-253-9900", rating: 3.7, reviewCount: 1500, lat: 37.8788, lng: 127.7282, priceRange: "₩12,000~₩18,000", tags: ["곱창","소주","야식"] },

  // ===== 냉면 (4) =====
  { id: "nm1", name: "강원평양냉면", category: "냉면", address: "춘천시 소양로 100", phone: "033-253-4567", rating: 4.2, reviewCount: 4100, lat: 37.8828, lng: 127.7248, priceRange: "₩9,000~₩13,000", tags: ["평양냉면","물냉면","비빔냉면"], description: "춘천 정통 냉면" },
  { id: "nm2", name: "원조춘천냉면", category: "냉면", address: "춘천시 중앙로 155", phone: "033-254-8900", rating: 3.8, reviewCount: 2600, lat: 37.8808, lng: 127.7312, priceRange: "₩8,000~₩12,000", tags: ["물냉면","비빔냉면","만두"] },
  { id: "nm3", name: "함흥냉면집", category: "냉면", address: "춘천시 퇴계로 110", phone: "033-256-5566", rating: 3.9, reviewCount: 1900, lat: 37.8693, lng: 127.7258, priceRange: "₩9,000~₩12,000", tags: ["함흥냉면","회냉면"] },
  { id: "nm4", name: "평양면옥", category: "냉면", address: "춘천시 공지로 230", phone: "033-255-1122", rating: 4.0, reviewCount: 3200, lat: 37.8758, lng: 127.7232, priceRange: "₩10,000~₩14,000", tags: ["평양냉면","만두국"] },

  // ===== 족발/보쌈 (4) =====
  { id: "jb1", name: "춘천족발명가", category: "족발보쌈", address: "춘천시 명동길 30", phone: "033-254-0099", rating: 4.1, reviewCount: 3800, lat: 37.8790, lng: 127.7280, priceRange: "₩25,000~₩35,000", tags: ["족발","불족발","보쌈"] },
  { id: "jb2", name: "대박족발보쌈", category: "족발보쌈", address: "춘천시 퇴계로 130", phone: "033-252-7700", rating: 3.9, reviewCount: 2400, lat: 37.8696, lng: 127.7263, priceRange: "₩22,000~₩32,000", tags: ["족발","보쌈","막국수"] },
  { id: "jb3", name: "왕족발", category: "족발보쌈", address: "춘천시 후석로 320", phone: "033-257-3344", rating: 3.7, reviewCount: 1600, lat: 37.8728, lng: 127.7368, priceRange: "₩23,000~₩33,000", tags: ["족발","매운족발"] },
  { id: "jb4", name: "원조보쌈집", category: "족발보쌈", address: "춘천시 중앙로 78", phone: "033-253-6677", rating: 3.8, reviewCount: 2100, lat: 37.8800, lng: 127.7303, priceRange: "₩20,000~₩30,000", tags: ["보쌈","묵은지보쌈","족발"] },

  // ===== 일식 (5) =====
  { id: "jp1", name: "칠전일식", category: "일식", address: "춘천시 칠전동 230", phone: "033-261-7200", rating: 4.3, reviewCount: 4500, lat: 37.8600, lng: 127.7200, priceRange: "₩15,000~₩30,000", tags: ["초밥","사시미","돈카츠"], description: "예약 필수 가성비 일식" },
  { id: "jp2", name: "스시마루", category: "일식", address: "춘천시 금강로 70", phone: "033-254-5678", rating: 4.0, reviewCount: 2800, lat: 37.8795, lng: 127.7290, priceRange: "₩12,000~₩25,000", tags: ["초밥","회","우동"] },
  { id: "jp3", name: "이자카야하루", category: "일식", address: "춘천시 명동길 18", phone: "033-253-1100", rating: 3.9, reviewCount: 2100, lat: 37.8788, lng: 127.7278, priceRange: "₩10,000~₩20,000", tags: ["이자카야","야끼토리","사케"] },
  { id: "jp4", name: "미소라멘", category: "일식", address: "춘천시 퇴계로 185", phone: "033-251-3344", rating: 4.1, reviewCount: 3200, lat: 37.8688, lng: 127.7265, priceRange: "₩9,000~₩14,000", tags: ["라멘","돈코츠라멘","교자"] },
  { id: "jp5", name: "사쿠라돈카츠", category: "일식", address: "춘천시 공지로 245", phone: "033-252-8899", rating: 3.8, reviewCount: 1800, lat: 37.8755, lng: 127.7228, priceRange: "₩10,000~₩16,000", tags: ["돈카츠","카레","우동"] },

  // ===== 양식/파스타 (5) =====
  { id: "ws1", name: "탑플레이스", category: "양식", address: "춘천시 동면 순환대로 1154-115 2층", phone: "033-244-5500", rating: 4.3, reviewCount: 4200, lat: 37.8945, lng: 127.7570, priceRange: "₩15,000~₩28,000", tags: ["파스타","피자","뷰맛집"], description: "동면 뷰 좋은 양식 맛집" },
  { id: "ws2", name: "어반스트릿", category: "양식", address: "춘천시 동면 춘천로449번길 15", phone: "0507-1431-3555", rating: 4.1, reviewCount: 3100, lat: 37.8955, lng: 127.7575, priceRange: "₩13,000~₩22,000", tags: ["크림파스타","규카츠","피자"] },
  { id: "ws3", name: "블랙스테이크 춘천점", category: "양식", address: "춘천시 퇴계로 200", phone: "033-256-1234", rating: 4.0, reviewCount: 2600, lat: 37.8687, lng: 127.7265, priceRange: "₩18,000~₩35,000", tags: ["스테이크","파스타"] },
  { id: "ws4", name: "올리브가든", category: "양식", address: "춘천시 금강로 55", phone: "033-254-2200", rating: 3.8, reviewCount: 1500, lat: 37.8791, lng: 127.7287, priceRange: "₩12,000~₩20,000", tags: ["파스타","리조또","샐러드"] },
  { id: "ws5", name: "비스트로봉", category: "양식", address: "춘천시 소양로 55", phone: "033-253-7700", rating: 4.2, reviewCount: 2200, lat: 37.8822, lng: 127.7242, priceRange: "₩15,000~₩30,000", tags: ["스테이크","와인","코스요리"] },

  // ===== 피자 (4) =====
  { id: "pz1", name: "딴지펍", category: "피자", address: "춘천시 명동길 22", phone: "033-255-9911", rating: 4.0, reviewCount: 2100, lat: 37.8792, lng: 127.7278, priceRange: "₩15,000~₩25,000", tags: ["수제피자","맥주","펍"] },
  { id: "pz2", name: "반올림피자", category: "피자", address: "춘천시 후석로 312", phone: "033-263-2288", rating: 4.2, reviewCount: 3400, lat: 37.8730, lng: 127.7360, priceRange: "₩12,000~₩22,000", tags: ["화덕피자","파스타"] },
  { id: "pz3", name: "피자스쿨 춘천점", category: "피자", address: "춘천시 중앙로 112", phone: "033-253-5050", rating: 3.5, reviewCount: 1200, lat: 37.8803, lng: 127.7302, priceRange: "₩8,000~₩15,000", tags: ["피자","사이드"] },
  { id: "pz4", name: "고피자 춘천점", category: "피자", address: "춘천시 공지로 200", phone: "033-252-3939", rating: 3.7, reviewCount: 980, lat: 37.8760, lng: 127.7235, priceRange: "₩10,000~₩18,000", tags: ["화덕피자","고르곤졸라"] },

  // ===== 치킨 (5) =====
  { id: "ck1", name: "교동통닭", category: "치킨", address: "춘천시 육림고개길 23", phone: "033-254-3392", rating: 4.3, reviewCount: 11200, lat: 37.8780, lng: 127.7310, priceRange: "₩16,000~₩22,000", tags: ["통닭","양념치킨","파닭"], description: "춘천 교동 명물 통닭" },
  { id: "ck2", name: "온의동통닭", category: "치킨", address: "춘천시 중앙로 56", phone: "033-253-4411", rating: 4.1, reviewCount: 7850, lat: 37.8795, lng: 127.7295, priceRange: "₩16,000~₩20,000", tags: ["통닭","닭똥집"] },
  { id: "ck3", name: "한강통닭", category: "치킨", address: "춘천시 공지로 290", phone: "033-256-7890", rating: 3.9, reviewCount: 4560, lat: 37.8750, lng: 127.7220, priceRange: "₩15,000~₩19,000", tags: ["후라이드","양념치킨"] },
  { id: "ck4", name: "중앙시장통닭", category: "치킨", address: "춘천시 중앙로 130", phone: "033-254-7766", rating: 3.8, reviewCount: 3200, lat: 37.8806, lng: 127.7308, priceRange: "₩14,000~₩18,000", tags: ["통닭","야시장"] },
  { id: "ck5", name: "봉추찜닭 춘천점", category: "치킨", address: "춘천시 퇴계로 112", phone: "033-255-2233", rating: 4.0, reviewCount: 2500, lat: 37.8691, lng: 127.7256, priceRange: "₩22,000~₩30,000", tags: ["찜닭","안동찜닭"] },

  // ===== 해물/횟집 (4) =====
  { id: "hm1", name: "강바람식당", category: "해물횟집", address: "춘천시 남산면 서면춘천로 123", phone: "033-263-4455", rating: 3.8, reviewCount: 4520, lat: 37.8450, lng: 127.7150, priceRange: "₩10,000~₩25,000", tags: ["민물고기매운탕","도리뱅뱅이"], description: "강변 민물고기 전문" },
  { id: "hm2", name: "의암호횟집", category: "해물횟집", address: "춘천시 스포츠타운길 350", phone: "033-263-8800", rating: 4.0, reviewCount: 3200, lat: 37.8615, lng: 127.7185, priceRange: "₩15,000~₩30,000", tags: ["민물회","매운탕","쏘가리"] },
  { id: "hm3", name: "소양강해물탕", category: "해물횟집", address: "춘천시 소양로 150", phone: "033-254-6789", rating: 3.9, reviewCount: 2400, lat: 37.8832, lng: 127.7255, priceRange: "₩20,000~₩35,000", tags: ["해물탕","조개구이"] },
  { id: "hm4", name: "참조은횟집", category: "해물횟집", address: "춘천시 중앙로 170", phone: "033-253-0011", rating: 3.7, reviewCount: 1800, lat: 37.8810, lng: 127.7315, priceRange: "₩15,000~₩40,000", tags: ["민물회","송어회","매운탕"] },

  // ===== 분식 (5) =====
  { id: "bs1", name: "교동떡볶이", category: "분식", address: "춘천시 육림고개길 15", phone: "033-254-8822", rating: 3.8, reviewCount: 3200, lat: 37.8782, lng: 127.7305, priceRange: "₩3,000~₩7,000", tags: ["떡볶이","순대","튀김"] },
  { id: "bs2", name: "신선분식", category: "분식", address: "춘천시 중앙로 120", phone: "033-252-6644", rating: 3.7, reviewCount: 2100, lat: 37.8802, lng: 127.7298, priceRange: "₩3,500~₩8,000", tags: ["라면","김밥","떡볶이"] },
  { id: "bs3", name: "아리랑떡볶이", category: "분식", address: "춘천시 퇴계로 88", phone: "033-255-4400", rating: 4.0, reviewCount: 2900, lat: 37.8690, lng: 127.7250, priceRange: "₩3,000~₩6,000", tags: ["즉석떡볶이","순대","오뎅"] },
  { id: "bs4", name: "명동김밥", category: "분식", address: "춘천시 명동길 10", phone: "033-254-1122", rating: 3.6, reviewCount: 1500, lat: 37.8786, lng: 127.7276, priceRange: "₩3,000~₩6,000", tags: ["김밥","라면","우동"] },
  { id: "bs5", name: "고래분식", category: "분식", address: "춘천시 공지로 210", phone: "033-252-9988", rating: 3.9, reviewCount: 1800, lat: 37.8762, lng: 127.7238, priceRange: "₩3,500~₩7,000", tags: ["떡볶이","라볶이","순대"] },

  // ===== 카페/베이커리 (5) =====
  { id: "cf1", name: "대원당", category: "카페베이커리", address: "춘천시 퇴계로 191", phone: "033-254-3344", rating: 3.7, reviewCount: 21116, lat: 37.8693, lng: 127.7268, priceRange: "₩2,000~₩6,000", tags: ["빵","케이크","전통베이커리"], description: "춘천 대표 노포 빵집" },
  { id: "cf2", name: "카페인시애틀", category: "카페베이커리", address: "춘천시 스포츠타운길 399", phone: "033-263-5500", rating: 4.1, reviewCount: 5600, lat: 37.8610, lng: 127.7180, priceRange: "₩5,000~₩8,000", tags: ["커피","디저트","뷰맛집"] },
  { id: "cf3", name: "산토리니", category: "카페베이커리", address: "춘천시 동면 순환대로 1154-97", phone: "033-244-7788", rating: 3.7, reviewCount: 8400, lat: 37.8948, lng: 127.7565, priceRange: "₩5,000~₩9,000", tags: ["카페","베이커리","뷰카페"] },
  { id: "cf4", name: "테라로사 춘천점", category: "카페베이커리", address: "춘천시 소양로 65", phone: "033-253-8899", rating: 4.2, reviewCount: 6800, lat: 37.8823, lng: 127.7243, priceRange: "₩5,000~₩8,000", tags: ["스페셜티커피","브런치"] },
  { id: "cf5", name: "비엔나커피하우스", category: "카페베이커리", address: "춘천시 금강로 30", phone: "033-254-1500", rating: 3.9, reviewCount: 2200, lat: 37.8787, lng: 127.7282, priceRange: "₩4,500~₩7,000", tags: ["커피","비엔나커피","디저트"] },

  // ===== 한식(기타) (5) =====
  { id: "hs1", name: "산토리순두부", category: "한식기타", address: "춘천시 퇴계로 89", phone: "033-255-3030", rating: 4.0, reviewCount: 5100, lat: 37.8690, lng: 127.7250, priceRange: "₩8,000~₩12,000", tags: ["순두부찌개","된장찌개","김치찌개"] },
  { id: "hs2", name: "춘천두부마을", category: "한식기타", address: "춘천시 남산면 서면춘천로 155", phone: "033-263-2200", rating: 4.1, reviewCount: 3800, lat: 37.8455, lng: 127.7155, priceRange: "₩9,000~₩14,000", tags: ["두부전골","순두부","청국장"] },
  { id: "hs3", name: "시골밥상", category: "한식기타", address: "춘천시 신북읍 유포리길 30", phone: "033-242-6600", rating: 3.8, reviewCount: 2200, lat: 37.9295, lng: 127.7215, priceRange: "₩9,000~₩13,000", tags: ["한정식","제육볶음","된장찌개"] },
  { id: "hs4", name: "춘천밥집", category: "한식기타", address: "춘천시 춘천로 200", phone: "033-254-9900", rating: 3.7, reviewCount: 1800, lat: 37.8742, lng: 127.7268, priceRange: "₩8,000~₩12,000", tags: ["백반","제육볶음","생선구이"] },
  { id: "hs5", name: "경춘포차", category: "한식기타", address: "춘천시 퇴계로 24", phone: "0507-1429-6678", rating: 3.9, reviewCount: 2600, lat: 37.8700, lng: 127.7258, priceRange: "₩10,000~₩18,000", tags: ["포차","안주","제육볶음"] },
];
