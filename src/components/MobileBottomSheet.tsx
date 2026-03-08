import { useState, useRef } from "react";
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

type SheetState = "peek" | "half" | "full";

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
  const listRef = useRef<HTMLDivElement>(null);

  const heights: Record<SheetState, string> = {
    peek: "120px",
    half: "50vh",
    full: "85vh",
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const vy = info.velocity.y;
    if (vy < -200) {
      setState(state === "peek" ? "half" : "full");
    } else if (vy > 200) {
      setState(state === "full" ? "half" : "peek");
    }
  };

  const toggle = () => {
    setState(state === "peek" ? "half" : state === "half" ? "full" : "peek");
  };

  const categoryLabel = category === "중국집" ? "🥟" : "🍖";

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-[1000] bg-card rounded-t-2xl shadow-panel border-t border-border pb-[env(safe-area-inset-bottom)]"
      animate={{ height: heights[state] }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
          {state === "peek" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </button>

      <AnimatePresence>
        {state !== "peek" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 pb-2 flex flex-col h-[calc(100%-48px)]"
          >
            <div className="mb-2">
              <CategoryTabs active={category} onChange={onCategoryChange} />
            </div>
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
                    setState("peek");
                  }}
                  onToggleVisited={(e) => { e.stopPropagation(); onToggleVisited(restaurant.id); }}
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
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MobileBottomSheet;
