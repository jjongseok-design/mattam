import { useEffect, useRef, useCallback, useState } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";

const CHUNCHEON_CENTER = { lat: 37.8813, lng: 127.73 };
const DEFAULT_LEVEL = 7;

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MapView = ({ restaurants, selectedId, onSelect }: MapViewProps) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const overlayRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const onSelectCb = useCallback(onSelect, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = () => {
      if (!containerRef.current || !window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        if (!containerRef.current) return;
        const maps = window.kakao.maps;
        const center = new maps.LatLng(CHUNCHEON_CENTER.lat, CHUNCHEON_CENTER.lng);
        const map = new maps.Map(containerRef.current, { center, level: DEFAULT_LEVEL });
        mapRef.current = map;
        setMapReady(true);
      });
    };

    if (window.kakao?.maps) {
      initMap();
    } else {
      // Wait for SDK to load
      const check = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(check);
          initMap();
        }
      }, 100);
      return () => clearInterval(check);
    }

    return () => {
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.kakao?.maps;
    if (!map || !maps || !mapReady) return;

    // Clear existing markers & overlay
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
    const maps = window.kakao?.maps;
    if (!map || !maps || !selectedId || !mapReady) return;
    const r = restaurants.find((r) => r.id === selectedId);
    if (r) {
      map.setLevel(4, { animate: { duration: 300 } });
      map.panTo(new maps.LatLng(r.lat, r.lng));
    }
  }, [selectedId, restaurants, mapReady]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MapView;
