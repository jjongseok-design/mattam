import { motion } from "framer-motion";

export const CATEGORIES = [
  { id: "중국집", label: "🥟 중국집" },
  { id: "갈비탕", label: "🍖 갈비탕" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

interface CategoryTabsProps {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}

const CategoryTabs = ({ active, onChange }: CategoryTabsProps) => {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className="relative flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
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
