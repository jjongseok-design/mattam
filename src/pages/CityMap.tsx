import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Utensils, Heart, User, Loader2, Settings, Navigation, Download, ArrowLeft } from "lucide-react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import RestaurantCard from "@/components/RestaurantCard";
import MapView from "@/components/MapView";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import CategoryTabs from "@/components/CategoryTabs";
import { useCategories } from "@/hooks/useCategories";
import TipForm from "@/components/TipForm";
import OnboardingSlide from "@/components/OnboardingSlide";
import FeedbackForm from "@/components/FeedbackForm";
import ThemeToggle from "@/components/ThemeToggle";
import ErrorState from "@/components/ErrorState";
import JsonLd from "@/components/JsonLd";
import SortFilterBar, { SortOption, FilterOption } from "@/components/SortFilterBar";
import RandomPickButton from "@/components/RandomPickButton";
import TourProgress from "@/components/TourProgress";
import ShareCard from "@/components/ShareCard";
import { useRestaurants, type Restaurant } from "@/hooks/useRestaurants";
import { useCity } from "@/hooks/useCities";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisited } from "@/hooks/useVisited";
import { useFavorites } from "@/hooks/useFavorites";
import { useGeolocation, getDistanceKm } from "@/hooks/useGeolocation";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import { CityContext } from "@/contexts/CityContext";
import { useFirstVisitorCounts } from "@/hooks/useVisitCount";

const INDEX_STATE_KEY = "index_scroll_state";
const SCROLL_TOP_KEY = "citymap_list_scrolltop";

interface SavedState {
  categories: string[];
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

const CityMap = () => {
  const { cityId } = useParams<{ cityId: string }>();
  const { data: city } = useCity(cityId);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialCatParam = searchParams.get("category");
  const initialCats: string[] = initialCatParam
    ? initialCatParam.split(",").filter(Boolean)
    : [];

  const saved = useRef(loadState());
  const isRestored = useRef(false);

  const [query, setQuery] = useState(saved.current?.query || "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: dbCategories = [] } = useCategories(cityId);
  const [categories, setCategories] = useState<string[]>(
    initialCats.length > 0 ? initialCats : (saved.current?.categories ?? [])
  );

  // 첫 방문(세션 저장값 없음)이고 URL 파라미터도 없을 때 첫 번째 카테고리 자동 선택
  const isFirstVisit = saved.current === null;
  useEffect(() => {
    if (isFirstVisit && !initialCatParam && categories.length === 0 && dbCategories.length > 0) {
      setCategories([dbCategories[0].id]);
    }
  }, [dbCategories.length]);

  const [showList, setShowList] = useState(saved.current?.showList || false);
  const [sort, setSort] = useState<SortOption>(saved.current?.sort || "rating");
  const [filter, setFilter] = useState<FilterOption>(saved.current?.filter || "all");
  const [ratingMin, setRatingMin] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleOnboardingClose = () => {
    try { localStorage.setItem("mattam_onboarding_done", "1"); } catch {}
    setShowOnboarding(false);
  };
  const [activeTab, setActiveTab] = useState<"map" | "list" | "favorites">("map");
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  const isMobile = useIsMobile();
  const { data: restaurants = [], isLoading, isError, refetch } = useRestaurants(cityId);
  const { data: visitCounts } = useFirstVisitorCounts();
  const { visited, isVisited, toggle: toggleVisited } = useVisited();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { position, request: requestGeo } = useGeolocation();
  const { recentIds, addViewed } = useRecentlyViewed();
  const { toast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isLoading]);

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setSearchParams(categories.length > 0 ? { category: categories.join(",") } : {}, { replace: true });
  }, [categories, setSearchParams]);

  useEffect(() => {
    return () => {
      saveState({ categories, showList, scrollTop: 0, query, sort, filter });
    };
  }, [categories, showList, query, sort, filter]);

  useEffect(() => {
    if (!isRestored.current && listRef.current && restaurants.length > 0) {
      isRestored.current = true;
      try {
        const raw = sessionStorage.getItem(SCROLL_TOP_KEY);
        const savedScrollTop = raw ? Number(raw) : 0;
        if (savedScrollTop > 0) {
          setTimeout(() => {
            if (listRef.current) listRef.current.scrollTop = savedScrollTop;
          }, 150);
        }
      } catch {}
    }
  }, [restaurants]);

  const handleCategoryChange = useCallback((cat: string) => {
    setCategories((prev) => prev.includes(cat) ? [] : [cat]);
    setSelectedId(null);
    setQuery("");
  }, []);

  const handleCloseList = useCallback(() => { setShowList(false); setSelectedId(null); setQuery(""); }, []);

  useEffect(() => {
    if (sort === "distance" && !position) requestGeo();
  }, [sort, position, requestGeo]);

  const handleLocationRequest = useCallback(() => {
    requestGeo();
    toast({ title: "📍 현재 위치를 확인하고 있습니다..." });
  }, [requestGeo, toast]);

  const handleSelect = useCallback((id: string) => { setSelectedId(id); addViewed(id); }, [addViewed]);

  const handleFindNearest = useCallback(() => {
    if (!position || restaurants.length === 0) return;
    let nearest = restaurants[0];
    let minDist = getDistanceKm(position.lat, position.lng, nearest.lat, nearest.lng);
    for (const r of restaurants) {
      const d = getDistanceKm(position.lat, position.lng, r.lat, r.lng);
      if (d < minDist) { minDist = d; nearest = r; }
    }
    handleSelect(nearest.id);
    const distText = minDist < 1 ? `${Math.round(minDist * 1000)}m` : `${minDist.toFixed(1)}km`;
    toast({ title: `📍 가장 가까운 맛집: ${nearest.name}`, description: `${distText} 거리` });
  }, [position, restaurants, handleSelect, toast]);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-restaurant-id="${selectedId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of restaurants) counts[r.category] = (counts[r.category] || 0) + 1;
    return counts;
  }, [restaurants]);

  const categoryRestaurants = useMemo(
    () => categories.length === 0 ? restaurants : restaurants.filter((r) => categories.includes(r.category)),
    [restaurants, categories]
  );

  const isGlobalSearch = query.trim().length > 0;

  const filtered = useMemo(() => {
    let list = isGlobalSearch ? restaurants : categoryRestaurants;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q)) ||
        r.address.includes(q) || r.category.includes(q)
      );
    }
    if (filter === "favorites") list = list.filter((r) => isFavorite(r.id));
    else if (filter === "visited") list = list.filter((r) => isVisited(r.id));
    if (ratingMin > 0) list = list.filter((r) => r.rating >= ratingMin);
    return [...list].sort((a, b) => {
      // 추천 식당 우선 (다른 정렬 기준 앞에 적용)
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      if (sort === "distance" && position) {
        return getDistanceKm(position.lat, position.lng, a.lat, a.lng) - getDistanceKm(position.lat, position.lng, b.lat, b.lng);
      }
      if (sort === "reviews") return b.reviewCount - a.reviewCount || b.rating - a.rating;
      if (sort === "newest") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    });
  }, [query, categoryRestaurants, restaurants, isGlobalSearch, sort, filter, ratingMin, position, isFavorite, isVisited]);

  const recentRestaurants = useMemo(() => {
    if (recentIds.length === 0) return [];
    return recentIds.map((id) => restaurants.find((r) => r.id === id)).filter(Boolean).slice(0, 5) as Restaurant[];
  }, [recentIds, restaurants]);

  const getDistance = useCallback((lat: number, lng: number) => {
    if (!position) return null;
    return getDistanceKm(position.lat, position.lng, lat, lng);
  }, [position]);

  const cityLabel = city?.name ?? cityId ?? "맛집";

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">{cityLabel} 맛집 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const categoryEmoji = (categories.length === 1 ? CATEGORY_EMOJI[categories[0]] : null) || "🍽️";
  const categoryLabel = categories.length === 0 ? "전체"
    : categories.length === 1 ? categories[0]
    : `${categories[0]} 외 ${categories.length - 1}개`;

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
          visitCount={visitCounts ? (visitCounts[restaurant.id] ?? 0) : undefined}
          onClick={() => handleSelect(restaurant.id)}
          onToggleVisited={(e) => { e.stopPropagation(); toggleVisited(restaurant.id); }}
          onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(restaurant.id); }}
        />
      );
    });
  };

  return (
    <CityContext.Provider value={{ cityId: cityId ?? "", city: city ?? null }}>
      {isMobile ? (
        <>
          <div className="relative h-dvh w-screen overflow-hidden bg-background">
            <div
              className="absolute top-0 left-0 right-0 z-[1300] safe-area-top bg-card/90 border-b border-border/30"
              style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
            >
              <div className="safe-area-x pt-2 pb-1.5 flex items-center gap-2">
                <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center glass flex-shrink-0">
                  <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                    <Utensils className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h1 className="text-[14px] font-bold text-foreground">{cityLabel} 맛집</h1>
                  {categories.length > 0 && (
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {categoryEmoji} {categoryRestaurants.length}개
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!position ? (
                    <button onClick={handleLocationRequest} className="glass rounded-lg w-8 h-8 flex items-center justify-center active:scale-95 transition-transform" aria-label="내 위치">
                      <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ) : (
                    <button onClick={handleFindNearest} className="glass rounded-lg h-8 px-2 flex items-center gap-1 active:scale-95 transition-transform text-[11px] font-semibold text-primary" aria-label="내 주변 맛집">
                      <Navigation className="h-3 w-3" />내 주변
                    </button>
                  )}
                  <div className="glass rounded-lg w-8 h-8 flex items-center justify-center"><ThemeToggle /></div>
                  <Link to="/admin" className="glass rounded-lg w-8 h-8 flex items-center justify-center active:scale-95 transition-transform">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </Link>
                </div>
              </div>
              <div className="safe-area-x pb-2">
                <CategoryTabs active={categories} onChange={handleCategoryChange} categoryCounts={categoryCounts} cityId={cityId} />
              </div>
            </div>
            <div className="absolute inset-0 z-0">
              <MapView restaurants={filtered} selectedId={selectedId} onSelect={handleSelect} visitedIds={visited} isDarkMode={isDarkMode} city={city} />
            </div>
            {showList && (
              <MobileBottomSheet
                restaurants={filtered} selectedId={selectedId} onSelect={handleSelect}
                query={query} onQueryChange={setQuery} totalCount={categoryRestaurants.length}
                category={categoryLabel} onCategoryChange={handleCategoryChange}
                isVisited={isVisited} onToggleVisited={toggleVisited}
                isFavorite={isFavorite} onToggleFavorite={toggleFavorite}
                sort={sort} onSortChange={setSort} filter={filter} onFilterChange={setFilter}
                hasLocation={!!position} ratingMin={ratingMin} onRatingMinChange={setRatingMin}
                getDistance={getDistance} onClose={handleCloseList}
                recentRestaurants={recentRestaurants} allRestaurants={restaurants} visited={visited}
                onShare={() => setShareOpen(true)}
              />
            )}
          </div>
          <TipForm open={tipOpen} onClose={() => setTipOpen(false)} />
          <AnimatePresence>
            {showOnboarding && <OnboardingSlide onClose={handleOnboardingClose} />}
          </AnimatePresence>

          {/* 하단 탭바 */}
          <div className="fixed bottom-0 left-0 right-0 z-[1400] bg-card/95 border-t border-border/30"
            style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-around px-4 h-16">
              <button
                onClick={() => { setActiveTab("map"); setShowList(false); setFilter("all"); }}
                className={`flex flex-col items-center gap-[3px] transition-colors ${activeTab === "map" ? "text-primary" : "text-muted-foreground/60"}`}>
                <MapPin className="h-[22px] w-[22px]" strokeWidth={1.8} />
                <span className="text-[10px] font-medium tracking-tight">지도</span>
              </button>
              <button
                onClick={() => { setActiveTab("list"); setShowList(true); setFilter("all"); }}
                className={`flex flex-col items-center gap-[3px] transition-colors ${activeTab === "list" ? "text-primary" : "text-muted-foreground/60"}`}>
                <Utensils className="h-[22px] w-[22px]" strokeWidth={1.8} />
                <span className="text-[10px] font-medium tracking-tight">목록</span>
              </button>
              <button
                onClick={() => setTipOpen(true)}
                className="w-14 h-14 -mt-6 rounded-full bg-primary shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                <span className="text-white text-[28px] font-light leading-none">+</span>
              </button>
              <button
                onClick={() => { setActiveTab("favorites"); setShowList(true); setFilter("favorites"); }}
                className={`flex flex-col items-center gap-[3px] transition-colors ${activeTab === "favorites" ? "text-primary" : "text-muted-foreground/60"}`}>
                <Heart className="h-[22px] w-[22px]" strokeWidth={1.8} fill={activeTab === "favorites" ? "currentColor" : "none"} />
                <span className="text-[10px] font-medium tracking-tight">찜</span>
              </button>
              <Link to={`/${cityId}/mypage`} className="flex flex-col items-center gap-[3px] text-muted-foreground/60 hover:text-foreground transition-colors">
                <User className="h-[22px] w-[22px]" strokeWidth={1.8} />
                <span className="text-[10px] font-medium tracking-tight">내정보</span>
              </Link>
            </div>
          </div>

          <FeedbackForm />
          <JsonLd />
          <ShareCard open={shareOpen} onClose={() => setShareOpen(false)} restaurants={restaurants} visited={visited} cityName={city?.name} />
        </>
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-background">
          <div className="w-[40%] flex-shrink-0 h-full flex flex-col bg-card z-10" style={{ boxShadow: "var(--panel-shadow)" }}>
            <div className="border-b border-border/40">
              <div className="px-5 pt-4 pb-3 flex items-center gap-2.5">
                <Link to="/" className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </Link>
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                  <Utensils className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-[15px] font-bold text-foreground tracking-tight">{cityLabel} 맛집</h1>
                  <p className="text-[11px] text-muted-foreground">{city?.description ?? ""} · {restaurants.length}곳</p>
                </div>
                <div className="flex items-center gap-0.5">
                  {!position ? (
                    <button onClick={handleLocationRequest} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors" title="내 위치 찾기">
                      <Navigation className="h-5 w-5 text-muted-foreground/50" />
                    </button>
                  ) : (
                    <button onClick={handleFindNearest} className="w-9 h-9 rounded-lg hover:bg-primary/10 text-primary/60 hover:text-primary flex items-center justify-center transition-colors" title="가장 가까운 맛집">
                      <Navigation className="h-5 w-5" />
                    </button>
                  )}
                  <ThemeToggle />
                  <Link to="/install">
                    <button className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors" title="앱 설치">
                      <Download className="h-5 w-5 text-muted-foreground/50" />
                    </button>
                  </Link>
                  <Link to="/admin">
                    <button className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors" title="관리자">
                      <Settings className="h-5 w-5 text-muted-foreground/40" />
                    </button>
                  </Link>
                </div>
              </div>
              <div ref={stripRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-2 pb-1" style={{ paddingLeft: "20px", paddingRight: "20px" }}>
                {dbCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[14px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                      categories.includes(cat.id)
                        ? "bg-foreground text-background shadow-sm scale-[1.03]"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="text-base leading-none">{cat.emoji}</span>
                    <span>{cat.label}</span>
                    {categoryCounts[cat.id] != null && <span className="text-[12px] opacity-50">{categoryCounts[cat.id]}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-2.5 border-b border-border/30">
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchBar query={query} onQueryChange={setQuery} restaurants={restaurants} onSelectRestaurant={handleSelect} />
                </div>
                <RandomPickButton restaurants={filtered} />
              </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin" onScroll={() => { try { sessionStorage.setItem(SCROLL_TOP_KEY, String(listRef.current?.scrollTop || 0)); } catch {} }}>
              {recentRestaurants.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wide mb-2">최근 본 식당</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {recentRestaurants.map((r) => (
                      <Link key={r.id} to={`/${cityId}/restaurant/${r.slug}`}
                        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/60 hover:bg-muted rounded-lg text-[11px] font-medium text-foreground transition-colors border border-border/30 hover:border-primary/20">
                        <span className="text-sm">{CATEGORY_EMOJI[r.category] || "🍽️"}</span>
                        {r.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-1.5 flex-wrap">
                {(["rating", "reviews", "newest", ...(position ? ["distance"] : [])] as SortOption[]).map((val) => {
                  const label = val === "rating" ? "평점순" : val === "reviews" ? "리뷰순" : val === "newest" ? "최신순" : "거리순";
                  return (
                    <button key={val} onClick={() => setSort(val)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 ${
                        sort === val ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
                      }`}>
                      {label}
                    </button>
                  );
                })}
                <div className="w-px h-3.5 bg-border/60 mx-0.5" />
                {([{ value: "favorites" as FilterOption, label: "❤ 찜" }, { value: "visited" as FilterOption, label: "✓ 방문" }]).map((opt) => (
                  <button key={opt.value} onClick={() => setFilter(filter === opt.value ? "all" : opt.value)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 ${
                      filter === opt.value ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
                    }`}>
                    {opt.label}
                  </button>
                ))}
                {ratingMin > 0 && (
                  <button onClick={() => setRatingMin(0)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap bg-accent/10 text-accent border border-accent/20">
                    ★{ratingMin}+ ×
                  </button>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground/50">
                  {isGlobalSearch && <span className="text-primary mr-1">🔍</span>}
                  {filtered.length}개{!isGlobalSearch && ` ${categoryEmoji} ${categoryLabel}`}
                </span>
              </div>

              <div className="px-3 pb-4 space-y-2">
                <AnimatePresence mode="sync">{renderRestaurantList()}</AnimatePresence>
                {filtered.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Utensils className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">검색 결과가 없습니다</p>
                    <p className="text-xs text-muted-foreground/40 mt-1">다른 키워드로 검색해보세요</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 text-center text-[10px] text-muted-foreground/30 border-t border-border/20">
                © {new Date().getFullYear()} 맛탐 · {cityLabel} 맛집지도
              </div>
            </div>
          </div>

          <div className="w-[60%] h-full relative">
            <div className="absolute top-4 right-4 z-[1000] w-72">
              <TourProgress restaurants={restaurants} visited={visited} onShare={() => setShareOpen(true)} cityName={city?.name} />
            </div>
            <MapView restaurants={filtered} selectedId={selectedId} onSelect={handleSelect} visitedIds={visited} city={city} />
          </div>
          <TipForm />
          <JsonLd />
          <ShareCard open={shareOpen} onClose={() => setShareOpen(false)} restaurants={restaurants} visited={visited} cityName={city?.name} />
        </div>
      )}
    </CityContext.Provider>
  );
};

export default CityMap;
