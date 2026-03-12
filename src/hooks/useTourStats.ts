import { useMemo } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";

interface CategoryStats {
  category: string;
  total: number;
  visited: number;
  percent: number;
  isMaster: boolean;
}

interface TourStats {
  totalRestaurants: number;
  totalVisited: number;
  overallPercent: number;
  rank: string;
  rankEmoji: string;
  categoryStats: CategoryStats[];
  masterCategories: string[];
}

const RANKS = [
  { min: 0, label: "맛집 입문자", emoji: "🌱" },
  { min: 5, label: "맛집 탐험가", emoji: "🧭" },
  { min: 15, label: "맛집 애호가", emoji: "😋" },
  { min: 30, label: "맛집 전문가", emoji: "⭐" },
  { min: 50, label: "맛집 마니아", emoji: "🔥" },
  { min: 75, label: "맛집 달인", emoji: "👑" },
  { min: 100, label: "춘천 미식왕", emoji: "🏆" },
];

export const useTourStats = (
  restaurants: Restaurant[],
  visited: Set<string>
): TourStats => {
  return useMemo(() => {
    // Group by category
    const byCategory = restaurants.reduce((acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    }, {} as Record<string, Restaurant[]>);

    const categoryStats: CategoryStats[] = Object.entries(byCategory)
      .map(([category, list]) => {
        const visitedCount = list.filter((r) => visited.has(r.id)).length;
        const percent = list.length > 0 ? Math.round((visitedCount / list.length) * 100) : 0;
        return {
          category,
          total: list.length,
          visited: visitedCount,
          percent,
          isMaster: visitedCount === list.length && list.length > 0,
        };
      })
      .sort((a, b) => b.percent - a.percent || b.visited - a.visited);

    const totalRestaurants = restaurants.length;
    const totalVisited = visited.size;
    const overallPercent = totalRestaurants > 0 ? Math.round((totalVisited / totalRestaurants) * 100) : 0;

    // Calculate rank
    const rankInfo = [...RANKS].reverse().find((r) => totalVisited >= r.min) || RANKS[0];

    const masterCategories = categoryStats
      .filter((c) => c.isMaster)
      .map((c) => c.category);

    return {
      totalRestaurants,
      totalVisited,
      overallPercent,
      rank: rankInfo.label,
      rankEmoji: rankInfo.emoji,
      categoryStats,
      masterCategories,
    };
  }, [restaurants, visited]);
};
