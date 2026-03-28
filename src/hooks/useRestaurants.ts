import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Restaurant {
  id: string;
  slug: string;
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
  description?: string;
  imageUrl?: string;
  extraImages?: string[];
  openingHours?: string;
  closedDays?: string;
  createdAt?: string;
  cityId?: string;
  isRecommended?: boolean;
}

const getCacheKey = (cityId?: string) => cityId ? `restaurants_cache_${cityId}` : "restaurants_cache";

const loadCache = (cityId?: string): Restaurant[] | null => {
  try {
    const raw = localStorage.getItem(getCacheKey(cityId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveCache = (data: Restaurant[], cityId?: string) => {
  try { localStorage.setItem(getCacheKey(cityId), JSON.stringify(data)); } catch {}
};

/** DB row → Restaurant 매핑 */
const mapRow = (r: any, cityId?: string): Restaurant => ({
  id: r.id,
  slug: r.slug ?? r.id,
  name: r.name,
  category: r.category,
  address: r.address,
  phone: r.phone ?? "",
  rating: Number(r.rating),
  reviewCount: r.review_count,
  lat: r.lat,
  lng: r.lng,
  priceRange: r.price_range ?? "",
  tags: r.tags ?? [],
  description: r.description ?? undefined,
  imageUrl: r.image_url ?? undefined,
  extraImages: r.extra_images ?? [],
  openingHours: r.opening_hours ?? undefined,
  closedDays: r.closed_days ?? undefined,
  createdAt: r.created_at ?? undefined,
  cityId: r.city_id ?? cityId,
  isRecommended: r.is_recommended ?? false,
});

export const useRestaurants = (cityId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = cityId ? ["restaurants", cityId] : ["restaurants"];

  const query = useQuery({
    queryKey,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
    placeholderData: loadCache(cityId) ?? undefined,
    queryFn: async (): Promise<Restaurant[]> => {
      let q = (supabase
        .from("restaurants")
        .select("*")
        .eq("is_hidden", false)
        .order("review_count", { ascending: false })) as any;

      if (cityId) {
        q = q.eq("city_id", cityId);
      }

      const { data, error } = await q;
      if (error) throw error;

      const mapped = (data ?? []).map((r: any) => mapRow(r, cityId));
      saveCache(mapped, cityId);
      return mapped;
    },
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("restaurants-realtime-" + (cityId ?? "all"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        (payload) => {
          // payload로 즉시 캐시 업데이트 (네트워크 재조회 없이 바로 반영)
          if (payload.eventType === "INSERT") {
            const r = payload.new as any;
            if (cityId && r.city_id !== cityId) return;
            queryClient.setQueryData<Restaurant[]>(queryKey, (old) => {
              if (!old) return [mapRow(r, cityId)];
              if (old.some((item) => item.id === r.id)) return old;
              return [...old, mapRow(r, cityId)];
            });
          } else if (payload.eventType === "UPDATE") {
            const r = payload.new as any;
            queryClient.setQueryData<Restaurant[]>(queryKey, (old) =>
              old ? old.map((item) => item.id === r.id ? mapRow(r, cityId) : item) : old
            );
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as any).id;
            queryClient.setQueryData<Restaurant[]>(queryKey, (old) =>
              old ? old.filter((item) => item.id !== oldId) : old
            );
          }

          // 캐시 동기화 보장용 백그라운드 재조회 (300ms 디바운스)
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient, cityId]);

  return query;
};
