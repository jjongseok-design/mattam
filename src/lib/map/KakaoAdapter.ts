import type { MapAdapter, MarkerParams } from "./types";

const CHUNCHEON = { lat: 37.8813, lng: 127.73 };
const KAKAO_APP_KEY = import.meta.env.VITE_KAKAO_APP_KEY as string;
const KAKAO_SCRIPT_ID = "kakao-maps-sdk";

export class KakaoAdapter implements MapAdapter {
  private map: kakao.maps.Map | null = null;
  private markers: kakao.maps.Marker[] = [];
  private infoOverlay: kakao.maps.CustomOverlay | null = null;
  private nameOverlays: kakao.maps.CustomOverlay[] = [];
  private clusterer: any = null;

  /** Loads Kakao SDK and resolves when ready. Rejects on failure/timeout. */
  static load(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.kakao?.maps) {
        kakao.maps.load(resolve);
        return;
      }
      let script = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = KAKAO_SCRIPT_ID;
        script.async = true;
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=clusterer`;
        document.head.appendChild(script);
      }
      const timeout = window.setTimeout(() => reject(new Error("카카오 SDK 로드 타임아웃")), 7000);
      script.addEventListener("load", () => {
        window.clearTimeout(timeout);
        if (!window.kakao?.maps) { reject(new Error("카카오 SDK 초기화 실패")); return; }
        kakao.maps.load(resolve);
      });
      script.addEventListener("error", () => {
        window.clearTimeout(timeout);
        reject(new Error("카카오 SDK 로드 실패"));
      });
    });
  }

  async init(container: HTMLElement): Promise<void> {
    await KakaoAdapter.load();
    const center = new kakao.maps.LatLng(CHUNCHEON.lat, CHUNCHEON.lng);
    const map = new kakao.maps.Map(container, { center, level: 7 });
    this.map = map;

    const sw = new kakao.maps.LatLng(37.734, 127.58);
    const ne = new kakao.maps.LatLng(38.02, 127.92);
    const bounds = new (kakao.maps as any).LatLngBounds(sw, ne);

    const clamp = () => {
      const c = (map as any).getCenter();
      if (!bounds.contain(c)) {
        map.setCenter(new kakao.maps.LatLng(
          Math.max(sw.getLat(), Math.min(ne.getLat(), c.getLat())),
          Math.max(sw.getLng(), Math.min(ne.getLng(), c.getLng()))
        ));
      }
    };
    kakao.maps.event.addListener(map, "dragend", clamp);
    kakao.maps.event.addListener(map, "idle", clamp);
    kakao.maps.event.addListener(map, "zoom_changed", () => {
      if (map.getLevel() > 7) { map.setLevel(7); map.setCenter(center); }
    });

    if ((window as any).kakao?.maps?.MarkerClusterer) {
      this.clusterer = new (kakao.maps as any).MarkerClusterer({
        map, averageCenter: true, minLevel: 5,
        styles: [{
          width: "44px", height: "44px",
          background: "rgba(249,115,22,0.85)",
          borderRadius: "50%", color: "#fff",
          textAlign: "center", fontWeight: "700",
          lineHeight: "44px", fontSize: "14px",
          border: "2px solid rgba(255,255,255,0.6)",
        }],
      });
    }
  }

  destroy(): void {
    this._clearMarkers();
    this.map = null;
  }

  updateMarkers({ restaurants, selectedId, visitedIds, onSelect, cityName }: MarkerParams): void {
    if (!this.map) return;
    this._clearMarkers();

    const defaultImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new kakao.maps.Size(24, 35)
    );
    const selectedImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new kakao.maps.Size(32, 46)
    );
    const visitedImage = new kakao.maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png",
      new kakao.maps.Size(24, 35)
    );

    const normalMarkers: kakao.maps.Marker[] = [];

    for (const r of restaurants) {
      const isSelected = r.id === selectedId;
      const isVisited = visitedIds.has(r.id);
      const pos = new kakao.maps.LatLng(r.lat, r.lng);

      const marker = new kakao.maps.Marker({
        position: pos,
        map: isSelected ? this.map : undefined,
        image: isSelected ? selectedImage : isVisited ? visitedImage : defaultImage,
        zIndex: isSelected ? 10 : isVisited ? 5 : 1,
      });
      kakao.maps.event.addListener(marker, "click", () => onSelect(r.id));
      this.markers.push(marker);

      if (!isSelected) {
        const bg = isVisited ? "#16a34a" : "white";
        const color = isVisited ? "white" : "#222";
        const border = isVisited ? "none" : "1px solid rgba(0,0,0,0.12)";
        const nameOverlay = new kakao.maps.CustomOverlay({
          content: `<div style="background:${bg};color:${color};border:${border};border-radius:5px;padding:2px 7px;font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.18);white-space:nowrap;pointer-events:none;">${r.name}</div>`,
          position: pos, map: this.map, yAnchor: 1 + 35 / 20 + 0.3, xAnchor: 0.5,
        });
        this.nameOverlays.push(nameOverlay);
        normalMarkers.push(marker);
      } else {
        const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${r.name}${cityName ? ` ${cityName}` : ""}`)}`;
        const badge = isVisited ? `<span style="background:#22c55e;color:white;font-size:9px;padding:1px 5px;border-radius:999px;font-weight:700;margin-left:4px;">✓ 방문완료</span>` : "";
        this.infoOverlay = new kakao.maps.CustomOverlay({
          content: `<div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);min-width:160px;"><div style="display:flex;align-items:center;gap:4px;"><a href="${naverUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;font-weight:700;color:#111">${r.name}</a>${badge}</div><div style="font-size:11px;color:#666;margin-top:3px;">탭하면 네이버지도로 이동</div></div>`,
          position: pos, map: this.map, yAnchor: 1.4, xAnchor: 0.5,
        });
      }
    }

    if (this.clusterer) this.clusterer.addMarkers(normalMarkers);
  }

  panTo(lat: number, lng: number): void {
    if (!this.map) return;
    this.map.setLevel(4, { animate: { duration: 300 } });
    this.map.panTo(new kakao.maps.LatLng(lat, lng));
  }

  private _clearMarkers(): void {
    this.markers.forEach((m) => m.setMap(null));
    this.markers = [];
    this.infoOverlay?.setMap(null);
    this.infoOverlay = null;
    this.nameOverlays.forEach((o) => o.setMap(null));
    this.nameOverlays = [];
    if (this.clusterer) this.clusterer.clear();
  }
}
