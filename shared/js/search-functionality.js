// search-functionality.js - Versión final: autónoma y segura
(function () {
  // === FUNCIONES AUXILIARES (definidas localmente para no depender de main.js) ===
  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, '');
  }

  // Esperar a que main.js haya cargado window.businesses e isBusinessOpen
  function waitForMainJS(callback) {
    const maxAttempts = 50;
    let attempts = 0;
    const interval = setInterval(() => {
      if (window.businesses && Array.isArray(window.businesses) && typeof isBusinessOpen === 'function') {
        clearInterval(interval);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('❌ No se cargaron los datos de main.js después de 5 segundos');
        const input = document.getElementById('searchInput');
        if (input) {
          input.placeholder = 'Error al cargar la búsqueda...';
          input.disabled = true;
        }
      } else {
        attempts++;
      }
    }, 100);
  }

  // Inicializar cuando esté listo
  waitForMainJS(initEnhancedSearch);

  function initEnhancedSearch() {
    const input = document.getElementById('searchInput');
    const button = document.getElementById('searchButton');
    const modalBody = document.getElementById('searchModalBody');
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('searchModal'));
    const loading = document.querySelector('.loading-overlay');

    if (!input || !button || !modalBody || !modal) {
      console.error('❌ Elementos del DOM no encontrados para búsqueda.');
      return;
    }

    // === FUNCIÓN DE BÚSQUEDA SEGURA ===
    function searchBusinesses(query) {
      if (!query || !window.businesses) return [];
      const normalizedQuery = normalizeText(query);
      return window.businesses.filter(business => {
        const nameMatch = business.name && normalizeText(business.name).includes(normalizedQuery);
        const categoryMatch = business.category && normalizeText(business.category).includes(normalizedQuery);
        const addressMatch = business.address && normalizeText(business.address).includes(normalizedQuery);
        return nameMatch || categoryMatch || addressMatch;
      });
    }

    // === FUNCIÓN GLOBAL DE BÚSQUEDA MEJORADA ===
    window.enhancedSearch = function () {
      const query = input.value.trim();
      if (!query) return;

      loading.style.display = 'flex';

      try {
        const results = searchBusinesses(query);
        const openResults = results.filter(b => isBusinessOpen(b.hours));

        if (openResults.length > 0) {
          modalBody.innerHTML = openResults.map(business => `
            <div class="result-card animate-fade-in-up">
              <img src="${business.image || 'https://placehold.co/300x200/cccccc/666666?text=Sin+imagen'}" 
                   alt="${business.name}" 
                   class="result-card-img w-100">
              <div class="result-card-body">
                <h5 class="result-card-title">${business.name}</h5>
                <div class="result-card-category">
                  <i class="fas fa-tag"></i> ${getCategoryDisplayName(business.category)}
                </div>
                <p class="result-card-info">
                  <i class="fas fa-map-marker-alt"></i> ${business.address || 'Dirección no disponible'}
                </p>
                <p class="result-card-hours">
                  <i class="fas fa-clock"></i> 
                  ${business.hours}
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
      } catch (error) {
        console.error('Error en búsqueda:', error);
        modalBody.innerHTML = `
          <div class="text-center text-muted py-4">
            <i class="fas fa-exclamation-triangle fa-2x mb-3 text-danger"></i>
            <p class="mb-0">Error al procesar la búsqueda.</p>
          </div>
        `;
      }

      loading.style.display = 'none';
      modal.show();
    };

    // Asignar evento al botón
    button.addEventListener('click', window.enhancedSearch);

    // Buscar con Enter
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') window.enhancedSearch();
    });

    // === FUNCIONES GLOBALES PARA BOTONES ===
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

    // === CATEGORÍAS ===
    function getCategoryDisplayName(key) {
      const map = {
        'panaderias': 'Panadería',
        'pastas': 'Fiambrería de Pastas',
        'verdulerias': 'Verdulería',
        'fiambrerias': 'Fiambrería',
        'cafeterias': 'Cafetería',
        'carnicerias': 'Carnicería',
        'kioscos': 'Kiosco',
        'mascotas': 'Mascotas',
        'barberias': 'Barbería',
        'ferreterias': 'Ferretería',
        'ropa': 'Tienda de Ropa',
        'veterinarias': 'Veterinaria',
        'profesiones': 'Profesional',
        'farmacias': 'Farmacia',
        'talleres': 'Taller',
        'librerias': 'Librería',
        'mates': 'Mate',
        'florerias': 'Florería'
      };
      return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    // Corregir aria-hidden del modal
    const searchModal = document.getElementById('searchModal');
    if (searchModal) {
      searchModal.addEventListener('hidden.bs.modal', function () {
        this.setAttribute('aria-hidden', 'true');
      });
      searchModal.addEventListener('shown.bs.modal', function () {
        this.setAttribute('aria-hidden', 'false');
      });
    }
  }
})();