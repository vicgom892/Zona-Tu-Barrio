
// PRIMERO define la variable
const CACHE_VERSION = 'v60-multi-selector';

// LUES usa la variable en CONFIG
const CONFIG = {
  CACHE_VERSION: CACHE_VERSION,
  CACHE_NAME: `tu-barrio-selector-${CACHE_VERSION}`, // ← Ahora funciona
  TTL: {
    static: 24 * 60 * 60 * 1000 // 24 horas
  }
};

const SELECTOR_RESOURCES = [
  // Página principal del selector
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  
  // Recursos compartidos críticos para el selector
  '/shared/css/styles.css',
  '/shared/js/main-2.js', // Tu main.js actual
  '/shared/js/install-app.js',
  
  // Imágenes del selector
  '/shared/img/icon-192x192.png',
  '/shared/img/icon-512x512.png',
  '/shared/img/icon-abeja-sola.png',
  
  // CDN externos
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  console.log(`🔄 SW Selector ${CONFIG.CACHE_VERSION} instalando...`);
  self.skipWaiting(); // Activar inmediatamente
  
  event.waitUntil(
    caches.open(CONFIG.CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache del selector abierto');
        return cache.addAll(SELECTOR_RESOURCES);
      })
      .catch(error => {
        console.error('❌ Error cacheando recursos del selector:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`✅ SW Selector ${CONFIG.CACHE_VERSION} activado`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Eliminar caches antiguos del selector Y de localidades en la raíz
          if ((cacheName.startsWith('tu-barrio-selector-') || 
               cacheName.startsWith('tu-barrio-app-')) && 
              cacheName !== CONFIG.CACHE_NAME) {
            console.log(`🗑️ Eliminando cache antiguo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;
  
  // ESTRATEGIA: Solo manejar recursos de la RAÍZ y compartidos
  const isSelectorResource = path === '/' || 
                            path === '/index.html' ||
                            path === '/manifest.json' ||
                            path === '/robots.txt';
  
  const isSharedResource = path.includes('/shared/') && 
                          !path.includes('/castelar/') &&
                          !path.includes('/moron/') &&
                          !path.includes('/ituzaingo/');

  if (isSelectorResource || isSharedResource) {
    event.respondWith(
      handleSelectorFetch(event)
    );
  }
  // Para rutas de localidades, NO INTERFERIR - dejar pasar
});

async function handleSelectorFetch(event) {
  const cache = await caches.open(CONFIG.CACHE_NAME);
  
  try {
    // Estrategia: Network First con fallback a cache
    const networkResponse = await fetch(event.request);
    
    // Cachear response exitosa
    if (networkResponse.status === 200) {
      const clone = networkResponse.clone();
      cache.put(event.request, clone);
    }
    
    return networkResponse;
    
  } catch (error) {
    // Fallback a cache
    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback final para HTML
    if (event.request.destination === 'document') {
      return cache.match('/index.html');
    }
    
    throw error;
  }
}

// Manejar el evento beforeinstallprompt para PWA
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('📱 BeforeInstallPrompt event en SW Selector');
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'BEFORE_INSTALL_PROMPT',
          event: event
        });
      });
    })
  );
});

// Mensajes para control de actualizaciones
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});