// sw.js en la raíz - Service Worker para la página de selección
const CACHE_NAME = 'barrio-click-selector-v1';
const STATIC_CACHE = 'static-selector-v1';

// Archivos a cachear para la página de selección
const STATIC_FILES = [
  '/',
  '/index.html',
  '/shared/css/styles.css',
  '/shared/js/main-2.js',
  '/shared/img/icon-192x192.png',
  '/shared/img/icon-512x512.png',
  '/shared/img/logo.png'
];

self.addEventListener('install', (event) => {
  console.log('SW Selector instalado');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});