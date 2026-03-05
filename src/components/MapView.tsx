import { useEffect, useRef, useCallback, useState } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";

const CHUNCHEON_CENTER = { lat: 37.8813, lng: 127.73 };
const DEFAULT_LEVEL = 7;
const SDK_WAIT_MS = 10000;

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const getKakaoMaps = () => (window as any).kakao?.maps;

const MapView = ({ restaurants, selectedId, onSelect }: MapViewProps) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const overlayRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const onSelectCb = useCallback(onSelect, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    let isUnmounted = false;
    let checkTimer: number | null = null;
    const startedAt = Date.now();

    const initMap = () => {
      const maps = getKakaoMaps();
      if (!containerRef.current || !maps) return;

      maps.load(() => {
        if (!containerRef.current || isUnmounted) return;
        const center = new maps.LatLng(CHUNCHEON_CENTER.lat, CHUNCHEON_CENTER.lng);
        const map = new maps.Map(containerRef.current, { center, level: DEFAULT_LEVEL });
        mapRef.current = map;
        setSdkError(null);
        setMapReady(true);
      });
    };

    const waitForSdk = () => {
      const maps = getKakaoMaps();
      if (maps) {
        initMap();
        return;
      }

      if (Date.now() - startedAt >= SDK_WAIT_MS) {
        setSdkError("지도를 불러오지 못했습니다. Kakao JavaScript 플랫폼 도메인 설정을 다시 확인해 주세요.");
        return;
      }

      checkTimer = window.setTimeout(waitForSdk, 100);
    };

    waitForSdk();

    return () => {
      isUnmounted = true;
      if (checkTimer) window.clearTimeout(checkTimer);
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = getKakaoMaps();
    if (!map || !maps || !mapReady) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    const defaultImage = new maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new maps.Size(24, 35)
    );

    const selectedImage = new maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new maps.Size(32, 46)
    );

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;
      const position = new maps.LatLng(r.lat, r.lng);

      const marker = new maps.Marker({
        position,
        map,
        image: isSelected ? selectedImage : defaultImage,
        zIndex: isSelected ? 10 : 1,
      });

      maps.event.addListener(marker, "click", () => {
        onSelectCb(r.id);
      });

      if (isSelected) {
        const overlay = new maps.CustomOverlay({
          content: `<div style="padding:8px 12px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.15);font-size:13px;min-width:140px;border:1px solid #eee">
            <strong>🥟 ${r.name}</strong><br/>
            ⭐ ${r.rating} (${r.reviewCount.toLocaleString()}개 리뷰)<br/>
            <span style="font-size:11px;color:#888">${r.address}</span>
          </div>`,
          position,
          yAnchor: 1.5,
        });
        overlay.setMap(map);
        overlayRef.current = overlay;
      }

      markersRef.current.push(marker);
    });
  }, [restaurants, selectedId, onSelectCb, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = getKakaoMaps();
    if (!map || !maps || !selectedId || !mapReady) return;

    const r = restaurants.find((restaurant) => restaurant.id === selectedId);
    if (r) {
      map.setLevel(4, { animate: { duration: 300 } });
      map.panTo(new maps.LatLng(r.lat, r.lng));
    }
  }, [selectedId, restaurants, mapReady]);

  if (sdkError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm p-4 text-center">
        {sdkError}
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MapView;

