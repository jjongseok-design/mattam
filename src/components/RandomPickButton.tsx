import { Dices } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import type { Restaurant } from "@/hooks/useRestaurants";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";

interface RandomPickButtonProps {
  restaurants: Restaurant[];
}

const RandomPickButton = ({ restaurants }: RandomPickButtonProps) => {
  const [picked, setPicked] = useState<Restaurant | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const handlePick = () => {
    if (restaurants.length === 0) return;
    setIsSpinning(true);
    setPicked(null);

    // Animate for a moment then reveal
    setTimeout(() => {
      const idx = Math.floor(Math.random() * restaurants.length);
      setPicked(restaurants[idx]);
      setIsSpinning(false);
    }, 600);
  };

  const emoji = picked ? (CATEGORY_EMOJI[picked.category] || "🍽️") : "🎲";

  return (
    <div className="relative">
      <button
        onClick={handlePick}
        disabled={restaurants.length === 0}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl text-[11px] font-semibold transition-all duration-200 disabled:opacity-40 border border-accent/20 whitespace-nowrap"
        aria-label="랜덤 식당 추천"
      >
        <motion.span
          animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
          transition={isSpinning ? { duration: 0.6, repeat: Infinity, ease: "linear" } : {}}
        >
          <Dices className="h-3.5 w-3.5" />
        </motion.span>
        오늘 뭐 먹지?
      </button>

      <AnimatePresence>
        {picked && !isSpinning && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 z-[2000] w-64 bg-card border border-border rounded-2xl shadow-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground text-sm truncate">{picked.name}</p>
                <p className="text-[11px] text-muted-foreground">{picked.category} · ⭐ {picked.rating}</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 truncate">{picked.address}</p>
            <div className="flex gap-2">
              <a
                href={`https://map.naver.com/v5/search/${encodeURIComponent(picked.name + ' 춘천')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                상세보기
              </a>
              <button
                onClick={handlePick}
                className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-semibold hover:bg-muted/80 transition-colors"
              >
                다시 뽑기
              </button>
            </div>
            <button
              onClick={() => setPicked(null)}
              className="absolute top-1 right-1 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground/50 hover:text-foreground text-xs"
              aria-label="닫기"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RandomPickButton;
