// sw.js - Service Worker Unificado para Selector y Localidades
// Ubicación: /Zona-Tu-Barrio/sw.js
// Versión: v60-unified

const CACHE_VERSION = 'v60-unified';

const CONFIG = {
  CACHE_VERSION: CACHE_VERSION,
  CACHE_NAME: `tu-barrio-unified-${CACHE_VERSION}`,
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
  LOCALIDADES: ['castelar', 'moron', 'ituzaingo', 'ciudadela', 'merlo', 'haedo', 'ramos-mejia']
};

const STATIC_CACHE = `${CONFIG.CACHES.STATIC}-${CONFIG.CACHE_VERSION}`;
const ASSETS_CACHE = `${CONFIG.CACHES.ASSETS}-${CONFIG.CACHE_VERSION}`;
const API_CACHE = `${CONFIG.CACHES.API}-${CONFIG.CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CONFIG.CACHES.DYNAMIC}-${CONFIG.CACHE_VERSION}`;
const BUSINESS_CACHE = `${CONFIG.CACHES.BUSINESS}-${CONFIG.CACHE_VERSION}`;

// === DETECCIÓN DE CONTEXTO ===
function getAppContext(pathname) {
  const path = pathname || self.location.pathname;
  
  // Si es la raíz o el selector
  if (path === '/Zona-Tu-Barrio/' || path === '/Zona-Tu-Barrio/index.html') {
    return 'selector';
  }
  
  // Detectar localidades
  for (const localidad of CONFIG.LOCALIDADES) {
    if (path.includes(`/${localidad}/`)) {
      return localidad;
    }
  }
  
  return 'selector'; // por defecto
}

const APP_CONTEXT = getAppContext();

// === RECURSOS POR CONTEXTO ===
const SELECTOR_RESOURCES = [
  // Página principal del selector
  '/Zona-Tu-Barrio/',
  '/Zona-Tu-Barrio/index.html',
  '/Zona-Tu-Barrio/manifest.json',
  '/Zona-Tu-Barrio/robots.txt',
  
  // Recursos compartidos críticos para el selector
  '/Zona-Tu-Barrio/shared/css/styles.css',
  '/Zona-Tu-Barrio/shared/css/fondo.css',
  '/Zona-Tu-Barrio/shared/js/main-2.js',
  '/Zona-Tu-Barrio/shared/js/install-app.js',
  
  // Imágenes del selector
  '/Zona-Tu-Barrio/shared/img/icon-192x192.png',
  '/Zona-Tu-Barrio/shared/img/icon-512x512.png',
  '/Zona-Tu-Barrio/shared/img/icon-abeja-sola.png'
];

const SHARED_RESOURCES = [
  // Recursos compartidos entre todas las localidades
  '/Zona-Tu-Barrio/shared/css/styles.css',
  '/Zona-Tu-Barrio/shared/css/fondo.css',
  '/Zona-Tu-Barrio/shared/css/negocios.css',
  
  '/Zona-Tu-Barrio/shared/js/main-2.js',
  '/Zona-Tu-Barrio/shared/js/chat-2.js',
  '/Zona-Tu-Barrio/shared/js/form.js',
  '/Zona-Tu-Barrio/shared/js/install-app.js',
  '/Zona-Tu-Barrio/shared/js/notificaciones.js',
  '/Zona-Tu-Barrio/shared/js/search-functionality.js',
  '/Zona-Tu-Barrio/shared/js/splash.js',
  '/Zona-Tu-Barrio/shared/js/testimonials.js',
  
  '/Zona-Tu-Barrio/shared/img/icon-192x192.png',
  '/Zona-Tu-Barrio/shared/img/icon-512x512.png'
];

// Páginas comunes por localidad
const LOCALIDAD_PAGES = [
  'index.html',
  'comunidad.html',
  'emprendimientos.html',
  'inscripcion.html',
  'oficios-profeciones.html',
  'offline.html'
];

// === FUNCIONES DE DETECCIÓN ===
function isStaticAsset(path) {
  return /\.(html|css|js|xml|woff2?|ttf|eot|json)$/i.test(path) || 
         path === '/Zona-Tu-Barrio/manifest.json';
}

function isImage(path) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path);
}

function isAPI(path) {
  return path.includes('/data/') || path.includes('/datos/') || 
         path.includes('/negocios/') || path.includes('/oficios/');
}

function isBusinessData(path) {
  return path.includes('/comercios') || path.includes('/negocios');
}

function isLocalidadPage(path) {
  return CONFIG.LOCALIDADES.some(localidad => 
    path.startsWith(`/Zona-Tu-Barrio/${localidad}/`) && 
    LOCALIDAD_PAGES.some(page => path.endsWith(page))
  );
}

// Almacén para timestamps
const cacheTimestamps = {
  api: {},
  business: {},
  dynamic: {},
  assets: {}
};

// === INSTALL: Precache según contexto ===
self.addEventListener('install', (event) => {
  log('info', `🚀 Instalando SW Unificado (${APP_CONTEXT}): ${CONFIG.CACHE_VERSION}`);
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      try {
        const [staticCache, assetsCache] = await Promise.all([
          caches.open(STATIC_CACHE),
          caches.open(ASSETS_CACHE)
        ]);

        let resourcesToCache = [];
        
        // Determinar qué recursos cachear según el contexto
        if (APP_CONTEXT === 'selector') {
          resourcesToCache = SELECTOR_RESOURCES;
        } else {
          resourcesToCache = SHARED_RESOURCES;
        }

        const staticResources = resourcesToCache.filter(res => !isImage(res));
        const assetResources = resourcesToCache.filter(res => isImage(res));

        const results = await Promise.allSettled([
          precacheWithRetry(staticCache, staticResources),
          precacheWithRetry(assetsCache, assetResources)
        ]);

        results.forEach((result, index) => {
          const cacheTypes = ['Estáticos', 'Imágenes'];
          if (result.status === 'fulfilled') {
            const { successful, failed } = result.value;
            log('info', `✅ ${cacheTypes[index]} (${APP_CONTEXT}): ${successful.length} exitosos`);
            if (failed.length > 0) {
              log('warn', `❌ ${cacheTypes[index]} fallados:`, failed.map(f => f.resource));
            }
          } else {
            log('error', `💥 Error en precaché ${cacheTypes[index]}:`, result.reason);
          }
        });

        log('info', `🎯 SW Unificado instalado - Contexto: ${APP_CONTEXT}`);
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

      log('info', `✅ SW Unificado activado: ${CONFIG.CACHE_VERSION} (${APP_CONTEXT})`);

      // Notificar a todas las pestañas
      const clientsList = await clients.matchAll({ type: 'window' });
      clientsList.forEach(client => {
        client.postMessage({ 
          type: 'SW_UPDATED',
          version: CONFIG.CACHE_VERSION,
          context: APP_CONTEXT,
          message: `¡Nueva versión ${CONFIG.CACHE_VERSION} activa!`
        });
      });
    })()
  );
});

// === FETCH: Estrategia inteligente unificada ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar no-GET o externas
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;
  const context = getAppContext(pathname);

  // Estrategias específicas por tipo de recurso y contexto
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
    event.respondWith(cacheFirstWithUpdate(request, STATIC_CACHE));
  } else if (isImage(pathname)) {
    event.respondWith(cacheFirstWithCleanup(request, ASSETS_CACHE));
  } else {
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

    case 'GET_CONTEXT':
      ports[0]?.postMessage({ type: 'APP_CONTEXT', context: APP_CONTEXT });
      break;

    case 'REFRESH_CONTENT':
      event.waitUntil(refreshLocalidadContent(data.localidad));
      ports[0]?.postMessage({ type: 'CONTENT_REFRESHED' });
      break;
  }
});

// === PUSH NOTIFICATIONS ===
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

  const context = APP_CONTEXT === 'selector' ? 'tu barrio' : APP_CONTEXT;
  const options = {
    body: data.body || `Nuevas ofertas disponibles en ${context}`,
    icon: '/Zona-Tu-Barrio/shared/img/icon-192x192.png',
    badge: '/Zona-Tu-Barrio/shared/img/icon-192x192.png',
    data: { url: data.url || '/Zona-Tu-Barrio/', forceRefresh: true },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'refresh', title: 'Actualizar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/Zona-Tu-Barrio/';

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

// === FUNCIONES AUXILIARES (las mismas que tenías) ===
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

async function networkFirstWithCache(request, cacheName, type) {
  const url = request.url;
  
  const cached = await caches.match(request);
  const isFresh = await isCacheFresh(url, type);
  
  if (cached && isFresh) {
    log('info', `🗃️ ${type} desde caché: ${getShortUrl(url)}`);
    return cached;
  }

  try {
    const response = await fetchWithRetry(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      updateCacheTimestamp(url, type);
      
      await limitCacheSize(cacheName, CONFIG.LIMITS[type]);
      
      log('info', `🌐 ${type} desde red: ${getShortUrl(url)}`);
      return response;
    }
    
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    log('warn', `📡 Network falló para ${type}: ${getShortUrl(url)}`, error);
    
    if (cached) {
      log('info', `🔄 Fallback a caché: ${getShortUrl(url)}`);
      return cached;
    }
    
    return createFallbackResponse(request, type);
  }
}

async function cacheFirstWithUpdate(request, cacheName) {
  const cached = await caches.match(request);
  
  if (cached) {
    log('info', `⚡ Estático desde caché: ${getShortUrl(request.url)}`);
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
      await limitCacheSize(cacheName, CONFIG.LIMITS.assets);
      await cache.put(request, response.clone());
      updateCacheTimestamp(request.url, 'assets');
    }
    return response;
  } catch (error) {
    log('error', `❌ Imagen falló: ${getShortUrl(request.url)}`, error);
    return caches.match('/Zona-Tu-Barrio/shared/img/fallback-image.png') || 
           new Response('', { status: 404 });
  }
}

// Funciones auxiliares (mantener las que ya tenías)
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
  
  const ttl = CONFIG.TTL[type] || 0;
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
      
      if (timestamp && (now - timestamp) > CONFIG.TTL[type]) {
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
      return caches.match('/Zona-Tu-Barrio/shared/offline.html') || 
             new Response('Servicio no disponible', { status: 503 });
    
    case 'api':
    case 'business':
      return new Response(JSON.stringify([]), { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      });
    
    case 'image':
      return caches.match('/Zona-Tu-Barrio/shared/img/fallback-image.png') || 
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

async function refreshLocalidadContent(localidad) {
  if (!localidad) return;
  
  log('info', `♻️ Refresh contenido para: ${localidad}`);
  
  const pagesToRefresh = LOCALIDAD_PAGES.map(page => `/Zona-Tu-Barrio/${localidad}/${page}`);
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

function getShortUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname.length > 30 ? 
    '...' + parsed.pathname.slice(-27) : 
    parsed.pathname;
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
}

log('info', `🚀 SW Unificado cargado - Contexto: ${APP_CONTEXT} - Controla selector y todas las localidades`);