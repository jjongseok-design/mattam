import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Target, CheckCircle2, MapPin, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useVisited } from "@/hooks/useVisited";
import { useTourStats } from "@/hooks/useTourStats";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import ShareCard from "@/components/ShareCard";
import { useState } from "react";

const Tour = () => {
  const { data: restaurants = [], isLoading } = useRestaurants();
  const { visited } = useVisited();
  const stats = useTourStats(restaurants, visited);
  const [shareOpen, setShareOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-bold text-foreground flex-1">맛집 투어 현황</h1>
        <button
          onClick={() => setShareOpen(true)}
          className="text-xs text-primary font-semibold hover:underline"
        >
          공유
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Rank Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-3xl shadow-md">
              {stats.rankEmoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-bold text-foreground">{stats.rank}</span>
                {stats.masterCategories.length > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-rating/20 text-rating px-2 py-0.5 rounded-full font-semibold">
                    <Crown className="h-3 w-3" />
                    마스터 {stats.masterCategories.length}개
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.overallPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <span className="text-sm font-bold text-primary">{stats.overallPercent}%</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {stats.totalVisited}/{stats.totalRestaurants}곳 정복
              </p>
            </div>
          </div>
        </motion.div>

        {/* Master Badges */}
        {stats.masterCategories.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-rating" />
              획득한 마스터 배지
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.masterCategories.map((cat) => (
                <motion.div
                  key={cat}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="flex items-center gap-2 px-3 py-2 bg-rating/10 border border-rating/30 rounded-xl"
                >
                  <span className="text-base">{CATEGORY_EMOJI[cat] || "🍽️"}</span>
                  <span className="text-sm font-bold text-rating">{cat} 마스터</span>
                  <Trophy className="h-3.5 w-3.5 text-rating" />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Missions */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            미션 {stats.completedMissions}/{stats.missions.length}
          </h2>
          <div className="space-y-2">
            {stats.missions.map((mission, i) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  mission.completed
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30 border-border/30"
                }`}
              >
                <span className="text-xl flex-shrink-0">{mission.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${mission.completed ? "text-primary" : "text-foreground"}`}>
                      {mission.title}
                    </span>
                    {mission.completed && <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{mission.description}</p>
                  {!mission.completed && mission.target > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all duration-500"
                          style={{ width: `${mission.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {mission.current}/{mission.target}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Category breakdown */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">카테고리별 진행률</h2>
          <div className="space-y-2.5">
            {stats.categoryStats.map((cat, i) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3"
              >
                <span className="text-base w-6 text-center">{CATEGORY_EMOJI[cat.category] || "🍽️"}</span>
                <span className="text-sm font-medium text-foreground w-24 truncate">{cat.category}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      cat.isMaster
                        ? "bg-gradient-to-r from-rating to-rating/70"
                        : "bg-gradient-to-r from-primary/70 to-primary/50"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percent}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.03 }}
                  />
                </div>
                <span className={`text-xs font-bold w-16 text-right ${cat.isMaster ? "text-rating" : "text-muted-foreground"}`}>
                  {cat.visited}/{cat.total}
                  {cat.isMaster && " 🏆"}
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      <ShareCard open={shareOpen} onClose={() => setShareOpen(false)} restaurants={restaurants} visited={visited} />
    </div>
  );
};

export default Tour;
