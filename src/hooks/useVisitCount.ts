import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** 식당 상세용: 총 방문 횟수 (첫방문 + 재방문 합계) */
export const useVisitCount = (restaurantId: string | undefined) => {
  return useQuery({
    queryKey: ["visit-count", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      const { count, error } = await supabase
        .from("device_visits")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
};

/** 카드 목록용: 식당별 첫 방문자 수 맵 { restaurant_id: count } */
export const useFirstVisitorCounts = () => {
  return useQuery({
    queryKey: ["first-visitor-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_visits")
        .select("restaurant_id, is_first_visit");

      // is_first_visit 컬럼 없으면 전체 방문 수로 폴백
      if (error) {
        console.warn("[useFirstVisitorCounts] is_first_visit 쿼리 실패, 폴백 사용:", error.message);
        const { data: fallback } = await supabase
          .from("device_visits")
          .select("restaurant_id");
        const map: Record<string, number> = {};
        (fallback ?? []).forEach((row: { restaurant_id: string }) => {
          map[row.restaurant_id] = (map[row.restaurant_id] ?? 0) + 1;
        });
        return map;
      }

      const map: Record<string, number> = {};
      (data ?? []).forEach((row: { restaurant_id: string; is_first_visit: boolean | null }) => {
        if (row.is_first_visit !== false) {
          map[row.restaurant_id] = (map[row.restaurant_id] ?? 0) + 1;
        }
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/** 관리자용: { firstVisitors: {id: count}, totalVisits: {id: count} } */
export const useAllVisitCounts = (enabled: boolean) => {
  return useQuery({
    queryKey: ["visit-counts-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_visits")
        .select("restaurant_id, is_first_visit");
      if (error) {
        console.warn("[useAllVisitCounts] error:", error.message);
        return { firstVisitors: {} as Record<string, number>, totalVisits: {} as Record<string, number> };
      }
      const firstVisitors: Record<string, number> = {};
      const totalVisits: Record<string, number> = {};
      (data ?? []).forEach((row: { restaurant_id: string; is_first_visit: boolean | null }) => {
        totalVisits[row.restaurant_id] = (totalVisits[row.restaurant_id] ?? 0) + 1;
        if (row.is_first_visit !== false) {
          firstVisitors[row.restaurant_id] = (firstVisitors[row.restaurant_id] ?? 0) + 1;
        }
      });
      return { firstVisitors, totalVisits };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};
