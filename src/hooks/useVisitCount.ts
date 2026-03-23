import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";

/** 식당 상세용: 총 방문 횟수 */
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
    staleTime: 0,
  });
};

/** 상세용: 이 기기가 이 식당에 방문한 횟수 */
export const useMyVisitCount = (restaurantId: string | undefined) => {
  const deviceId = getDeviceId();
  return useQuery({
    queryKey: ["my-visit-count", restaurantId, deviceId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      const { count, error } = await supabase
        .from("device_visits")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("device_id", deviceId);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!restaurantId,
    staleTime: 0,
  });
};

/** 카드 목록용: 식당별 방문 수 맵 { restaurant_id: count } */
export const useFirstVisitorCounts = () => {
  return useQuery({
    queryKey: ["first-visitor-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_visits")
        .select("restaurant_id");

      if (error) {
        console.warn("[useFirstVisitorCounts] 쿼리 실패:", error.message);
        return {} as Record<string, number>;
      }

      const map: Record<string, number> = {};
      (data ?? []).forEach((row: { restaurant_id: string }) => {
        map[row.restaurant_id] = (map[row.restaurant_id] ?? 0) + 1;
      });
      return map;
    },
    staleTime: 0,
  });
};

/** 관리자용: { firstVisitors: {id: count}, totalVisits: {id: count} } */
export const useAllVisitCounts = (enabled: boolean) => {
  return useQuery({
    queryKey: ["visit-counts-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_visits")
        .select("restaurant_id");
      if (error) {
        console.warn("[useAllVisitCounts] error:", error.message);
        return { firstVisitors: {} as Record<string, number>, totalVisits: {} as Record<string, number> };
      }
      const totalVisits: Record<string, number> = {};
      (data ?? []).forEach((row: { restaurant_id: string }) => {
        totalVisits[row.restaurant_id] = (totalVisits[row.restaurant_id] ?? 0) + 1;
      });
      // 관리자 페이지에서 firstVisitors = totalVisits (is_first_visit 구분 없이 표시)
      return { firstVisitors: totalVisits, totalVisits };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};
