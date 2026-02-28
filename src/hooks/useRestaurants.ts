import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Restaurant {
  id: string;
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
}

export const useRestaurants = () => {
  return useQuery({
    queryKey: ["restaurants"],
    queryFn: async (): Promise<Restaurant[]> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("review_count", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((r) => ({
        id: r.id,
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
      }));
    },
  });
};
