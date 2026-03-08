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

const RestaurantCard = ({ restaurant, isSelected, isVisited, onClick, onToggleVisited }: RestaurantCardProps) => {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${
        isSelected
          ? "border-primary bg-secondary shadow-card-hover"
          : "border-transparent bg-card hover:shadow-card-hover hover:border-border"
      } ${isVisited ? "ring-1 ring-primary/30" : ""}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🥟</span>
          <h3 className="font-semibold text-foreground text-base">{restaurant.name}</h3>
          {isVisited && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              방문완료
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleVisited}
            className={`p-1 rounded-full transition-colors ${
              isVisited
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground/40 hover:text-primary/60"
            }`}
            title={isVisited ? "방문 취소" : "방문 표시"}
          >
            <CheckCircle2 className={`h-5 w-5 ${isVisited ? "fill-primary/20" : ""}`} />
          </button>
          <div className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-md">
            <Star className="h-3.5 w-3.5 text-rating fill-current" />
            <span className="text-sm font-bold text-foreground">{restaurant.rating}</span>
          </div>
        </div>
      </div>

      {restaurant.description && (
        <p className="text-xs text-muted-foreground mb-2">{restaurant.description}</p>
      )}

      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{restaurant.address}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Phone className="h-3 w-3 flex-shrink-0" />
        <span>{restaurant.phone}</span>
        <span className="ml-auto text-xs">{restaurant.priceRange}</span>
      </div>

      <div className="flex gap-1 flex-wrap mb-2">
        {restaurant.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-muted rounded text-[11px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          리뷰 {restaurant.reviewCount.toLocaleString()}개
        </div>
        <a
          href={`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + ' 춘천')}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium"
        >
          네이버지도 <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </motion.button>
  );
};

export default RestaurantCard;
