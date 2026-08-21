import assert from 'node:assert/strict';

if (typeof globalThis.localStorage === 'undefined') {
  const datos = new Map();
  globalThis.localStorage = {
    getItem: (clave) => datos.has(clave) ? datos.get(clave) : null,
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    clear: () => datos.clear(),
    key: (indice) => Array.from(datos.keys())[indice] ?? null,
    get length() { return datos.size; },
  };
}

const { generarResumenAtencionHoy } = await import('../src/services/atencionHoy.ts');

const ahora = new Date('2026-08-21T12:00:00+02:00');
const conservacion = [
  {
    id: 'hoy',
    tipo: 'abierto',
    nombre: 'Tomate frito',
    cantidad: 0.5,
    unidad: 'bote',
    fechaAlta: '2026-08-18T12:00:00+02:00',
    fechaLimite: '2026-08-21T20:00:00+02:00',
  },
  {
    id: 'lejano',
    tipo: 'congelado',
    nombre: 'Lentejas',
    cantidad: 2,
    unidad: 'ración',
    fechaAlta: '2026-08-01T12:00:00+02:00',
    fechaLimite: '2026-09-20T12:00:00+02:00',
  },
];

const excepciones = {
  soloAdultos: true,
  fueraTodaSemana: false,
  comidasFuera: {
    Sábado: { cena: true },
  },
};

const despensa = [
  {
    id: 'arroz',
    productoId: '1',
    nombre: 'Arroz',
    imagen: null,
    formato: 'Paquete 1 kg',
    precio: 1.15,
    stockActual: 0,
    stockObjetivo: 2,
    unidad: 'envase',
    frecuencia: 'cuando-falte',
    tipo: 'despensa',
    umbralAviso: 0,
    unidadContenido: 'g',
    contenidoPorEnvase: 1000,
    conversionStockAproximada: false,
    actualizado: '2026-08-21T10:00:00Z',
  },
];

const resumen = generarResumenAtencionHoy(
  conservacion,
  excepciones,
  despensa,
  ahora,
);

assert.equal(resumen.conservacion.length, 1);
assert.equal(resumen.conservacion[0].nombre, 'Tomate frito');
assert.equal(resumen.conservacion[0].detalle, 'Consumir hoy');
assert.equal(resumen.excepciones.length, 2);
assert.equal(resumen.stock.length, 1);
assert.equal(resumen.total, 4);

console.log('✓ Atención hoy detecta caducidades, excepciones y stock bajo sin ruido');
