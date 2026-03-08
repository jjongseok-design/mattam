import { useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronUp, ChevronDown, Utensils } from "lucide-react";
import RestaurantCard from "./RestaurantCard";
import SearchBar from "./SearchBar";
import CategoryTabs, { CategoryId } from "./CategoryTabs";
import type { Restaurant } from "@/hooks/useRestaurants";

interface MobileBottomSheetProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  totalCount: number;
  category: CategoryId;
  onCategoryChange: (cat: CategoryId) => void;
  isVisited: (id: string) => boolean;
  onToggleVisited: (id: string) => void;
}

type SheetState = "half" | "full";
const CATEGORY_LABELS: Record<string, string> = {
  "닭갈비": "🍗", "막국수": "🍜", "중국집": "🥟", "갈비탕": "🍖",
  "삼계탕": "🐔", "칼국수": "🍜", "수제버거": "🍔", "삼겹살": "🥓",
  "초밥": "🍣", "일식": "🍱", "감자탕": "🥘", "한우": "🥩",
  "돼지갈비": "🍖", "이탈리안": "🍝", "베이커리": "🥐", "설렁탕/곰탕": "🍲",
  "보쌈/족발": "🐷", "돈까스": "🍛",
};

const MobileBottomSheet = ({
  restaurants,
  selectedId,
  onSelect,
  query,
  onQueryChange,
  totalCount,
  category,
  onCategoryChange,
  isVisited,
  onToggleVisited,
}: MobileBottomSheetProps) => {
  const [state, setState] = useState<SheetState>("half");
  const [showCategories, setShowCategories] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const heights: Record<SheetState, string> = {
    half: "58vh",
    full: "88vh",
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const vy = info.velocity.y;
    if (vy < -180) {
      setState("full");
      return;
    }
    if (vy > 180) {
      setState("half");
    }
  };

  const toggle = () => {
    setState((prev) => (prev === "full" ? "half" : "full"));
  };

  const handleCategorySelect = (cat: CategoryId) => {
    onCategoryChange(cat);
    setShowCategories(false);
    setState("half");
  };

  const categoryLabel = CATEGORY_LABELS[category] || "🍽️";

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1400] pointer-events-none">
      <motion.div
        className="pointer-events-auto bg-card rounded-t-2xl shadow-panel border-t border-border pb-[env(safe-area-inset-bottom)]"
        animate={{ height: heights[state] }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        <button onClick={toggle} className="w-full flex flex-col items-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-border mb-1" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Utensils className="h-3 w-3" />
            <span>{categoryLabel} {totalCount}개 {category}</span>
            {state === "full" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </div>
        </button>

        <AnimatePresence>
          <motion.div
            key="sheet-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 pb-2 flex flex-col h-[calc(100%-48px)]"
          >
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground whitespace-nowrap"
              >
                {categoryLabel} {category} ▾
              </button>
              <div className="flex-1">
                <SearchBar query={query} onQueryChange={onQueryChange} />
              </div>
            </div>

            <AnimatePresence>
              {showCategories && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-2"
                >
                  <CategoryTabs active={category} onChange={handleCategorySelect} />
                </motion.div>
              )}
            </AnimatePresence>

            <SearchBar query={query} onQueryChange={onQueryChange} />

            <p className="text-xs text-muted-foreground px-1 mb-1">
              {restaurants.length}개 · 평점 높은 순
            </p>
            <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pb-4">
              {restaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  isSelected={selectedId === restaurant.id}
                  isVisited={isVisited(restaurant.id)}
                  onClick={() => {
                    onSelect(restaurant.id);
                    setState("half");
                  }}
                  onToggleVisited={(e) => {
                    e.stopPropagation();
                    onToggleVisited(restaurant.id);
                  }}
                />
              ))}
              {restaurants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default MobileBottomSheet;
