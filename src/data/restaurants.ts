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
  // === 춘천 중화요리 ===
  { id: "cn01", name: "회영루", category: "중화요리", address: "춘천시 금강로 38", phone: "033-254-2358", rating: 4.2, reviewCount: 13269, lat: 37.8789, lng: 127.7284, priceRange: "₩7,000~₩15,000", tags: ["짜장면","짬뽕","탕수육","해물간짜장"], description: "춘천 명동 대표 인기 중화요리" },
  { id: "cn02", name: "차이나게이트", category: "중화요리", address: "춘천시 애막골길7번길 31-1", phone: "033-252-5566", rating: 3.5, reviewCount: 11952, lat: 37.8770, lng: 127.7350, priceRange: "₩6,000~₩13,000", tags: ["짜장면","짬뽕","군만두"], description: "애막골 오래된 중화요리" },
  { id: "cn03", name: "란중식", category: "중화요리", address: "춘천시 동면 춘천순환로 356", phone: "033-241-5588", rating: 4.0, reviewCount: 9618, lat: 37.8920, lng: 127.7580, priceRange: "₩8,000~₩18,000", tags: ["코스요리","짬뽕","탕수육"], description: "동면 코스요리 전문 중식당" },
  { id: "cn04", name: "치엔롱", category: "중화요리", address: "춘천시 서면 월송길 381-15", phone: "033-242-8899", rating: 3.7, reviewCount: 9505, lat: 37.8650, lng: 127.6880, priceRange: "₩7,000~₩15,000", tags: ["짬뽕","탕수육","볶음밥"], description: "서면 인기 중화요리" },
  { id: "cn05", name: "온정", category: "중화요리", address: "춘천시 동면 가산로 165", phone: "033-243-1234", rating: 3.7, reviewCount: 8051, lat: 37.8950, lng: 127.7620, priceRange: "₩7,000~₩14,000", tags: ["짜장면","짬뽕","울면"], description: "동면 가산리 중화요리" },
  { id: "cn06", name: "보문각", category: "중화요리", address: "춘천시 약사고개길 42", phone: "033-255-4455", rating: 3.5, reviewCount: 7502, lat: 37.8810, lng: 127.7320, priceRange: "₩7,000~₩14,000", tags: ["짜장면","짬뽕","탕수육"], description: "춘천 명동 노포 중화요리" },
  { id: "cn07", name: "북경관", category: "중화요리", address: "춘천시 중앙로 67", phone: "033-253-7788", rating: 3.4, reviewCount: 7253, lat: 37.8800, lng: 127.7300, priceRange: "₩6,000~₩12,000", tags: ["짜장면","짬뽕","볶음밥"], description: "중앙로 오래된 중화요리" },
  { id: "cn08", name: "천미향", category: "중화요리", address: "춘천시 우두로 62", phone: "033-244-7979", rating: 4.3, reviewCount: 6200, lat: 37.8960, lng: 127.7250, priceRange: "₩8,000~₩18,000", tags: ["탕수육","금전우육","짬뽕"], description: "우두동 블로그 추천 맛집" },
  { id: "cn09", name: "복성원", category: "중화요리", address: "춘천시 춘천로 195", phone: "033-256-1234", rating: 2.8, reviewCount: 4986, lat: 37.8740, lng: 127.7260, priceRange: "₩6,000~₩11,000", tags: ["짜장면","볶음밥","짬뽕"] },
  { id: "cn10", name: "구가네찹쌀탕수육", category: "중화요리", address: "춘천시 퇴계로145번길 7-11", phone: "033-251-3344", rating: 3.6, reviewCount: 4885, lat: 37.8695, lng: 127.7275, priceRange: "₩8,000~₩16,000", tags: ["찹쌀탕수육","짜장면","짬뽕"], description: "찹쌀탕수육 전문" },
  { id: "cn11", name: "중국성", category: "중화요리", address: "춘천시 중앙로 55", phone: "033-252-3456", rating: 3.8, reviewCount: 4500, lat: 37.8795, lng: 127.7292, priceRange: "₩6,000~₩13,000", tags: ["짜장면","간짜장","짬뽕"], description: "다이닝코드 추천 맛집" },
  { id: "cn12", name: "신짱깨집", category: "중화요리", address: "춘천시 후평동 640-3", phone: "033-251-0088", rating: 3.9, reviewCount: 4200, lat: 37.8702, lng: 127.7395, priceRange: "₩6,000~₩13,000", tags: ["짜장면","짬뽕","탕수육"], description: "후평동 현지인 맛집" },
  { id: "cn13", name: "진짬뽕 진짜장", category: "중화요리", address: "춘천시 공지로 246", phone: "033-252-9090", rating: 3.7, reviewCount: 3742, lat: 37.8755, lng: 127.7228, priceRange: "₩7,000~₩13,000", tags: ["짬뽕","짜장면","볶음밥"], description: "공지천 근처 짬뽕 전문" },
  { id: "cn14", name: "도원뚝배기짬뽕", category: "중화요리", address: "춘천시 동내면 거두택지길 65-9", phone: "033-244-5577", rating: 3.8, reviewCount: 3709, lat: 37.9050, lng: 127.7480, priceRange: "₩7,000~₩13,000", tags: ["뚝배기짬뽕","짜장면"], description: "동내면 뚝배기짬뽕 전문" },
  { id: "cn15", name: "쟈스민", category: "중화요리", address: "춘천시 우묵길74번길 14", phone: "033-253-8899", rating: 3.6, reviewCount: 3366, lat: 37.8775, lng: 127.7245, priceRange: "₩7,000~₩14,000", tags: ["짜장면","짬뽕","탕수육"] },
  { id: "cn16", name: "대원장", category: "중화요리", address: "춘천시 효자동 512-1", phone: "033-262-3456", rating: 4.1, reviewCount: 3300, lat: 37.8660, lng: 127.7310, priceRange: "₩6,000~₩12,000", tags: ["짜장면","비빔국수","짬뽕"], description: "2대째 노포, 생활의 달인 출연" },
  { id: "cn17", name: "신짬뽕", category: "중화요리", address: "춘천시 춘천로281번길 6", phone: "033-256-1177", rating: 3.5, reviewCount: 3197, lat: 37.8735, lng: 127.7268, priceRange: "₩7,000~₩12,000", tags: ["짬뽕","짜장면"] },
  { id: "cn18", name: "룽타우객잔", category: "중화요리", address: "춘천시 후석로 11-4 1층", phone: "033-257-1234", rating: 3.7, reviewCount: 3117, lat: 37.8720, lng: 127.7380, priceRange: "₩8,000~₩15,000", tags: ["짬뽕","마라탕","탕수육"], description: "후석로 중화요리 전문" },
  { id: "cn19", name: "백리향", category: "중화요리", address: "춘천시 신흥길5번길 8-2", phone: "033-254-9876", rating: 3.5, reviewCount: 2742, lat: 37.8812, lng: 127.7340, priceRange: "₩6,000~₩13,000", tags: ["짜장면","짬뽕","군만두"] },
  { id: "cn20", name: "미래향", category: "중화요리", address: "춘천시 영서로 2664", phone: "033-241-7788", rating: 3.4, reviewCount: 2554, lat: 37.9100, lng: 127.7450, priceRange: "₩6,000~₩12,000", tags: ["짜장면","짬뽕","볶음밥"], description: "영서로 동네 중화요리" },
  { id: "cn21", name: "몽짬뽕", category: "중화요리", address: "춘천시 퇴계로105번길 17 1층", phone: "033-255-0808", rating: 3.6, reviewCount: 2527, lat: 37.8688, lng: 127.7258, priceRange: "₩7,000~₩13,000", tags: ["짬뽕","짜장면"], description: "퇴계동 짬뽕 전문" },
  { id: "cn22", name: "석사반점", category: "중화요리", address: "춘천시 석사동 290-5", phone: "033-242-4567", rating: 3.9, reviewCount: 2400, lat: 37.8870, lng: 127.7450, priceRange: "₩4,000~₩10,000", tags: ["짜장면","짬뽕","볶음밥"], description: "30년 노포, 짜장면 4천원" },
  { id: "cn23", name: "동내반점", category: "중화요리", address: "춘천시 동내면 지암리 123", phone: "033-244-3355", rating: 4.0, reviewCount: 2200, lat: 37.9020, lng: 127.7500, priceRange: "₩6,000~₩12,000", tags: ["짬뽕","짜장면","탕수육"], description: "지암리 현지인 추천 맛집" },
  { id: "cn24", name: "뽕뽕황짬뽕이야", category: "중화요리", address: "춘천시 후석로455번길 53-1", phone: "033-257-0909", rating: 3.8, reviewCount: 344, lat: 37.8720, lng: 127.7380, priceRange: "₩8,000~₩14,000", tags: ["황짬뽕","볶음밥","탕수육"], description: "후석로 황짬뽕 전문" },
];
