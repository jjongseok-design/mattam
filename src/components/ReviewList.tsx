import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ReviewListProps {
  restaurantId: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  nickname: string;
  created_at: string;
}

const ReviewList = ({ restaurantId }: ReviewListProps) => {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", restaurantId],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

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
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto scrollbar-thin">
          {reviews.map((review) => (
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
                <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewList;
