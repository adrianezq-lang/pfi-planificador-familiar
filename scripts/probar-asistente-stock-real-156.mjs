class MemoriaLocal {
  datos = new Map();
  get length() { return this.datos.size; }
  key(indice) { return Array.from(this.datos.keys())[indice] ?? null; }
  getItem(clave) { return this.datos.has(clave) ? this.datos.get(clave) : null; }
  setItem(clave, valor) { this.datos.set(String(clave), String(valor)); }
  removeItem(clave) { this.datos.delete(clave); }
  clear() { this.datos.clear(); }
}

globalThis.localStorage = new MemoriaLocal();
globalThis.Event ??= class Event { constructor(type) { this.type = type; } };
globalThis.CustomEvent ??= class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

const despensa = await import('../src/services/despensa.ts');
const asistente = await import('../src/services/asistentePfi.ts');

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
  console.log(`✓ ${mensaje}`);
}

function producto(productoId, nombre, formato, unidadContenido, contenidoPorEnvase) {
  return {
    productoId,
    nombre,
    imagen: null,
    formato,
    precio: 1,
    stockActual: 0,
    stockObjetivo: 0,
    unidad: 'envase',
    frecuencia: 'manual',
    tipo: 'despensa',
    umbralAviso: 0,
    unidadContenido,
    contenidoPorEnvase,
    conversionStockAproximada: unidadContenido === 'cabeza',
  };
}

despensa.añadirProductoDespensa(producto('h', 'Huevos medianos M', '12 ud', 'huevo', 12));
despensa.añadirProductoDespensa(producto('a', 'Ajos morados', 'Malla 250 g', 'cabeza', 3));
despensa.añadirProductoDespensa(producto('m', 'Macarrón grueso Hacendado', 'Paquete 500 g', 'g', 500));

const menu = [];
let resultado = asistente.procesarComandoAsistentePfi('Me quedan 10 huevos', menu, 0);
comprobar(resultado.entendido, 'el asistente entiende “me quedan 10 huevos”');
comprobar(Math.abs(despensa.buscarProductoDespensa('h').stockActual - 10 / 12) < 0.001, '10 huevos se guardan como 10/12 de envase');

resultado = asistente.procesarComandoAsistentePfi('Tengo 3 cabezas de ajo', menu, 0);
comprobar(resultado.entendido, 'el asistente entiende cabezas de ajo');
comprobar(Math.abs(despensa.buscarProductoDespensa('a').stockActual - 1) < 0.001, '3 cabezas de ajo se guardan como 1 malla');

resultado = asistente.procesarComandoAsistentePfi('Queda medio paquete de macarrones', menu, 0);
comprobar(resultado.entendido, 'el asistente entiende medio paquete');
comprobar(Math.abs(despensa.buscarProductoDespensa('m').stockActual - 0.5) < 0.001, 'medio paquete se guarda como 0,5 envases');

resultado = asistente.procesarComandoAsistentePfi('Me quedan 250 g de macarrones', menu, 0);
comprobar(resultado.entendido, 'el asistente entiende gramos de pasta');
comprobar(Math.abs(despensa.buscarProductoDespensa('m').stockActual - 0.5) < 0.001, '250 g de 500 g se guardan como medio envase');

console.log('✓ Asistente + stock real: actualización natural del inventario comprobada');
