import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";

export interface Review {
  id: string;
  restaurant_id: string;
  device_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/** 특정 식당의 리뷰 목록 */
export const useReviews = (restaurantId: string | undefined) => {
  return useQuery({
    queryKey: ["reviews", restaurantId],
    queryFn: async (): Promise<Review[]> => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("id, restaurant_id, device_id, rating, comment, created_at")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("[useReviews] error:", error.message);
        return [];
      }
      return (data ?? []) as Review[];
    },
    enabled: !!restaurantId,
    staleTime: 2 * 60 * 1000,
  });
};

/** 내가 이 식당에 작성한 리뷰 */
export const useMyReview = (restaurantId: string | undefined) => {
  const deviceId = getDeviceId();
  return useQuery({
    queryKey: ["my-review", restaurantId, deviceId],
    queryFn: async (): Promise<Review | null> => {
      if (!restaurantId) return null;
      const { data } = await supabase
        .from("reviews")
        .select("id, restaurant_id, device_id, rating, comment, created_at")
        .eq("restaurant_id", restaurantId)
        .eq("device_id", deviceId)
        .maybeSingle();
      return (data as Review | null) ?? null;
    },
    enabled: !!restaurantId,
    staleTime: 2 * 60 * 1000,
  });
};

/** 전체 식당 평균 별점 맵 { restaurant_id: { avg, count } } */
export const useAllAvgRatings = () => {
  return useQuery({
    queryKey: ["all-avg-ratings"],
    queryFn: async (): Promise<Record<string, { avg: number; count: number }>> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("restaurant_id, rating");
      if (error) {
        console.warn("[useAllAvgRatings] error:", error.message);
        return {};
      }
      const map: Record<string, { sum: number; count: number }> = {};
      (data ?? []).forEach((row: { restaurant_id: string; rating: number }) => {
        if (!map[row.restaurant_id]) map[row.restaurant_id] = { sum: 0, count: 0 };
        map[row.restaurant_id].sum += row.rating;
        map[row.restaurant_id].count += 1;
      });
      const result: Record<string, { avg: number; count: number }> = {};
      for (const [id, { sum, count }] of Object.entries(map)) {
        result[id] = { avg: Math.round((sum / count) * 10) / 10, count };
      }
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};
