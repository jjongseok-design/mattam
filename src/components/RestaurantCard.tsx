import { Star, MapPin, Phone, CheckCircle2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import type { Restaurant } from "@/hooks/useRestaurants";

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  isVisited: boolean;
  onClick: () => void;
  onToggleVisited: (e: React.MouseEvent) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "닭갈비": "🍗", "막국수": "🍜", "중국집": "🥟", "갈비탕": "🍖",
  "삼계탕": "🐔", "칼국수": "🍜", "수제버거": "🍔", "삼겹살": "🥓",
  "초밥": "🍣", "일식": "🍱", "감자탕": "🥘", "한우": "🥩",
  "돼지갈비": "🍖", "이탈리안": "🍝", "베이커리": "🥐", "설렁탕/곰탕": "🍲",
  "보쌈/족발": "🐷", "돈까스": "🍛",
};

const RestaurantCard = ({ restaurant, isSelected, isVisited, onClick, onToggleVisited }: RestaurantCardProps) => {
  const emoji = CATEGORY_EMOJI[restaurant.category] || "🍽️";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group w-full text-left p-4 rounded-2xl transition-all duration-300 border ${
        isSelected
          ? "border-primary/30 bg-card shadow-card-selected"
          : "border-border/50 bg-card hover:shadow-card-hover hover:border-primary/10"
      } ${isVisited ? "ring-1 ring-primary/20" : ""}`}
    >
      {/* Header row */}
      <div className="flex justify-between items-start gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0 grayscale-0">{emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground text-[15px] leading-tight truncate">
                {restaurant.name}
              </h3>
              {isVisited && (
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide flex-shrink-0">
                  방문
                </span>
              )}
            </div>
            {restaurant.description && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{restaurant.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onToggleVisited}
            className={`p-1 rounded-full transition-all duration-200 ${
              isVisited
                ? "text-primary"
                : "text-muted-foreground/30 hover:text-primary/50"
            }`}
            title={isVisited ? "방문 취소" : "방문 표시"}
          >
            <CheckCircle2 className={`h-[18px] w-[18px] ${isVisited ? "fill-primary/15" : ""}`} />
          </button>
          <div className="flex items-center gap-0.5 bg-secondary px-2 py-1 rounded-lg">
            <Star className="h-3 w-3 text-rating fill-current" />
            <span className="text-[13px] font-bold text-foreground">{restaurant.rating}</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <MapPin className="h-3 w-3 flex-shrink-0 text-primary/40" />
          <span className="truncate">{restaurant.address}</span>
        </div>
        {restaurant.phone && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Phone className="h-3 w-3 flex-shrink-0 text-primary/40" />
            <span>{restaurant.phone}</span>
            {restaurant.priceRange && (
              <span className="ml-auto text-[11px] font-medium text-foreground/60">{restaurant.priceRange}</span>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {restaurant.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-muted/80 rounded-md text-[11px] font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className="text-[11px] text-muted-foreground/70">
          리뷰 {restaurant.reviewCount.toLocaleString()}개
        </span>
        <a
          href={`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + ' 춘천')}`}
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary font-medium transition-colors"
        >
          네이버지도 <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </motion.button>
  );
};

export default RestaurantCard;
