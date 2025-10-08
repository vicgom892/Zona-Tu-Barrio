// Estado del usuario
const appState = {
  comerciosVistos: JSON.parse(localStorage.getItem('comerciosVistos')) || []
};

let comerciosData = [];

// === Cargar comercios nuevos ===
async function cargarComerciosNuevos() {
  try {
    const response = await fetch('data/comercios-nuevos.json');
    if (!response.ok) throw new Error('No se pudo cargar comercios-nuevos.json');
    
    comerciosData = await response.json();
    verificarNuevasNotificaciones();
    llenarBannerComerciosNuevos();
    mostrarToastSiHayNuevos();
    inicializarCarrusel();
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
    manejarErrorEnContenedores();
  }
}

// Manejar errores en contenedores
function manejarErrorEnContenedores() {
  const contenedorModal = document.getElementById('contenidoNotificaciones');
  if (contenedorModal) {
    contenedorModal.innerHTML = '<p class="text-center text-red-500 text-sm py-4">Error al cargar datos.</p>';
  }

  const contenedorBanner = document.getElementById('comerciosNuevosBanner');
  if (contenedorBanner) {
    contenedorBanner.innerHTML = '<p class="text-white/80 text-sm">No se pudieron cargar los comercios.</p>';
  }
}

// === Verificar nuevas notificaciones (campanita) ===
function verificarNuevasNotificaciones() {
  const nuevos = comerciosData.filter(c => c.nuevo && !appState.comerciosVistos.includes(c.id));
  const badge = document.getElementById('badgeNotificacion');
  
  if (nuevos.length > 0 && badge) {
    badge.textContent = nuevos.length;
    badge.classList.add('scale-100', 'opacity-100');

    const campanita = document.getElementById('campanita');
    if (campanita) {
      campanita.classList.add('animate-bounce');
      setTimeout(() => campanita.classList.remove('animate-bounce'), 500);
    }
  } else if (badge) {
    badge.classList.remove('scale-100', 'opacity-100');
  }
}

// === Llenar el modal con notificaciones no vistas ===
function llenarModal() {
  const contenedor = document.getElementById('contenidoNotificaciones');
  if (!contenedor) return;

  const nuevos = comerciosData.filter(c => c.nuevo && !appState.comerciosVistos.includes(c.id));

  if (nuevos.length === 0) {
    contenedor.innerHTML = '<p class="text-center text-gray-500 text-sm py-4">No tienes nuevas notificaciones.</p>';
    return;
  }

  contenedor.innerHTML = '';
  nuevos.forEach(comercio => {
    const div = document.createElement('div');
    div.className = 'border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200';
    div.innerHTML = `
      <div class="flex items-start space-x-3">
        <img src="${comercio.imagen}" alt="${comercio.nombre}" class="w-12 h-12 rounded object-cover" style="min-width: 48px;">
        <div class="flex-1">
          <h5 class="font-semibold text-gray-800 text-sm">${comercio.nombre}</h5>
          <p class="text-xs text-gray-600">${comercio.categoria}</p>
          <p class="text-xs mt-1">
            <span class="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-yellow-900 px-2.5 py-1 rounded-full font-bold text-xs">
              <i class="fas ${getIconoPromocion(comercio.descuento)} text-xs"></i>
              ${comercio.descuento || 'Nuevo ingreso'}
            </span>
          </p>
          <a href="${comercio.url}" class="mt-2 inline-block text-xs bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition">
            Conocer comercio
          </a>
        </div>
      </div>
    `;
    contenedor.appendChild(div);
  });
}

// === Llenar el carrusel del banner ===
function llenarBannerComerciosNuevos() {
  const contenedor = document.getElementById('comerciosNuevosBanner');
  if (!contenedor) return;

  const comerciosNuevos = comerciosData.filter(c => c.nuevo);

  if (comerciosNuevos.length === 0) {
    contenedor.innerHTML = '<p class="text-white/80 text-sm col-span-full">No hay nuevos comercios por ahora.</p>';
    return;
  }

  contenedor.innerHTML = '';
  comerciosNuevos.forEach(comercio => {
    const card = document.createElement('div');
    card.className = 'flex-none w-64 snap-start bg-white/20 backdrop-blur-sm rounded-xl p-4 text-white hover:bg-white/30 transition-all duration-300 shadow-md';
    card.innerHTML = `
      <div class="flex items-center mb-3">
        <img src="${comercio.imagen}" alt="${comercio.nombre}" class="w-10 h-10 rounded-full object-cover mr-3 border border-white/30">
        <div>
          <h5 class="font-bold text-sm truncate">${comercio.nombre}</h5>
          <p class="text-xs opacity-90">${comercio.categoria}</p>
        </div>
      </div>
      <p class="text-xs mb-3 line-clamp-2">
        ${comercio.descuento ? `
          <span class="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-yellow-900 px-2.5 py-1 rounded-full font-bold text-xs shadow-sm animate-bounce">
            <i class="fas ${getIconoPromocion(comercio.descuento)} text-xs"></i>
            ${comercio.descuento}
          </span>
        ` : `
          <span class="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
            <i class="fas fa-store"></i> ¡Nuevo!
          </span>
        `}
      </p>
      <a href="${comercio.url || '#'}" class="inline-block text-xs bg-white text-red-600 px-3 py-1 rounded-full font-semibold hover:bg-gray-100 transition">
        Ver comercio
      </a>
    `;
    contenedor.appendChild(card);
  });
}

// === Inicializar flechas del carrusel ===
function inicializarCarrusel() {
  const contenedor = document.getElementById('comerciosNuevosBanner');
  const btnPrev = document.getElementById('btnPrevBanner');
  const btnNext = document.getElementById('btnNextBanner');

  if (!contenedor || !btnPrev || !btnNext) return;

  btnNext.addEventListener('click', () => {
    contenedor.scrollBy({ left: 200, behavior: 'smooth' });
  });

  btnPrev.addEventListener('click', () => {
    contenedor.scrollBy({ left: -200, behavior: 'smooth' });
  });

  const checkScroll = () => {
    btnPrev.classList.toggle('hidden', contenedor.scrollLeft === 0);
    btnNext.classList.toggle('hidden', contenedor.scrollWidth - contenedor.clientWidth <= contenedor.scrollLeft);
  };

  contenedor.addEventListener('scroll', checkScroll);
  checkScroll();
}

// === Iconos dinámicos según promoción ===
function getIconoPromocion(texto) {
  if (!texto) return "fa-store";
  const lower = texto.toLowerCase();
  
  if (lower.includes("cuenta dni")) return "fa-credit-card";
  if (lower.includes("efectivo")) return "fa-money-bill-wave";
  if (lower.includes("transferencia") || lower.includes("mercadopago")) return "fa-mobile-alt";
  if (lower.includes("30%") || lower.includes("50%") || lower.includes("off") || lower.includes("descuento")) return "fa-percent";
  if (lower.includes("gratis") || lower.includes("regalo")) return "fa-gift";
  if (lower.includes("nuevo")) return "fa-star";
  return "fa-fire";
}

// === Mostrar toast inteligente (solo después de hacer scroll) ===
function mostrarToastSiHayNuevos() {
  const nuevos = comerciosData.filter(c => c.nuevo && !appState.comerciosVistos.includes(c.id));
  const toast = document.getElementById('toastNotificacion');
  const img = document.getElementById('toastImagen');
  const nombre = document.getElementById('toastNombre');
  const descuento = document.getElementById('toastDescuento');
  const btnCerrar = document.getElementById('btnCerrarToast');

  if (nuevos.length === 0 || !toast) return;

  // Verificar si ya se mostró en las últimas 24 horas
  const ultimaVezMostrado = localStorage.getItem('toastUltimaVez');
  const ahora = new Date().getTime();
  const horas = 24;
  const milisPorHora = 3600000;

  if (ultimaVezMostrado && (ahora - parseInt(ultimaVezMostrado)) < horas * milisPorHora) {
    return;
  }

  const handleScroll = () => {
    if (window.scrollY > 200) {
      window.removeEventListener('scroll', handleScroll);

      const comercio = nuevos.find(c => c.descuento) || nuevos[0];

      // Rellenar datos
      img.src = comercio.imagen;
      img.alt = comercio.nombre;
      nombre.textContent = comercio.nombre;
      descuento.textContent = comercio.descuento || '¡Nuevo en el barrio!';

      // Mostrar toast
      setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        localStorage.setItem('toastUltimaVez', ahora);
      }, 100);

      const autoClose = setTimeout(() => ocultarToast(), 6000);

      btnCerrar?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(autoClose);
        ocultarToast();
      });

      toast.onclick = () => {
        clearTimeout(autoClose);
        ocultarToast();
        document.getElementById('btnNotificacion')?.click();
      };
    }
  };

  window.addEventListener('scroll', handleScroll);
  if (window.scrollY > 200) handleScroll();
}

// === Ocultar toast ===
function ocultarToast() {
  const toast = document.getElementById('toastNotificacion');
  if (!toast || toast.classList.contains('translate-y-full')) return;

  toast.classList.remove('translate-y-0', 'opacity-100');
  toast.classList.add('translate-y-full', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('pointer-events-none');
  }, 300);
}

// === Marcar como vistos ===
function marcarComoVistos() {
  const nuevos = comerciosData.filter(c => c.nuevo);
  nuevos.forEach(c => {
    if (!appState.comerciosVistos.includes(c.id)) {
      appState.comerciosVistos.push(c.id);
    }
  });
  localStorage.setItem('comerciosVistos', JSON.stringify(appState.comerciosVistos));
  const badge = document.getElementById('badgeNotificacion');
  if (badge) badge.classList.remove('scale-100', 'opacity-100');
}

// === EVENTOS ===

// Abrir modal de notificaciones
document.getElementById('btnNotificacion')?.addEventListener('click', function () {
  const modal = document.getElementById('modalNotificaciones');
  const modalContent = document.getElementById('modalContent');
  
  llenarModal();
  modal.classList.remove('hidden');
  
  setTimeout(() => {
    modalContent.classList.remove('translate-y-4', 'opacity-0', 'scale-95');
    modalContent.classList.add('translate-y-0', 'opacity-100', 'scale-100');
  }, 50);
  
  marcarComoVistos();
});

// Cerrar modal
document.getElementById('btnCerrarModal')?.addEventListener('click', function () {
  const modal = document.getElementById('modalNotificaciones');
  const modalContent = document.getElementById('modalContent');
  
  modalContent.classList.remove('translate-y-0', 'opacity-100', 'scale-100');
  modalContent.classList.add('translate-y-4', 'opacity-0', 'scale-95');
  
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
});

// Cerrar al hacer clic fuera
document.getElementById('modalNotificaciones')?.addEventListener('click', function (e) {
  if (e.target === this) {
    document.getElementById('btnCerrarModal')?.click();
  }
});

// === Botón de alertas por WhatsApp ===
document.getElementById('btnNotificacionPromo')?.addEventListener('click', () => {
  const usuarioYaSuscrito = localStorage.getItem('whatsappAlertas') === 'true';

  if (usuarioYaSuscrito) {
    alert('✅ Ya estás suscrito a las alertas por WhatsApp.');
    return;
  }

  const confirmar = confirm('¿Querés recibir notificaciones de nuevos comercios y promociones por WhatsApp?');
  if (confirmar) {
    localStorage.setItem('whatsappAlertas', 'true');

    const numero = '5491122334455'; // ← CAMBIA POR TU NÚMERO
    const mensaje = encodeURIComponent('Hola, quiero recibir alertas de nuevos comercios y promociones en Castelar.');
    const url = `https://wa.me/${numero}?text=${mensaje}`; // ✅ sin espacios

    window.open(url, '_blank');

    setTimeout(() => {
      alert('Gracias por suscribirte. Pronto empezarás a recibir novedades por WhatsApp.');
    }, 1000);
  }
});

// === Inicializar todo ===
document.addEventListener('DOMContentLoaded', () => {
  // Esperar un poco para que Tailwind y el DOM estén listos
  setTimeout(() => {
    cargarComerciosNuevos();

    const btn = document.getElementById('btnNotificacionPromo');
    if (btn && localStorage.getItem('whatsappAlertas') === 'true') {
      btn.innerHTML = '<i class="fas fa-check me-2"></i>Alertas Activadas';
      btn.disabled = true;
      btn.classList.add('opacity-60', 'cursor-not-allowed');
    }

    if (btn) {
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
    }
  }, 500);
});

// === Estilos dinámicos - VERSIÓN CORREGIDA ===
// Verificar si los estilos ya existen antes de agregarlos
if (!document.getElementById('notificaciones-styles')) {
  const notificacionesStyle = document.createElement('style');
  notificacionesStyle.id = 'notificaciones-styles';
  notificacionesStyle.textContent = `
    .animate-bounce { animation: bounce 0.5s ease-in-out; }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(notificacionesStyle);
}