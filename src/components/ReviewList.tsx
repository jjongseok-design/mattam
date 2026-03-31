import { useState } from "react";
import { Star, Trash2, Pencil, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useReviews } from "@/hooks/useReviews";
import { getDeviceId } from "@/hooks/useDeviceId";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ReviewListProps {
  restaurantId: string;
}

const ReviewItem = ({ review, isMyReview, onDelete, onEdit }: { review: any; isMyReview: boolean; onDelete: (id: string) => void; onEdit: (review: any) => void }) => (
  <div className={`p-3 rounded-xl border ${isMyReview ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border/30"}`}>
    <div className="flex gap-2.5">
      {review.photo_url && (
        <img src={review.photo_url} alt="리뷰 사진" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map((star) => (
                <Star key={star} className={`h-3 w-3 ${star <= review.rating ? "text-rating fill-current" : "text-muted-foreground/20"}`} />
              ))}
            </div>
            <span className="text-[11px] font-medium text-foreground/70">
              {review.nickname || "익명"}
            </span>
            {isMyReview && (
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">나</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/50">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ko })}
            </span>
            {isMyReview && (
              <div className="flex items-center gap-1">
                <button onClick={() => onEdit(review)} className="text-muted-foreground/40 hover:text-primary transition-colors">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => onDelete(review.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
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

const ReviewList = ({ restaurantId }: ReviewListProps) => {
  const deviceId = getDeviceId();
  const { data: reviews = [], isLoading } = useReviews(restaurantId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId).eq("device_id", deviceId);
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

  if (isLoading) return <div className="text-center py-4 text-sm text-muted-foreground">리뷰 불러오는 중...</div>;

  const visibleReviews = reviews.slice(0, 5);
  const hasMore = reviews.length > 5;

  const handleEdit = (review: any) => {
    document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-3">
      {reviews.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 text-rating fill-current" />
          <span className="font-bold text-foreground">{avgRating}</span>
          <span className="text-muted-foreground/50 text-xs">({reviews.length}개)</span>
        </div>
      )}
      {reviews.length === 0 ? (
        <p className="text-center py-6 text-sm text-muted-foreground/60">아직 리뷰가 없어요. 첫 리뷰를 남겨주세요! 😊</p>
      ) : (
        <div className="space-y-2">
          {visibleReviews.map((review) => (
            <ReviewItem key={review.id} review={review} isMyReview={review.device_id === deviceId} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
          {hasMore && (
            <button onClick={() => setShowAll(true)} className="w-full py-2 text-[12px] text-primary font-medium border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
              리뷰 더보기 ({reviews.length}개 전체보기)
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {showAll && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[3000] bg-black/60 flex items-end justify-center" onClick={(e) => e.target === e.currentTarget && setShowAll(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-card rounded-t-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h2 className="text-[15px] font-bold">전체 리뷰 ({reviews.length}개)</h2>
                <button onClick={() => setShowAll(false)} className="p-2 rounded-xl hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {reviews.map((review) => (
                  <ReviewItem key={review.id} review={review} isMyReview={review.device_id === deviceId} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewList;
