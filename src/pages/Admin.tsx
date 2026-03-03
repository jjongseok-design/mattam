import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, Plus, ArrowLeft, Search, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

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

const emptyForm: Omit<RestaurantRow, "id"> & { id: string } = {
  id: "",
  name: "",
  category: "중국집",
  address: "",
  phone: "",
  rating: 0,
  review_count: 0,
  lat: 37.8813,
  lng: 127.7298,
  price_range: "",
  tags: [],
  description: "",
};

const Admin = () => {
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
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
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = restaurants.filter(
    (r) =>
      r.name.includes(search) ||
      r.address.includes(search) ||
      (r.tags ?? []).some((t) => t.includes(search))
  );

  const openNew = () => {
    const nextId = `cn${String(restaurants.length + 1).padStart(2, "0")}`;
    setForm({ ...emptyForm, id: nextId });
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
      tags: typeof form.tags === "string" ? (form.tags as string).split(",").map((t) => t.trim()).filter(Boolean) : form.tags,
      description: form.description || null,
    };

    let error;
    if (editing) {
      const { error: e } = await supabase.from("restaurants").update(payload).eq("id", editing.id);
      error = e;
    } else {
      const { error: e } = await supabase.from("restaurants").insert(payload);
      error = e;
    }

    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "수정 완료" : "추가 완료" });
      setShowForm(false);
      fetchAll();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 을(를) 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "삭제 완료" });
      fetchAll();
    }
  };

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
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> 추가
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
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

        {/* Form Modal */}
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
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
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
                    placeholder="짬뽕, 탕수육, 짜장면"
                  />
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
