// install-app.js - Versión mejorada para evitar conflictos con otras PWAs
// Variable global para el evento de instalación
let deferredPrompt = null;

// Detectar si estamos en iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Verificar si la PWA ya está instalada
function checkIfPWAInstalled() {
    // Método 1: Display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    
    // Método 2: Navigator standalone (iOS)
    if (window.navigator.standalone) {
        return true;
    }
    
    // Método 3: Referrer (cuando se abre desde homescreen)
    if (document.referrer.includes('android-app://') || 
        navigator.userAgent.includes('wv')) {
        return true;
    }
    
    return false;
}

// Mostrar instrucciones de instalación manual
function showManualInstallInstructions() {
    let installModal = document.getElementById('manualInstallModal');
    
    if (!installModal) {
        installModal = document.createElement('div');
        installModal.id = 'manualInstallModal';
        installModal.className = 'modal fade';
        installModal.tabIndex = -1;
        installModal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-mobile-alt me-2"></i>Instalar Tu Barrio A Un Clik
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6><i class="fab fa-android text-success me-2"></i>Android/Chrome</h6>
                                <ol class="small">
                                    <li>Tocá el menú (⋮) en la esquina superior derecha</li>
                                    <li>Seleccioná "Agregar a pantalla de inicio"</li>
                                    <li>Confirmá la instalación</li>
                                </ol>
                                <div class="alert alert-info small">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Si no ves la opción, buscá "Instalar app" o "Add to Home Screen"
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h6><i class="fab fa-apple text-dark me-2"></i>iPhone/Safari</h6>
                                <ol class="small">
                                    <li>Tocá el ícono de compartir (📤)</li>
                                    <li>Deslizá y seleccioná "Agregar a pantalla de inicio"</li>
                                    <li>Confirmá la instalación</li>
                                </ol>
                                <div class="alert alert-info small">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Asegurate de usar Safari, no otros navegadores
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-3 p-3 bg-light rounded">
                            <h6 class="text-center mb-2">¿Por qué instalar la app?</h6>
                            <div class="row text-center small">
                                <div class="col-4">
                                    <i class="fas fa-bolt text-warning"></i>
                                    <div>Más rápida</div>
                                </div>
                                <div class="col-4">
                                    <i class="fas fa-bell text-primary"></i>
                                    <div>Notificaciones</div>
                                </div>
                                <div class="col-4">
                                    <i class="fas fa-wifi text-success"></i>
                                    <div>Funciona offline</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-primary" onclick="checkInstallationStatus()">
                            <i class="fas fa-sync me-1"></i>Verificar instalación
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(installModal);
    }
    
    const modal = new bootstrap.Modal(installModal);
    modal.show();
}

// Verificar estado de instalación
function checkInstallationStatus() {
    const installButton = document.getElementById('botonInstalar') || 
                         document.getElementById('botonInstalarMobile');
    
    if (checkIfPWAInstalled()) {
        if (installButton) {
            installButton.innerHTML = '<i class="fas fa-check me-1"></i>¡App Instalada!';
            installButton.className = installButton.className.replace('btn-success', 'btn-secondary');
            installButton.disabled = true;
        }
        
        // Cerrar modal si está abierto
        const modal = bootstrap.Modal.getInstance(document.getElementById('manualInstallModal'));
        if (modal) modal.hide();
        
        showToast('¡La app ya está instalada en tu dispositivo!', 'success');
    } else {
        showToast('La app aún no está instalada. Seguí las instrucciones.', 'warning');
    }
}

// Mostrar notificación toast
function showToast(message, type = 'info') {
    // Crear toast container si no existe
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remover del DOM después de ocultar
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Manejar la instalación PWA
async function handlePWAInstallation(installButton) {
    if (!deferredPrompt) {
        console.log('No hay prompt de instalación disponible - mostrando instrucciones manuales');
        showManualInstallInstructions();
        return;
    }
    
    try {
        // Mostrar el prompt de instalación
        deferredPrompt.prompt();
        
        // Esperar la elección del usuario
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`Usuario ${outcome} la instalación`);
        
        if (outcome === 'accepted') {
            installButton.innerHTML = '<i class="fas fa-check me-1"></i>¡App Instalada!';
            installButton.className = installButton.className.replace('btn-success', 'btn-secondary');
            installButton.disabled = true;
            
            showToast('¡App instalada correctamente!', 'success');
        } else {
            showToast('Instalación cancelada. Podés intentarlo más tarde.', 'warning');
            
            // Restaurar botón después de un tiempo
            setTimeout(() => {
                if (!checkIfPWAInstalled()) {
                    installButton.innerHTML = '<i class="fas fa-download me-1"></i>Instalar App';
                    installButton.disabled = false;
                }
            }, 3000);
        }
        
        // Limpiar la referencia
        deferredPrompt = null;
        
    } catch (error) {
        console.error('Error durante la instalación:', error);
        showManualInstallInstructions();
    }
}

// Función para inicializar el botón de instalación
function initInstallButton() {
    const installButton = document.getElementById('botonInstalar');
    const mobileInstallButton = document.getElementById('botonInstalarMobile');
    
    const installButtons = [];
    if (installButton) installButtons.push(installButton);
    if (mobileInstallButton) installButtons.push(mobileInstallButton);
    
    if (installButtons.length === 0) return;
    
    // Verificar si ya está instalada
    if (checkIfPWAInstalled()) {
        installButtons.forEach(btn => {
            btn.innerHTML = '<i class="fas fa-check me-1"></i>¡App Instalada!';
            btn.className = btn.className.replace('btn-success', 'btn-secondary');
            btn.disabled = true;
        });
        return;
    }
    
    // Configurar eventos para cada botón
    installButtons.forEach(installButton => {
        // Si es iOS, mostrar instrucciones específicas
        if (isIOS) {
            installButton.innerHTML = '<i class="fas fa-plus-circle me-1"></i>Agregar a pantalla de inicio';
            installButton.addEventListener('click', function(e) {
                e.preventDefault();
                showManualInstallInstructions();
            });
        } else {
            // Para otros navegadores
            installButton.addEventListener('click', () => {
                handlePWAInstallation(installButton);
            });
        }
    });
}

// Eventos PWA globales
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✅ beforeinstallprompt event fired - Tu Barrio A Un Click');
    
    // Prevenir que el mini-infobar aparezca automáticamente
    e.preventDefault();
    
    // Guardar el evento para que se pueda activar más tarde
    deferredPrompt = e;
    
    // Mostrar los botones de instalación
    const installButtons = [
        document.getElementById('botonInstalar'),
        document.getElementById('botonInstalarMobile')
    ];
    
    installButtons.forEach(btn => {
        if (btn && !checkIfPWAInstalled()) {
            btn.style.display = 'block';
            btn.disabled = false;
        }
    });
    
    // Mostrar notificación sutil
    setTimeout(() => {
        if (deferredPrompt && !checkIfPWAInstalled()) {
            showToast('¡Podés instalar la app en tu dispositivo!', 'info');
        }
    }, 2000);
});

window.addEventListener('appinstalled', () => {
    console.log('🎉 Tu Barrio A Un Click se instaló correctamente');
    
    deferredPrompt = null;
    
    // Actualizar todos los botones de instalación
    const installButtons = [
        document.getElementById('botonInstalar'),
        document.getElementById('botonInstalarMobile')
    ];
    
    installButtons.forEach(btn => {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check me-1"></i>¡App Instalada!';
            btn.className = btn.className.replace('btn-success', 'btn-secondary');
            btn.disabled = true;
        }
    });
    
    showToast('¡App instalada correctamente! Ya podés acceder desde tu pantalla de inicio.', 'success');
});

// Verificar periódicamente el estado de instalación
function monitorInstallationStatus() {
    setInterval(() => {
        if (checkIfPWAInstalled()) {
            const installButtons = [
                document.getElementById('botonInstalar'),
                document.getElementById('botonInstalarMobile')
            ];
            
            installButtons.forEach(btn => {
                if (btn && !btn.disabled) {
                    btn.innerHTML = '<i class="fas fa-check me-1"></i>¡App Instalada!';
                    btn.className = btn.className.replace('btn-success', 'btn-secondary');
                    btn.disabled = true;
                }
            });
        }
    }, 5000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initInstallButton();
    monitorInstallationStatus();
    
    // Verificar estado inicial
    setTimeout(() => {
        if (checkIfPWAInstalled()) {
            console.log('La app ya está instalada');
        }
    }, 1000);
});

// Exportar funciones para uso global (si es necesario)
window.installApp = {
    checkInstallationStatus,
    showManualInstallInstructions,
    checkIfPWAInstalled
};