// sw.js
// Bump on every deploy
const CACHE_NAME = 'daily-tracker-v5-shell';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './anime-theme.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './db.js',
  './utils.js',
  './anime.js',
  './quotes.js',
  './app.js',
  './pages/today.js',
  './pages/calendar.js',
  './pages/insights.js',
  './pages/manage.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 3.1: Network-first for index.html, .js, and .css; cache-first for everything else
  const isHtmlOrCode = url.pathname.endsWith('.html') ||
                       url.pathname.endsWith('.js') ||
                       url.pathname.endsWith('.css') ||
                       url.pathname.endsWith('/') ||
                       url.pathname === '';

  if (isHtmlOrCode) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
  }
});
