import json, urllib.request, urllib.error

SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8"
BASE_URL = "https://cblckdcrsotqynngblyb.supabase.co/rest/v1/restaurants"

restaurants = [
  # 부대찌개
  {"id":"hs17","slug":"hs17","name":"권바우부대찌개 춘천본점","category":"국밥/탕류","address":"강원특별자치도 춘천시 솟발1길 4-13","phone":"033-262-0019","lat":37.8812,"lng":127.7298,"rating":4.5,"review_count":0,"price_range":"보통","tags":["부대찌개","수제햄","발칸포생햄","TV방영","KBS생생정보","SBS"]},
  {"id":"hs18","slug":"hs18","name":"소문난의정부부대찌개 춘천시청점","category":"국밥/탕류","address":"강원특별자치도 춘천시 시청길10번길 8 2층","phone":"0507-1420-4770","lat":37.8808,"lng":127.7319,"rating":4.2,"review_count":0,"price_range":"보통","tags":["부대찌개","의정부식","곱창부대찌개","넓은홀","시청인근"]},
  {"id":"hs19","slug":"hs19","name":"45년의정부부대찌개 강원대직영점","category":"국밥/탕류","address":"강원특별자치도 춘천시 효자동 615-12","phone":"033-251-3428","lat":37.8710,"lng":127.7449,"rating":4.3,"review_count":0,"price_range":"저렴","tags":["부대찌개","의정부원조식","45년전통","강원대","학생맛집"]},
  {"id":"hs20","slug":"hs20","name":"찰스부대찌개","category":"국밥/탕류","address":"강원특별자치도 춘천시 서부대성로 195","phone":"033-251-1222","lat":37.8718,"lng":127.7388,"rating":4.1,"review_count":0,"price_range":"저렴","tags":["부대찌개","강원대후문","푸짐한양","학생가"]},
  {"id":"hs21","slug":"hs21","name":"아부찌부대찌개 춘천점","category":"국밥/탕류","address":"강원특별자치도 춘천시 퇴계동 971-5","phone":"033-911-6562","lat":37.8753,"lng":127.7212,"rating":4.1,"review_count":0,"price_range":"보통","tags":["부대찌개","퇴계동","현지인맛집"]},
  {"id":"hs22","slug":"hs22","name":"박가네부대찌개 춘천점","category":"국밥/탕류","address":"강원특별자치도 춘천시 효자동 강원대학길","phone":"033-251-4500","lat":37.8705,"lng":127.7438,"rating":4.0,"review_count":0,"price_range":"저렴","tags":["부대찌개","수제햄","강원대앞","학생가대표"]},
  # 순두부찌개
  {"id":"hs23","slug":"hs23","name":"원순두부","category":"국밥/탕류","address":"강원특별자치도 춘천시 서부대성로48번길 19 1층","phone":"033-244-2653","lat":37.8821,"lng":127.7195,"rating":4.5,"review_count":0,"price_range":"저렴","tags":["순두부찌개","국산콩","직접제조","해물순두부","아침식사","연중무휴"]},
  {"id":"hs24","slug":"hs24","name":"콩사랑마을","category":"국밥/탕류","address":"강원특별자치도 춘천시 퇴계동 1136-2","phone":"0507-1393-2180","lat":37.8758,"lng":127.7185,"rating":4.2,"review_count":0,"price_range":"보통","tags":["순두부찌개","콩요리전문","두부제육두루치기","남춘천역인근"]},
  {"id":"hs25","slug":"hs25","name":"정무네두부","category":"국밥/탕류","address":"강원특별자치도 춘천시 동면 연산골길 34","phone":"033-911-5501","lat":37.8952,"lng":127.7548,"rating":4.3,"review_count":0,"price_range":"보통","tags":["순두부찌개","두부전골","두부구이","정무네정식","전용주차장"]},
  {"id":"hs26","slug":"hs26","name":"최가네진순두부","category":"국밥/탕류","address":"강원특별자치도 춘천시 남산면 강촌로 327 1층","phone":"033-262-3400","lat":37.8345,"lng":127.6638,"rating":4.2,"review_count":0,"price_range":"보통","tags":["순두부찌개","13종선택","강촌","화요일휴무"]},
  {"id":"hs27","slug":"hs27","name":"강릉초당짬뽕순두부 춘천점","category":"국밥/탕류","address":"강원특별자치도 춘천시 효자동 767-2 102호","phone":"033-256-8989","lat":37.8702,"lng":127.7461,"rating":4.1,"review_count":0,"price_range":"보통","tags":["순두부찌개","초당식","짬뽕순두부","강릉식","해물국물"]},
  {"id":"hs28","slug":"hs28","name":"골목순두부집","category":"국밥/탕류","address":"강원특별자치도 춘천시 중앙로 28","phone":"","lat":37.8818,"lng":127.7281,"rating":4.3,"review_count":0,"price_range":"저렴","tags":["순두부찌개","콩국수","점심대기","현지인단골","골목명물"]},
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
