import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronUp } from "lucide-react";
import RestaurantCard from "./RestaurantCard";
import SearchBar from "./SearchBar";
import SortFilterBar, { SortOption, FilterOption } from "./SortFilterBar";
import RandomPickButton from "./RandomPickButton";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import type { Restaurant } from "@/hooks/useRestaurants";

interface MobileBottomSheetProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  totalCount: number;
  category: string;
  onCategoryChange: (cat: string) => void;
  isVisited: (id: string) => boolean;
  onToggleVisited: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  filter: FilterOption;
  onFilterChange: (f: FilterOption) => void;
  hasLocation: boolean;
  ratingMin: number;
  onRatingMinChange: (n: number) => void;
  getDistance: (lat: number, lng: number) => number | null;
  onClose?: () => void;
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
  isVisited,
  onToggleVisited,
  isFavorite,
  onToggleFavorite,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  hasLocation,
  ratingMin,
  onRatingMinChange,
  getDistance,
}: MobileBottomSheetProps) => {
  const [state, setState] = useState<SheetState>("half");
  const [isDraggable, setIsDraggable] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const heights: Record<SheetState, string> = {
    peek: "56px",
    half: "50vh",
    full: "85vh",
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const vy = info.velocity.y;
    const dy = info.offset.y;

    if (vy < -200 || dy < -80) {
      if (state === "peek") setState("half");
      else setState("full");
      return;
    }
    if (vy > 200 || dy > 80) {
      if (state === "full") setState("half");
      else setState("peek");
    }
  };

  const handlePeekTap = () => {
    setState("half");
  };

  const handleListTouchStart = useCallback(() => {
    const el = listRef.current;
    if (el && el.scrollTop > 0) {
      setIsDraggable(false);
    } else {
      setIsDraggable(true);
    }
  }, []);

  const handleListTouchEnd = useCallback(() => {
    setIsDraggable(true);
  }, []);

  const emoji = CATEGORY_EMOJI[category] || "🍽️";
  const isPeek = state === "peek";

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1400] pointer-events-none">
      <motion.div
        className="pointer-events-auto bg-card rounded-t-3xl shadow-panel border-t border-border/40 pb-[env(safe-area-inset-bottom)] flex flex-col"
        animate={{ height: heights[state] }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        drag={isDraggable ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        style={{ touchAction: "none" }}
      >
        {/* Handle / Peek bar */}
        <button
          onClick={isPeek ? handlePeekTap : () => setState(state === "full" ? "half" : "full")}
          className="w-full flex flex-col items-center pt-3 pb-2 flex-shrink-0"
          aria-label={isPeek ? "목록 펼치기" : "목록 접기/펼치기"}
        >
          <div className="w-9 h-[3px] rounded-full bg-muted-foreground/20 mb-2" />
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
            <span>{emoji}</span>
            <span>{totalCount}개 {category}</span>
            <ChevronUp className={`h-3 w-3 transition-transform duration-200 ${state === "full" ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Content - hidden when peek */}
        {!isPeek && (
          <div className="px-4 pb-2 flex flex-col flex-1 min-h-0">
            {/* Search + Random */}
            <div className="flex gap-2 mb-2 flex-shrink-0">
              <div className="flex-1">
                <SearchBar query={query} onQueryChange={onQueryChange} />
              </div>
              <RandomPickButton restaurants={restaurants} />
            </div>

            {/* Sort / Filter */}
            <div className="mb-2 flex-shrink-0">
              <SortFilterBar
                sort={sort}
                onSortChange={onSortChange}
                filter={filter}
                onFilterChange={onFilterChange}
                hasLocation={hasLocation}
                ratingMin={ratingMin}
                onRatingMinChange={onRatingMinChange}
              />
            </div>

            {/* Count */}
            <p className="text-[11px] text-muted-foreground/50 px-1 mb-1.5 font-medium flex-shrink-0">
              {restaurants.length}개 ·{" "}
              {sort === "rating" ? "평점 높은 순" : sort === "reviews" ? "리뷰 많은 순" : "가까운 순"}
              {filter !== "all" && ` · ${filter === "favorites" ? "찜" : "방문"}`}
            </p>

            {/* List - isolated scroll container */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-2 pb-4 overscroll-contain"
              style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
              onTouchStart={handleListTouchStart}
              onTouchEnd={handleListTouchEnd}
            >
              {restaurants.map((restaurant) => {
                const dist = getDistance(restaurant.lat, restaurant.lng);
                return (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    isSelected={selectedId === restaurant.id}
                    isVisited={isVisited(restaurant.id)}
                    isFavorite={isFavorite(restaurant.id)}
                    distance={dist}
                    onClick={() => {
                      onSelect(restaurant.id);
                      setState("half");
                    }}
                    onToggleVisited={(e) => {
                      e.stopPropagation();
                      onToggleVisited(restaurant.id);
                    }}
                    onToggleFavorite={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(restaurant.id);
                    }}
                  />
                );
              })}
              {restaurants.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <span className="text-3xl block mb-2">🔍</span>
                  <p className="text-sm font-medium">검색 결과가 없습니다</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">다른 키워드로 검색해보세요</p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MobileBottomSheet;
