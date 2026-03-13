import { useRef, useState, useCallback, memo } from "react";
import { motion, PanInfo } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import RestaurantCard from "./RestaurantCard";
import SearchBar from "./SearchBar";
import SortFilterBar, { SortOption, FilterOption } from "./SortFilterBar";
import RandomPickButton from "./RandomPickButton";
import TourProgress from "./TourProgress";
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
  recentRestaurants?: Restaurant[];
  allRestaurants?: Restaurant[];
  visited?: Set<string>;
  onShare?: () => void;
}

type SheetState = "peek" | "half" | "full";

const HEIGHTS: Record<SheetState, string> = {
  peek: "56px",
  half: "50vh",
  full: "85vh",
};

const MobileBottomSheet = memo(({
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
  recentRestaurants = [],
  allRestaurants,
  visited,
  onShare,
}: MobileBottomSheetProps) => {
  const [state, setState] = useState<SheetState>("half");
  const [isDraggable, setIsDraggable] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  const handleDragStart = useCallback((_: unknown, info: PanInfo) => {
    dragStartY.current = info.point.y;
  }, []);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const vy = info.velocity.y;
    const dy = info.offset.y;

    if (vy < -200 || dy < -80) {
      setState(prev => prev === "peek" ? "half" : "full");
      return;
    }
    if (vy > 200 || dy > 80) {
      setState(prev => prev === "full" ? "half" : "peek");
    }
  }, []);

  const handlePeekTap = useCallback(() => {
    setState("half");
  }, []);

  const handleToggleState = useCallback(() => {
    setState(prev => {
      if (prev === "full") return "half";
      if (prev === "half") return "peek";
      return "half";
    });
  }, []);

  // Ensure drag is always enabled when touching the handle bar area
  const handleHandleTouchStart = useCallback(() => {
    setIsDraggable(true);
  }, []);

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // Only allow sheet drag when list is scrolled to top
    setIsDraggable(el.scrollTop <= 1);
  }, []);

  const handleListTouchStart = useCallback(() => {
    const el = listRef.current;
    if (el && el.scrollTop > 1) {
      setIsDraggable(false);
    } else {
      setIsDraggable(true);
    }
  }, []);

  const handleListTouchEnd = useCallback(() => {
    // Re-enable drag after a short delay to prevent flicker
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el && el.scrollTop <= 1) {
        setIsDraggable(true);
      }
    });
  }, []);

  const emoji = CATEGORY_EMOJI[category] || "🍽️";
  const isPeek = state === "peek";

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1400] pointer-events-none">
      <motion.div
        className="pointer-events-auto bg-card rounded-t-3xl shadow-panel border-t border-border/40 pb-[env(safe-area-inset-bottom)] flex flex-col will-change-transform"
        animate={{ height: HEIGHTS[state] }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        drag={isDraggable ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.08}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ touchAction: isDraggable ? "none" : "auto" }}
      >
        {/* Handle / Peek bar - always enables drag */}
        <button
          onClick={isPeek ? handlePeekTap : handleToggleState}
          onTouchStart={handleHandleTouchStart}
          className="w-full flex flex-col items-center pt-3 pb-2 flex-shrink-0 touch-none"
          aria-label={isPeek ? "목록 펼치기" : "목록 접기/펼치기"}
        >
          <div className="w-9 h-[3px] rounded-full bg-muted-foreground/20 mb-2" />
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
            <span>{emoji}</span>
            <span>{totalCount}개 {category}</span>
            {isPeek && <span className="text-primary/70">· 탭해서 보기</span>}
            <ChevronUp className={`h-3 w-3 transition-transform duration-200 ${state === "peek" ? "" : state === "full" ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Content - hidden when peek */}
        {!isPeek && (
          <div className="px-3 pb-1 flex flex-col flex-1 min-h-0">
            {/* Search + Random */}
            <div className="flex gap-1 mb-1 flex-shrink-0">
              <div className="flex-1">
                <SearchBar query={query} onQueryChange={onQueryChange} restaurants={restaurants} onSelectRestaurant={onSelect} />
              </div>
              <RandomPickButton restaurants={restaurants} />
            </div>

            {/* Sort / Filter */}
            <div className="mb-1 flex-shrink-0">
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

            {/* 맛집 정복 */}
            {allRestaurants && visited && onShare && (
              <div className="mb-1 px-1 flex-shrink-0">
                <TourProgress restaurants={allRestaurants} visited={visited} onShare={onShare} compact />
              </div>
            )}

            {/* List - isolated scroll container */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-1.5 pb-4 overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
              onScroll={handleListScroll}
              onTouchStart={handleListTouchStart}
              onTouchEnd={handleListTouchEnd}
            >
              {/* Recently Viewed */}
              {recentRestaurants.length > 0 && (
                <div className="mb-1">
                  <p className="text-[10px] text-muted-foreground/50 font-medium px-1 mb-0.5">🕐 최근 본 식당</p>
                  <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
                    {recentRestaurants.map((r) => (
                      <Link
                        key={r.id}
                        to={`/restaurant/${r.slug}`}
                        className="flex-shrink-0 px-1.5 py-0.5 bg-muted/60 hover:bg-muted rounded-md text-[10px] font-medium text-foreground transition-colors border border-border/30"
                      >
                        <span className="mr-0.5">{CATEGORY_EMOJI[r.category] || "🍽️"}</span>
                        {r.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

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
                    compact
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
});

MobileBottomSheet.displayName = "MobileBottomSheet";

export default MobileBottomSheet;
