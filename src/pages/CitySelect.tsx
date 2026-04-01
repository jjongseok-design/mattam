import { Link } from "react-router-dom";
import { Utensils, ChevronRight, Loader2, Send, Users, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useCities } from "@/hooks/useCities";
import ThemeToggle from "@/components/ThemeToggle";
import type { City } from "@/types/city";

const CityCard = ({ city, index }: { city: City; index: number }) => {
  const isComingSoon = city.comingSoon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={isComingSoon ? undefined : { scale: 1.01 }}
      whileTap={isComingSoon ? undefined : { scale: 0.99 }}
    >
      <Link to={`/${city.id}`} className="block group">
        <div className="relative h-36 rounded-2xl overflow-hidden border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.2)]">
          {city.imageUrl ? (
            <img
              src={city.imageUrl}
              alt={city.name}
              className={`w-full h-full object-cover transition-transform duration-500 ${isComingSoon ? "opacity-50" : "group-hover:scale-105"}`}
            />
          ) : (
            <div className="w-full h-full bg-muted/40 flex items-center justify-center">
              <Utensils className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {!isComingSoon && city.restaurantCount > 0 && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full border border-white/20">
                <Utensils className="h-3 w-3" />
                {city.restaurantCount}개 맛집
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
            <div>
              <h3 className="font-black text-white text-2xl leading-tight">{city.name}</h3>
              <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{city.description}</p>
            </div>
            {!isComingSoon && (
              <ChevronRight className="h-6 w-6 text-white/70 flex-shrink-0 mb-0.5 group-hover:translate-x-1 transition-transform" />
            )}
          </div>

          {isComingSoon && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-lg font-bold text-white bg-black/60 backdrop-blur-sm px-5 py-2 rounded-full border border-white/20">
                🔜 곧 오픈
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

const CitySelect = () => {
  const { data: cities = [], isLoading } = useCities();

  const activeCities = cities.filter((c) => c.isActive && !c.comingSoon);
  const comingSoonCities = cities.filter((c) => c.comingSoon);

  return (
    <div className="min-h-screen bg-background safe-area-top">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/30">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/pwa-icon-192.png" alt="맛탐 로고" className="w-8 h-8 rounded-lg" />
            <div>
              <h1 className="text-[15px] font-black text-primary tracking-tight">맛탐</h1>
              <p className="text-[10px] text-muted-foreground">도시별 현지인 맛집지도</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-black text-foreground mb-2">
            어느 도시 맛집이 궁금하세요?
          </h2>
          <p className="text-sm text-muted-foreground">
            현지인이 직접 추천하는 도시별 맛집 지도
          </p>
        </motion.div>

        {/* 컨셉 문구 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 grid grid-cols-3 gap-2 text-center"
        >
          {[
            { Icon: Send, color: "text-orange-500", bg: "bg-orange-100/60 dark:bg-orange-900/30", text: "가본 식당 제보하면\n바로 반영돼요" },
            { Icon: Users, color: "text-blue-500", bg: "bg-blue-100/60 dark:bg-blue-900/30", text: "방문 기록으로\n함께 검증하는 맛집" },
            { Icon: Star, color: "text-yellow-500", bg: "bg-yellow-100/60 dark:bg-yellow-900/30", text: "광고 없이\n진짜 후기만" },
          ].map(({ Icon, color, bg, text }) => (
            <div key={text} className="bg-muted/40 rounded-xl px-2 py-3 flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug whitespace-pre-line">{text}</p>
            </div>
          ))}
        </motion.div>

        {/* City list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {activeCities.map((city, i) => (
              <CityCard key={city.id} city={city} index={i} />
            ))}

            {comingSoonCities.map((city, i) => (
              <CityCard key={city.id} city={city} index={activeCities.length + i} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center text-[11px] text-muted-foreground/40">
          © {new Date().getFullYear()} 맛탐 · 도시별 맛집지도
        </div>
      </div>
    </div>
  );
};

export default CitySelect;
