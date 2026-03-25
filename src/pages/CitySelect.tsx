import { Link } from "react-router-dom";
import { MapPin, Utensils, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useCities } from "@/hooks/useCities";
import ThemeToggle from "@/components/ThemeToggle";
import type { City } from "@/types/city";

const CITY_IMAGES: Record<string, string> = {
  chuncheon: "https://tong.visitkorea.or.kr/cms/resource/40/3576840_image2_1.jpg",
  gangneung: "https://tong.visitkorea.or.kr/cms/resource/23/2671423_image2_1.jpg",
  sokcho: "https://tong.visitkorea.or.kr/cms/resource/64/2733164_image2_1.jpg",
};

const CityCard = ({ city, index }: { city: City; index: number }) => {
  if (city.comingSoon) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        className="relative rounded-2xl border border-border/40 bg-muted/30 overflow-hidden"
      >
        <div className="p-5 flex items-center gap-4 opacity-50">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
            🏙️
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg">{city.name}</h3>
            <p className="text-sm text-muted-foreground">{city.description}</p>
          </div>
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-1 rounded-full">
            준비 중
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Link to={`/${city.id}`} className="block">
        <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15)] transition-all duration-200">
          {/* City image */}
          {(city.imageUrl ?? CITY_IMAGES[city.id]) ? (
            <div className="h-36 overflow-hidden relative">
              <img
                src={city.imageUrl ?? CITY_IMAGES[city.id]}
                alt={city.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 flex items-center justify-center">
              <MapPin className="h-16 w-16 text-primary/20" />
            </div>
          )}

          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Utensils className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg leading-tight">{city.name}</h3>
                  <p className="text-xs text-muted-foreground">{city.description}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-primary/50" />
            </div>

            {city.restaurantCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                  <Utensils className="h-3 w-3" />
                  {city.restaurantCount}개 맛집
                </span>
              </div>
            )}
          </div>
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Utensils className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-black text-foreground tracking-tight">맛탐</h1>
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
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-black text-foreground mb-2">
            어느 도시 맛집이 궁금하세요?
          </h2>
          <p className="text-sm text-muted-foreground">
            현지인이 직접 추천하는 도시별 맛집 지도
          </p>
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

            {/* Static coming soon cities */}
            {[
              { id: "gangneung", name: "강릉", description: "강원도 강릉시" },
              { id: "sokcho", name: "속초", description: "강원도 속초시" },
            ].map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (activeCities.length + comingSoonCities.length + i) * 0.08 }}
                className="relative rounded-2xl border border-border/40 bg-muted/20 overflow-hidden"
              >
                <div className="h-28 overflow-hidden relative">
                  <img
                    src={CITY_IMAGES[c.id]}
                    alt={c.name}
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
                <div className="p-4 flex items-center gap-3 opacity-60">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-lg">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    🔜 곧 오픈
                  </span>
                </div>
              </motion.div>
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
