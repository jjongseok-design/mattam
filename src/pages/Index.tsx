import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Utensils, Loader2, Settings, Navigation, Download, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import RestaurantCard from "@/components/RestaurantCard";
import MapView from "@/components/MapView";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import CategoryTabs from "@/components/CategoryTabs";
import TipForm from "@/components/TipForm";
import FeedbackForm from "@/components/FeedbackForm";
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
import { useFilteredRestaurants } from "@/hooks/useFilteredRestaurants";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";

// Scroll position persistence (scroll position can't go in URL)
const SCROLL_KEY = "index_scroll_top";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is the single source of truth for filterable state
  const category = searchParams.get("category") || "닭갈비";
  const query = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") as SortOption) || "rating";
  const filter = (searchParams.get("filter") as FilterOption) || "all";
  const selectedId = searchParams.get("selected") || null;

  // UI-only state (not worth putting in URL)
  const [showList, setShowList] = useState(() => searchParams.has("q") || searchParams.has("selected"));
  const [ratingMin, setRatingMin] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const isRestored = useRef(false);


  const isMobile = useIsMobile();
  const { data: restaurants = [], isLoading, isError, refetch } = useRestaurants();
  const { visited, isVisited, toggle: toggleVisited } = useVisited();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { position, loading: geoLoading, request: requestGeo } = useGeolocation();
  const { recentIds, addViewed } = useRecentlyViewed();
  const { toast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);

  // URL param setters
  const setCategory = useCallback((cat: string) => {
    setSearchParams((p) => { const n = new URLSearchParams(p); n.set("category", cat); n.delete("q"); n.delete("selected"); return n; }, { replace: true });
  }, [setSearchParams]);

  const setQuery = useCallback((q: string) => {
    setSearchParams((p) => { const n = new URLSearchParams(p); if (q) n.set("q", q); else n.delete("q"); return n; }, { replace: true });
  }, [setSearchParams]);

  const setSort = useCallback((s: SortOption) => {
    setSearchParams((p) => { const n = new URLSearchParams(p); if (s !== "rating") n.set("sort", s); else n.delete("sort"); return n; }, { replace: true });
  }, [setSearchParams]);

  const setFilter = useCallback((f: FilterOption) => {
    setSearchParams((p) => { const n = new URLSearchParams(p); if (f !== "all") n.set("filter", f); else n.delete("filter"); return n; }, { replace: true });
  }, [setSearchParams]);

  const setSelectedId = useCallback((id: string | null) => {
    setSearchParams((p) => { const n = new URLSearchParams(p); if (id) n.set("selected", id); else n.delete("selected"); return n; }, { replace: true });
  }, [setSearchParams]);

  // Observe dark mode class changes
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Persist scroll position
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved && !isRestored.current && restaurants.length > 0) {
      isRestored.current = true;
      requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = Number(saved); });
    }
    return () => {
      if (listRef.current) sessionStorage.setItem(SCROLL_KEY, String(listRef.current.scrollTop));
    };
  }, [restaurants]);

  const handleCategoryChange = useCallback((cat: string) => {
    setCategory(cat);
    setShowList(true);
  }, [setCategory]);

  const handleCloseList = useCallback(() => {
    setShowList(false);
    setSelectedId(null);
    setQuery("");
  }, [setSelectedId, setQuery]);

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
  }, [setSelectedId, addViewed]);

  const handleFindNearest = useCallback(() => {
    if (!position || filtered.length === 0) return;
    let nearest = filtered[0];
    let minDist = distanceMap[nearest.id] ?? getDistanceKm(position.lat, position.lng, nearest.lat, nearest.lng);
    for (const r of filtered) {
      const d = distanceMap[r.id] ?? getDistanceKm(position.lat, position.lng, r.lat, r.lng);
      if (d < minDist) { minDist = d; nearest = r; }
    }
    handleSelect(nearest.id);
    const distText = minDist < 1 ? `${Math.round(minDist * 1000)}m` : `${minDist.toFixed(1)}km`;
    toast({ title: `📍 가장 가까운 맛집: ${nearest.name}`, description: `${distText} 거리` });
  }, [position, filtered, distanceMap, handleSelect, toast]);

  // Scroll list to selected card
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-restaurant-id="${selectedId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedId]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of restaurants) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  }, [restaurants]);

  const { filtered, categoryRestaurants, isGlobalSearch, distanceMap } = useFilteredRestaurants({
    restaurants,
    category,
    query,
    sort,
    filter,
    ratingMin,
    position,
    isFavorite,
    isVisited,
  });

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
      // Use pre-computed distance map when available
      const r = filtered.find((x) => x.lat === lat && x.lng === lng);
      if (r && distanceMap[r.id] != null) return distanceMap[r.id] as number;
      return getDistanceKm(position.lat, position.lng, lat, lng);
    },
    [position, filtered, distanceMap]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">맛집 데이터를 불러오는 중...</p>
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
      const dist = distanceMap[restaurant.id] ?? null;
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
            {/* Row 0: Title - only when NOT in list mode */}
            {!showList && (
              <div className="safe-area-x pt-2 pb-0">
                <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-1.5">
                  <Utensils className="h-4 w-4 text-primary" />
                  춘천 맛집 가이드
                </h1>
              </div>
            )}

            {/* Row 1: Tour progress + action buttons */}
            <div className="safe-area-x pt-1.5 pb-1.5 flex items-center gap-2">
              <div className="flex-1 min-w-0 overflow-hidden">
                {showList ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={handleCloseList}
                      className="w-8 h-8 min-w-[32px] rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform shrink-0"
                      aria-label="카테고리 선택으로 돌아가기"
                    >
                      <X className="h-3.5 w-3.5 text-foreground" />
                    </button>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1 min-w-0">
                      <span className="shrink-0">{categoryEmoji}</span>
                      <span className="truncate">{category}</span>
                      <span className="text-[11px] font-normal text-muted-foreground shrink-0">{categoryRestaurants.length}개</span>
                    </span>
                  </div>
                ) : (
                  <TourProgress restaurants={restaurants} visited={visited} onShare={() => setShareOpen(true)} compact />
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!position && (
                  <button
                    onClick={handleLocationRequest}
                    className="glass rounded-lg w-8 h-8 flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="내 위치 찾기"
                  >
                    <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
                {position && (
                  <button
                    onClick={handleFindNearest}
                    className="glass rounded-lg px-2 h-8 flex items-center gap-1 active:scale-95 transition-transform text-[10px] font-semibold text-primary"
                    aria-label="내 주변 가장 가까운 맛집"
                  >
                    <Navigation className="h-3 w-3" />
                    내 주변
                  </button>
                )}
                <Link to="/admin" className="glass rounded-lg w-8 h-8 flex items-center justify-center active:scale-95 transition-transform">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground/50" />
                </Link>
                <Link to="/install" className="glass rounded-lg w-8 h-8 flex items-center justify-center active:scale-95 transition-transform">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <div className="glass rounded-lg w-8 h-8 flex items-center justify-center">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            {/* Row 2: Category grid - only when NOT in list mode */}
            {!showList && (
              <div className="safe-area-x pb-2">
                <CategoryTabs active={category} onChange={handleCategoryChange} categoryCounts={categoryCounts} />
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
              isDarkMode={isDarkMode}
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
            recentRestaurants={recentRestaurants}
          />
        </div>
        <TipForm />
        <FeedbackForm />
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
              <h1 className="text-lg font-bold text-foreground tracking-tight">춘천 맛집 가이드</h1>
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
            <CategoryTabs active={category} onChange={handleCategoryChange} categoryCounts={categoryCounts} />
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
                  <SearchBar query={query} onQueryChange={setQuery} restaurants={restaurants} onSelectRestaurant={setSelectedId} />
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
              {sort === "rating" ? "평점 높은 순" : sort === "reviews" ? "리뷰 많은 순" : sort === "newest" ? "최신 순" : "가까운 순"}
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
