import { useEffect, useRef, useCallback } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";

const CHUNCHEON_CENTER = { lat: 37.8813, lng: 127.73 };
const DEFAULT_LEVEL = 7; // Kakao zoom level (smaller = closer)

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MapView = ({ restaurants, selectedId, onSelect }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const onSelectCb = useCallback(onSelect, [onSelect]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMap = () => {
      if (!containerRef.current) return;
      const center = new kakao.maps.LatLng(CHUNCHEON_CENTER.lat, CHUNCHEON_CENTER.lng);
      const map = new kakao.maps.Map(containerRef.current, {
        center,
        level: DEFAULT_LEVEL,
      });
      mapRef.current = map;
    };

    if (window.kakao && window.kakao.maps) {
      kakao.maps.load(initMap);
    }

    return () => {
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers & overlay
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
        const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name} 춘천`)}`;
        const content = `
          <div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:160px;font-family:-apple-system,sans-serif;position:relative;">
            <a href="${naverUrl}" target="_blank" rel="noopener noreferrer" 
               style="text-decoration:none;font-weight:700;font-size:14px;color:#333;display:block;">
              ${r.name}
            </a>
            <div style="font-size:11px;color:#999;margin-top:3px;">탭하면 네이버지도로 이동</div>
            <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid white;"></div>
          </div>
        `;

        const overlay = new kakao.maps.CustomOverlay({
          content,
          position,
          map,
          yAnchor: 1.4,
          xAnchor: 0.5,
        });
        overlayRef.current = overlay;
      }

      markersRef.current.push(marker);
    });
  }, [restaurants, selectedId, onSelectCb]);

  // Pan to selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const r = restaurants.find((restaurant) => restaurant.id === selectedId);
    if (r) {
      map.setLevel(4, { animate: { duration: 300 } });
      map.panTo(new kakao.maps.LatLng(r.lat, r.lng));
    }
  }, [selectedId, restaurants]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MapView;
