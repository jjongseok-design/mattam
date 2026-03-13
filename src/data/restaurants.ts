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

export const restaurants: Restaurant[] = [

  // === 닭갈비 ===
  { id: "dk01", name: "통나무집닭갈비 본점", category: "닭갈비", address: "춘천시 신북읍 신샘밭로 763", phone: "033-241-5999", rating: 4.5, reviewCount: 28400, lat: 37.9285, lng: 127.7198, priceRange: "₩12,000~₩15,000", tags: ["철판닭갈비","막국수","감자부침"], description: "3대째 이어온 춘천 닭갈비의 자존심, 소양강댐 입구 위치" },
  { id: "dk02", name: "원조숯불닭불고기집", category: "닭갈비", address: "춘천시 낙원길 28-4", phone: "033-257-5326", rating: 4.4, reviewCount: 18700, lat: 37.8795, lng: 127.7272, priceRange: "₩13,000~₩16,000", tags: ["숯불닭갈비","뼈없는닭갈비","막국수"], description: "1961년 창업, 춘천 닭갈비 원조의 맛" },
  { id: "dk03", name: "1.5닭갈비", category: "닭갈비", address: "춘천시 후만로 77", phone: "033-254-8855", rating: 4.3, reviewCount: 15200, lat: 37.8720, lng: 127.7385, priceRange: "₩14,000~₩16,000", tags: ["닭갈비","닭내장","철판볶음밥"], description: "1989년 오픈, 2대째 운영, 현지인 추천 1순위" },
  { id: "dk04", name: "명동골목닭갈비", category: "닭갈비", address: "춘천시 금강로62번길 5", phone: "033-255-3636", rating: 4.1, reviewCount: 12800, lat: 37.8797, lng: 127.7291, priceRange: "₩13,000~₩16,000", tags: ["철판닭갈비","닭내장볶음","막국수"], description: "명동 닭갈비 골목 내 대표 인기 식당" },
  { id: "dk05", name: "항아리닭갈비막국수", category: "닭갈비", address: "춘천시 신북읍 율문리 32-4", phone: "033-242-1411", rating: 4.2, reviewCount: 9800, lat: 37.9270, lng: 127.7155, priceRange: "₩12,000~₩15,000", tags: ["철판닭갈비","막국수","닭내장"], description: "신북읍 소양강변, 항아리 담금 양념이 특징" },
  { id: "dk06", name: "춘천소양강닭갈비", category: "닭갈비", address: "춘천시 동면 순환대로 1045 1층", phone: "033-264-1102", rating: 4.0, reviewCount: 8200, lat: 37.8980, lng: 127.7640, priceRange: "₩12,000~₩15,000", tags: ["철판닭갈비","냉막국수","볶음밥"], description: "동면 소양강변, 온라인 주문 가능한 닭갈비 전문점" },
  { id: "dk07", name: "우성닭갈비 본점", category: "닭갈비", address: "춘천시 신북읍 신샘밭로 662", phone: "033-241-8892", rating: 4.1, reviewCount: 7600, lat: 37.9260, lng: 127.7180, priceRange: "₩12,000~₩15,000", tags: ["간장숯불닭갈비","소금구이","막국수"], description: "신북읍 간장양념 숯불닭갈비 전문, 현지인 단골 맛집" },
  { id: "dk08", name: "토담닭갈비", category: "닭갈비", address: "춘천시 신북읍 신샘밭로 662", phone: "033-241-7788", rating: 4.0, reviewCount: 6500, lat: 37.9255, lng: 127.7175, priceRange: "₩12,000~₩14,000", tags: ["닭갈비","막국수","철판볶음밥"], description: "신북읍 소박한 인테리어, 진한 양념 맛집" },
  { id: "dk09", name: "혜정닭갈비", category: "닭갈비", address: "춘천시 금강로 64", phone: "033-255-8282", rating: 4.0, reviewCount: 5900, lat: 37.8800, lng: 127.7295, priceRange: "₩13,000~₩16,000", tags: ["철판닭갈비","닭내장","막국수"], description: "명동 닭갈비 골목 노포, 진한 양념의 철판닭갈비" },
  { id: "dk10", name: "119닭갈비", category: "닭갈비", address: "춘천시 남춘로36번길 51", phone: "033-254-3119", rating: 3.9, reviewCount: 5200, lat: 37.8660, lng: 127.7358, priceRange: "₩13,000~₩15,000", tags: ["철판닭갈비","숯불닭갈비","막국수"], description: "넓은 홀, 단체 이용 가능한 닭갈비 전문점" },

  // === 막국수 ===
  { id: "mk01", name: "명가춘천막국수", category: "막국수", address: "춘천시 당간지주길 76 1층", phone: "0507-1433-2251", rating: 4.5, reviewCount: 21300, lat: 37.8805, lng: 127.7270, priceRange: "₩9,000~₩12,000", tags: ["막국수","비빔막국수","수육"], description: "70년 전통, 매실액 사용 건강한 막국수, 생방송오늘저녁 출연" },
  { id: "mk02", name: "부안막국수", category: "막국수", address: "춘천시 후석로344번길 8", phone: "033-253-1792", rating: 4.3, reviewCount: 16400, lat: 37.8715, lng: 127.7375, priceRange: "₩9,000~₩13,000", tags: ["막국수","총떡","비빔막국수"], description: "1983년 창업 40년 노포, 총떡이 유명한 막국수 맛집" },
  { id: "mk03", name: "유포리막국수", category: "막국수", address: "춘천시 신북읍 유포리 224", phone: "033-244-2008", rating: 4.4, reviewCount: 13800, lat: 37.9310, lng: 127.7070, priceRange: "₩9,000~₩13,000", tags: ["물막국수","비빔막국수","수육"], description: "50년 전통, 생활의 달인 출연, 달콤 시원한 막국수" },
  { id: "mk04", name: "남부막국수", category: "막국수", address: "춘천시 신북읍 맥국2길 123", phone: "033-242-5368", rating: 4.3, reviewCount: 11200, lat: 37.9240, lng: 127.7130, priceRange: "₩8,000~₩12,000", tags: ["막국수","닭갈비","비빔막국수"], description: "생활의 달인 3회 출연, 담백한 메밀 막국수" },
  { id: "mk05", name: "학곡리막국수닭갈비", category: "막국수", address: "춘천시 신북읍 학곡리 374", phone: "033-242-1994", rating: 4.2, reviewCount: 8700, lat: 37.9250, lng: 127.7160, priceRange: "₩9,000~₩13,000", tags: ["막국수","닭갈비","수육"], description: "1994년 창업, 신북읍 학곡리 소재 전통 막국수" },
  { id: "mk06", name: "샘밭막국수", category: "막국수", address: "춘천시 신북읍 천전리 118-23", phone: "033-242-1855", rating: 4.1, reviewCount: 7800, lat: 37.9290, lng: 127.7145, priceRange: "₩8,000~₩12,000", tags: ["물막국수","비빔막국수","닭갈비"], description: "소양강댐 인근 샘밭 마을 전통 막국수" },
  { id: "mk07", name: "실비막국수", category: "막국수", address: "춘천시 신북읍 신샘밭로 645", phone: "033-241-3644", rating: 4.0, reviewCount: 6500, lat: 37.9265, lng: 127.7185, priceRange: "₩8,000~₩11,000", tags: ["막국수","수육","총떡"], description: "신북읍 현지인 추천 담백한 순메밀 막국수" },
  { id: "mk08", name: "춘천막국수체험박물관 식당", category: "막국수", address: "춘천시 신북읍 신북로 121", phone: "033-244-5400", rating: 3.9, reviewCount: 4200, lat: 37.9235, lng: 127.7120, priceRange: "₩8,000~₩12,000", tags: ["막국수","비빔막국수","닭갈비"], description: "막국수 체험 박물관 내 식당, 관광객에게 인기" },

  // === 중화요리 ===
  { id: "cn01", name: "회영루", category: "중화요리", address: "춘천시 금강로 38", phone: "033-254-2358", rating: 4.2, reviewCount: 13269, lat: 37.8789, lng: 127.7284, priceRange: "₩7,000~₩15,000", tags: ["짜장면","짬뽕","탕수육","해물간짜장"], description: "춘천 명동 대표 인기 중화요리" },
  { id: "cn02", name: "차이나게이트", category: "중화요리", address: "춘천시 애막골길7번길 31-1", phone: "033-252-5566", rating: 3.5, reviewCount: 11952, lat: 37.8770, lng: 127.7350, priceRange: "₩6,000~₩13,000", tags: ["짜장면","짬뽕","군만두"], description: "애막골 오래된 중화요리" },
  { id: "cn03", name: "중국성", category: "중화요리", address: "춘천시 영서로 2301", phone: "033-256-8777", rating: 4.0, reviewCount: 9800, lat: 37.8920, lng: 127.7580, priceRange: "₩8,000~₩18,000", tags: ["해물짬뽕","간짜장","탕수육"], description: "영서로 소재, 신선한 해물짬뽕으로 유명한 인기 맛집" },
  { id: "cn04", name: "신짱깨집", category: "중화요리", address: "춘천시 후평동 640-3", phone: "0507-1326-1693", rating: 3.9, reviewCount: 4200, lat: 37.8702, lng: 127.7395, priceRange: "₩6,000~₩13,000", tags: ["짜장면","짬뽕","쟁반짜장"], description: "로데오거리 인근, 쟁반짜장이 인기인 중화요리" },
  { id: "cn05", name: "천미향", category: "중화요리", address: "춘천시 우두로 62", phone: "033-244-7979", rating: 4.3, reviewCount: 6200, lat: 37.8960, lng: 127.7250, priceRange: "₩8,000~₩18,000", tags: ["탕수육","금전우육","짬뽕"], description: "우두동 블로그 추천 맛집" },
  { id: "cn06", name: "란중식", category: "중화요리", address: "춘천시 동면 춘천순환로 356", phone: "033-241-5588", rating: 4.0, reviewCount: 9618, lat: 37.8950, lng: 127.7620, priceRange: "₩8,000~₩18,000", tags: ["코스요리","짬뽕","탕수육"], description: "동면 코스요리 전문 중식당" },
  { id: "cn07", name: "대원장", category: "중화요리", address: "춘천시 효자동 512-1", phone: "033-262-3456", rating: 4.1, reviewCount: 3300, lat: 37.8660, lng: 127.7310, priceRange: "₩6,000~₩12,000", tags: ["짜장면","비빔국수","짬뽕"], description: "2대째 노포, 생활의 달인 출연" },
  { id: "cn08", name: "도원뚝배기짬뽕", category: "중화요리", address: "춘천시 동내면 거두택지길 65-9", phone: "033-244-5577", rating: 4.2, reviewCount: 5800, lat: 37.9050, lng: 127.7480, priceRange: "₩7,000~₩13,000", tags: ["뚝배기짬뽕","짜장면","볶음밥"], description: "동내면 뚝배기짬뽕 맛집, 칼칼한 국물이 일품" },
  { id: "cn09", name: "구가네찹쌀탕수육", category: "중화요리", address: "춘천시 퇴계로145번길 7-11", phone: "033-251-3344", rating: 3.6, reviewCount: 4885, lat: 37.8695, lng: 127.7275, priceRange: "₩8,000~₩16,000", tags: ["찹쌀탕수육","짜장면","짬뽕"], description: "찹쌀탕수육 전문, 바삭한 식감으로 유명" },

  // === 갈비탕 ===
  { id: "gt01", name: "곽만근갈비탕", category: "갈비탕", address: "춘천시 영서로 2858", phone: "033-244-5551", rating: 4.5, reviewCount: 9800, lat: 37.9080, lng: 127.7395, priceRange: "₩12,000~₩18,000", tags: ["갈비탕","갈비찜","수육"], description: "춘천 현지인 추천 갈비탕 맛집, 진한 국물이 일품" },
  { id: "gt02", name: "권할머니한우해장국", category: "갈비탕", address: "춘천시 동내면 영서로 1932", phone: "033-244-4422", rating: 4.5, reviewCount: 8600, lat: 37.9020, lng: 127.7460, priceRange: "₩10,000~₩15,000", tags: ["갈비탕","한우해장국","갈비찜"], description: "동내면 한우 갈비탕 전문, 40년 전통의 맛" },
  { id: "gt03", name: "옛날옛집", category: "갈비탕", address: "춘천시 북산면 추곡리 305", phone: "033-262-4800", rating: 4.3, reviewCount: 7200, lat: 37.9450, lng: 127.7820, priceRange: "₩12,000~₩20,000", tags: ["갈비탕","된장찌개","보쌈"], description: "북산면 한옥 정취 속에서 즐기는 전통 갈비탕" },
  { id: "gt04", name: "신북농협한우프라자", category: "갈비탕", address: "춘천시 신북읍 신샘밭로 455", phone: "033-241-6161", rating: 4.2, reviewCount: 6500, lat: 37.9245, lng: 127.7165, priceRange: "₩12,000~₩25,000", tags: ["갈비탕","한우구이","등심"], description: "신북농협 직영 한우 프라자, 신선한 한우 갈비탕" },
  { id: "gt05", name: "원조갈비탕", category: "갈비탕", address: "춘천시 춘천로 170", phone: "033-255-5282", rating: 4.0, reviewCount: 5100, lat: 37.8740, lng: 127.7300, priceRange: "₩11,000~₩16,000", tags: ["갈비탕","갈비찜","설렁탕"], description: "춘천시내 20년 전통의 진한 갈비탕 맛집" },
  { id: "gt06", name: "삼촌네갈비탕", category: "갈비탕", address: "춘천시 퇴계로 120", phone: "033-255-7722", rating: 3.9, reviewCount: 3800, lat: 37.8690, lng: 127.7265, priceRange: "₩11,000~₩16,000", tags: ["갈비탕","냉면","갈비찜"], description: "퇴계동 소재, 깔끔한 국물의 갈비탕 전문점" },

  // === 삼계탕 ===
  { id: "sc01", name: "할매삼계탕", category: "삼계탕", address: "춘천시 영서로 2658", phone: "033-244-7633", rating: 4.4, reviewCount: 8900, lat: 37.9060, lng: 127.7380, priceRange: "₩16,000~₩24,000", tags: ["삼계탕","한방옻삼계탕","오골계삼계탕"], description: "견과류 가득, 고소한 국물의 삼계탕 전문점" },
  { id: "sc02", name: "신남큰집", category: "삼계탕", address: "춘천시 남산면 강촌리 153", phone: "033-262-5550", rating: 4.3, reviewCount: 7200, lat: 37.8380, lng: 127.6980, priceRange: "₩15,000~₩20,000", tags: ["누룽지삼계탕","한방삼계탕","막국수"], description: "강촌 인근, 누룽지 삼계탕으로 유명한 현지 맛집" },
  { id: "sc03", name: "충남삼계탕", category: "삼계탕", address: "춘천시 중앙로 65", phone: "033-253-8855", rating: 4.5, reviewCount: 6800, lat: 37.8798, lng: 127.7293, priceRange: "₩14,000~₩18,000", tags: ["삼계탕","한방삼계탕","백숙"], description: "춘천 명동 인근, 진한 국물의 삼계탕 맛집" },
  { id: "sc04", name: "산골삼계탕", category: "삼계탕", address: "춘천시 북산면 청평리 45", phone: "033-261-4488", rating: 4.1, reviewCount: 4500, lat: 37.9550, lng: 127.7900, priceRange: "₩15,000~₩22,000", tags: ["토종닭백숙","삼계탕","능이버섯닭백숙"], description: "북산면 청정 환경에서 자란 토종닭 삼계탕" },
  { id: "sc05", name: "농가맛집 산들", category: "삼계탕", address: "춘천시 동면 순환대로 970", phone: "033-263-5500", rating: 4.0, reviewCount: 3200, lat: 37.8960, lng: 127.7600, priceRange: "₩15,000~₩20,000", tags: ["삼계탕","토종닭볶음탕","백숙"], description: "동면 소재 농가형 삼계탕, 직접 키운 닭 사용" },

  // === 칼국수 ===
  { id: "kk01", name: "춘천백일칼국수", category: "칼국수", address: "춘천시 남춘로5번길 17 1층", phone: "033-253-5100", rating: 4.4, reviewCount: 11200, lat: 37.8668, lng: 127.7350, priceRange: "₩8,000~₩12,000", tags: ["들깨칼국수","바지락칼국수","수제비"], description: "남춘천역 인근, 구수한 들깨 칼국수로 유명한 맛집" },
  { id: "kk02", name: "낭만국시", category: "칼국수", address: "춘천시 춘천로 163", phone: "033-255-7890", rating: 4.7, reviewCount: 9800, lat: 37.8745, lng: 127.7285, priceRange: "₩8,000~₩13,000", tags: ["손칼국수","비빔국수","왕만두"], description: "춘천 현지인 추천 1위 칼국수, 손으로 뽑은 면발이 일품" },
  { id: "kk03", name: "천호칼국수", category: "칼국수", address: "춘천시 공지로 260", phone: "033-252-5588", rating: 4.2, reviewCount: 8100, lat: 37.8760, lng: 127.7230, priceRange: "₩8,000~₩12,000", tags: ["바지락칼국수","해물칼국수","수제비"], description: "공지천 인근, 시원한 바지락 국물 칼국수" },
  { id: "kk04", name: "미가칼국수", category: "칼국수", address: "춘천시 동내면 영서로 2120", phone: "033-244-3388", rating: 4.1, reviewCount: 5900, lat: 37.9030, lng: 127.7468, priceRange: "₩8,000~₩12,000", tags: ["들깨칼국수","칼국수","수제비"], description: "동내면 현지인 단골집, 진한 들깨 육수 칼국수" },
  { id: "kk05", name: "소양강칼국수", category: "칼국수", address: "춘천시 신북읍 소양강로 203", phone: "033-241-9911", rating: 4.0, reviewCount: 4200, lat: 37.9220, lng: 127.7140, priceRange: "₩8,000~₩11,000", tags: ["칼국수","바지락칼국수","만두"], description: "소양강 인근 소박하고 맛있는 칼국수 전문점" },
  { id: "kk06", name: "의암손칼국수", category: "칼국수", address: "춘천시 서면 박사로 1130", phone: "033-244-1177", rating: 3.9, reviewCount: 3500, lat: 37.8780, lng: 127.6920, priceRange: "₩7,000~₩11,000", tags: ["손칼국수","수제비","만두국"], description: "의암호 인근 소박한 손칼국수 맛집" },

  // === 수제버거 ===
  { id: "br01", name: "라모스버거", category: "수제버거", address: "춘천시 옛경춘로 835", phone: "033-261-4400", rating: 4.5, reviewCount: 14200, lat: 37.8410, lng: 127.7050, priceRange: "₩10,000~₩18,000", tags: ["수제버거","감자튀김","밀크쉐이크"], description: "강촌 인근 드라이브 명소, 국내 최초 수제버거집 명성" },
  { id: "br02", name: "스모키버거", category: "수제버거", address: "춘천시 낙원길 25 1층", phone: "033-254-8877", rating: 4.3, reviewCount: 6800, lat: 37.8793, lng: 127.7268, priceRange: "₩10,000~₩16,000", tags: ["수제버거","스모키버거","감자튀김"], description: "명동 인근, 훈제 패티의 스모키한 수제버거" },
  { id: "br03", name: "버거헛춘천점", category: "수제버거", address: "춘천시 중앙로 35", phone: "033-254-2200", rating: 4.1, reviewCount: 5200, lat: 37.8800, lng: 127.7285, priceRange: "₩9,000~₩15,000", tags: ["수제버거","치즈버거","어니언링"], description: "춘천 시내 수제버거 맛집, 두툼한 패티가 특징" },
  { id: "br04", name: "로컬버거", category: "수제버거", address: "춘천시 후평동 645-5", phone: "033-251-5544", rating: 4.0, reviewCount: 3900, lat: 37.8705, lng: 127.7398, priceRange: "₩9,000~₩16,000", tags: ["수제버거","치킨버거","감자튀김"], description: "후평동 로컬 수제버거, 신선한 재료를 사용한 햄버거" },
  { id: "br05", name: "더버거클럽", category: "수제버거", address: "춘천시 퇴계로 155", phone: "033-256-4411", rating: 3.9, reviewCount: 2800, lat: 37.8692, lng: 127.7258, priceRange: "₩10,000~₩17,000", tags: ["수제버거","치즈버거","클럽버거"], description: "퇴계동 프리미엄 수제버거 전문점" },

  // === 삼겹살 ===
  { id: "sg01", name: "풍미닭갈비돼지갈비", category: "삼겹살", address: "춘천시 신북읍 신샘밭로 670", phone: "033-242-7733", rating: 4.3, reviewCount: 9200, lat: 37.9262, lng: 127.7183, priceRange: "₩13,000~₩18,000", tags: ["삼겹살","돼지갈비","닭갈비"], description: "신북읍 숯불 삼겹살과 돼지갈비를 함께 즐길 수 있는 맛집" },
  { id: "sg02", name: "황금돼지저금통", category: "삼겹살", address: "춘천시 춘천로 258", phone: "033-255-9988", rating: 4.2, reviewCount: 8100, lat: 37.8750, lng: 127.7265, priceRange: "₩15,000~₩20,000", tags: ["두꺼운삼겹살","항정살","목살"], description: "두툼한 두께의 삼겹살 전문, 현지인에게 인기" },
  { id: "sg03", name: "일흥불고기", category: "삼겹살", address: "춘천시 영서로 2450", phone: "033-244-8812", rating: 4.4, reviewCount: 7600, lat: 37.9040, lng: 127.7370, priceRange: "₩13,000~₩18,000", tags: ["삼겹살","불고기","갈비살"], description: "40년 전통, 숯불 불고기와 삼겹살 맛집" },
  { id: "sg04", name: "돼지야가자", category: "삼겹살", address: "춘천시 동내면 춘천순환로 112", phone: "033-257-7774", rating: 4.1, reviewCount: 6400, lat: 37.9005, lng: 127.7470, priceRange: "₩13,000~₩17,000", tags: ["삼겹살","항정살","갈비살"], description: "동내면 삼겹살 전문점, 바삭한 불판 구이" },
  { id: "sg05", name: "웰컴투삼겹살", category: "삼겹살", address: "춘천시 중앙로 85", phone: "033-254-6633", rating: 4.0, reviewCount: 4800, lat: 37.8802, lng: 127.7298, priceRange: "₩13,000~₩18,000", tags: ["삼겹살","목살","제육볶음"], description: "춘천 시내 중심가, 신선한 국내산 삼겹살" },
  { id: "sg06", name: "참숯불삼겹살", category: "삼겹살", address: "춘천시 석사동 305-1", phone: "033-242-8833", rating: 3.9, reviewCount: 3600, lat: 37.8872, lng: 127.7455, priceRange: "₩12,000~₩16,000", tags: ["참숯삼겹살","목살","막국수"], description: "석사동 참숯불 삼겹살 전문점" },

  // === 초밥 ===
  { id: "sb01", name: "스시요", category: "초밥", address: "춘천시 중앙로67번길 5", phone: "033-253-0088", rating: 4.4, reviewCount: 11800, lat: 37.8800, lng: 127.7297, priceRange: "₩15,000~₩35,000", tags: ["회전초밥","스시","사시미"], description: "춘천 명동 회전초밥 맛집, 신선한 재료의 다양한 초밥" },
  { id: "sb02", name: "춘천초밥", category: "초밥", address: "춘천시 김유정로 1852-23", phone: "033-262-7776", rating: 4.3, reviewCount: 9400, lat: 37.8440, lng: 127.7120, priceRange: "₩20,000~₩50,000", tags: ["스시","모둠초밥","오마카세"], description: "김유정역 인근, 신선한 해산물 스시 전문점" },
  { id: "sb03", name: "스시장", category: "초밥", address: "춘천시 효자동 340-6", phone: "033-263-8855", rating: 4.6, reviewCount: 7200, lat: 37.8658, lng: 127.7318, priceRange: "₩30,000~₩80,000", tags: ["오마카세","스시","모둠초밥"], description: "효자동 오마카세 스시 맛집, 최상급 재료 사용" },
  { id: "sb04", name: "마코토프리미엄", category: "초밥", address: "춘천시 우두동 755-3", phone: "033-244-1155", rating: 4.8, reviewCount: 5800, lat: 37.8968, lng: 127.7238, priceRange: "₩50,000~₩120,000", tags: ["프리미엄오마카세","스시","코스"], description: "우두동 프리미엄 일식 오마카세 스시 레스토랑" },
  { id: "sb05", name: "연이네초밥", category: "초밥", address: "춘천시 후평동 750-2", phone: "033-252-7700", rating: 5.0, reviewCount: 4200, lat: 37.8710, lng: 127.7405, priceRange: "₩15,000~₩40,000", tags: ["모둠초밥","스시","롤"], description: "후평동 소박한 동네 초밥집, 신선도로 단골 고객 많음" },
  { id: "sb06", name: "스시오마카세춘천", category: "초밥", address: "춘천시 금강로 78", phone: "033-255-5577", rating: 4.5, reviewCount: 3100, lat: 37.8802, lng: 127.7295, priceRange: "₩40,000~₩100,000", tags: ["오마카세","스시","코스요리"], description: "명동 인근 프리미엄 오마카세 스시 전문점" },

  // === 일식/횟집 ===
  { id: "hw01", name: "어방어점", category: "일식/횟집", address: "춘천시 우두동 750-1", phone: "033-244-3388", rating: 4.7, reviewCount: 12300, lat: 37.8965, lng: 127.7235, priceRange: "₩20,000~₩60,000", tags: ["방어회","모둠회","초밥"], description: "우두동 방어회 전문, 신선한 방어 한 마리 통째로 즐기기" },
  { id: "hw02", name: "사거리횟집", category: "일식/횟집", address: "춘천시 공지로 280", phone: "033-254-7777", rating: 5.0, reviewCount: 9800, lat: 37.8762, lng: 127.7225, priceRange: "₩30,000~₩80,000", tags: ["광어회","우럭회","모둠회"], description: "공지천 인근 신선한 활어 전문 횟집" },
  { id: "hw03", name: "미다미", category: "일식/횟집", address: "춘천시 석사동 400-5", phone: "033-242-5566", rating: 3.9, reviewCount: 7200, lat: 37.8875, lng: 127.7460, priceRange: "₩25,000~₩60,000", tags: ["일식","회","연어"], description: "석사동 일식 레스토랑, 회와 일식 요리 전문" },
  { id: "hw04", name: "동해활어횟집", category: "일식/횟집", address: "춘천시 영서로 2960", phone: "033-244-9977", rating: 4.2, reviewCount: 6100, lat: 37.9090, lng: 127.7410, priceRange: "₩25,000~₩70,000", tags: ["모둠회","광어","도다리"], description: "영서로 소재, 동해산 신선 활어 전문 횟집" },
  { id: "hw05", name: "황종안스시", category: "일식/횟집", address: "춘천시 중앙로 120", phone: "033-253-9922", rating: 3.7, reviewCount: 4800, lat: 37.8795, lng: 127.7290, priceRange: "₩20,000~₩50,000", tags: ["스시","사시미","롤"], description: "춘천 시내 일식 스시 전문점" },
  { id: "hw06", name: "소양강횟집", category: "일식/횟집", address: "춘천시 신북읍 소양강로 188", phone: "033-241-4433", rating: 4.1, reviewCount: 3900, lat: 37.9215, lng: 127.7135, priceRange: "₩25,000~₩60,000", tags: ["모둠회","매운탕","튀김"], description: "소양강변 뷰 맛집, 신선한 민물·바다 회 전문" },

  // === 감자탕 ===
  { id: "gj01", name: "해장감자탕", category: "감자탕", address: "춘천시 춘천로 240", phone: "033-255-2288", rating: 4.3, reviewCount: 8900, lat: 37.8748, lng: 127.7262, priceRange: "₩8,000~₩25,000", tags: ["감자탕","뼈해장국","순대"], description: "춘천 현지인 해장 맛집, 진한 뼈 국물 감자탕" },
  { id: "gj02", name: "진주감자탕", category: "감자탕", address: "춘천시 후평동 730-3", phone: "033-251-8833", rating: 4.1, reviewCount: 7200, lat: 37.8708, lng: 127.7400, priceRange: "₩8,000~₩30,000", tags: ["감자탕","뼈해장국","수육"], description: "후평동 30년 전통 감자탕, 뼈 국물이 깊은 맛" },
  { id: "gj03", name: "원조감자탕", category: "감자탕", address: "춘천시 영서로 2205", phone: "033-244-3322", rating: 4.0, reviewCount: 5800, lat: 37.9010, lng: 127.7455, priceRange: "₩9,000~₩28,000", tags: ["감자탕","뼈국물","순대국"], description: "영서로 소재, 시원하고 진한 국물의 감자탕 원조 맛집" },
  { id: "gj04", name: "24시감자탕", category: "감자탕", address: "춘천시 퇴계로 140", phone: "033-256-5533", rating: 3.9, reviewCount: 4500, lat: 37.8690, lng: 127.7260, priceRange: "₩8,000~₩25,000", tags: ["감자탕","해장국","24시운영"], description: "24시간 운영, 언제든 뜨끈한 감자탕을 즐길 수 있는 곳" },
  { id: "gj05", name: "강원감자탕", category: "감자탕", address: "춘천시 석사동 306-2", phone: "033-242-7744", rating: 3.8, reviewCount: 3200, lat: 37.8868, lng: 127.7450, priceRange: "₩8,000~₩25,000", tags: ["감자탕","뼈해장국","볶음밥"], description: "석사동 현지인 자주 찾는 감자탕 전문점" },

  // === 한우 ===
  { id: "hw_k01", name: "큰집한우", category: "한우", address: "춘천시 서부대성로 135", phone: "033-241-3944", rating: 4.6, reviewCount: 16800, lat: 37.8830, lng: 127.7190, priceRange: "₩30,000~₩80,000", tags: ["한우등심","한우갈비","한우특수부위"], description: "춘천 최고 한우 맛집, 1++ 신선 한우 전문" },
  { id: "hw_k02", name: "화람한우", category: "한우", address: "춘천시 수변공원길 11 대호빌딩 4층", phone: "033-254-3300", rating: 4.5, reviewCount: 12400, lat: 37.8790, lng: 127.7260, priceRange: "₩35,000~₩90,000", tags: ["한우숙성","갈비살","등심"], description: "의암호 수변 공원 인근, 숙성 한우 전문 고급 식당" },
  { id: "hw_k03", name: "미가한우", category: "한우", address: "춘천시 춘천로170번길 10 2층", phone: "033-255-0716", rating: 4.4, reviewCount: 9200, lat: 37.8740, lng: 127.7295, priceRange: "₩30,000~₩70,000", tags: ["한우갈비살","양념갈비","한우특수부위"], description: "춘천 시내 한우 특수부위 전문점" },
  { id: "hw_k04", name: "한우참맛갈비", category: "한우", address: "춘천시 동면 순환대로 1080", phone: "0507-1408-2888", rating: 4.3, reviewCount: 7800, lat: 37.8985, lng: 127.7650, priceRange: "₩30,000~₩70,000", tags: ["한우암소갈비","양념갈비","갈비탕"], description: "동면 소재, 한우 암소 갈비 전문점" },
  { id: "hw_k05", name: "멍텅구리한우", category: "한우", address: "춘천시 석사동 310-4", phone: "033-241-9988", rating: 4.2, reviewCount: 6400, lat: 37.8870, lng: 127.7455, priceRange: "₩28,000~₩65,000", tags: ["제비추리","안창살","한우특수부위"], description: "석사동 한우 제비추리 전문, 희귀 특수부위 구이" },
  { id: "hw_k06", name: "춘천육가공한우", category: "한우", address: "춘천시 신북읍 신샘밭로 488", phone: "033-242-5599", rating: 4.1, reviewCount: 5100, lat: 37.9250, lng: 127.7170, priceRange: "₩25,000~₩60,000", tags: ["한우등심","갈비","정육"], description: "신북읍 정육점 겸 식당, 합리적 가격의 한우 구이" },

  // === 돼지갈비 ===
  { id: "pg01", name: "일흥불고기&돼지갈비", category: "돼지갈비", address: "춘천시 영서로 2450", phone: "033-244-8812", rating: 4.4, reviewCount: 9600, lat: 37.9040, lng: 127.7370, priceRange: "₩14,000~₩20,000", tags: ["돼지갈비","불고기","삼겹살"], description: "40년 전통 숯불 돼지갈비 & 불고기 명가" },
  { id: "pg02", name: "강원돼지갈비", category: "돼지갈비", address: "춘천시 신북읍 신샘밭로 690", phone: "033-241-7766", rating: 4.2, reviewCount: 7800, lat: 37.9265, lng: 127.7188, priceRange: "₩13,000~₩18,000", tags: ["돼지갈비","삼겹살","막국수"], description: "신북읍 소양강변, 두툼한 양념 돼지갈비 전문점" },
  { id: "pg03", name: "풍미닭갈비&돼지갈비", category: "돼지갈비", address: "춘천시 신북읍 신샘밭로 670", phone: "033-242-7733", rating: 4.3, reviewCount: 6900, lat: 37.9262, lng: 127.7183, priceRange: "₩13,000~₩18,000", tags: ["돼지갈비","닭갈비","삼겹살"], description: "신북읍 닭갈비와 돼지갈비를 함께 즐길 수 있는 맛집" },
  { id: "pg04", name: "황제돼지갈비", category: "돼지갈비", address: "춘천시 중앙로 95", phone: "033-253-8866", rating: 4.0, reviewCount: 5200, lat: 37.8798, lng: 127.7293, priceRange: "₩13,000~₩18,000", tags: ["돼지갈비","양념갈비","볶음밥"], description: "춘천 명동 인근, 진한 양념의 돼지갈비 맛집" },
  { id: "pg05", name: "참숯돼지갈비", category: "돼지갈비", address: "춘천시 퇴계로 168", phone: "033-256-9977", rating: 3.9, reviewCount: 4100, lat: 37.8693, lng: 127.7260, priceRange: "₩13,000~₩17,000", tags: ["돼지갈비","숯불갈비","삼겹살"], description: "퇴계동 참숯 불판 돼지갈비 전문점" },
  { id: "pg06", name: "춘천돼지갈비마당", category: "돼지갈비", address: "춘천시 동면 만천길 65", phone: "033-243-7755", rating: 4.1, reviewCount: 3800, lat: 37.8930, lng: 127.7610, priceRange: "₩14,000~₩20,000", tags: ["돼지갈비","생갈비","막국수"], description: "동면 너른 마당에서 즐기는 돼지갈비 전문점" },

  // === 이탈리안 ===
  { id: "it01", name: "델모니코스", category: "이탈리안", address: "춘천시 구봉산길 220", phone: "033-255-7788", rating: 4.5, reviewCount: 9800, lat: 37.8850, lng: 127.7230, priceRange: "₩15,000~₩35,000", tags: ["파스타","피자","리조또"], description: "구봉산 전망 이탈리안 레스토랑, 루꼴라 피자와 마레 파스타 유명" },
  { id: "it02", name: "올블루파스타", category: "이탈리안", address: "춘천시 백령로 130 2층", phone: "033-263-5577", rating: 4.3, reviewCount: 7200, lat: 37.8660, lng: 127.7340, priceRange: "₩13,000~₩28,000", tags: ["파스타","피자","샐러드"], description: "효자동 아담한 파스타 전문점, 직접 만드는 생면 파스타" },
  { id: "it03", name: "탑플레이스춘천", category: "이탈리안", address: "춘천시 후평동 752-8", phone: "033-252-6644", rating: 4.4, reviewCount: 6100, lat: 37.8712, lng: 127.7408, priceRange: "₩14,000~₩30,000", tags: ["파스타","피자","스테이크"], description: "후평동 이탈리안 레스토랑, 파스타 전문" },
  { id: "it04", name: "어라운드키친", category: "이탈리안", address: "춘천시 소양로 198", phone: "033-254-3300", rating: 4.3, reviewCount: 5400, lat: 37.8815, lng: 127.7255, priceRange: "₩14,000~₩32,000", tags: ["파스타","리조또","브런치"], description: "소양강 인근, 감성적인 인테리어의 이탈리안 레스토랑" },
  { id: "it05", name: "라벨이탈리아", category: "이탈리안", address: "춘천시 공지로 310", phone: "033-252-4422", rating: 4.1, reviewCount: 4200, lat: 37.8765, lng: 127.7220, priceRange: "₩14,000~₩30,000", tags: ["파스타","피자","티라미수"], description: "공지천 인근, 정통 이탈리안 요리 레스토랑" },
  { id: "it06", name: "피자프레스코", category: "이탈리안", address: "춘천시 석사동 315-2", phone: "033-242-5566", rating: 4.0, reviewCount: 3100, lat: 37.8868, lng: 127.7452, priceRange: "₩12,000~₩28,000", tags: ["화덕피자","파스타","샐러드"], description: "석사동 화덕피자 전문 이탈리안 레스토랑" },

  // === 베이커리 ===
  { id: "bk01", name: "감자밭", category: "베이커리", address: "춘천시 신북읍 신샘밭로 674", phone: "1566-3756", rating: 4.6, reviewCount: 32000, lat: 37.9258, lng: 127.7182, priceRange: "₩3,000~₩8,000", tags: ["감자빵","치즈감자빵","토마토바질감자빵"], description: "춘천 원조 감자빵 맛집, 전국 관광객이 줄 서는 명물 빵집" },
  { id: "bk02", name: "자유빵집", category: "베이커리", address: "춘천시 후평동 670-4", phone: "033-251-8866", rating: 4.7, reviewCount: 18400, lat: 37.8705, lng: 127.7400, priceRange: "₩3,500~₩12,000", tags: ["크루아상","앙버터","소금빵"], description: "프랑스 르꼬르동블루 출신 셰프의 빵집, 크루아상 맛집" },
  { id: "bk03", name: "대원당", category: "베이커리", address: "춘천시 퇴계로 183", phone: "033-255-8833", rating: 4.5, reviewCount: 14200, lat: 37.8690, lng: 127.7255, priceRange: "₩2,500~₩8,000", tags: ["크림빵","소보로","단팥빵"], description: "70년 전통 제과점, 춘천 토박이들의 추억의 빵집" },
  { id: "bk04", name: "빵굽는카페", category: "베이커리", address: "춘천시 동내면 영서로 2218", phone: "033-244-2244", rating: 4.4, reviewCount: 9800, lat: 37.9032, lng: 127.7470, priceRange: "₩3,000~₩10,000", tags: ["베이커리","케이크","커피"], description: "동내면 대형 베이커리 카페, 직접 굽는 다양한 빵" },
  { id: "bk05", name: "카페38마일", category: "베이커리", address: "춘천시 남산면 종자리로 42", phone: "033-262-8838", rating: 4.5, reviewCount: 8600, lat: 37.8220, lng: 127.7030, priceRange: "₩4,000~₩12,000", tags: ["베이커리","케이크","라테"], description: "대형 통유리 뷰 베이커리 카페, 강촌 드라이브 코스" },
  { id: "bk06", name: "레미니센스베이커리", category: "베이커리", address: "춘천시 신북읍 신샘밭로 702 2층", phone: "033-241-5533", rating: 4.4, reviewCount: 7200, lat: 37.9265, lng: 127.7192, priceRange: "₩3,500~₩9,000", tags: ["베이커리","소금빵","크루아상"], description: "신북읍 소양강 뷰 베이커리 카페, 루프탑 전망 명소" },
  { id: "bk07", name: "리얼베이크춘천", category: "베이커리", address: "춘천시 중앙로 45", phone: "033-254-5577", rating: 4.3, reviewCount: 5900, lat: 37.8798, lng: 127.7288, priceRange: "₩3,000~₩9,000", tags: ["바게트","크루아상","샌드위치"], description: "명동 인근 아르티장 베이커리, 매일 갓 구운 빵 판매" },

  // === 국밥/탕류 ===
  { id: "gb01", name: "사창리순대국", category: "국밥/탕류", address: "춘천시 우석로 15", phone: "033-252-7788", rating: 4.3, reviewCount: 11200, lat: 37.8798, lng: 127.7287, priceRange: "₩9,000~₩13,000", tags: ["순대국","얼큰순대국","해장국"], description: "춘천 시내 대표 순대국밥, 진한 국물과 넉넉한 순대" },
  { id: "gb02", name: "사남매순대국", category: "국밥/탕류", address: "춘천시 퇴계동 396-22", phone: "033-261-0311", rating: 4.2, reviewCount: 8700, lat: 37.8688, lng: 127.7268, priceRange: "₩9,000~₩12,000", tags: ["순대국","선지해장국","뼈해장국"], description: "퇴계동 가족이 운영하는 순대국 맛집, 아침 일찍부터 운영" },
  { id: "gb03", name: "권할머니흑염소국밥", category: "국밥/탕류", address: "춘천시 동내면 영서로 1932", phone: "033-244-4422", rating: 4.4, reviewCount: 7900, lat: 37.9020, lng: 127.7460, priceRange: "₩10,000~₩16,000", tags: ["흑염소국밥","해장국","보양탕"], description: "40년 전통 흑염소 국밥 전문, 든든한 보양식" },
  { id: "gb04", name: "남부순대국밥", category: "국밥/탕류", address: "춘천시 효자동 620-3", phone: "033-262-4411", rating: 4.1, reviewCount: 6200, lat: 37.8658, lng: 127.7325, priceRange: "₩8,000~₩12,000", tags: ["순대국","돼지국밥","수육"], description: "효자동 오래된 순대국밥 식당, 진한 국물이 자랑" },
  { id: "gb05", name: "소양강해장국", category: "국밥/탕류", address: "춘천시 신북읍 소양강로 215", phone: "033-241-8877", rating: 4.0, reviewCount: 4800, lat: 37.9218, lng: 127.7138, priceRange: "₩9,000~₩14,000", tags: ["선지해장국","순대국","우거지해장국"], description: "소양강 인근 아침 해장 맛집, 시원한 선지해장국" },
  { id: "gb06", name: "춘천설렁탕", category: "국밥/탕류", address: "춘천시 중앙로 75", phone: "033-253-9933", rating: 4.0, reviewCount: 4100, lat: 37.8800, lng: 127.7290, priceRange: "₩9,000~₩14,000", tags: ["설렁탕","곰탕","순대국"], description: "춘천 명동 인근, 진한 사골국물 설렁탕 전문점" },

  // === 보쌈/족발 ===
  { id: "bj01", name: "촌집족발", category: "보쌈/족발", address: "춘천시 후석로344번길 12", phone: "033-253-0099", rating: 4.4, reviewCount: 10200, lat: 37.8718, lng: 127.7378, priceRange: "₩25,000~₩45,000", tags: ["족발","보쌈","막국수"], description: "춘천 족발 맛집 1등, 누린내 없이 부드러운 족발" },
  { id: "bj02", name: "춘천원조족발보쌈", category: "보쌈/족발", address: "춘천시 중앙로 58", phone: "033-254-8877", rating: 4.2, reviewCount: 8600, lat: 37.8800, lng: 127.7290, priceRange: "₩28,000~₩50,000", tags: ["족발","보쌈","순대"], description: "춘천 명동 인근, 20년 전통 족발과 보쌈 맛집" },
  { id: "bj03", name: "명동족발집", category: "보쌈/족발", address: "춘천시 금강로 55", phone: "033-254-7766", rating: 4.1, reviewCount: 7100, lat: 37.8800, lng: 127.7293, priceRange: "₩28,000~₩48,000", tags: ["족발","보쌈","냉채족발"], description: "명동 닭갈비 골목 인근, 쫄깃한 냉채족발로 유명" },
  { id: "bj04", name: "대박보쌈족발", category: "보쌈/족발", address: "춘천시 효자동 615-2", phone: "033-263-5533", rating: 4.0, reviewCount: 5400, lat: 37.8660, lng: 127.7322, priceRange: "₩25,000~₩45,000", tags: ["보쌈","족발","수육"], description: "효자동 현지인 추천 보쌈과 족발 전문점" },
  { id: "bj05", name: "소양강족발", category: "보쌈/족발", address: "춘천시 우두동 744-5", phone: "033-244-6655", rating: 3.9, reviewCount: 3800, lat: 37.8960, lng: 127.7232, priceRange: "₩26,000~₩45,000", tags: ["족발","보쌈","막국수"], description: "우두동 소양강 인근, 소박하고 맛있는 족발집" },

  // === 돈까스 ===
  { id: "dk_k01", name: "든든돈까스&분식", category: "돈까스", address: "춘천시 운교동 107-1", phone: "033-242-2125", rating: 4.3, reviewCount: 9800, lat: 37.8750, lng: 127.7218, priceRange: "₩8,000~₩14,000", tags: ["수제돈까스","치즈돈까스","왕돈까스"], description: "두툼한 수제 돈까스 전문점, 합리적 가격으로 인기" },
  { id: "dk_k02", name: "유미카츠", category: "돈까스", address: "춘천시 후평동 760-5", phone: "033-252-6688", rating: 4.4, reviewCount: 8200, lat: 37.8712, lng: 127.7410, priceRange: "₩9,000~₩16,000", tags: ["카츠","등심카츠","히레카츠"], description: "일본식 수제 카츠 전문점, 바삭한 튀김 옷이 특징" },
  { id: "dk_k03", name: "한어울돈까스", category: "돈까스", address: "춘천시 석사동 295-3", phone: "033-242-4488", rating: 4.2, reviewCount: 7100, lat: 37.8868, lng: 127.7448, priceRange: "₩8,000~₩15,000", tags: ["돈까스","치즈돈까스","새우튀김"], description: "석사동 현지인 즐겨 찾는 정통 돈까스 맛집" },
  { id: "dk_k04", name: "돈까스클럽춘천점", category: "돈까스", address: "춘천시 춘천로 88", phone: "033-255-3344", rating: 4.0, reviewCount: 5900, lat: 37.8740, lng: 127.7270, priceRange: "₩8,000~₩14,000", tags: ["돈까스","치즈돈까스","가스라이스"], description: "춘천 시내 돈까스 클럽 프랜차이즈, 수제 스타일 돈까스" },
  { id: "dk_k05", name: "송암식당", category: "돈까스", address: "춘천시 남춘로 45", phone: "033-254-7722", rating: 4.1, reviewCount: 4800, lat: 37.8665, lng: 127.7355, priceRange: "₩8,000~₩13,000", tags: ["돈까스","제육볶음","된장찌개"], description: "남춘천 인근 가정식 돈까스 맛집, 추억의 맛" },
  { id: "dk_k06", name: "가츠야춘천", category: "돈까스", address: "춘천시 중앙로 105", phone: "033-253-5511", rating: 4.0, reviewCount: 4100, lat: 37.8798, lng: 127.7293, priceRange: "₩8,000~₩15,000", tags: ["로스카츠","히레카츠","카츠덮밥"], description: "일본식 돈까스 전문점, 명동 인근 위치" },

  // === 샤브샤브 ===
  { id: "sh01", name: "춘천샤브샤브공방", category: "샤브샤브", address: "춘천시 중앙로 55", phone: "033-254-9988", rating: 4.3, reviewCount: 7800, lat: 37.8798, lng: 127.7291, priceRange: "₩15,000~₩35,000", tags: ["샤브샤브","버섯샤브","해물샤브"], description: "춘천 명동 인근 샤브샤브 전문점, 다양한 육수 선택 가능" },
  { id: "sh02", name: "원조샤브향", category: "샤브샤브", address: "춘천시 후평동 742-2", phone: "033-252-5544", rating: 4.2, reviewCount: 6400, lat: 37.8710, lng: 127.7402, priceRange: "₩15,000~₩30,000", tags: ["샤브샤브","두부샤브","버섯전골"], description: "후평동 현지인 추천 샤브샤브 전문점" },
  { id: "sh03", name: "한우샤브앤그릴", category: "샤브샤브", address: "춘천시 서부대성로 130", phone: "033-241-8855", rating: 4.4, reviewCount: 5200, lat: 37.8828, lng: 127.7192, priceRange: "₩20,000~₩45,000", tags: ["한우샤브","그릴","버섯전골"], description: "한우 샤브샤브와 그릴을 함께 즐길 수 있는 고급 식당" },
  { id: "sh04", name: "채소가좋아샤브샤브", category: "샤브샤브", address: "춘천시 석사동 300-8", phone: "033-242-3366", rating: 4.0, reviewCount: 4100, lat: 37.8868, lng: 127.7450, priceRange: "₩14,000~₩28,000", tags: ["채소샤브","버섯샤브","두부샤브"], description: "석사동 채소와 버섯 중심의 건강한 샤브샤브" },
  { id: "sh05", name: "모던샤브춘천", category: "샤브샤브", address: "춘천시 춘천로 205", phone: "033-256-4400", rating: 4.1, reviewCount: 3600, lat: 37.8745, lng: 127.7264, priceRange: "₩16,000~₩35,000", tags: ["샤브샤브","스키야키","라멘사리"], description: "춘천 시내 모던 스타일 샤브샤브 레스토랑" },

  // === 통닭 ===
  { id: "tc01", name: "춘천닭갈비통닭", category: "통닭", address: "춘천시 금강로 72", phone: "033-255-4411", rating: 4.3, reviewCount: 10200, lat: 37.8800, lng: 127.7295, priceRange: "₩16,000~₩22,000", tags: ["통닭","후라이드","양념치킨"], description: "춘천 명동 인근, 바삭한 통닭 전문점" },
  { id: "tc02", name: "소양강통닭", category: "통닭", address: "춘천시 신북읍 소양강로 222", phone: "033-242-3399", rating: 4.2, reviewCount: 8400, lat: 37.9222, lng: 127.7142, priceRange: "₩15,000~₩20,000", tags: ["전통통닭","후라이드","닭강정"], description: "소양강변 전통 통닭집, 바삭한 전통 후라이드 통닭" },
  { id: "tc03", name: "맛나통닭", category: "통닭", address: "춘천시 퇴계로 145", phone: "033-255-3388", rating: 4.1, reviewCount: 7100, lat: 37.8690, lng: 127.7258, priceRange: "₩15,000~₩20,000", tags: ["후라이드","양념치킨","순살치킨"], description: "퇴계동 오래된 치킨집, 바삭한 후라이드와 매콤한 양념치킨" },
  { id: "tc04", name: "명동치킨골목", category: "통닭", address: "춘천시 약사고개길 35", phone: "033-255-6677", rating: 4.0, reviewCount: 5800, lat: 37.8812, lng: 127.7322, priceRange: "₩15,000~₩20,000", tags: ["후라이드","양념치킨","맥주"], description: "약사고개 인근 치킨골목, 치맥 성지로 유명" },
  { id: "tc05", name: "교동통닭", category: "통닭", address: "춘천시 중앙로 48", phone: "033-253-7744", rating: 3.9, reviewCount: 4500, lat: 37.8798, lng: 127.7289, priceRange: "₩14,000~₩19,000", tags: ["전통통닭","후라이드","닭도리탕"], description: "춘천 시내 30년 전통 통닭집, 손으로 잘라주는 전통식" },
  { id: "tc06", name: "강촌통닭", category: "통닭", address: "춘천시 남산면 강촌리 258", phone: "033-261-3344", rating: 4.2, reviewCount: 3900, lat: 37.8375, lng: 127.6985, priceRange: "₩15,000~₩21,000", tags: ["통닭","양념치킨","맥주"], description: "강촌역 인근, 여행자들에게 인기 있는 통닭집" },

  // === 카페 ===
  { id: "cf01", name: "리버레인", category: "카페", address: "춘천시 중도로 85", phone: "033-264-3300", rating: 4.6, reviewCount: 24800, lat: 37.8770, lng: 127.7190, priceRange: "₩5,000~₩12,000", tags: ["의암호뷰","커피","케이크"], description: "레고랜드 인근 의암호 리버뷰 4층 카페, 춘천 뷰맛집 명소" },
  { id: "cf02", name: "소울로스터리", category: "카페", address: "춘천시 신북읍 신샘밭로 780", phone: "033-241-6600", rating: 4.5, reviewCount: 18600, lat: 37.9290, lng: 127.7200, priceRange: "₩5,500~₩11,000", tags: ["소나무숲뷰","스페셜티커피","핸드드립"], description: "500그루 소나무숲 속 스페셜티 커피 전문 카페" },
  { id: "cf03", name: "레미니센스", category: "카페", address: "춘천시 신북읍 신샘밭로 702 2층", phone: "033-241-5533", rating: 4.5, reviewCount: 16400, lat: 37.9265, lng: 127.7192, priceRange: "₩5,500~₩12,000", tags: ["소양강뷰","루프탑","베이커리"], description: "소양강 뷰 루프탑 카페, 음료와 베이커리 모두 인기" },
  { id: "cf04", name: "카페느티나무", category: "카페", address: "춘천시 서면 박사로 1088", phone: "033-244-9977", rating: 4.4, reviewCount: 12800, lat: 37.8775, lng: 127.6910, priceRange: "₩5,000~₩11,000", tags: ["느티나무숲","커피","와플"], description: "의암호 인근 느티나무 숲 속 운치 있는 카페" },
  { id: "cf05", name: "팜카페", category: "카페", address: "춘천시 동면 순환대로 1060", phone: "033-262-5588", rating: 4.3, reviewCount: 10200, lat: 37.8982, lng: 127.7645, priceRange: "₩5,000~₩11,000", tags: ["농장카페","커피","에이드"], description: "동면 농장형 대형 카페, 넓은 정원과 야외 좌석" },
  { id: "cf06", name: "커피명가", category: "카페", address: "춘천시 중앙로 40", phone: "033-253-3377", rating: 4.2, reviewCount: 8900, lat: 37.8800, lng: 127.7285, priceRange: "₩4,500~₩10,000", tags: ["커피","케이크","디저트"], description: "춘천 명동 위치, 오랜 단골이 많은 커피 전문점" },
  { id: "cf07", name: "소양강스카이워크카페", category: "카페", address: "춘천시 영서로 2664", phone: "033-241-5500", rating: 4.4, reviewCount: 7200, lat: 37.9100, lng: 127.7450, priceRange: "₩5,500~₩12,000", tags: ["소양강뷰","커피","스카이워크"], description: "소양강 스카이워크 인근, 강 전망 카페" },
  { id: "cf08", name: "강촌레일파크카페", category: "카페", address: "춘천시 남산면 강촌리 250", phone: "033-245-1000", rating: 4.3, reviewCount: 6800, lat: 37.8372, lng: 127.6978, priceRange: "₩5,000~₩11,000", tags: ["강촌뷰","커피","레일바이크"], description: "강촌 레일파크 인근, 북한강 뷰 카페" },

  // === 분식 ===
  { id: "fn01", name: "분식의달인", category: "분식", address: "춘천시 춘천로17번길 31 1층", phone: "033-254-5888", rating: 4.4, reviewCount: 12400, lat: 37.8748, lng: 127.7280, priceRange: "₩3,000~₩9,000", tags: ["떡볶이","순대","튀김"], description: "새벽 2시까지 운영, 춘천 심야 분식 성지" },
  { id: "fn02", name: "명동떡볶이", category: "분식", address: "춘천시 금강로 60", phone: "033-255-2266", rating: 4.2, reviewCount: 9800, lat: 37.8800, lng: 127.7294, priceRange: "₩3,000~₩8,000", tags: ["떡볶이","순대","어묵"], description: "명동 닭갈비 골목 내 떡볶이 분식 맛집" },
  { id: "fn03", name: "춘천할머니분식", category: "분식", address: "춘천시 약사고개길 28", phone: "033-255-1133", rating: 4.3, reviewCount: 8200, lat: 37.8815, lng: 127.7318, priceRange: "₩2,500~₩7,000", tags: ["떡볶이","오뎅","계란떡볶이"], description: "약사고개 오래된 할머니 분식집, 추억의 달달한 떡볶이" },
  { id: "fn04", name: "거인분식", category: "분식", address: "춘천시 후평동 755-8", phone: "033-252-4466", rating: 4.1, reviewCount: 6700, lat: 37.8712, lng: 127.7408, priceRange: "₩3,000~₩8,000", tags: ["떡볶이","라면","김밥"], description: "후평동 현지 학생들에게 인기 있는 분식 맛집" },
  { id: "fn05", name: "춘천역전분식", category: "분식", address: "춘천시 공지로 237", phone: "033-254-8899", rating: 4.0, reviewCount: 5400, lat: 37.8763, lng: 127.7230, priceRange: "₩2,500~₩8,000", tags: ["김밥","떡볶이","순대"], description: "춘천역 인근 분식점, 여행자들에게 인기" },
  { id: "fn06", name: "분식나라", category: "분식", address: "춘천시 석사동 298-5", phone: "033-242-3311", rating: 3.9, reviewCount: 4100, lat: 37.8868, lng: 127.7448, priceRange: "₩2,500~₩8,000", tags: ["분식","라면","떡볶이"], description: "석사동 동네 주민들이 즐겨 찾는 분식점" },

];
