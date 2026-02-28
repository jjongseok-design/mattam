import { Star, MapPin, Phone } from "lucide-react";
import { motion } from "framer-motion";
import type { Restaurant } from "@/hooks/useRestaurants";

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onClick: () => void;
}

const RestaurantCard = ({ restaurant, isSelected, onClick }: RestaurantCardProps) => {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${
        isSelected
          ? "border-primary bg-secondary shadow-card-hover"
          : "border-transparent bg-card hover:shadow-card-hover hover:border-border"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🥟</span>
            <h3 className="font-semibold text-foreground text-base">{restaurant.name}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-md">
          <Star className="h-3.5 w-3.5 text-rating fill-current" />
          <span className="text-sm font-bold text-foreground">{restaurant.rating}</span>
        </div>
      </div>

      {restaurant.description && (
        <p className="text-xs text-muted-foreground mb-2">{restaurant.description}</p>
      )}

      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{restaurant.address}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Phone className="h-3 w-3 flex-shrink-0" />
        <span>{restaurant.phone}</span>
        <span className="ml-auto text-xs">{restaurant.priceRange}</span>
      </div>

      <div className="flex gap-1 flex-wrap mb-2">
        {restaurant.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-muted rounded text-[11px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="text-[11px] text-muted-foreground">
        리뷰 {restaurant.reviewCount.toLocaleString()}개
      </div>
    </motion.button>
  );
};

export default RestaurantCard;
