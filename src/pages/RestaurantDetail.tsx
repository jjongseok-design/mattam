import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Phone, ExternalLink, Share2, Loader2, Utensils, Clock, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRestaurants, type Restaurant } from "@/hooks/useRestaurants";
import { CATEGORY_EMOJI } from "@/data/categoryEmoji";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";
import MapView from "@/components/MapView";
import ErrorState from "@/components/ErrorState";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: restaurants = [], isLoading, isError, refetch } = useRestaurants();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { addViewed } = useRecentlyViewed();

  const restaurant = restaurants.find((r) => r.id === id);

  // Track as recently viewed
  useEffect(() => {
    if (id) addViewed(id);
  }, [id, addViewed]);

  // Update document title & meta for SEO
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

    // JSON-LD
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
      <div className="sticky top-0 z-10 bg-card border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" aria-label="지도로 돌아가기">
            <Button variant="ghost" size="icon" aria-label="뒤로가기">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-sm font-semibold text-foreground truncate">{restaurant.name}</h1>
          <Button variant="ghost" size="icon" onClick={handleShare} aria-label="공유하기">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Map */}
        <div className={`w-full ${isMobile ? "h-48" : "h-64"}`}>
          <MapView
            restaurants={[restaurant]}
            selectedId={restaurant.id}
            onSelect={() => {}}
          />
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Name & Category */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{emoji}</span>
              <div>
                <h2 className="text-xl font-bold text-foreground">{restaurant.name}</h2>
                <span className="text-sm text-muted-foreground">{restaurant.category}</span>
              </div>
            </div>
            {restaurant.description && (
              <p className="text-sm text-muted-foreground mt-2">{restaurant.description}</p>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-2xl">
            <div className="flex items-center gap-1.5">
              <Star className="h-5 w-5 text-rating fill-current" />
              <span className="text-2xl font-bold text-foreground">{restaurant.rating}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              리뷰 {restaurant.reviewCount.toLocaleString()}개
            </div>
            {restaurant.priceRange && (
              <div className="ml-auto text-sm font-medium text-foreground/70">
                {restaurant.priceRange}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-primary/60 flex-shrink-0" />
              <span className="text-foreground">{restaurant.address}</span>
            </div>
            {restaurant.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-primary/60 flex-shrink-0" />
                <a href={`tel:${restaurant.phone}`} className="text-foreground hover:text-primary transition-colors">
                  {restaurant.phone}
                </a>
              </div>
            )}
            {restaurant.openingHours && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-primary/60 flex-shrink-0" />
                <span className="text-foreground">{restaurant.openingHours}</span>
              </div>
            )}
            {restaurant.closedDays && (
              <div className="flex items-center gap-3 text-sm">
                <CalendarOff className="h-4 w-4 text-primary/60 flex-shrink-0" />
                <span className="text-foreground">{restaurant.closedDays}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {restaurant.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {restaurant.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-muted rounded-lg text-sm font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <a
              href={`https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name + " 춘천")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                네이버지도 <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </a>
            <Button onClick={handleShare} className="flex-1">
              <Share2 className="h-3.5 w-3.5 mr-1.5" /> 공유하기
            </Button>
          </div>

          {/* Reviews Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-bold text-foreground">💬 리뷰</h3>
            <ReviewForm restaurantId={restaurant.id} />
            <ReviewList restaurantId={restaurant.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetail;
