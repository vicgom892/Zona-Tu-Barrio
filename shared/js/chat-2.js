// chat.js - Versión completa con ofertas, pagos y botones de acceso rápido
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
      'pintor', 'pintores', 'plomero', 'plomeros', 'fontanero', 'transporte', 'camión', 'flete', 'delivery local'
    ],
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

  // === NUEVA LÓGICA DE BÚSQUEDA INTELIGENTE (BIDIRECCIONAL) ===
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

  // === CARGA DE NEGOCIOS MEJORADA - USA LOS MISMOS DATOS QUE LA APP ===
  async function cargarNegocios() {
    try {
      console.log('🔄 Iniciando carga de negocios para el chatbot...');

      // ESTRATEGIA 1: Usar window.businesses (datos principales de la app)
      if (window.businesses && Array.isArray(window.businesses) && window.businesses.length > 0) {
        negociosData = window.businesses;
        console.log(`✅ Chatbot usando ${negociosData.length} negocios desde window.businesses`);
        return;
      }

      // ESTRATEGIA 2: Esperar a que la app principal cargue los datos
      console.log('⏳ Esperando datos de la app principal...');
      await waitForBusinessesData();
      
      if (window.businesses && window.businesses.length > 0) {
        negociosData = window.businesses;
        console.log(`✅ Chatbot usando ${negociosData.length} negocios después de espera`);
        return;
      }

      // ESTRATEGIA 3: Cargar desde caché local (compatible con la app principal)
      const CACHE_KEY = 'businesses_cache_v5';
      const cachedData = localStorage.getItem(CACHE_KEY);

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          // Compatibilidad con diferentes formatos de caché
          negociosData = Array.isArray(parsed) ? parsed : 
                        (parsed.data && Array.isArray(parsed.data) ? parsed.data : 
                        (parsed.businesses && Array.isArray(parsed.businesses) ? parsed.businesses : []));
          
          if (negociosData.length > 0) {
            console.log(`✅ Chatbot usando ${negociosData.length} negocios desde caché local`);
            return;
          }
        } catch (e) {
          console.warn('Caché dañado, intentando cargar desde secciones...');
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // ESTRATEGIA 4: Cargar desde todas las secciones (como hace la app principal)
      console.log('🔄 Cargando negocios desde secciones individuales...');
      await cargarNegociosDesdeSecciones();

    } catch (error) {
      console.error('Error al cargar los negocios:', error);
      addMessage('No pude cargar los comercios. Escribe "ayuda" para saber qué puedo hacer.', 'bot');
    }
  }

  // === FUNCIÓN PARA ESPERAR DATOS DE LA APP PRINCIPAL ===
  function waitForBusinessesData() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // 30 intentos = 15 segundos

      const checkData = () => {
        attempts++;
        
        if (window.businesses && Array.isArray(window.businesses) && window.businesses.length > 0) {
          console.log(`✅ Datos de app principal disponibles después de ${attempts} intentos`);
          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          console.warn('❌ Timeout esperando datos de app principal');
          resolve();
          return;
        }

        setTimeout(checkData, 500);
      };

      checkData();
    });
  }

  // === CARGA DESDE SECCIONES INDIVIDUALES (COMO HACE LA APP PRINCIPAL) ===
  async function cargarNegociosDesdeSecciones() {
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

    const promises = Object.entries(secciones).map(async ([rubro, archivo]) => {
      try {
        const response = await fetch(`data/${archivo}`);
        if (!response.ok) throw new Error(`HTTP ${response.status} para ${archivo}`);
        
        const negocios = await response.json();
        
        // Transformar al formato esperado
        return negocios.map(negocio => ({
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
        }));
      } catch (error) {
        console.warn(`❌ Error cargando ${rubro}:`, error);
        return [];
      }
    });

    try {
      const resultados = await Promise.allSettled(promises);
      negociosData = resultados
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .flat();

      console.log(`✅ Cargados ${negociosData.length} negocios desde secciones individuales`);

      // Guardar en caché para uso futuro
      if (negociosData.length > 0) {
        localStorage.setItem('businesses_cache_v5', JSON.stringify({
          data: negociosData,
          timestamp: Date.now(),
          source: 'chatbot-secciones'
        }));
      }

    } catch (error) {
      console.error('Error al cargar secciones:', error);
      negociosData = [];
    }
  }

  // === CARGA DE OFERTAS MEJORADA ===
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

      // Intentar cargar desde diferentes endpoints
      const endpoints = [
        'datos/seccion-ofertas.json',
        'data/ofertas.json',
        'datos/promociones.json'
      ];

      let rawData = null;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            rawData = await response.json();
            console.log(`✅ Ofertas cargadas desde: ${endpoint}`);
            break;
          }
        } catch (error) {
          console.warn(`❌ Error cargando ${endpoint}:`, error);
        }
      }

      if (!rawData) {
        throw new Error('No se pudieron cargar las ofertas desde ningún endpoint');
      }

      // Transformar datos de ofertas
      ofertasData = Array.isArray(rawData) ? rawData.map((oferta, index) => ({
        id: oferta.id || `oferta-${index}-${Date.now()}`,
        nombre: oferta.title || oferta.nombre || 'Oferta especial',
        categoria: oferta.rubro || oferta.categoria || 'General',
        descuento: oferta.discount || oferta.descuento || "Ver detalle",
        detalle: oferta.description || oferta.detalle || 'Oferta disponible por tiempo limitado',
        imagen: oferta.image || oferta.imagen || 'img/placeholder-oferta.jpg',
        web: (oferta.web_url || oferta.web || '').trim().replace(/\s+/g, '') || null,
        instagram: (oferta.instagram_url || oferta.instagram || '').trim().replace(/\s+/g, '') || null,
        ofertaLimitada: true,
        fechaInicio: oferta.start_date || oferta.fechaInicio || new Date().toISOString(),
        fechaFin: oferta.end_date || oferta.fechaFin || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })) : [];

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ofertasData,
        timestamp: Date.now()
      }));

      console.log(`✅ Ofertas transformadas: ${ofertasData.length}`);

    } catch (error) {
      console.error('Error al cargar ofertas:', error);
      // Crear ofertas de ejemplo si no se pueden cargar
      ofertasData = [
        {
          id: 'oferta-ejemplo-1',
          nombre: 'Descuento especial',
          categoria: 'General',
          descuento: '10% OFF',
          detalle: 'Acércate al local y menciona que viniste desde Tu Barrio A Un Clik para obtener tu descuento',
          imagen: 'img/placeholder-oferta.jpg',
          web: null,
          instagram: null,
          ofertaLimitada: true,
          fechaInicio: new Date().toISOString(),
          fechaFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
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

  // === BOTONES DE ACCESO RÁPIDO ===
  function createQuickReplies() {
    const quickReplies = document.createElement('div');
    quickReplies.className = 'quick-replies';
    
    const buttons = [
      { text: '🏪 Todos los comercios', query: 'mostrar todos los comercios' },
      { text: '🕒 ¿Qué está abierto?', query: 'qué está abierto ahora' },
      { text: '🍞 Panaderías', query: 'panaderías' },
      { text: '💊 Farmacias', query: 'farmacias' },
      { text: '🔧 Ferreterías', query: 'ferreterías' },
      { text: '🎁 Ofertas', query: 'ofertas' },
      { text: '💳 Medios de pago', query: 'qué medios de pago aceptan' }
    ];

    buttons.forEach(button => {
      const btn = document.createElement('button');
      btn.className = 'quick-reply-btn';
      btn.textContent = button.text;
      btn.onclick = () => sendQuickReply(button.query);
      quickReplies.appendChild(btn);
    });

    return quickReplies;
  }

  // === FUNCIÓN SEND QUICK REPLY ===
  function sendQuickReply(text) {
    console.log('📨 Quick reply enviado:', text);
    
    // Agregar mensaje del usuario
    addMessage(text, 'user');
    
    // Limpiar input si existe
    if (messageInput) {
      messageInput.value = '';
    }
    
    // Mostrar indicador de escritura
    showTypingIndicator();
    
    // Generar y mostrar respuesta después de un delay
    setTimeout(() => {
      hideTypingIndicator();
      const response = generateResponse(text);
      addMessage(response, 'bot');
      
      // Agregar botones de acceso rápido después de la respuesta
      const quickReplies = createQuickReplies();
      chatBody.appendChild(quickReplies);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 1000);
  }

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
    
    // Remover botones de acceso rápido existentes cuando el usuario envía un mensaje
    if (sender === 'user') {
      const existingQuickReplies = document.querySelector('.quick-replies');
      if (existingQuickReplies) {
        existingQuickReplies.remove();
      }
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

  // === TARJETAS DE OFERTAS ===
  function createOfferCard(oferta, index) {
    const card = document.createElement('div');
    card.className = 'business-card offer-card';
    card.style.animationDelay = `${index * 0.1}s`;

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: linear-gradient(135deg, #ff6a3c, #ff8c42); border-bottom: 1px solid #e2e8f0; border-radius: 12px 12px 0 0;">
        <div style="font-size: 2rem;">🎁</div>
        <div>
          <div style="font-weight: 700; color: white; font-size: 1.1rem;">${oferta.nombre}</div>
          <div style="font-size: 0.85rem; color: white; font-weight: 600; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 20px; display: inline-block;">
            ${oferta.categoria}
          </div>
        </div>
      </div>

      <div style="padding: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 0.9rem; color: #4a5568;">
          <i class="fas fa-tag" style="color: #ff6a3c;"></i>
          <span><strong>Descuento:</strong> ${oferta.descuento}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 0.9rem; color: #4a5568;">
          <i class="fas fa-info-circle" style="color: #ff6a3c;"></i>
          <span>${oferta.detalle}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px; margin: 12px 0;">
          ${oferta.web ? `
          <a href="${oferta.web}" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 0.85rem; background: #4285F4; color: white; border: 1px solid #3367D6; transition: all 0.2s;">
            <i class="fas fa-globe"></i>
            <span>Visitar Web</span>
          </a>` : ''}

          ${oferta.instagram ? `
          <a href="${oferta.instagram}" target="_blank" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 0.85rem; background: #E1306C; color: white; border: 1px solid #C13584; transition: all 0.2s;">
            <i class="fab fa-instagram"></i>
            <span>Ver Instagram</span>
          </a>` : ''}
        </div>

        <div style="text-align: center; font-size: 0.85rem; color: #e65100; font-weight: 600; margin-top: 6px;">
          ⏰ Oferta por tiempo limitado
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

    // Mostrar estadísticas primero
    const openCount = negociosData.filter(n => isBusinessOpen(n.hours)).length;
    addMessage(`📊 **Estadísticas de comercios:**\n• Total registrados: ${negociosData.length}\n• Abiertos ahora: ${openCount}\n• Cerrados: ${negociosData.length - openCount}`, 'bot');

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

    return `✅ Mostrando todos los ${negociosData.length} comercios registrados. ¿Necesitás ayuda con alguno en particular?`;
  }

  // === MOSTRAR OFERTAS ===
  function formatOfertasResponse() {
    if (!ofertasData || ofertasData.length === 0) {
      return `🎁 **Ofertas disponibles**\n\nActualmente no hay ofertas activas. Te recomiendo:\n\n• Contactar directamente a los comercios\n• Seguirlos en sus redes sociales\n• Volver a consultar en unos días\n\n¡Pronto tendremos nuevas promociones!`;
    }

    addMessage(`🎁 **Ofertas activas (${ofertasData.length})**\n\nEncontré estas promociones disponibles:`, 'bot');

    ofertasData.forEach((oferta, index) => {
      const card = createOfferCard(oferta, index);
      chatBody.appendChild(card);
    });

    return `✨ Mostrando ${ofertasData.length} oferta(s) activa(s). ¡No te las pierdas!`;
  }

  // === INFORMACIÓN DE PAGOS ===
  function formatPagosResponse() {
    return `💳 **Medios de Pago Aceptados**\n\nLa mayoría de nuestros comercios aceptan:\n\n• ✅ **Efectivo** (todos los comercios)\n• ✅ **Débito** (la mayoría)\n• ✅ **Crédito** (muchos comercios)\n• ✅ **Transferencia bancaria**\n• ✅ **Mercado Pago** (cada vez más comercios)\n• ✅ **Billeteras virtuales** (Ualá, Personal Pay, etc.)\n\n💡 *Consejo: Siempre podés preguntar al comercio qué medios de pago aceptan específicamente.*`;
  }

  // === GENERAR RESPUESTA INTELIGENTE ===
  function generateResponse(query) {
    query = normalizeString(query);
    learningHistory.push({ query: query, timestamp: Date.now() });

    // === 1. DETECTAR OFERTAS ===
    if (normalizeString(query).includes('ofertas') || normalizeString(query).includes('promociones') || normalizeString(query).includes('descuentos')) {
      return formatOfertasResponse();
    }

    // === 2. DETECTAR PAGOS ===
    if (normalizeString(query).includes('pago') || normalizeString(query).includes('pagos') || 
        normalizeString(query).includes('efectivo') || normalizeString(query).includes('tarjeta') ||
        normalizeString(query).includes('débito') || normalizeString(query).includes('credito') ||
        normalizeString(query).includes('transferencia') || normalizeString(query).includes('mercado pago')) {
      return formatPagosResponse();
    }

    // === 3. DETECTAR CATEGORÍA EXACTA ===
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

      // ✅ RESTO DE CATEGORÍAS: comportamiento original
      const allMatches = negociosData.filter(n =>
        normalizeString(n.category).includes(normalizedCategory)
      );

      if (allMatches.length === 0) {
        return `❌ No encontré ninguna ${categoryFound.toLowerCase()} registrada en nuestra base de datos. ¿Quizás te referís a otra zona o nombre diferente?`;
      }

      const openMatches = allMatches.filter(n => isBusinessOpen(n.hours));
      
      if (openMatches.length > 0) {
        addMessage(`✅ Encontré ${openMatches.length} ${categoryFound.toLowerCase()}${openMatches.length !== 1 ? 's' : ''} **abiertas ahora** de un total de ${allMatches.length}`, 'bot');
        openMatches.forEach((negocio, index) => {
          const card = createBusinessCard(negocio, index);
          chatBody.appendChild(card);
        });
        return `Mostrando ${openMatches.length} ${categoryFound.toLowerCase()}s abiertas. Hay ${allMatches.length - openMatches.length} cerradas en este momento.`;
      } else {
        addMessage(`🕒 Encontré ${allMatches.length} ${categoryFound.toLowerCase()}s, pero todas están **cerradas** en este momento.`, 'bot');
        allMatches.forEach((negocio, index) => {
          const card = createBusinessCard(negocio, index);
          chatBody.appendChild(card);
        });
        return `Puedes contactarlas para consultar horarios específicos.`;
      }
    }

    // === 4. BÚSQUEDA POR NOMBRE DE NEGOCIO ===
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

      return isOpen ? 
        "✅ Este comercio está abierto ahora. Aquí tenés toda la información de contacto." :
        "🕒 Este comercio está cerrado en este momento. Podés contactarlo para consultar horarios.";
    }

    // === 5. PALABRAS CLAVE GENERALES ===
    const tieneNegocio = /negocio|comercio|tienda|local|barrio|castelar|todos/i.test(query);
    const tieneHorario = /hora|horario|abre|cierra|abierto|cerrado|funciona|atención/i.test(query);
    const tieneUbicacion = /ubicaci[oó]n|direcci[oó]n|d[oó]nde|lugar|mapa|ubicad[o]*/i.test(query);
    const saludo = /hola|buen[oa]|saludos|che|hey|holi/i.test(query);
    const despedida = /chau|adios|gracias|grac|dale|genial|perfecto|ok|vale/i.test(query);

    if (saludo) {
      return `¡Hola! 👋 Soy tu asistente virtual de *Tu Barrio A Un Clik*. 

Tengo información de **${negociosData.length} comercios** registrados. Puedo ayudarte con:

• 🏪 **Buscar por categoría**: "panaderías", "farmacias", "ferreterías"
• 🕒 **Consultar horarios**: "¿Qué está abierto ahora?"
• 📍 **Ubicaciones**: "¿Dónde queda...?"
• 🎁 **Ofertas activas**
• 💳 **Medios de pago**

¿En qué te puedo ayudar?`;
    }

    if (despedida) {
      return "¡Gracias por usar el chat! Recordá que tengo info de " + negociosData.length + " comercios. ¡Volvé cuando necesites! 🌞";
    }

    if (tieneNegocio) {
      return formatTodosNegociosResponse();
    }

    if (tieneHorario) {
      const openCount = negociosData.filter(n => isBusinessOpen(n.hours)).length;
      return `🕒 **Horarios de comercios**\n\n• Total de comercios: ${negociosData.length}\n• Abiertos ahora: ${openCount}\n• Cerrados: ${negociosData.length - openCount}\n\n¿Querés ver todos los comercios o buscar uno en particular?`;
    }

    if (tieneUbicacion) {
      return `📍 **Ubicaciones de comercios**\n\nTengo ${negociosData.length} comercios registrados con sus ubicaciones. ¿Buscás alguno en particular? Podés preguntar:\n\n• "¿Dónde queda la panadería más cercana?"\n• "Ubicación de farmacias"\n• O ver todos los comercios con "mostrar todos"`;
    }

    // === 6. CASO FINAL: NO ENTENDIDO ===
    return `No entendí del todo 😅

Tengo información de **${negociosData.length} comercios**. Probá con:

• "**panaderías**" - Ver todas las panaderías
• "**farmacias abiertas**" - Ver farmacias abiertas ahora  
• "**mostrar todos**" - Ver todos los comercios
• "**horarios**" - Ver qué está abierto
• "**ofertas**" - Ver promociones activas
• "**medios de pago**" - Ver qué pagos aceptan

¿En qué te puedo ayudar?`;
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
      
      // Agregar botones de acceso rápido después de cada respuesta
      const quickReplies = createQuickReplies();
      chatBody.appendChild(quickReplies);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 1000);
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  // === INICIALIZACIÓN MEJORADA ===
  function initChatbot() {
    if (window.chatbotInitialized) return;

    // Verificar que los elementos del DOM existan
    if (!document.getElementById('messageInput')) {
      setTimeout(initChatbot, 500);
      return;
    }

    window.chatbotInitialized = true;

    // Cargar datos
    cargarNegocios();
    cargarOfertas();

    // Event listeners
    if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
    if (messageInput) {
      messageInput.addEventListener('keydown', handleKeyPress);
      messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
      });
    }
    if (closeChat) closeChat.addEventListener('click', () => chatContainer.classList.remove('active'));

    // Mensaje de bienvenida después de cargar datos
    setTimeout(() => {
      if (negociosData.length > 0) {
        addMessage(`¡Hola! 👋 Soy tu asistente virtual. Tengo información de **${negociosData.length} comercios** registrados. ¿En qué te puedo ayudar?`, 'bot');
        
        // Agregar botones de acceso rápido iniciales
        const quickReplies = createQuickReplies();
        chatBody.appendChild(quickReplies);
        chatBody.scrollTop = chatBody.scrollHeight;
      } else {
        addMessage("¡Hola! 👋 Estoy cargando la información de comercios...", 'bot');
        // Reintentar carga si no hay datos
        setTimeout(() => {
          if (negociosData.length === 0) {
            cargarNegocios();
          }
        }, 2000);
      }
    }, 1000);
  }

  // === EVENT LISTENERS GLOBALES ===
  if (chatbotBtn) {
    chatbotBtn.addEventListener('click', () => {
      chatContainer.classList.add('active');
      initChatbot();
    });
  }

  // === SÍNTESIS DE VOZ ===
  function speakText(text) {
    if (!window.speechSynthesis || !voiceEnabled) return;
    window.speechSynthesis.cancel();

    let cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/\*[^*]*\*/g, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/[.,;:!?()"\[\]{}'’"'"'"']/g, ' ')
      .replace(/[-–—_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-AR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => 
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

    window.speechSynthesis.speak(utterance);
  }

  // === EXPORTAR FUNCIONES GLOBALES ===
  window.sendQuickReply = sendQuickReply;

  // Inicializar cuando la página esté lista
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    setTimeout(initChatbot, 1000);
  }
});