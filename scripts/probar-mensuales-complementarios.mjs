const memoria = new Map();

globalThis.localStorage = {
  getItem(clave) { return memoria.get(clave) ?? null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); },
};
globalThis.window = {
  addEventListener() {},
  dispatchEvent() {},
};

globalThis.Event = class {
  constructor(type) { this.type = type; }
};

const { normalizarPeriodicidadDespensa } = await import(
  '../src/services/periodicidadDespensa.ts'
);
const { unirIngredientes } = await import('../src/services/UnirIngredientes.ts');

localStorage.setItem(
  'pfi-despensa-productos',
  JSON.stringify([
    {
      id: 'chorizo', productoId: '23145', nombre: 'Chorizo sarta Hacendado',
      tipo: 'perecedero', frecuencia: 'semanal',
    },
    {
      id: 'queso', productoId: '50965', nombre: 'Queso curado mezcla Hacendado',
      tipo: 'perecedero', frecuencia: 'semanal',
    },
    {
      id: 'salchichas', productoId: '53143', nombre: 'Salchichas bocata gourmet Hacendado',
      tipo: 'perecedero', frecuencia: 'semanal',
    },
    {
      id: 'jamon-manual', productoId: 'jamon-manual', nombre: 'Jamón cocido',
      tipo: 'perecedero', frecuencia: 'manual',
    },
    {
      id: 'pollo', productoId: 'pollo', nombre: 'Pechuga de pollo fresca',
      tipo: 'perecedero', frecuencia: 'semanal',
    },
  ]),
);

const cambios = normalizarPeriodicidadDespensa();
if (cambios !== 7) {
  throw new Error(`La normalización mensual hizo ${cambios} cambios y esperaba 7.`);
}
const despensa = JSON.parse(localStorage.getItem('pfi-despensa-productos') ?? '[]');
for (const id of ['chorizo', 'queso', 'salchichas']) {
  const producto = despensa.find((item) => item.id === id);
  if (producto?.tipo !== 'despensa' || producto?.frecuencia !== 'mensual') {
    throw new Error(`${id} no quedó como despensa mensual.`);
  }
}
const jamonManual = despensa.find((item) => item.id === 'jamon-manual');
if (jamonManual?.tipo !== 'despensa' || jamonManual?.frecuencia !== 'manual') {
  throw new Error('La corrección no conservó la frecuencia manual del jamón.');
}
const pollo = despensa.find((item) => item.id === 'pollo');
if (pollo?.tipo !== 'perecedero' || pollo?.frecuencia !== 'semanal') {
  throw new Error('La corrección mensual alteró una carne fresca.');
}
if (normalizarPeriodicidadDespensa() !== 0) {
  throw new Error('La periodicidad ya corregida no debe seguir mutando la despensa.');
}

const quesos = unirIngredientes([
  { nombre: 'Queso curado', cantidad: 1, unidad: 'cuña', seccion: 'Lácteos y huevos' },
  { nombre: 'Queso roquefort', cantidad: 1, unidad: 'cuña', seccion: 'Lácteos y huevos' },
]);
if (quesos.some((ingrediente) => ingrediente.unidad !== 'ud' || ingrediente.cantidad !== 1)) {
  throw new Error(`Las cuñas de queso no se normalizaron a unidad comercial: ${JSON.stringify(quesos)}.`);
}

console.log('✓ charcutería y quesos heredados pasan de semanal a mensual');
console.log('✓ frecuencias manuales y carnes frescas se conservan');
console.log('✓ las cuñas de queso equivalen a una unidad comercial');
