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
assert.match(nav, /const principales:[\s\S]*id: 'despensa'[\s\S]*const secundarios:/);
assert.match(nav, /const secundarios:[\s\S]*id: 'asistente'/);
assert.match(nav, /icono: 'sparkles'/);
assert.match(page, /Pregúntame o pídeme cambios/);
assert.match(page, /¿Qué puedo cocinar con lo que tengo\?/);
assert.match(page, /Organízame las próximas 48 h/);
assert.match(page, /Revisa todo y dime prioridades/);
assert.match(page, /¿Cómo puedo ahorrar esta semana\?/);
assert.match(page, /pfi-asistente-historial-v1/);
assert.match(page, /crearClavesEstadoCompra/);
assert.match(service, /compraPendienteCantidad/);
assert.match(service, /Revisión de la semana/);
assert.match(service, /Recetas cercanas a lo que tienes/);
assert.match(css, /\.assistant-hero/);
assert.match(css, /\.assistant-composer/);

const packageJson = JSON.parse(pkg);
assert.equal(packageJson.version, '0.9.52');
assert.match(app, /v0\.9\.52/);
assert.match(sw, /pfi-v0\.9\.52-1/);
assert.match(copias, /VERSION_APP = '0\.9\.52'/);

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});
const { responderAsistente, obtenerResumenProactivo } =
  await vite.ssrLoadModule('/src/services/asistentePFI.ts');
const { indiceSemanaParaFecha, indiceDiaParaFecha, semanaContieneFecha } =
  await vite.ssrLoadModule('/src/services/fechaSemana.ts');
const { cargarRecetas, seccionRecetarioParaIngrediente } =
  await vite.ssrLoadModule('/src/services/recetas.ts');

const recetasParaAsociar = cargarRecetas();
assert.equal(seccionRecetarioParaIngrediente(recetasParaAsociar, 'Media sandía'), 'postres');
assert.equal(seccionRecetarioParaIngrediente(recetasParaAsociar, 'Huevos'), 'recetas');
assert.equal(seccionRecetarioParaIngrediente(recetasParaAsociar, 'No existe'), 'recetas');
assert.match(app, /<Postres[\s\S]*ingredientePendiente=\{ingredienteAResolver\}/);

const tramos = [
  { inicio: '2026-09-01', fin: '2026-09-06' },
  { inicio: '2026-09-07', fin: '2026-09-13' },
  { inicio: '2026-09-14', fin: '2026-09-20' },
  { inicio: '2026-09-21', fin: '2026-09-27' },
  { inicio: '2026-09-28', fin: '2026-09-30' },
];
assert.equal(indiceSemanaParaFecha(tramos, new Date(2026, 8, 23, 12)), 3);
assert.equal(indiceDiaParaFecha(tramos[3], new Date(2026, 8, 23, 12)), 2);
assert.equal(indiceDiaParaFecha(tramos[0], new Date(2026, 8, 1, 12)), 0);
assert.equal(indiceSemanaParaFecha(tramos, new Date(2026, 9, 1, 12)), 0);
assert.equal(semanaContieneFecha(tramos[0], new Date(2026, 8, 23, 12)), false);

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
  lineasCubiertas: [{ clave: 'stock-arroz' }],
};

const contexto = {
  menuSemana,
  menuMes: menuSemana,
  menusSemanas: [menuSemana],
  semanaActiva: 0,
  semanaMenuActiva: {
    id: 'semana-4',
    nombre: 'Semana 4',
    inicio: '2026-09-21',
    fin: '2026-09-27',
    menu: menuSemana,
  },
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

const fechaReferencia = '2026-09-22';

const cenaAyer = responderAsistente(
  '¿Qué cenamos ayer?',
  contexto,
  fechaReferencia,
);
assert.match(cenaAyer.titulo, /Lunes 21/);
assert.match(cenaAyer.resumen, /Lomo/);
assert.doesNotMatch(cenaAyer.resumen, /Lentejas/);

const comidaManana = responderAsistente(
  '¿Qué hay mañana para comer?',
  contexto,
  fechaReferencia,
);
assert.match(comidaManana.titulo, /Miércoles 23/);
assert.match(comidaManana.resumen, /Ensalada de pasta/);

const dia24 = responderAsistente(
  '¿Qué toca el 24?',
  contexto,
  fechaReferencia,
);
assert.match(dia24.titulo, /Jueves 24/);
assert.match(dia24.resumen, /Garbanzos/);
assert.match(dia24.resumen, /Filete de ternera/);

const fueraSemana = responderAsistente(
  '¿Qué cenamos mañana?',
  contexto,
  '2026-09-27',
);
assert.match(fueraSemana.titulo, /fuera de la semana activa/i);
assert.equal(fueraSemana.tono, 'atencion');

const plan48h = responderAsistente(
  'Organízame las próximas 48 h',
  contexto,
  fechaReferencia,
);
assert.equal(plan48h.titulo, 'Copiloto familiar · próximas 48 h');
assert.ok(plan48h.puntos.some((punto) => punto.includes('Martes 22')));
assert.ok(plan48h.puntos.some((punto) => punto.includes('Miércoles 23')));
assert.ok(plan48h.puntos.some((punto) => punto.includes('para comer (3)')));
assert.ok(plan48h.puntos.some((punto) => punto.includes('para cenar (4)')));

const chequeo = responderAsistente(
  'Revisa todo y dime prioridades',
  {
    ...contexto,
    compraSemana: {
      ...compraSemana,
      productosSinSeleccionar: ['Tomate'],
      productosSinPrecio: ['Leche'],
      productosEstimados: ['Arroz'],
    },
    compraPendienteCantidad: 4,
    compraPendienteTotal: 31.4,
    despensa: [
      {
        id: 'leche',
        productoId: 'leche',
        nombre: 'Leche',
        imagen: null,
        formato: '6 x 1 l',
        precio: 6,
        stockActual: 0,
        stockEsAproximado: false,
        stockMinimo: 1,
        unidad: 'envase',
        frecuencia: 'semanal',
        tipo: 'despensa',
        ultimaCompraTiendaId: null,
        ultimaCompraTienda: null,
        ultimoProductoComprado: null,
        ultimoPrecioCompra: null,
        ultimaCompraEn: null,
        actualizado: '2026-09-22T10:00:00.000Z',
      },
    ],
  },
  fechaReferencia,
);
assert.equal(chequeo.titulo, 'Chequeo familiar · prioridades');
assert.equal(chequeo.tono, 'atencion');
assert.ok(chequeo.puntos[0].includes('producto asociado'));
assert.ok(chequeo.puntos.some((punto) => punto.includes('no tienen precio')));
assert.ok(chequeo.puntos.some((punto) => punto.includes('stock mínimo')));

const ahorro = responderAsistente(
  '¿Cómo puedo ahorrar esta semana?',
  contexto,
  fechaReferencia,
);
assert.equal(ahorro.titulo, 'Ahorro inteligente');
assert.ok(ahorro.puntos.some((punto) => punto.includes('cubiertas por el stock')));
assert.ok(ahorro.puntos.some((punto) => punto.includes('por debajo del objetivo mensual')));

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

const resumen = obtenerResumenProactivo(contexto, fechaReferencia);
assert.match(resumen.hoy, /Comida: Salmón/);
assert.match(resumen.hoy, /Cena: Tortilla/);
assert.match(resumen.compra, /2 pendientes/);
assert.match(resumen.presupuesto, /105,00/);
assert.ok(resumen.alertas.some((alerta) => alerta.includes('pendientes de la compra semanal')));

const sinAsociar = {
  ...contexto,
  compraSemana: {
    ...compraSemana,
    productosSinSeleccionar: ['Media sandía'],
  },
};
const prioridadAsociacion = responderAsistente('Revisa todo y dime prioridades', sinAsociar, fechaReferencia);
assert.equal(prioridadAsociacion.accion?.destino, 'recetas');
assert.equal(prioridadAsociacion.accion?.ingrediente, 'Media sandía');
assert.match(prioridadAsociacion.puntos[0], /Media sandía/);

const sobreObjetivo = {
  ...contexto,
  perfil: { ...contexto.perfil, presupuesto: 90 },
};
const prioridadPresupuesto = responderAsistente('Revisa todo y dime prioridades', sobreObjetivo, fechaReferencia);
const ahorroSobreObjetivo = responderAsistente('¿Cómo puedo ahorrar esta semana?', sobreObjetivo, fechaReferencia);
assert.match(prioridadPresupuesto.puntos[0], /objetivo en 15,00/);
assert.match(ahorroSobreObjetivo.puntos[0], /15,00.*por encima/);
assert.equal(prioridadPresupuesto.accion?.destino, 'compra');

const semanaAnterior = {
  ...contexto,
  semanaMenuActiva: { ...contexto.semanaMenuActiva, inicio: '2026-09-01', fin: '2026-09-06' },
};
const planFueraDeSemana = responderAsistente('Organízame las próximas 48 h', semanaAnterior, '2026-09-23');
assert.match(planFueraDeSemana.resumen, /no cubre las próximas 48 h completas/);
assert.match(planFueraDeSemana.puntos[0], /semana seleccionada no contiene hoy/);

const planDomingo = responderAsistente('Organízame las próximas 48 h', contexto, '2026-09-27');
assert.ok(planDomingo.puntos.some((punto) => /Mañana queda fuera de la semana seleccionada/.test(punto)));

await vite.close();

console.log('✓ Despensa está en la barra principal y el Asistente en Más');
console.log('✓ entiende compra pendiente, presupuesto y revisión del menú');
console.log('✓ responde consultas con ayer, hoy, mañana, pasado mañana y fechas del calendario');
console.log('✓ actúa como copiloto familiar cruzando 48 h, comensales, compra, stock y presupuesto');
console.log('✓ prioriza incidencias y propone ahorro basándose en datos reales del PFI');
console.log('✓ conserva historial local y separa respuestas de acciones confirmables');
console.log('✓ semana actual, asociaciones concretas y presupuesto por encima del objetivo tienen respuesta coherente');
console.log('✓ versión, caché y copias están alineadas en v0.9.52');
