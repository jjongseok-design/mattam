import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapAdapter, MarkerParams } from "./types";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";

const LEAFLET_CENTER: L.LatLngExpression = [37.8813, 127.73];
const CHUNCHEON_BOUNDS = L.latLngBounds(L.latLng(37.734, 127.58), L.latLng(38.02, 127.92));

// Fix default Leaflet icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const makeEmojiIcon = (emoji: string, isSelected: boolean, isVisited: boolean): L.DivIcon => {
  const size = isSelected ? 40 : 32;
  const bg = isSelected ? "#f97316" : isVisited ? "#16a34a" : "#ffffff";
  const border = isSelected ? "#ea580c" : isVisited ? "#15803d" : "#e2e8f0";
  const shadow = isSelected ? "0 2px 8px rgba(249,115,22,0.5)" : "0 1px 4px rgba(0,0,0,0.2)";
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isSelected ? 20 : 16}px;box-shadow:${shadow};transition:all .15s;">${emoji}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });
};

export class LeafletAdapter implements MapAdapter {
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];

  async init(container: HTMLElement): Promise<void> {
    const map = L.map(container, {
      maxBounds: CHUNCHEON_BOUNDS,
      maxBoundsViscosity: 1,
      minZoom: 11,
      maxZoom: 18,
    }).setView(LEAFLET_CENTER, 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      bounds: CHUNCHEON_BOUNDS,
    }).addTo(map);

    this.map = map;
  }

  destroy(): void {
    this._clearMarkers();
    this.map?.remove();
    this.map = null;
  }

  updateMarkers({ restaurants, selectedId, visitedIds, onSelect, cityName }: MarkerParams): void {
    if (!this.map) return;
    this._clearMarkers();

    for (const r of restaurants) {
      const isSelected = r.id === selectedId;
      const isVisited = visitedIds.has(r.id);
      const emoji = CATEGORY_EMOJI[r.category] || "🍽️";
      const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name}${cityName ? ` ${cityName}` : ""}`)}`;

      const marker = L.marker([r.lat, r.lng], {
        icon: makeEmojiIcon(emoji, isSelected, isVisited),
        zIndexOffset: isSelected ? 1000 : isVisited ? 500 : 0,
      }).addTo(this.map);

      if (!isSelected) {
        marker.bindTooltip(r.name, {
          permanent: true,
          direction: "top",
          offset: [0, -38],
          className: `map-name-label${isVisited ? " map-name-label--visited" : ""}`,
        });
      }

      const badge = isVisited ? `<span style="background:#22c55e;color:white;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;">✓ 방문완료</span>` : "";
      marker.bindPopup(
        `<div style="min-width:170px;line-height:1.4;"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;">${r.name}</a>${badge}</div><div style="font-size:12px;opacity:.7;">탭하면 네이버지도로 이동</div></div>`,
        { closeButton: false, autoPan: true }
      );

      marker.on("click", () => { onSelect(r.id); marker.openPopup(); });
      if (isSelected) marker.openPopup();

      this.markers.push(marker);
    }
  }

  panTo(lat: number, lng: number): void {
    this.map?.setView([lat, lng], 15, { animate: true });
  }

  private _clearMarkers(): void {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
  }
}
