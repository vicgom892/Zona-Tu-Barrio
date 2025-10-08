
  // Variable global para el evento de instalación
  let deferredPrompt;
  
  // Detectar si estamos en iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // Función para inicializar el botón de instalación
  function initInstallButton() {
    const installButton = document.getElementById('botonInstalar');
    if (!installButton) return;
    
    // Si es iOS, mostrar instrucciones específicas
    if (isIOS) {
      installButton.textContent = 'Agregar a pantalla de inicio';
      installButton.addEventListener('click', function() {
        // Crear y mostrar modal de instrucciones para iOS
        let iosModal = document.getElementById('iosInstallModal');
        if (!iosModal) {
          iosModal = document.createElement('div');
          iosModal.id = 'iosInstallModal';
          iosModal.className = 'modal fade';
          iosModal.tabIndex = -1;
          iosModal.innerHTML = `
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Instalar Tu Barrio A Un Clik</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <ol>
                    <li>Presiona el botón de compartir <i class="fas fa-share"></i> en la parte inferior</li>
                    <li>Selecciona "Agregar a pantalla de inicio"</li>
                    <li>Dale un nombre y presiona "Agregar"</li>
                  </ol>
                  <div class="text-center mt-3">
                    <img src="img/ios-instructions.png" class="img-fluid" alt="Instrucciones iOS">
                  </div>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(iosModal);
        }
        
        const modal = new bootstrap.Modal(iosModal);
        modal.show();
      });
      return;
    }
    
    // Para navegadores que soportan PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir que el mini-infobar aparezca automáticamente
      e.preventDefault();
      // Guardar el evento para que se pueda activar más tarde
      deferredPrompt = e;
      // Mostrar el botón de instalación
      installButton.style.display = 'block';
    });
    
    installButton.addEventListener('click', () => {
      if (deferredPrompt) {
        // Ocultar el botón porque no podemos intentar instalar dos veces
        installButton.style.display = 'none';
        // Mostrar el prompt de instalación
        deferredPrompt.prompt();
        // Esperar la elección del usuario
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('El usuario aceptó la instalación de la PWA');
            installButton.textContent = '¡App instalada!';
            installButton.disabled = true;
          } else {
            console.log('El usuario rechazó la instalación de la PWA');
            installButton.textContent = 'Instalación cancelada';
            setTimeout(() => {
              installButton.textContent = 'Instalar Tu Barrio A Un Clik';
              installButton.style.display = 'block';
            }, 2000);
          }
          deferredPrompt = null;
        });
      } else {
        // Si no hay deferredPrompt (ya instalado o no soportado)
        installButton.textContent = '¡Ya tienes la app instalada!';
        installButton.disabled = true;
        setTimeout(() => {
          installButton.textContent = 'Instalar Tu Barrio A Un Clik';
          installButton.disabled = false;
        }, 2000);
      }
    });
    
    // Verificar si la app ya está instalada
    window.addEventListener('appinstalled', () => {
      installButton.textContent = '¡App instalada!';
      installButton.disabled = true;
      console.log('Tu Barrio A Un Clik se instaló correctamente');
    });
    
    // Verificar si la PWA ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      installButton.textContent = '¡Ya tienes la app instalada!';
      installButton.disabled = true;
    }
  }
  
  // Inicializar cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', initInstallButton);
