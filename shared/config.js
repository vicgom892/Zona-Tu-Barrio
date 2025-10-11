// shared/js/config.js
// Configuración dinámica de rutas para GitHub Pages y Netlify
const isGitHubPages = window.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/Zona-Tu-Barrio' : '';

// Función para generar rutas completas
function getFullPath(path) {
  return `${BASE_PATH}${path}`;
}

// Configuración global
window.APP_CONFIG = {
  BASE_PATH: BASE_PATH,
  isGitHubPages: isGitHubPages,
  getFullPath: getFullPath
};

console.log('📍 Entorno:', isGitHubPages ? 'GitHub Pages' : 'Netlify');
console.log('🛣️  Ruta base:', BASE_PATH || '(raíz)');