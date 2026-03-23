import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** 특정 식당의 방문자 수 (device_visits 기준 고유 기기 수) */
export const useVisitCount = (restaurantId: string | undefined) => {
  return useQuery({
    queryKey: ["visit-count", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      const { count, error } = await supabase
        .from("device_visits")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
};

/** 전체 식당 방문 통계 (관리자용) — { restaurant_id: count } */
export const useAllVisitCounts = (enabled: boolean) => {
  return useQuery({
    queryKey: ["visit-counts-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_visits")
        .select("restaurant_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((row: { restaurant_id: string }) => {
        map[row.restaurant_id] = (map[row.restaurant_id] ?? 0) + 1;
      });
      return map;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};
