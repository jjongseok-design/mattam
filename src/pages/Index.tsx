import { useMemo, useState } from "react";
import { MapPin, Utensils } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import RestaurantCard from "@/components/RestaurantCard";
import MapView from "@/components/MapView";
import { sampleRestaurants } from "@/data/restaurants";

const Index = () => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = sampleRestaurants;

    if (selectedCategory !== "전체") {
      list = list.filter((r) => r.category === selectedCategory);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q)) ||
          r.category.includes(q) ||
          r.address.includes(q)
      );
    }

    // 별점 높은 순 정렬
    return [...list].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  }, [query, selectedCategory]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Side Panel */}
      <div className="w-[420px] flex-shrink-0 h-full flex flex-col border-r border-border bg-card shadow-panel z-10">
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Utensils className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">춘천 맛집지도</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                강원도 춘천시
              </p>
            </div>
          </div>
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          <p className="text-xs text-muted-foreground px-1 mb-1">
            {filtered.length}개 음식점 · 별점순 정렬
          </p>
          {filtered.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              isSelected={selectedId === restaurant.id}
              onClick={() => setSelectedId(restaurant.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Utensils className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">검색 결과가 없습니다</p>
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
    </div>
  );
};

export default Index;
