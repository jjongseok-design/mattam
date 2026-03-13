import { memo, useMemo } from "react";
import { Star, MapPin, Phone, CheckCircle2, Share2, Clock, Heart, Navigation, ChevronRight } from "lucide-react";
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
  compact?: boolean;
  onClick: () => void;
  onToggleVisited: (e: React.MouseEvent) => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

const checkIsOpen = (openingHours?: string): boolean | null => {
  if (!openingHours) return null;
  const match = openingHours.match(/(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = parseInt(match[1]) * 60 + parseInt(match[2]);
  const close = parseInt(match[3]) * 60 + parseInt(match[4]);
  if (close <= open) return cur >= open || cur < close;
  return cur >= open && cur < close;
};

const RestaurantCard = memo(({
  restaurant, isSelected, isVisited, isFavorite, distance, compact,
  onClick, onToggleVisited, onToggleFavorite,
}: RestaurantCardProps) => {
  const emoji = CATEGORY_EMOJI[restaurant.category] || "🍽️";
  const { toast } = useToast();
  const isOpen = useMemo(() => checkIsOpen(restaurant.openingHours), [restaurant.openingHours]);

  const distText = distance != null
    ? distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
    : null;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/restaurant/${restaurant.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${restaurant.name} - 춘천 맛집`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "링크가 복사되었습니다 📋" });
    }
  };

  /* ──────────────── MOBILE COMPACT ──────────────── */
  if (compact) {
    return (
      <motion.div
        layout
        data-restaurant-id={restaurant.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className={`rounded-xl border overflow-hidden transition-all duration-200 bg-card ${
          isSelected
            ? "border-primary/30 shadow-[0_0_0_2px_hsl(var(--primary)/0.12)]"
            : "border-border/50 active:bg-muted/30"
        }`}
      >
        <button onClick={onClick} className="w-full text-left p-3 pb-2">
          <div className="flex gap-3">
            {/* Thumbnail */}
            <div className="w-[54px] h-[54px] rounded-xl overflow-hidden flex-shrink-0 bg-secondary/60 flex items-center justify-center">
              {restaurant.imageUrl ? (
                <img
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement!.innerHTML = `<span style="font-size:24px">${emoji}</span>`;
                  }}
                />
              ) : (
                <span className="text-2xl">{emoji}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] text-foreground truncate">{restaurant.name}</h3>
                  {isVisited && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                      방문
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Star className="h-3 w-3 text-rating fill-current" />
                  <span className="text-[12px] font-bold text-foreground">{restaurant.rating}</span>
                </div>
              </div>

              <p className="text-[13px] text-muted-foreground truncate mb-1">
                {restaurant.address}
                {distText && <span className="text-primary/70 font-medium"> · {distText}</span>}
              </p>

              <div className="flex items-center gap-1 flex-wrap">
                {restaurant.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted/80 rounded-md text-muted-foreground">
                    {tag}
                  </span>
                ))}
                {isOpen === true && (
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold ml-auto">영업 중</span>
                )}
                {isOpen === false && (
                  <span className="text-[9px] text-muted-foreground/50 ml-auto">영업 종료</span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Action row */}
        <div className="flex items-center px-3 pb-2.5 gap-0.5">
          {onToggleFavorite && (
              <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite ? "text-rose-500 bg-rose-50 dark:bg-rose-950/30" : "text-muted-foreground/40 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              }`}
              aria-label={isFavorite ? "찜 취소" : "찜하기"}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          )}
          <button
            onClick={onToggleVisited}
            className={`p-2 rounded-lg transition-colors ${
              isVisited ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-primary/60 hover:bg-primary/5"
            }`}
            aria-label={isVisited ? "방문 취소" : "방문 표시"}
          >
            <CheckCircle2 className={`h-5 w-5 ${isVisited ? "fill-primary/15" : ""}`} />
          </button>
          <Link
            to={`/restaurant/${restaurant.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/8 active:bg-primary/15 transition-colors"
          >
            상세보기 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    );
  }

  /* ──────────────── DESKTOP FULL (Horizontal) ──────────────── */
  return (
    <motion.div
      layout
      data-restaurant-id={restaurant.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={onClick}
      className={`group cursor-pointer rounded-xl border overflow-hidden transition-all duration-200 bg-card ${
        isSelected
          ? "border-primary/30 shadow-[0_0_0_2px_hsl(var(--primary)/0.12),0_4px_20px_-4px_hsl(var(--primary)/0.1)]"
          : "border-border/50 hover:border-border hover:shadow-[0_2px_14px_-2px_hsl(0_0%_0%/0.07)]"
      }`}
    >
      <div className="flex min-h-[108px]">
        {/* Image / emoji */}
        <div className="w-[92px] flex-shrink-0 overflow-hidden self-stretch">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.parentElement!.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-secondary to-secondary/40 flex items-center justify-center text-3xl">${emoji}</div>`;
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-secondary/40 flex items-center justify-center text-3xl">
              {emoji}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col p-3.5">
          {/* Name + badges + rating */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-semibold text-[16px] text-foreground leading-snug">
                  {restaurant.name}
                </h3>
                {isVisited && (
                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                    방문
                  </span>
                )}
                {isOpen === true && (
                  <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                    영업 중
                  </span>
                )}
                {isOpen === false && (
                  <span className="text-[9px] text-muted-foreground/40 flex-shrink-0">종료</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{restaurant.category}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Star className="h-3.5 w-3.5 text-rating fill-current" />
              <span className="text-[13px] font-bold text-foreground">{restaurant.rating}</span>
              <span className="text-[10px] text-muted-foreground">({restaurant.reviewCount})</span>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
            <span className="text-[13px] text-muted-foreground truncate flex-1">{restaurant.address}</span>
            {distText && (
              <span className="text-[11px] font-semibold text-primary/70 flex-shrink-0 flex items-center gap-0.5">
                <Navigation className="h-2.5 w-2.5" />
                {distText}
              </span>
            )}
          </div>

          {/* Hours */}
          {restaurant.openingHours && (
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground">{restaurant.openingHours}</span>
              {restaurant.closedDays && (
                <span className="text-[10px] text-muted-foreground/40 flex-shrink-0">· 휴 {restaurant.closedDays}</span>
              )}
            </div>
          )}

          {/* Tags */}
          {restaurant.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-auto pt-1">
              {restaurant.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 bg-muted/60 rounded-md text-muted-foreground font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/30">
            <div className="flex items-center gap-0.5">
              {onToggleFavorite && (
                <button
                  onClick={onToggleFavorite}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isFavorite
                      ? "text-rose-500"
                      : "text-muted-foreground/25 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  }`}
                  aria-label={isFavorite ? "찜 취소" : "찜하기"}
                >
                  <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-current" : ""}`} />
                </button>
              )}
              <button
                onClick={onToggleVisited}
                className={`p-1.5 rounded-lg transition-colors ${
                  isVisited
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground/25 hover:text-primary/60 hover:bg-primary/5"
                }`}
                aria-label={isVisited ? "방문 취소" : "방문 표시"}
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${isVisited ? "fill-primary/15" : ""}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-1.5 rounded-lg text-muted-foreground/25 hover:text-muted-foreground/60 hover:bg-muted/50 transition-colors"
                aria-label="공유"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3 w-3" /> 전화
                </a>
              )}
              <Link
                to={`/restaurant/${restaurant.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                상세보기 <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

RestaurantCard.displayName = "RestaurantCard";
export default RestaurantCard;
