import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FEEDBACK_CATEGORIES = [
  { value: "ui", label: "🖥️ 화면/디자인 개선" },
  { value: "data", label: "📋 식당 정보 오류" },
  { value: "feature", label: "✨ 기능 요청" },
  { value: "bug", label: "🐛 오류/버그 신고" },
  { value: "other", label: "💬 기타 의견" },
];

const FeedbackForm = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "feature",
    content: "",
  });

  const handleSubmit = async () => {
    if (!form.content.trim()) {
      toast({ title: "내용을 입력해주세요", variant: "destructive" });
      return;
    }

    setSending(true);
    const label = FEEDBACK_CATEGORIES.find(c => c.value === form.type)?.label ?? form.type;
    const { error } = await supabase.from("tips" as any).insert({
      restaurant_name: form.title.trim() || `[앱 피드백] ${label}`,
      category: `feedback:${form.type}`,
      address: null,
      reason: form.content.trim(),
    });

    if (error) {
      toast({ title: "전송 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "소중한 의견 감사합니다 🙏", description: "검토 후 앱 개선에 반영하겠습니다" });
      setForm({ title: "", type: "feature", content: "" });
      setOpen(false);
    }
    setSending(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[35vh] z-[1300] w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl glass flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
        style={{ right: 'calc(env(safe-area-inset-right, 0px) + 16px)' }}
        aria-label="앱 개선 의견 보내기"
      >
        <MessageCircle className="h-5 w-5 text-primary/70" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="앱 개선 의견"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  앱 개선 의견
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-muted active:scale-95 transition-all"
                  aria-label="닫기"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground">
                불편한 점이나 개선 아이디어를 자유롭게 남겨주세요. 더 나은 앱을 만드는 데 활용하겠습니다.
              </p>

              <div className="space-y-3">
                {/* Type select */}
                <div>
                  <label className="text-sm font-medium">의견 유형</label>
                  <div className="relative mt-1">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none pr-8"
                    >
                      {FEEDBACK_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Optional title */}
                <div>
                  <label className="text-sm font-medium">제목 <span className="text-muted-foreground font-normal">(선택)</span></label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="예: 검색 기능이 느려요"
                    maxLength={60}
                    className="mt-1"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="text-sm font-medium">내용 *</label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="구체적으로 작성해주실수록 더 빠르게 개선할 수 있습니다."
                    rows={4}
                    maxLength={500}
                    className="mt-1 resize-none"
                  />
                  <p className="text-right text-[11px] text-muted-foreground mt-1">{form.content.length}/500</p>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={sending} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {sending ? "전송 중..." : "의견 보내기"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackForm;
