import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // --- Verify JWT ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, error: "인증이 필요합니다" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: "인증이 유효하지 않습니다" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if user is admin
  const { data: adminRecord } = await supabase
    .from("admin_emails")
    .select("email")
    .eq("email", user.email)
    .single();

  if (!adminRecord) {
    return new Response(
      JSON.stringify({ success: false, error: "관리자 권한이 없습니다" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { action, data } = body;

    // --- Handle actions ---
    let result;

    switch (action) {
      case "insert": {
        // ID는 클라이언트가 보낸 값을 기준으로 하되,
        // 전체 DB에서 같은 prefix를 가진 최대 번호를 확인해 충돌을 방지
        const clientId: string = data.id ?? "";
        const prefixMatch = clientId.match(/^([a-z]+)/);
        const prefix = prefixMatch ? prefixMatch[1] : "";

        let safeId = clientId;
        if (prefix) {
          const { data: existing } = await supabase
            .from("restaurants")
            .select("id")
            .like("id", `${prefix}%`);
          const maxNum = (existing ?? []).reduce((max: number, r: any) => {
            const m = r.id.match(new RegExp(`^${prefix}(\\d+)$`));
            return m ? Math.max(max, parseInt(m[1])) : max;
          }, 0);
          safeId = `${prefix}${String(maxNum + 1).padStart(2, "0")}`;
        }

        const { error } = await supabase.from("restaurants").insert({ ...data, id: safeId });
        if (error) throw error;
        result = { success: true, id: safeId };
        break;
      }

      case "update": {
        const { id, ...rest } = data;
        const { error } = await supabase.from("restaurants").update(rest).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "delete": {
        const { error } = await supabase.from("restaurants").delete().eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }


      case "list_tips": {
        const { data: tips, error } = await supabase
          .from("tips")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = { success: true, tips };
        break;
      }

      case "delete_tip": {
        const { error } = await supabase.from("tips").delete().eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update_tip_status": {
        const { error } = await supabase
          .from("tips")
          .update({ status: data.status })
          .eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "approve_tip": {
        // 1. Update tip status to approved
        const { error: tipErr } = await supabase
          .from("tips")
          .update({ status: "approved" })
          .eq("id", data.tip_id);
        if (tipErr) throw tipErr;

        // 2. Generate restaurant ID based on category prefix
        const { data: catData } = await supabase
          .from("categories")
          .select("id_prefix, tag_suggestions")
          .eq("id", data.category)
          .single();
        
        const prefix = catData?.id_prefix || "xx";
        
        const { data: existing } = await supabase
          .from("restaurants")
          .select("id")
          .like("id", `${prefix}%`);
        
        let maxNum = 0;
        if (existing) {
          for (const r of existing) {
            const m = r.id.match(new RegExp(`^${prefix}(\\d+)$`));
            if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
          }
        }
        const newId = `${prefix}${String(maxNum + 1).padStart(3, "0")}`;

        // 3. Use AI to search for real restaurant info
        let aiInfo: any = {};
        try {
          const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
          if (lovableApiKey) {
            const aiPrompt = `너는 한국 춘천시 식당 데이터 조사원이야. 아래 식당의 실제 정보를 최대한 정확하게 알려줘.

식당명: "${data.restaurant_name}"
카테고리: ${data.category}
제보된 주소 힌트: ${data.address || "춘천시 퇴계동 부근"}
제보 사유: ${data.reason || "없음"}

[중요 지침]
- 춘천시에 실제로 존재하는 식당 기준으로 답변해.
- 프랜차이즈인 경우 춘천 지점 정보를 찾아줘.
- 위도(lat)는 37.8~37.95, 경도(lng)는 127.65~127.8 범위 내여야 함 (춘천시 범위).
- 확실하지 않은 정보는 null로 작성해.
- 리뷰수는 네이버 기준 방문자리뷰+블로그리뷰 합산 추정치.

아래 JSON 형식으로만 답변해 (마크다운 코드블록 없이 순수 JSON만):
{
  "name": "정확한 식당명 (지점명 포함)",
  "address": "정확한 도로명주소",
  "phone": "전화번호 (033-xxx-xxxx 형식)",
  "lat": 37.xxxx,
  "lng": 127.xxxx,
  "price_range": "₩X,000~₩XX,000",
  "tags": ["대표메뉴1", "대표메뉴2", "대표메뉴3"],
  "description": "한줄 설명 (20자 이내)",
  "opening_hours": "HH:MM~HH:MM",
  "closed_days": "휴무일 또는 null",
  "rating": 평점(0~5 소수점 1자리),
  "review_count": 리뷰수(정수)
}`;

            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${lovableApiKey}`,
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "user", content: aiPrompt }
                ],
                temperature: 0.1,
              }),
            });

            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const content = aiData.choices?.[0]?.message?.content || "";
              console.log("AI raw response:", content);
              const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "");
              const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiInfo = JSON.parse(jsonMatch[0]);
                console.log("AI parsed restaurant info:", JSON.stringify(aiInfo));
              }
            } else {
              const errText = await aiRes.text();
              console.error("AI gateway response error:", aiRes.status, errText);
            }
          } else {
            console.error("LOVABLE_API_KEY not found");
          }
        } catch (aiErr) {
          console.error("AI search failed, using defaults:", aiErr);
        }

        // 4. Insert restaurant with AI-enriched data
        const restaurant = {
          id: newId,
          name: aiInfo.name || data.restaurant_name,
          category: data.category,
          address: aiInfo.address || data.address || "춘천시",
          phone: aiInfo.phone || null,
          lat: (aiInfo.lat && aiInfo.lat > 37.7 && aiInfo.lat < 38.0) ? aiInfo.lat : (data.lat || 37.8813),
          lng: (aiInfo.lng && aiInfo.lng > 127.5 && aiInfo.lng < 127.9) ? aiInfo.lng : (data.lng || 127.7298),
          rating: aiInfo.rating || 0,
          review_count: aiInfo.review_count || 0,
          price_range: aiInfo.price_range || null,
          tags: aiInfo.tags || catData?.tag_suggestions?.slice(0, 3) || [],
          description: aiInfo.description || data.reason || null,
          opening_hours: aiInfo.opening_hours || null,
          closed_days: aiInfo.closed_days || null,
        };

        const { error: insertErr } = await supabase.from("restaurants").insert(restaurant);
        if (insertErr) throw insertErr;

        result = { success: true, restaurant };
        break;
      }

      case "fetch_naver_images": {
        const naverClientId = Deno.env.get("NAVER_CLIENT_ID");
        const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
        if (!naverClientId || !naverClientSecret) {
          throw new Error("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 Supabase 시크릿에 설정되지 않았습니다");
        }

        // Determine targets: specific ID, category, or all without images
        let targets: { id: string; name: string; address: string }[] = [];
        if (data?.id) {
          const { data: rests } = await supabase
            .from("restaurants")
            .select("id,name,address")
            .eq("id", data.id);
          targets = rests ?? [];
        } else if (data?.category) {
          const { data: rests } = await supabase
            .from("restaurants")
            .select("id,name,address")
            .eq("category", data.category);
          targets = rests ?? [];
        } else {
          const { data: rests } = await supabase
            .from("restaurants")
            .select("id,name,address");
          targets = rests ?? [];
        }

        const results: { id: string; name: string; success: boolean; error?: string }[] = [];

        // 이미지 다운로드 헬퍼
        const downloadImage = async (url: string): Promise<{ buf: ArrayBuffer; ct: string } | null> => {
          try {
            const res = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.naver.com/",
              },
            });
            if (!res.ok) return null;
            const ct = res.headers.get("content-type") || "";
            if (!ct.includes("image")) return null;
            const buf = await res.arrayBuffer();
            return { buf, ct };
          } catch {
            return null;
          }
        };

        // 네이버 이미지 검색 헬퍼
        const naverSearch = async (query: string, display = 5): Promise<any[]> => {
          const res = await fetch(
            `https://openapi.naver.com/v1/search/image.json?query=${encodeURIComponent(query)}&display=${display}&filter=large`,
            { headers: { "X-Naver-Client-Id": naverClientId, "X-Naver-Client-Secret": naverClientSecret } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return data.items ?? [];
        };

        for (const restaurant of targets) {
          try {
            const chosenNaverPhotos: { buf: ArrayBuffer; ct: string }[] = [];

            // Step 1: 간판 이미지 우선 검색 → 대표 이미지
            const signageItems = await naverSearch(`${restaurant.name} 간판`);
            for (const item of signageItems) {
              if (chosenNaverPhotos.length >= 1) break;
              const candidate = item.link || item.thumbnail;
              if (!candidate?.startsWith("http")) continue;
              const img = await downloadImage(candidate);
              if (img) chosenNaverPhotos.push(img);
            }

            // Step 2: 맛집 검색 → 나머지 4장
            const foodItems = await naverSearch(`${restaurant.name} 맛집`, 8);
            for (const item of foodItems) {
              if (chosenNaverPhotos.length >= 5) break;
              const candidate = item.link || item.thumbnail;
              if (!candidate?.startsWith("http")) continue;
              const img = await downloadImage(candidate);
              if (img) chosenNaverPhotos.push(img);
            }

            if (chosenNaverPhotos.length === 0) {
              results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "이미지 없음" });
              continue;
            }

            // Step 4: Upload all chosen photos to Supabase Storage
            const naverPublicUrls: string[] = [];
            for (let i = 0; i < chosenNaverPhotos.length; i++) {
              const { buf, ct } = chosenNaverPhotos[i];
              const ext = ct.includes("png") ? "png" : "jpg";
              const filePath = i === 0 ? `${restaurant.id}.${ext}` : `${restaurant.id}_${i}.${ext}`;
              const { error: uploadErr } = await supabase.storage
                .from("restaurant-images")
                .upload(filePath, buf, { contentType: ct, upsert: true });
              if (uploadErr) continue;
              const { data: urlData } = supabase.storage
                .from("restaurant-images")
                .getPublicUrl(filePath);
              naverPublicUrls.push(urlData.publicUrl);
            }
            if (naverPublicUrls.length === 0) {
              results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "업로드 실패" });
              continue;
            }

            // Step 5: Update restaurant (first = image_url, rest = extra_images)
            await supabase
              .from("restaurants")
              .update({ image_url: naverPublicUrls[0], extra_images: naverPublicUrls.slice(1) })
              .eq("id", restaurant.id);

            results.push({ id: restaurant.id, name: restaurant.name, success: true, count: naverPublicUrls.length });
          } catch (e: any) {
            console.error("Naver image fetch error for", restaurant.name, e);
            results.push({ id: restaurant.id, name: restaurant.name, success: false, error: e.message });
          }
        }

        result = { success: true, results };
        break;
      }

      case "preview_naver_images": {
        // 네이버 이미지 URL만 반환 (다운로드·저장 없음) — 미리보기용
        const naverClientId2 = Deno.env.get("NAVER_CLIENT_ID");
        const naverClientSecret2 = Deno.env.get("NAVER_CLIENT_SECRET");
        if (!naverClientId2 || !naverClientSecret2) {
          throw new Error("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다");
        }
        if (!data?.id) throw new Error("id가 필요합니다");

        const { data: restRows } = await supabase
          .from("restaurants")
          .select("id,name,address")
          .eq("id", data.id)
          .limit(1);
        const restaurant2 = restRows?.[0];
        if (!restaurant2) throw new Error("식당을 찾을 수 없습니다");

        const naverSearch2 = async (query: string, display = 8): Promise<any[]> => {
          const res = await fetch(
            `https://openapi.naver.com/v1/search/image.json?query=${encodeURIComponent(query)}&display=${display}&filter=large`,
            { headers: { "X-Naver-Client-Id": naverClientId2, "X-Naver-Client-Secret": naverClientSecret2 } }
          );
          if (!res.ok) return [];
          const d = await res.json();
          return d.items ?? [];
        };

        const signageItems2 = await naverSearch2(`${restaurant2.name} 간판`, 5);
        const foodItems2 = await naverSearch2(`${restaurant2.name} 맛집`, 8);
        const allItems = [...signageItems2, ...foodItems2];

        const seen = new Set<string>();
        const candidateUrls: string[] = [];
        for (const item of allItems) {
          const url = item.link || item.thumbnail;
          if (url?.startsWith("http") && !seen.has(url)) {
            seen.add(url);
            candidateUrls.push(url);
          }
        }

        result = { success: true, name: restaurant2.name, urls: candidateUrls };
        break;
      }

      case "save_naver_images": {
        // 선택된 URL을 다운로드 → Supabase Storage 업로드 → DB 저장
        if (!data?.id || !Array.isArray(data?.urls) || data.urls.length === 0) {
          throw new Error("id와 urls가 필요합니다");
        }

        const downloadImage2 = async (url: string): Promise<{ buf: ArrayBuffer; ct: string } | null> => {
          try {
            const res = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.naver.com/",
              },
            });
            if (!res.ok) return null;
            const ct = res.headers.get("content-type") || "";
            if (!ct.includes("image")) return null;
            const buf = await res.arrayBuffer();
            return { buf, ct };
          } catch {
            return null;
          }
        };

        const uploadedUrls: string[] = [];
        for (let i = 0; i < data.urls.length; i++) {
          const img = await downloadImage2(data.urls[i]);
          if (!img) continue;
          const ext = img.ct.includes("png") ? "png" : "jpg";
          const filePath = i === 0 ? `${data.id}.${ext}` : `${data.id}_${i}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("restaurant-images")
            .upload(filePath, img.buf, { contentType: img.ct, upsert: true });
          if (uploadErr) continue;
          const { data: urlData } = supabase.storage
            .from("restaurant-images")
            .getPublicUrl(filePath);
          uploadedUrls.push(urlData.publicUrl);
        }

        if (uploadedUrls.length === 0) throw new Error("업로드에 성공한 이미지가 없습니다");

        await supabase
          .from("restaurants")
          .update({ image_url: uploadedUrls[0], extra_images: uploadedUrls.slice(1) })
          .eq("id", data.id);

        result = { success: true, count: uploadedUrls.length };
        break;
      }

      case "search_kakao_place": {
        // 카카오 로컬 키워드 검색 → 식당명·주소·전화번호·좌표 반환 (신규 식당 폼용)
        const kakaoKey2 = Deno.env.get("KAKAO_REST_API_KEY");
        if (!kakaoKey2) throw new Error("KAKAO_REST_API_KEY가 설정되지 않았습니다");

        const { name: searchName2, cityName: cityName2, cityLat: cityLat2, cityLng: cityLng2 } = data;
        const query2 = cityName2 ? `${cityName2} ${searchName2}` : searchName2;

        const haversine2 = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const kakaoRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query2)}&size=10`,
          { headers: { Authorization: `KakaoAK ${kakaoKey2}` } }
        );
        if (!kakaoRes.ok) throw new Error(`카카오 검색 오류 (${kakaoRes.status})`);
        const kakaoData = await kakaoRes.json();
        const docs: any[] = kakaoData.documents ?? [];

        const mapped2 = docs.map((doc: any) => {
          const lat = parseFloat(doc.y);
          const lng = parseFloat(doc.x);
          const valid = lat > 33 && lat < 39 && lng > 124 && lng < 132;
          const dist = (cityLat2 && cityLng2 && valid) ? haversine2(cityLat2, cityLng2, lat, lng) : null;
          return {
            name: doc.place_name ?? "",
            address: doc.road_address_name || doc.address_name || "",
            phone: doc.phone ?? "",
            lat: valid ? lat : null,
            lng: valid ? lng : null,
            dist,
          };
        });

        const filtered2 = mapped2.filter((item: any) => {
          if (cityName2 && item.address) return item.address.includes(cityName2);
          return !cityLat2 || item.dist === null || item.dist <= 30;
        });
        filtered2.sort((a: any, b: any) => {
          if (a.dist === null) return 1;
          if (b.dist === null) return -1;
          return a.dist - b.dist;
        });

        result = { success: true, items: filtered2 };
        break;
      }

      case "search_naver_place": {
        // 식당명으로 네이버 지역 검색 → 도로명주소·전화번호·좌표 반환 (신규 식당 폼용)
        const naverClientId = Deno.env.get("NAVER_CLIENT_ID");
        const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
        if (!naverClientId || !naverClientSecret) throw new Error("NAVER 키 미설정");

        const stripHtml = (s: string) => s?.replace(/<[^>]+>/g, "") ?? "";
        const { name: searchName, cityName, cityLat, cityLng } = data;

        // 도시명을 포함한 검색어로 해당 도시 결과 우선 (없으면 식당명만)
        const query = cityName ? `${cityName} ${searchName}` : searchName;

        // Haversine 거리 계산 (km)
        const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        // 2페이지 병렬 요청으로 최대 10개 결과 수집
        const fetchPage = async (start: number): Promise<any[]> => {
          const res = await fetch(
            `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&start=${start}`,
            { headers: { "X-Naver-Client-Id": naverClientId!, "X-Naver-Client-Secret": naverClientSecret! } }
          );
          if (!res.ok) return [];
          const d = await res.json();
          return d.items ?? [];
        };

        const [page1, page2] = await Promise.all([fetchPage(1), fetchPage(6)]);
        const allRaw = [...page1, ...page2];

        const mapped = allRaw.map((item: any) => {
          const lat = parseInt(item.mapy) / 10000000;
          const lng = parseInt(item.mapx) / 10000000;
          const valid = lat > 33 && lat < 39 && lng > 124 && lng < 132;
          const dist = (cityLat && cityLng && valid) ? haversine(cityLat, cityLng, lat, lng) : null;
          const naverPlaceId = item.link?.match(/place\/(\d+)/)?.[1] ?? null;
          return {
            name: stripHtml(item.title ?? ""),
            address: stripHtml(item.roadAddress || item.address || ""),
            phone: stripHtml(item.telephone ?? ""),
            lat: valid ? lat : null,
            lng: valid ? lng : null,
            dist,
            naverPlaceId,
          };
        });

        // 도시명이 주소에 포함된 결과만 (cityName 있을 때)
        // 없으면 30km 이내 거리 필터로 폴백
        const filtered = mapped.filter((item: any) => {
          if (cityName && item.address) {
            return item.address.includes(cityName);
          }
          return !cityLat || item.dist === null || item.dist <= 30;
        });

        // 거리 가까운 순 정렬
        filtered.sort((a: any, b: any) => {
          if (a.dist === null) return 1;
          if (b.dist === null) return -1;
          return a.dist - b.dist;
        });

        result = { success: true, items: filtered };
        break;
      }

      case "fetch_naver_info":
      case "fetch_kakao_info": {
        // 카카오 로컬 API로 식당 정보(전화번호, 주소, 좌표) 업데이트
        const kakaoKey = Deno.env.get("KAKAO_REST_API_KEY");
        if (!kakaoKey) throw new Error("KAKAO_REST_API_KEY가 Supabase 시크릿에 설정되지 않았습니다");

        const { id: targetId } = data;
        const { data: rest } = await supabase
          .from("restaurants")
          .select("id,name,address,phone")
          .eq("id", targetId)
          .single();
        if (!rest) throw new Error("식당을 찾을 수 없습니다");

        const searchKakao = async (query: string): Promise<any[]> => {
          const res = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
            { headers: { Authorization: `KakaoAK ${kakaoKey}` } }
          );
          if (!res.ok) return [];
          const d = await res.json();
          return d.documents ?? [];
        };

        const normalizeAddr = (addr: string) =>
          (addr ?? "").replace(/^(강원특별자치도|강원도)\s*/, "").replace(/\s+/g, " ").trim().toLowerCase();

        const roadAddressMatches = (dbAddr: string, kakaoAddr: string) => {
          const db = normalizeAddr(dbAddr);
          const kakao = normalizeAddr(kakaoAddr);
          if (!db || !kakao) return false;
          const parts = db.split(" ").slice(0, 4);
          return parts.filter((p: string) => p.length > 1 && kakao.includes(p)).length >= 3;
        };

        const findMatch = (docs: any[]) => {
          for (const doc of docs) {
            const road = doc.road_address_name ?? "";
            const addr = doc.address_name ?? "";
            if (roadAddressMatches(rest.address, road) || roadAddressMatches(rest.address, addr)) {
              return doc;
            }
          }
          return null;
        };

        // 전략 1: 식당명 + 춘천
        let docs = await searchKakao(`${rest.name} 춘천`);
        let matched = findMatch(docs);

        // 전략 2: 식당명만
        if (!matched) {
          docs = await searchKakao(rest.name);
          matched = findMatch(docs);
        }

        if (!matched) {
          result = { success: false, error: "카카오에서 해당 식당을 찾을 수 없습니다" };
          break;
        }

        const updates: Record<string, any> = {};
        const roadAddr = matched.road_address_name?.trim();
        const phone = matched.phone?.trim();
        const lat = parseFloat(matched.y);
        const lng = parseFloat(matched.x);

        if (roadAddr) updates.address = roadAddr;
        if (phone) updates.phone = phone;
        if (lat > 33 && lat < 39 && lng > 124 && lng < 132) {
          updates.lat = lat;
          updates.lng = lng;
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("restaurants").update(updates).eq("id", targetId);
        }

        result = { success: true, updates, name: matched.place_name ?? rest.name };
        break;
      }

      case "bulk_update_category": {
        const { error } = await supabase
          .from("restaurants")
          .update({ category: data.new_category })
          .eq("category", data.old_category);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // === Category ID 변경 (트랜잭션) ===
      case "category_rename": {
        const { old_id, new_id, label, emoji, id_prefix, tag_placeholder, tag_suggestions, sort_order } = data;
        // 1. 새 카테고리 insert
        const { error: insertErr } = await supabase.from("categories").insert({
          id: new_id, label, emoji, id_prefix, tag_placeholder, tag_suggestions, sort_order,
        });
        if (insertErr) throw insertErr;
        // 2. 식당 일괄 이동
        const { error: updateErr } = await supabase
          .from("restaurants")
          .update({ category: new_id })
          .eq("category", old_id);
        if (updateErr) {
          await supabase.from("categories").delete().eq("id", new_id);
          throw updateErr;
        }
        // 3. 구 카테고리 삭제
        const { error: deleteErr } = await supabase.from("categories").delete().eq("id", old_id);
        if (deleteErr) {
          await supabase.from("restaurants").update({ category: old_id }).eq("category", new_id);
          await supabase.from("categories").delete().eq("id", new_id);
          throw deleteErr;
        }
        result = { success: true };
        break;
      }

      // === Category Management ===
      case "category_insert": {
        const { error } = await supabase.from("categories").insert(data);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "category_update": {
        const { id, ...rest } = data;
        const { error } = await supabase.from("categories").update(rest).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "category_delete": {
        const { error } = await supabase.from("categories").delete().eq("id", data.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "upload_image": {
        const { restaurant_id, base64, content_type, file_ext, slot } = data;
        if (!restaurant_id || !base64) throw new Error("restaurant_id and base64 are required");

        // 안전한 base64 디코드
        const binaryStr = atob(base64);
        const buffer = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) buffer[i] = binaryStr.charCodeAt(i);

        const ext = file_ext || "jpg";
        const isPrimary = !slot || slot === 0;
        // 추가 사진은 타임스탬프로 고유 파일명 생성
        const filePath = isPrimary
          ? `${restaurant_id}.${ext}`
          : `${restaurant_id}_u${Date.now()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("restaurant-images")
          .upload(filePath, buffer, { contentType: content_type || "image/jpeg", upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("restaurant-images").getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        // 현재 식당 이미지 상태 조회
        const { data: curRest } = await supabase
          .from("restaurants").select("image_url, extra_images").eq("id", restaurant_id).single();

        let updateFields: Record<string, unknown>;
        if (isPrimary) {
          updateFields = { image_url: publicUrl };
        } else {
          const extras: string[] = curRest?.extra_images ?? [];
          if (extras.length >= 4) throw new Error("추가 사진은 최대 4장(총 5장)까지 등록 가능합니다.");
          updateFields = { extra_images: [...extras, publicUrl] };
        }

        const { error: updateErr } = await supabase
          .from("restaurants").update(updateFields).eq("id", restaurant_id);
        if (updateErr) throw updateErr;

        result = { success: true, image_url: isPrimary ? publicUrl : undefined, extra_images: isPrimary ? undefined : [...(curRest?.extra_images ?? []), publicUrl] };
        break;
      }

      case "delete_image": {
        const { restaurant_id: rid } = data;
        // Get current image_url to find file path
        const { data: rest } = await supabase
          .from("restaurants")
          .select("image_url")
          .eq("id", rid)
          .single();
        
        if (rest?.image_url) {
          const urlParts = rest.image_url.split("/restaurant-images/");
          if (urlParts[1]) {
            await supabase.storage.from("restaurant-images").remove([urlParts[1]]);
          }
        }
        
        const { error: delErr } = await supabase
          .from("restaurants")
          .update({ image_url: null })
          .eq("id", rid);
        if (delErr) throw delErr;
        
        result = { success: true };
        break;
      }

      case "category_reorder": {
        for (const u of data.updates) {
          const { error } = await supabase
            .from("categories")
            .update({ sort_order: u.sort_order })
            .eq("id", u.id);
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("admin-api error:", err);
    let message = "서버 오류";
    if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === "object") {
      // PostgrestError 등 message 속성을 가진 객체 처리
      const e = err as any;
      message = e.message ?? e.error ?? e.details ?? JSON.stringify(err);
    }
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
