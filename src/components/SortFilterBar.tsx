import { ArrowUpDown, SlidersHorizontal, Heart, CheckCircle2, Navigation, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type SortOption = "rating" | "reviews" | "distance";
export type FilterOption = "all" | "visited" | "favorites";

interface SortFilterBarProps {
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  filter: FilterOption;
  onFilterChange: (f: FilterOption) => void;
  hasLocation: boolean;
  ratingMin: number;
  onRatingMinChange: (n: number) => void;
}

const SortFilterBar = ({
  sort,
  onSortChange,
  filter,
  onFilterChange,
  hasLocation,
  ratingMin,
  onRatingMinChange,
}: SortFilterBarProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions: { value: SortOption; label: string; icon?: React.ReactNode }[] = [
    { value: "rating", label: "평점순" },
    { value: "reviews", label: "리뷰순" },
    ...(hasLocation ? [{ value: "distance" as SortOption, label: "거리순", icon: <Navigation className="h-3 w-3" /> }] : []),
  ];

  const filterOptions: { value: FilterOption; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "전체", icon: <SlidersHorizontal className="h-3 w-3" /> },
    { value: "favorites", label: "찜", icon: <Heart className="h-3 w-3" /> },
    { value: "visited", label: "방문", icon: <CheckCircle2 className="h-3 w-3" /> },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Sort pills */}
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg text-[11px] font-medium transition-all duration-200 ${
              sort === opt.value
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted/60 text-muted-foreground hover:bg-muted border border-transparent"
            }`}
          >
            {opt.icon || <ArrowUpDown className="h-3 w-3" />}
            {opt.label}
          </button>
        ))}

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Filter pills */}
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 ${
              filter === opt.value
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted/60 text-muted-foreground hover:bg-muted border border-transparent"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}

        {/* Rating filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 ${
            ratingMin > 0
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-muted/60 text-muted-foreground hover:bg-muted border border-transparent"
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          {ratingMin > 0 ? `★${ratingMin}+` : "평점"}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-1 py-1.5">
              <span className="text-[11px] text-muted-foreground">최소 평점:</span>
              <div className="flex gap-1">
                {[0, 3, 3.5, 4, 4.5].map((v) => (
                  <button
                    key={v}
                    onClick={() => { onRatingMinChange(v); if (v === 0) setShowFilters(false); }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      ratingMin === v
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {v === 0 ? "전체" : `${v}+`}
                  </button>
                ))}
              </div>
              {ratingMin > 0 && (
                <button
                  onClick={() => { onRatingMinChange(0); setShowFilters(false); }}
                  className="ml-auto p-0.5 rounded text-muted-foreground hover:text-foreground"
                  aria-label="필터 초기화"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SortFilterBar;
