import { motion } from "framer-motion";

export const CATEGORIES = [
  { id: "닭갈비", label: "🍗 닭갈비" },
  { id: "막국수", label: "🍜 막국수" },
  { id: "중국집", label: "🥟 중국집" },
  { id: "갈비탕", label: "🍖 갈비탕" },
  { id: "삼계탕", label: "🐔 삼계탕" },
  { id: "칼국수", label: "🍜 칼국수" },
  { id: "수제버거", label: "🍔 수제버거" },
  { id: "삼겹살", label: "🥓 삼겹살" },
  { id: "초밥", label: "🍣 초밥" },
  { id: "일식", label: "🍱 일식/횟집" },
  { id: "감자탕", label: "🥘 감자탕" },
  { id: "한우", label: "🥩 한우" },
  { id: "돼지갈비", label: "🍖 돼지갈비" },
  { id: "이탈리안", label: "🍝 이탈리안" },
  { id: "베이커리", label: "🥐 베이커리" },
  { id: "설렁탕/곰탕", label: "🍲 설렁탕/곰탕" },
  { id: "보쌈/족발", label: "🐷 보쌈/족발" },
  { id: "돈까스", label: "🍛 돈까스" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

interface CategoryTabsProps {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}

const CategoryTabs = ({ active, onChange }: CategoryTabsProps) => {
  return (
    <div className="grid grid-cols-5 gap-1 bg-muted rounded-lg p-1">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className="relative px-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap text-center"
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
