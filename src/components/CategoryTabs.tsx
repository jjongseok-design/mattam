import { motion } from "framer-motion";

export const CATEGORIES = [
  { id: "중국집", label: "🥟 중국집" },
  { id: "갈비탕", label: "🍖 갈비탕" },
  { id: "삼계탕", label: "🐔 삼계탕" },
  { id: "칼국수", label: "🍜 칼국수" },
  { id: "수제버거", label: "🍔 수제버거" },
  { id: "삼겹살", label: "🥓 삼겹살" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

interface CategoryTabsProps {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}

const CategoryTabs = ({ active, onChange }: CategoryTabsProps) => {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto scrollbar-thin">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className="relative flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
        >
          {active === cat.id && (
            <motion.div
              layoutId="category-tab"
              className="absolute inset-0 bg-background rounded-md shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span
            className={`relative z-10 ${
              active === cat.id ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
