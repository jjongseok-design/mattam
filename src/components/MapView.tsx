import { useEffect, useRef, useCallback } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";

const CHUNCHEON_CENTER = { lat: 37.8813, lng: 127.73 };
const DEFAULT_LEVEL = 7;

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MapView = ({ restaurants, selectedId, onSelect }: MapViewProps) => {
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const readyRef = useRef(false);

  const onSelectCb = useCallback(onSelect, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || readyRef.current) return;

    kakao.maps.load(() => {
      if (!containerRef.current) return;
      const center = new kakao.maps.LatLng(CHUNCHEON_CENTER.lat, CHUNCHEON_CENTER.lng);
      const map = new kakao.maps.Map(containerRef.current, { center, level: DEFAULT_LEVEL });
      mapRef.current = map;
      readyRef.current = true;
    });

    return () => {
      readyRef.current = false;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers & overlay
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

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

      kakao.maps.event.addListener(marker, "click", () => {
        onSelectCb(r.id);
      });

      if (isSelected) {
        const overlay = new kakao.maps.CustomOverlay({
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
  }, [restaurants, selectedId, onSelectCb]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = restaurants.find((r) => r.id === selectedId);
    if (r) {
      map.setLevel(4, { animate: { duration: 300 } });
      map.panTo(new kakao.maps.LatLng(r.lat, r.lng));
    }
  }, [selectedId, restaurants]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MapView;
