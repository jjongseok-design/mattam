import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./useDeviceId";

const STORAGE_KEY = "visited-restaurants";

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

export const useVisited = () => {
  const [visited, setVisited] = useState<Set<string>>(loadLocal);
  const deviceId = getDeviceId();

  // 앱 시작 시 Supabase에서 병합 동기화
  useEffect(() => {
    const sync = async () => {
      try {
        const { data } = await supabase
          .from("device_visits")
          .select("restaurant_id")
          .eq("device_id", deviceId);
        if (!data) return;
        setVisited((prev) => {
          const merged = new Set(prev);
          data.forEach((r: { restaurant_id: string }) => merged.add(r.restaurant_id));
          saveLocal(merged);
          return merged;
        });
      } catch {}
    };
    sync();
  }, [deviceId]);

  const toggle = useCallback(
    (id: string) => {
      setVisited((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          supabase
            .from("device_visits")
            .delete()
            .eq("device_id", deviceId)
            .eq("restaurant_id", id)
            .then(() => {});
        } else {
          next.add(id);
          supabase
            .from("device_visits")
            .upsert({ device_id: deviceId, restaurant_id: id })
            .then(() => {});
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
