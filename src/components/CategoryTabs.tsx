import { useRef, useEffect } from "react";
import { useCategories, type CategoryRow } from "@/hooks/useCategories";

const FALLBACK_CATEGORIES: CategoryRow[] = [
  { id: "닭갈비", label: "닭갈비", emoji: "🍗", sort_order: 1, id_prefix: "dc", tag_suggestions: [], tag_placeholder: "" },
];

interface CategoryTabsProps {
  active: string[];
  onChange: (id: string) => void;
  variant?: "grid" | "pills";
  categoryCounts?: Record<string, number>;
  cityId?: string;
  size?: "sm" | "lg";
}

const CategoryTabs = ({ active, onChange, categoryCounts = {}, cityId, size }: CategoryTabsProps) => {
  const lg = size === "lg";
  const { data: categories } = useCategories(cityId);
  const cats = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll last-selected pill into view
  useEffect(() => {
    const lastActive = active[active.length - 1];
    if (!lastActive) return;
    const el = scrollRef.current?.querySelector(`[data-cat-id="${lastActive}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <div
      ref={scrollRef}
      className="grid grid-rows-2 grid-flow-col gap-1.5 overflow-x-auto scrollbar-none py-0.5"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {cats.map((cat) => {
        const isActive = active.includes(cat.id);
        const count = categoryCounts[cat.id];
        return (
          <button
            key={cat.id}
            data-cat-id={cat.id}
            onClick={() => onChange(cat.id)}
            className={`
              inline-flex items-center ${lg ? "gap-2 px-3.5 py-2 text-[14px]" : "gap-1.5 px-3 py-1.5 text-[12px]"} rounded-full font-semibold
              whitespace-nowrap flex-shrink-0 transition-all duration-200
              ${isActive
                ? "bg-foreground text-background shadow-sm scale-[1.02]"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
          >
            <span className={`${lg ? "text-base" : "text-sm"} leading-none`}>{cat.emoji}</span>
            <span>{cat.label}</span>
            {count != null && (
              <span className={`${lg ? "text-[12px]" : "text-[10px]"} font-normal ${isActive ? "opacity-60" : "opacity-50"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
export type { CategoryRow };
