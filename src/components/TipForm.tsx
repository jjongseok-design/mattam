import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCityContext } from "@/contexts/CityContext";

interface TipFormProps {
  open: boolean;
  onClose: () => void;
}

const TipForm = ({ open, onClose }: TipFormProps) => {
  const { cityId, city } = useCityContext();
  const { data: categories = [] } = useCategories(cityId || undefined);
  const cityLabel = city?.name ?? "우리도시";
  const { toast } = useToast();
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
      toast({ title: "제보 완료! 🎉", description: "맛탐팀이 확인 후 등록해드립니다." });
      setForm({ restaurant_name: "", category: "기타", address: "", reason: "" });
      onClose();
    }
    setSending(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-black/50 flex items-end justify-center"
          onClick={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card border border-border rounded-t-2xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                맛집 제보
              </h2>
              <button onClick={onClose} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-muted active:scale-95 transition-all">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              직접 가본 {cityLabel} 맛집을 알려주세요! 확인 후 등록해드립니다.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium" htmlFor="tip-name">식당 이름 *</label>
                <Input
                  id="tip-name"
                  placeholder="예: 춘천막국수"
                  value={form.restaurant_name}
                  onChange={(e) => setForm((f) => ({ ...f, restaurant_name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="tip-category">카테고리</label>
                <select
                  id="tip-category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="tip-address">주소 (선택)</label>
                <Input
                  id="tip-address"
                  placeholder="예: 춘천시 중앙로 1번길"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="tip-reason">추천 이유 (선택)</label>
                <Textarea
                  id="tip-reason"
                  placeholder="어떤 점이 좋았나요?"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={sending}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? "제보 중..." : "제보하기"}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TipForm;
