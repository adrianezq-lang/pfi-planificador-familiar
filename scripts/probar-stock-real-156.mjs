import fs from 'node:fs';

class MemoriaLocal {
  datos = new Map();
  getItem(clave) { return this.datos.has(clave) ? this.datos.get(clave) : null; }
  setItem(clave, valor) { this.datos.set(String(clave), String(valor)); }
  removeItem(clave) { this.datos.delete(clave); }
  clear() { this.datos.clear(); }
}

globalThis.localStorage = new MemoriaLocal();
globalThis.Event ??= class Event { constructor(type) { this.type = type; } };
globalThis.window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };

const stock = await import('../src/services/stockReal.ts');
const despensa = await import('../src/services/despensa.ts');
const compra = await import('../src/motor/compra.ts');

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
  console.log(`✓ ${mensaje}`);
}

function cerca(valor, esperado, tolerancia = 0.001) {
  return Math.abs(valor - esperado) <= tolerancia;
}

const huevos = stock.inferirConfiguracionStockReal({
  nombre: 'Huevos medianos M',
  formato: '12 ud',
  unidadesTotales: 12,
});
comprobar(huevos.unidadContenido === 'huevo' && huevos.contenidoPorEnvase === 12, 'los huevos se cuentan por unidades reales');
comprobar(cerca(stock.envasesDesdeCantidadReal(10, huevos), 10 / 12), '10 huevos equivalen a 10/12 de envase');
comprobar(cerca(stock.cantidadRealDesdeEnvases(10 / 12, huevos), 10), '10/12 de envase vuelve a mostrarse como 10 huevos');

const ajo = stock.inferirConfiguracionStockReal({
  nombre: 'Ajos morados',
  formato: 'Malla 250 g',
});
comprobar(ajo.unidadContenido === 'cabeza' && ajo.contenidoPorEnvase === 3, 'el ajo usa la regla PFI de 3 cabezas por malla');
comprobar(cerca(stock.envasesDesdeCantidadReal(3, ajo), 1), '3 cabezas de ajo equivalen a 1 malla');

const pasta = stock.inferirConfiguracionStockReal({
  nombre: 'Macarrón grueso Hacendado',
  formato: 'Paquete 500 g',
});
comprobar(pasta.unidadContenido === 'g' && pasta.contenidoPorEnvase === 500, 'los macarrones detectan el paquete de 500 g');
comprobar(cerca(stock.envasesDesdeCantidadReal(250, pasta), 0.5), '250 g equivalen a medio paquete de macarrones');
comprobar(stock.pasoCantidadStock(pasta) === 50, 'la edición de pasta usa pasos naturales de 50 g');

const productoFraccionado = {
  id: 'p1', productoId: 'p1', nombre: 'Macarrón', imagen: null, formato: '500 g', precio: 0.9,
  stockActual: 0.5, stockObjetivo: 1, unidad: 'envase', frecuencia: 'cuando-falte', tipo: 'despensa',
  umbralAviso: 0, unidadContenido: 'g', contenidoPorEnvase: 500, conversionStockAproximada: false,
  actualizado: new Date().toISOString(),
};
comprobar(despensa.calcularReposicion(productoFraccionado) === 1, 'medio paquete pendiente repone 1 envase entero, nunca 0,5 envases');
comprobar(cerca(despensa.calcularCosteReposicion(productoFraccionado), 0.9), 'el coste de reposición cobra el envase entero');

comprobar(
  compra.calcularEnvasesConStock(4 / 12, 10 / 12, 0) === 0,
  'si hacen falta 4 huevos y hay 10, Compra no añade otra caja',
);
comprobar(
  compra.calcularEnvasesConStock(14 / 12, 10 / 12, 0) === 1,
  'si hacen falta 14 huevos y hay 10, Compra añade 1 caja',
);

const calculoHuevos = compra.calcularEnvasesParaNecesidades(
  [{ nombre: 'Huevos', cantidad: 4, unidad: 'ud', seccion: 'Lácteos y huevos' }],
  {
    productoId: 'h', nombre: 'Huevos medianos M', precio: 2.85, precioReferencia: null,
    formato: '12 ud', unidadesTotales: 12, tamanoUnidad: null, formatoUnidad: null,
    pesoAproximado: false, seccion: 'Lácteos y huevos', subcategoria: 'Huevos', imagen: null, url: '', disponible: true,
  },
);
comprobar(cerca(calculoHuevos.envasesExactos, 4 / 12), 'el motor conserva la necesidad exacta antes de redondear a cajas');
comprobar(calculoHuevos.envases === 1, 'sin stock, 4 huevos siguen requiriendo comprar 1 caja');

const despensaUi = fs.readFileSync('src/pages/Despensa.tsx', 'utf8');
const detalleUi = fs.readFileSync('src/components/ProductoDetalleModal.tsx', 'utf8');
const motor = fs.readFileSync('src/motor/compra.ts', 'utf8');
comprobar(despensaUi.includes('<StockProducto producto={producto} />'), 'Despensa muestra el stock en unidad natural');
comprobar(detalleUi.includes('Cómo contar el stock') && detalleUi.includes('1 envase contiene'), 'el detalle permite configurar la equivalencia de envase');
comprobar(motor.includes('envasesMenuExactos') && motor.includes('productoDespensa.stockActual'), 'Compra descuenta stock fraccionado también en productos manuales/perecederos controlados');

console.log('✓ Stock real PFI 1.5.6: huevos, ajo y paquetes parciales validados');
