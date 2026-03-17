declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(latitude: number, longitude: number);
    getLat(): number;
    getLng(): number;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
    relayout(): void;
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    setPosition(latlng: LatLng): void;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
  }

  class Circle {
    constructor(options: CircleOptions);
    setMap(map: Map | null): void;
    setPosition(latlng: LatLng): void;
    setRadius(radius: number): void;
  }

  interface CircleOptions {
    center: LatLng;
    radius: number;
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
    fillColor?: string;
    fillOpacity?: number;
    map?: Map;
  }
}

interface Window {
  kakao?: {
    maps: typeof kakao.maps;
  };
}
