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
  sources: { name: string; rating: number; reviewCount: number }[];
  thumbnail?: string;
}

// 춘천시 중국집 샘플 데이터
export const sampleRestaurants: Restaurant[] = [
  {
    id: "1",
    name: "춘천반점",
    category: "중국집",
    address: "강원도 춘천시 중앙로 62",
    phone: "033-252-1234",
    rating: 4.6,
    reviewCount: 1284,
    lat: 37.8813,
    lng: 127.7298,
    priceRange: "₩8,000~₩15,000",
    tags: ["짜장면", "짬뽕", "탕수육"],
    sources: [
      { name: "네이버", rating: 4.7, reviewCount: 523 },
      { name: "카카오", rating: 4.5, reviewCount: 412 },
      { name: "구글", rating: 4.6, reviewCount: 349 },
    ],
  },
  {
    id: "2",
    name: "명동짬뽕",
    category: "중국집",
    address: "강원도 춘천시 명동길 15",
    phone: "033-254-5678",
    rating: 4.4,
    reviewCount: 892,
    lat: 37.8795,
    lng: 127.7275,
    priceRange: "₩7,000~₩13,000",
    tags: ["짬뽕", "볶음밥", "군만두"],
    sources: [
      { name: "네이버", rating: 4.5, reviewCount: 389 },
      { name: "카카오", rating: 4.3, reviewCount: 298 },
      { name: "구글", rating: 4.4, reviewCount: 205 },
    ],
  },
  {
    id: "3",
    name: "용문각",
    category: "중국집",
    address: "강원도 춘천시 봄내로 42",
    phone: "033-256-9012",
    rating: 4.8,
    reviewCount: 2156,
    lat: 37.8745,
    lng: 127.7340,
    priceRange: "₩9,000~₩20,000",
    tags: ["짜장면", "간짜장", "탕수육", "깐풍기"],
    sources: [
      { name: "네이버", rating: 4.9, reviewCount: 876 },
      { name: "카카오", rating: 4.7, reviewCount: 745 },
      { name: "구글", rating: 4.8, reviewCount: 535 },
    ],
  },
  {
    id: "4",
    name: "신흥루",
    category: "중국집",
    address: "강원도 춘천시 후평동 123-4",
    phone: "033-251-3456",
    rating: 4.2,
    reviewCount: 567,
    lat: 37.8720,
    lng: 127.7380,
    priceRange: "₩7,000~₩12,000",
    tags: ["짜장면", "짬뽕", "잡채밥"],
    sources: [
      { name: "네이버", rating: 4.3, reviewCount: 234 },
      { name: "카카오", rating: 4.1, reviewCount: 198 },
      { name: "구글", rating: 4.2, reviewCount: 135 },
    ],
  },
  {
    id: "5",
    name: "황궁",
    category: "중국집",
    address: "강원도 춘천시 퇴계동 456-7",
    phone: "033-253-7890",
    rating: 4.5,
    reviewCount: 1045,
    lat: 37.8760,
    lng: 127.7220,
    priceRange: "₩8,000~₩18,000",
    tags: ["코스요리", "탕수육", "유산슬"],
    sources: [
      { name: "네이버", rating: 4.6, reviewCount: 456 },
      { name: "카카오", rating: 4.4, reviewCount: 367 },
      { name: "구글", rating: 4.5, reviewCount: 222 },
    ],
  },
  {
    id: "6",
    name: "만리장성",
    category: "중국집",
    address: "강원도 춘천시 석사동 789-1",
    phone: "033-255-1111",
    rating: 4.3,
    reviewCount: 723,
    lat: 37.8850,
    lng: 127.7410,
    priceRange: "₩8,000~₩16,000",
    tags: ["짬뽕", "마파두부", "볶음밥"],
    sources: [
      { name: "네이버", rating: 4.4, reviewCount: 312 },
      { name: "카카오", rating: 4.2, reviewCount: 256 },
      { name: "구글", rating: 4.3, reviewCount: 155 },
    ],
  },
  {
    id: "7",
    name: "대보반점",
    category: "중국집",
    address: "강원도 춘천시 효자동 234-5",
    phone: "033-257-2222",
    rating: 4.1,
    reviewCount: 445,
    lat: 37.8680,
    lng: 127.7310,
    priceRange: "₩6,000~₩11,000",
    tags: ["짜장면", "우동", "볶음밥"],
    sources: [
      { name: "네이버", rating: 4.2, reviewCount: 198 },
      { name: "카카오", rating: 4.0, reviewCount: 156 },
      { name: "구글", rating: 4.1, reviewCount: 91 },
    ],
  },
  {
    id: "8",
    name: "금룡",
    category: "중국집",
    address: "강원도 춘천시 소양로 88",
    phone: "033-258-3333",
    rating: 4.7,
    reviewCount: 1678,
    lat: 37.8830,
    lng: 127.7250,
    priceRange: "₩9,000~₩22,000",
    tags: ["간짜장", "삼선짬뽕", "깐풍새우"],
    sources: [
      { name: "네이버", rating: 4.8, reviewCount: 678 },
      { name: "카카오", rating: 4.6, reviewCount: 589 },
      { name: "구글", rating: 4.7, reviewCount: 411 },
    ],
  },
];

export const categories = [
  "전체",
  "중국집",
  "한식",
  "일식",
  "양식",
  "카페",
  "분식",
  "치킨",
  "피자",
];
