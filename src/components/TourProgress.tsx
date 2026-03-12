import { Trophy, MapPin, Share2, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import type { Restaurant } from "@/hooks/useRestaurants";
import { useTourStats } from "@/hooks/useTourStats";

interface TourProgressProps {
  restaurants: Restaurant[];
  visited: Set<string>;
  onShare: () => void;
  compact?: boolean;
}

const TourProgress = ({ restaurants, visited, onShare, compact = false }: TourProgressProps) => {
  const [expanded, setExpanded] = useState(false);
  const stats = useTourStats(restaurants, visited);

  if (compact) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 py-1"
        >
          <span className="text-xl">{stats.rankEmoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground whitespace-nowrap">{stats.rank}</span>
              <span className="text-[10px] text-primary font-bold">{stats.overallPercent}%</span>
              {expanded ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.overallPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{stats.totalVisited}/{stats.totalRestaurants}</span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-2 rounded-lg hover:bg-primary/10 text-primary/70 active:scale-95 transition-all"
            aria-label="공유하기"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 pb-1 border-t border-border/50 mt-1">
                {stats.masterCategories.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-rating" />
                      획득한 마스터 배지
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {stats.masterCategories.map((cat) => (
                        <div
                          key={cat}
                          className="flex items-center gap-1 px-2 py-1 bg-rating/10 border border-rating/30 rounded-lg"
                        >
                          <span className="text-xs">{CATEGORY_EMOJI[cat] || "🍽️"}</span>
                          <span className="text-[10px] font-bold text-rating">{cat}</span>
                          <Trophy className="h-2.5 w-2.5 text-rating" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">카테고리별 진행률</p>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-thin">
                  {stats.categoryStats.map((cat) => (
                    <div key={cat.category} className="flex items-center gap-1.5">
                      <span className="text-xs w-4 text-center">
                        {CATEGORY_EMOJI[cat.category] || "🍽️"}
                      </span>
                      <span className="text-[10px] font-medium text-foreground w-16 truncate">
                        {cat.category}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            cat.isMaster
                              ? "bg-gradient-to-r from-rating to-rating/70"
                              : "bg-gradient-to-r from-primary/70 to-primary/50"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.percent}%` }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-bold w-12 text-right ${
                          cat.isMaster ? "text-rating" : "text-muted-foreground"
                        }`}
                      >
                        {cat.visited}/{cat.total}
                        {cat.isMaster && " 🏆"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 rounded-2xl overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
      >
        {/* Rank Badge */}
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-2xl shadow-sm">
          {stats.rankEmoji}
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{stats.rank}</span>
            {stats.masterCategories.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] bg-rating/20 text-rating px-1.5 py-0.5 rounded-full font-semibold">
                <Crown className="h-3 w-3" />
                {stats.masterCategories.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stats.overallPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-bold text-primary">{stats.overallPercent}%</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            <MapPin className="h-3 w-3 inline mr-0.5" />
            {stats.totalVisited}/{stats.totalRestaurants}곳 정복
          </p>
        </div>

        {/* Expand/Share */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="p-3 rounded-xl hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors active:scale-95"
            aria-label="공유하기"
          >
            <Share2 className="h-5 w-5" />
          </button>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/50 pt-3">
              {/* Master badges */}
              {stats.masterCategories.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-rating" />
                    획득한 마스터 배지
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stats.masterCategories.map((cat) => (
                      <div
                        key={cat}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rating/10 border border-rating/30 rounded-xl"
                      >
                        <span className="text-base">{CATEGORY_EMOJI[cat] || "🍽️"}</span>
                        <span className="text-xs font-bold text-rating">{cat} 마스터</span>
                        <Trophy className="h-3 w-3 text-rating" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category progress list */}
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">카테고리별 진행률</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
                {stats.categoryStats.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center">
                      {CATEGORY_EMOJI[cat.category] || "🍽️"}
                    </span>
                    <span className="text-[12px] font-medium text-foreground w-20 truncate">
                      {cat.category}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          cat.isMaster
                            ? "bg-gradient-to-r from-rating to-rating/70"
                            : "bg-gradient-to-r from-primary/70 to-primary/50"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percent}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-bold w-14 text-right ${
                        cat.isMaster ? "text-rating" : "text-muted-foreground"
                      }`}
                    >
                      {cat.visited}/{cat.total}
                      {cat.isMaster && " 🏆"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TourProgress;
