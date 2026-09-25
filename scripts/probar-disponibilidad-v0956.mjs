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
  location: { origin: 'https://pfi.test' },
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

const {
  EVENTO_DISPONIBILIDAD_INGREDIENTES,
  marcarIngredienteNoDisponible,
  obtenerEstadoDisponibilidadIngrediente,
  reactivarIngrediente,
} = await vite.ssrLoadModule('/src/services/disponibilidadIngredientes.ts');
const {
  EVENTO_PRECIOS_MANUALES_INGREDIENTES,
  guardarPrecioManualIngrediente,
  obtenerPrecioManualIngrediente,
  quitarPrecioManualIngrediente,
} = await vite.ssrLoadModule('/src/services/preciosManualesIngredientes.ts');
const { generarCompraMercadona } = await vite.ssrLoadModule('/src/motor/compra.ts');
const { generarCompraMensual, generarCompraSemanalProyectada } =
  await vite.ssrLoadModule('/src/services/planificacionCompra.ts');
const { calcularResumenEconomicoMensual } =
  await vite.ssrLoadModule('/src/services/resumenEconomico.ts');
const { responderAsistente } =
  await vite.ssrLoadModule('/src/services/asistentePFI.ts');
const { normalizarPerfil } = await vite.ssrLoadModule('/src/services/perfil.ts');
const { recopilarDatosPFI } = await vite.ssrLoadModule('/src/services/copiasSeguridad.ts');

const recetaSandia = {
  nombre: 'Sandía',
  categoria: 'Postres',
  tipo: 'postre',
  ingredientes: [{
    nombre: 'Media sandía',
    cantidad: 0.25,
    unidad: 'ud',
    seccion: 'Fruta y verdura',
  }],
};
localStorage.setItem('pfi-recetas', JSON.stringify([recetaSandia]));

const menu = [{
  dia: 'Miércoles',
  comida: [],
  cena: [],
  postreComida: 'Fruta',
  postreCena: 'Sin postre',
  postreComidaReceta: 'Sandía',
  preparar: '',
}];

const inicial = await generarCompraMercadona(menu, {
  aplicarStock: false,
  incluirReposicion: false,
});
assert.deepEqual(inicial.productosSinSeleccionar, ['Media sandía']);

marcarIngredienteNoDisponible(
  'Media sandía',
  'temporada',
  'Volver a revisar en junio',
);
assert.equal(obtenerEstadoDisponibilidadIngrediente('media sandia')?.motivo, 'temporada');
assert.ok(eventos.includes(EVENTO_DISPONIBILIDAD_INGREDIENTES));

const pausada = await generarCompraMercadona(menu, {
  aplicarStock: false,
  incluirReposicion: false,
});
assert.equal(pausada.lineas.length, 0);
assert.deepEqual(pausada.productosSinSeleccionar, []);
assert.deepEqual(
  pausada.ingredientesNoDisponibles?.map((estado) => estado.ingrediente),
  ['Media sandía'],
);
assert.equal(pausada.ingredientesNoDisponibles?.[0].seccion, 'Fruta y verdura');

const [semanaPausada, mesPausado] = await Promise.all([
  generarCompraSemanalProyectada([menu], 0),
  generarCompraMensual(menu),
]);
assert.equal(semanaPausada.ingredientesNoDisponibles?.length, 1);
assert.equal(mesPausado.ingredientesNoDisponibles?.length, 0);

const resumenPausado = calcularResumenEconomicoMensual({
  compraMes: mesPausado,
  comprasSemanas: [semanaPausada],
  productosManuales: [],
  mesActivo: '2026-09',
  semanaActiva: 0,
});
assert.equal(resumenPausado.prevision.partidasSinImporte, 0);
assert.equal(resumenPausado.prevision.partidasExcluidasDisponibilidad, 1);
assert.deepEqual(resumenPausado.prevision.ingredientesNoDisponibles, ['Media sandía']);

const perfil = normalizarPerfil({
  nombre: 'Familia de prueba',
  adultos: 2,
  ninos: 0,
  edadesNinos: [],
  bebes: 0,
  presupuesto: 500,
});
const semanaMenu = {
  id: 'semana-4',
  nombre: 'Semana 4',
  inicio: '2026-09-21',
  fin: '2026-09-27',
  menu,
};
const contexto = {
  menuSemana: menu,
  menuMes: menu,
  menusSemanas: [menu],
  planMensual: [semanaMenu],
  semanaActiva: 0,
  semanaMenuActiva: semanaMenu,
  mesActivo: '2026-09',
  compraSemana: semanaPausada,
  compraPendienteNombres: [],
  compraPendienteTotal: 0,
  compraPendienteCantidad: 0,
  compraPendienteSinImporte: 0,
  compraMes: mesPausado,
  comprasSemanas: [semanaPausada],
  resumenEconomico: resumenPausado,
  despensa: [],
  recetas: [recetaSandia],
  aprendizaje: {
    eleccionesMenu: 0,
    combinacionesMenu: 0,
    valoraciones: 0,
    ajustesPorciones: 0,
    ajustesRecetas: 0,
  },
  perfil,
};

const prioridades = responderAsistente(
  'Revisa todo y dime prioridades',
  contexto,
  '2026-09-23T10:00:00',
);
assert.match(prioridades.puntos[0], /Media sandía está fuera de la compra y del presupuesto/);
assert.equal(prioridades.accion?.ingrediente, 'Media sandía');

const ahorro = responderAsistente('¿Cómo puedo ahorrar esta semana?', contexto);
assert.match(ahorro.resumen, /ingredientes excluidos/);
assert.ok(ahorro.puntos.some((punto) => /No lo cuento como ahorro/.test(punto)));
const presupuesto = responderAsistente('¿Cómo voy de presupuesto?', contexto);
assert.match(presupuesto.resumen, /partida excluida por disponibilidad/);
assert.ok(presupuesto.puntos.some((punto) => /no es un saldo disponible/.test(punto)));
const respuestaCompra = responderAsistente('¿Qué tengo que comprar?', contexto);
assert.equal(respuestaCompra.accion?.ingrediente, 'Media sandía');
assert.equal(respuestaCompra.accion?.destino, 'recetas');
const calidad = responderAsistente('Revisa la calidad de los datos', contexto);
assert.equal(calidad.accion?.ingrediente, 'Media sandía');

guardarPrecioManualIngrediente({
  ingrediente: 'Media sandía',
  precioEnvase: 4.5,
  cantidadEnvase: 1,
  unidadEnvase: 'ud',
  tienda: 'Frutería local',
  seccion: 'Fruta y verdura',
});
reactivarIngrediente('Media sandía');
assert.equal(obtenerPrecioManualIngrediente('Media sandía')?.tienda, 'Frutería local');
assert.ok(eventos.includes(EVENTO_PRECIOS_MANUALES_INGREDIENTES));

const conPrecioManual = await generarCompraSemanalProyectada([menu], 0);
assert.equal(conPrecioManual.productosSinSeleccionar.length, 0);
assert.equal(conPrecioManual.productosSinPrecio.length, 0);
assert.equal(conPrecioManual.ingredientesNoDisponibles?.length, 0);
assert.equal(conPrecioManual.lineas[0]?.producto?.origenPrecio, 'manual');
assert.equal(conPrecioManual.lineas[0]?.producto?.tiendaPrecio, 'Frutería local');
assert.equal(conPrecioManual.lineas[0]?.subtotal, 4.5);
assert.equal(conPrecioManual.productosEstimados.length, 0);

const copia = recopilarDatosPFI();
assert.ok(copia['pfi-precios-manuales-ingredientes-v1']);
assert.ok(copia['pfi-ingredientes-no-disponibles-v1']);

quitarPrecioManualIngrediente('Media sandía');
const otraVezPendiente = await generarCompraMercadona(menu, {
  aplicarStock: false,
  incluirReposicion: false,
});
assert.deepEqual(otraVezPendiente.productosSinSeleccionar, ['Media sandía']);

const [selectorUi, recetasUi, compraUi, menuUi, asistenteUi] = await Promise.all([
  readFile(new URL('../src/components/SelectorProductoIngrediente.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/Recetas.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/CompraModern.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/MenuModern.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/asistentePFI.ts', import.meta.url), 'utf8'),
]);
assert.match(selectorUi, /Pausar ingrediente/);
assert.match(selectorUi, /Usar este precio/);
assert.match(selectorUi, /tienda y fecha/);
assert.match(recetasUi, /La asociación se conserva/);
assert.match(compraUi, /No cuentan como ahorro/);
assert.match(compraUi, /Revisar disponibilidad de/);
assert.match(menuUi, /Cambia el menú o reactívalo en Recetas/);
assert.match(menuUi, /filter\(\(sugerencia\) => ingredientesPausadosEn/);
assert.match(asistenteUi, /Cambia el menú o reactívalo/);

await vite.close();

console.log('✓ pausar un ingrediente lo excluye de la compra correcta sin crear un falso ahorro');
console.log('✓ presupuesto y asistente conservan la exclusión como causa trazable y prioritaria');
console.log('✓ un precio manual real cierra envases e importe con tienda y fecha de origen');
console.log('✓ reactivar o retirar el precio devuelve el ingrediente al flujo exacto esperado');
console.log('✓ disponibilidad y precios manuales quedan incluidos en la copia completa del PFI');
