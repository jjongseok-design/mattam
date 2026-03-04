import { useState, useCallback } from "react";

const STORAGE_KEY = "visited-restaurants";

const load = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const save = (set: Set<string>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
};

export const useVisited = () => {
  const [visited, setVisited] = useState<Set<string>>(load);

  const toggle = useCallback((id: string) => {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      save(next);
      return next;
    });
  }, []);

  const isVisited = useCallback((id: string) => visited.has(id), [visited]);

  return { visited, toggle, isVisited };
};
