import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const getSlides = (cityName: string) => [
  { emoji: "🗺️", title: `${cityName} 맛집 지도, 맛탐`, desc: "AI가 아닌 직접 가본 사람들이\n만들어가는 진짜 맛집 지도예요." },
  { emoji: "📮", title: "제보하면 지도에 추가돼요", desc: "아는 맛집을 + 버튼으로 제보하면\n맛탐팀이 확인 후 지도에 올려드려요." },
  { emoji: "🌱", title: "함께 만들수록 더 풍성해져요", desc: `여러분의 제보 하나하나가\n${cityName} 최고의 맛집 지도를 만들어요.` },
];

const OnboardingSlide = ({ onClose, centered, cityName = "우리 동네" }: { onClose: () => void; centered?: boolean; cityName?: string }) => {
  const slides = getSlides(cityName);
  const [current, setCurrent] = useState(0);
  const isLast = current === slides.length - 1;
  const handleNext = () => { if (isLast) { onClose(); } else { setCurrent((p) => p + 1); } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`fixed inset-0 z-[3000] bg-background/80 backdrop-blur-sm flex justify-center ${centered ? "items-center" : "items-end"}`}>
      <motion.div initial={{ y: centered ? 24 : "100%" }} animate={{ y: 0 }} exit={{ y: centered ? 24 : "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }} className={`bg-card w-full max-w-lg px-8 pt-10 pb-14 border border-border/30 ${centered ? "rounded-3xl shadow-2xl" : "rounded-t-3xl border-t"}`}>
        <div className="flex justify-center gap-2 mb-10">
          {slides.map((_, i) => (
            <div key={i} className={`h-[3px] rounded-full transition-all duration-300 ${i === current ? "w-8 bg-primary" : "w-3 bg-muted-foreground/20"}`} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }} className="text-center mb-12">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">{slides[current].emoji}</span>
            </div>
            <h2 className="text-[20px] font-bold tracking-tight mb-2">{slides[current].title}</h2>
            <p className="text-[13px] text-muted-foreground whitespace-pre-line">{slides[current].desc}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-col gap-2">
          <button onClick={handleNext} className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-[15px] active:scale-95 transition-transform">
            {isLast ? "시작하기 🎉" : "다음 →"}
          </button>
          {!isLast && (
            <button onClick={onClose} className="w-full py-2 text-[12px] text-muted-foreground/60">건너뛰기</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OnboardingSlide;
