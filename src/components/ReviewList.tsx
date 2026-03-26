import { Star, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useReviews } from "@/hooks/useReviews";
import { getDeviceId } from "@/hooks/useDeviceId";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ReviewListProps {
  restaurantId: string;
}

const ReviewList = ({ restaurantId }: ReviewListProps) => {
  const deviceId = getDeviceId();
  const { data: reviews = [], isLoading } = useReviews(restaurantId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("device_id", deviceId);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["reviews", restaurantId] });
    queryClient.invalidateQueries({ queryKey: ["my-review", restaurantId] });
    queryClient.invalidateQueries({ queryKey: ["all-avg-ratings"] });
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (isLoading) {
    return <div className="text-center py-4 text-sm text-muted-foreground">리뷰 불러오는 중...</div>;
  }

  return (
    <div className="space-y-3">
      {/* 요약 */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-rating fill-current" />
            <span className="font-bold text-foreground">{avgRating}</span>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-center py-6 text-sm text-muted-foreground/60">
          아직 리뷰가 없습니다. 첫 리뷰를 남겨주세요! 😊
        </p>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => {
            const isMyReview = review.device_id === deviceId;
            return (
              <div
                key={review.id}
                className={`p-3 rounded-xl border ${
                  isMyReview
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/40 border-border/30"
                }`}
              >
                <div className="flex gap-2.5">
                  {/* 사진 썸네일 */}
                  {review.photo_url && (
                    <img
                      src={review.photo_url}
                      alt="리뷰 사진"
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= review.rating
                                  ? "text-rating fill-current"
                                  : "text-muted-foreground/20"
                              }`}
                            />
                          ))}
                        </div>
                        {isMyReview && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                            나
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/50">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ko })}
                        </span>
                        {isMyReview && (
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewList;
