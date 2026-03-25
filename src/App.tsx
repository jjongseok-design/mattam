import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import CitySelect from "./pages/CitySelect";
import CityMap from "./pages/CityMap";

// 초기 로딩에 불필요한 페이지는 lazy load
const Admin = lazy(() => import("./pages/Admin"));
const Install = lazy(() => import("./pages/Install"));
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const Tour = lazy(() => import("./pages/Tour"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            {/* 도시 선택 초기 화면 */}
            <Route path="/" element={<CitySelect />} />
            {/* 도시별 맛집 지도 */}
            <Route path="/:cityId" element={<CityMap />} />
            <Route path="/:cityId/restaurant/:slug" element={<RestaurantDetail />} />
            <Route path="/:cityId/tour" element={<Tour />} />
            {/* 공통 페이지 */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
