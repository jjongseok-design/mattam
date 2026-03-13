import { useMemo } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";
import { getDistanceKm } from "@/hooks/useGeolocation";
import type { SortOption, FilterOption } from "@/components/SortFilterBar";

interface FilterParams {
  restaurants: Restaurant[];
  category: string;
  query: string;
  sort: SortOption;
  filter: FilterOption;
  ratingMin: number;
  position: { lat: number; lng: number } | null;
  isFavorite: (id: string) => boolean;
  isVisited: (id: string) => boolean;
}

interface FilterResult {
  filtered: Restaurant[];
  categoryRestaurants: Restaurant[];
  isGlobalSearch: boolean;
  /** All distances pre-computed for `filtered` list, keyed by restaurant id */
  distanceMap: Record<string, number | null>;
}

export function useFilteredRestaurants({
  restaurants,
  category,
  query,
  sort,
  filter,
  ratingMin,
  position,
  isFavorite,
  isVisited,
}: FilterParams): FilterResult {
  // Stage 1: Category slice
  const categoryRestaurants = useMemo(
    () => restaurants.filter((r) => r.category === category),
    [restaurants, category]
  );

  const isGlobalSearch = query.trim().length > 0;

  // Stage 2: Text search + filter conditions
  const afterFilter = useMemo(() => {
    let list = isGlobalSearch ? restaurants : categoryRestaurants;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q)) ||
          r.address.includes(q) ||
          r.category.includes(q)
      );
    }

    if (filter === "favorites") {
      list = list.filter((r) => isFavorite(r.id));
    } else if (filter === "visited") {
      list = list.filter((r) => isVisited(r.id));
    }

    if (ratingMin > 0) {
      list = list.filter((r) => r.rating >= ratingMin);
    }

    return list;
  }, [query, categoryRestaurants, restaurants, isGlobalSearch, filter, ratingMin, isFavorite, isVisited]);

  // Stage 3: Distance cache — compute once for current list
  const distanceMap = useMemo<Record<string, number | null>>(() => {
    if (!position) return {};
    const map: Record<string, number | null> = {};
    for (const r of afterFilter) {
      map[r.id] = getDistanceKm(position.lat, position.lng, r.lat, r.lng);
    }
    return map;
  }, [afterFilter, position]);

  // Stage 4: Sort
  const filtered = useMemo(() => {
    return [...afterFilter].sort((a, b) => {
      if (sort === "distance" && position) {
        return (distanceMap[a.id] ?? Infinity) - (distanceMap[b.id] ?? Infinity);
      }
      if (sort === "reviews") {
        return b.reviewCount - a.reviewCount || b.rating - a.rating;
      }
      if (sort === "newest") {
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      }
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    });
  }, [afterFilter, sort, position, distanceMap]);

  return { filtered, categoryRestaurants, isGlobalSearch, distanceMap };
}
