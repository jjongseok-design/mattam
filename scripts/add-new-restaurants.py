import json, urllib.request, urllib.error

SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8"
BASE_URL = "https://cblckdcrsotqynngblyb.supabase.co/rest/v1/restaurants"

restaurants = [
  # 닭갈비
  {"id":"dc17","slug":"dc17","name":"향토진미닭갈비 본점","category":"닭갈비","address":"강원특별자치도 춘천시 동면 만천로 86","phone":"033-261-0086","lat":37.8912,"lng":127.7501,"rating":4.2,"review_count":0,"price_range":"보통","tags":["숯불닭갈비","간장닭갈비","현지인추천","매운닭갈비"]},
  {"id":"dc18","slug":"dc18","name":"4단지닭갈비","category":"닭갈비","address":"강원특별자치도 춘천시 남춘천동","phone":"033-253-4440","lat":37.8589,"lng":127.7221,"rating":4.4,"review_count":0,"price_range":"보통","tags":["국산닭","40년전통","현지인맛집","철판닭갈비"]},
  {"id":"dc19","slug":"dc19","name":"119닭갈비","category":"닭갈비","address":"강원특별자치도 춘천시 남춘로36번길 51","phone":"033-264-1194","lat":37.8721,"lng":127.7358,"rating":4.1,"review_count":0,"price_range":"보통","tags":["닭갈비","볶음밥","퇴계동"]},
  {"id":"dc20","slug":"dc20","name":"소양강닭갈비","category":"닭갈비","address":"강원특별자치도 춘천시 동면 순환대로 1045","phone":"033-264-1102","lat":37.8944,"lng":127.7534,"rating":4.0,"review_count":0,"price_range":"보통","tags":["숯불닭갈비","간장닭갈비","소금닭갈비","막국수"]},
  {"id":"dc21","slug":"dc21","name":"명봉닭갈비","category":"닭갈비","address":"강원특별자치도 춘천시 동면 만천리 71","phone":"033-261-7007","lat":37.8923,"lng":127.7488,"rating":4.2,"review_count":0,"price_range":"보통","tags":["직접재배채소","표고버섯","현지인숨은맛집","숯불"]},
  {"id":"dc22","slug":"dc22","name":"향토진미닭갈비 거두점","category":"닭갈비","address":"강원특별자치도 춘천시 거두동","phone":"033-261-0087","lat":37.8561,"lng":127.7135,"rating":4.1,"review_count":0,"price_range":"보통","tags":["숯불닭갈비","간장닭갈비","거두동"]},
  # 막국수
  {"id":"mk15","slug":"mk15","name":"남부막국수","category":"막국수","address":"강원특별자치도 춘천시 춘천로81번길 16","phone":"033-254-9401","lat":37.8731,"lng":127.7257,"rating":4.1,"review_count":0,"price_range":"저렴","tags":["생활의달인","유자간장양념","현지인추천","메밀"]},
  {"id":"mk16","slug":"mk16","name":"별당막국수","category":"막국수","address":"강원특별자치도 춘천시 약사동 151-7","phone":"033-254-9603","lat":37.8755,"lng":127.7272,"rating":4.2,"review_count":0,"price_range":"저렴","tags":["막국수","메밀전","편육","전통맛집"]},
  {"id":"mk17","slug":"mk17","name":"청송막국수","category":"막국수","address":"강원특별자치도 춘천시 신북읍 신북로","phone":"033-261-6788","lat":37.9321,"lng":127.7087,"rating":4.3,"review_count":0,"price_range":"저렴","tags":["막국수","편육","현지인추천"]},
  {"id":"mk18","slug":"mk18","name":"연산골막국수","category":"막국수","address":"강원특별자치도 춘천시 동면 연산골길 105","phone":"033-243-8881","lat":37.8978,"lng":127.7612,"rating":4.3,"review_count":0,"price_range":"저렴","tags":["막국수","블루리본","36년전통","1989년개업"]},
  {"id":"mk19","slug":"mk19","name":"시골막국수","category":"막국수","address":"강원특별자치도 춘천시 스무숲로","phone":"033-242-5282","lat":37.8612,"lng":127.7198,"rating":4.0,"review_count":0,"price_range":"저렴","tags":["막국수","총떡","현지인"]},
  {"id":"mk20","slug":"mk20","name":"동강막국수","category":"막국수","address":"강원특별자치도 춘천시 남면","phone":"033-262-4429","lat":37.8234,"lng":127.7145,"rating":4.1,"review_count":0,"price_range":"저렴","tags":["막국수","산나물","편육","비빔밥","계곡뷰"]},
  {"id":"mk21","slug":"mk21","name":"동해막국수","category":"막국수","address":"강원특별자치도 춘천시 동면","phone":"033-262-3838","lat":37.8978,"lng":127.7589,"rating":4.0,"review_count":0,"price_range":"저렴","tags":["막국수","닭갈비","세트메뉴"]},
  {"id":"mk22","slug":"mk22","name":"명가 시골막국수","category":"막국수","address":"강원특별자치도 춘천시 신사우동","phone":"033-252-6677","lat":37.8678,"lng":127.7234,"rating":4.1,"review_count":0,"price_range":"저렴","tags":["막국수","총떡","편육","시골맛"]},
  # 카페
  {"id":"cf16","slug":"cf16","name":"산토리니","category":"카페","address":"강원특별자치도 춘천시 동면 순환대로 1154-97","phone":"033-242-3010","lat":37.9012,"lng":127.7623,"rating":4.4,"review_count":0,"price_range":"보통","tags":["카페","브런치","그리스풍","구봉산","전망"]},
  {"id":"cf17","slug":"cf17","name":"쿠폴라","category":"카페","address":"강원특별자치도 춘천시 동면 순환대로 1154-111","phone":"033-242-9900","lat":37.9008,"lng":127.7618,"rating":4.5,"review_count":0,"price_range":"보통","tags":["카페","전망","구봉산","통유리","드라이브코스"]},
  {"id":"cf18","slug":"cf18","name":"그린보드","category":"카페","address":"강원특별자치도 춘천시 동내면 금촌로 35-2","phone":"0507-1340-0890","lat":37.8734,"lng":127.6912,"rating":4.3,"review_count":0,"price_range":"보통","tags":["카페","식물원카페","베이커리","대형카페"]},
  {"id":"cf19","slug":"cf19","name":"빵굽는카페","category":"카페","address":"강원특별자치도 춘천시 동내면 금촌로 64","phone":"033-261-8346","lat":37.8712,"lng":127.6889,"rating":4.2,"review_count":0,"price_range":"보통","tags":["카페","베이커리","동내면","한적한카페"]},
  {"id":"cf20","slug":"cf20","name":"로다운컵","category":"카페","address":"강원특별자치도 춘천시 중앙로","phone":"033-241-5588","lat":37.8812,"lng":127.7278,"rating":4.4,"review_count":0,"price_range":"보통","tags":["스페셜티커피","로컬카페","춘천대표카페"]},
  {"id":"cf21","slug":"cf21","name":"카페모요","category":"카페","address":"강원특별자치도 춘천시 효자동","phone":"033-244-8801","lat":37.8756,"lng":127.7189,"rating":4.3,"review_count":0,"price_range":"보통","tags":["스페셜티커피","싱글오리진","브루잉커피","로컬카페"]},
  {"id":"cf22","slug":"cf22","name":"투썸플레이스 춘천구봉산점","category":"카페","address":"강원특별자치도 춘천시 동면 순환대로","phone":"033-242-8800","lat":37.9011,"lng":127.7619,"rating":4.2,"review_count":0,"price_range":"보통","tags":["카페","전망","구봉산","스카이워크"]},
  # 베이커리
  {"id":"bk17","slug":"bk17","name":"밀봄숲베이커리","category":"베이커리","address":"강원특별자치도 춘천시 동산면 종자리로 224-53","phone":"033-244-7788","lat":37.9134,"lng":127.6845,"rating":4.4,"review_count":0,"price_range":"보통","tags":["화덕빵","유기농","우리밀","베이커리","주말만운영"]},
  {"id":"bk18","slug":"bk18","name":"그빵집","category":"베이커리","address":"강원특별자치도 춘천시 동면 금옥길 228","phone":"033-241-0020","lat":37.8945,"lng":127.7534,"rating":4.3,"review_count":0,"price_range":"보통","tags":["먹물빵","블루베리브레드","베이커리","동면","숨은맛집"]},
  {"id":"bk19","slug":"bk19","name":"곤트란쉐리에 춘천점","category":"베이커리","address":"강원특별자치도 춘천시 동면 순환대로 1154","phone":"033-242-7701","lat":37.9015,"lng":127.7621,"rating":4.3,"review_count":0,"price_range":"보통","tags":["베이커리","카페","구봉산","전망좋은카페","프랑스빵집"]},
  # 돈까스
  {"id":"dk14","slug":"dk14","name":"엠브로돈까스 춘천퇴계점","category":"돈까스","address":"강원특별자치도 춘천시 퇴계로93번길 10-8","phone":"033-261-1688","lat":37.8701,"lng":127.7389,"rating":4.3,"review_count":0,"price_range":"보통","tags":["경양식돈까스","치즈돈까스","땡초돈까스","퇴계동"]},
  {"id":"dk15","slug":"dk15","name":"엠브로돈까스 춘천거두점","category":"돈까스","address":"강원특별자치도 춘천시 거두동","phone":"033-261-2288","lat":37.8556,"lng":127.7128,"rating":4.2,"review_count":0,"price_range":"보통","tags":["경양식돈까스","수제돈까스","거두동"]},
  # 기타
  {"id":"etc17","slug":"etc17","name":"허밍면옥","category":"기타","address":"강원특별자치도 춘천시 충열로16번길 29","phone":"0507-1392-0714","lat":37.8823,"lng":127.7301,"rating":4.4,"review_count":0,"price_range":"보통","tags":["평양냉면","비빔냉면","숨은맛집","현지인추천","냉면"]},
  {"id":"etc18","slug":"etc18","name":"곰배령","category":"기타","address":"강원특별자치도 춘천시 춘천로 19","phone":"033-255-5500","lat":37.8642,"lng":127.7261,"rating":4.5,"review_count":0,"price_range":"고급","tags":["한정식","강원도토속음식","상견례","회갑","돌잔치"]},
  {"id":"etc19","slug":"etc19","name":"푸내음","category":"기타","address":"강원특별자치도 춘천시 신북읍 신북로","phone":"033-243-5252","lat":37.9267,"lng":127.7034,"rating":4.2,"review_count":0,"price_range":"보통","tags":["청국장","감자전","동동주","향토음식","숨은맛집"]},
  # 보쌈/족발
  {"id":"bj14","slug":"bj14","name":"황씨보쌈","category":"보쌈/족발","address":"강원특별자치도 춘천시 우석로79번길 16-16","phone":"033-256-8633","lat":37.8812,"lng":127.7345,"rating":4.5,"review_count":0,"price_range":"보통","tags":["보쌈","굴보쌈","족발","현지인1등","예약필수"]},
  # 삼계탕
  {"id":"sg212","slug":"sg212","name":"오리날다","category":"삼계탕","address":"강원특별자치도 춘천시 남면","phone":"033-262-1515","lat":37.7912,"lng":127.7089,"rating":4.3,"review_count":0,"price_range":"보통","tags":["오리백숙","닭백숙","토종닭","남이섬근처","감자전"]},
  # 한우
  {"id":"hw15","slug":"hw15","name":"춘천육가공","category":"한우","address":"강원특별자치도 춘천시 거두동","phone":"033-261-9292","lat":37.8534,"lng":127.7134,"rating":4.1,"review_count":0,"price_range":"보통","tags":["한우","정육식당","삼겹살","현지인추천"]},
]

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates",
}

data = json.dumps(restaurants).encode("utf-8")
req = urllib.request.Request(BASE_URL, data=data, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as resp:
        print(f"성공: {resp.status} - {len(restaurants)}개 식당 추가 완료")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"실패 ({e.code}): {body[:1000]}")
