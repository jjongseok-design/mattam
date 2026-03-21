import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { City } from "@/types/city";

// Static fallback in case the cities table doesn't exist yet
const FALLBACK_CITIES: City[] = [
  {
    id: "chuncheon",
    name: "춘천",
    description: "강원도 춘천시",
    lat: 37.8813,
    lng: 127.73,
    zoom: 12,
    bounds: {
      sw: { lat: 37.734, lng: 127.58 },
      ne: { lat: 38.02, lng: 127.92 },
    },
    isActive: true,
    comingSoon: false,
    restaurantCount: 0,
  },
];

const mapRow = (row: any): City => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  lat: row.lat ?? 37.5,
  lng: row.lng ?? 127.0,
  zoom: row.zoom ?? 12,
  bounds: {
    sw: { lat: row.bounds_sw_lat ?? 37.0, lng: row.bounds_sw_lng ?? 126.5 },
    ne: { lat: row.bounds_ne_lat ?? 38.0, lng: row.bounds_ne_lng ?? 127.5 },
  },
  isActive: row.is_active ?? true,
  comingSoon: row.coming_soon ?? false,
  restaurantCount: row.restaurant_count ?? 0,
  imageUrl: row.image_url ?? undefined,
});

export const useCities = () => {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async (): Promise<City[]> => {
      const { data, error } = await supabase
        .from("cities" as any)
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        console.warn("cities table not found, using fallback:", error.message);
        return FALLBACK_CITIES;
      }
      const cities = (data ?? []).map(mapRow);
      return cities.length > 0 ? cities : FALLBACK_CITIES;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCity = (cityId: string | undefined) => {
  return useQuery({
    queryKey: ["city", cityId],
    queryFn: async (): Promise<City | null> => {
      if (!cityId) return null;
      const { data, error } = await supabase
        .from("cities" as any)
        .select("*")
        .eq("id", cityId)
        .single();

      if (error || !data) {
        // Try to find in fallback
        return FALLBACK_CITIES.find((c) => c.id === cityId) ?? null;
      }
      return mapRow(data);
    },
    enabled: !!cityId,
    staleTime: 1000 * 60 * 5,
  });
};
