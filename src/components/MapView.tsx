import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Restaurant } from "@/hooks/useRestaurants";
import { useToast } from "@/hooks/use-toast";

const CHUNCHEON_CENTER = { lat: 37.8813, lng: 127.73 };
const LEAFLET_CENTER: L.LatLngExpression = [37.8813, 127.73];
const CHUNCHEON_BOUNDS = L.latLngBounds(
  L.latLng(37.734, 127.58),
  L.latLng(38.02, 127.92)
);

const KAKAO_APP_KEY = "9f52e7f69b37432bdec6b14bbd85a56b";
const KAKAO_SCRIPT_ID = "kakao-maps-sdk";

type MapMode = "loading" | "kakao" | "leaflet";

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  visitedIds?: Set<string>;
}

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

const MapView = ({ restaurants, selectedId, onSelect, visitedIds = new Set() }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const kakaoMapRef = useRef<kakao.maps.Map | null>(null);
  const kakaoMarkersRef = useRef<kakao.maps.Marker[]>([]);
  const kakaoOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

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
      // Show toast after a tick to ensure it renders
      setTimeout(() => {
        toast({
          title: "🗺️ 기본 지도로 전환되었습니다",
          description: `카카오맵 대신 기본 지도를 표시합니다. (${reason})`,
        });
      }, 500);
    }
  }, [toast]);

  useEffect(() => {
    let timeoutId: number | undefined;

    if (window.kakao?.maps) {
      timeoutId = window.setTimeout(() => {
        if (mode === "loading") handleFallback("카카오 SDK 초기화 타임아웃");
      }, 7000);
      kakao.maps.load(() => {
        window.clearTimeout(timeoutId);
        setMode("kakao");
      });
      return () => window.clearTimeout(timeoutId);
    }

    let script = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = KAKAO_SCRIPT_ID;
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
      document.head.appendChild(script);
    }

    const onLoad = () => {
      if (!window.kakao?.maps) {
        handleFallback("카카오 SDK 초기화 실패");
        return;
      }
      kakao.maps.load(() => setMode("kakao"));
    };

    const onError = () => {
      handleFallback("카카오 SDK 로드 실패");
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    timeoutId = window.setTimeout(() => {
      if (!window.kakao?.maps) {
        handleFallback("카카오 SDK 로드 타임아웃");
      }
    }, 7000);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, [handleFallback]);

  useEffect(() => {
    if (mode !== "kakao" || !containerRef.current || kakaoMapRef.current) return;
    const center = new kakao.maps.LatLng(CHUNCHEON_CENTER.lat, CHUNCHEON_CENTER.lng);
    const map = new kakao.maps.Map(containerRef.current, { center, level: 7 });
    kakaoMapRef.current = map;

    const sw = new kakao.maps.LatLng(37.734, 127.58);
    const ne = new kakao.maps.LatLng(38.02, 127.92);
    const chuncheonCenter = new kakao.maps.LatLng(CHUNCHEON_CENTER.lat, CHUNCHEON_CENTER.lng);
    const bounds = new (kakao.maps as any).LatLngBounds(sw, ne);

    const clampToChuncheon = () => {
      const c = (map as any).getCenter();
      if (!bounds.contain(c)) {
        const lat = Math.max(sw.getLat(), Math.min(ne.getLat(), c.getLat()));
        const lng = Math.max(sw.getLng(), Math.min(ne.getLng(), c.getLng()));
        map.setCenter(new kakao.maps.LatLng(lat, lng));
      }
    };

    kakao.maps.event.addListener(map, "dragend", clampToChuncheon);
    kakao.maps.event.addListener(map, "idle", clampToChuncheon);

    kakao.maps.event.addListener(map, "zoom_changed", () => {
      const level = map.getLevel();
      if (level > 7) {
        map.setLevel(7);
        map.setCenter(chuncheonCenter);
      }
    });

    return () => {
      kakaoMapRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "leaflet" || !containerRef.current || leafMapRef.current) return;

    const map = L.map(containerRef.current, {
      maxBounds: CHUNCHEON_BOUNDS,
      maxBoundsViscosity: 1,
      minZoom: 11,
      maxZoom: 18,
    }).setView(LEAFLET_CENTER, 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      bounds: CHUNCHEON_BOUNDS,
    }).addTo(map);

    leafMapRef.current = map;

    return () => {
      map.remove();
      leafMapRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "kakao") return;
    const map = kakaoMapRef.current;
    if (!map) return;

    kakaoMarkersRef.current.forEach((m) => m.setMap(null));
    kakaoMarkersRef.current = [];
    kakaoOverlayRef.current?.setMap(null);
    kakaoOverlayRef.current = null;

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

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;
      const isVisited = visitedIds.has(r.id);
      const position = new kakao.maps.LatLng(r.lat, r.lng);
      const marker = new kakao.maps.Marker({
        position,
        map,
        image: isSelected ? selectedImage : isVisited ? visitedImage : defaultImage,
        zIndex: isSelected ? 10 : isVisited ? 5 : 1,
      });

      kakao.maps.event.addListener(marker, "click", () => onSelect(r.id));

      if (isSelected) {
        const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name} 춘천`)}`;
        const visitedBadge = isVisited ? `<span style="background:#22c55e;color:white;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;margin-left:4px;">✓ 방문완료</span>` : "";
        const content = `<div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:160px;"><div style="display:flex;align-items:center;gap:4px;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;color:#111">${r.name}</a>${visitedBadge}</div><div style="font-size:11px;color:#666;margin-top:3px;">탭하면 네이버지도로 이동</div></div>`;
        kakaoOverlayRef.current = new kakao.maps.CustomOverlay({
          content,
          position,
          map,
          yAnchor: 1.4,
          xAnchor: 0.5,
        });
      }

      kakaoMarkersRef.current.push(marker);
    });
  }, [mode, restaurants, selectedId, onSelect, visitedIds]);

  useEffect(() => {
    if (mode !== "leaflet") return;
    const map = leafMapRef.current;
    if (!map) return;

    leafMarkersRef.current.forEach((m) => m.remove());
    leafMarkersRef.current = [];

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;
      const isVisited = visitedIds.has(r.id);
      const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name} 춘천`)}`;
      const marker = L.marker([r.lat, r.lng], {
        icon: isSelected ? leafSelectedIcon : isVisited ? leafVisitedIcon : leafDefaultIcon,
        zIndexOffset: isSelected ? 1000 : isVisited ? 500 : 0,
      }).addTo(map);

      const visitedBadge = isVisited ? `<span style="background:#22c55e;color:white;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;">✓ 방문완료</span>` : "";
      marker.bindPopup(
        `<div style="min-width:170px;line-height:1.4;"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;">${r.name}</a>${visitedBadge}</div><div style="font-size:12px;opacity:.7;">탭하면 네이버지도로 이동</div></div>`,
        { closeButton: false, autoPan: true }
      );

      marker.on("click", () => {
        onSelect(r.id);
        marker.openPopup();
      });

      if (isSelected) marker.openPopup();
      leafMarkersRef.current.push(marker);
    });
  }, [mode, restaurants, selectedId, onSelect, visitedIds]);

  useEffect(() => {
    const selected = restaurants.find((r) => r.id === selectedId);
    if (!selected) return;

    if (mode === "kakao" && kakaoMapRef.current) {
      kakaoMapRef.current.setLevel(4, { animate: { duration: 300 } });
      kakaoMapRef.current.panTo(new kakao.maps.LatLng(selected.lat, selected.lng));
    }

    if (mode === "leaflet" && leafMapRef.current) {
      leafMapRef.current.setView([selected.lat, selected.lng], 15, { animate: true });
    }
  }, [mode, selectedId, restaurants]);

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
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
};

export default MapView;
