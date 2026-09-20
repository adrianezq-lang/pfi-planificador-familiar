import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const memoria = new Map();
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};
globalThis.CustomEvent = class {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};
globalThis.localStorage = {
  get length() { return memoria.size; },
  key(indice) { return Array.from(memoria.keys())[indice] ?? null; },
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
};

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');

const [
  app,
  menu,
  compra,
  despensa,
  recetasPagina,
  catalogo,
  perfil,
  css,
  recetasServicio,
] = await Promise.all([
  leer('src/App.tsx'),
  leer('src/pages/MenuModern.tsx'),
  leer('src/pages/CompraModern.tsx'),
  leer('src/pages/Despensa.tsx'),
  leer('src/pages/Recetas.tsx'),
  leer('src/pages/CatalogoMercadona.tsx'),
  leer('src/pages/Perfil.tsx'),
  leer('src/styles/premium-v3.css'),
  leer('src/services/recetas.ts'),
]);

assert.match(app, /import '\.\/styles\/premium-v3\.css';/);
assert.match(menu, /modern-week-prep/);
assert.match(menu, /Preparar con antelación/);
assert.match(compra, /ocultarCompletados/);
assert.match(compra, /Modo tienda/);
assert.match(despensa, /pantry-smart-toolbar/);
assert.match(despensa, /Lo importante primero/);
assert.match(recetasPagina, /pfi-recetas-favoritas-v1/);
assert.match(recetasPagina, /recipes-favorites-filter/);
assert.match(catalogo, /OrdenCatalogo/);
assert.match(catalogo, /Precio: menor primero/);
assert.match(catalogo, /if \(a\.precio === null\) return 1;/);
assert.match(perfil, /profile-overview/);
assert.match(perfil, /profile-save-bar/);
assert.match(css, /\.shopping-view-controls/);
assert.match(css, /\.pantry-smart-toolbar/);
assert.match(css, /\.profile-overview/);
assert.match(css, /\.recipe-favorite-button/);
assert.match(recetasServicio, /PREFIJO_PLAN_MES = 'pfi-menu-mes-';/);
assert.match(recetasServicio, /transformarPlanesMensualesGuardados/);

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});
const { menuMensualInicial } = await vite.ssrLoadModule('/src/data/MenuMensual.ts');
const {
  actualizarNombreRecetaEnMenu,
  eliminarRecetaDelMenu,
} = await vite.ssrLoadModule('/src/services/recetas.ts');

function planCon(nombre, mes) {
  const semanas = structuredClone(menuMensualInicial.slice(0, 2));
  semanas[0].menu[0].comida = [nombre];
  semanas[1].menu[2].cena = [nombre];
  return { mes, semanas };
}

memoria.set('pfi-mes-activo', '2026-09');
memoria.set('pfi-semana-activa', '0');
memoria.set(
  'pfi-menu-mes-2026-09',
  JSON.stringify(planCon('Receta temporal', '2026-09')),
);
memoria.set(
  'pfi-menu-mes-2026-10',
  JSON.stringify(planCon('Receta temporal', '2026-10')),
);

actualizarNombreRecetaEnMenu('Receta temporal', 'Receta definitiva');

for (const mes of ['2026-09', '2026-10']) {
  const guardado = JSON.parse(memoria.get(`pfi-menu-mes-${mes}`));
  const texto = JSON.stringify(guardado);
  assert.ok(texto.includes('Receta definitiva'), `${mes} no recibió el nombre nuevo`);
  assert.ok(!texto.includes('Receta temporal'), `${mes} conserva el nombre anterior`);
}

const menuActivoRenombrado = JSON.parse(memoria.get('pfi-menu'));
assert.ok(
  menuActivoRenombrado.some((dia) => dia.comida.includes('Receta definitiva')),
  'El menú activo no se sincronizó al renombrar la receta.',
);

eliminarRecetaDelMenu('Receta definitiva');

for (const mes of ['2026-09', '2026-10']) {
  const guardado = JSON.parse(memoria.get(`pfi-menu-mes-${mes}`));
  assert.ok(
    !JSON.stringify(guardado).includes('Receta definitiva'),
    `${mes} conserva una receta eliminada`,
  );
}

const menuActivoEliminado = JSON.parse(memoria.get('pfi-menu'));
assert.ok(
  !JSON.stringify(menuActivoEliminado).includes('Receta definitiva'),
  'El menú activo conserva una receta eliminada.',
);

console.log('✓ Menú incorpora preparación semanal');
console.log('✓ Compra tiene modo tienda con ocultación reversible');
console.log('✓ Despensa incorpora búsqueda, filtros y prioridad');
console.log('✓ Recetas y postres admiten favoritos persistentes');
console.log('✓ Catálogo permite ordenar productos y deja los precios pendientes al final');
console.log('✓ Perfil muestra resumen y aviso de cambios sin guardar');
console.log('✓ El lenguaje visual premium cubre las pantallas secundarias');
console.log('✓ Renombrar y borrar recetas actualiza todos los meses guardados');
await vite.close();
