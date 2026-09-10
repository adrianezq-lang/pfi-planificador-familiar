import assert from 'node:assert/strict';
import { createServer } from 'vite';

class StorageMock {
  data = new Map();

  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(clave) { return this.data.get(clave) ?? null; }
  key(indice) { return [...this.data.keys()][indice] ?? null; }
  removeItem(clave) { this.data.delete(clave); }
  setItem(clave, valor) { this.data.set(String(clave), String(valor)); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = {
  location: { origin: 'https://pfi.test' },
  dispatchEvent() { return true; },
};
globalThis.CustomEvent = class {
  constructor(type) { this.type = type; }
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const {
  CLAVE_CONFIGURACION_COMPARADOR,
  CLAVE_OFERTAS_COMPARADOR,
  cargarConfiguracionComparador,
  cargarOfertasComparador,
  claveProductoComparador,
  compararPreciosCompra,
  crearTiendaLocal,
  guardarConfiguracionComparador,
  guardarOfertaComparador,
} = await vite.ssrLoadModule('/src/services/comparadorPrecios.ts');
const {
  crearCopiaCompleta,
  obtenerEstadoSaludDatos,
  recopilarDatosPFI,
} = await vite.ssrLoadModule('/src/services/copiasSeguridad.ts');

function producto(productoId, nombre, precio, formato, tamanoUnidad, formatoUnidad) {
  return {
    productoId,
    nombre,
    precio,
    precioReferencia: null,
    formato,
    unidadesTotales: null,
    tamanoUnidad,
    formatoUnidad,
    pesoAproximado: false,
    seccion: 'Alimentación',
    subcategoria: 'Pruebas',
    imagen: null,
    url: '',
    disponible: true,
  };
}

function linea({
  producto: productoLinea,
  cantidad,
  unidad,
  envases,
  envasesExactos,
  explicacionCantidad,
}) {
  const ingrediente = {
    nombre: productoLinea.nombre,
    cantidad,
    unidad,
    seccion: 'Despensa',
  };
  return {
    clave: `producto-${productoLinea.productoId}`,
    ingrediente,
    necesidades: [ingrediente],
    producto: productoLinea,
    productoDespensa: null,
    envases,
    envasesExactos,
    subtotal: productoLinea.precio === null ? null : envases * productoLinea.precio,
    calculoEstimado: false,
    tipoCompra: 'semanal',
    origen: 'menu',
    explicacionCantidad,
  };
}

const arroz = linea({
  producto: producto('arroz-1', 'Arroz redondo', 1.2, 'Paquete 1 kg', 1, 'kg'),
  cantidad: 1_500,
  unidad: 'g',
  envases: 2,
  envasesExactos: 1.5,
});
const leche = linea({
  producto: producto('leche-1', 'Leche entera', 1.1, 'Brik 1 L', 1, 'l'),
  cantidad: 2,
  unidad: 'l',
  envases: 2,
  envasesExactos: 2,
});

const inicial = cargarConfiguracionComparador();
assert.equal(inicial.codigoPostal, '48950');
assert.deepEqual(
  inicial.tiendas.slice(0, 4).map((tienda) => tienda.nombre),
  ['Mercadona', 'Lidl', 'Carrefour', 'Eroski'],
);
assert.equal(inicial.tiendas.find((tienda) => tienda.id === 'mercadona')?.automatica, true);

const configuracion = guardarConfiguracionComparador({
  ...inicial,
  maxTiendas: 2,
  ahorroMinimo: 0,
  vigenciaDias: 14,
});
const claveArroz = claveProductoComparador(arroz);
const claveLeche = claveProductoComparador(leche);

const guardar = (
  productoClave,
  ingrediente,
  tiendaId,
  nombreProducto,
  precio,
  cantidad,
  unidad,
  actualizadaEn = '2026-09-01',
  modoVenta = 'envase',
) =>
  guardarOfertaComparador({
    productoClave,
    ingrediente,
    tiendaId,
    nombreProducto,
    precio,
    cantidad,
    unidad,
    modoVenta,
    actualizadaEn,
    origen: 'manual',
  });

guardar(claveArroz, 'Arroz redondo', 'lidl', 'Arroz Lidl 1 kg', 1.05, 1, 'kg');
guardar(claveLeche, 'Leche entera', 'lidl', 'Leche Lidl 1 L', 1.2, 1, 'l');
guardar(claveArroz, 'Arroz redondo', 'carrefour', 'Arroz Carrefour 500 g', 0.45, 500, 'g');
guardar(claveLeche, 'Leche entera', 'carrefour', 'Leche Carrefour 1 L', 1.15, 1, 'l');
guardar(claveLeche, 'Leche entera', 'eroski', 'Leche Eroski 1 L', 0.8, 1, 'l');

let resultado = compararPreciosCompra(
  [arroz, leche],
  configuracion,
  cargarOfertasComparador(),
  new Date('2026-09-09T12:00:00Z'),
);
assert.equal(resultado.unaTienda?.total, 3.65);
assert.deepEqual(resultado.absoluta.tiendas.sort(), ['carrefour', 'eroski']);
assert.equal(resultado.absoluta.total, 2.95);
assert.equal(resultado.practica.total, 2.95);
assert.ok(resultado.practica.tiendas.length <= 2);
assert.equal(resultado.recomendada.total, 2.95);

resultado = compararPreciosCompra(
  [arroz, leche],
  { ...configuracion, ahorroMinimo: 1 },
  cargarOfertasComparador(),
  new Date('2026-09-09T12:00:00Z'),
);
assert.equal(resultado.recomendada.total, 3.65);
assert.deepEqual(resultado.recomendada.tiendas, ['carrefour']);

guardar(
  claveLeche,
  'Leche entera',
  'eroski',
  'Leche Eroski caducada',
  0.8,
  1,
  'l',
  '2026-08-01',
);
assert.equal(
  cargarOfertasComparador().filter((oferta) =>
    oferta.productoClave === claveLeche && oferta.tiendaId === 'eroski'
  ).length,
  1,
  'Actualizar un precio debe sustituirlo, no duplicarlo.',
);
resultado = compararPreciosCompra(
  [arroz, leche],
  configuracion,
  cargarOfertasComparador(),
  new Date('2026-09-09T12:00:00Z'),
);
assert.equal(resultado.ofertasCaducadas, 1);
assert.equal(resultado.absoluta.total, 3.55);
assert.deepEqual(resultado.absoluta.tiendas.sort(), ['carrefour', 'mercadona']);

const arrozConStock = linea({
  producto: arroz.producto,
  cantidad: 1_500,
  unidad: 'g',
  envases: 1,
  envasesExactos: 1.5,
  explicacionCantidad: {
    periodo: 'semana',
    semana: 1,
    necesidadMenuEnvases: 1.5,
    necesidadMensualEnvases: 0,
    reservaEnvases: 0,
    objetivoEnvases: 1.5,
    stockAntesEnvases: 0.5,
    compraEnvases: 1,
    sobranteDespuesEnvases: 0,
    stockAplicado: true,
  },
});
const resultadoStock = compararPreciosCompra(
  [arrozConStock],
  configuracion,
  cargarOfertasComparador(),
  new Date('2026-09-09T12:00:00Z'),
);
const opcionCarrefour = resultadoStock.lineas[0].opciones.find(
  (opcion) => opcion.tiendaId === 'carrefour',
);
assert.equal(opcionCarrefour?.envases, 2, 'El comparador no descontó el stock aplicado.');
assert.equal(opcionCarrefour?.coste, 0.9);

const perasSinPrecio = linea({
  producto: producto('peras-1', 'Peras', null, 'Bolsa 1 kg', 1, 'kg'),
  cantidad: 1,
  unidad: 'kg',
  envases: 1,
  envasesExactos: 1,
});
const polloSinPrecio = linea({
  producto: producto('pollo-1', 'Pollo', null, 'Bandeja 500 g', 500, 'g'),
  cantidad: 500,
  unidad: 'g',
  envases: 1,
  envasesExactos: 1,
});
const ofertasSeparadas = [
  {
    id: 'se-normaliza',
    productoClave: claveProductoComparador(perasSinPrecio),
    ingrediente: 'Peras',
    tiendaId: 'lidl',
    nombreProducto: 'Peras Lidl 1 kg',
    precio: 1,
    cantidad: 1,
    unidad: 'kg',
    actualizadaEn: '2026-09-08',
    origen: 'manual',
  },
  {
    id: 'se-normaliza',
    productoClave: claveProductoComparador(polloSinPrecio),
    ingrediente: 'Pollo',
    tiendaId: 'eroski',
    nombreProducto: 'Pollo Eroski 500 g',
    precio: 2,
    cantidad: 500,
    unidad: 'g',
    actualizadaEn: '2026-09-08',
    origen: 'manual',
  },
];
const resultadoParcial = compararPreciosCompra(
  [perasSinPrecio, polloSinPrecio],
  { ...configuracion, maxTiendas: 1 },
  ofertasSeparadas,
  new Date('2026-09-09T12:00:00Z'),
);
assert.equal(resultadoParcial.absoluta.completo, true);
assert.equal(resultadoParcial.practica.completo, false);
assert.equal(resultadoParcial.practica.cubiertos, 1);
assert.ok(resultadoParcial.practica.tiendas.length <= 1);

assert.throws(
  () => guardar(
    claveArroz,
    'Arroz redondo',
    'lidl',
    'Precio imposible del futuro',
    0.5,
    1,
    'kg',
    '2999-01-01',
  ),
  /Revisa el precio/,
);

const conBarrio = crearTiendaLocal(configuracion, 'Carnicería del barrio', 'carniceria');
const carniceria = conBarrio.tiendas.find((tienda) =>
  tienda.nombre === 'Carnicería del barrio' && tienda.id.startsWith('local-')
);
assert.ok(carniceria);
const ternera = linea({
  producto: producto('ternera-1', 'Filetes de ternera', 20, 'Bandeja 1 kg', 1, 'kg'),
  cantidad: 1_500,
  unidad: 'g',
  envases: 2,
  envasesExactos: 1.5,
});
guardar(
  claveProductoComparador(ternera),
  'Filetes de ternera',
  carniceria.id,
  'Ternera al corte',
  9,
  1,
  'kg',
  '2026-09-09',
  'peso',
);
const opcionAlPeso = compararPreciosCompra(
  [ternera],
  conBarrio,
  cargarOfertasComparador(),
  new Date('2026-09-09T12:00:00Z'),
).lineas[0].opciones.find((opcion) => opcion.tiendaId === carniceria.id);
assert.equal(opcionAlPeso?.alPeso, true);
assert.equal(opcionAlPeso?.cantidadAlPeso, 1.5);
assert.equal(opcionAlPeso?.unidadAlPeso, 'kg');
assert.equal(opcionAlPeso?.coste, 13.5);

const datos = recopilarDatosPFI();
assert.ok(datos[CLAVE_CONFIGURACION_COMPARADOR]);
assert.ok(datos[CLAVE_OFERTAS_COMPARADOR]);
localStorage.setItem('pfi-sync-sesion-v1', '{"access_token":"no-exportar"}');
assert.equal(recopilarDatosPFI()['pfi-sync-sesion-v1'], undefined);
const copia = crearCopiaCompleta();
assert.equal(copia.versionApp, '0.9.25');
assert.equal(copia.resumen.preciosComparador, 6);
assert.equal(obtenerEstadoSaludDatos().resumen.preciosComparador, 6);

localStorage.setItem(CLAVE_CONFIGURACION_COMPARADOR, '{json roto');
localStorage.setItem(CLAVE_OFERTAS_COMPARADOR, '{json roto');
assert.equal(cargarConfiguracionComparador().codigoPostal, '48950');
assert.deepEqual(cargarOfertasComparador(), []);

await vite.close();
console.log('✓ Mercadona, Lidl, Carrefour y Eroski parten activos en el CP 48950');
console.log('✓ formatos, envases y stock se comparan con cantidades equivalentes');
console.log('✓ planes práctico, absoluto y de una tienda respetan paradas y ahorro mínimo');
console.log('✓ los precios caducados se excluyen y actualizar no crea duplicados');
console.log('✓ carnicerías y fruterías calculan el peso exacto sin redondearlo a envases');
console.log('✓ precios y configuración viajan en copias y sincronización, nunca la sesión');
