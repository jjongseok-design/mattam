import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import type { Restaurant } from "@/data/restaurants";
import { categoryMap, markerColorUrls } from "@/data/restaurants";

delete (L.Icon.Default.prototype as any)._getIconUrl;

const SHADOW_URL = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";
const DEFAULT_ICON_URL = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";

const iconCache: Record<string, L.Icon> = {};
function getIcon(color: string, selected: boolean): L.Icon {
  const key = `${color}-${selected}`;
  if (!iconCache[key]) {
    iconCache[key] = new L.Icon({
      iconUrl: markerColorUrls[color] || DEFAULT_ICON_URL,
      shadowUrl: SHADOW_URL,
      iconSize: selected ? [30, 49] : [25, 41],
      iconAnchor: selected ? [15, 49] : [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }
  return iconCache[key];
}

// 춘천시 전체가 보이는 범위
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
      const catInfo = categoryMap[r.category];
      const color = catInfo?.color || "grey";
      const isSelected = r.id === selectedId;

      const marker = L.marker([r.lat, r.lng], {
        icon: getIcon(color, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-size:13px;min-width:140px">
            <strong>${catInfo?.emoji || ""} ${r.name}</strong><br/>
            <span style="color:#666">${r.category}</span><br/>
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
