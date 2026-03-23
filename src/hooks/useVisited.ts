import { useState, useCallback, useEffect } from "react";
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

  // 앱 시작 시 Supabase에서 병합 동기화
  useEffect(() => {
    const sync = async () => {
      try {
        const { data } = await supabase
          .from("device_visits")
          .select("restaurant_id, is_first_visit")
          .eq("device_id", deviceId);
        if (!data) return;

        // visited 동기화 (distinct restaurant_ids)
        setVisited((prev) => {
          const merged = new Set(prev);
          data.forEach((r: { restaurant_id: string }) => merged.add(r.restaurant_id));
          saveLocal(merged);
          return merged;
        });

        // first-visited 동기화 (DB에서 첫방문 기록 가져와 localStorage 갱신)
        const firstVisited = loadFirstVisited();
        data
          .filter((r: { is_first_visit: boolean }) => r.is_first_visit)
          .forEach((r: { restaurant_id: string }) => firstVisited.add(r.restaurant_id));
        saveFirstVisited(firstVisited);
      } catch {}
    };
    sync();
  }, [deviceId]);

  const toggle = useCallback(
    (id: string) => {
      setVisited((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          // 방문 취소: 해당 기기의 모든 방문 기록 삭제
          next.delete(id);
          supabase
            .from("device_visits")
            .delete()
            .eq("device_id", deviceId)
            .eq("restaurant_id", id)
            .then(({ error }) => {
              if (error) setVisited((s) => { const r = new Set(s); r.add(id); saveLocal(r); return r; });
            });
        } else {
          // 방문 표시: 첫방문 여부 판별 후 insert
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
              if (error) setVisited((s) => { const r = new Set(s); r.delete(id); saveLocal(r); return r; });
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
