// sw.js — Service Worker para Tu Barrio A Un Click
// Versión: v41 — ¡Recuerda incrementar esto en cada actualización!

const CONFIG = {
  CACHE_VERSION: 'v47',
  CACHES: {
    STATIC: 'static',
    ASSETS: 'assets',
    API: 'api',
    DYNAMIC: 'dynamic',
    BUSINESS: 'business'
  },
  LIMITS: {
    assets: 500,
    dynamic: 300,
    api: 200,
    business: 300
  },
  TTL: {
    api: 15 * 60 * 1000,
    business: 24 * 60 * 60 * 1000,
    dynamic: 60 * 60 * 1000
  }
};

const STATIC_CACHE = `${CONFIG.CACHES.STATIC}-${CONFIG.CACHE_VERSION}`;
const ASSETS_CACHE = `${CONFIG.CACHES.ASSETS}-${CONFIG.CACHE_VERSION}`;
const API_CACHE = `${CONFIG.CACHES.API}-${CONFIG.CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CONFIG.CACHES.DYNAMIC}-${CONFIG.CACHE_VERSION}`;
const BUSINESS_CACHE = `${CONFIG.CACHES.BUSINESS}-${CONFIG.CACHE_VERSION}`;

// Límites de caché optimizados para +200 comercios
const CACHE_LIMITS = CONFIG.LIMITS;

// Configuración de tiempo de vida para cachés
const CACHE_TTL = CONFIG.TTL;

// === ARCHIVOS ESENCIALES (se precargan en install) ===
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

// Imágenes críticas
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

// Archivos JSON
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

// Todos los archivos para precache
const ALL_PRECACHED = [
  ...PRECACHED_URLS,
  ...PRECACHED_IMAGES,
  ...API_ENDPOINTS
];

// Almacén para rastrear timestamps de caché
const cacheTimestamps = {
  api: {},
  business: {},
  dynamic: {}
};

// === INSTALL: Precachea todo lo esencial ===
self.addEventListener('install', (event) => {
  log('info', `Instalando nueva versión: ${CONFIG.CACHE_VERSION}`);
  //self.skipWaiting(); // Activa inmediatamente si es posible

  event.waitUntil(
    (async () => {
      try {
        await checkStorageQuota();

        const [staticCache, assetsCache, apiCache, businessCache] = await Promise.all([
          caches.open(STATIC_CACHE),
          caches.open(ASSETS_CACHE),
          caches.open(API_CACHE),
          caches.open(BUSINESS_CACHE)
        ]);

        // Precache en paralelo con mejor manejo de errores y batching
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < ALL_PRECACHED.length; i += batchSize) {
          batches.push(ALL_PRECACHED.slice(i, i + batchSize));
        }

        for (const batch of batches) {
          const results = await Promise.allSettled([
            precacheResources(staticCache, batch.filter(url => isStaticAsset(url))),
            precacheResources(assetsCache, batch.filter(url => isImage(url))),
            precacheResources(apiCache, batch.filter(url => isApiRequest(url)))
          ]);

          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              log('warn', `Error en precache grupo ${index}:`, result.reason);
            }
          });

          // Pequeño retraso para no saturar la red
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        log('info', 'Instalación completada. Listo para activar.');
      } catch (error) {
        log('error', 'Error crítico en install:', error);
      }
    })()
  );
});

// === ACTIVATE: Limpia cachés viejos y toma control ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpiar cachés antiguos
      const cacheNames = await caches.keys();
      const currentCaches = [STATIC_CACHE, ASSETS_CACHE, API_CACHE, DYNAMIC_CACHE, BUSINESS_CACHE];

      await Promise.all(
        cacheNames
          .filter(name => !currentCaches.includes(name))
          .map(name => caches.delete(name))
      );

      // Limitar tamaño de cachés actuales
      await Promise.all([
        limitCacheSize(ASSETS_CACHE, CACHE_LIMITS.assets),
        limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS.dynamic),
        limitCacheSize(API_CACHE, CACHE_LIMITS.api),
        limitCacheSize(BUSINESS_CACHE, CACHE_LIMITS.business)
      ]);

      // Tomar control inmediato de las pestañas abiertas
      await clients.claim();

      log('info', `✅ Activado: ${CONFIG.CACHE_VERSION}`);

      // Notificar a todas las ventanas abiertas que el SW está activo
      const clientsList = await clients.matchAll({ type: 'window' });
      clientsList.forEach(client => {
        client.postMessage({ 
          type: 'SW_UPDATED',
          version: CONFIG.CACHE_VERSION,
          message: `Nueva versión ${CONFIG.CACHE_VERSION} instalada. ¡Nuevas promociones disponibles!`
        });
      });
    })()
  );
});

// === FETCH: Estrategia por tipo de recurso ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar solicitudes no-GET o externas
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Clasificar y manejar
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImage(url.pathname)) {
    event.respondWith(cacheFirstWithCleanup(request, ASSETS_CACHE));
  } else if (isApiRequest(url.pathname)) {
    event.respondWith(networkFirstWithTTL(request, API_CACHE, CACHE_TTL.api));
  } else if (isNegocioPage(url.pathname)) {
    event.respondWith(staleWhileRevalidateWithTTL(request, BUSINESS_CACHE, CACHE_TTL.business));
  } else {
    event.respondWith(staleWhileRevalidateWithTTL(request, DYNAMIC_CACHE, CACHE_TTL.dynamic));
  }
});

// === MESSAGE: Comunicación con la app ===
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    log('info', 'Mensaje recibido: SKIP_WAITING → Activando nuevo SW');
    self.skipWaiting();
  } else if (event.data?.type === 'CLEAN_CACHE') {
    event.waitUntil(
      Promise.all([
        limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS.dynamic),
        limitCacheSize(ASSETS_CACHE, CACHE_LIMITS.assets),
        limitCacheSize(BUSINESS_CACHE, CACHE_LIMITS.business)
      ])
    );
  } else if (event.data?.type === 'REFRESH_CONTENT') {
    event.waitUntil(refreshContent());
  } else if (event.data?.type === 'CACHE_BUSINESS_PAGE') {
    event.waitUntil(cacheBusinessPage(event.data.url));
  } else if (event.data?.type === 'PRECACHE_SECONDARY') {
    event.waitUntil(
      precacheResources(await caches.open(ASSETS_CACHE), [
        // Añade recursos secundarios aquí, por ejemplo:
        // '/img/banner-3.jpeg',
        // '/img/secondary-image.png'
      ])
    );
  } else if (event.data?.type === 'CHECK_CACHE_FRESHNESS') {
    event.waitUntil(checkCacheFreshness());
  }
});

// === PUSH NOTIFICATIONS ===
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json() || {};
    if (!data.title) throw new Error('Falta título en la notificación');
  } catch (error) {
    log('error', 'Error en datos de notificación push:', error);
    data = { title: 'Actualización', body: 'Nueva notificación recibida' };
  }

  const options = {
    body: data.body || 'Tienes una nueva actualización',
    icon: '../img/icono-192x192.png',
    badge: '../img/icono-192x192.png',
    data: { 
      url: data.url || '/' 
    },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsList => {
      const client = clientsList.find(c => c.url === urlToOpen && 'focus' in c);
      if (client) return client.focus();
      return clients.openWindow(urlToOpen);
    })
  );
});

// === SYNC: Sincronización en segundo plano ===
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-business-data') {
    event.waitUntil(syncBusinessData());
  }
});

async function syncBusinessData() {
  log('info', 'Sincronizando datos de negocios...');
  // Aquí iría la lógica para sincronizar datos pendientes, por ejemplo, desde IndexedDB al servidor
  // Ejemplo: 
  // const db = await openIndexedDB();
  // const pending = await db.getAll('pendingSync');
  // for (const item of pending) {
  //   await fetch('/api/sync', { method: 'POST', body: JSON.stringify(item) });
  //   await db.delete('pendingSync', item.id);
  // }
}

// === FUNCIONES DE APOYO MEJORADAS ===

// Precache con manejo de errores y validación de JSON
async function precacheResources(cache, resources) {
  const successful = [];
  const failed = [];

  for (const resource of resources) {
    try {
      const response = await fetch(resource, { 
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        let finalResponse = response;
        
        if (resource.endsWith('.json')) {
          const text = await response.text();
          try {
            JSON.parse(text); // Validar JSON
            finalResponse = new Response(text, { 
              status: response.status,
              headers: {
                ...Object.fromEntries(response.headers.entries()),
                'Content-Type': 'application/json'
              }
            });
          } catch (jsonError) {
            log('warn', `JSON inválido: ${resource}`, jsonError);
            continue;
          }
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

  log('info', `✅ Precacheados: ${successful.length}/${resources.length}`);
  if (failed.length > 0) {
    log('warn', `❌ Fallaron: ${failed.length}`, failed);
  }
  
  return { successful, failed };
}

// Detectar tipo de recurso
function isStaticAsset(path) {
  return /\.(html|css|js|xml|woff2?|ttf|eot|json)$/i.test(path);
}

function isImage(path) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path);
}

function isApiRequest(path) {
  return /\.json($|\?)/i.test(path) || path.includes('/api/') || path.startsWith('/data/');
}

function isNegocioPage(path) {
  return (path.startsWith('/negocios/') && path.endsWith('.html')) || 
         (path.includes('negocio') && path.endsWith('.html'));
}

// Estrategia: Cache First (estáticos)
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    log('info', `🗃️ Servido desde caché: ${request.url}`);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      log('info', `🌐 Servido desde red y cacheado: ${request.url}`);
    }
    return response;
  } catch (error) {
    log('error', 'Cache-first falló:', error);
    const fallback = await caches.match('/offline.html');
    return fallback || new Response('Offline', { status: 503 });
  }
}

// Cache First con limpieza automática para imágenes y fallback
async function cacheFirstWithCleanup(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    log('info', `🖼️ Imagen desde caché: ${request.url}`);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Verificar límite antes de guardar
      const keys = await cache.keys();
      if (keys.length >= CACHE_LIMITS.assets) {
        // Eliminar las entradas más antiguas
        const toDelete = keys.slice(0, Math.ceil(CACHE_LIMITS.assets * 0.1)); // Eliminar 10%
        await Promise.all(toDelete.map(key => cache.delete(key)));
      }
      
      await cache.put(request, response.clone());
      log('info', `🖼️ Imagen cacheada: ${request.url}`);
      return response;
    }
    throw new Error('No disponible');
  } catch (error) {
    log('error', `Error al obtener imagen: ${request.url}`, error);
    return caches.match('/img/fallback-image.png') || new Response('Image not available', { status: 503 });
  }
}

// Estrategia: Network First con TTL (APIs)
async function networkFirstWithTTL(request, cacheName, ttl) {
  try {
    const response = await fetch(request.url, { 
      headers: request.headers,
      mode: 'cors',
      cache: 'no-cache'
    });

    if (response.ok && response.headers.get('Content-Type')?.includes('application/json')) {
      const text = await response.clone().text();
      JSON.parse(text); // Validar JSON antes de cachear

      const cache = await caches.open(cacheName);
      
      // Guardar con timestamp
      const timestamp = Date.now();
      const headers = new Headers(response.headers);
      headers.set('x-cache-timestamp', timestamp.toString());
      
      await cache.put(request, new Response(text, {
        status: response.status,
        headers: headers
      }));
      
      // Actualizar timestamp
      cacheTimestamps.api[request.url] = timestamp;
      
      log('info', `🔄 API actualizada: ${request.url}`);
      return new Response(text, response);
    } else {
      throw new Error('Respuesta inválida o no JSON');
    }
  } catch (error) {
    log('error', `Network falló: ${request.url}`, error);
  }

  // Fallback: caché con verificación de TTL
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    const cachedTimestamp = parseInt(cached.headers.get('x-cache-timestamp') || '0');
    const isFresh = (Date.now() - cachedTimestamp) < ttl;
    
    if (isFresh) {
      try {
        const body = await cached.text();
        JSON.parse(body); // Validar JSON
        log('info', `⏳ Sirviendo API desde caché (vigente): ${request.url}`);
        return new Response(body, cached);
      } catch (e) {
        log('warn', `JSON inválido en caché: ${request.url}`);
      }
    } else {
      log('info', `🗑️ Cache expirado para: ${request.url}`);
    }
  }

  // Fallback para navegaciones HTML
  const isHtmlRequest = request.destination === 'document';
  if (isHtmlRequest) {
    const fallback = await caches.match('/offline.html');
    if (fallback) return fallback;
  }

  // Último recurso para JSON: array vacío
  return new Response(JSON.stringify([]), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Estrategia: Stale While Revalidate con TTL (para negocios y dinámicos)
async function staleWhileRevalidateWithTTL(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Verificar si el caché está vigente
  let isFresh = false;
  let cachedTimestamp = 0;
  
  if (cached) {
    cachedTimestamp = parseInt(cached.headers.get('x-cache-timestamp') || '0');
    isFresh = (Date.now() - cachedTimestamp) < ttl;
    
    if (isFresh) {
      log('info', `🗃️ Servido desde caché (vigente): ${request.url}`);
    } else {
      log('info', `🔄 Caché expirado, actualizando: ${request.url}`);
    }
  }

  // Iniciar fetch en segundo plano
  const networkFetch = fetch(request).then(async (res) => {
    if (res.ok) {
      const headers = new Headers(res.headers);
      headers.set('x-cache-timestamp', Date.now().toString());
      
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      
      await cache.put(request, new Response(text, {
        status: res.status,
        headers: headers
      }));
      
      // Actualizar timestamp
      if (cacheName === BUSINESS_CACHE) {
        cacheTimestamps.business[request.url] = Date.now();
      } else if (cacheName === DYNAMIC_CACHE) {
        cacheTimestamps.dynamic[request.url] = Date.now();
      }
      
      log('info', `🌐 Actualizado: ${request.url}`);
      return new Response(text, res);
    }
    return res;
  }).catch(async (error) => {
    log('error', `Error en red para: ${request.url}`, error);
    if (cached && !isFresh) {
      return cached;
    }
    const fallback = await caches.match('/offline.html');
    return fallback || new Response('Offline', { status: 503 });
  });

  // Devolver caché si está vigente, o esperar la red si no
  if (cached && isFresh) {
    return cached;
  }
  
  return networkFetch;
}

// Limitar tamaño de caché con política LRU mejorada
async function limitCacheSize(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxItems) {
      // Obtener timestamps para implementar LRU
      const entriesWithTimestamps = await Promise.all(
        keys.map(async (key) => {
          const response = await cache.match(key);
          const timestamp = response ? parseInt(response.headers.get('x-cache-timestamp') || '0') : 0;
          return { key, timestamp };
        })
      );
      
      // Ordenar por timestamp (más viejo primero)
      entriesWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);
      
      // Eliminar los más viejos
      const toDelete = entriesWithTimestamps
        .slice(0, keys.length - maxItems)
        .map(entry => entry.key);
      
      await Promise.all(toDelete.map(key => cache.delete(key)));
      log('info', `🧹 Limpiado ${toDelete.length} entradas de ${cacheName}`);
    }
  } catch (error) {
    log('error', `Error limpiando ${cacheName}:`, error);
  }
}

// Refrescar contenido manualmente
async function refreshContent() {
  log('info', '♻️ Iniciando refresco de contenido');
  
  const apiCache = await caches.open(API_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);

  const refreshPromises = [
    ...API_ENDPOINTS,
    ...PRECACHED_URLS.filter(url => url.endsWith('.html') || url.endsWith('.css'))
  ].map(async (url) => {
    try {
      const response = await fetch(url + '?t=' + Date.now(), {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const cache = url.includes('.json') ? apiCache : staticCache;
        const headers = new Headers(response.headers);
        headers.set('x-cache-timestamp', Date.now().toString());
        
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        
        await cache.put(url, new Response(text, {
          status: response.status,
          headers: headers
        }));
        
        log('info', `♻️ Actualizado: ${url}`);
      }
    } catch (error) {
      log('warn', `No se pudo refrescar: ${url}`, error);
    }
  });

  await Promise.all(refreshPromises);
  log('info', '♻️ Refresco de contenido completado');
}

// Función específica para cachear páginas de negocios
async function cacheBusinessPage(url) {
  try {
    await checkStorageQuota();
    const cache = await caches.open(BUSINESS_CACHE);
    const response = await fetch(url);
    
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('x-cache-timestamp', Date.now().toString());
      
      const clonedResponse = response.clone();
      const text = await clonedResponse.text();
      
      await cache.put(url, new Response(text, {
        status: response.status,
        headers: headers
      }));
      
      cacheTimestamps.business[url] = Date.now();
      log('info', `🏪 Página de negocio cacheada: ${url}`);
      return true;
    }
  } catch (error) {
    log('error', `Error cacheando página de negocio: ${url}`, error);
  }
  return false;
}

// Función para pre-cachear múltiples negocios
async function precacheBusinessPages(businessPages) {
  log('info', `🏪 Iniciando precache de ${businessPages.length} páginas de negocios`);
  
  const cache = await caches.open(BUSINESS_CACHE);
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const page of businessPages) {
    try {
      const response = await fetch(page);
      if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set('x-cache-timestamp', Date.now().toString());
        
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        
        await cache.put(page, new Response(text, {
          status: response.status,
          headers: headers
        }));
        
        cacheTimestamps.business[page] = Date.now();
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ page, status: response.status });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ page, error: error.message });
    }
  }
  
  log('info', `🏪 Precache completado: ${results.success} exitosos, ${results.failed} fallidos`);
  return results;
}

// Verificar frescura de caché (ETag)
async function checkCacheFreshness() {
  const cache = await caches.open(STATIC_CACHE);
  const keys = await cache.keys();
  for (const request of keys) {
    const cachedResponse = await cache.match(request);
    const etag = cachedResponse.headers.get('ETag');
    if (etag) {
      const response = await fetch(request, { method: 'HEAD' });
      if (response.headers.get('ETag') !== etag) {
        log('info', `Actualizando recurso obsoleto: ${request.url}`);
        await cacheFirst(request, STATIC_CACHE);
      }
    }
  }
}

// Chequeo de cuota de almacenamiento
async function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const { quota, usage } = await navigator.storage.estimate();
    const freeSpace = quota - usage;
    log('info', `Espacio disponible: ${(freeSpace / 1024 / 1024).toFixed(2)} MB`);
    if (freeSpace < 10 * 1024 * 1024) { // Menos de 10MB disponibles
      log('warn', 'Espacio bajo, limpiando cachés antiguos');
      await limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS.dynamic / 2);
      await limitCacheSize(ASSETS_CACHE, CACHE_LIMITS.assets / 2);
    }
  }
}

// Sistema de logging
function log(level, message, ...args) {
  const levels = { info: 'ℹ️', warn: '⚠️', error: '❌' };
  console[level](`[SW] ${levels[level]} ${message}`, ...args);
  // Opcional: Enviar logs críticos a un servidor si está online
  if (level === 'error' && navigator.onLine) {
    fetch('/api/log', {
      method: 'POST',
      body: JSON.stringify({ message, args, timestamp: Date.now() })
    }).catch(() => {});
  }
}

log('info', '💼 Service Worker cargado y optimizado para +200 comercios');