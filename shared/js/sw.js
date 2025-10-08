// shared/js/sw.js — Service Worker Multi-Localidad
// Versión: v60 — Optimizado para estructura multi-localidad

const CONFIG = {
  CACHE_VERSION: 'v60-multi',
  CACHES: {
    STATIC: 'static',
    ASSETS: 'assets',
    API: 'api',
    DYNAMIC: 'dynamic',
    BUSINESS: 'business'
  },
  LIMITS: {
    assets: 300,
    dynamic: 100,
    api: 50,
    business: 20
  },
  TTL: {
    api: 5 * 60 * 1000,
    business: 2 * 60 * 1000,
    dynamic: 1 * 60 * 1000,
    assets: 24 * 60 * 60 * 1000
  },
  RETRY: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  },
  LOCALIDADES: ['castelar', 'ituzaingo', 'moron', 'ciudadela', 'merlo', 'haedo', 'ramos-mejia']
};

const STATIC_CACHE = `${CONFIG.CACHES.STATIC}-${CONFIG.CACHE_VERSION}`;
const ASSETS_CACHE = `${CONFIG.CACHES.ASSETS}-${CONFIG.CACHE_VERSION}`;
const API_CACHE = `${CONFIG.CACHES.API}-${CONFIG.CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CONFIG.CACHES.DYNAMIC}-${CONFIG.CACHE_VERSION}`;
const BUSINESS_CACHE = `${CONFIG.CACHES.BUSINESS}-${CONFIG.CACHE_VERSION}`;

const CACHE_LIMITS = CONFIG.LIMITS;
const CACHE_TTL = CONFIG.TTL;

// === ARCHIVOS ESENCIALES COMPARTIDOS ===
// shared/js/sw.js - Actualiza esta sección:

const SHARED_RESOURCES = [
  // Página de selección de localidad (raíz)
  '/',
  '/index.html',
  '/robots.txt',
  
  // Recursos compartidos - CSS
  '/shared/css/styles.css',
  '/shared/css/fondo.css',
  '/shared/css/negocios.css',
  
  // Recursos compartidos - JS
  '/shared/js/main-2.js',
  '/shared/js/chat-2.js',
  '/shared/js/form.js',
  '/shared/js/install-app.js', 
  '/shared/js/notificaciones.js',
  '/shared/js/search-functionality.js',
  '/shared/js/splash.js',
  '/shared/js/testimonials.js',
  
  // Imágenes compartidas

  '/shared/img/icon-192x192.png',
  '/shared/img/icon-512x512.png'
].filter(Boolean); // Filtra cualquier valor nulo o undefined

// Páginas comunes por localidad (se cachearán dinámicamente)
const LOCALIDAD_PAGES = [
  'index.html',
  'comunidad.html',
  'emprendimientos.html',
  'inscripcion.html',
  'oficios-profeciones.html',
  'offline.html'
];

// APIs por localidad (patrones)
const API_PATTERNS = [
  '/data/',
  '/datos/',
  '/negocios/',
  '/oficios/'
];

// === FUNCIONES DE DETECCIÓN MEJORADAS ===
function isStaticAsset(path) {
  return /\.(html|css|js|xml|woff2?|ttf|eot|json)$/i.test(path) || 
         path === '/manifest.json';
}

function isImage(path) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path);
}

function isAPI(path) {
  return API_PATTERNS.some(pattern => path.includes(pattern));
}

function isBusinessData(path) {
  return path.includes('/comercios') || path.includes('/negocios');
}

function isLocalidadPage(path) {
  return CONFIG.LOCALIDADES.some(localidad => 
    path.startsWith(`/${localidad}/`) && 
    LOCALIDAD_PAGES.some(page => path.endsWith(page))
  );
}

function getLocalidadFromPath(path) {
  const match = path.match(/^\/([^\/]+)\//);
  return match ? match[1] : null;
}

// Almacén para timestamps y TTL
const cacheTimestamps = {
  api: {},
  business: {},
  dynamic: {},
  assets: {}
};

// === INSTALL: Precache de recursos compartidos ===
self.addEventListener('install', (event) => {
  log('info', `🚀 Instalando SW multi-localidad: ${CONFIG.CACHE_VERSION}`);
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      try {
        await checkStorageQuota();

        const [staticCache, assetsCache] = await Promise.all([
          caches.open(STATIC_CACHE),
          caches.open(ASSETS_CACHE)
        ]);

        // Precache solo recursos compartidos
        const results = await Promise.allSettled([
          precacheWithRetry(staticCache, SHARED_RESOURCES.filter(res => !isImage(res))),
          precacheWithRetry(assetsCache, SHARED_RESOURCES.filter(res => isImage(res)))
        ]);

        // Reportar resultados
        results.forEach((result, index) => {
          const cacheTypes = ['Estáticos Compartidos', 'Imágenes Compartidas'];
          if (result.status === 'fulfilled') {
            const { successful, failed } = result.value;
            log('info', `✅ ${cacheTypes[index]}: ${successful.length} exitosos`);
            if (failed.length > 0) {
              log('warn', `❌ ${cacheTypes[index]} fallados:`, failed.map(f => f.resource));
            }
          } else {
            log('error', `💥 Error en precaché ${cacheTypes[index]}:`, result.reason);
          }
        });

        log('info', '🎯 SW multi-localidad instalado - Recursos compartidos en caché');
      } catch (error) {
        log('error', '💥 Error crítico en install:', error);
      }
    })()
  );
});

// === ACTIVATE: Limpieza controlada ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borrar cachés viejos
      const cacheNames = await caches.keys();
      const currentCaches = [STATIC_CACHE, ASSETS_CACHE, API_CACHE, DYNAMIC_CACHE, BUSINESS_CACHE];

      const deletionPromises = cacheNames
        .filter(name => !currentCaches.includes(name))
        .map(name => {
          log('info', `🗑️ Borrando caché viejo: ${name}`);
          return caches.delete(name);
        });

      await Promise.all(deletionPromises);
      await clearExpiredCaches();
      await clients.claim();

      log('info', `✅ SW multi-localidad activado: ${CONFIG.CACHE_VERSION}`);

      // Notificar a todas las pestañas
      const clientsList = await clients.matchAll({ type: 'window' });
      clientsList.forEach(client => {
        client.postMessage({ 
          type: 'SW_UPDATED',
          version: CONFIG.CACHE_VERSION,
          message: `¡Nueva versión ${CONFIG.CACHE_VERSION} activa!`,
          scope: 'multi-localidad'
        });
      });
    })()
  );
});

// === FETCH: Estrategia inteligente multi-localidad ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar no-GET o externas
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;

  // Estrategias específicas por tipo de recurso
  if (isLocalidadPage(pathname)) {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE, 'dynamic'));
  } else if (isStaticAsset(pathname) && pathname.includes('/shared/')) {
    event.respondWith(cacheFirstWithUpdate(request, STATIC_CACHE));
  } else if (isImage(pathname) && pathname.includes('/shared/')) {
    event.respondWith(cacheFirstWithCleanup(request, ASSETS_CACHE));
  } else if (isAPI(pathname)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 'api'));
  } else if (isBusinessData(pathname)) {
    event.respondWith(networkFirstWithCache(request, BUSINESS_CACHE, 'business'));
  } else if (isStaticAsset(pathname)) {
    // Assets específicos de localidad
    event.respondWith(cacheFirstWithUpdate(request, STATIC_CACHE));
  } else if (isImage(pathname)) {
    // Imágenes específicas de localidad
    event.respondWith(cacheFirstWithCleanup(request, ASSETS_CACHE));
  } else {
    // Contenido dinámico genérico
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE, 'dynamic'));
  }
});

// === MESSAGE: Comunicación con el cliente ===
self.addEventListener('message', async (event) => {
  const { data, ports } = event;

  switch (data?.type) {
    case 'SKIP_WAITING':
      log('info', '⏩ SKIP_WAITING recibido → Activando');
      self.skipWaiting();
      break;

    case 'CLEAN_CACHE':
      event.waitUntil(clearAllDynamicCaches());
      ports[0]?.postMessage({ type: 'CACHE_CLEANED' });
      break;

    case 'REFRESH_CONTENT':
      event.waitUntil(refreshLocalidadContent(data.localidad));
      ports[0]?.postMessage({ type: 'CONTENT_REFRESHED' });
      break;

    case 'PAGE_FOCUS':
      log('info', '🎯 Página focalizada → Refrescando contenido');
      event.waitUntil(
        Promise.all([
          clearExpiredCaches(),
          refreshCurrentLocalidadContent()
        ])
      );
      ports[0]?.postMessage({ type: 'CONTENT_REFRESHED' });
      break;

    case 'GET_CACHE_STATS':
      const stats = await getCacheStats();
      ports[0]?.postMessage({ type: 'CACHE_STATS', stats });
      break;
  }
});

// === PUSH NOTIFICATIONS (igual que tu versión) ===
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json() || {};
    if (!data.title) throw new Error('Falta título');
  } catch (error) {
    log('error', 'Error en push:', error);
    data = { 
      title: '¡Novedades disponibles!', 
      body: 'Revisa las nuevas ofertas en tu barrio' 
    };
  }

  const options = {
    body: data.body || 'Refrescando app...',
    icon: '/shared/img/icon-192x192.png',
    badge: '/shared/img/icon-192x192.png',
    data: { url: data.url || '/', forceRefresh: true },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'refresh', title: 'Refresh' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(async clientsList => {
      let client = clientsList.find(c => c.url.includes(urlToOpen) && 'focus' in c);
      
      if (client) {
        client.focus();
        client.postMessage({ type: 'FORCE_REFRESH' });
      } else {
        const newClient = await clients.openWindow(urlToOpen);
        if (newClient) {
          setTimeout(() => {
            newClient.postMessage({ type: 'FORCE_REFRESH' });
          }, 1000);
        }
      }
    })
  );
});

// === FUNCIONES PRINCIPALES ADAPTADAS ===

// Precache con reintentos (igual que tu versión)
async function precacheWithRetry(cache, resources, retries = 2) {
  const successful = [], failed = [];

  for (const resource of resources) {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
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
            JSON.parse(text);
            finalResponse = new Response(text, { 
              status: response.status,
              headers: { 
                'Content-Type': 'application/json',
                'X-Cached': 'true'
              }
            });
          }

          await cache.put(resource, finalResponse.clone());
          successful.push(resource);
          break;
        } else {
          lastError = new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    if (lastError) {
      failed.push({ resource, error: lastError.message });
    }
  }

  return { successful, failed };
}

// Network First con Cache Fallback (adaptada)
async function networkFirstWithCache(request, cacheName, type) {
  const url = request.url;
  
  const cached = await caches.match(request);
  const isFresh = await isCacheFresh(url, type);
  
  if (cached && isFresh) {
    log('info', `🗃️ ${type} desde caché: ${getShortUrl(url)}`);
    trackCachePerformance(cacheName, true);
    return cached;
  }

  try {
    const response = await fetchWithRetry(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      updateCacheTimestamp(url, type);
      
      await limitCacheSize(cacheName, CACHE_LIMITS[type]);
      
      log('info', `🌐 ${type} desde red: ${getShortUrl(url)}`);
      trackCachePerformance(cacheName, false);
      return response;
    }
    
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    log('warn', `📡 Network falló para ${type}: ${getShortUrl(url)}`, error);
    
    if (cached) {
      log('info', `🔄 Fallback a caché: ${getShortUrl(url)}`);
      trackCachePerformance(cacheName, true);
      return cached;
    }
    
    return createFallbackResponse(request, type);
  }
}

// Cache First con actualización (igual)
async function cacheFirstWithUpdate(request, cacheName) {
  const cached = await caches.match(request);
  
  if (cached) {
    log('info', `⚡ Estático desde caché: ${getShortUrl(request.url)}`);
    trackCachePerformance(cacheName, true);
    
    updateInBackground(request, cacheName);
    
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
    return createFallbackResponse(request, 'static');
  }
}

// Cache First para imágenes (igual)
async function cacheFirstWithCleanup(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    log('info', `🖼️ Imagen desde caché: ${getShortUrl(request.url)}`);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await limitCacheSize(cacheName, CACHE_LIMITS.assets);
      await cache.put(request, response.clone());
      updateCacheTimestamp(request.url, 'assets');
    }
    return response;
  } catch (error) {
    log('error', `❌ Imagen falló: ${getShortUrl(request.url)}`, error);
    return caches.match('/shared/img/fallback-image.png') || 
           new Response('', { status: 404 });
  }
}

// === FUNCIONES NUEVAS PARA MULTI-LOCALIDAD ===

// Refresh de contenido específico de localidad
async function refreshLocalidadContent(localidad) {
  if (!localidad) return;
  
  log('info', `♻️ Refresh contenido para: ${localidad}`);
  
  const pagesToRefresh = LOCALIDAD_PAGES.map(page => `/${localidad}/${page}`);
  const refreshPromises = pagesToRefresh.map(async (url) => {
    try {
      const response = await fetch(url + '?t=' + Date.now(), {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.put(url, response.clone());
        updateCacheTimestamp(url, 'dynamic');
        log('info', `🔄 Refrescado: ${url}`);
      }
    } catch (error) {
      log('warn', `Refresh falló: ${url}`, error.message);
    }
  });
  
  await Promise.allSettled(refreshPromises);
}

// Refresh de la localidad actual
async function refreshCurrentLocalidadContent() {
  const clientsList = await clients.matchAll({ type: 'window' });
  for (const client of clientsList) {
    const url = new URL(client.url);
    const localidad = getLocalidadFromPath(url.pathname);
    if (localidad) {
      await refreshLocalidadContent(localidad);
      break;
    }
  }
}

// Helper para URLs cortas en logs
function getShortUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname.length > 30 ? 
    '...' + parsed.pathname.slice(-27) : 
    parsed.pathname;
}

// === FUNCIONES EXISTENTES (mantenidas igual) ===

async function fetchWithRetry(request, options = {}) {
  const { maxRetries = CONFIG.RETRY.maxRetries } = options;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          ...request.headers
        }
      });

      if (response.ok) {
        return response;
      }
      
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxRetries) {
      const delay = Math.min(
        CONFIG.RETRY.baseDelay * Math.pow(2, attempt),
        CONFIG.RETRY.maxDelay
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function isCacheFresh(url, type) {
  const timestamp = cacheTimestamps[type]?.[url];
  if (!timestamp) return false;
  
  const ttl = CACHE_TTL[type] || 0;
  return (Date.now() - timestamp) < ttl;
}

function updateCacheTimestamp(url, type) {
  if (!cacheTimestamps[type]) cacheTimestamps[type] = {};
  cacheTimestamps[type][url] = Date.now();
}

async function clearExpiredCaches() {
  const now = Date.now();
  const cacheNames = [API_CACHE, BUSINESS_CACHE, DYNAMIC_CACHE];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const type = cacheName.split('-')[0];
    
    for (const request of keys) {
      const url = request.url;
      const timestamp = cacheTimestamps[type]?.[url];
      
      if (timestamp && (now - timestamp) > CACHE_TTL[type]) {
        await cache.delete(request);
        delete cacheTimestamps[type]?.[url];
        log('info', `🧹 Expiró caché: ${getShortUrl(url)}`);
      }
    }
  }
}

async function limitCacheSize(cacheName, maxItems) {
  if (maxItems === 0) return;
  
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const sortedKeys = await Promise.all(
      keys.map(async key => {
        const response = await cache.match(key);
        const timestamp = response.headers.get('date') || 
                         cacheTimestamps[cacheName.split('-')[0]]?.[key.url];
        return { key, timestamp: timestamp ? parseInt(timestamp) : 0 };
      })
    );
    
    sortedKeys.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = sortedKeys.slice(0, keys.length - maxItems);
    
    await Promise.all(toDelete.map(({ key }) => cache.delete(key)));
    log('info', `📦 Limitado ${cacheName}: borrados ${toDelete.length}`);
  }
}

function createFallbackResponse(request, type) {
  const url = new URL(request.url);
  
  switch (type) {
    case 'document':
      return caches.match('/shared/offline.html') || 
             new Response('Servicio no disponible', { status: 503 });
    
    case 'api':
    case 'business':
      return new Response(JSON.stringify([]), { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      });
    
    case 'image':
      return caches.match('/shared/img/fallback-image.png') || 
             new Response('Imagen no disponible', { status: 503 });
    
    default:
      return new Response('Recurso no disponible', { status: 503 });
  }
}

async function updateInBackground(request, cacheName) {
  const url = request.url;
  const lastUpdated = cacheTimestamps.assets?.[url];
  
  if (lastUpdated && (Date.now() - lastUpdated) < 24 * 60 * 60 * 1000) {
    return;
  }
  
  fetch(request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response);
      updateCacheTimestamp(url, 'assets');
      log('info', `🔄 Background update: ${getShortUrl(url)}`);
    }
  }).catch(() => {});
}

async function clearAllDynamicCaches() {
  const dynamicCaches = [API_CACHE, DYNAMIC_CACHE, BUSINESS_CACHE];
  
  await Promise.all(
    dynamicCaches.map(async (name) => {
      try {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        await Promise.all(keys.map(key => cache.delete(key)));
        
        const type = name.split('-')[0];
        cacheTimestamps[type] = {};
        
        log('info', `🗑️ Limpiados dinámicos: ${name} (${keys.length} items)`);
      } catch (error) {
        log('warn', `No se pudo limpiar ${name}:`, error);
      }
    })
  );
}

async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return;
  
  try {
    const { quota, usage } = await navigator.storage.estimate();
    const freeSpace = quota - usage;
    const freeMB = (freeSpace / 1024 / 1024).toFixed(2);
    
    log('info', `💾 Espacio libre: ${freeMB} MB`);
    
    if (freeSpace < 10 * 1024 * 1024) {
      log('warn', '⚠️ Espacio bajo - Limpiando cachés no críticos');
      await clearExpiredCaches();
    }
  } catch (error) {
    log('error', 'Error checking storage:', error);
  }
}

async function trackCachePerformance(cacheName, hit) {
  const metric = {
    cacheName,
    hit,
    timestamp: Date.now(),
    url: self.location.origin
  };
  
  if ('sendBeacon' in navigator) {
    try {
      navigator.sendBeacon('/api/sw-metrics', JSON.stringify(metric));
    } catch (error) {}
  }
}

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    stats[name] = keys.length;
  }
  
  return {
    ...stats,
    timestamp: Date.now(),
    version: CONFIG.CACHE_VERSION,
    localidades: CONFIG.LOCALIDADES
  };
}

function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const levels = { 
    info: 'ℹ️', 
    warn: '⚠️', 
    error: '❌' 
  };
  
  if (self.location.hostname !== 'localhost' && level === 'info') {
    return;
  }
  
  console[level](`[SW ${CONFIG.CACHE_VERSION}] ${timestamp} ${levels[level]} ${message}`, ...args);
  
  if (level === 'error' && navigator.onLine) {
    const errorData = {
      message,
      args: args.map(arg => arg.toString()),
      timestamp,
      version: CONFIG.CACHE_VERSION,
      url: self.location.href
    };
    
    fetch('/api/sw-errors', {
      method: 'POST',
      body: JSON.stringify(errorData),
      keepalive: true
    }).catch(() => {});
  }
}

// Health check periódico
setInterval(() => {
  checkStorageQuota().catch(() => {});
}, 30 * 60 * 1000);

log('info', '🚀 SW multi-localidad cargado - Gestionando todas las localidades');