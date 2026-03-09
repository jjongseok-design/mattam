import { Star, MapPin, Phone, CheckCircle2, ExternalLink, Share2, Clock, Heart, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Restaurant } from "@/hooks/useRestaurants";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import { useToast } from "@/hooks/use-toast";

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  isVisited: boolean;
  isFavorite?: boolean;
  distance?: number | null;
  onClick: () => void;
  onToggleVisited: (e: React.MouseEvent) => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

const RestaurantCard = ({ restaurant, isSelected, isVisited, isFavorite, distance, onClick, onToggleVisited, onToggleFavorite }: RestaurantCardProps) => {
  const emoji = CATEGORY_EMOJI[restaurant.category] || "🍽️";
  const { toast } = useToast();

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/restaurant/${restaurant.id}`;
    const text = `${restaurant.name} - 춘천 맛집`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "링크가 복사되었습니다 📋" });
    }
  };

  const distText = distance != null
    ? distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
    : null;

  return (
    <motion.button
      layout
      data-restaurant-id={restaurant.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      aria-label={`${restaurant.name} - 평점 ${restaurant.rating}`}
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
        <div className="flex items-center gap-1 flex-shrink-0">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={`p-1 rounded-full transition-all duration-200 ${
                isFavorite
                  ? "text-destructive"
                  : "text-muted-foreground/30 hover:text-destructive/50"
              }`}
              aria-label={isFavorite ? "찜 취소" : "찜하기"}
            >
              <Heart className={`h-[16px] w-[16px] ${isFavorite ? "fill-current" : ""}`} />
            </button>
          )}
          <button
            onClick={handleShare}
            className="p-1 rounded-full text-muted-foreground/30 hover:text-primary/70 transition-all duration-200"
            aria-label="공유하기"
          >
            <Share2 className="h-[16px] w-[16px]" />
          </button>
          <button
            onClick={onToggleVisited}
            className={`p-1 rounded-full transition-all duration-200 ${
              isVisited
                ? "text-primary"
                : "text-muted-foreground/30 hover:text-primary/50"
            }`}
            aria-label={isVisited ? "방문 취소" : "방문 표시"}
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
          {distText && (
            <span className="ml-auto flex items-center gap-0.5 text-[11px] font-medium text-primary/60 flex-shrink-0">
              <Navigation className="h-2.5 w-2.5" />
              {distText}
            </span>
          )}
        </div>
        {restaurant.phone && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Phone className="h-3 w-3 flex-shrink-0 text-primary/40" />
            <a
              href={`tel:${restaurant.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary transition-colors"
            >
              {restaurant.phone}
            </a>
            {restaurant.priceRange && (
              <span className="ml-auto text-[11px] font-medium text-foreground/60">{restaurant.priceRange}</span>
            )}
          </div>
        )}
        {restaurant.openingHours && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Clock className="h-3 w-3 flex-shrink-0 text-primary/40" />
            <span className="truncate">{restaurant.openingHours}</span>
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
          ⭐ {restaurant.rating}
        </span>
        <div className="flex items-center gap-3">
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary font-medium transition-colors"
            >
              <Phone className="h-3 w-3" /> 전화
            </a>
          )}
          <Link
            to={`/restaurant/${restaurant.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-primary/70 hover:text-primary font-medium transition-colors"
          >
            리뷰
          </Link>
          <a
            href={`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + ' 춘천')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary font-medium transition-colors"
          >
            네이버지도 <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.button>
  );
};

export default RestaurantCard;
