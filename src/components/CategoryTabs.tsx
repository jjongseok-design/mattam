import { motion } from "framer-motion";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useMemo } from "react";

export const CATEGORIES = [
  { id: "닭갈비", label: "닭갈비", emoji: "🍗" },
  { id: "막국수", label: "막국수", emoji: "🍜" },
  { id: "중국집", label: "중국집", emoji: "🥟" },
  { id: "갈비탕", label: "갈비탕", emoji: "🍖" },
  { id: "삼계탕", label: "삼계탕", emoji: "🐔" },
  { id: "칼국수", label: "칼국수", emoji: "🍜" },
  { id: "수제버거", label: "수제버거", emoji: "🍔" },
  { id: "삼겹살", label: "삼겹살", emoji: "🥓" },
  { id: "초밥", label: "초밥", emoji: "🍣" },
  { id: "일식", label: "일식/횟집", emoji: "🍱" },
  { id: "감자탕", label: "감자탕", emoji: "🥘" },
  { id: "한우", label: "한우", emoji: "🥩" },
  { id: "돼지갈비", label: "돼지갈비", emoji: "🍖" },
  { id: "이탈리안", label: "이탈리안", emoji: "🍝" },
  { id: "베이커리", label: "베이커리", emoji: "🥐" },
  { id: "설렁탕/곰탕", label: "설렁탕/곰탕", emoji: "🍲" },
  { id: "보쌈/족발", label: "보쌈/족발", emoji: "🐷" },
  { id: "돈까스", label: "돈까스", emoji: "🍛" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

interface CategoryTabsProps {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}

const CategoryTabs = ({ active, onChange }: CategoryTabsProps) => {

  return (
    <div className="overflow-x-auto scrollbar-thin -mx-1 px-1">
      <div className="grid grid-cols-5 gap-1.5 min-w-0">
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.id;
          const count = counts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className="relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all duration-200"
            >
              {isActive && (
                <motion.div
                  layoutId="category-tab"
                  className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 text-base">{cat.emoji}</span>
              <span
                className={`relative z-10 text-[10px] font-medium leading-tight ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {cat.label}
              </span>
              {count > 0 && (
                <span
                  className={`relative z-10 text-[9px] font-semibold ${
                    isActive ? "text-primary/70" : "text-muted-foreground/50"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryTabs;
