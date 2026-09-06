import assert from 'node:assert/strict';

const memoria = new Map();
globalThis.localStorage = {
  getItem(clave) {
    return memoria.get(clave) ?? null;
  },
  setItem(clave, valor) {
    memoria.set(clave, String(valor));
  },
};
globalThis.window = { dispatchEvent() {} };

const {
  cargarClavesGuardadas,
  crearClavesEstadoCompra,
  guardarClavesCompra,
  obtenerLineasPendientesDeInventario,
  registrarMarcadosEnInventario,
} = await import('../src/services/registroCompra.ts');

const mensualDesdeSemana1 = crearClavesEstadoCompra('mes', '2026-09', 0);
const mensualDesdeSemana4 = crearClavesEstadoCompra('mes', '2026-09', 3);
assert.deepEqual(mensualDesdeSemana4, mensualDesdeSemana1);
assert.equal(mensualDesdeSemana1.marcados, 'pfi-compra-mes-2026-09-todo');

const semanal1 = crearClavesEstadoCompra('semana', '2026-09', 0);
const semanal4 = crearClavesEstadoCompra('semana', '2026-09', 3);
assert.notEqual(semanal1.marcados, semanal4.marcados);

guardarClavesCompra(semanal1.marcados, ['producto-1', 'producto-1', 'producto-2']);
assert.deepEqual(cargarClavesGuardadas(semanal1.marcados), [
  'producto-1',
  'producto-2',
]);

const crearLinea = (clave, productoId, vinculada = true) => ({
  clave,
  ingrediente: { nombre: clave, cantidad: 1, unidad: 'ud', seccion: 'Prueba' },
  necesidades: [],
  producto: null,
  productoDespensa: vinculada ? { productoId } : null,
  envases: 2,
  envasesExactos: 2,
  subtotal: 4,
  calculoEstimado: false,
  tipoCompra: 'despensa',
  origen: 'menu',
});

const lineas = [
  crearLinea('producto-1', 'sku-1'),
  crearLinea('producto-2', 'sku-2'),
  crearLinea('producto-sin-despensa', 'sku-3', false),
];
const marcados = lineas.map((linea) => linea.clave);

assert.equal(
  obtenerLineasPendientesDeInventario(lineas, marcados, []).length,
  2,
);

const primerRegistro = registrarMarcadosEnInventario(
  lineas,
  marcados,
  [],
  'Compra de prueba',
);
assert.equal(primerRegistro.lineasRegistradas, 2);
assert.equal(primerRegistro.lineasSinInventario, 1);
assert.equal(primerRegistro.clavesRegistradas.length, 2);

const segundoRegistro = registrarMarcadosEnInventario(
  lineas,
  marcados,
  primerRegistro.clavesRegistradas,
  'Compra de prueba repetida',
);
assert.equal(segundoRegistro.lineasRegistradas, 0);
assert.equal(
  JSON.parse(localStorage.getItem('pfi-inventario-movimientos') ?? '[]').length,
  2,
);

console.log('✓ la compra mensual conserva la misma lista desde cualquier semana');
console.log('✓ las compras semanales mantienen listas independientes');
console.log('✓ los productos marcados pasan una sola vez al inventario');
