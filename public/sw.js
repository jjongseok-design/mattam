// 맛탐 서비스 워커 v2
// 이 파일은 프로덕션 빌드 시 VitePWA(workbox)가 자동 생성한 파일로 대체됩니다.
// 개발 환경(devOptions.enabled: false)에서는 이 파일이 직접 사용됩니다.
//
// chuncheon-v1 등 구버전 캐시를 보유한 사용자를 위해
// activate 시 모든 캐시를 삭제하도록 설계되었습니다.

const CACHE_NAME = "mattam-v2";

self.addEventListener("install", (event) => {
  // 대기 없이 즉시 활성화 — 구 SW 교체를 빠르게 처리
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // chuncheon-v1, supabase-api, restaurant-images 등 구버전 캐시 전부 삭제
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// fetch 핸들러 없음 — 모든 요청은 네트워크에서 직접 처리
// (Supabase API는 SW 캐시 없이 React Query가 freshness를 관리)
