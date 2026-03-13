import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminPin, jsonResponse, CORS_HEADERS } from "../_shared/adminAuth.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function hasFaces(imageBuffer: ArrayBuffer, googleApiKey: string): Promise<boolean> {
  try {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ image: { content: base64 }, features: [{ type: "FACE_DETECTION", maxResults: 1 }] }],
        }),
      }
    );
    if (!visionRes.ok) { console.warn("Vision API error:", visionRes.status); return false; }
    const data = await visionRes.json();
    return (data.responses?.[0]?.faceAnnotations ?? []).length > 0;
  } catch { return false; }
}

// ─── Action Handlers ─────────────────────────────────────────────────────────

async function handleRestaurantCRUD(action: string, data: any, supabase: any) {
  switch (action) {
    case "insert": {
      const { error } = await supabase.from("restaurants").insert(data);
      if (error) throw error;
      return { success: true };
    }
    case "update": {
      const { id, ...rest } = data;
      const { error } = await supabase.from("restaurants").update(rest).eq("id", id);
      if (error) throw error;
      return { success: true };
    }
    case "delete": {
      const { error } = await supabase.from("restaurants").delete().eq("id", data.id);
      if (error) throw error;
      return { success: true };
    }
    case "bulk_update_category": {
      const { error } = await supabase
        .from("restaurants")
        .update({ category: data.new_category })
        .eq("category", data.old_category);
      if (error) throw error;
      return { success: true };
    }
    default: return null;
  }
}

async function handleCategoryActions(action: string, data: any, supabase: any) {
  switch (action) {
    case "category_insert": {
      const { error } = await supabase.from("categories").insert(data);
      if (error) throw error;
      return { success: true };
    }
    case "category_update": {
      const { id, ...rest } = data;
      const { error } = await supabase.from("categories").update(rest).eq("id", id);
      if (error) throw error;
      return { success: true };
    }
    case "category_delete": {
      const { error } = await supabase.from("categories").delete().eq("id", data.id);
      if (error) throw error;
      return { success: true };
    }
    case "category_reorder": {
      for (const u of data.updates) {
        const { error } = await supabase.from("categories").update({ sort_order: u.sort_order }).eq("id", u.id);
        if (error) throw error;
      }
      return { success: true };
    }
    default: return null;
  }
}

async function handleTipActions(action: string, data: any, supabase: any) {
  switch (action) {
    case "list_tips": {
      const { data: tips, error } = await supabase.from("tips").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return { success: true, tips };
    }
    case "delete_tip": {
      const { error } = await supabase.from("tips").delete().eq("id", data.id);
      if (error) throw error;
      return { success: true };
    }
    case "update_tip_status": {
      const { error } = await supabase.from("tips").update({ status: data.status }).eq("id", data.id);
      if (error) throw error;
      return { success: true };
    }
    case "approve_tip": {
      const { error: tipErr } = await supabase.from("tips").update({ status: "approved" }).eq("id", data.tip_id);
      if (tipErr) throw tipErr;

      const { data: catData } = await supabase
        .from("categories")
        .select("id_prefix, tag_suggestions")
        .eq("id", data.category)
        .single();

      const prefix = catData?.id_prefix || "xx";
      const { data: existing } = await supabase.from("restaurants").select("id").like("id", `${prefix}%`);
      let maxNum = 0;
      if (existing) {
        for (const r of existing) {
          const m = r.id.match(new RegExp(`^${prefix}(\\d+)$`));
          if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
        }
      }
      const newId = `${prefix}${String(maxNum + 1).padStart(3, "0")}`;

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
- 위도(lat)는 37.8~37.95, 경도(lng)는 127.65~127.8 범위 내여야 함 (춘천시 범위).
- 확실하지 않은 정보는 null로 작성해.

아래 JSON 형식으로만 답변해:
{"name":"","address":"","phone":"","lat":0,"lng":0,"price_range":"","tags":[],"description":"","opening_hours":"","closed_days":"","rating":0,"review_count":0}`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableApiKey}` },
            body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: aiPrompt }], temperature: 0.1 }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "");
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) aiInfo = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (aiErr) {
        console.error("AI search failed:", aiErr);
      }

      const restaurant = {
        id: newId,
        name: aiInfo.name || data.restaurant_name,
        category: data.category,
        address: aiInfo.address || data.address || "춘천시",
        phone: aiInfo.phone || null,
        lat: (aiInfo.lat > 37.7 && aiInfo.lat < 38.0) ? aiInfo.lat : (data.lat || 37.8813),
        lng: (aiInfo.lng > 127.5 && aiInfo.lng < 127.9) ? aiInfo.lng : (data.lng || 127.7298),
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
      return { success: true, restaurant };
    }
    default: return null;
  }
}

async function handleImageActions(action: string, data: any, supabase: any) {
  const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

  if (action === "upload_image") {
    const { restaurant_id, base64, content_type, file_ext } = data;
    if (!restaurant_id || !base64) throw new Error("restaurant_id and base64 are required");

    const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (googleApiKey && await hasFaces(buffer.buffer, googleApiKey)) {
      return jsonResponse({ success: false, error: "사람 얼굴이 포함된 사진은 업로드할 수 없습니다" }, 400);
    }

    const filePath = `${restaurant_id}.${file_ext || "jpg"}`;
    await supabase.storage.from("restaurant-images").remove([filePath]);
    const { error: uploadErr } = await supabase.storage.from("restaurant-images").upload(filePath, buffer, {
      contentType: content_type || "image/jpeg", upsert: true,
    });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from("restaurant-images").getPublicUrl(filePath);
    const { error: updateErr } = await supabase.from("restaurants").update({ image_url: urlData.publicUrl }).eq("id", restaurant_id);
    if (updateErr) throw updateErr;
    return { success: true, image_url: urlData.publicUrl };
  }

  if (action === "delete_image") {
    const { restaurant_id: rid } = data;
    const { data: rest } = await supabase.from("restaurants").select("image_url").eq("id", rid).single();
    if (rest?.image_url) {
      const urlParts = rest.image_url.split("/restaurant-images/");
      if (urlParts[1]) await supabase.storage.from("restaurant-images").remove([urlParts[1]]);
    }
    const { error: delErr } = await supabase.from("restaurants").update({ image_url: null }).eq("id", rid);
    if (delErr) throw delErr;
    return { success: true };
  }

  // Fetch images from Naver Image Search
  if (action === "fetch_naver_images") {
    const naverClientId = Deno.env.get("NAVER_CLIENT_ID");
    const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
    if (!naverClientId || !naverClientSecret) throw new Error("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다");

    let targets: { id: string; name: string; address: string }[] = [];
    if (data?.id) {
      const { data: rests } = await supabase.from("restaurants").select("id,name,address").eq("id", data.id);
      targets = rests ?? [];
    } else {
      const { data: rests } = await supabase.from("restaurants").select("id,name,address").is("image_url", null);
      targets = rests ?? [];
    }

    const results = [];
    for (const restaurant of targets) {
      try {
        const q = encodeURIComponent(`${restaurant.name} 춘천 맛집`);
        const searchRes = await fetch(`https://openapi.naver.com/v1/search/image.json?query=${q}&display=5&filter=large`, {
          headers: { "X-Naver-Client-Id": naverClientId, "X-Naver-Client-Secret": naverClientSecret },
        });
        if (!searchRes.ok) { results.push({ id: restaurant.id, name: restaurant.name, success: false, error: `API 오류 (${searchRes.status})` }); continue; }

        const searchData = await searchRes.json();
        const items = searchData.items ?? [];
        if (!items.length) { results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "이미지 없음" }); continue; }

        let buf: ArrayBuffer | null = null;
        let ct = "image/jpeg";
        for (const item of items) {
          const candidate = item.thumbnail || item.link;
          if (!candidate?.startsWith("http")) continue;
          const imgRes = await fetch(candidate, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.naver.com/" } });
          if (!imgRes.ok) continue;
          ct = imgRes.headers.get("content-type") || "";
          if (!ct.includes("image")) continue;
          const imgBuf = await imgRes.arrayBuffer();
          if (googleApiKey && await hasFaces(imgBuf, googleApiKey)) continue;
          buf = imgBuf; break;
        }
        if (!buf) { results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "적합한 이미지 없음" }); continue; }

        const ext = ct.includes("png") ? "png" : "jpg";
        const { error: uploadErr } = await supabase.storage.from("restaurant-images").upload(`${restaurant.id}.${ext}`, buf, { contentType: ct, upsert: true });
        if (uploadErr) { results.push({ id: restaurant.id, name: restaurant.name, success: false, error: uploadErr.message }); continue; }

        const { data: urlData } = supabase.storage.from("restaurant-images").getPublicUrl(`${restaurant.id}.${ext}`);
        await supabase.from("restaurants").update({ image_url: urlData.publicUrl }).eq("id", restaurant.id);
        results.push({ id: restaurant.id, name: restaurant.name, success: true });
      } catch (e: any) {
        results.push({ id: restaurant.id, name: restaurant.name, success: false, error: e.message });
      }
    }
    return { success: true, results };
  }

  // Fetch images from Google Places
  if (action === "fetch_restaurant_images") {
    if (!googleApiKey) throw new Error("GOOGLE_PLACES_API_KEY가 설정되지 않았습니다");

    let targets: { id: string; name: string; address: string }[] = [];
    if (data?.id) {
      const { data: rests } = await supabase.from("restaurants").select("id,name,address").eq("id", data.id);
      targets = rests ?? [];
    } else {
      const { data: rests } = await supabase.from("restaurants").select("id,name,address").is("image_url", null);
      targets = rests ?? [];
    }

    const results = [];
    for (const restaurant of targets) {
      try {
        const findRes = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(restaurant.name + " 춘천")}&inputtype=textquery&fields=place_id&key=${googleApiKey}`);
        const findData = await findRes.json();
        const placeId = findData.candidates?.[0]?.place_id;
        if (!placeId) { results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "장소 없음" }); continue; }

        const detailsRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${googleApiKey}`);
        const detailsData = await detailsRes.json();
        const photoRefs: string[] = (detailsData.result?.photos ?? []).slice(0, 5).map((p: any) => p.photo_reference).filter(Boolean);
        if (!photoRefs.length) { results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "사진 없음" }); continue; }

        let buf: ArrayBuffer | null = null;
        let ct = "image/jpeg";
        for (const ref of photoRefs) {
          const photoRes = await fetch(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${googleApiKey}`);
          if (!photoRes.ok) continue;
          const imgBuf = await photoRes.arrayBuffer();
          if (await hasFaces(imgBuf, googleApiKey)) continue;
          buf = imgBuf; ct = photoRes.headers.get("content-type") || "image/jpeg"; break;
        }
        if (!buf) { results.push({ id: restaurant.id, name: restaurant.name, success: false, error: "얼굴 없는 사진 없음" }); continue; }

        const ext = ct.includes("png") ? "png" : "jpg";
        const { error: uploadErr } = await supabase.storage.from("restaurant-images").upload(`${restaurant.id}.${ext}`, buf, { contentType: ct, upsert: true });
        if (uploadErr) { results.push({ id: restaurant.id, name: restaurant.name, success: false, error: uploadErr.message }); continue; }

        const { data: urlData } = supabase.storage.from("restaurant-images").getPublicUrl(`${restaurant.id}.${ext}`);
        await supabase.from("restaurants").update({ image_url: urlData.publicUrl }).eq("id", restaurant.id);
        results.push({ id: restaurant.id, name: restaurant.name, success: true });
      } catch (e: any) {
        results.push({ id: restaurant.id, name: restaurant.name, success: false, error: e.message });
      }
    }
    return { success: true, results };
  }

  return null;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ipHint =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";

  try {
    const body = await req.json();
    const { action, pin, data } = body;

    // Auth gate
    const auth = await verifyAdminPin(supabase, pin, ipHint);
    if (!auth.success) return auth.response!;

    if (action === "verify") return jsonResponse({ success: true });

    if (action === "change_pin") {
      const { new_pin } = data;
      if (!new_pin || new_pin.length < 4 || new_pin.length > 8)
        return jsonResponse({ success: false, error: "PIN은 4~8자리여야 합니다" }, 400);
      const { error } = await supabase.from("admin_settings").update({ pin_hash: new_pin, updated_at: new Date().toISOString() }).eq("id", "default");
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    // Route to handler groups
    const result =
      await handleRestaurantCRUD(action, data, supabase) ??
      await handleCategoryActions(action, data, supabase) ??
      await handleTipActions(action, data, supabase) ??
      await handleImageActions(action, data, supabase);

    if (result === null) return jsonResponse({ success: false, error: "Unknown action" }, 400);

    // handleImageActions can return a Response directly (for error cases like face detection)
    if (result instanceof Response) return result;

    return jsonResponse(result);
  } catch (err: unknown) {
    console.error("admin-api error:", err);
    return jsonResponse({ success: false, error: err instanceof Error ? err.message : "서버 오류" }, 500);
  }
});
