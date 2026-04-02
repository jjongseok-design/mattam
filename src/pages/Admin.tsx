import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Pencil, Plus, ArrowLeft, Search, Loader2, Lock, MessageSquarePlus, Check, X, Settings2, Image, MapPin, Users, Star, MessageSquare, GitMerge } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useCategories, useInvalidateCategories, type CategoryRow } from "@/hooks/useCategories";
import { useAllVisitCounts } from "@/hooks/useVisitCount";
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
  extra_images: string[] | null;
  is_recommended: boolean | null;
  needs_review?: boolean | null;
  is_hidden?: boolean | null;
}

const getEmptyForm = (category: string, lat = 37.8813, lng = 127.7298) => ({
  id: "",
  name: "",
  category,
  address: "",
  phone: "",
  rating: 0,
  review_count: 0,
  lat,
  lng,
  price_range: "",
  tags: [] as string[],
  description: "",
  is_recommended: false,
  opening_hours: "",
  closed_days: "",
});

const adminApi = async (action: string, data?: any) => {
  const { data: result, error } = await supabase.functions.invoke("admin-api", {
    body: { action, data },
  });
  if (error) {
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) throw new Error(body.error);
    } catch (inner) {
      if (inner instanceof Error) throw inner;
    }
    throw new Error(error.message);
  }
  if (!result.success) throw new Error(result.error);
  return result;
};

const Admin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cities, setCities] = useState<{ id: string; name: string; lat?: number; lng?: number }[]>([]);
  const [adminCityId, setAdminCityId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("city") ?? "chuncheon";
  });
  const { data: categories = [] } = useCategories(adminCityId);
  const invalidateCategories = useInvalidateCategories();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [form, setForm] = useState(getEmptyForm("닭갈비"));
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kakaoSearching, setKakaoSearching] = useState(false);
  const [kakaoResults, setKakaoResults] = useState<{ name: string; address: string; phone: string; lat: number | null; lng: number | null; dist?: number | null }[]>([]);
  const [showPwChange, setShowPwChange] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [adminCategory, setAdminCategory] = useState<string>("");
  const [tips, setTips] = useState<any[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsTab, setTipsTab] = useState<"tips" | "feedback">("tips");
  const [showNoImage, setShowNoImage] = useState(false);
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [fetchingNaverImageId, setFetchingNaverImageId] = useState<string | null>(null);
  const [fetchingKakaoInfoId, setFetchingKakaoInfoId] = useState<string | null>(null);
  const [fetchingAllNaverImages, setFetchingAllNaverImages] = useState(false);
  const [openingNaverPlaceId, setOpeningNaverPlaceId] = useState<string | null>(null);
  const [naverImagePicker, setNaverImagePicker] = useState<{ restaurantId: string; restaurantName: string; candidates: string[] } | null>(null);
  const [selectedNaverImages, setSelectedNaverImages] = useState<Set<string>>(new Set());
  const [savingNaverImages, setSavingNaverImages] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [savingImageUrl, setSavingImageUrl] = useState(false);
  const [dragImageIdx, setDragImageIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [dragOverMgrSlot, setDragOverMgrSlot] = useState<number | null>(null);
  const [showVisitStats, setShowVisitStats] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [imgMgr, setImgMgr] = useState<RestaurantRow | null>(null);
  const [imgPreviewIdx, setImgPreviewIdx] = useState<number | null>(null);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const { data: visitCounts, isLoading: visitCountsLoading } = useAllVisitCounts(authenticated && showVisitStats);

  // Category management state
  const [editMode, setEditMode] = useState(false);
  const [catForm, setCatForm] = useState({ id: "", label: "", emoji: "🍴", id_prefix: "", tag_placeholder: "", tag_suggestions: "" });
  const [editingCat, setEditingCat] = useState<CategoryRow | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catSaving, setCatSaving] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergingCat, setMergingCat] = useState<CategoryRow | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeSaving, setMergeSaving] = useState(false);

  // Drag and drop state
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);
  const [dragOrder, setDragOrder] = useState<typeof categories | null>(null);
  const dragOrderRef = useRef<typeof categories | null>(null); // touch용 최신 순서 참조
  const touchMovedRef = useRef(false); // tap vs drag 구분

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuthenticated(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 모든 도시 직접 조회 (필터 없음)
  useEffect(() => {
    supabase
      .from("cities" as any)
      .select("id, name, lat, lng")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCities(data as { id: string; name: string; lat?: number; lng?: number }[]);
        } else {
          setCities([{ id: "chuncheon", name: "춘천" }]);
        }
      });
  }, []);

  // 카테고리 로드 후 초기 선택 (adminCategory가 비어있거나 유효하지 않으면 첫 번째 카테고리 선택)
  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.id === adminCategory)) {
      setAdminCategory(categories[0].id);
    }
  }, [categories]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("city_id", adminCityId)
      .order("name");
    if (error) {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    } else {
      setRestaurants((data as any) ?? []);
    }
    setLoading(false);
  }, [toast, adminCityId]);

  // 로딩 스피너 없이 백그라운드 동기화 (작업 후 사용)
  const silentRefresh = useCallback(async () => {
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .eq("city_id", adminCityId)
      .order("name");
    if (data) setRestaurants(data as any);
  }, [adminCityId]);

  useEffect(() => {
    if (authenticated) fetchAll();
  }, [authenticated, fetchAll, adminCityId]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    const { data: cityRestaurants } = await supabase
      .from("restaurants")
      .select("id")
      .eq("city_id", adminCityId);
    const cityRestaurantIds = (cityRestaurants ?? []).map((r: any) => r.id);
    const { data, error } = await supabase
      .from("reviews")
      .select("id, restaurant_id, device_id, rating, comment, created_at")
      .in("restaurant_id", cityRestaurantIds.length > 0 ? cityRestaurantIds : ["__none__"])
      .order("created_at", { ascending: false });
    if (!error) setAllReviews(data ?? []);
    setReviewsLoading(false);
  }, [adminCityId]);

  const handleAdminDeleteReview = async (reviewId: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
      return;
    }
    setAllReviews((prev) => prev.filter((r) => r.id !== reviewId));
    queryClient.invalidateQueries({ queryKey: ["all-avg-ratings"] });
  };

  // ?edit=ID 파라미터 처리: restaurants 로드 후 해당 식당 편집 폼 자동 열기
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || restaurants.length === 0) return;
    const target = restaurants.find(r => r.id === editId);
    if (target) {
      openEdit(target);
      setSearchParams({}, { replace: true });
    }
  }, [restaurants, searchParams]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || loginLoading) return;
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "로그인 성공 ✅" });
    } catch (err: any) {
      toast({ title: "로그인 실패", description: err.message || "이메일 또는 비밀번호를 확인하세요", variant: "destructive" });
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    await supabase.auth.signOut();
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast({ title: "비밀번호가 일치하지 않습니다", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "비밀번호는 6자 이상이어야 합니다", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setShowPwChange(false);
      setNewPw("");
      setConfirmPw("");
      toast({ title: "비밀번호 변경 완료 ✅" });
    } catch (err: any) {
      toast({ title: "변경 실패", description: err.message, variant: "destructive" });
    }
  };

  // Filter by admin category tab + search (이미지 없음 모드는 전체 카테고리 대상)
  // adminCategory가 아직 로드 안 됐거나 유효하지 않으면 전체 표시
  const validCategory = categories.length > 0 && !!categories.find(c => c.id === adminCategory);
  const filtered = restaurants.filter((r) => {
    if (r.is_hidden) return false;
    const matchSearch =
      !search ||
      r.name.includes(search) ||
      r.address.includes(search) ||
      (r.tags ?? []).some((t) => t.includes(search));
    const matchCategory = search ? true : showNeedsReview ? (r.needs_review === true || r.opening_hours == null) : showNoImage ? !r.image_url : (!validCategory || r.category === adminCategory);
    return matchCategory && matchSearch;
  });

  const filteredHidden = restaurants.filter((r) => {
    if (!r.is_hidden) return false;
    const matchCategory = !validCategory || r.category === adminCategory;
    return matchCategory;
  });

  const categoryCount = (catId: string) => restaurants.filter((r) => r.category === catId).length;
  const categoryVisibleCount = (catId: string) => restaurants.filter((r) => r.category === catId && !r.is_hidden).length;

  const currentCat = categories.find(c => c.id === adminCategory);

  const openNew = () => {
    const prefix = currentCat?.id_prefix ?? "xx";
    const maxNum = restaurants.reduce((max, r) => {
      const m = r.id.match(new RegExp(`^${prefix}(\\d+)$`));
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 0);
    const nextId = `${prefix}${String(maxNum + 1).padStart(2, "0")}`;
    const currentCity = cities.find(c => c.id === adminCityId);
    setForm({ ...getEmptyForm(adminCategory, currentCity?.lat, currentCity?.lng), id: nextId });
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
      is_recommended: r.is_recommended ?? false,
      opening_hours: r.opening_hours ?? "",
      closed_days: r.closed_days ?? "",
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
      city_id: adminCityId,
      is_recommended: form.is_recommended ?? false,
      opening_hours: (form as any).opening_hours || null,
      closed_days: (form as any).closed_days || null,
      ...(showNeedsReview ? { needs_review: false } : {}),
    };

    try {
      if (editing) {
        // 낙관적 업데이트: API 응답 전 즉시 화면 반영
        setRestaurants(prev => prev.map(r => r.id === payload.id ? { ...r, ...payload } : r));
        setShowForm(false);
        setEditing(null);
        setSaving(false);
        toast({ title: "수정 완료 ✅" });
        try {
          await adminApi("update", payload);
          silentRefresh();
          queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] });
        } catch (err: any) {
          // 실패 시 롤백
          fetchAll();
          toast({ title: "저장 실패", description: err.message, variant: "destructive" });
        }
        return;
      } else {
        const res = await adminApi("insert", payload);
        setRestaurants(prev => [...prev, res.restaurant ?? { ...payload }]);
        toast({ title: "추가 완료 ✅" });
        setShowForm(false);
        setEditing(null);
        silentRefresh();
        queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] });
      }
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleFetchNaverImage = async (id: string) => {
    setFetchingNaverImageId(id);
    try {
      // preview_naver_images: 저장 없이 후보 URL 목록만 반환
      const res = await adminApi("preview_naver_images", { id });
      if (!res.urls || res.urls.length === 0) {
        toast({ title: "이미지 없음", description: "네이버에서 사진을 찾을 수 없습니다", variant: "destructive" });
      } else {
        setSelectedNaverImages(new Set());
        setNaverImagePicker({ restaurantId: id, restaurantName: res.name, candidates: res.urls });
      }
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    }
    setFetchingNaverImageId(null);
  };

  const handleSaveNaverImages = async () => {
    if (!naverImagePicker || selectedNaverImages.size === 0) return;
    setSavingNaverImages(true);
    try {
      const urls = [...selectedNaverImages];
      await adminApi("update", {
        id: naverImagePicker.restaurantId,
        image_url: urls[0],
        extra_images: urls.slice(1),
      });
      toast({ title: `${urls.length}장 저장 완료 ✅` });
      setNaverImagePicker(null);
      setSelectedNaverImages(new Set());
      silentRefresh();
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    }
    setSavingNaverImages(false);
  };

  const handleFetchAllNaverImages = async () => {
    if (!confirm(`"${adminCategory}" 카테고리에서 이미지가 없는 식당의 사진을 네이버 블로그에서 가져옵니다. 계속하시겠습니까?`)) return;
    setFetchingAllNaverImages(true);
    try {
      const currentCity = cities.find(c => c.id === adminCityId);
      const res = await adminApi("fetch_naver_images", { category: adminCategory, city_id: adminCityId, city_name: currentCity?.name });
      const ok = res.results?.filter((r: any) => r.success).length ?? 0;
      const fail = res.results?.filter((r: any) => !r.success).length ?? 0;
      toast({ title: `완료: ${ok}개 성공, ${fail}개 실패` });
      silentRefresh();
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    }
    setFetchingAllNaverImages(false);
  };

  const handleFetchNaverInfo = async (id: string) => {
    setFetchingKakaoInfoId(id);
    try {
      const currentCity = cities.find(c => c.id === adminCityId);
      const res = await adminApi("fetch_kakao_info", { id, city_id: adminCityId, city_name: currentCity?.name });
      if (res.success) {
        const updated = Object.keys(res.updates ?? {}).join(", ");
        toast({ title: `정보 업데이트 완료 ✅`, description: updated || "변경 없음" });
        if (res.updates && editing?.id === res.id) {
          setRestaurants(prev => prev.map(r => r.id === res.id ? { ...r, ...res.updates } : r));
        }
        silentRefresh();
      } else {
        toast({ title: "정보 없음", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    }
    setFetchingKakaoInfoId(null);
  };

  const handleNaverSearch = async () => {
    if (!form.name.trim()) return;
    setKakaoSearching(true);
    setKakaoResults([]);
    try {
      const currentCity = cities.find(c => c.id === adminCityId);
      const res = await adminApi("search_kakao_place", {
        name: form.name,
        cityName: currentCity?.name,
        cityLat: currentCity?.lat,
        cityLng: currentCity?.lng,
      });
      setKakaoResults(res.items ?? []);
    } catch (err: any) {
      toast({ title: "검색 오류", description: err.message, variant: "destructive" });
    }
    setKakaoSearching(false);
  };

  const applyNaverResult = (item: typeof kakaoResults[0]) => {
    setForm(f => ({
      ...f,
      address: item.address || f.address,
      phone: item.phone || f.phone,
      lat: item.lat ?? f.lat,
      lng: item.lng ?? f.lng,
    }));
    setKakaoResults([]);
  };

  const handleSaveImageUrl = async () => {
    if (!editing || !imageUrlInput.trim()) return;
    setSavingImageUrl(true);
    try {
      await adminApi("update", { id: editing.id, image_url: imageUrlInput.trim() });
      const newUrl = imageUrlInput.trim();
      setEditing({ ...editing, image_url: newUrl });
      setRestaurants(prev => prev.map(r => r.id === editing.id ? { ...r, image_url: newUrl } : r));
      setImageUrlInput("");
      toast({ title: "이미지 URL 저장 완료 ✅" });
      silentRefresh();
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    }
    setSavingImageUrl(false);
  };

  const handleReorderImages = async (fromIdx: number, toIdx: number) => {
    if (!editing || fromIdx === toIdx) return;
    const allImages = [
      ...(editing.image_url ? [editing.image_url] : []),
      ...(editing.extra_images ?? []),
    ];
    const reordered = [...allImages];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const newImageUrl = reordered[0] ?? null;
    const newExtraImages = reordered.slice(1);
    try {
      await adminApi("update", { id: editing.id, image_url: newImageUrl, extra_images: newExtraImages });
      setEditing({ ...editing, image_url: newImageUrl, extra_images: newExtraImages });
      setRestaurants(prev => prev.map(r => r.id === editing.id ? { ...r, image_url: newImageUrl, extra_images: newExtraImages } : r));
      toast({ title: "사진 순서 변경 완료 ✅" });
      silentRefresh();
    } catch (err: any) {
      toast({ title: "순서 변경 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setRestaurants(prev => prev.filter(r => r.id !== id));
    try {
      await adminApi("delete", { id });
      toast({ title: "삭제 완료 ✅" });
      silentRefresh();
      queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] });
    } catch (err: any) {
      toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
      fetchAll();
    }
  };

  const formCat = categories.find(c => c.id === form.category);
  const currentTagSuggestions = formCat?.tag_suggestions ?? [];
  const currentTagPlaceholder = formCat?.tag_placeholder ?? "";

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
          await adminApi("category_insert", {
            id: newId,
            city_id: adminCityId,
            label: catForm.label,
            emoji: catForm.emoji,
            id_prefix: catForm.id_prefix,
            tag_placeholder: catForm.tag_placeholder,
            tag_suggestions: tags,
            sort_order: editingCat.sort_order,
          });
          await adminApi("bulk_update_category", { old_category: oldId, new_category: newId, city_id: adminCityId });
          await adminApi("category_delete", { id: oldId, city_id: adminCityId });
        } else {
          await adminApi("category_update", {
            id: editingCat.id,
            city_id: adminCityId,
            label: catForm.label,
            emoji: catForm.emoji,
            id_prefix: catForm.id_prefix,
            tag_placeholder: catForm.tag_placeholder,
            tag_suggestions: tags,
          });
        }
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
        await adminApi("category_insert", {
          id: catForm.id.trim(),
          city_id: adminCityId,
          label: catForm.label,
          emoji: catForm.emoji,
          id_prefix: catForm.id_prefix || "xx",
          tag_placeholder: catForm.tag_placeholder,
          tag_suggestions: tags,
          sort_order: maxOrder + 1,
        });
      }
      invalidateCategories();
      silentRefresh();
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
      await adminApi("category_delete", { id: cat.id, city_id: adminCityId });
      invalidateCategories();
      toast({ title: "카테고리 삭제 완료 ✅" });
    } catch (err: any) {
      toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleMergeCategory = async () => {
    if (!mergingCat || !mergeTargetId) return;
    const targetCat = categories.find(c => c.id === mergeTargetId);
    const count = categoryCount(mergingCat.id);
    if (!confirm(`"${mergingCat.label}" 카테고리의 식당 ${count}개를 "${targetCat?.label}"으로 이동하고, "${mergingCat.label}" 카테고리를 삭제합니다. 계속할까요?`)) return;
    setMergeSaving(true);
    try {
      await adminApi("bulk_update_category", { old_category: mergingCat.id, new_category: mergeTargetId, city_id: adminCityId });
      await adminApi("category_delete", { id: mergingCat.id, city_id: adminCityId });
      invalidateCategories();
      silentRefresh();
      setShowMergeModal(false);
      setMergingCat(null);
      setMergeTargetId("");
      toast({ title: `합병 완료 ✅ (${count}개 식당 이동)` });
    } catch (err: any) {
      toast({ title: "합병 실패", description: err.message, variant: "destructive" });
    }
    setMergeSaving(false);
  };

  // --- Login Screen ---
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">관리자 로그인</h1>
            <p className="text-sm text-muted-foreground">이메일과 비밀번호를 입력하세요</p>
          </div>
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="관리자 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
            />
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full" disabled={loginLoading}>
              {loginLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
      <div
        className="border-b border-border bg-card sticky top-0 z-30"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 56px)' }}
      >
        <div className="max-w-5xl mx-auto px-4 pb-2 space-y-2">
          <div className="flex items-center gap-2 pt-2">
            <Link to={`/${adminCityId}`}>
              <Button variant="ghost" size="icon" className="tap-safe shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold shrink-0">🛠 식당 관리</h1>
            <span className="text-xs text-muted-foreground shrink-0">({restaurants.length})</span>
            <select
              value={adminCityId}
              onChange={(e) => {
                setAdminCityId(e.target.value);
                setAdminCategory(categories[0]?.id ?? "");
                setSearch("");
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs ml-1 shrink-0"
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="shrink-0 h-10 text-xs text-muted-foreground px-3" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1 pb-1">
            <Button
              variant={showTips ? "default" : "outline"}
              size="sm"
              className="h-8 text-[11px] px-2"
              onClick={async () => {
                setShowTips(!showTips);
                if (!showTips && tips.length === 0) {
                  setTipsLoading(true);
                  try {
                    const res = await adminApi("list_tips", { city_id: adminCityId });
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
              className="h-8 text-[11px] px-2"
              onClick={() => setEditMode(!editMode)}
            >
              <Settings2 className="h-3.5 w-3.5 mr-1" /> {editMode ? "편집 완료" : "카테고리"}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[11px] px-2" onClick={() => setShowPwChange(true)}>
              <Lock className="h-3.5 w-3.5 mr-1" /> 비밀번호
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px] px-2"
              onClick={handleFetchAllNaverImages}
              disabled={fetchingAllNaverImages}
              title="이미지 없는 식당 사진 일괄 가져오기 (네이버)"
            >
              {fetchingAllNaverImages ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
              이미지
            </Button>
            <Button
              variant={showVisitStats ? "default" : "outline"}
              size="sm"
              className="h-8 text-[11px] px-2"
              onClick={() => setShowVisitStats((v) => !v)}
            >
              <Users className="h-3.5 w-3.5 mr-1" /> 방문통계
            </Button>
            <Button
              variant={showReviews ? "default" : "outline"}
              size="sm"
              className="h-8 text-[11px] px-2"
              onClick={() => { setShowReviews((v) => !v); if (!showReviews) fetchReviews(); }}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> 리뷰관리
            </Button>
            {restaurants.filter(r => r.needs_review).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] px-2 text-yellow-600 border-yellow-400/60 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100"
                onClick={async () => {
                  const targets = restaurants.filter(r => r.needs_review);
                  setRestaurants(prev => prev.map(x => targets.find(t => t.id === x.id) ? { ...x, needs_review: false } : x));
                  await Promise.all(targets.map(r => adminApi("update", { id: r.id, needs_review: false })));
                  queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] });
                  toast({ title: `검토완료 처리 ✅`, description: `${targets.length}개 식당을 검토완료로 변경했습니다.` });
                }}
              >
                <span className="mr-1">✅</span> 일괄검토완료 ({restaurants.filter(r => r.needs_review).length})
              </Button>
            )}
            <Button onClick={openNew} size="sm" className="h-8 text-[11px] px-2">
              <Plus className="h-3.5 w-3.5 mr-1" /> 추가
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-3 pb-1">
        {/* Stats summary card */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{restaurants.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">전체 식당</p>
          </div>
          <button
            onClick={() => { setShowNoImage((v) => !v); setShowNeedsReview(false); setSearch(""); }}
            className={`border rounded-lg p-3 text-center transition-colors w-full ${showNoImage ? "bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700" : "bg-card border-border hover:border-orange-300"}`}
          >
            <p className="text-2xl font-bold text-orange-500">{restaurants.filter(r => !r.image_url).length}</p>
            <p className={`text-[11px] mt-0.5 ${showNoImage ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
              {showNoImage ? "▼ 이미지 없음" : "이미지 없음"}
            </p>
          </button>
          <button
            onClick={() => { setShowNeedsReview((v) => !v); setShowNoImage(false); setSearch(""); }}
            className={`border rounded-lg p-3 text-center transition-colors w-full ${showNeedsReview ? "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-700" : "bg-card border-border hover:border-yellow-300"}`}
          >
            <p className="text-2xl font-bold text-yellow-500">{restaurants.filter(r => r.needs_review === true || r.opening_hours == null).length}</p>
            <p className={`text-[11px] mt-0.5 ${showNeedsReview ? "text-yellow-600 font-semibold" : "text-muted-foreground"}`}>
              {showNeedsReview ? "▼ 검토필요 (영업시간 없음 포함)" : "검토필요 (영업시간 없음 포함)"}
            </p>
          </button>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{tips.filter(t => t.status === 'pending').length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">미처리 제보</p>
          </div>
        </div>

        {/* 리뷰 관리 패널 */}
        {showReviews && (
          <div className="bg-card border border-border rounded-lg p-3 mb-3">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary/60" />
              리뷰 관리 ({allReviews.length}개)
            </h2>
            {reviewsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : allReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">리뷰가 없습니다.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {allReviews.map((review) => {
                  const restaurant = restaurants.find((r) => r.id === review.restaurant_id);
                  return (
                    <div key={review.id} className="flex items-start gap-2 text-[12px] py-1.5 border-b border-border/30 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-medium text-foreground truncate">{restaurant?.name ?? review.restaurant_id.slice(0, 8)}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} className={`h-2.5 w-2.5 ${s <= review.rating ? "text-rating fill-current" : "text-muted-foreground/20"}`} />
                            ))}
                          </div>
                        </div>
                        {review.comment && <p className="text-muted-foreground truncate">{review.comment}</p>}
                        <p className="text-muted-foreground/50 text-[10px] mt-0.5">{review.device_id.slice(0, 8)}... · {new Date(review.created_at).toLocaleDateString("ko-KR")}</p>
                      </div>
                      <button
                        onClick={() => handleAdminDeleteReview(review.id)}
                        className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 방문 통계 패널 */}
        {showVisitStats && (
          <div className="bg-card border border-border rounded-lg p-3 mb-3">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary/60" />
              방문 통계 ({cities.find(c => c.id === adminCityId)?.name ?? adminCityId})
            </h2>
            {visitCountsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {[...restaurants]
                  .map((r) => ({
                    ...r,
                    firstVisitors: visitCounts?.firstVisitors?.[r.id] ?? 0,
                    totalVisits: visitCounts?.totalVisits?.[r.id] ?? 0,
                  }))
                  .sort((a, b) => b.totalVisits - a.totalVisits)
                  .map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-[12px] py-1 border-b border-border/30 last:border-0">
                      <span className="flex-1 truncate font-medium text-foreground">{r.name}</span>
                      <span className="text-muted-foreground shrink-0">{r.category}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-[11px]">첫방문 <span className="font-semibold text-foreground">{r.firstVisitors}명</span></span>
                        <div className="flex items-center gap-0.5">
                          <Users className="h-3 w-3 text-primary/60" />
                          <span className="font-semibold text-foreground">{r.totalVisits}회</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
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
          <div className="grid grid-cols-6 md:grid-cols-8 gap-1 sm:gap-1.5">
            {(dragOrder ?? [...categories].sort((a, b) => a.sort_order - b.sort_order)).map((cat) => {
              const isActive = adminCategory === cat.id;
              const count = categoryCount(cat.id);
              const visibleCount = categoryVisibleCount(cat.id);
              return (
                <div
                  key={cat.id}
                  data-cat-id={cat.id}
                  draggable={editMode}
                  style={editMode ? { touchAction: 'none' } : undefined}
                  onDragStart={() => {
                    dragItem.current = cat.id;
                    const ordered = [...categories].sort((a, b) => a.sort_order - b.sort_order);
                    dragOrderRef.current = ordered;
                    setDragOrder(ordered);
                  }}
                  onDragEnter={() => {
                    if (!dragItem.current || dragItem.current === cat.id) return;
                    dragOverItem.current = cat.id;
                    const base = dragOrderRef.current ?? [...categories].sort((a, b) => a.sort_order - b.sort_order);
                    const fromIdx = base.findIndex(c => c.id === dragItem.current);
                    const toIdx = base.findIndex(c => c.id === cat.id);
                    if (fromIdx < 0 || toIdx < 0) return;
                    const next = [...base];
                    const [moved] = next.splice(fromIdx, 1);
                    next.splice(toIdx, 0, moved);
                    dragOrderRef.current = next;
                    setDragOrder(next);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={async () => {
                    const finalOrder = dragOrderRef.current;
                    dragOrderRef.current = null;
                    setDragOrder(null);
                    dragItem.current = null;
                    dragOverItem.current = null;
                    if (!finalOrder) return;
                    const updates = finalOrder.map((c, i) => ({ id: c.id, sort_order: i + 1, city_id: adminCityId }));
                    const queryKey = adminCityId ? ["categories", adminCityId] : ["categories"];
                    queryClient.setQueryData(queryKey, finalOrder.map((c, i) => ({ ...c, sort_order: i + 1 })));
                    try {
                      await adminApi("category_reorder", { updates });
                      toast({ title: "순서 변경 완료 ✅" });
                    } catch (err: any) {
                      invalidateCategories();
                      toast({ title: "순서 변경 실패", description: err.message, variant: "destructive" });
                    }
                  }}
                  onTouchStart={editMode ? (e) => {
                    dragItem.current = cat.id;
                    touchMovedRef.current = false;
                    const ordered = [...categories].sort((a, b) => a.sort_order - b.sort_order);
                    dragOrderRef.current = ordered;
                    setDragOrder(ordered);
                  } : undefined}
                  onTouchMove={editMode ? (e) => {
                    if (!dragItem.current) return;
                    touchMovedRef.current = true;
                    const touch = e.touches[0];
                    const el = document.elementFromPoint(touch.clientX, touch.clientY);
                    const catEl = el?.closest('[data-cat-id]') as HTMLElement | null;
                    const overId = catEl?.dataset?.catId;
                    if (!overId || overId === dragItem.current || dragOverItem.current === overId) return;
                    dragOverItem.current = overId;
                    const base = dragOrderRef.current ?? [...categories].sort((a, b) => a.sort_order - b.sort_order);
                    const fromIdx = base.findIndex(c => c.id === dragItem.current);
                    const toIdx = base.findIndex(c => c.id === overId);
                    if (fromIdx < 0 || toIdx < 0) return;
                    const next = [...base];
                    const [moved] = next.splice(fromIdx, 1);
                    next.splice(toIdx, 0, moved);
                    dragOrderRef.current = next;
                    setDragOrder(next);
                  } : undefined}
                  onTouchEnd={editMode ? async (e) => {
                    e.preventDefault();
                    const moved = touchMovedRef.current;
                    const finalOrder = dragOrderRef.current;
                    dragItem.current = null;
                    dragOverItem.current = null;
                    touchMovedRef.current = false;
                    dragOrderRef.current = null;
                    setDragOrder(null);
                    if (!moved) {
                      openEditCategory(cat);
                      return;
                    }
                    if (!finalOrder) return;
                    const updates = finalOrder.map((c, i) => ({ id: c.id, sort_order: i + 1, city_id: adminCityId }));
                    const queryKey = adminCityId ? ["categories", adminCityId] : ["categories"];
                    queryClient.setQueryData(queryKey, finalOrder.map((c, i) => ({ ...c, sort_order: i + 1 })));
                    try {
                      await adminApi("category_reorder", { updates });
                      toast({ title: "순서 변경 완료 ✅" });
                    } catch (err: any) {
                      invalidateCategories();
                      toast({ title: "순서 변경 실패", description: err.message, variant: "destructive" });
                    }
                  } : undefined}
                  onClick={() => {
                    if (editMode) {
                      if (touchMovedRef.current) return;
                      openEditCategory(cat);
                    } else {
                      setAdminCategory(cat.id);
                      setSearch("");
                    }
                  }}
                  className={`relative flex flex-col items-center gap-px py-1 px-0.5 sm:gap-0.5 sm:py-2 sm:px-1 rounded-lg transition-all duration-200 select-none
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
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                        className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] leading-none hover:scale-110 transition-transform"
                      >
                        ×
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMergingCat(cat); setMergeTargetId(categories.filter(c => c.id !== cat.id)[0]?.id ?? ""); setShowMergeModal(true); }}
                        className="absolute -top-1 -left-1 z-20 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                        title="합병"
                      >
                        <GitMerge className="w-2.5 h-2.5" />
                      </button>
                    </>
                  )}
                  <span className="relative z-10 text-xl sm:text-4xl">{cat.emoji}</span>
                  <span className={`relative z-10 text-[10px] sm:text-[15px] font-medium leading-tight w-full text-center truncate ${
                    isActive && !editMode ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {cat.label}
                  </span>
                  <span className={`relative z-10 text-[9px] sm:text-[13px] leading-tight ${
                    isActive && !editMode ? "text-primary/70" : "text-muted-foreground/60"
                  }`}>
                    ({visibleCount}/{count})
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

        {/* Category Merge Modal */}
        {showMergeModal && mergingCat && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-blue-500" /> 카테고리 합병
              </h2>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="font-medium text-destructive">"{mergingCat.label}"</span>
                  <span className="text-muted-foreground"> 카테고리 ({categoryCount(mergingCat.id)}개 식당)를 아래 카테고리로 합칩니다. 이 카테고리는 삭제됩니다.</span>
                </div>
                <div>
                  <label className="text-sm font-medium">합칠 대상 카테고리</label>
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {categories.filter(c => c.id !== mergingCat.id).map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.label} ({categoryCount(c.id)}개)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowMergeModal(false); setMergingCat(null); setMergeTargetId(""); }}>취소</Button>
                <Button onClick={handleMergeCategory} disabled={mergeSaving || !mergeTargetId} className="bg-blue-500 hover:bg-blue-600">
                  {mergeSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <GitMerge className="h-4 w-4 mr-1" />}
                  합병하기
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

        {/* Password Change Modal */}
        {showPwChange && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-bold">비밀번호 변경</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">새 비밀번호 (6자 이상)</label>
                  <Input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">새 비밀번호 확인</label>
                  <Input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowPwChange(false); setNewPw(""); setConfirmPw(""); }}>
                  취소
                </Button>
                <Button onClick={handleChangePassword}>변경</Button>
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
                  <div className="flex gap-2">
                    <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setKakaoResults([]); }} />
                    <Button type="button" variant="outline" size="sm" className="shrink-0 h-10 text-xs px-3 gap-1" onClick={handleNaverSearch} disabled={kakaoSearching || !form.name.trim()}>
                      {kakaoSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      카카오
                    </Button>
                  </div>
                  {kakaoResults.length > 0 && (
                    <div className="mt-1 border border-border rounded-lg overflow-hidden text-xs shadow-md bg-card z-10">
                      {kakaoResults.map((item, i) => (
                        <button key={i} type="button" onClick={() => applyNaverResult(item)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b border-border/40 last:border-0 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{item.name}</span>
                            {item.dist != null && (
                              <span className="text-[10px] text-primary font-medium shrink-0">{item.dist.toFixed(1)}km</span>
                            )}
                          </div>
                          <div className="text-muted-foreground truncate">{item.address?.replace(/^[\w\uAC00-\uD7A3]+[도시]\s[\w\uAC00-\uD7A3]+[시군구]\s/, '')}</div>
                          {item.phone && <div className="text-muted-foreground">{item.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">주소 * <span className="text-[10px] text-muted-foreground font-normal">(도로명주소)</span></label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="네이버 검색으로 자동 입력 또는 직접 입력" />
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
                  <label className="text-sm font-medium">영업시간</label>
                  <Input
                    value={(form as any).opening_hours ?? ""}
                    onChange={(e) => setForm({ ...form, opening_hours: e.target.value } as any)}
                    placeholder="예: 11:00~21:00"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">휴무일</label>
                  <Input
                    value={(form as any).closed_days ?? ""}
                    onChange={(e) => setForm({ ...form, closed_days: e.target.value } as any)}
                    placeholder="예: 월요일, 주말"
                  />
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
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_recommended"
                    checked={!!(form as any).is_recommended}
                    onChange={(e) => setForm({ ...form, is_recommended: e.target.checked } as any)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="is_recommended" className="text-sm font-medium cursor-pointer">⭐ 추천 식당으로 표시</label>
                </div>
                {/* Image Upload */}
                {editing && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium">식당 사진 (최대 5장)</label>
                    <div className="mt-1.5 space-y-3">
                      {/* Gallery: image_url + extra_images + 빈 슬롯 */}
                      {(() => {
                        const allImages = [
                          ...(editing.image_url ? [editing.image_url] : []),
                          ...(editing.extra_images ?? []),
                        ];
                        const emptySlots = Math.max(0, 5 - allImages.length);

                        const handleUpload = async (file: File, slot: number) => {
                          // slot은 현재 allImages 기준 인덱스
                          if (file.size > 10 * 1024 * 1024) {
                            toast({ title: "파일 크기는 10MB 이하여야 합니다", variant: "destructive" });
                            return;
                          }
                          // 로컬 미리보기 즉시 표시
                          const localUrl = URL.createObjectURL(file);
                          const prevEditing = editing;
                          if (slot === 0) {
                            setEditing({ ...editing, image_url: localUrl });
                            setRestaurants(prev => prev.map(r => r.id === editing.id ? { ...r, image_url: localUrl } : r));
                          } else {
                            const newExtras = [...(editing.extra_images ?? [])];
                            newExtras[slot - 1] = localUrl;
                            setEditing({ ...editing, extra_images: newExtras });
                            setRestaurants(prev => prev.map(r => r.id === editing.id ? { ...r, extra_images: newExtras } : r));
                          }
                          try {
                            const base64 = await new Promise<string>((resolve, reject) => {
                              const img = new window.Image();
                              img.onload = () => {
                                const maxSize = 1200;
                                let w = img.width, h = img.height;
                                if (w > maxSize || h > maxSize) {
                                  if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                                  else { w = Math.round(w * maxSize / h); h = maxSize; }
                                }
                                const canvas = document.createElement("canvas");
                                canvas.width = w; canvas.height = h;
                                canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
                                resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
                              };
                              img.onerror = reject;
                              img.src = localUrl;
                            });
                            const res = await adminApi("upload_image", {
                              restaurant_id: editing.id,
                              base64,
                              content_type: "image/jpeg",
                              file_ext: "jpg",
                              slot,
                            });
                            if (slot === 0) {
                              setEditing(e => ({ ...e!, image_url: res.image_url }));
                              setRestaurants(prev => prev.map(r => r.id === editing.id ? { ...r, image_url: res.image_url } : r));
                            } else {
                              setEditing(e => ({ ...e!, extra_images: res.extra_images }));
                              setRestaurants(prev => prev.map(r => r.id === editing.id ? { ...r, extra_images: res.extra_images } : r));
                            }
                            toast({ title: "사진 업로드 완료 ✅" });
                            silentRefresh();
                          } catch (err: any) {
                            // 실패 시 이전 상태로 복구
                            setEditing(prevEditing);
                            setRestaurants(prev => prev.map(r => r.id === prevEditing.id ? { ...r, image_url: prevEditing.image_url, extra_images: prevEditing.extra_images } : r));
                            toast({ title: "업로드 실패", description: err.message, variant: "destructive" });
                          }
                        };

                        const handleExternalImageDrop = async (e: React.DragEvent, slot: number) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const droppedFile = e.dataTransfer.files?.[0];
                          if (droppedFile && droppedFile.type.startsWith('image/')) {
                            handleUpload(droppedFile, slot);
                            return;
                          }
                          const imageUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
                          if (imageUrl?.startsWith('http')) {
                            try {
                              const fetchRes = await fetch(imageUrl);
                              const blob = await fetchRes.blob();
                              const urlFile = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
                              handleUpload(urlFile, slot);
                            } catch {
                              toast({ title: "이미지 가져오기 실패", description: "직접 파일로 저장 후 업로드해주세요", variant: "destructive" });
                            }
                          }
                        };

                        return (
                          <div className="flex flex-wrap gap-2">
                            {allImages.map((url, idx) => (
                              <div
                                key={url}
                                draggable
                                onDragStart={() => setDragImageIdx(idx)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                                onDragEnd={() => { setDragImageIdx(null); setDragOverIdx(null); }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (dragImageIdx !== null) {
                                    handleReorderImages(dragImageIdx, idx);
                                    setDragImageIdx(null);
                                    setDragOverIdx(null);
                                  } else {
                                    setDragImageIdx(null);
                                    setDragOverIdx(null);
                                    handleExternalImageDrop(e, idx);
                                  }
                                }}
                                className={`relative group cursor-grab transition-all duration-150 ${dragImageIdx === idx ? "opacity-40 scale-95" : ""} ${dragOverIdx === idx && dragImageIdx !== idx ? "ring-2 ring-primary scale-105" : ""}`}
                              >
                                <img
                                  src={url}
                                  alt={`${editing.name} ${idx + 1}`}
                                  className="w-20 h-20 rounded-lg object-cover border border-border"
                                  draggable={false}
                                />
                                {/* 대표 배지 */}
                                {idx === 0 && (
                                  <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-tl-lg rounded-br-lg">
                                    대표
                                  </div>
                                )}
                                {/* 파일 교체 버튼 */}
                                <label
                                  className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-black/60 text-white rounded-b-lg py-0.5 cursor-pointer hover:bg-primary/80 transition-colors"
                                  title={idx === 0 ? "대표 이미지 교체 (로컬 파일)" : "이미지 교체 (로컬 파일)"}
                                >
                                  <span className="text-[9px]">교체</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, idx); e.target.value = ""; }} />
                                </label>
                                {/* 삭제 버튼 */}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const prevEditing = editing;
                                    // UI 즉시 반영
                                    if (idx === 0) {
                                      const extras = editing.extra_images ?? [];
                                      const next = extras.length > 0
                                        ? { image_url: extras[0], extra_images: extras.slice(1) }
                                        : { image_url: null, extra_images: [] };
                                      setEditing({ ...editing, ...next });
                                      setRestaurants(prev => prev.map(r => r.id === editing.id ? { ...r, ...next } : r));
                                    } else {
                                      const extras = (editing.extra_images ?? []).filter(u => u !== url);
                                      setEditing({ ...editing, extra_images: extras });
                                      setRestaurants(prev => prev.map(r => r.id === editing.id ? { ...r, extra_images: extras } : r));
                                    }
                                    try {
                                      if (idx === 0) {
                                        await adminApi("delete_image", { restaurant_id: prevEditing.id });
                                        const extras = prevEditing.extra_images ?? [];
                                        if (extras.length > 0) {
                                          await adminApi("update", { id: prevEditing.id, image_url: extras[0], extra_images: extras.slice(1) });
                                        } else {
                                          await adminApi("update", { id: prevEditing.id, image_url: null, extra_images: [] });
                                        }
                                      } else {
                                        const extras = (prevEditing.extra_images ?? []).filter(u => u !== url);
                                        await adminApi("update", { id: prevEditing.id, extra_images: extras });
                                      }
                                      toast({ title: "사진 삭제 완료 ✅" });
                                      silentRefresh();
                                    } catch (err: any) {
                                      // 실패 시 이전 상태로 복구
                                      setEditing(prevEditing);
                                      setRestaurants(prev => prev.map(r => r.id === prevEditing.id ? { ...r, image_url: prevEditing.image_url, extra_images: prevEditing.extra_images } : r));
                                      toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
                                    }
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:scale-110 transition-all"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {/* 빈 슬롯 — 클릭하면 파일 선택 */}
                            {Array.from({ length: emptySlots }).map((_, i) => {
                              const slot = allImages.length + i;
                              return (
                                <label
                                  key={`empty-${i}`}
                                  onDragOver={(e) => { e.preventDefault(); setDragOverSlot(slot); }}
                                  onDragLeave={() => setDragOverSlot(null)}
                                  onDrop={(e) => { setDragOverSlot(null); handleExternalImageDrop(e, slot); }}
                                  className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all text-muted-foreground ${dragOverSlot === slot ? 'border-primary bg-primary/10 text-primary scale-105' : 'border-border hover:border-primary hover:bg-muted/30 hover:text-primary'}`}
                                >
                                  <span className="text-2xl leading-none">+</span>
                                  <span className="text-[9px] mt-0.5">{slot === 0 ? "대표" : `추가${slot}`}</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, slot); e.target.value = ""; }} />
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}
                      {/* URL 직접 입력 */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="이미지 URL 직접 입력 (https://...)"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          className="text-xs h-10"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-10 text-xs shrink-0 px-3"
                          onClick={handleSaveImageUrl}
                          disabled={savingImageUrl || !imageUrlInput.trim()}
                        >
                          {savingImageUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "저장"}
                        </Button>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mt-1">드래그로 순서 변경 (첫 번째가 대표사진) · 교체는 파일 선택 · 10MB 이하 자동 압축</p>
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
                <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>닫기</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {editing ? "수정 저장" : "추가"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="px-1 py-1.5 text-[12px] text-muted-foreground">
            표시 <span className="font-semibold text-foreground">{filtered.length}</span> / 전체 <span className="font-semibold text-foreground">{restaurants.length}</span>
            {filteredHidden.length > 0 && <span className="ml-1.5 text-muted-foreground/60">(숨김 {filteredHidden.length})</span>}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            {/* 모바일 카드 목록 */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((r) => (
                <div key={r.id} className="px-3 py-3">
                  <div className="flex gap-3 items-start">
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <span className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0">🍽️</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">⭐ {r.rating} · 리뷰 {r.review_count}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{r.address?.replace(/^[\w\uAC00-\uD7A3]+[도시]\s[\w\uAC00-\uD7A3]+[시군구]\s/, '')}</div>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-2 overflow-x-auto scrollbar-none">
                    <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px] gap-0.5 shrink-0 text-muted-foreground hover:text-foreground" title="사진 관리" onClick={() => setImgMgr(r)}>
                      <span>🖼️</span><span>사진</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px] gap-0.5 shrink-0 text-muted-foreground hover:text-foreground" title="카카오 정보 업데이트 (전화번호·주소·좌표)" disabled={fetchingKakaoInfoId === r.id} onClick={() => handleFetchNaverInfo(r.id)}>
                      {fetchingKakaoInfoId === r.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <MapPin className="h-2.5 w-2.5" />}
                      <span>정보</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px] gap-0.5 shrink-0 text-muted-foreground hover:text-foreground" title="네이버 사진 가져오기" disabled={fetchingNaverImageId === r.id} onClick={() => handleFetchNaverImage(r.id)}>
                      {fetchingNaverImageId === r.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Search className="h-2.5 w-2.5" />}
                      <span>이미지</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px] gap-0.5 shrink-0 text-muted-foreground hover:text-foreground" disabled={openingNaverPlaceId === r.id} onClick={async () => { setOpeningNaverPlaceId(r.id); try { const res = await adminApi("search_naver_place", { name: r.name, cityName: cities.find(c => c.id === adminCityId)?.name }); const placeId = res.items?.[0]?.naverPlaceId; const url = placeId ? `https://map.naver.com/p/entry/place/${placeId}` : `https://map.naver.com/p/search/${encodeURIComponent(r.name + ' ' + (cities.find(c => c.id === adminCityId)?.name ?? ''))}`; window.open(url, 'placeWindow'); } catch { window.open(`https://map.naver.com/p/search/${encodeURIComponent(r.name)}`, 'placeWindow'); } setOpeningNaverPlaceId(null); }}>
                      {openingNaverPlaceId === r.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <span>🗺️</span>}<span>플레이스</span>
                    </Button>
                    <Button variant="outline" size="sm" title="추천 토글" className={`h-6 px-1.5 text-[10px] gap-0.5 shrink-0 ${r.is_recommended ? "text-yellow-500 border-yellow-400/60 bg-yellow-50 dark:bg-yellow-900/20" : "text-muted-foreground"}`}
                      onClick={async () => { const newVal = !r.is_recommended; setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_recommended: newVal } : x)); await adminApi("update", { id: r.id, is_recommended: newVal }); queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] }); }}>
                      <span>{r.is_recommended ? "⭐" : "☆"}</span><span>추천</span>
                    </Button>
                    <Button variant="outline" size="sm" className={`h-6 px-1.5 text-[10px] gap-0.5 shrink-0 ${r.is_hidden ? "text-red-400 border-red-300 bg-red-50 dark:bg-red-900/20" : "text-muted-foreground"}`}
                      onClick={async () => { const newVal = !r.is_hidden; setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_hidden: newVal } : x)); await adminApi("update", { id: r.id, is_hidden: newVal }); queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] }); }}>
                      <span>{r.is_hidden ? "👁️" : "🙈"}</span><span>{r.is_hidden ? "숨김" : "숨기기"}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px] gap-0.5 shrink-0 hover:text-primary hover:border-primary/40" onClick={() => openEdit(r)}>
                      <Pencil className="h-2.5 w-2.5" /><span>수정</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px] gap-0.5 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30" onClick={() => setPendingDeleteId(r.id)}>
                      <Trash2 className="h-2.5 w-2.5" /><span>삭제</span>
                    </Button>
                    {r.needs_review && (
                      <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px] gap-0.5 shrink-0 text-yellow-600 border-yellow-400/60 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100"
                        onClick={async () => { setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, needs_review: false } : x)); await adminApi("update", { id: r.id, needs_review: false }); queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] }); }}>
                        <span>✅</span><span>검토완료</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">검색 결과가 없습니다</div>
              )}
              {filteredHidden.length > 0 && (
                <div className="mt-2 border-t-2 border-dashed border-border/50">
                  <div className="px-3 py-2 text-[11px] text-muted-foreground/50 font-medium">숨긴 식당 ({filteredHidden.length})</div>
                  {filteredHidden.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2 opacity-60 border-t border-border">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 grayscale" />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0">🙈</span>
                      )}
                      <span className="flex-1 text-sm text-muted-foreground truncate">{r.name}</span>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-0.5 text-primary border-primary/30 shrink-0"
                        onClick={async () => { setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_hidden: false } : x)); await adminApi("update", { id: r.id, is_hidden: false }); queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] }); }}>
                        <span>👁️</span><span>복원</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 데스크탑 테이블 */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 700 }}>
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-medium text-sm text-muted-foreground whitespace-nowrap w-[60px]">ID</th>
                      <th className="text-left px-3 py-2.5 font-medium text-sm text-muted-foreground whitespace-nowrap w-[160px]">이름</th>
                      <th className="text-left px-3 py-2.5 font-medium text-sm text-muted-foreground whitespace-nowrap hidden md:table-cell">주소</th>

                      <th className="text-center px-3 py-2.5 font-medium text-sm text-muted-foreground whitespace-nowrap w-[280px] sticky right-0 bg-muted/50 border-l border-border">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 text-muted-foreground text-sm whitespace-nowrap max-w-[90px] overflow-hidden text-ellipsis">{r.id}</td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {r.image_url ? (
                              <img src={r.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <span className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0">🍽️</span>
                            )}
                            <div className="flex flex-col">
                              <span className="text-base">{r.name}</span>
                              <span className="text-[11px] text-muted-foreground">⭐ {r.rating} · 리뷰 {r.review_count}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell text-sm whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">{r.address?.replace(/^[\w\uAC00-\uD7A3]+[도시]\s[\w\uAC00-\uD7A3]+[시군구]\s/, '')}</td>

                        <td className="px-3 py-2.5 sticky right-0 bg-card border-l border-border">
                          <div className="flex items-center justify-center gap-0.5 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-1.5 text-[11px] gap-0.5 text-muted-foreground hover:text-foreground"
                              title="사진 관리"
                              onClick={() => setImgMgr(r)}
                            >
                              <span>🖼️</span>
                              <span>사진</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-1.5 text-[11px] gap-0.5 text-muted-foreground hover:text-foreground"
                              title="카카오 정보 업데이트 (전화번호·주소·좌표)"
                              disabled={fetchingKakaoInfoId === r.id}
                              onClick={() => handleFetchNaverInfo(r.id)}
                            >
                              {fetchingKakaoInfoId === r.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <MapPin className="h-3 w-3" />
                              }
                              <span>정보</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-1.5 text-[11px] gap-0.5 text-muted-foreground hover:text-foreground"
                              title="네이버 사진 가져오기"
                              disabled={fetchingNaverImageId === r.id}
                              onClick={() => handleFetchNaverImage(r.id)}
                            >
                              {fetchingNaverImageId === r.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Search className="h-3 w-3" />
                              }
                              <span>이미지</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-1.5 text-[11px] gap-0.5 text-muted-foreground hover:text-foreground"
                              disabled={openingNaverPlaceId === r.id}
                              onClick={async () => {
                                setOpeningNaverPlaceId(r.id);
                                try {
                                  const res = await adminApi("search_naver_place", { name: r.name, cityName: cities.find(c => c.id === adminCityId)?.name });
                                  const placeId = res.items?.[0]?.naverPlaceId;
                                  const url = placeId
                                    ? `https://map.naver.com/p/entry/place/${placeId}`
                                    : `https://map.naver.com/p/search/${encodeURIComponent(r.name + ' ' + (cities.find(c => c.id === adminCityId)?.name ?? ''))}`;
                                  window.open(url, 'placeWindow');
                                } catch {
                                  window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(r.name)}`, 'placeWindow');
                                }
                                setOpeningNaverPlaceId(null);
                              }}
                            >
                              {openingNaverPlaceId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>🗺️</span>}
                              <span>플레이스</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="추천 토글"
                              className={`h-7 px-1.5 text-[11px] gap-0.5 ${r.is_recommended ? "text-yellow-500 border-yellow-400/60 bg-yellow-50 dark:bg-yellow-900/20" : "text-muted-foreground"}`}
                              onClick={async () => {
                                const newVal = !r.is_recommended;
                                setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_recommended: newVal } : x));
                                await adminApi("update", { id: r.id, is_recommended: newVal });
                                queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] });
                              }}
                            >
                              <span>{r.is_recommended ? "⭐" : "☆"}</span>
                              <span>추천</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 px-1.5 text-[11px] gap-0.5 ${r.is_hidden ? "text-red-400 border-red-300 bg-red-50 dark:bg-red-900/20" : "text-muted-foreground"}`}
                              onClick={async () => {
                                const newVal = !r.is_hidden;
                                setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_hidden: newVal } : x));
                                await adminApi("update", { id: r.id, is_hidden: newVal });
                                queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] });
                              }}
                            >
                              <span>{r.is_hidden ? "👁️" : "🙈"}</span>
                              <span>{r.is_hidden ? "숨김" : "숨기기"}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-1.5 text-[11px] gap-0.5 hover:text-primary hover:border-primary/40"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="h-3 w-3" />
                              <span>수정</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-1.5 text-[11px] gap-0.5 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                              onClick={() => setPendingDeleteId(r.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>삭제</span>
                            </Button>
                            {r.needs_review && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-1.5 text-[11px] gap-0.5 text-yellow-600 border-yellow-400/60 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100"
                                onClick={async () => { setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, needs_review: false } : x)); await adminApi("update", { id: r.id, needs_review: false }); queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] }); }}
                              >
                                <span>✅</span>
                                <span>검토완료</span>
                              </Button>
                            )}
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
              {filteredHidden.length > 0 && (
                <div className="mt-2 border-t-2 border-dashed border-border/50">
                  <div className="px-3 py-2 text-[11px] text-muted-foreground/50 font-medium">숨긴 식당 ({filteredHidden.length})</div>
                  {filteredHidden.map((r) => (
                    <tr key={r.id} className="border-t border-border bg-muted/20 opacity-60 hover:opacity-100 transition-opacity">
                      <td className="px-3 py-2.5 text-muted-foreground text-sm">{r.id}</td>
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {r.image_url ? (
                            <img src={r.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 grayscale" />
                          ) : (
                            <span className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0">🙈</span>
                          )}
                          <span className="text-base text-muted-foreground">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell text-sm">{r.address}</td>
                      <td className="px-3 py-2.5 text-center">-</td>
                      <td className="px-3 py-2.5 text-center hidden sm:table-cell">-</td>
                      <td className="px-3 py-2.5 sticky right-0 bg-card border-l border-border">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-1.5 text-[11px] gap-0.5 text-primary border-primary/30"
                            onClick={async () => {
                              setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, is_hidden: false } : x));
                              await adminApi("update", { id: r.id, is_hidden: false });
                              queryClient.invalidateQueries({ queryKey: ["restaurants", adminCityId] });
                            }}
                          >
                            <span>👁️</span>
                            <span>복원</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 이미지 관리 팝업 */}
        {imgMgr && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={() => { setImgMgr(null); setImgPreviewIdx(null); }}>
            <div className="bg-card rounded-2xl shadow-xl p-5 w-[90vw] max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">🖼️ {imgMgr.name} 사진 관리</h2>
                <button onClick={() => { setImgMgr(null); setImgPreviewIdx(null); }} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
              </div>
              {(() => {
                const allImgs = [imgMgr.image_url, ...(imgMgr.extra_images ?? [])].filter(Boolean) as string[];
                const emptyMgrSlots = Math.max(0, 5 - allImgs.length);

                const handleMgrUpload = async (file: File, slot: number) => {
                  if (file.size > 10 * 1024 * 1024) {
                    toast({ title: "파일 크기는 10MB 이하여야 합니다", variant: "destructive" });
                    return;
                  }
                  try {
                    const localUrl = URL.createObjectURL(file);
                    const base64 = await new Promise<string>((resolve, reject) => {
                      const img = new window.Image();
                      img.onload = () => {
                        const maxSize = 1200;
                        let w = img.width, h = img.height;
                        if (w > maxSize || h > maxSize) {
                          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                          else { w = Math.round(w * maxSize / h); h = maxSize; }
                        }
                        const canvas = document.createElement("canvas");
                        canvas.width = w; canvas.height = h;
                        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
                      };
                      img.onerror = reject;
                      img.src = localUrl;
                    });
                    const res = await adminApi("upload_image", { restaurant_id: imgMgr.id, base64, content_type: "image/jpeg", file_ext: "jpg", slot });
                    const updated = { ...imgMgr, ...(slot === 0 ? { image_url: res.image_url } : { extra_images: res.extra_images }) };
                    setImgMgr(updated);
                    setRestaurants(prev => prev.map(r => r.id === imgMgr.id ? { ...r, ...(slot === 0 ? { image_url: res.image_url } : { extra_images: res.extra_images }) } : r));
                    toast({ title: "사진 업로드 완료 ✅" });
                    silentRefresh();
                    URL.revokeObjectURL(localUrl);
                  } catch (err: any) {
                    toast({ title: "업로드 실패", description: err.message, variant: "destructive" });
                  }
                };

                const handleExternalMgrDrop = async (e: React.DragEvent, slot: number) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile && droppedFile.type.startsWith('image/')) {
                    handleMgrUpload(droppedFile, slot);
                    return;
                  }
                  const imageUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
                  if (imageUrl?.startsWith('http')) {
                    try {
                      const fetchRes = await fetch(imageUrl);
                      const blob = await fetchRes.blob();
                      const urlFile = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
                      handleMgrUpload(urlFile, slot);
                    } catch {
                      toast({ title: "이미지 가져오기 실패", description: "직접 파일로 저장 후 업로드해주세요", variant: "destructive" });
                    }
                  }
                };

                return (
                  <>
                    {/* 확대 미리보기 */}
                    {allImgs.length > 0 && imgPreviewIdx !== null && (
                      <div className="mb-4 relative">
                        <img
                          src={allImgs[imgPreviewIdx]}
                          alt=""
                          className="w-full max-h-72 object-contain rounded-xl border border-border bg-muted"
                        />
                        {imgPreviewIdx > 0 && (
                          <button onClick={() => setImgPreviewIdx(imgPreviewIdx - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">‹</button>
                        )}
                        {imgPreviewIdx < allImgs.length - 1 && (
                          <button onClick={() => setImgPreviewIdx(imgPreviewIdx + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">›</button>
                        )}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
                          {imgPreviewIdx + 1} / {allImgs.length}
                        </div>
                      </div>
                    )}
                    {/* 썸네일 목록 + 빈 슬롯 */}
                    <div className="flex flex-wrap gap-3">
                      {allImgs.map((url, idx) => (
                        <div
                          key={url + idx}
                          onDragOver={(e) => { e.preventDefault(); setDragOverMgrSlot(idx); }}
                          onDragLeave={() => setDragOverMgrSlot(null)}
                          onDrop={(e) => { setDragOverMgrSlot(null); handleExternalMgrDrop(e, idx); }}
                          className={`relative group cursor-pointer transition-all ${imgPreviewIdx === idx ? "ring-2 ring-primary rounded-xl" : ""} ${dragOverMgrSlot === idx ? "ring-2 ring-primary scale-105 rounded-xl" : ""}`}
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-24 h-24 rounded-xl object-cover border border-border hover:opacity-80 transition-opacity"
                            onClick={() => setImgPreviewIdx(imgPreviewIdx === idx ? null : idx)}
                          />
                          {idx === 0 && (
                            <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-tl-xl rounded-br-xl">대표</div>
                          )}
                          <button
                            type="button"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center text-sm hover:scale-110 transition-all shadow"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                let newImgUrl = imgMgr.image_url;
                                let newExtras = [...(imgMgr.extra_images ?? [])];
                                if (idx === 0) {
                                  newImgUrl = newExtras[0] ?? null;
                                  newExtras = newExtras.slice(1);
                                } else {
                                  newExtras = newExtras.filter((_, i) => i !== idx - 1);
                                }
                                await adminApi("update", { id: imgMgr.id, image_url: newImgUrl, extra_images: newExtras.length > 0 ? newExtras : null });
                                const updated = { ...imgMgr, image_url: newImgUrl, extra_images: newExtras };
                                setImgMgr(updated);
                                setImgPreviewIdx(null);
                                setRestaurants(prev => prev.map(r => r.id === imgMgr.id ? { ...r, image_url: newImgUrl, extra_images: newExtras } : r));
                                toast({ title: "사진 삭제 완료 ✅" });
                                silentRefresh();
                              } catch (err: any) {
                                toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
                              }
                            }}
                          >✕</button>
                        </div>
                      ))}
                      {/* 빈 슬롯 — 드래그 드롭 또는 파일 선택 */}
                      {Array.from({ length: emptyMgrSlots }).map((_, i) => {
                        const slot = allImgs.length + i;
                        return (
                          <label
                            key={`mgr-empty-${i}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverMgrSlot(slot); }}
                            onDragLeave={() => setDragOverMgrSlot(null)}
                            onDrop={(e) => { setDragOverMgrSlot(null); handleExternalMgrDrop(e, slot); }}
                            className={`w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all text-muted-foreground ${dragOverMgrSlot === slot ? 'border-primary bg-primary/10 text-primary scale-105' : 'border-border hover:border-primary hover:bg-muted/30 hover:text-primary'}`}
                          >
                            <span className="text-2xl leading-none">+</span>
                            <span className="text-[9px] mt-0.5">{slot === 0 ? "대표" : `추가${slot}`}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMgrUpload(f, slot); e.target.value = ""; }} />
                          </label>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
              <div className="mt-4 text-right">
                <Button size="sm" variant="outline" onClick={() => { setImgMgr(null); setImgPreviewIdx(null); }}>닫기</Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>식당을 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                {restaurants.find(r => r.id === pendingDeleteId)?.name} - 삭제 후 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 네이버 이미지 피커 모달 */}
        {naverImagePicker && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="bg-card rounded-2xl shadow-xl p-5 w-[90vw] max-w-2xl max-h-[85vh] flex flex-col">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">{naverImagePicker.restaurantName}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    저장할 사진을 선택하세요 ({selectedNaverImages.size}장 선택됨)
                  </p>
                </div>
                <button onClick={() => { setNaverImagePicker(null); setSelectedNaverImages(new Set()); }}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* 후보 이미지 그리드 */}
              <div className="flex-1 overflow-y-auto">
                {naverImagePicker.candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">검색 결과가 없습니다</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {naverImagePicker.candidates.map((url) => {
                      const isSelected = selectedNaverImages.has(url);
                      const order = [...selectedNaverImages].indexOf(url) + 1;
                      return (
                        <div
                          key={url}
                          onClick={() => {
                            setSelectedNaverImages(prev => {
                              const next = new Set(prev);
                              if (next.has(url)) next.delete(url);
                              else if (next.size < 5) next.add(url);
                              return next;
                            });
                          }}
                          className={`relative cursor-pointer rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-transparent hover:border-primary/40"
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                              {order}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">최대 5장 선택 가능 · 첫 번째 선택이 대표 이미지</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setNaverImagePicker(null); setSelectedNaverImages(new Set()); }}>
                    취소
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedNaverImages.size === 0 || savingNaverImages}
                    onClick={handleSaveNaverImages}
                  >
                    {savingNaverImages ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    {selectedNaverImages.size}장 저장
                  </Button>
                </div>
              </div>
            </div>
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
                            <div className="flex flex-col gap-2">
                              {/* 1행: 이름 + 상태뱃지 */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm truncate flex-1 min-w-0">{tip.restaurant_name}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">{categoryLabel}</span>
                                  {!isFeedback && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                      tip.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                      tip.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                      {tip.status === 'pending' ? '⏳ 대기' : tip.status === 'approved' ? '✅ 승인' : '❌ 거절'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* 2행: 주소 + 날짜 */}
                              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                {tip.address
                                  ? <span className="truncate flex-1 min-w-0">📍 {tip.address}</span>
                                  : <span />
                                }
                                <span className="flex-shrink-0">{new Date(tip.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                              </div>
                              {/* 3행: 내용 */}
                              {tip.reason && (
                                <p className="text-xs text-foreground/80 bg-muted/50 rounded-lg px-2 py-1.5 line-clamp-2">
                                  {isFeedback ? "📝 " : "💬 "}{tip.reason}
                                </p>
                              )}
                              {/* 4행: 액션 버튼 */}
                              <div className="flex gap-1 justify-end">
                                {!isFeedback && tip.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                      onClick={async () => {
                                        try {
                                          await adminApi("approve_tip", {
                                            tip_id: tip.id,
                                            restaurant_name: tip.restaurant_name,
                                            category: tip.category,
                                            address: tip.address,
                                            reason: tip.reason,
                                            city_id: adminCityId,
                                            city_name: cities.find(c => c.id === adminCityId)?.name ?? adminCityId,
                                          });
                                          // 제보자에게 알림 생성
                                          if (tip.device_id) {
                                            await supabase.from("notifications" as any).insert({
                                              device_id: tip.device_id,
                                              message: `'${tip.restaurant_name}' 제보가 승인됐어요! 🎉`,
                                              tip_id: tip.id,
                                            });
                                          }
                                          setTips(tips.map(t => t.id === tip.id ? { ...t, status: "approved" } : t));
                                          silentRefresh();
                                          toast({
                                            title: "승인 완료 ✅",
                                            description: `"${tip.restaurant_name}"이(가) ${tip.category} 카테고리에 추가되었습니다`,
                                          });
                                        } catch (err: any) {
                                          toast({ title: "승인 실패", description: err.message, variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <Check className="h-3 w-3 mr-0.5" /> 승인
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                                      onClick={async () => {
                                        try {
                                          await adminApi("update_tip_status", { id: tip.id, status: "rejected" });
                                          setTips(tips.map(t => t.id === tip.id ? { ...t, status: "rejected" } : t));
                                          toast({ title: "거절됨" });
                                        } catch (err: any) {
                                          toast({ title: "실패", description: err.message, variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <X className="h-3 w-3 mr-0.5" /> 거절
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground"
                                  onClick={async () => {
                                    if (!confirm(isFeedback ? "이 피드백을 삭제하시겠습니까?" : "이 제보를 삭제하시겠습니까?")) return;
                                    try {
                                      await adminApi("delete_tip", { id: tip.id });
                                      setTips(tips.filter(t => t.id !== tip.id));
                                      toast({ title: "삭제됨" });
                                    } catch (err: any) {
                                      toast({ title: "실패", description: err.message, variant: "destructive" });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
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
