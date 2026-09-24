import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const memoria = new Map();
const eventos = [];
globalThis.localStorage = {
  get length() { return memoria.size; },
  key(indice) { return Array.from(memoria.keys())[indice] ?? null; },
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
  clear() { memoria.clear(); },
};
globalThis.window = {
  dispatchEvent(evento) { eventos.push(evento.type); },
  addEventListener() {},
  removeEventListener() {},
};
globalThis.Event = class { constructor(type) { this.type = type; } };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});
const { calcularResumenEconomicoMensual } =
  await vite.ssrLoadModule('/src/services/resumenEconomico.ts');
const {
  añadirProductoManualCompra,
  crearPeriodoIdCompraManual,
  EVENTO_PRODUCTOS_MANUALES_COMPRA,
} = await vite.ssrLoadModule('/src/services/productosManualesCompra.ts');
const { responderAsistente } =
  await vite.ssrLoadModule('/src/services/asistentePFI.ts');

const compra = ({
  total,
  sinSeleccionar = [],
  sinPrecio = [],
  estimados = [],
  cubiertas = [],
}) => ({
  lineas: [],
  lineasSemanales: [],
  lineasDespensa: [],
  total,
  totalSemanal: total,
  totalDespensa: 0,
  productosSinSeleccionar: sinSeleccionar,
  productosSinPrecio: sinPrecio,
  productosEstimados: estimados,
  lineasCubiertas: cubiertas,
});

const mesActivo = '2026-09';
const manuales = [
  {
    id: 'manual-mes',
    periodoId: crearPeriodoIdCompraManual('mes', mesActivo, 0),
    nombre: 'Pienso', cantidad: 1, unidad: 'paquete', tienda: 'Otra tienda',
    precioTotal: 10, comprado: true, guardadoEnDespensa: true, creadoEn: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'manual-s1',
    periodoId: crearPeriodoIdCompraManual('semana', mesActivo, 0),
    nombre: 'Panadería', cantidad: 1, unidad: 'ud', tienda: 'Barrio',
    precioTotal: 5, comprado: false, guardadoEnDespensa: false, creadoEn: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'manual-s2',
    periodoId: crearPeriodoIdCompraManual('semana', mesActivo, 1),
    nombre: 'Frutería', cantidad: 1, unidad: 'kg', tienda: 'Barrio',
    precioTotal: 7, comprado: false, guardadoEnDespensa: false, creadoEn: '2026-09-08T10:00:00.000Z',
  },
  {
    id: 'manual-s2-sin-precio',
    periodoId: crearPeriodoIdCompraManual('semana', mesActivo, 1),
    nombre: 'Recado sin precio', cantidad: 1, unidad: 'ud', tienda: 'Barrio',
    precioTotal: null, comprado: false, guardadoEnDespensa: false, creadoEn: '2026-09-08T11:00:00.000Z',
  },
];
const compraMes = compra({
  total: 100,
  sinPrecio: ['Especias kebab'],
  estimados: ['Aceite'],
});
const comprasSemanas = [
  compra({ total: 50 }),
  compra({ total: 60, sinSeleccionar: ['Media sandía'] }),
];
const resumenEconomico = calcularResumenEconomicoMensual({
  compraMes,
  comprasSemanas,
  productosManuales: manuales,
  mesActivo,
  semanaActiva: 1,
});

assert.equal(resumenEconomico.presupuestoSemanal, 67);
assert.equal(resumenEconomico.presupuestoMensual, 110);
assert.equal(resumenEconomico.previsionMes, 232);
assert.equal(resumenEconomico.totalAcumulado, 232);
assert.equal(resumenEconomico.semana.partidasSinImporte, 2);
assert.equal(resumenEconomico.prevision.partidasSinImporte, 3);
assert.equal(resumenEconomico.prevision.cantidadesEstimadas, 1);

añadirProductoManualCompra({
  periodoId: crearPeriodoIdCompraManual('semana', mesActivo, 1),
  nombre: 'Producto que fuerza refresco',
  cantidad: 1,
  unidad: 'ud',
  tienda: 'Otra tienda',
  precioTotal: 4,
});
assert.ok(eventos.includes(EVENTO_PRODUCTOS_MANUALES_COMPRA));

const dia = (nombre, comida, cena) => ({
  dia: nombre,
  comida: [comida],
  cena: [cena],
  postreComida: 'Fruta',
  postreCena: 'Yogur',
  preparar: '',
});
const menuSemana = [
  dia('Lunes', 'Lentejas', 'Lomo'),
  dia('Martes', 'Salmón', 'Tortilla'),
  dia('Miércoles', 'Ensalada de pasta', 'Fajitas'),
  dia('Jueves', 'Garbanzos', 'Ternera'),
  dia('Viernes', 'Macarrones', 'Pizza'),
  dia('Sábado', 'Lubina', 'Hamburguesas'),
  dia('Domingo', 'Comemos fuera', 'Cola Cao y galletas'),
];
const semana = {
  id: 'semana-4', nombre: 'Semana 4', inicio: '2026-09-21', fin: '2026-09-27', menu: menuSemana,
};
const compraSemana = compra({
  total: 60,
  sinSeleccionar: ['Media sandía'],
  cubiertas: [{ clave: 'ajo', origenCobertura: 'sobrante-proyectado' }],
});
const contexto = {
  menuSemana,
  menuMes: menuSemana,
  menusSemanas: [menuSemana],
  planMensual: [semana],
  semanaActiva: 0,
  semanaMenuActiva: semana,
  mesActivo,
  compraSemana,
  compraPendienteNombres: ['Media sandía'],
  compraPendienteTotal: 59.63,
  compraPendienteCantidad: 16,
  compraPendienteSinImporte: 2,
  compraMes,
  comprasSemanas,
  resumenEconomico,
  despensa: [],
  recetas: [],
  aprendizaje: {
    eleccionesMenu: 0, combinacionesMenu: 0, valoraciones: 0,
    ajustesPorciones: 0, ajustesRecetas: 0,
  },
  perfil: {
    nombre: 'Prueba', adultos: 2, ninos: 2, edadesNinos: [12, 6], bebes: 0,
    bebesComenMenu: false, supermercado: 'Mercadona', presupuesto: 500,
    comensales: {
      comidaLaborable: { adultos: 2, ninos: [true, false], bebes: 0 },
      comidaFinSemana: { adultos: 2, ninos: [true, true], bebes: 0 },
      cena: { adultos: 2, ninos: [true, true], bebes: 0 },
    },
  },
};

const plan48h = responderAsistente(
  'Organízame las próximas 48 h',
  contexto,
  '2026-09-23T16:55:00',
);
assert.ok(plan48h.puntos.some((punto) => /Miércoles 23 · cena 21:00/.test(punto)));
assert.ok(plan48h.puntos.some((punto) => /Viernes 25 · comida 14:00/.test(punto)));
assert.ok(!plan48h.puntos.some((punto) => /Miércoles 23 · comida 14:00/.test(punto)));
assert.ok(!plan48h.puntos.some((punto) => /Viernes 25 · cena 21:00/.test(punto)));

const prioridades = responderAsistente(
  'Revisa todo y dime prioridades',
  contexto,
  '2026-09-23T16:55:00',
);
assert.match(prioridades.puntos[0], /Quedan 16/);
assert.match(prioridades.puntos[0], /Media sandía/);
assert.equal(prioridades.accion?.destino, 'recetas');
assert.equal(prioridades.accion?.ingrediente, 'Media sandía');

const ahorro = responderAsistente('¿Cómo puedo ahorrar esta semana?', contexto);
assert.match(ahorro.resumen, /No puedo afirmar un ahorro neto/);
assert.ok(ahorro.puntos.some((punto) => /mínimo 232,00/.test(punto)));
assert.ok(ahorro.puntos.some((punto) => /sobrantes proyectados/.test(punto)));
assert.ok(ahorro.puntos.some((punto) => /No las cuento como ahorro ni como stock real/.test(punto)));

const presupuesto = responderAsistente('¿Cómo voy de presupuesto?', contexto);
assert.match(presupuesto.resumen, /mínimo de 232,00/);
assert.ok(presupuesto.puntos.some((punto) => /productos añadidos manualmente/.test(punto)));

const [home, compraUi] = await Promise.all([
  readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/CompraModern.tsx', import.meta.url), 'utf8'),
]);
assert.match(home, /EVENTO_PRODUCTOS_MANUALES_COMPRA/);
assert.match(home, /Subtotal mínimo/);
assert.match(home, /Margen máximo/);
assert.match(compraUi, /Sobrante previsto de compras anteriores/);
assert.match(compraUi, /aún no real/);

await vite.close();

console.log('✓ la ventana de 48 h es móvil y excluye servicios ya pasados');
console.log('✓ las prioridades ponen primero la compra urgente y conservan la resolución exacta');
console.log('✓ semana, mes y previsión incluyen compras manuales y separan importes desconocidos');
console.log('✓ el ahorro distingue stock físico de sobrantes proyectados');
