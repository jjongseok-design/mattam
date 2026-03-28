import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquarePlus, Send, X, Camera } from "lucide-react";
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [form, setForm] = useState({
    restaurant_name: "",
    category: "기타",
    address: "",
    reason: "",
  });

  const handleImage = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "10MB 이하 이미지만 가능해요", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.restaurant_name.trim()) {
      toast({ title: "식당 이름을 입력해주세요", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      let image_url = null;
      if (imageBase64) {
        const fileName = `tips/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("restaurant-images")
          .upload(fileName, Buffer.from(imageBase64, "base64"), { contentType: "image/jpeg" });
        if (!uploadError) {
          const { data } = supabase.storage.from("restaurant-images").getPublicUrl(fileName);
          image_url = data.publicUrl;
        }
      }
      const deviceId = (() => {
        try {
          let id = localStorage.getItem("mattam_device_id");
          if (!id) { id = crypto.randomUUID(); localStorage.setItem("mattam_device_id", id); }
          return id;
        } catch { return "unknown"; }
      })();

      const { error } = await supabase.from("tips" as any).insert({
        restaurant_name: form.restaurant_name.trim(),
        category: form.category,
        address: form.address.trim() || null,
        reason: form.reason.trim() || null,
        image_url,
        device_id: deviceId,
      });
      if (error) {
        toast({ title: "제보 실패", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "제보 완료! 🎉", description: "맛탐팀이 확인 후 등록해드립니다." });
        setForm({ restaurant_name: "", category: "기타", address: "", reason: "" });
        setImagePreview(null);
        setImageBase64(null);
        onClose();
      }
    } catch (err: any) {
      toast({ title: "제보 실패", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/60 flex items-end justify-center" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-card border border-border rounded-t-2xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                맛집 제보
              </h2>
              <button onClick={onClose} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-muted active:scale-95 transition-all">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">직접 가본 {cityLabel} 맛집을 알려주세요! 확인 후 등록해드립니다.</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">식당 이름 *</label>
                <Input id="tip-name" value={form.restaurant_name} onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} placeholder="예) 춘천막국수" maxLength={50} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">카테고리</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">주소 / 위치 힌트</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="예) 명동거리 근처" maxLength={100} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">추천 이유</label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="어떤 메뉴가 맛있는지, 분위기 등 자유롭게 적어주세요!" rows={3} maxLength={300} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">사진 첨부 (선택)</label>
                <div className="mt-1">
                  {imagePreview ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden">
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      <button onClick={() => { setImagePreview(null); setImageBase64(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-muted/30 cursor-pointer transition-colors">
                      <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">사진을 추가하면 검토가 빨라져요</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
                    </label>
                  )}
                </div>
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
  );
};

export default TipForm;
