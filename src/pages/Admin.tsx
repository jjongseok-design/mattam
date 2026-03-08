import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, Plus, ArrowLeft, Search, Loader2, Lock, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { CATEGORIES, type CategoryId } from "@/components/CategoryTabs";
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
}

const CATEGORY_TAG_SUGGESTIONS: Record<string, { placeholder: string; suggestions: string[]; idPrefix: string }> = {
  "중국집": {
    placeholder: "짬뽕, 탕수육, 짜장면",
    suggestions: ["짜장면", "짬뽕", "탕수육", "볶음밥", "군만두", "간짜장", "울면", "마라탕", "코스요리", "해물짬뽕"],
    idPrefix: "cn",
  },
  "갈비탕": {
    placeholder: "갈비탕, 소갈비탕, 한식",
    suggestions: ["갈비탕", "소갈비탕", "왕갈비탕", "설렁탕", "도가니탕", "한식", "수육", "갈비찜"],
    idPrefix: "gb",
  },
  "삼계탕": {
    placeholder: "삼계탕, 한방삼계탕, 옻닭",
    suggestions: ["삼계탕", "한방삼계탕", "옻닭", "백숙", "녹두삼계탕", "전복삼계탕", "인삼주", "수정과"],
    idPrefix: "sg",
  },
  "칼국수": {
    placeholder: "칼국수, 손칼국수, 샤브샤브",
    suggestions: ["칼국수", "손칼국수", "샤브샤브", "바지락칼국수", "해물칼국수", "수제비", "만두", "들깨칼국수"],
    idPrefix: "kk",
  },
  "수제버거": {
    placeholder: "수제버거, 치즈버거, 감자튀김",
    suggestions: ["수제버거", "치즈버거", "베이컨버거", "감자튀김", "어니언링", "쉐이크", "핫도그", "치킨버거"],
    idPrefix: "bg",
  },
  "삼겹살": {
    placeholder: "삼겹살, 목살, 구이",
    suggestions: ["삼겹살", "목살", "항정살", "껍데기", "냉삼", "숯불구이", "된장찌개", "파김치", "미나리"],
    idPrefix: "sp",
  },
  "초밥": {
    placeholder: "초밥, 사시미, 오마카세",
    suggestions: ["초밥", "사시미", "연어초밥", "광어초밥", "오마카세", "모듬초밥", "우동", "미소시루"],
    idPrefix: "sb",
  },
  "일식": {
    placeholder: "라멘, 돈카츠, 우동",
    suggestions: ["라멘", "돈카츠", "우동", "소바", "텐동", "카레", "규동", "타코야끼", "오코노미야끼"],
    idPrefix: "jp",
  },
  "감자탕": {
    placeholder: "감자탕, 뼈해장국, 등뼈찜",
    suggestions: ["감자탕", "뼈해장국", "등뼈찜", "해장국", "수육", "볶음밥", "우거지탕"],
    idPrefix: "gj",
  },
  "한우": {
    placeholder: "한우, 등심, 안심",
    suggestions: ["한우", "등심", "안심", "채끝", "꽃등심", "육회", "한우국밥", "불고기"],
    idPrefix: "hw",
  },
  "돼지갈비": {
    placeholder: "돼지갈비, 양념갈비, 생갈비",
    suggestions: ["돼지갈비", "양념갈비", "생갈비", "갈비찜", "냉면", "된장찌개", "공기밥"],
    idPrefix: "dg",
  },
  "이탈리안": {
    placeholder: "파스타, 피자, 리조또",
    suggestions: ["파스타", "피자", "화덕피자", "리조또", "스테이크", "샐러드", "크림파스타", "알리오올리오", "마르게리타"],
    idPrefix: "it",
  },
  "베이커리": {
    placeholder: "크루아상, 앙버터, 식빵",
    suggestions: ["크루아상", "앙버터", "소금빵", "식빵", "케이크", "마카롱", "보리빵", "맘모스빵", "타르트"],
    idPrefix: "bk",
  },
  "설렁탕/곰탕": {
    placeholder: "설렁탕, 곰탕, 도가니탕",
    suggestions: ["설렁탕", "곰탕", "도가니탕", "소꼬리탕", "사골국", "수육", "선지국"],
    idPrefix: "sg2",
  },
  "보쌈/족발": {
    placeholder: "보쌈, 족발, 수육",
    suggestions: ["보쌈", "족발", "수육", "막국수", "냉채족발", "마늘보쌈", "쟁반국수"],
    idPrefix: "bj",
  },
};

const getEmptyForm = (category: CategoryId) => ({
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
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [form, setForm] = useState(getEmptyForm("중국집"));
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [adminCategory, setAdminCategory] = useState<CategoryId>("중국집");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pin");
    if (saved) {
      setPin(saved);
      setAuthenticated(true);
    }
  }, []);

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

  const handleLogin = async () => {
    if (!pinInput.trim()) return;
    try {
      await adminApi(pinInput, "verify");
      setPin(pinInput);
      setAuthenticated(true);
      sessionStorage.setItem("admin_pin", pinInput);
      toast({ title: "로그인 성공 ✅" });
    } catch {
      toast({ title: "PIN이 틀렸습니다", variant: "destructive" });
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

  const openNew = () => {
    const prefix = (CATEGORY_TAG_SUGGESTIONS[adminCategory]?.idPrefix) ?? "xx";
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
      category: r.category as CategoryId,
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

  const currentTagConfig = CATEGORY_TAG_SUGGESTIONS[form.category] ?? CATEGORY_TAG_SUGGESTIONS["중국집"];

  const toggleSuggestionTag = (tag: string) => {
    const currentTags = Array.isArray(form.tags) ? form.tags : (form.tags as string).split(",").map(t => t.trim()).filter(Boolean);
    if (currentTags.includes(tag)) {
      setForm({ ...form, tags: currentTags.filter(t => t !== tag) });
    } else {
      setForm({ ...form, tags: [...currentTags, tag] });
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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">🛠 식당 관리</h1>
            <span className="text-sm text-muted-foreground">{restaurants.length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPinChange(true)}>
              <KeyRound className="h-3.5 w-3.5 mr-1" /> PIN 변경
            </Button>
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-1" /> 추가
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Admin Category Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4 overflow-x-auto scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setAdminCategory(cat.id); setSearch(""); }}
              className="relative flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
            >
              {adminCategory === cat.id && (
                <motion.div
                  layoutId="admin-category-tab"
                  className="absolute inset-0 bg-background rounded-md shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 flex items-center justify-center gap-1.5 ${adminCategory === cat.id ? "text-foreground" : "text-muted-foreground"}`}>
                {cat.label}
                <span className="text-xs opacity-70">({categoryCount(cat.id)})</span>
              </span>
            </button>
          ))}
        </div>

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
                      setForm({ ...form, category: newCat as CategoryId, tags: [] });
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {CATEGORIES.map((cat) => (
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
                    placeholder={currentTagConfig.placeholder}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentTagConfig.suggestions.map((tag) => {
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
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell text-xs">{r.address}</td>
                      <td className="px-3 py-2 text-center">⭐ {r.rating}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground hidden sm:table-cell">{r.review_count}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
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
      </div>
    </div>
  );
};

export default Admin;
