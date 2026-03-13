import { useRef, useEffect } from "react";
import { useCategories, type CategoryRow } from "@/hooks/useCategories";

const FALLBACK_CATEGORIES: CategoryRow[] = [
  { id: "닭갈비", label: "닭갈비", emoji: "🍗", sort_order: 1, id_prefix: "dc", tag_suggestions: [], tag_placeholder: "" },
];

interface CategoryTabsProps {
  active: string;
  onChange: (id: string) => void;
  variant?: "grid" | "pills";
  categoryCounts?: Record<string, number>;
}

const CategoryTabs = ({ active, onChange, categoryCounts = {} }: CategoryTabsProps) => {
  const { data: categories } = useCategories();
  const cats = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active pill into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-cat-id="${active}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {cats.map((cat) => {
        const isActive = active === cat.id;
        const count = categoryCounts[cat.id];
        return (
          <button
            key={cat.id}
            data-cat-id={cat.id}
            onClick={() => onChange(cat.id)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold
              whitespace-nowrap flex-shrink-0 transition-all duration-200
              ${isActive
                ? "bg-foreground text-background shadow-sm scale-[1.02]"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
          >
            <span className="text-sm leading-none">{cat.emoji}</span>
            <span>{cat.label}</span>
            {count != null && (
              <span className={`text-[10px] font-normal ${isActive ? "opacity-60" : "opacity-50"}`}>
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
