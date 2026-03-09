interface Window {
  kakao: typeof kakao;
}

declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number, options?: { animate?: { duration?: number } }): void;
    panTo(latlng: LatLng): void;
    getLevel(): number;
  }

  class LatLngBounds {
    constructor(sw: LatLng, ne: LatLng);
    contain(latlng: LatLng): boolean;
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map; image?: MarkerImage; zIndex?: number });
    setMap(map: Map | null): void;
    setImage(image: MarkerImage): void;
    setZIndex(zIndex: number): void;
    getPosition(): LatLng;
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  class InfoWindow {
    constructor(options: { content: string; removable?: boolean });
    open(map: Map, marker: Marker): void;
    close(): void;
  }

  class CustomOverlay {
    constructor(options: { content: string; position: LatLng; map?: Map; yAnchor?: number; xAnchor?: number });
    setMap(map: Map | null): void;
  }

  namespace event {
    function addListener(target: any, type: string, handler: (...args: any[]) => void): void;
    function removeListener(target: any, type: string, handler: (...args: any[]) => void): void;
  }

  function load(callback: () => void): void;
}
