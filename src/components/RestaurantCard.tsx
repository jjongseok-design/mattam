import { memo, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star, MapPin, Phone, CheckCircle2, Share2, Heart, Navigation, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Restaurant } from "@/hooks/useRestaurants";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import { useToast } from "@/hooks/use-toast";
import { useCityContext } from "@/contexts/CityContext";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { useAllAvgRatings } from "@/hooks/useReviews";
import { useFirstVisitorCounts } from "@/hooks/useVisitCount";
import { applyRevisit, applyCancel } from "@/hooks/visitCountStore";

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  isVisited: boolean;
  isFavorite?: boolean;
  distance?: number | null;
  compact?: boolean;
  visitCount?: number;
  onClick: () => void;
  onToggleVisited: (e: React.MouseEvent) => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

type OpenStatus = 'open' | 'lastorder' | 'closed' | 'holiday' | null;

interface StatusResult {
  status: OpenStatus;
  closeTime?: string; // 라스트오더 표시용 마감시각
}

const checkOpenStatus = (openingHours?: string, closedDays?: string): StatusResult => {
  const now = new Date();
  const day = now.getDay();
  const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

  if (closedDays) {
    const cd = closedDays;
    const todayKo = DAY_KO[day];
    const isWeekend = day === 0 || day === 6;
    const isWeekday = day >= 1 && day <= 5;
    if (
      cd.includes(todayKo) ||
      (cd.includes('주말') && isWeekend) ||
      (cd.includes('주중') && isWeekday) ||
      (cd.includes('일요일') && day === 0) ||
      (cd.includes('월요일') && day === 1) ||
      (cd.includes('화요일') && day === 2) ||
      (cd.includes('수요일') && day === 3) ||
      (cd.includes('목요일') && day === 4) ||
      (cd.includes('금요일') && day === 5) ||
      (cd.includes('토요일') && day === 6)
    ) return { status: 'holiday' };
  }

  if (!openingHours) return { status: null };
  const match = openingHours.match(/(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/);
  if (!match) return { status: null };

  const cur = now.getHours() * 60 + now.getMinutes();
  const open = parseInt(match[1]) * 60 + parseInt(match[2]);
  const closeH = parseInt(match[3]);
  const closeM = parseInt(match[4]);
  const close = closeH * 60 + closeM;
  const closeLabel = `${String(closeH).padStart(2, '0')}:${String(closeM).padStart(2, '0')}`;

  const isOpen = close <= open ? (cur >= open || cur < close) : (cur >= open && cur < close);
  if (!isOpen) return { status: 'closed' };

  // 마감 30분 이내 → 라스트오더
  const minsUntilClose = close > cur ? close - cur : close + 1440 - cur;
  if (minsUntilClose <= 30) return { status: 'lastorder', closeTime: closeLabel };

  return { status: 'open' };
};

const RestaurantCard = memo(({
  restaurant, isSelected, isVisited, isFavorite, distance, compact, visitCount,
  onClick, onToggleVisited, onToggleFavorite,
}: RestaurantCardProps) => {
  const emoji = CATEGORY_EMOJI[restaurant.category] || "🍽️";
  const { toast } = useToast();
  const { cityId, city } = useCityContext();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showRevisitDialog, setShowRevisitDialog] = useState(false);
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const { data: allRatings } = useAllAvgRatings();
  const matamRating = allRatings?.[restaurant.id];
  const { data: visitCounts } = useFirstVisitorCounts();
  const cardVisitCount = visitCounts?.[restaurant.id];

  const handleVisitClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isVisited) {
      onToggleVisited(e);
    } else {
      setShowRevisitDialog(true);
    }
  };

  // 재방문 기록: DB 직접 insert (방문 상태는 그대로 유지)
  const handleRevisit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRevisitDialog(false);
    applyRevisit(restaurant.id);
    const { error } = await supabase
      .from("device_visits")
      .insert({ device_id: deviceId, restaurant_id: restaurant.id });
    if (error) {
      console.warn("[RestaurantCard] revisit error:", error.message);
      applyCancel(restaurant.id);
    }
    queryClient.invalidateQueries({ queryKey: ["first-visitor-counts"] });
  };

  // 기존 방문 취소: onToggleVisited 호출 → useVisited.toggle이 삭제 처리
  const handleCancelVisit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRevisitDialog(false);
    onToggleVisited(e);
  };
  const cityLabel = city?.name ?? "맛집";
  const { status: openStatus, closeTime } = useMemo(() => checkOpenStatus(restaurant.openingHours, restaurant.closedDays), [restaurant.openingHours, restaurant.closedDays]);

  const distText = distance != null
    ? distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
    : null;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/${cityId}/restaurant/${restaurant.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${restaurant.name} - ${cityLabel} 맛집`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "링크가 복사되었습니다 📋" });
    }
  };

  const revisitDialog = (
    <AlertDialog open={showRevisitDialog} onOpenChange={setShowRevisitDialog}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{restaurant.name}</AlertDialogTitle>
          <AlertDialogDescription>
            이미 방문한 식당입니다. 어떻게 하시겠어요?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleRevisit} className="w-full">
            재방문 기록
          </Button>
          <Button variant="destructive" onClick={handleCancelVisit} className="w-full">
            기존 방문 취소
          </Button>
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); setShowRevisitDialog(false); }} className="w-full">
            닫기
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  /* ──────────────── MOBILE COMPACT ──────────────── */
  if (compact) {
    return (
      <>
        {revisitDialog}
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
            <div className={`w-[65px] h-[65px] rounded-xl overflow-hidden flex-shrink-0 relative flex items-center justify-center ${!imgLoaded && !imgError && restaurant.imageUrl ? "bg-muted/60 animate-pulse" : "bg-secondary/60"}`}>
              {restaurant.imageUrl && !imgError ? (
                <img
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-2xl">{emoji}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                  <h3 className="font-semibold text-[17px] text-foreground truncate">{restaurant.name}</h3>
                  {isVisited && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                      방문
                    </span>
                  )}
                </div>
                {matamRating && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star className="h-3 w-3 text-rating fill-current" />
                    <span className="text-[12px] font-bold text-foreground">{matamRating.avg}</span>
                  </div>
                )}
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
                {cardVisitCount !== undefined && cardVisitCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground font-medium">
                    👥 방문 {cardVisitCount}명
                  </span>
                )}
                {openStatus === 'open' && (
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold ml-auto">영업중</span>
                )}
                {openStatus === 'lastorder' && (
                  <span className="text-[9px] text-orange-500 font-semibold ml-auto">라스트오더 {closeTime}</span>
                )}
                {openStatus === 'closed' && (
                  <span className="text-[9px] text-muted-foreground/50 ml-auto">영업종료</span>
                )}
                {openStatus === 'holiday' && (
                  <span className="text-[9px] text-rose-400 font-semibold ml-auto">휴무</span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Action row */}
        <div className="flex items-center px-3 pb-2.5 gap-1.5">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
                isFavorite
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
              }`}
              aria-label={isFavorite ? "찜 취소" : "찜하기"}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
              <span className="text-[11px] font-semibold">{isFavorite ? "찜" : "찜"}</span>
            </button>
          )}
          <button
            onClick={handleVisitClick}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
              isVisited
                ? "bg-primary text-white shadow-sm"
                : "bg-primary/8 dark:bg-primary/15 text-primary/70 border border-primary/20"
            }`}
            aria-label={isVisited ? "재방문 기록" : "방문 표시"}
          >
            <CheckCircle2 className={`h-4 w-4 ${isVisited ? "fill-white/30" : ""}`} />
            <span className="text-[11px] font-semibold">{isVisited ? "재방문" : "방문"}</span>
          </button>
          <Link
            to={`/${cityId}/restaurant/${restaurant.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/8 active:bg-primary/15 transition-colors"
          >
            상세보기 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
      </>
    );
  }

  /* ──────────────── DESKTOP FULL (Horizontal) ──────────────── */
  return (
    <>
      {revisitDialog}
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
        <div className={`w-[92px] flex-shrink-0 overflow-hidden self-stretch relative flex items-center justify-center ${!imgLoaded && !imgError && restaurant.imageUrl ? "bg-muted/60 animate-pulse" : "bg-gradient-to-br from-secondary to-secondary/40"}`}>
          {restaurant.imageUrl && !imgError ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.04] ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
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
                <h3 className="font-semibold text-[18px] text-foreground leading-snug">
                  {restaurant.name}
                </h3>
                {isVisited && (
                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                    방문
                  </span>
                )}
                {openStatus === 'open' && (
                  <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">영업중</span>
                )}
                {openStatus === 'lastorder' && (
                  <span className="text-[9px] bg-orange-50 dark:bg-orange-950/50 text-orange-500 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">라스트오더 {closeTime}</span>
                )}
                {openStatus === 'closed' && (
                  <span className="text-[9px] text-muted-foreground/40 flex-shrink-0">영업종료</span>
                )}
                {openStatus === 'holiday' && (
                  <span className="text-[9px] bg-rose-50 dark:bg-rose-950/50 text-rose-500 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">휴무</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{restaurant.category}</p>
            </div>

            {matamRating && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-3.5 w-3.5 text-rating fill-current" />
                <span className="text-[13px] font-bold text-foreground">{matamRating.avg}</span>
                <span className="text-[10px] text-muted-foreground">맛탐 리뷰 {matamRating.count}개</span>
              </div>
            )}
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
                onClick={handleVisitClick}
                className={`p-1.5 rounded-lg transition-colors ${
                  isVisited
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground/25 hover:text-primary/60 hover:bg-primary/5"
                }`}
                aria-label={isVisited ? "재방문 기록" : "방문 표시"}
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
                to={`/${cityId}/restaurant/${restaurant.slug}`}
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
    </>
  );
});

RestaurantCard.displayName = "RestaurantCard";
export default RestaurantCard;
