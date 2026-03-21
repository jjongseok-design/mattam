import React from "react";
import type { City } from "@/types/city";

interface CityContextType {
  cityId: string;
  city: City | null;
}

export const CityContext = React.createContext<CityContextType>({
  cityId: "",
  city: null,
});

export const useCityContext = () => React.useContext(CityContext);
