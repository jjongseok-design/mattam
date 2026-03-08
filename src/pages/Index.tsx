import { useMemo, useState, useCallback } from "react";
import { MapPin, Utensils, Loader2, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import RestaurantCard from "@/components/RestaurantCard";
import MapView from "@/components/MapView";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import CategoryTabs, { CategoryId } from "@/components/CategoryTabs";
import TipForm from "@/components/TipForm";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisited } from "@/hooks/useVisited";
import { AnimatePresence } from "framer-motion";

const BUILD_TAG = "2026.03.08-r2";

const Index = () => {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>("닭갈비");
  
  const isMobile = useIsMobile();
  const { data: restaurants = [], isLoading } = useRestaurants();
  const { isVisited, toggle: toggleVisited } = useVisited();

  const handleCategoryChange = useCallback((cat: CategoryId) => {
    setCategory(cat);
    setSelectedId(null);
    setQuery("");
  }, []);

  const categoryRestaurants = useMemo(
    () => restaurants.filter((r) => r.category === category),
    [restaurants, category]
  );

  const filtered = useMemo(() => {
    let list = categoryRestaurants;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q)) ||
          r.address.includes(q)
      );
    }

    return [...list].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  }, [query, categoryRestaurants]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="relative h-dvh w-screen overflow-hidden bg-background">
        <div className="absolute inset-0 z-0">
          <MapView
            restaurants={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <MobileBottomSheet
          restaurants={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          query={query}
          onQueryChange={setQuery}
          totalCount={categoryRestaurants.length}
          category={category}
          onCategoryChange={handleCategoryChange}
          isVisited={isVisited}
          onToggleVisited={toggleVisited}
        />
        <TipForm />
      </div>
    );

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
            <Link to="/admin">
              <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors" title="관리자">
                <Settings className="h-4 w-4 text-muted-foreground/50" />
              </button>
            </Link>
          </div>
          <CategoryTabs active={category} onChange={handleCategoryChange} />
          <div className="mt-3">
            <SearchBar query={query} onQueryChange={setQuery} />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/60 mx-4" />

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground/60 px-1.5 mb-1 font-medium">
            {filtered.length}개 {category} · 평점 높은 순
          </p>
          <AnimatePresence mode="popLayout">
            {filtered.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                isSelected={selectedId === restaurant.id}
                isVisited={isVisited(restaurant.id)}
                onClick={() => setSelectedId(restaurant.id)}
                onToggleVisited={(e) => { e.stopPropagation(); toggleVisited(restaurant.id); }}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Utensils className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">검색 결과가 없습니다</p>
              <p className="text-xs text-muted-foreground/50 mt-1">다른 키워드로 검색해보세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 h-full">
        <MapView
          restaurants={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <TipForm />
    </div>
  );
};

export default Index;
