import { useEffect, useRef, useState, useCallback, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Restaurant } from "@/hooks/useRestaurants";
import type { City } from "@/types/city";
import { useToast } from "@/hooks/use-toast";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";

// Defaults (Chuncheon) — overridden by city prop when available
const DEFAULT_CENTER = { lat: 37.8813, lng: 127.73 };
const DEFAULT_BOUNDS_SW = { lat: 37.734, lng: 127.58 };
const DEFAULT_BOUNDS_NE = { lat: 38.02, lng: 127.92 };

const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_APP_KEY as string;
const KAKAO_SCRIPT_ID = "kakao-maps-sdk";

// 모듈 레벨 싱글톤
let _kakaoReadyPromise: Promise<void> | null = null;

function ensureKakaoMapsReady(appKey: string): Promise<void> {
  if (_kakaoReadyPromise) return _kakaoReadyPromise;
  _kakaoReadyPromise = new Promise<void>((resolve, reject) => {
    if (window.kakao?.maps) {
      kakao.maps.load(() => resolve());
      return;
    }
    const TIMEOUT = 10_000;
    const timer = window.setTimeout(() => {
      reject("카카오 SDK 로드 타임아웃");
      _kakaoReadyPromise = null;
    }, TIMEOUT);

    const onLoad = () => {
      window.clearTimeout(timer);
      if (!window.kakao?.maps) {
        reject("카카오 SDK 초기화 실패");
        _kakaoReadyPromise = null;
        return;
      }
      kakao.maps.load(() => resolve());
    };
    const onError = () => {
      window.clearTimeout(timer);
      reject("카카오 SDK 로드 실패");
      _kakaoReadyPromise = null;
    };

    let script = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = KAKAO_SCRIPT_ID;
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
      document.head.appendChild(script);
    }
    if ((script as any).readyState === "complete" || (script as any).loaded) {
      onLoad();
      return;
    }
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

const leafDefaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const leafVisitedIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: "visited-marker",
});

const leafSelectedIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [1, -40],
  className: "selected-marker",
});

const MapView = ({ restaurants, selectedId, onSelect, visitedIds = new Set(), isDarkMode = false, city }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const mapCenter = city ? { lat: city.lat, lng: city.lng } : DEFAULT_CENTER;
  const mapBoundsSW = city ? city.bounds.sw : DEFAULT_BOUNDS_SW;
  const mapBoundsNE = city ? city.bounds.ne : DEFAULT_BOUNDS_NE;
  const mapZoom = city?.zoom ?? 12;
  const cityLabel = city?.name ?? "";

  const kakaoMapRef = useRef<kakao.maps.Map | null>(null);
  const kakaoClustererRef = useRef<any>(null);

  // 마커 및 오버레이를 ID별로 추적 (선택 변경 시 전체 rebuild 없이 선택적 업데이트)
  const kakaoMarkersMapRef = useRef<Map<string, kakao.maps.Marker>>(new Map());
  const kakaoNameOverlaysMapRef = useRef<Map<string, kakao.maps.CustomOverlay>>(new Map());
  const kakaoSelectedOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  // 이전 상태 추적
  const prevRestaurantIdsRef = useRef<string>("");
  const prevSelectedIdRef = useRef<string | null>(null);

  // city props를 ref로 유지 — 이벤트 핸들러 stale 클로저 방지
  const mapCenterRef = useRef(mapCenter);
  const mapBoundsSWRef = useRef(mapBoundsSW);
  const mapBoundsNERef = useRef(mapBoundsNE);

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
        toast({
          title: "🗺️ 기본 지도로 전환되었습니다",
          description: `카카오맵 대신 기본 지도를 표시합니다. (${reason})`,
        });
      }, 500);
    }
  }, [toast]);

  // city 변경 시 ref 동기화
  useEffect(() => {
    mapCenterRef.current = mapCenter;
    mapBoundsSWRef.current = mapBoundsSW;
    mapBoundsNERef.current = mapBoundsNE;
  }, [mapCenter, mapBoundsSW, mapBoundsNE]);

  // city 변경 시에만 맵 중심 업데이트 — 원시값(primitive) 비교로 불필요한 재실행 방지
  useEffect(() => {
    const map = kakaoMapRef.current;
    if (!map || mode !== "kakao") return;
    map.setCenter(new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, mapCenter.lat, mapCenter.lng]); // 객체 참조가 아닌 값 비교 — 카테고리 변경 시 재실행 방지

  useEffect(() => {
    let cancelled = false;

    ensureKakaoMapsReady(KAKAO_APP_KEY)
      .then(() => {
        if (!cancelled) setMode("kakao");
      })
      .catch((reason: string) => {
        if (!cancelled) handleFallback(reason);
      });

    return () => { cancelled = true; };
  }, [handleFallback]);

  // 맵은 mode가 "kakao"가 된 후 딱 한 번만 생성
  useEffect(() => {
    if (mode !== "kakao" || !containerRef.current || kakaoMapRef.current) return;

    const mc = mapCenterRef.current;
    const center = new kakao.maps.LatLng(mc.lat, mc.lng);
    const map = new kakao.maps.Map(containerRef.current, { center, level: 7 });
    kakaoMapRef.current = map;

    // 지도 이동 시 도시 경계 안으로 clamping
    const clampToCity = () => {
      const c = (map as any).getCenter();
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

    // 줌 레벨 제한만 적용 (중심 리셋 제거 — 사용자가 이동한 위치 유지)
    kakao.maps.event.addListener(map, "zoom_changed", () => {
      const level = map.getLevel();
      if (level > 10) map.setLevel(10);
    });

    // 클러스터러: minLevel 10 — 레벨 7(기본)에서 개별 마커 표시
    if ((window as any).kakao?.maps?.MarkerClusterer) {
      kakaoClustererRef.current = new (kakao.maps as any).MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 10,
        disableClickZoom: false,
        styles: [{
          width: "44px", height: "44px",
          background: "rgba(59, 130, 246, 0.85)",
          borderRadius: "50%",
          color: "#fff",
          textAlign: "center",
          fontWeight: "700",
          lineHeight: "44px",
          fontSize: "14px",
          border: "2px solid rgba(255,255,255,0.6)",
        }],
      });
    }

    return () => {
      kakaoMapRef.current = null;
      kakaoClustererRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "leaflet" || !containerRef.current || leafMapRef.current) return;

    const cityBounds = L.latLngBounds(
      L.latLng(mapBoundsSW.lat, mapBoundsSW.lng),
      L.latLng(mapBoundsNE.lat, mapBoundsNE.lng)
    );
    const map = L.map(containerRef.current, {
      maxBounds: cityBounds,
      maxBoundsViscosity: 1,
      minZoom: 11,
      maxZoom: 18,
    }).setView([mapCenter.lat, mapCenter.lng] as L.LatLngExpression, mapZoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      bounds: cityBounds,
    }).addTo(map);

    leafMapRef.current = map;

    return () => {
      map.remove();
      leafMapRef.current = null;
    };
  }, [mode]);

  // 카카오 마커 이펙트 — 식당 목록 변경 시 전체 재생성, selectedId만 변경 시 선택적 업데이트
  useEffect(() => {
    if (mode !== "kakao") return;
    const map = kakaoMapRef.current;
    if (!map) return;

    const currentIds = restaurants.map(r => r.id).join(",");
    const restaurantsChanged = prevRestaurantIdsRef.current !== currentIds;
    const selectedChanged = prevSelectedIdRef.current !== selectedId;

    const defaultImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new kakao.maps.Size(24, 35)
    );
    const selectedImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new kakao.maps.Size(32, 46)
    );
    const visitedImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png",
      new kakao.maps.Size(24, 35)
    );

    const buildNameOverlay = (r: Restaurant, position: kakao.maps.LatLng, isVisited: boolean) => {
      const labelBg = isVisited ? "#16a34a" : "white";
      const labelColor = isVisited ? "white" : "#222";
      const labelBorder = isVisited ? "none" : "1px solid rgba(0,0,0,0.12)";
      const labelContent = `<div style="background:${labelBg};color:${labelColor};border:${labelBorder};border-radius:5px;padding:2px 7px;font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.18);white-space:nowrap;pointer-events:none;">${r.name}</div>`;
      return new kakao.maps.CustomOverlay({
        content: labelContent,
        position,
        map,
        yAnchor: 1 + 35 / 20 + 0.3,
        xAnchor: 0.5,
      });
    };

    const buildSelectedOverlay = (r: Restaurant, position: kakao.maps.LatLng, isVisited: boolean) => {
      const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name}${cityLabel ? ` ${cityLabel}` : ""}`)}`;
      const visitedBadge = isVisited ? `<span style="background:#22c55e;color:white;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;margin-left:4px;">✓ 방문완료</span>` : "";
      const content = `<div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:160px;"><div style="display:flex;align-items:center;gap:4px;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;color:#111">${r.name}</a>${visitedBadge}</div><div style="font-size:11px;color:#666;margin-top:3px;">탭하면 네이버지도로 이동</div></div>`;
      return new kakao.maps.CustomOverlay({
        content,
        position,
        map,
        yAnchor: 1.4,
        xAnchor: 0.5,
      });
    };

    if (restaurantsChanged) {
      // 식당 목록 변경 시 전체 재생성
      prevRestaurantIdsRef.current = currentIds;

      // 기존 모두 제거
      kakaoMarkersMapRef.current.forEach(m => m.setMap(null));
      kakaoMarkersMapRef.current.clear();
      kakaoNameOverlaysMapRef.current.forEach(o => o.setMap(null));
      kakaoNameOverlaysMapRef.current.clear();
      kakaoSelectedOverlayRef.current?.setMap(null);
      kakaoSelectedOverlayRef.current = null;
      if (kakaoClustererRef.current) kakaoClustererRef.current.clear();

      const normalMarkers: kakao.maps.Marker[] = [];

      restaurants.forEach(r => {
        const isSelected = r.id === selectedId;
        const isVisited = visitedIds.has(r.id);
        const position = new kakao.maps.LatLng(r.lat, r.lng);

        const marker = new kakao.maps.Marker({
          position,
          map: isSelected ? map : undefined,
          image: isSelected ? selectedImage : isVisited ? visitedImage : defaultImage,
          zIndex: isSelected ? 10 : isVisited ? 5 : 1,
        });

        kakao.maps.event.addListener(marker, "click", () => onSelect(r.id));
        kakaoMarkersMapRef.current.set(r.id, marker);

        if (isSelected) {
          kakaoSelectedOverlayRef.current = buildSelectedOverlay(r, position, isVisited);
        } else {
          const nameOverlay = buildNameOverlay(r, position, isVisited);
          kakaoNameOverlaysMapRef.current.set(r.id, nameOverlay);
          normalMarkers.push(marker);
        }
      });

      if (kakaoClustererRef.current) {
        kakaoClustererRef.current.addMarkers(normalMarkers);
      }
    } else if (selectedChanged) {
      // selectedId만 변경 — 두 마커만 선택적 업데이트 (flash 없음)
      const prevSel = prevSelectedIdRef.current;

      // 이전 선택 마커 → 일반 마커로 복원
      if (prevSel) {
        const prevMarker = kakaoMarkersMapRef.current.get(prevSel);
        const prevR = restaurants.find(r => r.id === prevSel);
        if (prevMarker && prevR) {
          const isVisited = visitedIds.has(prevSel);
          prevMarker.setImage(isVisited ? visitedImage : defaultImage);
          prevMarker.setZIndex(isVisited ? 5 : 1);
          prevMarker.setMap(null); // 직접 맵에서 제거
          if (kakaoClustererRef.current) kakaoClustererRef.current.addMarkers([prevMarker]);
          // 이름 레이블 복원
          const nameOverlay = buildNameOverlay(prevR, prevMarker.getPosition(), isVisited);
          kakaoNameOverlaysMapRef.current.get(prevSel)?.setMap(null);
          kakaoNameOverlaysMapRef.current.set(prevSel, nameOverlay);
        }
        // 선택 오버레이 제거
        kakaoSelectedOverlayRef.current?.setMap(null);
        kakaoSelectedOverlayRef.current = null;
      }

      // 새 선택 마커 → 선택 상태로 변경
      if (selectedId) {
        const selMarker = kakaoMarkersMapRef.current.get(selectedId);
        const selR = restaurants.find(r => r.id === selectedId);
        if (selMarker && selR) {
          const isVisited = visitedIds.has(selectedId);
          // 클러스터러에서 제거하고 직접 맵에 추가
          if (kakaoClustererRef.current) kakaoClustererRef.current.removeMarker(selMarker);
          selMarker.setImage(selectedImage);
          selMarker.setZIndex(10);
          selMarker.setMap(map);
          // 이름 레이블 제거 (선택 오버레이가 대신 표시)
          kakaoNameOverlaysMapRef.current.get(selectedId)?.setMap(null);
          kakaoNameOverlaysMapRef.current.delete(selectedId);
          // 선택 오버레이 추가
          kakaoSelectedOverlayRef.current = buildSelectedOverlay(selR, selMarker.getPosition(), isVisited);
        }
      }
    }

    prevSelectedIdRef.current = selectedId;
  }, [mode, restaurants, selectedId, onSelect, visitedIds, cityLabel]);

  // 식당 카드 클릭 시 지도 중앙 이동 + 적절한 줌 레벨
  useEffect(() => {
    if (!selectedId || mode !== "kakao") return;
    const map = kakaoMapRef.current;
    if (!map) return;

    const selected = restaurants.find(r => r.id === selectedId);
    if (!selected) return;

    const currentLevel = map.getLevel();
    // 현재 너무 많이 줌아웃(레벨 6 이상)이면 레벨 5로 맞추고 이동
    if (currentLevel > 5) {
      map.setLevel(5, { animate: true });
    }
    map.panTo(new kakao.maps.LatLng(selected.lat, selected.lng));
  }, [mode, selectedId]); // restaurants 의존성 제거 — 카드 클릭(selectedId 변경)에만 반응

  // Leaflet 마커 이펙트
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
          permanent: true,
          direction: "top",
          offset: [0, -38],
          className: `map-name-label${isVisited ? " map-name-label--visited" : ""}`,
        });
      }

      const visitedBadge = isVisited ? `<span style="background:#22c55e;color:white;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;">✓ 방문완료</span>` : "";
      marker.bindPopup(
        `<div style="min-width:170px;line-height:1.4;"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;">${r.name}</a>${visitedBadge}</div><div style="font-size:12px;opacity:.7;">탭하면 네이버지도로 이동</div></div>`,
        { closeButton: false, autoPan: true }
      );

      marker.on("click", () => {
        onSelect(r.id);
        marker.openPopup();
      });

      if (isSelected) {
        marker.openPopup();
        map.setView([r.lat, r.lng], 15, { animate: true });
      }

      leafMarkersRef.current.push(marker);
    });
  }, [mode, restaurants, selectedId, onSelect, visitedIds, cityLabel]);

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
