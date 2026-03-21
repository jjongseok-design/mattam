import { Trophy, MapPin, Share2, ChevronDown, ChevronUp, Crown, Target, CheckCircle2, Bell, BellOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import type { Restaurant } from "@/hooks/useRestaurants";
import { useTourStats } from "@/hooks/useTourStats";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";

interface TourProgressProps {
  restaurants: Restaurant[];
  visited: Set<string>;
  onShare: () => void;
  compact?: boolean;
  cityName?: string;
}

const TourProgress = ({ restaurants, visited, onShare, compact = false, cityName }: TourProgressProps) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"category" | "missions">("category");
  const stats = useTourStats(restaurants, visited, cityName);
  const { permission, requestPermission } = useNotifications();
  const { toast } = useToast();
  const prevMasterRef = useRef<string[]>([]);

  useEffect(() => {
    const prev = prevMasterRef.current;
    const newlyMastered = stats.masterCategories.filter((cat) => !prev.includes(cat));
    if (newlyMastered.length > 0 && prev.length > 0) {
      newlyMastered.forEach((cat) => {
        const emoji = CATEGORY_EMOJI[cat] || "🍽️";
        toast({ title: `${emoji} ${cat} 마스터 달성! 🏆`, description: `${cat}의 모든 맛집을 방문했습니다!` });
      });
    }
    prevMasterRef.current = stats.masterCategories;
  }, [stats.masterCategories, toast]);

  const handleNotificationToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permission === "unsupported") {
      toast({ title: "이 브라우저는 알림을 지원하지 않습니다" });
      return;
    }
    if (permission === "denied") {
      toast({ title: "브라우저 설정에서 알림을 허용해주세요", variant: "destructive" });
      return;
    }
    if (permission === "granted") {
      toast({ title: "알림이 이미 켜져 있습니다 🔔" });
      return;
    }
    const ok = await requestPermission();
    toast({ title: ok ? "알림이 켜졌습니다 🔔" : "알림 허용을 취소했습니다" });
  };

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

        {/* Expand/Share/Notification */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleNotificationToggle}
            className={`p-2.5 rounded-xl transition-colors active:scale-95 ${
              permission === "granted"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground/50 hover:bg-muted/50"
            }`}
            aria-label="알림 설정"
          >
            {permission === "granted" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
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
                <div className="mb-3">
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

              {/* 탭 전환 */}
              <div className="flex gap-1 mb-3 bg-muted/50 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab("category")}
                  className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-colors ${
                    activeTab === "category" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  카테고리
                </button>
                <button
                  onClick={() => setActiveTab("missions")}
                  className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-colors flex items-center justify-center gap-1 ${
                    activeTab === "missions" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Target className="h-3 w-3" />
                  미션 {stats.completedMissions}/{stats.missions.length}
                </button>
              </div>

              {activeTab === "category" ? (
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
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
                  {stats.missions.map((mission) => (
                    <div
                      key={mission.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                        mission.completed
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-border/30"
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{mission.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={`text-[12px] font-bold ${mission.completed ? "text-primary" : "text-foreground"}`}>
                            {mission.title}
                          </span>
                          {mission.completed && (
                            <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{mission.description}</p>
                        {!mission.completed && mission.target > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/60 rounded-full transition-all duration-500"
                                style={{ width: `${mission.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {mission.current}/{mission.target}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TourProgress;
