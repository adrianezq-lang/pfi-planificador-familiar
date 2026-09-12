import assert from 'node:assert/strict';

class AlmacenLocal {
  #datos = new Map();

  get length() {
    return this.#datos.size;
  }

  getItem(clave) {
    return this.#datos.has(clave) ? this.#datos.get(clave) : null;
  }

  setItem(clave, valor) {
    this.#datos.set(String(clave), String(valor));
  }

  removeItem(clave) {
    this.#datos.delete(clave);
  }

  key(indice) {
    return Array.from(this.#datos.keys())[indice] ?? null;
  }
}

globalThis.localStorage = new AlmacenLocal();
globalThis.window = { dispatchEvent() {} };

const compraManual = await import('../src/services/productosManualesCompra.ts');
const despensa = await import('../src/services/despensa.ts');
const inventario = await import('../src/services/inventario.ts');
const copias = await import('../src/services/copiasSeguridad.ts');

const semana = compraManual.crearPeriodoIdCompraManual('semana', '2026-09', 1);
const mes = compraManual.crearPeriodoIdCompraManual('mes', '2026-09', 1);

let productos = compraManual.añadirProductoManualCompra({
  periodoId: semana,
  nombre: 'Manzanas de caserío',
  cantidad: 2,
  unidad: 'kg',
  tienda: 'Frutería del barrio',
  precioTotal: 5.8,
});

productos = compraManual.añadirProductoManualCompra({
  periodoId: mes,
  nombre: 'Comida del gato',
  cantidad: 1,
  unidad: 'paquete',
  tienda: '',
  precioTotal: null,
});

assert.equal(productos.length, 2);
assert.equal(productos[1].tienda, 'Otra tienda');

productos = compraManual.marcarTodosProductosManualesCompra(semana);
assert.equal(productos[0].comprado, true);
assert.equal(productos[1].comprado, false);

const primerRegistro = compraManual.registrarProductosManualesEnDespensa(
  semana,
  'Compra semanal de prueba',
);
assert.equal(primerRegistro.registrados, 1);
assert.equal(primerRegistro.productos[0].guardadoEnDespensa, true);

const productoDespensa = despensa
  .cargarDespensa()
  .find((producto) => producto.nombre === 'Manzanas de caserío');
assert.ok(productoDespensa);
assert.equal(productoDespensa.ultimaCompraTienda, 'Frutería del barrio');
assert.equal(productoDespensa.precio, 2.9);
assert.equal(inventario.obtenerStockActual(productoDespensa.productoId), 2);

const segundoRegistro = compraManual.registrarProductosManualesEnDespensa(
  semana,
  'Segundo intento',
);
assert.equal(segundoRegistro.registrados, 0);
assert.equal(inventario.obtenerStockActual(productoDespensa.productoId), 2);

const datos = copias.recopilarDatosPFI();
assert.ok(datos['pfi-compra-manual-v1']);

console.log('✓ los productos manuales se guardan por semana o mes');
console.log('✓ la compra manual entra una sola vez en despensa e inventario');
console.log('✓ tienda, precio y productos manuales quedan incluidos en las copias');
