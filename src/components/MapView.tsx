import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Restaurant } from "@/hooks/useRestaurants";

const CHUNCHEON_CENTER: L.LatLngExpression = [37.8813, 127.73];
const DEFAULT_ZOOM = 13;

// 춘천시 행정구역 경계 (대략적인 범위)
const CHUNCHEON_BOUNDS = L.latLngBounds(
  L.latLng(37.7340, 127.5800), // 남서쪽
  L.latLng(38.0200, 127.9200)  // 북동쪽
);

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const selectedIcon = new L.Icon({
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
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const onSelectCb = useCallback(onSelect, [onSelect]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      maxBounds: CHUNCHEON_BOUNDS,
      maxBoundsViscosity: 1.0,
      minZoom: 11,
      maxZoom: 18,
    }).setView(CHUNCHEON_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      bounds: CHUNCHEON_BOUNDS,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;
      const marker = L.marker([r.lat, r.lng], {
        icon: isSelected ? selectedIcon : defaultIcon,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(r.name + ' ' + r.address)}`;
      const popupContent = `
        <div style="min-width:160px">
          <strong>🥟 ${r.name}</strong><br/>
          ⭐ ${r.rating} (${r.reviewCount.toLocaleString()}개 리뷰)<br/>
          <span style="font-size:11px;color:#888">${r.address}</span><br/>
          <a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#e84118;text-decoration:none;font-weight:600">네이버지도에서 보기 →</a>
        </div>`;

      marker.bindPopup(popupContent);

      if (isSelected) {
        marker.openPopup();
      }

      marker.on("click", () => {
        onSelectCb(r.id);
      });

      markersRef.current.push(marker);
    });
  }, [restaurants, selectedId, onSelectCb]);

  // Pan to selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const r = restaurants.find((restaurant) => restaurant.id === selectedId);
    if (r) {
      map.setView([r.lat, r.lng], 15, { animate: true });
    }
  }, [selectedId, restaurants]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MapView;
