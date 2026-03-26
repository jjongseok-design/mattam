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
        const { error } = await supabase.from("restaurants").insert(data);
        if (error) throw error;
        result = { success: true };
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
          return {
            name: stripHtml(item.title ?? ""),
            address: stripHtml(item.roadAddress || item.address || ""),
            phone: stripHtml(item.telephone ?? ""),
            lat: valid ? lat : null,
            lng: valid ? lng : null,
            dist,
          };
        });

        // 도시 중심 30km 이내만 필터링 (cityLat/Lng 제공 시)
        const filtered = mapped.filter((item: any) =>
          !cityLat || item.dist === null || item.dist <= 30
        );

        // 거리 가까운 순 정렬
        filtered.sort((a: any, b: any) => {
          if (a.dist === null) return 1;
          if (b.dist === null) return -1;
          return a.dist - b.dist;
        });

        result = { success: true, items: filtered };
        break;
      }

      case "fetch_naver_info": {
        // 네이버 지역 검색으로 식당 정보(전화번호, 주소, 영업시간) 업데이트
        const naverClientId = Deno.env.get("NAVER_CLIENT_ID");
        const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
        if (!naverClientId || !naverClientSecret) {
          throw new Error("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다");
        }

        const { id: targetId } = data;
        const { data: rest } = await supabase
          .from("restaurants")
          .select("id,name,address,phone,opening_hours,closed_days")
          .eq("id", targetId)
          .single();
        if (!rest) throw new Error("식당을 찾을 수 없습니다");

        // 네이버 지역 검색
        const query = encodeURIComponent(`${rest.name}`);
        const searchRes = await fetch(
          `https://openapi.naver.com/v1/search/local.json?query=${query}&display=5`,
          { headers: { "X-Naver-Client-Id": naverClientId, "X-Naver-Client-Secret": naverClientSecret } }
        );
        if (!searchRes.ok) throw new Error(`네이버 지역 검색 오류 (${searchRes.status})`);
        const searchData = await searchRes.json();
        const items: any[] = searchData.items ?? [];

        if (items.length === 0) {
          result = { success: false, error: "네이버에서 해당 식당을 찾을 수 없습니다" };
          break;
        }

        // 주소 키워드로 가장 관련된 결과 선택
        const addressKeyword = rest.address?.replace(/춘천시?|강원도?/g, "").trim() ?? "";
        const best = items.find(i =>
          (i.roadAddress || i.address || "").includes(addressKeyword.slice(0, 5))
        ) ?? items[0];

        // HTML 태그 제거
        const stripHtml = (s: string) => s?.replace(/<[^>]+>/g, "") ?? "";

        const updates: Record<string, any> = {};
        const phone = stripHtml(best.telephone ?? "").trim();
        const roadAddr = stripHtml(best.roadAddress ?? "").trim();
        const addr = stripHtml(best.address ?? "").trim();

        if (phone) updates.phone = phone;
        if (roadAddr) updates.address = roadAddr;
        else if (addr) updates.address = addr;

        // 좌표 변환 (Naver mapx/mapy는 경도/위도 × 10^7)
        if (best.mapx && best.mapy) {
          const lng = parseInt(best.mapx) / 10000000;
          const lat = parseInt(best.mapy) / 10000000;
          if (lat > 33 && lat < 39 && lng > 124 && lng < 132) {
            updates.lat = lat;
            updates.lng = lng;
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("restaurants").update(updates).eq("id", targetId);
        }

        result = { success: true, updates, name: stripHtml(best.title ?? rest.name) };
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
    const message = err instanceof Error ? err.message : "서버 오류";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
