/* 체스 트레이닝 서비스 워커 — 빌드 때 scripts/lib/precachePlugin.ts가 VERSION과 FILES를 앞에 붙여 dist/sw.js로 만든다. */
/* global VERSION, FILES */
const CACHE = `chess-training-${VERSION}`;

// 설치: 앱 화면·엔진·퍼즐/오프닝 데이터를 모두 받아 둔다 (그래야 처음부터 오프라인에서 동작한다)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

// 활성화: 예전 버전 캐시를 지운다
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('chess-training-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 자체는 새 버전을 먼저 시도하고, 오프라인이면 저장해 둔 화면을 쓴다
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ??
          (await cache.match('./', { ignoreVary: true })) ??
          (await cache.match('index.html', { ignoreVary: true })) ??
          Response.error()
        );
      }),
    );
    return;
  }

  // 나머지(이름에 해시가 붙은 JS/CSS, 엔진, 데이터)는 저장본을 먼저 쓴다
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // crossorigin 스크립트 요청에는 Origin 헤더가 붙는데, 서버가 Vary: Origin을 보내면 저장본과 안 맞는다
      const hit = await cache.match(request, { ignoreVary: true });
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') cache.put(request, response.clone());
      return response;
    }),
  );
});
