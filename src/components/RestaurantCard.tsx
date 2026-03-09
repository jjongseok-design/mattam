import { Star, MapPin, Phone, CheckCircle2, ExternalLink, Share2, Clock, Heart, Navigation, MessageSquare } from "lucide-react";
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

/** Generate placeholder food image URLs based on restaurant name + category */
const getFoodImageUrl = (name: string, index: number) => {
  // Use a deterministic seed for consistent images
  const seed = `${name}-${index}`;
  return `https://source.unsplash.com/400x300/?korean+food&sig=${encodeURIComponent(seed)}`;
};

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
      className={`group w-full text-left rounded-2xl transition-all duration-300 border overflow-hidden ${
        isSelected
          ? "border-primary/30 bg-card shadow-card-selected"
          : "border-border/50 bg-card hover:shadow-card-hover hover:border-primary/10"
      } ${isVisited ? "ring-1 ring-primary/20" : ""}`}
    >
      <div className="p-4">
        {/* Restaurant name + category */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-base leading-tight truncate">
                {restaurant.name}
              </h3>
              <span className="text-xs text-muted-foreground/60 flex-shrink-0">{restaurant.category}</span>
              {isVisited && (
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 fill-primary/15" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className={`p-1.5 rounded-full transition-all duration-200 ${
                  isFavorite ? "text-destructive" : "text-muted-foreground/30 hover:text-destructive/50"
                }`}
                aria-label={isFavorite ? "찜 취소" : "찜하기"}
              >
                <Heart className={`h-[18px] w-[18px] ${isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-1.5 rounded-full text-muted-foreground/30 hover:text-primary/70 transition-all duration-200"
              aria-label="공유하기"
            >
              <Share2 className="h-[16px] w-[16px]" />
            </button>
          </div>
        </div>

        {/* Description */}
        {restaurant.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-1 mb-2">{restaurant.description}</p>
        )}

        {/* Rating + Reviews + Distance row */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <div className="flex items-center gap-0.5">
            <Star className="h-4 w-4 text-rating fill-current" />
            <span className="text-[15px] font-bold text-foreground">{restaurant.rating}</span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-[13px] text-muted-foreground">
            리뷰 {restaurant.reviewCount}
          </span>
          {distText && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[13px] text-muted-foreground flex items-center gap-0.5">
                <Navigation className="h-3 w-3" />
                {distText}
              </span>
            </>
          )}
          {restaurant.priceRange && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[13px] text-muted-foreground">{restaurant.priceRange}</span>
            </>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0 text-primary/40" />
            <span className="truncate">{restaurant.address}</span>
          </div>
          {restaurant.openingHours && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0 text-primary/40" />
              <span className="truncate">{restaurant.openingHours}</span>
            </div>
          )}
        </div>

        {/* Tags as pills */}
        {restaurant.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {restaurant.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-muted/80 rounded-full text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Food images - horizontal scroll */}
      <div className="flex gap-0.5 overflow-x-auto scrollbar-thin px-0">
        {(restaurant.imageUrl ? [restaurant.imageUrl] : []).concat(
          // Generate 3 placeholder images using category-based food images
          Array.from({ length: 3 }, (_, i) =>
            `https://picsum.photos/seed/${encodeURIComponent(restaurant.id + i)}/400/300`
          )
        ).slice(0, 3).map((url, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[calc(33.33%-2px)] aspect-square bg-muted overflow-hidden"
          >
            <img
              src={url}
              alt={`${restaurant.name} 음식 ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Fallback to emoji placeholder
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-muted text-3xl">${emoji}</div>`;
              }}
            />
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-2.5 flex items-center justify-between border-t border-border/30">
        <div className="flex items-center gap-3">
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary font-medium transition-colors"
            >
              <Phone className="h-3.5 w-3.5" /> 전화
            </a>
          )}
          <Link
            to={`/restaurant/${restaurant.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary font-medium transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" /> 리뷰
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleVisited}
            className={`flex items-center gap-1 text-[12px] font-medium transition-colors ${
              isVisited ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 ${isVisited ? "fill-primary/15" : ""}`} />
            {isVisited ? "방문완료" : "방문표시"}
          </button>
          <a
            href={`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + ' 춘천')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[12px] text-primary/70 hover:text-primary font-medium transition-colors"
          >
            네이버지도 <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.button>
  );
};

export default RestaurantCard;
