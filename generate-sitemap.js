// generate-sitemap.js - No requiere instalación de paquetes
const fs = require('fs');

// CONFIGURACIÓN - EDITA ESTO CUANDO AGREGues LOCALIDADES
const baseUrl = 'https://www.tubarrioaunclik.com';
const localidades = [
    'castelar', 'ituzaingo', 'moron', 'ciudadela', 
    'merlo', 'haedo', 'ramos-mejia'
    // PARA AGREGAR NUEVAS LOCALIDADES, AÑÁDELAS AQUÍ ↓
    // 'san-justo', 'villa-luzuriaga', 'el-palomar'
];
const paginas = [
    '', 'comunidad.html', 'emprendimientos.html', 
    'oficios-profesiones.html', 'inscripcion.html'
];

// Fecha actual en formato YYYY-MM-DD
const today = new Date().toISOString().split('T')[0];

function generateSitemap() {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
    
    <!-- Página principal de selección -->
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>\n`;

    // Generar URLs para cada localidad
    localidades.forEach(localidad => {
        paginas.forEach((pagina, index) => {
            const url = pagina ? 
                `${baseUrl}/${localidad}/${pagina}` : 
                `${baseUrl}/${localidad}/`;
            
            const priority = index === 0 ? '0.9' : '0.8';
            const changefreq = index === 0 ? 'daily' : 
                (pagina === 'inscripcion.html' ? 'monthly' : 'weekly');
            
            sitemap += `    <url>
        <loc>${url}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>\n`;
        });
    });

    sitemap += '</urlset>';

    // Guardar el archivo
    fs.writeFileSync('sitemap.xml', sitemap);
    console.log('✅ Sitemap.xml generado correctamente');
    console.log(`📍 Incluye ${localidades.length} localidades`);
    console.log(`📄 Total de páginas: ${(localidades.length * paginas.length) + 1}`);
    console.log('🕐 Fecha de actualización:', today);
}

// Ejecutar
generateSitemap();


//ejecutar cada vez que se agrega una nueva localidad
//node generate-sitemap.js