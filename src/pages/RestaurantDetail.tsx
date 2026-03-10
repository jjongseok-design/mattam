import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, ExternalLink, Share2, Loader2, Utensils, MapPin, Phone, Clock, XCircle, Tag, Banknote, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRestaurants, type Restaurant } from "@/hooks/useRestaurants";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import ErrorState from "@/components/ErrorState";
import { useToast } from "@/hooks/use-toast";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import L from "leaflet";

const DetailMiniMap = ({ lat, lng, name }: { lat: number; lng: number; name: string }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([lat, lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    const icon = new L.Icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    L.marker([lat, lng], { icon }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div className="rounded-xl overflow-hidden border border-border/50 h-[180px]">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: restaurants = [], isLoading, isError, refetch } = useRestaurants();
  const { toast } = useToast();
  const { addViewed } = useRecentlyViewed();

  const restaurant = restaurants.find((r) => r.id === id);

  useEffect(() => {
    if (id) addViewed(id);
  }, [id, addViewed]);

  useEffect(() => {
    if (!restaurant) return;
    const title = `${restaurant.name} - 춘천 맛집지도`;
    const desc = `${restaurant.name} | ${restaurant.category} | ${restaurant.address} | 평점 ${restaurant.rating} | 춘천 맛집`;
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", desc);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", window.location.href);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);

    let script = document.getElementById("jsonld-restaurant") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "jsonld-restaurant";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: restaurant.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: restaurant.address,
        addressLocality: "춘천시",
        addressRegion: "강원특별자치도",
        addressCountry: "KR",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: restaurant.lat,
        longitude: restaurant.lng,
      },
      telephone: restaurant.phone || undefined,
      servesCuisine: restaurant.category,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: restaurant.rating,
        reviewCount: restaurant.reviewCount,
        bestRating: 5,
      },
      priceRange: restaurant.priceRange || undefined,
      openingHours: restaurant.openingHours || undefined,
    });

    return () => {
      document.title = "춘천 맛집지도";
      script?.remove();
    };
  }, [restaurant]);

  const handleShare = async () => {
    const url = window.location.href;
    const text = `${restaurant!.name} - 춘천 맛집`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "링크가 복사되었습니다 📋" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!restaurant) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background gap-4">
        <Utensils className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">식당을 찾을 수 없습니다</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> 지도로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const emoji = CATEGORY_EMOJI[restaurant.category] || "🍽️";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border/50 safe-area-top">
        <div className="max-w-2xl mx-auto safe-area-x py-3 flex items-center justify-between gap-2">
          <Link to="/" aria-label="지도로 돌아가기">
            <Button variant="ghost" size="icon" className="tap-safe" aria-label="뒤로가기">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-sm font-semibold text-foreground truncate">{restaurant.name}</h1>
          <Button variant="ghost" size="icon" className="tap-safe" onClick={handleShare} aria-label="공유하기">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>


      <div className="max-w-2xl mx-auto safe-area-x py-6 space-y-5">
        {/* Name & Rating */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{restaurant.name}</h2>
              <OpenStatusBadge openingHours={restaurant.openingHours} closedDays={restaurant.closedDays} />
            </div>
            <span className="text-sm text-muted-foreground">{emoji} {restaurant.category}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-muted/50 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 text-rating fill-current" />
              <span className="text-2xl font-bold text-foreground">{restaurant.rating}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">리뷰 {restaurant.reviewCount}개</span>
          </div>
        </div>

        {/* Description */}
        {restaurant.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{restaurant.description}</p>
        )}

        {/* Info Section */}
        <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/40">
          {/* Address */}
          <div className="flex items-start gap-3 p-3.5">
            <MapPin className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">{restaurant.address}</p>
            </div>
            <a
              href={`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + " 춘천")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary font-medium flex items-center gap-0.5 flex-shrink-0"
            >
              <Navigation className="h-3 w-3" /> 길찾기
            </a>
          </div>

          {/* Phone */}
          {restaurant.phone && (
            <div className="flex items-center gap-3 p-3.5">
              <Phone className="h-4 w-4 text-primary/60 flex-shrink-0" />
              <a href={`tel:${restaurant.phone}`} className="text-[13px] font-medium text-foreground hover:text-primary transition-colors">
                {restaurant.phone}
              </a>
            </div>
          )}

          {/* Opening Hours */}
          {restaurant.openingHours && (
            <div className="flex items-center gap-3 p-3.5">
              <Clock className="h-4 w-4 text-primary/60 flex-shrink-0" />
              <span className="text-[13px] text-foreground">{restaurant.openingHours}</span>
            </div>
          )}

          {/* Closed Days */}
          {restaurant.closedDays && (
            <div className="flex items-center gap-3 p-3.5">
              <XCircle className="h-4 w-4 text-destructive/60 flex-shrink-0" />
              <span className="text-[13px] text-foreground">
                휴무: <span className="text-destructive/80 font-medium">{restaurant.closedDays}</span>
              </span>
            </div>
          )}

          {/* Price Range */}
          {restaurant.priceRange && (
            <div className="flex items-center gap-3 p-3.5">
              <Banknote className="h-4 w-4 text-primary/60 flex-shrink-0" />
              <span className="text-[13px] text-foreground">{restaurant.priceRange}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {restaurant.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {restaurant.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-muted/80 rounded-lg text-[11px] font-medium text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Mini Map */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary/60" /> 위치
          </h3>
          <DetailMiniMap lat={restaurant.lat} lng={restaurant.lng} name={restaurant.name} />
          <a
            href={`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + " 춘천")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="w-full mt-1">
              네이버지도에서 상세정보 보기 <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </a>
        </div>

        {/* Reviews Section */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-foreground">💬 리뷰 ({restaurant.reviewCount})</h3>
          <ReviewForm restaurantId={restaurant.id} />
          <ReviewList restaurantId={restaurant.id} />
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetail;
