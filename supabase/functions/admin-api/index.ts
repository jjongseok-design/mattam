import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extract IP hint from headers for rate limiting
  const ipHint = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";

  try {
    const body = await req.json();
    const { action, pin, data } = body;

    // --- Check brute-force lockout BEFORE PIN verification ---
    const lockoutCutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabase
      .from("admin_login_attempts")
      .select("id")
      .eq("ip_hint", ipHint)
      .eq("success", false)
      .gte("attempted_at", lockoutCutoff);

    if (recentAttempts && recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `너무 많은 로그인 시도입니다. ${LOCKOUT_MINUTES}분 후에 다시 시도해주세요.`,
          locked: true 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Verify PIN ---
    const { data: settings, error: settingsErr } = await supabase
      .from("admin_settings")
      .select("pin_hash")
      .eq("id", "default")
      .single();

    if (settingsErr || !settings) {
      return new Response(
        JSON.stringify({ success: false, error: "설정을 불러올 수 없습니다" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pin !== settings.pin_hash) {
      // Log failed attempt
      await supabase.from("admin_login_attempts").insert({
        ip_hint: ipHint,
        success: false,
      });

      // Count remaining attempts
      const { data: updatedAttempts } = await supabase
        .from("admin_login_attempts")
        .select("id")
        .eq("ip_hint", ipHint)
        .eq("success", false)
        .gte("attempted_at", lockoutCutoff);

      const remaining = MAX_LOGIN_ATTEMPTS - (updatedAttempts?.length || 0);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: remaining > 0 
            ? `PIN이 일치하지 않습니다 (${remaining}회 남음)` 
            : `너무 많은 로그인 시도입니다. ${LOCKOUT_MINUTES}분 후에 다시 시도해주세요.`,
          locked: remaining <= 0,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful attempt (resets lockout for this IP)
    await supabase.from("admin_login_attempts").insert({
      ip_hint: ipHint,
      success: true,
    });

    // --- Handle actions ---
    let result;

    switch (action) {
      case "verify": {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      case "change_pin": {
        const { new_pin } = data;
        if (!new_pin || new_pin.length < 4 || new_pin.length > 8) {
          return new Response(
            JSON.stringify({ success: false, error: "PIN은 4~8자리여야 합니다" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("admin_settings")
          .update({ pin_hash: new_pin, updated_at: new Date().toISOString() })
          .eq("id", "default");
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

      case "fetch_restaurant_images": {
        const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
        if (!googleApiKey) {
          throw new Error("GOOGLE_PLACES_API_KEY가 Supabase 시크릿에 설정되지 않았습니다");
        }

        // Determine targets: specific ID or all without images
        let targets: { id: string; name: string; address: string }[] = [];
        if (data?.id) {
          const { data: rests } = await supabase
            .from("restaurants")
            .select("id,name,address")
            .eq("id", data.id);
          targets = rests ?? [];
        } else {
          const { data: rests } = await supabase
            .from("restaurants")
            .select("id,name,address")
            .is("image_url", null);
          targets = rests ?? [];
        }

        const results: { id: string; name: string; success: boolean; error?: string }[] = [];

        for (const restaurant of targets) {
          try {
            // Step 1: Find Place
            const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(restaurant.name + " 춘천")}&inputtype=textquery&fields=place_id&key=${googleApiKey}`;
            const findRes = await fetch(findUrl);
            const findData = await findRes.json();
            const placeId = findData.candidates?.[0]?.place_id;
            if (!placeId) {
              results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "장소를 찾을 수 없음" });
              continue;
            }

            // Step 2: Get Place Details (photos)
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${googleApiKey}`;
            const detailsRes = await fetch(detailsUrl);
            const detailsData = await detailsRes.json();
            const photoRef = detailsData.result?.photos?.[0]?.photo_reference;
            if (!photoRef) {
              results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "사진 없음" });
              continue;
            }

            // Step 3: Fetch photo (follows redirect to actual image)
            const photoFetchUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${googleApiKey}`;
            const photoRes = await fetch(photoFetchUrl);
            if (!photoRes.ok) {
              results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "사진 다운로드 실패" });
              continue;
            }

            // Step 4: Upload to Supabase Storage
            const imageBuffer = await photoRes.arrayBuffer();
            const contentType = photoRes.headers.get("content-type") || "image/jpeg";
            const ext = contentType.includes("png") ? "png" : "jpg";
            const { error: uploadErr } = await supabase.storage
              .from("restaurant-images")
              .upload(`${restaurant.id}.${ext}`, imageBuffer, {
                contentType,
                upsert: true,
              });
            if (uploadErr) {
              results.push({ id: restaurant.id, name: restaurant.name, success: false, error: uploadErr.message });
              continue;
            }

            // Step 5: Get public URL and update restaurant
            const { data: urlData } = supabase.storage
              .from("restaurant-images")
              .getPublicUrl(`${restaurant.id}.${ext}`);
            const publicUrl = urlData.publicUrl;

            await supabase
              .from("restaurants")
              .update({ image_url: publicUrl })
              .eq("id", restaurant.id);

            results.push({ id: restaurant.id, name: restaurant.name, success: true });
          } catch (e: any) {
            console.error("Image fetch error for", restaurant.name, e);
            results.push({ id: restaurant.id, name: restaurant.name, success: false, error: e.message });
          }
        }

        result = { success: true, results };
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
        const { restaurant_id, base64, content_type, file_ext } = data;
        if (!restaurant_id || !base64) throw new Error("restaurant_id and base64 are required");
        
        const filePath = `${restaurant_id}.${file_ext || "jpg"}`;
        const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        
        // Delete existing image if any
        await supabase.storage.from("restaurant-images").remove([filePath]);
        
        const { error: uploadErr } = await supabase.storage
          .from("restaurant-images")
          .upload(filePath, buffer, {
            contentType: content_type || "image/jpeg",
            upsert: true,
          });
        if (uploadErr) throw uploadErr;
        
        const { data: urlData } = supabase.storage
          .from("restaurant-images")
          .getPublicUrl(filePath);
        
        // Update restaurant image_url
        const { error: updateErr } = await supabase
          .from("restaurants")
          .update({ image_url: urlData.publicUrl })
          .eq("id", restaurant_id);
        if (updateErr) throw updateErr;
        
        result = { success: true, image_url: urlData.publicUrl };
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
