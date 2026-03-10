import { Search, X } from "lucide-react";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
}

const SearchBar = ({ query, onQueryChange }: SearchBarProps) => {
  return (
    <div className="relative group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary/60 transition-colors" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="전체 카테고리에서 검색..."
        aria-label="음식점 검색"
        className="w-full pl-10 pr-10 py-2.5 bg-muted/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card transition-all duration-200 border border-transparent focus:border-primary/10"
      />
      {query && (
        <button
          onClick={() => onQueryChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-colors"
          aria-label="검색어 지우기"
        >
          <span className="w-5 h-5 rounded-full bg-muted-foreground/15 hover:bg-muted-foreground/25 flex items-center justify-center">
            <X className="h-3 w-3 text-muted-foreground" />
          </span>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
