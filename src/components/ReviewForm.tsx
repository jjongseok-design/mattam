import { useState, useEffect, useRef, memo } from "react";
import { Star, Loader2, Trash2, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getDeviceId } from "@/hooks/useDeviceId";
import { useMyReview } from "@/hooks/useReviews";

interface ReviewFormProps {
  restaurantId: string;
}

const STAR_LABELS = ["", "별로예요", "그저그래요", "괜찮아요", "좋아요", "최고예요"];

const ReviewForm = memo(({ restaurantId }: ReviewFormProps) => {
  const deviceId = getDeviceId();
  const { data: myReview, isLoading: loadingMyReview } = useMyReview(restaurantId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 기존 리뷰 불러오기
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setContent(myReview.comment ?? "");
      setPhotoPreview(myReview.photo_url ?? null);
    }
  }, [myReview]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "사진은 5MB 이하만 가능합니다", variant: "destructive" });
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(myReview?.photo_url ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.type.includes("png") ? "png" : "jpg";
    const path = `${restaurantId}/${deviceId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("review-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`사진 업로드 실패: ${error.message}`);
    const { data } = supabase.storage.from("review-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "별점을 선택해주세요 ⭐", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      let photoUrl: string | null = myReview?.photo_url ?? null;
      if (photo) {
        photoUrl = await uploadPhoto(photo);
      }

      const payload = {
        restaurant_id: restaurantId,
        device_id: deviceId,
        rating,
        comment: comment.trim() || null,
        photo_url: photoUrl,
      };

      let error;
      if (myReview) {
        const res = await supabase
          .from("reviews")
          .update({ rating, comment: comment.trim() || null, photo_url: photoUrl })
          .eq("id", myReview.id);
        error = res.error;
      } else {
        const res = await supabase.from("reviews").insert(payload);
        error = res.error;
      }

      if (error) {
        toast({ title: "리뷰 등록 실패", description: error.message, variant: "destructive" });
      } else {
        toast({ title: myReview ? "리뷰가 수정되었습니다 ✅" : "리뷰가 등록되었습니다 ✅" });
        setIsEditing(false);
        setPhoto(null);
        queryClient.invalidateQueries({ queryKey: ["reviews", restaurantId] });
        queryClient.invalidateQueries({ queryKey: ["my-review", restaurantId, deviceId] });
        queryClient.invalidateQueries({ queryKey: ["all-avg-ratings"] });
      }
    } catch (err: any) {
      toast({ title: "오류 발생", description: err.message, variant: "destructive" });
    }

    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!myReview) return;
    setDeleting(true);
    const { error } = await supabase.from("reviews").delete().eq("id", myReview.id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      setRating(0);
      setContent("");
      setPhoto(null);
      setPhotoPreview(null);
      queryClient.invalidateQueries({ queryKey: ["reviews", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["my-review", restaurantId, deviceId] });
      queryClient.invalidateQueries({ queryKey: ["all-avg-ratings"] });
    }
    setDeleting(false);
  };

  if (loadingMyReview) return null;

  // 이미 리뷰가 있고 수정 모드가 아닌 경우 → 내 리뷰 요약 + 수정/삭제 버튼
  if (myReview && !isEditing) {
    return (
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {myReview.photo_url && (
            <img
              src={myReview.photo_url}
              alt="내 리뷰 사진"
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${s <= myReview.rating ? "text-rating fill-current" : "text-muted-foreground/20"}`}
              />
            ))}
          </div>
          {myReview.comment && (
            <span className="text-[12px] text-foreground truncate max-w-[160px]">{myReview.comment}</span>
          )}
          <span className="text-[10px] text-muted-foreground/60">내 리뷰</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2" onClick={() => setIsEditing(true)}>
            수정
          </Button>
          <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2 text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <div className="space-y-2.5 p-4 bg-muted/30 rounded-2xl border border-border/50">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {myReview ? "내 리뷰 수정" : "리뷰 남기기"}
        </h4>
        {myReview && (
          <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 text-muted-foreground" onClick={() => setIsEditing(false)}>
            취소
          </Button>
        )}
      </div>

      {/* 별점 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
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
                className={`h-7 w-7 transition-colors ${
                  star <= displayRating ? "text-rating fill-current" : "text-muted-foreground/20"
                }`}
              />
            </button>
          ))}
        </div>
        {displayRating > 0 && (
          <span className="text-sm font-semibold text-foreground">{STAR_LABELS[displayRating]}</span>
        )}
      </div>

      {/* 한 줄 리뷰 (15자 이내) */}
      <div className="relative">
        <input
          type="text"
          placeholder="한 줄 리뷰 (선택, 최대 15자)"
          value={comment}
          onChange={(e) => setContent(e.target.value.slice(0, 15))}
          maxLength={15}
          className="w-full text-sm px-3 py-2 pr-10 bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${comment.length >= 15 ? "text-destructive" : "text-muted-foreground/40"}`}>
          {comment.length}/15
        </span>
      </div>

      {/* 사진 업로드 */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="리뷰 사진"
              className="w-16 h-16 rounded-lg object-cover border border-border/50"
            />
            <button
              onClick={handleRemovePhoto}
              className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 shadow-sm"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-xs"
          >
            <Camera className="h-3.5 w-3.5" />
            사진 추가
          </button>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        size="sm"
        className="w-full"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
        {myReview ? "수정 완료" : "리뷰 등록"}
      </Button>
    </div>
  );
});

ReviewForm.displayName = "ReviewForm";
export default ReviewForm;
