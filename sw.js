/* Talabat GFX Studio offline service worker */
const VERSION = 'gfx-v17';
const CACHE_NAME = `talabat-gfx-${VERSION}`;
const APP_URL = new URL('./Talabat%20GFX%20Studio%20V2.html', self.registration.scope).href;
const ROOT_URL = new URL('./', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(new Request(APP_URL, { cache: 'reload' }));
    if (!response.ok) throw new Error(`Unable to cache app: ${response.status}`);
    await cache.put(APP_URL, response.clone());
    await cache.put(ROOT_URL, response.clone());
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(APP_URL, fresh.clone());
          return fresh;
        }
      } catch (_) {}
      return (await caches.match(APP_URL)) || (await caches.match(ROOT_URL)) ||
        new Response('Offline copy is not cached yet. Open this page once while online.', {
          status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}
        });
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic') {
        (await caches.open(CACHE_NAME)).put(event.request, response.clone());
      }
      return response;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
