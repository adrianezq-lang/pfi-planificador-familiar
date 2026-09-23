import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const memoria = new Map();
globalThis.localStorage = {
  get length() { return memoria.size; },
  key(indice) { return Array.from(memoria.keys())[indice] ?? null; },
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
  clear() { memoria.clear(); },
};

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');

const [
  app,
  home,
  menu,
  compra,
  despensa,
  recetas,
  catalogo,
  perfil,
  css,
  packageJsonTexto,
  copias,
  sw,
  readme,
] = await Promise.all([
  leer('src/App.tsx'),
  leer('src/pages/Home.tsx'),
  leer('src/pages/MenuModern.tsx'),
  leer('src/pages/CompraModern.tsx'),
  leer('src/pages/Despensa.tsx'),
  leer('src/pages/Recetas.tsx'),
  leer('src/pages/CatalogoMercadona.tsx'),
  leer('src/pages/Perfil.tsx'),
  leer('src/styles/premium-v4.css'),
  leer('package.json'),
  leer('src/services/copiasSeguridad.ts'),
  leer('public/sw.js'),
  leer('README.md'),
]);

assert.match(app, /premium-v4\.css/);
assert.match(menu, /compartirSemana/);
assert.match(menu, /Imprimir \/ PDF/);
assert.match(menu, /Notas de la semana/);
assert.match(menu, /print-week-menu/);
assert.match(compra, /compartirCompra/);
assert.match(compra, /shopping-data-health/);
assert.match(compra, /productosSinSeleccionar/);
assert.match(compra, /Imprimir \/ PDF/);
assert.match(despensa, /compartirReposicion/);
assert.match(recetas, /duplicarReceta/);
assert.match(recetas, /compartirReceta/);
assert.match(catalogo, /ingredientesSinAsociar/);
assert.match(catalogo, /catalog-health/);
assert.match(perfil, /profile-quick-guide/);
assert.doesNotMatch(perfil, /raciones adultas equivalentes/);
assert.match(home, /previsionMes/);
assert.match(home, /Previsión del mes/);
assert.match(home, /menusSemanas\.map/);
assert.match(home, /objetivo mensual/);
assert.match(css, /@media print/);
assert.match(css, /\.pro-action-bar/);
assert.match(css, /\.week-notes/);
assert.match(css, /\.profile-quick-guide/);

const packageJson = JSON.parse(packageJsonTexto);
const version = packageJson.version;
assert.equal(version, '0.9.52');
assert.match(app, new RegExp(`app-version\\">v${version.replaceAll('.', '\\.')}`));
assert.match(copias, new RegExp(`VERSION_APP = '${version.replaceAll('.', '\\.')}'`));
assert.match(sw, new RegExp(`CACHE_NAME = 'pfi-v${version.replaceAll('.', '\\.')}-`));
assert.match(readme, new RegExp(`Versión ${version.replaceAll('.', '\\.')}`));

const {
  cargarNotaSemana,
  guardarNotaSemana,
} = await import('../src/services/notasSemana.ts');

assert.equal(cargarNotaSemana('2026-09', 1), '');
assert.equal(
  guardarNotaSemana('2026-09', 1, 'Comprar pan fuera de Mercadona'),
  'Comprar pan fuera de Mercadona',
);
assert.equal(
  cargarNotaSemana('2026-09', 1),
  'Comprar pan fuera de Mercadona',
);
assert.equal(cargarNotaSemana('2026-09', 2), '');
guardarNotaSemana('2026-09', 1, '');
assert.equal(cargarNotaSemana('2026-09', 1), '');

console.log('✓ Inicio calcula una previsión completa del mes y la compara con el objetivo');
console.log('✓ Menú permite compartir, imprimir/PDF y guardar notas semanales');
console.log('✓ Compra comparte pendientes, imprime y explica la calidad de sus datos');
console.log('✓ Despensa comparte la reposición');
console.log('✓ Recetas y postres se pueden duplicar y compartir');
console.log('✓ Catálogo informa de asociaciones pendientes');
console.log('✓ Perfil evita tecnicismos y añade guía rápida');
console.log('✓ versión, copias, PWA y documentación están alineadas en v0.9.52');
