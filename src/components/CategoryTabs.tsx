import { motion } from "framer-motion";
import { useCategories, type CategoryRow } from "@/hooks/useCategories";

// Fallback categories for when DB is loading
const FALLBACK_CATEGORIES: CategoryRow[] = [
  { id: "닭갈비", label: "닭갈비", emoji: "🍗", sort_order: 1, id_prefix: "dc", tag_suggestions: [], tag_placeholder: "" },
];

interface CategoryTabsProps {
  active: string;
  onChange: (id: string) => void;
  /** Horizontal scrolling pill style (for mobile top bar) */
  variant?: "grid" | "pills";
  /** Restaurant count per category id */
  categoryCounts?: Record<string, number>;
}

const CategoryTabs = ({ active, onChange, variant = "grid", categoryCounts = {} }: CategoryTabsProps) => {
  const { data: categories } = useCategories();
  const cats = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  if (variant === "pills") {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-thin py-1 px-1 -mx-1">
        {cats.map((cat) => {
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted/80 text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-base">{cat.emoji}</span>
              <span>{cat.label}</span>
              {categoryCounts[cat.id] != null && (
                <span className="text-[10px] opacity-60">{categoryCounts[cat.id]}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="-mx-1 px-1">
      <div className="grid grid-cols-5 gap-0.5 min-w-0">
        {cats.map((cat) => {
          const isActive = active === cat.id;
          const count = categoryCounts[cat.id];
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className="relative flex flex-col items-center py-1 px-0.5 rounded-lg transition-all duration-200 min-h-[40px]"
            >
              {isActive && (
                <motion.div
                  layoutId="category-tab"
                  className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-0.5">
                <span className="text-lg">{cat.emoji}</span>
                {count != null && (
                  <span className={`text-[9px] font-bold -mt-1 ${isActive ? "text-primary" : "text-muted-foreground/70"}`}>
                    {count}
                  </span>
                )}
              </div>
              <span
                className={`relative z-10 text-[10px] font-medium leading-tight w-full text-center break-keep ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryTabs;
export type { CategoryRow };
