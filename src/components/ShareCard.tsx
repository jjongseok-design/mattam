import { useRef, useCallback, memo } from "react";
import { X, Download, Share2, Trophy, MapPin, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import { useTourStats } from "@/hooks/useTourStats";
import type { Restaurant } from "@/hooks/useRestaurants";
import { useToast } from "@/hooks/use-toast";

interface ShareCardProps {
  open: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  visited: Set<string>;
}

const ShareCard = memo(({ open, onClose, restaurants, visited }: ShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const stats = useTourStats(restaurants, visited);
  const { toast } = useToast();

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `춘천맛집정복_${stats.totalVisited}곳.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({ title: "이미지가 저장되었습니다! 📸" });
    } catch {
      toast({ title: "이미지 저장에 실패했습니다", variant: "destructive" });
    }
  }, [stats.totalVisited, toast]);

  const handleShare = useCallback(async () => {
    const text = `🗺️ 춘천 맛집 정복 현황!\n\n${stats.rankEmoji} ${stats.rank}\n📍 ${stats.totalVisited}/${stats.totalRestaurants}곳 정복 (${stats.overallPercent}%)\n${
      stats.masterCategories.length > 0
        ? `🏆 마스터: ${stats.masterCategories.join(", ")}\n`
        : ""
    }\n#춘천맛집 #맛집정복 #춘천맛집지도`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "춘천 맛집 정복 현황", text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "텍스트가 복사되었습니다! 📋" });
    }
  }, [stats, toast]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm relative"
          >
            <button
              onClick={onClose}
              className="absolute -top-3 -right-1 z-10 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-foreground/20 hover:bg-foreground/30 text-foreground backdrop-blur-sm transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div
              ref={cardRef}
              className="bg-gradient-to-br from-background via-card to-primary/10 rounded-3xl p-6 text-foreground shadow-2xl border border-border/50"
            >
              <div className="text-center mb-6">
                <p className="text-xs text-muted-foreground mb-1">🗺️ 춘천 맛집 지도</p>
                <h2 className="text-2xl font-black text-foreground">맛집 정복 현황</h2>
              </div>

              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-muted/50 backdrop-blur flex items-center justify-center text-5xl">
                  {stats.rankEmoji}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.rank}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {stats.totalVisited}/{stats.totalRestaurants}곳 정복
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    style={{ width: `${stats.overallPercent}%` }}
                  />
                </div>
                <p className="text-center text-lg font-bold mt-2 text-foreground">{stats.overallPercent}% 달성</p>
              </div>

              {stats.masterCategories.length > 0 && (
                <div className="bg-muted/30 rounded-2xl p-4 mb-4">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Crown className="h-3 w-3 text-rating" />
                    획득한 마스터 배지
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stats.masterCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-rating/20 rounded-lg text-xs font-semibold text-rating"
                      >
                        {CATEGORY_EMOJI[cat]} {cat}
                        <Trophy className="h-3 w-3 text-rating" />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {stats.categoryStats.slice(0, 6).map((cat) => (
                  <div
                    key={cat.category}
                    className={`text-center p-2 rounded-xl ${
                      cat.isMaster ? "bg-rating/20" : "bg-muted/30"
                    }`}
                  >
                    <span className="text-xl">{CATEGORY_EMOJI[cat.category]}</span>
                    <p className="text-[10px] font-medium truncate text-foreground">{cat.category}</p>
                    <p className="text-xs font-bold text-foreground">
                      {cat.visited}/{cat.total}
                      {cat.isMaster && " 🏆"}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-center text-[10px] text-muted-foreground mt-4">
                restaurantchuncheon.lovable.app
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-colors"
              >
                <Download className="h-4 w-4" />
                이미지 저장
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                공유하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ShareCard.displayName = "ShareCard";

export default ShareCard;
