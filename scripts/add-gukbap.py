import json, urllib.request, urllib.error

SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGNrZGNyc290cXlubmdibHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3MTk1MSwiZXhwIjoyMDg4OTQ3OTUxfQ.8UI_YeAWEXp8AMLYCX-C2Pkcdi-X-Q4XNz3cu-gbMw8"
BASE_URL = "https://cblckdcrsotqynngblyb.supabase.co/rest/v1/restaurants"

restaurants = [
  # 순대국밥
  {"id":"hs01","slug":"hs01","name":"남부순대국","category":"국밥/탕류","address":"강원특별자치도 춘천시 효명길 7-66 1층","phone":"033-255-3372","lat":37.8803,"lng":127.7252,"rating":4.5,"review_count":0,"price_range":"보통","tags":["순대국밥","수육","술국","노포","2대운영","하정우단골","TV방영"]},
  {"id":"hs02","slug":"hs02","name":"가보자순대국","category":"국밥/탕류","address":"강원특별자치도 춘천시 신북읍 율문2길 11","phone":"033-243-7607","lat":37.9251,"lng":127.7320,"rating":4.3,"review_count":0,"price_range":"저렴","tags":["순대국밥","토렴식","아침식사","조기마감","오전7시오픈"]},
  {"id":"hs03","slug":"hs03","name":"길성식당","category":"국밥/탕류","address":"강원특별자치도 춘천시 명동길29번길 8-7","phone":"033-254-2411","lat":37.8832,"lng":127.7315,"rating":4.4,"review_count":0,"price_range":"저렴","tags":["순대국밥","소머리국밥","70년노포","중앙시장","현지인맛집"]},
  # 설렁탕
  {"id":"hs04","slug":"hs04","name":"감미옥","category":"국밥/탕류","address":"강원특별자치도 춘천시 춘천로 217","phone":"033-256-3808","lat":37.8769,"lng":127.7230,"rating":4.2,"review_count":0,"price_range":"보통","tags":["설렁탕","갈비탕","돌솥설렁탕","팔호광장"]},
  {"id":"hs05","slug":"hs05","name":"장우설렁탕","category":"국밥/탕류","address":"강원특별자치도 춘천시 춘천로 219","phone":"","lat":37.8770,"lng":127.7232,"rating":4.3,"review_count":0,"price_range":"보통","tags":["설렁탕","수육","사골육수","소면사리","전용주차장","팔호광장"]},
  # 곰탕
  {"id":"hs06","slug":"hs06","name":"전주장작불곰탕 춘천점","category":"국밥/탕류","address":"강원특별자치도 춘천시 동내면 영서로 1848 1층","phone":"","lat":37.8691,"lng":127.7080,"rating":4.3,"review_count":0,"price_range":"보통","tags":["곰탕","소머리곰탕","장작불","아침식사","오전6시오픈","가마솥"]},
  {"id":"hs07","slug":"hs07","name":"바우네나주곰탕 춘천명동점","category":"국밥/탕류","address":"강원특별자치도 춘천시 낙원길 22","phone":"","lat":37.8830,"lng":127.7320,"rating":4.1,"review_count":0,"price_range":"보통","tags":["나주곰탕","곰탕","명동","전통"]},
  # 추어탕
  {"id":"hs08","slug":"hs08","name":"남가네설악추어탕 춘천점","category":"국밥/탕류","address":"강원특별자치도 춘천시 우석로4번길 15","phone":"0507-1442-0770","lat":37.8920,"lng":127.7390,"rating":4.4,"review_count":0,"price_range":"보통","tags":["추어탕","통추어탕","얼큰이추어탕","연중무휴","석사동"]},
  # 콩나물국밥
  {"id":"hs09","slug":"hs09","name":"전주식콩나물국밥 시루향기","category":"국밥/탕류","address":"강원특별자치도 춘천시 동내면 영서로 1769","phone":"033-264-3005","lat":37.8695,"lng":127.7070,"rating":4.2,"review_count":0,"price_range":"저렴","tags":["콩나물국밥","전주식","해장국","현지인단골"]},
  {"id":"hs10","slug":"hs10","name":"한방전주콩나물국밥 춘천효자점","category":"국밥/탕류","address":"강원특별자치도 춘천시 공지로 216","phone":"","lat":37.8760,"lng":127.7200,"rating":4.1,"review_count":0,"price_range":"저렴","tags":["콩나물국밥","전주식","한방","해장국"]},
  # 해장국
  {"id":"hs11","slug":"hs11","name":"광치해장국","category":"국밥/탕류","address":"강원특별자치도 춘천시 소양로 108 1층","phone":"033-253-1100","lat":37.8880,"lng":127.7260,"rating":4.2,"review_count":0,"price_range":"저렴","tags":["해장국","선지해장국","아침식사","오전6시30분오픈"]},
  {"id":"hs12","slug":"hs12","name":"우리해장국","category":"국밥/탕류","address":"강원특별자치도 춘천시 우석로 43 1층","phone":"033-262-1370","lat":37.8910,"lng":127.7380,"rating":4.3,"review_count":0,"price_range":"저렴","tags":["해장국","내장탕","차돌양지육수","48시간육수","석사동"]},
  {"id":"hs13","slug":"hs13","name":"남부해장국","category":"국밥/탕류","address":"강원특별자치도 춘천시 퇴계로 12","phone":"033-257-7785","lat":37.8741,"lng":127.7340,"rating":4.1,"review_count":0,"price_range":"저렴","tags":["해장국","선지해장국","콩나물해장국","우거지해장국","24시간","남춘천역"]},
  {"id":"hs14","slug":"hs14","name":"장안해장국","category":"국밥/탕류","address":"강원특별자치도 춘천시 퇴계동","phone":"","lat":37.8750,"lng":127.7330,"rating":4.0,"review_count":0,"price_range":"저렴","tags":["해장국","사골우거지갈비해장국","내장탕","소고기해장국","주차가능"]},
  # 김치찌개
  {"id":"hs15","slug":"hs15","name":"초가 뭉텅찌개","category":"국밥/탕류","address":"강원특별자치도 춘천시 신북읍 율문길 107-1","phone":"033-241-0078","lat":37.9248,"lng":127.7275,"rating":4.7,"review_count":0,"price_range":"보통","tags":["김치찌개","뭉텅찌개","묵은지","덩어리고기","현지인강추","월요일휴무"]},
  {"id":"hs16","slug":"hs16","name":"꿀돼지 김치찌개","category":"국밥/탕류","address":"강원특별자치도 춘천시 동내면 거두택지길14번길 33","phone":"033-262-8393","lat":37.8680,"lng":127.7060,"rating":4.3,"review_count":0,"price_range":"저렴","tags":["김치찌개","계란말이","현지인맛집","일요일휴무"]},
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
