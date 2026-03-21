import { useState, memo, useRef } from "react";
import { Star, Send, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getDeviceId } from "@/hooks/useDeviceId";

interface ReviewFormProps {
  restaurantId: string;
}

const REVIEW_COOLDOWN_KEY = "last_review_time";
const REVIEW_COOLDOWN_MS = 300_000; // 5분 쿨다운

const NICKNAME_KEY = "review_nickname";

const ReviewForm = memo(({ restaurantId }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem(NICKNAME_KEY) || ""; } catch { return ""; }
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "5MB 이하 이미지만 업로드 가능합니다", variant: "destructive" });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "별점을 선택해주세요 ⭐", variant: "destructive" });
      return;
    }

    // Client-side rate limiting (5분)
    const lastReview = localStorage.getItem(REVIEW_COOLDOWN_KEY);
    if (lastReview && Date.now() - parseInt(lastReview) < REVIEW_COOLDOWN_MS) {
      const remaining = Math.ceil((REVIEW_COOLDOWN_MS - (Date.now() - parseInt(lastReview))) / 60000);
      toast({ title: `${remaining}분 후에 다시 작성할 수 있습니다 ⏳`, variant: "destructive" });
      return;
    }

    const trimmedComment = comment.trim();
    const trimmedNickname = nickname.trim();

    if (trimmedComment.length > 200) {
      toast({ title: "리뷰는 200자 이내로 작성해주세요", variant: "destructive" });
      return;
    }
    if (trimmedNickname.length > 20) {
      toast({ title: "닉네임은 20자 이내로 작성해주세요", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // 이미지 업로드
    let imageUrl: string | null = null;
    if (imageFile) {
      try {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `reviews/${restaurantId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("restaurant-images")
          .upload(path, imageFile, { upsert: false });
        if (!uploadError) {
          const { data } = supabase.storage.from("restaurant-images").getPublicUrl(path);
          imageUrl = data.publicUrl;
        }
      } catch {}
    }

    const { data: reviewData, error } = await supabase.from("reviews").insert({
      restaurant_id: restaurantId,
      rating,
      comment: trimmedComment || null,
      nickname: trimmedNickname || "익명",
      device_id: getDeviceId(),
    }).select("id").single();

    if (error) {
      if (error.code === "42501" || error.message?.includes("rate") || error.message?.includes("policy")) {
        toast({ title: "5분 후에 다시 작성할 수 있습니다 ⏳", variant: "destructive" });
      } else {
        toast({ title: "리뷰 등록 실패", description: error.message, variant: "destructive" });
      }
    } else {
      // 이미지가 있으면 review_images 테이블에 저장
      if (imageUrl && reviewData?.id) {
        await supabase.from("review_images").insert({
          review_id: reviewData.id,
          url: imageUrl,
          position: 0,
        });
      }
      localStorage.setItem(REVIEW_COOLDOWN_KEY, Date.now().toString());
      if (trimmedNickname) localStorage.setItem(NICKNAME_KEY, trimmedNickname);
      toast({ title: "리뷰가 등록되었습니다 ✅" });
      setRating(0);
      setComment("");
      clearImage();
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
            aria-label={`${star}점`}
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
        placeholder="한줄평을 남겨주세요 (선택, 최대 200자)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={200}
        rows={2}
        className="text-sm resize-none"
      />

      {/* 사진 업로드 */}
      <div>
        {imagePreview ? (
          <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border/50">
            <img src={imagePreview} alt="리뷰 사진" className="w-full h-full object-cover" />
            <button
              onClick={clearImage}
              className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/60 text-muted-foreground/60 text-xs hover:bg-muted/40 transition-colors"
          >
            <ImagePlus className="h-4 w-4" />
            사진 추가 (선택, 최대 5MB)
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      <Button onClick={handleSubmit} disabled={submitting || rating === 0} size="sm" className="w-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
        리뷰 등록
      </Button>
    </div>
  );
});

ReviewForm.displayName = "ReviewForm";

export default ReviewForm;
