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

  try {
    const body = await req.json();
    const { action, pin, data } = body;

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
      return new Response(
        JSON.stringify({ success: false, error: "PIN이 일치하지 않습니다" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
            const searchQuery = `춘천 ${data.restaurant_name} ${data.address || ""} 식당 정보`;
            const aiPrompt = `춘천시에 있는 "${data.restaurant_name}" 식당의 실제 정보를 알려줘.
카테고리: ${data.category}
제보된 주소: ${data.address || "없음"}
제보 사유: ${data.reason || "없음"}

다음 JSON 형식으로만 답변해. 정확하지 않은 정보는 null로 해:
{
  "address": "정확한 도로명주소 (강원특별자치도 춘천시 ...)",
  "phone": "전화번호 (033-xxx-xxxx)",
  "lat": 위도(숫자),
  "lng": 경도(숫자),
  "price_range": "가격대 (예: ₩7,000~₩12,000)",
  "tags": ["대표메뉴1", "대표메뉴2"],
  "description": "한줄 설명",
  "opening_hours": "영업시간 (예: 11:00~21:00)",
  "closed_days": "휴무일 (예: 매주 월요일)",
  "rating": 네이버 평점(숫자),
  "review_count": 네이버 리뷰수(숫자)
}

JSON만 출력하고 다른 텍스트는 쓰지 마.`;

            const aiRes = await fetch("https://ai-gateway.lovable.dev/chat/completions", {
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
              // Extract JSON from response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiInfo = JSON.parse(jsonMatch[0]);
                console.log("AI restaurant info:", aiInfo);
              }
            }
          }
        } catch (aiErr) {
          console.error("AI search failed, using defaults:", aiErr);
        }

        // 4. Insert restaurant with AI-enriched data
        const restaurant = {
          id: newId,
          name: data.restaurant_name,
          category: data.category,
          address: aiInfo.address || data.address || "춘천시",
          phone: aiInfo.phone || null,
          lat: aiInfo.lat || data.lat || 37.8813,
          lng: aiInfo.lng || data.lng || 127.7298,
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
  } catch (err) {
    console.error("admin-api error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "서버 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
