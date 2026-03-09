import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TipForm = () => {
  const { data: categories = [] } = useCategories();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    restaurant_name: "",
    category: "기타",
    address: "",
    reason: "",
  });

  const handleSubmit = async () => {
    if (!form.restaurant_name.trim()) {
      toast({ title: "식당 이름을 입력해주세요", variant: "destructive" });
      return;
    }

    setSending(true);
    const { error } = await supabase.from("tips" as any).insert({
      restaurant_name: form.restaurant_name.trim(),
      category: form.category,
      address: form.address.trim() || null,
      reason: form.reason.trim() || null,
    });

    if (error) {
      toast({ title: "제보 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "제보 완료! 🎉", description: "소중한 맛집 정보 감사합니다" });
      setForm({ restaurant_name: "", category: "기타", address: "", reason: "" });
      setOpen(false);
    }
    setSending(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-[1300] w-10 h-10 rounded-xl glass flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="맛집 제보하기"
      >
        <MessageSquarePlus className="h-4 w-4 text-primary" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="맛집 제보"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-card border-t sm:border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MessageSquarePlus className="h-5 w-5 text-primary" />
                  맛집 제보
                </h2>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted" aria-label="닫기">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground">
                숨겨진 춘천 맛집을 알려주세요! 확인 후 등록해 드립니다.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium" htmlFor="tip-name">식당 이름 *</label>
                  <Input
                    id="tip-name"
                    value={form.restaurant_name}
                    onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
                    placeholder="예: 홍길동 칼국수"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="tip-category">업종</label>
                  <select
                    id="tip-category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="tip-address">주소 / 위치 설명</label>
                  <Input
                    id="tip-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="예: 후평동 사거리 근처"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="tip-reason">추천 이유</label>
                  <Textarea
                    id="tip-reason"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="예: 현지인들만 아는 숨은 맛집, 칼국수가 정말 맛있어요!"
                    rows={3}
                    maxLength={300}
                  />
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={sending} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {sending ? "제보 중..." : "제보하기"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TipForm;
