import { useEffect, useRef, useState, useCallback, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Restaurant } from "@/hooks/useRestaurants";
import type { City } from "@/types/city";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";

const DEFAULT_CENTER = { lat: 37.8813, lng: 127.73 };
const DEFAULT_BOUNDS_SW = { lat: 37.734, lng: 127.58 };
const DEFAULT_BOUNDS_NE = { lat: 38.02, lng: 127.92 };

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_APP_KEY as string;
const KAKAO_SCRIPT_ID = "kakao-maps-sdk";

let _kakaoReadyPromise: Promise<void> | null = null;

function ensureKakaoMapsReady(appKey: string): Promise<void> {
  if (_kakaoReadyPromise) return _kakaoReadyPromise;
  _kakaoReadyPromise = new Promise<void>((resolve, reject) => {
    if (window.kakao?.maps) { kakao.maps.load(() => resolve()); return; }
    const timer = window.setTimeout(() => { reject("카카오 SDK 타임아웃"); _kakaoReadyPromise = null; }, 10_000);
    const onLoad = () => {
      window.clearTimeout(timer);
      if (!window.kakao?.maps) { reject("카카오 SDK 초기화 실패"); _kakaoReadyPromise = null; return; }
      kakao.maps.load(() => resolve());
    };
    const onError = () => { window.clearTimeout(timer); reject("카카오 SDK 로드 실패"); _kakaoReadyPromise = null; };
    let script = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = KAKAO_SCRIPT_ID;
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
      document.head.appendChild(script);
    }
    if ((script as any).readyState === "complete" || (script as any).loaded) { onLoad(); return; }
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });
  return _kakaoReadyPromise;
}

type MapMode = "loading" | "kakao" | "leaflet";

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  visitedIds?: Set<string>;
  isDarkMode?: boolean;
  city?: City | null;
}

// Leaflet emoji 아이콘
const makeEmojiIcon = (emoji: string, isSelected: boolean, isVisited: boolean) => {
  const size = isSelected ? 40 : 32;
  const bg = isSelected ? "#f97316" : isVisited ? "#16a34a" : "#ffffff";
  const border = isSelected ? "#ea580c" : isVisited ? "#15803d" : "#e2e8f0";
  const shadow = isSelected ? "0 2px 8px rgba(249,115,22,0.5)" : "0 1px 4px rgba(0,0,0,0.2)";
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isSelected ? 20 : 16}px;box-shadow:${shadow};">${emoji}</div>`,
    className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -(size / 2) - 4],
  });
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const IMG_DEFAULT = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png";
const IMG_VISITED = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png";

const MapView = ({ restaurants, selectedId, onSelect, visitedIds = new Set(), isDarkMode = false, city }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const mapCenter = city ? { lat: city.lat, lng: city.lng } : DEFAULT_CENTER;
  const mapBoundsSW = city ? city.bounds.sw : DEFAULT_BOUNDS_SW;
  const mapBoundsNE = city ? city.bounds.ne : DEFAULT_BOUNDS_NE;
  const mapZoom = city?.zoom ?? 12;
  const cityId = city?.id ?? "";
  const cityLabel = city?.name ?? "";

  const mapBoundsSWRef = useRef(mapBoundsSW);
  const mapBoundsNERef = useRef(mapBoundsNE);
  const mapCenterRef = useRef(mapCenter);
  const mapZoomRef = useRef(mapZoom);
  useEffect(() => { mapBoundsSWRef.current = mapBoundsSW; mapBoundsNERef.current = mapBoundsNE; }, [mapBoundsSW, mapBoundsNE]);
  useEffect(() => { mapCenterRef.current = mapCenter; mapZoomRef.current = mapZoom; }, [mapCenter, mapZoom]);

  const kakaoMapRef = useRef<kakao.maps.Map | null>(null);
  const kakaoMarkersRef = useRef<kakao.maps.Marker[]>([]);
  const kakaoOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const prevSelectedIdRef = useRef<string | null>(null);

  const leafMapRef = useRef<L.Map | null>(null);
  const leafMarkersRef = useRef<L.Marker[]>([]);

  const [mode, setMode] = useState<MapMode>("loading");
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const fallbackNotified = useRef(false);

  const handleFallback = useCallback((reason: string) => {
    setFallbackReason(reason);
    setMode("leaflet");
    if (!fallbackNotified.current) {
      fallbackNotified.current = true;
      setTimeout(() => toast({ title: "🗺️ 기본 지도로 전환", description: reason }), 500);
    }
  }, [toast]);

  // ── 카카오 SDK 로드 ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    ensureKakaoMapsReady(KAKAO_APP_KEY)
      .then(() => { if (!cancelled) setMode("kakao"); })
      .catch((r: string) => { if (!cancelled) handleFallback(r); });
    return () => { cancelled = true; };
  }, [handleFallback]);

  // ── 카카오맵 최초 1회 생성 ────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "kakao" || !containerRef.current || kakaoMapRef.current) return;

    const map = new kakao.maps.Map(containerRef.current, {
      center: new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng),
      level: 7,
    });
    kakaoMapRef.current = map;

    // 도시 경계 이탈 방지 (중심 좌표 클램프)
    const clamp = () => {
      const c = map.getCenter();
      const sw = mapBoundsSWRef.current, ne = mapBoundsNERef.current;
      const lat = Math.max(sw.lat, Math.min(ne.lat, c.getLat()));
      const lng = Math.max(sw.lng, Math.min(ne.lng, c.getLng()));
      if (lat !== c.getLat() || lng !== c.getLng()) map.setCenter(new kakao.maps.LatLng(lat, lng));
    };
    kakao.maps.event.addListener(map, "dragend", clamp);

    // 줌아웃 제한: 도시 bounds에서 최대 레벨 계산 후 SDK 네이티브 메서드로 설정
    // 카카오 레벨 7 ≈ 0.15° lat 가시범위; 1레벨 오를 때마다 약 2배
    const latSpan = mapBoundsNERef.current.lat - mapBoundsSWRef.current.lat;
    const lngSpan = mapBoundsNERef.current.lng - mapBoundsSWRef.current.lng;
    const neededSpan = Math.max(latSpan, lngSpan * 0.7) * 1.5;
    const maxLevel = Math.max(7, Math.min(12, 7 + Math.ceil(Math.log2(neededSpan / 0.15))));
    (map as any).setMaxLevel(maxLevel);

    return () => { kakaoMapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── 카카오 마커 전체 재생성 ───────────────────────────────────────────────
  // restaurants 또는 selectedId 가 바뀔 때마다 마커를 완전히 지우고 다시 그린다.
  // 단순하고 확실한 방식 — 선택적 업데이트 없음.
  useEffect(() => {
    if (mode !== "kakao") return;
    const map = kakaoMapRef.current;
    if (!map) return;

    // 기존 마커/오버레이 제거
    kakaoMarkersRef.current.forEach(m => m.setMap(null));
    kakaoMarkersRef.current = [];
    kakaoOverlaysRef.current.forEach(o => o.setMap(null));
    kakaoOverlaysRef.current = [];

    const imgDefault = new kakao.maps.MarkerImage(IMG_DEFAULT, new kakao.maps.Size(24, 35));
    const imgSelected = new kakao.maps.MarkerImage(IMG_DEFAULT, new kakao.maps.Size(36, 52));
    const imgVisited = new kakao.maps.MarkerImage(IMG_VISITED, new kakao.maps.Size(24, 35));

    let selectedRestaurant: Restaurant | null = null;

    restaurants.forEach(r => {
      const isSelected = r.id === selectedId;
      const isVisited = visitedIds.has(r.id);
      const pos = new kakao.maps.LatLng(r.lat, r.lng);

      // 마커 생성 — 모두 map에 직접 추가
      const marker = new kakao.maps.Marker({
        position: pos,
        map,
        image: isSelected ? imgSelected : isVisited ? imgVisited : imgDefault,
        zIndex: isSelected ? 10 : isVisited ? 5 : 1,
      });
      kakao.maps.event.addListener(marker, "click", () => onSelect(r.id));
      kakaoMarkersRef.current.push(marker);

      if (isSelected) {
        selectedRestaurant = r;
        // 선택 팝업 오버레이
        const detailUrl = cityId ? `/${cityId}/restaurant/${r.slug}` : null;
        const visitedBadge = isVisited ? `<span style="background:#22c55e;color:#fff;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;margin-left:4px;">✓방문</span>` : "";
        const ratingEl = r.rating ? `<span style="font-size:11px;color:#f97316;margin-left:4px;">★${r.rating.toFixed(1)}</span>` : "";
        const nameEl = detailUrl
          ? `<a href="${detailUrl}" style="text-decoration:none;font-weight:700;color:#111;font-size:14px;">${r.name}</a>`
          : `<span style="font-weight:700;color:#111;font-size:14px;">${r.name}</span>`;
        const hint = detailUrl ? `<div style="font-size:11px;color:#2563eb;margin-top:4px;font-weight:500;">▶ 탭하면 상세보기</div>` : "";
        const popup = new kakao.maps.CustomOverlay({
          content: `<div style="padding:10px 14px;background:#fff;border-radius:10px;box-shadow:0 3px 12px rgba(0,0,0,0.2);min-width:150px;"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">${nameEl}${visitedBadge}${ratingEl}</div>${hint}</div>`,
          position: pos, map, yAnchor: 1.5, xAnchor: 0.5,
        });
        kakaoOverlaysRef.current.push(popup);
      } else {
        // 이름 레이블
        const bg = isVisited ? "#16a34a" : "#fff";
        const color = isVisited ? "#fff" : "#222";
        const border = isVisited ? "none" : "1px solid rgba(0,0,0,0.12)";
        const label = new kakao.maps.CustomOverlay({
          content: `<div style="background:${bg};color:${color};border:${border};border-radius:5px;padding:2px 7px;font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.15);white-space:nowrap;pointer-events:none;">${r.name}</div>`,
          position: pos, map, yAnchor: 2.8, xAnchor: 0.5,
        });
        kakaoOverlaysRef.current.push(label);
      }
    });

    // 선택된 식당이 있으면 그 위치로 지도 이동, 없고 이전에 선택했었으면 도시 기본 위치로 복귀
    if (selectedRestaurant) {
      const sel = selectedRestaurant as Restaurant;
      const targetPos = new kakao.maps.LatLng(sel.lat, sel.lng);
      if (map.getLevel() > 5) map.setLevel(5);
      map.setCenter(targetPos);
    } else if (prevSelectedIdRef.current !== null) {
      map.setLevel(7);
      map.setCenter(new kakao.maps.LatLng(mapCenterRef.current.lat, mapCenterRef.current.lng));
    }
    prevSelectedIdRef.current = selectedId;
  }, [mode, restaurants, selectedId, onSelect, visitedIds, cityId]);

  // ── Leaflet 맵 최초 생성 ──────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "leaflet" || !containerRef.current || leafMapRef.current) return;

    const bounds = L.latLngBounds(
      L.latLng(mapBoundsSW.lat, mapBoundsSW.lng),
      L.latLng(mapBoundsNE.lat, mapBoundsNE.lng)
    );
    const map = L.map(containerRef.current, {
      maxBounds: bounds, maxBoundsViscosity: 1, minZoom: 11, maxZoom: 18,
    }).setView([mapCenter.lat, mapCenter.lng] as L.LatLngExpression, mapZoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      bounds,
    }).addTo(map);
    leafMapRef.current = map;

    return () => { map.remove(); leafMapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Leaflet 마커 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "leaflet") return;
    const map = leafMapRef.current;
    if (!map) return;

    leafMarkersRef.current.forEach(m => m.remove());
    leafMarkersRef.current = [];

    restaurants.forEach(r => {
      const isSelected = r.id === selectedId;
      const isVisited = visitedIds.has(r.id);
      const emoji = CATEGORY_EMOJI[r.category] || "🍽️";
      const marker = L.marker([r.lat, r.lng], {
        icon: makeEmojiIcon(emoji, isSelected, isVisited),
        zIndexOffset: isSelected ? 1000 : isVisited ? 500 : 0,
      }).addTo(map);

      if (!isSelected) {
        marker.bindTooltip(r.name, {
          permanent: true, direction: "top", offset: [0, -38],
          className: `map-name-label${isVisited ? " map-name-label--visited" : ""}`,
        });
      }

      const detailUrl = cityId ? `/${cityId}/restaurant/${r.slug}` : null;
      const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name}${cityLabel ? ` ${cityLabel}` : ""}`)}`;
      const visitedBadge = isVisited ? `<span style="background:#22c55e;color:#fff;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;">✓방문</span>` : "";
      const nameLink = detailUrl ? `<a href="${detailUrl}" style="text-decoration:none;font-weight:700;color:#111;">${r.name}</a>` : `<span style="font-weight:700;">${r.name}</span>`;
      const hint = detailUrl
        ? `<div style="font-size:11px;color:#2563eb;margin-top:3px;font-weight:500;">▶ 탭하면 상세보기</div>`
        : `<div style="font-size:12px;opacity:.7;margin-top:3px;"><a href="${naverUrl}" target="_blank" rel="noopener">네이버지도로 이동</a></div>`;
      marker.bindPopup(
        `<div style="min-width:155px;line-height:1.4;"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:2px;">${nameLink}${visitedBadge}</div>${hint}</div>`,
        { closeButton: false, autoPan: true }
      );
      marker.on("click", () => { onSelect(r.id); marker.openPopup(); });
      if (isSelected) { marker.openPopup(); map.setView([r.lat, r.lng], 15, { animate: true }); }
      leafMarkersRef.current.push(marker);
    });

    if (!restaurants.some(r => r.id === selectedId) && prevSelectedIdRef.current !== null) {
      map.setView([mapCenterRef.current.lat, mapCenterRef.current.lng], mapZoomRef.current, { animate: true });
    }
    prevSelectedIdRef.current = selectedId;
  }, [mode, restaurants, selectedId, onSelect, visitedIds, cityLabel, cityId]);

  // ── 로딩 화면 ─────────────────────────────────────────────────────────────
  if (mode === "loading") {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs">지도 로딩중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {mode === "leaflet" && (
        <div className="absolute left-2 top-2 z-[1000] rounded-md border border-border bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">
          기본 지도로 표시 중{fallbackReason ? ` (${fallbackReason})` : ""}
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full w-full"
        style={isDarkMode ? { filter: "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)", WebkitFilter: "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)" } : undefined}
      />
    </div>
  );
};

// selectedId나 restaurants(ID 기준)가 바뀔 때만 MapView 리렌더
const arePropsEqual = (prev: MapViewProps, next: MapViewProps) => {
  if (prev.selectedId !== next.selectedId) return false;
  if (prev.isDarkMode !== next.isDarkMode) return false;
  if (prev.city !== next.city) return false;
  if (prev.onSelect !== next.onSelect) return false;
  if (prev.visitedIds !== next.visitedIds) return false;
  const a = prev.restaurants, b = next.restaurants;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].id !== b[i].id) return false;
  return true;
};

export default memo(MapView, arePropsEqual);
