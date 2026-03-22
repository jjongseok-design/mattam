import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false }, // 개발 환경에서 서비스 워커 비활성화
      includeAssets: ["favicon.ico", "pwa-icon-192.png", "pwa-icon-512.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // 구버전 workbox 프리캐시 자동 삭제
        cleanupOutdatedCaches: true,
        // Supabase API는 SW에서 캐시하지 않음:
        //   - React Query + realtime 구독으로 freshness를 관리
        //   - StaleWhileRevalidate 캐시가 구 데이터를 서빙하면 카테고리 필터·마커 클릭이 깨짐
        runtimeCaching: [
          {
            // OpenStreetMap tiles (Leaflet 폴백용)
            urlPattern: ({ url }) => url.hostname.includes("tile.openstreetmap.org"),
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 14 }, // 14d
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "맛탐 - 도시별 맛집지도",
        short_name: "맛탐",
        description: "도시별 현지인 추천 맛집을 한눈에! 업종별 맛집 검색 지도.",
        theme_color: "#f97316",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
