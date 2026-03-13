import { useMemo } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";

interface CategoryStats {
  category: string;
  total: number;
  visited: number;
  percent: number;
  isMaster: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  emoji: string;
  completed: boolean;
  progress: number;
  current: number;
  target: number;
}

interface TourStats {
  totalRestaurants: number;
  totalVisited: number;
  overallPercent: number;
  rank: string;
  rankEmoji: string;
  categoryStats: CategoryStats[];
  masterCategories: string[];
  missions: Mission[];
  completedMissions: number;
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

    const rankInfo = [...RANKS].reverse().find((r) => totalVisited >= r.min) || RANKS[0];

    const masterCategories = categoryStats
      .filter((c) => c.isMaster)
      .map((c) => c.category);

    const dakStat = categoryStats.find((c) => c.category === "닭갈비");

    // 미션 시스템
    const missions: Mission[] = [
      {
        id: "first_visit",
        title: "첫 발걸음",
        description: "첫 번째 맛집을 방문하세요",
        emoji: "👣",
        completed: totalVisited >= 1,
        progress: Math.min(100, totalVisited * 100),
        current: Math.min(1, totalVisited),
        target: 1,
      },
      {
        id: "explorer_5",
        title: "맛집 탐험",
        description: "5곳의 맛집을 방문하세요",
        emoji: "🗺️",
        completed: totalVisited >= 5,
        progress: Math.min(100, (totalVisited / 5) * 100),
        current: Math.min(5, totalVisited),
        target: 5,
      },
      {
        id: "dak_master",
        title: "닭갈비 정복",
        description: "닭갈비 카테고리 전체 방문",
        emoji: "🍗",
        completed: dakStat?.isMaster ?? false,
        progress: dakStat?.percent ?? 0,
        current: dakStat?.visited ?? 0,
        target: dakStat?.total ?? 0,
      },
      {
        id: "category_3",
        title: "카테고리 3 완주",
        description: "3개 카테고리를 완전 정복",
        emoji: "🏅",
        completed: masterCategories.length >= 3,
        progress: Math.min(100, (masterCategories.length / 3) * 100),
        current: Math.min(3, masterCategories.length),
        target: 3,
      },
      {
        id: "visited_20",
        title: "미식 여행가",
        description: "20곳의 맛집을 방문하세요",
        emoji: "✈️",
        completed: totalVisited >= 20,
        progress: Math.min(100, (totalVisited / 20) * 100),
        current: Math.min(20, totalVisited),
        target: 20,
      },
      {
        id: "visited_50",
        title: "춘천 토박이",
        description: "50곳의 맛집을 방문하세요",
        emoji: "🏠",
        completed: totalVisited >= 50,
        progress: Math.min(100, (totalVisited / 50) * 100),
        current: Math.min(50, totalVisited),
        target: 50,
      },
      {
        id: "category_5",
        title: "음식 백과사전",
        description: "5개 카테고리를 완전 정복",
        emoji: "📚",
        completed: masterCategories.length >= 5,
        progress: Math.min(100, (masterCategories.length / 5) * 100),
        current: Math.min(5, masterCategories.length),
        target: 5,
      },
      {
        id: "all_visited",
        title: "춘천 미식왕",
        description: "모든 맛집을 정복하세요",
        emoji: "🏆",
        completed: overallPercent === 100 && totalRestaurants > 0,
        progress: overallPercent,
        current: totalVisited,
        target: totalRestaurants,
      },
    ];

    const completedMissions = missions.filter((m) => m.completed).length;

    return {
      totalRestaurants,
      totalVisited,
      overallPercent,
      rank: rankInfo.label,
      rankEmoji: rankInfo.emoji,
      categoryStats,
      masterCategories,
      missions,
      completedMissions,
    };
  }, [restaurants, visited]);
};
