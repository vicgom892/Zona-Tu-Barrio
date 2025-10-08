// chat.js - Asistente Virtual para "Tu Barrio A Un Clik" (Versión Final Corregida y Robusta)
document.addEventListener('DOMContentLoaded', function() {
  // Datos de comercios y ofertas
  let negociosData = [];
  let ofertasData = [];

  // Control de voz: DESACTIVADO por defecto
  let voiceEnabled = false;
  let voiceAutoPlay = false;

  // Historial de aprendizaje
  let learningHistory = [];

  // === CATEGORÍAS CON SINÓNIMOS AMPLIADOS Y EXACTOS ===
   const categoryKeywords = {
    'Panadería': ['panadería', 'panaderias', 'pan', 'panes', 'pastel', 'torta', 'bizcocho', 'medialuna', 'factura', 'molino', 'horno'],
    'Fábrica de Pastas': ['fábrica de pastas', 'fabrica de pastas', 'pasta', 'ravioles', 'ñoquis', 'tallarines', 'macarrones', 'canelones'],
    'Verdulería': ['verdulería', 'verdulerias', 'verdura', 'fruta', 'hortaliza', 'mercado', 'frutería', 'fruterias'],
    'Fiambrería': ['fiambrería', 'fiambrerias', 'fiambre', 'embutido', 'queso', 'jamón', 'mortadela', 'salame', 'chorizo', 'longaniza'],
    'Kiosco': ['kiosco', 'quiosco', 'cigarrillos', 'golosinas', 'revistas', 'bebida', 'chicles', 'azúcar', 'papel', 'lápiz'],
    'Mascotas': ['mascota', 'mascotas', 'perro', 'gato', 'alimento animal', 'veterinario', 'peluquería canina', 'tienda de mascotas', 'accesorios mascotas'],
    'Barbería': ['barbería', 'barberias', 'corte de pelo', 'barbero', 'peluquería hombre', 'peluqueria hombre', 'afeitado', 'bigote'],
    'Ferretería': ['ferretería', 'ferreterias', 'herramientas', 'clavo', 'tornillo', 'cable', 'electricidad', 'llave', 'martillo', 'serrucho'],
    'Ropa': ['ropa', 'tienda de ropa', 'camisa', 'pantalón', 'zapatillas', 'moda', 'prendas', 'vestimenta', 'calzado', 'accesorios'],
    'Servicios': ['servicio', 'reparación', 'taller', 'mantenimiento', 'limpieza', 'electricista', 'plomero', 'fontanero', 'cerrajero', 'albañil'],
    'Farmacia': ['farmacia', 'farmacias', 'droguería', 'droguerias', 'medicamento', 'remedio', 'pastilla', 'analgésico', 'paracetamol', 'ibuprofeno', 'vitaminas', 'antibiótico'],
    'Cafetería': ['cafetería', 'cafeterias', 'café', 'desayuno', 'espresso', 'latte', 'tostadas', 'croissant', 'bombón', 'helado'],
    'Taller Mecánico': ['taller mecánico', 'taller mecanico', 'mecánico', 'mecanico', 'auto', 'coche', 'neumático', 'neumatico', 'repuesto', 'aceite', 'batería', 'bateria'],
    'Librería': ['librería', 'librerias', 'libro', 'cuaderno', 'escritura', 'papel', 'lapicera', 'bolígrafo', 'boligrafo', 'regla', 'goma'],
    'Mates': ['mate', 'yerba', 'termo', 'bombilla', 'mate cocido', 'maté', 'cebador', 'agua caliente'],
    'Florería': ['florería', 'florerias', 'flor', 'rosa', 'ramo', 'flores', 'regalo', 'cumpleaños', 'aniversario', 'bouquet'],
    'Carnicería': ['carnicería', 'carnicerias', 'carne', 'pollo', 'cerdo', 'vacuno', 'bife', 'churrasco', 'costilla', 'molleja', 'hígado'],
    'Granjas': ['granja', 'granjas', 'agricultura', 'campo', 'productor', 'hortalizas', 'cultivo', 'ganadería', 'animal', 'pollitos', 'huevos', 'leche', 'queso artesanal', 'productos frescos'],
    'Muebles': ['mueble', 'muebles', 'silla', 'mesa', 'sofá', 'armario', 'cómoda', 'cama', 'estante', 'mobiliario', 'decoración', 'hogar', 'juego de sala', 'comedor', 'living'],
    'Uñas': ['uñas', 'esmaltado', 'manicura', 'pedicura', 'uñas acrílicas', 'uñas gel', 'salón de uñas', 'nail', 'bellas artes', 'decoración de uñas', 'extensión de uñas'],
    'Comidas': ['comida', 'comidas', 'restaurante', 'comedor', 'comida rápida', 'delivery', 'almuerzo', 'cena', 'menú', 'plato', 'cocina', 'gastronomía', 'picada', 'asado', 'parrilla', 'comida casera', 'comida argentina'],
      'Oficios': [
    'oficio', 'oficios', 'albañil', 'albañiles', 'cerrajero', 'cerrajeros', 'electricista', 'electricistas',
    'herrero', 'herreros', 'jardinero', 'jardineros', 'limpieza', 'limpiador', 'mecánico', 'mecánicos',
    'pintor', 'pintores', 'plomero', 'plomeros', 'fontanero', 'transporte', 'camión', 'flete', 'delivery local'],
      'Emprendimientos': [
    'emprendimiento', 'emprendimientos', 'gastronomía', 'gastronomico', 'artesanía', 'artesanal', 'moda',
    'tecnología', 'servicios', 'belleza', 'educación', 'hogar', 'mascotas', 'manualidades', 'diseño', 'cosmética',
    'cursos', 'talleres', 'decoración', 'ropa artesanal', 'comida casera', 'emprendedor'
      ]
  };

  // Función para normalizar texto (sin tildes, mayúsculas, espacios extra)
  function normalizeString(str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  // === NUEVA LÓGICA DE BÚSQUEDA INTELIGENTE ===
  //function findCategoryByQuery(query) {
  //  const normalizedQuery = normalizeString(query);
  //  for (const [category, keywords] of Object.entries(categoryKeywords)) {
  //    for (const keyword of keywords) {
  //      const normalizedKeyword = normalizeString(keyword);
  //      if (normalizedQuery.includes(normalizedKeyword)) {
  //        return category;
  //      }
  //    }
  //  }
  //  return null;
  //}

  // === NUEVA LÓGICA DE BÚSQUEDA INTELIGENTE (BIDIRECCIONAL - FUNCIONA PARA TODOS LOS RUBROS) ===
function findCategoryByQuery(query) {
  const normalizedQuery = normalizeString(query);
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeString(keyword);
      // ✅ BÚSQUEDA BIDIRECCIONAL: Detecta tanto "panaderia" en "panaderías" como viceversa
      if (normalizedQuery.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedQuery)) {
        return category;
      }
    }
  }
  return null;
}

  // === CARGA DE NEGOCIOS ===
  async function cargarNegocios() {
    try {
      if (window.businesses && Array.isArray(window.businesses) && window.businesses.length > 0) {
        negociosData = window.businesses;
        console.log(`✅ Chatbot usando ${negociosData.length} negocios desde window.businesses`);
        return;
      }

      const CACHE_KEY = 'businesses_cache_v5';
      const cachedData = localStorage.getItem(CACHE_KEY);

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          negociosData = Array.isArray(parsed) ? parsed : parsed.data;
          console.log(`✅ Chatbot usando ${negociosData.length} negocios desde caché`);
          return;
        } catch (e) {
          console.warn('Caché dañado, cargando desde JSON...');
          localStorage.removeItem(CACHE_KEY);
        }
      }

      const response = await fetch('data/negocios.json');
      if (!response.ok) throw new Error('Error al cargar negocios.json');
      negociosData = await response.json();

      // Limpieza automática de categorías al cargar
      negociosData = negociosData.map(n => ({
        ...n,
        category: normalizeString(n.category)
      }));

      localStorage.setItem(CACHE_KEY, JSON.stringify({
         negociosData,
        timestamp: Date.now()
      }));

      console.log(`✅ Chatbot usando ${negociosData.length} negocios desde JSON`);
    } catch (error) {
      console.error('Error al cargar los negocios:', error);
      addMessage('No pude cargar los comercios. Escribe "ayuda" para saber qué puedo hacer.', 'bot');
    }
  }

  // === CARGA DE OFERTAS ===
  async function cargarOfertas() {
    try {
      const CACHE_KEY = 'ofertas_cache_v2';
      const cachedData = localStorage.getItem(CACHE_KEY);

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          ofertasData = Array.isArray(parsed) ? parsed : parsed.data;
          console.log(`✅ Ofertas cargadas desde caché: ${ofertasData.length}`);
          return;
        } catch (e) {
          console.warn('Caché de ofertas dañado, recargando...');
          localStorage.removeItem(CACHE_KEY);
        }
      }

      const response = await fetch('datos/seccion-ofertas.json');
      if (!response.ok) throw new Error('Error al cargar seccion-ofertas.json');
      const rawData = await response.json();

      ofertasData = rawData.map(oferta => ({
        id: oferta.id || Date.now() + Math.random(),
        nombre: oferta.title,
        categoria: oferta.rubro,
        descuento: "Ver detalle",
        detalle: oferta.description,
        imagen: oferta.image,
        web: (oferta.web_url || '').trim().replace(/\s+/g, '') || null,
        instagram: (oferta.instagram_url || '').trim().replace(/\s+/g, '') || null,
        ofertaLimitada: true,
        fechaInicio: oferta.start_date,
        fechaFin: oferta.end_date
      }));

      localStorage.setItem(CACHE_KEY, JSON.stringify({
         ofertasData,
        timestamp: Date.now()
      }));

      console.log(`✅ Ofertas transformadas: ${ofertasData.length}`);
    } catch (error) {
      console.error('Error al cargar ofertas:', error);
      addMessage('No pude cargar las ofertas. Intenta más tarde.', 'bot');
    }
  }

  // === ELEMENTOS DEL DOM ===
  const chatbotBtn = document.getElementById('chatbotBtn');
  const chatContainer = document.getElementById('chatContainer');
  const closeChat = document.getElementById('closeChat');
  const chatBody = document.getElementById('chatBody');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const voiceToggleBtn = document.getElementById('voiceToggleBtn');

  // === FORMATO DE MENSAJES ===
  function formatMessageLinks(message) {
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let processedMessage = message.replace(markdownLinkRegex, (match, text, url) => {
      const cleanUrl = url.trim().replace(/\s+/g, '');
      return `<a href="${cleanUrl}" target="_blank" class="chat-link">${text}</a>`;
    });

    const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?])/g;
    processedMessage = processedMessage.replace(urlRegex, url => {
      const cleanUrl = url.trim().replace(/\s+/g, '');
      return `<a href="${cleanUrl}" target="_blank" class="chat-link">${url}</a>`;
    });

    return processedMessage;
  }

  // === HORA ACTUAL ===
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // === AGREGAR MENSAJE AL CHAT ===
  function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${sender} message-animation`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = formatMessageLinks(text);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = getCurrentTime();
    
    if (sender === 'bot') {
      const aiDiv = document.createElement('div');
      aiDiv.className = 'ai-indicator';
      aiDiv.innerHTML = `
        <span class="ai-dot"></span>
        <span class="ai-dot"></span>
        <span class="ai-dot"></span>
        <small>Asistente Virtual</small>
      `;
      messageDiv.appendChild(aiDiv);

      if (voiceEnabled && !voiceAutoPlay) {
        setTimeout(() => {
          speakText(text);
        }, 1000);
      }
    }
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    chatBody.appendChild(messageDiv);
    
    if (sender === 'user') {
      const quickReplies = document.querySelector('.quick-replies');
      if (quickReplies) quickReplies.remove();
    }
    
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // === INDICADOR DE ESCRITURA ===
  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    
    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'typing-dots';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'typing-dot';
      dotsDiv.appendChild(dot);
    }
    
    typingDiv.appendChild(dotsDiv);
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
  }

  // === ÍCONOS DE CATEGORÍA ===
  function getBusinessCategoryIcon(category) {
    const icons = {
      'Panadería': '🍞',
      'Fábrica de Pastas': '🍝',
      'Verdulería': '🥦',
      'Fiambrería': '🧀',
      'Kiosco': '🏪',
      'Mascotas': '🐾',
      'Barbería': '✂️',
      'Ferretería': '🔧',
      'Ropa': '👕',
      'Servicios': '🛠️',
      'Farmacia': '💊',
      'Cafetería': '☕',
      'Taller Mecánico': '🔧',
      'Librería': '📚',
      'Mates': '🧋',
      'Florería': '🌹',
      'Carnicería': '🥩',
      'Granjas': '🌾',
      'Muebles': '🪑',
      'Uñas': '💅',
      'Comidas': '🍽️'
    };
    for (const [key, icon] of Object.entries(icons)) {
      if (normalizeString(category).includes(normalizeString(key))) {
        return icon;
      }
    }
    return '🏪';
  }

  // === ¿ESTÁ ABIERTO? ===
  function isBusinessOpen(hoursString) {
    if (typeof window.isBusinessOpen === 'function') return window.isBusinessOpen(hoursString);
    return true;
  }

  // === PARSEAR HORARIOS EN FORMATO ESTÁNDAR (Mon 8:00-18:00 Tue 9:00-17:00...) ===
  function parseHours(hoursStr) {
    if (!hoursStr) return [];
    const daysMap = {
      'Mon': 'Lunes',
      'Tue': 'Martes',
      'Wed': 'Miércoles',
      'Thu': 'Jueves',
      'Fri': 'Viernes',
      'Sat': 'Sábado',
      'Sun': 'Domingo'
    };
    const regex = /(\w{3})\s+(\d{1,2}:?\d{0,2})\s*-\s*(\d{1,2}:?\d{0,2})/g;
    const schedules = [];
    let match;
    while ((match = regex.exec(hoursStr)) !== null) {
      const dayAbbr = match[1];
      const openTime = match[2].replace(':', '.'); // Normaliza a 8.00
      const closeTime = match[3].replace(':', '.');
      schedules.push({
        day: daysMap[dayAbbr],
        dayKey: dayAbbr,
        open: parseFloat(openTime),
        close: parseFloat(closeTime)
      });
    }
    return schedules;
  }

  // === CALCULAR CUÁNDO VUELVE A ABRIR ===
  function getNextOpeningTime(hoursStr) {
    const schedules = parseHours(hoursStr);
    if (schedules.length === 0) return null;
    const now = new Date();
    const currentDayIndex = now.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Buscar horario de hoy
    const todaySchedule = schedules.find(s => s.day === dayNames[currentDayIndex]);
    const isOpenNow = todaySchedule && now.getHours() + now.getMinutes()/60 >= todaySchedule.open && 
                      now.getHours() + now.getMinutes()/60 < todaySchedule.close;

    if (isOpenNow) {
      return { next: 'ahora', openTime: `${Math.floor(todaySchedule.open)}:${String(Math.round((todaySchedule.open % 1) * 60)).padStart(2, '0')}`, day: todaySchedule.day };
    }

    // Buscar siguiente apertura (hoy o después)
    const todayKey = dayKeys[currentDayIndex];
    let nextDayIndex = currentDayIndex;
    let nextSchedule = null;

    // Buscar en los días siguientes
    do {
      nextDayIndex = (nextDayIndex + 1) % 7;
      const nextDayName = dayNames[nextDayIndex];
      const nextDayKey = dayKeys[nextDayIndex];
      nextSchedule = schedules.find(s => s.dayKey === nextDayKey);
    } while (!nextSchedule && nextDayIndex !== currentDayIndex); // Evita bucle infinito

    if (!nextSchedule) return null;

    const nextOpenHour = Math.floor(nextSchedule.open);
    const nextOpenMinute = Math.round((nextSchedule.open % 1) * 60);
    const formattedTime = `${nextOpenHour}:${String(nextOpenMinute).padStart(2, '0')}`;

    return {
      next: 'mañana' + (nextDayIndex !== (currentDayIndex + 1) % 7 ? ' (' + nextSchedule.day + ')' : ''),
      openTime: formattedTime,
      day: nextSchedule.day
    };
  }

  // === TARJETAS DE NEGOCIOS ===
  function createBusinessCard(negocio, index) {
    const isOpen = isBusinessOpen(negocio.hours);
    const statusClass = isOpen ? 'status-open' : 'status-closed';
    const statusText = isOpen ? 'Abierto ahora' : 'Cerrado';
    const statusIcon = isOpen ? '🟢' : '🔴';
    const categoryIcon = getBusinessCategoryIcon(negocio.category);

    const mapUrl = `https://www.google.com/maps?q=${negocio.latitude},${negocio.longitude}`;
    const webUrl = negocio.url || '#';
    const whatsappUrl = negocio.whatsapp ? `https://wa.me/${negocio.whatsapp}` : null;
    const phoneUrl = negocio.telefono ? `tel:+${negocio.telefono}` : null;

    const hoursFormatted = negocio.hours
      .replace(/Mon/g, 'Lunes')
      .replace(/Tue/g, 'Martes')
      .replace(/Wed/g, 'Miércoles')
      .replace(/Thu/g, 'Jueves')
      .replace(/Fri/g, 'Viernes')
      .replace(/Sat/g, 'Sábado')
      .replace(/Sun/g, 'Domingo');

    const card = document.createElement('div');
    card.className = 'business-card';
    card.style.animationDelay = `${index * 0.1}s`;

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8f9fa; border-bottom: 1px solid #e2e8f0; border-radius: 12px 12px 0 0;">
        <div style="font-size: 1.8rem;">${categoryIcon}</div>
        <div>
          <div style="font-weight: 600; color: #1a202c; font-size: 1.1rem;">${negocio.name}</div>
          <div style="font-size: 0.85rem; color: #ff6a3c; font-weight: 600; text-transform: uppercase; background: #fff4eb; padding: 2px 8px; border-radius: 20px; display: inline-block;">
            ${negocio.category}
          </div>
        </div>
      </div>

      <div style="padding: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 0.9rem; color: #4a5568;">
          <i class="fas fa-clock" style="color: #ff6a3c;"></i>
          <span>${hoursFormatted}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 0.9rem; color: #4a5568;">
          <i class="fas fa-map-marker-alt" style="color: #ff6a3c;"></i>
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${negocio.address}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px; margin: 12px 0;">
          <a href="${webUrl}" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 0.85rem; background: #4285F4; color: white; border: 1px solid #3367D6; transition: all 0.2s;">
            <i class="fas fa-globe"></i>
            <span>Sitio Web</span>
          </a>

          <a href="${mapUrl}" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 0.85rem; background: #EB6420; color: white; border: 1px solid #CC581A; transition: all 0.2s;">
            <i class="fas fa-map-marker-alt"></i>
            <span>Google Maps</span>
          </a>

          ${whatsappUrl ? `
          <a href="${whatsappUrl}" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 0.85rem; background: #25D366; color: white; border: 1px solid #1DAD5C; transition: all 0.2s;">
            <i class="fab fa-whatsapp"></i>
            <span>WhatsApp</span>
          </a>` : ''}

          ${phoneUrl ? `
          <a href="${phoneUrl}" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 0.85rem; background: #008CBA; color: white; border: 1px solid #007095; transition: all 0.2s;">
            <i class="fas fa-phone-alt"></i>
            <span>Llamar</span>
          </a>` : ''}
        </div>

        <div style="text-align: center; font-size: 0.85rem; color: ${isOpen ? '#10B981' : '#EF4444'}; font-weight: 600; margin-top: 6px;">
          ${statusIcon} ${statusText}
        </div>
      </div>
    `;

    return card;
  }

  // === MOSTRAR TODOS LOS NEGOCIOS ===
  function formatTodosNegociosResponse() {
    if (!negociosData || negociosData.length === 0) {
      return 'No hay comercios disponibles ahora. Escribe "ayuda" para saber qué puedo hacer.';
    }

    const categorias = {};
    negociosData.forEach(n => {
      if (!categorias[n.category]) categorias[n.category] = [];
      categorias[n.category].push(n);
    });

    let index = 0;
    for (const [categoria, negocios] of Object.entries(categorias)) {
      const header = document.createElement('div');
      header.className = 'business-category-header';
      header.innerHTML = `
        <h5 style="margin: 16px 0 8px 0; color: #128C7E; font-size: 14px; font-weight: 600;">
          ${getBusinessCategoryIcon(categoria)} ${categoria} (${negocios.length})
        </h5>
      `;
      chatBody.appendChild(header);

      negocios.forEach(negocio => {
        const card = createBusinessCard(negocio, index++);
        chatBody.appendChild(card);
      });
    }

    const openCount = negociosData.filter(n => isBusinessOpen(n.hours)).length;
    return `Mostrando ${negociosData.length} comercios: ${openCount} abiertos. Cada tarjeta incluye contacto directo.`;
  }

  // === RESPUESTAS A HORARIOS ===
  function formatHorariosResponse() {
    if (!negociosData || negociosData.length === 0) {
      return 'No pude cargar los horarios. Intenta más tarde.';
    }

    addMessage('Te muestro los horarios de todos los comercios:', 'bot');

    const categorias = {};
    negociosData.forEach(n => {
      if (!categorias[n.category]) categorias[n.category] = [];
      categorias[n.category].push(n);
    });

    for (const [categoria, negocios] of Object.entries(categorias)) {
      const header = document.createElement('div');
      header.className = 'business-category-header';
      header.innerHTML = `
        <h5 style="margin: 16px 0 8px 0; color: #ff6a3c; font-size: 14px; font-weight: 600;">
          🕒 ${categoria} (${negocios.length})
        </h5>
      `;
      chatBody.appendChild(header);

      negocios.forEach(negocio => {
        const hoursFormatted = negocio.hours
          .replace(/Mon/g, 'Lunes')
          .replace(/Tue/g, 'Martes')
          .replace(/Wed/g, 'Miércoles')
          .replace(/Thu/g, 'Jueves')
          .replace(/Fri/g, 'Viernes')
          .replace(/Sat/g, 'Sábado')
          .replace(/Sun/g, 'Domingo');

        const item = document.createElement('div');
        item.className = 'business-item';
        item.innerHTML = `
          <div style="padding: 10px; background: #f8f9fa; margin: 4px 0; border-radius: 8px;">
            <strong>${negocio.name}</strong><br>
            <small style="color: #666;">${hoursFormatted}</small>
          </div>
        `;
        chatBody.appendChild(item);
      });
    }

    return `Mostrando horarios de ${negociosData.length} comercios. ¿Buscás uno en particular?`;
  }

  // === RESPUESTAS A UBICACIONES ===
  function formatUbicacionesResponse() {
    if (!negociosData || negociosData.length === 0) {
      return 'No pude cargar las ubicaciones. Intenta más tarde.';
    }

    addMessage('Aquí tenés todos los comercios con sus ubicaciones:', 'bot');

    const categorias = {};
    negociosData.forEach(n => {
      if (!categorias[n.category]) categorias[n.category] = [];
      categorias[n.category].push(n);
    });

    for (const [categoria, negocios] of Object.entries(categorias)) {
      const header = document.createElement('div');
      header.className = 'business-category-header';
      header.innerHTML = `
        <h5 style="margin: 16px 0 8px 0; color: #4285F4; font-size: 14px; font-weight: 600;">
          📍 ${categoria} (${negocios.length})
        </h5>
      `;
      chatBody.appendChild(header);

      negocios.forEach(negocio => {
        const mapUrl = `https://www.google.com/maps?q=${negocio.latitude},${negocio.longitude}`;

        const item = document.createElement('div');
        item.className = 'business-item';
        item.innerHTML = `
          <div style="padding: 10px; background: #f8f9fa; margin: 4px 0; border-radius: 8px;">
            <strong>${negocio.name}</strong><br>
            <small style="color: #666;">${negocio.address}</small><br>
            <a href="${mapUrl}" target="_blank" style="color: #128C7E; text-decoration: underline; font-size: 0.9rem;">Ver en Google Maps</a>
          </div>
        `;
        chatBody.appendChild(item);
      });
    }

    return `Mostrando ubicaciones de ${negociosData.length} comercios. ¿Necesitás ayuda con alguno?`;
  }

  // === RESPUESTAS A OFERTAS ===
  function formatOfertasResponse() {
    if (!ofertasData || ofertasData.length === 0) {
      return 'No hay ofertas disponibles ahora. Escribe "negocios" para ver comercios o "ayuda" para más opciones.';
    }

    const header = document.createElement('div');
    header.className = 'business-category-header';
    header.innerHTML = `
      <h5 style="margin: 16px 0 8px 0; color: #ff6a3c; font-size: 14px; font-weight: 600;">
        🎁 Ofertas Activas (${ofertasData.length})
      </h5>
    `;
    chatBody.appendChild(header);

    ofertasData.forEach((oferta, index) => {
      const card = createOfferCard(oferta, index);
      chatBody.appendChild(card);
    });

    setTimeout(startOfferCountdowns, 100);
    return `Mostrando ${ofertasData.length} oferta(s) activa(s). ¿Buscás algo en particular?`;
  }

  // === TARJETAS DE OFERTAS ===
  function createOfferCard(oferta, index) {
    const isOpen = oferta.ofertaLimitada;
    const statusText = isOpen ? 'Válida hasta' : 'Promoción permanente';
    const statusIcon = isOpen ? '🔥' : '💡';

    let countdownHTML = '';
    if (isOpen) {
      countdownHTML = `<div class="countdown" data-end="${oferta.fechaFin}">Cargando...</div>`;
    }

    const card = document.createElement('div');
    card.className = 'business-card offer-card';
    card.style.animationDelay = `${index * 0.1}s`;

    card.innerHTML = `
      <div class="business-name">
        🎁 ${oferta.nombre}
      </div>
      <div class="business-category">${oferta.categoria}</div>
      <div class="business-info">${oferta.detalle}</div>
      <div class="btns-offer">
        ${oferta.web ? `<a href="${oferta.web}" target="_blank" class="btn-offer btn-web"><i class="fas fa-globe"></i> Web</a>` : ''}
        ${oferta.instagram ? `<a href="${oferta.instagram}" target="_blank" class="btn-offer btn-ig"><i class="fab fa-instagram"></i> Instagram</a>` : ''}
      </div>
      <div class="countdown-container">
        ${statusIcon} <small>${statusText}</small><br>
        ${countdownHTML}
      </div>
    `;

    return card;
  }

  // === CONTADOR DE OFERTAS ===
  function startOfferCountdowns() {
    document.querySelectorAll('.countdown').forEach(el => {
      const endDate = new Date(el.getAttribute('data-end')).getTime();
      const update = () => {
        const now = new Date().getTime();
        const diff = endDate - now;
        if (diff <= 0) {
          el.innerHTML = '<span style="color: #dc2626; font-weight:700">Oferta finalizada</span>';
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const timeStr = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
        el.innerHTML = `<span style="color:#e65100">${timeStr}</span>`;
      };
      update();
      setInterval(update, 1000);
    });
  }

  // === GENERAR RESPUESTA INTELIGENTE (NUEVA VERSION PROFESIONAL - ROBUSTA + PRÓXIMO HORARIO) ===
  function generateResponse(query) {
    query = normalizeString(query);
    learningHistory.push({ query: query, timestamp: Date.now() });

  // === 1. DETECTAR CATEGORÍA EXACTA ===
  const categoryFound = findCategoryByQuery(query);
if (categoryFound) {
  const normalizedCategory = normalizeString(categoryFound);

  // ✅ REDIRECCIÓN INMEDIATA PARA OFICIOS Y EMPRENDIMIENTOS
  if (normalizedCategory === 'oficios') {
    return `🛠️ Encontré que estás buscando *oficios* (albañiles, electricistas, plomeros, etc.).\n\n👉 [Ver todos los oficios disponibles](oficios-profeciones.html)`;
  }
  if (normalizedCategory === 'emprendimientos') {
    return `💡 Encontré que estás interesado en *emprendimientos* (gastronomía, artesanía, moda, etc.).\n\n👉 [Explorar emprendimientos locales](emprendimientos.html)`;
  }

  // ✅ RESTO DE CATEGORÍAS: comportamiento original (comercios con horarios, etc.)
  const allMatches = negociosData.filter(n =>
    normalizeString(n.category).includes(normalizedCategory)
  );
  if (allMatches.length === 0) {
    return `❌ No encontré ninguna ${categoryFound.toLowerCase()} registrada en nuestra base de datos. ¿Quizás te referís a otra zona o nombre diferente?`;
  }

  const asksForOpeningHours = /abre|abren|hora|horario|cuándo abre|a qué hora/i.test(query);
  const isSpecificQuestionAboutOpening = asksForOpeningHours && !/cerrad|cierro/i.test(query);

  if (isSpecificQuestionAboutOpening) {
    addMessage(`Aquí tenés los horarios de apertura de las ${categoryFound.toLowerCase()}s de la zona:`, 'bot');
    allMatches.forEach((negocio, index) => {
      const hoursFormatted = negocio.hours
        .replace(/Mon/g, 'Lunes')
        .replace(/Tue/g, 'Martes')
        .replace(/Wed/g, 'Miércoles')
        .replace(/Thu/g, 'Jueves')
        .replace(/Fri/g, 'Viernes')
        .replace(/Sat/g, 'Sábado')
        .replace(/Sun/g, 'Domingo');
      const isOpenNow = isBusinessOpen(negocio.hours);
      const statusIcon = isOpenNow ? '🟢' : '🔴';
      const statusText = isOpenNow ? 'Abierto ahora' : 'Cerrado';
      const item = document.createElement('div');
      item.className = 'business-item';
      item.innerHTML = `
        <div style="padding: 10px; background: #f8f9fa; margin: 4px 0; border-radius: 8px;">
          <strong>${negocio.name}</strong><br>
          <small style="color: #666;">${hoursFormatted}</small><br>
          <small style="color: ${isOpenNow ? '#10B981' : '#EF4444'}; font-weight: 600;">${statusIcon} ${statusText}</small>
        </div>
      `;
      chatBody.appendChild(item);
    });
    const openCount = allMatches.filter(n => isBusinessOpen(n.hours)).length;
    return `Mostré ${allMatches.length} ${categoryFound.toLowerCase()}s. ${openCount} están abiertas ahora.`;
  }

  const openMatches = allMatches.filter(n => isBusinessOpen(n.hours));
  if (openMatches.length > 0) {
    addMessage(`✅ Encontré ${openMatches.length} ${categoryFound.toLowerCase()}${openMatches.length !== 1 ? 's' : ''} **abiertas ahora**`, 'bot');
    openMatches.forEach((negocio, index) => {
      const card = createBusinessCard(negocio, index);
      chatBody.appendChild(card);
    });
    return `Hay un total de ${allMatches.length} ${categoryFound.toLowerCase()}s en la zona, pero solo ${openMatches.length} están abiertas en este momento.`;
  } else {
    return `🕒 En este momento, **todas las ${allMatches.length} ${categoryFound.toLowerCase()}s** de la zona están **cerradas**.
¿Querés saber cuándo abre alguna? Preguntá: "*¿Cuándo abre la ${categoryFound.toLowerCase()} más cercana?*"`;
  }
}

    // === 2. BÚSQUEDA POR NOMBRE DE NEGOCIO ===
    const negocioMatch = negociosData.find(n => 
      normalizeString(n.name).includes(normalizeString(query))
    );

    if (negocioMatch) {
      const isOpen = isBusinessOpen(negocioMatch.hours);
      const statusIcon = isOpen ? '🟢' : '🔴';
      const statusText = isOpen ? 'Abierto ahora' : 'Cerrado';
      addMessage(`Mostrando información de *${negocioMatch.name}* (${statusIcon} ${statusText})`, 'user');
      const card = createBusinessCard(negocioMatch, 0);
      chatBody.appendChild(card);

      if (!isOpen) {
        const nextOpening = getNextOpeningTime(negocioMatch.hours);
        if (nextOpening && nextOpening.next === 'ahora') {
          return "¡Está abierto ahora mismo! 🎉";
        } else if (nextOpening) {
          return `Este comercio está actualmente **cerrado**. Vuelve a abrir ${nextOpening.next} a las ${nextOpening.openTime}.`;
        } else {
          return `Este comercio está actualmente cerrado. Su horario es: ${negocioMatch.hours.replace(/Mon/g,'Lunes').replace(/Tue/g,'Martes').replace(/Wed/g,'Miércoles').replace(/Thu/g,'Jueves').replace(/Fri/g,'Viernes').replace(/Sat/g,'Sábado').replace(/Sun/g,'Domingo')}.`;
        }
      } else {
        return "Aquí tenés toda la información del comercio. ¿Necesitás algo más?";
      }
    }

    // === 3. PALABRAS CLAVE GENERALES ===
    const tieneOferta = /oferta|promoción|descuento|2x1|50%|gratis|ofert|promo/i.test(query);
    const tieneNegocio = /negocio|comercio|tienda|local|barrio|castelar/i.test(query);
    const tieneHorario = /hora|horario|abre|cierra|abierto|cerrado|funciona|atención/i.test(query);
    const tieneUbicacion = /ubicaci[oó]n|direcci[oó]n|d[oó]nde|lugar|mapa|ubicad[o]*|posici[oó]n|geolocalizaci[oó]n|coordenadas/i.test(query);
    const tienePago = /pago|dinero|efectivo|tarjeta|mercadopago|digital|billetera|transferencia/i.test(query);
    const saludo = /hola|buen[oa]|saludos|che|hey|holi/i.test(query);
    const despedida = /chau|adios|gracias|grac|dale|genial|perfecto|ok|vale/i.test(query);

    if (saludo) {
      return "¡Hola! 👋 Soy tu asistente virtual de *Tu Barrio A Un Clik*. Puedo ayudarte con:\n• Panaderías\n• Farmacias\n• Ferreterías\n• Horarios\n• Ofertas\n\nSolo dime: *'¿Qué panaderías hay abiertas?'* o *'¿A qué hora cierra la farmacia?'*";
    }

    if (despedida) {
      return "¡Gracias por usar el chat! Si necesitás ayuda después, volvé a abrirlo. ¡Que tengas un buen día! 🌞";
    }

    if (tieneOferta) {
      return formatOfertasResponse();
    }

    if (tieneNegocio && tieneHorario) {
      return formatHorariosResponse();
    }

    if (tieneNegocio && tieneUbicacion) {
      return formatUbicacionesResponse();
    }

    if (tieneNegocio) {
      return formatTodosNegociosResponse();
    }

    if (tieneHorario) {
      return formatHorariosResponse();
    }

    if (tieneUbicacion) {
      return formatUbicacionesResponse();
    }

    if (tienePago) {
      return "La mayoría de los comercios aceptan efectivo, tarjeta (débito y crédito) y Mercado Pago. ¿Querés saber si un local en particular acepta algo específico?";
    }

    // === 4. CASO ESPECIAL: "¿CUÁNDO VUELVE A ABRIR?" ===
    if (/cuándo|cuando|vuelve a abrir|abre de nuevo|abre mañana|cuándo abre/i.test(query)) {
      // Buscar nombre de negocio en la pregunta
      for (const negocio of negociosData) {
        if (normalizeString(negocio.name).includes(normalizeString(query))) {
          const nextOpening = getNextOpeningTime(negocio.hours);
          if (nextOpening) {
            if (nextOpening.next === 'ahora') {
              return `✅ La ${negocio.category.toLowerCase()} *${negocio.name}* está **abierta ahora**. Cierra a las ${nextOpening.openTime}.`;
            } else {
              return `🕒 La ${negocio.category.toLowerCase()} *${negocio.name}* está cerrada ahora, pero vuelve a abrir ${nextOpening.next} a las ${nextOpening.openTime}.`;
            }
          } else {
            return `No pude determinar cuándo vuelve a abrir *${negocio.name}*. Sus horarios son: ${negocio.hours.replace(/Mon/g,'Lunes').replace(/Tue/g,'Martes').replace(/Wed/g,'Miércoles').replace(/Thu/g,'Jueves').replace(/Fri/g,'Viernes').replace(/Sat/g,'Sábado').replace(/Sun/g,'Domingo')}`;
          }
        }
      }
      // Si no se encontró nombre, dar respuesta general
      const openCount = negociosData.filter(n => isBusinessOpen(n.hours)).length;
      const total = negociosData.length;
      return `Actualmente hay ${openCount} comercios abiertos de ${total} registrados.\nPreguntá por un nombre específico, como: "*¿Cuándo vuelve a abrir la panadería del centro?*".`;
    }

    // === 5. CASO ESPECIAL: "¿QUÉ ESTÁ ABIERTO AHORA?" ===
    if (/abiertos?|abierta|cerrados?|cerrada/i.test(query) && !categoryFound && !negocioMatch) {
      const openCount = negociosData.filter(n => isBusinessOpen(n.hours)).length;
      const total = negociosData.length;
      return `En este momento, hay **${openCount} comercios abiertos** de un total de ${total} registrados.\n¿Querés ver cuáles son? Preguntá: "*¿Qué comercios están abiertos?*" o "*¿Qué panaderías hay abiertas?*".`;
    }

    // === 6. CASO FINAL: NO ENTENDIDO ===
    return "No entendí del todo 😅\n\nProbá con frases como:\n- *¿Qué panaderías hay abiertas?*\n- *¿A qué hora cierra la farmacia?*\n- *¿Cuándo vuelve a abrir la panadería?*\n- *¿Dónde queda la ferretería?*";
  }

  // === ENVÍO DE MENSAJES ===
  function handleSendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    addMessage(text, 'user');
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    showTypingIndicator();
    
    setTimeout(() => {
      hideTypingIndicator();
      const response = generateResponse(text);
      addMessage(response, 'bot');
    }, 1500);
  }

  function sendQuickReply(text) {
    messageInput.value = text;
    handleSendMessage();
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  // === ABRIR WHATSAPP ===
  window.openWhatsApp = function() {
    const whatsappNumber = '5491157194796';
    const message = `*Solicitud de Soporte*
*Mensaje:* Hola, necesito ayuda.
*Desde:* Tu Barrio A Un Clik
*Fecha:* ${new Date().toLocaleDateString('es-AR')}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      window.open(whatsappUrl, isMobile ? '_self' : '_blank');
    } catch (error) {
      console.error('Error al abrir WhatsApp:', error);
      addMessage('No pude abrir WhatsApp. Escribe "soporte" para intentarlo de nuevo.', 'bot');
    }
  };

  // === MODAL DE CONFIRMACIÓN ===
  const confirmModal = document.getElementById('confirmModal');
  const confirmSendBtn = document.getElementById('confirmSendBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  if (confirmSendBtn) {
    confirmSendBtn.addEventListener('click', function() {
      const nombre = document.getElementById('nombreInput').value.trim();
      const tipo = document.getElementById('tipoMensaje').value;
      const mensaje = document.getElementById('mensajeInput').value.trim();

      if (!nombre || !mensaje) {
        addMessage("Por favor, completa todos los campos.", "bot");
        return;
      }

      const textoWhatsApp = `*Mensaje desde Tu Barrio A Un Clik*
*Nombre:* ${nombre}
*Tipo:* ${tipo}
*Mensaje:* ${mensaje}`;
      const url = `https://wa.me/5491157194796?text=${encodeURIComponent(textoWhatsApp)}`;

      window.open(url, '_blank');
      confirmModal.style.display = 'none';
      addMessage("✅ ¡Tu mensaje fue enviado! Pronto nos pondremos en contacto.", "bot");
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      confirmModal.style.display = 'none';
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      confirmModal.style.display = 'none';
    }
  });

  // === CONTROL DE VOZ (ON/OFF) ===
  if (voiceToggleBtn) {
    function updateVoiceButton() {
      voiceToggleBtn.innerHTML = voiceEnabled 
        ? '<i class="fas fa-volume-up"></i>' 
        : '<i class="fas fa-volume-mute"></i>';
      voiceToggleBtn.classList.toggle('muted', !voiceEnabled);
    }

    voiceToggleBtn.addEventListener('click', () => {
      voiceEnabled = !voiceEnabled;
      updateVoiceButton();
      
      if (voiceEnabled) {
        addMessage('✅ Voz activada. Escucharás las respuestas.', 'bot');
      } else {
        addMessage('🔇 Voz desactivada. Puedes volver a activarla con el botón.', 'bot');
      }
    });

    updateVoiceButton();
  }

  // === RECONOCIMIENTO DE VOZ ===
  let recognition;
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      messageInput.value = transcript;
      handleSendMessage();
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        addMessage('Permiso de micrófono denegado. Activalo en la configuración del navegador.', 'bot');
      } else {
        console.error('Error en reconocimiento de voz:', event.error);
      }
    };

    recognition.onend = () => {
      micBtn?.classList.remove('recording');
    };

    micBtn?.addEventListener('click', () => {
      if (micBtn.classList.contains('recording')) {
        recognition.stop();
        micBtn.classList.remove('recording');
      } else {
        recognition.start();
        micBtn.classList.add('recording');
        addMessage('Escuchando...', 'bot');
      }
    });
  } else {
    console.warn('Tu navegador no soporta reconocimiento de voz.');
    if (micBtn) micBtn.remove();
    if (voiceToggleBtn) voiceToggleBtn.remove();
  }

  // === SÍNTESIS DE VOZ MEJORADA (¡NITIDEZ PROFESIONAL!) ===
  function speakText(text) {
    if (!window.speechSynthesis || !voiceEnabled) return;
    window.speechSynthesis.cancel();

    let cleanText = text
      .replace(/<[^>]*>/g, '')                    // Quitar HTML
      .replace(/\*[^*]*\*/g, '')                  // Quitar negritas
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Quitar emojis complejos
      .replace(/[.,;:!?()"\[\]{}'’“”‘’]/g, ' ')   // Reemplazar signos por espacios
      .replace(/[-–—_]/g, ' ')                    // Guiones → espacios
      .replace(/\s+/g, ' ')                       // Espacios múltiples → uno
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-AR';
    utterance.rate = 0.9;  // Más natural
    utterance.pitch = 1.1; // Un poco más aguda (como una persona amable)
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    selectedVoice = voices.find(v => 
      v.lang === 'es-AR' && 
      (v.name.includes('Google') || v.name.includes('Sara') || v.name.includes('Esperanza'))
    );

    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('es'));
    }

    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {};
    utterance.onend = () => {};

    window.speechSynthesis.speak(utterance);
  }

  // === MENSAJE DE BIENVENIDA ===
  function showWelcomeMessage() {
    addMessage("¡Hola! Soy tu asistente virtual de *Tu Barrio A Un Clik*. Puedo ayudarte a encontrar comercios, horarios, ubicaciones o formas de pago.\n\nPrueba preguntar:\n• *¿Qué panaderías hay abiertas?*\n• *¿A qué hora cierra la farmacia?*\n• *¿Cuándo vuelve a abrir la panadería?*\n• *¿Hay ofertas hoy?*", 'bot');
  }

  // === INICIALIZACIÓN ===
  function initChatbot() {
    if (window.chatbotInitialized) return;

    if (!document.getElementById('messageInput')) {
      if (window.chatbotInitAttempts < 10) {
        window.chatbotInitAttempts++;
        setTimeout(initChatbot, 300);
        return;
      } else {
        console.error('Límite de reintentos para messageInput.');
        return;
      }
    }

    window.chatbotInitAttempts = 0;
    window.chatbotInitialized = true;

    cargarNegocios();
    cargarOfertas();

    if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
    if (messageInput) {
      messageInput.addEventListener('keydown', handleKeyPress);
      messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
      });
    }
    if (closeChat) closeChat.addEventListener('click', () => chatContainer.classList.remove('active'));

    setTimeout(showWelcomeMessage, 500);
  }

  // === EVENT LISTENERS ===
  if (chatbotBtn) {
    chatbotBtn.addEventListener('click', () => {
      chatContainer.classList.add('active');
      if (negociosData.length === 0) cargarNegocios();
      if (ofertasData.length === 0) cargarOfertas();
    });
  }

  window.chatbotInitAttempts = 0;
  window.sendQuickReply = sendQuickReply;
  setTimeout(initChatbot, 500);
});