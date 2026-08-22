import fs from 'node:fs';
import assert from 'node:assert/strict';

class StorageMock {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const conservacion = await import(
  new URL('../src/services/conservacion.ts', import.meta.url).href
);

localStorage.clear();
const abierto = conservacion.anadirConservacion({
  tipo: 'abierto',
  nombre: 'Macarrón grueso Hacendado',
  cantidad: 250,
  unidad: 'g',
  productoId: 'pasta-500',
});
assert.equal(abierto.productoId, 'pasta-500', 'Abiertos debe quedar vinculado al producto del inventario');
assert.equal(
  conservacion.cantidadConservada('Macarrón grueso Hacendado', 'g'),
  0,
  'Un abierto vinculado no puede volver a descontarse de Compra porque ya está en Inventario',
);
conservacion.consumirConservacion(abierto.id, 100);
assert.equal(
  conservacion.cargarConservacion().find((item) => item.id === abierto.id)?.cantidad,
  150,
  'El consumo parcial debe conservar la cantidad restante',
);

const sobra1 = conservacion.registrarSobraDesdeMenu({
  origen: 'menu:2026-08:semana-1:Lunes:comida',
  nombre: 'Lentejas',
  cantidad: 1,
});
assert.equal(sobra1.cantidad, 1, 'La sobra debe guardarse en raciones');
const sobra2 = conservacion.registrarSobraDesdeMenu({
  origen: 'menu:2026-08:semana-1:Lunes:comida',
  nombre: 'Lentejas',
  cantidad: 2,
});
assert.equal(sobra2.id, sobra1.id, 'Actualizar la sobra de la misma comida no debe duplicarla');
assert.equal(
  conservacion.obtenerSobraPorOrigen('menu:2026-08:semana-1:Lunes:comida')?.cantidad,
  2,
  'La cantidad de la sobra debe poder corregirse',
);
conservacion.eliminarSobraOrigen('menu:2026-08:semana-1:Lunes:comida');
assert.equal(
  conservacion.obtenerSobraPorOrigen('menu:2026-08:semana-1:Lunes:comida'),
  null,
  'Cambiar la valoración de Sobró debe poder retirar la sobra asociada',
);

const menu = fs.readFileSync('src/pages/Menu.tsx', 'utf8');
const panel = fs.readFileSync('src/components/ConservacionPanel.tsx', 'utf8');

assert.ok(menu.includes('className="meal-day-stack"'), 'Menú debe agrupar cada comida con su postre');
assert.ok(!menu.includes('className="daily-desserts"'), 'Los postres no deben quedar en un bloque separado al final del día');
assert.ok(menu.includes('momento="Postre de la comida"'), 'Debe existir el postre justo en la columna de comida');
assert.ok(menu.includes('momento="Postre de la cena"'), 'Debe existir el postre justo en la columna de cena');
assert.ok(menu.includes('registrarSobraDesdeMenu'), 'El botón Sobró debe estar conectado con Despensa');
assert.ok(menu.includes('¿Cuánto quedó?'), 'Sobró debe pedir la cantidad real de raciones');

assert.ok(panel.includes('Producto del inventario…'), 'Abiertos/Congelados deben elegirse desde Inventario');
assert.ok(panel.includes('registrarConsumo('), 'Consumir un abierto/congelado debe reducir también Inventario');
assert.ok(panel.includes('Todo usado'), 'Debe poder consumirse toda la cantidad');
assert.ok(panel.includes('Congelar') && panel.includes('Descongelar'), 'Debe poder cambiar el estado abierto/congelado');
assert.ok(panel.includes('sin duplicar el stock'), 'La interfaz debe explicar que el estado no suma stock');

console.log('✓ Menú: postre debajo de cada comida/cena');
console.log('✓ Sobró crea/actualiza raciones reales en Despensa sin duplicados');
console.log('✓ Abiertos/Congelados quedan vinculados al Inventario y admiten consumo parcial');
