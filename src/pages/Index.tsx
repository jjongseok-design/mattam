import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Utensils, Loader2, Settings, Navigation, Download, X } from "lucide-react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import RestaurantCard from "@/components/RestaurantCard";
import MapView from "@/components/MapView";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import CategoryTabs from "@/components/CategoryTabs";
import { useCategories } from "@/hooks/useCategories";
import TipForm from "@/components/TipForm";
import ThemeToggle from "@/components/ThemeToggle";
import ErrorState from "@/components/ErrorState";
import JsonLd from "@/components/JsonLd";
import SortFilterBar, { SortOption, FilterOption } from "@/components/SortFilterBar";
import RandomPickButton from "@/components/RandomPickButton";
import TourProgress from "@/components/TourProgress";
import ShareCard from "@/components/ShareCard";
import { useRestaurants, type Restaurant } from "@/hooks/useRestaurants";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisited } from "@/hooks/useVisited";
import { useFavorites } from "@/hooks/useFavorites";
import { useGeolocation, getDistanceKm } from "@/hooks/useGeolocation";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";

// Persist scroll & state across navigation
const INDEX_STATE_KEY = "index_scroll_state";

interface SavedState {
  category: string;
  showList: boolean;
  scrollTop: number;
  query: string;
  sort: SortOption;
  filter: FilterOption;
}

const saveState = (state: SavedState) => {
  try { sessionStorage.setItem(INDEX_STATE_KEY, JSON.stringify(state)); } catch {}
};

const loadState = (): SavedState | null => {
  try {
    const s = sessionStorage.getItem(INDEX_STATE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialCat = searchParams.get("category");
  
  // Restore state on back navigation
  const saved = useRef(loadState());
  const isRestored = useRef(false);
  
  const [query, setQuery] = useState(saved.current?.query || "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: dbCategories = [] } = useCategories();
  const [category, setCategory] = useState<string>(initialCat || saved.current?.category || "닭갈비");
  const [showList, setShowList] = useState(saved.current?.showList || false);
  const [sort, setSort] = useState<SortOption>(saved.current?.sort || "rating");
  const [filter, setFilter] = useState<FilterOption>(saved.current?.filter || "all");
  const [ratingMin, setRatingMin] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  const isMobile = useIsMobile();
  const { data: restaurants = [], isLoading, isError, refetch } = useRestaurants();
  const { visited, isVisited, toggle: toggleVisited } = useVisited();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { position, loading: geoLoading, request: requestGeo } = useGeolocation();
  const { recentIds, addViewed } = useRecentlyViewed();
  const { toast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);

  // Deep linking: sync category to URL
  useEffect(() => {
    setSearchParams({ category }, { replace: true });
  }, [category, setSearchParams]);

  // Save state before navigating away
  useEffect(() => {
    return () => {
      saveState({
        category,
        showList,
        scrollTop: listRef.current?.scrollTop || 0,
        query,
        sort,
        filter,
      });
    };
  }, [category, showList, query, sort, filter]);

  // Restore scroll position after render
  useEffect(() => {
    if (!isRestored.current && saved.current && listRef.current && restaurants.length > 0) {
      isRestored.current = true;
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = saved.current!.scrollTop;
        }
      });
    }
  }, [restaurants]);

  const handleCategoryChange = useCallback((cat: string) => {
    setCategory(cat);
    setShowList(true);
    setSelectedId(null);
    setQuery("");
  }, []);

  const handleCloseList = useCallback(() => {
    setShowList(false);
    setSelectedId(null);
    setQuery("");
  }, []);

  // Request geolocation when user selects distance sort
  useEffect(() => {
    if (sort === "distance" && !position) {
      requestGeo();
    }
  }, [sort, position, requestGeo]);

  const handleLocationRequest = useCallback(() => {
    requestGeo();
    toast({ title: "📍 현재 위치를 확인하고 있습니다..." });
  }, [requestGeo, toast]);

  // Track viewed restaurants
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    addViewed(id);
  }, [addViewed]);

  // Scroll list to selected card
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-restaurant-id="${selectedId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  const categoryRestaurants = useMemo(
    () => restaurants.filter((r) => r.category === category),
    [restaurants, category]
  );

  const isGlobalSearch = query.trim().length > 0;

  const filtered = useMemo(() => {
    // When searching, search across ALL restaurants regardless of category
    let list = isGlobalSearch ? restaurants : categoryRestaurants;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q)) ||
          r.address.includes(q) ||
          r.category.includes(q)
      );
    }

    if (filter === "favorites") {
      list = list.filter((r) => isFavorite(r.id));
    } else if (filter === "visited") {
      list = list.filter((r) => isVisited(r.id));
    }

    if (ratingMin > 0) {
      list = list.filter((r) => r.rating >= ratingMin);
    }

    return [...list].sort((a, b) => {
      if (sort === "distance" && position) {
        const dA = getDistanceKm(position.lat, position.lng, a.lat, a.lng);
        const dB = getDistanceKm(position.lat, position.lng, b.lat, b.lng);
        return dA - dB;
      }
      if (sort === "reviews") {
        return b.reviewCount - a.reviewCount || b.rating - a.rating;
      }
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    });
  }, [query, categoryRestaurants, restaurants, isGlobalSearch, sort, filter, ratingMin, position, isFavorite, isVisited]);

  // Recently viewed restaurants
  const recentRestaurants = useMemo(() => {
    if (recentIds.length === 0) return [];
    return recentIds
      .map((id) => restaurants.find((r) => r.id === id))
      .filter(Boolean)
      .slice(0, 5) as Restaurant[];
  }, [recentIds, restaurants]);

  const getDistance = useCallback(
    (lat: number, lng: number) => {
      if (!position) return null;
      return getDistanceKm(position.lat, position.lng, lat, lng);
    },
    [position]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const categoryEmoji = CATEGORY_EMOJI[category] || "🍽️";

  // Shared restaurant list renderer
  const renderRestaurantList = (maxItems?: number) => {
    const items = maxItems ? filtered.slice(0, maxItems) : filtered;
    return items.map((restaurant) => {
      const dist = getDistance(restaurant.lat, restaurant.lng);
      return (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
          isSelected={selectedId === restaurant.id}
          isVisited={isVisited(restaurant.id)}
          isFavorite={isFavorite(restaurant.id)}
          distance={dist}
          onClick={() => handleSelect(restaurant.id)}
          onToggleVisited={(e) => { e.stopPropagation(); toggleVisited(restaurant.id); }}
          onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(restaurant.id); }}
        />
      );
    });
  };

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <div className="relative h-dvh w-screen overflow-hidden bg-background">
          {/* 상단 바 */}
          <div className="absolute top-0 left-0 right-0 z-[1300] safe-area-top bg-background/95 backdrop-blur-md border-b border-border/30" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
            {/* Row 1: Tour progress + action buttons */}
            <div className="safe-area-x pt-2 pb-1.5 flex items-center gap-2">
              <div className="flex-1 min-w-0 overflow-hidden">
                {showList ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCloseList}
                      className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform shrink-0"
                      aria-label="카테고리 선택으로 돌아가기"
                    >
                      <X className="h-4 w-4 text-foreground" />
                    </button>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <span>{categoryEmoji}</span>
                      <span>{category}</span>
                      <span className="text-[11px] font-normal text-muted-foreground ml-0.5">{categoryRestaurants.length}개</span>
                    </span>
                  </div>
                ) : (
                  <TourProgress restaurants={restaurants} visited={visited} onShare={() => setShareOpen(true)} compact />
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!position && (
                  <button
                    onClick={handleLocationRequest}
                    className="glass rounded-xl w-11 h-11 tap-safe flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="내 위치 찾기"
                  >
                    <Navigation className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
                <Link to="/install" className="glass rounded-xl w-11 h-11 tap-safe flex items-center justify-center active:scale-95 transition-transform">
                  <Download className="h-5 w-5 text-muted-foreground" />
                </Link>
                <div className="glass rounded-xl w-11 h-11 tap-safe flex items-center justify-center">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            {/* Row 2: Category grid - only when NOT in list mode */}
            {!showList && (
              <div className="safe-area-x pb-2">
                <CategoryTabs active={category} onChange={handleCategoryChange} />
              </div>
            )}
          </div>

          {/* Map */}
          <div className="absolute inset-0 z-0">
            <MapView
              restaurants={filtered}
              selectedId={selectedId}
              onSelect={handleSelect}
              visitedIds={visited}
            />
          </div>

          {/* Bottom Sheet */}
          <MobileBottomSheet
            restaurants={filtered}
            selectedId={selectedId}
            onSelect={handleSelect}
            query={query}
            onQueryChange={setQuery}
            totalCount={categoryRestaurants.length}
            category={category}
            onCategoryChange={handleCategoryChange}
            isVisited={isVisited}
            onToggleVisited={toggleVisited}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            sort={sort}
            onSortChange={setSort}
            filter={filter}
            onFilterChange={setFilter}
            hasLocation={!!position}
            ratingMin={ratingMin}
            onRatingMinChange={setRatingMin}
            getDistance={getDistance}
            onClose={handleCloseList}
          />
        </div>
        <TipForm />
        <JsonLd />
        <ShareCard open={shareOpen} onClose={() => setShareOpen(false)} restaurants={restaurants} visited={visited} />
      </>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Side Panel */}
      <div className="w-[38.2%] min-w-[380px] max-w-[600px] flex-shrink-0 h-full flex flex-col border-r border-border/50 bg-card shadow-panel z-10">
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-sm">
              <Utensils className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground tracking-tight">춘천 맛집 지도</h1>
              <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                강원특별자치도 춘천시 · {categoryRestaurants.length}개 {category}
              </p>
            </div>
            {!position && (
              <button
                onClick={handleLocationRequest}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                title="내 위치 찾기"
                aria-label="내 위치 찾기"
              >
                <Navigation className="h-4 w-4 text-muted-foreground/50" />
              </button>
            )}
            {position && (
              <span className="text-[10px] text-primary/60 font-medium">📍 위치 ON</span>
            )}
            <ThemeToggle />
            <Link to="/install">
              <button
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                title="앱 설치"
                aria-label="앱 설치"
              >
                <Download className="h-4 w-4 text-muted-foreground/50" />
              </button>
            </Link>
            <Link to="/admin">
              <button
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                title="관리자"
                aria-label="관리자 설정"
              >
                <Settings className="h-4 w-4 text-muted-foreground/50" />
              </button>
            </Link>
          </div>

          {!showList ? (
            <CategoryTabs active={category} onChange={handleCategoryChange} />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handleCloseList}
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors shrink-0"
                  aria-label="카테고리 선택으로 돌아가기"
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>
                <span className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <span className="text-xl">{categoryEmoji}</span>
                  <span>{category}</span>
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{categoryRestaurants.length}개</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchBar query={query} onQueryChange={setQuery} />
                </div>
                <RandomPickButton restaurants={filtered} />
              </div>
              <div className="mt-2.5">
                <SortFilterBar
                  sort={sort}
                  onSortChange={setSort}
                  filter={filter}
                  onFilterChange={setFilter}
                  hasLocation={!!position}
                  ratingMin={ratingMin}
                  onRatingMinChange={setRatingMin}
                />
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/60 mx-4" />

        {/* Restaurant list */}
        <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          {!showList && (
            <>
              {/* Recently Viewed */}
              {recentRestaurants.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] text-muted-foreground/60 font-medium px-1.5 mb-1.5">🕐 최근 본 식당</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
                    {recentRestaurants.map((r) => (
                      <Link
                        key={r.id}
                        to={`/restaurant/${r.id}`}
                        className="flex-shrink-0 px-3 py-2 bg-muted/60 hover:bg-muted rounded-xl text-[12px] font-medium text-foreground transition-colors border border-border/30 hover:border-primary/20"
                      >
                        <span className="mr-1">{CATEGORY_EMOJI[r.category] || "🍽️"}</span>
                        {r.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-1.5 mb-1">
                <p className="text-[11px] text-muted-foreground/60 font-medium">
                  {categoryEmoji} {category} · {filtered.length}개
                </p>
                <button
                  onClick={() => setShowList(true)}
                  className="text-[11px] text-primary font-medium hover:underline"
                >
                  전체보기 →
                </button>
              </div>
            </>
          )}

          {showList && (
            <p className="text-[11px] text-muted-foreground/60 px-1.5 mb-1 font-medium">
              {isGlobalSearch && <span className="text-primary mr-1">🔍 전체 검색</span>}
              {filtered.length}개 {isGlobalSearch ? "결과" : category} ·{" "}
              {sort === "rating" ? "평점 높은 순" : sort === "reviews" ? "리뷰 많은 순" : "가까운 순"}
              {filter !== "all" && ` · ${filter === "favorites" ? "찜한 곳" : "방문한 곳"}`}
            </p>
          )}

          <AnimatePresence mode="popLayout">
            {renderRestaurantList()}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Utensils className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">검색 결과가 없습니다</p>
              <p className="text-xs text-muted-foreground/50 mt-1">다른 키워드로 검색해보세요</p>
            </div>
          )}

          <div className="text-center py-4 text-[10px] text-muted-foreground/40 border-t border-border/30 mt-4">
            © {new Date().getFullYear()} 춘천 맛집 지도. All rights reserved.
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 h-full relative">
        <div className="absolute top-4 right-4 z-[1000] w-72">
          <TourProgress restaurants={restaurants} visited={visited} onShare={() => setShareOpen(true)} />
        </div>
        <MapView
          restaurants={filtered}
          selectedId={selectedId}
          onSelect={handleSelect}
          visitedIds={visited}
        />
      </div>
      <TipForm />
      <JsonLd />
      <ShareCard open={shareOpen} onClose={() => setShareOpen(false)} restaurants={restaurants} visited={visited} />
    </div>
  );
};

export default Index;
