// main.js - Versión completa optimizada para multi-localidad
document.addEventListener('DOMContentLoaded', function() {
  // --- DETECCIÓN AUTOMÁTICA DE LOCALIDAD ---
  const getCurrentLocation = () => {
    const path = window.location.pathname;
    if (path.includes('/castelar/')) return 'castelar';
    if (path.includes('/ituzaingo/')) return 'ituzaingo';
    if (path.includes('/moron/')) return 'moron';
    if (path.includes('/ciudadela/')) return 'ciudadela';
    if (path.includes('/merlo/')) return 'merlo';
    if (path.includes('/haedo/')) return 'haedo';
    if (path.includes('/ramos-mejia/')) return 'ramos-mejia';
    return 'castelar'; // default
  };

  const CURRENT_LOCATION = getCurrentLocation();
  
  // --- CONSTANTES GLOBALES ---
  const CACHE_KEY = `businesses_cache_${CURRENT_LOCATION}_v5`;
  const CONFIG = {
    APP_VERSION: 'v50',
    MAX_ACCURACY: 15,
    MAX_ATTEMPTS: 10,
    MAX_TIMEOUT: 30000,
    CACHE_TTL: 24 * 60 * 60 * 1000,
    DEBOUNCE_DELAY: 300,
    MAP_OPTIONS: {
      center: getMapCenter(CURRENT_LOCATION),
      zoom: 13,
      scrollWheelZoom: false,
      touchZoom: true,
      dragging: true,
      zoomControl: true,
      preferCanvas: true
    }
  };

  // Centro del mapa por localidad
  function getMapCenter(location) {
    const centers = {
      'castelar': [-34.652, -58.643],
      'ituzaingo': [-34.658, -58.668],
      'moron': [-34.653, -58.620],
      'ciudadela': [-34.635, -58.536],
      'merlo': [-34.665, -58.729],
      'haedo': [-34.642, -58.592],
      'ramos-mejia': [-34.651, -58.562]
    };
    return centers[location] || [-34.652, -58.643];
  }

  // --- VARIABLES GLOBALES ---
  let deferredPrompt = null;
  window.businesses = [];
  window.map = null;
  window.userMarker = null;
  window.userAccuracyCircle = null;
  window.mapInitialized = false;
  let setupComplete = false;
  let isMapReady = false;
  let businessListContainer = null;
  let updateBusinessListDebounced;
  let businessIndex = null;
  let loadedSections = 0;

  // --- SECCIONES DE NEGOCIOS ---
  const secciones = {
    panaderias: 'panaderias.json',
    pastas: 'pastas.json',
    verdulerias: 'verdulerias.json',
    fiambrerias: 'fiambrerias.json',
    kioscos: 'kioscos.json',
    mascotas: 'mascotas.json',
    barberias: 'barberias.json',
    ferreterias: 'ferreterias.json',
    ropa: 'tiendas.json',
    veterinarias: 'veterinarias.json',
    carnicerias: 'carnicerias.json',
    profesiones: 'profesiones.json',
    farmacias: 'farmacias.json',
    cafeterias: 'cafeterias.json',
    talleres: 'talleres.json',
    librerias: 'librerias.json',
    mates: 'mates.json',
    florerias: 'florerias.json',
    comida: 'comidas.json',
    granjas: 'granja.json',
    muebles: 'muebles.json',
    uñas: 'uñas.json'
  };
  const totalSections = Object.keys(secciones).length;

  // --- SERVICE WORKER OPTIMIZADO ---
  function initializeServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker no soportado');
      return;
    }

    const swUrl = `./sw-1.js?v=${CONFIG.APP_VERSION}`;
    
    navigator.serviceWorker.register(swUrl, {
      updateViaCache: 'none',
      scope: '/'
    }).then(registration => {
      console.log(`✅ SW registrado para ${CURRENT_LOCATION}:`, CONFIG.APP_VERSION);
      setupSWUpdateHandling(registration);
    }).catch(err => {
      console.error('❌ Error en SW:', err);
    });
  }

  function setupSWUpdateHandling(registration) {
    const checkForUpdates = () => {
      if (registration.waiting) {
        showUpdateModal(registration);
      }
    };

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          checkForUpdates();
        }
      });
    });

    checkForUpdates();
    setInterval(() => registration.update(), 10 * 60 * 1000);
  }

  // --- GESTIÓN DE ACTUALIZACIONES ---
  function showUpdateModal(registration) {
    const modalShownKey = `update_modal_shown_${CONFIG.APP_VERSION}`;
    if (sessionStorage.getItem(modalShownKey)) return;

    const modal = document.getElementById('update-modal');
    if (!modal) return;

    modal.style.display = 'flex';

    const cleanup = () => {
      modal.style.display = 'none';
      document.getElementById('update-now')?.removeEventListener('click', handleUpdate);
      document.getElementById('update-later')?.removeEventListener('click', handleLater);
      modal.removeEventListener('click', handleOutsideClick);
    };

    const handleUpdate = () => {
      sessionStorage.setItem(modalShownKey, 'true');
      cleanup();
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      setTimeout(() => window.location.reload(), 1000);
    };

    const handleLater = () => cleanup();
    const handleOutsideClick = (e) => e.target === modal && cleanup();

    document.getElementById('update-now')?.addEventListener('click', handleUpdate);
    document.getElementById('update-later')?.addEventListener('click', handleLater);
    modal.addEventListener('click', handleOutsideClick);
  }

  // --- COMUNICACIÓN CON SERVICE WORKER ---
  function setupSWCommunication() {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { data } = event;
      switch (data.type) {
        case 'SW_UPDATED':
          console.log('🔄 Nueva versión:', data.message);
          mostrarToast('¡Nueva versión disponible!', 'info');
          if (data.forceRefresh) {
            setTimeout(() => window.location.reload(), 2000);
          }
          break;
        case 'CONTENT_REFRESHED':
          console.log('✅ Contenido refrescado');
          refreshBusinessData();
          break;
        case 'FORCE_REFRESH':
          window.location.reload();
          break;
      }
    });

    function sendPageFocus() {
      navigator.serviceWorker.controller.postMessage({ 
        type: 'PAGE_FOCUS',
        location: CURRENT_LOCATION
      });
    }

    sendPageFocus();
    window.addEventListener('focus', sendPageFocus);
  }

  // --- SISTEMA DE TOAST MEJORADO ---
  function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    const existingToast = document.getElementById('toastConsumidor');
    if (existingToast) existingToast.remove();

    const icons = {
      info: 'fa-info-circle',
      success: 'fa-check-circle',
      warning: 'fa-exclamation-triangle',
      error: 'fa-exclamation-circle'
    };

    const toast = document.createElement('div');
    toast.id = 'toastConsumidor';
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
      <i class="fas ${icons[tipo]}"></i>
      <span>${mensaje}</span>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duracion);
  }

  // --- VERIFICACIÓN DE HORARIOS OPTIMIZADA ---
  function isBusinessOpen(hoursString) {
    if (!hoursString) return true;
    
    try {
      const normalized = hoursString.trim().toLowerCase();
      if (normalized.includes('24 horas') || normalized.includes('24h')) return true;
      if (normalized.includes('cerrado')) return false;
      
      const now = new Date();
      const currentDay = now.toLocaleString("es-AR", { 
        timeZone: "America/Argentina/Buenos_Aires",
        weekday: "short" 
      }).toLowerCase().slice(0, 3);

      const currentTime = now.getHours() + now.getMinutes() / 60;
      const dayMap = {
        'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0,
        'lun': 1, 'mar': 2, 'mie': 3, 'jue': 4, 'vie': 5, 'sab': 6, 'dom': 0
      };

      return processTimeRanges(normalized, currentDay, currentTime, dayMap);
      
    } catch (error) {
      console.error("Error en isBusinessOpen:", error);
      return true;
    }
  }

  function processTimeRanges(schedule, currentDay, currentTime, dayMap) {
    const ranges = schedule.split(',');
    for (const range of ranges) {
      if (checkTimeRange(range.trim(), currentDay, currentTime, dayMap)) {
        return true;
      }
    }
    return false;
  }

  function checkTimeRange(range, currentDay, currentTime, dayMap) {
    const patterns = [
      /(mon|tue|wed|thu|fri|sat|sun|lun|mar|mie|jue|vie|sab|dom)-((mon|tue|wed|thu|fri|sat|sun|lun|mar|mie|jue|vie|sab|dom))\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
      /^(mon|tue|wed|thu|fri|sat|sun|lun|mar|mie|jue|vie|sab|dom)\b.*?(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
      /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/
    ];

    for (const pattern of patterns) {
      const match = range.match(pattern);
      if (match) {
        if (match[1] && dayMap[match[1].toLowerCase()]) {
          return checkDayRangeMatch(match, currentDay, currentTime, dayMap);
        } else {
          return checkTimeOnlyMatch(match, currentTime);
        }
      }
    }

    return true;
  }

  function checkDayRangeMatch(match, currentDay, currentTime, dayMap) {
    const startDay = dayMap[match[1].toLowerCase()];
    const endDay = dayMap[match[2].toLowerCase()];
    const currentDayNum = dayMap[currentDay];

    if (!isDayInRange(currentDayNum, startDay, endDay)) return false;

    const startTime = match[4] || match[2];
    const endTime = match[5] || match[3];
    const [start, end] = parseTimeRange(startTime, endTime);
    
    return isTimeInRange(currentTime, start, end);
  }

  function isDayInRange(current, start, end) {
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      return current >= start || current <= end;
    }
  }

  function parseTimeRange(startStr, endStr) {
    const [startHour, startMinute] = startStr.split(":").map(Number);
    const [endHour, endMinute] = endStr.split(":").map(Number);
    return [
      startHour + startMinute / 60,
      endHour + endMinute / 60
    ];
  }

  function isTimeInRange(current, start, end) {
    const isOvernight = end < start;
    if (isOvernight) {
      return current >= start || current <= end;
    } else {
      return current >= start && current <= end;
    }
  }

  function checkTimeOnlyMatch(match, currentTime) {
    const startStr = match[1];
    const endStr = match[2];
    const [start, end] = parseTimeRange(startStr, endStr);
    return isTimeInRange(currentTime, start, end);
  }

  // --- CARGAR SECCIONES DE NEGOCIOS ---
  async function cargarSeccion(rubro) {
    const url = `data/${secciones[rubro]}`;
    const contenedor = await waitForElement(`#${rubro} .row`, 2000);

    if (!contenedor) {
      console.error(`❌ Contenedor no encontrado: ${rubro}`);
      loadedSections++;
      checkInitialization();
      return;
    }

    try {
      const response = await fetchWithTimeout(url, { timeout: 5000 });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const negocios = await response.json();
      await renderBusinessSection(rubro, negocios, contenedor);
      
    } catch (error) {
      console.error(`Error cargando ${rubro}:`, error);
      contenedor.innerHTML = '<div class="col-12"><p class="text-center text-danger">Error al cargar negocios.</p></div>';
      loadedSections++;
      checkInitialization();
    }
  }

  async function renderBusinessSection(rubro, negocios, contenedor) {
    // Almacenar en formato para el mapa
    negocios.forEach(negocio => {
      window.businesses.push({
        name: negocio.nombre,
        category: rubro,
        hours: negocio.horarioData || negocio.horario,
        address: negocio.direccion || "",
        image: negocio.imagen,
        url: negocio.pagina,
        latitude: negocio.latitud || negocio.latitude || negocio.lat || null,
        longitude: negocio.longitud || negocio.longitude || negocio.lng || null,
        telefono: negocio.telefono,
        whatsapp: negocio.whatsapp,
        promo: negocio.promo
      });
    });

    const limit = 6;
    const initialNegocios = negocios.slice(0, limit);
    const cardsHTML = initialNegocios.map(negocio => crearTarjetaNegocio(negocio)).join('');
    
    contenedor.innerHTML = cardsHTML;
    setupLoadMoreButton(rubro, negocios, contenedor, limit);
    
    loadedSections++;
    checkInitialization();
  }

  function crearTarjetaNegocio(negocio) {
    return `
      <div class="col-4 col-md-3">
        <div class="card card-small h-100 shadow-sm business-card" data-aos="fade-up">
          <img 
            src="${negocio.imagen}" 
            alt="${negocio.nombre}" 
            loading="lazy" 
            class="card-img-top clickable-image"
            data-bs-toggle="modal"
            data-bs-target="#businessModal"
            data-business='${JSON.stringify(negocio).replace(/'/g, "&#x27;")}'
          />
          <div class="card-body text-center py-2">
            <h5 class="card-title mb-0">${negocio.nombre}</h5>
          </div>
        </div>
      </div>
    `;
  }

  function setupLoadMoreButton(rubro, negocios, contenedor, limit) {
    const rubroToSpanish = {
      'panaderias': 'Panadería', 'pastas': 'Pastas', 'verdulerias': 'Verdulería',
      'fiambrerias': 'Fiambrería', 'kioscos': 'Kioscos', 'mascotas': 'Mascotas',
      'barberias': 'Barbería', 'ferreterias': 'Ferretería', 'ropa': 'Ropa',
      'veterinarias': 'Veterinaria', 'carnicerias': 'Carnicería', 'profesiones': 'Profesiones',
      'farmacias': 'Farmacia', 'cafeterias': 'Cafetería', 'talleres': 'Talleres',
      'librerias': 'Librerías', 'mates': 'Mates', 'florerias': 'Florería',
      'comidas': 'Comida', 'granjas': 'Granjas', 'muebles': 'Muebles', 'uñas': 'Uñas'
    };

    const spanishName = rubroToSpanish[rubro] || rubro.charAt(0).toUpperCase() + rubro.slice(1);
    let loadMoreBtn = document.querySelector(`[data-category="${spanishName}"]`) ||
                     document.querySelector(`#loadMore${rubro.charAt(0).toUpperCase() + rubro.slice(1)}`) ||
                     document.getElementById(rubro)?.querySelector('.load-more-btn');

    if (!loadMoreBtn) {
      const section = document.getElementById(rubro);
      const buttonContainer = section?.querySelector('.text-center.mt-4');
      if (buttonContainer) {
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'btn btn-outline-primary load-more-btn z-10';
        loadMoreBtn.setAttribute('data-category', spanishName);
        buttonContainer.appendChild(loadMoreBtn);
      }
    }

    if (loadMoreBtn) {
      loadMoreBtn.style.display = negocios.length > limit ? 'inline-block' : 'none';
      loadMoreBtn.innerHTML = `Cargar más ${rubro.slice(0, -1)}${rubro.endsWith('s') ? 'as' : 's'}`;
      loadMoreBtn.dataset.currentIndex = limit;
      loadMoreBtn.dataset.isLoading = 'false';

      const loadMoreHandler = () => {
        if (loadMoreBtn.dataset.isLoading === 'true') return;
        
        const currentIndex = parseInt(loadMoreBtn.dataset.currentIndex);
        if (currentIndex >= negocios.length) return;

        loadMoreBtn.dataset.isLoading = 'true';
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Cargando...';

        setTimeout(() => {
          const nextIndex = currentIndex + 6;
          const nextBatch = negocios.slice(currentIndex, nextIndex);
          
          if (nextBatch.length > 0) {
            const newCardsHTML = nextBatch.map(negocio => crearTarjetaNegocio(negocio)).join('');
            contenedor.insertAdjacentHTML('beforeend', newCardsHTML);
            loadMoreBtn.dataset.currentIndex = nextIndex;
            
            const buttonText = `Cargar más ${rubro.slice(0, -1)}${rubro.endsWith('s') ? 'as' : 's'}`;
            loadMoreBtn.innerHTML = buttonText;
            loadMoreBtn.disabled = false;
            
            if (nextIndex >= negocios.length) {
              loadMoreBtn.style.display = 'none';
            }
          }
          
          loadMoreBtn.dataset.isLoading = 'false';
        }, 300);
      };

      // Remover event listeners previos y agregar nuevo
      loadMoreBtn.replaceWith(loadMoreBtn.cloneNode(true));
      const newBtn = document.querySelector(`[data-category="${spanishName}"]`);
      newBtn.addEventListener('click', loadMoreHandler);
    }
  }

  // --- GESTIÓN DE CACHÉ ---
  function loadBusinessesFromCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return false;

      const { data, timestamp } = JSON.parse(cached);
      
      if (!data || !Array.isArray(data)) {
        localStorage.removeItem(CACHE_KEY);
        return false;
      }

      if (Date.now() - timestamp > CONFIG.CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return false;
      }

      console.log(`✅ ${data.length} negocios desde caché (${CURRENT_LOCATION})`);
      window.businesses = data;
      createBusinessIndex(data);
      return true;

    } catch (error) {
      console.error('Error cargando caché:', error);
      localStorage.removeItem(CACHE_KEY);
      return false;
    }
  }

  function saveBusinessesToCache(businesses) {
    try {
      const cacheData = {
        data: businesses,
        timestamp: Date.now(),
        version: CONFIG.APP_VERSION,
        location: CURRENT_LOCATION
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('No se pudo guardar en caché:', error);
    }
  }

  // --- SISTEMA DE BÚSQUEDA MEJORADO ---
  window.searchBusinesses = function() {
    const searchInput = document.getElementById("searchInput");
    const modalBody = document.getElementById("searchModalBody");
    const loading = document.querySelector(".loading-overlay");
    
    if (!searchInput || !modalBody || !loading) return;

    const query = searchInput.value.trim();
    if (!query) {
      modalBody.innerHTML = "<p class='text-center text-muted py-4'>Ingresa un término de búsqueda.</p>";
      new bootstrap.Modal(document.getElementById("searchModal")).show();
      return;
    }

    loading.style.display = "flex";

    setTimeout(() => {
      const results = performSearch(query);
      displaySearchResults(results, modalBody, loading);
    }, 50);
  };

  function performSearch(query) {
    const normalizedQuery = normalizeText(query);
    
    // Detección de categorías especiales
    const specialCategory = detectSpecialCategory(normalizedQuery);
    if (specialCategory) {
      return { special: true, category: specialCategory };
    }

    // Búsqueda normal
    return window.businesses.filter(business => {
      return matchesSearch(business, normalizedQuery);
    }).filter(b => isBusinessOpen(b.hours));
  }

  function detectSpecialCategory(query) {
    const oficiosKeywords = ['albañil', 'electricista', 'plomero', 'fontanero', 'cerrajero', 'herrero', 'jardinero', 'limpieza', 'mecánico', 'pintor', 'transporte', 'flete'];
    const emprendimientosKeywords = ['artesanía', 'artesanal', 'moda', 'tecnología', 'belleza', 'educación', 'hogar', 'mascotas', 'gastronomía', 'comida casera', 'catering', 'pastelería', 'manualidades', 'cursos', 'talleres', 'decoración', 'ropa artesanal'];

    if (oficiosKeywords.some(kw => query.includes(kw))) return 'oficios';
    if (emprendimientosKeywords.some(kw => query.includes(kw))) return 'emprendimientos';
    
    return null;
  }

  function matchesSearch(business, query) {
    const fields = ['name', 'category', 'address'];
    return fields.some(field => 
      business[field] && normalizeText(business[field]).includes(query)
    );
  }

  function displaySearchResults(results, modalBody, loading) {
    loading.style.display = "none";

    if (results.special) {
      modalBody.innerHTML = getSpecialCategoryHTML(results.category);
    } else if (results.length > 0) {
      modalBody.innerHTML = results.map(business => createResultCard(business)).join('');
    } else {
      modalBody.innerHTML = getNoResultsHTML();
    }

    new bootstrap.Modal(document.getElementById("searchModal")).show();
  }

  function createResultCard(business) {
    const isOpen = isBusinessOpen(business.hours);
    return `
      <div class="result-card animate-fade-in-up">
        <img src="${business.image || 'https://placehold.co/300x200/cccccc/666666?text=Sin+imagen'}" 
             alt="${business.name}" 
             class="result-card-img w-100">
        <div class="result-card-body">
          <h5 class="result-card-title">${business.name}</h5>
          <div class="result-card-category">
            <i class="fas fa-tag"></i> ${business.category}
          </div>
          <p class="result-card-info">
            <i class="fas fa-map-marker-alt"></i> ${business.address || 'Dirección no disponible'}
          </p>
          <p class="result-card-hours">
            <i class="fas fa-clock"></i> ${business.hours}
            <span class="badge ${isOpen ? 'bg-success' : 'bg-danger'} ms-2">
              ${isOpen ? 'Abierto' : 'Cerrado'}
            </span>
          </p>
          <div class="result-card-buttons">
            <button class="result-btn btn-whatsapp" 
                    onclick="openWhatsApp('${business.whatsapp || '5491157194796'}')"
                    ${!isOpen ? 'disabled' : ''}>
              <i class="fab fa-whatsapp"></i> WhatsApp
            </button>
            <button class="result-btn btn-website"
                    onclick="openWebsite('${business.url || '#'}')">
              <i class="fas fa-globe"></i> Web
            </button>
            <button class="result-btn btn-location"
                    onclick="openMap(${business.latitude}, ${business.longitude})">
              <i class="fas fa-map-marker-alt"></i> Ubicación
            </button>
            <button class="result-btn btn-contact"
                    onclick="callPhone('${business.telefono || ''}')">
              <i class="fas fa-phone"></i> Llamar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function getSpecialCategoryHTML(category) {
    if (category === 'oficios') {
      return `
        <div class="text-center p-4">
          <i class="fas fa-hard-hat fa-2x text-primary mb-3"></i>
          <h5>¿Buscás un oficio?</h5>
          <p class="text-muted">Albañiles, electricistas, plomeros y más.</p>
          <a href="oficios.html" class="btn btn-primary">Ver oficios disponibles</a>
        </div>
      `;
    } else {
      return `
        <div class="text-center p-4">
          <i class="fas fa-lightbulb fa-2x text-warning mb-3"></i>
          <h5>¿Buscás emprendimientos?</h5>
          <p class="text-muted">Gastronomía, artesanía, moda y más.</p>
          <a href="emprendimientos.html" class="btn btn-warning">Explorar emprendimientos</a>
        </div>
      `;
    }
  }

  function getNoResultsHTML() {
    return `
      <div class="text-center text-muted py-4">
        <i class="fas fa-search fa-2x mb-3" style="color: #dc3545;"></i>
        <p class="mb-0">No se encontraron negocios abiertos con ese criterio.</p>
      </div>
    `;
  }

  // --- FUNCIONES GLOBALES PARA BOTONES ---
  window.openWhatsApp = function(whatsapp) {
    window.open(`https://wa.me/${whatsapp}?text=Hola%20desde%20Tu%20Barrio%20a%20un%20Clik`, '_blank');
  };

  window.openWebsite = function(url) {
    if (url && url !== '#') window.open(url, '_blank');
  };

  window.openMap = function(lat, lng) {
    if (lat && lng) window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  window.callPhone = function(phone) {
    if (phone) window.open(`tel:${phone}`);
  };

  // --- SISTEMA DE MAPA ---
  function initMapLogic() {
    if (!isLeafletAvailable()) {
      setTimeout(initMapLogic, 300);
      return;
    }
    setupMap();
  }

  function isLeafletAvailable() {
    return typeof L !== 'undefined' && L && L.map && L.marker;
  }

  function setupMap() {
    if (setupComplete) return;

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      setTimeout(setupMap, 300);
      return;
    }

    try {
      if (window.map && window.map.remove) {
        window.map.remove();
      }

      window.map = L.map('map', CONFIG.MAP_OPTIONS);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
        detectRetina: true
      }).addTo(window.map);

      setupMapEvents();
      window.mapInitialized = true;
      isMapReady = true;
      
      if (window.businesses.length > 0) {
        addMapMarkers();
      }

      console.log("✅ Mapa inicializado correctamente");

    } catch (error) {
      console.error("Error inicializando mapa:", error);
    }
  }

  function setupMapEvents() {
    window.map.on('click', function() {
      if (!window.map.scrollWheelZoom.enabled()) {
        window.map.scrollWheelZoom.enable();
      }
    });

    updateBusinessListDebounced = debounce(function() {
      if (window.businesses && window.map && isMapReady) {
        updateBusinessList(window.businesses);
      }
    }, 500, true);

    window.map.on('moveend', function() {
      if (window.businesses && isMapReady) {
        updateBusinessListDebounced();
      }
    });
  }

  function addMapMarkers() {
    if (!isLeafletAvailable() || !window.map) return;

    try {
      if (window.businessMarkers) {
        window.map.removeLayer(window.businessMarkers);
      }

      window.businessMarkers = L.featureGroup();
      const markers = [];

      window.businesses.forEach(business => {
        if (business.latitude && business.longitude && isBusinessOpen(business.hours)) {
          const marker = L.marker([business.latitude, business.longitude], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div class="marker-dot open"></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })
          }).bindPopup(`
            <div class="custom-popup">
              <h6 class="mb-1">${business.name}</h6>
              <p class="text-muted mb-1">${business.category || 'Sin categoría'}</p>
              <div class="d-flex gap-2 mt-2">
                <a href="${business.url || '#'}" target="_blank" class="btn btn-sm btn-primary">Ver más</a>
                <a href="https://wa.me/${business.whatsapp}" target="_blank" class="btn btn-sm btn-success">Chat</a>
              </div>
            </div>
          `);
          markers.push(marker);
        }
      });

      if (markers.length > 0) {
        const clusterGroup = L.markerClusterGroup({
          maxClusterRadius: 80,
          iconCreateFunction: function(cluster) {
            return L.divIcon({
              html: `<div class="cluster-icon">${cluster.getChildCount()}</div>`,
              className: 'marker-cluster',
              iconSize: [40, 40]
            });
          }
        }).addLayers(markers);
        
        window.businessMarkers.addLayer(clusterGroup);
        window.businessMarkers.addTo(window.map);
      }

    } catch (error) {
      console.error("Error al agregar marcadores:", error);
    }
  }

  // --- UBICACIÓN DEL USUARIO ---
  function setupLocationButton() {
    const locateMeButton = document.getElementById('locateMe');
    if (!locateMeButton) return;

    locateMeButton.addEventListener('click', () => {
      if (!window.map) {
        mostrarToast('El mapa aún no está listo. Espera unos segundos.', 'warning');
        return;
      }

      const originalText = locateMeButton.innerHTML;
      locateMeButton.disabled = true;
      locateMeButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Obteniendo ubicación...';

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const accuracyMeters = Math.round(accuracy);
            
            // Eliminar marcadores anteriores
            if (window.userMarker) window.map.removeLayer(window.userMarker);
            if (window.userAccuracyCircle) window.map.removeLayer(window.userAccuracyCircle);

            // Crear nuevo marcador
            window.userMarker = L.marker([latitude, longitude], {
              icon: L.divIcon({
                className: 'user-location-marker',
                html: `<div class="user-location-ring"></div><div class="user-location-dot"></div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              })
            }).addTo(window.map);

            // Círculo de precisión
            window.userAccuracyCircle = L.circle([latitude, longitude], {
              radius: accuracy,
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              weight: 1
            }).addTo(window.map);

            // Centrar mapa
            window.map.setView([latitude, longitude], 14);
            updateBusinessList(window.businesses);

            // Restaurar botón
            locateMeButton.innerHTML = `<i class="fas fa-location-dot me-1"></i>Mi ubicación (${accuracyMeters}m)`;
            locateMeButton.disabled = false;

            mostrarToast('Ubicación encontrada correctamente', 'success');

          },
          (error) => {
            let message = "No se pudo obtener tu ubicación: ";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = "Permiso de ubicación denegado. Por favor, habilita la ubicación en tu navegador.";
                break;
              case error.POSITION_UNAVAILABLE:
                message = "Ubicación no disponible.";
                break;
              case error.TIMEOUT:
                message = "Tiempo de espera agotado.";
                break;
              default:
                message = "Error desconocido.";
            }
            
            mostrarToast(message, 'error');
            locateMeButton.innerHTML = '<i class="fas fa-location-dot me-1"></i>Mostrar mi ubicación';
            locateMeButton.disabled = false;
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        mostrarToast("Tu navegador no soporta geolocalización.", 'error');
        locateMeButton.disabled = false;
      }
    });
  }

  // --- ACTUALIZAR LISTA DE COMERCIOS CERCANOS ---
  function updateBusinessList(businesses) {
    const businessList = document.getElementById('businessList');
    businessListContainer = document.getElementById('businessListContainer') || 
                           document.querySelector('.business-list-container');
    
    if (!businessList) return;

    if (!window.userMarker) {
      businessList.innerHTML = `
        <div class="text-center text-muted py-3">
          <p>Por favor, haz clic en "Mostrar mi ubicación" para ver los comercios cercanos.</p>
        </div>
      `;
      if (businessListContainer) businessListContainer.style.display = 'block';
      return;
    }

    try {
      const userLatLng = window.userMarker.getLatLng();
      const openBusinesses = businesses
        .filter(business => business.latitude && business.longitude)
        .map(business => {
          const distance = window.map.distance(userLatLng, L.latLng(business.latitude, business.longitude)) / 1000;
          return { ...business, distance };
        })
        .filter(business => isBusinessOpen(business.hours) && business.distance <= 10)
        .sort((a, b) => a.distance - b.distance);

      if (openBusinesses.length > 0) {
        businessList.innerHTML = openBusinesses.map(business => `
          <div class="col-12 col-md-6 col-lg-4 mb-2">
            <div class="border rounded p-3 bg-white shadow-sm">
              <h6 class="mb-1">${business.name}</h6>
              <p class="text-muted mb-1">${business.category || 'Sin categoría'}</p>
              <p class="text-muted mb-2">${business.address || 'Dirección no disponible'}</p>
              <p class="mb-2">
                <span class="badge bg-success">Abierto</span>
                <span class="ms-2">${business.distance.toFixed(2)} km</span>
              </p>
              <div class="d-flex gap-2">
                <a href="https://maps.google.com/?daddr=${business.latitude},${business.longitude}" 
                   target="_blank" 
                   class="btn btn-sm btn-outline-primary flex-grow-1">
                  <i class="fas fa-directions me-1"></i>Ruta
                </a>
                <a href="https://wa.me/${business.whatsapp}" 
                   target="_blank" 
                   class="btn btn-sm btn-outline-success flex-grow-1">
                  <i class="fab fa-whatsapp me-1"></i>Chat
                </a>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        businessList.innerHTML = `
          <div class="col-12">
            <p class="text-center text-muted py-3">No hay comercios abiertos cerca de ti.</p>
          </div>
        `;
      }

      if (businessListContainer) businessListContainer.style.display = 'block';

    } catch (error) {
      console.error("Error actualizando lista:", error);
      businessList.innerHTML = '<div class="col-12"><p class="text-center text-danger">Error al cargar los comercios.</p></div>';
    }
  }

  // --- MODAL DE NEGOCIO ---
  document.addEventListener('click', function(e) {
    const image = e.target.closest('.clickable-image');
    if (!image) return;

    try {
      const negocio = JSON.parse(image.dataset.business);
      const modal = document.getElementById('businessModal');
      
      if (!modal) return;

      // Actualizar contenido del modal
      document.getElementById('modalImage').src = negocio.imagen;
      document.getElementById('modalImage').alt = negocio.nombre;
      document.getElementById('modalName').textContent = negocio.nombre;
      document.getElementById('modalAddress').textContent = negocio.direccion || 'No disponible';
      document.getElementById('modalHours').textContent = negocio.horario;
      document.getElementById('modalPhone').textContent = negocio.telefono;
      document.getElementById('businessModalLabel').textContent = negocio.nombre;

      // Actualizar enlaces
      const modalWhatsapp = document.getElementById('modalWhatsapp');
      const modalWebsite = document.getElementById('modalWebsite');
      const modalMap = document.getElementById('modalMap');
      const modalPromo = document.getElementById('modalPromo');

      if (modalWhatsapp) {
        modalWhatsapp.href = `https://wa.me/${negocio.whatsapp}?text=Hola%20desde%20BarrioClik`;
        modalWhatsapp.setAttribute('data-analytics', 'whatsapp');
        modalWhatsapp.setAttribute('data-negocio', negocio.nombre);
      }

      if (modalWebsite) {
        modalWebsite.href = negocio.pagina;
        modalWebsite.setAttribute('data-analytics', 'web');
        modalWebsite.setAttribute('data-negocio', negocio.nombre);
      }

      if (modalMap) {
        modalMap.href = `https://maps.google.com/?daddr=${negocio.latitud},${negocio.longitud}`;
        modalMap.setAttribute('data-analytics', 'ubicacion');
        modalMap.setAttribute('data-negocio', negocio.nombre);
      }

      if (modalPromo) {
        if (negocio.promo) {
          modalPromo.style.display = 'inline-block';
          modalPromo.setAttribute('data-analytics', 'promocion');
          modalPromo.setAttribute('data-negocio', negocio.nombre);
          modalPromo.setAttribute('data-promo', negocio.promo);
          modalPromo.textContent = negocio.promo;
        } else {
          modalPromo.style.display = 'none';
        }
      }

    } catch (error) {
      console.error('Error al abrir modal:', error);
    }
  });

  // --- ÍNDICE DE BÚSQUEDA ---
  function createBusinessIndex(businesses) {
    const index = {
      byCategory: {},
      byName: {},
      byLocation: [],
      totalItems: businesses.length
    };

    businesses.forEach(business => {
      const category = business.category || 'Otros';
      if (!index.byCategory[category]) {
        index.byCategory[category] = [];
      }
      index.byCategory[category].push(business);

      const nameKey = normalizeText(business.name);
      if (!index.byName[nameKey]) {
        index.byName[nameKey] = [];
      }
      index.byName[nameKey].push(business);

      if (business.latitude && business.longitude) {
        index.byLocation.push({
          business,
          lat: business.latitude,
          lng: business.longitude
        });
      }
    });

    businessIndex = index;
    console.log(`✅ Índice creado con ${index.totalItems} elementos`);
  }

  // --- FUNCIONES DE UTILIDAD ---
  async function waitForElement(selector, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  async function fetchWithTimeout(url, options = {}) {
    const { timeout = 5000 } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, '');
  }

  function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  }

  // --- INICIALIZACIÓN DE FUNCIONALIDADES ---
  function initializeFeatures() {
    if (window.businesses.length === 0) {
      if (loadBusinessesFromCache() && window.businesses.length > 0) {
        initializeFeatures();
        return;
      }
      return;
    }

    createBusinessIndex(window.businesses);
    setupEventListeners();
    loadCarousel();
    loadPromotions();
    setupPWA();
  }

  function setupEventListeners() {
    // Botón de búsqueda
    const searchButton = document.querySelector('button[onclick="searchBusinesses()"]');
    if (searchButton) {
      searchButton.addEventListener("click", window.searchBusinesses);
    }

    // Botón "Soy Consumidor"
    document.getElementById('btnSoyConsumidor')?.addEventListener('click', () => {
      const modalSeleccion = bootstrap.Modal.getInstance(document.getElementById('modalSeleccion'));
      if (modalSeleccion) modalSeleccion.hide();
      
      mostrarToast(`¡Bienvenido! Explora los comercios de ${CURRENT_LOCATION.charAt(0).toUpperCase() + CURRENT_LOCATION.slice(1)}.`);
      
      setTimeout(() => {
        const btnNotificacion = document.getElementById('btnNotificacion');
        if (btnNotificacion) btnNotificacion.click();
      }, 500);
    });

    // Botones de instalación PWA
    const installButtons = document.querySelectorAll('[id^="botonInstalar"]');
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredPrompt = e;
      installButtons.forEach(btn => btn.style.display = "inline-block");
    });

    installButtons.forEach(button => {
      button.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
          installButtons.forEach(btn => btn.style.display = "none");
        }
      });
    });

    // Google Analytics
    setupAnalytics();
  }

  function setupAnalytics() {
    const trackableElements = document.querySelectorAll("[data-analytics]");
    trackableElements.forEach(el => {
      el.addEventListener("click", () => {
        const tipo = el.dataset.analytics;
        const negocio = el.dataset.negocio || "Sin nombre";
        const promo = el.dataset.promo || "";

        if (typeof gtag === "function") {
          gtag("event", `click_${tipo}`, {
            negocio: negocio,
            promo: promo
          });
        }
      });
    });
  }

  function loadCarousel() {
    const carouselContainer = document.getElementById("carouselContainer");
    if (!carouselContainer) return;

    carouselContainer.innerHTML = '<div class="text-center py-3 text-dark">Cargando negocios destacados...</div>';

    fetch("data/carousel.json")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(carouselItems => {
        if (!carouselItems || carouselItems.length === 0) {
          throw new Error("No hay items para el carrusel");
        }

        carouselContainer.innerHTML = '';
        
        // Crear items originales
        carouselItems.forEach(item => {
          const card = document.createElement("div");
          card.className = "carousel-card";
          card.innerHTML = `
            <a href="${item.url || '#'}" class="text-decoration-none">
              <img src="${item.image || 'img/placeholder.webp'}" 
                   alt="${item.name || 'Negocio'}" 
                   loading="lazy"
                   class="w-100 h-100 object-fit-cover"
                   style="height: 100px; object-fit: cover;">
              <p class="mt-2 mb-0 text-center fw-bold" style="font-size: 0.85rem; color: #333;">
                ${item.name || 'Sin nombre'}
              </p>
            </a>
          `;
          carouselContainer.appendChild(card);
        });

        // Duplicar para efecto infinito
        const originalItems = carouselItems.length;
        for (let i = 0; i < originalItems; i++) {
          const item = carouselItems[i];
          const card = document.createElement("div");
          card.className = "carousel-card";
          card.innerHTML = `
            <a href="${item.url || '#'}" class="text-decoration-none">
              <img src="${item.image || 'img/placeholder.webp'}" 
                   alt="${item.name || 'Negocio'}" 
                   loading="lazy"
                   class="w-100 h-100 object-fit-cover"
                   style="height: 100px; object-fit: cover;">
              <p class="mt-2 mb-0 text-center fw-bold" style="font-size: 0.85rem; color: #333;">
                ${item.name || 'Sin nombre'}
              </p>
            </a>
          `;
          carouselContainer.appendChild(card);
        }

      })
      .catch(err => {
        console.error("Error cargando carrusel:", err);
        carouselContainer.innerHTML = '<p class="text-center text-danger py-3">Error al cargar negocios destacados.</p>';
      });
  }

  function loadPromotions() {
    const offerContainer = document.getElementById("offerContainer");
    if (!offerContainer) return;

    fetch("datos/promociones.json")
      .then(res => res.json())
      .then(promos => {
        offerContainer.innerHTML = '';
        promos.forEach(promo => {
          const card = document.createElement("div");
          card.className = "offer-card";
          card.innerHTML = `
            <div class="offer-image">
              <img src="${promo.logo}" alt="${promo.name}">
              ${promo.discount ? `<span class="offer-discount">${promo.discount}</span>` : ''}
            </div>
            <div class="offer-info">
              <h3>${promo.name}</h3>
              <div class="price">
                ${promo.originalPrice ? `<span class="original-price">${promo.originalPrice}</span>` : ''}
                <span class="discounted-price">${promo.discountedPrice}</span>
              </div>
              <a href="${promo.url.trim()}" class="menu-link" target="_blank">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M9 20.897a.89.89 0 0 1-.902-.895.9.9 0 0 1 .262-.635l7.37-7.37-7.37-7.36A.9.9 0 0 1 9 3.104c.24 0 .47.094.64.263l8 8a.9.9 0 0 1 0 1.27l-8 8a.89.89 0 0 1-.64.26Z"/>
                </svg>
                Ver oferta
              </a>
            </div>
          `;
          offerContainer.appendChild(card);
        });
      })
      .catch(err => {
        console.error("Error cargando promociones:", err);
        offerContainer.innerHTML = '<p class="text-center text-danger">Error al cargar promociones.</p>';
      });
  }

  function setupPWA() {
    // Verificar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      const installButtons = document.querySelectorAll('[id^="botonInstalar"]');
      installButtons.forEach(btn => btn.style.display = 'none');
    }
  }

  function refreshBusinessData() {
    // Función para refrescar datos de negocios
    console.log('Refrescando datos de negocios...');
    // Aquí puedes agregar lógica para recargar datos si es necesario
  }

  // --- MODAL DE BIENVENIDA ---
  function showWelcomeModal() {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      const modal = document.getElementById('welcomeModal');
      if (modal) {
        modal.classList.add('active');
        
        const closeBtn = document.getElementById('welcomeCloseBtn');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            localStorage.setItem('hasSeenWelcome', 'true');
          });
        }
        
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('active');
            localStorage.setItem('hasSeenWelcome', 'true');
          }
        });
      }
    }
  }

  function checkInitialization() {
    if (loadedSections === totalSections && !setupComplete) {
      console.log(`✅ Todos los negocios cargados: ${window.businesses.length}`);
      saveBusinessesToCache(window.businesses);
      initializeFeatures();
      initMapLogic();
      setupLocationButton();
      setupComplete = true;
    }
  }

  // --- INICIALIZACIÓN PRINCIPAL ---
  function initializeApp() {
    console.log(`🚀 Inicializando app para ${CURRENT_LOCATION}`);
    
    initializeServiceWorker();
    setupSWCommunication();
    
    if (loadBusinessesFromCache()) {
      initializeFeatures();
      initMapLogic();
      setupLocationButton();
    } else {
      Object.keys(secciones).forEach(rubro => {
        cargarSeccion(rubro);
      });
    }

    setTimeout(showWelcomeModal, 1500);
  }

  // --- INICIALIZAR APLICACIÓN ---
  initializeApp();

  // --- EXPORTAR FUNCIONES GLOBALES ---
  window.isBusinessOpen = isBusinessOpen;
  window.updateBusinessList = updateBusinessList;
  window.setupLocationButton = setupLocationButton;
  window.scrollCarousel = function(offset) {
    const container = document.querySelector(".carousel-container");
    if (!container) return;
    
    const newPos = container.scrollLeft + offset;
    container.scrollTo({ left: newPos, behavior: "smooth" });
    
    const maxScroll = container.scrollWidth / 2;
    if (newPos >= maxScroll) {
      setTimeout(() => container.scrollTo({ left: 0, behavior: 'auto' }), 500);
    } else if (newPos <= 0) {
      setTimeout(() => container.scrollTo({ left: maxScroll, behavior: 'auto' }), 500);
    }
  };

  window.scrollOffers = function(offset) {
    const container = document.querySelector(".offer-container");
    if (container) {
      container.scrollLeft += offset;
    }
  };
});

// --- ESTILOS PARA TOAST ---
const toastStyles = `
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-20px);
  background: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10000;
  opacity: 0;
  transition: all 0.3s ease;
  font-family: system-ui, -apple-system, sans-serif;
}

.toast.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.toast-info { border-left: 4px solid #007bff; }
.toast-success { border-left: 4px solid #28a745; }
.toast-warning { border-left: 4px solid #ffc107; }
.toast-error { border-left: 4px solid #dc3545; }

.toast i {
  font-size: 1.1em;
}

.toast-info i { color: #007bff; }
.toast-success i { color: #28a745; }
.toast-warning i { color: #ffc107; }
.toast-error i { color: #dc3545; }
`;

// Inyectar estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = toastStyles;
  document.head.appendChild(styleSheet);
}