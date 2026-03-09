import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Restaurant } from "@/hooks/useRestaurants";

const CHUNCHEON_CENTER = { lat: 37.8813, lng: 127.73 };
const DEFAULT_LEVEL = 7;
const KAKAO_APP_KEY = "9f52e7f69b37432bdec6b14bbd85a56b";
const KAKAO_SCRIPT_ID = "kakao-maps-sdk";

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const useKakaoMapReady = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;

    const markError = (message: string) => {
      console.error("[KakaoMap]", message, {
        origin: window.location.origin,
        href: window.location.href,
      });
      setError(message);
      setReady(false);
    };

    const loadMapApi = () => {
      if (window.kakao?.maps) {
        console.info("[KakaoMap] SDK already loaded", window.location.origin);
        kakao.maps.load(() => setReady(true));
        return;
      }

      let script = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;

      const onLoad = () => {
        console.info("[KakaoMap] script loaded");
        if (!window.kakao?.maps) {
          markError("지도 SDK 초기화에 실패했습니다 (kakao.maps 없음)");
          return;
        }
        kakao.maps.load(() => setReady(true));
      };

      const onError = () => {
        markError("지도 SDK 스크립트 로드 실패 (도메인 허용/키 확인 필요)");
      };

      if (!script) {
        script = document.createElement("script");
        script.id = KAKAO_SCRIPT_ID;
        script.async = true;
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`;
        script.addEventListener("load", onLoad);
        script.addEventListener("error", onError);
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", onLoad);
        script.addEventListener("error", onError);
      }

      timeoutId = window.setTimeout(() => {
        if (!window.kakao?.maps) {
          markError(`10초 경과: 현재 도메인(${window.location.origin})이 허용 도메인에 등록됐는지 확인하세요`);
        }
      }, 10000);

      return () => {
        script?.removeEventListener("load", onLoad);
        script?.removeEventListener("error", onError);
      };
    };

    const cleanup = loadMapApi();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      cleanup?.();
    };
  }, []);

  return { ready, error };
};

const MapView = ({ restaurants, selectedId, onSelect }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const onSelectCb = useCallback(onSelect, [onSelect]);
  const { ready, error } = useKakaoMapReady();

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    const center = new kakao.maps.LatLng(CHUNCHEON_CENTER.lat, CHUNCHEON_CENTER.lng);
    const map = new kakao.maps.Map(containerRef.current, { center, level: DEFAULT_LEVEL });
    mapRef.current = map;

    return () => {
      mapRef.current = null;
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    overlayRef.current?.setMap(null);
    overlayRef.current = null;

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

      kakao.maps.event.addListener(marker, "click", () => onSelectCb(r.id));

      if (isSelected) {
        const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name} 춘천`)}`;
        const content = `
          <div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:160px;font-family:-apple-system,sans-serif;position:relative;">
            <a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;font-size:14px;color:#333;display:block;">${r.name}</a>
            <div style="font-size:11px;color:#999;margin-top:3px;">탭하면 네이버지도로 이동</div>
            <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid white;"></div>
          </div>
        `;

        overlayRef.current = new kakao.maps.CustomOverlay({
          content,
          position,
          map,
          yAnchor: 1.4,
          xAnchor: 0.5,
        });
      }

      markersRef.current.push(marker);
    });
  }, [restaurants, selectedId, onSelectCb, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const selected = restaurants.find((restaurant) => restaurant.id === selectedId);
    if (!selected) return;

    map.setLevel(4, { animate: { duration: 300 } });
    map.panTo(new kakao.maps.LatLng(selected.lat, selected.lng));
  }, [selectedId, restaurants]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 p-4">
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-lg border border-border bg-background/95 px-4 py-3 text-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-medium">지도를 불러오지 못했습니다</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <p className="text-[11px] text-muted-foreground/80 break-all">
            현재 도메인: {typeof window !== "undefined" ? window.location.origin : "-"}
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs">지도 로딩중...</span>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
};

export default MapView;
