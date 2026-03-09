import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Utensils, Loader2, Settings, Navigation, Heart, Download } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
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
import { useRestaurants } from "@/hooks/useRestaurants";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisited } from "@/hooks/useVisited";
import { useFavorites } from "@/hooks/useFavorites";
import { useGeolocation, getDistanceKm } from "@/hooks/useGeolocation";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get("category");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: dbCategories = [] } = useCategories();
  const [category, setCategory] = useState<string>(initialCat || "닭갈비");
  const [sort, setSort] = useState<SortOption>("rating");
  const [filter, setFilter] = useState<FilterOption>("all");
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

  const handleCategoryChange = useCallback((cat: string) => {
    setCategory(cat);
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

  const filtered = useMemo(() => {
    let list = categoryRestaurants;

    // Text search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q)) ||
          r.address.includes(q)
      );
    }

    // Filter: favorites / visited
    if (filter === "favorites") {
      list = list.filter((r) => isFavorite(r.id));
    } else if (filter === "visited") {
      list = list.filter((r) => isVisited(r.id));
    }

    // Rating filter
    if (ratingMin > 0) {
      list = list.filter((r) => r.rating >= ratingMin);
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sort === "distance" && position) {
        const dA = getDistanceKm(position.lat, position.lng, a.lat, a.lng);
        const dB = getDistanceKm(position.lat, position.lng, b.lat, b.lng);
        return dA - dB;
      }
      if (sort === "reviews") {
        return b.reviewCount - a.reviewCount || b.rating - a.rating;
      }
      // default: rating
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    });
  }, [query, categoryRestaurants, sort, filter, ratingMin, position, isFavorite, isVisited]);

  // Distance helper for display
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

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <div className="relative h-dvh w-screen overflow-hidden bg-background">
          {/* Mobile top buttons */}
          <div className="absolute top-3 right-3 z-[1300] flex items-center gap-2">
            {!position && (
              <button
                onClick={handleLocationRequest}
                className="glass rounded-lg w-8 h-8 flex items-center justify-center"
                aria-label="내 위치 찾기"
              >
                <Navigation className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <Link to="/install" className="glass rounded-lg w-8 h-8 flex items-center justify-center">
              <Download className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div className="glass rounded-lg">
              <ThemeToggle />
            </div>
          </div>
          <div className="absolute inset-0 z-0">
            <MapView
              restaurants={filtered}
              selectedId={selectedId}
              onSelect={handleSelect}
              visitedIds={visited}
            />
          </div>
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
      <div className="w-[420px] flex-shrink-0 h-full flex flex-col border-r border-border/50 bg-card shadow-panel z-10">
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
                강원특별자치도 춘천시 · {categoryRestaurants.length}개 식당
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
          <CategoryTabs active={category} onChange={handleCategoryChange} />
          <div className="mt-3 flex gap-2">
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
        </div>

        {/* Divider */}
        <div className="h-px bg-border/60 mx-4" />

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground/60 px-1.5 mb-1 font-medium">
            {filtered.length}개 {category} ·{" "}
            {sort === "rating" ? "평점 높은 순" : sort === "reviews" ? "리뷰 많은 순" : "가까운 순"}
            {filter !== "all" && ` · ${filter === "favorites" ? "찜한 곳" : "방문한 곳"}`}
          </p>
          <AnimatePresence mode="popLayout">
            {filtered.map((restaurant) => {
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
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Utensils className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">검색 결과가 없습니다</p>
              <p className="text-xs text-muted-foreground/50 mt-1">다른 키워드로 검색해보세요</p>
            </div>
          )}
          {/* Copyright */}
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
