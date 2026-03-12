import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, Plus, ArrowLeft, Search, Loader2, Lock, KeyRound, MessageSquarePlus, Check, X, Settings2, Image } from "lucide-react";
import { Link } from "react-router-dom";
import { useCategories, useInvalidateCategories, type CategoryRow } from "@/hooks/useCategories";
import { motion } from "framer-motion";

interface RestaurantRow {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string | null;
  rating: number;
  review_count: number;
  lat: number;
  lng: number;
  price_range: string | null;
  tags: string[] | null;
  description: string | null;
  image_url: string | null;
}

const getEmptyForm = (category: string) => ({
  id: "",
  name: "",
  category,
  address: "",
  phone: "",
  rating: 0,
  review_count: 0,
  lat: 37.8813,
  lng: 127.7298,
  price_range: "",
  tags: [] as string[],
  description: "",
});

const adminApi = async (pin: string, action: string, data?: any) => {
  const { data: result, error } = await supabase.functions.invoke("admin-api", {
    body: { pin, action, data },
  });
  if (error) throw new Error(error.message);
  if (!result.success) throw new Error(result.error);
  return result;
};

const Admin = () => {
  const { toast } = useToast();
  const { data: categories = [] } = useCategories();
  const invalidateCategories = useInvalidateCategories();
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [form, setForm] = useState(getEmptyForm("닭갈비"));
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [adminCategory, setAdminCategory] = useState<string>("닭갈비");
  const [tips, setTips] = useState<any[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsTab, setTipsTab] = useState<"tips" | "feedback">("tips");
  const [fetchingImageId, setFetchingImageId] = useState<string | null>(null);
  const [fetchingAllImages, setFetchingAllImages] = useState(false);

  // Category management state
  const [editMode, setEditMode] = useState(false);
  const [catForm, setCatForm] = useState({ id: "", label: "", emoji: "🍴", id_prefix: "", tag_placeholder: "", tag_suggestions: "" });
  const [editingCat, setEditingCat] = useState<CategoryRow | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catSaving, setCatSaving] = useState(false);

  // Drag and drop state
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pin");
    if (saved) {
      setPin(saved);
      setAuthenticated(true);
    }
  }, []);

  // Set initial category when categories load
  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.id === adminCategory)) {
      setAdminCategory(categories[0].id);
    }
  }, [categories, adminCategory]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    } else {
      setRestaurants(data ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (authenticated) fetchAll();
  }, [authenticated, fetchAll]);

  const [loginLocked, setLoginLocked] = useState(false);

  const handleLogin = async () => {
    if (!pinInput.trim() || loginLocked) return;
    try {
      await adminApi(pinInput, "verify");
      setPin(pinInput);
      setAuthenticated(true);
      sessionStorage.setItem("admin_pin", pinInput);
      toast({ title: "로그인 성공 ✅" });
    } catch (err: any) {
      const msg = err.message || "PIN이 틀렸습니다";
      if (msg.includes("너무 많은") || msg.includes("locked")) {
        setLoginLocked(true);
        setTimeout(() => setLoginLocked(false), 15 * 60 * 1000);
      }
      toast({ title: msg, variant: "destructive" });
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setPin("");
    setPinInput("");
    sessionStorage.removeItem("admin_pin");
  };

  const handleChangePin = async () => {
    if (newPin !== confirmPin) {
      toast({ title: "새 PIN이 일치하지 않습니다", variant: "destructive" });
      return;
    }
    if (newPin.length < 4 || newPin.length > 8) {
      toast({ title: "PIN은 4~8자리여야 합니다", variant: "destructive" });
      return;
    }
    try {
      await adminApi(pin, "change_pin", { new_pin: newPin });
      setPin(newPin);
      sessionStorage.setItem("admin_pin", newPin);
      setShowPinChange(false);
      setNewPin("");
      setConfirmPin("");
      toast({ title: "PIN 변경 완료 ✅" });
    } catch (err: any) {
      toast({ title: "PIN 변경 실패", description: err.message, variant: "destructive" });
    }
  };

  // Filter by admin category tab + search
  const filtered = restaurants.filter(
    (r) =>
      r.category === adminCategory &&
      (r.name.includes(search) ||
        r.address.includes(search) ||
        (r.tags ?? []).some((t) => t.includes(search)))
  );

  const categoryCount = (catId: string) => restaurants.filter((r) => r.category === catId).length;

  const currentCat = categories.find(c => c.id === adminCategory);

  const openNew = () => {
    const prefix = currentCat?.id_prefix ?? "xx";
    const maxNum = restaurants.reduce((max, r) => {
      const m = r.id.match(new RegExp(`^${prefix}(\\d+)$`));
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 0);
    const nextId = `${prefix}${String(maxNum + 1).padStart(2, "0")}`;
    setForm({ ...getEmptyForm(adminCategory), id: nextId });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (r: RestaurantRow) => {
    setForm({
      id: r.id,
      name: r.name,
      category: r.category,
      address: r.address,
      phone: r.phone ?? "",
      rating: r.rating,
      review_count: r.review_count,
      lat: r.lat,
      lng: r.lng,
      price_range: r.price_range ?? "",
      tags: r.tags ?? [],
      description: r.description ?? "",
    });
    setEditing(r);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.address) {
      toast({ title: "이름과 주소는 필수입니다", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      id: form.id,
      name: form.name,
      category: form.category,
      address: form.address,
      phone: form.phone || null,
      rating: Number(form.rating),
      review_count: Number(form.review_count),
      lat: Number(form.lat),
      lng: Number(form.lng),
      price_range: form.price_range || null,
      tags:
        typeof form.tags === "string"
          ? (form.tags as string)
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : form.tags,
      description: form.description || null,
    };

    try {
      if (editing) {
        await adminApi(pin, "update", payload);
      } else {
        await adminApi(pin, "insert", payload);
      }
      toast({ title: editing ? "수정 완료 ✅" : "추가 완료 ✅" });
      setShowForm(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleFetchImage = async (id: string) => {
    setFetchingImageId(id);
    try {
      const res = await adminApi(pin, "fetch_restaurant_images", { id });
      const r = res.results?.[0];
      if (r?.success) {
        toast({ title: "이미지 가져오기 완료 ✅" });
        fetchAll();
      } else {
        toast({ title: "이미지 없음", description: r?.error || "Google Places에서 사진을 찾을 수 없습니다", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    }
    setFetchingImageId(null);
  };

  const handleFetchAllImages = async () => {
    if (!confirm("이미지가 없는 모든 식당의 사진을 Google Places에서 가져옵니다. 계속하시겠습니까?")) return;
    setFetchingAllImages(true);
    try {
      const res = await adminApi(pin, "fetch_restaurant_images");
      const ok = res.results?.filter((r: any) => r.success).length ?? 0;
      const fail = res.results?.filter((r: any) => !r.success).length ?? 0;
      toast({ title: `완료: ${ok}개 성공, ${fail}개 실패` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    }
    setFetchingAllImages(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 을(를) 삭제하시겠습니까?`)) return;
    try {
      await adminApi(pin, "delete", { id });
      toast({ title: "삭제 완료 ✅" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
    }
  };

  const currentTagSuggestions = currentCat?.tag_suggestions ?? [];
  const currentTagPlaceholder = currentCat?.tag_placeholder ?? "";

  const toggleSuggestionTag = (tag: string) => {
    const currentTags = Array.isArray(form.tags) ? form.tags : (form.tags as string).split(",").map(t => t.trim()).filter(Boolean);
    if (currentTags.includes(tag)) {
      setForm({ ...form, tags: currentTags.filter(t => t !== tag) });
    } else {
      setForm({ ...form, tags: [...currentTags, tag] });
    }
  };

  // === Category Management Functions ===
  const openNewCategory = () => {
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
    setCatForm({ id: "", label: "", emoji: "🍴", id_prefix: "", tag_placeholder: "", tag_suggestions: "" });
    setEditingCat(null);
    setShowCatForm(true);
  };

  const openEditCategory = (cat: CategoryRow) => {
    setCatForm({
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji,
      id_prefix: cat.id_prefix,
      tag_placeholder: cat.tag_placeholder,
      tag_suggestions: cat.tag_suggestions.join(", "),
    });
    setEditingCat(cat);
    setShowCatForm(true);
  };

  const handleSaveCategory = async () => {
    if (!catForm.id.trim() || !catForm.label.trim()) {
      toast({ title: "ID와 이름은 필수입니다", variant: "destructive" });
      return;
    }
    setCatSaving(true);
    try {
      const tags = catForm.tag_suggestions.split(",").map(t => t.trim()).filter(Boolean);
      if (editingCat) {
        const oldId = editingCat.id;
        const newId = catForm.id.trim();
        
        if (oldId !== newId) {
          // Insert new category, update restaurants, delete old
          await adminApi(pin, "category_insert", {
            id: newId,
            label: catForm.label,
            emoji: catForm.emoji,
            id_prefix: catForm.id_prefix,
            tag_placeholder: catForm.tag_placeholder,
            tag_suggestions: tags,
            sort_order: editingCat.sort_order,
          });
          await adminApi(pin, "bulk_update_category", { old_category: oldId, new_category: newId });
          await adminApi(pin, "category_delete", { id: oldId });
        } else {
          await adminApi(pin, "category_update", {
            id: editingCat.id,
            label: catForm.label,
            emoji: catForm.emoji,
            id_prefix: catForm.id_prefix,
            tag_placeholder: catForm.tag_placeholder,
            tag_suggestions: tags,
          });
        }
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
        await adminApi(pin, "category_insert", {
          id: catForm.id.trim(),
          label: catForm.label,
          emoji: catForm.emoji,
          id_prefix: catForm.id_prefix || "xx",
          tag_placeholder: catForm.tag_placeholder,
          tag_suggestions: tags,
          sort_order: maxOrder + 1,
        });
      }
      invalidateCategories();
      fetchAll();
      setShowCatForm(false);
      toast({ title: editingCat ? "카테고리 수정 완료 ✅" : "카테고리 추가 완료 ✅" });
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    }
    setCatSaving(false);
  };

  const handleDeleteCategory = async (cat: CategoryRow) => {
    const count = categoryCount(cat.id);
    if (count > 0) {
      toast({ title: `이 카테고리에 ${count}개의 식당이 있습니다. 먼저 식당을 이동/삭제해주세요.`, variant: "destructive" });
      return;
    }
    if (!confirm(`"${cat.label}" 카테고리를 삭제하시겠습니까?`)) return;
    try {
      await adminApi(pin, "category_delete", { id: cat.id });
      invalidateCategories();
      toast({ title: "카테고리 삭제 완료 ✅" });
    } catch (err: any) {
      toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
    }
  };


  // --- PIN Login Screen ---
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">관리자 로그인</h1>
            <p className="text-sm text-muted-foreground">PIN 번호를 입력하세요</p>
          </div>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="PIN (기본: 0000)"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="text-center text-lg tracking-[0.5em] font-mono"
              maxLength={8}
              autoFocus
            />
            <Button onClick={handleLogin} className="w-full">
              로그인
            </Button>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block">
            ← 지도로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // --- Authenticated Admin ---
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="icon" className="tap-safe shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold shrink-0">🛠 식당 관리</h1>
            <span className="text-xs text-muted-foreground shrink-0">({restaurants.length})</span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="shrink-0 h-8 text-xs text-muted-foreground" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
            <Button
              variant={showTips ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={async () => {
                setShowTips(!showTips);
                if (!showTips && tips.length === 0) {
                  setTipsLoading(true);
                  try {
                    const res = await adminApi(pin, "list_tips");
                    setTips(res.tips || []);
                  } catch { }
                  setTipsLoading(false);
                }
              }}
            >
              <MessageSquarePlus className="h-3.5 w-3.5 mr-1" />
              제보/피드백
              {tips.filter(t => t.status === 'pending').length > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  {tips.filter(t => t.status === 'pending').length}
                </span>
              )}
            </Button>
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={() => setEditMode(!editMode)}
            >
              <Settings2 className="h-3.5 w-3.5 mr-1" /> {editMode ? "편집 완료" : "카테고리"}
            </Button>
            <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs" onClick={() => setShowPinChange(true)}>
              <KeyRound className="h-3.5 w-3.5 mr-1" /> PIN
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={handleFetchAllImages}
              disabled={fetchingAllImages}
              title="이미지 없는 식당 사진 일괄 가져오기"
            >
              {fetchingAllImages ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Image className="h-3.5 w-3.5 mr-1" />}
              이미지
            </Button>
            <Button onClick={openNew} size="sm" className="shrink-0 h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> 추가
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Unified Category Grid - matches main screen layout */}
        <div className="border border-border rounded-lg p-3 mb-4 bg-card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {editMode ? "🔧 드래그하여 순서 변경 | 클릭하여 수정" : "카테고리 선택"}
            </h2>
            {editMode && (
              <Button size="sm" variant="outline" onClick={openNewCategory}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 새 카테고리
              </Button>
            )}
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {categories.map((cat) => {
              const isActive = adminCategory === cat.id;
              const count = categoryCount(cat.id);
              return (
                <div
                  key={cat.id}
                  draggable={editMode}
                  onDragStart={() => { dragItem.current = cat.id; }}
                  onDragEnter={() => { dragOverItem.current = cat.id; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={async () => {
                    if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) return;
                    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
                    const fromIdx = sorted.findIndex(c => c.id === dragItem.current);
                    const toIdx = sorted.findIndex(c => c.id === dragOverItem.current);
                    if (fromIdx < 0 || toIdx < 0) return;
                    const reordered = [...sorted];
                    const [moved] = reordered.splice(fromIdx, 1);
                    reordered.splice(toIdx, 0, moved);
                    const updates = reordered.map((c, i) => ({ id: c.id, sort_order: i + 1 }));
                    try {
                      await adminApi(pin, "category_reorder", { updates });
                      invalidateCategories();
                      toast({ title: "순서 변경 완료 ✅" });
                    } catch (err: any) {
                      toast({ title: "순서 변경 실패", description: err.message, variant: "destructive" });
                    }
                    dragItem.current = null;
                    dragOverItem.current = null;
                  }}
                  onClick={() => {
                    if (editMode) {
                      openEditCategory(cat);
                    } else {
                      setAdminCategory(cat.id);
                      setSearch("");
                    }
                  }}
                  className={`relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all duration-200 select-none
                    ${editMode ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/40" : "cursor-pointer"}
                    ${isActive && !editMode ? "" : ""}
                  `}
                >
                  {isActive && !editMode && (
                    <motion.div
                      layoutId="admin-category-tab"
                      className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {editMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                      className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] leading-none hover:scale-110 transition-transform"
                    >
                      ×
                    </button>
                  )}
                  <span className="relative z-10 text-xl">{cat.emoji}</span>
                  <span className={`relative z-10 text-[11px] font-medium leading-tight w-full text-center break-keep ${
                    isActive && !editMode ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {cat.label}
                  </span>
                  <span className={`relative z-10 text-[10px] leading-tight ${
                    isActive && !editMode ? "text-primary/70" : "text-muted-foreground/60"
                  }`}>
                    ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Form Modal */}
        {showCatForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-bold">{editingCat ? "카테고리 수정" : "새 카테고리 추가"}</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">카테고리 ID (DB 키) *</label>
                  <Input
                    value={catForm.id}
                    onChange={(e) => setCatForm({ ...catForm, id: e.target.value })}
                    placeholder="예: 중화요리"
                  />
                  {editingCat && editingCat.id !== catForm.id && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ ID 변경 시 해당 카테고리의 모든 식당이 자동으로 이동됩니다</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">표시 이름 *</label>
                  <Input
                    value={catForm.label}
                    onChange={(e) => setCatForm({ ...catForm, label: e.target.value })}
                    placeholder="예: 중화요리"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">이모지</label>
                    <Input
                      value={catForm.emoji}
                      onChange={(e) => setCatForm({ ...catForm, emoji: e.target.value })}
                      placeholder="🍴"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ID 접두사</label>
                    <Input
                      value={catForm.id_prefix}
                      onChange={(e) => setCatForm({ ...catForm, id_prefix: e.target.value })}
                      placeholder="예: cn"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">태그 플레이스홀더</label>
                  <Input
                    value={catForm.tag_placeholder}
                    onChange={(e) => setCatForm({ ...catForm, tag_placeholder: e.target.value })}
                    placeholder="예: 짬뽕, 탕수육, 짜장면"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">추천 태그 (쉼표 구분)</label>
                  <Textarea
                    value={catForm.tag_suggestions}
                    onChange={(e) => setCatForm({ ...catForm, tag_suggestions: e.target.value })}
                    placeholder="짜장면, 짬뽕, 탕수육"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCatForm(false)}>취소</Button>
                <Button onClick={handleSaveCategory} disabled={catSaving}>
                  {catSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {editingCat ? "수정" : "추가"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름, 주소, 태그로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* PIN Change Modal */}
        {showPinChange && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-bold">PIN 변경</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">새 PIN (4~8자리)</label>
                  <Input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    maxLength={8}
                    className="text-center tracking-[0.3em] font-mono"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">새 PIN 확인</label>
                  <Input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={8}
                    className="text-center tracking-[0.3em] font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowPinChange(false); setNewPin(""); setConfirmPin(""); }}>
                  취소
                </Button>
                <Button onClick={handleChangePin}>변경</Button>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <h2 className="text-lg font-bold">{editing ? "식당 수정" : "새 식당 추가"}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium">ID</label>
                  <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={!!editing} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">이름 *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">주소 *</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">전화번호</label>
                  <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">카테고리</label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setForm({ ...form, category: newCat, tags: [] });
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">평점</label>
                  <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">리뷰 수</label>
                  <Input type="number" min="0" value={form.review_count} onChange={(e) => setForm({ ...form, review_count: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">위도 (lat)</label>
                  <Input type="number" step="0.0001" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">경도 (lng)</label>
                  <Input type="number" step="0.0001" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">가격대</label>
                  <Input value={form.price_range ?? ""} onChange={(e) => setForm({ ...form, price_range: e.target.value })} placeholder="₩ ~ ₩₩₩" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">태그 (쉼표 구분)</label>
                  <Input
                    value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value as any })}
                    placeholder={currentTagPlaceholder}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentTagSuggestions.map((tag) => {
                      const currentTags = Array.isArray(form.tags) ? form.tags : (form.tags as string).split(",").map(t => t.trim()).filter(Boolean);
                      const isSelected = currentTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleSuggestionTag(tag)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:bg-accent"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">설명</label>
                  <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                {/* Image Upload */}
                {editing && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium">식당 사진</label>
                    <div className="mt-1.5 space-y-2">
                      {editing.image_url && (
                        <div className="relative inline-block">
                          <img
                            src={editing.image_url}
                            alt={editing.name}
                            className="w-24 h-24 rounded-lg object-cover border border-border"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await adminApi(pin, "delete_image", { restaurant_id: editing.id });
                                setEditing({ ...editing, image_url: null });
                                toast({ title: "사진 삭제 완료 ✅" });
                                fetchAll();
                              } catch (err: any) {
                                toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
                              }
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:scale-110 transition-transform"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast({ title: "파일 크기는 5MB 이하여야 합니다", variant: "destructive" });
                              return;
                            }
                            setSaving(true);
                            try {
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64 = (reader.result as string).split(",")[1];
                                const ext = file.name.split(".").pop() || "jpg";
                                const res = await adminApi(pin, "upload_image", {
                                  restaurant_id: editing.id,
                                  base64,
                                  content_type: file.type,
                                  file_ext: ext,
                                });
                                setEditing({ ...editing, image_url: res.image_url });
                                toast({ title: "사진 업로드 완료 ✅" });
                                fetchAll();
                                setSaving(false);
                              };
                              reader.readAsDataURL(file);
                            } catch (err: any) {
                              toast({ title: "업로드 실패", description: err.message, variant: "destructive" });
                              setSaving(false);
                            }
                          }}
                          className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">포털에서 검색한 식당 사진을 업로드하세요 (5MB 이하)</p>
                      </div>
                    </div>
                  </div>
                )}
                {!editing && (
                  <div className="col-span-2">
                    <p className="text-[11px] text-muted-foreground">💡 사진은 식당 추가 후 수정에서 업로드할 수 있습니다</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {editing ? "수정" : "추가"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">ID</th>
                    <th className="text-left px-3 py-2 font-medium">이름</th>
                    <th className="text-left px-3 py-2 font-medium hidden md:table-cell">주소</th>
                    <th className="text-center px-3 py-2 font-medium">평점</th>
                    <th className="text-center px-3 py-2 font-medium hidden sm:table-cell">리뷰</th>
                    <th className="text-center px-3 py-2 font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 text-muted-foreground text-xs">{r.id}</td>
                      <td className="px-3 py-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          {r.image_url ? (
                            <img src={r.image_url} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                          ) : (
                            <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs flex-shrink-0">📷</span>
                          )}
                          {r.name}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell text-xs">{r.address}</td>
                      <td className="px-3 py-2 text-center">⭐ {r.rating}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground hidden sm:table-cell">{r.review_count}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            title="Google 사진 가져오기"
                            disabled={fetchingImageId === r.id}
                            onClick={() => handleFetchImage(r.id)}
                          >
                            {fetchingImageId === r.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Image className="h-3 w-3" />
                            }
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id, r.name)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">검색 결과가 없습니다</div>
            )}
          </div>
        )}

        {/* Tips Modal */}
        {showTips && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowTips(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <MessageSquarePlus className="h-5 w-5 text-primary" />
                    제보 / 피드백
                  </h2>
                  <button onClick={() => setShowTips(false)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  {[
                    { key: "tips" as const, label: "맛집 제보", count: tips.filter(t => !String(t.category).startsWith("feedback:") && t.status === "pending").length },
                    { key: "feedback" as const, label: "앱 피드백", count: tips.filter(t => String(t.category).startsWith("feedback:") && t.status === "pending").length },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setTipsTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        tipsTab === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5">
                {tipsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tips.filter(t => tipsTab === "feedback" ? String(t.category).startsWith("feedback:") : !String(t.category).startsWith("feedback:")).length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">
                    {tipsTab === "feedback" ? "피드백이 없습니다" : "제보가 없습니다"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tips.filter(t => tipsTab === "feedback" ? String(t.category).startsWith("feedback:") : !String(t.category).startsWith("feedback:")).map((tip) => (
                      <div
                        key={tip.id}
                        className={`border rounded-xl p-4 transition-colors ${
                          tip.status === 'pending' ? 'border-primary/30 bg-primary/5' :
                          tip.status === 'approved' ? 'border-green-500/30 bg-green-500/5' :
                          'border-border bg-muted/30 opacity-60'
                        }`}
                      >
                        {(() => {
                          const isFeedback = String(tip.category).startsWith("feedback:");
                          const feedbackTypeMap: Record<string, string> = {
                            "feedback:ui": "🖥️ 화면/디자인",
                            "feedback:data": "📋 정보 오류",
                            "feedback:feature": "✨ 기능 요청",
                            "feedback:bug": "🐛 버그 신고",
                            "feedback:other": "💬 기타",
                          };
                          const categoryLabel = isFeedback
                            ? (feedbackTypeMap[tip.category] ?? "💬 피드백")
                            : tip.category;

                          return (
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-bold text-base">{tip.restaurant_name}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{categoryLabel}</span>
                                  {!isFeedback && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      tip.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                      tip.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                      {tip.status === 'pending' ? '⏳ 대기' : tip.status === 'approved' ? '✅ 승인' : '❌ 거절'}
                                    </span>
                                  )}
                                </div>
                                {tip.address && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    📍 {tip.address}
                                  </p>
                                )}
                                {tip.reason && (
                                  <p className="text-sm mt-1.5 text-foreground/80 bg-muted/50 rounded-lg p-2">
                                    {isFeedback ? "📝 " : "💬 "}{tip.reason}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground/60 mt-2">
                                  {new Date(tip.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                {!isFeedback && tip.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                      onClick={async () => {
                                        try {
                                          await adminApi(pin, "approve_tip", {
                                            tip_id: tip.id,
                                            restaurant_name: tip.restaurant_name,
                                            category: tip.category,
                                            address: tip.address,
                                            reason: tip.reason,
                                          });
                                          setTips(tips.map(t => t.id === tip.id ? { ...t, status: "approved" } : t));
                                          fetchAll();
                                          toast({
                                            title: "승인 완료 ✅",
                                            description: `"${tip.restaurant_name}"이(가) ${tip.category} 카테고리에 추가되었습니다`,
                                          });
                                        } catch (err: any) {
                                          toast({ title: "승인 실패", description: err.message, variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" /> 승인
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                      onClick={async () => {
                                        try {
                                          await adminApi(pin, "update_tip_status", { id: tip.id, status: "rejected" });
                                          setTips(tips.map(t => t.id === tip.id ? { ...t, status: "rejected" } : t));
                                          toast({ title: "거절됨" });
                                        } catch (err: any) {
                                          toast({ title: "실패", description: err.message, variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <X className="h-3.5 w-3.5 mr-1" /> 거절
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                  onClick={async () => {
                                    if (!confirm(isFeedback ? "이 피드백을 삭제하시겠습니까?" : "이 제보를 삭제하시겠습니까?")) return;
                                    try {
                                      await adminApi(pin, "delete_tip", { id: tip.id });
                                      setTips(tips.filter(t => t.id !== tip.id));
                                      toast({ title: "삭제됨" });
                                    } catch (err: any) {
                                      toast({ title: "실패", description: err.message, variant: "destructive" });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
