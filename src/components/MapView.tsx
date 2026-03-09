import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Restaurant } from "@/hooks/useRestaurants";

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

const leafSelectedIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [1, -40],
  className: "selected-marker",
});

const MapView = ({ restaurants, selectedId, onSelect }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const kakaoMapRef = useRef<kakao.maps.Map | null>(null);
  const kakaoMarkersRef = useRef<kakao.maps.Marker[]>([]);
  const kakaoOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  const leafMapRef = useRef<L.Map | null>(null);
  const leafMarkersRef = useRef<L.Marker[]>([]);

  const [mode, setMode] = useState<MapMode>("loading");
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;

    const fallbackToLeaflet = (reason: string) => {
      setFallbackReason(reason);
      setMode("leaflet");
    };

    if (window.kakao?.maps) {
      kakao.maps.load(() => setMode("kakao"));
      return;
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
        fallbackToLeaflet("카카오 SDK 초기화 실패");
        return;
      }
      kakao.maps.load(() => setMode("kakao"));
    };

    const onError = () => {
      fallbackToLeaflet("카카오 SDK 로드 실패");
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    timeoutId = window.setTimeout(() => {
      if (mode === "loading" && !window.kakao?.maps) {
        fallbackToLeaflet("카카오 SDK 로드 타임아웃");
      }
    }, 7000);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "kakao" || !containerRef.current || kakaoMapRef.current) return;
    const center = new kakao.maps.LatLng(CHUNCHEON_CENTER.lat, CHUNCHEON_CENTER.lng);
    const map = new kakao.maps.Map(containerRef.current, { center, level: 7 });
    kakaoMapRef.current = map;

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

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;
      const position = new kakao.maps.LatLng(r.lat, r.lng);
      const marker = new kakao.maps.Marker({
        position,
        map,
        image: isSelected ? selectedImage : defaultImage,
        zIndex: isSelected ? 10 : 1,
      });

      kakao.maps.event.addListener(marker, "click", () => onSelect(r.id));

      if (isSelected) {
        const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name} 춘천`)}`;
        const content = `<div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:160px;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;color:#111">${r.name}</a><div style="font-size:11px;color:#666;margin-top:3px;">탭하면 네이버지도로 이동</div></div>`;
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
  }, [mode, restaurants, selectedId, onSelect]);

  useEffect(() => {
    if (mode !== "leaflet") return;
    const map = leafMapRef.current;
    if (!map) return;

    leafMarkersRef.current.forEach((m) => m.remove());
    leafMarkersRef.current = [];

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;
      const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name} 춘천`)}`;
      const marker = L.marker([r.lat, r.lng], {
        icon: isSelected ? leafSelectedIcon : leafDefaultIcon,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      marker.bindPopup(
        `<div style="min-width:170px;line-height:1.4;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;display:block;">${r.name}</a><div style="font-size:12px;opacity:.7;margin-top:2px;">탭하면 네이버지도로 이동</div></div>`,
        { closeButton: false, autoPan: true }
      );

      marker.on("click", () => {
        onSelect(r.id);
        marker.openPopup();
      });

      if (isSelected) marker.openPopup();
      leafMarkersRef.current.push(marker);
    });
  }, [mode, restaurants, selectedId, onSelect]);

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
