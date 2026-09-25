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

const { recetas } = await vite.ssrLoadModule('/src/data/Recetas.ts');
const {
  calcularEnvasesParaNecesidades,
} = await vite.ssrLoadModule('/src/motor/compra.ts');
const {
  registrarCompra,
  registrarConsumo,
  registrarDesperdicio,
  obtenerStockActual,
  cargarMovimientos,
} = await vite.ssrLoadModule('/src/services/inventario.ts');
const {
  evaluarIngredienteTemporada,
  guardarZonaTemporada,
  cargarZonaTemporada,
  EVENTO_ZONA_TEMPORADA,
} = await vite.ssrLoadModule('/src/services/temporadaIngredientes.ts');
const {
  calcularResumenEconomicoMensual,
} = await vite.ssrLoadModule('/src/services/resumenEconomico.ts');
const {
  obtenerProductoAsociado,
} = await vite.ssrLoadModule('/src/services/asociacionesIngredientes.ts');

const kebab = recetas.find((receta) => receta.nombre === 'Kebab');
assert.ok(kebab);
const nombresKebab = kebab.ingredientes.map((ingrediente) => ingrediente.nombre);
assert.equal(nombresKebab.includes('Especias kebab'), false);
for (const nombre of [
  'Comino molido',
  'Pimentón dulce',
  'Ajo en polvo',
  'Orégano',
  'Pimienta negra molida',
]) {
  assert.ok(nombresKebab.includes(nombre), `Falta ${nombre} en Kebab`);
}
assert.equal((await obtenerProductoAsociado('Comino molido'))?.productoId, '34120');
assert.equal((await obtenerProductoAsociado('Orégano'))?.productoId, '5598');
assert.equal((await obtenerProductoAsociado('Pimienta negra molida'))?.productoId, '34171');

const productoExacto = {
  productoId: 'test-exacto',
  nombre: 'Bote de prueba',
  precio: 1.2,
  precioReferencia: null,
  formato: 'Bote',
  unidadesTotales: 0,
  tamanoUnidad: 0.1,
  tamañoUnidad: 0.1,
  formatoUnidad: 'kg',
  pesoAproximado: true,
  seccion: 'Despensa',
  sección: 'Despensa',
  subcategoria: 'Prueba',
  imagen: '',
  url: '',
  disponible: true,
};
const exacto = calcularEnvasesParaNecesidades([
  { nombre: 'Comino molido', cantidad: 4, unidad: 'g', seccion: 'Despensa' },
], productoExacto);
assert.equal(exacto.estimado, false);
assert.equal(exacto.motivoEstimacion, undefined);

const variable = calcularEnvasesParaNecesidades([
  { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
], {
  ...productoExacto,
  productoId: 'test-variable',
  nombre: 'Tomate pieza',
  formato: 'Pieza',
  tamanoUnidad: 0.5,
  tamañoUnidad: 0.5,
  formatoUnidad: 'kg',
});
assert.equal(variable.estimado, true);
assert.equal(variable.motivoEstimacion, 'conversion-aproximada');

const pesoVariable = calcularEnvasesParaNecesidades([
  { nombre: 'Salmón', cantidad: 500, unidad: 'g', seccion: 'Pescado' },
], {
  ...productoExacto,
  productoId: 'test-peso',
  nombre: 'Salmón pieza',
  formato: 'Pieza',
  tamanoUnidad: 0.6,
  tamañoUnidad: 0.6,
  formatoUnidad: 'kg',
});
assert.equal(pesoVariable.estimado, true);
assert.equal(pesoVariable.motivoEstimacion, 'peso-variable');

const incompleto = calcularEnvasesParaNecesidades([
  { nombre: 'Producto raro', cantidad: 10, unidad: 'ml', seccion: 'Otros' },
], {
  ...productoExacto,
  productoId: 'test-incompleto',
  tamanoUnidad: 2,
  tamañoUnidad: 2,
  formatoUnidad: 'ud',
});
assert.equal(incompleto.estimado, true);
assert.equal(incompleto.motivoEstimacion, 'formato-incompleto');

registrarCompra('inventario-test', 2, 'manual', 'Compra');
registrarConsumo('inventario-test', 0.25, 'menu', 'Comida');
registrarDesperdicio('inventario-test', 0.5, 'Merma');
assert.equal(obtenerStockActual('inventario-test'), 1.25);
assert.equal(
  cargarMovimientos().filter((movimiento) => movimiento.tipo === 'desperdicio').length,
  1,
);

assert.equal(evaluarIngredienteTemporada('Sandía', '2026-09', 'norte').estado, 'temporada');
assert.equal(evaluarIngredienteTemporada('Sandía', '2026-12', 'norte').estado, 'fuera');
guardarZonaTemporada('interior');
assert.equal(cargarZonaTemporada(), 'interior');
assert.ok(eventos.includes(EVENTO_ZONA_TEMPORADA));

const ingredienteBase = {
  nombre: 'Prueba',
  cantidad: 1,
  unidad: 'ud',
  seccion: 'Prueba',
};
const productoBase = {
  productoId: 'p',
  nombre: 'Producto',
  precio: 1,
  precioReferencia: null,
  formato: 'Paquete',
  unidadesTotales: 1,
  tamanoUnidad: 1,
  formatoUnidad: 'ud',
  pesoAproximado: false,
  seccion: 'Prueba',
  subcategoria: 'Prueba',
  imagen: '',
  url: '',
  disponible: true,
};
const linea = (clave, subtotal, motivoEstimacion) => ({
  clave,
  ingrediente: { ...ingredienteBase, nombre: clave },
  necesidades: [{ ...ingredienteBase, nombre: clave }],
  producto: subtotal === null ? { ...productoBase, productoId: clave, precio: null } : { ...productoBase, productoId: clave },
  productoDespensa: null,
  envases: 1,
  envasesExactos: 1,
  subtotal,
  calculoEstimado: Boolean(motivoEstimacion),
  motivoEstimacion,
  tipoCompra: 'semanal',
  origen: 'menu',
});
const lineas = [
  linea('confirmado', 10),
  linea('peso', 5, 'peso-variable'),
  linea('conversion', 3, 'conversion-aproximada'),
  linea('incompleto', 2, 'formato-incompleto'),
  linea('sin-precio', null),
];
const compra = {
  lineas,
  lineasSemanales: lineas,
  lineasDespensa: [],
  total: 20,
  totalSemanal: 20,
  totalDespensa: 0,
  productosSinSeleccionar: [],
  productosSinPrecio: ['sin-precio'],
  productosEstimados: ['peso', 'conversion', 'incompleto'],
  ingredientesNoDisponibles: [{
    ingrediente: 'Sandía',
    motivo: 'temporada',
    nota: '',
    deshabilitadoEn: new Date().toISOString(),
    seccion: 'Fruta y verdura',
  }],
};
const resumen = calcularResumenEconomicoMensual({
  compraMes: null,
  comprasSemanas: [compra],
  productosManuales: [],
  mesActivo: '2026-09',
  semanaActiva: 0,
});
assert.equal(resumen.prevision.importeConfirmado, 10);
assert.equal(resumen.prevision.importeEstimado, 10);
assert.equal(resumen.prevision.partidasSinImporte, 1);
assert.equal(resumen.prevision.partidasExcluidasDisponibilidad, 1);
assert.equal(resumen.prevision.estimadasPesoVariable, 1);
assert.equal(resumen.prevision.estimadasConversion, 1);
assert.equal(resumen.prevision.formatosIncompletos, 1);
assert.equal(resumen.prevision.fiabilidadPorcentaje, 46);

const [menuUi, despensaUi, compraUi, homeUi, perfilUi, packageRaw, swRaw] =
  await Promise.all([
    readFile(new URL('../src/pages/MenuModern.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Despensa.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/CompraModern.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/Perfil.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
  ]);
assert.match(menuUi, /Confirmar que hemos comido esto/);
assert.match(menuUi, /Aplicar sustitución/);
assert.match(menuUi, /Despensa: conserva el stock real/);
assert.match(despensaUi, /Registrar merma/);
assert.match(compraUi, /confirmado/);
assert.match(compraUi, /peso variable real/);
assert.match(homeUi, /Fiabilidad/);
assert.match(perfilUi, /Zona de temporada/);
assert.equal(JSON.parse(packageRaw).version, '0.9.57');
assert.match(swRaw, /pfi-v0\.9\.57-1/);

await vite.close();

console.log('✓ kebab usa especias reales con referencias verificadas');
console.log('✓ las aproximaciones distinguen peso variable, conversión y formato incompleto');
console.log('✓ consumo y desperdicio son movimientos separados y afectan al stock real');
console.log('✓ presupuesto separa importes y expone un porcentaje de fiabilidad auditable');
console.log('✓ temporada por zona avisa sin bloquear y deja la sustitución bajo control manual');
