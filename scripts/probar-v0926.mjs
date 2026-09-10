import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import {
  extraerFormatoCatalogo,
  extraerProductosCarrefour,
  extraerProductosEroski,
} from './catalogos-supermercados.mjs';

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
  addEventListener() {},
  removeEventListener() {},
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

const { menuMensualInicial } = await vite.ssrLoadModule('/src/data/MenuMensual.ts');
const {
  aplicarCenasSinCerealesPrincipales,
  esCenaConCerealPrincipal,
  generarPlanMensualInteligente,
  planTieneCenasConCerealPrincipal,
} = await vite.ssrLoadModule('/src/services/planMensual.ts');
const {
  cargarConfiguracionComparador,
  cargarOfertasComparador,
  compararPreciosCompra,
  guardarOfertaComparador,
} = await vite.ssrLoadModule('/src/services/comparadorPrecios.ts');
const {
  buscarProductosCatalogo,
  filtrarProductosCatalogoEroski,
  normalizarEntradaCatalogoEroski,
  normalizarProductoCatalogo,
  refrescarOfertasCatalogo,
} = await vite.ssrLoadModule(
  '/src/services/catalogosSupermercados.ts',
);

assert.equal(planTieneCenasConCerealPrincipal(menuMensualInicial), false);
assert.ok(
  menuMensualInicial.every((semana) =>
    semana.menu.find((dia) => dia.dia === 'Viernes')?.cena.every((plato) =>
      plato.toLocaleLowerCase('es').includes('pizza'),
    ),
  ),
  'La pizza familiar debe mantenerse el viernes.',
);

const antiguo = structuredClone(menuMensualInicial);
antiguo[0].menu[0].cena = ['Arroz con huevo y tomate'];
antiguo[1].menu[1].cena = ['Macarrones con atún'];
antiguo[2].menu[2].cena = ['Cuscús con verduras'];
const saneado = aplicarCenasSinCerealesPrincipales(antiguo);
assert.equal(planTieneCenasConCerealPrincipal(saneado), false);
const sustituciones = [
  saneado[0].menu[0].cena.join(' + '),
  saneado[1].menu[1].cena.join(' + '),
  saneado[2].menu[2].cena.join(' + '),
];
assert.equal(new Set(sustituciones).size, 3, 'Las cenas sustitutas no deben repetirse.');
assert.equal(esCenaConCerealPrincipal('Pizza jamón y queso'), false);
assert.equal(esCenaConCerealPrincipal('Fideuá de verduras'), true);
assert.equal(esCenaConCerealPrincipal('Paella de verduras'), true);
assert.equal(esCenaConCerealPrincipal('Gnocchi con tomate'), true);

const nombresDisponibles = Array.from(new Set(
  menuMensualInicial.flatMap((semana) =>
    semana.menu.flatMap((dia) => [...dia.comida, ...dia.cena]),
  ),
));
const inteligente = generarPlanMensualInteligente(
  nombresDisponibles,
  new Date('2026-10-01T12:00:00'),
);
assert.equal(planTieneCenasConCerealPrincipal(inteligente), false);

const metrica = (item) => JSON.stringify({
  event: 'select_item',
  ecommerce: { items: [item] },
}).replaceAll('"', '&quot;');
const htmlEroski = `${metrica({
  item_id: '12345',
  item_name: 'Tomate rama EROSKI, bandeja 500 g',
  item_brand: 'EROSKI',
  price: 2.49,
})}" class="producto">1 KILO A 4,98 €${metrica({
  item_id: '67890',
  item_name: 'Leche EROSKI, brik 1 litro',
  item_brand: 'EROSKI',
  price: 1.15,
})}" class="producto">`;
const [tomateEroski] = extraerProductosEroski(htmlEroski, 1);
assert.equal(tomateEroski.id, '12345');
assert.equal(tomateEroski.cantidad, 500);
assert.equal(tomateEroski.unidad, 'g');
assert.equal(tomateEroski.precio, 2.49);
assert.equal(tomateEroski.precioReferencia, 4.98);
assert.match(tomateEroski.url, /supermercado\.eroski\.es/);

const htmlEroskiPaginado = `<div data-metrics='${JSON.stringify({
  event: 'select_item',
  ecommerce: { items: [{
    item_id: '18374611',
    item_name: 'Aguacate maduro, al peso, compra mínima 500 g',
    item_brand: '',
    price: 2.38,
  }] },
})}'><a href='/es/productdetail/18374611-aguacate-maduro-al-peso-compra-minima-500-g/'>
  Aguacate maduro</a><p>1 KILO A 4,76 €</p></div>`;
const [aguacateEroski] = extraerProductosEroski(htmlEroskiPaginado, 1);
assert.equal(aguacateEroski.modoVenta, 'peso');
assert.equal(aguacateEroski.precio, 4.76);
assert.equal(aguacateEroski.precioReferencia, 4.76);
assert.match(aguacateEroski.url, /aguacate-maduro/);

assert.deepEqual(extraerFormatoCatalogo('Yogur pack 6 x 125 g'), {
  cantidad: 750,
  unidad: 'g',
  modoVenta: 'envase',
});
assert.deepEqual(extraerFormatoCatalogo('Plátano al peso, compra mínima 1 kg', true), {
  cantidad: 1,
  unidad: 'kg',
  modoVenta: 'peso',
});

const [arrozCarrefour] = extraerProductosCarrefour({
  content: {
    docs: [{
      product_id: 'carrefour-1',
      display_name: 'Arroz redondo Carrefour paquete 1 kg',
      active_price: 1.25,
      price_per_unit_text: '1,25 €/kg',
      section: 'Alimentación',
      url: '/supermercado/arroz/R-prod1/p',
      image_path: 'https://static.carrefour.es/arroz.jpg',
    }],
  },
});
assert.equal(arrozCarrefour.cantidad, 1);
assert.equal(arrozCarrefour.unidad, 'kg');
assert.equal(arrozCarrefour.precioReferencia, 1.25);

assert.ok(normalizarProductoCatalogo(tomateEroski));
assert.equal(normalizarProductoCatalogo({ ...tomateEroski, precio: -1 }), null);
assert.deepEqual(
  filtrarProductosCatalogoEroski(
    [tomateEroski, aguacateEroski],
    'tomate eroski',
  ).map(({ id }) => id),
  ['12345'],
);

const catalogoEroskiReal = JSON.parse(readFileSync(
  new URL('../public/catalogo-eroski.json', import.meta.url),
  'utf8',
));
assert.equal(catalogoEroskiReal.version, 2);
const productosEroskiReales = catalogoEroskiReal.productos
  .map((producto) => normalizarEntradaCatalogoEroski(
    producto,
    catalogoEroskiReal.fechaPrecios,
  ))
  .filter(Boolean);
assert.equal(catalogoEroskiReal.totalProductos, catalogoEroskiReal.productos.length);
assert.equal(productosEroskiReales.length, catalogoEroskiReal.productos.length);
assert.equal(new Set(productosEroskiReales.map(({ id }) => id)).size, productosEroskiReales.length);
assert.ok(productosEroskiReales.length >= 3_000, 'El catálogo Eroski debe conservar cobertura amplia.');
for (const consulta of ['vainas', 'pimiento rojo', 'pechugas de pollo', 'salmón', 'huevos frescos']) {
  assert.ok(
    filtrarProductosCatalogoEroski(productosEroskiReales, consulta).length > 0,
    `Eroski debe encontrar ${consulta}.`,
  );
}

const configuracion = cargarConfiguracionComparador();
assert.deepEqual(
  configuracion.tiendas.slice(0, 4).map(({ id, automatica }) => [id, automatica]),
  [
    ['mercadona', true],
    ['carrefour', true],
    ['eroski', true],
    ['lidl', false],
  ],
);

const guardada = guardarOfertaComparador({
  productoClave: 'producto:mercadona-tomate',
  ingrediente: 'Tomate',
  tiendaId: 'eroski',
  nombreProducto: tomateEroski.nombre,
  precio: tomateEroski.precio,
  cantidad: tomateEroski.cantidad,
  unidad: tomateEroski.unidad,
  modoVenta: tomateEroski.modoVenta,
  actualizadaEn: '2026-09-10',
  origen: 'catalogo',
  referenciaExterna: tomateEroski.id,
  urlFuente: tomateEroski.url,
  imagen: tomateEroski.imagen,
});
assert.equal(guardada.origen, 'catalogo');
assert.equal(cargarOfertasComparador()[0].referenciaExterna, '12345');

const ofertaCatalogoIncompleta = guardarOfertaComparador({
  ...guardada,
  productoClave: 'ingrediente:oferta-incompleta',
  ingrediente: 'Oferta incompleta',
  referenciaExterna: null,
});
assert.equal(
  ofertaCatalogoIncompleta.origen,
  'manual',
  'Una oferta sin referencia estable no debe fingir que se renueva sola.',
);

const ofertasMismoEnvase = Array.from({ length: 31 }, (_, indice) => ({
  ...guardada,
  id: `oferta-compartida-${indice}`,
  productoClave: `ingrediente:compartido-${indice}`,
  tiendaId: 'carrefour',
  nombreProducto: arrozCarrefour.nombre,
  referenciaExterna: arrozCarrefour.id,
}));
const fetchReal = globalThis.fetch;
let peticionesRefresco = 0;
let peticionesCatalogoEroski = 0;
globalThis.fetch = async (url, opciones) => {
  if (String(url) === '/catalogo-eroski.json') {
    peticionesCatalogoEroski += 1;
    return new Response(JSON.stringify({
      actualizado: '2026-09-10T08:00:00.000Z',
      productos: [tomateEroski, aguacateEroski],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  peticionesRefresco += 1;
  const cuerpo = JSON.parse(String(opciones?.body ?? '{}'));
  return new Response(JSON.stringify({
    ok: true,
    resultados: cuerpo.items.map((item) => ({
      ok: true,
      tiendaId: item.tiendaId,
      referenciaExterna: item.referenciaExterna,
      producto: arrozCarrefour,
    })),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
try {
  const busquedaEroski = await buscarProductosCatalogo(
    'eroski',
    'tomate eroski',
    '48950',
  );
  assert.deepEqual(busquedaEroski.productos.map(({ id }) => id), ['12345']);
  assert.match(busquedaEroski.aviso, /actualizado/i);

  const refresco = await refrescarOfertasCatalogo([guardada, ...ofertasMismoEnvase]);
  assert.equal(peticionesRefresco, 2, 'Más de 30 asociaciones deben renovarse por lotes.');
  assert.equal(peticionesCatalogoEroski, 1, 'Eroski debe compartir un único catálogo local.');
  assert.deepEqual(
    refresco.actualizaciones
      .filter(({ oferta }) => oferta.tiendaId === 'carrefour')
      .map(({ oferta }) => oferta.id),
    ofertasMismoEnvase.map(({ id }) => id),
    'Compartir producto de catálogo no debe mezclar las asociaciones de PFI.',
  );
  assert.ok(refresco.actualizaciones.some(({ oferta }) => oferta.id === guardada.id));
  assert.deepEqual(refresco.errores, []);
} finally {
  globalThis.fetch = fetchReal;
}

const necesidad = { nombre: 'Tomate', cantidad: 750, unidad: 'g', seccion: 'Fruta' };
const linea = {
  clave: 'producto-mercadona-tomate',
  ingrediente: necesidad,
  necesidades: [necesidad],
  producto: {
    productoId: 'mercadona-tomate', nombre: 'Tomate Mercadona', precio: 3,
    precioReferencia: null, formato: 'Bandeja 500 g', unidadesTotales: null,
    tamanoUnidad: 500, formatoUnidad: 'g', pesoAproximado: false,
    seccion: 'Fruta', subcategoria: 'Tomate', imagen: null, url: '', disponible: true,
  },
  productoDespensa: null,
  envases: 2,
  envasesExactos: 1.5,
  subtotal: 6,
  calculoEstimado: false,
  tipoCompra: 'semanal',
  origen: 'menu',
};
const opcionEroski = compararPreciosCompra(
  [linea],
  configuracion,
  cargarOfertasComparador(),
  new Date('2026-09-10T12:00:00Z'),
).lineas[0].opciones.find((opcion) => opcion.tiendaId === 'eroski');
assert.equal(opcionEroski?.automatica, true);
assert.equal(opcionEroski?.envases, 2);
assert.equal(opcionEroski?.coste, 4.98);

await vite.close();
console.log('✓ ninguna cena incluye arroz, pasta, fideuá, cuscús o equivalentes');
console.log('✓ la pizza del viernes se mantiene y las sustituciones no se repiten');
console.log('✓ el generador inteligente respeta la regla nocturna');
console.log('✓ Eroski y Carrefour normalizan precio, formato y referencia comercial');
console.log('✓ Eroski conserva el identificador exacto para renovar su precio');
console.log('✓ Eroski busca y renueva desde un único catálogo local versionado');
console.log(`✓ catálogo Eroski completo: ${productosEroskiReales.length} referencias únicas`);
console.log('✓ la renovación por lotes conserva cada asociación aunque compartan envase');
console.log('✓ Carrefour y Eroski son catálogo; Lidl queda como respaldo manual');
