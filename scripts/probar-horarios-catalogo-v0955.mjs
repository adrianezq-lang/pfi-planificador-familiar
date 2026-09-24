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

const catalogoRaw = await readFile(
  new URL('../public/catalogo-mercadona.json', import.meta.url),
  'utf8',
);
globalThis.fetch = async (url) => {
  if (String(url).startsWith('/catalogo-mercadona.json')) {
    return new Response(catalogoRaw, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  throw new Error(`Petición inesperada en prueba: ${url}`);
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const { normalizarPerfil, obtenerHorarioServicio } =
  await vite.ssrLoadModule('/src/services/perfil.ts');
const { buscarEnCatalogoMercadona } =
  await vite.ssrLoadModule('/src/services/catalogoMercadona.ts');
const { calcularResumenEconomicoMensual, contarCausasImportePendiente } =
  await vite.ssrLoadModule('/src/services/resumenEconomico.ts');
const { responderAsistente } =
  await vite.ssrLoadModule('/src/services/asistentePFI.ts');

const perfilMigrado = normalizarPerfil({
  nombre: 'Familia',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  presupuesto: 500,
});
assert.deepEqual(perfilMigrado.horarios, { comida: '14:00', cena: '21:00' });

const perfil = normalizarPerfil({
  ...perfilMigrado,
  horarios: { comida: '13:30', cena: '20:15' },
});
assert.deepEqual(obtenerHorarioServicio(perfil, 'comida'), {
  hora: 13,
  minutos: 30,
  texto: '13:30',
});
assert.deepEqual(
  normalizarPerfil({
    ...perfilMigrado,
    horarios: { comida: '25:90', cena: '20:5' },
  }).horarios,
  { comida: '14:00', cena: '21:00' },
);

const sandiasCompatibles = await buscarEnCatalogoMercadona('Media sandía', {
  seccionPreferida: 'Fruta y verdura',
});
assert.equal(sandiasCompatibles.length, 0);

const sandiasCatalogoCompleto = await buscarEnCatalogoMercadona('Media sandía', {
  incluirOtrasSecciones: true,
});
assert.ok(sandiasCatalogoCompleto.length > 0);
assert.ok(sandiasCatalogoCompleto.every((producto) => /sand[ií]a/i.test(producto.nombre)));
assert.ok(sandiasCatalogoCompleto.every((producto) => !/mediana/i.test(producto.nombre)));

const calabazasCompatibles = await buscarEnCatalogoMercadona('Media calabaza', {
  seccionPreferida: 'Fruta y verdura',
});
assert.equal(calabazasCompatibles[0]?.nombre, 'Media calabaza cacahuete');

const compra = ({ total = 0, sinSeleccionar = [], sinPrecio = [], estimados = [] } = {}) => ({
  lineas: [],
  lineasSemanales: [],
  lineasDespensa: [],
  total,
  totalSemanal: total,
  totalDespensa: 0,
  productosSinSeleccionar: sinSeleccionar,
  productosSinPrecio: sinPrecio,
  productosEstimados: estimados,
  lineasCubiertas: [],
});

const compraMes = compra({
  total: 100,
  sinSeleccionar: ['Media sandía'],
  estimados: ['Aceite'],
});
const comprasSemanas = [
  compra({ total: 50, sinSeleccionar: ['Media sandía'], estimados: ['Aceite'] }),
  compra({ total: 60, sinSeleccionar: ['Media sandía'], estimados: ['Aceite'] }),
];
const resumenEconomico = calcularResumenEconomicoMensual({
  compraMes,
  comprasSemanas,
  productosManuales: [],
  mesActivo: '2026-09',
  semanaActiva: 0,
});
assert.equal(resumenEconomico.prevision.partidasSinImporte, 3);
assert.deepEqual(resumenEconomico.prevision.ingredientesSinProducto, ['Media sandía']);
assert.equal(contarCausasImportePendiente(resumenEconomico.prevision), 1);
assert.equal(resumenEconomico.prevision.cantidadesEstimadas, 3);
assert.deepEqual(resumenEconomico.prevision.productosEstimados, ['Aceite']);

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
  id: 'semana-4',
  nombre: 'Semana 4',
  inicio: '2026-09-21',
  fin: '2026-09-27',
  menu: menuSemana,
};
const contexto = {
  menuSemana,
  menuMes: menuSemana,
  menusSemanas: [menuSemana],
  planMensual: [semana],
  semanaActiva: 0,
  semanaMenuActiva: semana,
  mesActivo: '2026-09',
  compraSemana: comprasSemanas[0],
  compraPendienteNombres: [],
  compraPendienteTotal: 0,
  compraPendienteCantidad: 0,
  compraPendienteSinImporte: 0,
  compraMes,
  comprasSemanas,
  resumenEconomico,
  despensa: [],
  recetas: [],
  aprendizaje: {
    eleccionesMenu: 0,
    combinacionesMenu: 0,
    valoraciones: 0,
    ajustesPorciones: 0,
    ajustesRecetas: 0,
  },
  perfil,
};

const plan48h = responderAsistente(
  'Organízame las próximas 48 h',
  contexto,
  '2026-09-23T13:45:00',
);
assert.ok(plan48h.puntos.some((punto) => /Miércoles 23 · cena 20:15/.test(punto)));
assert.ok(plan48h.puntos.some((punto) => /Jueves 24 · comida 13:30/.test(punto)));
assert.ok(plan48h.puntos.some((punto) => /Viernes 25 · comida 13:30/.test(punto)));
assert.ok(!plan48h.puntos.some((punto) => /Miércoles 23 · comida/.test(punto)));
assert.ok(!plan48h.puntos.some((punto) => /Viernes 25 · cena/.test(punto)));

const presupuesto = responderAsistente('¿Cómo voy de presupuesto?', contexto);
assert.match(presupuesto.resumen, /3 partidas sin importe/);
assert.match(presupuesto.resumen, /1 asociación de producto \(Media sandía\)/);

const [compraUi, selectorUi, perfilUi] = await Promise.all([
  readFile(new URL('../src/pages/CompraModern.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/SelectorProductoIngrediente.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/Perfil.tsx', import.meta.url), 'utf8'),
]);
assert.match(compraUi, /resolverIngrediente/);
assert.match(compraUi, /Elegir producto exacto/);
assert.match(compraUi, /Ver causas y resolver/);
assert.match(selectorUi, /seccionPreferida: seccionIngrediente/);
assert.match(selectorUi, /Buscar en todo el catálogo/);
assert.match(perfilUi, /type="time"/);
assert.match(perfilUi, /const actualizarHorario[\s\S]*setPerfil\(\(perfilActual\)/);

await vite.close();

console.log('✓ los horarios migran de forma segura y la ventana móvil usa horas y minutos reales');
console.log('✓ el catálogo filtra por sección y no propone falsos positivos para productos estacionales');
console.log('✓ las partidas pendientes conservan sus causas únicas y los cálculos estimados trazables');
console.log('✓ Compra ofrece una acción directa para resolver el producto exacto');
