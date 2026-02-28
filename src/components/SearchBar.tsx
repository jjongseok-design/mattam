import { Search } from "lucide-react";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
}

const SearchBar = ({ query, onQueryChange }: SearchBarProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="음식점 이름, 메뉴 검색..."
        className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
    </div>
  );
};

export default SearchBar;
