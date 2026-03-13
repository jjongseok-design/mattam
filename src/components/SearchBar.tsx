import { Search, X } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  restaurants?: Restaurant[];
  onSelectRestaurant?: (id: string) => void;
}

const SearchBar = ({ query, onQueryChange, restaurants = [], onSelectRestaurant }: SearchBarProps) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = query.trim().length >= 1
    ? restaurants
        .filter((r) => {
          const q = query.toLowerCase();
          return (
            r.name.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            r.tags.some((t) => t.toLowerCase().includes(q)) ||
            r.address.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  const handleSelect = useCallback(
    (r: Restaurant) => {
      onQueryChange(r.name);
      setOpen(false);
      onSelectRestaurant?.(r.id);
      inputRef.current?.blur();
    },
    [onQueryChange, onSelectRestaurant]
  );

  return (
    <div className="relative group">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60 group-focus-within:text-primary/60 transition-colors z-10" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { onQueryChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="전체 카테고리에서 검색..."
        aria-label="음식점 검색"
        className="w-full pl-8 pr-8 py-1 bg-muted/60 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all duration-200 border border-transparent focus:border-primary/10"
      />
      {query && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onQueryChange(""); setOpen(false); inputRef.current?.focus(); }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors z-10"
          aria-label="검색어 지우기"
        >
          <span className="w-5 h-5 rounded-full bg-muted-foreground/15 hover:bg-muted-foreground/25 flex items-center justify-center">
            <X className="h-3 w-3 text-muted-foreground" />
          </span>
        </button>
      )}

      {/* 자동완성 드롭다운 */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/60 rounded-xl shadow-lg z-50 overflow-hidden">
          {suggestions.map((r) => (
            <button
              key={r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-foreground truncate flex-1">{r.name}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md flex-shrink-0">
                {r.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
