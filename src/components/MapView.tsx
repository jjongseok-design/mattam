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
    const TIMEOUT = 10_000;
    const timer = window.setTimeout(() => { reject("카카오 SDK 로드 타임아웃"); _kakaoReadyPromise = null; }, TIMEOUT);
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
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
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

const makeEmojiIcon = (emoji: string, isSelected: boolean, isVisited: boolean) => {
  const size = isSelected ? 40 : 32;
  const bg = isSelected ? "#f97316" : isVisited ? "#16a34a" : "#ffffff";
  const border = isSelected ? "#ea580c" : isVisited ? "#15803d" : "#e2e8f0";
  const shadow = isSelected ? "0 2px 8px rgba(249,115,22,0.5)" : "0 1px 4px rgba(0,0,0,0.2)";
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isSelected ? 20 : 16}px;box-shadow:${shadow};transition:all .15s;">${emoji}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });
};

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// 마커 이미지 URL
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

  // refs — 이벤트 핸들러 stale 클로저 방지
  const mapCenterRef = useRef(mapCenter);
  const mapBoundsSWRef = useRef(mapBoundsSW);
  const mapBoundsNERef = useRef(mapBoundsNE);
  const restaurantsRef = useRef(restaurants);

  useEffect(() => {
    mapCenterRef.current = mapCenter;
    mapBoundsSWRef.current = mapBoundsSW;
    mapBoundsNERef.current = mapBoundsNE;
  }, [mapCenter, mapBoundsSW, mapBoundsNE]);

  useEffect(() => { restaurantsRef.current = restaurants; }, [restaurants]);

  const kakaoMapRef = useRef<kakao.maps.Map | null>(null);

  // 마커/오버레이를 ID별로 관리
  const markersRef = useRef<Map<string, kakao.maps.Marker>>(new Map());
  const nameOverlaysRef = useRef<Map<string, kakao.maps.CustomOverlay>>(new Map());
  const selectedOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  // 이전 상태 추적
  const prevIdsRef = useRef<string>("");
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
      setTimeout(() => {
        toast({ title: "🗺️ 기본 지도로 전환되었습니다", description: `카카오맵 대신 기본 지도를 표시합니다. (${reason})` });
      }, 500);
    }
  }, [toast]);

  // 카카오맵 SDK 로드
  useEffect(() => {
    let cancelled = false;
    ensureKakaoMapsReady(KAKAO_APP_KEY)
      .then(() => { if (!cancelled) setMode("kakao"); })
      .catch((reason: string) => { if (!cancelled) handleFallback(reason); });
    return () => { cancelled = true; };
  }, [handleFallback]);

  // 맵 최초 1회 생성 (mode === "kakao"일 때만)
  useEffect(() => {
    if (mode !== "kakao" || !containerRef.current || kakaoMapRef.current) return;

    const mc = mapCenterRef.current;
    const map = new kakao.maps.Map(containerRef.current, {
      center: new kakao.maps.LatLng(mc.lat, mc.lng),
      level: 7,
    });
    kakaoMapRef.current = map;

    // 도시 경계 이탈 방지
    const clampToCity = () => {
      const c = map.getCenter();
      const sw = mapBoundsSWRef.current;
      const ne = mapBoundsNERef.current;
      const lat = c.getLat(), lng = c.getLng();
      if (lat < sw.lat || lat > ne.lat || lng < sw.lng || lng > ne.lng) {
        map.setCenter(new kakao.maps.LatLng(
          Math.max(sw.lat, Math.min(ne.lat, lat)),
          Math.max(sw.lng, Math.min(ne.lng, lng))
        ));
      }
    };
    kakao.maps.event.addListener(map, "dragend", clampToCity);
    kakao.maps.event.addListener(map, "idle", clampToCity);

    return () => {
      kakaoMapRef.current = null;
    };
  }, [mode]);

  // city 변경 시만 지도 중심 이동 (원시값 비교 → 카테고리 변경 시 재실행 안 함)
  useEffect(() => {
    const map = kakaoMapRef.current;
    if (!map || mode !== "kakao") return;
    map.setCenter(new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, mapCenter.lat, mapCenter.lng]);

  // ─── 카카오 마커 이펙트 ──────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "kakao") return;
    const map = kakaoMapRef.current;
    if (!map) return;

    const defaultImage = new kakao.maps.MarkerImage(IMG_DEFAULT, new kakao.maps.Size(24, 35));
    const selectedImage = new kakao.maps.MarkerImage(IMG_DEFAULT, new kakao.maps.Size(32, 46));
    const visitedImage = new kakao.maps.MarkerImage(IMG_VISITED, new kakao.maps.Size(24, 35));

    const buildNameOverlay = (r: Restaurant, pos: kakao.maps.LatLng, isVisited: boolean) => {
      const bg = isVisited ? "#16a34a" : "white";
      const color = isVisited ? "white" : "#222";
      const border = isVisited ? "none" : "1px solid rgba(0,0,0,0.12)";
      return new kakao.maps.CustomOverlay({
        content: `<div style="background:${bg};color:${color};border:${border};border-radius:5px;padding:2px 7px;font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.18);white-space:nowrap;pointer-events:none;">${r.name}</div>`,
        position: pos, map, yAnchor: 2.8, xAnchor: 0.5,
      });
    };

    const buildSelectedOverlay = (r: Restaurant, pos: kakao.maps.LatLng, isVisited: boolean) => {
      const detailUrl = cityId ? `/${cityId}/restaurant/${r.slug}` : null;
      const visitedBadge = isVisited ? `<span style="background:#22c55e;color:white;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;margin-left:4px;">✓ 방문</span>` : "";
      const ratingEl = r.rating ? `<span style="font-size:11px;color:#f97316;margin-left:4px;">★ ${r.rating.toFixed(1)}</span>` : "";
      const nameEl = detailUrl
        ? `<a href="${detailUrl}" style="text-decoration:none;font-weight:700;color:#111;font-size:14px;">${r.name}</a>`
        : `<span style="font-weight:700;color:#111;font-size:14px;">${r.name}</span>`;
      const hint = detailUrl ? `<div style="font-size:11px;color:#2563eb;margin-top:4px;font-weight:500;">▶ 탭하면 상세보기</div>` : "";
      return new kakao.maps.CustomOverlay({
        content: `<div style="padding:10px 14px;background:white;border-radius:10px;box-shadow:0 3px 12px rgba(0,0,0,0.18);min-width:150px;"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">${nameEl}${visitedBadge}${ratingEl}</div>${hint}</div>`,
        position: pos, map, yAnchor: 1.4, xAnchor: 0.5,
      });
    };

    const currentIds = restaurants.map(r => r.id).join(",");
    const restaurantsChanged = prevIdsRef.current !== currentIds;
    const selectedChanged = prevSelectedIdRef.current !== selectedId;

    if (restaurantsChanged) {
      // ── 식당 목록 변경 시 전체 재생성 ──
      prevIdsRef.current = currentIds;

      // 기존 마커/오버레이 모두 제거
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current.clear();
      nameOverlaysRef.current.forEach(o => o.setMap(null));
      nameOverlaysRef.current.clear();
      selectedOverlayRef.current?.setMap(null);
      selectedOverlayRef.current = null;

      // 새 마커 생성 — 모두 직접 map에 추가 (클러스터러 미사용)
      restaurants.forEach(r => {
        const isSelected = r.id === selectedId;
        const isVisited = visitedIds.has(r.id);
        const pos = new kakao.maps.LatLng(r.lat, r.lng);

        const marker = new kakao.maps.Marker({
          position: pos,
          map,                // 모든 마커를 직접 map에 추가
          image: isSelected ? selectedImage : isVisited ? visitedImage : defaultImage,
          zIndex: isSelected ? 10 : isVisited ? 5 : 1,
        });
        kakao.maps.event.addListener(marker, "click", () => onSelect(r.id));
        markersRef.current.set(r.id, marker);

        if (isSelected) {
          selectedOverlayRef.current = buildSelectedOverlay(r, pos, isVisited);
        } else {
          nameOverlaysRef.current.set(r.id, buildNameOverlay(r, pos, isVisited));
        }
      });

    } else if (selectedChanged) {
      // ── selectedId만 변경 — 해당 마커 2개만 업데이트 (flash 없음) ──
      const prevSel = prevSelectedIdRef.current;

      // 이전 선택 → 일반으로 복원
      if (prevSel) {
        const m = markersRef.current.get(prevSel);
        const r = restaurants.find(x => x.id === prevSel);
        if (m && r) {
          const isVisited = visitedIds.has(prevSel);
          m.setImage(isVisited ? visitedImage : defaultImage);
          m.setZIndex(isVisited ? 5 : 1);
          nameOverlaysRef.current.get(prevSel)?.setMap(null);
          nameOverlaysRef.current.set(prevSel, buildNameOverlay(r, m.getPosition(), isVisited));
        }
        selectedOverlayRef.current?.setMap(null);
        selectedOverlayRef.current = null;
      }

      // 새 선택 → 선택 상태로 변경
      if (selectedId) {
        const m = markersRef.current.get(selectedId);
        const r = restaurants.find(x => x.id === selectedId);
        if (m && r) {
          const isVisited = visitedIds.has(selectedId);
          m.setImage(selectedImage);
          m.setZIndex(10);
          nameOverlaysRef.current.get(selectedId)?.setMap(null);
          nameOverlaysRef.current.delete(selectedId);
          selectedOverlayRef.current = buildSelectedOverlay(r, m.getPosition(), isVisited);
        }
      }
    }

    prevSelectedIdRef.current = selectedId;
  }, [mode, restaurants, selectedId, onSelect, visitedIds, cityId]);

  // 카드 클릭 시 선택된 식당으로 지도 중앙 이동
  useEffect(() => {
    if (!selectedId || mode !== "kakao") return;
    const map = kakaoMapRef.current;
    if (!map) return;
    const r = restaurantsRef.current.find(x => x.id === selectedId);
    if (!r) return;
    if (map.getLevel() > 5) map.setLevel(5, { animate: true });
    map.panTo(new kakao.maps.LatLng(r.lat, r.lng));
  }, [mode, selectedId]);

  // ─── Leaflet 이펙트 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "leaflet" || !containerRef.current || leafMapRef.current) return;

    const cityBounds = L.latLngBounds(
      L.latLng(mapBoundsSW.lat, mapBoundsSW.lng),
      L.latLng(mapBoundsNE.lat, mapBoundsNE.lng)
    );
    const map = L.map(containerRef.current, {
      maxBounds: cityBounds, maxBoundsViscosity: 1, minZoom: 11, maxZoom: 18,
    }).setView([mapCenter.lat, mapCenter.lng] as L.LatLngExpression, mapZoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      bounds: cityBounds,
    }).addTo(map);
    leafMapRef.current = map;

    return () => { map.remove(); leafMapRef.current = null; };
  }, [mode]);

  useEffect(() => {
    if (mode !== "leaflet") return;
    const map = leafMapRef.current;
    if (!map) return;

    leafMarkersRef.current.forEach(m => m.remove());
    leafMarkersRef.current = [];

    restaurants.forEach(r => {
      const isSelected = r.id === selectedId;
      const isVisited = visitedIds.has(r.id);
      const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name}${cityLabel ? ` ${cityLabel}` : ""}`)}`;
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
      const visitedBadge = isVisited ? `<span style="background:#22c55e;color:white;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;">✓ 방문완료</span>` : "";
      const nameLink = detailUrl
        ? `<a href="${detailUrl}" style="text-decoration:none;font-weight:700;color:#111;">${r.name}</a>`
        : `<span style="font-weight:700;">${r.name}</span>`;
      const hint = detailUrl
        ? `<div style="font-size:11px;color:#2563eb;margin-top:3px;font-weight:500;">▶ 탭하면 상세보기</div>`
        : `<div style="font-size:12px;opacity:.7;margin-top:3px;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer">네이버지도로 이동</a></div>`;
      marker.bindPopup(
        `<div style="min-width:160px;line-height:1.4;"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:2px;">${nameLink}${visitedBadge}</div>${hint}</div>`,
        { closeButton: false, autoPan: true }
      );
      marker.on("click", () => { onSelect(r.id); marker.openPopup(); });
      if (isSelected) { marker.openPopup(); map.setView([r.lat, r.lng], 15, { animate: true }); }
      leafMarkersRef.current.push(marker);
    });
  }, [mode, restaurants, selectedId, onSelect, visitedIds, cityLabel, cityId]);

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

const arePropsEqual = (prev: MapViewProps, next: MapViewProps) => {
  if (prev.selectedId !== next.selectedId) return false;
  if (prev.visitedIds !== next.visitedIds) return false;
  if (prev.isDarkMode !== next.isDarkMode) return false;
  if (prev.city !== next.city) return false;
  if (prev.onSelect !== next.onSelect) return false;
  const a = prev.restaurants, b = next.restaurants;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].id !== b[i].id) return false;
  return true;
};

export default memo(MapView, arePropsEqual);
