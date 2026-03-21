import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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

export const useRestaurants = (cityId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = cityId ? ["restaurants", cityId] : ["restaurants"];

  const query = useQuery({
    queryKey,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: loadCache(cityId) ?? undefined,
    queryFn: async (): Promise<Restaurant[]> => {
      let q = (supabase
        .from("restaurants")
        .select("*")
        .order("review_count", { ascending: false })) as any;

      if (cityId) {
        q = q.eq("city_id", cityId);
      }

      const { data, error } = await q;
      if (error) throw error;

      const mapped = (data ?? []).map((r: any) => ({
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
      }));
      saveCache(mapped, cityId);
      return mapped;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("restaurants-realtime-" + (cityId ?? "all"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, cityId]);

  return query;
};
