import { useState, useCallback } from "react";

const STORAGE_KEY = "recently-viewed-restaurants";
const MAX_ITEMS = 20;

const load = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const save = (list: string[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export const useRecentlyViewed = () => {
  const [recentIds, setRecentIds] = useState<string[]>(load);

  const addViewed = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_ITEMS);
      save(next);
      return next;
    });
  }, []);

  const removeViewed = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = prev.filter((x) => x !== id);
      save(next);
      return next;
    });
  }, []);

  const clearAllViewed = useCallback(() => {
    save([]);
    setRecentIds([]);
  }, []);

  return { recentIds, addViewed, removeViewed, clearAllViewed };
};
