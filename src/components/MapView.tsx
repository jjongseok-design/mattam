import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import type { Restaurant } from "@/data/restaurants";

delete (L.Icon.Default.prototype as any)._getIconUrl;

const SHADOW_URL = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";
const MARKER_URL = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png";
const MARKER_SELECTED_URL = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png";

const defaultIcon = new L.Icon({
  iconUrl: MARKER_URL,
  shadowUrl: SHADOW_URL,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: MARKER_SELECTED_URL,
  shadowUrl: SHADOW_URL,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CHUNCHEON_CENTER: L.LatLngExpression = [37.8813, 127.7300];
const DEFAULT_ZOOM = 12;

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MapView = ({ restaurants, selectedId, onSelect }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CHUNCHEON_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      minZoom: 10,
      maxZoom: 18,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const onSelectCb = useCallback(onSelect, [onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;

      const marker = L.marker([r.lat, r.lng], {
        icon: isSelected ? selectedIcon : defaultIcon,
        zIndexOffset: isSelected ? 1000 : 0,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-size:13px;min-width:140px">
            <strong>🥟 ${r.name}</strong><br/>
            ⭐ ${r.rating} (${r.reviewCount.toLocaleString()}개 리뷰)<br/>
            <span style="font-size:11px;color:#888">${r.address}</span>
          </div>`
        );

      marker.on("click", () => onSelectCb(r.id));
      markersRef.current.push(marker);
    });
  }, [restaurants, selectedId, onSelectCb]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = restaurants.find((r) => r.id === selectedId);
    if (r) {
      map.flyTo([r.lat, r.lng], 15, { duration: 0.8 });
    }
  }, [selectedId, restaurants]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MapView;
