    // Generar partículas aleatorias
    function createParticles() {
        const container = document.getElementById('splashParticles');
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
    }
    
    // Animación de carga
    function startLoadingAnimation() {
        const loadingBar = document.getElementById('loadingBar');
        const loadingText = document.getElementById('loadingText');
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
                    skipSplash();
                }, 800);
            }
            
            // Actualizar barra de progreso
            loadingBar.style.width = `${progress}%`;
            
            // Cambiar texto cada cierto porcentaje
            if (progress > (textIndex + 1) * 20 && textIndex < texts.length - 1) {
                textIndex++;
                loadingText.textContent = texts[textIndex];
            }
        }, 200);
    }
    
    // Función para saltar splash screen
    function skipSplash() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            // Asegurar que la barra esté completa
            const loadingBar = document.getElementById('loadingBar');
            if (loadingBar) {
                loadingBar.style.width = '100%';
            }
            
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.style.display = 'none';
            }, 800);
        }
    }
    
    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        createParticles();
        startLoadingAnimation();
        
        // Si no se completa automáticamente, forzar después de 5 segundos
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash && splash.style.display !== 'none') {
                skipSplash();
            }
        }, 5000);
    });
