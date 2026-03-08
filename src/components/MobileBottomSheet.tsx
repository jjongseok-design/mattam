import { useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronUp, ChevronDown, Grid3X3 } from "lucide-react";
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

const CATEGORY_EMOJI: Record<string, string> = {
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
    half: "55vh",
    full: "90vh",
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

  const emoji = CATEGORY_EMOJI[category] || "🍽️";

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1400] pointer-events-none">
      <motion.div
        className="pointer-events-auto bg-card rounded-t-3xl shadow-panel border-t border-border/40 pb-[env(safe-area-inset-bottom)]"
        animate={{ height: heights[state] }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
      >
        {/* Handle */}
        <button onClick={toggle} className="w-full flex flex-col items-center pt-3 pb-2">
          <div className="w-9 h-[3px] rounded-full bg-muted-foreground/20 mb-2" />
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
            <span>{emoji}</span>
            <span>{totalCount}개 {category}</span>
            {state === "full" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </div>
        </button>

        <div className="px-4 pb-2 flex flex-col h-[calc(100%-52px)]">
          {/* Category toggle + Search */}
          <div className="flex gap-2 mb-2.5">
            <button
              onClick={() => { setShowCategories(!showCategories); if (!showCategories) setState("full"); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
                showCategories
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/80 text-foreground hover:bg-muted"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              {category}
            </button>
            <div className="flex-1">
              <SearchBar query={query} onQueryChange={onQueryChange} />
            </div>
          </div>

          {/* Category grid */}
          <AnimatePresence>
            {showCategories && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden mb-2"
              >
                <CategoryTabs active={category} onChange={handleCategorySelect} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Count */}
          <p className="text-[11px] text-muted-foreground/50 px-1 mb-1.5 font-medium">
            {restaurants.length}개 · 평점 높은 순
          </p>

          {/* List */}
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
              <div className="text-center py-12 text-muted-foreground">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="text-sm font-medium">검색 결과가 없습니다</p>
                <p className="text-xs text-muted-foreground/50 mt-1">다른 키워드로 검색해보세요</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MobileBottomSheet;
