import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ReviewFormProps {
  restaurantId: string;
}

const ReviewForm = ({ restaurantId }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "별점을 선택해주세요 ⭐", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      restaurant_id: restaurantId,
      rating,
      comment: comment.trim() || null,
      nickname: nickname.trim() || "익명",
    });
    if (error) {
      toast({ title: "리뷰 등록 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "리뷰가 등록되었습니다 ✅" });
      setRating(0);
      setComment("");
      setNickname("");
      queryClient.invalidateQueries({ queryKey: ["reviews", restaurantId] });
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
      <h4 className="text-sm font-semibold text-foreground">리뷰 남기기</h4>

      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= (hoverRating || rating)
                  ? "text-rating fill-current"
                  : "text-muted-foreground/20"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-sm font-bold text-foreground ml-2">{rating}점</span>
        )}
      </div>

      {/* Nickname */}
      <Input
        placeholder="닉네임 (선택, 기본: 익명)"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={20}
        className="text-sm"
      />

      {/* Comment */}
      <Textarea
        placeholder="한줄평을 남겨주세요 (선택)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={200}
        rows={2}
        className="text-sm resize-none"
      />

      <Button onClick={handleSubmit} disabled={submitting || rating === 0} size="sm" className="w-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
        리뷰 등록
      </Button>
    </div>
  );
};

export default ReviewForm;
