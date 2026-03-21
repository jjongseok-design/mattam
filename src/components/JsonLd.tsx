import { memo } from "react";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useCityContext } from "@/contexts/CityContext";

const JsonLd = memo(() => {
  const { cityId, city } = useCityContext();
  const { data: restaurants = [] } = useRestaurants(cityId || undefined);
  const cityLabel = city?.name ? `${city.name} ` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `맛탐 · ${cityLabel}맛집지도`,
    description: `${cityLabel}현지인 추천 맛집을 한눈에! 업종별 맛집 검색 지도`,
    url: window.location.origin,
    applicationCategory: "FoodService",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
    aggregateRating: restaurants.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: (restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length).toFixed(1),
          reviewCount: restaurants.reduce((sum, r) => sum + r.reviewCount, 0),
          bestRating: 5,
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
});

JsonLd.displayName = "JsonLd";

export default JsonLd;
