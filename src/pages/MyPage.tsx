import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Heart, Clock, Star, User, MapPin, Utensils } from "lucide-react";
import { useVisited } from "@/hooks/useVisited";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useRestaurants } from "@/hooks/useRestaurants";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";

const MyPage = () => {
  const { cityId } = useParams<{ cityId: string }>();
  const { data: restaurants = [] } = useRestaurants(cityId);
  const { visited, isVisited } = useVisited();
  const { isFavorite } = useFavorites();
  const { recentIds } = useRecentlyViewed();

  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem("mattam_nickname") || ""; } catch { return ""; }
  });
  const [editing, setEditing] = useState(false);
  const [tempNickname, setTempNickname] = useState(nickname);

  const saveNickname = () => {
    try { localStorage.setItem("mattam_nickname", tempNickname); } catch {}
    setNickname(tempNickname);
    setEditing(false);
  };

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("tab") === "favorites") {
      setTimeout(() => {
        document.getElementById("favorites-section")?.scrollIntoView({ behavior: "smooth" });
      }, 600);
    }
  }, [searchParams]);

  const deviceId = (() => {
    try { return localStorage.getItem("mattam_device_id") || ""; } catch { return ""; }
  })();

  const [myTips, setMyTips] = useState<any[]>([]);
  useEffect(() => {
    if (!deviceId) return;
    supabase.from("tips" as any)
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMyTips(data ?? []));
  }, [deviceId]);

  const favoriteRestaurants = restaurants.filter((r) => isFavorite(r.id));
  const visitedRestaurants = restaurants.filter((r) => isVisited(r.id));
  const recentRestaurants = recentIds
    .map((id) => restaurants.find((r) => r.id === id))
    .filter(Boolean)
    .slice(0, 10) as typeof restaurants;

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-card/90 border-b border-border/30 px-4 py-3 flex items-center gap-3"
        style={{ backdropFilter: "blur(16px)" }}>
        <Link to={`/${cityId}`} className="w-8 h-8 rounded-lg flex items-center justify-center glass">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <h1 className="text-[15px] font-bold">내 정보</h1>
      </div>

      <div className="px-4 py-5 space-y-6 pb-32">
        {/* 닉네임 */}
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="flex gap-2">
                  <input
                    value={tempNickname}
                    onChange={(e) => setTempNickname(e.target.value)}
                    placeholder="닉네임 입력"
                    maxLength={20}
                    className="flex-1 text-sm border border-input rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                  <button onClick={saveNickname} className="text-sm font-semibold text-primary px-3">저장</button>
                  <button onClick={() => setEditing(false)} className="text-sm text-muted-foreground px-2">취소</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px]">{nickname || "닉네임 없음"}</span>
                  <button onClick={() => { setTempNickname(nickname); setEditing(true); }}
                    className="text-[11px] text-primary/70 border border-primary/20 rounded-full px-2 py-0.5">
                    수정
                  </button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                방문 {visited.length}곳 · 즐겨찾기 {favoriteRestaurants.length}곳
              </p>
            </div>
          </div>
        </div>

        {/* 즐겨찾기 */}
        <section id="favorites-section">
          <h2 className="text-[13px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5" /> 즐겨찾기 ({favoriteRestaurants.length})
          </h2>
          {favoriteRestaurants.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60 py-4 text-center">즐겨찾기한 맛집이 없어요</p>
          ) : (
            <div className="space-y-2">
              {favoriteRestaurants.map((r) => (
                <Link key={r.id} to={`/${cityId}/restaurant/${r.slug || r.id}`}
                  className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/30 active:scale-[0.98] transition-transform">
                  <span className="text-xl">{CATEGORY_EMOJI[r.category] ?? "🍽️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 방문한 곳 */}
        <section>
          <h2 className="text-[13px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> 방문한 곳 ({visitedRestaurants.length})
          </h2>
          {visitedRestaurants.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60 py-4 text-center">방문한 맛집이 없어요</p>
          ) : (
            <div className="space-y-2">
              {visitedRestaurants.map((r) => (
                <Link key={r.id} to={`/${cityId}/restaurant/${r.slug || r.id}`}
                  className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/30 active:scale-[0.98] transition-transform">
                  <span className="text-xl">{CATEGORY_EMOJI[r.category] ?? "🍽️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 내 제보 목록 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📮</span>
            <h2 className="text-[13px] font-semibold">내 제보</h2>
            <span className="text-[11px] text-muted-foreground">{myTips.length}건</span>
          </div>
          {myTips.length === 0 ? (
            <p className="text-[12px] text-muted-foreground/50 px-1">아직 제보한 맛집이 없어요</p>
          ) : (
            <div className="space-y-2">
              {myTips.map((tip) => (
                <div key={tip.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/30">
                  {tip.image_url ? (
                    <img src={tip.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-xl">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{tip.restaurant_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{tip.address || tip.category}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    tip.status === "approved" ? "bg-emerald-100 text-emerald-600" :
                    tip.status === "rejected" ? "bg-red-100 text-red-500" :
                    "bg-yellow-100 text-yellow-600"
                  }`}>
                    {tip.status === "approved" ? "등록완료" : tip.status === "rejected" ? "미등록" : "검토중"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 본 곳 */}
        <section>
          <h2 className="text-[13px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> 최근 본 곳
          </h2>
          {recentRestaurants.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60 py-4 text-center">최근 본 맛집이 없어요</p>
          ) : (
            <div className="space-y-2">
              {recentRestaurants.map((r) => (
                <Link key={r.id} to={`/${cityId}/restaurant/${r.slug || r.id}`}
                  className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/30 active:scale-[0.98] transition-transform">
                  <span className="text-xl">{CATEGORY_EMOJI[r.category] ?? "🍽️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 하단 탭바 */}
      <div className="fixed bottom-0 left-0 right-0 z-[1400] bg-card/95 border-t border-border/30"
        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around px-4 h-16">
          <Link to={`/${cityId}`} className="flex flex-col items-center gap-[3px] text-muted-foreground/60 hover:text-foreground transition-colors">
            <MapPin className="h-[22px] w-[22px]" strokeWidth={1.8} />
            <span className="text-[10px] font-medium tracking-tight">지도</span>
          </Link>
          <Link to={`/${cityId}`} className="flex flex-col items-center gap-[3px] text-muted-foreground/60 hover:text-foreground transition-colors">
            <Utensils className="h-[22px] w-[22px]" strokeWidth={1.8} />
            <span className="text-[10px] font-medium tracking-tight">목록</span>
          </Link>
          <button className="w-14 h-14 -mt-6 rounded-full bg-primary shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            <span className="text-white text-[28px] font-light leading-none">+</span>
          </button>
          <Link to={`/${cityId}`} className="flex flex-col items-center gap-[3px] text-muted-foreground/60 hover:text-foreground transition-colors">
            <Heart className="h-[22px] w-[22px]" strokeWidth={1.8} />
            <span className="text-[10px] font-medium tracking-tight">찜</span>
          </Link>
          <Link to={`/${cityId}/mypage`} className="flex flex-col items-center gap-[3px] text-primary transition-colors">
            <User className="h-[22px] w-[22px]" strokeWidth={1.8} />
            <span className="text-[10px] font-medium tracking-tight">내정보</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
