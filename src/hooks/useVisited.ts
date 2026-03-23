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

      // first-visited 동기화 (is_first_visit 컬럼 필요 → 실패해도 OK)
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

  /**
   * toggle(id):
   *  - 미방문 → 첫방문 기록 (is_first_visit=true), visited=true
   *  - 이미 방문 → 방문 취소 (DB 삭제), visited=false
   * (재방문 기록은 RestaurantCard에서 직접 처리)
   */
  const toggle = useCallback(
    (id: string) => {
      if (!visited.has(id)) {
        // ── 첫 방문 ──
        setVisited((prev) => {
          const next = new Set(prev);
          next.add(id);
          saveLocal(next);
          return next;
        });
        const firstVisited = loadFirstVisited();
        firstVisited.add(id);
        saveFirstVisited(firstVisited);

        // 낙관적 업데이트: 클릭 즉시 카운트 반영
        queryClient.setQueryData<Record<string, number>>(
          ["first-visitor-counts"],
          (old) => ({ ...(old ?? {}), [id]: ((old ?? {})[id] ?? 0) + 1 })
        );
        queryClient.setQueryData<number>(
          ["visit-count", id],
          (old) => (old ?? 0) + 1
        );

        supabase
          .from("device_visits")
          .insert({ device_id: deviceId, restaurant_id: id, is_first_visit: true })
          .then(({ error }) => {
            if (error) {
              console.warn("[useVisited] first visit error:", error.message);
              // 롤백
              queryClient.setQueryData<Record<string, number>>(
                ["first-visitor-counts"],
                (old) => ({ ...(old ?? {}), [id]: Math.max(0, ((old ?? {})[id] ?? 1) - 1) })
              );
              queryClient.setQueryData<number>(["visit-count", id], (old) => Math.max(0, (old ?? 1) - 1));
            } else {
              queryClient.invalidateQueries({ queryKey: ["first-visitor-counts"] });
              queryClient.invalidateQueries({ queryKey: ["visit-count", id] });
            }
          });
      } else {
        // ── 방문 취소 (기존 기록 삭제) ──
        setVisited((prev) => {
          const next = new Set(prev);
          next.delete(id);
          saveLocal(next);
          return next;
        });

        // 낙관적 업데이트: 클릭 즉시 카운트 감소
        queryClient.setQueryData<Record<string, number>>(
          ["first-visitor-counts"],
          (old) => ({ ...(old ?? {}), [id]: Math.max(0, ((old ?? {})[id] ?? 1) - 1) })
        );
        queryClient.setQueryData<number>(["visit-count", id], (old) => Math.max(0, (old ?? 1) - 1));

        supabase
          .from("device_visits")
          .delete()
          .eq("device_id", deviceId)
          .eq("restaurant_id", id)
          .then(({ error }) => {
            if (error) {
              console.warn("[useVisited] cancel visit error:", error.message);
              // 롤백
              setVisited((prev) => {
                const next = new Set(prev);
                next.add(id);
                saveLocal(next);
                return next;
              });
              queryClient.setQueryData<Record<string, number>>(
                ["first-visitor-counts"],
                (old) => ({ ...(old ?? {}), [id]: ((old ?? {})[id] ?? 0) + 1 })
              );
              queryClient.setQueryData<number>(["visit-count", id], (old) => (old ?? 0) + 1);
            } else {
              queryClient.invalidateQueries({ queryKey: ["first-visitor-counts"] });
              queryClient.invalidateQueries({ queryKey: ["visit-count", id] });
            }
          });
      }
    },
    [deviceId, visited, queryClient]
  );

  const isVisited = useCallback((id: string) => visited.has(id), [visited]);

  return { visited, toggle, isVisited };
};
