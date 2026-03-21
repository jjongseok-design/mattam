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
        // Stale-while-revalidate for Supabase API calls
        runtimeCaching: [
          {
            // Supabase REST API — serve cached data instantly, refresh in background
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 24h
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Restaurant images (Supabase Storage / external CDN)
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "restaurant-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30d
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Kakao Maps SDK
            urlPattern: ({ url }) => url.hostname.includes("dapi.kakao.com"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "kakao-sdk",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7d
            },
          },
          {
            // OpenStreetMap tiles (Leaflet fallback)
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
