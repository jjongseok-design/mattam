import type { Restaurant } from "@/hooks/useRestaurants";

export interface MarkerParams {
  restaurants: Restaurant[];
  selectedId: string | null;
  visitedIds: Set<string>;
  onSelect: (id: string) => void;
}

/** Common interface both Kakao and Leaflet adapters must satisfy */
export interface MapAdapter {
  /** Mount the map into the given container element */
  init(container: HTMLElement): Promise<void>;
  /** Clean up the map and all listeners */
  destroy(): void;
  /** Re-render all markers whenever data changes */
  updateMarkers(params: MarkerParams): void;
  /** Smoothly move the viewport to the given coordinates */
  panTo(lat: number, lng: number): void;
}
