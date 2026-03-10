import { memo } from "react";
import { Star, MapPin, Phone, CheckCircle2, ExternalLink, Share2, Clock, Heart, Navigation, MessageSquare, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Restaurant } from "@/hooks/useRestaurants";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import { getCategoryImage } from "@/data/categoryImages";
import { useToast } from "@/hooks/use-toast";

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  isVisited: boolean;
  isFavorite?: boolean;
  distance?: number | null;
  compact?: boolean;
  onClick: () => void;
  onToggleVisited: (e: React.MouseEvent) => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

const RestaurantCard = memo(({ restaurant, isSelected, isVisited, isFavorite, distance, compact, onClick, onToggleVisited, onToggleFavorite }: RestaurantCardProps) => {
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

  const imageThumb = restaurant.imageUrl || getCategoryImage(restaurant.category);

  // Compact mobile variant
  if (compact) {
    return (
      <motion.div
        layout
        data-restaurant-id={restaurant.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className={`group w-full text-left rounded-xl transition-all duration-200 border overflow-hidden ${
          isSelected
            ? "border-primary/30 bg-card shadow-card-selected"
            : "border-border/50 bg-card active:bg-muted/50"
        } ${isVisited ? "ring-1 ring-primary/20" : ""}`}
      >
        <button
          onClick={onClick}
          className="w-full text-left"
          aria-label={`${restaurant.name} - 평점 ${restaurant.rating}`}
        >
          {/* Image row */}
          {imageThumb && (
            <div className="w-full h-28 bg-muted overflow-hidden">
              <img src={imageThumb} alt={restaurant.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="p-3.5">
            {/* Header row */}
            <div className="flex items-center gap-2.5 mb-1.5">
              {!imageThumb && (
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                  {emoji}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-foreground text-[14px] leading-tight truncate">
                    {restaurant.name}
                  </h3>
                  {isVisited && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                      방문
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground truncate">{restaurant.address}</span>
                </div>
              </div>
              {/* Rating */}
              <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-lg flex-shrink-0">
                <Star className="h-3 w-3 text-rating fill-current" />
                <span className="text-xs font-extrabold text-foreground">{restaurant.rating}</span>
              </div>
            </div>

            {/* Tags + distance + actions */}
            <div className="flex items-center gap-1.5 mt-1">
              {restaurant.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-muted/80 rounded-md text-[10px] font-medium text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
              {distText && (
                <span className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-primary/70 flex-shrink-0">
                  <Navigation className="h-2.5 w-2.5" />
                  {distText}
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Action bar */}
        <div className="flex items-center justify-between px-3.5 pb-3 pt-0">
          <div className="flex items-center gap-0.5">
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={`p-1.5 rounded-lg transition-colors ${
                  isFavorite ? "text-destructive" : "text-muted-foreground/30"
                }`}
                aria-label={isFavorite ? "찜 취소" : "찜하기"}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
            <button
              onClick={onToggleVisited}
              className={`p-1.5 rounded-lg transition-colors ${
                isVisited ? "text-primary" : "text-muted-foreground/30"
              }`}
              aria-label={isVisited ? "방문 취소" : "방문 체크"}
            >
              <CheckCircle2 className={`h-4 w-4 ${isVisited ? "fill-primary/15" : ""}`} />
            </button>
          </div>
          <Link
            to={`/restaurant/${restaurant.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-primary font-semibold px-3 py-1.5 min-h-[36px] rounded-lg bg-primary/10 active:bg-primary/20 transition-colors"
          >
            상세보기 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    );
  }

  // Full desktop variant
  return (
    <motion.div
      layout
      data-restaurant-id={restaurant.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`group w-full text-left rounded-2xl transition-all duration-300 border overflow-hidden ${
        isSelected
          ? "border-primary/30 bg-card shadow-card-selected"
          : "border-border/50 bg-card hover:shadow-card-hover hover:border-primary/10"
      } ${isVisited ? "ring-1 ring-primary/20" : ""}`}
    >
      {/* Image */}
      {imageThumb && (
        <button onClick={onClick} className="w-full block">
          <div className="w-full h-40 bg-muted overflow-hidden">
            <img
              src={imageThumb}
              alt={restaurant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        </button>
      )}

      {/* Top accent bar when selected (only without image) */}
      {!imageThumb && (
        <div className={`h-1 w-full transition-all duration-300 ${isSelected ? "bg-gradient-primary" : "bg-transparent"}`} />
      )}

      <div className="p-5">
        {/* Header: emoji + name + rating */}
        <button onClick={onClick} className="w-full text-left" aria-label={`${restaurant.name} 선택`}>
          <div className="flex items-start gap-3 mb-3">
            {!imageThumb && (
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
                {emoji}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-base leading-snug truncate">
                  {restaurant.name}
                </h3>
                {isVisited && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                    방문완료
                  </span>
                )}
              </div>
              {restaurant.description && (
                <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{restaurant.description}</p>
              )}
            </div>

            {/* Rating badge */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 bg-secondary px-2.5 py-1.5 rounded-xl">
                <Star className="h-3.5 w-3.5 text-rating fill-current" />
                <span className="text-sm font-extrabold text-foreground">{restaurant.rating}</span>
              </div>
              <span className="text-[10px] text-muted-foreground/60">
                <MessageSquare className="h-2.5 w-2.5 inline mr-0.5" />
                {restaurant.reviewCount}
              </span>
            </div>
          </div>
        </button>

        {/* Info rows */}
        <div className="space-y-1.5 mb-3.5">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/50" />
            <span className="truncate">{restaurant.address}</span>
            {distText && (
              <span className="ml-auto flex items-center gap-0.5 text-[12px] font-semibold text-primary/70 flex-shrink-0 bg-primary/5 px-2 py-0.5 rounded-full">
                <Navigation className="h-3 w-3" />
                {distText}
              </span>
            )}
          </div>
          {restaurant.openingHours && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-primary/50" />
              <span className="truncate">{restaurant.openingHours}</span>
              {restaurant.closedDays && (
                <span className="ml-auto text-[11px] text-destructive/70 font-medium flex-shrink-0">
                  휴무: {restaurant.closedDays}
                </span>
              )}
            </div>
          )}
          {restaurant.phone && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-primary/50" />
              <a
                href={`tel:${restaurant.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-primary transition-colors"
              >
                {restaurant.phone}
              </a>
              {restaurant.priceRange && (
                <span className="ml-auto text-[12px] font-semibold text-foreground/70 bg-muted px-2 py-0.5 rounded-md">{restaurant.priceRange}</span>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        {restaurant.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {restaurant.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-muted/80 rounded-lg text-[11px] font-medium text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          {/* Left: quick actions */}
          <div className="flex items-center gap-1">
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  isFavorite
                    ? "text-destructive bg-destructive/10"
                    : "text-muted-foreground/40 hover:text-destructive/60 hover:bg-destructive/5"
                }`}
                aria-label={isFavorite ? "찜 취소" : "찜하기"}
              >
                <Heart className={`h-[18px] w-[18px] ${isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
            <button
              onClick={onToggleVisited}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isVisited
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground/40 hover:text-primary/60 hover:bg-primary/5"
              }`}
              aria-label={isVisited ? "방문 취소" : "방문 표시"}
            >
              <CheckCircle2 className={`h-[18px] w-[18px] ${isVisited ? "fill-primary/15" : ""}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-muted-foreground/40 hover:text-primary/60 hover:bg-primary/5 transition-all duration-200"
              aria-label="공유하기"
            >
              <Share2 className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Right: links */}
          <div className="flex items-center gap-2">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[12px] text-primary/70 hover:text-primary font-medium transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/5"
              >
                <Phone className="h-3.5 w-3.5" /> 전화
              </a>
            )}
            <Link
              to={`/restaurant/${restaurant.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[12px] text-primary font-semibold transition-colors px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15"
            >
              상세보기 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

RestaurantCard.displayName = "RestaurantCard";

export default RestaurantCard;
