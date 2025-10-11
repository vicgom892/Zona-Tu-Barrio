// shared/js/config.js
const isGitHubPages = window.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages ? '/Zona-Tu-Barrio' : '';

function getAbsolutePath(path) {
  // Para rutas absolutas (que empiezan con /)
  if (path.startsWith('/')) {
    return `${BASE_PATH}${path}`;
  }
  // Para rutas relativas, calcular desde la ubicación actual
  const currentPath = window.location.pathname;
  const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
  
  // Navegar hacia atrás hasta la raíz
  let backPath = '';
  if (currentPath.includes('/negocios/')) {
    backPath = '../../'; // desde /castelar/negocios/ → ../../
  } else if (currentPath.includes('/castelar/')) {
    backPath = '../'; // desde /castelar/ → ../
  }
  
  return `${BASE_PATH}${backPath}${path}`;
}

window.APP_CONFIG = {
  BASE_PATH: BASE_PATH,
  isGitHubPages: isGitHubPages,
  getAbsolutePath: getAbsolutePath
};

console.log('📍 Entorno:', isGitHubPages ? 'GitHub Pages' : 'Netlify');
console.log('🛣️  Ruta base:', BASE_PATH || '(raíz)');
console.log('📁 Ruta actual:', window.location.pathname);