// main.js - Versión corregida para que el botón "Cargar más" funcione en todas las secciones
document.addEventListener('DOMContentLoaded', function() {
  // --- CONSTANTES GLOBALES ---
  const CACHE_KEY = 'businesses_cache_v4';
  const whatsappNumber = '5491157194796';
  const MAX_ACCURACY = 15;
  const MAX_ATTEMPTS = 10;
  const MAX_TIMEOUT = 30000;
  
  // --- VARIABLES GLOBALES ---
  let deferredPrompt = null;
  window.businesses = [];
  window.map = null;
  window.userMarker = null;
  window.userAccuracyCircle = null;
  window.mapInitialized = false;
  let locationWatchId = null;
  let highAccuracyPosition = null;
  let locationAttempts = 0;
  let setupComplete = false;
  let isMapReady = false;
  let businessListContainer = null;
  let updateBusinessListDebounced;
  let businessIndex = null;

  // --- CONFIGURACIÓN DE PRODUCCIÓN ---
  const APP_VERSION = 'v60-multi'; // ⬅️ ¡DEBE COINCIDIR EXACTAMENTE CON CACHE_VERSION EN sw.js!
  
  // --- SERVICE WORKER EN PRODUCCIÓN ---
  if ('serviceWorker' in navigator) {
    // Registrar SW sin caché y con control de versiones
    navigator.serviceWorker.register(`/Zona-Tu-Barrio/shared/js/sw.js?v=${APP_VERSION}`, {
       scope: '/Zona-Tu-Barrio/',
       updateViaCache: 'none'
     }).then(registration => {
      console.log('✅ SW registrado en producción:', APP_VERSION);

      // Verificar actualizaciones periódicas (cada 10 minutos)
      const checkForUpdates = () => {
        if (registration.waiting) {
          showUpdateModal(registration);
        }
      };

      // Escuchar nuevas instalaciones
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              checkForUpdates();
            }
          });
        }
      });

      // Verificar al cargar y periódicamente
      checkForUpdates();
      setInterval(() => registration.update(), 10 * 60 * 1000); // Cada 10 minutos

    }).catch(err => {
      console.error('❌ Error crítico en SW:', err);
      // En producción, no mostramos errores al usuario, solo logueamos
    });
  }

  // --- GESTIÓN DEL MODAL DE ACTUALIZACIÓN ---
  function showUpdateModal(registration) {
    // Verificar si ya se mostró para esta versión (usando sessionStorage para no persistir entre sesiones)
    const modalShownKey = `update_modal_shown_${APP_VERSION}`;
    if (sessionStorage.getItem(modalShownKey)) {
      return; // Ya se mostró en esta sesión
    }

    const modal = document.getElementById('update-modal');
    if (!modal) return;

    // Mostrar modal
    modal.style.display = 'flex';

    // Botón: Actualizar ahora
    document.getElementById('update-now')?.addEventListener('click', function handler() {
      modal.style.display = 'none';
      sessionStorage.setItem(modalShownKey, 'true'); // Marcar como mostrado
      
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // Recargar después de un breve retraso
      setTimeout(() => window.location.reload(), 1000);
      
      // Limpiar listener
      this.removeEventListener('click', handler);
    }, { once: true });

    // Botón: Más tarde
    document.getElementById('update-later')?.addEventListener('click', function handler() {
      modal.style.display = 'none';
      // No marcamos como mostrado, aparecerá en próxima visita
      this.removeEventListener('click', handler);
    }, { once: true });

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', function handler(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        this.removeEventListener('click', handler);
      }
    }, { once: true });
  }

  // --- NUEVA INTEGRACIÓN CON SW PARA REFRESCOS CONTINUOS ---
  // (Agregado para activar PAGE_FOCUS y mensajes del SW v48)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Escucha mensajes del SW (ej: notificación de nueva versión o refresh completado)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SW_UPDATED') {
        console.log('¡Nueva versión detectada!', event.data.message);
        // Opcional: Integra con tu UI, ej: showToast(event.data.message);
        if (event.data.forceRefresh) {
          // Si el SW lo pide, recarga para frescura total
          window.location.reload();
        }
      } else if (event.data.type === 'CONTENT_REFRESHED') {
        console.log('Contenido refrescado exitosamente');
        // Opcional: Actualiza tu UI aquí, ej: loadBusinesses() o recarga listas de promociones
        // Ej: if (window.loadBusinesses) window.loadBusinesses();
      } else if (event.data.type === 'FORCE_REFRESH') {
        console.log('Refresh forzado por push notification');
        window.location.reload(); // Recarga inmediata
      }
    });

    // Función para enviar 'PAGE_FOCUS' al SW (refresca dinámicos al abrir/focalizar)
    function sendPageFocus() {
      navigator.serviceWorker.controller.postMessage({ type: 'PAGE_FOCUS' });
      console.log('📱 PAGE_FOCUS enviado al SW - Refrescando datos frescos');
    }

    // Al cargar la página (DOMContentLoaded ya está activo, pero aseguramos)
    sendPageFocus();

    // Al focalizar la pestaña/app (para pestañas inactivas o app móvil)
    window.addEventListener('focus', sendPageFocus);

    // Opcional: En funciones clave de tu app, envía refresh manual
    // Ej: Si tienes una función loadBusinesses(), agrega al final: sendPageFocus();
    // Ej: window.loadBusinesses = function() { /* tu lógica */; sendPageFocus(); };
  }
  // Capturar el evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir que el banner de instalación aparezca automáticamente
    e.preventDefault();
    // Guardar el evento para usarlo después
    deferredPrompt = e;
    console.log('✅ Evento beforeinstallprompt capturado. PWA listo para instalarse.');
    // Mostrar los botones de instalación (escritorio y móvil)
    const installButtonDesktop = document.getElementById('botonInstalar');
    const installButtonMobile = document.getElementById('botonInstalarMobile');
    if (installButtonDesktop) {
      installButtonDesktop.style.display = 'inline-block';
      installButtonDesktop.textContent = 'Instalar App';
      installButtonDesktop.disabled = false;
    }
    if (installButtonMobile) {
      installButtonMobile.style.display = 'inline-block';
      installButtonMobile.textContent = 'Instalar App';
      installButtonMobile.disabled = false;
    }
  });

  // === SUSTITUIR ALERT POR TOAST SUAVE ===
  function mostrarToast(mensaje, tipo = 'info') {
    // Evitar múltiples toasts
    if (document.getElementById('toastConsumidor')) {
      return;
    }
    const toast = document.createElement('div');
    toast.id = 'toastConsumidor';
    toast.className = `
      fixed top-6 left-1/2 transform -translate-x-1/2
      bg-gradient-to-r from-blue-500 to-blue-700 text-white
      px-6 py-3 rounded-full shadow-lg
      text-sm font-medium z-50
      opacity-0 translate-y-[-20px]
      transition-all duration-300
      flex items-center gap-2
      max-w-xs
    `;
    toast.innerHTML = `
      <i class="fas fa-user-check"></i>
      <span>${mensaje}</span>
    `;
    document.body.appendChild(toast);
    // Mostrar
    setTimeout(() => {
      toast.classList.remove('opacity-0', 'translate-y-[-20px]');
      toast.classList.add('opacity-100', 'translate-y-0');
    }, 100);
    // Ocultar
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-[-20px]');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // === Cuando el usuario elige "Consumidor" ===
  document.getElementById('btnSoyConsumidor')?.addEventListener('click', () => {
    // Cierra el modal de selección (ajusta el ID si es diferente)
    const modalSeleccion = bootstrap.Modal.getInstance(document.getElementById('modalSeleccion'));
    if (modalSeleccion) {
      modalSeleccion.hide();
    }
    // Muestra el toast en lugar del alert
    mostrarToast('¡Bienvenido! Explora los comercios de Castelar.');
    // Abre el modal de notificaciones con un pequeño delay
    setTimeout(() => {
      const btnNotificacion = document.getElementById('btnNotificacion');
      if (btnNotificacion) {
        btnNotificacion.click();
      }
    }, 500); // Pequeño delay para asegurar que todo se cierre bien
  });

  // Función para instalar la app
  function installApp() {
    if (!deferredPrompt) {
      console.warn('❌ No hay evento deferredPrompt. La PWA no se puede instalar ahora.');
      return;
    }
    // Mostrar el cuadro de diálogo de instalación del navegador
    deferredPrompt.prompt();
    // Esperar la elección del usuario
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ El usuario aceptó instalar la app');
        // Ocultar el botón porque ya no se puede usar de nuevo
        const installButtonDesktop = document.getElementById('botonInstalar');
        const installButtonMobile = document.getElementById('botonInstalarMobile');
        if (installButtonDesktop) installButtonDesktop.style.display = 'none';
        if (installButtonMobile) installButtonMobile.style.display = 'none';
        // Limpiar el evento
        deferredPrompt = null;
      } else {
        console.log('❌ El usuario rechazó la instalación');
      }
    });
  }

  // Asignar eventos a los botones de instalación
  document.addEventListener('DOMContentLoaded', () => {
    const installButtonDesktop = document.getElementById('botonInstalar');
    const installButtonMobile = document.getElementById('botonInstalarMobile');
    if (installButtonDesktop) {
      installButtonDesktop.addEventListener('click', installApp);
    }
    if (installButtonMobile) {
      installButtonMobile.addEventListener('click', installApp);
    }
    // Opcional: Si el navegador no soporta PWA, ocultar los botones
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      // Estamos en navegador, no en app instalada
      if (installButtonDesktop) installButtonDesktop.style.display = 'none';
      if (installButtonMobile) installButtonMobile.style.display = 'none';
    }
  });

  // Función principal para verificar si un negocio está abierto
  function isBusinessOpen(hoursString) {
    if (!hoursString) return true;
    try {
      const normalized = hoursString.trim().toLowerCase();
      if (normalized.includes('24 horas') || normalized.includes('24h')) return true;
      if (normalized.includes('cerrado') || normalized.includes('cerrada')) return false;
      if (hoursString.includes(',')) {
        const timeRanges = hoursString.split(',');
        for (const range of timeRanges) {
          if (checkSingleTimeRange(range.trim())) return true;
        }
        return false;
      }
      return checkSingleTimeRange(hoursString);
    } catch (error) {
      console.error("Error en isBusinessOpen:", error, "Horario:", hoursString);
      return true;
    }
  }

  function checkSingleTimeRange(timeRange) {
    const now = new Date();
    const options = { timeZone: "America/Argentina/Buenos_Aires" };
    const currentDay = now.toLocaleString("en-US", { ...options, weekday: "short" }).toLowerCase().slice(0, 3);
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHours + currentMinutes / 60;
    const dayMap = {
      'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0,
      'lun': 1, 'mar': 2, 'mie': 3, 'jue': 4, 'vie': 5, 'sab': 6, 'dom': 0
    };
    const match = timeRange.toLowerCase().match(/(mon|tue|wed|thu|fri|sat|sun|lun|mar|mie|jue|vie|sab|dom)-(mon|tue|wed|thu|fri|sat|sun|lun|mar|mie|jue|vie|sab|dom)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match) {
      const [, startDayStr, endDayStr, startStr, endStr] = match;
      const startDay = dayMap[startDayStr];
      const endDay = dayMap[endDayStr];
      const [startHour, startMinute] = startStr.split(":").map(Number);
      const [endHour, endMinute] = endStr.split(":").map(Number);
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        console.warn(`Horario inválido: ${timeRange}`);
        return false;
      }
      const start = startHour + startMinute / 60;
      const end = endHour + endMinute / 60;
      const isOvernight = end < start;
      const currentDayNum = dayMap[currentDay];
      let isDayInRange;
      if (startDay <= endDay) {
        isDayInRange = currentDayNum >= startDay && currentDayNum <= endDay;
      } else {
        isDayInRange = currentDayNum >= startDay || currentDayNum <= endDay;
      }
      if (isOvernight) {
        return isDayInRange && (currentTime >= start || currentTime <= end);
      } else {
        return isDayInRange && currentTime >= start && currentTime <= end;
      }
    }
    const dayMatch = timeRange.toLowerCase().match(/^(mon|tue|wed|thu|fri|sat|sun|lun|mar|mie|jue|vie|sab|dom)\b/);
    if (dayMatch) {
      const day = dayMatch[0];
      const timePart = timeRange.replace(day, '').trim();
      const startDay = dayMap[day];
      const currentDayNum = dayMap[currentDay];
      if (startDay !== currentDayNum) return false;
      const timeMatch = timePart.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      if (!timeMatch) return false;
      const [startStr, endStr] = [timeMatch[1], timeMatch[2]];
      const [startHour, startMinute] = startStr.split(":").map(Number);
      const [endHour, endMinute] = endStr.split(":").map(Number);
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        return false;
      }
      const start = startHour + startMinute / 60;
      const end = endHour + endMinute / 60;
      const isOvernight = end < start;
      if (isOvernight) {
        return currentTime >= start || currentTime <= end;
      } else {
        return currentTime >= start && currentTime <= end;
      }
    }
    const timeOnlyMatch = timeRange.toLowerCase().match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (timeOnlyMatch) {
      const [startStr, endStr] = [timeOnlyMatch[1], timeOnlyMatch[2]];
      const [startHour, startMinute] = startStr.split(":").map(Number);
      const [endHour, endMinute] = endStr.split(":").map(Number);
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        return false;
      }
      const start = startHour + startMinute / 60;
      const end = endHour + endMinute / 60;
      const isOvernight = end < start;
      if (isOvernight) {
        return currentTime >= start || currentTime <= end;
      } else {
        return currentTime >= start && currentTime <= end;
      }
    }
    console.warn(`Formato no reconocido: ${timeRange}`);
    return true;
  }

  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, '');
  }

  // --- CACHÉ PARA NEGOCIOS ---
  function loadBusinessesFromCache() {
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000;
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      // Opcional: limpiar caché si está corrupto
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (!parsed.data || !Array.isArray(parsed.data)) {
            console.warn("Caché corrupto detectado. Limpiando...");
            localStorage.removeItem(CACHE_KEY);
            return false;
          }
        } catch (e) {
          console.warn("Caché JSON inválido. Limpiando...");
          localStorage.removeItem(CACHE_KEY);
          return false;
        }
      }
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        // ✅ Verificación segura: aseguramos que 'data' exista y sea un array
        if (data && Array.isArray(data) && Date.now() - timestamp < CACHE_EXPIRY) {
          console.log(`✅ Negocios cargados desde caché (${data.length} negocios)`);
          window.businesses = data;
          createBusinessIndex(data);
          return true;
        }
      }
    } catch (error) {
      console.error('Error al cargar desde caché:', error);
    }
    return false;
  }

  function saveBusinessesToCache(businesses) {
    try {
      const cacheData = {
        businesses,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('No se pudo guardar en caché:', e);
    }
  }

  // --- CARGA DINÁMICA DE NEGOCIOS POR RUBRO ---
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
  let loadedSections = 0;
  const totalSections = Object.keys(secciones).length;

  // Reutiliza la función de creación de tarjeta
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

  // Procesa un archivo JSON y actualiza el DOM eficientemente
  async function cargarSeccion(rubro) {
    const url = `data/${secciones[rubro]}`;
    let contenedor = null;
    let intentos = 0;
    const maxIntentos = 20;
    // Buscar el contenedor con reintentos (por si el DOM no está listo)
    while (!contenedor && intentos < maxIntentos) {
      contenedor = document.querySelector(`#${rubro} .row`);
      if (!contenedor) {
        await new Promise(resolve => setTimeout(resolve, 100));
        intentos++;
      }
    }
    if (!contenedor) {
      console.error(`❌ No se encontró el contenedor para ${rubro} después de ${maxIntentos * 100}ms`);
      loadedSections++;
      checkInitialization();
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const negocios = await response.json();
      
      // Almacenar en el formato que espera el mapa
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
          whatsapp: negocio.whatsapp
        });
      });

      // Obtener límite de tarjetas a mostrar inicialmente (6)
      const limit = 6;
      const initialNegocios = negocios.slice(0, limit);
      
      // Crear tarjetas iniciales
      let cardsHTML = initialNegocios.map(negocio => crearTarjetaNegocio(negocio)).join('');
      
      // Forzar renderizado sincronizado
      requestAnimationFrame(() => {
        contenedor.innerHTML = cardsHTML;
        
        // Configurar botón "Cargar más" - CORRECCIÓN IMPORTANTE
        // Buscar el botón usando el atributo data-category con el nombre del rubro en español
        let loadMoreBtn = null;
        
        // Mapeo de rubros a nombres en español para el botón
        const rubroToSpanish = {
          'panaderias': 'Panadería',
          'pastas': 'Pastas',
          'verdulerias': 'Verdulería',
          'fiambrerias': 'Fiambrería',
          'kioscos': 'Kioscos',
          'mascotas': 'Mascotas',
          'barberias': 'Barbería',
          'ferreterias': 'Ferretería',
          'ropa': 'Ropa',
          'veterinarias': 'Veterinaria',
          'carnicerias': 'Carnicería',
          'profesiones': 'Profesiones',
          'farmacias': 'Farmacia',
          'cafeterias': 'Cafetería',
          'talleres': 'Talleres',
          'librerias': 'Librerías',
          'mates': 'Mates',
          'florerias': 'Florería',
          'comidas': 'Comida',
          'granjas': 'Granjas',
          'muebles': 'Muebles',
          'uñas': 'Uñas'
        };
        
        // Buscar por data-category con el nombre en español
        const spanishName = rubroToSpanish[rubro] || rubro.charAt(0).toUpperCase() + rubro.slice(1);
        loadMoreBtn = document.querySelector(`[data-category="${spanishName}"]`);
        
        // Si no se encuentra, buscar por ID
        if (!loadMoreBtn) {
          loadMoreBtn = document.querySelector(`#loadMore${rubro.charAt(0).toUpperCase() + rubro.slice(1)}`);
        }
        
        // Si aún no se encuentra, buscar cualquier botón en la sección
        if (!loadMoreBtn) {
          const section = document.getElementById(rubro);
          if (section) {
            loadMoreBtn = section.querySelector('.load-more-btn');
          }
        }
        
        if (loadMoreBtn) {
          // Asegurar que el botón tenga estilos correctos
          loadMoreBtn.style.cursor = 'pointer';
          loadMoreBtn.classList.remove('disabled');
          loadMoreBtn.style.display = 'inline-block';
          
          // Variables para manejar el estado de carga (usar dataset para almacenar estado)
          loadMoreBtn.dataset.currentIndex = limit;
          loadMoreBtn.dataset.isLoading = 'false';
          
          // Función para cargar más negocios
          const loadMoreBusinesses = function() {
            // Verificar si ya está cargando
            if (loadMoreBtn.dataset.isLoading === 'true' || 
                parseInt(loadMoreBtn.dataset.currentIndex) >= negocios.length) {
              return;
            }
            
            loadMoreBtn.dataset.isLoading = 'true';
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = `
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Cargando...
            `;
            
            // Simular carga asíncrona (opcional, para mejor UX)
            setTimeout(() => {
              const currentIndex = parseInt(loadMoreBtn.dataset.currentIndex);
              const nextIndex = currentIndex + 6;
              const nextBatch = negocios.slice(currentIndex, nextIndex);
              
              if (nextBatch.length > 0) {
                const newCardsHTML = nextBatch.map(negocio => crearTarjetaNegocio(negocio)).join('');
                contenedor.insertAdjacentHTML('beforeend', newCardsHTML);
                loadMoreBtn.dataset.currentIndex = nextIndex;
                
                // Restaurar texto del botón
                // Actualizar el texto del botón según el rubro
                const buttonText = `Cargar más ${rubro.slice(0, -1)}${rubro.endsWith('s') ? 'as' : 's'}`;
                loadMoreBtn.innerHTML = buttonText;
                loadMoreBtn.disabled = false;
                
                // Ocultar botón si no hay más negocios
                if (nextIndex >= negocios.length) {
                  loadMoreBtn.style.display = 'none';
                }
              }
              
              loadMoreBtn.dataset.isLoading = 'false';
            }, 300);
          };
          
          // Asignar evento click al botón
          loadMoreBtn.addEventListener('click', loadMoreBusinesses);
          
          // Agregar efecto hover mediante JavaScript (por si falla el CSS)
          loadMoreBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#0d6efd';
            this.style.color = 'white';
          });
          
          loadMoreBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
            this.style.color = '';
          });
          
          // Ocultar botón inicialmente si no hay más negocios
          if (negocios.length <= limit) {
            loadMoreBtn.style.display = 'none';
          }
        } else {
          console.warn(`❌ No se encontró botón de carga para ${rubro}`);
          // Crear un botón dinámicamente si no existe
          const section = document.getElementById(rubro);
          if (section) {
            const buttonContainer = section.querySelector('.text-center.mt-4');
            if (buttonContainer) {
              const newButton = document.createElement('button');
              newButton.className = 'btn btn-outline-primary load-more-btn z-10';
              newButton.setAttribute('data-category', spanishName);
              newButton.innerHTML = `Cargar más ${rubro.slice(0, -1)}${rubro.endsWith('s') ? 'as' : 's'}`;
              buttonContainer.appendChild(newButton);
              
              // Configurar el nuevo botón
              newButton.style.cursor = 'pointer';
              newButton.dataset.currentIndex = limit;
              newButton.dataset.isLoading = 'false';
              
              // Función para cargar más negocios
              const loadMoreBusinesses = function() {
                if (newButton.dataset.isLoading === 'true' || 
                    parseInt(newButton.dataset.currentIndex) >= negocios.length) {
                  return;
                }
                
                newButton.dataset.isLoading = 'true';
                newButton.disabled = true;
                newButton.innerHTML = `
                  <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Cargando...
                `;
                
                setTimeout(() => {
                  const currentIndex = parseInt(newButton.dataset.currentIndex);
                  const nextIndex = currentIndex + 6;
                  const nextBatch = negocios.slice(currentIndex, nextIndex);
                  
                  if (nextBatch.length > 0) {
                    const newCardsHTML = nextBatch.map(negocio => crearTarjetaNegocio(negocio)).join('');
                    contenedor.insertAdjacentHTML('beforeend', newCardsHTML);
                    newButton.dataset.currentIndex = nextIndex;
                    
                    const buttonText = `Cargar más ${rubro.slice(0, -1)}${rubro.endsWith('s') ? 'as' : 's'}`;
                    newButton.innerHTML = buttonText;
                    newButton.disabled = false;
                    
                    if (nextIndex >= negocios.length) {
                      newButton.style.display = 'none';
                    }
                  }
                  
                  newButton.dataset.isLoading = 'false';
                }, 300);
              };
              
              newButton.addEventListener('click', loadMoreBusinesses);
              newButton.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#0d6efd';
                this.style.color = 'white';
              });
              
              newButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
                this.style.color = '';
              });
              
              if (negocios.length <= limit) {
                newButton.style.display = 'none';
              }
            }
          }
        }
        
        // Forzar reflow si es necesario
        if (contenedor.children.length === 0) {
          console.warn(`⚠️ Renderizado fallido en ${rubro}. Forzando reflow...`);
          contenedor.style.display = 'none';
          contenedor.offsetHeight; // trigger reflow
          contenedor.style.display = '';
          contenedor.innerHTML = cardsHTML;
        }
        
        // Forzamos un reflow para que Lighthouse lo detecte
        contenedor.offsetHeight;
        loadedSections++;
        checkInitialization();
      }); 
    } catch (err) {
      console.error(`Error cargando ${rubro}:`, err);
      contenedor.innerHTML = '<div class="col-12"><p class="text-center text-danger">Error al cargar negocios.</p></div>';
      loadedSections++;
      checkInitialization();
    }
  }

  // === MODAL DETALLADO DEL NEGOCIO ===
  document.addEventListener('click', function(e) {
    const image = e.target.closest('.clickable-image');
    if (!image) return;
    const negocio = JSON.parse(image.dataset.business);
    const modal = document.getElementById('businessModal');
    // Llenar el modal con los datos
    document.getElementById('modalImage').src = negocio.imagen;
    document.getElementById('modalImage').alt = negocio.nombre;
    document.getElementById('modalName').textContent = negocio.nombre;
    document.getElementById('modalAddress').textContent = negocio.direccion || 'No disponible';
    document.getElementById('modalHours').textContent = negocio.horario;
    document.getElementById('modalPhone').textContent = negocio.telefono;
    //document.getElementById('modalWhatsapp').href = `https://wa.me/${negocio.whatsapp}?text=Hola%20desde%20BarrioClik`;
    //document.getElementById('modalWebsite').href = negocio.pagina;
    //document.getElementById('modalMap').href = `https://maps.google.com/?daddr=${negocio.latitud},${negocio.longitud}`;
    // Actualizar el título del modal
    const modalWhatsapp = document.getElementById('modalWhatsapp');
modalWhatsapp.href = `https://wa.me/${negocio.whatsapp}?text=Hola%20desde%20BarrioClik`;
modalWhatsapp.setAttribute('data-analytics', 'whatsapp');
modalWhatsapp.setAttribute('data-negocio', negocio.nombre);

const modalWebsite = document.getElementById('modalWebsite');
modalWebsite.href = negocio.pagina;
modalWebsite.setAttribute('data-analytics', 'web');
modalWebsite.setAttribute('data-negocio', negocio.nombre);

const modalMap = document.getElementById('modalMap');
modalMap.href = `https://maps.google.com/?daddr=${negocio.latitud},${negocio.longitud}`;
modalMap.setAttribute('data-analytics', 'ubicacion');
modalMap.setAttribute('data-negocio', negocio.nombre);

// Si tiene promo
const modalPromo = document.getElementById('modalPromo');
if (modalPromo && negocio.promo) {
  modalPromo.style.display = 'inline-block';
  modalPromo.setAttribute('data-analytics', 'promocion');
  modalPromo.setAttribute('data-negocio', negocio.nombre);
  modalPromo.setAttribute('data-promo', negocio.promo);
  modalPromo.textContent = negocio.promo;
} else if(modalPromo) {
  modalPromo.style.display = 'none';
}

    document.getElementById('businessModalLabel').textContent = negocio.nombre;
  });

  // Asegurarse de que el modal se cierre correctamente
  document.getElementById('businessModal')?.addEventListener('hidden.bs.modal', function () {
    // Opcional: limpiar contenido al cerrar
    const img = document.getElementById('modalImage');
    if (img) img.src = '';
  });

  // --- INICIALIZACIÓN DE FUNCIONALIDADES ---
  function checkInitialization() {
    if (loadedSections === totalSections) {
      console.log(`✅ Todos los negocios cargados: ${window.businesses.length}`);
      saveBusinessesToCache(window.businesses);
      // Inicializar características
      initializeFeatures();
      // Inicializar mapa
      initMapLogic();
      // Configurar botón de ubicación
      setupLocationButton();
    }
  }

  function initializeFeatures() {
    if (window.businesses.length === 0) {
      // Intentar cargar desde caché si no hay negocios
      if (loadBusinessesFromCache() && window.businesses.length > 0) {
        console.log("✅ Negocios cargados desde caché");
        initializeFeatures();
        initMapLogic();
        setupLocationButton();
        return;
      }
      return;
    }
    // --- CREAR ÍNDICE DE BÚSQUEDA ---
    createBusinessIndex(window.businesses);
   // --- BÚSQUEDA MEJORADA CON OFICIOS Y EMPRENDIMIENTOS ---
// --- BÚSQUEDA MEJORADA (reemplaza search-functionality.js) ---
window.searchBusinesses = function() {
  const searchInput = document.getElementById("searchInput");
  const modalBody = document.getElementById("searchModalBody");
  const loading = document.querySelector(".loading-overlay");
  if (!searchInput || !modalBody || !loading) return;

  const bootstrapModal = new bootstrap.Modal(document.getElementById("searchModal"));
  const query = searchInput.value.trim();
  if (!query) {
    modalBody.innerHTML = "<p>Ingresa un término de búsqueda.</p>";
    bootstrapModal.show();
    return;
  }

  loading.style.display = "flex";

  // === PALABRAS CLAVE PARA OFICIOS Y EMPRENDIMIENTOS ===
  const OFICIOS_KEYWORDS = [
    'albañil', 'albañiles', 'electricista', 'electricistas', 'plomero', 'plomeros',
    'fontanero', 'fontaneros', 'cerrajero', 'cerrajeros', 'herrero', 'herreros',
    'jardinero', 'jardineros', 'limpieza', 'mecánico', 'mecánicos', 'pintor',
    'pintores', 'transporte', 'flete', 'delivery local'
  ];
  const EMPRENDIMIENTOS_KEYWORDS = [
    'artesanía', 'artesanal', 'moda', 'tecnología', 'belleza', 'educación',
    'hogar', 'mascotas', 'gastronomía', 'comida casera', 'catering', 'pastelería',
    'manualidades', 'cursos', 'talleres', 'decoración', 'ropa artesanal'
  ];

  function normalizeText(str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  const normalizedQuery = normalizeText(query);

  // ✅ Detectar OFICIOS
  const isOficios = OFICIOS_KEYWORDS.some(kw => normalizeText(kw).includes(normalizedQuery));
  if (isOficios) {
    loading.style.display = "none";
    modalBody.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-hard-hat fa-2x text-primary mb-3"></i>
        <h5>¿Buscás un oficio?</h5>
        <p class="text-muted">Albañiles, electricistas, plomeros y más.</p>
        <a href="oficios.html" class="btn btn-primary">Ver oficios disponibles</a>
      </div>
    `;
    bootstrapModal.show();
    return;
  }

  // ✅ Detectar EMPRENDIMIENTOS
  const isEmprendimientos = EMPRENDIMIENTOS_KEYWORDS.some(kw => normalizeText(kw).includes(normalizedQuery));
  if (isEmprendimientos) {
    loading.style.display = "none";
    modalBody.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-lightbulb fa-2x text-warning mb-3"></i>
        <h5>¿Buscás emprendimientos?</h5>
        <p class="text-muted">Gastronomía, artesanía, moda y más.</p>
        <a href="emprendimientos.html" class="btn btn-warning">Explorar emprendimientos</a>
      </div>
    `;
    bootstrapModal.show();
    return;
  }

  // === BÚSQUEDA NORMAL EN COMERCIOS ===
  const results = window.businesses.filter(business => {
    const nameMatch = business.name && normalizeText(business.name).includes(normalizedQuery);
    const categoryMatch = business.category && normalizeText(business.category).includes(normalizedQuery);
    const addressMatch = business.address && normalizeText(business.address).includes(normalizedQuery);
    return nameMatch || categoryMatch || addressMatch;
  });

  const openResults = results.filter(b => isBusinessOpen(b.hours));
  loading.style.display = "none";

  if (openResults.length > 0) {
    modalBody.innerHTML = openResults.map(business => `
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
            <span class="badge ${isBusinessOpen(business.hours) ? 'bg-success' : 'bg-danger'} ms-2">
              ${isBusinessOpen(business.hours) ? 'Abierto' : 'Cerrado'}
            </span>
          </p>
          <div class="result-card-buttons">
            <button class="result-btn btn-whatsapp" 
                    onclick="openWhatsApp('${business.whatsapp || '5491157194796'}')">
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
    `).join('');
  } else {
    modalBody.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="fas fa-search fa-2x mb-3" style="color: #dc3545;"></i>
        <p class="mb-0">No se encontraron negocios abiertos con ese criterio.</p>
      </div>
    `;
  }
  bootstrapModal.show();
};

// === FUNCIONES GLOBALES PARA BOTONES DEL MODAL ===
window.openWhatsApp = function (whatsapp) {
  window.open(`https://wa.me/${whatsapp}?text=Hola%20desde%20Tu%20Barrio%20a%20un%20Clik`, '_blank');
};
window.openWebsite = function (url) {
  if (url && url !== '#') window.open(url, '_blank');
};
window.openMap = function (lat, lng) {
  if (lat && lng) window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
};
window.callPhone = function (phone) {
  if (phone) window.open(`tel:${phone}`);
};
    const searchButton = document.querySelector('button[onclick="searchBusinesses()"]');
    if (searchButton) {
      searchButton.addEventListener("click", window.searchBusinesses);
    }
    // --- CARRUSEL ---
    // Reemplaza la función existente en main.js que maneja el carrusel
// Busca y reemplaza la sección que dice "// --- CARRUSEL ---" con este código mejorado:

// --- CARRUSEL INFINITO DE NEGOCIOS (CARGADO DESDE carousel.json) ---
const carouselContainer = document.getElementById("carouselContainer");
if (carouselContainer) {
  // Mostrar estado de carga
  carouselContainer.innerHTML = '<div class="text-center py-3 text-dark">Cargando negocios destacados...</div>';
  
  // Cargar el carrusel desde carousel.json
  fetch("data/carousel.json")
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(carouselItems => {
      // Verificar que tenemos datos
      if (!carouselItems || carouselItems.length === 0) {
        throw new Error("No se encontraron items para el carrusel");
      }
      
      // Limpiar el contenedor
      carouselContainer.innerHTML = '';
      
      // Crear los elementos del carrusel
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
      
      // Duplicar items para efecto infinito
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
      
      console.log(`✅ Carrusel cargado con ${carouselItems.length} negocios (duplicados para efecto infinito)`);
      
      // Forzar reflow para asegurar renderizado
      carouselContainer.offsetHeight;
    })
    .catch(err => {
      console.error("Error cargando carrusel:", err);
      carouselContainer.innerHTML = '<p class="text-center text-danger py-3">Error al cargar negocios destacados.</p>';
    });
}

// Función para scroll del carrusel (mantiene la lógica infinita)
window.scrollCarousel = function(offset) {
  const container = document.querySelector(".carousel-container");
  if (!container) return;
  
  const newPos = container.scrollLeft + offset;
  container.scrollTo({ left: newPos, behavior: "smooth" });
  
  // Reset infinito
  const maxScroll = container.scrollWidth / 2;
  if (newPos >= maxScroll) {
    setTimeout(() => container.scrollTo({ left: 0, behavior: 'auto' }), 500);
  } else if (newPos <= 0) {
    setTimeout(() => container.scrollTo({ left: maxScroll, behavior: 'auto' }), 500);
  }
};

// Agregar soporte para navegación con teclado y accesibilidad
document.addEventListener('DOMContentLoaded', function() {
  const prevBtn = document.querySelector('.nav-arrow.prev');
  const nextBtn = document.querySelector('.nav-arrow.next');
  
  if (prevBtn) {
    prevBtn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollCarousel(-168);
      }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollCarousel(168);
      }
    });
  }
});

// Auto-scroll opcional (comentado por defecto)

let autoScrollInterval;
function startAutoScroll() {
  autoScrollInterval = setInterval(() => {
    scrollCarousel(168);
  }, 4000);
}

function stopAutoScroll() {
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
  }
}

// Iniciar auto-scroll cuando el mouse no está sobre el carrusel
const carouselSlider = document.querySelector('.carousel-slider');
if (carouselSlider) {
  carouselSlider.addEventListener('mouseenter', stopAutoScroll);
  carouselSlider.addEventListener('mouseleave', startAutoScroll);
  startAutoScroll();
}

    // --- PROMOCIONES ---
    const offerContainer = document.getElementById("offerContainer");
    if (offerContainer) {
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
          // Forzamos reflow para Lighthouse
          offerContainer.offsetHeight;
        })
        .catch(err => {
          console.error("Error cargando promociones:", err);
          offerContainer.innerHTML = '<p class="text-center text-danger">Error al cargar promociones.</p>';
        });
    }
    window.scrollOffers = function(offset) {
      const container = document.querySelector(".offer-container");
      if (container) {
        container.scrollLeft += offset;
      }
    };
    // --- BOTONES WHATSAPP ---
    function checkWhatsAppButtons() {
      document.querySelectorAll(".btn-whatsapp[data-hours]").forEach(btn => {
        const hours = btn.getAttribute("data-hours");
        const isOpen = isBusinessOpen(hours);
        btn.classList.toggle("disabled", !isOpen);
        btn.style.pointerEvents = isOpen ? "auto" : "none";
        btn.style.opacity = isOpen ? "1" : "0.5";
        btn.innerHTML = `<i class="fab fa-whatsapp me-1"></i> ${isOpen ? "Contactar por WhatsApp" : "Negocio Cerrado"}`;
      });
    }
    // Ejecutar inmediatamente y luego cada minuto
    checkWhatsAppButtons();
    setInterval(checkWhatsAppButtons, 60000);
    // --- PWA INSTALL ---
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
        }
      });
    });
    // --- MENÚ MÓVIL ---
    const mobileMenuToggle = document.getElementById("mobileMenuToggle");
    const mobileMenuModal = document.getElementById("mobileMenuModal");
    const mobileMenuClose = document.getElementById("mobileMenuClose");
    if (mobileMenuToggle && mobileMenuModal) {
      mobileMenuToggle.addEventListener("click", () => {
        const modal = new bootstrap.Modal(mobileMenuModal);
        modal.show();
      });
    }
    if (mobileMenuClose && mobileMenuModal) {
      mobileMenuClose.addEventListener("click", () => {
        const modal = bootstrap.Modal.getInstance(mobileMenuModal);
        if (modal) modal.hide();
      });
    }
    // --- Volver arriba ---
    const backToTop = document.getElementById("backToTop");
    if (backToTop) {
      window.addEventListener("scroll", () => {
        backToTop.classList.toggle("d-none", window.scrollY <= 300);
      }, { passive: true });
      backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  // --- Service Worker + Modal de Actualización (MEJORADO) ---

    // Refrescar animaciones AOS
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  }

  // --- ÍNDICE DE BÚSQUEDA ---
  function createBusinessIndex(businesses) {
    const index = {
      byCategory: {},
      byName: {},
      byLocation: [],
      totalItems: businesses.length
    };
    // Índice por categoría
    businesses.forEach(business => {
      const category = business.category || 'Otros';
      if (!index.byCategory[category]) {
        index.byCategory[category] = [];
      }
      index.byCategory[category].push(business);
      // Índice por nombre (para búsquedas rápidas)
      const nameKey = normalizeText(business.name);
      if (!index.byName[nameKey]) {
        index.byName[nameKey] = [];
      }
      index.byName[nameKey].push(business);
      // Índice por ubicación para búsquedas geoespaciales
      if (business.latitude && business.longitude) {
        index.byLocation.push({
          business,
          lat: business.latitude,
          lng: business.longitude
        });
      }
    });
    businessIndex = index;
    console.log(`✅ Índice de búsqueda creado con ${index.totalItems} elementos`);
  }

  // Buscar negocios usando el índice
  function searchBusinesses(query) {
    if (!businessIndex) {
      console.warn('Índice de búsqueda no inicializado');
      return window.businesses || [];
    }
    const normalizedQuery = normalizeText(query);
    const results = new Set();
    // Búsqueda por nombre
    if (normalizedQuery.length > 2) {
      Object.keys(businessIndex.byName).forEach(key => {
        if (key.includes(normalizedQuery)) {
          businessIndex.byName[key].forEach(business => results.add(business));
        }
      });
    }
    // Si no hay resultados de búsqueda, devolver todos
    if (results.size === 0 && normalizedQuery.length === 0) {
      return window.businesses || [];
    }
    return Array.from(results);
  }

  // --- INICIALIZAR MAPA ---
  function initMapLogic() {
    // Verificar si Leaflet está disponible
    if (!isLeafletAvailable()) {
      console.log("Leaflet no está disponible. Programando verificación...");
      setTimeout(checkLeafletAndInit, 300);
      return;
    }
    setupMap();
  }

  // Verificar si Leaflet está disponible
  function isLeafletAvailable() {
    return typeof L !== 'undefined' && L && L.map && L.marker;
  }

  function checkLeafletAndInit() {
    if (typeof window.leafletCheckAttempts === 'undefined') {
      window.leafletCheckAttempts = 0;
      window.MAX_LEAFLET_CHECK_ATTEMPTS = 10;
    }
    window.leafletCheckAttempts++;
    if (isLeafletAvailable()) {
      console.log("✅ Leaflet se ha cargado correctamente después de", window.leafletCheckAttempts, "intentos");
      setupMap();
      return;
    }
    if (window.leafletCheckAttempts < window.MAX_LEAFLET_CHECK_ATTEMPTS) {
      console.log(`⏳ Esperando a que Leaflet se cargue... (intento ${window.leafletCheckAttempts}/${window.MAX_LEAFLET_CHECK_ATTEMPTS})`);
      setTimeout(checkLeafletAndInit, 300);
    } else {
      console.error("❌ Error crítico: Leaflet no se cargó después de", window.MAX_LEAFLET_CHECK_ATTEMPTS, "intentos");
    }
  }

  function setupMap() {
    if (setupComplete) {
      console.log("La configuración del mapa ya se completó");
      return;
    }
    // Verificar si existe el contenedor del mapa
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.log("No se encontró el contenedor del mapa. Esperando...");
      setTimeout(setupMap, 300);
      return;
    }
    // Verificar si existe la lista de negocios
    const businessList = document.getElementById('businessList');
    if (!businessList) {
      console.log("No se encontró el contenedor de lista de negocios. Esperando...");
      setTimeout(setupMap, 300);
      return;
    }
    // Guardar referencia al contenedor de la lista
    businessListContainer = document.getElementById('businessListContainer') || 
                           document.querySelector('.business-list-container');
    // Verificar si los negocios ya están cargados
    if (window.businesses.length === 0) {
      console.log("Negocios no cargados aún. Esperando...");
      setTimeout(setupMap, 500);
      return;
    }
    // Crear función debounce para actualizar la lista de negocios
    updateBusinessListDebounced = debounce(function() {
      if (window.businesses && window.map && isMapReady) {
        updateBusinessList(window.businesses);
      }
    }, 500, true);
    // Inicializar el mapa
    initMap();
    setupComplete = true;
  }

  function initMap() {
    // Verificar si el mapa ya ha sido inicializado
    if (window.mapInitialized) {
      console.log("El mapa ya ha sido inicializado, omitiendo inicialización");
      return;
    }
    // Verificar si el contenedor del mapa existe
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error("No se encontró el contenedor del mapa");
      setTimeout(initMap, 500);
      return;
    }
    // Verificar si Leaflet está disponible
    if (!isLeafletAvailable()) {
      console.error("Leaflet no está disponible al intentar inicializar el mapa");
      setTimeout(checkLeafletAndInit, 300);
      return;
    }
    try {
      // Si ya hay un mapa, eliminarlo
      if (window.map && window.map.remove) {
        window.map.remove();
      }
      // Configuración optimizada para mejor rendimiento del mapa
      window.map = L.map('map', {
        center: [-34.652, -58.643],
        zoom: 13,
        scrollWheelZoom: false,
        touchZoom: true,
        dragging: true,
        zoomControl: true,
        trackResize: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        bounceAtZoomLimits: false,
        inertia: true,
        inertiaDeceleration: 3000,
        inertiaMaxSpeed: 1500,
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        trackResize: true,
        preferCanvas: true
      });
      // Usar un tile layer más rápido
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        detectRetina: true,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 5,
        maxNativeZoom: 18,
        maxZoom: 19,
        loadingClass: 'loading',
        unloadInvisibleTiles: true,
        reuseTiles: true
      }).addTo(window.map);
      // Evento para activar scrollWheelZoom al hacer clic en el mapa
      window.map.on('click', function() {
        if (!window.map.scrollWheelZoom.enabled()) {
          window.map.scrollWheelZoom.enable();
          // Eliminar el hint de zoom
          const zoomHint = document.getElementById('mapZoomHint');
          if (zoomHint && zoomHint.parentNode) {
            zoomHint.parentNode.removeChild(zoomHint);
          }
        }
      });
      // Añadir hint de zoom
      const zoomHint = document.createElement('div');
      zoomHint.id = 'mapZoomHint';
      zoomHint.className = 'map-zoom-hint';
      zoomHint.innerHTML = `
        <div class="hint-content">
          <i class="fas fa-mouse-pointer me-2"></i>
          <span>Haz clic en el mapa para activar el zoom con la rueda</span>
        </div>
      `;
      mapContainer.appendChild(zoomHint);
      // Optimización para mejor rendimiento del zoom
      window.map.on('zoomstart', function() {
        mapContainer.classList.add('map-loading');
        clearTimeout(window.mapZoomTimeout);
      });
      window.map.on('zoomend', function() {
        window.mapZoomTimeout = setTimeout(() => {
          mapContainer.classList.remove('map-loading');
          if (window.businesses && isMapReady) {
            updateBusinessListDebounced();
          }
        }, 150);
      });
      // Optimización para mejor rendimiento del movimiento
      window.map.on('movestart', function() {
        mapContainer.classList.add('map-loading');
      });
      window.map.on('moveend', function() {
        setTimeout(() => {
          mapContainer.classList.remove('map-loading');
          if (window.businesses && isMapReady) {
            updateBusinessListDebounced();
          }
        }, 75);
      });
      // Marcar como inicializado
      window.mapInitialized = true;
      isMapReady = true;
      // Forzar actualización del tamaño
      setTimeout(() => {
        window.map.invalidateSize();
        console.log("Tamaño del mapa actualizado");
        // Agregar marcadores
        addMapMarkers();
      }, 100);
      console.log("✅ Mapa inicializado correctamente");
    } catch (e) {
      console.error("Error al inicializar el mapa:", e);
      setTimeout(initMap, 500);
    }
  }

  // AGREGAR MARCADORES CON VERIFICACIÓN ROBUSTA Y OPTIMIZACIONES
  function addMapMarkers() {
    // Verificar si Leaflet está disponible
    if (!isLeafletAvailable()) {
      console.warn("Leaflet no está disponible. Programando reintento...");
      setTimeout(checkLeafletAndInit, 300);
      return;
    }
    // Verificar si el mapa está inicializado
    if (!window.map || typeof window.map.addLayer !== 'function') {
      console.warn("El mapa no está inicializado correctamente. Programando reintento...");
      setTimeout(initMap, 300);
      return;
    }
    // Verificar si hay negocios disponibles
    if (window.businesses.length === 0) {
      console.log("No hay negocios disponibles para mostrar en el mapa");
      return;
    }
    try {
      // Limpiar marcadores anteriores
      if (window.businessMarkers) {
        window.map.removeLayer(window.businessMarkers);
      }
      // Crear un grupo de marcadores
      window.businessMarkers = L.featureGroup();
      // Crear marcadores para TODOS los negocios abiertos con ubicación
      const markers = [];
      window.businesses.forEach(business => {
        if (business.latitude && business.longitude && isBusinessOpen(business.hours)) {
          const marker = createBusinessMarker(business);
          markers.push(marker);
        }
      });
      console.log(`✅ ${markers.length} pines agregados al mapa`);
      // Usar clustering
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
    } catch (e) {
      console.error("Error al agregar marcadores al mapa:", e);
    }
  }

  // Crear marcador individual
  function createBusinessMarker(business) {
    const marker = L.marker([business.latitude, business.longitude], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-dot ${isBusinessOpen(business.hours) ? 'open' : 'closed'}"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      }),
      businessData: business
    });
    // Usar evento de apertura de popup en lugar de click para mejor rendimiento
    marker.on('popupopen', function() {
      const business = this.businessData;
      const popupContent = `
        <div class="custom-popup">
          <h6 class="mb-1">${business.name}</h6>
          <p class="text-muted mb-1" style="font-size: 0.85rem;">${business.category || 'Sin categoría'}</p>
          <div class="d-flex gap-2 mt-2">
            <a href="${business.url || '#'}" target="_blank" class="btn btn-sm btn-primary" style="font-size: 0.8rem;">Ver más</a>
            <a href="https://wa.me/${business.whatsapp}" target="_blank" class="btn btn-sm btn-success" style="font-size: 0.8rem;">Chat</a>
          </div>
        </div>
      `;
      this.setPopupContent(popupContent);
    });
    return marker;
  }

  // --- UBICACIÓN DEL USUARIO ---
  function setupLocationButton() {
    const locateMeButton = document.getElementById('locateMe');
    if (!locateMeButton) {
      console.log("Botón 'Mostrar mi ubicación' no encontrado. Esperando...");
      setTimeout(setupLocationButton, 300);
      return;
    }
    locateMeButton.addEventListener('click', () => {
      console.log("Botón 'Mostrar mi ubicación' clicado");
      // Verificar si el mapa está listo
      if (!window.map || typeof window.map.addLayer !== 'function') {
        alert('El mapa aún no está listo. Por favor, espera unos segundos e intenta nuevamente.');
        return;
      }
      // Mostrar spinner
      const originalText = locateMeButton.innerHTML;
      locateMeButton.disabled = true;
      locateMeButton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        Obteniendo ubicación...
      `;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const accuracyMeters = Math.round(accuracy);
            console.log(`📍 Ubicación obtenida: ${latitude}, ${longitude} (precisión: ${accuracyMeters}m)`);
            // Eliminar marcadores anteriores
            if (window.userMarker) window.map.removeLayer(window.userMarker);
            if (window.userAccuracyCircle) window.map.removeLayer(window.userAccuracyCircle);
            // Crear nuevo marcador del usuario
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
            // Centrar el mapa
            window.map.setView([latitude, longitude], 14);
            // Actualizar lista de negocios cercanos
            updateBusinessList(window.businesses);
            // Restaurar botón
            locateMeButton.innerHTML = `
              <i class="fas fa-location-dot me-1"></i>
              Mi ubicación (${accuracyMeters}m)
            `;
            locateMeButton.disabled = false;
          },
          (error) => {
            console.error("Error de geolocalización:", error);
            let message = "No se pudo obtener tu ubicación: ";
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message += "permiso denegado.";
                break;
              case error.POSITION_UNAVAILABLE:
                message += "ubicación no disponible.";
                break;
              case error.TIMEOUT:
                message += "tiempo de espera agotado.";
                break;
              default:
                message += "error desconocido.";
            }
            alert(message);
            locateMeButton.innerHTML = `
              <i class="fas fa-location-dot me-1"></i>
              Mostrar mi ubicación
            `;
            locateMeButton.disabled = false;
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        alert("Tu navegador no soporta geolocalización.");
        locateMeButton.disabled = false;
      }
    });
  }

  // --- ACTUALIZAR LISTA DE COMERCIOS CERCANOS ---
  function updateBusinessList(businesses) {
    const businessList = document.getElementById('businessList');
    const businessListContainer = document.getElementById('businessListContainer') || 
                                 document.querySelector('.business-list-container');
    if (!businessList) {
      console.error("❌ No se encontró el elemento #businessList");
      return;
    }
    // Si no hay usuario marcado, no podemos calcular distancias
    if (!window.userMarker) {
      businessList.innerHTML = `
        <div class="text-center text-muted py-3">
          <p>Por favor, haz clic en "Mostrar mi ubicación" para ver los comercios cercanos.</p>
        </div>
      `;
      if (businessListContainer) {
        businessListContainer.style.display = 'block';
      }
      return;
    }
    try {
      const userLatLng = window.userMarker.getLatLng();
      // Filtrar y ordenar TODOS los negocios abiertos y cercanos (≤ 10 km)
      const openBusinesses = businesses
        .filter(business => business.latitude && business.longitude)
        .map(business => {
          const distance = window.map.distance(userLatLng, L.latLng(business.latitude, business.longitude)) / 1000;
          return { ...business, distance };
        })
        .filter(business => isBusinessOpen(business.hours) && business.distance <= 10)
        .sort((a, b) => a.distance - b.distance);
      console.log(`✅ ${openBusinesses.length} negocios abiertos encontrados dentro de 10 km`);
      // Renderizado DIRECTO (sin virtual scrolling ni modal)
      if (openBusinesses.length > 0) {
        businessList.innerHTML = openBusinesses.map(business => `
          <div class="col-12 col-md-6 col-lg-4 mb-2">
            <div class="border rounded p-3 bg-white shadow-sm">
              <h6 class="mb-1">${business.name}</h6>
              <p class="text-muted mb-1" style="font-size: 0.85rem;">${business.category || 'Sin categoría'}</p>
              <p class="text-muted mb-2" style="font-size: 0.85rem;">${business.address || 'Dirección no disponible'}</p>
              <p class="mb-2" style="font-size: 0.85rem;">
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
      // Mostrar el contenedor debajo del mapa
      if (businessListContainer) {
        businessListContainer.style.display = 'block';
      } else {
        console.warn("⚠️ No se encontró el contenedor de la lista de negocios");
      }
    } catch (e) {
      console.error("Error al actualizar la lista de negocios:", e);
      businessList.innerHTML = `
        <div class="col-12">
          <p class="text-center text-danger">Error al cargar los comercios.</p>
        </div>
      `;
      if (businessListContainer) {
        businessListContainer.style.display = 'block';
      }
    }
  }

  // --- FUNCIONES AUXILIARES ---
  // Función debounce para optimizar actualizaciones
  function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const context = this;
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  // Función para asegurar que el mapa se muestre correctamente
  function ensureMapIsVisible() {
    if (window.map && window.mapInitialized) {
      // Forzar actualización del tamaño
      window.map.invalidateSize();
      // Si el mapa está en un tab o elemento oculto, esperar a que sea visible
      const mapContainer = document.getElementById('map');
      if (mapContainer && mapContainer.offsetParent === null) {
        console.log("El mapa está en un contenedor oculto. Monitoreando visibilidad...");
        const observer = new MutationObserver((mutations) => {
          if (mapContainer.offsetParent !== null) {
            observer.disconnect();
            console.log("El contenedor del mapa ahora es visible. Actualizando tamaño...");
            setTimeout(() => {
              window.map.invalidateSize();
              addMapMarkers();
            }, 300);
          }
        });
        observer.observe(mapContainer.parentElement, {
          attributes: true,
          childList: true,
          subtree: true
        });
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
  // Selecciona todos los elementos que tengan data-analytics
  const trackableElements = document.querySelectorAll("[data-analytics]");

  trackableElements.forEach(el => {
    el.addEventListener("click", () => {
      const tipo = el.dataset.analytics;        // whatsapp | ubicacion | promocion | otro
      const negocio = el.dataset.negocio || "Sin nombre";
      const promo = el.dataset.promo || "";
      const extra = el.dataset.extra || "";     // por si en el futuro querés agregar algo más

      // Nombre del evento en GA4
      const eventName = `click_${tipo}`;

      // Parámetros a enviar
      const params = {
        negocio: negocio,
        promo: promo,
        extra: extra
      };

      // Enviar a Google Analytics (si está disponible)
      if (typeof gtag === "function") {
        gtag("event", eventName, params);
        console.log(`Evento enviado a GA4: ${eventName}`, params);
      } else {
        console.warn("gtag no está definido, revisa la integración de GA4.");
      }
    });
  });
});

  // Corrección definitiva para el problema de aria-hidden
  function fixAriaHiddenIssue() {
    const searchModal = document.getElementById('searchModal');
    if (searchModal) {
      // Corrección inmediata
      searchModal.setAttribute('aria-hidden', 'false');
      // Corrección para cuando se muestra el modal
      searchModal.addEventListener('show.bs.modal', function() {
        this.setAttribute('aria-hidden', 'false');
      });
      // Corrección para cuando se oculta el modal
      searchModal.addEventListener('hidden.bs.modal', function() {
        this.setAttribute('aria-hidden', 'true');
      });
      // Verificar si el modal ya está visible
      if (searchModal.style.display === 'block' || searchModal.classList.contains('show')) {
        searchModal.setAttribute('aria-hidden', 'false');
      }
    }
    // También corregir cualquier otro modal que pueda tener el problema
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
      if (modal.style.display === 'block' || modal.classList.contains('show')) {
        modal.setAttribute('aria-hidden', 'false');
      }
    });
  }
  // --- MODAL DE BIENVENIDA PARA NUEVOS USUARIOS ---
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

  // Mostrar el modal de bienvenida después de que todo esté listo
  setTimeout(showWelcomeModal, 1500);
  // --- INICIALIZACIÓN FINAL ---
  if (loadBusinessesFromCache() && window.businesses.length > 0) {
    console.log("✅ Negocios cargados desde caché");
    initializeFeatures();
    initMapLogic();
    setupLocationButton();
  } else {
    // Cargar todas las secciones en paralelo (más rápido)
    Object.keys(secciones).forEach(rubro => {
      cargarSeccion(rubro);
    });
  }
  // Ejecutar cuando cambia el tamaño de la ventana
  window.addEventListener('resize', () => {
    setTimeout(ensureMapIsVisible, 100);
  });
  // También ejecutar cuando se muestra un modal o tab que contiene el mapa
  document.addEventListener('shown.bs.tab', ensureMapIsVisible);
  document.addEventListener('shown.bs.modal', ensureMapIsVisible);
  // Corregir el problema de aria-hidden
  fixAriaHiddenIssue();
  // --- EXPORTAR FUNCIONES GLOBALES ---
  window.setupLocationButton = setupLocationButton;
  window.updateBusinessList = updateBusinessList;
  window.isBusinessOpen = isBusinessOpen;
}); 