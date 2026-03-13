import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Restaurant {
  id: string;
  /** URL-friendly identifier used in /restaurant/:slug routes. Falls back to id. */
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
}

export const useRestaurants = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["restaurants"],
    queryFn: async (): Promise<Restaurant[]> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("review_count", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((r: any) => ({
        id: r.id,
        slug: r.slug ?? r.id, // falls back to id until migration runs
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
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("restaurants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["restaurants"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
