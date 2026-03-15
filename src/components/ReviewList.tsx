import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useCallback } from "react";
import { getDeviceId } from "@/hooks/useDeviceId";

interface ReviewListProps {
  restaurantId: string;
}

interface ReviewImage {
  url: string;
  position: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  nickname: string;
  created_at: string;
  likes_count: number;
  review_images: ReviewImage[];
}

const ReviewList = ({ restaurantId }: ReviewListProps) => {
  const deviceId = getDeviceId();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", restaurantId],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, review_images(url, position)")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });

  // 내가 좋아요한 리뷰 ID 목록
  const { data: myLikes = new Set<string>() } = useQuery({
    queryKey: ["review_likes", restaurantId, deviceId],
    queryFn: async (): Promise<Set<string>> => {
      const reviewIds = reviews.map((r) => r.id);
      if (reviewIds.length === 0) return new Set();
      const { data } = await supabase
        .from("review_likes")
        .select("review_id")
        .eq("device_id", deviceId)
        .in("review_id", reviewIds);
      return new Set((data ?? []).map((d: { review_id: string }) => d.review_id));
    },
    enabled: reviews.length > 0,
  });

  const [pendingLikes, setPendingLikes] = useState<Record<string, number>>({});

  const toggleLike = useCallback(
    async (reviewId: string, currentLiked: boolean) => {
      const delta = currentLiked ? -1 : 1;
      setPendingLikes((prev) => ({ ...prev, [reviewId]: (prev[reviewId] ?? 0) + delta }));

      if (currentLiked) {
        await supabase
          .from("review_likes")
          .delete()
          .eq("device_id", deviceId)
          .eq("review_id", reviewId);
      } else {
        await supabase
          .from("review_likes")
          .upsert({ device_id: deviceId, review_id: reviewId });
      }
      queryClient.invalidateQueries({ queryKey: ["reviews", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["review_likes", restaurantId, deviceId] });
    },
    [deviceId, restaurantId, queryClient]
  );

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (isLoading) {
    return <div className="text-center py-4 text-sm text-muted-foreground">리뷰 불러오는 중...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-rating fill-current" />
            <span className="font-bold text-foreground">{avgRating}</span>
          </div>
          <span className="text-muted-foreground">사용자 리뷰 {reviews.length}개</span>
        </div>
      )}

      {/* Reviews */}
      {reviews.length === 0 ? (
        <p className="text-center py-6 text-sm text-muted-foreground/60">
          아직 리뷰가 없습니다. 첫 리뷰를 남겨주세요! 😊
        </p>
      ) : (
        <div className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-thin">
          {reviews.map((review) => {
            const liked = myLikes.has(review.id);
            const displayLikes = (review.likes_count ?? 0) + (pendingLikes[review.id] ?? 0);
            return (
              <div key={review.id} className="p-3 bg-muted/40 rounded-xl border border-border/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{review.nickname}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= review.rating ? "text-rating fill-current" : "text-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ko })}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{review.comment}</p>
                )}
                {review.review_images?.length > 0 && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-border/30">
                    <img src={review.review_images[0].url} alt="리뷰 사진" className="w-full max-h-40 object-cover" />
                  </div>
                )}
                {/* 좋아요 버튼 */}
                <button
                  onClick={() => toggleLike(review.id, liked)}
                  className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors ${
                    liked
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground/50 hover:bg-muted"
                  }`}
                >
                  <ThumbsUp className={`h-3 w-3 ${liked ? "fill-primary/30" : ""}`} />
                  {displayLikes > 0 && <span>{displayLikes}</span>}
                  <span>도움돼요</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewList;
