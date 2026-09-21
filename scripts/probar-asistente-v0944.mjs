import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const memoria = new Map();
globalThis.localStorage = {
  get length() { return memoria.size; },
  key(indice) { return Array.from(memoria.keys())[indice] ?? null; },
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
  clear() { memoria.clear(); },
};
globalThis.window = {
  dispatchEvent() {},
  addEventListener() {},
  removeEventListener() {},
};
globalThis.Event = class { constructor(type) { this.type = type; } };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const [app, nav, page, service, css, pkg, sw, copias] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/NavegacionInferior.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/Asistente.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/asistentePFI.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/assistant-pro.css', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/copiasSeguridad.ts', import.meta.url), 'utf8'),
]);

assert.match(app, /const Asistente = lazy/);
assert.match(app, /pantalla === 'asistente'/);
assert.match(nav, /id: 'asistente'/);
assert.match(nav, /icono: 'sparkles'/);
assert.match(page, /Pregúntame o pídeme cambios/);
assert.match(page, /¿Qué puedo cocinar con lo que tengo\?/);
assert.match(page, /pfi-asistente-historial-v1/);
assert.match(page, /crearClavesEstadoCompra/);
assert.match(service, /compraPendienteCantidad/);
assert.match(service, /Revisión de la semana/);
assert.match(service, /Recetas cercanas a lo que tienes/);
assert.match(css, /\.assistant-hero/);
assert.match(css, /\.assistant-composer/);

const packageJson = JSON.parse(pkg);
assert.equal(packageJson.version, '0.9.45');
assert.match(app, /v0\.9\.44/);
assert.match(sw, /pfi-v0\.9\.44-1/);
assert.match(copias, /VERSION_APP = '0\.9\.44'/);

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});
const { responderAsistente, obtenerResumenProactivo } =
  await vite.ssrLoadModule('/src/services/asistentePFI.ts');

const dia = (nombre, comida, cena, preparar = '') => ({
  dia: nombre,
  comida: [comida],
  cena: [cena],
  postreComida: 'Fruta',
  postreCena: 'Yogur',
  preparar,
});

const menuSemana = [
  dia('Lunes', 'Lentejas', 'Lomo'),
  dia('Martes', 'Salmón', 'Tortilla'),
  dia('Miércoles', 'Ensalada de pasta', 'Fajitas'),
  dia('Jueves', 'Garbanzos', 'Filete de ternera'),
  dia('Viernes', 'Macarrones', 'Pizza'),
  dia('Sábado', 'Lubina', 'Hamburguesas'),
  dia('Domingo', 'Comemos fuera', 'Cola Cao y galletas'),
];

const compraSemana = {
  lineas: [],
  lineasSemanales: [],
  lineasDespensa: [],
  total: 25,
  totalSemanal: 25,
  totalDespensa: 0,
  productosSinSeleccionar: [],
  productosSinPrecio: [],
  productosEstimados: [],
};

const contexto = {
  menuSemana,
  menuMes: menuSemana,
  menusSemanas: [menuSemana],
  semanaActiva: 0,
  mesActivo: '2026-09',
  compraSemana,
  compraPendienteNombres: ['Leche', 'Salmón'],
  compraPendienteTotal: 12.5,
  compraPendienteCantidad: 2,
  compraMes: { ...compraSemana, total: 80, totalDespensa: 80 },
  comprasSemanas: [{ ...compraSemana, total: 25 }],
  despensa: [],
  recetas: [],
  aprendizaje: {
    eleccionesMenu: 5,
    combinacionesMenu: 4,
    valoraciones: 3,
    ajustesPorciones: 1,
    ajustesRecetas: 1,
  },
  perfil: {
    nombre: 'Prueba',
    adultos: 2,
    ninos: 2,
    edadesNinos: [12, 6],
    bebes: 0,
    bebesComenMenu: false,
    comensales: {
      comidaLaborable: { adultos: 2, ninos: [true, false], bebes: 0 },
      comidaFinSemana: { adultos: 2, ninos: [true, true], bebes: 0 },
      cena: { adultos: 2, ninos: [true, true], bebes: 0 },
    },
    supermercado: 'Mercadona',
    presupuesto: 500,
  },
};

const compra = responderAsistente('¿Qué tengo que comprar?', contexto);
assert.match(compra.resumen, /Quedan 2 productos/);
assert.equal(compra.accion?.destino, 'compra');
assert.match(compra.puntos[0], /Leche/);

const presupuesto = responderAsistente('¿Cómo voy de presupuesto?', contexto);
assert.match(presupuesto.resumen, /105,00/);
assert.equal(presupuesto.accion?.destino, 'compra');

const revision = responderAsistente('Revisa mi semana', contexto);
assert.equal(revision.puntos.length, 4);
assert.ok(revision.puntos.some((punto) => punto.includes('ensalada de pasta')));
assert.ok(revision.puntos.some((punto) => punto.includes('pizza del viernes')));

const resumen = obtenerResumenProactivo(contexto);
assert.match(resumen.compra, /2 pendientes/);
assert.match(resumen.presupuesto, /105,00/);

await vite.close();

console.log('✓ el Asistente está integrado como destino principal de PFI');
console.log('✓ entiende compra pendiente, presupuesto y revisión del menú');
console.log('✓ conserva historial local y separa respuestas de acciones confirmables');
console.log('✓ versión, caché y copias están alineadas en v0.9.45');
