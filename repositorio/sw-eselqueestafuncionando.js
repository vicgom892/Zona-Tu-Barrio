// sw.js — Service Worker para Tu Barrio A Un Click
// Versión: v50 — Optimizado para producción con mejoras de performance y estabilidad

const CONFIG = {
  CACHE_VERSION: 'v50',
  CACHES: {
    STATIC: 'static',
    ASSETS: 'assets',
    API: 'api',
    DYNAMIC: 'dynamic',
    BUSINESS: 'business'
  },
  LIMITS: {
    assets: 300,     // Imágenes estáticas comunes
    dynamic: 100,    // Páginas de navegación frecuente
    api: 50,         // APIs con datos semi-estáticos
    business: 20     // Cache mínimo para fallbacks críticos
  },
  TTL: {
    api: 5 * 60 * 1000,     // 5 minutos para APIs
    business: 2 * 60 * 1000, // 2 minutos para negocios
    dynamic: 1 * 60 * 1000,  // 1 minuto para contenido dinámico
    assets: 24 * 60 * 60 * 1000 // 24 horas para assets
  },
  RETRY: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
};

const STATIC_CACHE = `${CONFIG.CACHES.STATIC}-${CONFIG.CACHE_VERSION}`;
const ASSETS_CACHE = `${CONFIG.CACHES.ASSETS}-${CONFIG.CACHE_VERSION}`;
const API_CACHE = `${CONFIG.CACHES.API}-${CONFIG.CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CONFIG.CACHES.DYNAMIC}-${CONFIG.CACHE_VERSION}`;
const BUSINESS_CACHE = `${CONFIG.CACHES.BUSINESS}-${CONFIG.CACHE_VERSION}`;

const CACHE_LIMITS = CONFIG.LIMITS;
const CACHE_TTL = CONFIG.TTL;

// === ARCHIVOS ESENCIALES (precaché optimizado) ===
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

// Imágenes críticas (cache estratégico)
const PRECACHED_IMAGES = [
  '/img/icono-192x192.png',
  '/img/icon-logo.png',
  '/img/icon-abeja-sola.png',
  '/img/banner-1.jpeg',
  '/img/banner-2.jpeg',
  '/img/banner.png',
  '/img/mapa.jpeg',
  '/img/contacto.jpeg',
  '/img/fallback-image.png' // Fallback crítico
];

// Recursos críticos adicionales
const CRITICAL_RESOURCES = [
  '/css/critical.css', // Si existe en tu proyecto
  '/js/essential.js'   // Funcionalidad core mínima
];

// APIs para cache estratégico
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

// Combinar todos los recursos para precaché
const ALL_PRECACHED = [...PRECACHED_URLS, ...PRECACHED_IMAGES, ...CRITICAL_RESOURCES];

// Almacén para timestamps y TTL
const cacheTimestamps = {
  api: {},
  business: {},
  dynamic: {},
  assets: {}
};

// === INSTALL: Precache optimizado con manejo de errores ===
self.addEventListener('install', (event) => {
  log('info', `🚀 Instalando nueva versión: ${CONFIG.CACHE_VERSION}`);
  self.skipWaiting(); // Activación inmediata

  event.waitUntil(
    (async () => {
      try {
        await checkStorageQuota();

        const [staticCache, assetsCache] = await Promise.all([
          caches.open(STATIC_CACHE),
          caches.open(ASSETS_CACHE)
        ]);

        // Precache en paralelo con reintentos
        const results = await Promise.allSettled([
          precacheWithRetry(staticCache, PRECACHED_URLS),
          precacheWithRetry(assetsCache, PRECACHED_IMAGES),
          precacheWithRetry(staticCache, CRITICAL_RESOURCES)
        ]);

        // Reportar resultados
        results.forEach((result, index) => {
          const cacheNames = ['Estáticos', 'Imágenes', 'Críticos'];
          if (result.status === 'fulfilled') {
            const { successful, failed } = result.value;
            log('info', `✅ ${cacheNames[index]}: ${successful.length}/${successful.length + failed.length} exitosos`);
            if (failed.length > 0) {
              log('warn', `❌ ${cacheNames[index]} fallados:`, failed.map(f => f.resource));
            }
          } else {
            log('error', `💥 Error en precaché ${cacheNames[index]}:`, result.reason);
          }
        });

        log('info', '🎯 Instalación completada - Recursos críticos en caché');
      } catch (error) {
        log('error', '💥 Error crítico en install:', error);
        // Continuar incluso con errores
      }
    })()
  );
});

// === ACTIVATE: Limpieza controlada y toma de control ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borrar cachés viejos manteniendo estáticos actuales
      const cacheNames = await caches.keys();
      const currentCaches = [STATIC_CACHE, ASSETS_CACHE];

      const deletionPromises = cacheNames
        .filter(name => !currentCaches.includes(name))
        .map(name => {
          log('info', `🗑️ Borrando caché viejo: ${name}`);
          return caches.delete(name);
        });

      await Promise.all(deletionPromises);

      // Limpiar dinámicos existentes para frescura inicial
      await clearExpiredCaches();

      // Tomar control de todas las pestañas
      await clients.claim();

      log('info', `✅ Activado: ${CONFIG.CACHE_VERSION} - Modo producción optimizado`);

      // Notificar a todas las pestañas
      const clientsList = await clients.matchAll({ type: 'window' });
      clientsList.forEach(client => {
        client.postMessage({ 
          type: 'SW_UPDATED',
          version: CONFIG.CACHE_VERSION,
          message: `¡Nueva versión ${CONFIG.CACHE_VERSION} activa!`,
          forceRefresh: true
        });
      });

      // Iniciar sync inicial en background
      await syncBusinessData();
    })()
  );
});

// === FETCH: Estrategia inteligente con fallbacks ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar no-GET o externas
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;

  // Estrategias específicas por tipo de recurso
  if (isStaticAsset(pathname)) {
    event.respondWith(cacheFirstWithUpdate(request, STATIC_CACHE));
  } else if (isImage(pathname)) {
    event.respondWith(cacheFirstWithCleanup(request, ASSETS_CACHE));
  } else if (isAPI(pathname)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 'api'));
  } else if (isBusinessData(pathname)) {
    event.respondWith(networkFirstWithCache(request, BUSINESS_CACHE, 'business'));
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
      event.waitUntil(refreshContent());
      ports[0]?.postMessage({ type: 'CONTENT_REFRESHED' });
      break;

    case 'PAGE_FOCUS':
      log('info', '🎯 Página focalizada → Refrescando dinámicos');
      event.waitUntil(
        Promise.all([
          clearExpiredCaches(),
          refreshContent()
        ])
      );
      ports[0]?.postMessage({ type: 'CONTENT_REFRESHED' });
      break;

    case 'CHECK_CACHE_FRESHNESS':
      event.waitUntil(checkCacheFreshness());
      ports[0]?.postMessage({ type: 'FRESHNESS_CHECKED' });
      break;

    case 'GET_CACHE_STATS':
      const stats = await getCacheStats();
      ports[0]?.postMessage({ type: 'CACHE_STATS', stats });
      break;
  }
});

// === PUSH NOTIFICATIONS: Con reintentos ===
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
    icon: '/img/icono-192x192.png',
    badge: '/img/icono-192x192.png',
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
      let client = clientsList.find(c => c.url === urlToOpen && 'focus' in c);
      
      if (client) {
        client.focus();
        client.postMessage({ type: 'FORCE_REFRESH' });
      } else {
        const newClient = await clients.openWindow(urlToOpen);
        // Esperar a que el cliente esté listo antes de enviar mensaje
        if (newClient) {
          setTimeout(() => {
            newClient.postMessage({ type: 'FORCE_REFRESH' });
          }, 1000);
        }
      }
    })
  );
});

// === SYNC: Background sync con reintentos exponenciales ===
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-business-data') {
    log('info', '🔄 Background sync iniciado');
    event.waitUntil(syncWithRetry());
  }
});

// === FUNCIONES PRINCIPALES OPTIMIZADAS ===

// Precache con reintentos
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
          
          // Validar JSON
          if (resource.endsWith('.json')) {
            const text = await response.text();
            JSON.parse(text); // Validar sintaxis
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
          break; // Éxito, salir del loop de reintentos
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

// Network First con Cache Fallback y TTL
async function networkFirstWithCache(request, cacheName, type) {
  const url = request.url;
  
  // Verificar si hay versión en caché y si es fresca
  const cached = await caches.match(request);
  const isFresh = await isCacheFresh(url, type);
  
  if (cached && isFresh) {
    log('info', `🗃️ ${type} desde caché (fresco): ${url}`);
    trackCachePerformance(cacheName, true);
    return cached;
  }

  try {
    // Intentar red con reintentos
    const response = await fetchWithRetry(request);
    
    if (response.ok) {
      // Cachear respuesta exitosa
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      updateCacheTimestamp(url, type);
      
      // Aplicar límites de caché
      await limitCacheSize(cacheName, CACHE_LIMITS[type]);
      
      log('info', `🌐 ${type} desde red: ${url}`);
      trackCachePerformance(cacheName, false);
      return response;
    }
    
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    log('warn', `📡 Network falló para ${type}: ${url}`, error);
    
    // Fallback a caché (aunque no sea fresco)
    if (cached) {
      log('info', `🔄 Fallback a caché: ${url}`);
      trackCachePerformance(cacheName, true);
      return cached;
    }
    
    // Fallback específico por tipo
    return createFallbackResponse(request, type);
  }
}

// Cache First con actualización en background
async function cacheFirstWithUpdate(request, cacheName) {
  const cached = await caches.match(request);
  
  if (cached) {
    // Devolver caché inmediatamente
    log('info', `⚡ Estático desde caché: ${request.url}`);
    trackCachePerformance(cacheName, true);
    
    // Actualizar en background si es necesario
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

// Fetch con reintentos exponenciales
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

// === FUNCIONES DE APOYO MEJORADAS ===

// Detección de tipos de recursos
function isStaticAsset(path) {
  return /\.(html|css|js|xml|woff2?|ttf|eot|json)$/i.test(path) || 
         path === '/manifest.json';
}

function isImage(path) {
  return /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path);
}

function isAPI(path) {
  return path.includes('/data/') || path.includes('/datos/');
}

function isBusinessData(path) {
  return path.includes('/comercios') || path.includes('/negocios');
}

// Gestión de TTL y frescura
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

// Limpieza de cachés expirados
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
        log('info', `🧹 Expiró caché: ${url}`);
      }
    }
  }
}

// Limitar tamaño de caché
async function limitCacheSize(cacheName, maxItems) {
  if (maxItems === 0) return;
  
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Ordenar por timestamp (más viejo primero)
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

// Refresh de contenido estratégico
async function refreshContent() {
  log('info', '♻️ Refresh estratégico iniciado');
  
  const refreshPromises = API_ENDPOINTS.map(async (url) => {
    try {
      const response = await fetch(url + '?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        log('info', `🔄 Refrescado: ${url}`);
        // Actualizar caché si es necesario
        const cache = await caches.open(API_CACHE);
        await cache.put(url, response.clone());
        updateCacheTimestamp(url, 'api');
      }
    } catch (error) {
      log('warn', `Refresh falló: ${url}`, error.message);
    }
  });
  
  await Promise.allSettled(refreshPromises);
  await clearExpiredCaches();
  log('info', '♻️ Refresh completado');
}

// Background sync con reintentos
async function syncWithRetry() {
  for (let attempt = 1; attempt <= CONFIG.RETRY.maxRetries; attempt++) {
    try {
      await syncBusinessData();
      log('info', '✅ Background sync exitoso');
      return;
    } catch (error) {
      log('error', `❌ Background sync falló (intento ${attempt}):`, error);
      
      if (attempt === CONFIG.RETRY.maxRetries) {
        throw error;
      }
      
      const delay = Math.min(
        CONFIG.RETRY.baseDelay * Math.pow(2, attempt),
        CONFIG.RETRY.maxDelay
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function syncBusinessData() {
  log('info', '🔄 Sincronizando datos de negocios...');
  await clearExpiredCaches();
  await refreshContent();
}

// Gestión de storage
async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return;
  
  try {
    const { quota, usage } = await navigator.storage.estimate();
    const freeSpace = quota - usage;
    const freeMB = (freeSpace / 1024 / 1024).toFixed(2);
    
    log('info', `💾 Espacio libre: ${freeMB} MB`);
    
    if (freeSpace < 10 * 1024 * 1024) { // <10MB: limpiar
      log('warn', '⚠️ Espacio bajo - Limpiando cachés no críticos');
      await clearExpiredCaches();
    }
  } catch (error) {
    log('error', 'Error checking storage:', error);
  }
}

// Fallbacks específicos
function createFallbackResponse(request, type) {
  const url = new URL(request.url);
  
  switch (type) {
    case 'document':
      return caches.match('/offline.html') || 
             new Response('Servicio no disponible', { status: 503 });
    
    case 'api':
    case 'business':
      return new Response(JSON.stringify([]), { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      });
    
    case 'image':
      return caches.match('/img/fallback-image.png') || 
             new Response('Imagen no disponible', { status: 503 });
    
    default:
      return new Response('Recurso no disponible', { status: 503 });
  }
}

// Métricas y analytics
async function trackCachePerformance(cacheName, hit) {
  const metric = {
    cacheName,
    hit,
    timestamp: Date.now(),
    url: self.location.origin
  };
  
  // Enviar métricas si está disponible
  if ('sendBeacon' in navigator) {
    try {
      navigator.sendBeacon('/api/sw-metrics', JSON.stringify(metric));
    } catch (error) {
      // Silencioso en producción
    }
  }
}

// Estadísticas de caché
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
    version: CONFIG.CACHE_VERSION
  };
}

// Actualización en background
async function updateInBackground(request, cacheName) {
  // Solo actualizar cada 24 horas para estáticos
  const url = request.url;
  const lastUpdated = cacheTimestamps.assets?.[url];
  
  if (lastUpdated && (Date.now() - lastUpdated) < 24 * 60 * 60 * 1000) {
    return;
  }
  
  // Actualizar en background
  fetch(request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response);
      updateCacheTimestamp(url, 'assets');
      log('info', `🔄 Background update: ${url}`);
    }
  }).catch(() => {
    // Silencioso en fallo
  });
}

// Logging optimizado para producción
function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const levels = { 
    info: 'ℹ️', 
    warn: '⚠️', 
    error: '❌' 
  };
  
  // En producción, solo log errors y warnings
  if (self.location.hostname !== 'localhost' && level === 'info') {
    return;
  }
  
  console[level](`[SW ${CONFIG.CACHE_VERSION}] ${timestamp} ${levels[level]} ${message}`, ...args);
  
  // Solo enviar errores críticos al servidor
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
    }).catch(() => {}); // Silencioso en fallo
  }
}

// Cache First con cleanup para imágenes (existente, mejorado)
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
      await limitCacheSize(cacheName, CACHE_LIMITS.assets);
      await cache.put(request, response.clone());
      updateCacheTimestamp(request.url, 'assets');
    }
    return response;
  } catch (error) {
    log('error', `❌ Imagen falló: ${request.url}`, error);
    return caches.match('/img/fallback-image.png') || 
           new Response('', { status: 404 });
  }
}

// Limpieza completa de dinámicos
async function clearAllDynamicCaches() {
  const dynamicCaches = [API_CACHE, DYNAMIC_CACHE, BUSINESS_CACHE];
  
  await Promise.all(
    dynamicCaches.map(async (name) => {
      try {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        await Promise.all(keys.map(key => cache.delete(key)));
        
        // Limpiar timestamps
        const type = name.split('-')[0];
        cacheTimestamps[type] = {};
        
        log('info', `🗑️ Limpiados dinámicos: ${name} (${keys.length} items)`);
      } catch (error) {
        log('warn', `No se pudo limpiar ${name}:`, error);
      }
    })
  );
}

// Verificación de frescura
async function checkCacheFreshness() {
  log('info', '🔍 Verificando frescura de cachés...');
  await clearExpiredCaches();
}

// Inicialización
log('info', '🚀 SW cargado: Modo producción optimizado - Balance entre performance y frescura');

// Health check periódico (cada 30 minutos)
setInterval(() => {
  checkStorageQuota().catch(() => {});
}, 30 * 60 * 1000);