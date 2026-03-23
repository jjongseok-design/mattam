import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";

const STORAGE_KEY = "visited-restaurants";
const FIRST_VISIT_KEY = "first-visited-restaurants";

const loadLocal = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveLocal = (set: Set<string>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
};

const loadFirstVisited = (): Set<string> => {
  try {
    const raw = localStorage.getItem(FIRST_VISIT_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveFirstVisited = (set: Set<string>) => {
  localStorage.setItem(FIRST_VISIT_KEY, JSON.stringify([...set]));
};

export const useVisited = () => {
  const [visited, setVisited] = useState<Set<string>>(loadLocal);
  const deviceId = getDeviceId();
  const queryClient = useQueryClient();

  // 앱 시작 시 Supabase에서 병합 동기화
  useEffect(() => {
    const sync = async () => {
      // 1. visited 동기화 (restaurant_id만 조회 → 안정적)
      try {
        const { data } = await supabase
          .from("device_visits")
          .select("restaurant_id")
          .eq("device_id", deviceId);
        if (data) {
          setVisited((prev) => {
            const merged = new Set(prev);
            const seen = new Set<string>();
            data.forEach((r: { restaurant_id: string }) => {
              if (!seen.has(r.restaurant_id)) {
                seen.add(r.restaurant_id);
                merged.add(r.restaurant_id);
              }
            });
            saveLocal(merged);
            return merged;
          });
        }
      } catch {}

      // 2. first-visited 동기화 (is_first_visit 컬럼 필요 → 실패해도 OK)
      try {
        const { data: firstData } = await supabase
          .from("device_visits")
          .select("restaurant_id, is_first_visit")
          .eq("device_id", deviceId)
          .eq("is_first_visit", true);
        if (firstData) {
          const firstVisited = loadFirstVisited();
          firstData.forEach((r: { restaurant_id: string }) => firstVisited.add(r.restaurant_id));
          saveFirstVisited(firstVisited);
        }
      } catch {}
    };
    sync();
  }, [deviceId]);

  const toggle = useCallback(
    (id: string) => {
      setVisited((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          // 방문 취소: DB에서 해당 기기의 모든 방문 기록 삭제 (낙관적 업데이트)
          next.delete(id);
          supabase
            .from("device_visits")
            .delete()
            .eq("device_id", deviceId)
            .eq("restaurant_id", id)
            .then(({ error }) => {
              if (error) {
                console.warn("[useVisited] delete error:", error.message);
              } else {
                queryClient.invalidateQueries({ queryKey: ["first-visitor-counts"] });
                queryClient.invalidateQueries({ queryKey: ["visit-count", id] });
              }
            });
        } else {
          // 방문 표시: 첫방문 여부 판별 후 insert (낙관적 업데이트)
          next.add(id);
          const firstVisited = loadFirstVisited();
          const isFirstVisit = !firstVisited.has(id);
          if (isFirstVisit) {
            firstVisited.add(id);
            saveFirstVisited(firstVisited);
          }
          supabase
            .from("device_visits")
            .insert({ device_id: deviceId, restaurant_id: id, is_first_visit: isFirstVisit })
            .then(({ error }) => {
              if (error) {
                console.warn("[useVisited] insert error:", error.message);
              } else {
                queryClient.invalidateQueries({ queryKey: ["first-visitor-counts"] });
                queryClient.invalidateQueries({ queryKey: ["visit-count", id] });
              }
            });
        }
        saveLocal(next);
        return next;
      });
    },
    [deviceId]
  );

  const isVisited = useCallback((id: string) => visited.has(id), [visited]);

  return { visited, toggle, isVisited };
};
