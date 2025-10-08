// sw.js — Service Worker para Tu Barrio A Un Click
// Versión: v48 — ¡Actualizaciones agresivas para producción! Incrementa en cada deploy.

const CONFIG = {
  CACHE_VERSION: 'v50',
  CACHES: {
    STATIC: 'static',
    ASSETS: 'assets',
    API: 'api',      // No cachea, solo para fallback temporal
    DYNAMIC: 'dynamic', // Borrado continuo
    BUSINESS: 'business' // Network-first puro
  },
  LIMITS: {
    assets: 200,     // Reducido, pero solo para imágenes estáticas
    dynamic: 50,     // Mínimo, se borra constantly
    api: 20,         // Casi nada
    business: 0      // Sin límite, pero no cachea
  },
  TTL: {
    api: 0,          // 0 = siempre red
    business: 0,     // Siempre frescura
    dynamic: 0       // Borrado inmediato
  }
};

const STATIC_CACHE = `${CONFIG.CACHES.STATIC}-${CONFIG.CACHE_VERSION}`;
const ASSETS_CACHE = `${CONFIG.CACHES.ASSETS}-${CONFIG.CACHE_VERSION}`;
const API_CACHE = `${CONFIG.CACHES.API}-${CONFIG.CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CONFIG.CACHES.DYNAMIC}-${CONFIG.CACHE_VERSION}`;
const BUSINESS_CACHE = `${CONFIG.CACHES.BUSINESS}-${CONFIG.CACHE_VERSION}`;

// Límites mínimos para prod (dinámicos se autolimpian)
const CACHE_LIMITS = CONFIG.LIMITS;
const CACHE_TTL = CONFIG.TTL; // Todos a 0 para frescura máxima

// === ARCHIVOS ESENCIALES (solo estáticos se precargan) ===
const PRECACHED_URLS = [
  '/',
  '/index.html',
  '/comunidad.html',
  '/inscripcion.html',
  '/offline.html',
  '/manifest.json',
  '/css/styles.css',
  '/css/negocios.css',
  '/js/main.js',
  '/js/splash.js',
  '/js/chat.js',
  '/js/testimonials.js'
];

// Imágenes críticas (solo estas en caché)
const PRECACHED_IMAGES = [
  '/img/icono-192x192.png',
  '/img/icon-logo.png',
  '/img/icon-abeja-sola.png',
  '/img/banner-1.jpeg',
  '/img/banner-2.jpeg',
  '/img/banner.png',
  '/img/mapa.jpeg',
  '/img/contacto.jpeg'
];

// NO precacheamos APIs/JSONs: siempre red para updates diarios
const API_ENDPOINTS = [
  '/data/promociones.json',
  '/data/panaderias.json',
  '/data/verdulerias.json',
  '/data/fiambrerias.json',
  '/data/veterinarias.json',
  '/data/ferreterias.json',
  '/data/kioscos.json',
  '/data/barberias.json',
  '/data/pastas.json',
  '/data/tiendas.json',
  '/datos/comercios.json'
];

// Solo precaché estáticos
const ALL_PRECACHED = [...PRECACHED_URLS, ...PRECACHED_IMAGES];

// Almacén para timestamps (mínimo uso)
const cacheTimestamps = {
  api: {},
  business: {},
  dynamic: {}
};

// === INSTALL: Precache solo esencial, activa rápido ===
self.addEventListener('install', (event) => {
  log('info', `Instalando nueva versión: ${CONFIG.CACHE_VERSION}`);
  self.skipWaiting(); // ¡Activación inmediata en prod!

  event.waitUntil(
    (async () => {
      try {
        await checkStorageQuota();

        const [staticCache, assetsCache] = await Promise.all([
          caches.open(STATIC_CACHE),
          caches.open(ASSETS_CACHE)
        ]);

        // Precache en paralelo solo estáticos
        const results = await Promise.allSettled([
          precacheResources(staticCache, PRECACHED_URLS),
          precacheResources(assetsCache, PRECACHED_IMAGES)
        ]);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            log('warn', `Error en precache grupo ${index}:`, result.reason);
          }
        });

        log('info', 'Instalación completada. ¡Listo para updates continuos!');
      } catch (error) {
        log('error', 'Error crítico en install:', error);
      }
    })()
  );
});

// === ACTIVATE: Limpia TODO lo dinámico y toma control inmediato ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borrar TODOS los cachés viejos/dinámicos agresivamente
      const cacheNames = await caches.keys();
      const currentCaches = [STATIC_CACHE, ASSETS_CACHE]; // Solo mantén estáticos

      await Promise.all(
        cacheNames
          .filter(name => !currentCaches.includes(name))
          .map(name => {
            log('info', `🗑️ Borrando caché viejo: ${name}`);
            return caches.delete(name);
          })
      );

      // Borrar dinámicos actuales si existen (para frescura)
      await Promise.all([
        clearDynamicCaches([API_CACHE, DYNAMIC_CACHE, BUSINESS_CACHE])
      ]);

      // Tomar control de TODAS las pestañas inmediatamente
      await clients.claim();

      log('info', `✅ Activado: ${CONFIG.CACHE_VERSION} - Modo updates continuos`);

      // Notificar a TODAS las pestañas: ¡Nueva versión!
      const clientsList = await clients.matchAll({ type: 'window' });
      clientsList.forEach(client => {
        client.postMessage({ 
          type: 'SW_UPDATED',
          version: CONFIG.CACHE_VERSION,
          message: `¡Nueva versión ${CONFIG.CACHE_VERSION} activa! Refrescando promociones y negocios...`,
          forceRefresh: true
        });
      });
    })()
  );
});

// === FETCH: Network-first para TODO lo dinámico, cache solo estáticos ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar no-GET o externas
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Clasificar: estáticos cache-first, TODO lo demás network-first sin cache
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImage(url.pathname)) {
    event.respondWith(cacheFirstWithCleanup(request, ASSETS_CACHE));
  } else {
    // ¡TODO lo dinámico/API/negocios: siempre red, sin cache!
    event.respondWith(networkOnlyWithCleanup(request));
  }
});

// === MESSAGE: Refrescos continuos al abrir/focalizar ===
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    log('info', 'SKIP_WAITING recibido → Activando');
    self.skipWaiting();
  } else if (event.data?.type === 'CLEAN_CACHE') {
    event.waitUntil(clearAllDynamicCaches());
  } else if (event.data?.type === 'REFRESH_CONTENT') {
    event.waitUntil(refreshContent());
  } else if (event.data?.type === 'PAGE_FOCUS') {
    // ¡Nuevo! Refresco al abrir/focalizar pestaña o app
    log('info', 'Página focalizada → Refrescando dinámicos');
    event.waitUntil(
      Promise.all([
        clearAllDynamicCaches(),
        refreshContent()
      ])
    );
    // Notifica de vuelta al cliente
    event.ports[0]?.postMessage({ type: 'CONTENT_REFRESHED' });
  } else if (event.data?.type === 'CHECK_CACHE_FRESHNESS') {
    event.waitUntil(checkCacheFreshness());
  }
});

// === PUSH NOTIFICATIONS: Fuerza refresh al click ===
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json() || {};
    if (!data.title) throw new Error('Falta título');
  } catch (error) {
    log('error', 'Error en push:', error);
    data = { title: '¡Update!', body: 'Nuevas ofertas disponibles' };
  }

  const options = {
    body: data.body || 'Refrescando app...',
    icon: '/img/icono-192x192.png',
    badge: '/img/icono-192x192.png',
    data: { url: data.url || '/', forceRefresh: true },
    vibrate: [200, 100, 200],
    actions: [{ action: 'open', title: 'Abrir & Refresh' }]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(async clientsList => {
      let client = clientsList.find(c => c.url === urlToOpen && 'focus' in c);
      if (client) {
        client.focus();
        // Fuerza refresh en el cliente
        client.postMessage({ type: 'FORCE_REFRESH' });
      } else {
        const newClient = await clients.openWindow(urlToOpen);
        newClient?.postMessage({ type: 'FORCE_REFRESH' });
      }
    })
  );
});

// === SYNC: Refresca datos en background ===
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-business-data') {
    event.waitUntil(syncBusinessData());
  }
});

async function syncBusinessData() {
  log('info', 'Sincronizando negocios...');
  await clearAllDynamicCaches(); // Limpia antes de sync
  await refreshContent(); // Fuerza fetch fresco
  // Lógica de sync pendiente aquí (ej: IndexedDB → server)
}

// === FUNCIONES DE APOYO ROBUSTAS ===

// Precache solo para estáticos
async function precacheResources(cache, resources) {
  const successful = [], failed = [];
  for (const resource of resources) {
    try {
      const response = await fetch(resource, { 
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (response.ok) {
        let finalResponse = response;
        if (resource.endsWith('.json')) {
          const text = await response.text();
          JSON.parse(text); // Validar
          finalResponse = new Response(text, { 
            status: response.status,
            headers: { ...Object.fromEntries(response.headers), 'Content-Type': 'application/json' }
          });
        }
        await cache.put(resource, finalResponse.clone());
        successful.push(resource);
      } else {
        failed.push({ resource, status: response.status });
      }
    } catch (error) {
      failed.push({ resource, error: error.message });
    }
  }
  log('info', `✅ Precache: ${successful.length}/${resources.length}`);
  if (failed.length) log('warn', `❌ Fallos: ${failed.length}`, failed);
  return { successful, failed };
}

// Detectores
function isStaticAsset(path) {
  return /\.(html|css|js|xml|woff2?|ttf|eot)$/i.test(path) || path === '/manifest.json';
}

function isImage(path) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path);
}

// Network-only para dinámicos: siempre red, limpia después
async function networkOnlyWithCleanup(request) {
  try {
    const response = await fetch(request, { 
      headers: request.headers,
      mode: 'cors',
      cache: 'no-store' // ¡No cache en red!
    });
    if (response.ok) {
      // Limpia cachés dinámicos después de fetch exitoso (continuo)
      setTimeout(() => clearAllDynamicCaches(), 0);
      log('info', `🌐 Fetch fresco: ${request.url}`);
      return response;
    }
    throw new Error(`Status: ${response.status}`);
  } catch (error) {
    log('error', `Network falló: ${request.url}`, error);
    // Fallback mínimo: offline.html para navegación
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    // Para JSON: array vacío
    if (request.headers.get('Accept')?.includes('json')) {
      return new Response(JSON.stringify([]), { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    return new Response('Error de red', { status: 503 });
  }
}

// Cache-first para estáticos (sin cambios grandes)
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    log('info', `🗃️ Estático desde caché: ${request.url}`);
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    log('error', 'Cache-first falló:', error);
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

// Cache-first con cleanup para imágenes
async function cacheFirstWithCleanup(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await limitCacheSize(cacheName, CACHE_LIMITS.assets);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    log('error', `Imagen falló: ${request.url}`, error);
    return caches.match('/img/fallback-image.png') || new Response('No image', { status: 503 });
  }
}

// Borrado continuo de dinámicos
async function clearAllDynamicCaches() {
  const dynamicCaches = [API_CACHE, DYNAMIC_CACHE, BUSINESS_CACHE];
  await Promise.all(
    dynamicCaches.map(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      await Promise.all(keys.map(key => cache.delete(key)));
      log('info', `🗑️ Limpiados dinámicos: ${name} (${keys.length} items)`);
    })
  );
}

async function clearDynamicCaches(cacheNames) {
  await Promise.all(
    cacheNames.map(name => caches.delete(name).catch(() => log('warn', `No se pudo borrar: ${name}`)))
  );
}

// Limitar solo para assets
async function limitCacheSize(cacheName, maxItems) {
  if (maxItems === 0) return; // No limitar si 0
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
    log('info', `🧹 Limitado ${cacheName}: borrados ${toDelete.length}`);
  }
}

// Refresh agresivo: fetch sin cache + limpia
async function refreshContent() {
  log('info', '♻️ Refresh total iniciado');
  const refreshPromises = [
    ...API_ENDPOINTS,
    ...PRECACHED_URLS.filter(url => !isStaticAsset(url)) // Solo dinámicos
  ].map(async (url) => {
    try {
      const response = await fetch(url + '?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (response.ok) {
        log('info', `♻️ Refrescado: ${url}`);
      }
    } catch (error) {
      log('warn', `Refresh falló: ${url}`, error);
    }
  });
  await Promise.all(refreshPromises);
  await clearAllDynamicCaches(); // Limpia post-refresh
  log('info', '♻️ Refresh completado - Todo fresco');
}

// Check freshness para estáticos (ETag)
async function checkCacheFreshness() {
  const cache = await caches.open(STATIC_CACHE);
  const keys = await cache.keys();
  for (const req of keys) {
    const cached = await cache.match(req);
    const etag = cached?.headers.get('ETag');
    if (etag) {
      const headRes = await fetch(req, { method: 'HEAD' });
      if (headRes.headers.get('ETag') !== etag) {
        log('info', `Actualizando estático: ${req.url}`);
        await cacheFirst(req, STATIC_CACHE);
      }
    }
  }
}

// Chequeo quota agresivo: borra dinámicos si bajo
async function checkStorageQuota() {
  if (navigator.storage?.estimate) {
    const { quota, usage } = await navigator.storage.estimate();
    const freeSpace = quota - usage;
    log('info', `Espacio libre: ${(freeSpace / 1024 / 1024).toFixed(2)} MB`);
    if (freeSpace < 5 * 1024 * 1024) { // <5MB: limpia dinámicos YA
      log('warn', '¡Espacio crítico! Borrando dinámicos');
      await clearAllDynamicCaches();
    }
  }
}

// Logging robusto
function log(level, message, ...args) {
  const levels = { info: 'ℹ️', warn: '⚠️', error: '❌' };
  console[level](`[SW ${CONFIG.CACHE_VERSION}] ${levels[level]} ${message}`, ...args);
  // Logs críticos a server si online
  if (level === 'error' && 'serviceWorker' in navigator && navigator.onLine) {
    fetch('/api/log', {
      method: 'POST',
      body: JSON.stringify({ message, args, timestamp: Date.now(), version: CONFIG.CACHE_VERSION }),
      cache: 'no-store'
    }).catch(() => {});
  }
}

log('info', '💼 SW v49 cargado: Modo producción - Updates continuos y caché mínimo activado');