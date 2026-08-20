import fs from 'node:fs';

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

const manifest = JSON.parse(
  fs.readFileSync('public/manifest.webmanifest', 'utf8'),
);
const sw = fs.readFileSync('public/sw.js', 'utf8');

comprobar(manifest.name === 'PFI - Planificador Familiar', 'Nombre PWA incorrecto');
comprobar(manifest.short_name === 'PFI', 'Nombre corto PWA incorrecto');
comprobar(manifest.display === 'standalone', 'La PWA debe abrir en modo standalone');
comprobar(manifest.start_url === '/' && manifest.scope === '/', 'start_url/scope PWA incorrectos');

const iconos = Array.isArray(manifest.icons) ? manifest.icons : [];
comprobar(iconos.some((icono) => icono.sizes === '192x192'), 'Falta icono PWA 192x192');
comprobar(iconos.some((icono) => icono.sizes === '512x512'), 'Falta icono PWA 512x512');

for (const archivo of [
  'public/pwa-192x192.png',
  'public/pwa-512x512.png',
  'public/favicon.svg',
]) {
  comprobar(fs.existsSync(archivo), `Falta recurso PWA: ${archivo}`);
}

comprobar(/CACHE_NAME\s*=\s*['"]pfi-v1\.5\.6['"]/.test(sw), 'La caché del service worker no está versionada como 1.5.6');
for (const evento of ['install', 'activate', 'fetch']) {
  comprobar(sw.includes(`addEventListener('${evento}'`), `Falta evento ${evento} del service worker`);
}
for (const recurso of ['/manifest.webmanifest', '/pwa-192x192.png', '/pwa-512x512.png']) {
  comprobar(sw.includes(recurso), `El app shell no contiene ${recurso}`);
}

console.log('✓ manifest PWA válido');
console.log('✓ iconos 192/512 presentes');
console.log('✓ service worker versionado como PFI 1.5.6');
console.log('✓ install/activate/fetch y app shell verificados');
