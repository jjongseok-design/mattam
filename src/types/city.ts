export interface City {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  zoom: number;
  bounds: {
    sw: { lat: number; lng: number };
    ne: { lat: number; lng: number };
  };
  isActive: boolean;
  comingSoon: boolean;
  restaurantCount: number;
  imageUrl?: string;
}
