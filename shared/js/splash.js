// splash.js - Versión mejorada con manejo de carga de estilos
let stylesLoaded = false;
let domLoaded = false;

// Verificar si los estilos CSS están cargados
function checkStylesLoaded() {
    // Verificar si los estilos principales están aplicados
    const bodyStyles = window.getComputedStyle(document.body);
    const hasStyles = bodyStyles.display !== '' && bodyStyles.visibility !== '';
    
    if (hasStyles) {
        stylesLoaded = true;
        console.log('✅ Estilos CSS cargados');
        initializeSplash();
    } else {
        // Reintentar después de un breve delay
        setTimeout(checkStylesLoaded, 100);
    }
}

// Inicializar splash solo cuando TODO esté listo
function initializeSplash() {
    if (stylesLoaded && domLoaded) {
        console.log('🎬 Iniciando splash screen');
        createParticles();
        startLoadingAnimation();
        
        // Timeout de seguridad
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash && splash.style.display !== 'none') {
                console.log('⏰ Timeout de seguridad - Ocultando splash');
                skipSplash();
            }
        }, 8000); // 8 segundos máximo
    }
}

// Generar partículas aleatorias
function createParticles() {
    const container = document.getElementById('splashParticles');
    if (!container) {
        console.warn('❌ No se encontró el contenedor de partículas');
        return;
    }
    
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Propiedades aleatorias
        const size = Math.random() * 5 + 1;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = Math.random() * 10 + 5;
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        
        container.appendChild(particle);
    }
    console.log('✨ Partículas creadas:', particleCount);
}

// Animación de carga
function startLoadingAnimation() {
    const loadingBar = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');
    
    if (!loadingBar || !loadingText) {
        console.warn('❌ Elementos de loading no encontrados');
        skipSplash();
        return;
    }
    
    const texts = [
        'Cargando experiencia local...',
        'Conectando con tu barrio...',
        'Preparando comercios cercanos...',
        'Optimizando tu experiencia...',
        '¡Listo para descubrir!'
    ];
    
    let progress = 0;
    let textIndex = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // Completar la carga
            setTimeout(() => {
                console.log('✅ Carga completada al 100%');
                skipSplash();
            }, 800);
        }
        
        // Actualizar barra de progreso
        loadingBar.style.width = `${progress}%`;
        
        // Cambiar texto cada cierto porcentaje
        if (progress > (textIndex + 1) * 20 && textIndex < texts.length - 1) {
            textIndex++;
            loadingText.textContent = texts[textIndex];
            console.log(`📝 Texto actualizado: ${texts[textIndex]}`);
        }
    }, 200);
}

// Función para saltar splash screen
function skipSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        console.log('🎯 Ocultando splash screen');
        
        // Asegurar que la barra esté completa
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) {
            loadingBar.style.width = '100%';
        }
        
        splash.classList.add('fade-out');
        setTimeout(() => {
            splash.style.display = 'none';
            console.log('🚀 Splscreen ocultado completamente');
        }, 800);
    } else {
        console.warn('❌ No se encontró el elemento splash-screen');
    }
}

// Inicialización mejorada
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado');
    domLoaded = true;
    
    // Esperar un poco para que los estilos comiencen a cargarse
    setTimeout(() => {
        checkStylesLoaded();
    }, 100);
});

// También verificar cuando la ventana se carga completamente
window.addEventListener('load', function() {
    console.log('🖼️ Página completamente cargada');
    // Forzar la inicialización si no se ha hecho
    if (!stylesLoaded) {
        stylesLoaded = true;
        initializeSplash();
    }
});

// Fallback global: si después de 10 segundos nada funcionó
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash && splash.style.display !== 'none') {
        console.log('🆘 Fallback global - Ocultando splash forzadamente');
        splash.style.display = 'none';
    }
}, 10000);

console.log('🎬 splash.js cargado - Esperando estilos y DOM');