import json, urllib.request, urllib.error
import sys
sys.stdout.reconfigure(encoding='utf-8')

SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8"
BASE_URL = "https://cblckdcrsotqynngblyb.supabase.co/rest/v1/restaurants"

restaurants = [
  # =============================================
  # 조개구이 카테고리 (10개)
  # =============================================
  {
    "id": "jg01", "slug": "jg01",
    "name": "해돋이",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 후석로 370",
    "phone": "033-253-7218",
    "lat": 37.8831, "lng": 127.7412,
    "rating": 4.3, "review_count": 0,
    "price_range": "보통",
    "tags": ["조개구이", "굴찜", "석화", "현지인맛집", "해산물", "활어회", "저녁전문"]
  },
  {
    "id": "jg02", "slug": "jg02",
    "name": "조개마을",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 동내면 거두택지길 10 1층",
    "phone": "0507-1422-7845",
    "lat": 37.8512, "lng": 127.7089,
    "rating": 4.2, "review_count": 0,
    "price_range": "보통",
    "tags": ["조개구이", "조개전골", "해물냉삼", "가리비", "키조개", "전복", "동내면"]
  },
  {
    "id": "jg03", "slug": "jg03",
    "name": "해물마루",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 충혼길 9",
    "phone": "033-252-7878",
    "lat": 37.8701, "lng": 127.7312,
    "rating": 4.4, "review_count": 0,
    "price_range": "보통",
    "tags": ["해물찜", "조개전골", "남춘천역근처", "문어", "오징어", "단체회식"]
  },
  {
    "id": "jg04", "slug": "jg04",
    "name": "바다수퍼 해물천하 조개구이 춘천점",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 수변공원길 25-1 1층",
    "phone": "0507-1418-5586",
    "lat": 37.8778, "lng": 127.7289,
    "rating": 4.0, "review_count": 0,
    "price_range": "보통",
    "tags": ["조개구이", "국물조개찜", "랍스타퐁듀", "가리비", "야외테라스", "예약가능", "삼천동"]
  },
  {
    "id": "jg05", "slug": "jg05",
    "name": "하와이조개 춘천점",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 보안길 19 상가동 1층",
    "phone": "0507-1372-6273",
    "lat": 37.8834, "lng": 127.7398,
    "rating": 4.1, "review_count": 0,
    "price_range": "보통",
    "tags": ["조개구이", "대하", "신선한조개", "가성비", "후평동", "무료라면제공"]
  },
  {
    "id": "jg06", "slug": "jg06",
    "name": "조개본능",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 애막골길 23",
    "phone": "033-264-7959",
    "lat": 37.8645, "lng": 127.7234,
    "rating": 4.2, "review_count": 0,
    "price_range": "보통",
    "tags": ["조개구이", "해물구이", "테라스좌석", "회식장소", "단체가능", "시원한분위기"]
  },
  {
    "id": "jg07", "slug": "jg07",
    "name": "춘천조개창고",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 금초로 388",
    "phone": "010-4344-6737",
    "lat": 37.8567, "lng": 127.7156,
    "rating": 4.0, "review_count": 0,
    "price_range": "보통",
    "tags": ["조개구이", "해물구이", "단체모임", "넓은공간", "셀프바", "거두동"]
  },
  {
    "id": "jg08", "slug": "jg08",
    "name": "해양수산부",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 우렁새56번길 25-1",
    "phone": "0507-1388-3613",
    "lat": 37.8723, "lng": 127.7245,
    "rating": 4.1, "review_count": 0,
    "price_range": "보통",
    "tags": ["조개구이", "해물구이", "셀프바", "2차가능", "회식", "예약가능"]
  },
  {
    "id": "jg09", "slug": "jg09",
    "name": "우미야",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 보안길 6 1층",
    "phone": "033-255-8227",
    "lat": 37.8835, "lng": 127.7395,
    "rating": 4.3, "review_count": 0,
    "price_range": "고급",
    "tags": ["이자카야", "오마카세", "사시미모리아와세", "해산물", "후평동먹자골목", "일본식"]
  },
  {
    "id": "jg10", "slug": "jg10",
    "name": "감자아일랜드 본점",
    "category": "조개구이",
    "address": "강원특별자치도 춘천시 방송길 77 상가동 1층",
    "phone": "010-9023-7669",
    "lat": 37.8612, "lng": 127.7201,
    "rating": 4.3, "review_count": 0,
    "price_range": "보통",
    "tags": ["수제맥주", "해물보따리", "감자요리", "크래프트맥주", "남춘천역근처", "포장가능"]
  },

  # =============================================
  # 술집 카테고리 (10개)
  # =============================================
  {
    "id": "sj01", "slug": "sj01",
    "name": "바앤라운지",
    "category": "술집",
    "address": "강원특별자치도 춘천시 백령로138번길 38",
    "phone": "0507-1457-7284",
    "lat": 37.8789, "lng": 127.7189,
    "rating": 4.5, "review_count": 0,
    "price_range": "보통",
    "tags": ["칵테일바", "위스키바", "싱글몰트", "코리아베스트바", "강원대후문", "혼술", "커버차지없음"]
  },
  {
    "id": "sj02", "slug": "sj02",
    "name": "루트나인",
    "category": "술집",
    "address": "강원특별자치도 춘천시 중앙로67번길 13 메이트호텔 지하1층",
    "phone": "0507-1334-3391",
    "lat": 37.8812, "lng": 127.7278,
    "rating": 4.4, "review_count": 0,
    "price_range": "보통",
    "tags": ["칵테일바", "DJ바", "디제잉", "힙한분위기", "LP판메뉴판", "핫플레이스", "조양동"]
  },
  {
    "id": "sj03", "slug": "sj03",
    "name": "비바라비다",
    "category": "술집",
    "address": "강원특별자치도 춘천시 삭주로80번길 14-6",
    "phone": "",
    "lat": 37.8756, "lng": 127.7198,
    "rating": 4.4, "review_count": 0,
    "price_range": "저렴",
    "tags": ["칵테일바", "감성인테리어", "신청곡서비스", "한림대근처", "혼술", "맥주", "분위기좋은"]
  },
  {
    "id": "sj04", "slug": "sj04",
    "name": "일과사랑",
    "category": "술집",
    "address": "강원특별자치도 춘천시 삭주로 51",
    "phone": "0507-1376-4333",
    "lat": 37.8762, "lng": 127.7203,
    "rating": 4.2, "review_count": 0,
    "price_range": "보통",
    "tags": ["칵테일", "이탈리안", "파스타", "스테이크", "복층구조", "데이트", "한림대근처"]
  },
  {
    "id": "sj05", "slug": "sj05",
    "name": "스퀴즈브루어리",
    "category": "술집",
    "address": "강원특별자치도 춘천시 공지로 353 2층",
    "phone": "033-818-1663",
    "lat": 37.8734, "lng": 127.7267,
    "rating": 4.3, "review_count": 0,
    "price_range": "보통",
    "tags": ["수제맥주", "브루어리", "크래프트비어", "IPA", "라거", "소양강에일", "춘천최초브루어리"]
  },
  {
    "id": "sj06", "slug": "sj06",
    "name": "감자아일랜드 온의점",
    "category": "술집",
    "address": "강원특별자치도 춘천시 방송길 77 상가동 1층 1310호",
    "phone": "0507-1356-4681",
    "lat": 37.8614, "lng": 127.7204,
    "rating": 4.4, "review_count": 0,
    "price_range": "보통",
    "tags": ["수제맥주", "브루어리", "감자요리", "크래프트맥주", "16종수제맥주", "핫플레이스", "온의동"]
  },
  {
    "id": "sj07", "slug": "sj07",
    "name": "동양관",
    "category": "술집",
    "address": "강원특별자치도 춘천시 우묵길 80 1층",
    "phone": "010-4346-8822",
    "lat": 37.8689, "lng": 127.7378,
    "rating": 4.5, "review_count": 0,
    "price_range": "보통",
    "tags": ["이자카야", "퓨전이자카야", "숙성회", "하이볼", "데이트", "소개팅", "퇴계동", "예약추천"]
  },
  {
    "id": "sj08", "slug": "sj08",
    "name": "만텐",
    "category": "술집",
    "address": "강원특별자치도 춘천시 퇴계로93번길 18",
    "phone": "033-263-7282",
    "lat": 37.8695, "lng": 127.7385,
    "rating": 4.0, "review_count": 0,
    "price_range": "고급",
    "tags": ["이자카야", "후토마키", "사시미", "숙성회", "모츠나베", "예약필수", "퇴계동", "고급이자카야"]
  },
  {
    "id": "sj09", "slug": "sj09",
    "name": "배럴하우스",
    "category": "술집",
    "address": "강원특별자치도 춘천시 우묵길70번길 7 1층",
    "phone": "0507-1391-8243",
    "lat": 37.8678, "lng": 127.7334,
    "rating": 4.2, "review_count": 0,
    "price_range": "보통",
    "tags": ["맥주집", "생맥주", "슈바인학센", "바베큐", "펍", "통나무인테리어", "퇴계동", "무한리필팝콘"]
  },
  {
    "id": "sj10", "slug": "sj10",
    "name": "심야",
    "category": "술집",
    "address": "강원특별자치도 춘천시 삭주로80번길 21",
    "phone": "",
    "lat": 37.8758, "lng": 127.7196,
    "rating": 4.8, "review_count": 0,
    "price_range": "보통",
    "tags": ["요리주점", "술집", "안주맛집", "한림대근처", "분위기좋은", "심야영업", "캐주얼"]
  },
]

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates",
}

data = json.dumps(restaurants, ensure_ascii=False).encode("utf-8")
req = urllib.request.Request(BASE_URL, data=data, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as resp:
        print(f"성공: {resp.status} - {len(restaurants)}개 식당 추가 완료")
        print()
        print("추가된 식당 목록:")
        for r in restaurants:
            print(f"  [{r['category']}] {r['name']} - {r['address']}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"실패 ({e.code}): {body[:2000]}")
